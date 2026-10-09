//! The Node driver, started once per run and spoken to in JSON lines.
//!
//! **One request at a time, and the answers stream.** The binary writes a
//! request on the driver's standard input and reads lines from its standard
//! output until the one that ends the request. A capture streams a line per
//! picture as it is taken, so the comparison runs while the browser is still
//! drawing the next one. The driver's standard error is the run's own, which is
//! where Playwright and a config's `inspect` print.
//!
//! **Which JavaScript runtime, and which driver.** `LOCUS_RUNTIME` and
//! `LOCUS_DRIVER` name them, and the npm shim sets both: the runtime that ran
//! the shim, and the `driver.mjs` beside it. Run directly, the binary takes
//! `node` from `PATH`, then `bun`, and looks for the driver in the nearest
//! `node_modules/@fusion.dev/locus` above the config, then in this crate's own
//! source tree, which is where a build from a checkout finds it.

use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

use serde_json::Value;

pub struct Driver {
    child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
}

/// The driver file, or the places it was looked for.
fn locate(from: &Path) -> Result<PathBuf, String> {
    if let Some(named) = std::env::var_os("LOCUS_DRIVER") {
        let path = PathBuf::from(named);
        return if path.is_file() {
            Ok(path)
        } else {
            Err(format!(
                "LOCUS_DRIVER names {}, and there is no file there",
                path.display()
            ))
        };
    }
    for directory in from.ancestors() {
        let candidate = directory.join("node_modules/@fusion.dev/locus/driver.mjs");
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
    let built = Path::new(env!("CARGO_MANIFEST_DIR")).join("npm/driver.mjs");
    if built.is_file() {
        return Ok(built);
    }
    Err(format!(
        "no driver.mjs in LOCUS_DRIVER or in node_modules/@fusion.dev/locus above {}",
        from.display()
    ))
}

impl Driver {
    /// Starts the driver for a config in `from`.
    ///
    /// # Errors
    ///
    /// Why no driver could be started, lowercase.
    pub fn start(from: &Path) -> Result<Self, String> {
        let driver = locate(from)?;
        let runtimes: Vec<String> = match std::env::var("LOCUS_RUNTIME") {
            Ok(named) => vec![named],
            Err(_) => vec!["node".to_string(), "bun".to_string()],
        };
        let mut tried = Vec::new();
        for runtime in &runtimes {
            match Command::new(runtime)
                .arg(&driver)
                .current_dir(from)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
            {
                Ok(mut child) => {
                    let input = child
                        .stdin
                        .take()
                        .ok_or("the driver has no standard input")?;
                    let output = BufReader::new(
                        child
                            .stdout
                            .take()
                            .ok_or("the driver has no standard output")?,
                    );
                    return Ok(Self {
                        child,
                        input,
                        output,
                    });
                }
                Err(error) => tried.push(format!("{runtime}: {error}")),
            }
        }
        Err(format!(
            "no JavaScript runtime would start the driver ({})",
            tried.join("; ")
        ))
    }

    /// Sends one request.
    ///
    /// # Errors
    ///
    /// The driver is gone.
    pub fn send(&mut self, request: &Value) -> Result<(), String> {
        let mut line = request.to_string();
        line.push('\n');
        self.input
            .write_all(line.as_bytes())
            .and_then(|()| self.input.flush())
            .map_err(|error| format!("the driver stopped reading: {error}"))
    }

    /// The next answer the driver wrote, parsed. An `error` answer is returned
    /// as the error it reports.
    ///
    /// # Errors
    ///
    /// The driver reported an error, or ended.
    pub fn next(&mut self) -> Result<Value, String> {
        loop {
            let mut line = String::new();
            let read = self
                .output
                .read_line(&mut line)
                .map_err(|error| format!("cannot read the driver: {error}"))?;
            if read == 0 {
                let status = self
                    .child
                    .wait()
                    .map(|status| status.to_string())
                    .unwrap_or_default();
                return Err(format!("the driver ended before it answered ({status})"));
            }
            /* A line that is not an answer is something a config or a library
            printed on standard output, and it belongs with the rest of
            what they print. */
            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                eprint!("{line}");
                continue;
            };
            if value.get("op").and_then(Value::as_str).is_none() {
                eprint!("{line}");
                continue;
            }
            if value["op"] == "error" {
                return Err(value["message"]
                    .as_str()
                    .unwrap_or("the driver failed")
                    .to_string());
            }
            return Ok(value);
        }
    }

    /// Sends a request and returns the one line that answers it.
    ///
    /// # Errors
    ///
    /// As [`Driver::send`] and [`Driver::next`].
    pub fn ask(&mut self, request: &Value) -> Result<Value, String> {
        self.send(request)?;
        self.next()
    }

    /// Asks the driver to close the browser and its server, and waits for it.
    pub fn close(mut self) {
        let _ = self.send(&serde_json::json!({ "op": "close" }));
        let _ = self.child.wait();
    }
}

impl Drop for Driver {
    fn drop(&mut self) {
        /* A run that failed partway still leaves no browser behind. `close`
        waits first, so for a run that ended cleanly this finds the child
        already gone. */
        if matches!(self.child.try_wait(), Ok(None)) {
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }
}
