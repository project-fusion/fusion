//! The names a layer reads, held to what the element has, and the rules only
//! a layer takes.
//!
//! - A layer's `anchor` names a part outside the layer, which may be a
//!   region's `part`, as a popover's trigger is, and its `arrow` a part
//!   inside it.
//! - The element declares the state `open`, which the layer is in while it
//!   stands open, and an anchored layer the four `placed-` states, the side
//!   of its anchor it landed on, and the two `aligned-` states, the end of
//!   that side it is aligned to, as the web's floating controller writes them.
//! - The layer opens on the prop its element's `toggle` holds as checked, so
//!   a press, a dismissal and the page writing the prop turn one toggle.
//! - **A layer that may be a sheet says so and keeps clear of the home
//!   indicator.** Its element declares the state `sheet`, a bound
//!   `presentation` reads a prop that takes `auto`, `popover` and `sheet`, and
//!   a rule on the layer under `sheet` pads it by `safeArea('bottom')`.
//! - **A rule that reads the window is a layer's.** A rule under `window`,
//!   one on a layer's `backdrop`, and one whose value holds a viewport
//!   length, such as `100dvh`, or the safe area, is on a layer and on no
//!   other part, as a component cannot know the window and a layer's box is
//!   placed in it. **The host may read the safe area too**, as an app header
//!   at the top of the window stands clear of the status bar: a phone
//!   measures where the host stands in the window and reads the share of
//!   each inset that reaches into it.

#[cfg(test)]
#[path = "resolve_layers_tests.rs"]
mod tests;

use std::collections::BTreeSet;

use super::{rules, Names};
use crate::family::api::{self, parts, Attribute, Binding, Node, PropType, Toggle};
use crate::family::ir::{Condition, Family, Rule, Value};
use crate::family::vocabulary::layer::{layers, PRESENTATIONS};

/// The sides of its anchor a layer may land on, each a state it is in there.
pub const PLACED: &[&str] = &["placed-bottom", "placed-left", "placed-right", "placed-top"];

/// The ends of the side a layer may be aligned to, each a state it is in
/// there: `bottom-start` is `aligned-start`, and `bottom` is neither.
pub const ALIGNED: &[&str] = &["aligned-end", "aligned-start"];

/// The edges of the window the safe area keeps clear, as `safeArea()` names them.
const EDGES: &[&str] = &["bottom", "left", "right", "top"];

/// The viewport's units, which a layer's rules alone may write.
const VIEWPORT: &[&str] = &[
    "dvb", "dvh", "dvi", "dvw", "lvb", "lvh", "lvi", "lvw", "svb", "svh", "svi", "svw", "vb", "vh",
    "vi", "vmax", "vmin", "vw",
];

/// Where a family's layers read names it lacks, one sentence each.
pub(super) fn layered(family: &Family, names: &Names, found: &mut Vec<String>) {
    for layer in layers(&family.tree) {
        let at = format!("`layer('{}')`", layer.name);
        let mut inside = BTreeSet::new();
        parts(&layer.children, &mut inside);
        if let Some(Attribute::Text(anchor)) = layer.attributes.get("anchor") {
            if anchor == &layer.name || inside.contains(anchor) {
                found.push(format!(
                    "{at} is placed against `{anchor}`, which stands inside it"
                ));
            } else if !names.parts.contains(anchor) {
                found.push(format!(
                    "{at} is placed against `{anchor}`, and no part has that name"
                ));
            }
        }
        /* A band stands under its anchor across the window, on no side of it. */
        let band = matches!(layer.attributes.get("band"), Some(Attribute::Flag(true)));
        if !band
            && (layer.attributes.contains_key("anchor") || layer.attributes.contains_key("target"))
        {
            /* A placement written out lands on its side or the one facing it,
            at its own end, as a color input's panel can land nowhere else, so
            the element owes those states alone. */
            let written = match layer.attributes.get("placement") {
                Some(Attribute::Text(placement)) => Some(placement.as_str()),
                _ => None,
            };
            let reached = |state: &str| match written.map(|one| one.split('-').collect::<Vec<_>>())
            {
                Some(words) => {
                    let side = words.first().copied().unwrap_or_default();
                    let facing = match side {
                        "top" => "bottom",
                        "bottom" => "top",
                        "left" => "right",
                        _ => "left",
                    };
                    let end = words.get(1).copied();
                    state == format!("placed-{side}")
                        || state == format!("placed-{facing}")
                        || end.is_some_and(|end| state == format!("aligned-{end}"))
                }
                None => true,
            };
            for state in PLACED.iter().filter(|state| reached(state)) {
                if !names.states.contains(state) {
                    found.push(format!(
                        "{at} is placed against its anchor, and the element declares no state `{state}` for the side it lands on"
                    ));
                }
            }
            for state in ALIGNED.iter().filter(|state| reached(state)) {
                if !names.states.contains(state) {
                    found.push(format!(
                        "{at} is placed against its anchor, and the element declares no state `{state}` for the end of the side it is aligned to"
                    ));
                }
            }
        }
        if let Some(Attribute::Text(arrow)) = layer.attributes.get("arrow") {
            if !inside.contains(arrow) {
                found.push(format!(
                    "{at} points at its anchor with `{arrow}`, and no part inside it has that name"
                ));
            }
        }
        if layer.attributes.contains_key("presentation") {
            presented(family, layer, names, &at, found);
        }
        let Some(Attribute::Bound(Binding::Bind(open))) = layer.attributes.get("open") else {
            if !names.states.contains("open") {
                found.push(format!(
                    "{at} opens, and the element declares no state `open` for it to stand in"
                ));
            }
            continue;
        };
        /* A stack of messages opens while one of them shows, and a tour's
        spotlight and its stops as the tour stands, which they compute: no
        toggle holds them, and the web's elements say no state for them. */
        if family
            .api
            .notices
            .as_ref()
            .is_some_and(|notices| &notices.showing == open)
            || api::Tour::of(&family.api).any(|name| name == open)
        {
            continue;
        }
        if !names.states.contains("open") {
            found.push(format!(
                "{at} opens, and the element declares no state `open` for it to stand in"
            ));
        }
        let held = family
            .api
            .toggle
            .as_ref()
            .and_then(|toggle| toggle.checked.as_deref());
        if held != Some(open.as_str()) {
            found.push(format!(
                "{at} opens on `{open}`, and the element's `toggle` does not hold it as checked"
            ));
        }
    }
}

/// Where a layer that may be a sheet lacks its state, a prop that takes the
/// three presentations, or a rule that keeps it clear of the home indicator.
fn presented(family: &Family, layer: &Node, names: &Names, at: &str, found: &mut Vec<String>) {
    if !names.states.contains("sheet") {
        found.push(format!(
            "{at} may be a sheet, and the element declares no state `sheet` for it to stand in"
        ));
    }
    if let Some(Attribute::Bound(Binding::Bind(prop))) = layer.attributes.get("presentation") {
        let takes = names.prop(prop).is_some_and(|prop| match &prop.kind {
            PropType::Values(values) => PRESENTATIONS
                .iter()
                .all(|one| values.iter().any(|value| value == one)),
            PropType::Function { .. } | PropType::Primitive(_) => false,
        });
        if !takes {
            found.push(format!(
                "{at} is presented as `{prop}` says, and `{prop}` does not take `auto`, `popover` and `sheet`"
            ));
        }
    }
    let clear = rules(family).any(|rule| {
        rule.target == layer.name
            && rule.inner.is_none()
            && rule
                .when
                .iter()
                .any(|condition| matches!(condition, Condition::State { name } if name == "sheet"))
            && rule.set.iter().any(|(property, value)| {
                property.starts_with("padding") && safe_area(value, "bottom")
            })
    });
    if !clear {
        found.push(format!(
            "{at} may be a sheet along the window's bottom edge, and no rule on it under `state: 'sheet'` pads it by `safeArea('bottom')`"
        ));
    }
}

/// Whether a layer opens on the prop `toggle` holds as checked.
pub(super) fn opened_by(family: &Family, toggle: &Toggle) -> bool {
    /* A tour opens on the page's request and closes on its own controls. */
    family.api.tour.is_some()
        || layers(&family.tree).iter().any(|layer| {
        matches!(
            layer.attributes.get("open"),
            Some(Attribute::Bound(Binding::Bind(prop))) if Some(prop.as_str()) == toggle.checked.as_deref()
        )
    })
}

/// Why a rule that reads the window is not a layer's, where it is not.
pub(super) fn window_rule(rule: &Rule, names: &Names) -> Option<String> {
    let values = || rule.set.iter().chain(&rule.values).map(|(_, value)| value);
    let plain = rule.region.is_none() && rule.slotted.is_none();
    let on_host = rule.target == "host" && plain && rule.inner.is_none();
    let reads = if rule.when.iter().any(windowed) {
        Some("reads `window`")
    } else if rule.inner.as_deref() == Some("::backdrop") {
        Some("is on a `backdrop`")
    } else if values().any(viewport) {
        Some("writes a viewport length")
    } else if !on_host && values().any(|value| EDGES.iter().any(|edge| safe_area(value, edge))) {
        Some("reads the safe area")
    } else {
        None
    }?;
    let on_layer = names.layers.contains(&rule.target) && plain;
    (!on_layer).then(|| {
        format!(
            "a rule on `{}` {reads}, and only a layer's rules do, as only a layer is placed in the window",
            rule.target
        )
    })
}

/// Whether a condition reads the window, itself or inside a `:not()`.
fn windowed(condition: &Condition) -> bool {
    match condition {
        Condition::Window { .. } => true,
        Condition::Not { condition } => windowed(condition),
        _ => false,
    }
}

/// Whether a value reads the safe area at `edge` anywhere in it,
/// `env(safe-area-inset-<edge>)`, as `safeArea()` writes it.
fn safe_area(value: &Value, edge: &str) -> bool {
    let within = |values: &[Value]| values.iter().any(|one| safe_area(one, edge));
    match value {
        Value::Function { arguments, name } => {
            let inset = format!("safe-area-inset-{edge}");
            (name == "env"
                && matches!(arguments.first(), Some(Value::Text(text)) if *text == inset))
                || within(arguments)
        }
        Value::Calc { operands, .. } => within(operands),
        Value::List(values) | Value::Space(values) => within(values),
        Value::Mix { first, second, .. } => safe_area(first, edge) || safe_area(second, edge),
        Value::Web(inner) => safe_area(inner, edge),
        _ => false,
    }
}

/// Whether a value holds a length in the viewport's units, anywhere in it.
fn viewport(value: &Value) -> bool {
    match value {
        Value::Text(text) => text
            .split(|character: char| {
                !character.is_ascii_alphanumeric() && character != '.' && character != '-'
            })
            .any(|word| {
                let unit = word.trim_start_matches(|character: char| {
                    character.is_ascii_digit() || character == '.' || character == '-'
                });
                unit.len() < word.len() && VIEWPORT.contains(&unit)
            }),
        Value::Calc { operands, .. } => operands.iter().any(viewport),
        Value::Function { arguments, .. } => arguments.iter().any(viewport),
        Value::List(values) | Value::Space(values) => values.iter().any(viewport),
        Value::Mix { first, second, .. } => viewport(first) || viewport(second),
        Value::Scheme { dark, light } => viewport(dark) || viewport(light),
        Value::Web(inner) => viewport(inner),
        Value::Derived { fallback, .. }
        | Value::Hook { fallback, .. }
        | Value::Inherited { fallback, .. }
        | Value::Measured { fallback, .. }
        | Value::Own { fallback, .. } => fallback.as_deref().is_some_and(viewport),
        Value::Fit(_)
        | Value::Keyword(_)
        | Value::Number(_)
        | Value::Quote { .. }
        | Value::Token(_) => false,
    }
}
