//! The example plugin, built the way its author would build it, and run.
//!
//! **The long way round on purpose.** The test compiles the example for
//! `wasm32-unknown-unknown` and encodes the core module into a component, which
//! is what a plugin author's toolchain does for them. A committed `.wasm` would
//! make these tests faster and would stop measuring the path anybody else takes.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

use fusion_plugins::{Host, WORLD};

/// The workspace root, from this crate's own manifest.
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("the workspace above this crate")
        .to_path_buf()
}

/// The example plugin as a component, built once for every test that wants it.
fn example() -> &'static [u8] {
    static BUILT: OnceLock<Vec<u8>> = OnceLock::new();
    BUILT.get_or_init(|| built(&[]))
}

/// The same plugin built against a world one ahead of this host's.
fn from_the_future() -> &'static [u8] {
    static BUILT: OnceLock<Vec<u8>> = OnceLock::new();
    BUILT.get_or_init(|| built(&["--features", "future"]))
}

/// Builds the example for WebAssembly and encodes it into a component.
fn built(extra: &[&str]) -> Vec<u8> {
    {
        let at = root().join("fusion/plugins/example");
        /* A target directory per feature set, so building one does not throw
        the other away and the second test pays for linking rather than for the
        whole dependency tree again. */
        let into = at.join(if extra.is_empty() {
            "target"
        } else {
            "target-future"
        });
        let built = Command::new(env!("CARGO"))
            .args([
                "build",
                "--quiet",
                "--release",
                "--target",
                "wasm32-unknown-unknown",
            ])
            .args(extra)
            .arg("--target-dir")
            .arg(&into)
            .current_dir(&at)
            .output()
            .expect("cargo runs");
        assert!(
            built.status.success(),
            "the example plugin did not build: {}",
            String::from_utf8_lossy(&built.stderr)
        );
        let core = into.join("wasm32-unknown-unknown/release/fusion_plugin_example.wasm");
        let bytes = std::fs::read(&core).expect("the built module");
        wit_component::ComponentEncoder::default()
            .module(&bytes)
            .expect("a core module")
            .validate(true)
            .encode()
            .expect("a component")
    }
}

/// A directory holding the modules a test wants the host to find.
fn planted(name: &str, modules: &[(&str, &[u8])]) -> PathBuf {
    let at = std::env::temp_dir().join(format!("fusion-plugins-{name}"));
    let _ = std::fs::remove_dir_all(&at);
    std::fs::create_dir_all(&at).expect("a plugin directory");
    for (file, bytes) in modules {
        std::fs::write(at.join(file), bytes).expect("a module");
    }
    at
}

/// The register, the rules and a judgment, from a module built for real.
#[test]
fn a_plugin_is_loaded_named_and_asked() {
    let at = planted("loaded", &[("unfinished.wasm", example())]);
    let host = Host::read(&at).expect("the host loads it");

    let loaded = host.loaded();
    assert_eq!(loaded.len(), 1, "one module");
    assert_eq!(loaded[0].name, "unfinished");
    /* The digest is what the register prints, so it is the file's own rather
    than anything derived from what the module said about itself. */
    assert!(
        loaded[0].digest.starts_with("sha256:"),
        "a digest: {}",
        loaded[0].digest
    );
    assert_eq!(
        loaded[0]
            .provides
            .iter()
            .map(|one| one.name.as_str())
            .collect::<Vec<&str>>(),
        vec!["unfinished"]
    );

    let payload = serde_json::json!({
        "sheets": [],
        "tiers": [{
            "source": "src",
            "manifest": { "modules": [{ "path": "src/card/card.ts", "declarations": [
                { "name": "HelixCard", "tagName": "helix-card",
                  "description": "A surface. TODO: say what it is for." },
                { "name": "HelixChip", "tagName": "helix-chip",
                  "description": "A small label that stands for a value." },
                { "name": "CardController",
                  "description": "TODO, and not a component, so it is not counted." }
            ] }] }
        }],
    })
    .to_string();

    let judged = host.check("unfinished", &payload).expect("it answers");
    assert_eq!(judged.checked, 2, "the two described components");
    assert_eq!(judged.findings.len(), 1);
    assert_eq!(
        judged.findings[0].message,
        "`HelixCard` publishes a description with `TODO` in it"
    );
    assert_eq!(judged.findings[0].file, "src/card/card.ts");
}

/// A rule nothing provides is refused by name rather than answered with nothing.
#[test]
fn a_rule_no_module_provides_is_refused() {
    let at = planted("unprovided", &[("unfinished.wasm", example())]);
    let host = Host::read(&at).expect("the host loads it");
    let refused = host
        .check("invented", "{}")
        .expect_err("no module provides it");
    assert!(
        refused
            .why
            .contains("no plugin provides a rule called `invented`"),
        "names the rule: {}",
        refused.why
    );
}

/// A payload a plugin will not read is the plugin's refusal, carried back.
#[test]
fn a_payload_a_plugin_refuses_comes_back_as_its_own_words() {
    let at = planted("refused", &[("unfinished.wasm", example())]);
    let host = Host::read(&at).expect("the host loads it");
    let refused = host
        .check("unfinished", "not json at all")
        .expect_err("the plugin refuses it");
    assert!(
        refused.why.contains("the payload will not read"),
        "the plugin's own words: {}",
        refused.why
    );
}

/// Something that is not a component is refused where it is read.
#[test]
fn a_file_that_is_not_a_component_is_refused_by_name() {
    let at = planted("bogus", &[("broken.wasm", b"not wasm")]);
    let Err(refused) = Host::read(&at) else {
        panic!("a file that is not a component loaded");
    };
    assert!(
        refused.file.ends_with("broken.wasm"),
        "names the file: {}",
        refused.file.display()
    );
    assert!(
        refused.why.contains("not a component"),
        "says what is wrong: {}",
        refused.why
    );
}

/// A directory nobody has made is no plugins rather than a failure.
#[test]
fn a_workspace_with_no_plugin_directory_loads_nothing() {
    let at = root().join("fusion/plugins/nothing-is-here");
    let host = Host::read(&at).expect("no directory is not a fault");
    assert!(host.loaded().is_empty());
}

/// The world this host speaks is the one the example was built against.
#[test]
fn the_world_a_module_speaks_is_read_from_the_module() {
    assert_eq!(WORLD, 1);
    let at = planted("world", &[("unfinished.wasm", example())]);
    Host::read(&at).expect("the example speaks this world");
}

/// A module from a world this host does not speak is refused, legibly.
///
/// **The first thing that happens when either side upgrades**, so the message
/// names the module, both versions and what to do rather than trapping
/// somewhere inside the runtime.
#[test]
fn a_module_built_against_another_world_is_refused_by_both_numbers() {
    let at = planted("future", &[("ahead.wasm", from_the_future())]);
    let Err(refused) = Host::read(&at) else {
        panic!("a module from another world loaded");
    };
    assert!(refused.file.ends_with("ahead.wasm"), "names the module");
    assert!(
        refused.why.contains("built against world 2")
            && refused.why.contains("speaks world 1")
            && refused.why.contains("Rebuild it"),
        "names both worlds and what to do: {}",
        refused.why
    );
}
