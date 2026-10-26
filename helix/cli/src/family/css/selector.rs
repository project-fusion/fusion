//! The selector each rule is written under.

use std::collections::BTreeSet;
use std::fmt::Write as _;

#[cfg(test)]
#[path = "selector_tests.rs"]
mod tests;

use crate::family::ir::{scope, Condition, Rule, Scope};

/// One condition as the simple selector it is.
fn simple(condition: &Condition) -> String {
    match condition {
        Condition::Absent { name } => format!(":not([{name}])"),
        Condition::Attribute { name, value } => match value {
            Some(value) => format!("[{name}=\"{value}\"]"),
            None => format!("[{name}]"),
        },
        Condition::Child { first: true } => ":first-child".to_owned(),
        Condition::Child { first: false } => ":not(:first-child)".to_owned(),
        Condition::Defined => ":defined".to_owned(),
        Condition::Dir { value } => format!(":dir({value})"),
        Condition::Disabled { value: true } => ":disabled".to_owned(),
        Condition::Disabled { value: false } => ":not(:disabled)".to_owned(),
        Condition::Container { .. }
        | Condition::Entering
        | Condition::Media { .. }
        | Condition::Window { .. }
        | Condition::Within { .. } => String::new(),
        /* The element sets the state while the region holds something. */
        Condition::Filled { region } => format!(":state(has-{region})"),
        Condition::Not { condition } => format!(":not({})", simple(condition)),
        Condition::OneOf { name, values } => format!(
            ":is({})",
            values
                .iter()
                .map(|value| format!("[{name}=\"{value}\"]"))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        /* A tab that is a link has no `disabled` and says so with
        `aria-disabled`, so the part is disabled by either. */
        Condition::Part { is, name, value } => match (name.as_str(), value, is) {
            (_, _, Some(is)) => format!("[{name}=\"{is}\"]"),
            ("disabled", true, None) => ":is(:disabled, [aria-disabled=\"true\"])".to_owned(),
            ("disabled", false, None) => ":not(:disabled, [aria-disabled=\"true\"])".to_owned(),
            (name, true, None) => format!("[{name}]"),
            (name, false, None) => format!(":not([{name}])"),
        },
        Condition::HostPlace { place } | Condition::Place { place } => place.css(),
        Condition::HostOfType { at } => format!(":nth-of-type({at})"),
        Condition::Pseudo { names } => match names.as_slice() {
            [name] => format!(":{name}"),
            names => format!(
                ":is({})",
                names
                    .iter()
                    .map(|name| format!(":{name}"))
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        },
        Condition::State { name } => format!(":state({name})"),
        /* The part inside is written with `=`, as every part that is not
        also another is. */
        Condition::Holds { names, part } if names.is_empty() => {
            format!(":has([part=\"{part}\"])")
        }
        Condition::Holds { names, part } => format!(
            ":has([part=\"{part}\"]{})",
            simple(&Condition::Pseudo {
                names: names.clone()
            })
        ),
        Condition::Also { name, value: true } => format!("[part~=\"{name}\"]"),
        Condition::Also { name, value: false } => format!(":not([part~=\"{name}\"])"),
    }
}

/// The conditions of `rule` that `test` picks, as simple selectors in the
/// rule's order.
fn written(rule: &Rule, test: impl Fn(&Condition) -> bool) -> String {
    rule.when
        .iter()
        .filter(|condition| test(condition))
        .map(simple)
        .collect()
}

/// What a `:not()` holds, or the condition itself.
fn inside(condition: &Condition) -> &Condition {
    match condition {
        Condition::Not { condition } => inside(condition),
        condition => condition,
    }
}

/// The host's own conditions, written inside `:host()`.
///
/// **One order for what goes inside `:host()`, whatever order the table wrote
/// it in**: whether it has upgraded, disabled, custom states, attributes by
/// name and then the values they do not take, absent attributes, and the
/// direction. Biome sorts the keys of `when`, so the table's order is the
/// alphabet's, and a selector that followed it would change when a condition
/// was renamed.
fn on_host(rule: &Rule) -> String {
    let negated = |condition: &Condition| matches!(condition, Condition::Not { .. });
    let mut host = written(rule, |condition| {
        matches!(inside(condition), Condition::Defined)
    });
    host.push_str(&written(rule, |condition| {
        matches!(condition, Condition::Disabled { .. })
    }));
    host.push_str(&written(rule, |condition| {
        matches!(
            inside(condition),
            Condition::Filled { .. } | Condition::State { .. }
        )
    }));
    let named = |condition: &Condition| match inside(condition) {
        Condition::Attribute { name, .. } | Condition::OneOf { name, .. } => Some(name.clone()),
        _ => None,
    };
    for wanted in [false, true] {
        let mut attributes: Vec<&Condition> = rule
            .when
            .iter()
            .filter(|condition| named(condition).is_some() && negated(condition) == wanted)
            .collect();
        attributes.sort_by_key(|condition| named(condition));
        for condition in attributes {
            host.push_str(&simple(condition));
        }
    }
    host.push_str(&written(rule, |condition| {
        matches!(condition, Condition::Absent { .. })
    }));
    host.push_str(&written(rule, |condition| {
        matches!(
            inside(condition),
            Condition::HostPlace { .. } | Condition::HostOfType { .. }
        )
    }));
    host.push_str(&written(rule, |condition| {
        matches!(condition, Condition::Dir { .. })
    }));
    /* What holds of the host, for a rule on a part `within` it. */
    for condition in &rule.when {
        if let Condition::Within { on, part } = condition {
            if part == "host" {
                for held in on.iter().flatten() {
                    host.push_str(&simple(held));
                }
            }
        }
    }
    host
}

/// The target's own conditions, written after its selector: the parts it is
/// as well, a part's state, then its place, then the interaction, as
/// `[hidden]` and `:hover` read in that order everywhere else in the library,
/// and last what a part inside it holds, `:has()`.
fn on_target(rule: &Rule, test: impl Fn(&Condition) -> bool) -> String {
    let mut on = String::new();
    for kind in [
        |condition: &Condition| matches!(condition, Condition::Also { .. }),
        |condition: &Condition| matches!(condition, Condition::Part { .. }),
        |condition: &Condition| {
            matches!(condition, Condition::Child { .. } | Condition::Place { .. })
        },
        |condition: &Condition| matches!(condition, Condition::Pseudo { .. }),
        |condition: &Condition| matches!(condition, Condition::Holds { .. }),
    ] {
        on.push_str(&written(rule, |condition| {
            test(condition) && scope(condition) == Scope::Target && kind(inside(condition))
        }));
    }
    on
}

/// What a rule's conditions write, inside `:where()`, so they add nothing to
/// the selector's specificity.
fn unranked(conditions: &str) -> String {
    if conditions.is_empty() {
        String::new()
    } else {
        format!(":where({conditions})")
    }
}

/// The selector a rule is written under.
///
/// **Every rule on one target ranks the same**, whatever it asks: what holds
/// of the host, of a part around the target, of the target itself, and of
/// the children passed in is written inside `:where()`, so a selector's
/// specificity is its target's alone, and the later of two rules on one
/// target wins, as the later of two rules of equal specificity does in CSS.
/// A group that writes `[{ selected: true }, { hover: true, selected: true }]`
/// to outrank an earlier hover writes `{ selected: true }` after it.
pub fn selector(rule: &Rule, tokens: &BTreeSet<String>) -> String {
    if let Some(selector) = &rule.selector {
        return selector.clone();
    }
    let part = |name: &str| {
        let matches = if tokens.contains(name) { "~=" } else { "=" };
        format!("[part{matches}\"{name}\"]")
    };
    let slotted = rule.slotted.as_deref();
    let host_rule = rule.target == "host" && rule.region.is_none();
    /* On the host itself, its own place and interactions go inside `:host()`
    with the rest. */
    let mut host = on_host(rule);
    if host_rule && slotted.is_none() {
        host.push_str(&on_target(rule, |_| true));
    }
    /* On the host itself, its conditions go inside `:host()`, which ranks
    as one pseudo-class whatever its argument ranks. */
    if host_rule && slotted.is_none() {
        return format!(
            ":host{}{}",
            if host.is_empty() {
                String::new()
            } else {
                format!("({})", unranked(&host))
            },
            rule.inner.as_deref().map_or_else(String::new, |inner| {
                let gap = if inner.starts_with(':') { "" } else { " " };
                format!("{gap}{inner}")
            })
        );
    }
    let mut written = if host.is_empty() {
        String::new()
    } else {
        format!(":host({host})")
    };
    for condition in &rule.when {
        if let Condition::Within { on, part: around } = condition {
            if around == "host" {
                continue;
            }
            if !written.is_empty() {
                written.push(' ');
            }
            written.push_str(&part(around));
            for held in on.iter().flatten() {
                written.push_str(&simple(held));
            }
        }
    }
    /* What the content passed in is styled under: on a part, its place among
    the rest; on the host or a region, its interactions as well. */
    let in_slot = |condition: &Condition| match inside(condition) {
        Condition::Child { .. } | Condition::Place { .. } => true,
        Condition::Pseudo { .. } => rule.target == "host",
        _ => false,
    };
    let mut target = match rule.region.as_deref() {
        Some("*") => "slot".to_owned(),
        Some("default") => "slot:not([name])".to_owned(),
        Some(region) => format!("slot[name=\"{region}\"]"),
        None if host_rule => String::new(),
        /* The part alone, which a node that is another part as well does
        not match. */
        None if rule.exact => format!("[part=\"{}\"]", rule.target),
        None => part(&rule.target),
    };
    if rule.region.is_none() && !host_rule {
        target.push_str(&unranked(&on_target(rule, |condition| {
            slotted.is_none() || !in_slot(condition)
        })));
    }
    if let Some(tag) = slotted {
        let own = on_target(rule, in_slot);
        let _ = write!(target, "::slotted({tag}{})", unranked(&own));
    }
    /* What holds of the host and of the parts around the target ranks
    nothing either. */
    let mut written = unranked(&written);
    if !target.is_empty() {
        if !written.is_empty() {
            written.push(' ');
        }
        written.push_str(&target);
    }
    /* A pseudo-element, such as `::before`, belongs to the target itself, and
    anything else is inside it. */
    if let Some(inner) = &rule.inner {
        let gap = if inner.starts_with(':') { "" } else { " " };
        let _ = write!(written, "{gap}{inner}");
    }
    written
}
