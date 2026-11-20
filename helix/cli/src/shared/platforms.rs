//! What each Helix tag is on a phone, read from the installed packages.
//!
//! **The packages' own description, as `helix api` reads it.** `api.json`
//! names, for each element a phone draws, the properties and events its
//! component leaves out. An element with no such record is the web's alone,
//! unless the package exports its entry under the `react-native` condition,
//! which is how a family written for shared screens that draws nothing on a
//! phone, such as Skip Link, ships.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use serde_json::Value;

/// What one tag is on a phone.
#[derive(Debug, Default)]
pub struct Tag {
    /// The family's name as a reader knows it, such as `Dialog`.
    pub family: String,
    /// Whether a phone has a component for it.
    pub native: bool,
    /// The properties a phone leaves out, as [`key`] writes them.
    pub omitted: HashSet<String>,
    /// The events the web element sends that a phone's component does not.
    pub web_events: HashSet<String>,
    /// The custom properties that are its hooks, such as `--qr-code-size`,
    /// which a phone reads from a `style` in shared code.
    pub hooks: HashSet<String>,
}

/// Every tag the installed packages describe.
#[derive(Debug, Default)]
pub struct Platforms {
    pub tags: HashMap<String, Tag>,
}

/// A property's name with case and hyphens taken out, so `max-items` and
/// `maxItems` are one name.
pub fn key(name: &str) -> String {
    name.chars()
        .filter(|one| *one != '-')
        .map(|one| one.to_ascii_lowercase())
        .collect()
}

impl Platforms {
    /// The tags the installed packages describe, from `from` up.
    pub fn installed(from: &Path) -> Self {
        let mut platforms = Self::default();
        for package in crate::api::documented(from, "api.json") {
            let Some(api) = read(&package.file) else {
                continue;
            };
            let manifest = read(&package.dir.join("package.json")).unwrap_or(Value::Null);
            platforms.add(&api, &manifest["exports"]);
        }
        platforms
    }

    /// Adds one package's elements. A tag an earlier package described keeps
    /// that description, the styled tier's before the headless tier's.
    pub fn add(&mut self, api: &Value, exports: &Value) {
        let families = api["families"].as_array().map_or(&[][..], Vec::as_slice);
        for family in families {
            let label = family["label"].as_str().unwrap_or_default();
            let elements = family["elements"].as_array().map_or(&[][..], Vec::as_slice);
            for element in elements {
                let Some(tag) = element["tagName"].as_str() else {
                    continue;
                };
                if self.tags.contains_key(tag) {
                    continue;
                }
                self.tags
                    .insert(tag.to_owned(), described(label, element, exports));
            }
        }
    }
}

/// One element as a phone has it.
fn described(label: &str, element: &Value, exports: &Value) -> Tag {
    let phone = &element["platforms"]["react-native"];
    let entry = element["entry"].as_str().unwrap_or_default();
    let exported = exports[format!("./{entry}")].get("react-native").is_some();
    let names = |list: &Value, field: Option<&str>| -> HashSet<String> {
        list.as_array()
            .map_or(&[][..], Vec::as_slice)
            .iter()
            .filter_map(|one| field.map_or(one.as_str(), |field| one[field].as_str()))
            .map(str::to_owned)
            .collect()
    };
    if phone.is_null() {
        return Tag {
            family: label.to_owned(),
            native: exported,
            ..Tag::default()
        };
    }
    let sent = names(&phone["events"], Some("name"));
    Tag {
        hooks: names(&element["cssProperties"], Some("name")),
        family: label.to_owned(),
        native: true,
        omitted: names(&phone["omitted"], None)
            .iter()
            .map(|name| key(name))
            .collect(),
        web_events: names(&element["events"], Some("name"))
            .into_iter()
            .filter(|name| !sent.contains(name))
            .collect(),
    }
}

fn read(path: &Path) -> Option<Value> {
    serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()
}
