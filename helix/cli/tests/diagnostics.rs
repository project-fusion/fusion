//! `helix diagnostics`, the relay, driven over HTTP as a page drives it.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{channel, Receiver};
use std::time::Duration;

fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

/// The relay, running, with its address and every line it prints, to its
/// output and to its errors.
struct Relay {
    address: String,
    child: Child,
    directory: PathBuf,
    errors: Receiver<String>,
    lines: Receiver<String>,
}

/// Each line `from` writes, as it writes it.
fn lines_of(from: impl Read + Send + 'static) -> Receiver<String> {
    let (send, lines) = channel();
    std::thread::spawn(move || {
        for line in BufReader::new(from).lines().map_while(Result::ok) {
            if send.send(line).is_err() {
                break;
            }
        }
    });
    lines
}

impl Relay {
    fn start(name: &str, settings: Option<&str>) -> Self {
        Self::started(name, settings, false)
    }

    /// The relay, printing a JSON document a line where `json` is set.
    fn started(name: &str, settings: Option<&str>, json: bool) -> Self {
        let directory = std::env::temp_dir().join(format!("fusion-helix-relay-{name}"));
        let _ = std::fs::remove_dir_all(&directory);
        std::fs::create_dir_all(&directory).expect("a temp directory");
        if let Some(settings) = settings {
            std::fs::write(directory.join("helix-diagnostics.json"), settings).expect("settings");
        }
        let mut child = Command::new(binary())
            .args(["diagnostics", "--port", "0", "--out", "reports/runs.json"])
            .args(json.then_some("--json"))
            .current_dir(&directory)
            .env("NO_COLOR", "1")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("the relay starts");
        let lines = lines_of(child.stdout.take().expect("its output"));
        let errors = lines_of(child.stderr.take().expect("its errors"));
        let first = lines
            .recv_timeout(Duration::from_secs(10))
            .expect("it says where it listens");
        let address = if json {
            let line: serde_json::Value = serde_json::from_str(&first).expect("a JSON line");
            line["listening"]
                .as_str()
                .and_then(|url| url.strip_prefix("http://"))
                .expect("an address")
                .to_owned()
        } else {
            first
                .rsplit("http://")
                .next()
                .expect("an address")
                .trim()
                .to_owned()
        };
        Self {
            address,
            child,
            directory,
            errors,
            lines,
        }
    }

    /// One request, and the whole response as text.
    fn ask(&self, method: &str, path: &str, origin: Option<&str>, body: &str) -> String {
        let mut stream = TcpStream::connect(&self.address).expect("it accepts");
        let origin = origin
            .map(|origin| format!("Origin: {origin}\r\n"))
            .unwrap_or_default();
        let request = format!(
            "{method} {path} HTTP/1.1\r\nHost: {}\r\n{origin}Content-Type: text/plain\r\nContent-Length: {}\r\n\r\n{body}",
            self.address,
            body.len()
        );
        stream.write_all(request.as_bytes()).expect("it is written");
        let mut response = String::new();
        stream.read_to_string(&mut response).expect("it answers");
        response
    }

    /// The lines printed since the last call, waiting briefly for them.
    fn printed(&self) -> Vec<String> {
        Self::since(&self.lines)
    }

    /// The lines written to its errors since the last call, waiting briefly
    /// for them.
    fn said(&self) -> Vec<String> {
        Self::since(&self.errors)
    }

    fn since(lines: &Receiver<String>) -> Vec<String> {
        let mut out = Vec::new();
        while let Ok(line) = lines.recv_timeout(Duration::from_millis(400)) {
            out.push(line);
        }
        out
    }
}

impl Drop for Relay {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}

/// A run with one finding, on one page.
const RUN: &str = r#"{
  "schema": 1,
  "run": { "id": "one", "page": "/products/:id" },
  "findings": [
    { "fingerprint": "f1", "kind": "dead-part", "severity": "error",
      "subject": "helix-button::part(buton)", "message": "No part named buton.",
      "origin": { "sheet": "app.css" } }
  ]
}"#;

#[test]
fn it_says_it_is_there_to_a_local_page() {
    let relay = Relay::start("health", None);
    let answer = relay.ask("GET", "/health", Some("http://localhost:5173"), "");
    assert!(answer.starts_with("HTTP/1.1 200"), "{answer}");
    assert!(
        answer.contains("Access-Control-Allow-Origin: http://localhost:5173"),
        "{answer}"
    );
    assert!(answer.contains("helix diagnostics"), "{answer}");
}

#[test]
fn a_page_on_another_host_is_refused_and_given_nothing_to_read() {
    let relay = Relay::start("refused", None);
    let answer = relay.ask("POST", "/runs", Some("https://example.com"), RUN);
    assert!(answer.starts_with("HTTP/1.1 403"), "{answer}");
    assert!(!answer.contains("Access-Control-Allow-Origin"), "{answer}");
    assert!(relay.printed().is_empty());
}

#[test]
fn a_run_prints_its_new_findings_once_and_is_kept_as_its_page_s_latest() {
    let relay = Relay::start("runs", None);
    let answer = relay.ask("POST", "/runs", Some("http://localhost:5173"), RUN);
    assert!(answer.starts_with("HTTP/1.1 204"), "{answer}");
    let printed = relay.printed().join("\n");
    assert!(
        printed.contains("/products/:id: 1 error, 0 warnings, 0 info"),
        "{printed}"
    );
    assert!(
        printed.contains("error dead-part helix-button::part(buton)"),
        "{printed}"
    );
    assert!(printed.contains("in app.css"), "{printed}");

    /* The same run again, and the same finding in a new run: nothing new. */
    relay.ask("POST", "/runs", Some("http://localhost:5173"), RUN);
    relay.ask(
        "POST",
        "/runs",
        Some("http://localhost:5173"),
        &RUN.replace("\"one\"", "\"two\""),
    );
    assert!(relay.printed().is_empty());

    let file: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(relay.directory.join("reports/runs.json"))
            .expect("the CI file, in a folder made for it"),
    )
    .expect("json");
    assert_eq!(file["schema"], 1);
    assert_eq!(file["runs"].as_array().map(Vec::len), Some(1));
    assert_eq!(file["runs"][0]["run"]["id"], "two");
}

#[test]
fn a_scan_s_run_in_the_ci_file_is_kept_beside_the_pages() {
    let relay = Relay::start("beside", None);
    std::fs::create_dir_all(relay.directory.join("reports")).expect("a folder");
    std::fs::write(
        relay.directory.join("reports/runs.json"),
        r#"{ "runs": [{ "run": { "id": "scan", "source": "code" } }], "schema": 1 }"#,
    )
    .expect("a CI file");
    relay.ask("POST", "/runs", Some("http://localhost:5173"), RUN);
    let file: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(relay.directory.join("reports/runs.json")).expect("written"),
    )
    .expect("json");
    let ids: Vec<&str> = file["runs"]
        .as_array()
        .expect("runs")
        .iter()
        .filter_map(|run| run["run"]["id"].as_str())
        .collect();
    assert_eq!(ids, ["scan", "one"]);
}

#[test]
fn the_project_s_settings_are_served_to_the_page_and_only_whole() {
    let relay = Relay::start("settings", Some(r#"{ "console": { "findings": "warn" } }"#));
    let answer = relay.ask("GET", "/config", Some("http://localhost:5173"), "");
    assert!(answer.starts_with("HTTP/1.1 200"), "{answer}");
    assert!(answer.contains("\"findings\": \"warn\""), "{answer}");

    let broken = Relay::start("broken-settings", Some("{ \"console\": "));
    let answer = broken.ask("GET", "/config", None, "");
    assert!(answer.starts_with("HTTP/1.1 404"), "{answer}");
}

#[test]
fn settings_that_do_not_parse_are_said_in_the_terminal_once() {
    let relay = Relay::start("unparsed-settings", Some("{ \"console\": "));
    let said = relay.said();
    assert_eq!(said.len(), 1, "{said:?}");
    assert!(
        said[0].contains("helix-diagnostics.json is not JSON (EOF while parsing"),
        "{said:?}"
    );
    assert!(
        said[0].ends_with("so pages run without these settings until the file is fixed."),
        "{said:?}"
    );
    /* A page asking for them again is answered, and the reason is not said
    twice. */
    let answer = relay.ask("GET", "/config", Some("http://localhost:5173"), "");
    assert!(answer.starts_with("HTTP/1.1 404"), "{answer}");
    assert!(relay.said().is_empty());
}

#[test]
fn a_body_that_is_no_run_is_refused_and_the_relay_goes_on() {
    let relay = Relay::start("bad", None);
    let answer = relay.ask("POST", "/runs", None, "not json");
    assert!(answer.starts_with("HTTP/1.1 400"), "{answer}");
    let answer = relay.ask("GET", "/health", None, "");
    assert!(answer.starts_with("HTTP/1.1 200"), "{answer}");
}

#[test]
fn with_json_each_line_is_one_document_a_script_reads() {
    let relay = Relay::started("json", None, true);
    relay.ask("POST", "/runs", Some("http://localhost:5173"), RUN);
    let printed = relay.printed();
    assert_eq!(printed.len(), 1, "{printed:?}");
    let line: serde_json::Value = serde_json::from_str(&printed[0]).expect("one JSON document");
    assert_eq!(line["page"], "/products/:id");
    assert_eq!(line["counts"]["error"], 1);
    assert_eq!(line["counts"]["warn"], 0);
    assert_eq!(line["findings"][0]["fingerprint"], "f1");
}

#[test]
fn a_runtime_event_is_counted_and_printed_once_and_one_a_finding_says_is_left_out() {
    let relay = Relay::start("runtime", None);
    let run = r#"{
      "schema": 1,
      "run": { "id": "r1", "page": "/table" },
      "findings": [],
      "runtime": [
        { "count": 2, "fingerprint": "t1", "kind": "too-many-rows", "level": "warn",
          "message": "Drawing 3000 rows at once.", "printed": true, "tag": "helix-data-table" },
        { "count": 1, "fingerprint": "d1", "kind": "duplicate-registration", "level": "warn",
          "message": "Two copies.", "printed": true, "tag": "helix-button" }
      ]
    }"#;
    relay.ask("POST", "/runs", Some("http://localhost:5173"), run);
    let printed = relay.printed().join("\n");
    assert!(
        printed.contains("/table: 0 errors, 0 warnings, 0 info, 1 runtime"),
        "{printed}"
    );
    assert!(
        printed.contains("warn runtime too-many-rows <helix-data-table>"),
        "{printed}"
    );
    assert!(printed.contains("Drawing 3000 rows at once."), "{printed}");
    assert!(!printed.contains("duplicate-registration"), "{printed}");
    relay.ask(
        "POST",
        "/runs",
        Some("http://localhost:5173"),
        &run.replace("\"r1\"", "\"r2\""),
    );
    assert!(relay.printed().is_empty());
}

/// `--once` runs the diagnostics the project installed, so a project without
/// them is told which package to add, before any browser starts.
#[test]
fn once_names_the_package_it_needs_when_the_diagnostics_are_not_installed() {
    let project = std::env::temp_dir().join(format!("helix-once-{}", std::process::id()));
    std::fs::create_dir_all(&project).expect("a directory");
    let output = Command::new(binary())
        .args(["diagnostics", "--once", "http://127.0.0.1:9/"])
        .current_dir(&project)
        .output()
        .expect("helix runs");
    assert_eq!(output.status.code(), Some(3));
    let said = String::from_utf8_lossy(&output.stderr);
    assert!(
        said.contains("@fusion.dev/helix-diagnostics is not installed"),
        "{said}"
    );
    assert!(
        said.contains("npm install --save-dev @fusion.dev/helix-diagnostics"),
        "{said}"
    );
    let _ = std::fs::remove_dir_all(&project);
}
