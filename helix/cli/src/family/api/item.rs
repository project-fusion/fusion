//! The item an element joins a collection as, by the family that holds it.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// The collection an element joins, by the family that holds it.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Item {
    /// The cancelable event an item of a set that mixes sends before a
    /// press turns it, its detail the `checked` the press asks for, as a
    /// menu item's `before-check`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The prop that makes the item a choice that turns on and off where it
    /// is not checked yet, in a set that mixes, as a menu item's
    /// `checkable`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkable: Option<String>,
    /// The prop that holds whether the item is checked, in a set that
    /// mixes, which seeds the item a press then turns.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked: Option<String>,
    /// Whether pressing the item chooses it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chooses: Option<bool>,
    /// The item's own prop that says whether its event closes the element
    /// its set's `closes` names, where it holds a value, over the element's
    /// own, as a menu row's `close-on-select`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closes: Option<String>,
    /// The prop that makes the item one of a run of which one is checked, in
    /// a set that mixes, as a menu item's `exclusive`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exclusive: Option<String>,
    /// The prop that says the item is the one its set chooses, where it is
    /// not `selected`, as a step is `current`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flag: Option<String>,
    /// The prop its set fills with the name of the item's grip while items
    /// can move.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grip: Option<String>,
    /// The regions whose words name the item, in order, where its default
    /// region alone does not: what typeahead matches, and what the item
    /// stands for in its set's value where it has no `value`, as a tag's
    /// category and label are.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<String>>")]
    #[schemars(default)]
    pub named: Vec<String>,
    /// The family whose collection it joins.
    pub of: String,
    /// The region that holds the item's own page, where the element it
    /// joins shows a stack of pages, as a drilldown row's `page`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<String>,
    /// The item's own state that holds while its set chooses it, where the
    /// set is in a selection mode, as a Button in a Button Group is
    /// `pressed`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    /// The prop that holds what the item stands for in its set, where it has
    /// no `value`, as a navigation's destination stands for its `href`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

impl Item {
    /// Whether the item is one of a set that mixes commands and choices:
    /// it names the prop that holds whether it is checked.
    pub fn mixes(&self) -> bool {
        self.checked.is_some()
    }

    /// The names the item holds as an item of a set that mixes, where a
    /// source writes them, and what each names.
    pub fn mixed_references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("before", self.before.as_deref(), Names::Event),
            ("checkable", self.checkable.as_deref(), Names::Prop),
            ("checked", self.checked.as_deref(), Names::Prop),
            ("closes", self.closes.as_deref(), Names::Prop),
            ("exclusive", self.exclusive.as_deref(), Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name, names)))
        .collect()
    }
}

/// `item(family, { before?, checkable?, checked?, chooses?, closes?,
/// exclusive?, flag?, grip?, named?, page?, state?, value? })`.
pub fn item(lit: &Lit) -> Result<Item, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`item` is a call to `item()`".to_owned());
    };
    let (true, Some(Lit::Text(of))) = (helper == "item", arguments.first()) else {
        return Err("`item()` takes the family it joins first".to_owned());
    };
    let mut item = Item {
        of: of.clone(),
        ..Item::default()
    };
    if let Some(Lit::Object(fields)) = arguments.get(1) {
        for (key, value) in fields {
            match (key.as_str(), value) {
                ("chooses", Lit::Bool(chooses)) => item.chooses = Some(*chooses),
                ("named", Lit::Array(regions)) => {
                    for region in regions {
                        let Lit::Text(region) = region else {
                            return Err("item: `named` lists regions by name".to_owned());
                        };
                        item.named.push(region.clone());
                    }
                }
                (key, Lit::Text(name)) => {
                    let slot = match key {
                        "before" => &mut item.before,
                        "checkable" => &mut item.checkable,
                        "checked" => &mut item.checked,
                        "closes" => &mut item.closes,
                        "exclusive" => &mut item.exclusive,
                        "flag" => &mut item.flag,
                        "grip" => &mut item.grip,
                        "page" => &mut item.page,
                        "state" => &mut item.state,
                        "value" => &mut item.value,
                        _ => return Err(format!("item: `{key}` is not a field it has")),
                    };
                    *slot = Some(name.clone());
                }
                (key, _) => return Err(format!("item: `{key}` is not a field it has")),
            }
        }
    }
    let unchecked = item.checked.is_none()
        && (item.checkable.is_some() || item.exclusive.is_some() || item.before.is_some());
    if unchecked {
        return Err(
            "item: an item that is `checkable`, `exclusive`, or asks `before` names the prop that holds whether it is `checked`"
                .to_owned(),
        );
    }
    Ok(item)
}
