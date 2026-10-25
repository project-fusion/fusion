//! Which CSS properties a shorthand sets, so the compiler can tell when two
//! declarations set one property.
//!
//! **Written for the properties the tables write**, logical ones only: a
//! physical box property is refused where a table writes one, so a margin's
//! sides are `margin-block-start` and the rest, and never `margin-top`. A
//! property the table does not name is its own longhand.
//!
//! **`all` sets every property but a custom one**, which is why it comes
//! first in a rule, and why it competes with every other declaration.
//!
//! The native resolver expands shorthands too, in
//! `helix/native/src/style/properties.ts`, for what a phone draws. That table maps
//! values onto native styles and this one only names what each shorthand
//! covers, so the two answer different questions; a property added to one
//! belongs in the other where a table writes it.

use std::collections::BTreeSet;

/// Each shorthand and the properties it sets, which may be shorthands too.
#[rustfmt::skip]
const SHORTHANDS: &[(&str, &[&str])] = &[
    ("animation", &["animation-composition", "animation-delay", "animation-direction", "animation-duration", "animation-fill-mode", "animation-iteration-count", "animation-name", "animation-play-state", "animation-timeline", "animation-timing-function"]),
    ("background", &["background-attachment", "background-clip", "background-color", "background-image", "background-origin", "background-position", "background-repeat", "background-size"]),
    ("background-position", &["background-position-x", "background-position-y"]),
    ("border", &["border-block", "border-inline", "border-image"]),
    ("border-block", &["border-block-start", "border-block-end"]),
    ("border-block-color", &["border-block-start-color", "border-block-end-color"]),
    ("border-block-end", &["border-block-end-color", "border-block-end-style", "border-block-end-width"]),
    ("border-block-start", &["border-block-start-color", "border-block-start-style", "border-block-start-width"]),
    ("border-block-style", &["border-block-start-style", "border-block-end-style"]),
    ("border-block-width", &["border-block-start-width", "border-block-end-width"]),
    ("border-color", &["border-block-color", "border-inline-color"]),
    ("border-image", &["border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width"]),
    ("border-inline", &["border-inline-start", "border-inline-end"]),
    ("border-inline-color", &["border-inline-start-color", "border-inline-end-color"]),
    ("border-inline-end", &["border-inline-end-color", "border-inline-end-style", "border-inline-end-width"]),
    ("border-inline-start", &["border-inline-start-color", "border-inline-start-style", "border-inline-start-width"]),
    ("border-inline-style", &["border-inline-start-style", "border-inline-end-style"]),
    ("border-inline-width", &["border-inline-start-width", "border-inline-end-width"]),
    ("border-radius", &["border-end-end-radius", "border-end-start-radius", "border-start-end-radius", "border-start-start-radius"]),
    ("border-style", &["border-block-style", "border-inline-style"]),
    ("border-width", &["border-block-width", "border-inline-width"]),
    ("columns", &["column-count", "column-width"]),
    ("container", &["container-name", "container-type"]),
    ("flex", &["flex-basis", "flex-grow", "flex-shrink"]),
    ("flex-flow", &["flex-direction", "flex-wrap"]),
    ("font", &["font-family", "font-feature-settings", "font-kerning", "font-optical-sizing", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-variation-settings", "font-weight", "line-height"]),
    ("font-variant", &["font-variant-alternates", "font-variant-caps", "font-variant-east-asian", "font-variant-ligatures", "font-variant-numeric", "font-variant-position"]),
    ("gap", &["column-gap", "row-gap"]),
    ("grid", &["grid-auto-columns", "grid-auto-flow", "grid-auto-rows", "grid-template"]),
    ("grid-area", &["grid-column", "grid-row"]),
    ("grid-column", &["grid-column-end", "grid-column-start"]),
    ("grid-row", &["grid-row-end", "grid-row-start"]),
    ("grid-template", &["grid-template-areas", "grid-template-columns", "grid-template-rows"]),
    ("inset", &["bottom", "inset-block", "inset-inline", "left", "right", "top"]),
    ("inset-block", &["inset-block-end", "inset-block-start"]),
    ("inset-inline", &["inset-inline-end", "inset-inline-start"]),
    ("list-style", &["list-style-image", "list-style-position", "list-style-type"]),
    ("margin", &["margin-block", "margin-inline"]),
    ("margin-block", &["margin-block-end", "margin-block-start"]),
    ("margin-inline", &["margin-inline-end", "margin-inline-start"]),
    ("mask", &["mask-clip", "mask-composite", "mask-image", "mask-mode", "mask-origin", "mask-position", "mask-repeat", "mask-size"]),
    ("outline", &["outline-color", "outline-style", "outline-width"]),
    ("overflow", &["overflow-block", "overflow-inline"]),
    ("overflow-block", &["overflow-y"]),
    ("overflow-inline", &["overflow-x"]),
    ("padding", &["padding-block", "padding-inline"]),
    ("padding-block", &["padding-block-end", "padding-block-start"]),
    ("padding-inline", &["padding-inline-end", "padding-inline-start"]),
    ("place-content", &["align-content", "justify-content"]),
    ("place-items", &["align-items", "justify-items"]),
    ("place-self", &["align-self", "justify-self"]),
    ("scroll-margin", &["scroll-margin-block", "scroll-margin-inline"]),
    ("scroll-padding", &["scroll-padding-block", "scroll-padding-inline"]),
    ("text-box", &["text-box-edge", "text-box-trim"]),
    ("text-decoration", &["text-decoration-color", "text-decoration-line", "text-decoration-style", "text-decoration-thickness"]),
    ("text-emphasis", &["text-emphasis-color", "text-emphasis-style"]),
    ("transition", &["transition-behavior", "transition-delay", "transition-duration", "transition-property", "transition-timing-function"]),
];

/// The physical box properties, which a table writes as logical ones. The
/// physical offsets, `left`, `top`, `right` and `bottom`, are not here: a
/// part held to one physical edge in every direction writes them, and React
/// Native takes them as they are.
const PHYSICAL: &[&str] = &[
    "height",
    "max-height",
    "max-width",
    "min-height",
    "min-width",
    "width",
];

/// The physical sides, which a margin, a padding, a border or an inset
/// names logically instead.
const SIDES: &[&str] = &["-bottom", "-left", "-right", "-top"];

/// Whether a property is a physical box property, which a table names
/// logically: `inline-size` for `width`, `margin-block-start` for
/// `margin-top`.
pub fn physical(property: &str) -> bool {
    if PHYSICAL.contains(&property) {
        return true;
    }
    [
        "margin",
        "padding",
        "border",
        "scroll-margin",
        "scroll-padding",
    ]
    .iter()
    .any(|base| {
        property.strip_prefix(base).is_some_and(|rest| {
            SIDES.iter().any(|side| rest.starts_with(side))
                || [
                    "-top-left-radius",
                    "-top-right-radius",
                    "-bottom-left-radius",
                    "-bottom-right-radius",
                ]
                .contains(&rest)
        })
    })
}

/// What a declaration of `property` sets: its longhands, or with `None`
/// every property but a custom one, which is `all`.
pub fn longhands(property: &str) -> Option<BTreeSet<String>> {
    if property == "all" {
        return None;
    }
    let mut set = BTreeSet::new();
    expand(property, &mut set);
    Some(set)
}

fn expand(property: &str, into: &mut BTreeSet<String>) {
    match SHORTHANDS.iter().find(|(name, _)| *name == property) {
        Some((_, parts)) => parts.iter().for_each(|part| expand(part, into)),
        None => {
            into.insert(property.to_owned());
        }
    }
}

/// Whether declarations of `first` and `second` set a property in common.
pub fn overlap(first: &str, second: &str) -> bool {
    let custom = |property: &str| property.starts_with("--");
    match (longhands(first), longhands(second)) {
        (None, None) => true,
        (None, _) => !custom(second),
        (_, None) => !custom(first),
        (Some(first), Some(second)) => !first.is_disjoint(&second),
    }
}

/// Whether a declaration of `shorthand` resets everything `longhand` sets,
/// so `longhand` written before it in one rule is lost.
pub fn resets(shorthand: &str, longhand: &str) -> bool {
    if shorthand == longhand {
        return false;
    }
    match (longhands(shorthand), longhands(longhand)) {
        (None, _) => !longhand.starts_with("--"),
        (Some(_), None) => false,
        (Some(wide), Some(narrow)) => wide.len() > narrow.len() && narrow.is_subset(&wide),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_shorthand_resets_its_own_longhands_and_no_other() {
        assert!(resets("border", "border-block-start-color"));
        assert!(resets("border-color", "border-inline-end-color"));
        assert!(resets("font", "line-height"));
        assert!(resets("all", "align-items"));
        assert!(!resets("all", "--icon-size"));
        assert!(!resets("border-color", "border-width"));
        assert!(!resets("padding-block", "padding"));
    }

    #[test]
    fn two_shorthands_overlap_where_they_share_a_longhand() {
        assert!(overlap("border-block", "border-color"));
        assert!(overlap("inset", "inset-inline-end"));
        assert!(!overlap("margin-block", "margin-inline"));
        assert!(!overlap("--a", "all"));
    }

    #[test]
    fn a_physical_property_is_named_logically() {
        assert!(physical("width"));
        assert!(physical("margin-top"));
        assert!(physical("border-left-color"));
        assert!(physical("border-top-left-radius"));
        assert!(!physical("inline-size"));
        assert!(!physical("border-start-start-radius"));
        assert!(!physical("stroke-width"));
    }
}
