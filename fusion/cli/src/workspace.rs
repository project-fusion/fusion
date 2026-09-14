//! The workspace a rule is run against, discovered rather than configured.
//!
//! **This knows nothing about Fusion**, which is the point. The rules that live
//! here read manifests and walk directories, and both answers come from the
//! `workspaces` field, so a consumer configures this by having a workspace at
//! all.
//!
//! **The root is the caller's directory, not the binary's.** A script resolves
//! its own location because it lives in the repository it checks. A binary does
//! not: it is installed somewhere else and asked about whatever tree it was
//! invoked in, so the root is found by walking up from the working directory to
//! the manifest that declares workspaces.
//!
//! **The walkers are `fusion-rules`'s.** Which directories hold build output
//! is not a fact about a workspace, and `helix component` skips the same list.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

/// One package manifest, with the path it was read from.
pub struct Manifest {
    /// Relative to the root, and empty for the root itself.
    pub directory: String,
    /// The package name, or the directory when a manifest declares none.
    pub name: String,
    pub value: Value,
}

impl Manifest {
    /// The manifest's `scripts`, or an empty map when it declares none.
    pub fn scripts(&self) -> BTreeMap<&str, &str> {
        self.value
            .get("scripts")
            .and_then(Value::as_object)
            .map(|scripts| {
                scripts
                    .iter()
                    .filter_map(|(key, value)| value.as_str().map(|value| (key.as_str(), value)))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// What to print when naming this manifest in a finding.
    pub fn label(&self) -> String {
        if self.directory.is_empty() {
            "package.json".to_owned()
        } else {
            format!("{}/package.json", self.directory)
        }
    }
}

/// The nearest directory at or above `from` whose manifest declares workspaces.
///
/// Falls back to the nearest manifest of any kind, so a single-package
/// repository is a workspace of one rather than an error. `None` only when
/// there is no manifest anywhere above the caller, which is the one case worth
/// refusing rather than guessing at.
pub fn find_root(from: &Path) -> Option<PathBuf> {
    let mut here = from.to_path_buf();
    let mut fallback = None;
    loop {
        let manifest = here.join("package.json");
        if manifest.is_file() {
            if fallback.is_none() {
                fallback = Some(here.clone());
            }
            if fs::read_to_string(&manifest)
                .ok()
                .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
                .is_some_and(|value| value.get("workspaces").is_some())
            {
                return Some(here);
            }
        }
        if !here.pop() {
            return fallback;
        }
    }
}

/// Every workspace directory, with `dir/*` globs expanded.
fn directories(root: &Path) -> Vec<PathBuf> {
    let Ok(raw) = fs::read_to_string(root.join("package.json")) else {
        return Vec::new();
    };
    let Ok(value) = serde_json::from_str::<Value>(&raw) else {
        return Vec::new();
    };
    let patterns = value
        .get("workspaces")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default();

    let mut found = Vec::new();
    for pattern in patterns.iter().filter_map(Value::as_str) {
        if let Some(parent) = pattern.strip_suffix("/*") {
            let parent = root.join(parent);
            let Ok(entries) = fs::read_dir(&parent) else {
                continue;
            };
            let mut expanded: Vec<PathBuf> = entries
                .flatten()
                .map(|entry| entry.path())
                .filter(|path| path.is_dir())
                .collect();
            /* Sorted, because `read_dir` is filesystem order and a report that
            changes between runs on an unchanged tree is a report nobody
            trusts. */
            expanded.sort();
            found.extend(expanded);
        } else {
            found.push(root.join(pattern));
        }
    }
    found
}

/// Every manifest in the workspace, the root's included.
///
/// **The root is here and is not a workspace member**, which is the distinction
/// that cost a rewrite in the version this was ported from: taking its absence
/// for an empty script list leaves the chains that call the most scripts
/// unchecked.
pub fn manifests(root: &Path) -> Vec<Manifest> {
    let mut found = Vec::new();
    for directory in std::iter::once(root.to_path_buf()).chain(directories(root)) {
        let Ok(raw) = fs::read_to_string(directory.join("package.json")) else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(&raw) else {
            continue;
        };
        let relative = directory
            .strip_prefix(root)
            .map(|path| path.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        let name = value
            .get("name")
            .and_then(Value::as_str)
            .map_or_else(|| relative.clone(), str::to_owned);
        found.push(Manifest {
            directory: relative,
            name,
            value,
        });
    }
    found
}
