//! The `fusion:tools` world: a WebAssembly component that offers tools to a
//! model, built against `wit/tools.wit`.
//!
//! **A tool reaches only what its grant names.** The world imports three
//! functions, which read a file, fetch a URL, and read a secret, and the host
//! checks each call against the [`Grant`] before it does anything. A module
//! importing anything else, such as WASI's filesystem, fails to instantiate
//! and is refused by name, as a rule module is.
//!
//! **Every call runs under its [`Limits`]**: fuel, which bounds the work it
//! does, a deadline, which bounds the time it takes, a memory cap, and how
//! many fetches it makes and how many bytes they bring back. A call that
//! reaches one stops, and the error names the limit. The deadline holds a
//! fetch too: the deadline is checked only while the module runs, so the
//! embedder is handed the time the call has left.
//!
//! **A store per call**, as for a rule, so one call leaves nothing behind for
//! the next.

use std::fs;
use std::io::Read as _;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use fusion_plugin_host::wasmtime::component::{HasSelf, Linker};
use fusion_plugin_host::wasmtime::Store;
use fusion_plugin_host::{stopped, Bounded, Loader, Module, Refused, World};

mod naming;

pub use naming::Naming;

mod bindings {
    fusion_plugin_host::wasmtime::component::bindgen!({
        path: "../wit/tools.wit",
        world: "tool",
        wasmtime_crate: fusion_plugin_host::wasmtime,
    });
}

use bindings::fusion::tools::host;

/// The version of the `fusion:tools` world this host speaks.
pub const TOOL_WORLD: u32 = 1;

/// The tools world, as a refusal names it.
const TOOLS: World = World {
    package: "fusion:tools",
    noun: "tool",
};

/// The most a tool may read from one file, in bytes.
const MOST_READ: u64 = 1024 * 1024;

/// One tool a module provides, as the model is offered it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Spec {
    pub name: String,
    pub description: String,
    /// The JSON Schema of the input, as the module wrote it.
    pub input_schema: String,
    /// Whether a call only reads.
    pub read_only: bool,
}

/// What a tool may reach. Empty, it reaches nothing.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Grant {
    /// Folders the tool may read, with everything in them.
    pub read: Vec<PathBuf>,
    /// Hosts the tool may reach, each with its subdomains.
    pub hosts: Vec<String>,
    /// Environment variables the tool may read.
    pub secrets: Vec<String>,
}

/// How far one call may run.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Limits {
    /// The work a call may do, in Wasmtime's units of fuel: about one for each
    /// instruction.
    pub fuel: u64,
    /// The longest a call may run, counting only time spent in the module.
    pub time: Duration,
    /// The most memory a call may hold, in bytes.
    pub memory: usize,
    /// The most fetches a call may make.
    pub fetches: u32,
    /// The most bytes a call's fetches may bring back, all together.
    pub fetched: usize,
}

impl Default for Limits {
    fn default() -> Self {
        let run = fusion_plugin_host::Limits::default();
        Self {
            fuel: run.fuel,
            time: run.time,
            memory: run.memory,
            fetches: 16,
            fetched: 8 * 1024 * 1024,
        }
    }
}

impl From<Limits> for fusion_plugin_host::Limits {
    fn from(limits: Limits) -> Self {
        Self {
            fuel: limits.fuel,
            time: limits.time,
            memory: limits.memory,
        }
    }
}

/// What one fetch may take: the bytes and the time the call has left.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Allowance {
    /// The most bytes the answer may bring back.
    pub bytes: usize,
    /// The longest the request may take, the answer read whole.
    pub time: Duration,
}

/// How the host sends a request the grant allows. The embedder supplies it,
/// so this crate carries no HTTP client. It follows no redirect to a host the
/// grant does not name, connects to no address on this machine or a private
/// network the grant does not name, and reads no more than `allowance`.
pub trait Fetch: Send + Sync {
    /// The text `url` answers with, cut at `allowance.bytes` and given up at
    /// `allowance.time`.
    ///
    /// # Errors
    ///
    /// A sentence saying why the request failed.
    fn fetch(&self, url: &str, hosts: &[String], allowance: Allowance) -> Result<String, String>;
}

/// A [`Fetch`] that sends nothing, for an embedder with no network to lend.
pub struct NoFetch;

impl Fetch for NoFetch {
    fn fetch(&self, url: &str, _: &[String], _: Allowance) -> Result<String, String> {
        Err(format!(
            "{url} was not fetched: this host sends no requests"
        ))
    }
}

/// What a call's store holds: its grant, its way out, and what its fetches
/// have spent. The loader holds its memory cap.
struct State {
    /// When the call's time runs out.
    deadline: Instant,
    fetch: Arc<dyn Fetch>,
    /// The bytes the call's fetches have brought back.
    fetched: usize,
    /// How many fetches the call has made.
    fetches: u32,
    grant: Grant,
    most: Limits,
}

/// `text` parsed as the HTTP client parses it, and its host, lowercased. None
/// for a URL that is not http or https, or that carries a user name, which
/// could hide the host a reader sees.
///
/// **The parser is the client's own.** A host read off the text by hand can
/// differ from the one the client connects to: `https://evil.com\.good.com/`
/// reads as a subdomain of good.com, and a URL parser, which reads the
/// backslash as a slash, connects to evil.com.
fn parsed(text: &str) -> Option<(url::Url, String)> {
    let url = url::Url::parse(text).ok()?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return None;
    }
    let host = url
        .host_str()?
        .trim_start_matches('[')
        .trim_end_matches(']')
        .to_ascii_lowercase();
    Some((url, host))
}

#[cfg(test)]
fn host_of(text: &str) -> Option<String> {
    parsed(text).map(|(_, host)| host)
}

/// Whether `host` is one of `granted`, or a subdomain of one.
fn reaches(host: &str, granted: &[String]) -> bool {
    granted.iter().any(|one| {
        let one = one.to_ascii_lowercase();
        host == one || host.ends_with(&format!(".{one}"))
    })
}

impl host::Host for State {
    fn read_file(&mut self, path: String) -> Result<String, String> {
        let outside =
            || format!("{path} is outside the folders this tool may read, or is not there");
        if !Path::new(&path).is_absolute() {
            return Err(format!("{path} is not a whole path. Give it from the root"));
        }
        let real = Path::new(&path).canonicalize().map_err(|_| outside())?;
        let inside = self
            .grant
            .read
            .iter()
            .filter_map(|folder| folder.canonicalize().ok())
            .any(|folder| real.starts_with(folder));
        if !inside {
            return Err(outside());
        }
        let mut bytes = Vec::new();
        fs::File::open(&real)
            .and_then(|file| file.take(MOST_READ + 1).read_to_end(&mut bytes))
            .map_err(|why| format!("{path} could not be read: {why}"))?;
        if bytes.len() as u64 > MOST_READ {
            return Err(format!("{path} is larger than {MOST_READ} bytes"));
        }
        String::from_utf8(bytes).map_err(|_| format!("{path} is not text"))
    }

    fn fetch(&mut self, url: String) -> Result<String, String> {
        let (parsed, host) = parsed(&url)
            .ok_or_else(|| format!("{url} is not an http or https URL with a plain host"))?;
        if !reaches(&host, &self.grant.hosts) {
            return Err(format!("{host} is not a host this tool may reach"));
        }
        if self.fetches >= self.most.fetches {
            return Err(format!(
                "{url} was not fetched: the call reached its limit of {} fetches",
                self.most.fetches
            ));
        }
        let bytes = self.most.fetched.saturating_sub(self.fetched);
        if bytes == 0 {
            return Err(format!(
                "{url} was not fetched: the call's fetches reached their limit of {} bytes",
                self.most.fetched
            ));
        }
        let time = self.deadline.saturating_duration_since(Instant::now());
        if time.is_zero() {
            return Err(format!(
                "{url} was not fetched: the call ran past its limit of {} seconds",
                self.most.time.as_secs_f64()
            ));
        }
        self.fetches += 1;
        // The embedder is handed the URL as it was parsed, so the host it
        // reaches is the host that was checked.
        let text = self.fetch.fetch(
            parsed.as_str(),
            &self.grant.hosts,
            Allowance { bytes, time },
        )?;
        let text = cut(text, bytes);
        self.fetched += text.len();
        Ok(text)
    }

    fn secret(&mut self, name: String) -> Result<String, String> {
        if !self.grant.secrets.contains(&name) {
            return Err(format!("{name} is not a variable this tool may read"));
        }
        std::env::var(&name).map_err(|_| format!("{name} is not set"))
    }
}

/// `text` cut to at most `bytes`, at a character's boundary, for an embedder
/// that read more than it was allowed.
fn cut(mut text: String, bytes: usize) -> String {
    if text.len() > bytes {
        let mut end = bytes;
        while !text.is_char_boundary(end) {
            end -= 1;
        }
        text.truncate(end);
    }
    text
}

/// One module of tools, loaded and ready to call.
pub struct Toolbox {
    /// The SHA-256 of the module's bytes.
    pub digest: String,
    pub file: PathBuf,
    linker: Linker<Bounded<State>>,
    loader: Loader,
    module: Module,
    /// The tools it provides, in its own order.
    pub tools: Vec<Spec>,
}

impl std::fmt::Debug for Toolbox {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        into.debug_struct("Toolbox")
            .field("digest", &self.digest)
            .field("file", &self.file)
            .field("tools", &self.tools)
            .finish_non_exhaustive()
    }
}

impl Toolbox {
    /// Loads the module at `file` and asks it what it provides.
    ///
    /// # Errors
    ///
    /// [`Refused`] for a file that is not a component, one that imports what
    /// this host does not lend, one built against another version of the
    /// world, or one that fails to say what it provides within the limits.
    pub fn load(loader: &Loader, file: &Path, limits: Limits) -> Result<Self, Refused> {
        let refused = |why: String| Refused {
            file: file.to_path_buf(),
            why,
        };
        let module = loader.read(file, TOOLS)?;
        let mut linker = Linker::new(loader.engine());
        bindings::Tool::add_to_linker::<Bounded<State>, HasSelf<State>>(&mut linker, |held| {
            &mut held.state
        })
        .map_err(|why| refused(format!("the host functions would not link: {why}")))?;
        let mut toolbox = Self {
            digest: module.digest.clone(),
            file: file.to_path_buf(),
            linker,
            loader: loader.clone(),
            module,
            tools: Vec::new(),
        };
        let (mut store, tool) = toolbox
            .start(&Grant::default(), limits, Arc::new(NoFetch))
            .map_err(|why| {
                refused(format!(
                    "it could not be started: {why}. A tool is lent three host functions and \
                     nothing else, so a module importing a filesystem, a clock, or a network is \
                     refused here"
                ))
            })?;
        let spoken = tool.call_world_version(&mut store).map_err(|why| {
            refused(format!(
                "it would not say which world it speaks: {}",
                stopped(&why, limits.into(), "tool")
            ))
        })?;
        if spoken != TOOL_WORLD {
            return Err(refused(format!(
                "it was built against fusion:tools world {spoken} and this host speaks world \
                 {TOOL_WORLD}. Rebuild it against world {TOOL_WORLD}"
            )));
        }
        toolbox.tools = tool
            .call_tools(&mut store)
            .map_err(|why| {
                refused(format!(
                    "it would not say what tools it provides: {}",
                    stopped(&why, limits.into(), "tool")
                ))
            })?
            .into_iter()
            .map(|spec| Spec {
                name: spec.name,
                description: spec.description,
                input_schema: spec.input_schema,
                read_only: spec.read_only,
            })
            .collect();
        Ok(toolbox)
    }

    /// A fresh store under `limits`, and the module started in it.
    fn start(
        &self,
        grant: &Grant,
        limits: Limits,
        fetch: Arc<dyn Fetch>,
    ) -> fusion_plugin_host::wasmtime::Result<(Store<Bounded<State>>, bindings::Tool)> {
        let mut store = self.loader.store(
            State {
                deadline: Instant::now() + limits.time,
                fetch,
                fetched: 0,
                fetches: 0,
                grant: grant.clone(),
                most: limits,
            },
            limits.into(),
        )?;
        let tool = bindings::Tool::instantiate(&mut store, &self.module.component, &self.linker)?;
        Ok((store, tool))
    }

    /// Runs one call of the tool `name`, reaching only what `grant` names.
    ///
    /// # Errors
    ///
    /// A sentence for the model: the tool's own error, or why it stopped,
    /// naming the limit it reached.
    pub fn call(
        &self,
        name: &str,
        input: &str,
        grant: &Grant,
        limits: Limits,
        fetch: Arc<dyn Fetch>,
    ) -> Result<String, String> {
        let (mut store, tool) = self
            .start(grant, limits, fetch)
            .map_err(|why| stopped(&why, limits.into(), "tool"))?;
        tool.call_call(&mut store, name, input)
            .map_err(|why| stopped(&why, limits.into(), "tool"))?
    }
}

#[cfg(test)]
mod tests {
    use super::{host_of, reaches};

    #[test]
    fn a_url_names_its_host_and_nothing_hides_another() {
        assert_eq!(
            host_of("https://API.example.com/v1?q=1").as_deref(),
            Some("api.example.com")
        );
        assert_eq!(
            host_of("http://example.com:8080").as_deref(),
            Some("example.com")
        );
        assert_eq!(host_of("http://[::1]:4180/").as_deref(), Some("::1"));
        assert_eq!(host_of("https://example.com@evil.example/"), None);
        assert_eq!(host_of("file:///etc/hosts"), None);
        assert_eq!(
            host_of("https://evil.com\\.good.com/x").as_deref(),
            Some("evil.com"),
            "a backslash is a slash, as the client reads it"
        );
        assert!(!reaches("evil.com", &["good.com".to_owned()]));
    }

    #[test]
    fn a_grant_reaches_a_host_and_its_subdomains_and_no_look_alike() {
        let granted = vec!["example.com".to_owned()];
        assert!(reaches("example.com", &granted));
        assert!(reaches("api.example.com", &granted));
        assert!(!reaches("notexample.com", &granted));
        assert!(!reaches("example.com.evil.example", &granted));
    }
}
