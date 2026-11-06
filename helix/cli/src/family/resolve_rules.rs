//! The names a rule reads, held to what the element has: the part or region
//! it is on, the parts it is `within` or `holds`, and the attributes, values
//! and states its conditions read.

use super::Names;
use crate::family::api::{Prop, PropType};
use crate::family::ir::{Condition, Rule};

/// A rule's target and the names its conditions read.
pub(super) fn check(rule: &Rule, names: &Names, found: &mut Vec<String>) {
    if rule.target != "host" && !names.parts.contains(&rule.target) {
        found.push(format!(
            "a rule is on `{}`, and no part has that name",
            rule.target
        ));
    }
    if let Some(region) = rule.region.as_deref() {
        if region != "*" && !names.regions.contains(region) {
            found.push(format!(
                "a rule is on the region `{region}`, and no region has that name"
            ));
        }
    }
    for condition in &rule.when {
        let mut inside = Vec::new();
        match condition {
            Condition::Within { on, part } => {
                /* Every part is drawn inside the host. */
                if part != "host" {
                    inside.push(("within", part));
                }
                for held in on.iter().flatten() {
                    if let Condition::Holds { part, .. } = held {
                        inside.push(("holds", part));
                    }
                }
            }
            Condition::Holds { part, .. } => inside.push(("holds", part)),
            _ => {}
        }
        for (what, part) in inside {
            if !names.parts.contains(part) {
                found.push(format!(
                    "a rule is `{what}` `{part}`, and no part has that name"
                ));
            }
        }
    }
    if rule.slotted.is_some() {
        return;
    }
    for condition in &rule.when {
        if let Some(why) = condition_names(condition, names, &rule.target, !rule.native_only) {
            found.push(why);
        }
    }
}

/// The attributes a page writes on any element, which every element's rules
/// may read as present or absent: the color mode it and what it holds draw
/// in, which a phone reads from the same attribute in shared code.
const PAGE: &[&str] = &["data-color-mode"];

fn condition_names(
    condition: &Condition,
    names: &Names,
    target: &str,
    on_web: bool,
) -> Option<String> {
    let at = format!("a rule on `{target}`");
    match condition {
        Condition::Absent { name } | Condition::Attribute { name, value: None } => (!PAGE
            .contains(&name.as_str())
            && names.prop(name).is_none_or(|prop| !prop.attribute))
        .then(|| format!("{at} reads `{name}`, and no attribute has that name")),
        Condition::Attribute {
            name,
            value: Some(value),
        } => attribute_value(names.prop(name), name, value).map(|why| format!("{at} {why}")),
        Condition::OneOf { name, values } => values
            .iter()
            .find_map(|value| attribute_value(names.prop(name), name, value))
            .map(|why| format!("{at} {why}")),
        Condition::Not { condition } => condition_names(condition, names, target, on_web),
        Condition::Also { name, .. } => (!names.parts.contains(name))
            .then(|| format!("{at} reads `also` `{name}`, and no part has that name")),
        /* A value the element computes holds as a state does, as a native
        rule reads a badge's `unset`. */
        Condition::State { name } => (!names.states.contains(name.as_str())
            && !names.derived.contains(name.as_str()))
        .then(|| format!("{at} reads the state `{name}`, and no state has that name")),
        /* The web element sets `has-<region>` while the region holds
        something, so the element declares both. A phone's own rule reads what
        it draws, and no web element sets anything for it. */
        Condition::Filled { region } => {
            if !names.regions.contains(region.as_str()) {
                Some(format!("{at} reads `filled` `{region}`, and no region has that name"))
            } else if on_web && !names.states.contains(format!("has-{region}").as_str()) {
                Some(format!(
                    "{at} reads `filled` `{region}`, and the element declares no state `has-{region}` for the web to set"
                ))
            } else {
                None
            }
        }
        Condition::Part { name, .. } => (!["disabled", "hidden", "href"].contains(&name.as_str()) && !name.starts_with("data-"))
            .then(|| format!("{at} reads `{name}` on its part, which is `disabled`, `hidden`, `href`, or a `data-` attribute")),
        _ => None,
    }
}

/// Why `[name="value"]` matches nothing: no such attribute, or a value its
/// prop never takes.
pub(super) fn attribute_value(prop: Option<&Prop>, name: &str, value: &str) -> Option<String> {
    let Some(prop) = prop.filter(|prop| prop.attribute) else {
        return Some(format!("reads `{name}`, and no attribute has that name"));
    };
    let PropType::Values(values) = &prop.kind else {
        return None;
    };
    (!values.iter().any(|known| known == value))
        .then(|| format!("reads `{name}=\"{value}\"`, and `{name}` never takes `{value}`"))
}
