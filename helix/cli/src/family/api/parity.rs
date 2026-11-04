//! Where a family's API and tree differ from what the web element declares.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value as Json;

use super::tree::Flag;
use crate::family::api::{Api, Attribute, Node, NodeKind};
use crate::family::project::Names;

/// The flag of an export a phone alone has, `exports={{ 'row-item': 'native' }}`:
/// a part of the rows a drawn element draws from data, which the web draws as
/// elements of its own.
pub const NATIVE_EXPORT: &str = "native";

/// Whether an export is a phone's alone.
pub fn native_export(flag: &Flag) -> bool {
    matches!(flag, Flag::Words(words) if words == NATIVE_EXPORT)
}

/// The regions a tree draws, by name. **A region marked for a phone alone is no
/// slot of the web element's**, as the fields a filter field holds outside its
/// menu are a phone's to read, where the web reads its light DOM.
fn regions(tree: &[Node], into: &mut BTreeSet<String>) {
    for node in tree {
        let native = matches!(
            node.attributes.get("platform"),
            Some(Attribute::Text(platform)) if platform == "native"
        );
        if node.kind == NodeKind::Region && !native {
            into.insert(node.name.clone());
        }
        regions(&node.children, into);
    }
}

/// The parts a tree exposes: its named boxes, layers, presses and live
/// regions, and the part a region carries.
pub fn parts(tree: &[Node], into: &mut BTreeSet<String>) {
    for node in tree {
        /* A vector's gradient is a paint its shapes name by id, and the web
        writes it with no part; its stops are parts. */
        let paint = matches!(
            node.attributes.get("shape"),
            Some(Attribute::Text(shape)) if shape == "gradient"
        );
        match node.kind {
            kind if kind.is_part() && !paint => {
                into.insert(node.name.clone());
                /* A token the part carries beside its own name while a prop
                holds, as `row-current`. */
                if let Some(Attribute::Parts(also)) = node.attributes.get("also") {
                    into.extend(also.keys().cloned());
                }
                /* The parts of an element the box draws, exposed under its name. */
                if let Some(Attribute::Parts(exports)) = node.attributes.get("exports") {
                    into.extend(exports.keys().map(|part| format!("{}-{part}", node.name)));
                }
            }
            NodeKind::Region => {
                if let Some(Attribute::Text(part)) = node.attributes.get("part") {
                    into.insert(part.clone());
                }
            }
            _ => {}
        }
        parts(&node.children, into);
    }
}

/// The parts of the elements a tree's boxes draw, by the name the box
/// exposes each under, `select-all-box`, with the box's name and the drawn
/// element's own name for it: `("select-all", "box")`.
pub fn exported(tree: &[Node]) -> BTreeMap<String, (String, String)> {
    let mut found = BTreeMap::new();
    for node in tree {
        if let Some(Attribute::Parts(exports)) = node.attributes.get("exports") {
            for part in exports.keys() {
                found.insert(
                    format!("{}-{part}", node.name),
                    (node.name.clone(), part.clone()),
                );
            }
        }
        found.extend(exported(&node.children));
    }
    found
}

/// The parts of the elements a tree's boxes draw that a phone alone exports,
/// `exports={{ 'row-item': 'native' }}`, by the name the box exposes each under.
pub fn native_exported(tree: &[Node]) -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    for node in tree {
        if let Some(Attribute::Parts(exports)) = node.attributes.get("exports") {
            found.extend(
                exports
                    .iter()
                    .filter(|(_, flag)| native_export(flag))
                    .map(|(part, _)| format!("{}-{part}", node.name)),
            );
        }
        found.extend(native_exported(&node.children));
    }
    found
}

/// The tree the web element draws: every node but those only a phone draws,
/// as a checkbox's tick, which the web draws as a mask on its mark. **A wrap
/// only a phone draws leaves its children where it stands**, and so does a
/// vector only a phone draws, whose shapes the web draws in an `<svg>` with no
/// part, as a ring's track and slices. A wrap
/// whose `while` does not hold draws its children alone, so a stat's figure
/// and unit share a line on a phone and stand in the host on the web.
fn drawn_on_the_web(tree: &[Node]) -> Vec<Node> {
    tree.iter()
        .flat_map(|node| {
            let native = matches!(
                node.attributes.get("platform"),
                Some(Attribute::Text(platform)) if platform == "native"
            );
            let vector = node.attributes.contains_key("viewBox");
            match (native, node.kind) {
                (true, NodeKind::Wrap) => drawn_on_the_web(&node.children),
                (true, _) if vector => drawn_on_the_web(&node.children),
                (true, _) => Vec::new(),
                (false, _) => vec![Node {
                    attributes: web_attributes(node),
                    children: drawn_on_the_web(&node.children),
                    kind: node.kind,
                    name: node.name.clone(),
                }],
            }
        })
        .collect()
}

/// A node's attributes on the web, without the exports a phone alone has.
fn web_attributes(node: &Node) -> BTreeMap<String, Attribute> {
    let mut attributes = node.attributes.clone();
    if let Some(Attribute::Parts(exports)) = attributes.get_mut("exports") {
        exports.retain(|_, flag| !native_export(flag));
    }
    attributes
}

/// Where a family's API and tree differ from what the manifest says its
/// element has, one sentence each.
pub fn parity(tag: &str, api: &Api, tree: &[Node], manifest: &Json, system: &Names) -> Vec<String> {
    let declaration = manifest["modules"]
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|module| module["declarations"].as_array().into_iter().flatten())
        .find(|declaration| declaration["tagName"] == tag);
    let Some(declaration) = declaration else {
        return vec![format!("the manifest has no `{tag}`")];
    };
    let named = |key: &str, rename: &dyn Fn(&str) -> String| -> BTreeSet<String> {
        declaration[key]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|entry| entry["name"].as_str())
            .map(rename)
            .collect()
    };
    let same = |name: &str| name.to_owned();
    let mut differences = Vec::new();
    let mut compare = |what: &str, manifest: BTreeSet<String>, source: BTreeSet<String>| {
        for missing in manifest.difference(&source) {
            differences.push(format!(
                "{what} `{missing}`: the element has it and the source does not"
            ));
        }
        for extra in source.difference(&manifest) {
            differences.push(format!(
                "{what} `{extra}`: the source has it and the element does not"
            ));
        }
    };
    compare(
        "attribute",
        named("attributes", &same),
        api.props
            .iter()
            .filter(|prop| prop.attribute)
            .map(|prop| prop.name.clone())
            .collect(),
    );
    compare(
        "event",
        named("events", &same),
        api.events
            .iter()
            .map(|event| {
                if event.bare {
                    event.name.clone()
                } else {
                    system.event(&event.name)
                }
            })
            .collect(),
    );
    let mut slots = BTreeSet::new();
    regions(tree, &mut slots);
    compare(
        "slot",
        named("slots", &|name: &str| {
            if name.is_empty() {
                "default".to_owned()
            } else {
                name.to_owned()
            }
        }),
        slots,
    );
    let mut exposed = BTreeSet::new();
    parts(&drawn_on_the_web(tree), &mut exposed);
    compare("part", named("cssParts", &same), exposed);
    compare(
        "state",
        named("cssStates", &same),
        api.states.iter().cloned().collect(),
    );
    differences
}
