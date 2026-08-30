//! The filled grounds, and the one ink that has to stand on all of them.
//!
//! **`foreground-on-accent` is a single token and there are ten grounds wearing
//! it.** Solving it against `primary-surface` alone leaves a hovered button and
//! all four status fills carrying an ink nothing measured against them. One name
//! has to mean one color, so it clears the worst of them or `pairings` reports
//! that it could not, rather than the name quietly meaning something different
//! per family.

use crate::derive::emphasis::emphasis;
use crate::derive::solve::solve_against;
use crate::derive::status::StatusColor;
use crate::derive::{Cast, Deriving};
use crate::oklch::{fit_to_gamut, Oklch, GAMUT_STEPS};

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
/// decides which candidate `on_accent` keeps on a tie, and it decides the order
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

/// Every filled ground an on-accent ink lands on: brand, accent and each status,
/// resting and hovered.
#[must_use]
pub fn filled_grounds(
    primary_filled: Oklch,
    accent_filled: Oklch,
    fills: &[(&'static str, Fill)],
) -> Vec<Oklch> {
    let mut grounds = vec![
        primary_filled,
        hover_of(primary_filled),
        accent_filled,
        hover_of(accent_filled),
    ];
    for (_, fill) in fills {
        grounds.push(fill.rest);
        grounds.push(hover_of(fill.rest));
    }
    grounds
}

/// The ink that stands on all of them, at chroma 0.
///
/// This is [`solve_against`] over a different ground list, and not a second copy
/// of the map-and-reduce: the solver takes its grounds as a parameter, so the
/// difference is an argument.
///
/// Chroma 0 because it is white or black. An on-accent ink carrying brand hue
/// reads as a tint of the fill it sits on rather than as text.
///
/// **The grounds are fitted here, because [`solve_against`] takes them fitted.**
/// Its other caller reaches it through `solve_for_all`, which passes the page
/// ladder already fitted, so the contract was satisfied by every existing call
/// and stated by none of them. Passing the raw fills moved
/// `foreground-on-accent` by four steps on the shipped theme, `#fcfcfc` where
/// the TypeScript emits `#f8f8f8`: a near-white either way, and a near-white
/// that had not been solved against anything renderable.
#[must_use]
pub fn on_accent(grounds: &[Oklch], target: f64) -> Oklch {
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
