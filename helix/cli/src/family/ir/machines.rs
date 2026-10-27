//! The machines an element runs, expanded from what its source declares.
//!
//! **A source declares behavior at the level a reader thinks of it**, as the
//! intermediate layer spec decided on October 11, 2026: a pressable part, and
//! a collection with the prop that holds its chosen item. This says which of
//! core's machines that is and what each binds to, so a renderer hosts the
//! machines it is told and reads no behavior of its own into a source.
//!
//! - A pressable part runs press, unless only the web draws it, bound to the part, the event it sends, the
//!   props behind its `disabled` and `busy`, and the one key that presses it
//!   where its `keys` names one. Without `keys`, Enter and Space both press
//!   it, as they press a button.
//! - An image runs load, unless only the web draws it, bound to the part,
//!   the prop behind its `src`, and the events it sends as it loads and as
//!   it fails.
//! - A layer runs layer, unless only the web draws it, bound to its part,
//!   the prop it stands open on, the part it is placed against, and the
//!   props behind its `modal`, `placement` and `closedby` where it binds them.
//! - An element that turns on and off runs toggle, bound to the pressable
//!   that `toggles`, the props that hold, seed, mix and fix its state, the
//!   prop behind that pressable's `disabled`, and the events a turn sends.
//! - An element a reader types into runs entry, bound to the field its text
//!   is typed in, the press that clears it where one does, the props that
//!   hold, seed and fix its text, the prop behind the field's `disabled`, and
//!   the events an edit sends.
//! - A form control that declares a `validation` runs validation, bound to
//!   the props it reads and to where its answer is held.
//! - A collection runs single selection, or multiple selection where it names
//!   a selection mode, with roving focus and typeahead over its items. The
//!   prop a collection's `presses` names, which makes each item a toggle
//!   button or a radio, is bound to its selection: a toggle group's single
//!   selection holds the pressed values under it, and a button group's
//!   multiple selection leaves it to the runtime. Where
//!   the tree marks the chosen item it runs the indicator, and where the
//!   collection lets items move it runs reorder. A set that keeps one item
//!   chosen binds the prop that says so to its selection, and one whose keys
//!   move only in a selection mode binds that prop to its roving focus. A set
//!   whose items turn on their own runs `toggle-set` alone, and one that
//!   mixes commands and choices runs `mixed-set` with roving focus and
//!   typeahead, its items each `mixed-item`. One whose items mark
//!   themselves runs `marked-set`, and one that names a `disclosed` state
//!   runs `disclosed`.
//! - A toolbar runs roving focus over the controls inside the part whose
//!   role is `toolbar`, bound to that part and to the props that turn it and
//!   stop its keys at the ends.
//! - A `clock` runs clock, bound to the derivation that says when it ticks.
//! - An element that declares a `delay` runs delay, bound to the prop that
//!   holds the wait, the prop that starts it again, and the state that holds
//!   while it runs.
//! - A `scroll` runs scroll, bound to the part that scrolls, the states it
//!   sets as the part stands, and the events sent as it moves and rests.
//! - `section` runs section, bound to the props that hold the section's id,
//!   its link's words, and its level.
//! - `sections` runs sections, bound to the value that holds the page's
//!   sections and the props and the event that say how they are followed.
//! - A `stack` runs stack, bound to the press that goes back, the event a
//!   move asks, the values it computes and the prop that holds the page
//!   showing, and an item that holds a `page` runs stack-row, bound to it.
//! - A `tour` runs tour, and a `stop` runs tour-stop, each bound to the
//!   names its source holds, as `machines_tour.rs` says.
//!
//! **Every name a binding holds is one [`super::super::resolve`] has already
//! held to the element**: a `sends`, a `bind()` on a part, and each field of
//! the collection. So an expansion cannot name what the element lacks, and
//! nothing here checks it twice.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use crate::family::api::{Api, Attribute, Binding, Collection, Node, NodeKind, TextEntry, Toggle};

#[path = "machines_controls.rs"]
mod controls;
use controls::{copied, load, roving_toolbar, validated};
#[path = "machines_delay.rs"]
mod delay;
use delay::{clocked, counted, delayed, queued};
#[path = "machines_layer.rs"]
mod layer;
use layer::layered;
#[path = "machines_marked.rs"]
mod marked;
use marked::{disclosed, indicator, marking};
#[path = "machines_mixed.rs"]
mod mixed;
use mixed::{mixed_item, mixing};
#[path = "machines_stack.rs"]
mod stack;
use stack::{stack_row, stacked};

#[path = "machines_notices.rs"]
mod notices;
use notices::noticing;
#[path = "machines_tour.rs"]
mod tour;
use tour::touring;
#[path = "machines_scroll.rs"]
mod scroll;
use scroll::{paged, scrolled, section_of, sectioned};

#[cfg(test)]
#[path = "machines_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "machines_image_tests.rs"]
mod image_tests;
/// One machine an element runs: its folder in core, and what each of its
/// bindings names in the element.
#[derive(Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
pub struct MachineUse {
    pub bind: BTreeMap<String, Bound>,
    pub machine: String,
}

/// What a binding names: an event the element sends, several it sends in
/// order, a key as `KeyboardEvent.key` names it, a part of its tree, or a
/// prop it takes.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Bound {
    /// A derivation in core, by its function's name, as a clock's `expires`.
    Derive(String),
    Event(String),
    /* Read-only in TypeScript, as the frozen form a renderer reads holds it. */
    Events(#[ts(type = "ReadonlyArray<string>")] Vec<String>),
    /// What the runtime holds a toggle's state in, as `page-motion`.
    Held(String),
    Key(String),
    Part(String),
    Prop(String),
    /// Several props, as the props whose change starts a clock again.
    Props(#[ts(type = "ReadonlyArray<string>")] Vec<String>),
    /// A region of the tree, by its slot's name, as the one a row holds its
    /// page in.
    Region(String),
    /// A state the element sets, as a loader's `waiting`.
    State(String),
}

/// The machines an element with this API and tree runs, the parts' presses
/// first, in the order the tree draws them, then its toggle.
pub fn expand(api: &Api, tree: &[Node]) -> Vec<MachineUse> {
    let mut uses = Vec::new();
    for node in nodes(tree) {
        /* A press only the web draws, as a switch's input, which a phone
        presses through the row around it, runs nothing on a phone. */
        let web_only = matches!(
            node.attributes.get("platform"),
            Some(Attribute::Text(platform)) if platform == "web"
        );
        /* A press drawn in two places under one name, as an app header's
        toggle, runs one machine. */
        if node.kind == NodeKind::Pressable && !web_only && !uses.contains(&press(node)) {
            uses.push(press(node));
        }
        if node.kind == NodeKind::Image && !web_only {
            uses.push(load(node));
        }
        if node.kind == NodeKind::Layer && !web_only {
            uses.push(layered(node));
        }
    }
    if let Some(toggle) = &api.toggle {
        uses.push(toggled(toggle, tree));
    }
    if let Some(entry) = &api.entry {
        uses.push(entered(entry, tree));
    }
    if let Some(collection) = &api.collection {
        uses.extend(if collection.mixes {
            mixing(collection)
        } else if collection.marked {
            marking(collection, tree)
        } else {
            collected(collection, tree)
        });
        uses.extend(collection.disclosed.as_deref().map(disclosed));
    }
    uses.extend(
        api.item
            .as_ref()
            .filter(|item| item.mixes())
            .map(mixed_item),
    );
    uses.extend(api.stack.as_ref().map(stacked));
    uses.extend(
        api.item
            .as_ref()
            .and_then(|item| item.page.as_deref())
            .map(stack_row),
    );
    if let Some(validation) = &api.validation {
        uses.push(validated(validation, api));
    }
    if let Some(toolbar) = &api.toolbar {
        uses.push(roving_toolbar(toolbar, tree));
    }
    if let Some(delay) = &api.delay {
        uses.push(delayed(delay));
    }
    uses.extend(api.copy.as_ref().map(|copy| copied(copy, tree)));
    /* The queue first, so the countdown reads whether the element waits. */
    if let Some(queue) = &api.queue {
        uses.push(queued(queue));
    }
    if let Some(countdown) = &api.countdown {
        uses.push(counted(countdown));
    }
    uses.extend(noticing(api).chain(touring(api)));
    uses.extend(api.clock.as_ref().and_then(clocked));
    uses.extend(api.scroll.as_ref().map(scrolled));
    uses.extend(api.page.as_ref().map(paged));
    uses.extend(api.section.as_ref().map(section_of));
    uses.extend(api.sections.as_ref().map(sectioned));
    uses
}

/// Every node of the tree, depth first in the order it is drawn.
pub(super) fn nodes(tree: &[Node]) -> impl Iterator<Item = &Node> {
    let mut pending: Vec<&Node> = tree.iter().rev().collect();
    std::iter::from_fn(move || {
        let node = pending.pop()?;
        pending.extend(node.children.iter().rev());
        Some(node)
    })
}

fn press(node: &Node) -> MachineUse {
    let mut bind = BTreeMap::from([("part".to_owned(), Bound::Part(node.name.clone()))]);
    if let Some(Attribute::Text(event)) = node.attributes.get("sends") {
        bind.insert("sends".to_owned(), Bound::Event(event.clone()));
    }
    for (attribute, name) in [("disabled", "disabled"), ("busy", "pending")] {
        if let Some(Attribute::Bound(Binding::Bind(prop))) = node.attributes.get(attribute) {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    if let Some(Attribute::Text(key)) = node.attributes.get("keys") {
        let key = if key == "space" { " " } else { "Enter" };
        bind.insert("keys".to_owned(), Bound::Key(key.to_owned()));
    }
    MachineUse {
        bind,
        machine: "press".to_owned(),
    }
}

/// The toggle, bound to the pressable that turns it and to the prop behind
/// that pressable's `disabled`.
fn toggled(toggle: &Toggle, tree: &[Node]) -> MachineUse {
    let mut bind = BTreeMap::new();
    if let Some(prop) = &toggle.checked {
        bind.insert("checked".to_owned(), Bound::Prop(prop.clone()));
    }
    if let Some(held) = &toggle.held {
        bind.insert("held".to_owned(), Bound::Held(held.clone()));
    }
    for (name, value) in [
        ("seed", &toggle.initial),
        ("mixed", &toggle.mixed),
        ("readonly", &toggle.readonly),
    ] {
        if let Some(prop) = value {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    for (name, value) in [
        ("before", &toggle.before),
        ("opens", &toggle.opens),
        ("closes", &toggle.closes),
        ("changes", &toggle.changes),
        ("closed", &toggle.closed),
    ] {
        if let Some(event) = value {
            bind.insert(name.to_owned(), Bound::Event(event.clone()));
        }
    }
    bind.extend(
        toggle
            .escapes
            .then(|| ("escapes".to_owned(), Bound::Key("Escape".to_owned()))),
    );
    match toggle.after.as_slice() {
        [] => {}
        [event] => {
            bind.insert("after".to_owned(), Bound::Event(event.clone()));
        }
        events => {
            bind.insert("after".to_owned(), Bound::Events(events.to_vec()));
        }
    }
    let part = nodes(tree).find(|node| {
        node.kind == NodeKind::Pressable
            && matches!(node.attributes.get("toggles"), Some(Attribute::Flag(true)))
    });
    if let Some(part) = part {
        bind.insert("part".to_owned(), Bound::Part(part.name.clone()));
        if let Some(Attribute::Bound(Binding::Bind(prop))) = part.attributes.get("disabled") {
            bind.insert("disabled".to_owned(), Bound::Prop(prop.clone()));
        }
    }
    MachineUse {
        bind,
        machine: "toggle".to_owned(),
    }
}

/// The entry, bound to the field its text is typed in, the press that
/// clears it, and the prop behind the field's `disabled`. **No machine of
/// core's holds it**: the web's element hears its `<input>`, and the native
/// runtime hosts it as `entry` over its `TextInput`.
fn entered(entry: &TextEntry, tree: &[Node]) -> MachineUse {
    let mut bind = BTreeMap::from([("value".to_owned(), Bound::Prop(entry.value.clone()))]);
    for (name, value) in [
        ("offers", &entry.offers),
        ("readonly", &entry.readonly),
        ("seed", &entry.initial),
    ] {
        if let Some(prop) = value {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    for (name, value) in [("blank", &entry.blank), ("shows", &entry.shows)] {
        if let Some(state) = value {
            bind.insert(name.to_owned(), Bound::State(state.clone()));
        }
    }
    for (name, value) in [
        ("before", &entry.before),
        ("change", &entry.change),
        ("clear", &entry.clear),
        ("input", &entry.input),
    ] {
        if let Some(event) = value {
            bind.insert(name.to_owned(), Bound::Event(event.clone()));
        }
    }
    if let Some(field) = nodes(tree).find(|node| node.kind == NodeKind::Field) {
        bind.insert("part".to_owned(), Bound::Part(field.name.clone()));
        if let Some(Attribute::Bound(Binding::Bind(prop))) = field.attributes.get("disabled") {
            bind.insert("disabled".to_owned(), Bound::Prop(prop.clone()));
        }
    }
    let clears = nodes(tree).find(|node| {
        node.kind == NodeKind::Pressable
            && matches!(node.attributes.get("clears"), Some(Attribute::Flag(true)))
    });
    if let Some(clears) = clears {
        bind.insert("clears".to_owned(), Bound::Part(clears.name.clone()));
    }
    MachineUse {
        bind,
        machine: "entry".to_owned(),
    }
}

/// A set whose items turn on their own, as a checkbox group's boxes: no
/// selection and no keys of its own, since each item turns itself and is a
/// stop of its own. No machine of core's holds it, so the native runtime
/// hosts it as `toggle-set`, which holds the values of the items that are on
/// and asks before an item turns, bound as a selection is, with the box that
/// turns every item where the set draws one.
fn toggle_set(collection: &Collection, mut bind: BTreeMap<String, Bound>) -> MachineUse {
    if let Some(all) = &collection.all {
        bind.insert("all".to_owned(), Bound::Prop(all.enabled.clone()));
        bind.insert("all-label".to_owned(), Bound::Prop(all.label.clone()));
        bind.insert("all-part".to_owned(), Bound::Part(all.part.clone()));
    }
    MachineUse {
        bind,
        machine: "toggle-set".to_owned(),
    }
}

fn collected(collection: &Collection, tree: &[Node]) -> Vec<MachineUse> {
    let prop = |name: &str, value: &Option<String>| {
        value
            .as_ref()
            .map(|value| (name.to_owned(), Bound::Prop(value.clone())))
    };
    let event = |name: &str, value: &Option<String>| {
        value
            .as_ref()
            .map(|value| (name.to_owned(), Bound::Event(value.clone())))
    };
    let after = match collection.after.as_slice() {
        [] => None,
        [one] => Some(("after".to_owned(), Bound::Event(one.clone()))),
        many => Some(("after".to_owned(), Bound::Events(many.to_vec()))),
    };
    let selection: BTreeMap<String, Bound> = [
        prop("chosen", &collection.chosen),
        prop("opens", &collection.opens),
        prop("seed", &collection.initial),
        prop("mode", &collection.mode),
        prop("behavior", &collection.behavior),
        prop("disabled", &collection.disabled),
        prop("readonly", &collection.readonly),
        prop("clears", &collection.clears),
        prop("presses", &collection.presses),
        prop("keeps", &collection.keeps),
        event("before", &collection.before),
        collection
            .chosen
            .as_ref()
            .filter(|_| collection.optional)
            .map(|chosen| ("optional".to_owned(), Bound::Prop(chosen.clone()))),
        after,
    ]
    .into_iter()
    .flatten()
    .collect();
    if collection.toggles {
        return vec![toggle_set(collection, selection)];
    }
    let mut uses = vec![
        MachineUse {
            bind: selection,
            machine: if collection.mode.is_some() {
                "multiple-selection"
            } else {
                "single-selection"
            }
            .to_owned(),
        },
        MachineUse {
            bind: [
                prop("manual", &collection.manual),
                prop("roves", &collection.roves),
            ]
            .into_iter()
            .flatten()
            .collect(),
            machine: "roving-focus".to_owned(),
        },
    ];
    /* A set whose keys have no letters, as a radio group's, runs no typeahead. */
    if !collection.keys.letterless {
        uses.push(MachineUse {
            bind: BTreeMap::new(),
            machine: "typeahead".to_owned(),
        });
    }
    uses.extend(indicator(tree));
    if let Some(reorder) = &collection.reorder {
        uses.push(MachineUse {
            bind: BTreeMap::from([
                ("after".to_owned(), Bound::Event(reorder.after.clone())),
                ("before".to_owned(), Bound::Event(reorder.before.clone())),
                ("enabled".to_owned(), Bound::Prop(reorder.enabled.clone())),
            ]),
            machine: "reorder".to_owned(),
        });
    }
    uses
}
