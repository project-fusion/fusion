//! Reading a component, pinning it by digest, and starting it under limits.

use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use sha2::{Digest, Sha256};
use wasmtime::component::Component;
use wasmtime::{Config, Engine, Store, StoreLimits, StoreLimitsBuilder, Trap};

/// How often a deadline is checked.
const TICK: Duration = Duration::from_millis(10);

/// The epoch deadline of a call with no time limit: far enough that no run
/// reaches it, and short of the overflow `u64::MAX` would be once the engine's
/// epoch is added to it.
const NEVER: u64 = u64::MAX / 2;

/// Why a component was not loaded, or why a call failed.
#[derive(Debug)]
pub struct Refused {
    /// The file it happened to, as a person would name it.
    pub file: PathBuf,
    pub why: String,
}

impl std::fmt::Display for Refused {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(into, "{}: {}", self.file.display(), self.why)
    }
}

impl std::error::Error for Refused {}

/// The sha256 of a component, as a register prints it.
///
/// **A hash from a crate rather than by hand.** What a register is for is a
/// reader comparing two digests, and thirty lines of round constants in this
/// file would be a primitive nobody reviews sitting next to the sandbox.
pub fn digest_of(bytes: &[u8]) -> String {
    let mut said = String::from("sha256:");
    for one in Sha256::digest(bytes) {
        let _ = write!(said, "{one:02x}");
    }
    said
}

/// How far one call may run.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Limits {
    /// The work a call may do, in Wasmtime's units of fuel: about one for each
    /// instruction.
    pub fuel: u64,
    /// The longest a call may run, counting only time spent in the component.
    pub time: Duration,
    /// The most memory a call may hold, in bytes.
    pub memory: usize,
}

impl Limits {
    /// No bound, for a world whose calls ran unbounded before the loader held
    /// them. The rules world is one: a rule is handed thirteen megabytes of
    /// manifests, and a cap chosen for a tool would refuse it.
    pub const UNBOUNDED: Self = Self {
        fuel: u64::MAX,
        time: Duration::MAX,
        memory: usize::MAX,
    };
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            fuel: 2_000_000_000,
            time: Duration::from_secs(30),
            memory: 64 * 1024 * 1024,
        }
    }
}

/// What a world calls itself and the components built against it, for the
/// sentences that refuse one.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct World {
    /// The WIT package, without its version: `fusion:rules`, `fusion:tracker`.
    pub package: &'static str,
    /// What a component built against it is called: a plugin, a tool, a
    /// tracker.
    pub noun: &'static str,
}

/// One component the loader read, pinned by the digest of its bytes.
#[derive(Clone)]
pub struct Module {
    pub component: Component,
    /// `sha256:` and the whole hex digest of the file's bytes.
    pub digest: String,
    /// Where it was read from, for a refusal that names a file.
    pub file: PathBuf,
}

impl std::fmt::Debug for Module {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        into.debug_struct("Module")
            .field("digest", &self.digest)
            .field("file", &self.file)
            .finish_non_exhaustive()
    }
}

impl Module {
    /// Its file name without the extension, which is what a person calls it.
    #[must_use]
    pub fn name(&self) -> String {
        self.file
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned()
    }

    /// The names of what it imports, as `package/interface@version`.
    #[must_use]
    pub fn imports(&self, loader: &Loader) -> Vec<String> {
        self.component
            .component_type()
            .imports(&loader.engine)
            .map(|(name, _)| name.to_owned())
            .collect()
    }

    /// The names of what it exports, as `package/interface@version`.
    #[must_use]
    pub fn exports(&self, loader: &Loader) -> Vec<String> {
        self.component
            .component_type()
            .exports(&loader.engine)
            .map(|(name, _)| name.to_owned())
            .collect()
    }

    /// Refuses a component that does not export `interface` at the major
    /// version `version` names, before anything starts it.
    ///
    /// **The version is in the name.** A WIT
    /// package carries its version in every interface it exports, so the
    /// component already declares it, and a refusal can name both numbers
    /// without running a line of it. A minor version either side is left to
    /// the runtime, which links what is compatible.
    ///
    /// # Errors
    ///
    /// [`Refused`] naming the version it was built against, or saying it
    /// exports no such interface.
    pub fn speaks(
        &self,
        loader: &Loader,
        world: World,
        interface: &str,
        version: &str,
    ) -> Result<(), Refused> {
        let wanted = format!("{}/{interface}@", world.package);
        let major = version.split('.').next().unwrap_or(version);
        let exported = self.exports(loader);
        let built: Vec<&str> = exported
            .iter()
            .filter_map(|name| name.strip_prefix(&wanted))
            .collect();
        if built.iter().any(|one| one.split('.').next() == Some(major)) {
            return Ok(());
        }
        let why = match built.first() {
            Some(other) => format!(
                "it was built against {}@{other} and this host speaks {}@{version}. Rebuild it \
                 against {}@{version}",
                world.package, world.package, world.package
            ),
            None => format!(
                "it exports no `{}/{interface}`, so it is not a {} this host can run. A {} is a \
                 WebAssembly component built against the `{}` world",
                world.package, world.noun, world.noun, world.package
            ),
        };
        Err(Refused {
            file: self.file.clone(),
            why,
        })
    }
}

/// What a call's store holds: the world's own state, and the memory cap the
/// loader enforces on it.
pub struct Bounded<T> {
    /// What the world lends the component, such as a grant.
    pub state: T,
    limits: StoreLimits,
}

/// Moves the engine's epoch on every [`TICK`] until the loader it serves is
/// dropped, which is how a call's deadline passes.
struct Ticker {
    stop: Arc<AtomicBool>,
}

impl Ticker {
    fn start(engine: &Engine) -> Self {
        let stop = Arc::new(AtomicBool::new(false));
        let stopped = Arc::clone(&stop);
        let engine = engine.clone();
        std::thread::spawn(move || {
            while !stopped.load(Ordering::Relaxed) {
                std::thread::sleep(TICK);
                engine.increment_epoch();
            }
        });
        Self { stop }
    }
}

impl Drop for Ticker {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

/// Reads components and starts them, for every world.
///
/// **One engine for every world and every component.** A component compiles
/// against an engine, and two engines are two compilers and two caches for
/// the same bytes. Each world lends its own functions through its own linker
/// and keeps nothing here.
///
/// Cloning one is cheap, and every clone shares the engine.
#[derive(Clone)]
pub struct Loader {
    engine: Engine,
    /// Started by the first call with a deadline, so a host that runs only
    /// unbounded calls runs no thread for it.
    ticker: Arc<OnceLock<Ticker>>,
}

impl std::fmt::Debug for Loader {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        into.debug_struct("Loader").finish_non_exhaustive()
    }
}

impl Loader {
    /// A loader whose components run under fuel, a deadline, and a memory cap.
    ///
    /// # Errors
    ///
    /// A sentence where the runtime will not start on this machine.
    pub fn new() -> Result<Self, String> {
        let mut config = Config::new();
        config
            .wasm_component_model(true)
            .consume_fuel(true)
            .epoch_interruption(true)
            // One memory to a component, so the memory cap is the component's
            // whole.
            .wasm_multi_memory(false);
        let engine =
            Engine::new(&config).map_err(|why| format!("the runtime would not start: {why}"))?;
        Ok(Self {
            engine,
            ticker: Arc::new(OnceLock::new()),
        })
    }

    /// The engine a world's linker is built on.
    #[must_use]
    pub fn engine(&self) -> &Engine {
        &self.engine
    }

    /// The component in `file`, compiled and pinned by its digest.
    ///
    /// # Errors
    ///
    /// [`Refused`] for a file that cannot be read or is not a component.
    pub fn read(&self, file: &Path, world: World) -> Result<Module, Refused> {
        let bytes = fs::read(file).map_err(|why| Refused {
            file: file.to_path_buf(),
            why: format!("it could not be read: {why}"),
        })?;
        self.compile(file, &bytes, world)
    }

    /// `bytes` compiled as a component, named for `file`.
    ///
    /// # Errors
    ///
    /// [`Refused`] for bytes that are not a component.
    pub fn compile(&self, file: &Path, bytes: &[u8], world: World) -> Result<Module, Refused> {
        let component = Component::from_binary(&self.engine, bytes).map_err(|why| Refused {
            file: file.to_path_buf(),
            why: format!(
                "it is not a component this host can run: {why}. A {} is a WebAssembly \
                 component built against the `{}` world",
                world.noun, world.package
            ),
        })?;
        Ok(Module {
            component,
            digest: digest_of(bytes),
            file: file.to_path_buf(),
        })
    }

    /// A fresh store for one call, holding `state`, under `limits`.
    ///
    /// **A store per call, so one call leaves nothing behind for the next.**
    /// Starting a component costs microseconds, and the alternative is a
    /// component that keeps state between two calls, which no world's
    /// contract allows.
    ///
    /// # Errors
    ///
    /// The runtime's error where the fuel cannot be set.
    pub fn store<T>(&self, state: T, limits: Limits) -> wasmtime::Result<Store<Bounded<T>>> {
        let mut store = Store::new(
            &self.engine,
            Bounded {
                state,
                limits: StoreLimitsBuilder::new()
                    .memory_size(limits.memory)
                    .trap_on_grow_failure(true)
                    .build(),
            },
        );
        store.limiter(|held| &mut held.limits);
        store.set_fuel(limits.fuel)?;
        if limits.time == Duration::MAX {
            store.set_epoch_deadline(NEVER);
        } else {
            self.ticker.get_or_init(|| Ticker::start(&self.engine));
            let ticks = u64::try_from(limits.time.as_millis() / TICK.as_millis()).unwrap_or(NEVER);
            store.set_epoch_deadline(ticks.clamp(1, NEVER));
        }
        Ok(store)
    }
}

/// Every `.wasm` in a directory, in name order.
///
/// A directory that is not there holds none, which is no failure: not having
/// written a plugin is the normal state of a workspace.
#[must_use]
pub fn modules_in(at: &Path) -> Vec<PathBuf> {
    let mut found: Vec<PathBuf> = match fs::read_dir(at) {
        Ok(entries) => entries
            .flatten()
            .map(|one| one.path())
            .filter(|one| one.extension().is_some_and(|kind| kind == "wasm"))
            .collect(),
        Err(_) => Vec::new(),
    };
    found.sort();
    found
}

/// Why a call stopped, in a sentence that names the limit it reached, if it
/// reached one. `noun` is what the world calls a component, such as a tool.
#[must_use]
pub fn stopped(why: &wasmtime::Error, limits: Limits, noun: &str) -> String {
    match why.downcast_ref::<Trap>() {
        Some(Trap::OutOfFuel) => format!(
            "the {noun} stopped: it used all {} units of its fuel",
            limits.fuel
        ),
        Some(Trap::Interrupt) => format!(
            "the {noun} stopped: it ran past its limit of {} seconds",
            limits.time.as_secs_f64()
        ),
        _ => format!("the {noun} stopped: {why}"),
    }
}

#[cfg(test)]
mod tests {
    use super::digest_of;

    /// The empty digest, which is the one value every implementation prints.
    #[test]
    fn a_digest_is_the_one_everybody_else_computes() {
        assert_eq!(
            digest_of(b""),
            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            digest_of(b"abc"),
            "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    /// A block boundary, which is where a hand-written round loop goes wrong.
    #[test]
    fn a_digest_crosses_the_blocks_a_message_is_split_into() {
        let long = "a".repeat(1000);
        assert_eq!(
            digest_of(long.as_bytes()),
            "sha256:41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3"
        );
    }
}
