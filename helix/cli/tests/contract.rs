//! The contract, asserted.
//!
//! **These test the interface rather than the derivation**, which
//! `helix-theme`'s own suite covers against the TypeScript. What is here is
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
    coloured(directory, args, false)
}

/// **The same command with color forced on**, which is the only way one class of
/// bug is visible. See [`the_matrix_stays_aligned_when_it_is_coloured`].
fn coloured(directory: &Path, args: &[&str], paint: bool) -> Output {
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
        let path = std::env::temp_dir().join(format!("helix-cli-{name}"));
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

/// **A coloured column is padded before it is coloured, never after.**
///
/// A terminal counts an escape sequence as characters, so a width format applied
/// to an already-coloured one-character glyph sees a string of twelve and adds
/// nothing, while the same format on an uncoloured one adds a space. The matrix
/// was straight with `NO_COLOR` set and ragged by exactly one character without
/// it, which is a bug that survives every run in CI: CI is not a terminal.
///
/// Asserted on the visible text with the escapes stripped, which is what a reader
/// sees and what the format is for.
#[test]
fn the_matrix_stays_aligned_when_it_is_coloured() {
    let sandbox = Sandbox::new("aligned", Some(FAILING));
    let output = coloured(&sandbox.0, &["theme", "audit"], true);
    assert_eq!(code(&output), 1);

    /* **The output has to actually be coloured, or this test is about the other
    branch.** Without the check, breaking the thing that turns color on makes
    the assertions below run against plain text, where the alignment has never
    been in question: the test would go on passing while covering nothing.
    Measured by removing the force, which is how the hole was found. */
    let printed = out(&output);
    assert!(
        printed.contains('\u{1b}'),
        "nothing was coloured, so the alignment below is about the plain branch"
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
