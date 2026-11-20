//! How a family's elements find each other: the collection one element
//! holds, and the item each of the others joins it as.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::collection_fields::{
    closes, counts, kept, keys, removes, reorder, Closes, Counts, Removes, Reorder,
};
use super::toggling::{all, All};
use crate::family::read::Lit;

/// What the items that join an element share. Tabs and their panels join a
/// tab set, which holds the value of the one chosen.
///
/// Its flags are four kinds of set a source writes one key each for, which
/// `kept` holds apart, so they stay four fields.
#[allow(clippy::struct_excessive_bools)]
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Collection {
    /// The box that turns every item at once, in a set whose items turn.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub all: Option<All>,
    /// The events sent once the chosen item has changed, in order, as a radio
    /// group sends `input` and then `change`.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<String>>")]
    #[schemars(default)]
    pub after: Vec<String>,
    /// The event sent before it changes, which a handler can cancel.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The prop that says what a press does to the items already chosen.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub behavior: Option<String>,
    /// The prop that holds the chosen item's value. A set of opening items
    /// may have none, as an accordion holds no value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chosen: Option<String>,
    /// The prop that lets a press on the chosen item take it back, so the
    /// set holds no choice, as a toggle group's `allow-empty-selection`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clears: Option<String>,
    /// The item's event that closes the element's toggle once it stands, in
    /// a set that mixes, as a menu closes as a row is chosen, or in a set
    /// whose items mark themselves, as a megamenu closes as a destination is
    /// chosen, where it names the items' own event.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closes: Option<Closes>,
    /// The prop that disables every item while it holds, as a disabled radio
    /// group does, and gives each its own state back once it does not.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled: Option<String>,
    /// The state the element is in while an element drawn among its items
    /// stands open, as a navigation is `open` while a megamenu is.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disclosed: Option<String>,
    /// How the items are numbered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub counts: Option<Counts>,
    /// The state set while no item has joined.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub empty: Option<String>,
    /// The prop that seeds the chosen value where nothing sets it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial: Option<String>,
    /// The prop that refuses a press that would leave nothing chosen, as a
    /// button group's `disallow-empty-selection` does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keeps: Option<String>,
    /// How the keys move among the items.
    pub keys: Keys,
    /// The prop that names the set, which a phone announces on the element
    /// itself where no part carries the set's role, as a button group's: a
    /// radio group where its items are radios, a toolbar where they are
    /// toggle buttons and no toolbar is around it, and a group otherwise.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    /// The prop that stops focus arriving on an item from choosing it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manual: Option<String>,
    /// Whether the items say themselves which is current, each by its
    /// `flag`, as a navigation's destinations do: no chosen value, and a
    /// press chooses nothing.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub marked: bool,
    /// The prop that says how many items a reader can choose.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    /// Whether the set mixes commands, choices that turn on and off, and
    /// runs of choices of which one is on, as a menu's rows do. It holds no
    /// chosen value: each choice holds whether it is checked.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub mixes: bool,
    /// The prop that says how many of a set's opening items stand open, as an
    /// accordion's `mode`: any number where it holds nothing or `multiple`,
    /// one under `single`, and one or none under `single-collapsible`. Its
    /// items turn on their own, so the set says `toggles: true` too.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opens: Option<String>,
    /// The prop that says how the items are pressed, as a toggle group's and
    /// a button group's `selection-mode`. Where it says `multiple`, each item
    /// is a toggle button that presses on its own: the chosen prop holds the
    /// pressed values, the keys move focus without pressing, and no item is
    /// marked. Under any other value each item is a radio, and the set is a
    /// radio group. Where `roves` names a prop that holds nothing, each item
    /// is a control of its own and is neither.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presses: Option<String>,
    /// Whether the set may hold no choice, as a radio group does until a
    /// reader answers, where a tab set always has one. It opens on the item
    /// whose `selected` its markup writes, and on nothing where none does.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub optional: bool,
    /// The order the chosen prop holds the values in: `pressed`, where a
    /// press that adds an item puts its value after the others and one that
    /// takes an item out leaves the rest as they were, as a tag group's
    /// value is written. A Shift range and Control or Command with A write
    /// the values in the order the items stand. Absent, every change writes
    /// them in that order, as a list's does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<String>,
    /// The prop that keeps a reader from changing the choice, while the keys
    /// still move focus among the items, as a read-only radio group does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readonly: Option<String>,
    /// The prop that must hold a value for the set to be one stop whose
    /// arrow keys move among its items. Until it does, each item is a control
    /// of its own, as a button group's buttons are without a selection mode.
    /// A set whose items take Space and Enter as their own press, as
    /// `keys.selects: false` says, moves nothing inside a toolbar either: its
    /// items are the toolbar's controls, and the toolbar's arrow keys walk
    /// them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roves: Option<String>,
    /// How a reader moves an item to a new place.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reorder: Option<Reorder>,
    /// How a reader removes an item, as a tag group's tags are removed: the
    /// event the item's press asks with, which Delete and Backspace on the
    /// item send too, and the part focus goes to once no item is left.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removes: Option<Removes>,
    /// Whether the items turn on their own, as a checkbox group's boxes do:
    /// the chosen prop holds the values of those that are on, a turn asks
    /// the set before it moves, and each item is a stop of its own.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub toggles: bool,
}

/// How the keys move among a collection's items, which differs by family: a
/// tab set comes round from its last tab and chooses where focus arrives, and
/// a list stops at its ends, only moves focus, and leaves Left and Right to
/// its rows.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Keys {
    /// Where Control or Command with Space adds or takes out the item:
    /// `replace`, only under the `replace` selection behavior in a set that
    /// chooses many, as a tag group's does, and nowhere else. Absent, wherever
    /// Space presses the item, as a list's does.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub adds: Option<String>,
    /// The prop that says which way the items run, where only the arrows
    /// along it move focus: Up and Down under `vertical`, and Left and Right
    /// otherwise. The arrows across it are left to the page, as a sequence
    /// of steps leaves them. Absent, both pairs move focus.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub along: Option<String>,
    /// Whether arriving on an item chooses it, where the collection's `manual`
    /// prop does not say otherwise. Arriving on a link chooses nothing.
    pub chooses: bool,
    /// The keys the items keep for themselves, which move no focus.
    pub keeps: Vec<String>,
    /// What Enter does on an item that is no link: `selects`, as Space
    /// does, as a tag group's Enter selects a tag. Absent, Enter acts on the
    /// item, as a list's acts on a row.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub enter: Option<String>,
    /// Where Escape lets go of the selection: `plain`, only with neither
    /// Control nor Command held, as a tag group's does. Absent, with either
    /// held too, as a list's does.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub escape: Option<String>,
    /// Whether a typed letter moves focus to the item whose words start with
    /// it. A radio group's keys have no letters.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub letterless: bool,
    /// Whether Space and Enter on an item go to the set's selection, as a
    /// list's do. `false` leaves them to the item's own press, which chooses
    /// it as a tap does, as a button group's buttons are pressed. Absent,
    /// they go to the selection.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub selects: Option<bool>,
    /// Whether a move past the last item comes round to the first.
    pub wrap: bool,
}

/// What a name in a collection names.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Names {
    Event,
    Part,
    Prop,
    State,
}

impl Names {
    /// The word a sentence says it with.
    pub fn word(self) -> &'static str {
        match self {
            Self::Event => "event",
            Self::Part => "part",
            Self::Prop => "prop",
            Self::State => "state",
        }
    }
}

impl Collection {
    /// Each name the collection holds, where a source writes it, and what it
    /// names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut fields: Vec<(&'static str, Option<&String>, Names)> = self
            .after
            .iter()
            .map(|event| ("after", Some(event), Names::Event))
            .collect();
        fields.extend([
            ("before", self.before.as_ref(), Names::Event),
            ("behavior", self.behavior.as_ref(), Names::Prop),
            ("chosen", self.chosen.as_ref(), Names::Prop),
            ("clears", self.clears.as_ref(), Names::Prop),
            ("disabled", self.disabled.as_ref(), Names::Prop),
            ("disclosed", self.disclosed.as_ref(), Names::State),
            ("empty", self.empty.as_ref(), Names::State),
            ("initial", self.initial.as_ref(), Names::Prop),
            ("keeps", self.keeps.as_ref(), Names::Prop),
            ("label", self.label.as_ref(), Names::Prop),
            ("manual", self.manual.as_ref(), Names::Prop),
            ("mode", self.mode.as_ref(), Names::Prop),
            ("opens", self.opens.as_ref(), Names::Prop),
            ("presses", self.presses.as_ref(), Names::Prop),
            ("readonly", self.readonly.as_ref(), Names::Prop),
            ("roves", self.roves.as_ref(), Names::Prop),
            ("keys.along", self.keys.along.as_ref(), Names::Prop),
        ]);
        if let Some(all) = &self.all {
            fields.extend([
                ("all.enabled", Some(&all.enabled), Names::Prop),
                ("all.label", Some(&all.label), Names::Prop),
                ("all.part", Some(&all.part), Names::Part),
            ]);
        }
        if let Some(counts) = &self.counts {
            fields.extend([
                ("counts.reversed", counts.reversed.as_ref(), Names::Prop),
                ("counts.start", counts.start.as_ref(), Names::Prop),
            ]);
        }
        /* A set whose items mark themselves sends nothing of its own, so its
        `closes` names its items' event, which their own element declares. */
        if let Some(closes) = &self.closes {
            fields.extend([
                (
                    "closes.event",
                    (!self.marked).then_some(&closes.event),
                    Names::Event,
                ),
                ("closes.while", closes.r#while.as_ref(), Names::Prop),
            ]);
        }
        if let Some(removes) = &self.removes {
            fields.extend([
                ("removes.event", Some(&removes.event), Names::Event),
                ("removes.empty", removes.empty.as_ref(), Names::Part),
            ]);
        }
        if let Some(reorder) = &self.reorder {
            fields.extend([
                ("reorder.after", Some(&reorder.after), Names::Event),
                ("reorder.before", Some(&reorder.before), Names::Event),
                ("reorder.canceled", reorder.canceled.as_ref(), Names::Prop),
                ("reorder.dropped", reorder.dropped.as_ref(), Names::Prop),
                ("reorder.enabled", Some(&reorder.enabled), Names::Prop),
                ("reorder.move", Some(&reorder.r#move), Names::Prop),
                ("reorder.moved", reorder.moved.as_ref(), Names::Prop),
                ("reorder.picked", reorder.picked.as_ref(), Names::Prop),
                ("reorder.preview", reorder.preview.as_ref(), Names::Part),
            ]);
        }
        fields
            .into_iter()
            .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)))
            .collect()
    }
}

/// `collection({ chosen, ... })`, each field a name, `counts` and `reorder`
/// each an object of names.
pub fn collection(lit: &Lit) -> Result<Collection, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`collection` is a call to `collection()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "collection", arguments.as_slice()) else {
        return Err("`collection` is a call to `collection()` with an object".to_owned());
    };
    let mut collection = Collection::default();
    let mut chosen = None;
    let mut moves = None;
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("all", Lit::Object(fields)) => collection.all = Some(all(fields)?),
            ("closes", Lit::Object(fields)) => collection.closes = Some(closes(fields)?),
            ("counts", Lit::Object(fields)) => collection.counts = Some(counts(fields)?),
            ("toggles", Lit::Bool(toggles)) => collection.toggles = *toggles,
            ("mixes", Lit::Bool(mixes)) => collection.mixes = *mixes,
            ("marked", Lit::Bool(marked)) => collection.marked = *marked,
            ("keys", Lit::Object(fields)) => moves = Some(keys(fields)?),
            ("reorder", Lit::Object(fields)) => collection.reorder = Some(reorder(fields)?),
            ("removes", Lit::Object(fields)) => collection.removes = Some(removes(fields)?),
            ("optional", Lit::Bool(optional)) => collection.optional = *optional,
            ("order", Lit::Text(order)) if order == "pressed" => {
                collection.order = Some(order.clone());
            }
            ("order", _) => {
                return Err(
                    "collection: `order` is `pressed`, where a press puts its item's value after the others"
                        .to_owned(),
                )
            }
            ("after", Lit::Array(events)) => {
                for event in events {
                    let Lit::Text(event) = event else {
                        return Err("collection: `after` names events".to_owned());
                    };
                    collection.after.push(event.clone());
                }
            }
            ("after", Lit::Text(event)) => collection.after.push(event.clone()),
            (key, Lit::Text(name)) => {
                let slot = match key {
                    "before" => &mut collection.before,
                    "behavior" => &mut collection.behavior,
                    "chosen" => &mut chosen,
                    "clears" => &mut collection.clears,
                    "disabled" => &mut collection.disabled,
                    "disclosed" => &mut collection.disclosed,
                    "empty" => &mut collection.empty,
                    "initial" => &mut collection.initial,
                    "keeps" => &mut collection.keeps,
                    "label" => &mut collection.label,
                    "manual" => &mut collection.manual,
                    "mode" => &mut collection.mode,
                    "opens" => &mut collection.opens,
                    "presses" => &mut collection.presses,
                    "readonly" => &mut collection.readonly,
                    "roves" => &mut collection.roves,
                    _ => return Err(format!("collection: `{key}` is not a field it has")),
                };
                *slot = Some(name.clone());
            }
            (key, _) => return Err(format!("collection: `{key}` is not a field it has")),
        }
    }
    kept(&collection, chosen.as_deref())?;
    collection.chosen = chosen;
    /* Each item that turns is a stop of its own, so its keys are its own. */
    collection.keys =
        match moves {
            Some(moves) => moves,
            None if collection.toggles => Keys::default(),
            None => return Err(
                "a collection says how its keys move, as `keys: { loop, selectionFollowsFocus }`"
                    .to_owned(),
            ),
        };
    Ok(collection)
}

#[cfg(test)]
#[path = "collection_tests.rs"]
mod tests;
