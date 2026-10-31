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

/// What an object inspector reads and sends, by the name the machine binds.
pub const INSPECTOR: &[(&str, Names)] = &[
    ("active", Names::Prop),
    ("copyLabel", Names::Prop),
    ("copyValueLabel", Names::Prop),
    ("defaultDepth", Names::Prop),
    ("emptyText", Names::Prop),
    ("expanded", Names::Prop),
    ("itemsLabel", Names::Prop),
    ("keysLabel", Names::Prop),
    ("label", Names::Prop),
    ("noMatchesLabel", Names::Prop),
    ("onActivate", Names::Event),
    ("onBeforeActivate", Names::Event),
    ("onBeforeClose", Names::Event),
    ("onBeforeOpen", Names::Event),
    ("onCopy", Names::Event),
    ("onToggle", Names::Event),
    ("renderValue", Names::Prop),
    ("resultsLabel", Names::Prop),
    ("treeLabel", Names::Prop),
    ("value", Names::Prop),
    ("windowed", Names::Prop),
];

/// What an object inspector computes for its parts, each read as `inspector.x`.
pub const INSPECTOR_COMPUTED: &[&str] = &[
    "blank", "copyName", "copyText", "list", "named", "said", "topped",
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

/// What a table reads and sends, by the name the machine binds.
pub const TABLE: &[(&str, Names)] = &[
    ("columns", Names::Prop),
    ("defaultExpanded", Names::Prop),
    ("defaultSelected", Names::Prop),
    ("defaultSort", Names::Prop),
    ("expanded", Names::Prop),
    ("grid", Names::Prop),
    ("label", Names::Prop),
    ("loadMore", Names::Prop),
    ("onBeforeExpand", Names::Event),
    ("onBeforeReorder", Names::Event),
    ("onBeforeSelect", Names::Event),
    ("onBeforeSort", Names::Event),
    ("onExpand", Names::Event),
    ("onLoadMore", Names::Event),
    ("onReorder", Names::Event),
    ("onSelect", Names::Event),
    ("onSort", Names::Event),
    ("reorderable", Names::Prop),
    ("selectable", Names::Prop),
    ("selected", Names::Prop),
    ("selectionBehavior", Names::Prop),
    ("selectionMode", Names::Prop),
    ("sort", Names::Prop),
    ("windowed", Names::Prop),
];

/// What a table computes for its parts, each read as `tableRoot.x`.
pub const TABLE_COMPUTED: &[&str] = &["empty", "every", "heads", "nests", "rows", "waiting"];

/// What a row of a table reads, by the name the machine binds.
pub const TABLE_ROW: &[(&str, Names)] = &[
    ("disabled", Names::Prop),
    ("href", Names::Prop),
    ("parent", Names::Prop),
    ("value", Names::Prop),
];

/// What a row of a table computes for its parts, each read as `tableRow.x`.
pub const TABLE_ROW_COMPUTED: &[&str] = &[
    "branch",
    "cells",
    "grips",
    "gripStill",
    "nests",
    "selectable",
    "selectedCell",
];

/// What a column of a table reads and sends, by the name the machine binds.
pub const TABLE_COLUMN: &[(&str, Names)] = &[
    ("field", Names::Prop),
    ("onBeforeResize", Names::Event),
    ("onResized", Names::Event),
    ("resizable", Names::Prop),
    ("resizeLabel", Names::Prop),
    ("sortable", Names::Prop),
    ("textAlign", Names::Prop),
    ("width", Names::Prop),
    ("widthLabel", Names::Prop),
];

/// What a column of a table computes for its parts, each read as `tableColumn.x`.
pub const TABLE_COLUMN_COMPUTED: &[&str] = &["movable", "sorts", "still"];

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

/// `inspector({ ... })`, each field a name.
pub fn inspector(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "inspector", INSPECTOR, INSPECTOR_COMPUTED)
}

/// `tableRoot({ ... })`, each field a name.
pub fn table(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tableRoot", TABLE, TABLE_COMPUTED)
}

/// `tableRow({ ... })`, each field a name.
pub fn table_row(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tableRow", TABLE_ROW, TABLE_ROW_COMPUTED)
}

/// `tableColumn({ ... })`, each field a name.
pub fn table_column(lit: &Lit) -> Result<TreeChoice, String> {
    read(lit, "tableColumn", TABLE_COLUMN, TABLE_COLUMN_COMPUTED)
}

/// A tree, an inspector, or a part of a table, by the key its source writes it under.
pub(super) fn by_key(key: &str, value: &Lit) -> Result<TreeChoice, String> {
    match key {
        "treeRoot" => tree(value),
        "treeItem" => tree_item(value),
        "tableRoot" => table(value),
        "tableRow" => table_row(value),
        "tableColumn" => table_column(value),
        _ => inspector(value),
    }
}
