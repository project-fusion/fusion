//! `helix api` and the MCP server's lookups, driven through the real binary
//! over a `node_modules` written for the test.
//!
//! **One fixture for both surfaces**, because the claim is that they are one
//! answer: a lookup over stdio returns, as its structured content, exactly what
//! the same verb prints under `--json`.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};

use serde_json::{json, Value};

fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

/// A project with Helix installed, cleaned up when it drops.
struct Project(PathBuf);

/// The lint data `analyze` writes for the fixture's tags, which `helix scan`
/// and `helix_check` judge against.
fn lint() -> Value {
    json!({
        "package": "@fusion.dev/helix",
        "tags": {
            "helix-menu": { "attributes": {}, "family": "menu", "hooks": [], "parts": [], "written": [] },
            "helix-option": { "attributes": {}, "family": "option", "hooks": [], "parts": [], "written": [] },
            "helix-select": { "attributes": { "emphasis": ["ghost"] }, "family": "select", "hooks": [], "parts": [], "written": [] },
        },
        "version": "1.2.3",
    })
}

impl Project {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("fusion-helix-api-{name}"));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).expect("a temp directory");
        Self(path)
    }

    /// A package in `node_modules` holding `files`, each of the catalog files
    /// among them in its `exports`, as `analyze` and `package.json` ship them.
    fn package(&self, name: &str, version: &str, files: &[(&str, Value)]) -> &Self {
        let exports: serde_json::Map<String, Value> = files
            .iter()
            .filter(|(file, _)| {
                !file.contains('/')
                    && Path::new(file)
                        .extension()
                        .is_some_and(|one| one.eq_ignore_ascii_case("json"))
            })
            .map(|(file, _)| (format!("./{file}"), json!(format!("./{file}"))))
            .collect();
        self.written(
            name,
            &json!({ "exports": exports, "name": name, "version": version }),
            files,
        )
    }

    /// A package in `node_modules` with this `package.json` and these files.
    fn written(&self, name: &str, manifest: &Value, files: &[(&str, Value)]) -> &Self {
        let dir = self.0.join("node_modules").join(name);
        std::fs::create_dir_all(&dir).expect("a package directory");
        std::fs::write(dir.join("package.json"), manifest.to_string()).expect("a manifest");
        for (file, body) in files {
            let path = dir.join(file);
            std::fs::create_dir_all(path.parent().expect("a parent")).expect("a directory");
            std::fs::write(path, body.to_string()).expect("a file");
        }
        self
    }

    /// Helix as `analyze` writes it: Select and its Option, Menu, and the
    /// tokens.
    fn helix(name: &str) -> Self {
        let project = Self::new(name);
        let element = |tag: &str, specifier: &str| {
            json!({
                "events": [{ "name": "change", "reactProp": "onchange" }],
                "properties": [{ "name": "placeholder", "type": "string" }],
                "specifier": specifier,
                "tagName": tag,
                "tier": "styled",
                "words": ["placeholder"],
            })
        };
        project
            .package(
                "@fusion.dev/helix",
                "1.2.3",
                &[
                    (
                        "api.json",
                        json!({
                            "families": [
                                {
                                    "aliases": ["Dropdown", "Action menu"],
                                    "elements": [element("helix-menu", "@fusion.dev/helix/menu")],
                                    "label": "Menu",
                                    "slug": "menu",
                                    "summary": "A menu of commands.",
                                    "usage": { "headless": [], "styled": ["import '@fusion.dev/helix/menu'"] },
                                },
                                {
                                    "aliases": [],
                                    "elements": [element("helix-option", "@fusion.dev/helix/option")],
                                    "label": "Option",
                                    "slug": "option",
                                    "summary": "One choice in a list.",
                                    "usage": { "headless": [], "styled": ["import '@fusion.dev/helix/option'"] },
                                },
                                {
                                    "aliases": ["Dropdown", "Picker"],
                                    "elements": [element("helix-select", "@fusion.dev/helix/select")],
                                    "label": "Select",
                                    "slug": "select",
                                    "summary": "A control that opens a list of options.",
                                    "usage": {
                                        "headless": [],
                                        "styled": ["import '@fusion.dev/helix/select'", "import '@fusion.dev/helix/option' // Option"],
                                    },
                                },
                            ],
                            "package": "@fusion.dev/helix",
                        }),
                    ),
                    ("lint.json", lint()),
                    (
                        "examples.json",
                        json!({
                            "environment": { "browser": "chromium 1" },
                            "examples": {
                                "select": [
                                    {
                                        "description": "A select.",
                                        "html": "<helix-select><helix-option>A</helix-option></helix-select>",
                                        "imports": ["import '@fusion.dev/helix/select'", "import '@fusion.dev/helix/option'"],
                                        "label": "Preview",
                                        "renders": [{ "file": "preview.png", "shot": "wide" }],
                                        "slug": "preview",
                                    },
                                    { "description": "Grouped.", "html": "<helix-select></helix-select>", "imports": [], "label": "Grouped", "slug": "grouped" },
                                ],
                            },
                            "package": "@fusion.dev/helix",
                        }),
                    ),
                ],
            )
            .package(
                "@fusion.dev/helix-styles",
                "1.2.3",
                &[(
                    "dist/tokens.json",
                    json!({
                        "categories": ["color", "space"],
                        "tokens": [
                            { "category": "color", "description": "The page background.", "name": "--helix-color-background", "value": "#fff" },
                            { "category": "color", "description": "A raised surface.", "name": "--helix-color-surface-raised", "value": "#f5f5f5" },
                            { "category": "space", "description": "The medium gap.", "name": "--helix-space-md", "value": "1rem" },
                        ],
                    }),
                )],
            );
        project
    }

    /// The styled tier's Sandbox family, as `@fusion.dev/helix` lists it.
    fn sandbox_root(&self) -> &Self {
        self.package(
            "@fusion.dev/helix",
            "1.2.3",
            &[(
                "api.json",
                json!({
                    "families": [{
                        "aliases": ["Playground"],
                        "category": "tooling",
                        "elements": [sandbox_element("helix-sandbox", "@fusion.dev/helix", "sandbox", "Sandbox")],
                        "imports": [],
                        "label": "Sandbox",
                        "package": "@fusion.dev/helix",
                        "since": "0.1.0",
                        "slug": "sandbox",
                        "source": "helix/styled/src/sandbox",
                        "status": "stable",
                        "summary": "A source pane and a preview.",
                        "usage": { "headless": [], "styled": ["import '@fusion.dev/helix/sandbox'"] },
                    }],
                    "package": "@fusion.dev/helix",
                }),
            )],
        )
    }

    /// The editor `@fusion.dev/helix-sandbox` adds to the Sandbox family, at
    /// `version`, as its `analyze` writes it.
    fn sandbox_editor(&self, version: &str) -> &Self {
        self.package(
            "@fusion.dev/helix-sandbox",
            version,
            &[
                (
                    "api.json",
                    json!({
                        "families": [{
                            "contributes": true,
                            "elements": [sandbox_element("helix-sandbox-editor", "@fusion.dev/helix-sandbox", "editor", "Sandbox Editor")],
                            "label": "Sandbox",
                            "package": "@fusion.dev/helix",
                            "slug": "sandbox",
                        }],
                        "package": "@fusion.dev/helix-sandbox",
                    }),
                ),
                (
                    "examples.json",
                    json!({ "environment": null, "examples": { "sandbox": [] }, "package": "@fusion.dev/helix-sandbox" }),
                ),
            ],
        )
    }

    fn run(&self, args: &[&str]) -> Output {
        Command::new(binary())
            .args(args)
            .current_dir(&self.0)
            .output()
            .expect("helix runs")
    }

    fn json(&self, args: &[&str]) -> Value {
        let mut all = vec!["--json"];
        all.extend_from_slice(args);
        let output = self.run(&all);
        assert_eq!(
            output.status.code(),
            Some(0),
            "{args:?}: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        serde_json::from_slice(&output.stdout).expect("the answer is JSON")
    }

    fn failure(&self, args: &[&str]) -> Value {
        let mut all = vec!["--json"];
        all.extend_from_slice(args);
        let output = self.run(&all);
        assert_eq!(output.status.code(), Some(3), "{args:?}");
        assert!(output.stdout.is_empty(), "an error reached stdout");
        serde_json::from_slice(&output.stderr).expect("the error is JSON")
    }

    /// Every response to these messages, sent to `helix mcp` started here.
    fn talk(&self, messages: &[Value]) -> Vec<Value> {
        let mut child = Command::new(binary())
            .arg("mcp")
            .current_dir(&self.0)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("the server starts");
        {
            let stdin = child.stdin.as_mut().expect("a pipe");
            for message in messages {
                writeln!(stdin, "{message}").expect("the server is reading");
            }
        }
        let output = child.wait_with_output().expect("the server exits");
        String::from_utf8(output.stdout)
            .expect("utf8")
            .lines()
            .map(|line| serde_json::from_str(line).expect("a JSON-RPC message"))
            .collect()
    }

    fn call(&self, tool: &str, arguments: &Value) -> Value {
        let replies = self.talk(&[json!({
            "id": 1,
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": { "arguments": arguments, "name": tool },
        })]);
        replies[0]["result"].clone()
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

/// An element as `api.json` lists it, with its entry and import line.
fn sandbox_element(tag: &str, package: &str, entry: &str, label: &str) -> Value {
    json!({
        "entry": entry,
        "events": [],
        "label": label,
        "package": package,
        "properties": [],
        "specifier": format!("{package}/{entry}"),
        "tagName": tag,
        "tier": "styled",
    })
}

impl Drop for Project {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[test]
fn find_lists_the_families_a_name_or_purpose_answers_best_first() {
    let project = Project::helix("find");
    let found = project.json(&["api", "find", "dropdown"]);
    let slugs: Vec<&str> = found["matches"]
        .as_array()
        .expect("matches")
        .iter()
        .filter_map(|one| one["slug"].as_str())
        .collect();
    assert_eq!(slugs, ["menu", "select"]);
    assert_eq!(found["versions"]["@fusion.dev/helix"], "1.2.3");
}

#[test]
fn a_family_answers_to_its_slug_tag_or_alias_with_its_examples_and_version() {
    let project = Project::helix("family");
    for name in ["select", "helix-select", "Picker"] {
        let answer = project.json(&["api", "family", name]);
        assert_eq!(answer["family"]["slug"], "select", "{name}");
        assert_eq!(answer["version"], "1.2.3");
        assert_eq!(answer["examples"][1]["slug"], "grouped");
        assert_eq!(
            answer["family"]["usage"]["styled"][1],
            "import '@fusion.dev/helix/option' // Option"
        );
    }
}

/// **An alias two families share is refused, never picked**, with both as
/// choices.
#[test]
fn a_name_two_families_answer_to_is_refused_with_both() {
    let project = Project::helix("ambiguous");
    let failure = project.failure(&["api", "family", "Dropdown"]);
    assert_eq!(failure["error"]["choices"], json!(["menu", "select"]));
}

#[test]
fn an_unknown_family_names_the_families_there_are() {
    let project = Project::helix("unknown");
    let failure = project.failure(&["api", "family", "selct"]);
    assert_eq!(failure["error"]["hint"], "helix api family select");
    assert_eq!(
        failure["error"]["choices"],
        json!(["menu", "option", "select"])
    );
}

#[test]
fn an_example_carries_the_imports_it_needs() {
    let project = Project::helix("example");
    let first = project.json(&["api", "example", "select"]);
    assert_eq!(first["example"]["slug"], "preview");
    assert_eq!(
        first["example"]["imports"],
        json!([
            "import '@fusion.dev/helix/select'",
            "import '@fusion.dev/helix/option'"
        ])
    );
    assert_eq!(
        first["renders"],
        json!([{ "shot": "wide", "url": "https://fusion.dev/helix/components/select/preview.png" }])
    );
    assert_eq!(first["environment"]["browser"], "chromium 1");
    let named = project.json(&["api", "example", "select", "grouped"]);
    assert_eq!(named["example"]["slug"], "grouped");
    let missing = project.failure(&["api", "example", "select", "nope"]);
    assert_eq!(missing["error"]["choices"], json!(["preview", "grouped"]));
}

#[test]
fn imports_name_the_line_for_each_tag_and_the_closest_to_an_unknown_one() {
    let project = Project::helix("imports");
    let answer = project.json(&[
        "api",
        "imports",
        "helix-select",
        "<helix-option>",
        "helix-selct",
    ]);
    assert_eq!(
        answer["lines"],
        json!([
            "import '@fusion.dev/helix/select'",
            "import '@fusion.dev/helix/option'"
        ])
    );
    assert_eq!(
        answer["unknown"],
        json!([{ "closest": "helix-select", "tag": "helix-selct" }])
    );
}

#[test]
fn tokens_filter_by_a_word_and_a_category() {
    let project = Project::helix("tokens");
    let answer = project.json(&["api", "tokens", "surface", "--category", "color"]);
    let names: Vec<&str> = answer["tokens"]
        .as_array()
        .expect("tokens")
        .iter()
        .filter_map(|token| token["name"].as_str())
        .collect();
    assert_eq!(names, ["--helix-color-surface-raised"]);
    assert_eq!(answer["version"], "1.2.3");
}

#[test]
fn no_helix_installed_says_what_to_install() {
    let project = Project::new("none");
    let failure = project.failure(&["api", "family", "select"]);
    assert_eq!(failure["error"]["hint"], "npm install @fusion.dev/helix");
}

#[test]
fn a_helix_from_before_api_json_says_to_update() {
    let project = Project::new("old");
    project.package("@fusion.dev/helix", "0.1.0", &[]);
    let failure = project.failure(&["api", "family", "select"]);
    assert_eq!(
        failure["error"]["what"],
        "@fusion.dev/helix 0.1.0 has no api.json"
    );
}

/// **The two surfaces are one answer**: a tool's structured content is what
/// the same verb prints under `--json`.
#[test]
fn each_lookup_over_mcp_is_the_verb_s_json() {
    let project = Project::helix("same");
    for (tool, arguments, verb) in [
        (
            "helix_family",
            json!({ "family": "select" }),
            vec!["api", "family", "select"],
        ),
        (
            "helix_example",
            json!({ "family": "select", "example": "grouped" }),
            vec!["api", "example", "select", "grouped"],
        ),
        (
            "helix_imports",
            json!({ "tags": ["helix-select"] }),
            vec!["api", "imports", "helix-select"],
        ),
        (
            "helix_tokens",
            json!({ "query": "space" }),
            vec!["api", "tokens", "space"],
        ),
        (
            "helix_find",
            json!({ "query": "picker" }),
            vec!["api", "find", "picker"],
        ),
    ] {
        let result = project.call(tool, &arguments);
        assert_eq!(result["isError"], false, "{tool}: {result}");
        assert_eq!(result["structuredContent"], project.json(&verb), "{tool}");
        let text: Value =
            serde_json::from_str(result["content"][0]["text"].as_str().expect("text"))
                .expect("the text is the same JSON");
        assert_eq!(text, result["structuredContent"], "{tool}");
    }
}

#[test]
fn a_lookup_that_fails_is_a_tool_error_naming_the_choices() {
    let project = Project::helix("tool-error");
    let result = project.call("helix_family", &json!({ "family": "Dropdown" }));
    assert_eq!(result["isError"], true);
    let text = result["content"][0]["text"].as_str().expect("text");
    assert!(text.contains("menu, select"), "{text}");
    let missing = project.call("helix_family", &json!({}));
    assert_eq!(missing["isError"], true);
}

#[test]
fn every_tool_declares_an_output_schema_and_read_only_annotations() {
    let project = Project::helix("list");
    let replies = project.talk(&[json!({ "id": 1, "jsonrpc": "2.0", "method": "tools/list" })]);
    let tools = replies[0]["result"]["tools"].as_array().expect("tools");
    assert_eq!(tools.len(), 9);
    for tool in tools {
        assert_eq!(tool["outputSchema"]["type"], "object", "{}", tool["name"]);
        assert_eq!(
            tool["annotations"]["readOnlyHint"], true,
            "{}",
            tool["name"]
        );
        assert!(tool["title"].is_string(), "{}", tool["name"]);
    }
}

/// **A known revision is answered in kind, and any other with the newest.**
/// The instructions stay under 2,048 characters, where one client cuts them.
#[test]
fn initialize_negotiates_the_revision_and_sends_short_instructions() {
    let project = Project::helix("initialize");
    let hello = |version: &str| {
        json!({
            "id": 1,
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": { "capabilities": {}, "clientInfo": { "name": "t", "version": "1" }, "protocolVersion": version },
        })
    };
    let known = project.talk(&[hello("2025-06-18")]);
    assert_eq!(known[0]["result"]["protocolVersion"], "2025-06-18");
    let unknown = project.talk(&[hello("1900-01-01")]);
    assert_eq!(unknown[0]["result"]["protocolVersion"], "2025-11-25");
    let instructions = known[0]["result"]["instructions"]
        .as_str()
        .expect("instructions");
    assert!(
        instructions.len() < 2048,
        "{} characters",
        instructions.len()
    );
    assert!(instructions.contains("helix_family"));
}

#[test]
fn mcp_init_adds_the_server_and_keeps_the_others() {
    let project = Project::new("init");
    std::fs::write(
        project.path().join(".mcp.json"),
        json!({ "mcpServers": { "other": { "command": "other" } } }).to_string(),
    )
    .expect("a config");
    let written = project.run(&["mcp", "init", "--client", "claude"]);
    assert_eq!(written.status.code(), Some(0));
    let config: Value = serde_json::from_str(
        &std::fs::read_to_string(project.path().join(".mcp.json")).expect("the config"),
    )
    .expect("JSON");
    assert_eq!(config["mcpServers"]["other"]["command"], "other");
    assert_eq!(
        config["mcpServers"]["helix"],
        json!({ "args": ["@fusion.dev/helix-cli", "mcp"], "command": "npx" })
    );

    let again = project.run(&["mcp", "init", "--client", "claude"]);
    assert_eq!(
        again.status.code(),
        Some(3),
        "an existing helix server was replaced"
    );
    let forced = project.run(&["mcp", "init", "--client", "claude", "--force"]);
    assert_eq!(forced.status.code(), Some(0));

    let vscode = project.run(&["mcp", "init", "--client", "vscode"]);
    assert_eq!(vscode.status.code(), Some(0));
    let config: Value = serde_json::from_str(
        &std::fs::read_to_string(project.path().join(".vscode/mcp.json")).expect("the config"),
    )
    .expect("JSON");
    assert_eq!(config["servers"]["helix"]["type"], "stdio");

    /* Each other client's own file and shape. */
    for (client, file, key) in [
        ("gemini", ".gemini/settings.json", "mcpServers"),
        ("roo", ".roo/mcp.json", "mcpServers"),
        ("junie", ".junie/mcp/mcp.json", "mcpServers"),
        ("opencode", "opencode.json", "mcp"),
    ] {
        let written = project.run(&["mcp", "init", "--client", client]);
        assert_eq!(written.status.code(), Some(0), "{client}");
        let config: Value = serde_json::from_str(
            &std::fs::read_to_string(project.path().join(file)).expect("the config"),
        )
        .expect("JSON");
        let entry = &config[key]["helix"];
        if client == "opencode" {
            assert_eq!(
                *entry,
                json!({ "command": ["npx", "@fusion.dev/helix-cli", "mcp"], "enabled": true, "type": "local" })
            );
        } else {
            assert_eq!(entry["command"], "npx", "{client}");
        }
    }
}

/// **The check is the scan**, narrowed to a snippet: the same findings
/// `helix scan --stdin` prints, judged against the project's imports.
#[test]
fn check_judges_a_snippet_as_the_scan_does() {
    let project = Project::helix("check");
    std::fs::create_dir_all(project.path().join("src")).expect("a source folder");
    std::fs::write(
        project.path().join("src/main.ts"),
        "import '@fusion.dev/helix/select'\n",
    )
    .expect("a module");
    let code = r#"<helix-select emphasis="loud"><helix-option>A</helix-option></helix-select>"#;
    let result = project.call("helix_check", &json!({ "code": code, "language": "html" }));
    assert_eq!(result["isError"], false, "{result}");
    let checked = &result["structuredContent"];
    let kinds: Vec<&str> = checked["findings"]
        .as_array()
        .expect("findings")
        .iter()
        .filter_map(|finding| finding["kind"].as_str())
        .collect();
    assert_eq!(kinds, ["invalid-value", "unimported-tag"]);
    assert_eq!(
        checked["counts"],
        json!({ "error": 1, "info": 0, "warn": 1 })
    );

    let mut child = Command::new(binary())
        .args(["--json", "scan", "--stdin", "html"])
        .current_dir(project.path())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("helix runs");
    child
        .stdin
        .take()
        .expect("a pipe")
        .write_all(code.as_bytes())
        .expect("the scan is reading");
    let output = child.wait_with_output().expect("helix exits");
    assert_eq!(output.status.code(), Some(1), "an error finding exits 1");
    let scanned: Value = serde_json::from_slice(&output.stdout).expect("the run is JSON");
    assert_eq!(scanned["findings"], checked["findings"]);
}

/// **An add-on's element is in the family whose root another package holds**,
/// with that package's facts, its own import line, and both versions, and
/// the MCP tool answers the same.
#[test]
fn an_add_on_s_element_joins_the_family_with_the_root_s_facts() {
    let project = Project::new("add-on");
    project.sandbox_root().sandbox_editor("1.2.4");
    for name in ["sandbox", "helix-sandbox-editor"] {
        let answer = project.json(&["api", "family", name]);
        let family = &answer["family"];
        assert_eq!(family["slug"], "sandbox", "{name}");
        assert_eq!(
            [&family["summary"], &family["status"], &family["source"]],
            [
                "A source pane and a preview.",
                "stable",
                "helix/styled/src/sandbox"
            ]
        );
        assert_eq!(family["package"], "@fusion.dev/helix");
        assert!(family.get("contributes").is_none());
        assert_eq!(
            family["usage"]["styled"],
            json!([
                "import '@fusion.dev/helix/sandbox'",
                "import '@fusion.dev/helix-sandbox/editor' // Sandbox Editor",
            ])
        );
        assert_eq!(
            answer["versions"],
            json!({ "@fusion.dev/helix": "1.2.3", "@fusion.dev/helix-sandbox": "1.2.4" })
        );
        assert!(answer.get("missing").is_none());
    }
    let result = project.call("helix_family", &json!({ "family": "sandbox" }));
    assert_eq!(
        result["structuredContent"],
        project.json(&["api", "family", "sandbox"])
    );
    assert_eq!(
        project.json(&["api", "imports", "helix-sandbox-editor"])["lines"],
        json!(["import '@fusion.dev/helix-sandbox/editor'"])
    );
    let printed =
        String::from_utf8(project.run(&["api", "family", "sandbox"]).stdout).expect("utf8");
    assert!(
        printed.starts_with("Sandbox (@fusion.dev/helix 1.2.3, @fusion.dev/helix-sandbox 1.2.4)"),
        "{printed}"
    );
}

/// **Where the family's root is not installed, the answer says where it is**
/// and invents none of the family's facts.
#[test]
fn an_add_on_without_its_family_s_root_says_where_the_root_is() {
    let project = Project::new("add-on-alone");
    project.sandbox_editor("1.2.4");
    let answer = project.json(&["api", "family", "sandbox"]);
    assert_eq!(
        answer["missing"],
        "The Sandbox family's root, helix-sandbox, is in @fusion.dev/helix, which is not installed. Install it for the family's summary, status, and examples."
    );
    assert!(answer["family"].get("summary").is_none(), "{answer}");
    assert_eq!(answer["family"]["package"], "@fusion.dev/helix");
    assert_eq!(answer["package"], "@fusion.dev/helix-sandbox");
    assert_eq!(
        answer["family"]["elements"][0]["tagName"],
        "helix-sandbox-editor"
    );
    let result = project.call("helix_family", &json!({ "family": "sandbox" }));
    assert_eq!(result["structuredContent"], answer);
}

/// **A package is read where it says it is documented**: its `exports` names
/// `./api.json` and it is not private.
#[test]
fn only_a_package_that_publishes_api_json_and_is_not_private_is_read() {
    let project = Project::new("documented");
    project.sandbox_root();
    let contributes = |tag: &str, package: &str| {
        json!({
            "families": [{
                "contributes": true,
                "elements": [sandbox_element(tag, package, "specs", "Sandbox Specs")],
                "label": "Sandbox",
                "slug": "sandbox",
            }],
            "package": package,
        })
    };
    project.written(
        "@fusion.dev/helix-workbench",
        &json!({ "exports": { "./api.json": "./api.json" }, "name": "@fusion.dev/helix-workbench", "private": true, "version": "1.2.3" }),
        &[("api.json", contributes("helix-sandbox-specs", "@fusion.dev/helix-workbench"))],
    );
    project.written(
        "@fusion.dev/helix-extra",
        &json!({ "name": "@fusion.dev/helix-extra", "version": "1.2.3" }),
        &[(
            "api.json",
            contributes("helix-sandbox-extra", "@fusion.dev/helix-extra"),
        )],
    );
    let answer = project.json(&["api", "family", "sandbox"]);
    assert_eq!(
        answer["family"]["elements"]
            .as_array()
            .expect("elements")
            .len(),
        1,
        "{answer}"
    );
    assert_eq!(answer["versions"], json!({ "@fusion.dev/helix": "1.2.3" }));
}
