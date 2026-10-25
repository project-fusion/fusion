//! The machines of a set that mixes commands and choices, as a menu's rows
//! are, and of an item of one.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Collection, Item};

/// A set that mixes commands and choices: no selection, since it holds no
/// chosen value, with roving focus and typeahead over its items. **No
/// machine of core's holds it**, so the native runtime hosts it as
/// `mixed-set`, which turns the rest of an item's run off as the item turns
/// on, bound to the prop that disables every item where the set has one.
pub(super) fn mixing(collection: &Collection) -> Vec<MachineUse> {
    let prop = |name: &str, value: &Option<String>| {
        value
            .as_ref()
            .map(|value| (name.to_owned(), Bound::Prop(value.clone())))
    };
    let mut uses = vec![
        MachineUse {
            bind: prop("disabled", &collection.disabled).into_iter().collect(),
            machine: "mixed-set".to_owned(),
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
    if !collection.keys.letterless {
        uses.push(MachineUse {
            bind: BTreeMap::new(),
            machine: "typeahead".to_owned(),
        });
    }
    uses
}

/// An item of a set that mixes: the props that say what kind of item it is
/// and hold whether it is checked, and the event it asks before a press
/// turns it. Core's `menu-items` says what a press turns it to, and the
/// native runtime hosts it as `mixed-item`.
pub(super) fn mixed_item(item: &Item) -> MachineUse {
    let mut bind = BTreeMap::new();
    for (name, value) in [
        ("checkable", &item.checkable),
        ("checked", &item.checked),
        ("exclusive", &item.exclusive),
    ] {
        if let Some(prop) = value {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    if let Some(event) = &item.before {
        bind.insert("before".to_owned(), Bound::Event(event.clone()));
    }
    MachineUse {
        bind,
        machine: "mixed-item".to_owned(),
    }
}
