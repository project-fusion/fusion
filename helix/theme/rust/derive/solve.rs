//! Solving one ink against every ground it lands on.
//!
//! **This phase is pure**: grounds, sample and target are all arguments, so it
//! can be tested without deriving anything. `solve_for_all` is this solver
//! applied to the surface list rather than a different one.
//!
//! Everything downstream calls one of the two, so a mistake here is a mistake in
//! every color the theme emits.

use crate::derive::Cast;
use crate::oklch::{
    fit_to_gamut, lightness_for_contrast, shipped_contrast_ratio, Oklch, CONTRAST_STEPS,
    GAMUT_STEPS,
};

/// Solves one ink against every ground it lands on, keeping whichever candidate
/// has the best worst case.
///
/// **Grounds are a parameter because the model says which ones.** A hardcoded
/// surface list solves `primary` against the page and leaves it failing on the
/// tinted badge it also sits in.
///
/// One candidate per ground, then the one whose *weakest* pairing is strongest.
/// Not the average and not the first that passes: a token is one color standing
/// on every ground the model gives it, so the ground it does worst on is the one
/// that decides whether it works.
///
/// **Grounds arrive fitted.** Both the candidate search and the worst-case
/// measurement use them as given, so a caller passing raw ones solves against a
/// color that cannot be rendered and then measures against the same
/// unrenderable color: self-consistent, and wrong by however far the fit moves.
/// `solve_for_all` satisfies this by construction, `Surfaces::solved_against`
/// returning fitted values; a caller with a ground list of its own has to fit it.
///
/// # Panics
///
/// If handed no grounds. No caller has one: the model supplies them.
#[must_use]
pub fn solve_against(grounds: &[Oklch], sample: Cast, target: f64) -> Oklch {
    assert!(
        !grounds.is_empty(),
        "an ink is solved against at least one ground"
    );

    /* `f64::min` where the TypeScript writes `Math.min`, and the two disagree on
    `NaN`: JavaScript propagates it, Rust returns the other operand. It cannot
    arise here, every ratio being finite for a color that resolved, and the
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

    /* Strictly greater, so a tie keeps the earlier candidate, which is why the
    order of the grounds is part of the answer rather than an implementation
    detail. */
    let mut best = candidates[0];
    for candidate in &candidates[1..] {
        if worst_case(*candidate) > worst_case(best) {
            best = *candidate;
        }
    }
    best
}
