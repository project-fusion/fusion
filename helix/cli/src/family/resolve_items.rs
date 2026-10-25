//! The names an item of a set reads, and the rules on the parts of an
//! element a box draws.
//!
//! - An item's `grip` and `value` name props, its `flag` a prop or a value
//!   the element computes, its `named` regions, and its `state` a state.
//! - An item of a set that mixes reads switches through its `checkable`,
//!   `checked` and `exclusive`, and asks through a cancelable `before`.
//! - **A rule on a part of a drawn element reads the element around alone.**
//!   A box that draws another element exposes its parts as `select-all-box`,
//!   and a rule on one is `[part="select-all"]::part(box)` on the web, and
//!   the style the element around gives that part on a phone. So it reads
//!   the host's props, states and media, and not a state of the part, an
//!   interaction on it, its place, a part around it or inside it, a region,
//!   slotted children, or generated content.

#[cfg(test)]
#[path = "resolve_items_tests.rs"]
mod tests;

use super::{expect_prop, Names};
use crate::family::api::{exported, Item, Names as Refers, Primitive, PropType};
use crate::family::ir::{scope, Condition, Family, Rule, Scope};

/// Where an item's names resolve to nothing, one sentence each.
pub(super) fn item(family: &Family, names: &Names, found: &mut Vec<String>) {
    let Some(item) = family.api.item.as_ref() else {
        return;
    };
    if let Some(grip) = item.grip.as_deref() {
        expect_prop(names, grip, "the item's `grip`", found);
    }
    /* A flag may be a value the element computes, as a megamenu is
    current while its panel holds the page. */
    if let Some(flag) = item
        .flag
        .as_deref()
        .filter(|flag| !names.derived.contains(flag))
    {
        expect_prop(names, flag, "the item's `flag`", found);
    }
    if let Some(value) = item.value.as_deref() {
        expect_prop(names, value, "the item's `value`", found);
    }
    for region in &item.named {
        if !names.regions.contains(region.as_str()) {
            found.push(format!(
                "the item's `named` lists `{region}`, and no region has that name"
            ));
        }
    }
    if let Some(state) = item.state.as_deref() {
        if !names.states.contains(state) {
            found.push(format!(
                "the item's `state` names `{state}`, and no state has that name"
            ));
        }
    }
    mixed(family, item, names, found);
}

/// An item of a set that mixes: its props are switches, and the event it
/// asks before a press turns it can be refused.
fn mixed(family: &Family, item: &Item, names: &Names, found: &mut Vec<String>) {
    for (at, name, what) in item.mixed_references() {
        if what == Refers::Event {
            match family.api.events.iter().find(|event| event.name == name) {
                None => found.push(format!(
                    "the item's `{at}` names `{name}`, and no event has that name"
                )),
                Some(event) if !event.cancelable => found.push(format!(
                    "the item's `{at}` names `{name}`, which is not cancelable, so a page cannot keep the item as it is"
                )),
                Some(_) => {}
            }
            continue;
        }
        match names.prop(name) {
            None => found.push(format!(
                "the item's `{at}` reads `{name}`, and no prop has that name"
            )),
            Some(prop) if prop.kind != PropType::Primitive(Primitive::Boolean) => found.push(
                format!("the item's `{at}` reads `{name}`, which is not a boolean"),
            ),
            Some(_) => {}
        }
    }
}

/// Why each rule on a part of a drawn element reads what it cannot.
pub(super) fn drawn(family: &Family, rules: &[&Rule], found: &mut Vec<String>) {
    let parts = exported(&family.tree);
    for rule in rules {
        let Some((what, part)) = parts.get(&rule.target) else {
            continue;
        };
        let at = format!(
            "a rule on `{}`, the `{part}` of the element `{what}` draws,",
            rule.target
        );
        let reads = if rule.region.is_some() || rule.slotted.is_some() {
            Some("styles what is passed in")
        } else if rule.inner.is_some() {
            Some("writes generated content or a selector")
        } else if rule.exact {
            Some("is `exact`")
        } else if rule.when.iter().any(on_the_part) {
            Some("reads a state of the part, an interaction, its place, or a part around or inside it")
        } else {
            None
        };
        if let Some(reads) = reads {
            found.push(format!(
                "{at} {reads}, where the web reaches it through `::part()`, which reads the element around alone"
            ));
        }
    }
}

/// Whether a condition reads the target itself, an interaction on it, or a
/// part around it, none of which the element around can read of a part
/// another element draws.
fn on_the_part(condition: &Condition) -> bool {
    match condition {
        Condition::Not { condition } => on_the_part(condition),
        Condition::Within { .. } => true,
        other => scope(other) == Scope::Target,
    }
}
