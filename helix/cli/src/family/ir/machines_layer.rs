//! A layer's machine: what it binds of the layer node.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Attribute, Binding, Node};

/// A layer's machine, bound to its part, the prop it stands open on, the
/// part it is placed against and the part that points at it, and each prop
/// its `modal`, `offset`, `cross-offset`, `flip`, `placement`,
/// `presentation`, `closedby`, `target`, `edge`, `hint`, `holds`, `arrows`,
/// `snap` and `swipe` bind.
/// **No machine of core's holds it**: the web's element opens its `<dialog>`
/// or its popover, and the native runtime hosts it as `layer`, in the layer
/// host `HelixRoot` draws. A value written out is read from the node.
pub(super) fn layered(node: &Node) -> MachineUse {
    let mut bind = BTreeMap::from([("part".to_owned(), Bound::Part(node.name.clone()))]);
    for name in [
        "arrows",
        "closedby",
        "cross-offset",
        "edge",
        "flip",
        "hint",
        "holds",
        "modal",
        "offset",
        "open",
        "placement",
        "presentation",
        "snap",
        "swipe",
        "target",
    ] {
        if let Some(Attribute::Bound(Binding::Bind(prop))) = node.attributes.get(name) {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    for name in ["anchor", "arrow"] {
        if let Some(Attribute::Text(part)) = node.attributes.get(name) {
            bind.insert(name.to_owned(), Bound::Part(part.clone()));
        }
    }
    MachineUse {
        bind,
        machine: "layer".to_owned(),
    }
}
