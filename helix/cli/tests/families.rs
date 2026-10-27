//! A second design system, compiled by `helix family`.
//!
//! **`tests/fixtures/acme` is a design system that is not Helix**: its own
//! prefix, `acme`, its own Design Tokens Format Module file with a dark mode
//! laid over it, and three families written in the neutral form, a badge, a
//! button, and a tab set. Its `helix.family.json` draws with Helix's runtime,
//! the default provider. Each spec copies it into a folder of its own outside
//! the repository and runs the binary there, as a design system's own
//! repository would.

#![cfg(feature = "internal")]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

/// The binary under test, two levels above the test in `target/<profile>/deps`.
fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

/// `from` copied into `into`, every folder and file.
fn copy(from: &Path, into: &Path) {
    fs::create_dir_all(into).unwrap();
    for entry in fs::read_dir(from).unwrap().filter_map(Result::ok) {
        let path = entry.path();
        let target = into.join(entry.file_name());
        if path.is_dir() {
            copy(&path, &target);
        } else {
            fs::copy(&path, &target).unwrap();
        }
    }
}

/// The fixture, copied into a folder named for the spec.
struct Acme {
    root: PathBuf,
}

impl Acme {
    fn new(spec: &str) -> Self {
        let root = std::env::temp_dir().join(format!("family-acme-{spec}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        copy(
            &Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/acme"),
            &root,
        );
        Self { root }
    }

    /// `helix family <verb>`, with the fixture's project.
    fn run(&self, verb: &str) -> Output {
        Command::new(binary())
            .args(["family", verb, "--config"])
            .arg(self.root.join("helix.family.json"))
            .current_dir(&self.root)
            .env("NO_COLOR", "1")
            .output()
            .expect("the binary runs")
    }

    /// `helix family <verb>`, which has to succeed, and what it printed.
    fn ok(&self, verb: &str) -> String {
        let output = self.run(verb);
        assert!(
            output.status.success(),
            "`helix family {verb}` failed:\n{}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        String::from_utf8_lossy(&output.stdout).into_owned()
    }

    fn read(&self, path: &str) -> String {
        fs::read_to_string(self.root.join(path)).unwrap_or_else(|error| panic!("{path}: {error}"))
    }

    fn json(&self, path: &str) -> serde_json::Value {
        serde_json::from_str(&self.read(path)).unwrap()
    }
}

impl Drop for Acme {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

#[test]
fn each_element_is_tagged_and_sends_its_events_under_its_own_prefix() {
    let acme = Acme::new("tags");
    acme.ok("build");
    for (element, tag) in [
        ("badge/root", "acme-badge"),
        ("button/root", "acme-button"),
        ("tabs/root", "acme-tabs"),
        ("tabs/tab", "acme-tab"),
    ] {
        assert_eq!(
            acme.json(&format!("out/dist/ir/{element}.json"))["tag"],
            tag
        );
    }
    let tab = acme.json("out/dist/ir/tabs/tab.json");
    assert_eq!(
        tab["api"]["item"]["of"], "tabs",
        "the tab joins its own set"
    );
    assert_eq!(tab["machines"][0]["machine"], "press");
    let tabs = acme.json("out/dist/ir/tabs/root.json");
    assert_eq!(tabs["machines"][0]["machine"], "single-selection");
    acme.ok("components");
    let module = acme.read("out/native/tabs/index.native.ts");
    assert!(module.contains("the web's `acme-activate`"), "{module}");
    assert!(
        module.contains("the web's `acme-before-select`"),
        "{module}"
    );
    assert!(
        module.contains("export const AcmeTabs = element(rootForm, behaviorFor(rootForm))"),
        "{module}"
    );
    let platforms: serde_json::Value = serde_json::from_str(&acme.ok("platforms")).unwrap();
    assert_eq!(
        platforms["react-native"]["elements"]["acme-button"]["events"][0]["name"],
        "acme-press"
    );
}

#[test]
fn a_box_draws_another_element_by_its_tag_under_its_own_prefix() {
    let acme = Acme::new("draws");
    acme.ok("build");
    /* The tab's source writes `draws="badge"`, and the form holds the tag the
    runtime finds the badge by. */
    let tree = acme.json("out/dist/ir/tabs/tab.json")["tree"].to_string();
    assert!(tree.contains(r#""draws":"acme-badge""#), "{tree}");
    assert!(!tree.contains(r#""draws":"badge""#), "{tree}");
    acme.ok("components");
    let module = acme.read("out/native/tabs/index.native.ts");
    assert!(
        module.contains("import '../badge/index.native'\n"),
        "{module}"
    );
    /* The anatomy names the element as the source does. */
    let anatomy = acme.ok("anatomy");
    assert!(anatomy.contains(r#"draws=\"badge\""#), "{anatomy}");
}

#[test]
fn its_stylesheets_read_its_own_tokens_and_hooks() {
    let acme = Acme::new("css");
    acme.ok("build");
    let css = acme.read("out/dist/web/button/root.css");
    assert!(
        css.contains("background-color: var(--acme-color-accent);"),
        "{css}"
    );
    assert!(
        css.contains("border-radius: var(--button-radius, var(--acme-radius-control));"),
        "{css}"
    );
    assert!(
        css.contains(
            "transition: background-color var(--acme-duration-quick) var(--acme-easing-out);"
        ),
        "{css}"
    );
    let tab = acme.read("out/dist/web/tabs/tab.css");
    assert!(
        tab.contains("var(--tabs-tab-selected-color, var(--acme-color-ink))"),
        "{tab}"
    );
    acme.ok("stylesheets");
    let written = acme.read("out/styled/badge/root/badge-root.generated.css");
    assert!(
        written.starts_with(
            "/* Generated by `helix family stylesheets` from src/families/badge/root."
        ),
        "{written}"
    );
}

#[test]
fn its_native_token_modules_are_read_from_its_own_file_and_its_dark_mode() {
    let acme = Acme::new("tokens");
    acme.ok("tokens");
    let light = acme.read("out/theme/light.generated.ts");
    let dark = acme.read("out/theme/dark.generated.ts");
    let kinds = acme.read("out/theme/kinds.generated.ts");
    for (text, line) in [
        (&light, "'color-background': '#ffffff',"),
        (&light, "'color-focus': '#1a4de6',"),
        (&light, "'color-line': '#00000080',"),
        (&light, "'duration-quick': 120,"),
        (&light, "'easing-out': 'cubic-bezier(0, 0, 0, 1)',"),
        (&light, "'font-body': 'Inter, \"Segoe UI\", sans-serif',"),
        (&light, "'space-md': '1rem',"),
        (&light, "'space-xs': 4,"),
        (&light, "'weight-bold': 600,"),
        (&dark, "'color-background': '#0f0f0f',"),
        (&dark, "'color-accent': '#1a4de6',"),
        (&kinds, "'space-md': 'length',"),
        (&kinds, "'duration-quick': 'time',"),
    ] {
        assert!(text.contains(line), "{line} in\n{text}");
    }
    assert!(light.contains("by its name after `--acme-`"), "{light}");
}

#[test]
fn a_token_its_file_does_not_hold_is_refused() {
    let acme = Acme::new("unknown-token");
    let styled = acme.root.join("src/families/badge/root/styled.ts");
    let source = fs::read_to_string(&styled).unwrap();
    fs::write(
        &styled,
        source.replace("token('radius-pill')", "token('radius-round')"),
    )
    .unwrap();
    let output = acme.run("build");
    assert!(!output.status.success());
    let said = String::from_utf8_lossy(&output.stderr);
    assert!(
        said.contains("reads `token('radius-round')`, which is no token in the theme"),
        "{said}"
    );
}

#[test]
fn every_element_matches_the_manifest_it_is_held_to() {
    let acme = Acme::new("check");
    assert!(acme
        .ok("check")
        .contains("every element matches what it is held to"));
}

/// The names of the runtime the fixture draws with, which is Helix's, and the
/// command's own name, which is the binary's: what an output may say of Helix.
const PROVIDER: [&str; 4] = [
    "`helix family",
    "@fusion.dev/helix-native",
    "HelixEvent",
    "HelixRoot",
];

/// Every file under `folder`, by its path.
fn files(folder: &Path, into: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(folder).unwrap().filter_map(Result::ok) {
        let path = entry.path();
        if path.is_dir() {
            files(&path, into);
        } else {
            into.push(path);
        }
    }
}

#[test]
fn nothing_it_writes_names_helix_but_the_runtime_it_draws_with() {
    let acme = Acme::new("names");
    let mut printed = Vec::new();
    for verb in ["build", "stylesheets", "components", "tokens"] {
        acme.ok(verb);
    }
    for verb in ["anatomy", "platforms"] {
        printed.push((verb.to_owned(), acme.ok(verb)));
    }
    let mut written = Vec::new();
    files(&acme.root.join("out"), &mut written);
    /* The intermediate form's schema is the compiler's, the same for every
    design system. */
    written.retain(|path| !path.ends_with("ir/schema.json"));
    assert!(written.len() >= 18, "{written:?}");
    for path in written {
        printed.push((
            path.display().to_string(),
            fs::read_to_string(&path).unwrap(),
        ));
    }
    let mut named = Vec::new();
    for (what, text) in printed {
        let mut rest = text;
        for name in PROVIDER {
            rest = rest.replace(name, "");
        }
        for (at, line) in rest.lines().enumerate() {
            if line.to_lowercase().contains("helix") {
                named.push(format!("{what}:{}: {line}", at + 1));
            }
        }
    }
    assert!(named.is_empty(), "{}", named.join("\n"));
}
