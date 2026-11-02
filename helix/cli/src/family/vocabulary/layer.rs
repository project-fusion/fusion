//! A layer's attributes, read together, and where a layer may stand in the
//! tree.
//!
//! **A layer opens on a prop.** Its `open` binds the prop its element's
//! `toggle` holds, so a press, a dismissal and the page writing the prop all
//! turn one toggle. **A placement is against an anchor**: `placement`,
//! `offset`, `arrow` and `presentation` say nothing of a layer that names no
//! `anchor`, a part, or `target`, the prop that holds the id of a registered
//! view. **A band stands under its anchor across the window**, on no side of
//! it, so nothing that places a layer on a side reads with it. **A notice
//! holds no reader**: a layer drawn above the dialogs is never modal itself. **A press in the anchor reaches the layer** as its
//! `presses` says, and a tooltip's `hint` describes that press. **A layer
//! that swipes stands along an edge**: its
//! `edge`, or the window's bottom edge a sheet stands along, and its `snap`
//! points say nothing of a layer that does not swipe.

#[cfg(test)]
#[path = "layer_tests.rs"]
mod tests;

use crate::family::api::{Attribute, Binding, Node, NodeKind};
use crate::family::vocabulary::shapes::Shape;

/// What opens over the page.
const LAYER: &[NodeKind] = &[NodeKind::Layer];

/// The attributes only a layer takes: its name, the kinds of node that take
/// it, and its value, as [`super::attributes`] holds the rest.
pub const ATTRIBUTES: &[(&str, &[NodeKind], Shape)] = &[
    /* The part or the region a layer is placed against, as a popover's
    trigger: Floating UI places it on both platforms. */
    ("anchor", LAYER, Shape::Name),
    /* The part inside a layer that points at its anchor, which Floating UI
    places on the edge facing it, as the web's floating controller does. */
    ("arrow", LAYER, Shape::Name),
    /* Whether Down and Up on a press in the anchor open the layer while it
    stands closed, with focus on its first or its last control, as a
    menu's trigger does; with Alt where the layer `holds`. */
    ("arrows", LAYER, Shape::Flag),
    /* A layer one of whose kind stands open at a time, as a bar's
    megamenus: opening one asks the one open to close, and a press on
    another's anchor is no press outside, so it opens that one in place. */
    ("alone", LAYER, Shape::Set),
    /* A layer that stands under its anchor across the whole window, from
    the anchor's bottom edge, as a megamenu's band: placed on no side, so
    its element is in no `placed-` or `aligned-` state. */
    ("band", LAYER, Shape::Set),
    /* How far a layer slides along the side it stands on, in points or
    pixels: to the right on the top or the bottom, and down on the left or
    the right, as a popover's `cross-offset`. */
    ("cross-offset", LAYER, Shape::Number),
    /* How a reader may dismiss a layer, as `<dialog closedby>` says:
    `any`, a press outside it and a close request; `closerequest`, Escape, a
    phone's back, or a screen reader's escape alone; `none`, neither. */
    ("closedby", LAYER, Shape::Words),
    /* The edge of the window a layer stands along and a swipe takes it
    out through, as a drawer's: `top`, `bottom`, or `start` and `end`,
    which the writing direction turns into a side. */
    ("edge", LAYER, Shape::Words),
    /* Where focus goes as a layer opens: `always` into it, as a dialog's;
    `press`, into it only as a press or a key in its anchor opens it, as a
    menu written open by the page leaves focus where it is; `down`, into it
    only on Down on a press in its anchor, which opens it where it stands
    closed, as a megamenu's trigger takes a reader into its panel. */
    ("enters", LAYER, Shape::OneOf(ENTERS)),
    /* Where focus goes as a layer closes that a press in its anchor opens:
    `always` to the anchor, however it closed, as a speed dial's trigger
    takes it; `held`, to the anchor only where the layer held focus, as a
    menu leaves focus where a press outside put it; `dismissed`, to the
    anchor only where a close request or a press outside closed it, as a
    megamenu leaves focus where a press on its trigger or a destination put
    it. */
    ("returns", LAYER, Shape::OneOf(RETURNS)),
    /* Whether a layer turns to the other side of its anchor where its own
    has no room, as a popover's `flip`. It does where this is not written. */
    ("flip", LAYER, Shape::Flag),
    /* The words a tooltip says of its anchor: a phone's hint on each press
    drawn in the anchor, and a long press on it opens the layer where the
    press has no long press of its own, as a hover shows it on the web. */
    ("hint", LAYER, Shape::Words),
    /* Whether a long press on a press in the anchor opens the layer, as
    that press's own long press, as a speed dial's trigger under
    `open-on="long-press"`, which a tooltip's hint does not outrank. */
    ("holds", LAYER, Shape::Flag),
    /* A layer that holds the reader until it closes: the rest of the page
    takes no press, no focus, and nothing a screen reader reaches, as
    `showModal()` makes it on the web. */
    ("modal", LAYER, Shape::Flag),
    /* A layer drawn above every other, dialogs included, that stays
    pressable and read while one holds the reader, as a toast's stack is. */
    ("notice", LAYER, Shape::Flag),
    /* How far a layer stands from its anchor, in points or pixels. */
    ("offset", LAYER, Shape::Number),
    /* The prop a layer stands open while it holds, which its element's
    `toggle` holds as checked. */
    ("open", LAYER, Shape::Flag),
    /* The side of its anchor a layer would stand on, and where along it, as
    Floating UI names placements: `bottom-start`, `top`. It turns to the
    other side where this one has no room. */
    ("placement", LAYER, Shape::Words),
    /* How an anchored layer is drawn: `popover`, placed against its anchor;
    `sheet`, along the window's bottom edge; or `auto`, a sheet in a window
    narrower than 30rem and a popover in any other. */
    ("presentation", LAYER, Shape::Words),
    /* What a press drawn in a layer's anchor does to it once the press's
    own event stands: `toggle` opens it or closes it, as a popover's trigger
    does; `close` closes it, as using a control spends its tooltip; `none`
    leaves it, as a copy button's confirmation stays. */
    ("presses", LAYER, Shape::OneOf(PRESSES)),
    /* A layer that answers a press outside it that `closedby` refuses:
    its part is `data-refused` for the length of the motion its rules
    give it then, as a dialog swells and settles. */
    ("refuses", LAYER, Shape::Flag),
    /* The prop that holds the shares of a swiping layer a reader can leave
    on screen, as a drawer's `snap-points` holds `0.5 1`. */
    ("snap", LAYER, Shape::Words),
    /* Whether a touch swipes the layer out through its edge, or the prop
    that says so, as a drawer's `swipe`. */
    ("swipe", LAYER, Shape::Flag),
    /* The prop that holds the id a layer is placed against, a view the page
    registers under it, as a tour stop is placed against the control it
    explains: an element the web finds by its id, and a view a phone's
    `useTarget` registers. */
    ("target", LAYER, Shape::Words),
];

/// The placements a layer's `placement` takes, as Floating UI names them:
/// the side of the anchor, and where along it.
pub const PLACEMENTS: &[&str] = &[
    "bottom",
    "bottom-end",
    "bottom-start",
    "left",
    "left-end",
    "left-start",
    "right",
    "right-end",
    "right-start",
    "top",
    "top-end",
    "top-start",
];

/// The ways a reader may dismiss a layer, as `<dialog closedby>` names them.
pub const CLOSED_BY: &[&str] = &["any", "closerequest", "none"];

/// How an anchored layer is drawn: a sheet in a window narrower than 30rem
/// and a popover in any other, or either one always.
pub const PRESENTATIONS: &[&str] = &["auto", "popover", "sheet"];

/// Where focus goes as a layer opens.
pub const ENTERS: &[&str] = &["always", "down", "press"];

/// Where focus goes as a layer its anchor opens closes.
pub const RETURNS: &[&str] = &["always", "dismissed", "held"];

/// What a press drawn in a layer's anchor does to the layer.
pub const PRESSES: &[&str] = &["close", "none", "toggle"];

/// The edges of the window a layer stands along, as a drawer's placement
/// names them.
pub const EDGES: &[&str] = &["bottom", "end", "start", "top"];

/// The attributes that place a layer against its anchor.
const ANCHORED: &[&str] = &[
    "arrow",
    "arrows",
    "cross-offset",
    "flip",
    "hint",
    "holds",
    "offset",
    "placement",
    "presentation",
    "presses",
];

/// What places a layer on a side of its anchor, which a band stands on none of.
const BANDLESS: &[&str] = &[
    "arrow",
    "cross-offset",
    "edge",
    "flip",
    "offset",
    "placement",
    "presentation",
];

/// Holds a layer's attributes to each other.
///
/// # Errors
///
/// A sentence naming the layer and what it lacks or does not take.
pub fn node(node: &Node, at: &str) -> Result<(), String> {
    if node.kind != NodeKind::Layer {
        return Ok(());
    }
    if !matches!(
        node.attributes.get("open"),
        Some(Attribute::Bound(Binding::Bind(_)))
    ) {
        return Err(format!(
            "{at}: a layer opens on a prop, `open: bind('open')`"
        ));
    }
    literal(node, "placement", PLACEMENTS, at)?;
    literal(node, "closedby", CLOSED_BY, at)?;
    literal(node, "presentation", PRESENTATIONS, at)?;
    literal(node, "edge", EDGES, at)?;
    swipes(node, at)?;
    let targeted = node.attributes.get("target");
    if targeted.is_some_and(|target| !matches!(target, Attribute::Bound(Binding::Bind(_)))) {
        return Err(format!(
            "{at}: `target` names the prop that holds the id of what the layer is placed against, `target: bind('for')`"
        ));
    }
    if targeted.is_some() && node.attributes.contains_key("anchor") {
        return Err(format!(
            "{at}: a layer is placed against its `anchor` or its `target`, and not both"
        ));
    }
    let anchored = node.attributes.contains_key("anchor") || targeted.is_some();
    if let Some(name) = ANCHORED
        .iter()
        .find(|name| !anchored && node.attributes.contains_key(**name))
    {
        return Err(format!(
            "{at}: `{name}` places a layer against its `anchor`, and it names none"
        ));
    }
    let flag = |name: &str| matches!(node.attributes.get(name), Some(Attribute::Flag(true)));
    if flag("band") && !node.attributes.contains_key("anchor") {
        return Err(format!(
            "{at}: a `band` stands under its `anchor`, and it names none"
        ));
    }
    if let Some(name) = BANDLESS
        .iter()
        .find(|name| flag("band") && node.attributes.contains_key(**name))
    {
        return Err(format!(
            "{at}: a `band` spans the window under its anchor, so it takes no `{name}`"
        ));
    }
    if flag("notice")
        && node
            .attributes
            .get("modal")
            .is_some_and(|modal| !matches!(modal, Attribute::Flag(false)))
    {
        return Err(format!(
            "{at}: a `notice` stands above the dialogs and holds no reader, so it is not `modal`"
        ));
    }
    /* A decorative layer is a look alone, as a tour's spotlight is. */
    if node.children.is_empty() && !flag("decorative") {
        return Err(format!("{at}: a layer holds what it opens"));
    }
    Ok(())
}

/// A layer that swipes stands along an edge, and only a layer that swipes
/// has snap points.
fn swipes(node: &Node, at: &str) -> Result<(), String> {
    let swipes = node
        .attributes
        .get("swipe")
        .is_some_and(|swipe| !matches!(swipe, Attribute::Flag(false)));
    if swipes
        && !node.attributes.contains_key("edge")
        && !node.attributes.contains_key("presentation")
    {
        return Err(format!(
            "{at}: a layer that swipes stands along an edge: name its `side`, or give it a `presentation` that makes it a sheet"
        ));
    }
    if !swipes && node.attributes.contains_key("snap") {
        return Err(format!(
            "{at}: `snapPoints` names where a swipe comes to rest, and the layer does not swipe"
        ));
    }
    if node
        .attributes
        .get("snap")
        .is_some_and(|snap| !matches!(snap, Attribute::Bound(Binding::Bind(_))))
    {
        return Err(format!(
            "{at}: `snapPoints` binds the prop that holds the snap points, `snapPoints={{props.snapPoints}}`"
        ));
    }
    Ok(())
}

/// A string attribute written out is one of `values`. One bound to a prop
/// takes the prop's value.
fn literal(node: &Node, name: &str, values: &[&str], at: &str) -> Result<(), String> {
    match node.attributes.get(name) {
        Some(Attribute::Text(value)) if !values.contains(&value.as_str()) => Err(format!(
            "{at}: `{name}` takes one of {}, or `bind()`",
            values
                .iter()
                .map(|value| format!("`{value}`"))
                .collect::<Vec<_>>()
                .join(", ")
        )),
        _ => Ok(()),
    }
}

/// Holds where each layer stands: never inside another layer, a repeat, or
/// a vector, since each opens once over the page.
///
/// # Errors
///
/// A sentence naming the layer and what it stands in.
pub fn placed(nodes: &[Node]) -> Result<(), String> {
    walk(nodes, None)
}

fn walk(nodes: &[Node], around: Option<&str>) -> Result<(), String> {
    for node in nodes {
        let here = format!("`{}('{}')`", node.kind, node.name);
        if node.kind == NodeKind::Layer {
            if let Some(outer) = around {
                return Err(format!(
                    "{here} is inside {outer}, and a layer stands in no layer, repeat or vector"
                ));
            }
        }
        let holds = node.kind == NodeKind::Layer
            || node.kind == NodeKind::Repeat
            || node.attributes.contains_key("viewBox");
        walk(
            &node.children,
            if holds { Some(here.as_str()) } else { around },
        )?;
    }
    Ok(())
}

/// Every layer of a tree, depth first.
pub fn layers(nodes: &[Node]) -> Vec<&Node> {
    let mut found = Vec::new();
    for node in nodes {
        if node.kind == NodeKind::Layer {
            found.push(node);
        }
        found.extend(layers(&node.children));
    }
    found
}
