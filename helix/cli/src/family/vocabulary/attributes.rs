//! Each attribute a node may carry: the kinds of node that take it, and what
//! its value may be.

#[cfg(test)]
#[path = "attributes_tests.rs"]
mod tests;

use crate::family::api::{Attribute, Binding, NodeKind};
use crate::family::ir::is_list;
use crate::family::vocabulary::kinds;
use crate::family::vocabulary::layer;
use crate::family::vocabulary::shapes::{describe, Shape};
use crate::family::vocabulary::written::{length, path_data, view_box};

/// Every kind of node that takes attributes.
const ALL: &[NodeKind] = &[
    NodeKind::Box,
    NodeKind::Field,
    NodeKind::Image,
    NodeKind::Layer,
    NodeKind::Live,
    NodeKind::Pressable,
    NodeKind::Region,
    NodeKind::Text,
    NodeKind::Wrap,
];

const BOX: &[NodeKind] = &[NodeKind::Box];
const PRESS: &[NodeKind] = &[NodeKind::Pressable];
/// Text a reader types.
const FIELD: &[NodeKind] = &[NodeKind::Field];
/// A press, a field, or a box a reader moves, as a slider's: what a reader
/// acts on, which a prop may disable. A box takes it only where its role is
/// a slider's or a spin button's.
const CONTROL: &[NodeKind] = &[NodeKind::Box, NodeKind::Field, NodeKind::Pressable];
/// A box, a press, or a field: what a screen reader reaches as one thing
/// that may be read-only or required.
const ANSWER: &[NodeKind] = &[NodeKind::Box, NodeKind::Field, NodeKind::Pressable];
/// A picture loaded from a source.
const IMAGE: &[NodeKind] = &[NodeKind::Image];
/// A box or a press: what a screen reader reaches as one thing.
const PART: &[NodeKind] = &[NodeKind::Box, NodeKind::Pressable];
/// What draws another element: a box, or a wrap around what it holds, which
/// the element it draws takes as its default region.
const DRAWS: &[NodeKind] = &[NodeKind::Box, NodeKind::Wrap];
/// A part, or a layer: what a screen reader hears by a role and a name.
const NAMED: &[NodeKind] = &[NodeKind::Box, NodeKind::Layer, NodeKind::Pressable];
/// A part, a layer, or a field: what takes a role. A field takes only the
/// role of a number a reader steps, `spinbutton`.
const ROLED: &[NodeKind] = &[
    NodeKind::Box,
    NodeKind::Field,
    NodeKind::Layer,
    NodeKind::Pressable,
];
/// A part, or a field a reader steps: what reads as a range.
const READS: &[NodeKind] = &[NodeKind::Box, NodeKind::Field, NodeKind::Pressable];

/// Each attribute: its name, the kinds of node that take it, and its value.
///
/// **An ARIA state is named as ARIA names it, without `aria-`**: `busy`,
/// `checked`, `valuenow`. A vector's geometry is named as SVG names it:
/// `viewBox`, `cx`, `pathLength`. The web writes each under that name, and
/// the native runtime reads it as its row says.
const ATTRIBUTES: &[(&str, &[NodeKind], Shape)] = &[
    (
        "also",
        &[
            NodeKind::Box,
            NodeKind::Layer,
            NodeKind::Pressable,
            NodeKind::Wrap,
        ],
        Shape::Parts,
    ),
    /* A picture's description, which a screen reader reads. Empty is a
    picture that is decoration. */
    ("alt", IMAGE, Shape::Words),
    /* Live words said as the element arrives, as an empty view says its
    heading, where the web's live region says them once it appears. */
    ("arrives", &[NodeKind::Live], Shape::Set),
    /* Whether a phone capitalizes as the reader types: `off`, `sentences`,
    `words` or `characters`, the web's `autocapitalize` and React Native's
    `autoCapitalize`. */
    ("autocapitalize", FIELD, Shape::Words),
    /* What the platform may fill the field with, an HTML `autocomplete`
    token: React Native's `autoComplete`, and iOS's `textContentType` for the
    tokens it has one for. */
    ("autocomplete", FIELD, Shape::Words),
    /* Whether the platform corrects words as the reader types. */
    ("autocorrect", FIELD, Shape::Flag),
    /* Whether a field of several lines grows with its text, to `maxrows`
    lines where that is set: the web's `auto-grow`, and a phone's multiline
    `TextInput` at its content's height. */
    ("grows", FIELD, Shape::Flag),
    /* `aria-busy`: a press at work, or a host whose content is still loading,
    as a skeleton's. */
    ("busy", PART, Shape::Flag),
    /* `aria-checked` on a press that is checked without turning a toggle, as
    a radio its set chooses: `accessibilityState.checked` on a phone. */
    ("checked", PRESS, Shape::Flag),
    /* The press that asks the collection its element joins to choose it. */
    ("chooses", PRESS, Shape::Set),
    /* Content kept drawn while closed: `hidden="until-found"` and `inert` on
    the web, drawn on a phone with no press and nothing a screen reader reaches. */
    ("closed", BOX, Shape::Flag),
    /* The press that empties the element's field, as its `entry` says, as
    an input's clear button. */
    ("clears", PRESS, Shape::Set),
    /* The press that copies the element's text to the clipboard, as its
    `copy` says, as a copy button's. */
    ("copies", PRESS, Shape::Set),
    /* How many times a repeat draws what it holds. */
    ("count", &[NodeKind::Repeat], Shape::Count),
    /* `aria-current`: which of a set this is, `page`, `step` or `true`. A
    phone has no such state, and its words come from the words registry. */
    (
        "current",
        &[NodeKind::Box, NodeKind::Pressable, NodeKind::Wrap],
        Shape::Words,
    ),
    ("cx", BOX, Shape::Length),
    ("cy", BOX, Shape::Length),
    ("d", BOX, Shape::Path),
    /* `aria-hidden`: out of what a screen reader reaches, with what it holds.
    A layer that is decorative is a look alone, as a tour's spotlight. */
    (
        "decorative",
        &[
            NodeKind::Box,
            NodeKind::Layer,
            NodeKind::Pressable,
            NodeKind::Region,
            NodeKind::Text,
        ],
        Shape::Flag,
    ),
    /* `aria-describedby`'s words: what a screen reader says after a part's
    name, as a finished step's name is described by its `complete-label`. A
    phone's `accessibilityHint`. */
    /* `aria-describedby` to regions, their names separated by spaces: the
    words passed into them describe the part, as a menu row is described by
    its description and its `end`. A phone's hint. */
    (
        "describedby",
        &[
            NodeKind::Box,
            NodeKind::Field,
            NodeKind::Layer,
            NodeKind::Pressable,
        ],
        Shape::Name,
    ),
    ("description", NAMED, Shape::Words),
    ("disabled", CONTROL, Shape::Flag),
    /* Another element a box draws, by its name without the prefix, as a
    checkbox group draws a checkbox above its boxes. The form holds the
    element's tag. Its props are what the element's machines give it and
    what `gives` names, and `exports` names its parts the element exposes,
    each as the box's name and the part's. A wrap draws it around what it
    holds while its `while` holds, as a copy button draws a tooltip around
    its press. */
    ("draws", DRAWS, Shape::Name),
    /* The events of the element a box or a wrap draws that reach the
    element around as its own, their names separated by spaces, as a
    composed event leaves a shadow root on the web. */
    ("bubbles", DRAWS, Shape::Name),
    /* The list a repeat draws a copy of what it holds for each entry of. */
    ("each", &[NodeKind::Repeat], Shape::List),
    /* The kind of element a box is: the tag the web draws, and what a phone
    announces. */
    ("element", BOX, Shape::Element),
    /* The state a picture with no source stands in: `loading`, as Image
    waits for one, or `error`, as Avatar shows its initials. `loading` where
    it is not written. */
    ("empty", IMAGE, Shape::OneOf(&["error", "loading"])),
    ("expanded", PRESS, Shape::Flag),
    /* The key the on-screen keyboard shows for Enter, the web's
    `enterkeyhint`: React Native's `enterKeyHint`. */
    ("enterkeyhint", FIELD, Shape::Words),
    ("exports", DRAWS, Shape::Parts),
    /* The props a box or a wrap that draws another element gives it, each
    a value or `bind()`, as a copy button gives its tooltip its words. */
    ("gives", DRAWS, Shape::Parts),
    /* The event a picture sends once it fails to load. */
    ("fails", IMAGE, Shape::Name),
    /* The value whose change says live words, after the first render and a
    flag's only as it turns on, as an event that follows a value is sent: a
    meter says its reading as it moves into another band. */
    ("follows", &[NodeKind::Live], Shape::Words),
    /* A disabled press that keeps its tab stop and is announced as disabled,
    so a tooltip can say why: `focusable` with `accessibilityState.disabled`
    on a phone, which refuses the press. */
    ("focusable-when-disabled", PRESS, Shape::Flag),
    /* The glyph a box draws, by the name an icon has on the web: a phone's
    `Glyph` draws it. A prop that holds the name, as an icon's `name`, binds
    it. */
    ("glyph", BOX, Shape::Words),
    /* A box drawn and not shown, or a region that draws nothing while it
    holds, as a switch's `on` region while the switch is off. */
    ("hidden", &[NodeKind::Box, NodeKind::Region], Shape::Flag),
    ("href", &[NodeKind::Pressable, NodeKind::Wrap], Shape::Words),
    /* The keyboard a phone offers, the web's `inputmode`: React Native's
    `inputMode`. */
    ("inputmode", FIELD, Shape::Words),
    /* `inert`: no press, no focus, and nothing a screen reader reaches.
    `pointerEvents: 'none'` and hidden from accessibility on a phone. */
    ("inert", BOX, Shape::Flag),
    /* The region of the element a wrap draws that a node the wrap holds is
    passed into, in place of its default region, as a crumb's fold button is
    the trigger of the menu the crumb draws. */
    (
        "into",
        &[NodeKind::Box, NodeKind::Pressable, NodeKind::Wrap],
        Shape::Name,
    ),
    // The one key that presses it, where Enter and Space do not both: Space
    // alone on a checkbox or a switch, as a native checkbox takes.
    ("keys", PRESS, Shape::OneOf(&["enter", "space"])),
    /* The field of each entry that keys its copy, so a copy keeps what it
    draws as the list changes around it. */
    ("key", &[NodeKind::Repeat], Shape::Name),
    /* A part's name. On words, what a screen reader says in place of them,
    as a key's chord drawn in glyphs is said in words. */
    (
        "label",
        &[
            NodeKind::Box,
            NodeKind::Field,
            NodeKind::Layer,
            NodeKind::Pressable,
            NodeKind::Text,
        ],
        Shape::Words,
    ),
    /* `aria-labelledby` to regions, their names separated by spaces: the
    words passed into them name the part, as a section is named by its
    summary, and the part's own name reads its `label`, as a stepper is
    "Decrease Guests". A phone's label. */
    (
        "labelledby",
        &[
            NodeKind::Box,
            NodeKind::Field,
            NodeKind::Layer,
            NodeKind::Pressable,
        ],
        Shape::Name,
    ),
    ("lazy", &[NodeKind::Region], Shape::Flag),
    /* A heading's `aria-level`, and the `h1` to `h6` its element is. A phone
    announces a header with no level. */
    ("level", BOX, Shape::Count),
    /* How many lines words take before they end in an ellipsis:
    `numberOfLines` on a phone. A box that is a `run` takes it for the words
    it holds. */
    ("lines", &[NodeKind::Box, NodeKind::Text], Shape::Count),
    /* The event a picture sends once it has loaded. */
    ("loads", IMAGE, Shape::Name),
    ("marks", BOX, Shape::OneOf(&["chosen"])),
    /* The most lines a growing field grows to before it scrolls. */
    ("maxrows", FIELD, Shape::Count),
    /* The most characters a field takes: `maxlength` on the web and
    `maxLength` on a phone, which both stop typing at it. */
    ("maxlength", FIELD, Shape::Number),
    /* A field of several lines: a `<textarea>` on the web and a multiline
    `TextInput` on a phone. */
    ("multiline", FIELD, Shape::Set),
    /* A region whose words name the element, as a meter's `label` region:
    words given to the prop of its name are the element's name and are not
    drawn, and only content passed in is. */
    ("names", &[NodeKind::Region], Shape::Set),
    ("orientation", BOX, Shape::Words),
    ("part", &[NodeKind::Region], Shape::Name),
    /* What a wrap's `renders` function is given first, as a row's file, a
    copy's field. */
    ("passes", &[NodeKind::Wrap], Shape::Words),
    /* The length a shape's dashes are measured in, as SVG's `pathLength`. */
    ("pathLength", BOX, Shape::Positive),
    /* The words a field shows while it is empty. */
    ("placeholder", FIELD, Shape::Words),
    /* The press that opens the picker of the element's `files`, as a file
    input's field. */
    ("picks", PRESS, Shape::Set),
    /* `web` for a node only the web draws, and `native` for one only a
    phone draws, as a checkbox's tick, which the web draws as a mask. */
    ("platform", ALL, Shape::OneOf(&["native", "web"])),
    ("popup", PRESS, Shape::Words),
    /* `aria-pressed` on a press that stays pressed, a toggle button:
    `togglebutton` with `accessibilityState.checked` on a phone. */
    ("pressed", PRESS, Shape::Flag),
    ("r", BOX, Shape::Length),
    /* `aria-readonly`: a reader sees and reaches it, and cannot change it. */
    ("readonly", ANSWER, Shape::Flag),
    /* The press that shows and hides the password of the element's field, as
    an input's reveal button. */
    ("reveals", PRESS, Shape::Set),
    /* The press that takes the file of its row out of the element's
    `files`, as a file input's remove button. */
    ("removes", PRESS, Shape::Set),
    /* The prop that holds a function whose content stands in what a wrap
    holds, called with what `passes` names and the copy's place, as a file
    input's `renderFile` draws a row its own way. Where the prop holds no
    function, the wrap draws what it holds. */
    ("renders", &[NodeKind::Wrap], Shape::Function),
    /* `aria-required`. A phone has no such state, and its hint says it. */
    ("required", ANSWER, Shape::Flag),
    ("role", ROLED, Shape::Role),
    /* How many lines tall a field of several lines stands: a `<textarea>`'s
    `rows`, and a phone's `TextInput` that many line heights tall. */
    ("rows", FIELD, Shape::Count),
    /* `aria-roledescription`: what a screen reader calls the part in place
    of its role, as a timeline entry is an "event". A phone has no such
    state, and says it first in the hint. */
    /* A run of words: a phone draws the box as a `Text`, so the words and
    the runs passed into it flow as one paragraph, and a run inside the
    words around it wraps with them, as a `<code>` or a `<q>` does. */
    ("run", BOX, Shape::Set),
    ("says", &[NodeKind::Live, NodeKind::Text], Shape::Words),
    ("scrolls", PRESS, Shape::OneOf(&["end", "start"])),
    ("selected", PRESS, Shape::Flag),
    ("sends", PRESS, Shape::Name),
    /* The press that steps the element's range down or up, and again while
    it is held, as a number input's steppers. */
    ("steps", PRESS, Shape::OneOf(&["down", "up"])),
    /* The shape a box inside a vector draws, at the geometry its own
    attributes give. */
    ("shape", BOX, Shape::OneOf(&["circle", "path"])),
    /* Where a picture loads from, a URL or the prop that holds one. */
    ("src", IMAGE, Shape::Words),
    /* The press that turns the element's toggle the other way. */
    ("toggles", PRESS, Shape::Set),
    /* `translate="no"`: words a page translator leaves as they are, such as
    code. A phone translates nothing. */
    ("translate", BOX, Shape::OneOf(&["no"])),
    /* What a field holds, the web's `type`: `email`, `password`, `search`,
    `tel`, `text`, `url` or `number`. A phone picks its keyboard by it, and
    hides what a password field holds. */
    ("type", FIELD, Shape::Words),
    /* Live words said assertively, ahead of what a screen reader is saying,
    as a toast says a `danger` message: the web's `role="alert"`. */
    ("urgent", &[NodeKind::Live], Shape::Flag),
    /* A range's reading, `aria-valuenow` among `aria-valuemin` and
    `aria-valuemax`, and the words it is read as: `accessibilityValue`. */
    ("valuemax", READS, Shape::Number),
    ("valuemin", READS, Shape::Number),
    ("valuenow", READS, Shape::Number),
    ("valuetext", READS, Shape::Words),
    /* A box that draws a vector: an `<svg>` on the web and
    `react-native-svg` on a phone, holding the shapes inside it. */
    ("viewBox", BOX, Shape::ViewBox),
    ("while", &[NodeKind::Live, NodeKind::Wrap], Shape::Flag),
    /* The words a text may say, each a prop or a value the element
    computes, as a copy button's label says Copy, Copied, or its failure:
    the text is as wide as the widest of them on both platforms, where the
    web stacks them in one cell and a phone measures each. */
    ("widest", &[NodeKind::Text], Shape::Parts),
    /* A repeat a phone draws in a list that windows it: its first child is a
    copy for each row, and what follows stands after the rows, inside what
    scrolls. */
    ("windowed", &[NodeKind::Repeat], Shape::Set),
];

/// Holds one attribute of a node to the table.
///
/// # Errors
///
/// A sentence saying the node does not take the attribute, or what its value
/// may be.
pub fn attribute(kind: NodeKind, node: &str, name: &str, value: &Attribute) -> Result<(), String> {
    /* A `data-` attribute is a flag the web writes on a box's part, which a
    rule's `part` condition reads, as `[data-dot]`, and a phone reads as the
    part's state. */
    if name.len() > "data-".len() && name.starts_with("data-") {
        return match (kind, fits(Shape::Flag, value)) {
            (NodeKind::Box | NodeKind::Pressable, true) => Ok(()),
            (NodeKind::Box | NodeKind::Pressable, false) => Err(format!(
                "`{kind}('{node}')`: `{name}` takes {}",
                describe(Shape::Flag)
            )),
            _ => Err(format!(
                "`{kind}('{node}')`: a {kind} does not take `{name}`"
            )),
        };
    }
    /* A `--` attribute is a custom property the web writes in a box's or a
    layer's style, as a meter writes how much of its bar is filled and a
    tour where its light falls, which a rule's `measured()` reads on that
    part. A phone reads it as the part's measured value. */
    if name.len() > "--".len() && name.starts_with("--") {
        return match (
            kind,
            fits(Shape::Number, value) || fits(Shape::Words, value),
        ) {
            (NodeKind::Box | NodeKind::Layer | NodeKind::Pressable, true) => Ok(()),
            (NodeKind::Box | NodeKind::Layer | NodeKind::Pressable, false) => Err(format!(
                "`{kind}('{node}')`: `{name}` takes a number, a string, `bind()` or `derive()`"
            )),
            _ => Err(format!(
                "`{kind}('{node}')`: a {kind} does not take `{name}`"
            )),
        };
    }
    let Some((_, kinds, shape)) = ATTRIBUTES
        .iter()
        .chain(layer::ATTRIBUTES)
        .find(|(known, ..)| *known == name)
    else {
        return Err(format!("`{kind}('{node}')`: `{name}` is not an attribute"));
    };
    if !kinds.contains(&kind) {
        return Err(format!(
            "`{kind}('{node}')`: a {kind} does not take `{name}`"
        ));
    }
    if fits(*shape, value) {
        Ok(())
    } else {
        Err(format!(
            "`{kind}('{node}')`: `{name}` takes {}",
            describe(*shape)
        ))
    }
}

fn fits(shape: Shape, value: &Attribute) -> bool {
    let bound = matches!(value, Attribute::Bound(Binding::Bind(_)));
    /* A list is read by a repeat's `each` alone. */
    if let Attribute::Derived { derive } = value {
        if is_list(derive) != matches!(shape, Shape::List) {
            return false;
        }
    }
    /* A string a prop's value picks fits where each string it may pick
    does, and a role may pick none, as open content is a region and closed
    content is nothing. */
    if let Attribute::Picked {
        values, otherwise, ..
    } = value
    {
        return values.values().chain([otherwise]).all(|text| {
            (matches!(shape, Shape::Role) && text.is_empty())
                || fits(shape, &Attribute::Text(text.clone()))
        });
    }
    match (shape, value) {
        (Shape::Flag, Attribute::Flag(_) | Attribute::Bound(_))
        | (Shape::Function, Attribute::Bound(Binding::Bind(_)))
        | (Shape::Name | Shape::Words, Attribute::Text(_))
        | (Shape::Words, Attribute::Derived { .. })
        | (Shape::Parts, Attribute::Parts(_))
        | (Shape::Set, Attribute::Flag(true))
        | (Shape::Number | Shape::Length, Attribute::Number(_))
        /* A shape's geometry may bind a prop or a value the element
        computes, as a code's modules are a path it derives. */
        | (
            Shape::Length | Shape::Path,
            Attribute::Bound(Binding::Bind(_)) | Attribute::Derived { .. },
        )
        | (Shape::List, Attribute::Derived { .. })
        /* A copy's field may stand for any value but a list, and its place
        for a number or words. */
        | (
            Shape::Count | Shape::Flag | Shape::Length | Shape::Number | Shape::Path | Shape::Words,
            Attribute::Field { .. },
        )
        | (
            Shape::Count | Shape::Length | Shape::Number | Shape::Words,
            Attribute::Index { .. },
        ) => true,
        (Shape::Count, Attribute::Number(number)) => number.fract() == 0.0 && *number >= 1.0,
        (Shape::Element, Attribute::Text(name)) => kinds::is_element(name),
        (Shape::Role, Attribute::Text(name)) => kinds::is_role(name),
        /* A role a value the element computes gives is bound too, as a
        skeleton is a progress bar only while it has a name. */
        (
            Shape::Count | Shape::Element | Shape::List | Shape::Number | Shape::Role | Shape::Words,
            _,
        ) => bound,
        (Shape::Length, Attribute::Text(text)) => length(text),
        (Shape::OneOf(values), Attribute::Text(value)) => values.contains(&value.as_str()),
        (Shape::Path, Attribute::Text(path)) => path_data(path),
        (Shape::Positive, Attribute::Number(number)) => *number > 0.0,
        (Shape::ViewBox, Attribute::Text(text)) => view_box(text),
        _ => false,
    }
}
