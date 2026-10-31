//! The roles a node may take and the kinds of element a box may be, each
//! with what the web writes and what a phone announces.
//!
//! **Defined here and nowhere else.** `helix system types` writes both
//! tables into the types the native runtime imports, so a role a source may
//! name and the meaning a phone gives it cannot drift apart.

/// What a phone's screen reader is told a node is.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Announced {
    /// React Native's `accessibilityRole` of this name, which iOS and
    /// Android both announce.
    Trait(&'static str),
    /// React Native's `role` of this ARIA name, which each platform maps to
    /// what it has, and announces nothing for where it has none.
    Role(&'static str),
    /// Nothing: the node's label and state carry it, as a tab panel's do.
    Nothing,
}

/// A role a node may take: its ARIA name, which the web writes as `role`,
/// and what a phone announces for it.
#[derive(Clone, Copy, Debug)]
pub struct Role {
    pub name: &'static str,
    pub native: Announced,
}

const fn role(name: &'static str, native: Announced) -> Role {
    Role { name, native }
}

/// The roles a node may take, by name.
///
/// **A meter is announced as a progress bar on a phone**, which has no
/// meter, and its reading carries the rest. **A slider is adjustable**, as
/// iOS names a value a reader swipes up and down. **A heading is a header**, as
/// iOS and Android name one, with no level. **A menu item that is checked
/// or one of a run is a menu item**, and its checked state says the rest.
pub const ROLES: &[Role] = &[
    role("alert", Announced::Trait("alert")),
    /* A dialog that interrupts to ask for an answer, which a screen reader
    announces with its description as it opens. */
    role("alertdialog", Announced::Role("alertdialog")),
    /* The page's header, a landmark of its own. iOS has no trait for one and
    TalkBack announces none, so a phone reads what it holds in order. */
    role("banner", Announced::Role("banner")),
    role("button", Announced::Trait("button")),
    role("checkbox", Announced::Trait("checkbox")),
    role("definition", Announced::Role("definition")),
    /* A window over the page, as a dialog's or a popover's panel. */
    role("dialog", Announced::Role("dialog")),
    role("figure", Announced::Role("figure")),
    role("group", Announced::Role("group")),
    role("heading", Announced::Trait("header")),
    role("img", Announced::Trait("image")),
    role("link", Announced::Trait("link")),
    role("list", Announced::Trait("list")),
    role("listitem", Announced::Role("listitem")),
    role("menu", Announced::Trait("menu")),
    role("menuitem", Announced::Trait("menuitem")),
    /* A menu item that is checked or not. A phone has no role of its own
    for one: it is a menu item, and its checked state says the rest. */
    role("menuitemcheckbox", Announced::Trait("menuitem")),
    /* A menu item that is one of a run, of which one is checked. */
    role("menuitemradio", Announced::Trait("menuitem")),
    role("meter", Announced::Trait("progressbar")),
    role("navigation", Announced::Role("navigation")),
    /* An aside to the content around it, as a callout is. */
    role("note", Announced::Role("note")),
    /* Drawn and not a thing of its own, as the second half of a divider's
    line is: a phone announces nothing for it. */
    role("presentation", Announced::Nothing),
    role("progressbar", Announced::Trait("progressbar")),
    role("radio", Announced::Trait("radio")),
    /* A hierarchy and one of its items. iOS and Android have no trait for
    either, so a row's level and its place are said in its value. */
    /* A table and what it holds. iOS and Android have no trait for any of
    them, so a cell says its column's heading with its words. */
    role("cell", Announced::Role("cell")),
    role("columnheader", Announced::Role("columnheader")),
    role("grid", Announced::Role("grid")),
    role("gridcell", Announced::Role("gridcell")),
    role("row", Announced::Role("row")),
    role("rowheader", Announced::Role("rowheader")),
    role("table", Announced::Role("table")),
    role("treegrid", Announced::Role("treegrid")),
    role("tree", Announced::Role("tree")),
    role("treeitem", Announced::Role("treeitem")),
    role("radiogroup", Announced::Trait("radiogroup")),
    /* A landmark of its own, named by its label, as an open accordion
    section is. */
    role("region", Announced::Role("region")),
    role("separator", Announced::Role("separator")),
    /* A value chosen along a track. iOS adjusts it with a swipe up or down,
    and both platforms move it by the increment and decrement actions. */
    role("slider", Announced::Trait("adjustable")),
    /* A value stepped up and down, as a number input's. */
    role("spinbutton", Announced::Trait("spinbutton")),
    role("status", Announced::Role("status")),
    role("switch", Announced::Trait("switch")),
    role("tab", Announced::Trait("tab")),
    role("tablist", Announced::Trait("tablist")),
    role("tabpanel", Announced::Nothing),
    role("term", Announced::Role("term")),
    role("toolbar", Announced::Trait("toolbar")),
    /* Words that describe the part a tooltip is placed against. */
    role("tooltip", Announced::Role("tooltip")),
    /* Output that arrives as it is written, one entry of a feed, and a feed. iOS
    and Android have no trait for any of them, so a phone reads what they hold
    in order. */
    role("article", Announced::Nothing),
    role("feed", Announced::Nothing),
    role("log", Announced::Nothing),
];

/// The roles whose node reads as a range, `valuenow` among `valuemin` and
/// `valuemax`.
pub const RANGES: &[&str] = &["meter", "progressbar", "separator", "slider", "spinbutton"];

/// The roles of a range a reader moves, which may be disabled or read-only
/// as a press or a field may: a box with one is the control.
pub const ADJUSTABLE: &[&str] = &["slider", "spinbutton"];

/// The role of a row of steps a reader picks a score from, as a rating's:
/// a box with it is the control of the element's `range`, where it declares
/// one, and may be disabled or read-only as a slider may.
pub const SCALE: &str = "radiogroup";

/// The role of the divider of a split a reader moves between two panes, as
/// a splitter's: a box with it is the control of the element's `range`,
/// where it declares one, and its value is where the divider stands.
pub const SPLIT: &str = "separator";

/// The roles a press that is checked takes.
pub const CHECKABLE: &[&str] = &[
    "checkbox",
    "menuitemcheckbox",
    "menuitemradio",
    "radio",
    "switch",
];

/// A kind of element a box may be: its name in a source, the tag the web
/// draws it as, the role it has without one written, and what a phone
/// announces for it.
#[derive(Clone, Copy, Debug)]
pub struct Element {
    pub name: &'static str,
    pub tag: &'static str,
    pub native: Announced,
}

const fn element(name: &'static str, tag: &'static str, native: Announced) -> Element {
    Element { name, tag, native }
}

/// The kinds of element a box may be. Each draws as a `View` on a phone,
/// announced as its row says. A box with no kind is a `<div>` or a `<span>`.
///
/// **A heading's tag is `h` and its `level`**, `h1` to `h6`. **A key is
/// announced as a keyboard key**, which React Native has a trait for and
/// ARIA does not.
pub const ELEMENTS: &[Element] = &[
    element("caption", "figcaption", Announced::Nothing),
    element("citation", "cite", Announced::Nothing),
    element("code", "code", Announced::Nothing),
    element("definition", "dd", Announced::Role("definition")),
    element("description-list", "dl", Announced::Nothing),
    element("figure", "figure", Announced::Role("figure")),
    element("heading", "h", Announced::Trait("header")),
    element("key", "kbd", Announced::Trait("keyboardkey")),
    element("list", "ul", Announced::Trait("list")),
    element("list-item", "li", Announced::Role("listitem")),
    element("ordered-list", "ol", Announced::Trait("list")),
    element("paragraph", "p", Announced::Nothing),
    element("passage", "blockquote", Announced::Nothing),
    element("quotation", "q", Announced::Nothing),
    element("separator", "hr", Announced::Role("separator")),
    element("term", "dt", Announced::Role("term")),
];

/// The shapes a box inside a vector may draw, and the geometry each takes.
pub const SHAPES: &[(&str, &[&str])] = &[("circle", &["cx", "cy", "r"]), ("path", &["d"])];

/// Every geometry attribute some shape takes.
pub const GEOMETRY: &[&str] = &["cx", "cy", "d", "r"];

/// Whether `name` names a role.
pub fn is_role(name: &str) -> bool {
    ROLES.iter().any(|role| role.name == name)
}

/// Whether `name` names a kind of element.
pub fn is_element(name: &str) -> bool {
    ELEMENTS.iter().any(|element| element.name == name)
}
