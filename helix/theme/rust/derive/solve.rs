//! Solving one ink against every ground it lands on.
//!
//! **This is the phase that turned out to be pure**, which the closure hid. In
//! the TypeScript `solveAgainst` sits inside `deriveTheme` and reads like the
//! rest of it, but it captures nothing: grounds, sample and target are all
//! arguments. `solveForAll` is the one that captures, and all it captures is the
//! surface list, so it is that list applied rather than a different solver.
//!
//! Worth separating for that reason alone. Everything downstream calls one of
//! these two, so a mistake here is a mistake in every colour the theme emits,
//! and a pure function is one that can be tested without deriving anything.

use crate::derive::Cast;
use crate::oklch::{
    fit_to_gamut, lightness_for_contrast, shipped_contrast_ratio, Oklch, CONTRAST_STEPS,
    GAMUT_STEPS,
};

/// Solves one ink against every ground it lands on, keeping whichever candidate
/// has the best worst case.
///
/// **Grounds are a parameter because the model says which ones**, and that is
/// the whole correction: a hardcoded surface list solved `primary` against the
/// page and left it failing on the tinted badge it also sits in.
///
/// One candidate per ground, then the one whose *weakest* pairing is strongest.
/// Not the average and not the first that passes: a token is one colour standing
/// on every ground the model gives it, so the ground it does worst on is the one
/// that decides whether it works.
///
/// # Panics
///
/// If handed no grounds. The TypeScript's `reduce` throws on an empty array for
/// the same reason, and no caller has one: the model supplies them.
#[must_use]
pub fn solve_against(grounds: &[Oklch], sample: Cast, target: f64) -> Oklch {
    assert!(
        !grounds.is_empty(),
        "an ink is solved against at least one ground"
    );

    /* `f64::min` where the TypeScript writes `Math.min`, and the two disagree on
    `NaN`: JavaScript propagates it, Rust returns the other operand. It cannot
    arise here, every ratio being finite for a colour that resolved, and the
    validation in `resolve` is what makes that true. */
    let worst_case = |candidate: Oklch| {
        let fitted = fit_to_gamut(candidate, GAMUT_STEPS);
        grounds
            .iter()
            .map(|ground| shipped_contrast_ratio(fitted, *ground))
            .fold(f64::INFINITY, f64::min)
    };

    let candidates: Vec<Oklch> = grounds
        .iter()
        .map(|ground| {
            lightness_for_contrast(
                sample.chroma,
                sample.hue,
                *ground,
                target,
                None,
                CONTRAST_STEPS,
            )
        })
        .collect();

    /* Strictly greater, so a tie keeps the earlier candidate. That is what
    `reduce` does with no initial value, and it is why the order of the grounds
    is part of the answer rather than an implementation detail. */
    let mut best = candidates[0];
    for candidate in &candidates[1..] {
        if worst_case(*candidate) > worst_case(best) {
            best = *candidate;
        }
    }
    best
}
