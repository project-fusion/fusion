//! The derivation, ported from `src/derive.ts` and taken apart on the way.
//!
//! **Do not reorganize the TypeScript to match.** It is deleted by this port,
//! so restructuring it would churn the import surface of 82 specs to improve a
//! file that is going, and the modularity has to live in the crate either way.
//!
//! Each phase is asserted against the oracle by the tokens it produces. That
//! works because the artifact is 37 uniquely named tokens rather than one
//! opaque blob: a disagreement names itself, so `color-primary` differing points
//! at the emphasis phase without anybody bisecting a search by hand.

pub mod accent;
pub mod emphasis;
pub mod fills;
pub mod inks;
pub mod marks;
pub mod quiet;
pub mod report;
pub mod resolve;
pub mod seeds;
pub mod solve;
pub mod status;
pub mod surfaces;
pub mod theme;
pub mod tokens;

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
    /// True when chroma had to be reduced to bring the color into the sRGB
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

/// A hue and a chroma with no lightness yet: `Omit<Oklch, 'lightness'>` in the
/// TypeScript, and worth a name here.
///
/// It is what a neutral cast is, and what the contrast solver takes: lightness
/// is the one component both of those are *solving for*, so a type carrying a
/// meaningless value in that slot would invite it being read as meaningful.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Cast {
    pub chroma: f64,
    pub hue: f64,
}

impl Cast {
    /// The color this cast becomes at a given lightness.
    #[must_use]
    pub fn at(self, lightness: f64) -> Oklch {
        Oklch {
            chroma: self.chroma,
            hue: self.hue,
            lightness,
        }
    }

    /// The cast a color carries, dropping the lightness it happens to have.
    #[must_use]
    pub fn of(color: Oklch) -> Self {
        Self {
            chroma: color.chroma,
            hue: color.hue,
        }
    }
}

/// Perceptual distance below which two roles are not reliably distinguishable.
///
/// `tokens.css` measured the muted series at 0.064 in `OKLab` and recorded that as
/// below what anybody tells apart, so the threshold sits just above it.
pub const COLLISION_DISTANCE: f64 = 0.08;

/// OKLCH as the three `OKLab` axes it is the polar form of.
///
/// Its own function rather than a closure, so the oracle's isolation test uses
/// *this* and not a copy of it. A copy leaves that test, which separates a
/// disagreement in the trigonometry from one in the algorithm, unable to see a
/// disagreement introduced in the trigonometry.
pub(crate) fn to_lab(color: Oklch) -> [f64; 3] {
    let rad = color.hue * std::f64::consts::PI / 180.0;
    [
        color.lightness,
        color.chroma * rad.cos(),
        color.chroma * rad.sin(),
    ]
}

/// Euclidean distance in `OKLab`, which is what OKLCH exists to make meaningful.
#[must_use]
pub fn perceptual_distance(a: Oklch, b: Oklch) -> f64 {
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

/// What every phase after the ladder needs, named rather than captured.
///
/// `solve_against` is not a field: it takes everything it needs as arguments,
/// so it is a free function rather than something a phase is handed.
#[derive(Clone, Copy, Debug)]
pub struct Deriving {
    pub contrast_target: f64,
    pub policy: resolve::Policy,
    pub scheme: crate::intent::Scheme,
    pub surfaces: surfaces::Surfaces,
}

impl Deriving {
    /// The page ladder, which is what an ink with no ground of its own sits on.
    #[must_use]
    pub fn solve_for_all(&self, sample: Cast, target: f64) -> Oklch {
        solve::solve_against(&self.surfaces.solved_against(), sample, target)
    }
}

/// Builds a token, fitting the color into the sRGB gamut first so that both the
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

/// Exposed to the oracle's isolation test, which asks whether a disagreement is
/// in this or in the trigonometry above it. `pub(crate)` because that test is a
/// module of this crate: scaffolding does not belong in the published surface,
/// and `cfg(test)` keeps it out of the built library entirely.
#[cfg(test)]
pub(crate) fn hypot3_isolated(x: f64, y: f64, z: f64) -> f64 {
    hypot3(x, y, z)
}
