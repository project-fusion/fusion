//! The quiet ink a tone is written in, which is one step and not two.
//!
//! **A tone's own ink is already at the floor.** `primary`, `accent` and the four
//! statuses are each solved to clear the contrast target and no further, so a
//! quieter version of one cannot do what `foreground-muted` does to
//! `foreground` and give up contrast: there is none to give. What it can give up
//! is color. The quiet ink is the tone's hue at half its chroma, with the
//! lightness solved again so it still clears the same target on every page
//! surface: as readable as the tone, and saying so less loudly.
//!
//! **One step, because the readable range holds one.** #124 solved two quiet
//! neutral inks against every light ground and found they land three hundredths
//! apart, which is why `foreground-subtle` is not emitted. A tone has less room
//! than the neutral ink, not more, so a second quiet tone would be the engine
//! claiming to have separated what it measured as inseparable.

use crate::derive::{Cast, Deriving};
use crate::oklch::Oklch;

/// How much of a tone's chroma its quiet ink keeps.
///
/// Half: enough to stay the tone at a glance, which a quiet danger has to, and
/// little enough that a paragraph of it does not read as an alarm.
pub const QUIET: f64 = 0.5;

/// A tone's ink, quietened and solved back to the floor.
#[must_use]
pub fn quiet(ink: Oklch, ctx: &Deriving) -> Oklch {
    ctx.solve_for_all(
        Cast {
            chroma: ink.chroma * QUIET,
            hue: ink.hue,
        },
        ctx.contrast_target,
    )
}
