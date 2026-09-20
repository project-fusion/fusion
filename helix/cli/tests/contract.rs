//! The contract, asserted.
//!
//! **These test the interface rather than the derivation**, which
//! `fusion-helix-theme`'s own suite covers against the TypeScript. What is here is
//! everything a caller depends on and no library test can see: which stream each
//! thing lands on, what the process exits with, and whether `--json` is really
//! parseable rather than merely present.
//!
//! Run against the built binary rather than by calling into the modules, because
//! the two questions this file asks, exit code and stream, are properties of a
//! process and have no answer inside one.

use std::path::{Path, PathBuf};
use std::process::{Command, Output};

/// The binary under test.
///
/// Cargo builds integration tests into `target/<profile>/deps`, so the binary is
/// two levels up. Derived from the test's own path rather than assuming `debug`,
/// which is wrong the moment anyone runs `cargo test --release`.
fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

fn run(directory: &Path, args: &[&str]) -> Output {
    colored(directory, args, false)
}

/// **The same command with color forced on**, which is the only way one class of
/// bug is visible. See [`the_matrix_stays_aligned_when_it_is_coloured`].
fn colored(directory: &Path, args: &[&str], paint: bool) -> Output {
    let mut command = Command::new(binary());
    command.args(args).current_dir(directory);
    if paint {
        command.env_remove("NO_COLOR");
        /* The binary decides on `stdout().is_terminal()`, which is false for a
        pipe, so the flag is what forces the branch. There is no `--color`, so the
        test asks for the absence of the thing that turns it off and supplies the
        rest through the environment the process actually reads. */
        command.env("HELIX_FORCE_COLOR", "1");
    } else {
        command.env("NO_COLOR", "1");
    }
    command.output().expect("the binary runs")
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

/// A directory holding one intent, cleaned up when it drops.
struct Sandbox(PathBuf);

impl Sandbox {
    fn new(name: &str, intent: Option<&str>) -> Self {
        let path = std::env::temp_dir().join(format!("fusion-helix-cli-{name}"));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).expect("a temp directory");
        /* A `.git` marker, so discovery stops here rather than walking out of the
        temp directory and finding whatever is above it. That is the search's own
        rule and the test would be at the mercy of the host machine without it. */
        std::fs::write(path.join(".git"), "").expect("a root marker");
        if let Some(intent) = intent {
            std::fs::write(path.join("helix.theme.json"), intent).expect("an intent");
        }
        Self(path)
    }
}

impl Drop for Sandbox {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

const CLEAN: &str = r##"{ "brand": "#3b82f6" }"##;
/// A pinned ink that cannot be read on any surface: the shortest way to a theme
/// that derives successfully and fails its own contract, which is the state the
/// exit codes are there to tell apart from a broken input.
const FAILING: &str = r##"{ "brand": "#3b82f6", "tokens": { "color-foreground": "#eeeeee" } }"##;

#[test]
fn a_clean_theme_checks_quietly() {
    let sandbox = Sandbox::new("clean", Some(CLEAN));
    let output = run(&sandbox.0, &["theme", "check"]);
    assert_eq!(code(&output), 0);
    /* **Nothing on either stream**, which is the whole of what `check` is for: a
    green pipeline stays quiet, so the job with output in it is the one to read. */
    assert_eq!(out(&output), "", "check wrote to stdout on a clean theme");
    assert_eq!(err(&output), "", "check wrote to stderr on a clean theme");
}

#[test]
fn a_failing_theme_exits_one_and_says_why() {
    let sandbox = Sandbox::new("failing", Some(FAILING));
    let output = run(&sandbox.0, &["theme", "check"]);
    assert_eq!(code(&output), 1, "a measured failure is 1");
    assert!(
        err(&output).contains("below target"),
        "check said nothing useful: {}",
        err(&output)
    );
}

/// **The line the whole exit-code table exists to draw.** A missing file and a
/// failing contrast are both "it did not work" to a shell and are entirely
/// different to a person: 3 means the tool never got far enough to have an
/// answer, 1 means it ran and the answer was no. A CI job that treats them alike
/// reports a typo in a path as a contrast violation.
#[test]
fn a_missing_intent_is_not_a_violation() {
    let sandbox = Sandbox::new("missing", None);
    let output = run(&sandbox.0, &["theme", "check"]);
    assert_eq!(code(&output), 3);
    assert!(
        err(&output).contains("helix.theme.json"),
        "{}",
        err(&output)
    );
    assert!(
        err(&output).contains("helix theme init"),
        "no hint at the command that fixes it"
    );
}

#[test]
fn an_unparseable_intent_names_the_key_and_the_line() {
    let sandbox = Sandbox::new(
        "typo",
        Some(r##"{ "brand": "#3b82f6", "contrastTraget": 7 }"##),
    );
    let output = run(&sandbox.0, &["theme", "check"]);
    assert_eq!(code(&output), 3);
    /* **The typo is refused rather than ignored**, which is the departure from
    `JSON.parse` into a structural type. Accepted and dropped, this file is a
    theme that quietly ships at AA when its author asked for AAA. */
    assert!(
        err(&output).contains("contrastTraget"),
        "the message does not name the offending key: {}",
        err(&output)
    );
}

#[test]
fn every_verb_has_a_json_form_and_it_parses() {
    let sandbox = Sandbox::new("json", Some(CLEAN));
    for args in [
        vec!["theme", "audit", "--json"],
        vec!["theme", "build", "--json"],
    ] {
        let output = run(&sandbox.0, &args);
        assert_eq!(code(&output), 0, "{args:?}");
        serde_json::from_str::<serde_json::Value>(&out(&output))
            .unwrap_or_else(|failure| panic!("{args:?} emitted unparseable JSON: {failure}"));
    }
}

/// **An error is never on stdout, in either mode.** A caller piping `--json` into
/// another program gets a clean stream or an empty one, never a document they
/// have to inspect to find out whether it is an answer or an apology.
#[test]
fn errors_stay_off_stdout() {
    let sandbox = Sandbox::new("streams", Some(FAILING));
    for args in [
        vec!["theme", "build"],
        vec!["theme", "build", "--json"],
        vec!["theme", "check", "--json"],
    ] {
        let output = run(&sandbox.0, &args);
        let stdout = out(&output);
        assert!(
            stdout.is_empty() || serde_json::from_str::<serde_json::Value>(&stdout).is_ok(),
            "{args:?} put something on stdout that is neither empty nor JSON: {stdout}"
        );
    }
}

#[test]
fn build_refuses_a_failing_theme_and_force_overrides_it() {
    let sandbox = Sandbox::new("force", Some(FAILING));
    let refused = run(&sandbox.0, &["theme", "build"]);
    assert_eq!(code(&refused), 1);
    assert_eq!(
        out(&refused),
        "",
        "a refused build still wrote CSS to stdout"
    );

    let forced = run(&sandbox.0, &["theme", "build", "--force"]);
    assert_eq!(code(&forced), 0);
    assert!(out(&forced).starts_with(":root {"), "{}", out(&forced));
}

/// The artifact goes to stdout and everything else goes to stderr, so
/// `helix theme build > theme.css` is a complete stylesheet and not a stylesheet
/// with a progress note in it.
#[test]
fn the_artifact_is_the_only_thing_on_stdout() {
    let sandbox = Sandbox::new("artifact", Some(CLEAN));
    let output = run(&sandbox.0, &["theme", "build"]);
    assert_eq!(code(&output), 0);
    let css = out(&output);
    assert!(css.starts_with(":root {"), "{css}");
    assert!(css.trim_end().ends_with('}'), "{css}");
    assert!(
        !css.contains("helix:"),
        "a note leaked into the artifact: {css}"
    );
}

#[test]
fn init_writes_a_file_the_next_command_can_read() {
    let sandbox = Sandbox::new("init", None);
    let written = run(&sandbox.0, &["theme", "init"]);
    assert_eq!(code(&written), 0);

    /* **The point of this test, and it caught the bug it was written after.**
    The first starter file carried a `$schema` line pointing at a URL nothing
    publishes, and the intent reader refuses unknown keys, so the tool's own
    output was rejected by the tool on the very next command. Any two commands
    that hand a file between them need one test that runs both. */
    let checked = run(&sandbox.0, &["theme", "check"]);
    assert_eq!(
        code(&checked),
        0,
        "the file `init` wrote does not check: {}",
        err(&checked)
    );
}

#[test]
fn init_refuses_to_overwrite_without_force() {
    let sandbox = Sandbox::new("overwrite", Some(CLEAN));
    let refused = run(&sandbox.0, &["theme", "init", "--brand", "#c1272d"]);
    assert_eq!(code(&refused), 3);
    assert_eq!(
        std::fs::read_to_string(sandbox.0.join("helix.theme.json")).expect("still there"),
        CLEAN,
        "the intent was overwritten anyway"
    );

    let forced = run(
        &sandbox.0,
        &["theme", "init", "--brand", "#c1272d", "--force"],
    );
    assert_eq!(code(&forced), 0);
    assert!(std::fs::read_to_string(sandbox.0.join("helix.theme.json"))
        .expect("rewritten")
        .contains("#c1272d"));
}

/// A bare noun prints help and exits 2, rather than guessing at a verb.
#[test]
fn an_incomplete_command_is_a_usage_error() {
    let sandbox = Sandbox::new("usage", Some(CLEAN));
    for args in [vec![], vec!["theme"], vec!["theme", "frobnicate"]] {
        let output = run(&sandbox.0, &args);
        assert_eq!(code(&output), 2, "{args:?} did not exit 2");
    }
}

/* `--version`, which is the interface a release is checked against.

**It is read from the package beside the binary and not compiled in**, which is
what lets one build serve every release that changes no Rust: the same five
platform binaries, two of them macOS, were rebuilt for each number otherwise.
`binaries.yml` proves the first of these on a runner and `publish.mjs` refuses a
platform package whose binary disagrees with its manifest. */

/// A copy of the binary in a directory of its own, with `manifest` beside it
/// where there is one, which is the shape npm installs.
fn installed(name: &str, manifest: Option<&str>) -> PathBuf {
    let at = std::env::temp_dir().join(format!("helix-version-{name}"));
    let _ = std::fs::remove_dir_all(&at);
    std::fs::create_dir_all(&at).expect("a scratch directory");
    let binary = at.join(if cfg!(windows) { "helix.exe" } else { "helix" });
    std::fs::copy(self::binary(), &binary).expect("a copy of the binary");
    if let Some(manifest) = manifest {
        std::fs::write(at.join("package.json"), manifest).expect("a manifest");
    }
    binary
}

/* **A binary this test just wrote can be refused as busy, and it is not this
binary's fault.** `installed` copies the executable, and cargo runs the tests in
this file on threads of one process: another thread forking between the copy's
`open` and its `close` gives the child a write handle to the file, and Linux
refuses to execute a file anybody holds open for writing. The copy has long
returned by then, so there is nothing here to wait on. Measured 16 Sep 2026 on a
runner, where `--version` came back `ExecutableFileBusy` with the assertion it
was making unrelated to the fault.

Retried rather than serialized, because the fork that holds the handle belongs
to a thread this test cannot see, and the window closes as soon as that child
execs. Three tries at 50ms, and the error is still returned if it outlasts them,
since a binary that is busy for 150ms is saying something else. */
fn said(binary: &Path) -> String {
    let mut attempt = 0;
    let output = loop {
        let mut command = Command::new(binary);
        command.arg("--version").env("NO_COLOR", "1");
        match command.output() {
            Ok(output) => break output,
            Err(error) if error.kind() == std::io::ErrorKind::ExecutableFileBusy && attempt < 3 => {
                attempt += 1;
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            Err(error) => panic!("the binary runs: {error:?}"),
        }
    };
    out(&output).trim().to_owned()
}

#[test]
fn the_version_is_the_one_the_package_beside_it_carries() {
    let platform = installed(
        "platform",
        Some(r#"{ "name": "@fusion.dev/helix-cli-darwin-arm64", "version": "9.9.9-proof" }"#),
    );
    assert_eq!(said(&platform), "helix 9.9.9-proof");

    /* The wrapper's own manifest answers too, since which of the two sits beside
    the binary is the package manager's business and not this binary's. */
    let wrapper = installed(
        "wrapper",
        Some(r#"{ "name": "@fusion.dev/helix-cli", "version": "1.2.3" }"#),
    );
    assert_eq!(said(&wrapper), "helix 1.2.3");
}

/// **It says the compiled value rather than guessing**, which is the honest
/// answer for a binary run out of `target/` in this checkout and for one whose
/// neighbor is somebody else's manifest or is not a manifest at all.
#[test]
fn a_binary_with_nothing_to_read_reports_what_it_was_compiled_at() {
    let compiled = format!("helix {}", env!("CARGO_PKG_VERSION"));
    for (name, manifest) in [
        ("none", None),
        (
            "stranger",
            Some(r#"{ "name": "helix", "version": "4.5.6" }"#),
        ),
        ("unparseable", Some("not json")),
        (
            "empty",
            Some(r#"{ "name": "@fusion.dev/helix-cli", "version": "" }"#),
        ),
    ] {
        assert_eq!(said(&installed(name, manifest)), compiled, "{name}");
    }
}

/// Discovery walks up, which is what lets a command run from anywhere in a tree.
#[test]
fn the_intent_is_found_from_a_subdirectory() {
    let sandbox = Sandbox::new("nested", Some(CLEAN));
    let deep = sandbox.0.join("packages").join("site");
    std::fs::create_dir_all(&deep).expect("a nested directory");
    let output = run(&deep, &["theme", "check"]);
    assert_eq!(code(&output), 0, "{}", err(&output));
}

/// **Explicit beats discovered**, which is the first rung of the precedence
/// table and the one a reader relies on to override a repository's own theme.
#[test]
fn an_explicit_path_wins_over_the_search() {
    let sandbox = Sandbox::new("precedence", Some(CLEAN));
    let other = sandbox.0.join("other.json");
    std::fs::write(&other, FAILING).expect("a second intent");

    let discovered = run(&sandbox.0, &["theme", "check"]);
    assert_eq!(code(&discovered), 0, "the clean one was not found");

    let explicit = run(&sandbox.0, &["theme", "check", "other.json"]);
    assert_eq!(code(&explicit), 1, "the explicit path was ignored");
}

/// **A colored column is padded before it is colored, never after.**
///
/// A terminal counts an escape sequence as characters, so a width format applied
/// to an already-colored one-character glyph sees a string of twelve and adds
/// nothing, while the same format on an uncoloured one adds a space. The matrix
/// was straight with `NO_COLOR` set and ragged by exactly one character without
/// it, which is a bug that survives every run in CI: CI is not a terminal.
///
/// Asserted on the visible text with the escapes stripped, which is what a reader
/// sees and what the format is for.
#[test]
fn the_matrix_stays_aligned_when_it_is_coloured() {
    let sandbox = Sandbox::new("aligned", Some(FAILING));
    let output = colored(&sandbox.0, &["theme", "audit"], true);
    assert_eq!(code(&output), 1);

    /* **The output has to actually be colored, or this test is about the other
    branch.** Without the check, breaking the thing that turns color on makes
    the assertions below run against plain text, where the alignment has never
    been in question: the test would go on passing while covering nothing.
    Measured by removing the force, which is how the hole was found. */
    let printed = out(&output);
    assert!(
        printed.contains('\u{1b}'),
        "nothing was colored, so the alignment below is about the plain branch"
    );

    let rows: Vec<String> = printed
        .lines()
        .filter(|line| line.contains("  on  "))
        .map(strip)
        .collect();
    assert!(
        rows.len() > 10,
        "not enough rows to compare: {}",
        rows.len()
    );

    /* Every row's ink name starts in the same column, whatever its glyph. */
    let columns: Vec<usize> = rows
        .iter()
        .map(|row| row.find("color-").expect("a row names a token"))
        .collect();
    let first = columns[0];
    assert!(
        columns.iter().all(|column| *column == first),
        "the glyph column is ragged: {columns:?}"
    );
    /* And at least two different glyphs are present, or the assertion above is
    about one case and proves nothing. */
    assert!(
        rows.iter().any(|row| row.trim_start().starts_with('x'))
            && rows.iter().any(|row| row.trim_start().starts_with("ok")),
        "the theme under test did not produce both a pass and a fail"
    );
}

/// Drops ANSI escapes, so an assertion is about what a reader sees.
fn strip(line: &str) -> String {
    let mut visible = String::with_capacity(line.len());
    let mut characters = line.chars();
    while let Some(character) = characters.next() {
        if character != '\u{1b}' {
            visible.push(character);
            continue;
        }
        /* CSI runs to a letter, which is the only terminator this emits. */
        for inside in characters.by_ref() {
            if inside.is_ascii_alphabetic() {
                break;
            }
        }
    }
    visible
}

/// **The table is what a pipe gets, and the screen is not.** A TUI written to
/// something that is not a terminal is escape sequences in a log file, so the
/// branch is on `stdout().is_terminal()` and every one of these tests exercises
/// the false side of it by being a pipe. This is the test that says so out loud,
/// because the day somebody makes the screen the default unconditionally, every
/// other test in this file starts asserting against a raw-mode alternate screen
/// and none of them explains why.
#[test]
fn audit_prints_the_table_when_there_is_no_terminal() {
    let sandbox = Sandbox::new("audit-piped", Some(CLEAN));
    let output = run(&sandbox.0, &["theme", "audit"]);
    assert_eq!(code(&output), 0);

    let printed = out(&output);
    assert!(printed.contains("color-foreground"), "{printed}");
    assert!(printed.contains("passed,"), "{printed}");
    /* No alternate screen and no cursor moves, which is what a TUI would have
    written first. Checked as an absence because that is the failure: a table with
    an escape sequence in front of it looks fine on a terminal and is unusable in
    a file. */
    assert!(
        !printed.contains("\u{1b}[?1049h"),
        "entered an alternate screen"
    );
}

/// `--plain` is the same output on a terminal, and the flag exists so a reader
/// can have it there.
///
/// Asserted as byte equality against the piped run rather than by looking for
/// words in it: the claim is that the flag selects the *same* presentation, and
/// two renderings that merely both mention a token name are not that.
#[test]
fn plain_asks_for_the_table_and_gets_exactly_the_table() {
    let sandbox = Sandbox::new("audit-plain", Some(CLEAN));
    let piped = run(&sandbox.0, &["theme", "audit"]);
    let plain = run(&sandbox.0, &["theme", "audit", "--plain"]);
    assert_eq!(code(&plain), code(&piped));
    assert_eq!(out(&plain), out(&piped));
}

/// The exit code is the measurement's, whichever presentation ran.
///
/// `audit` is a gate as well as a report, so a failing theme has to exit 1 down
/// the plain path too: a flag about how something is drawn must not change what
/// it concluded.
#[test]
fn plain_does_not_change_the_verdict() {
    let sandbox = Sandbox::new("audit-plain-fails", Some(FAILING));
    assert_eq!(code(&run(&sandbox.0, &["theme", "audit"])), 1);
    assert_eq!(code(&run(&sandbox.0, &["theme", "audit", "--plain"])), 1);
}

/// `--json` outranks `--plain`, and neither opens a screen.
///
/// A caller passing both is asking for a document, and the flag that says which
/// human rendering to use has nothing to say about that.
#[test]
fn json_wins_over_plain() {
    let sandbox = Sandbox::new("audit-json-plain", Some(CLEAN));
    let output = run(&sandbox.0, &["theme", "audit", "--plain", "--json"]);
    assert_eq!(code(&output), 0);
    let parsed: serde_json::Value =
        serde_json::from_str(&out(&output)).expect("--json --plain is still JSON");
    assert!(parsed.get("pairings").is_some_and(|pairings| pairings
        .as_array()
        .is_some_and(|pairings| !pairings.is_empty())));
}

/* `helix new`, which is the one verb that writes a tree rather than a file.
Driven through `HELIX_TEMPLATES` at the package in this repository, so the
tests do not need it installed and do not assert against a copy that could
drift from the one shipped. */

fn templates() -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.pop();
    path.join("templates")
}

fn scaffold(directory: &Path, args: &[&str]) -> Output {
    let mut command = Command::new(binary());
    command
        .args(args)
        .current_dir(directory)
        .env("NO_COLOR", "1")
        .env("HELIX_TEMPLATES", templates());
    command.output().expect("the binary runs")
}

/// A directory of this test's own, removed first so a rerun is a fresh one.
fn scratch(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("helix-new-{name}"));
    let _ = std::fs::remove_dir_all(&path);
    std::fs::create_dir_all(&path).expect("a scratch directory");
    path
}

#[test]
fn an_omitted_template_lists_them_and_succeeds() {
    let at = scratch("omitted");
    let output = scaffold(&at, &["new", "my-app"]);
    assert_eq!(code(&output), 0, "asking what there is, is a question");
    assert!(out(&output).contains("react-vite"));
    assert!(!at.join("my-app").exists(), "listing writes nothing");
}

/// **`Failed` rather than `Input`**: the command line parsed and the answer is no.
#[test]
fn an_unknown_template_lists_them_and_fails() {
    let at = scratch("unknown");
    let output = scaffold(&at, &["new", "my-app", "--template", "svelte"]);
    assert_eq!(code(&output), 1);
    assert!(
        out(&output).contains("react-vite"),
        "it says what there is instead"
    );
    assert!(!at.join("my-app").exists());
}

#[test]
fn it_writes_the_template_and_substitutes_only_the_named_files() {
    let at = scratch("writes");
    let output = scaffold(&at, &["new", "my-app", "--template", "react-vite"]);
    assert_eq!(code(&output), 0, "{}", err(&output));

    let project = at.join("my-app");
    let manifest = std::fs::read_to_string(project.join("package.json")).expect("a manifest");
    assert!(manifest.contains("\"name\": \"my-app\""));

    /* The Helix it asks for is the one the templates were published with. */
    let own: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(templates().join("package.json")).expect("the templates manifest"),
    )
    .expect("a manifest that parses");
    let version = own["version"].as_str().expect("a version");
    assert!(
        manifest.contains(&format!("\"@fusion.dev/helix\": \"^{version}\"")),
        "{manifest}"
    );
    assert!(
        out(&output).contains(&format!("Helix {version}")),
        "it says which Helix it wrote: {}",
        out(&output)
    );

    /* The placeholder is gone from the whole tree, which is the assertion that
    catches a `named` list missing a file: the register says which files carry it
    and this says none of them still do. */
    let mut found = Vec::new();
    walk_files(&project, &mut found);
    assert!(!found.is_empty(), "it wrote something");
    for file in &found {
        let read = std::fs::read_to_string(file).unwrap_or_default();
        for placeholder in ["__PROJECT_NAME__", "__HELIX_VERSION__"] {
            assert!(
                !read.contains(placeholder),
                "{} still holds {placeholder}",
                file.display()
            );
        }
    }

    /* A file the register does not name still travels, unchanged. */
    assert!(project.join("vite.config.ts").is_file());
}

/// **The guard that matters**, there being no undo for a scaffolder that writes
/// over somebody's work.
#[test]
fn it_refuses_a_directory_that_holds_anything() {
    let at = scratch("occupied");
    let project = at.join("my-app");
    std::fs::create_dir_all(&project).expect("a directory");
    std::fs::write(project.join("README.md"), "mine").expect("a file");

    let output = scaffold(&at, &["new", "my-app", "--template", "react-vite"]);
    assert_eq!(code(&output), 3);
    assert!(err(&output).contains("is not empty"));
    assert_eq!(
        std::fs::read_to_string(project.join("README.md")).expect("still there"),
        "mine",
        "it wrote nothing over the file that was there"
    );
}

#[test]
fn an_existing_empty_directory_is_fine() {
    let at = scratch("empty");
    std::fs::create_dir_all(at.join("my-app")).expect("a directory");
    let output = scaffold(&at, &["new", "my-app", "--template", "react-vite"]);
    assert_eq!(code(&output), 0, "{}", err(&output));
    assert!(at.join("my-app").join("package.json").is_file());
}

#[test]
fn the_json_shape_is_parseable_and_names_what_it_wrote() {
    let at = scratch("json");
    let output = scaffold(
        &at,
        &["new", "my-app", "--template", "react-vite", "--json"],
    );
    assert_eq!(code(&output), 0, "{}", err(&output));
    let value: serde_json::Value = serde_json::from_str(&out(&output)).expect("parseable");
    assert_eq!(value["name"], "my-app");
    assert_eq!(value["template"], "react-vite");
    assert!(value["files"].as_u64().unwrap_or(0) > 0);
}

/// Without the package there is nothing to read, and the message names the other
/// door rather than leaving a reader to find it.
#[test]
fn it_says_so_when_the_templates_package_is_not_resolvable() {
    let at = scratch("absent");
    let mut command = Command::new(binary());
    command
        .args(["new", "my-app", "--template", "react-vite"])
        .current_dir(&at)
        .env("NO_COLOR", "1")
        .env_remove("HELIX_TEMPLATES");
    let output = command.output().expect("the binary runs");
    assert_eq!(code(&output), 3);
    assert!(err(&output).contains("@fusion.dev/helix-templates"));
    assert!(err(&output).contains("npm create @fusion.dev/helix-app"));
}

fn walk_files(directory: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            walk_files(&path, found);
        } else {
            found.push(path);
        }
    }
}

/// **`name` is a directory and a package name at once**, and holding it to
/// neither wrote outside the working directory and produced manifests npm
/// refuses. Absolute first, because `Path::join` replaces the base rather than
/// appending, so that one is the escape.
#[test]
fn a_name_that_is_not_usable_as_both_is_refused() {
    let at = scratch("names");
    let escape = std::env::temp_dir().join("helix-new-must-not-exist");
    let _ = std::fs::remove_dir_all(&escape);

    for name in [
        escape.to_string_lossy().as_ref(),
        "../sibling",
        "MyApp",
        ".hidden",
        "_leading",
        "has space",
        "",
    ] {
        let output = scaffold(&at, &["new", name, "--template", "react-vite"]);
        assert_eq!(code(&output), 3, "`{name}` should be refused");
        assert!(
            err(&output).contains("cannot be a project name"),
            "`{name}` should say why"
        );
    }
    assert!(
        !escape.exists(),
        "an absolute name wrote nothing outside the cwd"
    );
}

/// The three lines a reader is handed have to work, and with `--into` the first
/// one named a directory this had not created.
#[test]
fn the_closing_hint_names_what_was_written() {
    let at = scratch("hint");

    let plain = scaffold(&at, &["new", "my-app", "--template", "react-vite"]);
    assert_eq!(code(&plain), 0, "{}", err(&plain));
    assert!(
        out(&plain).contains("cd my-app"),
        "relative to where they stand"
    );

    let into = scaffold(
        &at,
        &[
            "new",
            "my-app",
            "--into",
            "apps/web",
            "--template",
            "react-vite",
        ],
    );
    assert_eq!(code(&into), 0, "{}", err(&into));
    assert!(out(&into).contains("cd apps/web"), "the directory it wrote");
    assert!(!out(&into).contains("cd my-app"), "not the one it did not");
}

/// A wrong override sent a reader to look in `node_modules`, which the code had
/// not consulted. Same shape as the `regen` failure that names a missing file
/// when the fault is a stale registry.
#[test]
fn a_wrong_templates_override_says_so_rather_than_blaming_node_modules() {
    let at = scratch("override");
    let mut command = Command::new(binary());
    command
        .args(["new", "my-app", "--template", "react-vite"])
        .current_dir(&at)
        .env("NO_COLOR", "1")
        .env("HELIX_TEMPLATES", at.join("nothing-here"));
    let output = command.output().expect("the binary runs");

    assert_eq!(code(&output), 3);
    assert!(err(&output).contains("HELIX_TEMPLATES is set"));
    assert!(
        !err(&output).contains("nothing above this directory"),
        "the node_modules walk never ran, so it must not be blamed"
    );
}

/// A manifest against itself is the case the oracle has to get right first.
///
/// **A differ that reports nothing is a differ that passes this test**, so it is
/// planted against three shapes below rather than trusted on a clean run alone:
/// a field that changed, a member that left, and an order that moved.
#[test]
fn a_manifest_agrees_with_itself() {
    let sandbox = Sandbox::new("manifest-same", None);
    let manifest = r#"{"modules":[{"path":"src/chip.ts","declarations":[
      {"name":"HelixChip","tagName":"helix-chip","members":[
        {"name":"label","default":"''"},{"name":"tone"}]}]}]}"#;
    std::fs::write(sandbox.0.join("a.json"), manifest).expect("a manifest");
    std::fs::write(sandbox.0.join("b.json"), manifest).expect("a manifest");
    let output = run(&sandbox.0, &["manifest", "diff", "a.json", "b.json"]);
    assert_eq!(code(&output), 0);
    assert!(
        out(&output).contains("say the same thing"),
        "{}",
        out(&output)
    );
}

#[test]
fn a_manifest_is_held_to_the_field_the_member_and_the_order() {
    let sandbox = Sandbox::new("manifest-differs", None);
    let before = r#"{"modules":[{"path":"src/chip.ts","declarations":[
      {"name":"HelixChip","tagName":"helix-chip","members":[
        {"name":"label","default":"''"},{"name":"tone"},{"name":"size"}]}]}]}"#;
    /* `label` keeps its name and loses its default, `size` is gone, and `tone`
    has moved ahead of `label`: three kinds of change at once, because a differ
    that finds one of them and stops is the failure worth catching. */
    let after = r#"{"modules":[{"path":"src/chip.ts","declarations":[
      {"name":"HelixChip","tagName":"helix-chip","members":[
        {"name":"tone"},{"name":"label"}]}]}]}"#;
    std::fs::write(sandbox.0.join("a.json"), before).expect("a manifest");
    std::fs::write(sandbox.0.join("b.json"), after).expect("a manifest");
    let output = run(&sandbox.0, &["manifest", "diff", "a.json", "b.json"]);
    assert_eq!(code(&output), 1);
    let said = out(&output);
    assert!(said.contains("members size"), "the departed member: {said}");
    assert!(
        said.contains("members.label › default"),
        "the field: {said}"
    );
    /* The order report is suppressed where the names differ, which they do here,
    so what this asserts is that the reader is told once and accurately. */
    assert!(
        !said.contains("in a different order"),
        "order is not reported beside a membership change: {said}"
    );
}

/// The manifest's own top-level lists are addressed to the file, not to nothing.
#[test]
fn a_difference_above_any_module_is_addressed_to_the_manifest() {
    let sandbox = Sandbox::new("manifest-top", None);
    std::fs::write(
        sandbox.0.join("a.json"),
        r#"{"modules":[{"path":"src/one.ts"},{"path":"src/two.ts"}]}"#,
    )
    .expect("a manifest");
    std::fs::write(
        sandbox.0.join("b.json"),
        r#"{"modules":[{"path":"src/two.ts"},{"path":"src/one.ts"}]}"#,
    )
    .expect("a manifest");
    let output = run(&sandbox.0, &["manifest", "diff", "a.json", "b.json"]);
    assert_eq!(code(&output), 1);
    let said = out(&output);
    assert!(
        said.contains("the manifest › modules in a different order"),
        "{said}"
    );
    assert!(said.contains("from position 0"), "{said}");
}

/// The generator reads both routes out of a module, and keeps source order.
///
/// `ScrollArea` is the case in the real tiers: `EDGES` is declared privately on
/// line 6 and exported on line 241, and reading only the inline route dropped
/// it. One declaration missing from two hundred and twenty-nine modules, which
/// the diff found and a reader would not have.
#[test]
fn a_declaration_exported_below_is_still_declared_above() {
    let sandbox = Sandbox::new("manifest-build", None);
    let src = sandbox.0.join("src/area");
    std::fs::create_dir_all(&src).expect("a source tree");
    std::fs::write(
        src.join("area.ts"),
        "const EDGES = ['start'] as const\nexport class HelixArea {}\nexport { EDGES }\n",
    )
    .expect("a source");
    /* A spec beside it, which the manifest does not speak for. */
    std::fs::write(src.join("area.spec.ts"), "export const nope = 1\n").expect("a spec");

    let output = run(&sandbox.0, &["manifest", "build", "."]);
    assert_eq!(code(&output), 0);
    let said = out(&output);
    let at = |needle: &str| said.find(needle).expect(needle);
    assert!(said.contains("src/area/area.ts"), "{said}");
    assert!(!said.contains("area.spec.ts"), "a spec is not API: {said}");
    assert!(said.contains("EDGES"), "exported below: {said}");
    /* Where it is written rather than where it is exported. */
    assert!(at("EDGES") < at("HelixArea"), "source order: {said}");
}

/// What a class body says, in the four shapes that are not one-to-one.
///
/// Each was found by the diff rather than by reading the schema, and each is a
/// rule about what the manifest describes: the surface a consumer reaches,
/// rather than how the class is written.
#[test]
fn a_class_body_is_read_as_the_surface_it_publishes() {
    let sandbox = Sandbox::new("manifest-members", None);
    let src = sandbox.0.join("src/editor");
    std::fs::create_dir_all(&src).expect("a source tree");
    std::fs::write(
        src.join("editor.ts"),
        "export class HelixEditor extends HelixElement {\n\
         \x20 label = 'Source'\n\
         \x20 private view: string | undefined\n\
         \x20 get caret(): CaretDetail { return this.at }\n\
         \x20 focus(mode: string): void {}\n\
         }\n",
    )
    .expect("a source");

    let output = run(&sandbox.0, &["manifest", "build", "."]);
    assert_eq!(code(&output), 0);
    let said = out(&output);

    /* A field with no annotation takes its type from the literal, which is the
    only inference here and one a parser can do. */
    assert!(said.contains("\"text\": \"string\""), "inferred: {said}");
    /* A getter is a readonly field, not a method: what a consumer reaches is a
    value, and its type is the return annotation. */
    assert!(
        said.contains("\"CaretDetail\""),
        "the getter's type: {said}"
    );
    /* A method carries `return` and `parameters` and no `type` of its own. */
    assert!(
        said.contains("\"parameters\""),
        "the method's parameters: {said}"
    );
    assert!(
        said.contains("\"privacy\": \"private\""),
        "the keyword: {said}"
    );
    /* And the class says what it extends. */
    assert!(said.contains("HelixElement"), "the superclass: {said}");
}

/// Where a base class came from, which the manifest records three ways.
///
/// A mixin is unwrapped, a bare import names a package, a relative one names a
/// rooted module keeping the `.js` the source wrote, and a name with no import
/// at all is taken to be this module's own. The last two are the analyzer's own
/// shapes rather than tidy ones, and are reproduced because this is measured
/// against it.
#[test]
fn a_superclass_says_where_it_came_from() {
    let sandbox = Sandbox::new("manifest-heritage", None);
    let src = sandbox.0.join("src/badge/root");
    std::fs::create_dir_all(&src).expect("a source tree");
    std::fs::write(
        src.join("badge-root.ts"),
        "import { HelixHeadlessBadge } from '@fusion.dev/helix-headless/badge'\n\
         export class HelixBadge extends HelixHeadlessBadge {}\n",
    )
    .expect("a source");
    std::fs::write(
        src.join("near.ts"),
        "import { Mixin } from './mixin.js'\n\
         import { Base } from '../../base/base.js'\n\
         export class Near extends Mixin(Base) {}\n\
         export class Alone extends CustomEvent {}\n",
    )
    .expect("a source");

    let output = run(&sandbox.0, &["manifest", "build", "."]);
    assert_eq!(code(&output), 0);
    let said = out(&output);
    assert!(
        said.contains("\"package\": \"@fusion.dev/helix-headless/badge\""),
        "a bare import is a package: {said}"
    );
    /* The mixin is taken off and the class inside it is the base. */
    assert!(said.contains("\"name\": \"Base\""), "unwrapped: {said}");
    assert!(
        said.contains("\"module\": \"/src/base/base.js\""),
        "rooted, and the `.js` as written: {said}"
    );
    /* No import, so the analyzer calls it this module's own, even though
    `CustomEvent` is the platform's. */
    assert!(
        said.contains("\"module\": \"src/badge/root/near.ts\""),
        "an unimported name is this module's: {said}"
    );
}
