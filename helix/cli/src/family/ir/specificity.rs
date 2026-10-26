//! How the browser ranks a rule against the others.

use crate::family::ir::Rule;

/// The specificity of the selector the web output writes for a rule: its
/// target's alone, since every condition is written inside `:where()`.
///
/// `:host` and `[part]` are one class-equivalent each. `::slotted(<tag>)` is
/// two in the third column, the pseudo-element and its tag, as is a type
/// selector in `inner`, such as `svg`. A region is its `slot`, a type, and
/// its name, a class, unless it is every region. A written-out selector is
/// web only and never ordered against the others, so it counts nothing.
/// Every rule on one target ranks the same, so the later one wins, on a phone
/// as in a browser.
pub fn specificity(rule: &Rule) -> [u32; 3] {
    if rule.selector.is_some() {
        return [0, 0, 0];
    }
    let host_rule = rule.target == "host" && rule.region.is_none();
    let slotted_types = |tag: &str| if tag == "*" { 1 } else { 2 };
    let (classes, mut types) = match (&rule.slotted, host_rule) {
        (None, true) => (1, 0),
        (slotted, _) => {
            let (target_classes, target_types) = match rule.region.as_deref() {
                Some("*") => (0, 1),
                Some(_) => (1, 1),
                None if host_rule => (0, 0),
                None => (1, 0),
            };
            (
                target_classes,
                target_types + slotted.as_deref().map_or(0, slotted_types),
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
