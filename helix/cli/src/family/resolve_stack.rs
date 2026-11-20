//! The names a stack of pages reads, and the region an item holds its page
//! in.
//!
//! - A stack's `back` is a pressable the tree draws, its `before` an event a
//!   page can cancel, and its `page` a prop. Its `drilled` and `label` are
//!   values the element computes, which `bind()`, `when()`, and a rule's
//!   `state` read.
//! - **A stack's rows join its element's collection**, so an element that
//!   declares a `stack` holds one.
//! - An item's `page` names a region its tree holds.

use super::{references, Names};
use crate::family::api::spelling::camel;
use crate::family::api::{Node, NodeKind};
use crate::family::ir::Family;

/// Where a stack's or an item's page names resolve to nothing, one sentence each.
pub(super) fn stacked(family: &Family, names: &Names, found: &mut Vec<String>) {
    if let Some(page) = family
        .api
        .item
        .as_ref()
        .and_then(|item| item.page.as_deref())
    {
        if !names.regions.contains(page) {
            found.push(format!(
                "`memberOf.pageSlot` names `{}`, and no region has that name",
                camel(page)
            ));
        }
    }
    let Some(stack) = &family.api.stack else {
        return;
    };
    references("stack", stack.references(), names, found);
    if let Some(top) = &stack.top {
        if names.prop(top).is_none() && !names.derived.contains(top.as_str()) {
            found.push(format!(
                "`stack.topTitle` names `{}`, and no prop or computed value has that name",
                camel(top)
            ));
        }
    }
    if family.api.collection.is_none() {
        found.push(
            "the element declares a `stack`, and no `collection` holds the rows it walks"
                .to_owned(),
        );
    }
    if let Some(before) = &stack.before {
        let cancelable = family
            .api
            .events
            .iter()
            .any(|event| &event.name == before && event.cancelable);
        if names.events.contains(before.as_str()) && !cancelable {
            found.push(format!(
                "`stack.onBeforeChange` names `{}`, which is not cancelable, so a page cannot refuse a move",
                camel(before)
            ));
        }
    }
    if names.parts.contains(&stack.back) && !pressable(&family.tree, &stack.back) {
        found.push(format!(
            "`stack.back` names `{}`, which is no pressable",
            stack.back
        ));
    }
}

/// Whether the tree draws a pressable named `name`.
fn pressable(nodes: &[Node], name: &str) -> bool {
    nodes.iter().any(|node| {
        (node.kind == NodeKind::Pressable && node.name == name) || pressable(&node.children, name)
    })
}
