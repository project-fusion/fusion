//! The intermediate form: an element's API, part tree and style table, as
//! every output reads them.
//!
//! **Defined here, and only here.** The web stylesheet, the native runtime and
//! any emitter a consumer writes all read this shape, so it is the contract,
//! and its JSON is what `helix system build` writes.
//!
//! **Each rule carries the specificity of the selector the web output writes
//! for it.** A browser orders matching rules by specificity and then by source
//! order, and the native runtime sorts them the same way. The web output
//! starts every rule at the host and writes every condition inside
//! `:where()`, so a rule's specificity is one `:host` and its target's: every
//! rule on one part ranks the same, and the later one wins, whatever it asks. Button's generic hover and an emphasis rule both
//! rank as the button part does, so the emphasis written after the hover
//! wins, which is why every emphasis declares its own hover after it.
//!
//! **Versioned as `major.minor`.** A reader refuses a major it does not know.
//! A minor adds only what an older reader may ignore, such as an optional
//! field; anything else, a renamed field, a field that holds another kind of
//! value, or a new kind of node a reader must draw, is a major.
//!
//! **2.0 is the first such change.** A box's `draws` and a total's `of`
//! held an element's name without the prefix, and hold its tag: a reader of
//! 1.x that found an element by its name finds none.
//!
//! **A rule with several `when`s is several rules.** A selector list means
//! each of its selectors, so the reader writes one rule per alternative and
//! the web output writes them one after another.

use std::fmt;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

pub mod checks;
mod conditions;
mod fragments;
pub mod machines;
mod scope;
mod specificity;
pub mod sugar;
mod table;
mod tagged;
mod values;

use crate::family::api::{Api, Headless, Node, Prop};
use crate::family::project::Names;
#[cfg(test)]
use crate::family::read::Lit;

pub use conditions::{Condition, Direction, Place};
pub use fragments::{alone as fragment_alone, expand, FRAGMENTS};
pub use scope::{scope, Scope};
pub use table::styled;
pub use values::{is_list, quoted, DERIVATIONS, LIST_DERIVATIONS};

/// The version of the intermediate form this compiler writes.
pub const VERSION: &str = "2.0";

/// One element: what it takes and sends, its parts, and its style table.
#[derive(Debug, Serialize, JsonSchema, TS)]
pub struct Family {
    /// What it takes, sends, and sets. Absent on an element with no headless
    /// source.
    #[serde(skip_serializing_if = "Api::is_empty")]
    #[ts(optional, as = "Option<Api>")]
    #[schemars(default)]
    pub api: Api,
    /// The machines it runs, expanded from the behavior its source declares,
    /// with what each binds to.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<machines::MachineUse>>")]
    #[schemars(default)]
    pub machines: Vec<machines::MachineUse>,
    /// The prefix of the element's hooks, `--<name>-...`.
    pub name: String,
    /// The names the design system gives its tags, events, and tokens.
    #[serde(skip)]
    #[ts(skip)]
    #[schemars(skip)]
    pub names: Names,
    pub rules: Vec<Item>,
    /// The stylesheet's path under the styled package's `src`.
    #[serde(skip)]
    pub stylesheet: String,
    /// The web element's tag.
    pub tag: String,
    /// Its parts, in render order. Absent on an element with no headless
    /// source.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<Node>>")]
    #[schemars(default)]
    pub tree: Vec<Node>,
    /// [`VERSION`], `major.minor`; a reader holds to the majors it knows.
    #[ts(type = "string")]
    pub version: &'static str,
}

/// A styled source, read.
#[derive(Debug)]
pub struct Styled {
    pub name: String,
    pub props: Vec<Prop>,
    pub rules: Vec<Item>,
    pub stylesheet: String,
}

impl Family {
    /// One element from its styled source and, where it has one, its headless
    /// source, which names the tag.
    #[cfg(test)]
    #[must_use]
    pub fn new(styled: Styled, headless: Option<Headless>, family: &str, element: &str) -> Self {
        Self::named(
            styled,
            headless,
            family,
            element,
            crate::family::project::testing(),
        )
    }

    /// One element from its styled source and, where it has one, its headless
    /// source, which names the tag under the design system's prefix.
    #[must_use]
    pub fn named(
        styled: Styled,
        headless: Option<Headless>,
        family: &str,
        element: &str,
        names: Names,
    ) -> Self {
        let tag = names.tag(headless.as_ref().map_or_else(
            || if element == "root" { family } else { element },
            |headless| headless.name.as_str(),
        ));
        let (mut api, mut tree) = headless.map_or_else(
            || (Api::default(), Vec::new()),
            |headless| (headless.api, headless.tree),
        );
        api.props.extend(styled.props);
        let machines = machines::expand(&api, &tree);
        tagged::tag(&mut api, &mut tree, &names);
        Self {
            api,
            machines,
            name: styled.name,
            names,
            rules: styled.rules,
            stylesheet: styled.stylesheet,
            tag,
            tree,
            version: VERSION,
        }
    }
}

/// A rule or an animation, in cascade order.
#[derive(Clone, Debug, Serialize, JsonSchema, TS)]
#[serde(rename_all = "kebab-case", tag = "kind")]
#[schemars(rename = "Entry")]
#[ts(rename = "Entry")]
pub enum Item {
    Keyframes(Keyframes),
    Rule(Box<Rule>),
}

/// A named animation.
#[derive(Clone, Debug, Serialize, JsonSchema, TS)]
pub struct Keyframes {
    pub frames: Vec<(String, Vec<Declaration>)>,
    pub name: String,
}

/// A property and its value.
pub type Declaration = (String, Value);

/// One rule.
#[derive(Clone, Debug, Serialize, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(optional_fields)]
pub struct Rule {
    /// Where the source writes the rule, `line 12` or `fragments/field.ts
    /// line 12`, for a message. Not written: a table in the older shape has
    /// none.
    #[serde(skip)]
    #[ts(skip)]
    #[schemars(skip)]
    pub at: Option<String>,
    /// The `on()` group the source writes the rule in, which the checks read.
    /// Not written.
    #[serde(skip)]
    #[ts(skip)]
    #[schemars(skip)]
    pub group: Option<String>,
    /// Whether the rule is on the part alone, `[part="name"]` on the web,
    /// and not on a node that is another part as well, as a skeleton's
    /// single shape is its `skeleton` and each line of its paragraph is
    /// `skeleton line`. Absent when false.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub exact: bool,
    /// CSS written after the target's selector. Web only.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inner: Option<String>,
    /// Where the rule is written, which breaks a specificity tie.
    #[ts(type = "number")]
    pub order: usize,
    /// The region the rule is on, by its slot's name: `default` for the one
    /// with no name, `*` for every one. `slot[name="..."]` on the web, and on
    /// a native view the style the region's content inherits, with
    /// `slotted` the style of each child passed in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,
    /// A selector written out. Web only.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selector: Option<String>,
    pub set: Vec<Declaration>,
    /// The tag of the children the host styles, `::slotted(<tag>)` on the web.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slotted: Option<String>,
    /// `[ids, classes, types]` of the selector the web output writes.
    pub specificity: [u32; 3],
    /// A feature query around the rule. Web only.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supports: Option<String>,
    /// `host`, or a part's name.
    pub target: String,
    /// Private values the element's rules read, named in full after `--_`.
    pub values: Vec<Declaration>,
    /// Whether the native output leaves the whole rule out.
    pub web_only: bool,
    /// Whether the web output leaves the whole rule out, for a turn the web
    /// already makes another way. Absent when false.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub native_only: bool,
    pub when: Vec<Condition>,
}

/// An arithmetic operator.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
pub enum Op {
    #[serde(rename = "+")]
    Add,
    #[serde(rename = "/")]
    Divide,
    #[serde(rename = "*")]
    Multiply,
    #[serde(rename = "-")]
    Subtract,
}

impl fmt::Display for Direction {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Ltr => "ltr",
            Self::Rtl => "rtl",
        })
    }
}

impl fmt::Display for Op {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Add => "+",
            Self::Divide => "/",
            Self::Multiply => "*",
            Self::Subtract => "-",
        })
    }
}

/// A CSS-wide keyword. **A native view leaves the property unset for each**,
/// so text takes it from the text around it and a box takes the view's own
/// default, which is what each keyword comes to there.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "lowercase")]
pub enum Keyword {
    /// The value the element around has.
    Inherit,
    /// The property's initial value.
    Initial,
    /// `inherit` for a property that inherits, and `initial` for any other.
    Unset,
}

impl Keyword {
    /// The keyword as CSS writes it, and as a source's helper is named.
    pub const fn css(self) -> &'static str {
        match self {
            Self::Inherit => "inherit",
            Self::Initial => "initial",
            Self::Unset => "unset",
        }
    }
}

/// The quotation mark generated content draws, or the quotation it opens or
/// closes without one.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "kebab-case")]
pub enum QuoteMark {
    Close,
    NoClose,
    NoOpen,
    Open,
}

/// A color space a mix is made in other than `OKLab`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(rename_all = "kebab-case")]
pub enum MixSpace {
    /// The gamma-encoded channels, as `color-mix(in srgb, …)` mixes them.
    Srgb,
}

/// A declaration's value.
#[derive(Clone, Debug, Serialize, JsonSchema, TS)]
#[serde(rename_all = "kebab-case")]
pub enum Value {
    /// Arithmetic: `+`, `-`, `*` or `/` between its operands, `calc()` on the
    /// web. A divisor is a number.
    Calc {
        op: Op,
        operands: Vec<Value>,
    },
    /// A private value the element computes from its props, named in full
    /// after `--_`, and the function in core's derivations that computes it.
    Derived {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        fallback: Option<Box<Value>>,
        function: String,
        name: String,
    },
    /// A one-row grid's share of its content, `0` or `1`: `0fr` or `1fr` on the web.
    Fit(f64),
    /// A function the web has and a native view may not, such as `linear-gradient`.
    Function {
        arguments: Vec<Value>,
        name: String,
    },
    /// A public hook, `--<prefix>-<name>`: the element's own, or with `of`
    /// another family's, which the element around sets on this one.
    Hook {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        fallback: Option<Box<Value>>,
        name: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        of: Option<String>,
    },
    /// Joined with commas.
    List(Vec<Value>),
    /// A custom property the element around sets, such as a list's rail
    /// width on its rows, named in full.
    Inherited {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        fallback: Option<Box<Value>>,
        name: String,
    },
    /// The whole of a value or of a fallback.
    Keyword(Keyword),
    /// A length a script measures and sets, such as where a tab sits.
    Measured {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        fallback: Option<Box<Value>>,
        name: String,
    },
    /// `percent` of `first`, mixed with `second` in `OKLab`, or in `space`
    /// where it names another, as a tag's fill is mixed in sRGB.
    Mix {
        first: Box<Value>,
        percent: f64,
        second: Box<Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        space: Option<MixSpace>,
    },
    Number(f64),
    /// A private value, named in full after `--_`.
    Own {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        fallback: Option<Box<Value>>,
        name: String,
    },
    /// A quotation mark in generated content, and what a screen reader says
    /// for it. A native view draws the locale's mark.
    Quote {
        #[serde(skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        alt: Option<Box<Value>>,
        mark: QuoteMark,
    },
    /// One value in the light color scheme and another in the dark,
    /// `light-dark()` on the web.
    Scheme {
        dark: Box<Value>,
        light: Box<Value>,
    },
    /// Joined with spaces.
    Space(Vec<Value>),
    Text(String),
    Token(String),
    /// Written by the web output only.
    Web(Box<Value>),
}

impl Rule {
    /// Whether anything in the rule needs the web's own selectors to say.
    pub fn web_selector(&self) -> bool {
        self.inner.is_some() || self.selector.is_some() || self.supports.is_some()
    }
}

/// An element from a styled source alone, for the specs below and in `css`.
#[cfg(test)]
pub fn family(export: &Lit) -> Result<Family, String> {
    Ok(Family::new(styled(export)?, None, "b", "root"))
}
