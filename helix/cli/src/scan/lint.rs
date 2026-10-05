//! What each Helix tag publishes, read from the installed packages' lint data.
//!
//! **The lint data the page loads, from the copy the project installed.**
//! `analyze` writes `lint.json` beside each package's `custom-elements.json`,
//! and every Helix package publishes it, so the version a scan judges against
//! is the version the project builds with. It is found the way Node finds a
//! package: in `node_modules`, from the project's root up.
//!
//! **Indexed as `manifest.ts` indexes it**, tier after tier in the page's
//! order, `@fusion.dev/helix` before `@fusion.dev/helix-headless`, so a
//! suggestion and an unforwarded part read the same in both.

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::path::{Path, PathBuf};

use serde::Deserialize;

/// One package's lint data, as `analyze` writes it.
#[derive(Debug, Deserialize)]
pub struct LintData {
    pub package: String,
    pub tags: serde_json::Map<String, serde_json::Value>,
    pub version: Option<String>,
}

/// What one tag publishes across every tier.
#[derive(Debug, Default)]
pub struct Published {
    /// Each attribute in the order the data lists it, with the values it
    /// allows, or `None` where it takes any.
    pub attributes: Vec<(String, Option<Vec<String>>)>,
    /// The family, from the module's path.
    pub family: Option<String>,
    /// Each hook, with the packages that publish it, in the order first seen.
    pub hooks: Vec<(String, BTreeSet<String>)>,
    /// Each part, with the packages that publish it, in the order first seen.
    pub parts: Vec<(String, BTreeSet<String>)>,
    /// The attributes the element writes on itself, which are output.
    pub written: HashSet<String>,
}

/// The values an attribute takes.
#[derive(Debug, PartialEq)]
pub enum Allows<'a> {
    Any,
    OneOf(&'a [String]),
}

impl Published {
    /// The values an attribute takes, or `None` where the tag takes no such
    /// attribute.
    pub fn attribute(&self, name: &str) -> Option<Allows<'_>> {
        self.attributes
            .iter()
            .find(|(one, _)| one == name)
            .map(|(_, values)| values.as_deref().map_or(Allows::Any, Allows::OneOf))
    }

    pub fn has_hook(&self, name: &str) -> bool {
        self.hooks.iter().any(|(one, _)| one == name)
    }

    pub fn has_part(&self, name: &str) -> bool {
        self.parts.iter().any(|(one, _)| one == name)
    }
}

/// Every tag across every tier, in the order the tiers listed them.
#[derive(Debug, Default)]
pub struct Index {
    pub tags: Vec<(String, Published)>,
    position: HashMap<String, usize>,
    /// The version each package's data describes, by package.
    pub versions: BTreeMap<String, String>,
}

impl Index {
    pub fn get(&self, tag: &str) -> Option<&Published> {
        self.position.get(tag).map(|at| &self.tags[*at].1)
    }

    /// The tags that list each hook, in the order the tiers list them.
    pub fn hooks(&self) -> HashMap<String, Vec<String>> {
        let mut by: HashMap<String, Vec<String>> = HashMap::new();
        for (tag, element) in &self.tags {
            for (hook, _) in &element.hooks {
                by.entry(hook.clone()).or_default().push(tag.clone());
            }
        }
        by
    }

    /// Every family a tag belongs to, for weighing a build by family.
    pub fn families(&self) -> HashSet<String> {
        self.tags
            .iter()
            .filter_map(|(_, element)| element.family.clone())
            .collect()
    }

    /// Builds the index from each package's data, in the order given.
    pub fn of(packages: &[LintData]) -> Self {
        let mut index = Self::default();
        for lint in packages {
            if let Some(version) = &lint.version {
                index.versions.insert(lint.package.clone(), version.clone());
            }
            for (tag, entry) in &lint.tags {
                let at = *index.position.entry(tag.clone()).or_insert_with(|| {
                    index.tags.push((
                        tag.clone(),
                        Published {
                            family: entry
                                .get("family")
                                .and_then(serde_json::Value::as_str)
                                .map(str::to_owned),
                            ..Published::default()
                        },
                    ));
                    index.tags.len() - 1
                });
                let element = &mut index.tags[at].1;
                for name in strings(entry.get("written")) {
                    element.written.insert(name);
                }
                if let Some(attributes) = entry.get("attributes").and_then(|one| one.as_object()) {
                    for (name, values) in attributes {
                        let values = values.as_array().map(|list| {
                            list.iter()
                                .filter_map(serde_json::Value::as_str)
                                .map(str::to_owned)
                                .collect()
                        });
                        match element.attributes.iter_mut().find(|(one, _)| one == name) {
                            Some(slot) => slot.1 = values,
                            None => element.attributes.push((name.clone(), values)),
                        }
                    }
                }
                for (key, into) in [("parts", &mut element.parts), ("hooks", &mut element.hooks)] {
                    for name in strings(entry.get(key)) {
                        match into.iter_mut().find(|(one, _)| *one == name) {
                            Some(slot) => {
                                slot.1.insert(lint.package.clone());
                            }
                            None => into.push((name, BTreeSet::from([lint.package.clone()]))),
                        }
                    }
                }
            }
        }
        index
    }
}

fn strings(value: Option<&serde_json::Value>) -> Vec<String> {
    value
        .and_then(serde_json::Value::as_array)
        .map(|list| {
            list.iter()
                .filter_map(serde_json::Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

/// Where each installed Helix package's lint data is, nearest first.
///
/// **The page's two tiers lead**, `@fusion.dev/helix` and then
/// `@fusion.dev/helix-headless`, and any other Helix package that publishes
/// lint data follows in name order.
pub fn find(root: &Path) -> Vec<PathBuf> {
    let mut found: BTreeMap<String, PathBuf> = BTreeMap::new();
    let mut at = Some(root);
    while let Some(dir) = at {
        let scope = dir.join("node_modules").join("@fusion.dev");
        if let Ok(entries) = std::fs::read_dir(&scope) {
            for entry in entries.flatten() {
                let name = format!("@fusion.dev/{}", entry.file_name().to_string_lossy());
                let lint = entry.path().join("lint.json");
                if lint.is_file() && !found.contains_key(&name) {
                    found.insert(name, lint);
                }
            }
        }
        at = dir.parent();
    }
    let lead = ["@fusion.dev/helix", "@fusion.dev/helix-headless"];
    let mut ordered: Vec<PathBuf> = lead.iter().filter_map(|name| found.remove(*name)).collect();
    ordered.extend(found.into_values());
    ordered
}

/// Reads each lint data file, saying which one could not be read and why.
pub fn read(paths: &[PathBuf]) -> Result<Vec<LintData>, String> {
    paths
        .iter()
        .map(|path| {
            let text = std::fs::read_to_string(path)
                .map_err(|error| format!("{}: {error}", path.display()))?;
            serde_json::from_str(&text).map_err(|error| format!("{}: {error}", path.display()))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{Allows, Index, LintData};

    fn lint(package: &str, tags: &serde_json::Value) -> LintData {
        LintData {
            package: package.to_owned(),
            tags: tags.as_object().expect("an object").clone(),
            version: Some("1.0.0".to_owned()),
        }
    }

    #[test]
    fn tiers_merge_in_order_and_keep_their_publishers() {
        let index = Index::of(&[
            lint(
                "@fusion.dev/helix",
                &serde_json::json!({ "helix-card": { "attributes": { "tone": ["primary"] }, "family": "card", "hooks": ["--card-gap"], "parts": ["body"], "written": [] } }),
            ),
            lint(
                "@fusion.dev/helix-headless",
                &serde_json::json!({ "helix-card": { "attributes": { "tone": null }, "family": "card", "hooks": [], "parts": ["body", "media"], "written": [] } }),
            ),
        ]);
        let card = index.get("helix-card").expect("indexed");
        assert_eq!(card.family.as_deref(), Some("card"));
        assert_eq!(card.attribute("tone"), Some(Allows::Any));
        assert!(card.has_hook("--card-gap"));
        assert_eq!(card.parts.len(), 2);
        assert_eq!(card.parts[0].1.len(), 2);
    }
}
