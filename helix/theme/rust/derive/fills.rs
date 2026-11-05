//! The filled grounds, and the labels that stand on them.
//!
//! **One label per role: `foreground-on-primary`, `-on-accent`, and
//! `-on-status`.** A colored fill is solved dark enough to carry white in both
//! modes, so wherever a role is colored its label is one near-white, solved
//! against every colored fill there is: solving it against `primary-surface`
//! alone would leave a hovered button and all four status fills carrying an ink
//! nothing measured against them. So it clears the worst of them, or `pairings`
//! reports that it could not.
//!
//! **An ink fill is the one that turns over.** It is the opposite of the page,
//! light in the dark, so no near-white can stand on it, and its label is the
//! page's own color. That is why each role has a label of its own: one name
//! could not be dark on the ink fill and light on the danger fill beside it.

use crate::derive::emphasis::{chosen, emphasis, Emphasis};
use crate::derive::solve::solve_on_side;
use crate::derive::status::StatusColor;
use crate::derive::{Cast, Deriving};
use crate::intent::Scheme;
use crate::oklch::{
    fit_to_gamut, linear_rgb_to_oklch, oklch_to_linear_rgb, shipped_contrast_ratio, LinearRgb,
    Oklch, GAMUT_STEPS,
};

/// A fill and the fill it becomes under a pointer.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Fill {
    pub hover: Oklch,
    pub rest: Oklch,
}

/// **A fill darkens under a pointer, on a light page and for a status on a
/// dark one.**
///
/// An ink's hover steps toward the ink, which is lighter on a dark page; a
/// status fill is solved to carry its light label at the target exactly, so
/// lightening it in dark mode takes contrast away from the very text it exists
/// to hold: stepping toward the ink for consistency dropped six filled grounds
/// to 3.67:1 against their own label. A brand fill in dark is held where it
/// has room to step lighter, and [`dark_fill`] steps it.
#[must_use]
pub fn hover_of(fill: Oklch) -> Oklch {
    Oklch {
        lightness: fill.lightness - 0.05,
        ..fill
    }
}

/// The luminance a brand fill on a dark page is held between, as the
/// stylesheet's `--_helix-fill-luminance` holds it.
///
/// **Held by luminance, which is what both of its contrasts are measured in.**
/// The same lightness is a different luminance in each hue. The fill was
/// solved for its label alone, so its distance from the page was whatever
/// that left: `#1e3a8a`, kept as its own fill, stood 2.03:1 off the black page
/// and 1.65 under the pointer. At 0.115 a fill stands 3.3:1 off the black
/// page, and at 0.135 white stands 5.68:1 on it.
pub const DARK_FILL_LUMINANCE: (f64, f64) = (0.115, 0.135);

/// How much luminance a dark brand fill gains under a pointer and under a
/// press, as the stylesheet's `--_helix-fill-hover` and `--_helix-fill-press`
/// give it for a fill that carries white.
///
/// **Lighter, away from the black page**, which a fill darkening toward it
/// does not reach: `#7c3aed`, kept as its own fill, stood 2.95:1 off the black
/// page under the pointer. 1.3 times the top of the band is 0.1755, where
/// white still stands 4.66:1.
pub const DARK_FILL_STEPS: (f64, f64) = (1.15, 1.3);

/// A brand or accent fill on a dark page, and its hover and press, as the
/// stylesheet draws `--_helix-brand-fill-dark` and its two steps.
///
/// **The role's color at a lightness between 0.48 and 0.54, then scaled in
/// linear light** to a luminance inside [`DARK_FILL_LUMINANCE`]. Scaling the
/// three linear channels by one factor scales X, Y, and Z by it as well, so
/// the fill keeps the color's chromaticity, as the stylesheet's `xyz-d65`
/// arithmetic does. The hover and the press are the same color at
/// [`DARK_FILL_STEPS`] times the resting luminance.
///
/// **Every seed takes this branch.** The stylesheet keeps a seed at L 0.68 or
/// more at its own lightness less 0.05, with a black label. This engine solves
/// one near-white label for every colored fill, so a light seed is held in the
/// same band as a dark one and carries the same white.
#[must_use]
pub fn dark_fill(steps: Emphasis, base: Oklch) -> Emphasis {
    let (low, high) = DARK_FILL_LUMINANCE;
    let (hover, press) = DARK_FILL_STEPS;
    let start = fit_to_gamut(
        Oklch {
            lightness: (base.lightness - 0.05).clamp(0.48, 0.54),
            ..base
        },
        GAMUT_STEPS,
    );
    let rest = linear_luminance(start).clamp(low, high);
    Emphasis {
        filled: at_luminance(start, rest),
        filled_active: at_luminance(start, rest * press),
        filled_hover: at_luminance(start, rest * hover),
        ..steps
    }
}

/// A color scaled in linear light to `luminance`, and fitted into sRGB.
///
/// **Scaled and fitted three times**, because the fit moves the luminance it
/// was scaled to: it takes chroma off at a fixed lightness, and a saturated
/// violet comes back lighter than it went in. Scaled once, the press of
/// `oklch(0.6 0.3 280)` landed at 4.47:1 under white. After the third pass,
/// every state of 1,944 dark brands swept across hue, chroma, and lightness
/// stood within 0.0001 of the luminance asked for, and white cleared 4.63:1 on
/// every press, November 4, 2026.
fn at_luminance(color: Oklch, luminance: f64) -> Oklch {
    let mut color = color;
    for _ in 0..3 {
        color = fit_to_gamut(
            scaled(color, luminance / linear_luminance(color).max(0.001)),
            GAMUT_STEPS,
        );
    }
    color
}

/// A brand or accent role, with its fill as the scheme draws it: solved for
/// its label on a light page, and held by luminance on a dark one.
#[must_use]
pub fn in_scheme(steps: Emphasis, base: Oklch, scheme: Scheme) -> Emphasis {
    if scheme == Scheme::Dark {
        dark_fill(steps, base)
    } else {
        steps
    }
}

/// The luminance of a color in linear light, unclamped: the `y` the
/// stylesheet reads off `xyz-d65`.
fn linear_luminance(color: Oklch) -> f64 {
    let rgb = oklch_to_linear_rgb(color);
    0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
}

/// A color with its linear channels multiplied by `by`, which keeps its
/// chromaticity and multiplies its luminance.
fn scaled(color: Oklch, by: f64) -> Oklch {
    let rgb = oklch_to_linear_rgb(color);
    linear_rgb_to_oklch(LinearRgb {
        b: rgb.b * by,
        g: rgb.g * by,
        r: rgb.r * by,
    })
}

/// The fill each status wears, in the order the statuses were derived.
///
/// A `Vec` rather than a map, because the order is load-bearing twice over: it
/// decides which candidate `on_fill` keeps on a tie, and it decides the order
/// the surface tokens are emitted in.
#[must_use]
pub fn status_fills(statuses: &[StatusColor], ctx: &Deriving) -> Vec<(&'static str, Fill)> {
    statuses
        .iter()
        .map(|status| {
            let steps = if status.pinned {
                chosen(status.color, ctx)
            } else {
                emphasis(status.color, ctx)
            };
            (
                status.name,
                Fill {
                    /* Both halves are the resting fill, and `hover` is read by
                    nobody: every consumer takes `rest` and applies `hover_of`
                    itself. */
                    hover: steps.filled,
                    rest: steps.filled,
                },
            )
        })
        .collect()
}

/// Every colored fill a near-white label lands on: brand and accent resting,
/// hovered, and pressed, and each status resting and hovered.
///
/// `None` for a role whose fill is ink, which carries a label of its own and is
/// left out, so it cannot drag the near-white toward a gray that reads on
/// neither.
#[must_use]
pub fn filled_grounds(
    primary: Option<&Emphasis>,
    accent: Option<&Emphasis>,
    fills: &[(&'static str, Fill)],
) -> Vec<Oklch> {
    let mut grounds = Vec::new();
    for role in [primary, accent].into_iter().flatten() {
        grounds.push(role.filled);
        grounds.push(role.filled_hover);
        grounds.push(role.filled_active);
    }
    for (_, fill) in fills {
        grounds.push(fill.rest);
        grounds.push(hover_of(fill.rest));
    }
    grounds
}

/// The label that stands on every colored fill, at chroma 0.
///
/// This is [`solve_on_side`], the solver beneath
/// [`solve_against`](crate::derive::solve::solve_against), over a different
/// ground list, and not a second copy of the map-and-reduce: the solver takes
/// its grounds as a parameter, so the difference is an argument.
///
/// Chroma 0 because it is a near-white. A label carrying brand hue reads as a
/// tint of the fill it sits on rather than as text.
///
/// **The grounds are fitted here, because [`solve_on_side`] takes them fitted.**
/// Its other caller reaches it through `solve_for_all`, which passes the page
/// ladder already fitted, so the contract was satisfied by every existing call
/// and stated by none of them. Passing the raw fills moved
/// `foreground-on-accent` by four steps on the shipped theme, `#fcfcfc` where
/// the TypeScript emits `#f8f8f8`: a near-white either way, and a near-white
/// that had not been solved against anything renderable.
///
/// **Each candidate is searched on the light side of its fill.** Every colored
/// fill is made to carry a light label, and a dark brand fill's press is light
/// enough that black reaches the target on it too: at a luminance of 0.1755,
/// black measures 4.51:1. Searched on whichever side reads, that press
/// offered a black candidate, which loses on every other fill, and the label
/// came from a status fill instead: #f8f8f8, at 4.39:1 on the press of
/// `#2f9e44` in dark. On every other fill black falls short, so there the
/// light side is the candidate either search returns.
#[must_use]
pub fn on_fill(grounds: &[Oklch], target: f64) -> Oklch {
    let fitted: Vec<Oklch> = grounds
        .iter()
        .map(|ground| fit_to_gamut(*ground, GAMUT_STEPS))
        .collect();
    solve_on_side(
        &fitted,
        Cast {
            chroma: 0.0,
            hue: 0.0,
        },
        target,
        Some(false),
    )
}

/// **The label on an ink fill, which is the page's own color.** An ink fill is
/// the opposite of the page, so the page is what reads on it: white on the
/// near-black, and black on the near-white.
///
/// Measured against the fill, its hover, and its press, and where the page
/// misses any of them, which only a page far from white or black can,
/// whichever of black and white reads better on the worst of the three.
#[must_use]
pub fn on_ink(ink: &Emphasis, page: Oklch, target: f64) -> Oklch {
    let grounds = [ink.filled, ink.filled_hover, ink.filled_active]
        .map(|ground| fit_to_gamut(ground, GAMUT_STEPS));
    let worst = |ink: Oklch| {
        let fitted = fit_to_gamut(ink, GAMUT_STEPS);
        grounds
            .iter()
            .map(|ground| shipped_contrast_ratio(fitted, *ground))
            .fold(f64::INFINITY, f64::min)
    };
    if worst(page) >= target {
        return page;
    }
    let pole = |lightness: f64| Oklch {
        chroma: 0.0,
        hue: 0.0,
        lightness,
    };
    if worst(pole(0.0)) >= worst(pole(1.0)) {
        pole(0.0)
    } else {
        pole(1.0)
    }
}
