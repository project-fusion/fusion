//! The intent inputs and the shapes they resolve to, ported from `src/intent.ts`.
//!
//! Split out of the derivation when the schema stopped being five scalars: the
//! derivation is one function and the vocabulary it takes is a language, and a
//! reader arriving to find out what they may write should not have to read a
//! solver to find out.
//!
//! **The reasoning stays in one place while there are two files.** `intent.ts`
//! carries two hundred lines of it, a paragraph per field saying what was
//! measured and what was refused, and copying that here would make two
//! statements of one argument that drift the first time either is edited, which
//! is the failure this whole port exists to avoid. So each field below carries
//! the contract, the shape and the default; the argument for it stays in the
//! TypeScript and moves here when that file goes. Where a field's *meaning* is
//! not recoverable from its type, that much is written out.
//!
//! Almost all of this is declaration. The runtime is two constant tables and one
//! conversion, and those are what the oracle asserts.

use crate::oklch::{hex_to_oklch, Oklch};

/// A colour a consumer supplies. Hex is accepted and converted at the edge.
#[derive(Clone, Debug, PartialEq)]
pub enum Color {
    Hex(String),
    Oklch(Oklch),
}

/// How a role departs from the role it derives from.
///
/// Written as a relationship rather than a second colour because a literal
/// drifts out of relation the moment anybody rethemes, which is the failure of
/// every palette with two hardcoded colours in it.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Relation {
    /// How far, in degrees, the angle may move to clear a role it cannot be told
    /// apart from. 45 by default, and 0 holds the angle exactly. The accent is
    /// the role that yields, having no meaning to lose where a status hue does.
    pub allowance: Option<f64>,
    /// Multiplier on the source's chroma, capped at 1: an accent louder than the
    /// thing it accents is a second primary.
    pub chroma: Option<f64>,
    /// The role this one departs from. Only `brand` today, and the field exists
    /// so a third role can relate to the second without a new mechanism.
    pub from: From,
    /// Degrees around the hue circle. 180 is the complement, 30 analogous, 120 a
    /// triad.
    pub rotate: f64,
}

/// The roles a [`Relation`] may depart from. One today, deliberately named.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum From {
    Brand,
}

/// A role takes a colour, or says how it relates to one.
#[derive(Clone, Debug, PartialEq)]
pub enum Seed {
    Color(Color),
    Relation(Relation),
}

/// A status role. A colour pins it outright; a hue nudges it within the meaning
/// it already carries.
///
/// **Never a [`Relation`]**, which is the asymmetry with `accent` and is
/// deliberate: a `danger` that rotates with the brand is a warning a reader has
/// to re-learn per product.
#[derive(Clone, Debug, PartialEq)]
pub enum StatusSeed {
    Color(Color),
    Hue(Option<f64>),
}

/// One pair to measure, by token name, without the namespace prefix.
#[derive(Clone, Debug, PartialEq)]
pub struct PairingRequest {
    pub background: String,
    pub foreground: String,
    /// The ratio this pair has to reach. Carried per pair rather than taken from
    /// the theme, because a focus ring answers to WCAG 1.4.11 at 3:1 while body
    /// text answers to the contrast target, and one number cannot be both.
    pub target: f64,
}

/// How saturated the palette is, independent of which hue it is. Never applied
/// to a value the consumer pinned, a pinned colour being a fact.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Chroma {
    pub ceiling: Option<f64>,
    pub scale: Option<f64>,
}

/// Translucency and blur. **The one material choice that can invalidate the
/// guarantee**: a translucent surface has no known ground, so a pair over it
/// comes back unverifiable rather than measured.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Material {
    pub blur: Option<f64>,
    pub opacity: Option<f64>,
}

/// How heavy the three weights run. A character rather than three numbers,
/// because the three move together or the relationships stop meaning anything.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Weight {
    Light,
    Regular,
    Strong,
}

/// The faces the theme is set in. Families are the half a consumer chooses; the
/// size scale, the weights and the spacing are the half that is a system.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Font {
    /// Body size in pixels, 14 being what ships. The whole ramp is built from it.
    pub base: Option<f64>,
    pub body: Option<String>,
    /// Falls back to `body`, which is what the stylesheet already does.
    pub display: Option<String>,
    pub mono: Option<String>,
    /// The ratio between the display steps, and it applies above the body size
    /// and not below it: the steps under body are a UI ramp and the steps above
    /// are a display ramp, and one ratio across both crushes one end.
    pub scale: Option<f64>,
    pub weight: Option<Weight>,
}

/// How the theme's motion feels.
///
/// `Instant` is not scaled. It is 0 and means "do not animate", which is a
/// statement rather than a duration, and it emits no curves at all. `Precise` is
/// the one character that is not physical: the other three accelerate, settle or
/// overshoot, where linear reads as moved by a mechanism.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Character {
    Gentle,
    Instant,
    Precise,
    Snappy,
    Springy,
}

/// The curve every component reaches for by default, and a multiplier on top for
/// a theme that wants the character and not the pace.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Motion {
    pub character: Option<Character>,
    pub scale: Option<f64>,
}

/// The cast every grey carries. Chroma 0 is a dead grey and is the default,
/// matching `primitives.css`: a fixed chroma is a rising *saturation* as a
/// surface darkens, so a trace that looks right on a light page reads navy
/// across a dark one.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Neutral {
    pub chroma: Option<f64>,
    pub hue: Option<f64>,
}

/// What tells a surface from what is behind it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mechanism {
    Border,
    Fill,
    Shadow,
    Space,
}

/// The two policies for how a surface separates.
///
/// `Space` is offered for a surface in the flow and refused for a floating one.
/// A floating panel with neither edge nor lift nor fill is unreadable over
/// content nobody can predict, and it is the one failure the engine cannot
/// detect, the ground being unbounded. Hence two fields and two types rather
/// than one with a comment asking nicely.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Separation {
    pub floating: Option<Floating>,
    pub surface: Option<Mechanism>,
}

/// The mechanisms a floating surface may use. No `Space`, per [`Separation`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Floating {
    Border,
    Fill,
    Shadow,
}

/// Light or dark surface.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Scheme {
    Dark,
    #[default]
    Light,
}

/// Status roles. **Hue is fixed by meaning and everything else derives.**
///
/// `allowance` is how far a status may rotate to clear a collision, 20 by
/// default rather than 0: a palette that ships reporting a collision it has the
/// means to fix is a palette nobody trusts the report of. `harmony` is how far
/// the statuses follow the palette's own loudness, hue being meaning and
/// loudness not.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Status {
    pub allowance: Option<f64>,
    pub danger: Option<StatusSeed>,
    pub harmony: Option<f64>,
    pub info: Option<StatusSeed>,
    pub success: Option<StatusSeed>,
    pub warning: Option<StatusSeed>,
}

/// Everything a consumer may say about a theme.
#[derive(Clone, Debug, PartialEq)]
pub struct ThemeIntent {
    /// The second emphasis. Defaults to the complement of the brand.
    pub accent: Option<Seed>,
    /// The one colour most consumers care about, and the only required input.
    pub brand: Color,
    pub chroma: Option<Chroma>,
    /// 4.5 is WCAG AA and the default, being the figure with legal weight; 7 is
    /// AAA.
    pub contrast_target: Option<f64>,
    /// Scales spacing and control heights. 1 is default, 0.875 is compact.
    pub density: Option<f64>,
    pub font: Option<Font>,
    pub material: Option<Material>,
    pub motion: Option<Motion>,
    /// The token prefix, without dashes. `helix` by default. With this and
    /// `pairings`, a team on their own tokens gets the solver and the
    /// verification without adopting the components.
    pub namespace: Option<String>,
    pub neutral: Option<Neutral>,
    /// Which pairs to measure. Anything not emitted comes back unverifiable
    /// rather than being dropped.
    pub pairings: Option<Vec<PairingRequest>>,
    /// Base corner radius in rem.
    pub radius: Option<f64>,
    pub scheme: Option<Scheme>,
    pub separation: Option<Separation>,
    pub status: Option<Status>,
    /// Values that replace what derivation would have produced. Verified like
    /// anything else: a pinned value that misses its target is a violation, not
    /// an exception.
    pub tokens: Option<Vec<(String, Color)>>,
}

impl ThemeIntent {
    /// A theme is a brand and whatever else the consumer chose to say.
    #[must_use]
    pub fn new(brand: Color) -> Self {
        Self {
            accent: None,
            brand,
            chroma: None,
            contrast_target: None,
            density: None,
            font: None,
            material: None,
            motion: None,
            namespace: None,
            neutral: None,
            pairings: None,
            radius: None,
            scheme: None,
            separation: None,
            status: None,
            tokens: None,
        }
    }
}

impl Status {
    /// The seed for one status by name, in the order [`STATUS_NAMES`] gives.
    ///
    /// By name because the derivation walks the four in declaration order and
    /// that order is load bearing: a status rotated clear of the brand must not
    /// land on one already decided, so the set it clears against accumulates as
    /// the loop runs.
    #[must_use]
    pub fn seed(&self, name: &str) -> Option<&StatusSeed> {
        match name {
            "danger" => self.danger.as_ref(),
            "info" => self.info.as_ref(),
            "success" => self.success.as_ref(),
            "warning" => self.warning.as_ref(),
            _ => None,
        }
    }
}

/// The four statuses, in the order the TypeScript declares them.
pub const STATUS_NAMES: [&str; 4] = ["danger", "info", "success", "warning"];

/// The hue each status carries, in degrees, taken from what already ships.
/// Indexed by [`STATUS_NAMES`].
pub const STATUS_HUE: [f64; 4] = [27.0, 245.0, 155.0, 75.0];

/// The chroma each status carries, taken from the same shipped primitives.
///
/// **Per status, because sRGB is not chroma-uniform.** These are not four ways
/// of saying "saturated": each hue holds a different maximum at the lightness a
/// status sits at, which is the same fact `tokens.css` records for the series
/// ramp, where one number for eight hues had three of them silently clipped.
///
/// They exist at all because the engine was taking the *brand's* chroma for
/// every status. A brand at 0.035 gave a danger at 0.035, a near-grey error; a
/// magenta brand at 0.257 asked amber for a chroma its hue cannot hold and got
/// 0.115 back after clipping, a muddy beige. A status's saturation is part of
/// what it means and is not the brand's to set.
pub const STATUS_CHROMA: [f64; 4] = [0.21, 0.16, 0.15, 0.185];

/// The hue and chroma a status carries, by name.
#[must_use]
pub fn status_seed(name: &str) -> Option<(f64, f64)> {
    let at = STATUS_NAMES.iter().position(|status| *status == name)?;
    Some((STATUS_HUE[at], STATUS_CHROMA[at]))
}

/// Accepts a hex string or an OKLCH triple and always returns the triple.
///
/// `None` where the TypeScript returned a triple of `NaN`, for the reason
/// [`hex_to_oklch`] gives: a port is the moment to stop carrying that quietly
/// into a palette.
#[must_use]
pub fn to_oklch(color: &Color) -> Option<Oklch> {
    match color {
        Color::Hex(hex) => hex_to_oklch(hex),
        Color::Oklch(oklch) => Some(*oklch),
    }
}

/// True when a seed says how it relates rather than what it is.
#[must_use]
pub fn is_relation(seed: &Seed) -> bool {
    matches!(seed, Seed::Relation(_))
}
