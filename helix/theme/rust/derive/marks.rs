//! The three colours solved against something other than the page ladder: the
//! inverse pair, the focus ring, and the brand as a mark.

use crate::derive::{Cast, Deriving};
use crate::intent::Scheme;
use crate::oklch::{
    fit_to_gamut, lightness_for_contrast, shipped_contrast_ratio, Oklch, CONTRAST_STEPS,
    GAMUT_STEPS,
};

/// A toast that is the opposite of the page it sits on.
///
/// One ground and one ink solved together, because neither is on the ladder: an
/// inverse surface is defined by being off it, so nothing already derived can
/// stand in for either half.
#[must_use]
pub fn inverse(neutral: Cast, scheme: Scheme, contrast_target: f64) -> (Oklch, Oklch) {
    let surface = neutral.at(if scheme == Scheme::Dark { 0.95 } else { 0.2 });
    let foreground = lightness_for_contrast(
        neutral.chroma,
        neutral.hue,
        fit_to_gamut(surface, GAMUT_STEPS),
        /* The foreground multiplier the neutral inks use, for the reason given
        there: this is body text on a surface, and it is the same body text. */
        contrast_target * 1.6,
        None,
        CONTRAST_STEPS,
    );
    (surface, foreground)
}

/// The focus ring, at 3:1 against every page surface.
///
/// A ring is seen rather than read, so WCAG 1.4.11 rather than the text target,
/// and against every surface because a focused control can sit on any of them.
#[must_use]
pub fn focus_ring(brand: Oklch, ctx: &Deriving) -> Oklch {
    ctx.solve_for_all(
        Cast {
            chroma: brand.chroma,
            hue: brand.hue,
        },
        3.0,
    )
}

/// **The brand as a mark: the nearest legible lightness, not the most legible
/// one.**
///
/// A graphic answers to 3:1 under WCAG 1.4.11 rather than the 4.5 a word does,
/// so a mark can sit close to the color a consumer actually chose, and that
/// closeness is the whole point of the token.
///
/// `solve_for_all` is the wrong solver for it and measurably so. It keeps the
/// candidate with the best worst case, which for `#c1272d` chose a lightness
/// 0.133 away when `primary` had landed 0.025 away: the mark traveled further
/// than the text it was supposed to stay closer than. So this walks outward from
/// the brand's own lightness and takes the first step that clears.
///
/// **It walks down before up, where the hue repair walks up before down.** Both
/// are "step outward and take the first that clears" and they disagree on which
/// side is first, which decides the answer for every brand whose two neighbours
/// both clear at the same step. Down first is right here: a mark that fails is
/// usually a pale one on a white page, so the near side is the dark side, and
/// trying it first is what makes the search terminate a step earlier rather than
/// land on the far side of a tie. Kept as its own function for that reason. A
/// shared "walk outward" helper would have to take the order as a parameter,
/// which is the whole of what differs.
///
/// Nothing inside the walk clears for a brand that cannot be seen on any page
/// surface at any lightness, and the lightness asked for stands: `pairings`
/// reports it rather than the token quietly claiming a legibility it does not
/// have.
#[must_use]
pub fn brand_mark(brand: Oklch, grounds: &[Oklch]) -> Oklch {
    let sample = Cast {
        chroma: brand.chroma,
        hue: brand.hue,
    };
    let clears = |lightness: f64| {
        grounds.iter().all(|ground| {
            shipped_contrast_ratio(fit_to_gamut(sample.at(lightness), GAMUT_STEPS), *ground) >= 3.0
        })
    };

    sample.at(walk_outward(brand.lightness, clears))
}

/// Steps outward from a lightness in hundredths and returns the first that
/// clears, **trying the darker side of each step first**.
///
/// Extracted for the reason [`repair_hue`] was: the order is a decision that no
/// output can show. It only decides an answer when both neighbours clear at the
/// same step, and no brand in the oracle produces that tie, so reversing the two
/// entries leaves all thirteen themes byte-identical. Measured by making the
/// edit and watching the suite stay green, which is the only way to find out
/// that an assertion is not asserting anything.
///
/// A synthetic predicate is what makes the tie constructible. Trying to build
/// one out of real contrast against a real ground does not work: for a mid gray
/// the lighter side clears a full step earlier, so the search returns before any
/// tie exists.
///
/// **Candidates outside 0 to 1 are skipped rather than clamped**, and the
/// difference is not efficiency. Every value this can return is one the caller's
/// own lightness plus a whole number of hundredths; clamping would fold every
/// out-of-range step onto 0 or 1, which are on that grid only when the caller's
/// lightness is. So a brand at 0.015 that fails everywhere except pure black
/// would come back pure black under clamping and come back unmoved here, and
/// unmoved is the honest answer: the walk found nothing, and `pairings` says
/// so.
///
/// [`repair_hue`]: crate::derive::status::repair_hue
#[must_use]
pub fn walk_outward(asked: f64, clears: impl Fn(f64) -> bool) -> f64 {
    for step in 0..=100 {
        let offset = f64::from(step) / 100.0;
        let tries: &[f64] = if step == 0 {
            &[asked]
        } else {
            &[asked - offset, asked + offset]
        };
        for candidate in tries.iter().filter(|l| (0.0..=1.0).contains(*l)) {
            if clears(*candidate) {
                return *candidate;
            }
        }
    }
    /* Nothing inside the walk clears, so the lightness asked for stands. */
    asked
}
