//! No barrel import of a workspace package that cannot be tree-shaken.
//!
//! **A side-effectful package retains its whole barrel.** Importing one name
//! from the index of a package that registers custom elements, or does anything
//! else on import, pulls all of it into the bundle: the bundler cannot prove the
//! rest is unused because the package says it is not. Importing the subpath is
//! the only lever, since removing `sideEffects` would be a lie about what a
//! registration costs.
//!
//! **`sideEffects: false` is the only form that says shakeable.** An array of
//! globs is a list of files that must be *kept*, and a package that has one
//! usually has one covering the whole of its output.
//!
//! **The advice names the subpath when it can.** Built types say where a class
//! or function is declared, so the message points at the entry to use rather
//! than at the existence of entries. A package that has not been built yet gets
//! the general advice, which is deliberate: a rule that needs a build to say
//! anything at all is a rule that gets skipped.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::{manifests, walk};

fn shakeable(manifest: &Value) -> bool {
    manifest.get("sideEffects") == Some(&Value::Bool(false))
}

/// Whether a package offers a subpath for its parts, which is the fix to name.
fn has_subpaths(manifest: &Value) -> bool {
    manifest
        .get("exports")
        .and_then(Value::as_object)
        .is_some_and(|exports| exports.keys().any(|key| key.contains('*')))
}

/// Where a class or function is declared, read from the built types.
fn declarations(root: &Path, directory: &str) -> BTreeMap<String, String> {
    let dist = root.join(directory).join("dist");
    let mut found = BTreeMap::new();
    let Ok(entries) = fs::read_dir(&dist) else {
        return found;
    };
    for entry in entries.flatten().filter(|entry| entry.path().is_dir()) {
        let family = entry.file_name().to_string_lossy().to_string();
        let mut types = Vec::new();
        walk(
            &entry.path(),
            &|path| path.to_string_lossy().ends_with(".d.ts"),
            &mut types,
        );
        for file in types {
            let Ok(source) = fs::read_to_string(&file) else {
                continue;
            };
            for name in declared(&source) {
                found.insert(name, family.clone());
            }
        }
    }
    found
}

/// The names a `.d.ts` exports as a class, function or const.
fn declared(source: &str) -> Vec<String> {
    let mut found = Vec::new();
    for line in source.lines() {
        let Some(rest) = line.trim_start().strip_prefix("export declare ") else {
            continue;
        };
        let rest = rest.strip_prefix("abstract ").unwrap_or(rest);
        for keyword in ["class ", "function ", "const "] {
            if let Some(name) = rest.strip_prefix(keyword) {
                let end = name
                    .find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$'))
                    .unwrap_or(name.len());
                if end > 0 {
                    found.push(name[..end].to_owned());
                }
                break;
            }
        }
    }
    found
}

/// The names in `import { … } from '<package>'`, if this line is one.
fn barrel_import<'a>(line: &'a str, package: &str) -> Option<Vec<&'a str>> {
    let rest = line.strip_prefix("import ")?;
    let rest = rest.strip_prefix("type ").unwrap_or(rest);
    let rest = rest.strip_prefix('{')?;
    let (names, tail) = rest.split_once('}')?;
    let tail = tail.trim_start().strip_prefix("from ")?.trim();
    let quoted = format!("'{package}'");
    if tail != quoted && tail != format!("{quoted};") {
        return None;
    }
    Some(
        names
            .split(',')
            .map(|one| one.split_whitespace().next().unwrap_or_default())
            .filter(|one| !one.is_empty())
            .collect(),
    )
}

pub fn run(context: &Context) -> Report {
    let root = &context.root;
    let packages = manifests(root);
    let by_name: BTreeMap<&str, &crate::workspace::Manifest> = packages
        .iter()
        .map(|manifest| (manifest.name.as_str(), manifest))
        .collect();

    let mut findings = Vec::new();
    let mut checked = 0;

    for manifest in &packages {
        let dependencies = manifest
            .value
            .get("dependencies")
            .and_then(Value::as_object)
            .map(|object| object.keys().cloned().collect::<Vec<String>>())
            .unwrap_or_default();
        let unshakeable: Vec<String> = dependencies
            .into_iter()
            .filter(|dependency| {
                by_name
                    .get(dependency.as_str())
                    .is_some_and(|target| !shakeable(&target.value) && has_subpaths(&target.value))
            })
            .collect();
        if unshakeable.is_empty() {
            continue;
        }
        let where_declared: BTreeMap<&String, BTreeMap<String, String>> = unshakeable
            .iter()
            .map(|dependency| {
                (
                    dependency,
                    declarations(root, &by_name[dependency.as_str()].directory),
                )
            })
            .collect();

        let source_root = root.join(&manifest.directory).join("src");
        let mut files = Vec::new();
        walk(
            &source_root,
            &|path| {
                let name = path.to_string_lossy();
                name.ends_with(".ts") || name.ends_with(".tsx")
            },
            &mut files,
        );

        for file in files {
            checked += 1;
            let Ok(source) = fs::read_to_string(&file) else {
                continue;
            };
            for (number, line) in source.lines().enumerate() {
                for dependency in &unshakeable {
                    let Some(names) = barrel_import(line, dependency) else {
                        continue;
                    };
                    let subpaths: BTreeSet<&String> = names
                        .iter()
                        .filter_map(|name| where_declared[dependency].get(*name))
                        .collect();
                    let advice = if subpaths.is_empty() {
                        format!("Import from `{dependency}/<part>` instead.")
                    } else {
                        format!(
                            "Import from {} instead.",
                            subpaths
                                .iter()
                                .map(|one| format!("`{dependency}/{one}`"))
                                .collect::<Vec<String>>()
                                .join(" and ")
                        )
                    };
                    findings.push(Finding {
                        detail: advice,
                        file: format!(
                            "{}:{}",
                            file.strip_prefix(root)
                                .unwrap_or(&file)
                                .to_string_lossy()
                                .replace('\\', "/"),
                            number + 1
                        ),
                        message: format!(
                            "barrel import of `{dependency}`, which is side-effectful and cannot \
                             be shaken (in {})",
                            manifest.name
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "source files",
    }
}
