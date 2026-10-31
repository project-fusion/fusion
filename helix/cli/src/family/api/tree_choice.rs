//! How the elements of a tree say so, as a source's `treeRoot` and `treeItem`: the
//! props, states, and events each machine reads, and the values an item
//! computes for its parts. The web's elements hold all of it themselves, and a
//! phone hosts the `tree` and `tree-item` machines.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// What the element around the items reads and sends, by the name the machine
/// binds, each value a name of the source.
pub const TREE: &[(&str, Names)] = &[
    ("active", Names::Prop),
    ("canceledLabel", Names::Prop),
    ("chevronPlacement", Names::Prop),
    ("defaultActive", Names::Prop),
    ("droppedLabel", Names::Prop),
    ("label", Names::Prop),
    ("movedIntoLabel", Names::Prop),
    ("movedLabel", Names::Prop),
    ("nesting", Names::Prop),
    ("onBeforeChange", Names::Event),
    ("onBeforeReorder", Names::Event),
    ("onChange", Names::Event),
    ("onReorder", Names::Event),
    ("pickedUpLabel", Names::Prop),
    ("reorderable", Names::Prop),
    ("selectionMode", Names::Prop),
];

/// What an item reads and sends, by the name the machine binds.
pub const TREE_ITEM: &[(&str, Names)] = &[
    ("disabled", Names::Prop),
    ("href", Names::Prop),
    ("lazy", Names::Prop),
    ("onBeforeSelect", Names::Event),
    ("onLoad", Names::Event),
    ("rel", Names::Prop),
    ("target", Names::Prop),
    ("value", Names::Prop),
];

/// What an item computes for its parts, each read as `treeItem.x`. The element
/// around them computes `empty`, read as `treeRoot.empty`.
pub const COMPUTED: &[&str] = &[
    "branch",
    "checkable",
    "checkMark",
    "chevronEnd",
    "chevronLabel",
    "chevronStart",
    "dashMark",
    "grip",
    "heading",
    "leaf",
    "level",
    "linked",
    "nested",
    "place",
    "reserved",
    "subordinate",
];

/// One element's reading of a tree: each name it binds, by the machine's name
/// for it, and what the element computes.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct TreeChoice {
    /// What the machine binds, by its own name.
    pub bind: BTreeMap<String, String>,
    /// What the element computes, by the field's name.
    pub computed: BTreeMap<String, String>,
}

impl TreeChoice {
    /// Each name the element holds, and what it names, from `table`. What the
    /// element computes is its own, and names nothing.
    pub fn references<'a>(
        &'a self,
        table: &'static [(&'static str, Names)],
    ) -> Vec<(&'static str, &'a str, Names)> {
        table
            .iter()
            .filter_map(|(at, names)| self.bind.get(*at).map(|name| (*at, name.as_str(), *names)))
            .collect()
    }
}

/// Reads one element's fields, by the table of what it binds and whether it
/// computes.
fn read(
    lit: &Lit,
    feature: &str,
    table: &[(&str, Names)],
    computes: &[&str],
) -> Result<TreeChoice, String> {
    let mut choice = TreeChoice::default();
    for (key, name) in fields(lit, feature)? {
        if computes.contains(&key) {
            choice.computed.insert(key.to_owned(), name.to_owned());
        } else if table.iter().any(|(at, _)| *at == key) {
            choice.bind.insert(key.to_owned(), name.to_owned());
        } else {
            return Err(format!("{feature}: `{key}` is not a field it has"));
        }
    }
    Ok(choice)
}

/// `treeRoot({ ... })`, each field a name.
pub fn tree(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "treeRoot", TREE, &["empty"])
}

/// `treeItem({ ... })`, each field a name.
pub fn tree_item(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "treeItem", TREE_ITEM, COMPUTED)
}
