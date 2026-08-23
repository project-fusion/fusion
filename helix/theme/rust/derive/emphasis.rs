//! An emphasis role: the brand or the accent, and the five colours each becomes.
//!
//! **Solved the same way whichever role it is.** The brand and the accent
//! behaving differently from each other is a difference a consumer would have to
//! learn, and there is no reason for one.
//!
//! This is the phase that captures the most, and the one the module split was
//! most worth doing for: six bindings, all of them now in [`Deriving`].

use crate::derive::solve::solve_against;
use crate::derive::{Cast, Deriving};
use crate::intent::Scheme;
use crate::oklch::{fit_to_gamut, lightness_for_contrast, Oklch, CONTRAST_STEPS, GAMUT_STEPS};

/// One role, in the five forms the token set needs.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Emphasis {
    /// Pressed: a further step in the same direction as `hover`.
    pub active: Oklch,
    /// The role as a *ground*, dark enough to carry light text.
    pub filled: Oklch,
    /// Hovered: one step away from the page.
    pub hover: Oklch,
    /// The role as an *ink*, solved to be legible on every ground it lands on.
    pub raw: Oklch,
    /// The quiet tinted ground a badge or a selected row sits on.
    pub subtle: Oklch,
}

/// Solves a role from its base colour.
#[must_use]
pub fn emphasis(base: Oklch, ctx: &Deriving) -> Emphasis {
    let dark = ctx.scheme == Scheme::Dark;

    /* **Solved against its own tint as well as the page, because that is where
    it lands.** The model says `primary` sits on the five page surfaces *and* on
    `primary-subtle`, which is the ground a quiet badge gives it, and the solver
    was reading a hardcoded surface list that did not include it. In dark mode
    the tint is lighter than every page surface, so a primary solved against the
    page alone came out at 4.25:1 on the one ground a consumer most expects it to
    work on.

    No cycle: the tint depends on the base colour and the scheme, never on the
    solved ink, so it is computed first and solved against. */
    let subtle = Oklch {
        chroma: base.chroma.min(ctx.policy.apply(0.06)),
        hue: base.hue,
        lightness: if dark {
            ctx.surfaces.surface_base_lightness + 0.06
        } else {
            0.95
        },
    };

    let mut grounds = ctx.surfaces.solved_against().to_vec();
    grounds.push(fit_to_gamut(subtle, GAMUT_STEPS));
    let raw = solve_against(&grounds, Cast::of(base), ctx.contrast_target);

    /* Hover and active step *away* from the page, which is lighter in a dark
    theme and darker in a light one. The fill below is the one that does not
    follow the scheme, and it is the exception rather than the rule. */
    let toward = if dark { 1.0 } else { -1.0 };
    let step = |by: f64| Oklch {
        chroma: base.chroma,
        hue: base.hue,
        lightness: raw.lightness + by * toward,
    };

    /* **A brand surface, which `primary` cannot also be.** `primary` is solved to
    be *legible on* the background, so in a dark theme it comes out light by
    construction, and a card filled with it carries dark text. A filled brand
    panel with light text needs the opposite: dark enough that the ink clears it.

    **The fixed 0.98 ground is not explained in the TypeScript**, so the reading
    is mine and is marked as one: the ink this ground carries is
    `foreground-on-accent`, which the fills phase later solves as one near-white
    for every filled ground there is, so solving the ground against a near-white
    is solving it against the ink it will hold rather than against the page it
    sits on. That would also be why it does not follow the scheme, where
    everything else here does. Asserted either way, `color-primary-surface`
    failing on the hex when the 0.98 is moved. */
    let filled = lightness_for_contrast(
        base.chroma,
        base.hue,
        fit_to_gamut(
            Oklch {
                chroma: 0.0,
                hue: 0.0,
                lightness: 0.98,
            },
            GAMUT_STEPS,
        ),
        ctx.contrast_target,
        Some(true),
        CONTRAST_STEPS,
    );

    Emphasis {
        active: step(0.1),
        filled,
        hover: step(0.05),
        raw,
        subtle,
    }
}
