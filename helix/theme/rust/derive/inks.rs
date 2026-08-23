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
/// **Three figures, and the TypeScript records a reason for none of them.**
/// `foreground` is solved at 1.6 times the target, `muted` at the target
/// exactly, and `border` at a flat 1.4 against the page alone rather than
/// against the ladder. Those are three bare lines with no comment above them,
/// so what follows is a reading rather than a record, and is marked as one
/// because a comment in this repository is usually the second.
///
/// The reading: `muted` is the quietest thing that still has to be read, so it
/// is the ink that answers to `contrastTarget`, and body text standing well
/// clear of the floor is what leaves somewhere quieter to stand. That much is
/// consistent with #124, which measured the readable range as holding one quiet
/// step and not two, and is recorded in the model's `NOT_EMITTED`. `border` is
/// neither text nor a control boundary, so no WCAG figure applies to it at all,
/// which is presumably why 1.4 is a number rather than a citation: the three
/// places this engine *does* cite one all say 3:1 under 1.4.11 and say so out
/// loud.
///
/// **What is worth checking before trusting any of that** is the one thing the
/// port can check: the numbers themselves are asserted against the oracle, so a
/// reader who disagrees with the reading can still rely on the behaviour.
///
/// `1.6` is not unique to `foreground`, which is a fact rather than a reading:
/// the inverse pair uses the same multiplier, so whatever it is for, it is for
/// body text on any ground rather than for the page in particular.
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
