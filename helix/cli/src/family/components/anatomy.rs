//! What each element is made of, on each platform: the host and what it
//! takes, and the tree it draws, read from the intermediate form.
//!
//! **One tree, written for each platform.** The web draws the tree in the
//! element's shadow root: each part a node with its `part` name, each region
//! a `<slot>`. A phone draws the same tree with the native runtime: a box is
//! a `View`, a press a `Pressable`, words a `Text`, and each region the prop
//! of its name, `children` for the default one. A node one platform does not
//! draw is left out of that platform's tree.
//!
//! **What a node is called on a phone is the runtime's**, in
//! `helix/native/src/render/nodes.tsx`: [`native_label`] says it in the words
//! that file draws it with, so a change there is a change here.
//!
//! **Written as data and read twice.** `analyze` puts each element's anatomy
//! in the styled package's `api.json`, where `helix api anatomy` prints it as
//! two trees and the site draws it on the family's page.

#[cfg(test)]
#[path = "anatomy_tests.rs"]
mod tests;

use std::path::Path;

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;
use fusion_rules::say;
use serde::Serialize;
use serde_json::{json, Map, Value as Json};

use super::members::{region_prop, slot_of};
use crate::args::SystemArgs;
use crate::family::api::{Attribute, Node, NodeKind, Platform, Prop, PropType};
use crate::family::compile::{self, Compiled};
use crate::family::ir::Family;
use crate::family::open;
use crate::family::project::Names;

/// One element's anatomy.
#[derive(Debug, Serialize)]
pub struct Anatomy {
    /// The web element: its tag, the attributes it takes, its custom states,
    /// and the tree in its shadow root.
    pub web: Side,
    /// The React Native component, where Helix draws the element on a
    /// phone: the props it takes and the tree it draws.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub native: Option<Side>,
}

/// The host and the tree on one platform.
#[derive(Debug, Serialize)]
pub struct Side {
    /// What the host takes: attributes on the web, props on a phone, each
    /// with what it holds.
    pub takes: Vec<Taken>,
    /// The custom states the host carries, which `:state()` reads on the web.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub states: Vec<String>,
    /// The events it sends, by the name each platform gives them.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub sends: Vec<String>,
    pub tree: Vec<Drawn>,
}

/// An attribute or a prop, and what it holds.
#[derive(Debug, Serialize)]
pub struct Taken {
    pub name: String,
    pub holds: String,
}

/// One node of a tree, as a platform draws it.
#[derive(Debug, Serialize)]
pub struct Drawn {
    /// What the platform draws: `part`, `slot`, `View`, `Pressable`.
    pub draws: String,
    /// The node's kind in the source: `box`, `pressable`, `region`.
    pub kind: String,
    /// The node's name: the part it is, the region, or the prop a `when`
    /// reads.
    pub name: String,
    /// What the node says about itself, each as `name` or `name=value`,
    /// with `{prop}` for a value a prop drives.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub says: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<Drawn>,
}

/// The two platforms a tree is written for.
#[derive(Clone, Copy, PartialEq, Eq)]
enum On<'a> {
    Web,
    /// React Native, whose layers the component named here draws.
    Native(&'a str),
}

/// One element's anatomy, from its intermediate form.
#[must_use]
pub fn anatomy(family: &Family, layer_host: &str) -> Anatomy {
    let drawn_natively = family.api.platform.is_none() && !family.tree.is_empty();
    Anatomy {
        web: side(family, On::Web),
        native: drawn_natively.then(|| side(family, On::Native(layer_host))),
    }
}

fn side(family: &Family, on: On<'_>) -> Side {
    let takes = family
        .api
        .props
        .iter()
        .filter(|prop| match on {
            On::Web => prop.attribute,
            On::Native(_) => prop.platform != Some(Platform::Web),
        })
        .map(|prop| Taken {
            name: match on {
                On::Web => prop.name.clone(),
                On::Native(_) => super::members::camel(&prop.name),
            },
            holds: holds(prop),
        })
        .collect();
    let sends = family
        .api
        .events
        .iter()
        .map(|event| match on {
            On::Web => event.name.clone(),
            On::Native(_) => super::members::handler_of(event),
        })
        .collect();
    Side {
        takes,
        states: if on == On::Web {
            family.api.states.clone()
        } else {
            Vec::new()
        },
        sends,
        tree: tree(&family.tree, on, &family.names),
    }
}

/// What a prop holds, as a reader writes it: its values, or its type.
fn holds(prop: &Prop) -> String {
    match &prop.kind {
        PropType::Values(values) => values
            .iter()
            .map(|value| format!("\"{value}\""))
            .collect::<Vec<_>>()
            .join(" | "),
        PropType::Primitive(primitive) => serde_json::to_value(primitive)
            .ok()
            .and_then(|value| value.as_str().map(str::to_owned))
            .unwrap_or_default(),
    }
}

fn tree(nodes: &[Node], on: On<'_>, names: &Names) -> Vec<Drawn> {
    nodes
        .iter()
        .filter(|node| shown(node, on))
        .map(|node| Drawn {
            draws: match on {
                On::Web => web_label(node),
                On::Native(host) => native_label(node, host),
            },
            kind: node.kind.helper().to_owned(),
            name: node.name.clone(),
            says: says(node, names),
            children: tree(&node.children, on, names),
        })
        .collect()
}

/// Whether a platform draws the node: a node marked for the other platform
/// is left out of its tree.
fn shown(node: &Node, on: On<'_>) -> bool {
    match node.attributes.get("platform") {
        Some(Attribute::Text(platform)) => match on {
            On::Web => platform != "native",
            On::Native(_) => platform != "web",
        },
        _ => true,
    }
}

/// What the web draws for a node in the shadow root.
fn web_label(node: &Node) -> String {
    match node.kind {
        NodeKind::Region => {
            let slot = slot_of(&node.name);
            if slot.is_empty() {
                "slot".to_owned()
            } else {
                format!("slot name=\"{slot}\"")
            }
        }
        NodeKind::Text => format!("words of {}", node.name),
        NodeKind::When => when(node),
        NodeKind::Repeat => format!("repeat {}", node.name),
        _ => format!("{} part=\"{}\"", node.kind.helper(), parts(node)),
    }
}

/// What the native runtime draws for a node, in the words
/// `helix/native/src/render/nodes.tsx` draws it with.
fn native_label(node: &Node, host: &str) -> String {
    match node.kind {
        NodeKind::Box => format!("View {}", parts(node)),
        NodeKind::Image => format!("Image {}", parts(node)),
        NodeKind::Layer => format!("View {}, in the layer {host} draws", parts(node)),
        NodeKind::Live => format!("{}, said and not drawn", node.name),
        NodeKind::Pressable => format!("Pressable {}", parts(node)),
        NodeKind::Region => format!("{{{}}}", region_prop(&node.name)),
        NodeKind::Repeat => format!("repeat {}", node.name),
        NodeKind::Text => format!("Text, the words of {}", node.name),
        NodeKind::When => when(node),
        NodeKind::Wrap => format!("View {}, while it holds something to wrap", parts(node)),
    }
}

/// A `when` and the prop or state it reads.
fn when(node: &Node) -> String {
    if matches!(node.attributes.get("unless"), Some(Attribute::Flag(true))) {
        format!("unless {}", node.name)
    } else {
        format!("while {}", node.name)
    }
}

/// The part names a node carries: its own, then each name it carries as
/// well while a flag holds.
fn parts(node: &Node) -> String {
    let mut names = vec![node.name.clone()];
    if let Some(Attribute::Parts(also)) = node.attributes.get("also") {
        names.extend(also.keys().cloned());
    }
    names.join(" ")
}

/// What a node says about itself, each attribute as it is written, but the
/// ones the label already says. The element a node `draws` is named as the
/// source names it, without the prefix its form gives its tag.
fn says(node: &Node, names: &Names) -> Vec<String> {
    node.attributes
        .iter()
        .filter(|(name, _)| !matches!(name.as_str(), "also" | "platform" | "unless"))
        .map(|(name, value)| match (name.as_str(), value) {
            ("draws", Attribute::Text(tag)) => {
                format!("draws=\"{}\"", names.bare(tag).unwrap_or(tag))
            }
            _ => match serde_json::to_value(value).unwrap_or(Json::Null) {
                Json::Bool(true) => name.clone(),
                written => format!("{name}={}", value_of(&written)),
            },
        })
        .collect()
}

/// A value as a reader writes it: words quoted, a prop's in braces.
fn value_of(value: &Json) -> String {
    match value {
        Json::String(words) => format!("\"{words}\""),
        Json::Object(fields) => object(fields),
        other => other.to_string(),
    }
}

fn object(fields: &Map<String, Json>) -> String {
    let one = |key: &str| fields.get(key).and_then(Json::as_str);
    if let Some(prop) = one("bind") {
        format!("{{{prop}}}")
    } else if let Some(prop) = one("not") {
        format!("{{!{prop}}}")
    } else if let Some(name) = one("derive") {
        format!("derive({name})")
    } else if let Some(name) = one("field") {
        format!("field({name})")
    } else if fields.contains_key("index") {
        "index()".to_owned()
    } else {
        Json::Object(fields.clone()).to_string()
    }
}

/// Every element's anatomy, by its tag.
#[must_use]
pub fn every(compiled: &[Compiled], layer_host: &str) -> Json {
    let mut out = Map::new();
    for one in compiled {
        out.insert(
            one.family.tag.clone(),
            json!(anatomy(&one.family, layer_host)),
        );
    }
    Json::Object(out)
}

/// `helix system anatomy`: prints, as JSON, every element's anatomy by its
/// tag.
///
/// # Errors
///
/// [`Failure`] when there is no project, or a source cannot be compiled.
pub fn print(args: &SystemArgs, config: Option<&Path>, from: &Path) -> Result<Code, Failure> {
    let project = open(config, args.package.as_ref(), from)?;
    say!(
        "{}",
        every(&compile::all(&project)?, &project.runtime.layer_host)
    );
    Ok(Code::Ok)
}
