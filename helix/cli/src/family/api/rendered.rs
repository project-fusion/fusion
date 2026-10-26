//! A headless source written with `render`, rewritten into the builder
//! form's keys, so [`super::headless`] reads one shape.
//!
//! **A spelling of one shape, as the style table's sugar is.** `memberOf:
//! set(of, { pressChooses })` is `item: item(of, { chooses })`. `props` is an
//! object by name in camelCase, each a default or a spec: `dismissLabel:
//! 'Close'` is `prop('dismiss-label', 'string', { default: 'Close' })`, and
//! `string()`, `oneOf()`, `property()` and `web()` say the rest. `events` is
//! an object too: `beforeSelect: cancelable(['value'])` is
//! `event('before-select', { cancelable: true, detail: ['value'] })`. The
//! keys of `derived` are camelCase, and `render` is the `tree` the reader
//! has already read. Every other key is the builder form's, as written.

use crate::family::read::{kebab, Lit};

#[cfg(test)]
#[path = "rendered_tests.rs"]
mod tests;

/// The prop types a spec names with no default.
const TYPES: &[(&str, &str)] = &[
    ("boolean", "boolean"),
    ("number", "number"),
    ("numberOrString", "number | string"),
    ("object", "object"),
    ("string", "string"),
    ("time", "time"),
];

/// Whether a headless source's default export is written with `render`.
pub fn is_rendered(export: &Lit) -> bool {
    matches!(export, Lit::Call(helper, arguments)
        if helper == "headless"
            && matches!(arguments.get(1), Some(Lit::Object(body)) if body.iter().any(|(key, _)| key == "render")))
}

/// The source in the builder form's keys.
///
/// # Errors
///
/// A sentence naming what is not in the JSX form's shape.
pub fn rewrite(export: &Lit) -> Result<Lit, String> {
    let Lit::Call(helper, arguments) = export else {
        return Err("the default export is not a call to `headless()`".to_owned());
    };
    let [Lit::Text(name), Lit::Object(body)] = arguments.as_slice() else {
        return Err(format!("`{helper}()` takes a family's name and an object"));
    };
    if body.last().is_some_and(|(key, _)| key != "render") {
        return Err("`render` comes last, after the keys it reads".to_owned());
    }
    let mut fields = Vec::with_capacity(body.len());
    for (key, value) in body {
        let field = match key.as_str() {
            "memberOf" => ("item".to_owned(), member(value)?),
            "props" => ("props".to_owned(), props(value)?),
            "events" => ("events".to_owned(), events(value)?),
            "derived" => ("derived".to_owned(), derived(value)?),
            "render" => ("tree".to_owned(), value.clone()),
            "item" | "tree" => {
                return Err(format!(
                    "`{key}` is the builder form's: a source written with `render` writes {}",
                    if key == "item" {
                        "`memberOf: set(...)`"
                    } else {
                        "its nodes in `render`"
                    }
                ))
            }
            _ => (key.clone(), value.clone()),
        };
        fields.push(field);
    }
    Ok(Lit::Call(
        helper.clone(),
        vec![Lit::Text(name.clone()), Lit::Object(fields)],
    ))
}

/// `set(of, { pressChooses, ... })` as `item(of, { chooses, ... })`.
fn member(value: &Lit) -> Result<Lit, String> {
    let Lit::Call(helper, arguments) = value else {
        return Err("`memberOf` is `set(family, { ... })`".to_owned());
    };
    let (true, Some(of)) = (helper == "set", arguments.first()) else {
        return Err("`memberOf` is `set(family, { ... })`".to_owned());
    };
    let mut item = vec![of.clone()];
    match arguments.get(1) {
        None => {}
        Some(Lit::Object(fields)) => item.push(Lit::Object(
            fields
                .iter()
                .map(|(key, value)| {
                    let key = if key == "chooses" {
                        return Err("`set()` spells it `pressChooses`".to_owned());
                    } else if key == "pressChooses" {
                        "chooses".to_owned()
                    } else {
                        key.clone()
                    };
                    Ok((key, value.clone()))
                })
                .collect::<Result<_, String>>()?,
        )),
        Some(_) => return Err("`set()` takes the family it joins and an object".to_owned()),
    }
    Ok(Lit::Call("item".to_owned(), item))
}

/// A key in camelCase, refused in any other case.
fn camel_key(key: &str, what: &str) -> Result<String, String> {
    if key.contains('-') {
        return Err(format!(
            "the {what} `{key}` is named in camelCase, as `{}`: the web's name is its hyphenated form",
            camel(key)
        ));
    }
    Ok(kebab(key))
}

fn camel(name: &str) -> String {
    let mut written = String::new();
    let mut upper = false;
    for character in name.chars() {
        if character == '-' {
            upper = true;
        } else if upper {
            written.extend(character.to_uppercase());
            upper = false;
        } else {
            written.push(character);
        }
    }
    written
}

/// What a prop spec says beyond its type.
#[derive(Default)]
struct Spec {
    kind: Option<Lit>,
    default: Option<Lit>,
    web: bool,
    property: bool,
}

/// `props: { dismissLabel: 'Close', href: string() }` as `prop()` calls.
fn props(value: &Lit) -> Result<Lit, String> {
    let Lit::Object(entries) = value else {
        return Err("`props` is an object of each prop's default or spec, by name".to_owned());
    };
    let mut read = Vec::with_capacity(entries.len());
    for (key, value) in entries {
        let name = camel_key(key, "prop")?;
        let mut spec = Spec::default();
        prop_spec(&name, value, &mut spec)?;
        let Some(kind) = spec.kind else {
            return Err(format!("prop `{name}` says no type"));
        };
        let mut extra = Vec::new();
        if spec.property {
            extra.push(("attribute".to_owned(), Lit::Bool(false)));
        }
        if let Some(default) = spec.default {
            extra.push(("default".to_owned(), default));
        }
        if spec.web {
            extra.push(("platform".to_owned(), Lit::Text("web".to_owned())));
        }
        read.push(Lit::Call(
            "prop".to_owned(),
            vec![Lit::Text(name), kind, Lit::Object(extra)],
        ));
    }
    Ok(Lit::Array(read))
}

/// One prop's value: a default, which says the type, or a spec.
fn prop_spec(name: &str, value: &Lit, spec: &mut Spec) -> Result<(), String> {
    let refused = || {
        format!("prop `{name}` is a default, `string()` and the other types, `oneOf([...], default)`, `property(...)` or `web(...)`")
    };
    match value {
        Lit::Bool(_) => (spec.kind, spec.default) = (Some(text("boolean")), Some(value.clone())),
        Lit::Number(_) => (spec.kind, spec.default) = (Some(text("number")), Some(value.clone())),
        Lit::Text(_) => (spec.kind, spec.default) = (Some(text("string")), Some(value.clone())),
        Lit::Call(helper, arguments) => match (helper.as_str(), arguments.as_slice()) {
            ("web", [inner]) if !spec.web => {
                spec.web = true;
                prop_spec(name, inner, spec)?;
            }
            ("property", [inner]) if !spec.property => {
                spec.property = true;
                prop_spec(name, inner, spec)?;
            }
            ("oneOf", [values @ Lit::Array(_), rest @ ..]) if rest.len() <= 1 => {
                spec.kind = Some(values.clone());
                spec.default = rest.first().cloned();
            }
            (helper, []) => {
                let Some((_, kind)) = TYPES.iter().find(|(written, _)| *written == helper) else {
                    return Err(refused());
                };
                spec.kind = Some(text(kind));
            }
            _ => return Err(refused()),
        },
        _ => return Err(refused()),
    }
    Ok(())
}

fn text(value: &str) -> Lit {
    Lit::Text(value.to_owned())
}

/// `events: { beforeSelect: cancelable(['value']) }` as `event()` calls.
fn events(value: &Lit) -> Result<Lit, String> {
    let Lit::Object(entries) = value else {
        return Err("`events` is an object of each event's detail or spec, by name".to_owned());
    };
    entries
        .iter()
        .map(|(key, value)| {
            let name = camel_key(key, "event")?;
            let mut extra = Vec::new();
            event_spec(&name, value, &mut extra)?;
            Ok(Lit::Call(
                "event".to_owned(),
                vec![Lit::Text(name), Lit::Object(extra)],
            ))
        })
        .collect::<Result<_, String>>()
        .map(Lit::Array)
}

/// One event's value: its detail's fields, `cancelable()`, `bare()`,
/// `web()`, or an object of the builder form's fields.
fn event_spec(name: &str, value: &Lit, extra: &mut Vec<(String, Lit)>) -> Result<(), String> {
    let detail = |arguments: &[Lit], extra: &mut Vec<(String, Lit)>| match arguments {
        [] => Ok(()),
        [fields @ Lit::Array(_)] => {
            extra.push(("detail".to_owned(), fields.clone()));
            Ok(())
        }
        _ => Err(format!(
            "event `{name}`: its detail is an array of field names"
        )),
    };
    match value {
        Lit::Array(_) => extra.push(("detail".to_owned(), value.clone())),
        Lit::Object(fields) => extra.extend(fields.iter().cloned()),
        Lit::Call(helper, arguments) => match helper.as_str() {
            "cancelable" | "bare" => {
                extra.push((helper.clone(), Lit::Bool(true)));
                detail(arguments, extra)?;
            }
            "web" => {
                let [inner] = arguments.as_slice() else {
                    return Err(format!("event `{name}`: `web()` takes the event"));
                };
                event_spec(name, inner, extra)?;
                extra.push(("platform".to_owned(), text("web")));
            }
            _ => {
                return Err(format!(
                    "event `{name}` is its detail's fields, `cancelable([...])`, `bare([...])`, or `web(...)`"
                ))
            }
        },
        _ => {
            return Err(format!(
                "event `{name}` is its detail's fields, `cancelable([...])`, `bare([...])`, or `web(...)`"
            ))
        }
    }
    Ok(())
}

/// `derived: { backName: derive(...) }` with each key the name it is read by.
fn derived(value: &Lit) -> Result<Lit, String> {
    let Lit::Object(entries) = value else {
        return Err("`derived` is an object of computed values, by name".to_owned());
    };
    entries
        .iter()
        .map(|(key, value)| Ok((camel_key(key, "computed value")?, value.clone())))
        .collect::<Result<_, String>>()
        .map(Lit::Object)
}
