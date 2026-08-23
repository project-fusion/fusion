//! The derivation, ported from `src/derive.ts` and taken apart on the way.
//!
//! **The TypeScript is one 615-line function and this is not, which is the
//! whole reason to port it into modules rather than a file.** The phases were
//! always there: the chroma policy, the surface ladder, the solvers, the
//! emphasis roles, the statuses and their repair, the fills, the audit. They
//! were closures inside one scope, so what separated them was a blank line and a
//! comment, and what they captured was whatever happened to be in scope.
//!
//! Splitting them makes the capture explicit, which is the part worth having: a
//! phase that takes what it needs as arguments can be read, moved and tested on
//! its own, where a closure over sixteen bindings can only be read in place.
//! `solve_against` turns out to be pure and `emphasis` turns out to need six
//! things, and neither of those was visible before.
//!
//! **The TypeScript is not being reorganised to match.** It is scheduled for
//! deletion by this port, so restructuring it would churn the import surface of
//! 82 specs to improve a file that is going, and the modularity has to live in
//! the crate either way.
//!
//! Each phase is asserted against the oracle by the tokens it produces. That
//! works because the artifact is 37 uniquely named tokens rather than one
//! opaque blob: a disagreement names itself, so `color-primary` differing points
//! at the emphasis phase without anybody bisecting a search by hand.
//!
//! What is here so far is what every phase needs: the token shape, the origin a
//! reader tells a decision from a computation by, and the two things the audit
//! turns on. The phases follow.

use crate::oklch::{fit_to_gamut, oklch_to_hex, shipped_contrast_ratio, Oklch};

/// Where a value came from. It is what lets a reader of the emitted file tell a
/// decision from a computation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Origin {
    Derived,
    Pinned,
    Related,
}

impl Origin {
    /// The word the TypeScript writes, which is what the oracle compares.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Derived => "derived",
            Self::Pinned => "pinned",
            Self::Related => "related",
        }
    }
}

/// One emitted token.
#[derive(Clone, Debug, PartialEq)]
pub struct DerivedToken {
    /// True when chroma had to be reduced to bring the colour into the sRGB
    /// gamut. Informational, not a failure: `value` is always in gamut.
    pub chroma_reduced: bool,
    /// Measured contrast against the pairing surface, where one is meaningful.
    pub contrast: Option<f64>,
    pub hex: String,
    pub name: String,
    pub origin: Origin,
    /// Always inside the sRGB gamut.
    pub value: Oklch,
}

/// Perceptual distance below which two roles are not reliably distinguishable.
///
/// `tokens.css` measured the muted series at 0.064 in `OKLab` and recorded that as
/// below what anybody tells apart, so the threshold sits just above it.
pub const COLLISION_DISTANCE: f64 = 0.08;

/// Euclidean distance in `OKLab`, which is what OKLCH exists to make meaningful.
#[must_use]
pub fn perceptual_distance(a: Oklch, b: Oklch) -> f64 {
    let to_lab = |color: Oklch| {
        let rad = color.hue * std::f64::consts::PI / 180.0;
        [
            color.lightness,
            color.chroma * rad.cos(),
            color.chroma * rad.sin(),
        ]
    };
    let [l1, a1, b1] = to_lab(a);
    let [l2, a2, b2] = to_lab(b);
    hypot3(l1 - l2, a1 - a2, b1 - b2)
}

/// `Math.hypot` of three arguments, which is not the square root of the sum of
/// the squares.
///
/// **Measured before being written, because the obvious port is wrong.** V8
/// scales by the largest magnitude and sums with Kahan compensation rather than
/// squaring directly, and over 200,000 samples at the magnitudes this function
/// sees, a naive `sqrt(x*x + y*y + z*z)` differed from `Math.hypot` on **75,215
/// of them**, by up to 2.22e-16.
///
/// One ulp does not matter in a value being reported. It matters here: this
/// feeds `distance >= COLLISION_DISTANCE`, and that comparison decides which hue
/// a status takes when it rotates clear of the brand. A flipped branch is not a
/// last-place difference in the output, it is a different palette.
///
/// `a.hypot(b).hypot(c)` is not it either, rounding twice where this rounds once.
fn hypot3(x: f64, y: f64, z: f64) -> f64 {
    let max = x.abs().max(y.abs()).max(z.abs());
    if max == 0.0 {
        return 0.0;
    }
    let mut sum = 0.0_f64;
    let mut compensation = 0.0_f64;
    for value in [x, y, z] {
        let ratio = value / max;
        let summand = ratio * ratio - compensation;
        let preliminary = sum + summand;
        compensation = (preliminary - sum) - summand;
        sum = preliminary;
    }
    max * sum.sqrt()
}

/// Builds a token, fitting the colour into the sRGB gamut first so that both the
/// emitted hex and the recorded contrast describe what actually ships.
#[must_use]
pub fn token(name: &str, raw: Oklch, origin: Origin, against: Option<Oklch>) -> DerivedToken {
    let value = fit_to_gamut(raw, crate::oklch::GAMUT_STEPS);
    DerivedToken {
        chroma_reduced: value.chroma < raw.chroma,
        contrast: against.map(|ground| {
            shipped_contrast_ratio(value, fit_to_gamut(ground, crate::oklch::GAMUT_STEPS))
        }),
        hex: oklch_to_hex(value),
        name: name.to_owned(),
        origin,
        value,
    }
}

/// Exposed for the oracle test that isolates `hypot3` from the trigonometry
/// upstream of it. Not part of the surface.
#[doc(hidden)]
#[must_use]
pub fn hypot3_for_test(x: f64, y: f64, z: f64) -> f64 {
    hypot3(x, y, z)
}

/// Likewise, so the oracle can ask whether our lab triple matches theirs before
/// asking whether the distance does.
#[doc(hidden)]
#[must_use]
pub fn to_lab_for_test(color: Oklch) -> [f64; 3] {
    let rad = color.hue * std::f64::consts::PI / 180.0;
    [
        color.lightness,
        color.chroma * rad.cos(),
        color.chroma * rad.sin(),
    ]
}
