//! What one attribute means where another stands beside it, and where a
//! node may stand in the tree.
//!
//! **Each attribute alone is held by [`super::attribute`]**, and these are
//! the rules that read two at once: a shape takes the geometry its kind has,
//! a heading has a level, a reading belongs to a role that is read as a
//! range, and a press is checked only where its role can be.

#[cfg(test)]
#[path = "node_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "lists_tests.rs"]
mod lists_tests;

use crate::family::api::{Attribute, Node, NodeKind};
use crate::family::vocabulary::kinds::{ADJUSTABLE, CHECKABLE, GEOMETRY, RANGES, SHAPES};
use crate::family::vocabulary::layer;

/// The attributes a range's reading is.
const READING: &[&str] = &["valuemax", "valuemin", "valuenow", "valuetext"];

/// Holds a node's attributes to each other.
///
/// # Errors
///
/// A sentence naming the node and the attribute that does not belong.
pub fn node(node: &Node) -> Result<(), String> {
    let at = format!("`{}('{}')`", node.kind, node.name);
    shape(node, &at)?;
    heading(node, &at)?;
    lines(node, &at)?;
    reading(node, &at)?;
    drawn(node, &at)?;
    repeated(node, &at)?;
    imaged(node, &at)?;
    layer::node(node, &at)?;
    checked(node, &at)
}

/// A repeat draws what it holds `count` times, or once for each entry of
/// the list its `each` reads, keyed by its `key`, and holds something.
fn repeated(node: &Node, at: &str) -> Result<(), String> {
    if node.kind != NodeKind::Repeat {
        return Ok(());
    }
    match (has(node, "count"), has(node, "each"), has(node, "key")) {
        (false, false, _) => return Err(format!("{at}: a repeat takes its `count` or its `each`")),
        (true, true, _) => {
            return Err(format!(
                "{at}: a repeat takes its `count` or its `each`, not both"
            ))
        }
        (true, false, true) => return Err(format!("{at}: `key` is a repeat's over its `each`")),
        (false, true, false) => {
            return Err(format!(
                "{at}: a repeat over its `each` takes the `key` of each entry"
            ))
        }
        _ => {}
    }
    if node.children.is_empty() {
        return Err(format!("{at}: a repeat holds what it draws"));
    }
    Ok(())
}

/// A picture loads from its `src`.
fn imaged(node: &Node, at: &str) -> Result<(), String> {
    if node.kind == NodeKind::Image && !has(node, "src") {
        return Err(format!("{at}: an image takes its `src`"));
    }
    Ok(())
}

/// A box that draws another element holds nothing of its own, a wrap that
/// draws one holds what it passes into the element's default region, and
/// only either exports parts or gives props.
fn drawn(node: &Node, at: &str) -> Result<(), String> {
    let draws = has(node, "draws");
    match (draws, has(node, "exports") || has(node, "gives")) {
        (false, true) => Err(format!(
            "{at}: `exports` and `gives` are a box's or a wrap's that `draws` an element"
        )),
        (true, _) if node.kind == NodeKind::Box && !node.children.is_empty() => {
            Err(format!("{at}: a box that `draws` an element holds nothing"))
        }
        (true, _) if node.kind == NodeKind::Wrap && !has(node, "while") => Err(format!(
            "{at}: a wrap that `draws` an element says `while` it draws it"
        )),
        _ => Ok(()),
    }
}

/// A literal string attribute, where the node has one.
fn text<'a>(node: &'a Node, name: &str) -> Option<&'a str> {
    match node.attributes.get(name) {
        Some(Attribute::Text(text)) => Some(text),
        _ => None,
    }
}

fn has(node: &Node, name: &str) -> bool {
    node.attributes.contains_key(name)
}

/// A shape takes the geometry of its kind, and holds nothing.
fn shape(node: &Node, at: &str) -> Result<(), String> {
    let Some(kind) = text(node, "shape") else {
        if let Some(name) = GEOMETRY.iter().find(|name| has(node, name)) {
            return Err(format!(
                "{at}: `{name}` is a shape's, and it has no `shape`"
            ));
        }
        if has(node, "pathLength") {
            return Err(format!(
                "{at}: `pathLength` is a shape's, and it has no `shape`"
            ));
        }
        return Ok(());
    };
    let takes = SHAPES
        .iter()
        .find(|(name, _)| *name == kind)
        .map_or(&[][..], |(_, takes)| *takes);
    if let Some(name) = GEOMETRY
        .iter()
        .find(|name| has(node, name) && !takes.contains(name))
    {
        return Err(format!(
            "{at}: a {kind} does not take `{name}`, and takes {}",
            listed(takes)
        ));
    }
    if kind == "path" && !has(node, "d") {
        return Err(format!("{at}: a path takes its outline as `d`"));
    }
    if !node.children.is_empty() {
        return Err(format!("{at}: a shape holds nothing"));
    }
    if has(node, "viewBox") {
        return Err(format!("{at}: a shape is inside a vector, and is not one"));
    }
    Ok(())
}

/// A heading has a level, and only a heading has one.
fn heading(node: &Node, at: &str) -> Result<(), String> {
    let is = text(node, "role") == Some("heading") || text(node, "element") == Some("heading");
    match (is, has(node, "level")) {
        (true, false) => Err(format!("{at}: a heading takes its `level`")),
        (false, true) => Err(format!(
            "{at}: `level` is a heading's, and it is no heading"
        )),
        _ => Ok(()),
    }
}

/// A box's lines are the words of a run, which a phone draws as one text.
fn lines(node: &Node, at: &str) -> Result<(), String> {
    if node.kind == NodeKind::Box && has(node, "lines") && !has(node, "run") {
        return Err(format!(
            "{at}: `lines` is a run's, and a box takes it with `run`"
        ));
    }
    Ok(())
}

/// A reading belongs to a role read as a range, and a meter has one.
fn reading(node: &Node, at: &str) -> Result<(), String> {
    let role = text(node, "role");
    let ranged = role.is_some_and(|role| RANGES.contains(&role));
    if let Some(name) = READING.iter().find(|name| has(node, name)) {
        if !ranged {
            return Err(format!(
                "{at}: `{name}` is a range's, and its role is not {}",
                listed(RANGES)
            ));
        }
    }
    if role == Some("meter") && !has(node, "valuenow") {
        return Err(format!("{at}: a meter takes its reading as `valuenow`"));
    }
    /* A field reads as a range only as a number a reader types and steps. */
    if node.kind == NodeKind::Field && role.is_some_and(|role| role != "spinbutton") {
        return Err(format!(
            "{at}: a field takes the role `spinbutton` alone, as a number a reader steps"
        ));
    }
    /* A box a reader acts on is disabled as a press is, and only a box a
    reader moves is one. */
    if node.kind == NodeKind::Box
        && has(node, "disabled")
        && !role.is_some_and(|role| ADJUSTABLE.contains(&role))
    {
        return Err(format!(
            "{at}: `disabled` on a box is for a role of {}",
            listed(ADJUSTABLE)
        ));
    }
    Ok(())
}

/// A press is checked where its role can be, or turns a toggle that is;
/// one that stays pressed is a button.
fn checked(node: &Node, at: &str) -> Result<(), String> {
    let role = text(node, "role");
    let toggles = has(node, "toggles");
    if has(node, "checked") {
        if toggles {
            return Err(format!(
                "{at}: a press that `toggles` is checked as its toggle is, and takes no `checked`"
            ));
        }
        if !role.is_some_and(|role| CHECKABLE.contains(&role)) {
            return Err(format!(
                "{at}: `checked` is for a role of {}",
                listed(CHECKABLE)
            ));
        }
    } else if role.is_some_and(|role| CHECKABLE.contains(&role)) && !toggles {
        return Err(format!(
            "{at}: a {} is checked or not, through `checked` or `toggles`",
            role.unwrap_or_default()
        ));
    }
    if has(node, "pressed") {
        if has(node, "checked") {
            return Err(format!(
                "{at}: a press takes one of `pressed` and `checked`"
            ));
        }
        if role.is_some_and(|role| role != "button") {
            return Err(format!("{at}: a press that is `pressed` is a button"));
        }
    }
    Ok(())
}

/// Holds where each node of a tree stands: a shape only inside a vector, a
/// vector holding shapes alone, or a `when` that draws one, and a layer in
/// no layer, repeat, or vector.
///
/// # Errors
///
/// A sentence naming the node out of place.
pub fn tree(nodes: &[Node]) -> Result<(), String> {
    walk(nodes, false, Within::None)?;
    layer::placed(nodes)
}

/// The repeat a node is drawn in a copy of, where it is in one.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Within {
    None,
    /// A copy of a repeat that counts.
    Counted,
    /// A copy of a repeat over a list, which has fields.
    Listed,
}

/// A `field()` reads an entry of a repeat over a list, and an `index()` a
/// copy of any repeat.
fn in_copy(node: &Node, at: &str, copy: Within) -> Result<(), String> {
    for (name, value) in &node.attributes {
        match value {
            Attribute::Field { .. } if copy != Within::Listed => {
                return Err(format!(
                    "{at}: `{name}` reads a `field()`, and the node is not in a repeat over its `each`"
                ));
            }
            Attribute::Index { .. } if copy == Within::None => {
                return Err(format!(
                    "{at}: `{name}` reads an `index()`, and the node is not in a repeat"
                ));
            }
            _ => {}
        }
    }
    Ok(())
}

fn walk(nodes: &[Node], vector: bool, copy: Within) -> Result<(), String> {
    for node in nodes {
        let at = format!("`{}('{}')`", node.kind, node.name);
        in_copy(node, &at, copy)?;
        let inner = match (node.kind, has(node, "each")) {
            (NodeKind::Repeat, true) => Within::Listed,
            (NodeKind::Repeat, false) => Within::Counted,
            _ => copy,
        };
        let shape = has(node, "shape");
        if vector && node.kind != NodeKind::When && !shape {
            return Err(format!("{at} is inside a vector, which holds shapes alone"));
        }
        if !vector && shape {
            return Err(format!(
                "{at} draws a shape, and is not inside a box with a `viewBox`"
            ));
        }
        walk(&node.children, vector || has(node, "viewBox"), inner)?;
    }
    Ok(())
}

fn listed(names: &[&str]) -> String {
    names
        .iter()
        .map(|name| format!("`{name}`"))
        .collect::<Vec<_>>()
        .join(", ")
}
