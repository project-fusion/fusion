//! The rules a project outside this repository runs when it builds on the
//! headless tier, each on one project written for the test, with the headless
//! manifest beside it and one mistake planted per rule.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

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

/// Combobox renders Listbox and Tag, and Listbox renders Option. Each lists the
/// slots and parts it has, inherited ones included, as a manifest does.
const MANIFEST: &str = r#"{ "modules": [
  { "path": "src/combobox/root/combobox-root.ts", "declarations": [ { "name": "HelixHeadlessCombobox", "tagName": "helix-headless-combobox",
    "slots": [ { "name": "" }, { "name": "start" } ], "cssParts": [ { "name": "control", "description": "The field." } ],
    "helix": { "renders": ["listbox", "tag"] } } ] },
  { "path": "src/listbox/root/listbox-root.ts", "declarations": [ { "name": "HelixHeadlessListbox", "tagName": "helix-headless-listbox", "helix": { "renders": ["option"] } } ] },
  { "path": "src/tag/root/tag-root.ts", "declarations": [ { "name": "HelixHeadlessTag", "tagName": "helix-headless-tag",
    "cssParts": [ { "name": "label", "description": "The label." } ] } ] }
] }"#;

/// The project, written once for every test in this file.
fn project() -> &'static Path {
    static PROJECT: OnceLock<PathBuf> = OnceLock::new();
    PROJECT.get_or_init(|| {
        let project =
            std::env::temp_dir().join(format!("fusion-helix-extenders-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&project);
        write(&project, "package.json", r#"{ "name": "acme", "private": true }"#);
        write(&project, "helix.json", r#"{ "components": { "tiers": ["src"] } }"#);
        write(
            &project,
            "node_modules/@fusion.dev/helix-headless/custom-elements.json",
            MANIFEST,
        );
        /* Imports the listbox and not the tag it also renders, documents a
        slot nothing takes, and adds a part of its own. */
        write(
            &project,
            "src/combobox/combobox.ts",
            "import '../listbox/listbox.js'\n\n/**\n * A combobox.\n *\n * @slot start - Before the text.\n * @slot nonsense - Nothing takes this.\n * @csspart chip - A chip of its own.\n */\n@customElement('acme-combobox')\nexport class AcmeCombobox extends HelixHeadlessCombobox {\n  static override tier = 'acme-'\n}\n",
        );
        write(
            &project,
            "src/listbox/listbox.ts",
            "customElements.define('acme-listbox', AcmeListbox)\nexport class AcmeListbox extends HelixHeadlessListbox {\n  static override tier = 'acme-'\n}\n",
        );
        write(
            &project,
            "src/tag/tag.ts",
            "@customElement('acme-tag')\nexport class AcmeTag extends HelixHeadlessTag {}\n",
        );
        /* Sets no prefix for the children it inherits. */
        write(
            &project,
            "src/plain/plain.ts",
            "export class AcmePlain extends HelixHeadlessCombobox {}\n",
        );
        /* Two classes in one module, the second with no prefix of its own. */
        write(
            &project,
            "src/pair/pair.ts",
            "export class AcmePairA extends HelixHeadlessTag {\n  static override tier = 'acme-'\n}\n\nexport class AcmePairB extends HelixHeadlessCombobox {}\n",
        );
        /* A project class named like one of Helix's, which is still the
        project's to register children for. */
        write(
            &project,
            "src/lookalike/lookalike.ts",
            "import '../listbox/listbox.js'\nimport '../tag/tag.js'\n\n@customElement('acme-lookalike')\nexport class HelixLookalike extends HelixHeadlessCombobox {\n  static override tier = 'acme-'\n}\n",
        );
        /* Writes a tag of the project's own and imports nothing. */
        write(
            &project,
            "src/card/card.ts",
            "@customElement('acme-card')\nexport class AcmeCard extends HelixElement {\n  render() {\n    return html`<acme-tag></acme-tag>`\n  }\n}\n",
        );
        /* A word property that is not declared one. */
        write(
            &project,
            "src/badge/badge.ts",
            "import '../tag/tag.js'\n\n@customElement('acme-badge')\nexport class AcmeBadge extends HelixHeadlessTag {\n  static override words = 'acme-badge'\n\n  @property({ type: String })\n  emptyText = 'Nothing here'\n}\n",
        );
        write(
            &project,
            "src/styles.css",
            "acme-combobox::part(chip) {}\nacme-combobox::part(control) {}\nacme-combobox::part(nope) {}\nhelix-headless-tag::part(label) {}\nhelix-headless-tag::part(missing) {}\n",
        );
        project
    })
}

/// The messages one rule reports on the project, sorted.
fn findings(rule: &str) -> Vec<String> {
    let output = Command::new(binary())
        .args(["--json", "component", "check", "--only", rule, "--root"])
        .arg(project())
        .output()
        .expect("helix runs");
    let report: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("the report is JSON");
    let mut found: Vec<String> = report["rules"][0]["findings"]
        .as_array()
        .expect("findings")
        .iter()
        .map(|finding| {
            format!(
                "{} {}",
                finding["file"].as_str().unwrap_or_default(),
                finding["message"].as_str().unwrap_or_default()
            )
        })
        .collect();
    found.sort();
    found
}

#[test]
fn registered_holds_every_child_to_a_registration_under_the_prefix() {
    assert_eq!(
        findings("registered"),
        [
            "src/combobox/combobox.ts:11 AcmeCombobox renders `<acme-option>`, which nothing in the project registers",
            "src/listbox/listbox.ts:2 AcmeListbox renders `<acme-option>`, which nothing in the project registers",
            "src/lookalike/lookalike.ts:5 HelixLookalike renders `<acme-option>`, which nothing in the project registers",
        ]
    );
}

#[test]
fn tier_holds_a_class_that_renders_children_to_a_prefix() {
    assert_eq!(
        findings("tier"),
        [
            "src/pair/pair.ts:5 AcmePairB inherits a template that renders children and sets no `tier`, so it renders Helix's own children inside your element",
            "src/plain/plain.ts:1 AcmePlain inherits a template that renders children and sets no `tier`, so it renders Helix's own children inside your element",
        ]
    );
}

#[test]
fn composed_holds_a_rendered_tag_to_an_import_of_its_registration() {
    assert_eq!(
        findings("composed"),
        [
            "src/card/card.ts:4 renders `<acme-tag>` and never imports the module that registers it, so a page importing this component alone gets an inert element",
            "src/combobox/combobox.ts:11 renders `<acme-tag>` and never imports the module that registers it, so a page importing this component alone gets an inert element",
        ]
    );
}

#[test]
fn slots_holds_a_documented_slot_to_one_the_base_takes() {
    let found = findings("slots");
    assert_eq!(found.len(), 1, "{found:?}");
    assert!(found[0].contains("`AcmeCombobox` documents `@slot nonsense`"));
}

#[test]
fn exportparts_holds_an_outside_selector_to_a_published_part() {
    let found = findings("exportparts");
    assert_eq!(found.len(), 2, "{found:?}");
    assert!(found[0].contains("`acme-combobox::part(nope)`"));
    assert!(found[1].contains("`helix-headless-tag::part(missing)`"));
}

#[test]
fn words_holds_an_english_default_to_the_registry() {
    let found = findings("words");
    assert_eq!(found.len(), 1, "{found:?}");
    assert!(found[0].contains("emptyText"));
}

/// `dispatched`, on a project of its own: an event sent by name is one the
/// class documents.
#[test]
fn dispatched_holds_an_event_sent_by_name_to_its_documentation() {
    let project = std::env::temp_dir().join("fusion-helix-dispatched");
    let _ = std::fs::remove_dir_all(&project);
    write(
        &project,
        "package.json",
        r#"{ "name": "acme", "private": true }"#,
    );
    write(
        &project,
        "helix.json",
        r#"{ "components": { "tiers": ["src"] } }"#,
    );
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
