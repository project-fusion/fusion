//! The neutral inks: the text on the page, the quiet text beside it, and the
//! line that separates a surface from what is behind it.
//!
//! Three lines in the TypeScript and a phase all the same, because each one
//! answers to a different target and the reason for each target is the whole of
//! what this phase decides.

use crate::derive::solve::solve_against;
use crate::derive::surfaces::Surfaces;
use crate::derive::Cast;
use crate::oklch::{lightness_for_contrast, Oklch, CONTRAST_STEPS};

/// What the page is written in.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NeutralInks {
    /// The line between a surface and its neighbour.
    pub border: Oklch,
    /// Body text.
    pub foreground: Oklch,
    /// Text that is deliberately quieter and still has to be read.
    pub muted: Oklch,
}

/// Solves the three against the page ladder.
///
/// **`foreground` is solved at 1.6 times the target rather than at it**, which
/// is the one figure here that is not a specification. `muted` is the ink that
/// answers to `contrastTarget` exactly, being the quietest thing on the page
/// that still has to be read; body text sits well clear of the floor so there is
/// somewhere quieter to stand that is still legible. Solving both at the same
/// number would leave the two indistinguishable, which is #124's finding one
/// step earlier: the readable range holds one quiet step, not two.
///
/// **`border` answers to 1.4 and to no specification at all.** WCAG has nothing
/// to say about a hairline between two surfaces: it is not text and it is not a
/// control boundary, so 1.4 is a number chosen to be visible without drawing the
/// eye, and it is solved against the page alone rather than the ladder, a border
/// being drawn on the ground it separates rather than on every ground at once.
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
        foreground: solve_against(&grounds, neutral, contrast_target * 1.6),
        muted: solve_against(&grounds, neutral, contrast_target),
    }
}
