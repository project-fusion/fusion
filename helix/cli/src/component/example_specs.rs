//! An example with a script is run by a spec that says what pressing it does.
//!
//! **A script is behavior, and nothing else here runs it.** The smoke run
//! renders every example and presses nothing, and every other rule reads
//! source. Before specs ran them, the examples carried a filter pick that added
//! two chips, a tree whose branch never folded, a filter list whose handler
//! answered an event nothing could send, and listeners waiting for events their
//! components never sent: all quiet on screen, all found only by pressing.
//!
//! **The import is the evidence.** A spec runs an example by importing its file
//! as text and mounting it through the browser harness's `example`, so a
//! scripted example no spec in its family imports is one nothing presses. The
//! rule cannot judge whether the spec presses the right things; it can say
//! whether anything does.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{Context, Finding, Report};

static IMPORTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"from\s+'\.\./\.examples/([a-z0-9-]+)\.html'").expect("a literal pattern compiles")
});

/// Every example a family's specs import, by name.
fn imported(family: &Path) -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    let Ok(parts) = fs::read_dir(family) else {
        return found;
    };
    for part in parts.flatten() {
        let Ok(files) = fs::read_dir(part.path()) else {
            continue;
        };
        for file in files.flatten() {
            let name = file.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".dom.spec.ts") {
                continue;
            }
            if let Ok(code) = fs::read_to_string(file.path()) {
                found.extend(IMPORTED.captures_iter(&code).map(|one| one[1].to_owned()));
            }
        }
    }
    found
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for layer in &context.settings.layers {
        let source = context.root.join(&layer.source);
        let Ok(families) = fs::read_dir(&source) else {
            continue;
        };
        for family in families.flatten() {
            let Ok(examples) = fs::read_dir(family.path().join(".examples")) else {
                continue;
            };
            let run_by_specs = imported(&family.path());
            for example in examples.flatten() {
                let path = example.path();
                let name = path
                    .file_name()
                    .map(|one| one.to_string_lossy().into_owned())
                    .unwrap_or_default();
                let Some(stem) = name.strip_suffix(".html") else {
                    continue;
                };
                let Ok(text) = fs::read_to_string(&path) else {
                    continue;
                };
                if !text.contains("<script") {
                    continue;
                }
                checked += 1;
                if run_by_specs.contains(stem) {
                    continue;
                }
                findings.push(Finding {
                    detail: format!(
                        "Import it in a `*.dom.spec.ts` beside the family with \
                         `import {} from '../.examples/{stem}.html' with {{ type: 'text' }}`, \
                         mount it with `example`, and press what a reader would.",
                        stem.replace('-', "_"),
                    ),
                    file: path
                        .strip_prefix(&context.root)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .replace('\\', "/"),
                    message: "carries a script and no spec runs it".to_owned(),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "scripted examples",
    }
}
