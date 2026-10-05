//! `helix scan`, run on a project as a developer or a CI job runs it.

use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use serde_json::{json, Value};

fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

/// The lint data of a small Helix, as `analyze` writes it.
fn lint() -> Value {
    json!({
        "package": "@fusion.dev/helix",
        "version": "1.2.3",
        "tags": {
            "helix-button": {
                "attributes": { "disabled": null, "emphasis": ["solid", "soft", "ghost"] },
                "family": "button",
                "hooks": ["--button-radius"],
                "parts": ["control", "label"],
                "written": []
            },
            "helix-card": {
                "attributes": { "tone": ["primary", "neutral"] },
                "family": "card",
                "hooks": ["--card-padding"],
                "parts": ["body"],
                "written": []
            },
            "helix-copy-button": { "attributes": {}, "family": "copy-button", "hooks": [], "parts": [], "written": [] },
            "helix-icon-button": {
                "attributes": {},
                "family": "icon-button",
                "hooks": ["--icon-button-size"],
                "parts": ["control"],
                "written": []
            }
        }
    })
}

/// A project with the given files, Helix installed, and nothing else.
fn project(name: &str, files: &[(&str, &str)]) -> PathBuf {
    let directory = std::env::temp_dir().join(format!("fusion-helix-scan-{name}"));
    let _ = std::fs::remove_dir_all(&directory);
    let installed = directory.join("node_modules/@fusion.dev");
    std::fs::create_dir_all(installed.join("helix")).expect("a folder");
    std::fs::create_dir_all(installed.join("helix-core")).expect("a folder");
    std::fs::write(installed.join("helix/lint.json"), lint().to_string()).expect("lint data");
    std::fs::write(
        installed.join("helix/package.json"),
        r#"{ "name": "@fusion.dev/helix", "version": "1.2.3" }"#,
    )
    .expect("a manifest");
    std::fs::write(
        installed.join("helix-core/package.json"),
        r#"{ "name": "@fusion.dev/helix-core", "version": "1.2.3" }"#,
    )
    .expect("a manifest");
    for (path, text) in files {
        let path = directory.join(path);
        std::fs::create_dir_all(path.parent().expect("a folder")).expect("a folder");
        std::fs::write(path, text).expect("a file");
    }
    directory
}

fn scan(directory: &Path, args: &[&str]) -> Output {
    Command::new(binary())
        .arg("scan")
        .args(args)
        .current_dir(directory)
        .env("NO_COLOR", "1")
        .output()
        .expect("the binary runs")
}

/// A project with one of each fault a scan proves, one it leaves to the page,
/// a test it skips, and a build with a source map.
fn faulty(name: &str) -> PathBuf {
    project(
        name,
        &[
            (
                "src/app.css",
                "helix-button::part(lable) { color: red; }\nhelix-card { --card-paddin: 1rem; }\nhelix-copy-button { --icon-button-size: 2rem; }\n.frame { --card-padding: 2rem; }\n",
            ),
            (
                "src/page.tsx",
                "export const Page = () => (\n  <helix-card tone=\"primary\">\n    <span slot=\"header\">A</span>\n    <helix-button emphasis=\"bold\" key=\"x\">Save</helix-button>\n  </helix-card>\n)\n",
            ),
            (
                "src/view.vue",
                "<template>\n  <helix-button emphasis=\"ghost\" :disabled=\"off\">Go</helix-button>\n</template>\n<style scoped>\nhelix-button::part(label) { --button-radius: 0; }\n</style>\n",
            ),
            (
                "src/page.test.tsx",
                "export const Wrong = () => <helix-button emphasis=\"wrong\" />\n",
            ),
            (
                "helix-diagnostics.json",
                r#"{ "project": { "name": "fixture", "tags": ["test"] }, "rules": { "unforwarded-part": "off" }, "send": { "usage": false } }"#,
            ),
            (
                "dist/app.js",
                "abcdefghijuvwxyz\n//# sourceMappingURL=app.js.map\n",
            ),
            (
                "dist/app.js.map",
                r#"{ "version": 3, "sources": ["webpack://app/./node_modules/@fusion.dev/helix/dist/button/root/button-root.js", "webpack://app/./src/main.js"], "mappings": "AAAA,UCAA" }"#,
            ),
        ],
    )
}

#[test]
fn a_scan_writes_one_run_with_each_finding_in_its_place() {
    let directory = faulty("run");
    let output = scan(&directory, &["--json", "--build", "dist"]);
    assert_eq!(output.status.code(), Some(1), "an error fails the scan");
    let run: Value = serde_json::from_slice(&output.stdout).expect("one JSON document");

    assert_eq!(run["schema"], 1);
    assert_eq!(run["run"]["source"], "code");
    assert_eq!(
        run["project"],
        json!({ "name": "fixture", "tags": ["test"] })
    );
    let found: Vec<(&str, &str, &str, u64)> = run["findings"]
        .as_array()
        .expect("findings")
        .iter()
        .map(|one| {
            (
                one["kind"].as_str().unwrap_or(""),
                one["subject"].as_str().unwrap_or(""),
                one["origin"]["sheet"].as_str().unwrap_or(""),
                one["origin"]["line"].as_u64().unwrap_or(0),
            )
        })
        .collect();
    assert_eq!(
        found,
        [
            ("dead-part", "helix-button::part(lable)", "src/app.css", 1),
            (
                "dead-hook",
                "helix-card { --card-paddin }",
                "src/app.css",
                2
            ),
            (
                "invalid-value",
                "<helix-button emphasis=\"bold\">",
                "src/page.tsx",
                4
            ),
        ]
    );
    let part = &run["findings"][0];
    /* The page's fingerprint for the same fault, so the two join. */
    assert_eq!(part["fingerprint"], "0c0e3fd7cca878");
    /* A transposition is two edits, past a third of a five-letter name, so
    the page suggests nothing, and neither does a scan. */
    assert!(part.get("expected").is_none(), "{part}");
    assert_eq!(run["findings"][1]["expected"], "--card-padding");
    assert_eq!(part["family"], "button");
    assert_eq!(part["severity"], "error");
    assert_eq!(part["decidedBy"], "shipped");
    assert_eq!(run["findings"][2]["fingerprint"], "1b15aa475aeaa6");

    let unsettled = run["unsettled"].as_array().expect("unsettled");
    assert_eq!(unsettled.len(), 1);
    assert_eq!(
        unsettled[0]["subject"],
        "helix-copy-button { --icon-button-size }"
    );
    assert!(unsettled[0].get("severity").is_none(), "{}", unsettled[0]);

    let usage = &run["usage"];
    assert_eq!(usage["counted"], "scanned");
    assert_eq!(usage["tags"], json!({ "helix-button": 2, "helix-card": 1 }));
    assert_eq!(
        usage["axes"],
        json!({ "helix-button": { "emphasis": { "bold": 1, "ghost": 1 } }, "helix-card": { "tone": { "primary": 1 } } })
    );
    assert_eq!(usage["slots"], json!({ "helix-card": { "header": 1 } }));
    assert_eq!(usage["parts"], json!({ "helix-button": { "label": 1 } }));
    assert_eq!(
        usage["hooks"],
        json!({ "helix-button": { "--button-radius": 1 }, "helix-card": { "--card-padding": 1 } })
    );

    assert_eq!(
        run["performance"]["weight"],
        json!({
            "families": { "button": 10 },
            "files": { "mapped": 1, "unmapped": 0 },
            "packages": { "@fusion.dev/helix": 10 },
            "total": 49
        })
    );
    assert_eq!(run["coverage"]["files"], 3);
    assert_eq!(run["coverage"]["sheets"], 2);
    assert_eq!(
        run["configuration"]["overrides"],
        json!([{ "kind": "unforwarded-part", "layer": "file", "severity": "off" }])
    );
    assert_eq!(
        run["withheld"],
        json!([
            { "category": "performance", "decidedBy": "shipped" },
            { "category": "usage", "decidedBy": "file" }
        ])
    );
    assert_eq!(run["versions"]["helix"], json!(["1.2.3"]));
    assert_eq!(
        run["versions"]["manifests"],
        json!({ "@fusion.dev/helix": "1.2.3" })
    );
}

#[test]
fn a_person_reads_each_finding_with_its_file_and_line() {
    let directory = faulty("text");
    let output = scan(&directory, &[]);
    assert_eq!(output.status.code(), Some(1));
    let printed = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = printed.lines().collect();
    assert_eq!(
        lines[0],
        "helix scan: 3 errors, 0 warnings, 0 info, and 1 unsettled, in 3 files"
    );
    assert_eq!(lines[1], "  error dead-part helix-button::part(lable)");
    assert_eq!(
        lines[2],
        "    `helix-button` publishes no part named `lable`, so this rule matches nothing. Its parts are `control` and `label`."
    );
    assert_eq!(lines[3], "    in src/app.css:1");
    assert!(
        printed.contains("  unsettled dead-hook helix-copy-button { --icon-button-size }\n"),
        "{printed}"
    );
}

#[test]
fn the_ci_file_keeps_the_pages_runs_and_replaces_the_last_scan() {
    let directory = faulty("ci");
    std::fs::create_dir_all(directory.join("reports")).expect("a folder");
    std::fs::write(
        directory.join("reports/runs.json"),
        json!({
            "runs": [
                { "run": { "id": "page-1", "page": "/", "source": "page" } },
                { "run": { "id": "old-scan", "source": "code" } }
            ],
            "schema": 1
        })
        .to_string(),
    )
    .expect("a CI file");
    let output = scan(&directory, &["--out", "reports/runs.json"]);
    assert_eq!(output.status.code(), Some(1));
    let file: Value = serde_json::from_str(
        &std::fs::read_to_string(directory.join("reports/runs.json")).expect("written"),
    )
    .expect("JSON");
    let runs: Vec<(&str, &str)> = file["runs"]
        .as_array()
        .expect("runs")
        .iter()
        .map(|one| {
            (
                one["run"]["source"].as_str().unwrap_or(""),
                one["run"]["id"].as_str().unwrap_or(""),
            )
        })
        .collect();
    assert_eq!(runs.len(), 2);
    assert_eq!(runs[0], ("page", "page-1"));
    assert_eq!(runs[1].0, "code");
    assert_ne!(runs[1].1, "old-scan");
    assert_eq!(file["schema"], 1);
}

#[test]
fn a_clean_project_passes() {
    let directory = project(
        "clean",
        &[(
            "index.html",
            "<helix-card tone=\"neutral\"><helix-button emphasis=\"soft\">Go</helix-button></helix-card>\n<style>helix-card::part(body) { --card-padding: 0; }</style>\n",
        )],
    );
    let output = scan(&directory, &["--json"]);
    assert_eq!(output.status.code(), Some(0));
    let run: Value = serde_json::from_slice(&output.stdout).expect("one JSON document");
    assert_eq!(run["findings"], json!([]));
    assert_eq!(run["unsettled"], json!([]));
    assert!(
        run.get("performance").is_none(),
        "weighed only with a build"
    );
}

#[test]
fn a_project_with_no_helix_installed_is_refused() {
    let directory = std::env::temp_dir().join("fusion-helix-scan-none");
    let _ = std::fs::remove_dir_all(&directory);
    std::fs::create_dir_all(&directory).expect("a folder");
    let output = scan(&directory, &[]);
    assert_eq!(output.status.code(), Some(3));
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("No Helix lint data"),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn a_setting_that_names_nothing_is_refused_with_the_closest() {
    let directory = project(
        "settings",
        &[("helix-diagnostics.json", r#"{ "detial": {} }"#)],
    );
    let output = scan(&directory, &[]);
    assert_eq!(output.status.code(), Some(3));
    assert!(
        String::from_utf8_lossy(&output.stderr)
            .contains("The file sets `detial`, which is no setting. The closest is `detail`."),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
