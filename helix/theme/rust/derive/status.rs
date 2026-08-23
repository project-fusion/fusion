//! The four statuses: hue fixed by meaning, everything else derived.
//!
//! **Chroma follows the palette and hue does not**, which is the distinction the
//! whole phase turns on. A status that rotates with the brand is a warning a
//! reader re-learns per product, and that stays refused. A status that ignores
//! how loud the palette around it is has a different problem: against a muted
//! brand, danger measured six times the chroma of primary, which is a vivid red
//! screaming on a near-grey page.
//!
//! **`allowance` is the repair rather than the report.** A red brand beside a
//! red danger carries no information, so a status may rotate away, within its
//! meaning, until it is distinguishable.

use crate::derive::{perceptual_distance, Cast, Deriving, COLLISION_DISTANCE};
use crate::intent::{status_seed, to_oklch, Status, StatusSeed, STATUS_NAMES};
use crate::oklch::{fit_to_gamut, Oklch, GAMUT_STEPS};

/// The chroma a brand is measured against for loudness: the shipped seed's.
///
/// A reference rather than a maximum. What matters is whether this brand is
/// quieter or louder than an ordinary one, and the one that ships is the only
/// ordinary one this file knows about.
pub const REFERENCE_CHROMA: f64 = 0.19;

/// How far a status may be quieted before it stops reading as itself.
///
/// Measured as a fraction of its own chroma rather than an absolute, because the
/// four differ: amber can hold less than red at the lightness a status sits at.
pub const STATUS_FLOOR: f64 = 0.55;

/// Widens outward from a hue until a candidate clears, and gives up rather than
/// settling for a half-turn.
///
/// **Both directions at each step rather than a direction chosen up front.**
/// Away from one role can be toward another, so the only honest search is to
/// widen outward and take the first hue that clears everything.
///
/// **A repair either works or it does not happen.** The first version kept
/// whatever hue it had reached when the allowance ran out, which is the worst of
/// both outcomes: with the shipped blue, `warning` walked the full forty degrees
/// to 115, came to rest in the greens, and still collided. A warning that has
/// stopped looking like a warning *and* is still indistinguishable is worse than
/// one that only collides, and `collisions` is there to report the failure
/// honestly.
///
/// Its own function because the order inside it is a fidelity detail no output
/// can show: `hue + step` is tried before `hue - step`, and that only decides
/// anything when both clear at the same step, which none of the eleven themes
/// happens to do. Taking a predicate is what makes it assertable at all.
#[must_use]
pub fn repair_hue(hue: f64, allowance: f64, clears: impl Fn(f64) -> bool) -> f64 {
    let mut step = 0.0_f64;
    while step <= allowance {
        let tries: &[f64] = if step == 0.0 {
            &[hue]
        } else {
            &[hue + step, hue - step]
        };
        for candidate in tries {
            let wrapped = (candidate + 360.0) % 360.0;
            if clears(wrapped) {
                return wrapped;
            }
        }
        step += 1.0;
    }
    /* Nothing inside the bound clears, so the hue asked for stands and the
    collision is reported rather than a half-rotation shipped that is neither the
    convention nor distinguishable. */
    hue
}

/// One resolved status.
#[derive(Clone, Debug, PartialEq)]
pub struct StatusColor {
    pub color: Oklch,
    pub name: &'static str,
    /// True when the consumer supplied a colour outright, which is a fact rather
    /// than a derivation and is reported as `pinned`.
    pub pinned: bool,
}

/// Resolves the four, in declaration order.
///
/// **The order is part of the answer.** A status rotated clear of the brand can
/// land on the status decided before it: with the shipped blue, `warning` moved
/// to 47 to clear an accent at 80 and came to rest 20 degrees from `danger`.
/// Repairing against a fixed set answers one collision by creating another, so
/// the set accumulates and the order is the declared one, which makes it
/// deterministic.
///
/// **Not against the accent**, which has not been decided yet. The accent is the
/// role that yields, so a status must not spend its allowance getting out of the
/// way of something that is about to move itself.
///
/// # Panics
///
/// If [`STATUS_NAMES`] and [`status_seed`] disagree about which statuses exist,
/// which is a contradiction inside one module rather than anything a caller can
/// cause.
#[must_use]
pub fn statuses(
    intent: &Status,
    brand_chroma: f64,
    primary_raw: Oklch,
    ctx: &Deriving,
) -> Vec<StatusColor> {
    /* **20 by default, not 0**, so the shipped palette does not report a
    collision it has the means to fix: `primary` and `info` are both blue on the
    Fusion brand, and twenty degrees moves `info` by three, which is nowhere near
    enough to stop reading as informational and exactly enough to be told apart.

    What 20 does not reach is a brand that *is* a status colour. Clearing a
    collision between two hues that start coincident is a chord across the hue
    circle, so the rotation it takes scales inversely with chroma. That is the
    honest trade rather than an oversight: the allowance is a licence to bend a
    convention and 40 degrees of amber is not amber. */
    let allowance = intent.allowance.unwrap_or(20.0);
    let harmony = intent.harmony.unwrap_or(0.5);

    let mut resolved: Vec<StatusColor> = Vec::with_capacity(STATUS_NAMES.len());
    let mut settled: Vec<Oklch> = Vec::with_capacity(STATUS_NAMES.len());

    for name in STATUS_NAMES {
        /* A colour pins the status outright; a hue nudges it within the meaning
        it already carries. */
        if let Some(StatusSeed::Color(color)) = intent.seed(name) {
            if let Some(pinned) = to_oklch(color) {
                settled.push(pinned);
                resolved.push(StatusColor {
                    color: pinned,
                    name,
                    pinned: true,
                });
                continue;
            }
        }

        let (default_hue, own_chroma) = status_seed(name).expect("a declared status has a seed");
        let hue = match intent.seed(name) {
            Some(StatusSeed::Hue(Some(hue))) => *hue,
            _ => default_hue,
        };

        /* **Its own chroma, pulled toward the palette's loudness, never the
        brand's outright.** Taking the brand's gave a grey danger on a muted
        brand; ignoring the brand entirely gave the opposite, danger measuring six
        times primary's chroma on the same palette, which is a red that shouts.

        So the multiplier walks from 1 toward how loud this brand is against a
        normal one, as far as `harmony` asks, and is clamped at both ends: never
        above the status's own chroma, that already being what its hue can hold,
        and never below the floor, a danger too quiet to read as danger being
        worse than a loud one. */
        let loudness = brand_chroma / REFERENCE_CHROMA;
        let pull = 1.0 - harmony + harmony * loudness;
        /* `max` then `min`, not `clamp`, which clippy suggests. The TypeScript
        writes `Math.min(1, Math.max(FLOOR, pull))` and this is that shape; the
        two agree on every value that can reach here, and matching the source is
        worth more in a port than the shorter spelling. */
        #[allow(clippy::manual_clamp)]
        let chroma = ctx.policy.apply(own_chroma) * pull.max(STATUS_FLOOR).min(1.0);

        let mut resolved_hue = hue;
        if allowance > 0.0 {
            /* **Against the brand and against the statuses already settled.**
            Deliberately not against the accent, which has not been decided yet:
            the accent is the role that yields, so a status must not spend its
            allowance getting out of the way of something about to move itself. */
            let decided: Vec<Oklch> = std::iter::once(primary_raw)
                .chain(settled.iter().copied())
                .collect();
            resolved_hue = repair_hue(hue, allowance, |candidate| {
                let solved = ctx.solve_for_all(
                    Cast {
                        chroma,
                        hue: candidate,
                    },
                    ctx.contrast_target,
                );
                decided.iter().all(|role| {
                    perceptual_distance(
                        fit_to_gamut(solved, GAMUT_STEPS),
                        fit_to_gamut(*role, GAMUT_STEPS),
                    ) >= COLLISION_DISTANCE
                })
            });
        }

        let color = ctx.solve_for_all(
            Cast {
                chroma,
                hue: resolved_hue,
            },
            ctx.contrast_target,
        );
        settled.push(color);
        resolved.push(StatusColor {
            color,
            name,
            pinned: false,
        });
    }

    resolved
}
