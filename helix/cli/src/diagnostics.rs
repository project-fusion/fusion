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

/// Serves until stopped.
pub fn run(args: &Diagnostics, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
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
        println!("{}", json!({ "listening": format!("http://{address}") }));
    } else {
        println!("helix diagnostics: listening on http://{address}");
    }
    let _ = std::io::stdout().flush();
    let settings = args
        .config
        .clone()
        .unwrap_or_else(|| from.join("helix-diagnostics.json"));
    let mut relay = Relay::new(args.out.clone(), json, paint);
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
            ("GET", "/config") => match std::fs::read_to_string(settings) {
                /* Only what parses: a page handed half a file would read it
                as no settings at all. */
                Ok(text) if serde_json::from_str::<Value>(&text).is_ok() => respond(
                    stream,
                    "200 OK",
                    origin,
                    "application/json",
                    text.as_bytes(),
                ),
                _ => respond(stream, "404 Not Found", origin, "text/plain", b""),
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
            println!("{line}");
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
        println!(
            "{}",
            if counts.0 + counts.1 + counts.3 > 0 {
                self.paint.fail(&heading)
            } else {
                self.paint.pass(&heading)
            }
        );
        for finding in fresh {
            let text = |key: &str| finding.get(key).and_then(Value::as_str).unwrap_or("");
            println!(
                "  {} {}",
                self.paint
                    .bold(&format!("{} {}", text("severity"), text("kind"))),
                text("subject")
            );
            println!("    {}", text("message"));
            if let Some(sheet) = finding.pointer("/origin/sheet").and_then(Value::as_str) {
                println!("    {}", self.paint.dim(&format!("in {sheet}")));
            }
        }
        for event in heard {
            let text = |key: &str| event.get(key).and_then(Value::as_str).unwrap_or("");
            let tag = text("tag");
            println!(
                "  {}{}",
                self.paint
                    .bold(&format!("{} runtime {}", text("level"), text("kind"))),
                if tag.is_empty() {
                    String::new()
                } else {
                    format!(" <{tag}>")
                }
            );
            println!("    {}", text("message"));
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
