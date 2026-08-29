//! A manifest's keys in one order, and its scripts alphabetized.
//!
//! **Identity first, then how the package is consumed, then everything else
//! alphabetically.** A manifest is read far more often than it is written, and a
//! reader looking for `exports` should not have to search for it.
//!
//! **`exports` conditions are order-sensitive and are not alphabetized.** They
//! match top to bottom, so `types` must precede `default` or a consumer resolves
//! the runtime entry and reports the package as untyped. This is the one place
//! where sorting would break the file it is tidying, which is why the condition
//! order is a list rather than a comparison.
//!
//! **Script keys are sorted case-insensitively, and were not sorted at all until
//! they had to be.** `scripts` was pinned in the key order and never opened, so
//! its contents were alphabetical only because they had been typed that way. A
//! rename that rewrote seventy-seven of them put every one back in the order of
//! the name it used to have, which reads as alphabetical right up to where it is
//! not. Case-insensitively, because byte order puts `Z` before `a` and a
//! manifest is read by people.
//!
//! Keys only, never values. A script's value is a pipeline whose order is the
//! whole meaning of it.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

use crate::rules::{Context, Finding, Report};

/// Keys pinned to the top, in this order. Everything else sorts after them.
const PRIORITY: [&str; 17] = [
    // identity
    "name",
    "description",
    "version",
    "private",
    "license",
    "author",
    "repository",
    // consumption
    "type",
    "main",
    "module",
    "types",
    "exports",
    "files",
    "customElements",
    "sideEffects",
    "bin",
    // build
    "scripts",
];

/// Export conditions, in match order rather than alphabetical.
const CONDITIONS: [&str; 7] = [
    "types", "browser", "node", "import", "require", "module", "default",
];

/// **Second checkouts live under `.claude`**, and walking into one rewrites
/// manifests on somebody else's branch. Measured in the repository this came
/// from: fifteen files, all already in order, so nothing was damaged, which is
/// not a reason to leave it.
const IGNORED: [&str; 8] = [
    ".claude",
    ".git",
    ".local",
    ".next",
    ".turbo",
    "dist",
    "node_modules",
    "target",
];

fn sort_by_list(object: &Map<String, Value>, list: &[&str]) -> Map<String, Value> {
    let mut ordered = Map::new();
    for key in list {
        if let Some(value) = object.get(*key) {
            ordered.insert((*key).to_owned(), value.clone());
        }
    }
    let mut rest: Vec<&String> = object
        .keys()
        .filter(|key| !list.contains(&key.as_str()))
        .collect();
    rest.sort();
    for key in rest {
        ordered.insert(key.clone(), object[key].clone());
    }
    ordered
}

/// Recursively orders export conditions, which nest arbitrarily deep.
fn order_exports(node: &Value) -> Value {
    let Some(object) = node.as_object() else {
        return node.clone();
    };
    let ordered = sort_by_list(object, &CONDITIONS);
    Value::Object(
        ordered
            .into_iter()
            .map(|(key, value)| (key, order_exports(&value)))
            .collect(),
    )
}

fn order_scripts(node: &Value) -> Value {
    let Some(object) = node.as_object() else {
        return node.clone();
    };
    let mut keys: Vec<&String> = object.keys().collect();
    keys.sort_by_key(|key| key.to_lowercase());
    Value::Object(
        keys.into_iter()
            .map(|key| (key.clone(), object[key].clone()))
            .collect(),
    )
}

fn order(manifest: &Value) -> Value {
    let Some(object) = manifest.as_object() else {
        return manifest.clone();
    };
    let mut ordered = sort_by_list(object, &PRIORITY);
    if let Some(exports) = ordered.get("exports") {
        let sorted = order_exports(exports);
        ordered.insert("exports".to_owned(), sorted);
    }
    if let Some(scripts) = ordered.get("scripts") {
        let sorted = order_scripts(scripts);
        ordered.insert("scripts".to_owned(), sorted);
    }
    Value::Object(ordered)
}

/// Every manifest under the root, skipping the directories that hold copies.
fn found(root: &Path) -> Vec<PathBuf> {
    fn descend(directory: &Path, found: &mut Vec<PathBuf>) {
        let Ok(entries) = fs::read_dir(directory) else {
            return;
        };
        let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
        paths.sort();
        for path in paths {
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if IGNORED.contains(&name.as_str()) {
                continue;
            }
            if path.is_dir() {
                descend(&path, found);
            } else if name == "package.json" {
                found.push(path);
            }
        }
    }
    let mut all = Vec::new();
    descend(root, &mut all);
    all
}

/// Reads every manifest once and reports which would change, and to what.
fn survey(root: &Path) -> (usize, Vec<(PathBuf, String)>) {
    let mut changed = Vec::new();
    let mut checked = 0;
    for file in found(root) {
        checked += 1;
        let Ok(before) = fs::read_to_string(&file) else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(&before) else {
            continue;
        };
        let Ok(mut after) = serde_json::to_string_pretty(&order(&value)) else {
            continue;
        };
        after.push('\n');
        if after != before {
            changed.push((file, after));
        }
    }
    (checked, changed)
}

pub fn run(context: &Context) -> Report {
    let (checked, changed) = survey(&context.root);
    let findings = changed
        .into_iter()
        .map(|(file, _)| Finding {
            detail: "Identity first, then consumption, then alphabetical; scripts sorted inside."
                .to_owned(),
            file: file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/"),
            message: "keys are out of order".to_owned(),
        })
        .collect();
    Report {
        checked,
        findings,
        unit: "manifests",
    }
}

pub fn fix(context: &Context) -> Vec<String> {
    let (_, changed) = survey(&context.root);
    let mut written = Vec::new();
    for (file, after) in changed {
        if fs::write(&file, after).is_ok() {
            written.push(
                file.strip_prefix(&context.root)
                    .unwrap_or(&file)
                    .to_string_lossy()
                    .replace('\\', "/"),
            );
        }
    }
    written
}
