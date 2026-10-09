//! `registered` on a project outside this repository that builds on the
//! headless tier, with the headless manifest written for the test.

use std::path::{Path, PathBuf};
use std::process::Command;

fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

fn write(root: &Path, file: &str, text: &str) {
    let path = root.join(file);
    std::fs::create_dir_all(path.parent().expect("a parent")).expect("a directory");
    std::fs::write(path, text).expect("a file");
}

/// Combobox renders Listbox and Tag, and Listbox renders Option.
const MANIFEST: &str = r#"{ "modules": [
  { "path": "src/combobox/root/combobox-root.ts", "declarations": [ { "name": "HelixHeadlessCombobox", "helix": { "renders": ["listbox", "tag"] } } ] },
  { "path": "src/listbox/root/listbox-root.ts", "declarations": [ { "name": "HelixHeadlessListbox", "helix": { "renders": ["option"] } } ] },
  { "path": "src/tag/root/tag-root.ts", "declarations": [ { "name": "HelixHeadlessTag" } ] }
] }"#;

fn findings(project: &Path) -> Vec<String> {
    let output = Command::new(binary())
        .args([
            "--json",
            "component",
            "check",
            "--only",
            "registered",
            "--root",
        ])
        .arg(project)
        .output()
        .expect("helix runs");
    let report: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("the report is JSON");
    report["rules"][0]["findings"]
        .as_array()
        .expect("findings")
        .iter()
        .map(|finding| finding["message"].as_str().unwrap_or_default().to_owned())
        .collect()
}

#[test]
fn a_subclass_registers_everything_its_base_renders_under_its_prefix() {
    let project = std::env::temp_dir().join("fusion-helix-registered");
    let _ = std::fs::remove_dir_all(&project);
    write(
        &project,
        "package.json",
        r#"{ "name": "acme", "private": true }"#,
    );
    write(&project, "helix.json", r#"{ "tiers": ["src"] }"#);
    write(
        &project,
        "node_modules/@fusion.dev/helix-headless/custom-elements.json",
        MANIFEST,
    );
    write(
        &project,
        "src/combobox/combobox.ts",
        "@customElement('acme-combobox')\nexport class AcmeCombobox extends HelixHeadlessCombobox {\n  static override tier = 'acme-'\n}\n",
    );
    write(
        &project,
        "src/listbox/listbox.ts",
        "customElements.define('acme-listbox', AcmeListbox)\nexport class AcmeListbox extends HelixHeadlessListbox {\n  static override tier = 'acme-'\n}\n",
    );
    write(
        &project,
        "src/plain/plain.ts",
        "export class AcmePlain extends HelixHeadlessCombobox {}\n",
    );

    let mut found = findings(&project);
    found.sort();
    assert_eq!(
        found,
        [
            "AcmeCombobox renders `<acme-option>`, which nothing in the project registers",
            "AcmeCombobox renders `<acme-tag>`, which nothing in the project registers",
            "AcmeListbox renders `<acme-option>`, which nothing in the project registers",
            "AcmePlain renders children and sets no `tier`",
        ]
    );
    let _ = std::fs::remove_dir_all(&project);
}

/// `dispatched`, on the same kind of project: an event sent by name is one the
/// class documents.
#[test]
fn an_event_a_component_sends_by_name_is_documented() {
    let project = std::env::temp_dir().join("fusion-helix-dispatched");
    let _ = std::fs::remove_dir_all(&project);
    write(
        &project,
        "package.json",
        r#"{ "name": "acme", "private": true }"#,
    );
    write(&project, "helix.json", r#"{ "tiers": ["src"] }"#);
    write(
        &project,
        "src/badge/badge.ts",
        "/**\n * A badge.\n *\n * @event acme-pulse - Fired when the badge pulses.\n */\n@customElement('acme-badge')\nexport class AcmeBadge extends HelixHeadlessBadge {\n  pulse() {\n    this.dispatchEvent(new CustomEvent('acme-pulse'))\n    this.dispatchEvent(new CustomEvent('acme-flash'))\n  }\n}\n",
    );
    let output = Command::new(binary())
        .args([
            "--json",
            "component",
            "check",
            "--only",
            "dispatched",
            "--root",
        ])
        .arg(&project)
        .output()
        .expect("helix runs");
    let report: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("the report is JSON");
    let messages: Vec<&str> = report["rules"][0]["findings"]
        .as_array()
        .expect("findings")
        .iter()
        .filter_map(|finding| finding["message"].as_str())
        .collect();
    assert_eq!(
        messages,
        ["dispatches `acme-flash`, which no `@event` documents"]
    );
    let _ = std::fs::remove_dir_all(&project);
}
