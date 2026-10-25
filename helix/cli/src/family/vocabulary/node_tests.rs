use std::collections::BTreeMap;

use super::*;
use crate::family::api::{Attribute, Binding, Node, NodeKind};

fn with(kind: NodeKind, name: &str, attributes: &[(&str, Attribute)], children: Vec<Node>) -> Node {
    Node {
        attributes: attributes
            .iter()
            .map(|(key, value)| ((*key).to_owned(), value.clone()))
            .collect::<BTreeMap<_, _>>(),
        children,
        kind,
        name: name.to_owned(),
    }
}

fn text(value: &str) -> Attribute {
    Attribute::Text(value.to_owned())
}

fn bind(prop: &str) -> Attribute {
    Attribute::Bound(Binding::Bind(prop.to_owned()))
}

fn circle(name: &str) -> Node {
    with(
        NodeKind::Box,
        name,
        &[
            ("shape", text("circle")),
            ("cx", text("50%")),
            ("r", Attribute::Number(45.0)),
            ("pathLength", Attribute::Number(100.0)),
        ],
        Vec::new(),
    )
}

fn vector(children: Vec<Node>) -> Node {
    with(
        NodeKind::Box,
        "track",
        &[("viewBox", text("0 0 100 100"))],
        children,
    )
}

#[test]
fn a_shape_takes_its_own_geometry() {
    assert!(node(&circle("groove")).is_ok());
    let line = with(
        NodeKind::Box,
        "tick",
        &[("shape", text("line")), ("r", Attribute::Number(1.0))],
        Vec::new(),
    );
    assert_eq!(
        node(&line).unwrap_err(),
        "`box('tick')`: a line does not take `r`, and takes `x1`, `x2`, `y1`, `y2`"
    );
    let loose = with(
        NodeKind::Box,
        "dot",
        &[("r", Attribute::Number(1.0))],
        Vec::new(),
    );
    assert!(node(&loose).unwrap_err().contains("it has no `shape`"));
    let path = with(
        NodeKind::Box,
        "mark",
        &[("shape", text("path"))],
        Vec::new(),
    );
    assert!(node(&path).unwrap_err().contains("`d`"));
    let full = with(
        NodeKind::Box,
        "dot",
        &[("shape", text("circle"))],
        vec![circle("x")],
    );
    assert!(node(&full).unwrap_err().contains("holds nothing"));
}

#[test]
fn a_vector_holds_shapes_and_a_shape_is_inside_one() {
    let when = Node {
        attributes: BTreeMap::new(),
        children: vec![circle("tick")],
        kind: NodeKind::When,
        name: "banded".to_owned(),
    };
    assert!(tree(&[vector(vec![circle("groove"), when])]).is_ok());
    let stray = tree(&[vector(vec![with(NodeKind::Box, "label", &[], Vec::new())])]);
    assert_eq!(
        stray.unwrap_err(),
        "`box('label')` is inside a vector, which holds shapes alone"
    );
    let outside = tree(&[with(NodeKind::Box, "track", &[], vec![circle("groove")])]);
    assert!(outside
        .unwrap_err()
        .contains("not inside a box with a `viewBox`"));
}

#[test]
fn a_heading_has_a_level_and_nothing_else_does() {
    let heading = with(
        NodeKind::Box,
        "heading",
        &[("role", text("heading")), ("level", bind("heading-level"))],
        Vec::new(),
    );
    assert!(node(&heading).is_ok());
    let element = with(
        NodeKind::Box,
        "title",
        &[
            ("element", text("heading")),
            ("level", Attribute::Number(2.0)),
        ],
        Vec::new(),
    );
    assert!(node(&element).is_ok());
    let bare = with(
        NodeKind::Box,
        "heading",
        &[("role", text("heading"))],
        Vec::new(),
    );
    assert!(node(&bare).unwrap_err().contains("takes its `level`"));
    let stray = with(
        NodeKind::Box,
        "body",
        &[("level", Attribute::Number(2.0))],
        Vec::new(),
    );
    assert!(node(&stray).unwrap_err().contains("it is no heading"));
}

#[test]
fn a_reading_belongs_to_a_range() {
    let meter = with(
        NodeKind::Box,
        "meter",
        &[
            ("role", text("meter")),
            ("valuemax", bind("max")),
            ("valuemin", bind("min")),
            ("valuenow", bind("value")),
        ],
        Vec::new(),
    );
    assert!(node(&meter).is_ok());
    let indeterminate = with(
        NodeKind::Box,
        "bar",
        &[("role", text("progressbar"))],
        Vec::new(),
    );
    assert!(node(&indeterminate).is_ok());
    let unread = with(
        NodeKind::Box,
        "meter",
        &[("role", text("meter"))],
        Vec::new(),
    );
    assert!(node(&unread).unwrap_err().contains("`valuenow`"));
    let group = with(
        NodeKind::Box,
        "group",
        &[
            ("role", text("group")),
            ("valuenow", Attribute::Number(1.0)),
        ],
        Vec::new(),
    );
    assert!(node(&group)
        .unwrap_err()
        .contains("`valuenow` is a range's, and its role is not `meter`, `progressbar`"));
}

#[test]
fn a_press_is_checked_where_its_role_can_be() {
    let radio = with(
        NodeKind::Pressable,
        "control",
        &[("role", text("radio")), ("checked", bind("selected"))],
        Vec::new(),
    );
    assert!(node(&radio).is_ok());
    let toggle = with(
        NodeKind::Pressable,
        "control",
        &[("role", text("switch")), ("toggles", Attribute::Flag(true))],
        Vec::new(),
    );
    assert!(node(&toggle).is_ok());
    let silent = with(
        NodeKind::Pressable,
        "control",
        &[("role", text("radio"))],
        Vec::new(),
    );
    assert!(node(&silent)
        .unwrap_err()
        .contains("`checked` or `toggles`"));
    let button = with(
        NodeKind::Pressable,
        "button",
        &[("role", text("button")), ("checked", bind("on"))],
        Vec::new(),
    );
    assert!(node(&button).unwrap_err().contains("for a role of"));
    let both = with(
        NodeKind::Pressable,
        "control",
        &[
            ("role", text("checkbox")),
            ("checked", bind("on")),
            ("toggles", Attribute::Flag(true)),
        ],
        Vec::new(),
    );
    assert!(node(&both).unwrap_err().contains("takes no `checked`"));
}

#[test]
fn a_press_that_stays_pressed_is_a_button() {
    let pressed = with(
        NodeKind::Pressable,
        "button",
        &[
            ("pressed", bind("paused")),
            ("toggles", Attribute::Flag(true)),
        ],
        Vec::new(),
    );
    assert!(node(&pressed).is_ok());
    let tab = with(
        NodeKind::Pressable,
        "tab",
        &[("role", text("tab")), ("pressed", bind("on"))],
        Vec::new(),
    );
    assert!(node(&tab).unwrap_err().contains("is a button"));
}

#[test]
fn a_box_takes_lines_where_it_is_a_run() {
    let run = with(
        NodeKind::Box,
        "text",
        &[("lines", bind("lines")), ("run", Attribute::Flag(true))],
        Vec::new(),
    );
    assert!(node(&run).is_ok());
    let plain = with(
        NodeKind::Box,
        "text",
        &[("lines", bind("lines"))],
        Vec::new(),
    );
    assert_eq!(
        node(&plain).unwrap_err(),
        "`box('text')`: `lines` is a run's, and a box takes it with `run`"
    );
}

#[test]
fn a_repeat_takes_its_count_and_holds_what_it_draws() {
    let line = with(NodeKind::Box, "skeleton", &[], Vec::new());
    let counted = with(
        NodeKind::Repeat,
        "line",
        &[("count", bind("lines"))],
        vec![line],
    );
    assert!(node(&counted).is_ok());
    let uncounted = with(
        NodeKind::Repeat,
        "line",
        &[],
        vec![with(NodeKind::Box, "a", &[], Vec::new())],
    );
    assert_eq!(
        node(&uncounted).unwrap_err(),
        "`repeat('line')`: a repeat takes its `count` or its `each`"
    );
    let empty = with(
        NodeKind::Repeat,
        "line",
        &[("count", bind("lines"))],
        Vec::new(),
    );
    assert_eq!(
        node(&empty).unwrap_err(),
        "`repeat('line')`: a repeat holds what it draws"
    );
}

#[test]
fn an_element_bound_to_a_prop_needs_no_level() {
    let bound = with(
        NodeKind::Box,
        "text",
        &[("element", bind("as"))],
        Vec::new(),
    );
    assert!(node(&bound).is_ok());
}
