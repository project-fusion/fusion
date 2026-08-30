//! The page's ladder: the five grounds a component actually names.
//!
//! **All five are emitted, and a component reading one that is not keeps the
//! stock gray.** A dropdown sits on `surface-overlay`, a recess on
//! `surface-sunken`, a card that lifts on `surface-raised`, so emitting fewer
//! leaves a themed panel unthemed exactly where a popover opens.

use crate::derive::Cast;
use crate::intent::{Mechanism, Scheme};
use crate::oklch::{fit_to_gamut, Oklch, GAMUT_STEPS};

/// How far the ladder stands off the page, per separation mechanism.
///
/// **`fill` and `space` both emit a zero edge and no lift**, so nothing about
/// the edge can tell them apart, and a mechanism nobody can see is not a choice.
///
/// What separates a surface, when it is neither an edge nor a lift, is how far
/// its own color sits from the page. So the policy scales that distance: `fill`
/// pushes the ladder away from the background, `space` collapses it onto the
/// background so nothing but the gap tells them apart, and `border` and `shadow`
/// leave it where it has always been because on those the edge or the lift is
/// doing the work.
#[must_use]
pub fn ladder(mechanism: Option<Mechanism>) -> f64 {
    match mechanism.unwrap_or(Mechanism::Border) {
        Mechanism::Border | Mechanism::Shadow => 1.0,
        Mechanism::Fill => 1.7,
        Mechanism::Space => 0.0,
    }
}

/// Every surface the page ladder holds, before and after gamut fitting.
///
/// Raw values are what the intent asked for; fitted values are what can be
/// rendered. Tokens carry the raw so they can report the difference, while every
/// contrast solve uses the fitted version. Solving against a color that cannot
/// be rendered and then measuring against the one that can is how a palette
/// passes in theory and fails by a hundredth in practice.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Surfaces {
    pub raw_background: Oklch,
    pub raw_overlay: Oklch,
    pub raw_raised: Oklch,
    pub raw_sunken: Oklch,
    pub raw_surface: Oklch,
    /// The lightness `surface` sits at before the ladder scales it, which the
    /// emphasis phase needs for the dark-mode tint and nothing else does.
    pub surface_base_lightness: f64,
}

impl Surfaces {
    /// The four grounds an ink with no ground of its own is solved against.
    ///
    /// **Text lands on more than one surface, and the hardest is not always the
    /// page background**: in a dark theme `surface` is *lighter* than
    /// `background`, so light text loses contrast there. Solving against a single
    /// surface ships a palette that passes on the page and fails inside every
    /// card.
    ///
    /// `overlay` is not among them, being pure white in light mode and equal to
    /// `raised` in dark, so it adds a ground that is either trivial or already
    /// covered. That is the TypeScript's list, kept as it is rather than
    /// improved: a port that widens a solver's inputs derives a different
    /// palette.
    #[must_use]
    pub fn solved_against(self) -> [Oklch; 4] {
        [
            fit_to_gamut(self.raw_background, GAMUT_STEPS),
            fit_to_gamut(self.raw_surface, GAMUT_STEPS),
            fit_to_gamut(self.raw_raised, GAMUT_STEPS),
            fit_to_gamut(self.raw_sunken, GAMUT_STEPS),
        ]
    }

    /// The page itself, fitted, which is the ground most inks report against.
    #[must_use]
    pub fn background(self) -> Oklch {
        fit_to_gamut(self.raw_background, GAMUT_STEPS)
    }
}

/// Builds the ladder for a scheme.
///
/// **The page is pure white and pure black.** `tokens.css` states the decision
/// outright, that the page is `#ffffff` and `#000000` and is the one fixed point
/// either mode has, and records rejecting the near-black that would make room
/// underneath for `sunken`. `surface` is the faintly gray one: the two the wrong
/// way round is a themed page coming out faintly gray with white cards on it
/// where the stylesheet paints a white page with faintly gray cards.
///
/// No cast on the page, for the reason the primitive gives: it is the one
/// surface with nothing behind it to sit against, so the trace of brand hue that
/// makes a card feel part of the palette has nothing to do there and reads as a
/// color cast across the whole window.
///
/// **Every rung is taken from the stylesheet's own ladder**, since the two are
/// meant to agree for the brand that ships. A rung a few hundredths off is small
/// enough to look like rounding and large enough to be a different gray.
///
/// Stated per scheme rather than stepped off `surface`, because a step has to
/// know which way is away and the answer is not the same for all three. Raised
/// and overlay move off the surface; sunken goes *under the background*, and a
/// light theme's surface is already pure white, so stepping it produced a
/// lightness of 1.05 and the gamut check caught it.
#[must_use]
pub fn surfaces(scheme: Scheme, neutral: Cast, rung: f64) -> Surfaces {
    let dark = scheme == Scheme::Dark;
    let raw_background = if dark {
        Oklch {
            chroma: 0.0,
            hue: 0.0,
            lightness: 0.0,
        }
    } else {
        Oklch {
            chroma: 0.0,
            hue: 0.0,
            lightness: 1.0,
        }
    };
    let surface_base_lightness = if dark { 0.182 } else { 0.985 };

    /* The step away from the page, scaled by the separation policy. */
    let step =
        |from: f64| neutral.at(raw_background.lightness + (from - raw_background.lightness) * rung);

    Surfaces {
        raw_background,
        /* `overlay` is pure white in light and takes no cast, matching
        `neutral-0`: a menu on a white page is white, which is what every desktop
        menu does. */
        raw_overlay: if dark {
            step(0.21)
        } else {
            Oklch {
                chroma: 0.0,
                hue: 0.0,
                lightness: 1.0,
            }
        },
        raw_raised: step(if dark { 0.21 } else { 0.97 }),
        raw_sunken: step(if dark { 0.15 } else { 0.96 }),
        /* Declared after the ladder, since `surface` is on it: it is the ground a
        card uses, so a fill-first theme has to move it too or the one surface the
        policy is most about is the one it does not reach. */
        raw_surface: step(surface_base_lightness),
        surface_base_lightness,
    }
}
