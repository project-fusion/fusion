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
        seeds: seeds(
            &resolved,
            &derived.primary,
            &derived.accent,
            derived.neutral,
        ),
        tokens: derived.tokens,
        violations: violations(&pairings),
        intent: resolved,
    })
}

#[cfg(test)]
mod tests {
    use super::derive_theme;
    use crate::derive::resolve::IntentError;
    use crate::intent::{Background, Color, From, Neutral, Relation, Scheme, Seed, ThemeIntent};

    fn hex(value: &str) -> Color {
        Color::Hex(value.to_owned())
    }

    /// Golden Hour Pools' page: a warm cream, `#F7F2EB`, under an orange brand.
    fn cream() -> ThemeIntent {
        ThemeIntent {
            background: Some(Background {
                dark: None,
                light: Some(hex("#F7F2EB")),
            }),
            ..ThemeIntent::new(hex("#FF6200"))
        }
    }

    fn token<'a>(theme: &'a super::Theme, name: &str) -> &'a crate::derive::DerivedToken {
        theme
            .tokens
            .iter()
            .find(|token| token.name == name)
            .unwrap_or_else(|| panic!("{name} is emitted"))
    }

    #[test]
    fn a_page_given_is_the_page_and_the_surfaces_keep_their_distance_from_it() {
        let theme = derive_theme(&cream()).expect("a cream page derives");
        assert_eq!(token(&theme, "color-background").hex, "#f7f2eb");
        let page = token(&theme, "color-background").value;
        let surface = token(&theme, "color-surface").value;
        /* 0.015 under the page, as 0.985 is under white. */
        assert!((page.lightness - surface.lightness - 0.015).abs() < 0.002);
        /* Pure white for a menu, on any light page. */
        assert_eq!(token(&theme, "color-surface-overlay").hex, "#ffffff");
    }

    #[test]
    fn the_grays_take_the_page_cast_and_every_pair_clears() {
        let theme = derive_theme(&cream()).expect("a cream page derives");
        let surface = token(&theme, "color-surface").value;
        assert!((surface.chroma - 0.011).abs() < 0.002, "{}", surface.chroma);
        assert!((surface.hue - 77.0).abs() < 4.0, "{}", surface.hue);
        assert!(theme.violations.is_empty(), "{:?}", theme.violations);
    }

    #[test]
    fn a_neutral_given_wins_over_the_page_cast() {
        let theme = derive_theme(&ThemeIntent {
            neutral: Some(Neutral {
                chroma: Some(0.0),
                hue: None,
            }),
            ..cream()
        })
        .expect("derives");
        assert!(token(&theme, "color-surface").value.chroma < 0.0005);
    }

    #[test]
    fn a_dark_page_of_its_own_color_carries_light_surfaces_and_clears() {
        let theme = derive_theme(&ThemeIntent {
            background: Some(Background {
                dark: Some(hex("#0B2A33")),
                light: None,
            }),
            scheme: Some(Scheme::Dark),
            ..ThemeIntent::new(hex("#2DD4BF"))
        })
        .expect("a deep teal page derives");
        assert_eq!(token(&theme, "color-background").hex, "#0b2a33");
        assert!(
            token(&theme, "color-surface").value.lightness
                > token(&theme, "color-background").value.lightness
        );
        assert!(theme.violations.is_empty(), "{:?}", theme.violations);
    }

    #[test]
    fn a_page_no_ink_can_be_read_on_is_refused_with_why() {
        let refused = derive_theme(&ThemeIntent {
            background: Some(Background {
                dark: None,
                light: Some(hex("#333333")),
            }),
            ..ThemeIntent::new(hex("#FF6200"))
        });
        let Err(IntentError::OutOfRange { label, message }) = refused else {
            panic!("a dark page for the light scheme is refused, got {refused:?}")
        };
        assert_eq!(label, "background.light");
        assert!(message.contains("black, the strongest"), "{message}");
    }

    #[test]
    fn a_theme_with_no_brand_is_ink_and_its_fill_carries_the_page() {
        let theme = derive_theme(&ThemeIntent::ink()).expect("ink derives");
        let primary = token(&theme, "color-primary").value;
        assert!((primary.lightness - 0.21).abs() < 0.005, "{primary:?}");
        assert!(primary.chroma < 0.0005, "{primary:?}");
        assert_eq!(
            token(&theme, "color-primary-surface").hex,
            token(&theme, "color-primary").hex
        );
        assert_eq!(token(&theme, "color-foreground-on-primary").hex, "#ffffff");
        assert!(theme.violations.is_empty(), "{:?}", theme.violations);
    }

    #[test]
    fn ink_turns_over_in_the_dark_and_the_statuses_keep_their_label() {
        let theme = derive_theme(&ThemeIntent {
            scheme: Some(Scheme::Dark),
            ..ThemeIntent::ink()
        })
        .expect("ink derives in the dark");
        assert!(token(&theme, "color-primary-surface").value.lightness > 0.9);
        assert_eq!(token(&theme, "color-foreground-on-primary").hex, "#000000");
        assert_eq!(token(&theme, "color-foreground-on-accent").hex, "#000000");
        /* A danger fill is dark in both modes, so its label stays light while
        the ink's turns dark beside it. */
        assert!(token(&theme, "color-foreground-on-status").value.lightness > 0.9);
        assert!(theme.violations.is_empty(), "{:?}", theme.violations);
    }

    #[test]
    fn ink_writes_no_brand_seed_and_its_statuses_keep_their_chroma() {
        let ink = derive_theme(&ThemeIntent::ink()).expect("ink derives");
        assert!(ink
            .seeds
            .iter()
            .all(|(name, _)| !name.starts_with("seed-brand")));
        assert!(ink
            .seeds
            .iter()
            .all(|(name, _)| !name.starts_with("seed-accent")));
        let blue = derive_theme(&ThemeIntent::new(hex("#3b82f6"))).expect("derives");
        /* As loud as the shipped blue's, which sits near the reference. At the
        floor, a danger would be 0.55 of its chroma, about 0.09 short of this. */
        let chroma = |theme: &super::Theme| token(theme, "color-danger").value.chroma;
        assert!(
            (chroma(&ink) - chroma(&blue)).abs() < 0.01,
            "{} against {}",
            chroma(&ink),
            chroma(&blue)
        );
    }

    #[test]
    fn an_accent_related_to_no_brand_is_refused() {
        let refused = derive_theme(&ThemeIntent {
            accent: Some(Seed::Relation(Relation {
                allowance: None,
                chroma: None,
                from: From::Brand,
                rotate: 180.0,
            })),
            ..ThemeIntent::ink()
        });
        let Err(IntentError::OutOfRange { label, .. }) = refused else {
            panic!("a relation with no brand is refused, got {refused:?}")
        };
        assert_eq!(label, "accent");
    }

    #[test]
    fn a_page_for_the_other_scheme_leaves_this_one_white() {
        let theme = derive_theme(&ThemeIntent {
            background: Some(Background {
                dark: Some(hex("#0B2A33")),
                light: None,
            }),
            ..ThemeIntent::new(hex("#FF6200"))
        })
        .expect("derives");
        assert_eq!(token(&theme, "color-background").hex, "#ffffff");
    }
}
