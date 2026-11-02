//! What a table written with `styles()` is held to once it is read: that its
//! groups do not decide the drawing, and which of its rules never apply.
//!
//! **Groups never compete.** A browser orders the rules that match one node
//! by specificity and then by where they are written, and a native view does
//! the same. Writing a table as groups puts a group's rules in its order and
//! the groups in theirs, which reads as if the order between groups did not
//! matter. It does wherever two rules in different groups on different
//! targets can match one node, under conditions that can hold at once, set
//! one property to different values, or a shorthand and its longhand, and
//! tie on specificity: then the later one wins only because of where its
//! group stands. [`check`] refuses each such pair with both lines, and the
//! fix is one group. A checkbox's `mark` and `mark-dash` are one node while
//! the box is mixed, so their rules compete.
//!
//! **Two groups on one target are one group written twice**, as a table
//! converted a run at a time has them, and as a group on several targets and
//! a group on one of them are. Every rule on one target ranks the same,
//! whatever its conditions, so their rules keep the order they are written
//! in; only groups on different targets are held apart. A part alone, as
//! `exact` names it, is that part.
//!
//! **A written-out selector is located where it can be**: its last compound's
//! `[part]`, `slot` or `::slotted()`, at the specificity a browser gives it.
//! One that cannot be located, or two located that may compete, is reported
//! rather than refused, since nothing here can prove what a raw selector
//! matches.
//!
//! **A rule another always overrides is reported**: one whose every
//! declaration a rule on the same node also sets, under conditions that are
//! a subset of its own, and that wins. It is a report and not a refusal,
//! since the subset test is written condition by condition and misses an
//! override it cannot see; it never reports one that is not.

use std::collections::BTreeSet;

use crate::family::api::{Attribute, Node as TreeNode, NodeKind};
use crate::family::ir::{Condition, Family, Item, Rule, Value};
use shorthands::{overlap, resets};

mod selector;
pub mod shorthands;

#[cfg(test)]
mod tests;

/// What a rule is on, as far as the checks can tell.
#[derive(Clone, Debug, PartialEq)]
enum Node {
    Host,
    /// A part, and whether the rule is on it alone.
    Part(String, bool),
    /// A region's slot, by its name, or `*` for every one.
    Slot(String),
    /// The children passed into a region, or `*` for any, with their tag.
    Slotted(String, String),
}

/// A node, and what the rule writes after it: a pseudo-element, or a
/// descendant the tree does not draw.
#[derive(Clone, Debug, PartialEq)]
struct Place {
    node: Node,
    inner: Option<String>,
}

/// One node of the tree: the parts it is, and those of its children.
struct Drawn {
    parts: BTreeSet<String>,
    children: Vec<BTreeSet<String>>,
}

/// Refuses two rules in different groups that compete, and returns a
/// sentence for each pair it cannot judge and each rule another overrides.
///
/// # Errors
///
/// A sentence for each pair of competing rules, naming both lines.
pub fn check(family: &Family) -> Result<Vec<String>, String> {
    let rules: Vec<&Rule> = family
        .rules
        .iter()
        .filter_map(|item| match item {
            Item::Rule(rule) => Some(&**rule),
            Item::Keyframes(_) => None,
        })
        .collect();
    let mut drawn = Vec::new();
    tree(&family.tree, &mut drawn);
    let mut refused = BTreeSet::new();
    let mut notes = BTreeSet::new();
    for (index, first) in rules.iter().enumerate() {
        for second in &rules[index + 1..] {
            let (Some(one), Some(other)) = (&first.group, &second.group) else {
                continue;
            };
            if one == other
                || on(one) == on(other)
                || same_target(first, second)
                || !compatible(first, second)
            {
                continue;
            }
            let Some(property) = shared(first, second) else {
                continue;
            };
            let (at, later) = (at(first), at(second));
            match (place(first), place(second)) {
                (Some(a), Some(b)) => {
                    if first.specificity == second.specificity
                        && meets(&a, &b, first, second, &drawn)
                    {
                        refused.insert(format!(
                            "{at} and {later} are in different groups and can both set `{property}` on one node at one specificity, so the drawing follows where the groups stand: put them in one group"
                        ));
                    }
                }
                _ => {
                    if let Some(why) = selector::judged(first, second, &drawn) {
                        notes.insert(format!("{at} and {later} may both set `{property}`: {why}"));
                    }
                }
            }
        }
    }
    notes.extend(shadowed(&rules));
    if refused.is_empty() {
        Ok(notes.into_iter().collect())
    } else {
        Err(refused.into_iter().collect::<Vec<_>>().join("\n"))
    }
}

/// The target a group is written on, from its name. Two groups on one
/// target keep their rules in the order written, which a reader sees, so
/// their rules are compared as the cascade compares them and never refused.
fn on(group: &str) -> &str {
    group.split_once(" on ").map_or(group, |(_, target)| target)
}

/// Whether two rules are on one target, the same part, region, or children,
/// as a group on several targets and a group on one of them are: every rule
/// on a target ranks the same, so the later one wins, wherever its group
/// stands. A part alone is that part where it has no other name, and ranks
/// as the part does. A written-out selector ranks as the browser ranks it,
/// so it is judged on its own.
fn same_target(first: &Rule, second: &Rule) -> bool {
    first.selector.is_none()
        && second.selector.is_none()
        && first.target == second.target
        && first.region == second.region
        && first.slotted == second.slotted
        && first.inner == second.inner
}

fn at(rule: &Rule) -> String {
    rule.at
        .clone()
        .unwrap_or_else(|| format!("rule {}", rule.order + 1))
}

/// Every node of the tree that is a part, with the parts it is.
fn tree(nodes: &[TreeNode], into: &mut Vec<Drawn>) {
    for node in nodes {
        if let Some(parts) = parts_of(node) {
            let mut children = Vec::new();
            for child in &node.children {
                children.extend(drawn_below(child));
            }
            into.push(Drawn { parts, children });
        }
        tree(&node.children, into);
    }
}

/// The parts of the nearest nodes at or below `node` that are parts, as a
/// `when` passes its child through.
fn drawn_below(node: &TreeNode) -> Vec<BTreeSet<String>> {
    match parts_of(node) {
        Some(parts) => vec![parts],
        None => node.children.iter().flat_map(drawn_below).collect(),
    }
}

/// The parts one node is: its name and the parts it is as well, or a
/// region's `part`.
fn parts_of(node: &TreeNode) -> Option<BTreeSet<String>> {
    match node.kind {
        kind if kind.is_part() => {
            let mut parts = BTreeSet::from([node.name.clone()]);
            if let Some(Attribute::Parts(also)) = node.attributes.get("also") {
                parts.extend(also.keys().cloned());
            }
            Some(parts)
        }
        NodeKind::Region => match node.attributes.get("part") {
            Some(Attribute::Text(part)) => Some(BTreeSet::from([part.clone()])),
            _ => None,
        },
        _ => None,
    }
}

/// What a rule is on, or `None` for a written-out selector.
fn place(rule: &Rule) -> Option<Place> {
    if rule.selector.is_some() {
        return None;
    }
    let node = match (&rule.region, &rule.slotted) {
        (Some(region), Some(tag)) => Node::Slotted(region.clone(), tag.clone()),
        (Some(region), None) => Node::Slot(region.clone()),
        (None, Some(tag)) if rule.target == "host" => Node::Slotted("*".to_owned(), tag.clone()),
        /* The content passed in through the part that is a region's slot,
        which is that slot's alone. */
        (None, Some(tag)) => Node::Slotted(format!("part {}", rule.target), tag.clone()),
        (None, None) if rule.target == "host" => Node::Host,
        (None, None) => Node::Part(rule.target.clone(), rule.exact),
    };
    Some(Place {
        inner: rule.inner.clone(),
        node,
    })
}

/// Whether two places can be one node.
fn meets(a: &Place, b: &Place, first: &Rule, second: &Rule, drawn: &[Drawn]) -> bool {
    match (&a.inner, &b.inner) {
        (Some(one), Some(other)) if one == other => {
            nodes_meet(&a.node, &b.node, first, second, drawn)
        }
        (Some(children), None) if children.trim() == "> *" => child_of(&a.node, &b.node, drawn),
        (None, Some(children)) if children.trim() == "> *" => child_of(&b.node, &a.node, drawn),
        (None, None) => nodes_meet(&a.node, &b.node, first, second, drawn),
        _ => false,
    }
}

fn nodes_meet(a: &Node, b: &Node, first: &Rule, second: &Rule, drawn: &[Drawn]) -> bool {
    let any = |one: &str, other: &str| one == "*" || other == "*" || one == other;
    match (a, b) {
        (Node::Host, Node::Host) => true,
        (Node::Slot(one), Node::Slot(other)) => any(one, other),
        (Node::Slotted(one, tag), Node::Slotted(other, other_tag)) => {
            any(one, other) && any(tag, other_tag)
        }
        (Node::Part(one, exact), Node::Part(other, other_exact)) => {
            /* A rule on an alias never meets one that asks for the node not
            to be that alias. */
            if lacks(second, one) || lacks(first, other) {
                return false;
            }
            drawn.iter().any(|node| {
                let alone = |name: &String, exact: bool| {
                    !exact || node.parts.len() == 1 && node.parts.contains(name)
                };
                node.parts.contains(one)
                    && node.parts.contains(other)
                    && alone(one, *exact)
                    && alone(other, *other_exact)
            })
        }
        _ => false,
    }
}

/// Whether a rule asks for its node not to be the part `alias` as well.
fn lacks(rule: &Rule, alias: &str) -> bool {
    rule.when.iter().any(
        |condition| matches!(condition, Condition::Also { name, value: false } if name == alias),
    )
}

/// Whether `child` is a part drawn directly inside the part `parent` is.
fn child_of(parent: &Node, child: &Node, drawn: &[Drawn]) -> bool {
    let (Node::Part(parent, _), Node::Part(child, _)) = (parent, child) else {
        return false;
    };
    drawn.iter().any(|node| {
        node.parts.contains(parent) && node.children.iter().any(|parts| parts.contains(child))
    })
}

/// What a rule sets: its declarations, and its private values as the
/// custom properties they are.
fn properties(rule: &Rule) -> impl Iterator<Item = (String, &Value)> + '_ {
    rule.set
        .iter()
        .map(|(property, value)| (property.clone(), value))
        .chain(
            rule.values
                .iter()
                .map(|(name, value)| (format!("--_{name}"), value)),
        )
}

/// A property both rules set to different values, or one sets a shorthand
/// of. Two rules that set one property to one value draw the same whichever
/// of them wins.
fn shared(first: &Rule, second: &Rule) -> Option<String> {
    properties(first)
        .find(|(one, value)| {
            properties(second).any(|(other, given)| {
                overlap(one, &other)
                    && (*one != other || format!("{value:?}") != format!("{given:?}"))
            })
        })
        .map(|(property, _)| property)
}

/// Whether two rules' conditions can hold at once, as far as each pair of
/// conditions says: two values of one prop, a condition and its negation,
/// and the two platforms cannot.
fn compatible(first: &Rule, second: &Rule) -> bool {
    if (first.web_only && second.native_only) || (first.native_only && second.web_only) {
        return false;
    }
    !first.when.iter().any(|one| {
        second
            .when
            .iter()
            .any(|other| exclusive(one, other) || exclusive(other, one))
    })
}

/// Whether `one` holding means `other` cannot.
fn exclusive(one: &Condition, other: &Condition) -> bool {
    use Condition::{Absent, Also, Attribute, Disabled, Not, OneOf, Part};
    match (one, other) {
        (Not { condition }, other) => **condition == *other,
        (
            Attribute {
                name,
                value: Some(a),
            },
            Attribute {
                name: other,
                value: Some(b),
            },
        )
        | (
            Part {
                name, is: Some(a), ..
            },
            Part {
                name: other,
                is: Some(b),
                ..
            },
        ) => name == other && a != b,
        (Attribute { name, .. } | OneOf { name, .. }, Absent { name: other }) => name == other,
        (
            OneOf { name, values },
            Attribute {
                name: other,
                value: Some(value),
            },
        ) => name == other && !values.contains(value),
        (
            OneOf { name, values },
            OneOf {
                name: other,
                values: others,
            },
        ) => name == other && !values.iter().any(|value| others.contains(value)),
        (Disabled { value }, Disabled { value: other }) => value != other,
        (
            Also { name, value },
            Also {
                name: other,
                value: other_value,
            },
        )
        | (
            Part { name, value, .. },
            Part {
                name: other,
                is: None,
                value: other_value,
            },
        ) => name == other && value != other_value,
        _ => false,
    }
}

/// A sentence for each rule whose every declaration another rule on the
/// same node overrides wherever it applies.
fn shadowed(rules: &[&Rule]) -> Vec<String> {
    let mut notes = Vec::new();
    for rule in rules.iter().filter(|rule| rule.group.is_some()) {
        let Some(own) = place(rule) else {
            continue;
        };
        let mut by = BTreeSet::new();
        let every = properties(rule).all(|(property, _)| {
            let winner = rules.iter().find(|other| {
                !std::ptr::eq(**other, *rule)
                    && place(other).as_ref() == Some(&own)
                    && wins(other, rule)
                    && covers(other, rule)
                    && properties(other).any(|(set, _)| set == property || resets(&set, &property))
            });
            winner.map(|winner| by.insert(at(winner))).is_some()
        });
        if every && (!rule.set.is_empty() || !rule.values.is_empty()) {
            notes.push(format!(
                "{}: every declaration is overridden by {}, which applies wherever it does and wins",
                at(rule),
                by.into_iter().collect::<Vec<_>>().join(" and ")
            ));
        }
    }
    notes
}

/// Whether `other` wins over `rule` where both apply.
fn wins(other: &Rule, rule: &Rule) -> bool {
    other.specificity > rule.specificity
        || (other.specificity == rule.specificity && other.order > rule.order)
}

/// Whether `other` applies wherever `rule` does: each of its conditions is
/// one of `rule`'s, on the platforms and under the feature query `rule` is.
fn covers(other: &Rule, rule: &Rule) -> bool {
    (!other.web_only || rule.web_only)
        && (!other.native_only || rule.native_only)
        && (other.supports.is_none() || other.supports == rule.supports)
        && other
            .when
            .iter()
            .all(|condition| rule.when.contains(condition))
}
