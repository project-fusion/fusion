//! Reads a styled source: its props, its stylesheet, and its table of rules
//! and animations, in the order they are written.

use crate::family::api;
use crate::family::ir::conditions::{conditions, host_place, web_only};
use crate::family::ir::specificity::specificity;
use crate::family::ir::values::{self, declarations};
use crate::family::ir::{Condition, Item, Keyframes, Place, Rule, Styled};
use crate::family::read::Lit;

/// Reads a styled source from the module's default export.
///
/// # Errors
///
/// A sentence saying what in the table is not in the vocabulary.
pub fn styled(export: &Lit) -> Result<Styled, String> {
    let Lit::Call(helper, arguments) = export else {
        return Err("the default export is not a call to `family()`".to_owned());
    };
    let [Lit::Text(name), Lit::Object(body)] = arguments.as_slice() else {
        return Err(format!(
            "`{helper}()` takes a hook prefix and an object of `props`, `rules` and `stylesheet`"
        ));
    };
    let field = |key: &str| {
        body.iter()
            .find(|(field, _)| field == key)
            .map(|(_, value)| value)
    };
    if let Some((key, _)) = body
        .iter()
        .find(|(key, _)| !matches!(key.as_str(), "over" | "props" | "rules" | "stylesheet"))
    {
        return Err(format!("`{key}` is not a field a styled source has"));
    }
    let Some(Lit::Array(items)) = field("rules") else {
        return Err("a styled source has an array of `rules`".to_owned());
    };
    let props = match field("props") {
        None => Vec::new(),
        Some(Lit::Array(props)) => api::props(props, api::Tier::Styled)?,
        Some(_) => return Err("`props` is an array".to_owned()),
    };
    let stylesheet = match field("stylesheet") {
        Some(Lit::Text(path)) => path.clone(),
        None => String::new(),
        Some(_) => return Err("`stylesheet` is a path under the styled package's `src`".to_owned()),
    };
    let mut rules = Vec::new();
    for (index, item) in items.iter().enumerate() {
        let at = match item {
            Lit::Object(fields) => {
                fields
                    .iter()
                    .find_map(|(key, value)| match (key.as_str(), value) {
                        ("at", Lit::Text(at)) => Some(at.clone()),
                        _ => None,
                    })
            }
            _ => None,
        };
        let at = at.unwrap_or_else(|| format!("rule {}", index + 1));
        for read in self::item(item).map_err(|why| format!("{at}: {why}"))? {
            rules.push(read);
        }
    }
    let mut order = 0;
    for item in &mut rules {
        if let Item::Rule(rule) = item {
            rule.order = order;
            order += 1;
        }
    }
    Ok(Styled {
        name: name.clone(),
        props,
        rules,
        stylesheet,
    })
}

/// One item of a table: an animation, or a rule for each of its `when`s.
fn item(lit: &Lit) -> Result<Vec<Item>, String> {
    let Lit::Object(fields) = lit else {
        return Err("a rule is an object".to_owned());
    };
    let field = |key: &str| {
        fields
            .iter()
            .find(|(name, _)| name == key)
            .map(|(_, value)| value)
    };
    if let Some(name) = field("keyframes") {
        return Ok(vec![Item::Keyframes(keyframes(name, field("frames"))?)]);
    }
    for (key, _) in fields {
        if !matches!(
            key.as_str(),
            "at" | "exact"
                | "group"
                | "inner"
                | "on"
                | "platform"
                | "selector"
                | "set"
                | "slotted"
                | "supports"
                | "values"
                | "when"
        ) {
            return Err(format!("`{key}` is not a field a rule has"));
        }
    }
    let text = |key: &str| -> Result<Option<String>, String> {
        match field(key) {
            None => Ok(None),
            Some(Lit::Text(text)) => Ok(Some(text.clone())),
            Some(_) => Err(format!("`{key}` is a string")),
        }
    };
    let targets = targets(field("on"))?;
    let platform = text("platform")?;
    if platform
        .as_deref()
        .is_some_and(|platform| platform != "web" && platform != "native")
    {
        return Err("`platform` is `web`, `native` or absent".to_owned());
    }
    let native_only = platform.as_deref() == Some("native");
    let alternatives = match field("when") {
        None => vec![Vec::new()],
        Some(Lit::Array(each)) => each.iter().map(conditions).collect::<Result<_, _>>()?,
        Some(lit) => vec![conditions(lit)?],
    };
    let set = field("set")
        .map(values::set)
        .transpose()?
        .unwrap_or_default();
    let values = field("values")
        .map(declarations)
        .transpose()?
        .unwrap_or_default();
    let exact = exactly(field("exact"), &targets)?;
    let inner = text("inner")?;
    let selector = text("selector")?;
    let slotted = text("slotted")?;
    let supports = text("supports")?;
    let at = text("at")?;
    let group = text("group")?;
    targets
        .iter()
        .flat_map(|target| {
            alternatives
                .iter()
                .map(move |when| (target.clone(), when.clone()))
        })
        .map(|((target, region), when)| {
            let host = target == "host" && region.is_none();
            let mut rule = Rule {
                at: at.clone(),
                group: group.clone(),
                exact,
                inner: inner.clone(),
                order: 0,
                region,
                selector: selector.clone(),
                set: set.clone(),
                slotted: slotted.clone(),
                specificity: [0, 0, 0],
                supports: supports.clone(),
                web_only: platform.as_deref() == Some("web") || when.iter().any(web_only),
                native_only,
                target,
                values: values.clone(),
                when: placed(when, slotted.is_some(), host),
            };
            refused(&rule)?;
            rule.specificity = specificity(&rule);
            Ok(Item::Rule(Box::new(rule)))
        })
        .collect()
}

/// Whether a rule is on its part alone: `exact`, which only a part takes.
fn exactly(exact: Option<&Lit>, targets: &[(String, Option<String>)]) -> Result<bool, String> {
    let exact = match exact {
        None => false,
        Some(Lit::Bool(true)) => true,
        Some(_) => return Err("`exact` is `true` or absent".to_owned()),
    };
    if exact
        && targets
            .iter()
            .any(|(target, region)| target == "host" || region.is_some())
    {
        return Err(
            "`exact` is a part's: a rule on the host or a region has no part to match alone"
                .to_owned(),
        );
    }
    Ok(exact)
}

/// `child: 'first'` and `'later'` are the slotted child's own place, and on a
/// rule that styles no slotted children, the target's: on the host, the
/// host's own.
fn placed(when: Vec<Condition>, slotted: bool, host: bool) -> Vec<Condition> {
    if slotted {
        return when;
    }
    when.into_iter()
        .map(|condition| match condition {
            condition if host => host_place(condition),
            Condition::Child { first } => {
                let place = Condition::Place {
                    place: Place::First,
                };
                if first {
                    place
                } else {
                    Condition::Not {
                        condition: Box::new(place),
                    }
                }
            }
            condition => condition,
        })
        .collect()
}

/// Why a rule's conditions cannot apply to what it is on.
fn refused(rule: &Rule) -> Result<(), String> {
    let any =
        |test: fn(&Condition) -> bool| rule.when.iter().any(|condition| test(unwrapped(condition)));
    let own = any(|condition| {
        matches!(
            condition,
            Condition::Pseudo { .. } | Condition::Part { .. } | Condition::Place { .. }
        )
    });
    if rule.region.is_some() && rule.slotted.is_none() && own {
        return Err(
            "a region's slot has no interaction, state or place of its own: the condition goes on the content passed in, with `slotted`"
                .to_owned(),
        );
    }
    if rule.target == "host" && any(|condition| matches!(condition, Condition::Part { .. })) {
        return Err("a part's state applies to a part, and this rule is on the host".to_owned());
    }
    if rule.target == "host"
        && rule.region.is_none()
        && any(|condition| matches!(condition, Condition::Within { .. }))
    {
        return Err(
            "`within` places a part or a region inside a part, and this rule is on the host"
                .to_owned(),
        );
    }
    Ok(())
}

/// The condition a `:not()` holds, or the condition itself.
pub fn unwrapped(condition: &Condition) -> &Condition {
    match condition {
        Condition::Not { condition } => unwrapped(condition),
        condition => condition,
    }
}

/// What a rule is `on`, each with the region it is on where it is one.
/// Several parts or regions are several rules, as several `when`s are.
fn targets(on: Option<&Lit>) -> Result<Vec<(String, Option<String>)>, String> {
    let names = |lit: &Lit, what: &str| -> Result<Vec<String>, String> {
        match lit {
            Lit::Text(name) => Ok(vec![name.clone()]),
            Lit::Array(names) if !names.is_empty() => names
                .iter()
                .map(|name| match name {
                    Lit::Text(name) => Ok(name.clone()),
                    _ => Err(format!("`on` is {what}, or an array of them")),
                })
                .collect(),
            _ => Err(format!("`on` is {what}, or an array of them")),
        }
    };
    match on {
        /* A region is the slot it is, wherever it sits, so its rule is the
        host's, and `within` says which part it sits in. */
        Some(Lit::Object(fields)) => match fields.as_slice() {
            [(key, regions)] if key == "region" => Ok(names(regions, "`{ region }`")?
                .into_iter()
                .map(|region| ("host".to_owned(), Some(region)))
                .collect()),
            _ => Err("`on` is a part's name, an array of them, or `{ region }`".to_owned()),
        },
        Some(on) => Ok(names(on, "a part's name")?
            .into_iter()
            .map(|target| (target, None))
            .collect()),
        None => Err("a rule names what it is `on`".to_owned()),
    }
}

/// An animation: its name and its frames.
fn keyframes(name: &Lit, frames: Option<&Lit>) -> Result<Keyframes, String> {
    let Lit::Text(name) = name else {
        return Err("`keyframes` is a name".to_owned());
    };
    let Some(Lit::Array(frames)) = frames else {
        return Err("an animation has `frames`".to_owned());
    };
    let frames = frames
        .iter()
        .map(|frame| match frame {
            Lit::Array(pair) => match pair.as_slice() {
                [Lit::Text(at), declarations] => Ok((at.clone(), values::set(declarations)?)),
                _ => Err("a frame is `[selector, declarations]`".to_owned()),
            },
            _ => Err("a frame is `[selector, declarations]`".to_owned()),
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Keyframes {
        frames,
        name: name.clone(),
    })
}

#[cfg(test)]
#[path = "table_tests.rs"]
mod tests;
