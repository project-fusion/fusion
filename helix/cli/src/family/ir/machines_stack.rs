//! The machines of a stack of pages and of a row that holds a page of its
//! own. **Core's `stack` walks the tree of rows**, which the web reads from
//! the document and the native runtime from the rows that registered with
//! their parent, so no machine of core's holds either.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::Stack;

/// A stack of pages, bound to the press that goes back, the event a move
/// asks first, the values it computes as it moves, and the prop that holds
/// the page showing.
pub(super) fn stacked(stack: &Stack) -> MachineUse {
    let mut bind = BTreeMap::from([("back".to_owned(), Bound::Part(stack.back.clone()))]);
    if let Some(event) = &stack.before {
        bind.insert("before".to_owned(), Bound::Event(event.clone()));
    }
    for (name, value) in [
        ("drilled", &stack.drilled),
        ("entered", &stack.entered),
        ("label", &stack.label),
        ("left", &stack.left),
    ] {
        if let Some(state) = value {
            bind.insert(name.to_owned(), Bound::State(state.clone()));
        }
    }
    for (name, value) in [("page", &stack.page), ("top", &stack.top)] {
        if let Some(prop) = value {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    MachineUse {
        bind,
        machine: "stack".to_owned(),
    }
}

/// A row that holds a page of its own, bound to the region that holds it.
pub(super) fn stack_row(page: &str) -> MachineUse {
    MachineUse {
        bind: BTreeMap::from([("page".to_owned(), Bound::Region(page.to_owned()))]),
        machine: "stack-row".to_owned(),
    }
}
