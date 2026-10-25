//! The conditions of a rule's `when` read beyond a prop's own: the custom
//! states, what holds of the parts around the target and inside it, the
//! parts the target is as well, and an absent attribute.

use super::{interaction, not, pseudo, Condition};
use crate::family::read::Lit;

/// Reads one of `within`, `holds`, `also` and `lacks` into `read`.
pub fn read(key: &str, value: &Lit, read: &mut Vec<Condition>) -> Result<(), String> {
    match (key, value) {
        ("within", Lit::Text(part)) => read.push(Condition::Within {
            on: None,
            part: part.clone(),
        }),
        ("within", Lit::Object(parts)) => read.push(within(parts)?),
        /* Whether a part is drawn at all, `:has([part="icon"])`, as a row
        lays out around an icon only while it has one. */
        ("holds", Lit::Object(parts)) => match parts.as_slice() {
            [(part, Lit::Bool(drawn))] => {
                let condition = Condition::Holds {
                    names: Vec::new(),
                    part: part.clone(),
                };
                read.push(if *drawn { condition } else { not(condition) });
            }
            _ => read.push(holds(parts)?),
        },
        ("also", Lit::Object(parts)) => {
            for (name, value) in parts {
                let Lit::Bool(value) = value else {
                    return Err(format!("`also.{name}` takes `true` or `false`"));
                };
                read.push(Condition::Also {
                    name: name.clone(),
                    value: *value,
                });
            }
        }
        /* An attribute that is absent, as `:not([disabled])` on an element
        no form owns, which `:disabled` never matches. */
        ("lacks", Lit::Text(name)) => read.push(Condition::Absent { name: name.clone() }),
        _ => return Err(format!("`{key}` in `when` does not take that value")),
    }
    Ok(())
}

/// What holds of a part a rule is `within`.
const WITHIN: &str = "`hover`, `focusVisible`, `focusWithin` or `active` as `true`, and `holds`";

/// `within: { field: { hover: true } }`: one part, and what must hold of it,
/// an interaction or a part inside it that holds one. The part may be
/// `host`, `within: { host: { hover: true } }`, the host's own interaction
/// on a part, `:host(:hover) [part="dismiss"]`.
fn within(parts: &[(String, Lit)]) -> Result<Condition, String> {
    let [(part, Lit::Object(fields))] = parts else {
        return Err(
            "`within` is a part's name, or `{ <part>: { <interaction>: true } }` for one part"
                .to_owned(),
        );
    };
    let mut on = Vec::new();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("hover" | "focusVisible" | "active", Lit::Bool(true)) => {
                on.push(pseudo(&[interaction(key)?]));
            }
            /* Focus inside the host, which a part around never asks: a part
            is focused itself, or holds a part that is. */
            ("focusWithin", Lit::Bool(true)) if part == "host" => {
                on.push(pseudo(&[interaction(key)?]));
            }
            ("holds", Lit::Object(held)) => on.push(holds(held)?),
            _ => return Err(format!("`within.{part}` takes {WITHIN}")),
        }
    }
    Ok(Condition::Within {
        on: Some(on),
        part: part.clone(),
    })
}

/// `holds: { control: 'focusVisible' }`: a part inside, and the interaction
/// it holds, or an array of them.
fn holds(parts: &[(String, Lit)]) -> Result<Condition, String> {
    let names = |lit: &Lit| -> Option<Vec<&'static str>> {
        match lit {
            Lit::Text(one) => interaction(one).ok().map(|one| vec![one]),
            Lit::Array(many) if !many.is_empty() => many
                .iter()
                .map(|one| match one {
                    Lit::Text(one) => interaction(one).ok(),
                    _ => None,
                })
                .collect(),
            _ => None,
        }
    };
    match parts {
        [(part, lit)] => names(lit)
            .map(|names| Condition::Holds {
                names: names.into_iter().map(str::to_owned).collect(),
                part: part.clone(),
            })
            .ok_or_else(|| {
                format!("`holds.{part}` names an interaction, or an array of them, or is `true` or `false`")
            }),
        _ => Err("`holds` names one part and the interaction it holds".to_owned()),
    }
}

/// `state`: a custom state, every one of several, or an object of states that
/// hold and states that do not.
pub fn states(value: &Lit, read: &mut Vec<Condition>) -> Result<(), String> {
    let state = |name: &str| Condition::State {
        name: name.to_owned(),
    };
    match value {
        Lit::Text(name) => read.push(state(name)),
        Lit::Array(names) => {
            for name in names {
                let Lit::Text(name) = name else {
                    return Err("`state` lists the names of custom states".to_owned());
                };
                read.push(state(name));
            }
        }
        Lit::Object(names) => {
            for (name, holds) in names {
                match holds {
                    Lit::Bool(true) => read.push(state(name)),
                    Lit::Bool(false) => read.push(not(state(name))),
                    _ => return Err(format!("`state.{name}` takes `true` or `false`")),
                }
            }
        }
        _ => {
            return Err(
                "`state` is a custom state's name, an array of them, or an object of them"
                    .to_owned(),
            )
        }
    }
    Ok(())
}
