//! The `awp:sources` world of the Agent Work Protocol: items read from a
//! service since a cursor.
//!
//! **One contract, built in or loaded.** [`Source`] is the world's exports as
//! a Rust trait. A product implements it in Rust for a source it builds in,
//! and [`Component`] implements it for a WebAssembly component built against
//! `wit/sources`, so the host that reads items and the [`conformance`] suite
//! that holds a source to the contract treat both alike.
//!
//! **Item text is untrusted all the way through.** Every field a person wrote
//! in the service, such as a title, a body, a label, and an author's name, is
//! an [`Untrusted`], in the WIT and in Rust, so reading it as text is a step
//! somebody takes on purpose.
//!
//! **A source is lent its binding's settings and nothing else.** A component
//! importing anything more, such as a filesystem or a clock, fails to start
//! and is refused by name. Each call runs in a fresh store under its
//! [`Limits`], as every world's call does.

use std::path::Path;

use fusion_plugin_host::wasmtime::component::{HasSelf, Linker};
use fusion_plugin_host::wasmtime::Store;
use fusion_plugin_host::{stopped, Bounded, Limits, Loader, Module, Refused, World};

pub mod conformance;

/// The bindings generated from `wit/sources`, which a world that includes
/// this one maps its own onto with `with`.
pub mod bindings {
    fusion_plugin_host::wasmtime::component::bindgen!({
        path: "../wit/sources",
        world: "reader",
        wasmtime_crate: fusion_plugin_host::wasmtime,
        additional_derives: [PartialEq, Eq, serde::Serialize, serde::Deserialize],
    });
}

/// The world's records, generated from its WIT.
pub use bindings::awp::sources::types;
pub use types::{Access, Author, Cursor, Entry, Error, Item, Page, Status, Untrusted};

/// The version of `awp:sources` this host speaks.
pub const VERSION: &str = "1.0.0";

/// The sources world, as a refusal names it.
pub const SOURCES: World = World {
    package: "awp:sources",
    noun: "source",
};

/// The world's exports, which a source built in implements in Rust and a
/// [`Component`] implements by calling the component.
pub trait Source {
    /// The JSON Schema of a binding's settings.
    ///
    /// # Errors
    ///
    /// [`Error::Unavailable`] where a component stopped before it returned.
    /// The world's own `spec` cannot fail.
    fn spec(&self) -> Result<String, Error>;

    /// What the binding's credential allows.
    ///
    /// # Errors
    ///
    /// The source's [`Error`] where it cannot tell, such as a service that
    /// does not respond.
    fn check(&self) -> Result<Access, Error>;

    /// Everything the binding could name.
    ///
    /// # Errors
    ///
    /// The source's [`Error`].
    fn discover(&self) -> Result<Vec<Entry>, Error>;

    /// The items that changed since `since`, or every item where it is none.
    ///
    /// # Errors
    ///
    /// The source's [`Error`].
    fn list(&self, since: Option<&str>) -> Result<Page, Error>;

    /// One item, with its current version.
    ///
    /// # Errors
    ///
    /// [`Error::NotFound`] where no item has the id, or the source's other
    /// [`Error`].
    fn get(&self, id: &str) -> Result<Item, Error>;
}

impl Untrusted {
    /// Text from the service, marked so a reader cannot take it for the
    /// host's own.
    #[must_use]
    pub fn new(text: impl Into<String>) -> Self {
        Self { text: text.into() }
    }
}

impl Error {
    /// The error as a sentence a person reads: its kind, and what the source
    /// said.
    #[must_use]
    pub fn sentence(&self) -> String {
        let (kind, said) = match self {
            Self::NotFound(said) => ("not found", said),
            Self::Conflict(said) => ("conflict", said),
            Self::Denied(said) => ("denied", said),
            Self::Unsupported(said) => ("unsupported", said),
            Self::Invalid(said) => ("invalid", said),
            Self::Unavailable(said) => ("unavailable", said),
        };
        format!("{kind}: {said}")
    }
}

/// What a source's store holds: the settings of the binding it was opened
/// for, which is all a source is lent.
#[derive(Clone, Debug, Default)]
pub struct Lent {
    /// The binding's settings, as JSON.
    pub settings: String,
}

impl bindings::awp::sources::types::Host for Lent {}

impl bindings::awp::sources::binding::Host for Lent {
    fn settings(&mut self) -> String {
        self.settings.clone()
    }
}

/// A component built against `awp:sources`, opened for one binding.
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
    /// another major version of the world, or one that imports what a source
    /// is not lent.
    pub fn load(
        loader: &Loader,
        file: &Path,
        settings: impl Into<String>,
        limits: Limits,
    ) -> Result<Self, Refused> {
        let module = loader.read(file, SOURCES)?;
        module.speaks(loader, SOURCES, "source", VERSION)?;
        let mut linker = Linker::new(loader.engine());
        bindings::Reader::add_to_linker::<Bounded<Lent>, HasSelf<Lent>>(&mut linker, |held| {
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
                "it could not be started: {why}. A source is lent its binding's settings and \
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
    ) -> fusion_plugin_host::wasmtime::Result<(Store<Bounded<Lent>>, bindings::Reader)> {
        let mut store = self.loader.store(
            Lent {
                settings: self.settings.clone(),
            },
            self.limits,
        )?;
        let reader =
            bindings::Reader::instantiate(&mut store, &self.module.component, &self.linker)?;
        Ok((store, reader))
    }

    /// One call, in a store of its own, with a component that stops or traps
    /// returning [`Error::Unavailable`] and the reason.
    fn call<T>(
        &self,
        run: impl FnOnce(
            &mut Store<Bounded<Lent>>,
            &bindings::Reader,
        ) -> fusion_plugin_host::wasmtime::Result<Result<T, Error>>,
    ) -> Result<T, Error> {
        let stop = |why: &fusion_plugin_host::wasmtime::Error| {
            Error::Unavailable(stopped(why, self.limits, SOURCES.noun))
        };
        let (mut store, reader) = self.start().map_err(|why| stop(&why))?;
        run(&mut store, &reader).map_err(|why| stop(&why))?
    }
}

impl Source for Component {
    fn spec(&self) -> Result<String, Error> {
        self.call(|store, reader| reader.awp_sources_source().call_spec(store).map(Ok))
    }

    fn check(&self) -> Result<Access, Error> {
        self.call(|store, reader| reader.awp_sources_source().call_check(store))
    }

    fn discover(&self) -> Result<Vec<Entry>, Error> {
        self.call(|store, reader| reader.awp_sources_source().call_discover(store))
    }

    fn list(&self, since: Option<&str>) -> Result<Page, Error> {
        let since = since.map(str::to_owned);
        self.call(|store, reader| reader.awp_sources_source().call_list(store, since.as_ref()))
    }

    fn get(&self, id: &str) -> Result<Item, Error> {
        self.call(|store, reader| reader.awp_sources_source().call_get(store, id))
    }
}
