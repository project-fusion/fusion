//! The names an element's timed and scrolling sources hold: its total, its
//! delay, its countdown, its queue, its clock, its fold, its scroll, its
//! page, its stack of messages or its place in one, its tour or its place
//! in one, its sections, and its copy, whose pressable that `copies` is the
//! one press that copies.

use super::{references, Names};
use crate::family::api::{Attribute, Node, NodeKind};
use crate::family::ir::Family;

/// Where the names those sources hold resolve to nothing, one sentence each.
pub(super) fn timed(family: &Family, names: &Names, found: &mut Vec<String>) {
    if let Some(total) = &family.api.total {
        references("total", total.references(), names, found);
    }
    if let Some(delay) = &family.api.delay {
        references("delay", delay.references(), names, found);
    }
    if let Some(countdown) = &family.api.countdown {
        references("countdown", countdown.references(), names, found);
    }
    if let Some(queue) = &family.api.queue {
        references("queue", queue.references(), names, found);
    }
    if let Some(clock) = &family.api.clock {
        references("clock", clock.references(), names, found);
        if !crate::family::ir::DERIVATIONS
            .iter()
            .any(|(name, _)| *name == clock.expires)
        {
            found.push(format!(
                "the clock's `expires` names `{}`, and no derivation in core has that name",
                clock.expires
            ));
        }
    }
    if let Some(fold) = &family.api.fold {
        references("fold", fold.references(), names, found);
    }
    if let Some(scroll) = &family.api.scroll {
        references("scroll", scroll.references(), names, found);
    }
    if let Some(page) = &family.api.page {
        references("page", page.references(), names, found);
    }
    if let Some(notices) = &family.api.notices {
        references("notices", notices.references(), names, found);
    }
    if let Some(notice) = &family.api.notice {
        references("notice", notice.references(), names, found);
    }
    if let Some(tour) = &family.api.tour {
        references("tour", tour.references(), names, found);
    }
    if let Some(stop) = &family.api.stop {
        references("stop", stop.references(), names, found);
    }
    if let Some(section) = &family.api.section {
        references("section", section.references(), names, found);
    }
    if let Some(sections) = &family.api.sections {
        references("sections", sections.references(), names, found);
    }
    copied(family, names, found);
}

/// The copy's names, and the one pressable that `copies` where it has one.
fn copied(family: &Family, names: &Names, found: &mut Vec<String>) {
    let mut copying = Vec::new();
    pressables_that_copy(&family.tree, &mut copying);
    let Some(copy) = &family.api.copy else {
        for name in copying {
            found.push(format!(
                "`pressable('{name}')` copies, and the element declares no `copy`"
            ));
        }
        return;
    };
    references("copy", copy.references(), names, found);
    for (at, name) in copy.worded() {
        if names.prop(name).is_none() && !names.derived.contains(name) {
            found.push(format!(
                "the copy's `{at}` names `{name}`, and no prop or computed value has that name"
            ));
        }
    }
    if !family.tree.is_empty() && copying.len() != 1 {
        found.push(format!(
            "the element declares a `copy`, and {} pressables copy, where one does",
            copying.len()
        ));
    }
}

/// The name of each pressable marked `copies`, in the order the tree draws them.
pub fn pressables_that_copy<'a>(nodes: &'a [Node], found: &mut Vec<&'a str>) {
    for node in nodes {
        if node.kind == NodeKind::Pressable
            && matches!(node.attributes.get("copies"), Some(Attribute::Flag(true)))
        {
            found.push(node.name.as_str());
        }
        pressables_that_copy(&node.children, found);
    }
}
