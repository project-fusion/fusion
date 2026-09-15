//! Every component rule, against the fault it exists to catch.
//!
//! **A rule that has never seen its fault is a rule that might report a clean
//! tree because it read nothing.** `floors` catches the count falling to zero
//! and nothing else; a predicate that matches the wrong thing counts a corpus
//! and passes. So each test here writes the smallest workspace a rule reads,
//! proves the rule counts it and finds nothing, plants one fault, and proves
//! the rule names it. It is the check no unit test on a helper makes.
//!
//! **Through the binary and `--json`, the way `contract.rs` runs.** A rule is a
//! function, and calling it would be faster, but the contract a consumer has
//! is the command line: the settings file, the tiers, the manifest beside a
//! tier, and the JSON. A test that bypassed those would pass while the wiring
//! between them was broken.
//!
//! **A manifest is written by hand, with the fields the rule reads.** The real
//! ones come from `cem analyze` and run to seventy thousand lines; a rule reads
//! a handful of paths in them, and the handful is what the fixture carries.
//! The same goes for the oracle and the DOM library: a rule reads a shape, and
//! the shape is what is written.
//!
//! **The layout is load-bearing more often than it looks.** Several rules take
//! the family from a file's grandparent directory, the owner from the fourth
//! path segment, or the twin from the identical relative path on another
//! layer, and a fixture one level too shallow reports `checked: 0` rather than
//! failing. Every such requirement is stated on the test that carries it.

use std::path::PathBuf;
use std::process::Command;

/// A scratch workspace, one per test, removed when it drops.
struct Tree(PathBuf);

impl Tree {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("helix-rules-{name}"));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).expect("a temp directory");
        Self(path)
    }

    fn write(&self, at: &str, content: &str) -> &Self {
        let path = self.0.join(at);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("a directory");
        }
        std::fs::write(&path, content).expect("a file");
        self
    }

    fn remove(&self, at: &str) -> &Self {
        std::fs::remove_file(self.0.join(at)).expect("a file to remove");
        self
    }
}

impl Drop for Tree {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// What one rule said, read off `--json`.
struct Verdict {
    checked: u64,
    /// `file` and `message` of each finding, which is what a test names.
    findings: Vec<(String, String)>,
}

/// Runs the rules `only` names against a tree and reads what `rule` reported.
///
/// Two names rather than one because of `floors`: the meta rule reads what
/// the source rules counted, so it is judged beside one and read on its own.
fn judge(tree: &Tree, only: &str, rule: &str) -> Verdict {
    let root = tree.0.to_str().expect("a temp path is text");
    let output = Command::new(env!("CARGO_BIN_EXE_helix"))
        .args([
            "component",
            "check",
            "--json",
            "--only",
            only,
            "--root",
            root,
        ])
        .env("NO_COLOR", "1")
        .output()
        .expect("the binary runs");
    let code = output.status.code().expect("the process exited normally");
    assert!(
        code == 0 || code == 1,
        "`{only}` exited {code}: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let parsed: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("--json is parseable");
    let entry = parsed["rules"]
        .as_array()
        .and_then(|rules| rules.iter().find(|one| one["name"] == rule))
        .unwrap_or_else(|| panic!("`{rule}` is not in the report: {parsed}"));
    Verdict {
        checked: entry["checked"].as_u64().expect("a count"),
        findings: entry["findings"]
            .as_array()
            .expect("a list")
            .iter()
            .map(|one| {
                (
                    one["file"].as_str().unwrap_or_default().to_owned(),
                    one["message"].as_str().unwrap_or_default().to_owned(),
                )
            })
            .collect(),
    }
}

fn assert_clean(rule: &str, verdict: &Verdict) {
    assert!(
        verdict.checked > 0,
        "`{rule}` counted nothing on the clean tree, so the fixture is not what it reads"
    );
    assert!(
        verdict.findings.is_empty(),
        "`{rule}` reported the clean tree: {:?}",
        verdict.findings
    );
}

fn assert_found(rule: &str, verdict: &Verdict, message: &str, file: &str) {
    assert!(
        verdict
            .findings
            .iter()
            .any(|(at, said)| said.contains(message) && at.contains(file)),
        "`{rule}` did not report the planted fault ({message} in {file}): {:?}",
        verdict.findings
    );
}

/// The shape every test takes: a clean tree, one fault, what the rule says.
///
/// Both trees are judged, in that order, so a fixture the rule does not read
/// fails on the first assertion rather than passing on the second for a reason
/// nobody planted. `message` and `file` are substrings of one finding.
fn plant(rule: &str, clean: &[(&str, &str)], fault: impl FnOnce(&Tree), message: &str, file: &str) {
    let tree = Tree::new(rule);
    for (at, content) in clean {
        tree.write(at, content);
    }
    assert_clean(rule, &judge(&tree, rule, rule));
    fault(&tree);
    assert_found(rule, &judge(&tree, rule, rule), message, file);
}

/// The one setting every rule needs: `prepare` refuses a run whose tiers are
/// all missing, so even a rule that reads only `layers` gets a tier.
const TIERS: &str = r#"{ "tiers": ["src"] }"#;

/// Two layers, base under styled, which is what the layer-pair rules read.
const PAIR: &str = r#"{
  "tiers": ["packages/base/src", "packages/styled/src"],
  "layers": [
    { "prefix": "base-", "source": "packages/base/src" },
    { "prefix": "helix-", "source": "packages/styled/src" }
  ]
}"#;

/// One styled layer beside its manifest.
const STYLED: &str = r#"{
  "tiers": ["packages/styled/src"],
  "layers": [{ "prefix": "helix-", "source": "packages/styled/src" }]
}"#;

const READONLY: &str = r"export class HelixInput extends LitElement {
  @property({ type: Boolean, attribute: 'readonly' })
  readOnly = false;
}
";

#[test]
fn attribute_names() {
    plant(
        "attribute-names",
        &[("helix.json", TIERS), ("src/input/input.ts", READONLY)],
        |tree| {
            tree.write(
                "src/input/input.ts",
                r"export class HelixInput extends LitElement {
  @property({ type: Boolean, attribute: 'read-only' })
  readOnly = false;
}
",
            );
        },
        "`readOnly` answers to `read-only` and HTML spells it `readonly`",
        "src/input/input.ts",
    );
}

/// The manifest sits beside the tier's parent, which for a tier of `src` is
/// the root.
#[test]
fn attributes() {
    let manifest = |reflects: &str| {
        format!(
            r#"{{ "modules": [ {{ "path": "src/chip/chip.ts", "declarations": [
  {{ "tagName": "helix-chip", "members": [ {{ "name": "label", "attribute": "label", "reflects": {reflects} }} ] }} ] }} ] }}"#
        )
    };
    plant(
        "attributes",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["src"], "documents": ["docs"] }"#,
            ),
            (
                "src/chip/chip.ts",
                "export class HelixChip extends LitElement {}\n",
            ),
            ("custom-elements.json", &manifest("true")),
            ("docs/theme.css", ".chip[label] { color: red; }\n"),
            (
                "docs/page.tsx",
                r#"export const Page = () => <helix-chip label="Hue"></helix-chip>;"#,
            ),
        ],
        |tree| {
            tree.write("custom-elements.json", &manifest("false"));
        },
        "which declare `label` as a property and do not reflect it",
        "docs/theme.css",
    );
}

/// `file` here is the bare family name. `tone` is the axis chosen because a
/// single layer paints nothing, and every other axis would be refused for it.
#[test]
fn axes() {
    let manifest = |values: &str| {
        format!(
            r#"{{ "modules": [ {{ "path": "src/badge/badge.ts", "declarations": [
  {{ "tagName": "helix-badge", "attributes": [ {{ "name": "tone", "type": {{ "text": "{values}" }} }} ] }} ] }} ] }}"#
        )
    };
    plant(
        "axes",
        &[
            ("helix.json", STYLED),
            (
                "packages/styled/src/badge/badge.ts",
                "export class HelixBadge extends LitElement {}\n",
            ),
            (
                "packages/styled/custom-elements.json",
                &manifest("'primary' | 'neutral'"),
            ),
        ],
        |tree| {
            tree.write(
                "packages/styled/custom-elements.json",
                &manifest("'primary' | 'loud'"),
            );
        },
        "`helix-badge` gives `tone` the value `loud`, which the axis does not have",
        "badge",
    );
}

/// The event class's closing brace has to sit in column 0, which is what the
/// class pattern keys on.
#[test]
fn cancelable() {
    let events = |cancelable: &str| {
        format!(
            "export class HelixChangeEvent extends CustomEvent<void> {{
  constructor() {{
    super('helix-change', {{ bubbles: true, cancelable: {cancelable}, composed: true }});
  }}
}}
"
        )
    };
    plant(
        "cancelable",
        &[
            ("helix.json", TIERS),
            ("src/events.ts", &events("false")),
            (
                "src/select/select.ts",
                r"/**
 * @event {HelixChangeEvent} helix-change - Fired after the value changes.
 */
export class HelixSelect extends LitElement {}
",
            ),
        ],
        |tree| {
            tree.write("src/events.ts", &events("true"));
        },
        "`helix-change` is cancelable and its description does not say so",
        "src/select/select.ts",
    );
}

/// Read off `<layer>/<family>/root/*-root.ts` on both layers; `file` is the
/// family.
#[test]
fn categories() {
    plant(
        "categories",
        &[
            ("helix.json", PAIR),
            (
                "packages/base/src/button/root/button-root.ts",
                "/** @category actions */\nexport class BaseButtonRoot extends LitElement {}\n",
            ),
            (
                "packages/styled/src/button/root/button-root.ts",
                "/** @category actions */\nexport class HelixButtonRoot extends LitElement {}\n",
            ),
        ],
        |tree| {
            tree.write(
                "packages/styled/src/button/root/button-root.ts",
                "/** @category forms */\nexport class HelixButtonRoot extends LitElement {}\n",
            );
        },
        "the base says `actions` and the layer above says `forms`",
        "button",
    );
}

/// Owner and declaring family are both the grandparent directory, so the
/// `<family>/<part>/<file>.ts` depth is what makes the base layer own `icon`.
#[test]
fn composed() {
    plant(
        "composed",
        &[
            ("helix.json", PAIR),
            (
                "packages/base/src/icon/root/icon-root.ts",
                "@customElement('base-icon')\nexport class BaseIconRoot extends LitElement {}\n",
            ),
            (
                "packages/base/src/button/root/button-root.ts",
                r"import '../../icon/index.js';

export class BaseButtonRoot extends LitElement {
  render() {
    return html`<${this.tag('icon')}></${this.tag('icon')}>`;
  }
}
",
            ),
        ],
        |tree| {
            tree.write(
                "packages/base/src/button/root/button-root.ts",
                r"import '../../icon/index.js';

export class BaseButtonRoot extends LitElement {
  render() {
    return html`<base-icon></${this.tag('icon')}>`;
  }
}
",
            );
        },
        "writes `<base-icon>` into a template, and the base layer may not name a tag from the layer above",
        "packages/base/src/button/root/button-root.ts",
    );
}

#[test]
fn corners() {
    plant(
        "corners",
        &[
            ("helix.json", TIERS),
            (
                "src/menu/menu.css",
                r#"[part="panel"] {
  box-shadow: var(--helix-shadow-floating);
  border-radius: var(--helix-radii-sm);
}
"#,
            ),
        ],
        |tree| {
            tree.write(
                "src/menu/menu.css",
                r#"[part="panel"] {
  box-shadow: var(--helix-shadow-floating);
  border-radius: 8px;
}
"#,
            );
        },
        "`panel` floats and sets `border-radius: 8px`, which is not the corner every other floating panel takes",
        "src/menu/menu.css",
    );
}

/// `layer` is mandatory: with it empty the rule reports nothing at all, and
/// with it naming a sheet that derives nothing it reports that instead.
#[test]
fn derived_steps() {
    plant(
        "derived-steps",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["src"], "layer": ["styles/base.css"] }"#,
            ),
            (
                "styles/base.css",
                "[data-density] {\n  --helix-size-icon-tight: calc(var(--helix-size-icon) * 0.8);\n}\n",
            ),
            (
                "src/chip/chip.css",
                ":host {\n  --helix-size-icon: 1rem;\n  --helix-size-icon-tight: calc(var(--helix-size-icon) * 0.8);\n}\n",
            ),
        ],
        |tree| {
            tree.write("src/chip/chip.css", ":host {\n  --helix-size-icon: 1rem;\n}\n");
        },
        "`:host` moves `--helix-size-icon` and leaves `--helix-size-icon-tight` at the root's value",
        "src/chip/chip.css",
    );
}

/// The sheet pairs with the module by path minus extension, so the two share
/// a stem.
#[test]
fn disabled() {
    plant(
        "disabled",
        &[
            ("helix.json", TIERS),
            (
                "src/checkbox/checkbox.ts",
                "export class HelixCheckbox extends HelixFormElement {}\n",
            ),
            (
                "src/checkbox/checkbox.css",
                ":host(:disabled) { opacity: 0.5; }\n",
            ),
        ],
        |tree| {
            tree.write(
                "src/checkbox/checkbox.css",
                ":host([disabled]) { opacity: 0.5; }\n",
            );
        },
        ":host([disabled]) misses an ancestor `<fieldset disabled>`",
        "src/checkbox/checkbox.css",
    );
}

/// The barrel is `<tier>/index.ts` of the tier holding the registry, and a
/// component file must not carry the event class marker or it reads as one.
#[test]
fn events() {
    let select = |declared: &str| {
        format!(
            "/**
 * @event {{HelixChangeEvent}} {declared} - Fired after the value changes.
 */
@customElement('helix-select')
export class HelixSelect extends LitElement {{
  fire() {{ this.dispatchEvent(new HelixChangeEvent()); }}
}}
"
        )
    };
    plant(
        "events",
        &[
            ("helix.json", TIERS),
            (
                "src/events.ts",
                r"export class HelixChangeEvent extends CustomEvent<void> {
  static readonly eventName = 'helix-change';
}

const registry = { HelixChangeEvent } as const;
",
            ),
            (
                "src/index.ts",
                "export { HelixChangeEvent } from './events.js';\n",
            ),
            ("src/select/select.ts", &select("helix-change")),
        ],
        |tree| {
            tree.write("src/select/select.ts", &select("helix-changed"));
        },
        "HelixSelect dispatches `helix-change` and no `@event` declares it",
        "src/select/select.ts",
    );
}

/// Every pattern here hard-codes the `helix-` prefix, and the manifest's
/// `path` family has to equal the directory on disk.
#[test]
fn example_events() {
    let example = |event: &str| {
        format!(
            r#"<helix-tabs id="tabs"></helix-tabs>
<script type="module">
  const tabs = document.getElementById('tabs');
  tabs.addEventListener('{event}', () => {{}});
</script>
"#
        )
    };
    plant(
        "example-events",
        &[
            ("helix.json", STYLED),
            (
                "packages/styled/src/tabs/tabs.ts",
                "export class HelixTabs extends LitElement {}\n",
            ),
            (
                "packages/styled/custom-elements.json",
                r#"{ "modules": [ { "path": "src/tabs/root/tabs-root.ts", "declarations": [
  { "tagName": "helix-tabs", "events": [ { "name": "helix-select" } ] } ] } ] }"#,
            ),
            (
                "packages/styled/src/tabs/.examples/events.html",
                &example("helix-select"),
            ),
        ],
        |tree| {
            tree.write(
                "packages/styled/src/tabs/.examples/events.html",
                &example("helix-change"),
            );
        },
        "listens on `<helix-tabs>` for `helix-change`, which it does not declare",
        "packages/styled/src/tabs/.examples/events.html",
    );
}

/// The spec is found exactly one directory below the family, under a part.
#[test]
fn example_specs() {
    let spec = |slug: &str| {
        format!(
            "import {slug} from '../.examples/{slug}.html' with {{ type: 'text' }};\nexample({slug});\n"
        )
    };
    plant(
        "example-specs",
        &[
            ("helix.json", STYLED),
            (
                "packages/styled/src/tabs/.examples/keyboard.html",
                "<helix-tabs></helix-tabs>\n<script type=\"module\">document.querySelector('helix-tabs');</script>\n",
            ),
            (
                "packages/styled/src/tabs/root/tabs-root.dom.spec.ts",
                &spec("keyboard"),
            ),
        ],
        |tree| {
            tree.write(
                "packages/styled/src/tabs/root/tabs-root.dom.spec.ts",
                &spec("mouse"),
            );
        },
        "carries a script and no spec runs it",
        "packages/styled/src/tabs/.examples/keyboard.html",
    );
}

/// Keyed on `tiers` rather than `layers`, unlike its example-rule siblings.
#[test]
fn example_values() {
    plant(
        "example-values",
        &[
            ("helix.json", TIERS),
            (
                "src/badge/badge.ts",
                "export class HelixBadge extends LitElement {}\n",
            ),
            (
                "custom-elements.json",
                r#"{ "modules": [ { "path": "src/badge/badge.ts", "declarations": [
  { "tagName": "helix-badge", "attributes": [ { "name": "tone", "type": { "text": "'primary' | 'neutral'" } } ] } ] } ] }"#,
            ),
            (
                "src/badge/.examples/preview.html",
                "<helix-badge tone=\"primary\">New</helix-badge>\n",
            ),
        ],
        |tree| {
            tree.write(
                "src/badge/.examples/preview.html",
                "<helix-badge tone=\"loud\">New</helix-badge>\n",
            );
        },
        "`<helix-badge tone=\"loud\">` is not one of `primary`, `neutral`",
        "src/badge/.examples/preview.html",
    );
}

/// A family is a directory under the last layer holding `index.ts`; `file`
/// is `<family>/<example>` rather than a path.
#[test]
fn examples() {
    plant(
        "examples",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["packages/styled/src"],
  "layouts": ["centered"],
  "layers": [{ "prefix": "helix-", "source": "packages/styled/src" }]
}"#,
            ),
            (
                "packages/styled/src/button/index.ts",
                "export * from './button.js';\n",
            ),
            (
                "packages/styled/src/button/.examples/preview.html",
                "<!-- @summary A button. -->\n<!-- @layout centered -->\n<p>A button.</p>\n",
            ),
        ],
        |tree| {
            tree.write(
                "packages/styled/src/button/.examples/preview.html",
                "<!-- @layout centered -->\n<p>A button.</p>\n",
            );
        },
        "has no `<!-- @summary",
        "button/preview.html",
    );
}

/// The visible copy of `preview.html` has to read the same on both layers.
#[test]
fn examples_paired() {
    plant(
        "examples-paired",
        &[
            ("helix.json", PAIR),
            (
                "packages/base/src/button/.examples/preview.html",
                "<base-button>Save</base-button>\n",
            ),
            (
                "packages/base/src/button/.examples/preview.tsx",
                "export function Example() { return <base-button>Save</base-button>; }\n",
            ),
            (
                "packages/styled/src/button/.examples/preview.html",
                "<helix-button>Save</helix-button>\n",
            ),
            (
                "packages/styled/src/button/.examples/preview.tsx",
                "export function Example() { return <helix-button>Save</helix-button>; }\n",
            ),
        ],
        |tree| {
            tree.write(
                "packages/styled/src/button/.examples/preview.html",
                "<helix-button>Submit</helix-button>\n",
            );
        },
        "the two layers do not read the same",
        "button",
    );
}

/// With no `layers` the docs key and the lookup key are both the full tag.
#[test]
fn exportparts() {
    plant(
        "exportparts",
        &[
            ("helix.json", r#"{ "tiers": ["src"], "outside": ["docs"] }"#),
            (
                "src/field/field.ts",
                r"/**
 * @csspart label - The field's label.
 */
@customElement('helix-field')
export class HelixField extends LitElement {}
",
            ),
            (
                "docs/theme.css",
                "helix-field::part(label) { color: red; }\n",
            ),
        ],
        |tree| {
            tree.write(
                "docs/theme.css",
                "helix-field::part(labl) { color: red; }\n",
            );
        },
        "`helix-field::part(labl)` names a part that element does not publish",
        "docs/theme.css:1",
    );
}

/// A tag held in a name is a composition as much as one written inline: the
/// child here is opened as `<${pager}>`, which is how `static-html` wants it.
/// The layer is what turns `helix-pager` into the `pager` that `this.tag()`
/// names, so without one the child resolves to nothing and nothing is asked.
#[test]
fn exportparts_through_a_name() {
    let table = |forwards: &str| {
        format!(
            r#"/**
 * @csspart pager - The pagination.
 * @csspart pager-page - One page.
 */
@customElement('helix-table')
export class HelixTable extends LitElement {{
  render() {{
    const pager = this.tag('pager')
    return html`<${{pager}} part="pager"{forwards}></${{pager}}>`
  }}
}}
"#
        )
    };
    let tree = Tree::new("exportparts-through-a-name");
    tree.write(
        "helix.json",
        r#"{ "tiers": ["src"], "layers": [{ "prefix": "helix-", "source": "src" }] }"#,
    )
    .write(
        "src/pager/pager.ts",
        r"/**
 * @csspart page - One page.
 */
@customElement('helix-pager')
export class HelixPager extends LitElement {}
",
    )
    .write(
        "src/table/table.ts",
        &table(r#" exportparts="page: pager-page""#),
    );
    assert_clean("exportparts", &judge(&tree, "exportparts", "exportparts"));
    tree.write("src/table/table.ts", &table(""));
    assert_found(
        "exportparts",
        &judge(&tree, "exportparts", "exportparts"),
        "renders <pager> and does not forward its `page` part",
        "src/table/table.ts",
    );
}

/// A part forwarded a second time under a state, the way a chat fed as data
/// names its reader's own turns: `<role>-<part>-<state>` beside the plain name
/// passes, read out of the table the interpolation names. A second name under
/// another prefix is refused, and so is one landing on a name already taken.
#[test]
fn exportparts_second_names() {
    let chat = |mine: &str| {
        format!(
            r#"/**
 * @csspart turn-body - One turn's body.
 * @csspart turn-body-mine - The reader's own turn's body.
 * @csspart turn-meta - One turn's line.
 */
const SECOND = {{
  me: '{mine}',
}}

@customElement('helix-chat')
export class HelixChat extends LitElement {{
  render() {{
    const turn = this.tag('turn')
    return html`<${{turn}} exportparts="body: turn-body, meta: turn-meta${{pick(SECOND, this.author)}}"></${{turn}}>`
  }}
}}
"#
        )
    };
    let tree = Tree::new("exportparts-second-names");
    tree.write(
        "helix.json",
        r#"{ "tiers": ["src"], "layers": [{ "prefix": "helix-", "source": "src" }] }"#,
    )
    .write(
        "src/turn/turn.ts",
        r"/**
 * @csspart body - What was said.
 * @csspart meta - The line under it.
 */
@customElement('helix-turn')
export class HelixTurn extends LitElement {}
",
    )
    .write("src/chat/chat.ts", &chat("body: turn-body-mine"));
    assert_clean("exportparts", &judge(&tree, "exportparts", "exportparts"));

    tree.write("src/chat/chat.ts", &chat("body: turn-meta-mine"));
    assert_found(
        "exportparts",
        &judge(&tree, "exportparts", "exportparts"),
        "forwards <turn>'s `body` as `turn-meta-mine`, and the role here is `turn`",
        "src/chat/chat.ts",
    );

    tree.write("src/chat/chat.ts", &chat("meta: turn-body"));
    assert_found(
        "exportparts",
        &judge(&tree, "exportparts", "exportparts"),
        "forwards <turn>'s `body` and `meta` both as `turn-body`",
        "src/chat/chat.ts",
    );
}

/// The method pattern wants exactly two spaces of indentation, and a seam is a
/// protected `render*` method that is not `render` itself.
#[test]
fn fallbacks() {
    plant(
        "fallbacks",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.ts",
                r#"export class HelixCard extends LitElement {
  protected renderBadge() {
    return html`<slot name="badge"><span class="dot"></span></slot>`;
  }
}
"#,
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.ts",
                r#"export class HelixCard extends LitElement {
  protected override render() {
    return html`<slot name="badge"><span class="dot"></span></slot>`;
  }
}
"#,
            );
        },
        "a slot's fallback draws markup inside `render`",
        "src/card/card.ts:3",
    );
}

/// The meta rule reads what the source rules counted, so `--only floors` alone
/// measures nothing and passes vacuously. It is judged beside one source rule,
/// and the fault is that rule counting zero.
#[test]
fn floors() {
    let tree = Tree::new("floors");
    tree.write("helix.json", TIERS)
        .write("src/input/input.ts", READONLY);
    assert_clean("floors", &judge(&tree, "floors,attribute-names", "floors"));
    tree.write(
        "src/input/input.ts",
        "export class HelixInput extends LitElement {}\n",
    );
    assert_found(
        "floors",
        &judge(&tree, "floors,attribute-names", "floors"),
        "counted no platform-mirroring properties",
        "rule: attribute-names",
    );
}

#[test]
fn focus_ring() {
    let sheet = |offset: &str| {
        format!(
            ":host(:focus-visible) {{
  outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
  outline-offset: {offset};
}}
"
        )
    };
    plant(
        "focus-ring",
        &[
            ("helix.json", TIERS),
            (
                "src/button/button.css",
                &sheet("var(--helix-size-focus-offset)"),
            ),
        ],
        |tree| {
            tree.write("src/button/button.css", &sheet("2px"));
        },
        "`:host(:focus-visible)` sets `outline-offset: 2px`, which the registry does not name",
        "src/button/button.css",
    );
}

/// Needs a layer with a non-empty prefix, or the rule short-circuits.
#[test]
fn glyphs() {
    let button = |markup: &str| {
        format!(
            "export class Button extends HTMLElement {{
  render() {{
    return `{markup}`;
  }}
}}
"
        )
    };
    plant(
        "glyphs",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["styled/src"], "layers": [{ "prefix": "hx-", "source": "styled/src" }] }"#,
            ),
            (
                "styled/src/button/button.ts",
                &button(r#"<span class="mark"></span>"#),
            ),
        ],
        |tree| {
            tree.write(
                "styled/src/button/button.ts",
                &button(r#"<hx-icon name="check"></hx-icon>"#),
            );
        },
        "renders the icon element for itself",
        "styled/src/button/button.ts",
    );
}

/// `checked` counts only the correct uses, so the clean tree needs one.
#[test]
fn grounds() {
    plant(
        "grounds",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.css",
                ":host {\n  background-color: var(--card-background, var(--helix-color-background));\n}\n",
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.css",
                ":host {\n  background-color: var(--helix-color-background);\n}\n",
            );
        },
        "paints `--helix-color-background` with no hook to correct it",
        "src/card/card.css:2",
    );
}

#[test]
fn hook_names() {
    plant(
        "hook-names",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.css",
                ":host {\n  padding: var(--card-padding, 8px);\n}\n",
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.css",
                ":host {\n  background: var(--card-background, white);\n}\n",
            );
        },
        "`--card-background` ends with `-background`, and this library spells that `-background-color`",
        "src/card/card.css",
    );
}

/// The owner is the fourth path segment, so the tier sits at `pkg/styled/src`
/// and the family is what follows it.
#[test]
fn hooks() {
    plant(
        "hooks",
        &[
            ("helix.json", r#"{ "tiers": ["pkg/styled/src"] }"#),
            (
                "pkg/styled/src/button/button.ts",
                "/**\n * @cssproperty --button-background-color - The fill.\n */\nexport class Button extends HTMLElement {}\n",
            ),
            (
                "pkg/styled/src/button/button.css",
                ":host {\n  background-color: var(--button-background-color, white);\n}\n",
            ),
        ],
        |tree| {
            tree.write("pkg/styled/src/button/button.css", ":host {\n  color: red;\n}\n");
        },
        "documents `--button-background-color` and no rule reads it",
        "pkg/styled/src/button/button.ts",
    );
}

#[test]
fn leaks() {
    plant(
        "leaks",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.ts",
                r"export class Card extends HTMLElement {
  connectedCallback() {
    window.addEventListener('resize', this.onResize);
  }
  disconnectedCallback() {
    window.removeEventListener('resize', this.onResize);
  }
}
",
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.ts",
                r"export class Card extends HTMLElement {
  connectedCallback() {
    window.addEventListener('resize', this.onResize);
  }
}
",
            );
        },
        "listens for `resize` and never stops",
        "src/card/card.ts:3",
    );
}

/// A literal duration, because a transition answered by the layer's token
/// alone is not counted.
#[test]
fn motion() {
    plant(
        "motion",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.css",
                r#"[part="body"] {
  transition: opacity 200ms;
}

@media (prefers-reduced-motion: reduce) {
  [part="body"] {
    transition: none;
  }
}
"#,
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.css",
                "[part=\"body\"] {\n  transition: opacity 200ms;\n}\n",
            );
        },
        "`[part=\"body\"]` moves and is not named in a `@media (prefers-reduced-motion: reduce)` block",
        "src/card/card.css",
    );
}

#[test]
fn observers() {
    plant(
        "observers",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.ts",
                r"export class Card extends HTMLElement {
  connectedCallback() {
    this.watcher = new ResizeObserver(() => {});
    this.watcher.observe(this);
  }
  disconnectedCallback() {
    this.watcher.disconnect();
  }
}
",
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.ts",
                r"export class Card extends HTMLElement {
  connectedCallback() {
    this.watcher = new ResizeObserver(() => {});
  }
  disconnectedCallback() {
    this.watcher.disconnect();
  }
}
",
            );
        },
        "disconnects an observer and never observes again",
        "src/card/card.ts",
    );
}

/// The component's tag is rebuilt from the sheet's path, so the sheet lives at
/// `<layer>/<family>/root/*.css`.
#[test]
fn overruled() {
    plant(
        "overruled",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["styled/src"],
  "documents": ["app"],
  "layers": [{ "prefix": "hx-", "source": "styled/src" }]
}"#,
            ),
            ("app/site.css", "hx-button {\n  color: red;\n}\n"),
            (
                "styled/src/button/root/button-root.css",
                ":host {\n  padding: 0;\n}\n",
            ),
        ],
        |tree| {
            tree.write(
                "styled/src/button/root/button-root.css",
                ":host {\n  color: blue;\n}\n",
            );
        },
        "sets `color` on its host or a slot, and `hx-button` in app/site.css sets the same",
        "styled/src/button/root/button-root.css",
    );
}

/// The oracle is a hand-written miniature: a default theme and its pairings.
#[test]
fn pairings() {
    let sheet = |ground: &str| {
        format!(
            ":host {{
  color: var(--helix-color-foreground);
  background-color: var(--helix-{ground});
}}
"
        )
    };
    plant(
        "pairings",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["src"], "oracle": "oracle.json" }"#,
            ),
            (
                "oracle.json",
                r#"{ "themes": [ { "label": "default", "pairings": [
  { "foreground": "color-foreground", "background": "color-surface" } ] } ] }"#,
            ),
            ("src/card/card.css", &sheet("color-surface")),
        ],
        |tree| {
            tree.write("src/card/card.css", &sheet("color-raised"));
        },
        "paints `color-foreground on color-raised` and the engine does not measure it",
        "src/card/card.css",
    );
}

#[test]
fn parts() {
    let card = |documented: &str| {
        format!(
            "/**
 * @csspart {documented} - The caption.
 */
export class Card extends HTMLElement {{
  render() {{
    return `<span part=\"label\"></span>`;
  }}
}}
"
        )
    };
    plant(
        "parts",
        &[("helix.json", TIERS), ("src/card/card.ts", &card("label"))],
        |tree| {
            tree.write("src/card/card.ts", &card("caption"));
        },
        "Card documents `@csspart caption` and nothing in its render chain writes it",
        "src/card/card.ts",
    );
}

/// A state published as a second part name is read from the interpolation
/// that writes it, `part="page${on ? ' page-current' : ''}"`, so documenting it
/// is clean and a documented state nothing writes is still a finding.
#[test]
fn parts_through_a_state() {
    let pager = |state: &str| {
        format!(
            "/**
 * @csspart page - One page.
 * @csspart page-{state} - The page you are on.
 */
export class Pager extends HTMLElement {{
  render() {{
    return html`<b part=\"page${{on ? ' page-current' : ''}}\"></b>`;
  }}
}}
"
        )
    };
    let tree = Tree::new("parts-through-a-state");
    tree.write("helix.json", TIERS)
        .write("src/pager/pager.ts", &pager("current"));
    assert_clean("parts", &judge(&tree, "parts", "parts"));
    tree.write("src/pager/pager.ts", &pager("chosen"));
    assert_found(
        "parts",
        &judge(&tree, "parts", "parts"),
        "Pager documents `@csspart page-chosen` and nothing in its render chain writes it",
        "src/pager/pager.ts",
    );
}

/// The one rule reading outside the tiers, and still in-tree: the DOM library
/// is any `node_modules/@typescript/*/lib/lib.dom.d.ts`, so a fake one is
/// written. The interface pattern wants a newline before `interface`, which
/// is why the fake opens with a blank line. `file` is the tag.
#[test]
fn platform_fidelity() {
    let manifest = |members: &str| {
        format!(
            r#"{{ "modules": [ {{ "path": "src/thing/thing.ts", "declarations": [
  {{ "name": "Thing", "tagName": "hx-thing"{members} }} ] }} ] }}"#
        )
    };
    plant(
        "platform-fidelity",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["styled/src"],
  "platform": "platform.json",
  "layers": [{ "prefix": "hx-", "source": "styled/src" }]
}"#,
            ),
            (
                "platform.json",
                r#"{
  "excused": {},
  "excusedEvents": {},
  "expectedEvents": {},
  "native": { "hx-thing": { "interface": "HTMLThingElement" } },
  "propertyGroups": {},
  "tags": {}
}"#,
            ),
            (
                "node_modules/@typescript/fake/lib/lib.dom.d.ts",
                "\ninterface HTMLThingElement extends HTMLElement {\n    value: string;\n}\n",
            ),
            (
                "styled/custom-elements.json",
                &manifest(r#", "members": [{ "kind": "field", "name": "value" }]"#),
            ),
            (
                "styled/src/thing/thing.ts",
                "export class Thing extends HTMLElement {}\n",
            ),
        ],
        |tree| {
            tree.write("styled/custom-elements.json", &manifest(""));
        },
        "`<thing>` has `value` and this does not",
        "hx-thing",
    );
}

/// `file` for a family with no print rule is the bare family name.
#[test]
fn print() {
    plant(
        "print",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.css",
                ":host {\n  color: red;\n}\n\n@media print {\n  :host {\n    print-color-adjust: economy;\n  }\n}\n",
            ),
        ],
        |tree| {
            tree.write("src/card/card.css", ":host {\n  color: red;\n}\n");
        },
        "has a stylesheet and no `@media print` rule",
        "card",
    );
}

/// Two properties at least, or the file is skipped.
#[test]
fn properties() {
    plant(
        "properties",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.ts",
                r"export class Card extends HTMLElement {
  /** The emphasis. */
  @property()
  emphasis?: string

  /** The tone. */
  @property()
  tone?: string
}
",
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.ts",
                r"export class Card extends HTMLElement {
  /** The tone. */
  @property()
  tone?: string

  /** The emphasis. */
  @property()
  emphasis?: string
}
",
            );
        },
        "declares its properties out of alphabetical order",
        "src/card/card.ts",
    );
}

#[test]
fn reachable() {
    let card = |options: &str| {
        format!(
            "export class Card extends HTMLElement {{
  @property({options})
  tone?: string
}}
"
        )
    };
    plant(
        "reachable",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.css",
                ":host([tone=\"danger\"]) {\n  color: red;\n}\n",
            ),
            ("src/card/card.ts", &card("{ reflect: true }")),
        ],
        |tree| {
            tree.write("src/card/card.ts", &card(""));
        },
        "card: `tone` is selected on by CSS, and `tone` does not reflect",
        "src/card/card.ts",
    );
}

/// Exactly two files: the last `layer` sheet and, hardcoded under the last
/// `layers` source, `button/root/button-root.css`.
#[test]
fn recipes() {
    let element = |color: &str| {
        format!(":host([emphasis=\"solid\"]) [part=\"button\"] {{\n  color: {color};\n}}\n")
    };
    plant(
        "recipes",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["styled/src"],
  "layer": ["styles/base.css"],
  "layers": [{ "prefix": "hx-", "source": "styled/src" }]
}"#,
            ),
            (
                "styles/base.css",
                "[data-button=\"solid\"] {\n  color: white;\n}\n",
            ),
            ("styled/src/button/root/button-root.css", &element("white")),
        ],
        |tree| {
            tree.write("styled/src/button/root/button-root.css", &element("black"));
        },
        "the `emphasis` cell for `solid` disagrees with the element",
        "styles/base.css",
    );
}

#[test]
fn redeclared() {
    const SHEET: &str = ":host {\n  color: red;\n}\n\n[part=\"body\"] {\n  padding: 0;\n}\n";
    plant(
        "redeclared",
        &[("helix.json", TIERS), ("src/card/card.css", SHEET)],
        |tree| {
            tree.write(
                "src/card/card.css",
                &format!("{SHEET}\n:host {{\n  color: blue;\n}}\n"),
            );
        },
        "`:host` is written more than once and a later block redeclares `color`",
        "src/card/card.css",
    );
}

/// This pattern takes no `?` before the type, where `reflected-defaults` does.
#[test]
fn reflected() {
    let card = |member: &str| {
        format!(
            "export class Card extends HTMLElement {{
  @property({{ reflect: true }})
  {member}
}}
"
        )
    };
    plant(
        "reflected",
        &[
            ("helix.json", TIERS),
            ("src/card/card.ts", &card("tone: string")),
        ],
        |tree| {
            tree.write("src/card/card.ts", &card("tone: string = 'solid'"));
        },
        "`tone` reflects and defaults to 'solid'",
        "src/card/card.ts:3",
    );
}

#[test]
fn reflected_defaults() {
    let card = |member: &str| {
        format!(
            "export class Card extends HTMLElement {{
  @property({{ reflect: true }})
  {member}
}}
"
        )
    };
    plant(
        "reflected-defaults",
        &[
            ("helix.json", TIERS),
            ("src/card/card.ts", &card("tone?: string")),
        ],
        |tree| {
            tree.write("src/card/card.ts", &card("tone?: string = 'solid'"));
        },
        "`tone` reflects and defaults to `'solid'`",
        "src/card/card.ts:2",
    );
}

/// The owner is the grandparent directory, and the composed name has to be
/// declared by another file's `@customElement`.
#[test]
fn seams() {
    plant(
        "seams",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["headless/src"], "layers": [{ "prefix": "hx-", "source": "headless/src" }] }"#,
            ),
            (
                "headless/src/item/root/item-root.ts",
                "@customElement('hx-item')\nexport class Item extends HTMLElement {}\n",
            ),
            (
                "headless/src/menu/root/menu-root.ts",
                r"@customElement('hx-menu')
export class Menu extends HTMLElement {
  render() {
    return this.renderItem();
  }
  protected renderItem() {
    return html`<${this.tag('item')}></${this.tag('item')}>`;
  }
}
",
            ),
        ],
        |tree| {
            tree.write(
                "headless/src/menu/root/menu-root.ts",
                r"@customElement('hx-menu')
export class Menu extends HTMLElement {
  render() {
    return html`<${this.tag('item')}></${this.tag('item')}>`;
  }
}
",
            );
        },
        "renders `item` inline",
        "headless/src/menu/root/menu-root.ts",
    );
}

/// The oracle carries a default theme's pairings, seeds and emitted CSS.
#[test]
fn seeds() {
    const TOKENS: &str = ":root {\n  --helix-seed-hue: 250;\n  --helix-color-foreground: #000;\n  --helix-color-background: #fff;\n}\n";
    plant(
        "seeds",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["src"],
  "oracle": "oracle.json",
  "seeds": { "pinned": [], "planned": {}, "sheets": ["styles/tokens.css"] }
}"#,
            ),
            (
                "oracle.json",
                r#"{ "themes": [ {
  "label": "default",
  "pairings": [ { "foreground": "color-foreground", "background": "color-background" } ],
  "seeds": { "seed-hue": 250 },
  "css": ":root {\n  --helix-seed-hue: 250;\n  --helix-color-foreground: #000;\n  --helix-color-background: #fff;\n}"
} ] }"#,
            ),
            ("styles/tokens.css", TOKENS),
            (
                "src/card/card.ts",
                "export class Card extends HTMLElement {}\n",
            ),
        ],
        |tree| {
            tree.write(
                "styles/tokens.css",
                &TOKENS.replace(
                    "--helix-seed-hue: 250;",
                    "--helix-seed-hue: 250;\n  --helix-seed-tint: 0;",
                ),
            );
        },
        "the stylesheet reads the seed `tint` and the engine never emits it",
        "styles/tokens.css",
    );
}

/// A sheet is owned by the module at the same path with `.ts` for `.css`.
#[test]
fn selectors() {
    plant(
        "selectors",
        &[
            ("helix.json", TIERS),
            (
                "src/button/button.ts",
                "export class Button extends HTMLElement {\n  render() {\n    return `<span part=\"label\"></span>`;\n  }\n}\n",
            ),
            ("src/button/button.css", "[part=\"label\"] {\n  color: red;\n}\n"),
        ],
        |tree| {
            tree.write("src/button/button.css", "[part=\"caption\"] {\n  color: red;\n}\n");
        },
        "`[part=\"caption\"]` matches nothing",
        "src/button/button.css",
    );
}

#[test]
fn separation() {
    let sheet = |lift: &str| {
        format!(
            ":host {{
  border: var(--menu-border-width, var(--helix-border-floating));
  box-shadow: {lift};
}}
"
        )
    };
    plant(
        "separation",
        &[
            ("helix.json", TIERS),
            (
                "src/menu/menu.css",
                &sheet("var(--menu-shadow, var(--helix-shadow-floating))"),
            ),
        ],
        |tree| {
            tree.write("src/menu/menu.css", &sheet("0 1px 2px rgb(0 0 0 / 20%)"));
        },
        "`:host` is a floating surface and a lift is hardcoded",
        "src/menu/menu.css",
    );
}

/// The import names the generated module, `.css.js`, and `file` is relative
/// to the tier.
#[test]
fn shared() {
    plant(
        "shared",
        &[
            ("helix.json", TIERS),
            ("src/shared/panel.css", ":host {\n  padding: 0;\n}\n"),
            (
                "src/alpha/alpha.ts",
                "import '../shared/panel.css.js';\nexport class Alpha extends HTMLElement {}\n",
            ),
            (
                "src/beta/beta.ts",
                "import '../shared/panel.css.js';\nexport class Beta extends HTMLElement {}\n",
            ),
        ],
        |tree| {
            tree.write(
                "src/beta/beta.ts",
                "export class Beta extends HTMLElement {}\n",
            );
        },
        "is composed by `alpha` alone",
        "shared/panel.css",
    );
}

/// The manifest's `path` carries the family at its second segment, and the
/// finding's `file` is a glob over the tiers rather than a path.
#[test]
fn slots() {
    let manifest = |slot: &str| {
        format!(
            r#"{{ "modules": [ {{ "path": "src/card/card.ts", "declarations": [
  {{ "name": "Card", "slots": [ {{ "name": "{slot}" }} ] }} ] }} ] }}"#
        )
    };
    plant(
        "slots",
        &[
            ("helix.json", r#"{ "tiers": ["pkg/src"] }"#),
            ("pkg/custom-elements.json", &manifest("header")),
            (
                "pkg/src/card/card.ts",
                "export class Card extends HTMLElement {\n  render() {\n    return `<slot name=\"header\"></slot>`;\n  }\n}\n",
            ),
        ],
        |tree| {
            tree.write("pkg/custom-elements.json", &manifest("footer"));
        },
        "`Card` documents `@slot footer` and nothing in `card` renders it",
        "helix/*/src/card",
    );
}

/// The subject has to be bound above the assertion, and bound to an `ssr(`.
#[test]
fn ssr() {
    let spec = |render: &str| {
        format!(
            "test('renders', async () => {{
  const markup = {render};
  expect(markup).toContain('part=\"body\"');
}});
"
        )
    };
    plant(
        "ssr",
        &[
            ("helix.json", TIERS),
            (
                "src/card/card.ssr.spec.ts",
                &spec("withoutStyles(await ssr('<hx-card></hx-card>'))"),
            ),
        ],
        |tree| {
            tree.write(
                "src/card/card.ssr.spec.ts",
                &spec("await ssr('<hx-card></hx-card>')"),
            );
        },
        "`markup` is the whole server document",
        "src/card/card.ssr.spec.ts:3",
    );
}

/// A mixin records for whatever applies it and documents for nothing, so the
/// element applying it lists the state: the fault is the element's list going
/// missing while the mixin still records.
#[test]
fn states() {
    let dialog = |documented: &str| {
        format!(
            "/**
 * @summary A dialog.
 *{documented}
 */
export class Dialog extends MixinOpen(HTMLElement) {{}}
"
        )
    };
    plant(
        "states",
        &[
            ("helix.json", TIERS),
            (
                "src/mixin-open/mixin-open.ts",
                "export const MixinOpen = (Base) => class extends Base {
  willUpdate() {
    this.toggleState('open', this.open);
  }
};
",
            ),
            (
                "src/dialog/dialog.ts",
                &dialog(" @cssstate open - While it is open."),
            ),
        ],
        |tree| {
            tree.write("src/dialog/dialog.ts", &dialog(""));
        },
        "Dialog records `:state(open)` and no `@cssstate` lists it",
        "src/dialog/dialog.ts",
    );
}

/// Two layers even though the base is empty; `index.ts` makes a family and
/// `@status stable` has to sit in a non-spec module.
#[test]
fn stable() {
    plant(
        "stable",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["styled/src"],
  "layers": [
    { "prefix": "hx-headless-", "source": "headless/src" },
    { "prefix": "hx-", "source": "styled/src" }
  ]
}"#,
            ),
            ("headless/src/.keep", ""),
            (
                "styled/src/card/index.ts",
                "/** @status stable */\nexport * from './root/card-root.js';\n",
            ),
            (
                "styled/src/card/root/card-root.ts",
                "export class Card extends HTMLElement {}\n",
            ),
            (
                "styled/src/card/root/card.dom.spec.ts",
                "test('mounts', () => {});\n",
            ),
            (
                "styled/src/card/root/card.ssr.spec.ts",
                "test('renders', () => {});\n",
            ),
            (
                "styled/src/card/.examples/basic.html",
                "<hx-card></hx-card>\n",
            ),
        ],
        |tree| {
            tree.remove("styled/src/card/root/card.ssr.spec.ts");
        },
        "stable with no `*.ssr.spec.ts` in either layer",
        "card/root",
    );
}

/// The twin is the identical relative path on the layer above.
#[test]
fn tier() {
    plant(
        "tier",
        &[
            (
                "helix.json",
                r#"{
  "tiers": ["headless/src", "styled/src"],
  "layers": [
    { "prefix": "hx-headless-", "source": "headless/src" },
    { "prefix": "hx-", "source": "styled/src" }
  ]
}"#,
            ),
            (
                "headless/src/tooltip/root/tooltip-root.ts",
                r"export class Tooltip extends HTMLElement {
  render() {
    return html`<${this.tag('arrow')}></${this.tag('arrow')}>`;
  }
}
",
            ),
            (
                "styled/src/tooltip/root/tooltip-root.ts",
                "export class Tooltip extends HeadlessTooltip {\n  static override tier = 'hx-';\n}\n",
            ),
        ],
        |tree| {
            tree.write(
                "styled/src/tooltip/root/tooltip-root.ts",
                "export class Tooltip extends HeadlessTooltip {}\n",
            );
        },
        "inherits a `this.tag()` call and does not override `tier`",
        "styled/src/tooltip/root/tooltip-root.ts",
    );
}

#[test]
fn token_defaults() {
    plant(
        "token-defaults",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["src"], "layer": ["styles/tokens.css"] }"#,
            ),
            ("styles/tokens.css", ":root {\n  --helix-space-2: 8px;\n}\n"),
            ("src/card/card.css", ":host {\n  padding: var(--helix-space-2);\n}\n"),
        ],
        |tree| {
            tree.write(
                "styles/tokens.css",
                "[data-density=\"compact\"] {\n  --helix-space-2: 8px;\n}\n",
            );
        },
        "`--helix-space-2` has no definition that applies with no attribute, no theme stamp and no media query",
        "src/card/card.css",
    );
}

/// The owning package is the grandparent of `layer[0]`, so the token sheet
/// sits two directories deep.
#[test]
fn tokens() {
    let sheet = |margin: &str| {
        format!(":host {{\n  margin: {margin};\n  padding: var(--helix-space-2);\n}}\n")
    };
    plant(
        "tokens",
        &[
            (
                "helix.json",
                r#"{ "tiers": ["pkg/src"], "layer": ["styles/src/tokens.css"] }"#,
            ),
            (
                "styles/src/tokens.css",
                ":root {\n  --helix-space-2: 8px;\n}\n",
            ),
            ("pkg/src/card/card.css", &sheet("0 auto")),
        ],
        |tree| {
            tree.write("pkg/src/card/card.css", &sheet("12px"));
        },
        "raw value where a `--helix-space-*` token belongs",
        "pkg/src/card/card.css:2",
    );
}

/// Only the six registered words move the count, so the clean render carries
/// one and the fault adds the refused word beside it.
#[test]
fn vocabulary() {
    let card = |extra: &str| {
        format!(
            "export class Card extends HTMLElement {{
  render() {{
    return `<div part=\"content\"><slot></slot></div>{extra}`;
  }}
}}
"
        )
    };
    plant(
        "vocabulary",
        &[("helix.json", TIERS), ("src/card/card.ts", &card(""))],
        |tree| {
            tree.write("src/card/card.ts", &card("<div part=\"wrapper\"></div>"));
        },
        "renders `part=\"wrapper\"`",
        "src/card/card.ts:3",
    );
}
