//! The `fusion:catalog` world of the Fusion Work Protocol: records kept in
//! another service, such as products, read, kept current, and written back.
//!
//! **One contract, built in or loaded.** [`Catalog`] is the reader world's
//! exports as a Rust trait, and [`Editor`] adds the writer world's. A product
//! implements them in Rust for a catalog it builds in, and [`Component`]
//! implements them for a WebAssembly component built against `wit/catalog`,
//! so a host and the [`conformance`] suite treat both alike. [`Memory`] is the
//! reference catalog.
//!
//! **Record text is untrusted all the way through.** Every field a person
//! wrote in the service, such as a title, a description, a tag, and a
//! picture's alt text, is an [`Untrusted`].
//!
//! **Money is exact.** A [`Money`] carries a decimal string and a currency,
//! so no float rounds a price on its way to a page.
//!
//! **A catalog is lent its binding's settings and the secrets its grant
//! names.** A component importing anything more fails to start and is
//! refused by name, and a secret outside the grant is refused with a
//! sentence. Each call runs in a fresh store under its [`Limits`].
//!
//! **Writes are the host's to allow.** A host offers [`Editor`] only to a
//! binding whose grant allows writing, and [`Access`] says what the
//! credential itself allows, so a write the service would refuse is caught
//! before it is tried.

use std::collections::BTreeMap;
use std::path::Path;

use fusion_plugin_host::wasmtime::component::{HasSelf, Linker};
use fusion_plugin_host::wasmtime::Store;
use fusion_plugin_host::{stopped, Bounded, Limits, Loader, Module, Refused, World};

pub mod conformance;
mod memory;

pub use memory::Memory;

/// The bindings generated from `wit/catalog`'s reader world.
pub mod bindings {
    fusion_plugin_host::wasmtime::component::bindgen!({
        path: "../wit/catalog",
        world: "reader",
        wasmtime_crate: fusion_plugin_host::wasmtime,
        additional_derives: [PartialEq, serde::Serialize, serde::Deserialize],
    });
}

/// The bindings generated from `wit/catalog`'s writer world, with the
/// records and the binding taken from the reader's, so a record from a
/// writer is the same Rust type as one from a reader.
pub mod writer {
    fusion_plugin_host::wasmtime::component::bindgen!({
        path: "../wit/catalog",
        world: "writer",
        wasmtime_crate: fusion_plugin_host::wasmtime,
        additional_derives: [PartialEq, serde::Serialize, serde::Deserialize],
        with: {
            "fusion:catalog/types": crate::bindings::fusion::catalog::types,
            "fusion:catalog/binding": crate::bindings::fusion::catalog::binding,
        },
    });
}

/// The world's records, generated from its WIT.
pub use bindings::fusion::catalog::types;
pub use types::{
    Access, Cursor, Delivery, Error, Field, Image, Money, Page, Record, State, Untrusted, Value,
    Variant,
};
pub use writer::exports::fusion::catalog::editor::{Draft, VariantDraft};

/// The version of `fusion:catalog` this host speaks.
pub const VERSION: &str = "1.0.0";

/// The catalog world, as a refusal names it.
pub const CATALOGS: World = World {
    package: "fusion:catalog",
    noun: "catalog",
};

/// The reader world's exports, which a catalog built in implements in Rust
/// and a [`Component`] implements by calling the component.
pub trait Catalog {
    /// The JSON Schema of a binding's settings.
    ///
    /// # Errors
    ///
    /// [`Error::Unavailable`] where a component stopped before it returned.
    fn spec(&self) -> Result<String, Error>;

    /// What the binding's credential allows.
    ///
    /// # Errors
    ///
    /// The catalog's [`Error`] where it cannot tell.
    fn check(&self) -> Result<Access, Error>;

    /// The records that changed since `since`, or every record where it is
    /// none.
    ///
    /// # Errors
    ///
    /// The catalog's [`Error`].
    fn list(&self, since: Option<&str>) -> Result<Page, Error>;

    /// One record, with its current version.
    ///
    /// # Errors
    ///
    /// [`Error::NotFound`] where no record has the id, or the catalog's
    /// other [`Error`].
    fn get(&self, id: &str) -> Result<Record, Error>;

    /// The records whose text matches `query`, best first, at most `limit`.
    ///
    /// # Errors
    ///
    /// The catalog's [`Error`].
    fn search(&self, query: &str, limit: u32) -> Result<Vec<Record>, Error>;

    /// The ids of the records a delivery from the service says changed.
    ///
    /// # Errors
    ///
    /// [`Error::Denied`] for a delivery the catalog cannot verify, after
    /// which the host changes nothing, or the catalog's other [`Error`].
    fn receive(&self, delivery: &Delivery) -> Result<Vec<String>, Error>;
}

/// The writer world's exports beyond a reader's.
pub trait Editor: Catalog {
    /// Makes a record, and returns it as the service holds it.
    ///
    /// # Errors
    ///
    /// [`Error::Unsupported`] for a catalog that makes nothing,
    /// [`Error::Denied`], or the catalog's other [`Error`].
    fn create(&self, draft: &Draft) -> Result<Record, Error>;

    /// Writes `draft`, sending the `version` the host read, and returns the
    /// record as it now stands.
    ///
    /// # Errors
    ///
    /// [`Error::Conflict`] where `version` is no longer the record's, or the
    /// catalog's other [`Error`].
    fn update(&self, id: &str, version: &str, draft: &Draft) -> Result<Record, Error>;
}

impl Untrusted {
    /// Text from the service, marked so a reader cannot take it for the
    /// host's own.
    #[must_use]
    pub fn new(text: impl Into<String>) -> Self {
        Self { text: text.into() }
    }
}

impl Money {
    /// An exact amount in a currency, such as `Money::new("29.00", "USD")`.
    #[must_use]
    pub fn new(amount: impl Into<String>, currency: impl Into<String>) -> Self {
        Self {
            amount: amount.into(),
            currency: currency.into(),
        }
    }
}

impl Draft {
    /// A draft that changes nothing, to set fields on.
    #[must_use]
    pub fn empty() -> Self {
        Self {
            title: None,
            description: None,
            state: None,
            handle: None,
            fields: Vec::new(),
            variants: Vec::new(),
        }
    }
}

impl Error {
    /// The error as a sentence a person reads: its kind, and what the
    /// catalog said.
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

/// What a catalog's store holds: the binding's settings, and the secrets its
/// grant names, which is all a catalog is lent.
#[derive(Clone, Debug, Default)]
pub struct Lent {
    /// The binding's settings, as JSON.
    pub settings: String,
    /// The secrets the person granted the binding, by name.
    pub secrets: BTreeMap<String, String>,
}

impl bindings::fusion::catalog::types::Host for Lent {}

impl bindings::fusion::catalog::binding::Host for Lent {
    fn settings(&mut self) -> String {
        self.settings.clone()
    }

    fn secret(&mut self, name: String) -> Result<String, String> {
        self.secrets.get(&name).cloned().ok_or_else(|| {
            format!("the binding's grant names no secret `{name}`, so it is not lent")
        })
    }
}

/// A component built against `fusion:catalog`, opened for one binding. It
/// is a [`Catalog`] always, and an [`Editor`] where it exports the writer
/// world and was loaded with [`Component::load_writer`].
pub struct Component {
    lent: Lent,
    limits: Limits,
    linker: Linker<Bounded<Lent>>,
    loader: Loader,
    module: Module,
    writes: bool,
}

impl std::fmt::Debug for Component {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        into.debug_struct("Component")
            .field("module", &self.module)
            .field("limits", &self.limits)
            .field("writes", &self.writes)
            .finish_non_exhaustive()
    }
}

/// A started component, as one world or the other.
enum Started {
    Reader(bindings::Reader),
    Writer(writer::Writer),
}

/// Calls the same export of the catalog interface on either world, whose
/// generated guests are distinct types with the same calls.
macro_rules! on_catalog {
    ($started:expr, |$guest:ident| $call:expr) => {
        match $started {
            Started::Reader(reader) => {
                let $guest = reader.fusion_catalog_catalog();
                $call
            }
            Started::Writer(writer) => {
                let $guest = writer.fusion_catalog_catalog();
                $call
            }
        }
    };
}

impl Component {
    /// Loads the component at `file` as a reader, opened for a binding lent
    /// `lent`, starting it once so a component that cannot run is refused at
    /// load.
    ///
    /// # Errors
    ///
    /// [`Refused`] for a file that is not a component, one built against
    /// another major version of the world, or one that imports what a
    /// catalog is not lent.
    pub fn load(loader: &Loader, file: &Path, lent: Lent, limits: Limits) -> Result<Self, Refused> {
        Self::open(loader, file, lent, limits, false)
    }

    /// Loads the component at `file` as a writer, which a host does only for
    /// a binding whose grant allows writing.
    ///
    /// # Errors
    ///
    /// As [`Component::load`], and [`Refused`] for a component that does not
    /// export the writer world.
    pub fn load_writer(
        loader: &Loader,
        file: &Path,
        lent: Lent,
        limits: Limits,
    ) -> Result<Self, Refused> {
        Self::open(loader, file, lent, limits, true)
    }

    fn open(
        loader: &Loader,
        file: &Path,
        lent: Lent,
        limits: Limits,
        writes: bool,
    ) -> Result<Self, Refused> {
        let module = loader.read(file, CATALOGS)?;
        module.speaks(loader, CATALOGS, "catalog", VERSION)?;
        let mut linker = Linker::new(loader.engine());
        bindings::Reader::add_to_linker::<Bounded<Lent>, HasSelf<Lent>>(&mut linker, |held| {
            &mut held.state
        })
        .map_err(|why| Refused {
            file: file.to_path_buf(),
            why: format!("the host functions would not link: {why}"),
        })?;
        let component = Self {
            lent,
            limits,
            linker,
            loader: loader.clone(),
            module,
            writes,
        };
        component.start().map_err(|why| Refused {
            file: file.to_path_buf(),
            why: format!(
                "it could not be started: {why}. A catalog is lent its binding's settings and the \
                 secrets its grant names and nothing else, so a component importing a filesystem, \
                 a clock, or a network is refused here, and one loaded as a writer must export \
                 the editor"
            ),
        })?;
        Ok(component)
    }

    /// The component as the loader pinned it, with its digest.
    #[must_use]
    pub fn module(&self) -> &Module {
        &self.module
    }

    /// Whether it was loaded as a writer.
    #[must_use]
    pub fn writes(&self) -> bool {
        self.writes
    }

    fn start(&self) -> fusion_plugin_host::wasmtime::Result<(Store<Bounded<Lent>>, Started)> {
        let mut store = self.loader.store(self.lent.clone(), self.limits)?;
        let started = if self.writes {
            Started::Writer(writer::Writer::instantiate(
                &mut store,
                &self.module.component,
                &self.linker,
            )?)
        } else {
            Started::Reader(bindings::Reader::instantiate(
                &mut store,
                &self.module.component,
                &self.linker,
            )?)
        };
        Ok((store, started))
    }

    fn call<T>(
        &self,
        run: impl FnOnce(
            &mut Store<Bounded<Lent>>,
            &Started,
        ) -> fusion_plugin_host::wasmtime::Result<Result<T, Error>>,
    ) -> Result<T, Error> {
        let stop = |why: &fusion_plugin_host::wasmtime::Error| {
            Error::Unavailable(stopped(why, self.limits, CATALOGS.noun))
        };
        let (mut store, started) = self.start().map_err(|why| stop(&why))?;
        run(&mut store, &started).map_err(|why| stop(&why))?
    }

    fn editing<T>(
        &self,
        run: impl FnOnce(
            &mut Store<Bounded<Lent>>,
            &writer::exports::fusion::catalog::editor::Guest,
        ) -> fusion_plugin_host::wasmtime::Result<Result<T, Error>>,
    ) -> Result<T, Error> {
        self.call(|store, started| match started {
            Started::Writer(writer) => run(store, writer.fusion_catalog_editor()),
            Started::Reader(_) => Ok(Err(Error::Denied(
                "the catalog was loaded as a reader, so the host allows it no writes".into(),
            ))),
        })
    }
}

impl Catalog for Component {
    fn spec(&self) -> Result<String, Error> {
        self.call(|store, started| on_catalog!(started, |guest| guest.call_spec(store).map(Ok)))
    }

    fn check(&self) -> Result<Access, Error> {
        self.call(|store, started| on_catalog!(started, |guest| guest.call_check(store)))
    }

    fn list(&self, since: Option<&str>) -> Result<Page, Error> {
        let since = since.map(str::to_owned);
        self.call(|store, started| {
            on_catalog!(started, |guest| guest.call_list(store, since.as_ref()))
        })
    }

    fn get(&self, id: &str) -> Result<Record, Error> {
        self.call(|store, started| on_catalog!(started, |guest| guest.call_get(store, id)))
    }

    fn search(&self, query: &str, limit: u32) -> Result<Vec<Record>, Error> {
        self.call(|store, started| {
            on_catalog!(started, |guest| guest.call_search(store, query, limit))
        })
    }

    fn receive(&self, delivery: &Delivery) -> Result<Vec<String>, Error> {
        self.call(|store, started| {
            on_catalog!(started, |guest| guest.call_receive(store, delivery))
        })
    }
}

impl Editor for Component {
    fn create(&self, draft: &Draft) -> Result<Record, Error> {
        self.editing(|store, editor| editor.call_create(store, draft))
    }

    fn update(&self, id: &str, version: &str, draft: &Draft) -> Result<Record, Error> {
        self.editing(|store, editor| editor.call_update(store, id, version, draft))
    }
}
