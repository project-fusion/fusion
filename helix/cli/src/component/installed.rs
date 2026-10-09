//! What the installed Helix packages say about each class they publish.
//!
//! **A project built on Helix extends classes it did not write**, so the rules
//! that judge it need what those classes render, the slots they take, and the
//! parts they publish. Each package's manifest carries all three per class,
//! with what a class inherits already folded in, so this reads the manifests
//! and nothing else.
//!
//! **Found from the project's `node_modules` up**, the way Node resolves the
//! import, so a workspace with the packages hoisted to its root reads the same
//! answer as one that installs them beside the project.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

use serde_json::Value;

/// The packages whose classes a project extends.
const PACKAGES: [&str; 2] = ["@fusion.dev/helix-headless", "@fusion.dev/helix"];

/// One class a package publishes.
#[derive(Default)]
pub struct Class {
    /// The tag it registers, where it registers one.
    pub tag: Option<String>,
    /// The families it renders inside its shadow root, by their bare names.
    pub renders: BTreeSet<String>,
    /// Its named slots, inherited ones included.
    pub slots: BTreeSet<String>,
    /// Its parts and their descriptions, inherited ones included.
    pub parts: BTreeMap<String, String>,
}

/// Every class the installed packages publish.
pub struct Installed {
    pub classes: BTreeMap<String, Class>,
    /// What each family renders, the union of its classes.
    families: BTreeMap<String, BTreeSet<String>>,
}

/// Each name in a manifest list of `{ name }` objects, the empty one left out.
fn names(list: &Value) -> impl Iterator<Item = (&str, &str)> {
    list.as_array().into_iter().flatten().filter_map(|one| {
        let name = one["name"].as_str().filter(|name| !name.is_empty())?;
        Some((name, one["description"].as_str().unwrap_or_default()))
    })
}

impl Installed {
    /// The classes of every installed package, or `None` where none is
    /// installed and there is nothing to judge a project against.
    pub fn read(root: &Path) -> Option<Self> {
        let mut classes = BTreeMap::new();
        let mut families: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
        let mut found = false;
        for package in PACKAGES {
            let Some(manifest) = root
                .ancestors()
                .map(|dir| {
                    dir.join("node_modules")
                        .join(package)
                        .join("custom-elements.json")
                })
                .find(|path| path.is_file())
                .and_then(|path| fs::read_to_string(path).ok())
                .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            else {
                continue;
            };
            found = true;
            for module in manifest["modules"].as_array().into_iter().flatten() {
                let family = module["path"]
                    .as_str()
                    .and_then(|path| path.strip_prefix("src/"))
                    .and_then(|rest| rest.split('/').next())
                    .map(str::to_owned);
                for declaration in module["declarations"].as_array().into_iter().flatten() {
                    let Some(name) = declaration["name"].as_str() else {
                        continue;
                    };
                    let renders: BTreeSet<String> = declaration["helix"]["renders"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(str::to_owned)
                        .collect();
                    if let Some(family) = &family {
                        families
                            .entry(family.clone())
                            .or_default()
                            .extend(renders.iter().cloned());
                    }
                    classes.insert(
                        name.to_owned(),
                        Class {
                            tag: declaration["tagName"].as_str().map(str::to_owned),
                            renders,
                            slots: names(&declaration["slots"])
                                .map(|(name, _)| name.to_owned())
                                .collect(),
                            parts: names(&declaration["cssParts"])
                                .map(|(name, description)| {
                                    (name.to_owned(), description.to_owned())
                                })
                                .collect(),
                        },
                    );
                }
            }
        }
        found.then_some(Self { classes, families })
    }

    /// What a class renders, and everything those families render in turn:
    /// Combobox renders Listbox, and Listbox renders Option.
    pub fn renders(&self, class: &str) -> BTreeSet<String> {
        let Some(direct) = self.classes.get(class).map(|one| &one.renders) else {
            return BTreeSet::new();
        };
        let mut found = direct.clone();
        let mut next: Vec<&str> = direct.iter().map(String::as_str).collect();
        while let Some(one) = next.pop() {
            for child in self.families.get(one).into_iter().flatten() {
                if found.insert(child.clone()) {
                    next.push(child);
                }
            }
        }
        found
    }
}
