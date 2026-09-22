//! A rule from outside, run by `helix component` as one of its own.
//!
//! **Through the binary rather than the host**, which `fusion-plugins` already
//! tests on its own. What is here is everything a person sees: the register in
//! the output and in `--json`, a plugin's rule answering `--only`, its finding
//! on stderr with the exit code that goes with it, and a module that will not
//! load refusing the run rather than being skipped.

use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::OnceLock;

/// The binary under test, found the way the contract tests find it.
fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

fn run(directory: &Path, args: &[&str]) -> Output {
    Command::new(binary())
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

/// A workspace with one component in it, and whatever plugins a test wants.
struct Tree(PathBuf);

impl Tree {
    fn new(name: &str, description: &str, modules: &[(&str, &[u8])]) -> Self {
        let at = std::env::temp_dir().join(format!("helix-cli-plugins-{name}"));
        let _ = std::fs::remove_dir_all(&at);
        std::fs::create_dir_all(at.join("src/card")).expect("a source tree");
        std::fs::write(at.join(".git"), "").expect("a root marker");
        std::fs::write(at.join("helix.json"), r#"{ "tiers": ["src"] }"#).expect("the settings");
        std::fs::write(
            at.join("src/card/card.ts"),
            "export class HelixCard extends LitElement {}\n",
        )
        .expect("a source");
        std::fs::write(
            at.join("custom-elements.json"),
            format!(
                r#"{{ "modules": [ {{ "path": "src/card/card.ts", "declarations": [
  {{ "kind": "class", "name": "HelixCard", "tagName": "helix-card", "description": "{description}" }} ] }} ] }}"#
            ),
        )
        .expect("a manifest");
        if !modules.is_empty() {
            std::fs::create_dir_all(at.join(".helix/plugins")).expect("a plugin directory");
            for (file, bytes) in modules {
                std::fs::write(at.join(".helix/plugins").join(file), bytes).expect("a module");
            }
        }
        Self(at)
    }
}

impl Drop for Tree {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// A plugin's rule runs, is named by `--only`, and fails the run it should.
#[test]
fn a_plugin_rule_runs_and_fails_the_check_it_should() {
    let tree = Tree::new(
        "finding",
        "A surface. TODO: say what it is for.",
        &[("unfinished.wasm", example())],
    );

    let output = run(&tree.0, &["component", "check", "--only", "unfinished"]);
    /* The register on stdout, because a plugin arriving unnoticed is what
    discovery by directory risks, and the finding on stderr with the rules. */
    assert!(
        out(&output).contains("plugin unfinished sha256:"),
        "the register: {}",
        out(&output)
    );
    assert!(
        err(&output).contains("`HelixCard` publishes a description with `TODO` in it"),
        "the finding: {}",
        err(&output)
    );
    assert_eq!(output.status.code(), Some(1), "a finding fails the run");
}

/// The same workspace with nothing to find: the rule runs and says nothing.
#[test]
fn a_plugin_rule_that_finds_nothing_leaves_the_run_clean() {
    let tree = Tree::new(
        "clean",
        "A surface that holds a single subject.",
        &[("unfinished.wasm", example())],
    );

    let output = run(&tree.0, &["component", "check", "--only", "unfinished"]);
    assert_eq!(
        output.status.code(),
        Some(0),
        "nothing found: {}",
        err(&output)
    );
    assert!(
        out(&output).contains("plugin unfinished"),
        "still registered"
    );
}

/// `--json` carries the register beside the rules, for a run that is read.
#[test]
fn the_register_is_in_the_json_a_caller_parses() {
    let tree = Tree::new(
        "json",
        "A surface that holds a single subject.",
        &[("unfinished.wasm", example())],
    );

    let output = run(
        &tree.0,
        &["component", "check", "--json", "--only", "unfinished"],
    );
    let said: serde_json::Value = serde_json::from_str(&out(&output)).expect("parseable JSON");
    assert_eq!(said["plugins"][0]["name"], "unfinished");
    assert_eq!(said["plugins"][0]["rules"][0], "unfinished");
    assert!(
        said["plugins"][0]["digest"]
            .as_str()
            .is_some_and(|one| one.starts_with("sha256:")),
        "the whole digest: {said}"
    );
    /* The rule reports beside the register, as any rule's would. */
    assert_eq!(said["rules"][0]["name"], "unfinished");
    assert_eq!(said["rules"][0]["unit"], "described components");
}

/// A rule nothing provides is still an input fault rather than a clean run.
#[test]
fn only_naming_a_rule_no_plugin_provides_is_refused() {
    let tree = Tree::new("unknown", "A surface.", &[("unfinished.wasm", example())]);
    let output = run(&tree.0, &["component", "check", "--only", "invented"]);
    assert_eq!(output.status.code(), Some(3), "an input fault");
    assert!(
        err(&output).contains("no component rule called `invented`"),
        "names it: {}",
        err(&output)
    );
    /* The plugin's rule is in the list it prints, because it is one of the
    rules this run has. */
    assert!(
        err(&output).contains("unfinished"),
        "lists it: {}",
        err(&output)
    );
}

/// A module that will not load stops the run rather than being skipped.
#[test]
fn a_plugin_that_cannot_be_loaded_refuses_the_run() {
    let tree = Tree::new("broken", "A surface.", &[("broken.wasm", b"not wasm")]);
    let output = run(&tree.0, &["component", "check"]);
    assert_eq!(output.status.code(), Some(3), "an input fault");
    assert!(
        err(&output).contains("a plugin could not be loaded"),
        "says so: {}",
        err(&output)
    );
    assert!(
        err(&output).contains("broken.wasm"),
        "names it: {}",
        err(&output)
    );
}

/// A workspace with no plugins is every rule this binary was built with.
#[test]
fn a_workspace_with_no_plugins_prints_no_register() {
    let tree = Tree::new("none", "A surface.", &[]);
    let output = run(&tree.0, &["component", "check", "--only", "conventions"]);
    assert!(
        !out(&output).contains("plugin "),
        "nothing to register: {}",
        out(&output)
    );
}
