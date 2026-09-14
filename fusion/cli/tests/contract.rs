//! The contract, asserted, and held to `helix`'s.
//!
//! **These test the interface rather than the rules.** What is here is what a
//! caller depends on and no unit test can see: which stream each thing lands
//! on, what the process exits with, and whether `--json` is really parseable
//! rather than merely present. Run against the built binary, because exit code
//! and stream are properties of a process and have no answer inside one.
//!
//! **One test runs both binaries**, because the exit table is a promise the two
//! make together: `fusion helix ...` hands its child's code back untouched,
//! which is only honest while the two tables agree.

use std::path::{Path, PathBuf};
use std::process::{Command, Output};

/// The binary under test.
fn fusion() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_fusion"))
}

/// The `helix` binary beside it, built if it is not there yet.
///
/// **Built rather than skipped.** `cargo test -p fusion-cli` builds this crate's
/// binaries and nobody else's, so the sibling is absent on a first run, and a
/// test that passed quietly without it would be a test of nothing.
fn helix() -> PathBuf {
    let mut path = fusion();
    path.set_file_name(if cfg!(windows) { "helix.exe" } else { "helix" });
    if !path.is_file() {
        let cargo = std::env::var_os("CARGO").unwrap_or_else(|| "cargo".into());
        let mut build = Command::new(cargo);
        build.args(["build", "-p", "fusion-helix-cli"]);
        if path.parent().is_some_and(|dir| dir.ends_with("release")) {
            build.arg("--release");
        }
        let status = build.status().expect("cargo runs");
        assert!(status.success(), "helix did not build");
    }
    assert!(path.is_file(), "no helix at {}", path.display());
    path
}

fn run(binary: &Path, directory: &Path, args: &[&str]) -> Output {
    Command::new(binary)
        .args(args)
        .current_dir(directory)
        .env("NO_COLOR", "1")
        .output()
        .expect("the binary runs")
}

fn out(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).into_owned()
}

fn err(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

fn code(output: &Output) -> i32 {
    output.status.code().expect("the process exited normally")
}

/// A directory holding one workspace, cleaned up when it drops.
///
/// Every command names it with `--root`, so discovery never walks out of the
/// temp directory and finds whatever the host machine keeps above it.
struct Sandbox(PathBuf);

impl Sandbox {
    fn new(name: &str, manifest: &str, settings: Option<&str>) -> Self {
        let path = std::env::temp_dir().join(format!("fusion-cli-{name}"));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).expect("a temp directory");
        std::fs::write(path.join("package.json"), manifest).expect("a manifest");
        if let Some(settings) = settings {
            std::fs::write(path.join("fusion.json"), settings).expect("settings");
        }
        Self(path)
    }

    fn root(&self) -> &str {
        self.0.to_str().expect("a temp path is text")
    }
}

impl Drop for Sandbox {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// Identity first, which is what the `order` rule asks of a manifest.
const ORDERED: &str =
    "{\n  \"name\": \"sandbox\",\n  \"version\": \"0.0.0\",\n  \"private\": true\n}\n";
/// The shortest manifest the `order` rule refuses.
const UNORDERED: &str = "{\n  \"version\": \"0.0.0\",\n  \"name\": \"sandbox\"\n}\n";

/// **The line the whole exit-code table exists to draw**, drawn by both binaries
/// at once. A rule that does not exist is not a finding: 3 means the tool never
/// got far enough to have an answer, and a CI job that treats it as 1 reports a
/// typo in `--only` as a failing workspace. The two command lines have to agree
/// on the number, because `fusion helix ...` returns `helix`'s.
#[test]
fn an_unknown_rule_is_the_same_input_error_in_both_binaries() {
    let sandbox = Sandbox::new("unknown", ORDERED, Some("{}"));
    let ours = run(
        &fusion(),
        &sandbox.0,
        &[
            "workspace",
            "check",
            "--only",
            "frobnicate",
            "--root",
            sandbox.root(),
        ],
    );
    let theirs = run(
        &helix(),
        &sandbox.0,
        &[
            "component",
            "check",
            "--only",
            "frobnicate",
            "--root",
            sandbox.root(),
        ],
    );
    assert_eq!(code(&ours), 3, "{}", err(&ours));
    assert_eq!(
        code(&theirs),
        code(&ours),
        "the two binaries disagree about an unknown rule"
    );
    for output in [&ours, &theirs] {
        assert!(err(output).contains("frobnicate"), "{}", err(output));
        assert_eq!(out(output), "", "an error reached stdout");
    }
}

#[test]
fn a_clean_rule_checks_quietly() {
    let sandbox = Sandbox::new("clean", ORDERED, Some("{}"));
    let output = run(
        &fusion(),
        &sandbox.0,
        &[
            "workspace",
            "check",
            "--only",
            "order",
            "--root",
            sandbox.root(),
        ],
    );
    assert_eq!(code(&output), 0, "{}", err(&output));
    /* **Nothing on either stream**, which is the whole of what `check` is for: a
    green pipeline stays quiet, so the job with output in it is the one to read. */
    assert_eq!(
        out(&output),
        "",
        "check wrote to stdout on a clean workspace"
    );
    assert_eq!(
        err(&output),
        "",
        "check wrote to stderr on a clean workspace"
    );
}

#[test]
fn a_finding_exits_one_and_names_the_file() {
    let sandbox = Sandbox::new("finding", UNORDERED, Some("{}"));
    let output = run(
        &fusion(),
        &sandbox.0,
        &[
            "workspace",
            "check",
            "--only",
            "order",
            "--root",
            sandbox.root(),
        ],
    );
    assert_eq!(code(&output), 1, "a measured failure is 1");
    assert!(err(&output).contains("package.json"), "{}", err(&output));
}

/// **A malformed settings file is refused, not read as empty.** It was `.ok()`
/// once, and every allowlist rule then passed against a set that had nothing
/// in it. The message carries serde's line and column, because the file is
/// hand written and the reader's next action is to open it there.
#[test]
fn an_unparseable_settings_file_names_the_file_and_the_line() {
    let sandbox = Sandbox::new("typo", ORDERED, Some("{ \"domains\": [ }"));
    let output = run(
        &fusion(),
        &sandbox.0,
        &[
            "workspace",
            "check",
            "--only",
            "order",
            "--root",
            sandbox.root(),
        ],
    );
    assert_eq!(code(&output), 3);
    let said = err(&output);
    assert!(said.contains("fusion.json"), "{said}");
    assert!(said.contains("line 1"), "{said}");
}

#[test]
fn a_missing_settings_file_is_not_a_violation() {
    let sandbox = Sandbox::new("missing", ORDERED, None);
    let output = run(
        &fusion(),
        &sandbox.0,
        &[
            "workspace",
            "check",
            "--only",
            "order",
            "--root",
            sandbox.root(),
        ],
    );
    assert_eq!(code(&output), 3);
    assert!(err(&output).contains("fusion.json"), "{}", err(&output));
}

/// **An error is never on stdout, in either mode.** A caller piping `--json`
/// into another program gets a clean stream or an empty one, and the error
/// itself is an object on stderr rather than prose.
#[test]
fn errors_are_json_on_stderr_and_never_on_stdout() {
    let sandbox = Sandbox::new("streams", ORDERED, Some("{ \"domains\": [ }"));
    let output = run(
        &fusion(),
        &sandbox.0,
        &[
            "workspace",
            "check",
            "--json",
            "--only",
            "order",
            "--root",
            sandbox.root(),
        ],
    );
    assert_eq!(code(&output), 3);
    assert_eq!(out(&output), "", "an error reached stdout");
    let object: serde_json::Value =
        serde_json::from_str(&err(&output)).expect("the error on stderr is JSON");
    assert_eq!(object["code"], 3);
    assert!(object["error"]["what"].is_string(), "{object}");
}

#[test]
fn every_verb_has_a_json_form_and_it_parses() {
    let sandbox = Sandbox::new("json", ORDERED, Some("{}"));
    for verb in ["audit", "check", "fix"] {
        let output = run(
            &fusion(),
            &sandbox.0,
            &[
                "workspace",
                verb,
                "--json",
                "--only",
                "order",
                "--root",
                sandbox.root(),
            ],
        );
        assert_eq!(code(&output), 0, "{verb}: {}", err(&output));
        serde_json::from_str::<serde_json::Value>(&out(&output))
            .unwrap_or_else(|failure| panic!("{verb} emitted unparseable JSON: {failure}"));
    }
}

/// A bare noun prints help and exits 2, rather than guessing at a verb.
#[test]
fn an_incomplete_command_is_a_usage_error() {
    let sandbox = Sandbox::new("usage", ORDERED, Some("{}"));
    for args in [vec![], vec!["workspace"], vec!["workspace", "frobnicate"]] {
        let output = run(&fusion(), &sandbox.0, &args);
        assert_eq!(code(&output), 2, "{args:?} did not exit 2");
    }
}

/// `fusion helix ...` is `helix ...`, exit code included.
#[test]
fn a_routed_command_returns_the_child_code() {
    let sandbox = Sandbox::new("routed", ORDERED, Some("{}"));
    let output = Command::new(fusion())
        .args([
            "helix",
            "component",
            "check",
            "--only",
            "frobnicate",
            "--root",
            sandbox.root(),
        ])
        .current_dir(&sandbox.0)
        .env("HELIX_BIN", helix())
        .env("NO_COLOR", "1")
        .output()
        .expect("the binary runs");
    assert_eq!(code(&output), 3, "{}", err(&output));
    assert!(err(&output).starts_with("helix:"), "{}", err(&output));
}
