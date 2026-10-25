//! The rules of the element a styled source is drawn over, laid under its
//! own in the intermediate form a phone reads.
//!
//! **A styled source may name the element it is drawn over** with `over`, as
//! Copy Button is drawn with Icon Button's rules: the web element adopts
//! that element's stylesheet before its own, so its own stylesheet holds its
//! own rules alone, and a phone draws from the intermediate form, which holds
//! both, the other element's first. Each hook the other element's rules read
//! stays that element's, `--icon-button-size`, as it is in the stylesheet the
//! web adopts, and its rules keep their order before the element's own.

#[cfg(test)]
#[path = "underlay_tests.rs"]
mod tests;

use crate::family::compile::Compiled;
use crate::family::ir::{Item, Value};
use crate::family::read::Lit;

/// The element a desugared styled source names in `over`, as
/// `<family>/<element>`: `icon-button` is `icon-button/root`.
pub fn over(export: &Lit) -> Option<String> {
    let Lit::Call(_, arguments) = export else {
        return None;
    };
    let [_, Lit::Object(fields)] = arguments.as_slice() else {
        return None;
    };
    fields.iter().find_map(|(key, value)| match (key.as_str(), value) {
        ("over", Lit::Text(name)) if name.contains('/') => Some(name.clone()),
        ("over", Lit::Text(name)) => Some(format!("{name}/root")),
        _ => None,
    })
}

/// Lays each element's `over` element's rules under its own.
///
/// # Errors
///
/// A sentence naming an element whose `over` names no element compiled, or
/// one that is itself drawn over another.
pub fn lay(compiled: &mut [Compiled]) -> Result<(), String> {
    for at in 0..compiled.len() {
        let Some(base) = compiled[at].over.clone() else {
            continue;
        };
        let Some(under) = compiled.iter().find(|one| one.element == base) else {
            return Err(format!(
                "{}: `over` names `{base}`, and no element of that name compiles",
                compiled[at].element
            ));
        };
        if under.over.is_some() {
            return Err(format!(
                "{}: `over` names `{base}`, which is drawn over another element itself",
                compiled[at].element
            ));
        }
        let prefix = under.family.name.clone();
        let mut rules: Vec<Item> = under.family.rules.clone();
        for item in &mut rules {
            if let Item::Rule(rule) = item {
                for (_, value) in rule.set.iter_mut().chain(rule.values.iter_mut()) {
                    qualify(value, &prefix);
                }
            }
        }
        let laid = count(&rules);
        for item in &mut compiled[at].family.rules {
            if let Item::Rule(rule) = item {
                rule.order += laid;
            }
        }
        rules.append(&mut compiled[at].family.rules);
        compiled[at].family.rules = rules;
    }
    Ok(())
}

/// How many rules a table holds, without its animations.
fn count(items: &[Item]) -> usize {
    items
        .iter()
        .filter(|item| matches!(item, Item::Rule(_)))
        .count()
}

/// Names `of` as the family of each hook in `value` that names none, so it
/// reads that family's hook on the element it is laid under.
pub(crate) fn qualify(value: &mut Value, of: &str) {
    match value {
        Value::Hook { fallback, of: family, .. } => {
            if family.is_none() {
                *family = Some(of.to_owned());
            }
            if let Some(fallback) = fallback {
                qualify(fallback, of);
            }
        }
        Value::Calc { operands: values, .. }
        | Value::Function {
            arguments: values, ..
        }
        | Value::List(values)
        | Value::Space(values) => {
            for one in values {
                qualify(one, of);
            }
        }
        Value::Mix { first, second, .. } => {
            qualify(first, of);
            qualify(second, of);
        }
        Value::Scheme { dark, light } => {
            qualify(dark, of);
            qualify(light, of);
        }
        Value::Web(inner) => qualify(inner, of),
        Value::Derived { fallback, .. }
        | Value::Inherited { fallback, .. }
        | Value::Measured { fallback, .. }
        | Value::Own { fallback, .. } => {
            if let Some(fallback) = fallback {
                qualify(fallback, of);
            }
        }
        Value::Quote { alt, .. } => {
            if let Some(alt) = alt {
                qualify(alt, of);
            }
        }
        Value::Fit(_) | Value::Keyword(_) | Value::Number(_) | Value::Text(_) | Value::Token(_) => {
        }
    }
}
