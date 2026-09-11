//! The whole derivation, in the order the phases depend on each other.

use crate::derive::report::{collisions, pairings, violations, Pairing};
use crate::derive::resolve::{resolve, IntentError, Resolved};
use crate::derive::seeds::seeds;
use crate::derive::tokens::derive_tokens;
use crate::derive::DerivedToken;
use crate::intent::ThemeIntent;

/// A derived theme: what it emits, and what it found while deriving it.
#[derive(Clone, Debug, PartialEq)]
pub struct Theme {
    /// Roles too close to tell apart, measured as perceptual distance rather
    /// than contrast. Empty means every role is distinguishable.
    ///
    /// A different finding from `violations` and neither substitutes for the
    /// other: contrast is a token against a ground, a collision is two roles
    /// against each other.
    pub collisions: Vec<String>,
    /// The intent with every default filled in, so a consumer can read back what
    /// they got rather than what they asked for.
    pub intent: Resolved,
    /// Every pair the theme was checked against, whatever the outcome.
    ///
    /// Structured rather than a list of sentences, which is what lets a consumer
    /// program against it, lets a builder render it, and stops an unmeasured pair
    /// from being invisible to anybody who only reads `violations`.
    pub pairings: Vec<Pairing>,
    /// The seed values a consumer must write for `helix/styles` to re-derive the
    /// halves this engine does not compute.
    pub seeds: Vec<(String, String)>,
    pub tokens: Vec<DerivedToken>,
    /// Pairings that failed their contrast target, pinned values included.
    /// Rendered from `pairings`, and not the only record of a result.
    pub violations: Vec<String>,
}

/// Derives a theme from an intent.
///
/// # Errors
///
/// [`IntentError`] when the intent would produce a palette that reports itself
/// clean without having been measured. See [`resolve`].
pub fn derive_theme(intent: &ThemeIntent) -> Result<Theme, IntentError> {
    let resolved = resolve(intent)?;
    let derived = derive_tokens(&resolved);
    let pairings = pairings(&resolved.pairings, &derived.tokens);

    Ok(Theme {
        collisions: collisions(
            &derived.primary,
            resolved.accent.as_ref().map(|_| &derived.accent),
            &derived.statuses,
        ),
        pairings: pairings.clone(),
        seeds: seeds(&resolved, &derived.primary),
        tokens: derived.tokens,
        violations: violations(&pairings),
        intent: resolved,
    })
}
