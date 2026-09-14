//! Every spec file is reached by the script that claims to run the specs.
//!
//! **A spec nobody runs is the dialect fault in a different costume.** It is
//! written, it is reviewed, it is committed, it goes green because it is never
//! executed, and it protects nothing. One package ran two suffix patterns, so a
//! pure spec named for neither sat between them and ran in neither: 24
//! assertions covering the one bug the module exists to prevent, none of them
//! executed by the verify run.
//!
//! The suffix names the process a spec needs, which is why there are three: one
//! wants a DOM, one wants server rendering and cannot share a process with it,
//! and one wants neither. This holds the three against the scripts, in both
//! directions:
//!
//! - a spec file whose suffix no test script matches is unreachable;
//! - a package holding a suffix with no script for it is the same fault seen
//!   from the manifest instead of from the file.
//!
//! Packages that run their whole source tree wholesale are exempt: they reach
//! everything by construction, which is the arrangement one package uses and the
//! reason it has never had this problem.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use fusion_rules::walk::crawl;
use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};

static WHOLESALE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bbun test src\b").expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    let runners = &context.settings.spec.runners;
    let mut findings = Vec::new();
    let mut checked = 0;

    let mut manifests = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| path.file_name().is_some_and(|one| one == "package.json"),
        &mut manifests,
    );

    for manifest in manifests {
        let Some(directory) = manifest.parent() else {
            continue;
        };
        let Some(declared) = fs::read_to_string(&manifest)
            .ok()
            .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        else {
            continue;
        };
        let name = declared
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned();
        let scripts = declared.get("scripts").and_then(Value::as_object).cloned();
        let Some(scripts) = scripts else {
            continue;
        };
        let Some(test) = scripts.get("test").and_then(Value::as_str) else {
            continue;
        };

        let mut specs = Vec::new();
        crawl(
            &directory.join("src"),
            &|path: &Path| {
                path.file_name()
                    .is_some_and(|one| one.to_string_lossy().ends_with(".spec.ts"))
            },
            &mut specs,
        );
        if specs.is_empty() {
            continue;
        }

        /* A wholesale run reaches every file under the source tree, so the
        suffixes are a naming convention there rather than a routing decision,
        and nothing to hold. */
        if WHOLESALE.is_match(test) {
            checked += specs.len();
            continue;
        }

        for file in specs {
            let where_ = context.relative(&file);
            let Some((_, runner)) = runners
                .iter()
                .find(|(suffix, _)| where_.ends_with(suffix.as_str()))
            else {
                findings.push(Finding {
                    detail: "The suffix names the process a spec needs, and it is what routes the \
                             file to a runner."
                        .to_owned(),
                    file: where_,
                    message: format!(
                        "ends in none of {}, so no test script reaches it and it never runs",
                        runners
                            .keys()
                            .map(String::as_str)
                            .collect::<Vec<&str>>()
                            .join(", ")
                    ),
                });
                continue;
            };
            checked += 1;
            if !scripts.contains_key(runner) {
                findings.push(Finding {
                    detail: "It is written, reviewed and committed, and it goes green because it \
                             is never executed."
                        .to_owned(),
                    file: where_,
                    message: format!("`{name}` declares no `{runner}` script, so this never runs"),
                });
            } else if !test.contains(runner.as_str()) {
                findings.push(Finding {
                    detail: "The script exists and nothing calls it, which is the same fault seen \
                             from the manifest instead of from the file."
                        .to_owned(),
                    file: where_,
                    message: format!(
                        "`{name}` declares `{runner}` and its `test` script does not call it"
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "spec files reached by their package's own test",
    }
}
