//! What a rule applies under: the conditions, and a source's `when` read into
//! them.
//!
//! **Each condition has a web output and a native meaning, or says it has
//! none.** Print, forced colors and an element that has not upgraded are the
//! web's alone, and a rule under one is left out of the native output, as
//! [`web_only`] says.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use crate::family::read::Lit;

#[cfg(test)]
#[path = "conditions_tests.rs"]
mod tests;

#[path = "around.rs"]
mod around;

#[path = "places.rs"]
mod places;

#[path = "media.rs"]
mod media;

pub use media::web_only;
pub use places::host_place;
use places::{child, nth, of_type};

/// What a rule applies under.
#[derive(Clone, Debug, PartialEq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "kebab-case", tag = "kind")]
pub enum Condition {
    /// A reflected property that is absent, `:not([name])`.
    Absent {
        name: String,
    },
    /// Where a slotted child stands among its siblings: the first, or any
    /// after it, `:first-child` or `:not(:first-child)` inside `::slotted()`.
    Child {
        first: bool,
    },
    /// A reflected property, `[name="value"]`, or `[name]` with no value.
    Attribute {
        name: String,
        value: Option<String>,
    },
    /// The element has upgraded, `:defined`. A native element always has, so
    /// the rule under its negation is the web's alone.
    Defined,
    /// The values a part starts from as it is drawn, which its transitions
    /// move away from: `@starting-style` on the web, and the first render on
    /// a phone.
    Entering,
    /// A region holds something: `:state(has-<region>)` on the web, which
    /// the element sets, and what is passed into the region on a phone.
    Filled {
        region: String,
    },
    /// The text direction, `:dir(rtl)`.
    Dir {
        value: Direction,
    },
    Disabled {
        value: bool,
    },
    /// Where the host stands among the element's siblings,
    /// `:host(:first-child)`, as a crumb that is first draws no separator.
    HostPlace {
        place: Place,
    },
    /// Where the host stands among the siblings of its own kind, counting
    /// from one, `:host(:nth-of-type(n))`, as a meter's second segment takes
    /// the second color of the series.
    HostOfType {
        at: u32,
    },
    /// A media query, written as it appears after `@media`. Several in one
    /// rule are joined with `and`.
    Media {
        query: String,
    },
    /// The element's own width below a length, `@container (inline-size <
    /// 22rem)` on the web, where the host is its own size container. A
    /// native view reads its own laid-out width.
    Container {
        below: String,
    },
    /// The window narrower than a length, `@media (width < 30rem)` on the
    /// web, and the window's width less what the theme's rem makes it on a
    /// phone. Only a layer's rules read it, since only a layer's box is
    /// placed in the window.
    Window {
        below: String,
    },
    /// The condition does not hold, `:not()` around what it writes.
    Not {
        condition: Box<Condition>,
    },
    /// A reflected property that is any one of several values,
    /// `:is([name="a"], [name="b"])`.
    OneOf {
        name: String,
        values: Vec<String>,
    },
    /// A state of the part itself: `hidden`, a `data-` attribute, or
    /// `disabled`, which the web reads natively or from `aria-disabled`.
    /// With `is`, the attribute holds that value, `[data-band="good"]`.
    Part {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        is: Option<String>,
        name: String,
        value: bool,
    },
    /// Where the target stands among its siblings: a part among its own, or
    /// a slotted child among the others passed in. On a rule on the host it
    /// is read as a [`Condition::HostPlace`].
    Place {
        place: Place,
    },
    /// An interaction on the target, `hover`, `focus-visible`, `focus-within`
    /// or `active`, or any one of several, which the web writes as `:is()`.
    Pseudo {
        names: Vec<String>,
    },
    /// A custom state, `:state(name)`.
    State {
        name: String,
    },
    /// The target is drawn inside a part, `[part="name"]` before it, with
    /// what must hold of that part written after it: an interaction,
    /// `[part="field"]:hover`, or a part inside it that holds one,
    /// `[part="track"]:has([part="control"]:focus-visible)`.
    Within {
        part: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        on: Option<Vec<Condition>>,
    },
    /// A part inside the target holds an interaction, or any one of
    /// several, `:has([part="control"]:focus-visible)`, or with no
    /// interaction is drawn at all, `:has([part="icon"])`.
    Holds {
        names: Vec<String>,
        part: String,
    },
    /// The target is the part `name` as well, `[part~="name"]`, as a mark is
    /// `mark-dash` while it draws the dash, or is not, with `value` false.
    Also {
        name: String,
        value: bool,
    },
}

/// A text direction.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Ltr,
    Rtl,
}

/// Where a node stands among its siblings.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Place {
    /// The second, the fourth, and every other from there, counting from one.
    Even,
    First,
    Last,
    /// The `at`th, counting from one, from the end where `from_end`, and
    /// every one after it as well where `onward`, as a speed dial's actions
    /// arrive one after another: `:nth-child(2)`, `:nth-last-child(n + 5)`.
    #[serde(rename_all = "camelCase")]
    Nth {
        at: u32,
        from_end: bool,
        onward: bool,
    },
    /// The first, the third, and every other from there.
    Odd,
    Only,
}

fn not(condition: Condition) -> Condition {
    Condition::Not {
        condition: Box::new(condition),
    }
}

/// A length in rems, such as `22rem`, which a width condition is written in.
fn rem_length(length: &str) -> bool {
    length
        .strip_suffix("rem")
        .is_some_and(|number| number.parse::<f64>().is_ok_and(|value| value > 0.0))
}

/// A source's `when`, read into the conditions it says.
pub fn conditions(lit: &Lit) -> Result<Vec<Condition>, String> {
    let Lit::Object(entries) = lit else {
        return Err("`when` is an object, or an array of them".to_owned());
    };
    let mut read = Vec::new();
    for (key, value) in entries {
        match (key.as_str(), value) {
            ("disabled", Lit::Bool(value)) => read.push(Condition::Disabled { value: *value }),
            ("state", value) => around::states(value, &mut read)?,
            /* An attribute that is present, as `[disabled]` on an element no
            form owns, which `:disabled` does not match. */
            ("has", Lit::Text(name)) => read.push(Condition::Attribute {
                name: name.clone(),
                value: None,
            }),
            ("dir", Lit::Text(value)) => read.push(Condition::Dir {
                value: match value.as_str() {
                    "ltr" => Direction::Ltr,
                    "rtl" => Direction::Rtl,
                    _ => return Err("`dir` is `ltr` or `rtl`".to_owned()),
                },
            }),
            ("defined", Lit::Bool(true)) => read.push(Condition::Defined),
            ("defined", Lit::Bool(false)) => read.push(not(Condition::Defined)),
            ("hover" | "focusVisible" | "focusWithin" | "active", Lit::Bool(holds)) => {
                let on = pseudo(&[interaction(key)?]);
                read.push(if *holds { on } else { not(on) });
            }
            /* Any one of several, which is one condition and one class-equivalent:
            `:is()` counts as its most specific argument. */
            ("interaction", Lit::Array(names)) => {
                let names =
                    names
                        .iter()
                        .map(|name| match name {
                            Lit::Text(name) if name != "focusWithin" => interaction(name),
                            _ => Err("`interaction` lists `hover`, `active` or `focusVisible`"
                                .to_owned()),
                        })
                        .collect::<Result<Vec<_>, _>>()?;
                read.push(pseudo(&names));
            }
            ("part", Lit::Object(states)) => {
                for (name, value) in states {
                    read.push(match value {
                        Lit::Bool(value) => Condition::Part {
                            is: None,
                            name: name.clone(),
                            value: *value,
                        },
                        Lit::Text(is) => Condition::Part {
                            is: Some(is.clone()),
                            name: name.clone(),
                            value: true,
                        },
                        _ => return Err(format!("`part.{name}` takes `true`, `false` or a value")),
                    });
                }
            }
            (
                "canHover" | "coarsePointer" | "entering" | "forcedColors" | "print"
                | "reducedMotion",
                value,
            ) => read.push(media::read(key, value)?),
            ("filled", value) => media::filled(value, &mut read)?,
            ("child", Lit::Text(place)) => read.push(child(place)?),
            /* Each place at once, in the order written, as a paragraph's last
            line that is not also its first: `:last-child:not(:first-child)`. */
            ("child", Lit::Array(places)) if !places.is_empty() => {
                for place in places {
                    let Lit::Text(place) = place else {
                        return Err("`child` lists places by name".to_owned());
                    };
                    read.push(child(place)?);
                }
            }
            ("place", Lit::Text(place)) => read.push(host_place(child(place)?)),
            ("nth" | "nthLast", value) => read.push(Condition::Place {
                place: nth(value, key == "nthLast")?,
            }),
            ("ofType", Lit::Number(at)) => read.push(Condition::HostOfType { at: of_type(*at)? }),
            ("ofType", _) => return Err("`ofType` is a whole number from 1".to_owned()),
            ("within" | "holds" | "also" | "lacks", value) => around::read(key, value, &mut read)?,
            ("inlineSize" | "window", Lit::Object(bounds)) => match bounds.as_slice() {
                [(bound, Lit::Text(length))] if bound == "below" && rem_length(length) => {
                    let below = length.clone();
                    read.push(if key == "window" {
                        Condition::Window { below }
                    } else {
                        Condition::Container { below }
                    });
                }
                _ => {
                    return Err(format!("`{key}` is `{{ below: '<number>rem' }}`"));
                }
            },
            (name, value) => attribute(name, value, &mut read)?,
        }
    }
    Ok(read)
}

/// A prop's condition: a value, any of several, present, absent, or none of
/// some values.
fn attribute(name: &str, value: &Lit, read: &mut Vec<Condition>) -> Result<(), String> {
    let texts = |lit: &Lit| -> Option<Vec<String>> {
        match lit {
            Lit::Text(one) => Some(vec![one.clone()]),
            Lit::Array(many) if !many.is_empty() => many
                .iter()
                .map(|one| match one {
                    Lit::Text(one) => Some(one.clone()),
                    _ => None,
                })
                .collect(),
            _ => None,
        }
    };
    match value {
        Lit::Text(value) => read.push(Condition::Attribute {
            name: name.to_owned(),
            value: Some(value.clone()),
        }),
        Lit::Bool(true) => read.push(Condition::Attribute {
            name: name.to_owned(),
            value: None,
        }),
        Lit::Bool(false) => read.push(Condition::Absent {
            name: name.to_owned(),
        }),
        Lit::Array(_) => read.push(Condition::OneOf {
            name: name.to_owned(),
            values: texts(value)
                .ok_or_else(|| format!("`{name}` in `when` lists the values it may take"))?,
        }),
        /* None of several values is one `:not()` each, which the web writes
        side by side and a native view reads as every one failing. */
        Lit::Object(fields) => {
            let values = match fields.as_slice() {
                [(key, values)] if key == "not" => texts(values),
                _ => None,
            }
            .ok_or_else(|| {
                format!("`{name}` in `when` takes `{{ not: a value or an array of them }}`")
            })?;
            for value in values {
                read.push(not(Condition::Attribute {
                    name: name.to_owned(),
                    value: Some(value),
                }));
            }
        }
        _ => {
            return Err(format!(
            "`{name}` in `when` takes a string, a boolean, an array of values or `{{ not: ... }}`"
        ))
        }
    }
    Ok(())
}

/// A source's name for an interaction, as the pseudo-class it is.
fn interaction(name: &str) -> Result<&'static str, String> {
    Ok(match name {
        "hover" => "hover",
        "active" => "active",
        "focusVisible" => "focus-visible",
        "focusWithin" => "focus-within",
        _ => return Err(format!("`{name}` is not an interaction")),
    })
}

fn pseudo(names: &[&str]) -> Condition {
    Condition::Pseudo {
        names: names.iter().map(|name| (*name).to_owned()).collect(),
    }
}
