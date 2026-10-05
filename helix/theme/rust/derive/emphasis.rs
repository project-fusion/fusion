//! An emphasis role: the brand or the accent, and the five colors each becomes.
//!
//! **Solved the same way whichever role it is.** The brand and the accent
//! behaving differently from each other is a difference a consumer would have to
//! learn, and there is no reason for one. A theme that names no brand takes
//! [`ink`] for both.

use crate::derive::solve::solve_against;
use crate::derive::{Cast, Deriving};
use crate::intent::Scheme;
use crate::oklch::{
    fit_to_gamut, lightness_for_contrast, shipped_contrast_ratio, Oklch, CONTRAST_STEPS,
    GAMUT_STEPS,
};

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

/// The lightness of ink on a light page: `neutral-800` in the stylesheet.
pub const INK_LIGHT: f64 = 0.21;

/// The lightness of ink on a dark page: `neutral-300` in the stylesheet.
pub const INK_DARK: f64 = 0.91;

/// The quiet tinted ground a role's badge sits on, and every ground the role's
/// ink is solved against: the page ladder, and that tint.
///
/// **Solved against its own tint as well as the page, because that is where it
/// lands.** The model says `primary` sits on the five page surfaces *and* on
/// `primary-subtle`, which is the ground a quiet badge gives it. In dark mode the
/// tint is lighter than every page surface, so a primary solved against the page
/// alone comes out at 4.25:1 on the one ground a consumer most expects it to
/// work on.
///
/// No cycle: the tint depends on the base color and the scheme, never on the
/// solved ink, so it is computed first and solved against.
fn tint(base: Cast, ctx: &Deriving) -> (Oklch, Vec<Oklch>) {
    let subtle = Oklch {
        chroma: base.chroma.min(ctx.policy.apply(0.06)),
        hue: base.hue,
        lightness: if ctx.scheme == Scheme::Dark {
            ctx.surfaces.surface_base_lightness + 0.06
        } else {
            0.95
        },
    };
    let mut grounds = ctx.surfaces.solved_against().to_vec();
    grounds.push(fit_to_gamut(subtle, GAMUT_STEPS));
    (subtle, grounds)
}

/// Solves a role from its base color.
#[must_use]
pub fn emphasis(base: Oklch, ctx: &Deriving) -> Emphasis {
    let dark = ctx.scheme == Scheme::Dark;
    let (subtle, grounds) = tint(Cast::of(base), ctx);
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

    **The fixed 0.98 ground is not explained in the TypeScript**, so what
    follows is a reading rather than a record: the ink this ground carries is
    its role's label, which the fills phase later solves as one near-white for
    every colored fill there is, so solving the ground against a near-white
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

/// **Ink: the role a theme takes when it names no brand.** The neutral's own
/// near-black on a light page and near-white on a dark one, at the neutral's
/// cast, so a warm gray theme has a warm ink.
///
/// **Held at one lightness.** A brand is solved: it moves the least distance
/// that reads, which keeps as much of its color as it can. Ink has no color to keep,
/// and the least distance from a white page that clears 4.5:1 is a mid gray,
/// which reads as a control switched off. So the ink stays at [`INK_LIGHT`] or
/// [`INK_DARK`], and moves only on a page it does not clear, toward the strongest
/// ink there is.
///
/// **A step short of the text**, which is black or white. That leaves a hovered
/// ink a step further to go, and a link is still told from the words around it by
/// its underline.
///
/// **The fill is the ink itself.** A brand fill is solved dark enough to carry
/// white in both modes; an ink fill is the opposite of the page, so it is light
/// in the dark, and its label is the page's own color, which
/// [`on_ink`](crate::derive::fills::on_ink) gives it.
#[must_use]
pub fn ink(neutral: Cast, ctx: &Deriving) -> Emphasis {
    let dark = ctx.scheme == Scheme::Dark;
    let (subtle, grounds) = tint(neutral, ctx);
    let held = fit_to_gamut(
        neutral.at(if dark { INK_DARK } else { INK_LIGHT }),
        GAMUT_STEPS,
    );
    let clears = grounds
        .iter()
        .all(|ground| shipped_contrast_ratio(held, *ground) >= ctx.contrast_target);
    let raw = if clears {
        held
    } else {
        solve_against(&grounds, neutral, ctx.contrast_target)
    };

    /* Away from the page, as a brand's steps go, and held inside the range: a
    step past white is white. */
    let toward = if dark { 1.0 } else { -1.0 };
    let step = |by: f64| neutral.at((raw.lightness + by * toward).clamp(0.0, 1.0));

    Emphasis {
        active: step(0.1),
        filled: raw,
        hover: step(0.05),
        raw,
        subtle,
    }
}
