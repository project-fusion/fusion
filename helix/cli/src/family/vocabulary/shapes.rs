//! What an attribute's value may be, and how a refusal says it.

use crate::family::vocabulary::kinds;

/// What an attribute's value may be.
#[derive(Clone, Copy, Debug)]
pub enum Shape {
    /// A whole number from 1, or the prop that holds it, `bind()`.
    Count,
    /// One of the kinds of element in [`kinds::ELEMENTS`], or the prop that
    /// names one by its web tag, `bind()`, as Text's `as` does: `h2` is a
    /// heading of level 2 and `p` a paragraph.
    Element,
    /// `true`, `false`, or the prop that drives it, `bind()` or `not()`.
    Flag,
    /// A coordinate in a vector's units: a number, or a string holding a
    /// number or a percentage of the vector's box.
    Length,
    /// A string written in the source.
    Name,
    /// A number, or the prop that holds it, `bind()`.
    Number,
    /// One of these strings.
    OneOf(&'static [&'static str]),
    /// Parts the node is as well, each with the flag that adds it.
    Parts,
    /// A path's outline, in SVG's path data.
    Path,
    /// A number above zero.
    Positive,
    /// A list: the prop that holds one, `bind()`, or a derivation that
    /// computes one, `derive()`.
    List,
    /// One of the roles in [`kinds::ROLES`].
    Role,
    /// `true` alone.
    Set,
    /// A vector's box: its least x, its least y, its width and its height,
    /// four numbers.
    ViewBox,
    /// A string, the prop that holds it, `bind()`, or words the element
    /// computes from its props, `derive()`.
    Words,
}

/// What a value of `shape` may be, in words.
pub fn describe(shape: Shape) -> String {
    let listed = |values: &mut dyn Iterator<Item = &str>| {
        format!(
            "one of {}",
            values
                .map(|value| format!("`{value}`"))
                .collect::<Vec<_>>()
                .join(", ")
        )
    };
    match shape {
        Shape::Count => "a whole number from 1, or `bind()`".to_owned(),
        Shape::Element => format!(
            "{}, or `bind()` to a prop that holds an element's web tag",
            listed(&mut kinds::ELEMENTS.iter().map(|element| element.name))
        ),
        Shape::Flag => "`true`, `false`, `bind()` or `not()`".to_owned(),
        Shape::Length => {
            "a number, a string holding a number or a percentage, `bind()` or `derive()`".to_owned()
        }
        Shape::Name => "a string".to_owned(),
        Shape::Number => "a number or `bind()`".to_owned(),
        Shape::OneOf(values) => listed(&mut values.iter().copied()),
        Shape::Parts => {
            "an object of parts, each `true`, `false`, `bind()`, `not()` or `field()`".to_owned()
        }
        Shape::Path => "a string of SVG path data, `bind()` or `derive()`".to_owned(),
        Shape::Positive => "a number above zero".to_owned(),
        Shape::List => "`bind()` to a prop or `derive()` of a list".to_owned(),
        Shape::Role => listed(&mut kinds::ROLES.iter().map(|role| role.name)),
        Shape::Set => "`true` alone".to_owned(),
        Shape::ViewBox => {
            "a string of four numbers, its width and height above zero, or `none`".to_owned()
        }
        Shape::Words => "a string, `bind()` or `derive()`".to_owned(),
    }
}
