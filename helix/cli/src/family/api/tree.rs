//! The part tree, read from the node helpers, with each attribute held to
//! the vocabulary.

use std::collections::BTreeMap;
use std::fmt;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use crate::family::api::Node;
use crate::family::ir::{DERIVATIONS, LIST_DERIVATIONS};
use crate::family::read::Lit;
use crate::family::vocabulary;

/// What a node is.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum NodeKind {
    /// A part that groups or draws, with no behavior of its own.
    Box,
    /// A picture loaded from its `src`: an `<img>` on the web and React
    /// Native's `Image` on a phone, with a load machine that says whether
    /// it is loading, has loaded, or failed.
    Image,
    /// What the element opens over the page, drawn in the top layer on the
    /// web and, on a phone, in the layer host the project's
    /// `runtime.layerHost` names: a dialog, a popover, a menu or a tooltip,
    /// placed against its `anchor` where it names one.
    Layer,
    /// Words said to a screen reader.
    Live,
    /// What a person presses.
    Pressable,
    /// Where passed content goes.
    Region,
    /// What it holds, drawn as many times as its `count` says, as a
    /// skeleton draws a line of its paragraph for each of its `lines`.
    Repeat,
    /// Words a prop holds, drawn as text.
    Text,
    /// A node drawn only while a prop or a state holds, or, written with
    /// `unless()`, while it does not.
    When,
    /// A box drawn around its children while it has somewhere to go.
    Wrap,
}

impl NodeKind {
    /// Whether a node of this kind is a part of its own, by its name.
    pub fn is_part(self) -> bool {
        matches!(
            self,
            Self::Box | Self::Image | Self::Layer | Self::Live | Self::Pressable | Self::Wrap
        )
    }

    /// The helper a source writes the node with.
    pub fn helper(self) -> &'static str {
        match self {
            Self::Box => "box",
            Self::Image => "image",
            Self::Layer => "layer",
            Self::Live => "live",
            Self::Pressable => "pressable",
            Self::Region => "region",
            Self::Repeat => "repeat",
            Self::Text => "text",
            Self::When => "when",
            Self::Wrap => "wrap",
        }
    }
}

impl fmt::Display for NodeKind {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.helper())
    }
}

/// A prop an attribute reads: `bind(prop)` for its value, `not(prop)` for
/// its opposite.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Binding {
    Bind(String),
    Not(String),
}

impl Binding {
    /// The prop it reads.
    pub fn prop(&self) -> &str {
        match self {
            Self::Bind(prop) | Self::Not(prop) => prop,
        }
    }
}

/// A flag, written or read from a prop.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(untagged)]
pub enum Flag {
    Literal(bool),
    Bound(Binding),
    /// A field of the entry a copy of a repeat over a list draws, as an
    /// outline's link is `link-current` while its section is marked.
    Field {
        field: String,
    },
    /// Words a box or a wrap that draws another element gives it, as a tour
    /// stop gives its Skip button the emphasis `ghost`. Only `gives` takes them.
    Words(String),
}

/// An attribute's value.
#[derive(Clone, Debug, PartialEq, Serialize, JsonSchema, TS)]
#[serde(untagged)]
pub enum Attribute {
    Flag(bool),
    /// A number written in the source, such as a shape's radius or a
    /// meter's least reading.
    Number(f64),
    Text(String),
    Bound(Binding),
    /// Words the element computes from its props, `derive(name)`: the
    /// function in core's derivations that computes them, which the native
    /// runtime calls with the element's props, as a key's chord in glyphs.
    Derived {
        derive: String,
    },
    /// A field of the entry a copy of a repeat over a list draws,
    /// `field(name)`, as a key's words in a chord.
    Field {
        field: String,
    },
    /// Where a copy stands among the copies a repeat draws, from 0, `index()`.
    Index {
        index: bool,
    },
    /// Parts the node is as well, each while its flag holds, as a row is
    /// `row-current` while it is current.
    Parts(BTreeMap<String, Flag>),
    /// A string chosen by a prop's value, `pick(prop, { value: text },
    /// otherwise)`, as a toggle group is a toolbar where its
    /// `selection-mode` is `multiple`, and a radio group otherwise.
    Picked {
        pick: String,
        values: BTreeMap<String, String>,
        otherwise: String,
    },
}

impl Attribute {
    /// The props it reads.
    pub fn props(&self) -> Vec<&str> {
        match self {
            Self::Bound(binding) => vec![binding.prop()],
            Self::Parts(parts) => parts
                .values()
                .filter_map(|flag| match flag {
                    Flag::Bound(binding) => Some(binding.prop()),
                    Flag::Field { .. } | Flag::Literal(_) | Flag::Words(_) => None,
                })
                .collect(),
            Self::Picked { pick, .. } => vec![pick.as_str()],
            Self::Derived { .. }
            | Self::Field { .. }
            | Self::Flag(_)
            | Self::Index { .. }
            | Self::Number(_)
            | Self::Text(_) => Vec::new(),
        }
    }
}

pub fn node(lit: &Lit) -> Result<Node, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err(
            "a node is a call to `box()`, `image()`, `layer()`, `live()`, `pressable()`, `region()`, `repeat()`, `text()`, `unless()`, `when()` or `wrap()`"
                .to_owned(),
        );
    };
    let kind = match helper.as_str() {
        "box" => NodeKind::Box,
        "image" => NodeKind::Image,
        "layer" => NodeKind::Layer,
        "live" => NodeKind::Live,
        "pressable" => NodeKind::Pressable,
        "region" => NodeKind::Region,
        "repeat" => NodeKind::Repeat,
        "text" => NodeKind::Text,
        /* `unless()` is a `when()` drawn while its prop or state does not
        hold, as a checkbox draws its `check` region while it is not mixed. */
        "when" | "unless" => NodeKind::When,
        "wrap" => NodeKind::Wrap,
        other => return Err(format!("`{other}()` is not a node")),
    };
    let Some(Lit::Text(name)) = arguments.first() else {
        return Err(format!("`{kind}()` takes a name first"));
    };
    let attributes = |at: usize| -> Result<BTreeMap<String, Attribute>, String> {
        match arguments.get(at) {
            None => Ok(BTreeMap::new()),
            Some(Lit::Object(entries)) => entries
                .iter()
                .map(|(key, value)| {
                    let value = attribute(value)
                        .map_err(|why| format!("`{kind}('{name}')`: `{key}` {why}"))?;
                    let worded = matches!(&value, Attribute::Parts(parts) if parts.values().any(|flag| matches!(flag, Flag::Words(_))));
                    if worded && key != "gives" {
                        return Err(format!("`{kind}('{name}')`: `{key}` takes each part's flag as a boolean, `bind()`, `not()` or `field()`, and words only in `gives`"));
                    }
                    vocabulary::attribute(kind, name, key, &value)?;
                    Ok((key.clone(), value))
                })
                .collect(),
            Some(_) => Err(format!(
                "`{kind}('{name}')` takes its attributes as an object"
            )),
        }
    };
    let children = |at: usize| -> Result<Vec<Node>, String> {
        match arguments.get(at) {
            None => Ok(Vec::new()),
            Some(Lit::Array(children)) => children.iter().map(node).collect(),
            Some(_) => Err(format!("`{kind}('{name}')` takes its children as an array")),
        }
    };
    let (attributes, children) = match kind {
        /* A region's children are what it draws while nothing is passed in. */
        NodeKind::Box
        | NodeKind::Layer
        | NodeKind::Pressable
        | NodeKind::Region
        | NodeKind::Repeat
        | NodeKind::Wrap => (attributes(1)?, children(2)?),
        NodeKind::Image | NodeKind::Live | NodeKind::Text => (attributes(1)?, Vec::new()),
        NodeKind::When => match arguments.get(1) {
            Some(child) => (
                if helper == "unless" {
                    BTreeMap::from([("unless".to_owned(), Attribute::Flag(true))])
                } else {
                    BTreeMap::new()
                },
                vec![node(child)?],
            ),
            None => return Err(format!("`{helper}('{name}')` takes the node it draws")),
        },
    };
    let read = Node {
        attributes,
        children,
        kind,
        name: name.clone(),
    };
    /* What one attribute means can depend on another the node carries, as
    a shape's geometry on its `shape`. */
    vocabulary::node(&read)?;
    Ok(read)
}

/// `bind(prop)` or `not(prop)`.
pub(super) fn binding(lit: &Lit) -> Option<Binding> {
    match lit {
        Lit::Call(helper, arguments) => match (helper.as_str(), arguments.as_slice()) {
            ("bind", [Lit::Text(prop)]) => Some(Binding::Bind(prop.clone())),
            ("not", [Lit::Text(prop)]) => Some(Binding::Not(prop.clone())),
            _ => None,
        },
        _ => None,
    }
}

/// `derive(name)`, as the function in core's derivations it names.
pub(super) fn derived(lit: &Lit) -> Option<Result<Attribute, String>> {
    let Lit::Call(helper, arguments) = lit else {
        return None;
    };
    let ("derive", [Lit::Text(name)]) = (helper.as_str(), arguments.as_slice()) else {
        return None;
    };
    Some(
        DERIVATIONS
            .iter()
            .chain(LIST_DERIVATIONS)
            .find(|(known, _)| known == name)
            .map(|(_, function)| Attribute::Derived {
                derive: (*function).to_owned(),
            })
            .ok_or_else(|| format!("`derive('{name}')` names no function in core's derivations")),
    )
}

/// `pick(prop, { value: text, ... }, otherwise)`: a string for some of the
/// prop's values, and one for the rest.
fn picked(lit: &Lit) -> Option<Result<Attribute, String>> {
    let Lit::Call(helper, arguments) = lit else {
        return None;
    };
    if helper != "pick" {
        return None;
    }
    let [Lit::Text(pick), Lit::Object(entries), Lit::Text(otherwise)] = arguments.as_slice() else {
        return Some(Err(
            "`pick()` takes a prop, an object of its values and the string each picks, and the string for the rest"
                .to_owned(),
        ));
    };
    let values = entries
        .iter()
        .map(|(value, text)| match text {
            Lit::Text(text) => Ok((value.clone(), text.clone())),
            _ => Err(format!("`pick('{pick}')` picks a string for `{value}`")),
        })
        .collect::<Result<_, _>>();
    Some(values.map(|values| Attribute::Picked {
        pick: pick.clone(),
        values,
        otherwise: otherwise.clone(),
    }))
}

/// An attribute's value: a string, a boolean, a number, `bind()`, `not()`,
/// `derive()` or `pick()`, or an object of parts, each a boolean, `bind()` or
/// `not()`.
pub(super) fn attribute(lit: &Lit) -> Result<Attribute, String> {
    if let Lit::Call(helper, arguments) = lit {
        match (helper.as_str(), arguments.as_slice()) {
            ("field", [Lit::Text(field)]) => {
                return Ok(Attribute::Field {
                    field: field.clone(),
                })
            }
            ("index", []) => return Ok(Attribute::Index { index: true }),
            ("field" | "index", _) => {
                return Err("`field()` takes a field's name, and `index()` nothing".to_owned())
            }
            _ => {}
        }
    }
    if let Some(derived) = derived(lit) {
        return derived;
    }
    if let Some(picked) = picked(lit) {
        return picked;
    }
    match lit {
        Lit::Text(text) => Ok(Attribute::Text(text.clone())),
        Lit::Bool(flag) => Ok(Attribute::Flag(*flag)),
        Lit::Number(number) if number.is_finite() => Ok(Attribute::Number(*number)),
        Lit::Object(entries) => entries
            .iter()
            .map(|(part, value)| match (value, binding(value)) {
                (Lit::Bool(flag), _) => Ok((part.clone(), Flag::Literal(*flag))),
                (Lit::Text(words), _) => Ok((part.clone(), Flag::Words(words.clone()))),
                (_, Some(bound)) => Ok((part.clone(), Flag::Bound(bound))),
                (Lit::Call(helper, arguments), None) if helper == "field" => match arguments.as_slice() {
                    [Lit::Text(field)] => Ok((part.clone(), Flag::Field { field: field.clone() })),
                    _ => Err("`field()` takes a field's name".to_owned()),
                },
                _ => Err(format!(
                    "takes each part's flag as a boolean, words, `bind()`, `not()` or `field()`, and `{part}` is not one"
                )),
            })
            .collect::<Result<_, _>>()
            .map(Attribute::Parts),
        _ => binding(lit).map(Attribute::Bound).ok_or_else(|| {
            "takes a string, a boolean, a number, `bind()`, `not()`, or an object of parts"
                .to_owned()
        }),
    }
}
