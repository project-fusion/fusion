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

use crate::derive::emphasis::emphasis;
use crate::derive::solve::solve_against;
use crate::derive::status::StatusColor;
use crate::derive::{Cast, Deriving};
use crate::oklch::{fit_to_gamut, shipped_contrast_ratio, Oklch, GAMUT_STEPS};

/// A fill and the fill it becomes under a pointer.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Fill {
    pub hover: Oklch,
    pub rest: Oklch,
}

/// **A fill darkens under a pointer in both modes, and it is the one hover that
/// does not follow the scheme.**
///
/// An ink's hover steps toward the ink, which is lighter on a dark page; a fill
/// already carries light text by construction, so lightening it in dark mode
/// takes contrast away from the very text it exists to hold: stepping toward the
/// ink for consistency drops six filled grounds to 3.67:1 against their own
/// label. The stylesheet has it right, `primary-surface` being the 600 and its
/// hover the 700.
#[must_use]
pub fn hover_of(fill: Oklch) -> Oklch {
    Oklch {
        lightness: fill.lightness - 0.05,
        ..fill
    }
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
            let steps = emphasis(status.color, ctx);
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

/// Every colored fill a near-white label lands on: brand, accent and each
/// status, resting and hovered.
///
/// `None` for a role whose fill is ink, which carries a label of its own and is
/// left out, so it cannot drag the near-white toward a gray that reads on
/// neither.
#[must_use]
pub fn filled_grounds(
    primary_filled: Option<Oklch>,
    accent_filled: Option<Oklch>,
    fills: &[(&'static str, Fill)],
) -> Vec<Oklch> {
    let mut grounds = Vec::new();
    for filled in [primary_filled, accent_filled].into_iter().flatten() {
        grounds.push(filled);
        grounds.push(hover_of(filled));
    }
    for (_, fill) in fills {
        grounds.push(fill.rest);
        grounds.push(hover_of(fill.rest));
    }
    grounds
}

/// The label that stands on every colored fill, at chroma 0.
///
/// This is [`solve_against`] over a different ground list, and not a second copy
/// of the map-and-reduce: the solver takes its grounds as a parameter, so the
/// difference is an argument.
///
/// Chroma 0 because it is white or black. A label carrying brand hue reads as a
/// tint of the fill it sits on rather than as text.
///
/// **The grounds are fitted here, because [`solve_against`] takes them fitted.**
/// Its other caller reaches it through `solve_for_all`, which passes the page
/// ladder already fitted, so the contract was satisfied by every existing call
/// and stated by none of them. Passing the raw fills moved
/// `foreground-on-accent` by four steps on the shipped theme, `#fcfcfc` where
/// the TypeScript emits `#f8f8f8`: a near-white either way, and a near-white
/// that had not been solved against anything renderable.
#[must_use]
pub fn on_fill(grounds: &[Oklch], target: f64) -> Oklch {
    let fitted: Vec<Oklch> = grounds
        .iter()
        .map(|ground| fit_to_gamut(*ground, GAMUT_STEPS))
        .collect();
    solve_against(
        &fitted,
        Cast {
            chroma: 0.0,
            hue: 0.0,
        },
        target,
    )
}

/// **The label on an ink fill, which is the page's own color.** An ink fill is
/// the opposite of the page, so the page is what reads on it: white on the
/// near-black, and black on the near-white.
///
/// Measured against the fill and its hover, and where the page misses either,
/// which only a page far from white or black can, whichever of black and white
/// reads better on the worse of the two.
#[must_use]
pub fn on_ink(fill: Oklch, page: Oklch, target: f64) -> Oklch {
    let grounds = [
        fit_to_gamut(fill, GAMUT_STEPS),
        fit_to_gamut(hover_of(fill), GAMUT_STEPS),
    ];
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
