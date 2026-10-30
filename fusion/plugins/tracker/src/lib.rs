//! The `fusion:tracker` world of the Fusion Work Protocol: a source that writes
//! back to the service that holds the items.
//!
//! **It includes `fusion:sources` and adds four calls**: `claim` shows the
//! host's claim, `update` writes a status with the version it read, `link`
//! attaches an address such as a pull request, and `create` files an item,
//! which a tracker may decline. [`Tracker`] is the world's exports as a Rust
//! trait, [`Component`] implements it for a component built against
//! `wit/tracker`, [`Memory`] is the reference tracker, and [`conformance`] is
//! the suite every one of them passes.
//!
//! **The host holds the lease, and the tracker only shows it.** A service
//! that cannot claim an item atomically lets two hosts both assign
//! themselves, so the lease is a row in the host's own store, with a holder,
//! an expiry, and a number that rises with each claim. Which status an item
//! has is the host's to decide too, and every word a tracker writes comes from
//! the host's templates, never from a model.

use std::path::Path;

use fusion_plugin_host::wasmtime::component::{HasSelf, Linker};
use fusion_plugin_host::wasmtime::Store;
use fusion_plugin_host::{stopped, Bounded, Limits, Loader, Module, Refused, World};
use fusion_plugin_sources::{Access, Entry, Error, Item, Lent, Page, Source};

pub mod conformance;
mod memory;

pub use memory::Memory;

/// The bindings generated from `wit/tracker`, with the sources world's
/// records and binding taken from `fusion-plugin-sources`, so an item from
/// a tracker is the same Rust type as an item from a source.
pub mod bindings {
    fusion_plugin_host::wasmtime::component::bindgen!({
        path: ["../wit/sources", "../wit/tracker"],
        world: "fusion:tracker/writer",
        wasmtime_crate: fusion_plugin_host::wasmtime,
        additional_derives: [PartialEq, Eq, serde::Serialize, serde::Deserialize],
        with: {
            "fusion:sources/types": fusion_plugin_sources::bindings::fusion::sources::types,
            "fusion:sources/binding": fusion_plugin_sources::bindings::fusion::sources::binding,
        },
    });
}

pub use bindings::exports::fusion::tracker::tracker::{Change, Draft};

/// The version of `fusion:tracker` this host speaks.
pub const VERSION: &str = "1.0.0";

/// The tracker world, as a refusal names it.
pub const TRACKERS: World = World {
    package: "fusion:tracker",
    noun: "tracker",
};

/// The world's exports beyond a source's, which a tracker built in
/// implements in Rust and a [`Component`] implements by calling the
/// component.
pub trait Tracker: Source {
    /// Shows the host's claim on an item, or clears it where `holder` is
    /// none.
    ///
    /// # Errors
    ///
    /// [`Error::NotFound`], [`Error::Denied`] where the binding cannot write
    /// back, or the tracker's other [`Error`].
    fn claim(&self, id: &str, holder: Option<&str>) -> Result<(), Error>;

    /// Writes `change`, sending the `version` the host read, and returns the
    /// item's new version.
    ///
    /// # Errors
    ///
    /// [`Error::Conflict`] where the tracker checks versions and `version` is
    /// no longer the item's, or the tracker's other [`Error`].
    fn update(&self, id: &str, version: &str, change: &Change) -> Result<String, Error>;

    /// Attaches `address` to the item, once.
    ///
    /// # Errors
    ///
    /// The tracker's [`Error`].
    fn link(&self, id: &str, address: &str) -> Result<(), Error>;

    /// Files a new item, which lands as proposed.
    ///
    /// # Errors
    ///
    /// [`Error::Unsupported`] where the tracker files nothing, or its other
    /// [`Error`].
    fn create(&self, draft: &Draft) -> Result<Item, Error>;
}

/// A component built against `fusion:tracker`, opened for one binding.
pub struct Component {
    limits: Limits,
    linker: Linker<Bounded<Lent>>,
    loader: Loader,
    module: Module,
    settings: String,
}

impl std::fmt::Debug for Component {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        into.debug_struct("Component")
            .field("module", &self.module)
            .field("limits", &self.limits)
            .finish_non_exhaustive()
    }
}

impl Component {
    /// Loads the component at `file` and opens it for a binding whose
    /// settings are `settings`, starting it once so a component that cannot
    /// run is refused at load.
    ///
    /// # Errors
    ///
    /// [`Refused`] for a file that is not a component, one built against
    /// another major version of either world, or one that imports what a
    /// tracker is not lent.
    pub fn load(
        loader: &Loader,
        file: &Path,
        settings: impl Into<String>,
        limits: Limits,
    ) -> Result<Self, Refused> {
        let module = loader.read(file, TRACKERS)?;
        module.speaks(loader, TRACKERS, "tracker", VERSION)?;
        module.speaks(
            loader,
            fusion_plugin_sources::SOURCES,
            "source",
            fusion_plugin_sources::VERSION,
        )?;
        let mut linker = Linker::new(loader.engine());
        bindings::Writer::add_to_linker::<Bounded<Lent>, HasSelf<Lent>>(&mut linker, |held| {
            &mut held.state
        })
        .map_err(|why| Refused {
            file: file.to_path_buf(),
            why: format!("the host functions would not link: {why}"),
        })?;
        let component = Self {
            limits,
            linker,
            loader: loader.clone(),
            module,
            settings: settings.into(),
        };
        component.start().map_err(|why| Refused {
            file: file.to_path_buf(),
            why: format!(
                "it could not be started: {why}. A tracker is lent its binding's settings and \
                 nothing else, so a component importing a filesystem, a clock, or a network is \
                 refused here"
            ),
        })?;
        Ok(component)
    }

    /// The component as the loader pinned it, with its digest.
    #[must_use]
    pub fn module(&self) -> &Module {
        &self.module
    }

    /// A fresh store, and the component started in it.
    fn start(
        &self,
    ) -> fusion_plugin_host::wasmtime::Result<(Store<Bounded<Lent>>, bindings::Writer)> {
        let mut store = self.loader.store(
            Lent {
                settings: self.settings.clone(),
            },
            self.limits,
        )?;
        let writer =
            bindings::Writer::instantiate(&mut store, &self.module.component, &self.linker)?;
        Ok((store, writer))
    }

    /// One call, in a store of its own, with a component that stops or traps
    /// returning [`Error::Unavailable`] and the reason.
    fn call<T>(
        &self,
        run: impl FnOnce(
            &mut Store<Bounded<Lent>>,
            &bindings::Writer,
        ) -> fusion_plugin_host::wasmtime::Result<Result<T, Error>>,
    ) -> Result<T, Error> {
        let stop = |why: &fusion_plugin_host::wasmtime::Error| {
            Error::Unavailable(stopped(why, self.limits, TRACKERS.noun))
        };
        let (mut store, writer) = self.start().map_err(|why| stop(&why))?;
        run(&mut store, &writer).map_err(|why| stop(&why))?
    }
}

impl Source for Component {
    fn spec(&self) -> Result<String, Error> {
        self.call(|store, writer| writer.fusion_sources_source().call_spec(store).map(Ok))
    }

    fn check(&self) -> Result<Access, Error> {
        self.call(|store, writer| writer.fusion_sources_source().call_check(store))
    }

    fn discover(&self) -> Result<Vec<Entry>, Error> {
        self.call(|store, writer| writer.fusion_sources_source().call_discover(store))
    }

    fn list(&self, since: Option<&str>) -> Result<Page, Error> {
        let since = since.map(str::to_owned);
        self.call(|store, writer| {
            writer
                .fusion_sources_source()
                .call_list(store, since.as_ref())
        })
    }

    fn get(&self, id: &str) -> Result<Item, Error> {
        self.call(|store, writer| writer.fusion_sources_source().call_get(store, id))
    }
}

impl Tracker for Component {
    fn claim(&self, id: &str, holder: Option<&str>) -> Result<(), Error> {
        self.call(|store, writer| {
            writer
                .fusion_tracker_tracker()
                .call_claim(store, id, holder)
        })
    }

    fn update(&self, id: &str, version: &str, change: &Change) -> Result<String, Error> {
        self.call(|store, writer| {
            writer
                .fusion_tracker_tracker()
                .call_update(store, id, version, change)
        })
    }

    fn link(&self, id: &str, address: &str) -> Result<(), Error> {
        self.call(|store, writer| {
            writer
                .fusion_tracker_tracker()
                .call_link(store, id, address)
        })
    }

    fn create(&self, draft: &Draft) -> Result<Item, Error> {
        self.call(|store, writer| writer.fusion_tracker_tracker().call_create(store, draft))
    }
}
