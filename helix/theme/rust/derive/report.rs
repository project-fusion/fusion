//! What the theme reports about itself: every pair it was checked against, the
//! ones that failed, and the roles a reader cannot tell apart.
//!
//! Two findings, and neither substitutes for the other: contrast is a token
//! against a ground, a collision is two roles against each other. A palette can
//! be perfectly legible and still have three statuses that look like one color.

use crate::derive::emphasis::Emphasis;
use crate::derive::status::StatusColor;
use crate::derive::{perceptual_distance, DerivedToken, COLLISION_DISTANCE};
use crate::intent::PairingRequest;
use crate::model::GROUNDS;
use crate::oklch::{fit_to_gamut, shipped_contrast_ratio, Oklch, GAMUT_STEPS};

/// How a pair came out.
///
/// **Not `Status`**, which this crate already uses for the four status *roles* a
/// theme derives. Two types of that name in one crate is a hazard rather than an
/// inconvenience: `Outcome::Fail` and `Status::default()` are both plausible
/// lines, and the compiler catches the collision only where both are in scope.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Outcome {
    Fail,
    Pass,
    /// **Not a softer [`Outcome::Fail`].** It means the pair was never measured,
    /// which a reader has to be able to tell from a pair that was measured and
    /// passed. Folding the two together is how a guarantee decays into a claim
    /// about the pairs that happened to be easy.
    Unverifiable,
}

/// One pair, measured or not.
#[derive(Clone, Debug, PartialEq)]
pub struct Pairing {
    pub background: String,
    pub foreground: String,
    /// Absent when the pair was never measured, because there was no ground to
    /// measure against.
    pub ratio: Option<f64>,
    pub status: Outcome,
    /// The ratio this pair had to reach. Recorded rather than inferred from the
    /// theme, because a focus ring answers to WCAG 1.4.11 at 3:1 while text
    /// answers to `contrast_target`, and a reader of one row should not have to
    /// know which kind it is looking at.
    pub target: f64,
}

/// Measures every requested pair, **whatever the outcome**.
///
/// A pair naming a token this theme does not emit is [`Outcome::Unverifiable`]
/// rather than dropped, which matters the moment a caller supplies pairings
/// against their own token set: a pair silently missing from the results is how
/// a guarantee becomes a claim about the pairs that happened to be easy.
#[must_use]
pub fn pairings(requests: &[PairingRequest], tokens: &[DerivedToken]) -> Vec<Pairing> {
    let value = |name: &str| {
        tokens
            .iter()
            .find(|token| token.name == name)
            .map(|token| token.value)
    };
    /* A ground the model marks unbounded cannot be measured against, whatever
    the theme: what sits behind a media surface is the media. */
    let unbounded = |name: &str| {
        GROUNDS
            .iter()
            .any(|ground| ground.name == name && !ground.bounded)
    };

    requests
        .iter()
        .map(|request| {
            let ink = value(&request.foreground);
            let ground = value(&request.background);
            let (Some(ink), Some(ground)) = (ink, ground) else {
                return unverifiable(request);
            };
            if unbounded(&request.background) {
                return unverifiable(request);
            }
            let ratio = shipped_contrast_ratio(
                fit_to_gamut(ink, GAMUT_STEPS),
                fit_to_gamut(ground, GAMUT_STEPS),
            );
            Pairing {
                background: request.background.clone(),
                foreground: request.foreground.clone(),
                ratio: Some(ratio),
                status: if ratio < request.target {
                    Outcome::Fail
                } else {
                    Outcome::Pass
                },
                target: request.target,
            }
        })
        .collect()
}

fn unverifiable(request: &PairingRequest) -> Pairing {
    Pairing {
        background: request.background.clone(),
        foreground: request.foreground.clone(),
        ratio: None,
        status: Outcome::Unverifiable,
        target: request.target,
    }
}

/// The failures, rendered.
///
/// Read off [`pairings`] rather than measured again, so the sentence and the row
/// can never disagree about what happened.
#[must_use]
pub fn violations(pairings: &[Pairing]) -> Vec<String> {
    pairings
        .iter()
        .filter(|pairing| pairing.status == Outcome::Fail)
        .map(|pairing| {
            format!(
                "{} on {}: {}:1 below target {}:1",
                pairing.foreground,
                pairing.background,
                /* `toFixed(2)` in the TypeScript, which rounds half away from
                zero where Rust's `{:.2}` rounds half to even. It cannot show
                here: a ratio landing exactly on a half-hundredth would need the
                bisection to terminate on one, and this is a sentence for a
                reader either way. Written as the same two decimals so the two
                engines' output can be diffed at all. */
                pairing
                    .ratio
                    .map_or_else(|| "?".to_owned(), |ratio| format!("{ratio:.2}")),
                pairing.target,
            )
        })
        .collect()
}

/// Roles against each other rather than against a ground.
///
/// Every pair once, which is what the index comparison is for.
#[must_use]
pub fn collisions(primary: &Emphasis, accent: &Emphasis, statuses: &[StatusColor]) -> Vec<String> {
    let roles: Vec<(&str, Oklch)> = std::iter::once(("primary", primary.raw))
        .chain(std::iter::once(("accent", accent.raw)))
        .chain(statuses.iter().map(|status| (status.name, status.color)))
        .collect();

    let mut found = Vec::new();
    for (index, (name_a, color_a)) in roles.iter().enumerate() {
        for (name_b, color_b) in &roles[index + 1..] {
            let distance = perceptual_distance(
                fit_to_gamut(*color_a, GAMUT_STEPS),
                fit_to_gamut(*color_b, GAMUT_STEPS),
            );
            if distance < COLLISION_DISTANCE {
                found.push(format!(
                    "{name_a} and {name_b} are {distance:.3} apart in OKLab, below \
                     {COLLISION_DISTANCE}, so a reader cannot reliably tell them apart"
                ));
            }
        }
    }
    found
}
