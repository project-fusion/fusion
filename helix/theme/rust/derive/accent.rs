//! The accent, which settles last because it is the only role with nothing to
//! lose.
//!
//! A status hue carries meaning: a reader learns amber for caution once and
//! should not learn it again per product. A brand is a fact the consumer
//! supplied. An accent is a *relationship*, and a relationship whose exact angle
//! nobody specified has room to move where neither of the others does.
//!
//! Measured on the shipped blue, where the complement lands at 80 degrees and
//! `warning` is amber at 75: before this, the two were reported as
//! indistinguishable on every single derivation and no allowance could repair
//! it, because `danger` at 27 and `success` at 155 box in every hue `warning`
//! could have reached.

use crate::derive::resolve::Policy;
use crate::derive::status::{repair_hue, StatusColor};
use crate::derive::{perceptual_distance, Cast, Deriving, COLLISION_DISTANCE};
use crate::intent::{to_oklch, Seed};
use crate::oklch::{fit_to_gamut, Oklch, GAMUT_STEPS};

/// The accent before it settles, and whether it may move at all.
///
/// A pinned accent does not move: a color is a fact. A related one is the
/// brand's own lightness at a rotated hue and at most the brand's chroma, since
/// an accent louder than the thing it accents is a second primary.
///
/// # Panics
///
/// If handed a [`Seed::Color`] that is not a color, which [`resolve`] refuses,
/// so it cannot arrive through one.
///
/// [`resolve`]: crate::derive::resolve::resolve
#[must_use]
pub fn seeded(accent: &Seed, raw_brand: Oklch, policy: Policy) -> (Oklch, bool) {
    match accent {
        Seed::Color(color) => (
            to_oklch(color).expect("resolve refused an unreadable accent"),
            true,
        ),
        Seed::Relation(relation) => (
            Oklch {
                chroma: policy.apply(raw_brand.chroma * relation.chroma.unwrap_or(1.0).min(1.0)),
                hue: (raw_brand.hue + relation.rotate) % 360.0,
                lightness: raw_brand.lightness,
            },
            false,
        ),
    }
}

/// Rotates the accent outward until it clears every role already decided.
///
/// **Against the statuses as well as the brand**, which is the whole reason it
/// goes last: the statuses have spent their own allowances by now, so the accent
/// is moving out of the way of roles that have finished moving.
///
/// An angle of 0 holds the relationship exactly and lets `collisions` report the
/// result, which falls out of the search rather than needing a branch: a bound
/// of zero runs the loop once at step 0 and keeps the hue it was asked for.
#[must_use]
pub fn settle(
    accent: Oklch,
    pinned: bool,
    bound: f64,
    primary_raw: Oklch,
    statuses: &[StatusColor],
    ctx: &Deriving,
) -> Oklch {
    if pinned {
        return accent;
    }
    let decided: Vec<Oklch> = std::iter::once(primary_raw)
        .chain(statuses.iter().map(|status| status.color))
        .collect();

    let hue = repair_hue(accent.hue, bound, |candidate| {
        let solved = ctx.solve_for_all(
            Cast {
                chroma: accent.chroma,
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
    Oklch { hue, ..accent }
}
