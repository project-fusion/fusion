//! A rule from outside, run by `fusion prose` as one of its own.
//!
//! **The second noun to take plugins**, which is what the host was shaped for:
//! the same modules, the same world and the same register, over a payload this
//! binary composes. What is here is what a person sees, and the one thing only
//! a second noun can test: that a plugin belongs to the noun whose payload it
//! reads, and is refused where it does not.

use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::OnceLock;

/// The binary under test.
fn fusion() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_fusion"))
}

fn run(directory: &Path, args: &[&str]) -> Output {
    Command::new(fusion())
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

/// The workspace root, from this crate's own manifest.
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("the workspace above this crate")
        .to_path_buf()
}

/// The example plugin as a component, built the way its author would build it.
fn example() -> &'static [u8] {
    static BUILT: OnceLock<Vec<u8>> = OnceLock::new();
    BUILT.get_or_init(|| {
        let at = root().join("fusion/plugins/example");
        let built = Command::new(env!("CARGO"))
            .args([
                "build",
                "--quiet",
                "--release",
                "--target",
                "wasm32-unknown-unknown",
            ])
            .current_dir(&at)
            .output()
            .expect("cargo runs");
        assert!(
            built.status.success(),
            "the example plugin did not build: {}",
            String::from_utf8_lossy(&built.stderr)
        );
        let core = at.join("target/wasm32-unknown-unknown/release/fusion_plugin_example.wasm");
        let bytes = std::fs::read(&core).expect("the built module");
        wit_component::ComponentEncoder::default()
            .module(&bytes)
            .expect("a core module")
            .validate(true)
            .encode()
            .expect("a component")
    })
}

/// A workspace with one document in it, and a plugin under one noun.
struct Tree(PathBuf);

impl Tree {
    fn new(name: &str, document: &str, noun: &str) -> Self {
        let at = std::env::temp_dir().join(format!("fusion-cli-plugins-{name}"));
        let _ = std::fs::remove_dir_all(&at);
        std::fs::create_dir_all(&at).expect("a workspace");
        std::fs::write(at.join("package.json"), r#"{ "name": "planted" }"#).expect("a manifest");
        std::fs::write(at.join("fusion.json"), "{}").expect("the settings");
        std::fs::write(at.join("guide.md"), document).expect("a document");
        let plugins = at.join(format!(".fusion/plugins/{noun}"));
        std::fs::create_dir_all(&plugins).expect("a plugin directory");
        std::fs::write(plugins.join("example.wasm"), example()).expect("a module");
        Self(at)
    }
}

impl Drop for Tree {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// A plugin's rule runs under `prose`, and fails the run it should.
#[test]
fn a_plugin_rule_runs_under_prose() {
    let tree = Tree::new("prose", "Some prose, and no heading above it.\n", "prose");
    let output = run(&tree.0, &["prose", "check", "--only", "titled"]);
    assert!(
        out(&output).contains("plugin example sha256:"),
        "the register: {}",
        out(&output)
    );
    assert!(
        err(&output).contains("`guide.md` opens with prose rather than a heading"),
        "the finding: {}",
        err(&output)
    );
    assert_eq!(output.status.code(), Some(1), "a finding fails the run");
}

/// The same workspace with a heading: the rule runs and says nothing.
#[test]
fn a_plugin_rule_that_finds_nothing_leaves_prose_clean() {
    let tree = Tree::new("titled", "# A guide\n\nAnd its prose.\n", "prose");
    let output = run(&tree.0, &["prose", "check", "--only", "titled"]);
    assert_eq!(
        output.status.code(),
        Some(0),
        "nothing found: {}",
        err(&output)
    );
    assert!(out(&output).contains("plugin example"), "still registered");
}

/// `--json` carries the register beside the rules, as it does for `component`.
#[test]
fn the_register_is_in_the_json_prose_prints() {
    let tree = Tree::new("json", "# A guide\n", "prose");
    let output = run(&tree.0, &["prose", "check", "--json", "--only", "titled"]);
    let said: serde_json::Value = serde_json::from_str(&out(&output)).expect("parseable JSON");
    assert_eq!(said["plugins"][0]["name"], "example");
    assert_eq!(said["rules"][0]["name"], "titled");
    assert_eq!(said["rules"][0]["unit"], "documents");
}

/// A module with nothing for this noun is refused where it was found.
///
/// **The thing only a second noun can test.** The example's rules read
/// documents, stylesheets and manifests, and `fusion spec` composes specs: every
/// rule it has would be skipped, and a plugin loaded to do nothing is a wrong
/// directory rather than a clean run.
#[test]
fn a_module_with_nothing_for_this_noun_is_refused() {
    let tree = Tree::new("misplaced", "# A guide\n", "spec");
    let output = run(&tree.0, &["spec", "check"]);
    assert_eq!(output.status.code(), Some(3), "an input fault");
    assert!(
        err(&output).contains("provides no rule `fusion spec` can run"),
        "says so: {}",
        err(&output)
    );
    assert!(
        err(&output).contains("`specs`"),
        "names what this noun has: {}",
        err(&output)
    );
}

/// A rule for another noun, in a module that has one for this one, is skipped
/// and said out loud.
///
/// **Silence is what this mechanism cannot afford.** A rule that is not running
/// and is not mentioned is indistinguishable from one that ran and found
/// nothing, which is the failure the register exists to prevent.
#[test]
fn a_rule_for_another_noun_is_named_rather_than_dropped() {
    let tree = Tree::new("skipped", "# A guide\n", "prose");
    let output = run(&tree.0, &["prose", "check", "--only", "titled"]);
    assert!(
        out(&output).contains("plugin example: unfinished is another noun's"),
        "names what it left alone: {}",
        out(&output)
    );
    assert!(
        out(&output).contains("providing titled"),
        "and what it runs: {}",
        out(&output)
    );
}

/// A workspace with no plugin directory is every rule this binary was built
/// with, and no register.
#[test]
fn a_workspace_with_no_plugins_prints_no_register() {
    let at = std::env::temp_dir().join("fusion-cli-plugins-none");
    let _ = std::fs::remove_dir_all(&at);
    std::fs::create_dir_all(&at).expect("a workspace");
    std::fs::write(at.join("package.json"), r#"{ "name": "planted" }"#).expect("a manifest");
    std::fs::write(at.join("fusion.json"), "{}").expect("the settings");
    std::fs::write(at.join("guide.md"), "# A guide\n").expect("a document");

    let output = run(&at, &["prose", "check", "--only", "dashes"]);
    assert!(
        !out(&output).contains("plugin "),
        "nothing to register: {}",
        out(&output)
    );
    let _ = std::fs::remove_dir_all(&at);
}
