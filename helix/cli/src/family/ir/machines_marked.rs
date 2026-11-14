//! The machines of a set whose items say themselves which is current, as a
//! navigation's destinations do, the mark that travels to an item, and the
//! state an element is in while an element among its items stands open.

use std::collections::BTreeMap;

use super::{nodes, Bound, MachineUse};
use crate::family::api::{Attribute, Collection, Node};

/// The indicator, where the tree draws a box that marks the chosen item,
/// bound to that box.
pub(super) fn indicator(tree: &[Node]) -> Option<MachineUse> {
    let mark = nodes(tree).find(|node| {
        matches!(node.attributes.get("marks"), Some(Attribute::Text(marks)) if marks == "chosen")
    })?;
    Some(MachineUse {
        bind: BTreeMap::from([("mark".to_owned(), Bound::Part(mark.name.clone()))]),
        machine: "indicator".to_owned(),
    })
}

/// A set whose items mark themselves: no selection, since the page writes
/// each item's flag, with roving focus over its items and the indicator at
/// the item flagged. **No machine of core's holds it**, so the native
/// runtime hosts it as `marked-set`, which reads the flags its items join
/// with. Its keys have no letters, so it runs no typeahead.
pub(super) fn marking(collection: &Collection, tree: &[Node]) -> Vec<MachineUse> {
    let roves = collection
        .roves
        .as_ref()
        .map(|prop| ("roves".to_owned(), Bound::Prop(prop.clone())));
    let mut uses = vec![
        MachineUse {
            bind: BTreeMap::new(),
            machine: "marked-set".to_owned(),
        },
        MachineUse {
            bind: roves.into_iter().collect(),
            machine: "roving-focus".to_owned(),
        },
    ];
    if !collection.keys.letterless {
        uses.push(MachineUse {
            bind: BTreeMap::new(),
            machine: "typeahead".to_owned(),
        });
    }
    uses.extend(indicator(tree));
    uses
}

/// The state an element is in while an element drawn among its items stands
/// open, bound to that state. The native runtime hosts it as `disclosed`.
pub(super) fn disclosed(state: &str) -> MachineUse {
    MachineUse {
        bind: BTreeMap::from([("state".to_owned(), Bound::State(state.to_owned()))]),
        machine: "disclosed".to_owned(),
    }
}
