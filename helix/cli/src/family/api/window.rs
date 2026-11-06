//! How an element that windows a long set of items says so, as its source's
//! `window`: the props the window reads, the states it holds, the events it
//! sends, and the list of rows a repeat marked `windowed` draws.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// What an element that windows a long set of items reads and sends, as a
/// virtual list's rows.
///
/// **The web element windows its own rows in the light DOM, and a phone hosts
/// the `window` machine**, which gives the rows near the screen as the value
/// `list` names.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
#[serde(rename_all = "camelCase")]
#[ts(rename_all = "camelCase")]
pub struct WindowChoice {
    /// The prop that holds how many items a line holds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub columns: Option<String>,
    /// The prop that holds the keys of the items a reader cannot choose or move to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_keys: Option<String>,
    /// The state the element is in while it holds no items.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub empty: Option<String>,
    /// The prop that holds the length of one row before it is drawn.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimate: Option<String>,
    /// The prop that holds the space between two rows, and between two columns.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gap: Option<String>,
    /// The state the element is in while it runs across.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub horizontal: Option<String>,
    /// The prop that holds the items.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub items: Option<String>,
    /// The prop that names the field of each item that is its key.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_field: Option<String>,
    /// The prop that says how items of more than one column are laid out.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layout: Option<String>,
    /// The prop that says more items are on their way.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loading: Option<String>,
    /// The state the element is in while more items are on their way.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loading_state: Option<String>,
    /// The prop that holds the narrowest a column may be.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_column_width: Option<String>,
    /// The event sent before the chosen items change, which a handler can cancel.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_before_change: Option<String>,
    /// The event sent before an item moves, which a handler can cancel.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_before_reorder: Option<String>,
    /// The event sent once the chosen items changed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_change: Option<String>,
    /// The event sent once a reader comes within one screen of the end.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_load_more: Option<String>,
    /// The event sent as the items on screen change.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_range_change: Option<String>,
    /// The event sent once an item moved.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_reorder: Option<String>,
    /// The prop that says which way the list runs.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub orientation: Option<String>,
    /// The prop that lets a reader move items.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reorderable: Option<String>,
    /// The prop that names the field of each item that names its section.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section_field: Option<String>,
    /// The prop that says what a press does to the items already chosen.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_behavior: Option<String>,
    /// The prop that says how many items a reader can choose.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_mode: Option<String>,
    /// The prop that names the field of each item that typing matches.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_field: Option<String>,
    /// The prop that holds the keys of the chosen items.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    /// The value the element computes that holds the rows, which a repeat's
    /// `each` binds.
    pub list: String,
}

impl WindowChoice {
    /// Each name the window holds, where a source writes it, and what it
    /// names. `list` is the element's own, and names nothing.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("columns", self.columns.as_ref(), Names::Prop),
            ("disabledKeys", self.disabled_keys.as_ref(), Names::Prop),
            ("empty", self.empty.as_ref(), Names::State),
            ("estimate", self.estimate.as_ref(), Names::Prop),
            ("gap", self.gap.as_ref(), Names::Prop),
            ("horizontal", self.horizontal.as_ref(), Names::State),
            ("items", self.items.as_ref(), Names::Prop),
            ("keyField", self.key_field.as_ref(), Names::Prop),
            ("layout", self.layout.as_ref(), Names::Prop),
            ("loading", self.loading.as_ref(), Names::Prop),
            ("loadingState", self.loading_state.as_ref(), Names::State),
            (
                "minColumnWidth",
                self.min_column_width.as_ref(),
                Names::Prop,
            ),
            (
                "onBeforeChange",
                self.on_before_change.as_ref(),
                Names::Event,
            ),
            (
                "onBeforeReorder",
                self.on_before_reorder.as_ref(),
                Names::Event,
            ),
            ("onChange", self.on_change.as_ref(), Names::Event),
            ("onLoadMore", self.on_load_more.as_ref(), Names::Event),
            ("onRangeChange", self.on_range_change.as_ref(), Names::Event),
            ("onReorder", self.on_reorder.as_ref(), Names::Event),
            ("orientation", self.orientation.as_ref(), Names::Prop),
            ("reorderable", self.reorderable.as_ref(), Names::Prop),
            ("sectionField", self.section_field.as_ref(), Names::Prop),
            (
                "selectionBehavior",
                self.selection_behavior.as_ref(),
                Names::Prop,
            ),
            ("selectionMode", self.selection_mode.as_ref(), Names::Prop),
            ("textField", self.text_field.as_ref(), Names::Prop),
            ("value", self.value.as_ref(), Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)))
        .collect()
    }

    /// Each name and what the machine binds it as.
    pub fn bound(&self) -> Vec<(&'static str, &str, Names)> {
        self.references()
    }
}

/// `window({ list, columns, ... })`, each field a name.
pub fn window(lit: &Lit) -> Result<WindowChoice, String> {
    let mut read = WindowChoice::default();
    for (key, name) in fields(lit, "window")? {
        let slot = match key {
            "list" => {
                name.clone_into(&mut read.list);
                continue;
            }
            "columns" => &mut read.columns,
            "disabledKeys" => &mut read.disabled_keys,
            "empty" => &mut read.empty,
            "estimate" => &mut read.estimate,
            "gap" => &mut read.gap,
            "horizontal" => &mut read.horizontal,
            "items" => &mut read.items,
            "keyField" => &mut read.key_field,
            "layout" => &mut read.layout,
            "loading" => &mut read.loading,
            "loadingState" => &mut read.loading_state,
            "minColumnWidth" => &mut read.min_column_width,
            "onBeforeChange" => &mut read.on_before_change,
            "onBeforeReorder" => &mut read.on_before_reorder,
            "onChange" => &mut read.on_change,
            "onLoadMore" => &mut read.on_load_more,
            "onRangeChange" => &mut read.on_range_change,
            "onReorder" => &mut read.on_reorder,
            "orientation" => &mut read.orientation,
            "reorderable" => &mut read.reorderable,
            "sectionField" => &mut read.section_field,
            "selectionBehavior" => &mut read.selection_behavior,
            "selectionMode" => &mut read.selection_mode,
            "textField" => &mut read.text_field,
            "value" => &mut read.value,
            key => return Err(format!("window: `{key}` is not a field it has")),
        };
        *slot = Some(name.to_owned());
    }
    if read.list.is_empty() {
        return Err("window: `list` names the value a repeat's `each` binds".to_owned());
    }
    Ok(read)
}
