//! Every workspace, prose and spec rule, against the fault it exists to catch.
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
//! is the command line: the settings file, the workspaces, the manifests and
//! the JSON. A test that bypassed those would pass while the wiring between
//! them was broken.
//!
//! **Nothing here is installed or built.** A rule that reads `node_modules`
//! or `dist` reads a shape, and the shape is written by hand: three files
//! stand in for `react-dom`, two for a compiled package. The one input no
//! fixture controls is the `node` on the path, which the `node` rule asks,
//! so its fault is the one that does not depend on it.
//!
//! **This file is read by the rules it tests.** The prose rules walk every
//! `.rs` in the repository, so a British word planted for `dialect` carries
//! the `dialect:quoted` marker the rule honors, an em dash is written as its
//! escape, and the bold markup planted for `help` is assembled at run time
//! rather than written where the rule would read it.

use std::path::PathBuf;
use std::process::Command;

/// A scratch workspace, one per test, removed when it drops.
struct Tree(PathBuf);

impl Tree {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("fusion-rules-{name}"));
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

/// Runs the rules `only` names under `noun` and reads what `rule` reported.
///
/// Two names rather than one because of `floors`: the meta rule reads what
/// the source rules counted, so it is judged beside one and read on its own.
fn judge(tree: &Tree, noun: &str, only: &str, rule: &str) -> Verdict {
    let root = tree.0.to_str().expect("a temp path is text");
    let output = Command::new(env!("CARGO_BIN_EXE_fusion"))
        .args([noun, "check", "--json", "--only", only, "--root", root])
        .env("NO_COLOR", "1")
        .output()
        .expect("the binary runs");
    let code = output.status.code().expect("the process exited normally");
    assert!(
        code == 0 || code == 1,
        "`{noun} {only}` exited {code}: {}",
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
fn plant(
    noun: &str,
    rule: &str,
    clean: &[(&str, &str)],
    fault: impl FnOnce(&Tree),
    message: &str,
    file: &str,
) {
    plant_in(
        &format!("{noun}-{rule}"),
        noun,
        rule,
        clean,
        fault,
        message,
        file,
    );
}

/// The same, in a tree named for the test rather than for the rule, because a
/// rule proved more than once would otherwise have its tests write over each
/// other's fixtures under the parallel runner.
fn plant_in(
    named: &str,
    noun: &str,
    rule: &str,
    clean: &[(&str, &str)],
    fault: impl FnOnce(&Tree),
    message: &str,
    file: &str,
) {
    let tree = Tree::new(named);
    for (at, content) in clean {
        tree.write(at, content);
    }
    assert_clean(rule, &judge(&tree, noun, rule, rule));
    fault(&tree);
    assert_found(rule, &judge(&tree, noun, rule, rule), message, file);
}

/// The meta rule's test, which every noun carries.
///
/// `--only floors` alone measures nothing and passes vacuously, so it is
/// judged beside a source rule that counts, then beside one that counts zero
/// on the same tree. The fault is the sibling's count rather than a file,
/// because that is the only thing the rule reads.
fn floors(noun: &str, tree: &Tree, beside: &str, zero: &str, message: &str) {
    let clean = judge(tree, noun, &format!("floors,{beside}"), "floors");
    assert_clean("floors", &clean);
    let found = judge(tree, noun, &format!("floors,{zero}"), "floors");
    assert_found("floors", &found, message, &format!("rule: {zero}"));
}

/// Every key is optional and the file is not.
const EMPTY: &str = "{}";

/// A root that declares members under `packages/`.
const ROOT: &str = r#"{
  "name": "sandbox",
  "private": true,
  "workspaces": ["packages/*"]
}"#;

/// The root manifest as `order` writes it: pretty-printed, keys in order.
const ORDERED: &str =
    "{\n  \"name\": \"sandbox\",\n  \"version\": \"0.0.0\",\n  \"private\": true\n}\n";

/// A dependency is unshakeable only when it declares no `sideEffects: false`
/// and exports a subpath wildcard, so both are in the fixture.
#[test]
fn barrels() {
    let main = |specifier: &str| {
        format!("import {{ Button }} from '{specifier}';\n\nexport const start = () => Button;\n")
    };
    plant(
        "workspace",
        "barrels",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            (
                "packages/ui/package.json",
                r#"{
  "name": "@acme/ui",
  "version": "0.0.0",
  "exports": {
    ".": "./dist/index.js",
    "./*": "./dist/*/index.js"
  }
}"#,
            ),
            (
                "packages/app/package.json",
                r#"{
  "name": "@acme/app",
  "version": "0.0.0",
  "dependencies": { "@acme/ui": "workspace:*" }
}"#,
            ),
            ("packages/app/src/main.ts", &main("@acme/ui/button")),
        ],
        |tree| {
            tree.write("packages/app/src/main.ts", &main("@acme/ui"));
        },
        "barrel import of `@acme/ui`, which is side-effectful and cannot be shaken (in @acme/app)",
        "packages/app/src/main.ts:1",
    );
}

#[test]
fn workspace_floors() {
    let tree = Tree::new("workspace-floors");
    tree.write("package.json", ORDERED)
        .write("fusion.json", EMPTY);
    floors(
        "workspace",
        &tree,
        "order",
        "icons",
        "counted no icon names in markup",
    );
}

/// Only a `///` line inside a clap type is counted, and the fixture is read
/// as text rather than compiled.
#[test]
fn help() {
    let cli = |line: &str| {
        format!(
            "use clap::Parser;

#[derive(Debug, Parser)]
struct Cli {{
    /// {line}
    root: String,
}}

fn main() {{
    let _ = Cli::parse();
}}
"
        )
    };
    plant(
        "workspace",
        "help",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            ("cli/src/main.rs", &cli("The workspace to read.")),
        ],
        |tree| {
            let bold = "**";
            tree.write(
                "cli/src/main.rs",
                &cli(&format!("{bold}The workspace{bold} to read.")),
            );
        },
        "help text carries bold markup",
        "cli/src/main.rs:5",
    );
}

/// The list must not be named `icons.ts`, or the crawl reads it as markup.
#[test]
fn icons() {
    let page = |name: &str| format!("export const Page = () => <hx-icon name=\"{name}\" />;\n");
    plant(
        "workspace",
        "icons",
        &[
            ("package.json", ROOT),
            ("fusion.json", r#"{ "icons": "icons.txt" }"#),
            ("icons.txt", "# the set\ncheck\nclose\n"),
            ("packages/a/src/page.tsx", &page("check")),
        ],
        |tree| {
            tree.write("packages/a/src/page.tsx", &page("chekc"));
        },
        "`name=\"chekc\"` is not in the set",
        "packages/a/src/page.tsx:1",
    );
}

#[test]
fn modules() {
    const PLAIN: &str = ".page {\n  color: red;\n}\n";
    plant(
        "workspace",
        "modules",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            ("packages/ui/src/page.css", PLAIN),
            (
                "packages/ui/src/page.module.css",
                ".card {\n  color: blue;\n}\n",
            ),
        ],
        |tree| {
            tree.write(
                "packages/ui/src/page.css",
                &format!("{PLAIN}\n.card {{\n  display: none;\n}}\n"),
            );
        },
        "selects `.card`, which only `packages/ui/src/page.module.css` declares",
        "packages/ui/src/page.css",
    );
}

/// The floor is low on purpose, so the machine's Node clears it, and the
/// fault is the types disagreeing with the floor, which no machine decides.
#[test]
fn node() {
    let manifest = |types: &str| {
        format!(
            r#"{{
  "name": "sandbox",
  "private": true,
  "engines": {{ "node": ">=18.0" }},
  "devDependencies": {{ "@types/node": "{types}" }}
}}"#
        )
    };
    plant(
        "workspace",
        "node",
        &[
            ("fusion.json", EMPTY),
            ("package.json", &manifest("^18.19.0")),
        ],
        |tree| {
            tree.write("package.json", &manifest("^24.0.0"));
        },
        "`@types/node` is ^24.0.0 and `engines.node` floors at 18.0",
        "package.json",
    );
}

/// Judged by the order of the keys, so the clean manifest is any in that order
/// however it is laid out.
#[test]
fn order() {
    plant(
        "workspace",
        "order",
        &[("fusion.json", EMPTY), ("package.json", ORDERED)],
        |tree| {
            tree.write(
                "package.json",
                "{\n  \"version\": \"0.0.0\",\n  \"name\": \"sandbox\"\n}\n",
            );
        },
        "keys are out of order",
        "package.json",
    );
}

/// A condition the list does not know keeps its place, so `default` after it
/// is in order and `default` before it, which hides it, is not. And a manifest
/// in order is clean however its arrays are laid out.
#[test]
fn order_with_a_condition_it_does_not_know() {
    let manifest = |exports: &str| {
        format!(
            "{{\n  \"name\": \"sandbox\",\n  \"exports\": {{\n    \".\": {{\n      {exports}\n    }}\n  }},\n  \"files\": [\"dist\"]\n}}\n"
        )
    };
    plant_in(
        "workspace-order-conditions",
        "workspace",
        "order",
        &[
            ("fusion.json", EMPTY),
            (
                "package.json",
                &manifest("\"types\": \"./a.d.ts\", \"development\": \"./src/a.ts\", \"default\": \"./a.js\""),
            ),
        ],
        |tree| {
            tree.write(
                "package.json",
                &manifest("\"types\": \"./a.d.ts\", \"default\": \"./a.js\", \"development\": \"./src/a.ts\""),
            );
        },
        "keys are out of order",
        "package.json",
    );
}

#[test]
fn prerequisites() {
    let manifest = |typecheck: &str| {
        format!(
            r#"{{
  "name": "sandbox",
  "private": true,
  "scripts": {{
    "build": "bun run tokens && tsc -b",
    "tokens": "echo tokens",
    "typecheck": "{typecheck}"
  }}
}}"#
        )
    };
    plant(
        "workspace",
        "prerequisites",
        &[
            ("fusion.json", EMPTY),
            ("package.json", &manifest("bun run tokens && tsc --noEmit")),
        ],
        |tree| {
            tree.write("package.json", &manifest("tsc --noEmit"));
        },
        "build runs `bun run tokens` before compiling and typecheck does not",
        "package.json",
    );
}

/// The root is judged like any member, so it is in scope and private. The
/// Cargo half is the clean pair: `publish = false` and no release workflow.
#[test]
fn publishable() {
    let kit = |license: &str| {
        format!(
            r#"{{
  "name": "@acme/kit",
  "description": "A kit.",
  "version": "0.1.0",{license}
  "repository": {{
    "type": "git",
    "url": "https://example.com/acme.git",
    "directory": "packages/kit"
  }},
  "exports": {{
    ".": {{ "types": "./dist/index.d.ts", "default": "./dist/index.js" }}
  }},
  "files": ["dist"],
  "publishConfig": {{ "access": "public" }}
}}"#
        )
    };
    plant(
        "workspace",
        "publishable",
        &[
            (
                "package.json",
                r#"{
  "name": "@acme/root",
  "private": true,
  "workspaces": ["packages/*"]
}"#,
            ),
            (
                "fusion.json",
                r#"{ "scope": "@acme/", "domains": ["kit"] }"#,
            ),
            ("packages/kit/package.json", &kit("\n  \"license\": \"MIT\",")),
            (
                "Cargo.toml",
                "[workspace]\nmembers = [\"crates/thing\"]\n\n[workspace.package]\npublish = false\n",
            ),
            (
                "crates/thing/Cargo.toml",
                "[package]\nname = \"thing\"\nversion = \"0.1.0\"\nedition = \"2021\"\n",
            ),
        ],
        |tree| {
            tree.write("packages/kit/package.json", &kit(""));
        },
        "`@acme/kit` has no `license`, which a published package needs",
        "packages/kit",
    );
}

/// A climb is a finding only when it lands inside another member.
#[test]
fn reaching() {
    let a =
        |build: &str| format!(r#"{{ "name": "@acme/a", "scripts": {{ "build": "{build}" }} }}"#);
    plant(
        "workspace",
        "reaching",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            ("packages/a/package.json", &a("tsc -b")),
            ("packages/b/package.json", r#"{ "name": "@acme/b" }"#),
        ],
        |tree| {
            tree.write("packages/a/package.json", &a("node ../b/build.mjs"));
        },
        "`build` names `../b/build.mjs`, which is inside `packages/b`",
        "packages/a/package.json",
    );
}

/// The framework's files are read by path, so they are written by hand.
#[test]
fn react_bridge() {
    plant(
        "workspace",
        "react-bridge",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            (
                "packages/bridge/src/bridge.ts",
                "const REACT_PROPS = '__reactProps$'\n\nexport const prefix = REACT_PROPS\n",
            ),
            (
                "node_modules/react-dom/package.json",
                r#"{ "name": "react-dom", "version": "19.2.8" }"#,
            ),
            (
                "node_modules/react-dom/cjs/react-dom-client.development.js",
                "var key = '__reactProps$' + suffix;\n",
            ),
            (
                "node_modules/react-dom/cjs/react-dom-client.production.js",
                "var key = '__reactProps$' + suffix;\n",
            ),
            ("notes.md", "Measured against React 19.2.8.\n"),
        ],
        |tree| {
            tree.write(
                "node_modules/react-dom/cjs/react-dom-client.production.js",
                "var key = '__gone$' + suffix;\n",
            );
        },
        "`__reactProps$` is gone from react-dom 19.2.8",
        "node_modules/react-dom/cjs/react-dom-client.production.js",
    );
}

/// The hydrating root is a plain directory; the packages it imports are
/// members, because the lookup is by manifest name.
#[test]
fn registration() {
    let page = |package: &str, name: &str| {
        format!("import {{ {name} }} from '{package}'\n\nexport const Page = () => {name}\n")
    };
    plant(
        "workspace",
        "registration",
        &[
            ("package.json", ROOT),
            ("fusion.json", r#"{ "hydrates": ["app"] }"#),
            ("packages/util/package.json", r#"{ "name": "@acme/util" }"#),
            (
                "packages/util/src/index.ts",
                "export const helper = () => 1\n",
            ),
            (
                "packages/elements/package.json",
                r#"{ "name": "@acme/elements" }"#,
            ),
            (
                "packages/elements/src/index.ts",
                "@customElement('acme-thing')\nexport class Thing extends HTMLElement {}\n",
            ),
            ("app/page.tsx", &page("@acme/util", "helper")),
        ],
        |tree| {
            tree.write("app/page.tsx", &page("@acme/elements", "Thing"));
        },
        "imports `@acme/elements` at module scope",
        "app/page.tsx",
    );
}

/// A glob in a string is not a comment, so the element under it is still seen.
#[test]
fn registration_past_a_glob() {
    let page = |package: &str, name: &str| {
        format!("import {{ {name} }} from '{package}'\n\nexport const Page = () => {name}\n")
    };
    plant_in(
        "workspace-registration-glob",
        "workspace",
        "registration",
        &[
            ("package.json", ROOT),
            ("fusion.json", r#"{ "hydrates": ["app"] }"#),
            ("packages/util/package.json", r#"{ "name": "@acme/util" }"#),
            ("packages/util/src/index.ts", "export const helper = () => 1\n"),
            (
                "packages/elements/package.json",
                r#"{ "name": "@acme/elements" }"#,
            ),
            (
                "packages/elements/src/index.ts",
                "export const ICONS = 'icons/*.svg'\n\n@customElement('acme-thing')\nexport class Thing extends HTMLElement {}\n\n/** Done. */\nexport const done = true\n",
            ),
            ("app/page.tsx", &page("@acme/util", "helper")),
        ],
        |tree| {
            tree.write("app/page.tsx", &page("@acme/elements", "Thing"));
        },
        "imports `@acme/elements` at module scope",
        "app/page.tsx",
    );
}

/// Scoping never crosses the first two path segments, so the module and the
/// markup share `packages/ui`.
#[test]
fn scoped() {
    let panel = |class: &str| {
        format!("import styles from './panel.module.css'\n\nexport const Panel = () => <div className={class} />\n")
    };
    plant(
        "workspace",
        "scoped",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            (
                "packages/ui/src/panel.module.css",
                ".card {\n  color: blue;\n}\n",
            ),
            ("packages/ui/src/Panel.tsx", &panel("{styles.card}")),
        ],
        |tree| {
            tree.write("packages/ui/src/Panel.tsx", &panel("\"card\""));
        },
        "`card` is scoped by a module, so this string matches nothing",
        "packages/ui/src/Panel.tsx:3",
    );
}

#[test]
fn scripts() {
    let manifest = |build: &str| {
        format!(
            r#"{{
  "name": "sandbox",
  "private": true,
  "scripts": {{
    "build": "{build}",
    "tokens": "echo tokens"
  }}
}}"#
        )
    };
    plant(
        "workspace",
        "scripts",
        &[
            ("fusion.json", EMPTY),
            ("package.json", &manifest("bun run tokens")),
        ],
        |tree| {
            tree.write("package.json", &manifest("bun run token"));
        },
        "`build` runs `bun run token`, and sandbox declares no such script",
        "package.json",
    );
}

/// The literal runs from the opener to the next backtick, whatever the
/// author meant, and the braces in it are counted.
#[test]
fn shaders() {
    let shader = |close: &str| {
        format!(
            "export const fragment = `#version 300 es
precision highp float;
out vec4 color;
void main() {{
  color = vec4(1.0, 0.0, 0.0, 1.0);
{close}`
"
        )
    };
    plant(
        "workspace",
        "shaders",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            ("packages/gfx/src/shader.ts", &shader("}")),
        ],
        |tree| {
            tree.write("packages/gfx/src/shader.ts", &shader(""));
        },
        "shader literal has 1 `{` against 0 `}`",
        "packages/gfx/src/shader.ts:1",
    );
}

/// Name mapping only, from `dist` back to `src`: nothing is built.
#[test]
fn shipped() {
    plant(
        "workspace",
        "shipped",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            (
                "packages/lib/package.json",
                r#"{ "name": "@acme/lib", "scripts": { "build": "tsc -b" } }"#,
            ),
            ("packages/lib/src/index.ts", "export const one = 1\n"),
            ("packages/lib/dist/index.js", "export const one = 1;\n"),
            (
                "packages/lib/dist/index.d.ts",
                "export declare const one: number;\n",
            ),
        ],
        |tree| {
            tree.write("packages/lib/dist/gone.js", "export const gone = 1;\n");
        },
        "no source at packages/lib/src/gone.ts",
        "packages/lib/dist/gone.js",
    );
}

/// A root-level `.js` is not a finding; the fault sits inside a member.
#[test]
fn strays() {
    plant(
        "workspace",
        "strays",
        &[
            ("package.json", ROOT),
            ("fusion.json", EMPTY),
            ("packages/a/package.json", r#"{ "name": "@acme/a" }"#),
            ("packages/a/src/index.ts", "export const one = 1\n"),
        ],
        |tree| {
            tree.write("packages/a/src/probe.js", "export const probe = 1;\n");
        },
        "a `.js` file sits in `packages/a`",
        "packages/a/src/probe.js",
    );
}

/// A family is a manifest module declaring a tag, keyed by the segment after
/// `src/`; a drawing is a `.tsx` under `art/` named for it.
#[test]
fn art() {
    plant(
        "prose",
        "art",
        &[
            (
                "fusion.json",
                r#"{ "gallery": { "art": "gallery/src", "families": "styled/src", "manifests": ["styled/custom-elements.json"] } }"#,
            ),
            (
                "styled/custom-elements.json",
                r#"{ "modules": [ { "path": "src/button/button.ts", "declarations": [ { "tagName": "hx-button" } ] } ] }"#,
            ),
            ("styled/src/button/index.ts", "export {};\n"),
            (
                "gallery/src/art/button.tsx",
                "export const Button = () => <svg />;\n",
            ),
        ],
        |tree| {
            tree.write(
                "gallery/src/art/badge.tsx",
                "export const Badge = () => <svg />;\n",
            );
        },
        "`badge` has card art and is not a family",
        "gallery/src",
    );
}

/// The settings file is out of the corpus, so the note is what is counted.
#[test]
fn dashes() {
    plant(
        "prose",
        "dashes",
        &[("fusion.json", EMPTY), ("notes.md", "A note.\n")],
        |tree| {
            tree.write("notes.md", "A note \u{2014} with a dash.\n");
        },
        "an em dash, which this repository does not write",
        "notes.md:1",
    );
}

/// The pair is the fixture's own, and the lines that spell it carry the marker
/// because this repository's copy of the rule reads this file.
#[test]
fn dialect() {
    plant(
        "prose",
        "dialect",
        &[
            ("fusion.json", r#"{ "dialect": { "colour": "color" } }"#), // dialect:quoted
            ("notes.md", "The color is red.\n"),
        ],
        |tree| {
            tree.write("notes.md", "The colour is red.\n"); // dialect:quoted
        },
        "`colour` is British. Write `color`.", // dialect:quoted
        "notes.md:1",
    );
}

/// An address is left alone, and a stem that drops its `e` manufactures no
/// past tense the American way could not spell.
#[test]
fn dialect_spares_addresses() {
    plant_in(
        "prose-dialect-addresses",
        "prose",
        "dialect",
        &[
            (
                "fusion.json",
                r#"{ "dialect": { "catalogue": "catalog", "colour": "color" } }"#, // dialect:quoted
            ),
            (
                "notes.md",
                "See https://x.dev/colour-theme and ![a](img/colour.png), all catalogued.\n", // dialect:quoted
            ),
        ],
        |tree| {
            tree.write("notes.md", "The colour is red.\n"); // dialect:quoted
        },
        "`colour` is British. Write `color`.", // dialect:quoted
        "notes.md:1",
    );
}

/// The pages are `<domain>/docs/content/*.mdx`, and the tag pattern is fixed
/// to the `helix-` prefix.
#[test]
fn documented() {
    plant(
        "prose",
        "documented",
        &[
            ("fusion.json", r#"{ "scope": "@acme/" }"#),
            ("ui/package.json", r#"{ "name": "@acme/ui" }"#),
            (
                "ui/custom-elements.json",
                r#"{ "modules": [ { "declarations": [ { "tagName": "helix-button" } ] } ] }"#,
            ),
            ("ui/docs/content/button.mdx", "Use <helix-button> here.\n"),
        ],
        |tree| {
            tree.write("ui/docs/content/button.mdx", "Use <helix-buton> here.\n");
        },
        "`helix-buton` is not a tag any manifest declares",
        "ui/docs/content/button.mdx",
    );
}

/// Two faults, because the rule answers two questions: a host the site does
/// not publish, and a path it does not serve. The fixture declares its own
/// address, so nothing here is a link into the site this repository publishes.
#[test]
fn links() {
    let tag = |url: &str| format!("/**\n * @documentation {url}\n */\nexport class Thing {{}}\n");
    let written = tag("https://sandbox.test/docs/one");
    let clean = [
        (
            "fusion.json",
            r#"{ "site": { "address": "site/site.ts", "app": "site/app", "routes": "site/public" } }"#,
        ),
        (
            "site/site.ts",
            "export const SITE = 'https://sandbox.test'\n",
        ),
        ("site/public/index.md", "---\ntitle: Home\n---\n"),
        ("site/public/docs/one.md", "---\ntitle: One\n---\n"),
        (
            "site/app/llms.txt/route.ts",
            "export const GET = () => {}\n",
        ),
        ("src/thing.ts", &written),
    ];

    plant(
        "prose",
        "links",
        &clean,
        |tree| {
            tree.write("src/thing.ts", &tag("https://docs.sandbox.test/docs/one"));
        },
        "`docs.sandbox.test` is not a host this site publishes",
        "src/thing.ts:2",
    );
    plant(
        "prose",
        "links",
        &clean,
        |tree| {
            tree.write("src/thing.ts", &tag("https://sandbox.test/docs/two"));
        },
        "`/docs/two` is not an address this site serves",
        "src/thing.ts:2",
    );
}

/// The file's own block is held by position, so the fault is the block after
/// it that sits on a third.
#[test]
fn orphans() {
    plant(
        "prose",
        "orphans",
        &[
            ("fusion.json", EMPTY),
            ("src/card.ts", "/** The card. */\nexport class Card {}\n"),
        ],
        |tree| {
            tree.write(
                "src/card.ts",
                "/** The file. */\n\n/** Stranded. */\n/** The card. */\nexport class Card {}\n",
            );
        },
        "a doc block sits directly on another one",
        "src/card.ts:3",
    );
}

/// A path is checked only when rooted at a top-level directory and carrying
/// a known extension.
#[test]
fn references() {
    let module = |path: &str| format!("// See `{path}`.\nexport const one = 1;\n");
    plant(
        "prose",
        "references",
        &[
            ("fusion.json", EMPTY),
            ("src/index.ts", &module("src/index.ts")),
        ],
        |tree| {
            tree.write("src/index.ts", &module("src/gone.ts"));
        },
        "names `src/gone.ts`, which is not there",
        "src/index.ts",
    );
}

#[test]
fn repository() {
    plant(
        "prose",
        "repository",
        &[
            ("fusion.json", EMPTY),
            (
                "package.json",
                r#"{
  "name": "sandbox",
  "private": true,
  "repository": { "type": "git", "url": "https://github.com/acme/sandbox.git" }
}"#,
            ),
        ],
        |tree| {
            tree.write(
                "packages/kit/package.json",
                r#"{ "name": "@acme/kit", "repository": { "type": "git", "url": "https://github.com/acme/other.git" } }"#,
            );
        },
        "`repository.url` is `https://github.com/acme/other.git`, and the root says `acme/sandbox`",
        "packages/kit/package.json",
    );
}

/// Only a block carrying `@summary` is judged, and the clean one is exactly
/// what the sort would write back.
#[test]
fn tag_order() {
    let card = |first: &str, second: &str| {
        format!(
            "/**
 * @summary A card.
 *
 * @slot {first} - The {first}.
 * @slot {second} - The {second}.
 */
export class Card {{}}
"
        )
    };
    plant(
        "prose",
        "tag-order",
        &[
            ("fusion.json", EMPTY),
            ("src/card.ts", &card("body", "header")),
        ],
        |tree| {
            tree.write("src/card.ts", &card("header", "body"));
        },
        "`@slot body` comes after `header`, and sorts before it",
        "src/card.ts:1",
    );
}

/// A doc block closing at the end of a line of text is not the class block,
/// and nothing between it and the class block is carried into the sort.
#[test]
fn tag_order_after_a_block_closed_mid_line() {
    let card = |first: &str, second: &str| {
        format!(
            "/**
 * @param x - The x. */
export function f(x: number) {{}}

/**
 * @summary A card.
 *
 * @slot {first} - The {first}.
 * @slot {second} - The {second}.
 */
export class Card {{}}
"
        )
    };
    plant_in(
        "prose-tag-order-closed",
        "prose",
        "tag-order",
        &[
            ("fusion.json", EMPTY),
            ("src/card.ts", &card("body", "header")),
        ],
        |tree| {
            tree.write("src/card.ts", &card("header", "body"));
        },
        "`@slot body` comes after `header`, and sorts before it",
        "src/card.ts:5",
    );
}

/// A fenced sample in the description holds no tags, whatever it starts with.
#[test]
fn tag_order_with_a_fence() {
    let card = |first: &str, second: &str| {
        format!(
            "/**
 * @summary A card.
 *
 * @description
 * Narrow it:
 *
 * ```css
 * @media (width > 40rem) {{
 * }}
 * ```
 *
 * @since 1.0.0
 *
 * @slot {first} - The {first}.
 * @slot {second} - The {second}.
 */
export class Card {{}}
"
        )
    };
    plant_in(
        "prose-tag-order-fence",
        "prose",
        "tag-order",
        &[
            ("fusion.json", EMPTY),
            ("src/card.ts", &card("body", "header")),
        ],
        |tree| {
            tree.write("src/card.ts", &card("header", "body"));
        },
        "`@slot body` comes after `header`, and sorts before it",
        "src/card.ts:1",
    );
}

#[test]
fn prose_floors() {
    let tree = Tree::new("prose-floors");
    tree.write("fusion.json", EMPTY)
        .write("notes.md", "A note.\n");
    floors(
        "prose",
        &tree,
        "dashes",
        "art",
        "counted no families in the catalog",
    );
}

/// A spec is found under a package's `src`, and the package's own name is
/// the import it may not make.
#[test]
fn hazards() {
    let spec = |import: &str| format!("{import}\ntest('works', () => {{}});\n");
    plant(
        "spec",
        "hazards",
        &[
            ("fusion.json", EMPTY),
            ("packages/ui/package.json", r#"{ "name": "@acme/ui" }"#),
            (
                "packages/ui/src/button.spec.ts",
                &spec("import './button.js';"),
            ),
        ],
        |tree| {
            tree.write(
                "packages/ui/src/button.spec.ts",
                &spec("import { Button } from '@acme/ui';"),
            );
        },
        "imports `@acme/ui`, its own package, which resolves to `dist`",
        "packages/ui/src/button.spec.ts:1",
    );
}

/// A spec importing its own package for its side effect alone is the same fault.
#[test]
fn hazards_for_a_side_effect() {
    let spec = |import: &str| format!("{import}\ntest('works', () => {{}});\n");
    plant_in(
        "spec-hazards-side-effect",
        "spec",
        "hazards",
        &[
            ("fusion.json", EMPTY),
            ("packages/ui/package.json", r#"{ "name": "@acme/ui" }"#),
            (
                "packages/ui/src/button.spec.ts",
                &spec("import './button.js';"),
            ),
        ],
        |tree| {
            tree.write(
                "packages/ui/src/button.spec.ts",
                &spec("import '@acme/ui';"),
            );
        },
        "imports `@acme/ui`, its own package, which resolves to `dist`",
        "packages/ui/src/button.spec.ts:1",
    );
}

/// A static import of the library is found however many lines a formatter
/// gave its names, and an import above it is not read into it.
#[test]
fn isolated_across_lines() {
    let registrar = |head: &str| {
        format!(
            "{head}import {{ useEffect }} from 'react'

export function HelixElements() {{
  if (window.location.pathname === '/specs') {{
    return null;
  }}
  import('@acme/helix');
  return null;
}}
"
        )
    };
    plant_in(
        "spec-isolated-lines",
        "spec",
        "isolated",
        &[
            (
                "fusion.json",
                r#"{ "scope": "@acme/", "spec": { "app": "site/app", "registrar": "site/registrar.tsx" } }"#,
            ),
            (
                "site/app/layout.tsx",
                "export default function Layout() {\n  return <HelixElements />;\n}\n",
            ),
            (
                "site/app/(tools)/specs/spec-frame.tsx",
                "export function SpecFrame() {\n  return <iframe />;\n}\n",
            ),
            ("site/registrar.tsx", &registrar("")),
        ],
        |tree| {
            tree.write(
                "site/registrar.tsx",
                &registrar("import {\n  defineAll,\n} from '@acme/helix'\n"),
            );
        },
        "the registrar imports the library at module scope",
        "site/registrar.tsx",
    );
}

/// The route is derived from where the frame sits, with the route group
/// stripped, and compared to the literal the registrar guards on.
#[test]
fn isolated() {
    let registrar = |route: &str| {
        format!(
            "export function HelixElements() {{
  if (window.location.pathname === '{route}') {{
    return null;
  }}
  import('@acme/helix');
  return null;
}}
"
        )
    };
    plant(
        "spec",
        "isolated",
        &[
            (
                "fusion.json",
                r#"{ "scope": "@acme/", "spec": { "app": "site/app", "registrar": "site/registrar.tsx" } }"#,
            ),
            (
                "site/app/layout.tsx",
                "export default function Layout() {\n  return <HelixElements />;\n}\n",
            ),
            (
                "site/app/(tools)/specs/spec-frame.tsx",
                "export function SpecFrame() {\n  return <iframe />;\n}\n",
            ),
            ("site/registrar.tsx", &registrar("/specs")),
        ],
        |tree| {
            tree.write("site/registrar.tsx", &registrar("/spec"));
        },
        "`/specs` inherits the registrar and nothing keeps the library out of it",
        "site/registrar.tsx",
    );
}

/// The matcher names are read off the harness's interface, one per line at
/// two spaces of indent.
#[test]
fn matchers() {
    let spec = |matcher: &str| format!("test('works', () => {{\n  expect(1).{matcher}(1);\n}});\n");
    plant(
        "spec",
        "matchers",
        &[
            (
                "fusion.json",
                r#"{ "spec": { "harness": "testing/src/harness.ts" } }"#,
            ),
            (
                "testing/src/harness.ts",
                "export interface Matchers {\n  toBe: (expected: unknown) => void;\n}\n",
            ),
            ("packages/ui/src/button.dom.spec.ts", &spec("toBe")),
        ],
        |tree| {
            tree.write("packages/ui/src/button.dom.spec.ts", &spec("toEqual"));
        },
        "calls `toEqual`, which the browser harness does not implement",
        "packages/ui/src/button.dom.spec.ts:2",
    );
}

/// A test script running `bun test src` reaches everything and is exempt, so
/// the fixture's runner is named some other way.
#[test]
fn runners() {
    plant(
        "spec",
        "runners",
        &[
            (
                "fusion.json",
                r#"{ "spec": { "runners": { ".dom.spec.ts": "test:dom" } } }"#,
            ),
            (
                "packages/ui/package.json",
                r#"{ "name": "@acme/ui", "scripts": { "test": "bun run test:dom", "test:dom": "happy-dom-run" } }"#,
            ),
            (
                "packages/ui/src/button.dom.spec.ts",
                "test('works', () => {});\n",
            ),
        ],
        |tree| {
            tree.write(
                "packages/ui/src/stray.spec.ts",
                "test('works', () => {});\n",
            );
        },
        "ends in none of .dom.spec.ts, so no test script reaches it and it never runs",
        "packages/ui/src/stray.spec.ts",
    );
}

#[test]
fn spec_floors() {
    let tree = Tree::new("spec-floors");
    tree.write(
        "fusion.json",
        r#"{ "spec": { "harness": "testing/src/harness.ts" } }"#,
    )
    .write(
        "testing/src/harness.ts",
        "export interface Matchers {\n  toBe: (expected: unknown) => void;\n}\n",
    )
    .write(
        "packages/ui/src/button.dom.spec.ts",
        "test('works', () => {\n  expect(1).toBe(1);\n});\n",
    );
    floors(
        "spec",
        &tree,
        "matchers",
        "runners",
        "counted no spec files reached by their package's own test",
    );
}
