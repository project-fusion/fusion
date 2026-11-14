//! One element's `hooks` prop: each public hook its rules read on a phone,
//! by its name in camel case, which the native runtime sets on the element
//! as an inline `style` sets the hook's custom property on the web.

use std::collections::BTreeSet;

use serde_json::Value as Json;

use crate::family::components::members::{camel, Member};
use crate::family::ir::{Family, Item, Value};
use crate::family::shared::visit;

/// What one hook holds, as the native runtime takes it.
const HOOK_TYPE: &str = "number | string";

/// The hooks of its own prefix that `family`'s rules read, by name after the
/// prefix, once each, in name order. A rule only the web draws reads none on
/// a phone.
pub fn read(family: &Family) -> BTreeSet<&str> {
    let mut names = BTreeSet::new();
    for item in &family.rules {
        let Item::Rule(rule) = item else { continue };
        if rule.web_only {
            continue;
        }
        for (_, value) in rule.values.iter().chain(&rule.set) {
            visit(value, &mut |value| {
                if let Value::Hook { name, of: None, .. } = value {
                    names.insert(name.as_str());
                }
            });
        }
    }
    names
}

/// The members of the hooks type: each hook the element reads, described by
/// the styled manifest's entry for its custom property.
pub fn members(family: &Family, declaration: &Json) -> Vec<Member> {
    read(family)
        .into_iter()
        .map(|hook| {
            let property = format!("--{}-{hook}", family.name);
            let doc = declaration["cssProperties"]
                .as_array()
                .into_iter()
                .flatten()
                .find(|entry| entry["name"] == property.as_str())
                .and_then(|entry| entry["description"].as_str())
                .map(|text| text.trim().split("\n\n").next().unwrap_or_default().trim())
                .filter(|text| !text.is_empty())
                .map(str::to_owned);
            let mut doc: Vec<String> = doc.into_iter().collect();
            doc.push(format!("Sets `{property}`."));
            Member {
                doc,
                name: camel(hook),
                ty: HOOK_TYPE.to_owned(),
            }
        })
        .collect()
}

/// The name of the hooks type of `component`, such as `HelixButtonHooks`.
pub fn type_name(component: &str) -> String {
    format!("{component}Hooks")
}

/// The `hooks` prop, typed `type_name`.
pub fn prop(component: &str, family: &Family) -> Member {
    Member {
        doc: vec![
            format!(
                "Hooks set on the element, by each hook's name in camel case, as an inline `style` sets `--{}-*` on the web. They stand over the hooks the components around set and the fallbacks of the element's rules, and the components inside inherit them.",
                family.name
            ),
        ],
        name: "hooks".to_owned(),
        ty: type_name(component),
    }
}

/// The `id` prop, which registers the element's view under it as a target,
/// as a tour stop's `for` names it, where the family has no `id` of its own.
pub fn id(family: &Family) -> Option<Member> {
    (!family.api.props.iter().any(|one| one.name == "id")).then(|| Member {
        doc: vec![
            "Registers the element's view under this id, as the web finds an element by its `id`, so a tour stop's `for` or an app header's `scroller` that holds it finds the element.".to_owned(),
        ],
        name: "id".to_owned(),
        ty: "string".to_owned(),
    })
}

#[cfg(test)]
#[path = "hooks_tests.rs"]
mod tests;
