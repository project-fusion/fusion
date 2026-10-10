//! The relay `initDiagnostics()` sends its runs to: `helix diagnostics`.
//!
//! **Beside any dev server, whatever builds the app.** A page cannot write to
//! a terminal, and a plugin per bundler is a plugin per framework, so the
//! terminal gets a process of its own: the page posts each run to it on
//! `127.0.0.1`, and it prints what is new, findings and the runtime events
//! the library reported, keeps the latest run of each page, and writes them to
//! `--out` as the CI file. It also serves the project's
//! `helix-diagnostics.json`, which a page cannot read from disk.
//!
//! **Only pages on a local host may post.** A page anywhere on the web could
//! otherwise reach a port on the developer's machine, so a request carrying
//! an `Origin` that is no local host is refused, and is given no CORS header
//! to read the refusal with. A request with no `Origin`, from a script or
//! `curl`, is the developer's own.
//!
//! **With `--json`, one document a line**: the address first, then each page's
//! counts, new findings, and new runtime events whenever it prints them, for a
//! script or an agent reading the stream.
//!
//! **`--once` opens the pages itself instead.** Each is loaded headless
//! through the capture driver `helix visual` runs, the installed diagnostics
//! run in it, and each run prints as a posted one would before the command
//! exits, which is the page half of `helix scan` for an agent or a CI job.
//!
//! The standard library's listener and nothing else: a dev tool answering one
//! page at a time needs no server framework, and the CLI ships to every
//! consumer.

use std::collections::{HashMap, HashSet};
use std::fmt::Write as _;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::time::Duration;

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use serde_json::{json, Value};

use crate::args::Diagnostics;

/// The largest body a run may have, so a stray upload cannot fill memory.
const LARGEST: usize = 8 * 1024 * 1024;

/// How long a connection may take to say what it wants.
const PATIENCE: Duration = Duration::from_secs(5);

/// The runtime kinds a finding already reports, which are not printed twice:
/// two copies of Helix on a page is the `duplicate-registration` finding. The
/// page's console and overlay leave out the same ones.
const AS_FINDINGS: [&str; 1] = ["duplicate-registration"];

/// The packages a page's diagnostics are judged against, as `diagnose()`
/// names its tiers.
const TIERS: [&str; 2] = ["@fusion.dev/helix", "@fusion.dev/helix-headless"];

/// A file in an installed package, from `from`'s `node_modules` up.
fn installed(from: &Path, package: &str, file: &str) -> Option<PathBuf> {
    from.ancestors()
        .map(|dir| dir.join("node_modules").join(package).join(file))
        .find(|path| path.exists())
}

/// Each page opened headless and diagnosed once against the installed
/// packages: its run, or `{ error, url }` where it could not be.
///
/// # Errors
///
/// The diagnostics or every Helix package are not installed, or no browser
/// would start.
pub fn pages(from: &Path, urls: &[String], config: Option<&Path>) -> Outcome<Vec<Value>> {
    let dist = installed(from, "@fusion.dev/helix-diagnostics", "dist")
        .filter(|dist| dist.join("index.js").is_file())
        .ok_or_else(|| {
            Failure::input(
                "@fusion.dev/helix-diagnostics is not installed",
                "the page runs the installed diagnostics, and there are none in node_modules",
            )
            .hint("npm install --save-dev @fusion.dev/helix-diagnostics")
        })?;
    let tiers: Vec<Value> = TIERS
        .iter()
        .filter_map(|name| {
            let path = installed(from, name, "custom-elements.json")?;
            let manifest: Value =
                serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()?;
            Some(json!({ "manifest": manifest, "name": name }))
        })
        .collect();
    if tiers.is_empty() {
        return Err(Failure::input(
            "no Helix package is installed",
            "a page is judged against the manifests of the Helix packages in node_modules",
        )
        .hint("npm install @fusion.dev/helix"));
    }
    let settings = config.map_or_else(|| from.join("helix-diagnostics.json"), Path::to_path_buf);
    let file = std::fs::read_to_string(&settings)
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok());
    fusion_helix_visual::diagnose(
        from,
        &fusion_helix_visual::Pages {
            dist,
            file,
            ready: Some("whenSettled"),
            tiers,
            urls,
        },
    )
    .map_err(|why| Failure::input("cannot open the pages", why))
}

/// Each page opened, diagnosed once, and printed, and the code the worst of
/// them earned.
fn once(args: &Diagnostics, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    let runs = pages(from, &args.once, args.config.as_deref())?;
    let mut relay = Relay::new(args.out.clone(), json, paint);
    let mut code = Code::Ok;
    for (url, run) in args.once.iter().zip(runs) {
        if let Some(error) = run.get("error").and_then(Value::as_str) {
            if json {
                fusion_rules::say!("{}", json!({ "error": error, "page": url }));
            } else {
                eprintln!("helix diagnostics: {url}: {error}");
            }
            code = Code::Input;
            continue;
        }
        let errors = run
            .get("findings")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .any(|finding| finding.get("severity").and_then(Value::as_str) == Some("error"));
        if errors && code == Code::Ok {
            code = Code::Failed;
        }
        relay.take(run);
    }
    Ok(code)
}

/// Serves until stopped, or with `--once`, diagnoses the pages it names and
/// exits.
pub fn run(args: &Diagnostics, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    if !args.once.is_empty() {
        return once(args, from, json, paint);
    }
    let listener = TcpListener::bind(("127.0.0.1", args.port)).map_err(|error| {
        Failure::new(
            Code::Input,
            format!("Could not listen on 127.0.0.1:{}", args.port),
            error.to_string(),
        )
    })?;
    let address = listener.local_addr().map_err(|error| {
        Failure::new(Code::Internal, "No address to listen on", error.to_string())
    })?;
    /* **The first line is the address**, so a script that asked for port 0
    learns which one it got. */
    if json {
        fusion_rules::say!("{}", json!({ "listening": format!("http://{address}") }));
    } else {
        fusion_rules::say!("helix diagnostics: listening on http://{address}");
    }
    let _ = std::io::stdout().flush();
    let settings = args
        .config
        .clone()
        .unwrap_or_else(|| from.join("helix-diagnostics.json"));
    let mut relay = Relay::new(args.out.clone(), json, paint);
    /* Read once now, so a file that cannot be served is said before a page
    asks for it. */
    relay.settings(&settings);
    for stream in listener.incoming() {
        let Ok(stream) = stream else {
            continue;
        };
        /* **One bad request never stops the relay**: it is said, and the
        next is answered. */
        if let Err(error) = relay.answer(&stream, &settings) {
            eprintln!("helix diagnostics: a request failed: {error}");
        }
    }
    Ok(Code::Ok)
}

/// One request, as far as the relay reads it.
struct Request {
    body: Vec<u8>,
    method: String,
    origin: Option<String>,
    path: String,
}

/// Whether an `Origin` is a page on a local host, any port.
fn local(origin: &str) -> bool {
    let Some(rest) = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
    else {
        return false;
    };
    let host = if rest.starts_with('[') {
        rest.split_inclusive(']').next().unwrap_or("")
    } else {
        rest.split([':', '/']).next().unwrap_or("")
    }
    .to_ascii_lowercase();
    matches!(host.as_str(), "localhost" | "127.0.0.1" | "[::1]")
        || [".localhost", ".test"].iter().any(|suffix| {
            host.strip_suffix(suffix)
                .is_some_and(|name| !name.is_empty())
        })
}

/// Reads one request: the line, the headers it needs, and the body.
fn read(stream: &TcpStream) -> std::io::Result<Request> {
    stream.set_read_timeout(Some(PATIENCE))?;
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut line = String::new();
    reader.read_line(&mut line)?;
    let mut parts = line.split_whitespace();
    let method = parts.next().unwrap_or("").to_owned();
    let path = parts
        .next()
        .unwrap_or("/")
        .split('?')
        .next()
        .unwrap_or("/")
        .to_owned();
    let mut length = 0usize;
    let mut origin = None;
    loop {
        let mut header = String::new();
        if reader.read_line(&mut header)? == 0 || header == "\r\n" || header == "\n" {
            break;
        }
        if let Some((name, value)) = header.split_once(':') {
            let value = value.trim();
            match name.trim().to_ascii_lowercase().as_str() {
                "content-length" => length = value.parse().unwrap_or(0),
                "origin" => origin = Some(value.to_owned()),
                _ => {}
            }
        }
    }
    if length > LARGEST {
        return Err(std::io::Error::other(format!(
            "a body of {length} bytes, over the {LARGEST} a run may have"
        )));
    }
    let mut body = vec![0; length];
    reader.read_exact(&mut body)?;
    Ok(Request {
        body,
        method,
        origin,
        path,
    })
}

/// The settings file's text where it reads and parses, or why it does not.
/// No file at all is `Ok(None)`, since a project need not have one.
fn served(settings: &Path) -> Result<Option<String>, String> {
    let text = match std::fs::read_to_string(settings) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("could not read {} ({error})", settings.display())),
    };
    match serde_json::from_str::<Value>(&text) {
        Ok(_) => Ok(Some(text)),
        Err(error) => Err(format!("{} is not JSON ({error})", settings.display())),
    }
}

/// Writes one response, with the CORS headers a local page reads it by.
fn respond(
    mut stream: &TcpStream,
    status: &str,
    origin: Option<&str>,
    kind: &str,
    body: &[u8],
) -> std::io::Result<()> {
    let mut head = format!(
        "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\nContent-Type: {kind}\r\n",
        body.len()
    );
    if let Some(origin) = origin {
        let _ = write!(
            head,
            "Access-Control-Allow-Origin: {origin}\r\nVary: Origin\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: content-type\r\n"
        );
    }
    head.push_str("\r\n");
    stream.write_all(head.as_bytes())?;
    stream.write_all(body)?;
    stream.flush()
}

/// Writes the CI file: `runs` in place of every run from `source`, and every
/// run from another source kept as the file has it, so the relay and
/// `helix scan` can write one `--out`, in either order. A run that names no
/// source is a page's.
pub fn write_runs(out: &Path, source: &str, runs: &[&Value]) -> std::io::Result<()> {
    let kept: Vec<Value> = std::fs::read_to_string(out)
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|file| file.get("runs").and_then(Value::as_array).cloned())
        .unwrap_or_default()
        .into_iter()
        .filter(|run| {
            run.pointer("/run/source")
                .and_then(Value::as_str)
                .unwrap_or("page")
                != source
        })
        .collect();
    let mut all: Vec<&Value> = kept.iter().collect();
    all.extend(runs);
    let file = json!({ "runs": all, "schema": 1 });
    /* The folder made as the CI sink makes it, so one `--out` works for
    both. */
    out.parent().map_or(Ok(()), std::fs::create_dir_all)?;
    std::fs::write(out, format!("{file:#}\n"))
}

/// What the relay holds: the latest run of each page, and what it has printed.
struct Relay {
    json: bool,
    /// The latest run of each page, by page.
    latest: HashMap<String, Value>,
    out: Option<PathBuf>,
    paint: Paint,
    /// The run identities already taken, so a run sent twice is taken once.
    seen: HashSet<String>,
    /// The fingerprints printed, by page, so a page repeats nothing.
    shown: HashMap<String, HashSet<String>>,
    /// Each page's counts when last printed, so an unchanged page prints nothing:
    /// errors, warnings, info, and runtime events.
    said: HashMap<String, (usize, usize, usize, usize)>,
    /// Why the settings file was last not served, so each reason is said once.
    unserved: Option<String>,
}

impl Relay {
    fn new(out: Option<PathBuf>, json: bool, paint: Paint) -> Self {
        Self {
            json,
            latest: HashMap::new(),
            out,
            paint,
            said: HashMap::new(),
            seen: HashSet::new(),
            shown: HashMap::new(),
            unserved: None,
        }
    }

    /// The settings file to serve. **One that does not read or parse is said
    /// in the terminal**, once for each reason: the page asks for it on every
    /// load, and a 404 alone would leave it running on the shipped settings
    /// with nothing saying why.
    fn settings(&mut self, settings: &Path) -> Option<String> {
        match served(settings) {
            Ok(text) => {
                self.unserved = None;
                text
            }
            Err(why) => {
                if self.unserved.as_deref() != Some(why.as_str()) {
                    eprintln!(
                        "helix diagnostics: {why}, so pages run without these settings until the file is fixed."
                    );
                    self.unserved = Some(why);
                }
                None
            }
        }
    }

    fn answer(&mut self, stream: &TcpStream, settings: &Path) -> std::io::Result<()> {
        let request = read(stream)?;
        let allowed = match request.origin.as_deref() {
            Some(origin) if local(origin) => Some(origin.to_owned()),
            Some(_) => {
                return respond(stream, "403 Forbidden", None, "text/plain", b"");
            }
            None => None,
        };
        let origin = allowed.as_deref();
        match (request.method.as_str(), request.path.as_str()) {
            ("OPTIONS", _) => respond(stream, "204 No Content", origin, "text/plain", b""),
            ("GET", "/health") => {
                let body = json!({ "relay": "helix diagnostics", "version": crate::shipped() });
                respond(
                    stream,
                    "200 OK",
                    origin,
                    "application/json",
                    body.to_string().as_bytes(),
                )
            }
            /* Only what parses: a page handed half a file would read it as no
            settings at all. */
            ("GET", "/config") => match self.settings(settings) {
                Some(text) => respond(
                    stream,
                    "200 OK",
                    origin,
                    "application/json",
                    text.as_bytes(),
                ),
                None => respond(stream, "404 Not Found", origin, "text/plain", b""),
            },
            ("POST", "/runs") => {
                let Ok(value) = serde_json::from_slice::<Value>(&request.body) else {
                    return respond(stream, "400 Bad Request", origin, "text/plain", b"");
                };
                let runs = match value {
                    Value::Array(runs) => runs,
                    run => vec![run],
                };
                for run in runs {
                    self.take(run);
                }
                respond(stream, "204 No Content", origin, "text/plain", b"")
            }
            _ => respond(stream, "404 Not Found", origin, "text/plain", b""),
        }
    }

    /// Takes one run: prints what is new, keeps it as its page's latest, and writes the file.
    fn take(&mut self, run: Value) {
        if let Some(id) = run.pointer("/run/id").and_then(Value::as_str) {
            if !self.seen.insert(id.to_owned()) {
                return;
            }
        }
        let page = run
            .pointer("/run/page")
            .and_then(Value::as_str)
            .unwrap_or("(no page)")
            .to_owned();
        self.print(&page, &run);
        self.latest.insert(page, run);
        if let Some(out) = &self.out {
            let mut runs: Vec<&Value> = self.latest.values().collect();
            runs.sort_by_key(|run| {
                run.pointer("/run/page")
                    .and_then(Value::as_str)
                    .unwrap_or("")
            });
            if let Err(error) = write_runs(out, "page", &runs) {
                eprintln!(
                    "helix diagnostics: could not write {}: {error}",
                    out.display()
                );
            }
        }
    }

    /// Prints a page's counts when they change, and each finding and runtime
    /// event the first time it is seen there.
    fn print(&mut self, page: &str, run: &Value) {
        let list = |key: &str| {
            run.get(key)
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
        };
        let findings = list("findings");
        /* What the library reported as it ran, less what a finding already says. */
        let runtime: Vec<Value> = list("runtime")
            .into_iter()
            .filter(|one| {
                one.get("kind")
                    .and_then(Value::as_str)
                    .is_some_and(|kind| !AS_FINDINGS.contains(&kind))
            })
            .collect();
        let of = |severity: &str| {
            findings
                .iter()
                .filter(|finding| finding.get("severity").and_then(Value::as_str) == Some(severity))
                .count()
        };
        let counts = (of("error"), of("warn"), of("info"), runtime.len());
        let shown = self.shown.entry(page.to_owned()).or_default();
        let mut new = |items: &[Value]| -> Vec<Value> {
            items
                .iter()
                .filter(|item| {
                    item.get("fingerprint")
                        .and_then(Value::as_str)
                        .is_some_and(|fingerprint| shown.insert(fingerprint.to_owned()))
                })
                .cloned()
                .collect()
        };
        let fresh = new(&findings);
        let heard = new(&runtime);
        if fresh.is_empty() && heard.is_empty() && self.said.get(page) == Some(&counts) {
            return;
        }
        self.said.insert(page.to_owned(), counts);
        if self.json {
            let line = json!({
                "counts": { "error": counts.0, "info": counts.2, "runtime": counts.3, "warn": counts.1 },
                "findings": fresh,
                "page": page,
                "runtime": heard,
            });
            fusion_rules::say!("{line}");
            let _ = std::io::stdout().flush();
            return;
        }
        self.write(page, counts, &fresh, &heard);
    }

    /// Writes a page's counts, then its new findings and runtime events, as text.
    fn write(
        &self,
        page: &str,
        counts: (usize, usize, usize, usize),
        fresh: &[Value],
        heard: &[Value],
    ) {
        let plural = |count: usize, noun: &str| {
            if count == 1 {
                format!("{count} {noun}")
            } else {
                format!("{count} {noun}s")
            }
        };
        let heading = format!(
            "{page}: {}, {}, {} info{}",
            plural(counts.0, "error"),
            plural(counts.1, "warning"),
            counts.2,
            if counts.3 > 0 {
                format!(", {} runtime", counts.3)
            } else {
                String::new()
            }
        );
        fusion_rules::say!(
            "{}",
            if counts.0 + counts.1 + counts.3 > 0 {
                self.paint.fail(&heading)
            } else {
                self.paint.pass(&heading)
            }
        );
        for finding in fresh {
            let text = |key: &str| finding.get(key).and_then(Value::as_str).unwrap_or("");
            fusion_rules::say!(
                "  {} {}",
                self.paint
                    .bold(&format!("{} {}", text("severity"), text("kind"))),
                text("subject")
            );
            fusion_rules::say!("    {}", text("message"));
            if let Some(sheet) = finding.pointer("/origin/sheet").and_then(Value::as_str) {
                fusion_rules::say!("    {}", self.paint.dim(&format!("in {sheet}")));
            }
        }
        for event in heard {
            let text = |key: &str| event.get(key).and_then(Value::as_str).unwrap_or("");
            let tag = text("tag");
            fusion_rules::say!(
                "  {}{}",
                self.paint
                    .bold(&format!("{} runtime {}", text("level"), text("kind"))),
                if tag.is_empty() {
                    String::new()
                } else {
                    format!(" <{tag}>")
                }
            );
            fusion_rules::say!("    {}", text("message"));
        }
        let _ = std::io::stdout().flush();
    }
}

#[cfg(test)]
mod tests {
    use super::local;

    #[test]
    fn only_a_local_host_is_local() {
        for origin in [
            "http://localhost:5173",
            "https://localhost",
            "http://127.0.0.1:3000",
            "http://[::1]:8080",
            "http://app.localhost:3000",
            "https://shop.test",
        ] {
            assert!(local(origin), "{origin}");
        }
        for origin in [
            "https://example.com",
            "http://localhost.example.com",
            "http://127.0.0.1.example.com",
            "file://localhost",
            "null",
        ] {
            assert!(!local(origin), "{origin}");
        }
    }
}
