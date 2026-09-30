//! The neutral inks: the text on the page, the quiet text beside it, and the
//! line that separates a surface from what is behind it.
//!
//! Three lines in the TypeScript and a phase all the same, because each one
//! answers to a different target and the reason for each target is the whole of
//! what this phase decides.

use crate::derive::solve::solve_against;
use crate::derive::surfaces::Surfaces;
use crate::derive::Cast;
use crate::oklch::{lightness_for_contrast, shipped_contrast_ratio, Oklch, CONTRAST_STEPS};

/// What the page is written in.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NeutralInks {
    /// The line between a surface and its neighbor.
    pub border: Oklch,
    /// Body text.
    pub foreground: Oklch,
    /// Text that is deliberately quieter and still has to be read.
    pub muted: Oklch,
}

/// Solves the three against the page ladder.
///
/// **`foreground` is the strongest ink the neutral has**, its end on the side
/// away from the page: black on a light page, white on a dark one, which is
/// what the shipped stylesheet writes, `neutral-1000` and `neutral-0`. It was
/// solved at 1.6 times the target, which aims at a ratio and lands on a gray:
/// from `brand: '#2358e8'` and the default 4.5, `#4c5057` in light and
/// `#a2a5ad` in dark, and every heading on the page read as muted (#422). A
/// reader expects body text to be the darkest thing the theme writes, and the
/// target is a floor, which is what `muted` answers to.
///
/// **Two figures, and the TypeScript recorded a reason for neither.** `muted`
/// is solved at the target exactly, and `border` at a flat 1.4 against the
/// page alone rather than against the ladder, so what follows is a reading
/// rather than a record.
///
/// `muted` is the quietest thing that still has to be read, so it is the ink
/// that answers to `contrastTarget`, and body text standing well clear of the
/// floor is what leaves somewhere quieter to stand. That much is consistent
/// with #124, which measured the readable range as holding one quiet step and
/// not two, and is recorded in the model's `NOT_EMITTED`. `border` is neither
/// text nor a control boundary, so no WCAG figure applies to it at all, which
/// is presumably why 1.4 is a number rather than a citation: the three places
/// this engine *does* cite one all say 3:1 under 1.4.11 and say so out loud.
///
/// The numbers themselves are asserted against the oracle, so a reader who
/// disagrees with the reading can still rely on the behavior.
///
/// The inverse pair still solves its ink at 1.6 times the target, which is
/// what the shipped stylesheet's `neutral-50` on `neutral-900` comes to.
#[must_use]
pub fn neutral_inks(surfaces: Surfaces, neutral: Cast, contrast_target: f64) -> NeutralInks {
    let grounds = surfaces.solved_against();
    NeutralInks {
        border: lightness_for_contrast(
            neutral.chroma,
            neutral.hue,
            surfaces.background(),
            1.4,
            None,
            CONTRAST_STEPS,
        ),
        foreground: strongest(&grounds, neutral),
        muted: solve_against(&grounds, neutral, contrast_target),
    }
}

/// Black or white, whichever stands further from every ground, judged by the
/// worst of the grounds as `solve_against` judges its candidates.
fn strongest(grounds: &[Oklch], neutral: Cast) -> Oklch {
    let worst = |ink: Oklch| {
        grounds
            .iter()
            .map(|ground| shipped_contrast_ratio(ink, *ground))
            .fold(f64::INFINITY, f64::min)
    };
    /* No chroma at either end, where there is none to show: a cast at
    lightness 0 or 1 is outside the gamut, and fitting it takes the chroma off
    anyway. The hue is kept only so the value reads as the neutral's. */
    let end = |lightness| Oklch {
        chroma: 0.0,
        hue: neutral.hue,
        lightness,
    };
    let darkest = end(0.0);
    let lightest = end(1.0);
    if worst(darkest) >= worst(lightest) {
        darkest
    } else {
        lightest
    }
}
