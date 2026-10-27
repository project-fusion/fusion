//! What a family takes and sends: its props and its events.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use crate::family::api::Prop;
use crate::family::read::Lit;

/// An event, named without the event prefix the web sends it under.
#[derive(Debug, Serialize, JsonSchema, TS)]
pub struct Event {
    /// Whether an event that `follows` a value is sent on the first render
    /// too, where the value already holds, as a code whose value is too long
    /// from the start sends `error`.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub arrives: bool,
    /// Whether the web sends it under its own name alone, as `change`,
    /// without the event prefix.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub bare: bool,
    pub cancelable: bool,
    pub detail: Vec<String>,
    /// The value the element computes whose change sends the event, after
    /// the first render unless it `arrives`: each change of its words, and a flag's turn on, as
    /// a meter sends `band` as its reading moves into another band. Absent
    /// for an event a machine sends.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub follows: Option<String>,
    /// What each field of the detail holds where `follows` sends the event:
    /// a computed value or a prop, by name, as a progress bar's `complete`
    /// gives its `value` as the top of its range. A field not named here
    /// holds the value `follows` names.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(optional, as = "Option<BTreeMap<String, String>>")]
    #[schemars(default)]
    pub gives: BTreeMap<String, String>,
    pub name: String,
    /// `web` for an event only the web element sends, such as an icon's
    /// `load` once a file it fetched is drawn.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub platform: Option<Platform>,
}

/// What a prop holds: a primitive, or the strings it may take.
#[derive(Clone, Debug, PartialEq, Serialize, JsonSchema, TS)]
#[serde(untagged)]
pub enum PropType {
    Primitive(Primitive),
    Values(Vec<String>),
}

/// A primitive a prop holds.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Primitive {
    Boolean,
    Number,
    /// A count or a word, as a badge's `value` holds `8` or `New`.
    #[serde(rename = "number | string")]
    #[ts(rename = "number | string")]
    NumberOrString,
    /// An object, which the web's attribute holds as JSON, as
    /// `Intl.NumberFormat` options are.
    Object,
    String,
    /// A moment: a `Date`, a count of milliseconds since 1970, or an ISO 8601
    /// string, which the web's attribute writes, as a timeline entry's
    /// `datetime` is.
    Time,
}

/// A prop's value where nothing sets it.
#[derive(Clone, Debug, PartialEq, Serialize, JsonSchema, TS)]
#[serde(untagged)]
pub enum Literal {
    Flag(bool),
    Number(f64),
    Text(String),
}

/// The tier that declares a prop.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Headless,
    Styled,
}

/// The one platform a member may be limited to.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Web,
}

/// Reads `prop()` calls, for the tier that declares them.
///
/// # Errors
///
/// A sentence naming the prop that is not written as `prop(name, type, extra?)`.
pub fn props(items: &[Lit], tier: Tier) -> Result<Vec<Prop>, String> {
    items
        .iter()
        .map(|item| {
            let Lit::Call(helper, arguments) = item else {
                return Err("a prop is a call to `prop()`".to_owned());
            };
            let (Lit::Text(name), kind, extra) = (
                arguments.first().unwrap_or(&Lit::Bool(false)),
                arguments.get(1),
                arguments.get(2),
            ) else {
                return Err(format!("`{helper}()` takes a name first"));
            };
            let mut prop = Prop {
                attribute: true,
                default: None,
                name: name.clone(),
                platform: None,
                tier,
                kind: prop_type(name, kind)?,
            };
            if let Some(Lit::Object(extra)) = extra {
                for (key, value) in extra {
                    match (key.as_str(), value) {
                        ("attribute", Lit::Bool(false)) => prop.attribute = false,
                        ("default", value) => prop.default = Some(literal(name, value)?),
                        ("platform", Lit::Text(platform)) if platform == "web" => {
                            prop.platform = Some(Platform::Web);
                        }
                        (key, _) => {
                            return Err(format!("prop `{name}`: `{key}` is not a field a prop has"))
                        }
                    }
                }
            }
            Ok(prop)
        })
        .collect()
}

/// `boolean`, `number`, `number | string`, `object`, `string`, or an array of
/// the strings a prop may take.
/// `true` in the array is the attribute present with no value, held as the
/// empty string it is written as, so `[true, 'reverse']` is a switch with one
/// named value.
fn prop_type(name: &str, kind: Option<&Lit>) -> Result<PropType, String> {
    let refused = || {
        format!("prop `{name}` takes `boolean`, `number`, `number | string`, `object`, `string`, `time`, or an array of values")
    };
    match kind {
        Some(Lit::Text(kind)) => match kind.as_str() {
            "boolean" => Ok(PropType::Primitive(Primitive::Boolean)),
            "number" => Ok(PropType::Primitive(Primitive::Number)),
            "number | string" => Ok(PropType::Primitive(Primitive::NumberOrString)),
            "object" => Ok(PropType::Primitive(Primitive::Object)),
            "string" => Ok(PropType::Primitive(Primitive::String)),
            "time" => Ok(PropType::Primitive(Primitive::Time)),
            _ => Err(refused()),
        },
        Some(Lit::Array(values)) => values
            .iter()
            .map(|value| match value {
                Lit::Text(value) => Ok(value.clone()),
                Lit::Bool(true) => Ok(String::new()),
                _ => Err(refused()),
            })
            .collect::<Result<_, _>>()
            .map(PropType::Values),
        _ => Err(refused()),
    }
}

/// A default: a boolean, a number, or a string.
fn literal(name: &str, value: &Lit) -> Result<Literal, String> {
    match value {
        Lit::Bool(flag) => Ok(Literal::Flag(*flag)),
        Lit::Number(number) if number.is_finite() => Ok(Literal::Number(*number)),
        Lit::Text(text) => Ok(Literal::Text(text.clone())),
        _ => Err(format!(
            "prop `{name}`: a default is a boolean, a finite number, or a string"
        )),
    }
}

pub fn event(lit: &Lit) -> Result<Event, String> {
    let Lit::Call(_, arguments) = lit else {
        return Err("an event is a call to `event()`".to_owned());
    };
    let Some(Lit::Text(name)) = arguments.first() else {
        return Err("an event takes a name first".to_owned());
    };
    let mut event = Event {
        arrives: false,
        bare: false,
        cancelable: false,
        detail: Vec::new(),
        follows: None,
        gives: std::collections::BTreeMap::new(),
        name: name.clone(),
        platform: None,
    };
    if let Some(Lit::Object(extra)) = arguments.get(1) {
        for (key, value) in extra {
            match (key.as_str(), value) {
                ("arrives", Lit::Bool(arrives)) => event.arrives = *arrives,
                ("bare", Lit::Bool(bare)) => event.bare = *bare,
                ("platform", Lit::Text(platform)) if platform == "web" => {
                    event.platform = Some(Platform::Web);
                }
                ("cancelable", Lit::Bool(cancelable)) => event.cancelable = *cancelable,
                ("follows", Lit::Text(computed)) => event.follows = Some(computed.clone()),
                ("gives", Lit::Object(fields)) => {
                    event.gives = fields
                        .iter()
                        .map(|(field, from)| match from {
                            Lit::Text(from) => Ok((field.clone(), from.clone())),
                            _ => Err(format!(
                                "event `{name}`: `gives.{field}` names a computed value or a prop"
                            )),
                        })
                        .collect::<Result<_, _>>()?;
                }
                ("detail", Lit::Array(fields)) => {
                    event.detail = fields
                        .iter()
                        .map(|field| match field {
                            Lit::Text(field) => Ok(field.clone()),
                            _ => Err(format!("event `{name}`: a detail field is a name")),
                        })
                        .collect::<Result<_, _>>()?;
                }
                (key, _) => {
                    return Err(format!(
                        "event `{name}`: `{key}` is not a field an event has"
                    ))
                }
            }
        }
    }
    Ok(event)
}
