//! How the browser ranks a rule against the others.

use crate::family::ir::{scope, Condition, Rule, Scope};

/// The specificity of the selector the web output writes for a rule.
///
/// `:host` and `[part]` are one class-equivalent each, as is every attribute,
/// `:not([attribute])`, `:is()` of attributes, `:dir()`, `:disabled`,
/// `:defined`, `:state()`, interaction, place, part state, a part the target
/// is as well, and the part a target is `within`: a `:not()` or an `:is()`
/// counts as what it holds. A `:has()` counts its part and its interaction,
/// two, and what a part it is `within` holds counts beside that part.
/// `::slotted(<tag>)` is two in the third column, the pseudo-element and its
/// tag, as is a type selector in `inner`, such as `svg`. A region is its
/// `slot`, a type, and its name, a class, unless it is every region. A
/// written-out selector is web only and never ordered against the others, so
/// it counts nothing.
pub fn specificity(rule: &Rule) -> [u32; 3] {
    if rule.selector.is_some() {
        return [0, 0, 0];
    }
    let count = |test: &dyn Fn(&Condition) -> bool| {
        rule.when
            .iter()
            .filter(|condition| test(condition))
            .map(weight)
            .sum::<u32>()
    };
    let in_scope = |wanted: Scope| move |condition: &Condition| scope(condition) == wanted;
    let host_rule = rule.target == "host" && rule.region.is_none();
    let on_host = count(&in_scope(Scope::Host));
    let on_target = count(&in_scope(Scope::Target));
    let around_host = |condition: &Condition| matches!(condition, Condition::Within { part, .. } if part == "host");
    let within = count(&|condition| scope(condition) == Scope::Within && !around_host(condition));
    /* `within: { host }` writes what holds of the host inside `:host()`. */
    let host_held: u32 = rule
        .when
        .iter()
        .filter_map(|condition| match condition {
            Condition::Within { on, part } if part == "host" => {
                Some(on.iter().flatten().map(weight).sum::<u32>())
            }
            _ => None,
        })
        .sum();
    /* `::slotted()` is one pseudo-element, and its argument a type unless it
    is `*`. On a part, it follows the part's attribute. */
    let slotted_types = |tag: &str| if tag == "*" { 1 } else { 2 };
    let (classes, mut types) = match (&rule.slotted, host_rule) {
        /* The host's own place and interactions are inside `:host()`. */
        (None, true) => (1 + on_host + on_target, 0),
        (slotted, _) => {
            let host = if on_host + host_held == 0 {
                0
            } else {
                1 + on_host + host_held
            };
            let (target_classes, target_types) = match rule.region.as_deref() {
                Some("*") => (0, 1),
                Some(_) => (1, 1),
                None if host_rule => (0, 0),
                None => (1, 0),
            };
            let slotted_types = slotted.as_deref().map_or(0, slotted_types);
            (
                host + within + target_classes + on_target,
                target_types + slotted_types,
            )
        }
    };
    types += rule.inner.as_deref().map_or(0, |inner| {
        let named = inner
            .split(|character: char| character.is_whitespace() || character == '>')
            .filter(|word| word.starts_with(|character: char| character.is_ascii_alphabetic()))
            .count();
        u32::try_from(named).unwrap_or(u32::MAX)
    });
    [0, classes, types]
}

/// How many class-equivalents a condition writes.
fn weight(condition: &Condition) -> u32 {
    match condition {
        Condition::Not { condition } => weight(condition),
        /* `:has([part="x"])` is the part, and an interaction one more. */
        Condition::Holds { names, .. } => {
            if names.is_empty() {
                1
            } else {
                2
            }
        }
        Condition::Within { on, .. } => 1 + on.iter().flatten().map(weight).sum::<u32>(),
        _ => 1,
    }
}
