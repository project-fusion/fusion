//! The names one family's rules use that another family owns, held to what
//! that family declares: another family's hook read with `hookOf()`, another
//! family's hook set as a quoted custom property, and a private value read
//! with `inherited('_x')`, and a token, read with `token()` or set as a quoted
//! custom property under the design system's token prefix. A typo in any of
//! these is a custom property that resolves to nothing, which no other check
//! sees.

use std::collections::{BTreeMap, BTreeSet};

use crate::family::ir::{Family, Value};
use crate::family::project::Names;
use crate::family::resolve::rules;

/// What every family declares: each prefix's hooks, the private values any
/// rule sets, and the lengths a script measures, with the theme's tokens and
/// the names the design system gives them.
#[derive(Default)]
struct Declared<'a> {
    hooks: BTreeMap<&'a str, BTreeSet<&'a str>>,
    own: BTreeSet<&'a str>,
    measured: BTreeSet<&'a str>,
    names: Option<&'a Names>,
    tokens: Option<&'a BTreeSet<String>>,
}

/// One sentence for each name a rule uses that the family it names does
/// not declare, and each token that `tokens`, the theme's token names
/// without their prefix, does not hold. Tokens go unchecked without a list.
pub fn cross_family<'a>(
    families: &[&'a Family],
    tokens: Option<&'a BTreeSet<String>>,
) -> Vec<String> {
    let mut declared = declared(families);
    declared.tokens = tokens;
    let mut refused = BTreeSet::new();
    for family in families {
        for rule in rules(family) {
            let at = rule.at.as_deref().unwrap_or("a rule");
            let mut say = |why: String| refused.insert(format!("{}: {at} {why}", family.tag));
            for (property, _) in &rule.set {
                if let Some(why) = declared.custom_property(property) {
                    say(why);
                }
            }
            for (_, value) in rule.values.iter().chain(&rule.set) {
                visit(value, &mut |value| {
                    if let Some(why) = declared.read(value) {
                        say(why);
                    }
                });
            }
        }
    }
    refused.into_iter().collect()
}

/// Every family's hooks, by its prefix, and every private value and
/// measured length any rule names.
fn declared<'a>(families: &[&'a Family]) -> Declared<'a> {
    let mut declared = Declared {
        names: families.first().map(|family| &family.names),
        ..Declared::default()
    };
    for family in families {
        let hooks = declared.hooks.entry(family.name.as_str()).or_default();
        for rule in rules(family) {
            declared
                .own
                .extend(rule.values.iter().map(|(name, _)| name.as_str()));
            for (_, value) in rule.values.iter().chain(&rule.set) {
                visit(value, &mut |value| match value {
                    Value::Hook { name, of: None, .. } => {
                        hooks.insert(name.as_str());
                    }
                    Value::Measured { name, .. } => {
                        declared.measured.insert(name.as_str());
                    }
                    _ => {}
                });
            }
        }
    }
    declared
}

impl Declared<'_> {
    /// Why a quoted custom property a rule sets names nothing: another
    /// family's hook it does not read, or a token, under the token prefix,
    /// the theme does not hold. A measured length is the script's.
    fn custom_property(&self, property: &str) -> Option<String> {
        let name = property.strip_prefix("--")?;
        if let Some(token) = self.names.and_then(|names| names.token_of(property)) {
            return self
                .no_token(token)
                .then(|| format!("sets `{property}`, which is no token in the theme"));
        }
        if name.starts_with('_') || self.measured.contains(name) {
            return None;
        }
        let owner = self
            .hooks
            .keys()
            .filter(|prefix| {
                name.strip_prefix(**prefix)
                    .is_some_and(|rest| rest.starts_with('-'))
            })
            .max_by_key(|prefix| prefix.len());
        let Some(owner) = owner else {
            return Some(format!(
                "sets `{property}`, which is no family's hook, no token and no measured length"
            ));
        };
        let hook = &name[owner.len() + 1..];
        (!self.hooks[owner].contains(hook))
            .then(|| format!("sets `{property}`, and `{owner}` reads no hook `{hook}`"))
    }

    /// Whether a token list is known and does not hold `name`.
    fn no_token(&self, name: &str) -> bool {
        self.tokens.is_some_and(|tokens| !tokens.contains(name))
    }

    /// Why a value names nothing: `hookOf()` a hook its family does not
    /// read, `inherited('_x')` a private value no family sets, or `token()`
    /// a token the theme does not hold.
    fn read(&self, value: &Value) -> Option<String> {
        match value {
            Value::Token(name) => self
                .no_token(name)
                .then(|| format!("reads `token('{name}')`, which is no token in the theme")),
            Value::Hook {
                name, of: Some(of), ..
            } => match self.hooks.get(of.as_str()) {
                None => Some(format!(
                    "reads `hookOf('{of}', '{name}')`, and no family's prefix is `{of}`"
                )),
                Some(hooks) if !hooks.contains(name.as_str()) => Some(format!(
                    "reads `hookOf('{of}', '{name}')`, and `{of}` reads no hook `{name}`"
                )),
                Some(_) => None,
            },
            Value::Inherited { name, .. } => {
                let own = name.strip_prefix('_')?;
                /* The theme's own, as the mode opposite the page's, which
                the project's `inherited` names. */
                if self
                    .names
                    .is_some_and(|names| names.inherited.iter().any(|one| one == own))
                {
                    return None;
                }
                (!self.own.contains(own)).then(|| {
                    format!(
                        "reads `inherited('{name}')`, and no family sets the private value `{own}`"
                    )
                })
            }
            _ => None,
        }
    }
}

/// Calls `each` on `value` and every value inside it.
pub fn visit<'a>(value: &'a Value, each: &mut impl FnMut(&'a Value)) {
    each(value);
    match value {
        Value::Calc {
            operands: values, ..
        }
        | Value::List(values)
        | Value::Space(values)
        | Value::Function {
            arguments: values, ..
        } => {
            for value in values {
                visit(value, each);
            }
        }
        Value::Derived { fallback, .. }
        | Value::Hook { fallback, .. }
        | Value::Inherited { fallback, .. }
        | Value::Measured { fallback, .. }
        | Value::Own { fallback, .. }
        | Value::Quote { alt: fallback, .. } => {
            if let Some(fallback) = fallback {
                visit(fallback, each);
            }
        }
        Value::Mix { first, second, .. }
        | Value::Scheme {
            dark: first,
            light: second,
        } => {
            visit(first, each);
            visit(second, each);
        }
        Value::Web(value) => visit(value, each),
        Value::Fit(_) | Value::Keyword(_) | Value::Number(_) | Value::Text(_) | Value::Token(_) => {
        }
    }
}

#[cfg(test)]
#[path = "names_tests.rs"]
mod tests;
