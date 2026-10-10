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
    use crate::derive::resolve::{resolve, IntentError};
    use crate::intent::{
        Background, Brand, BrandPair, Color, Font, From, Material, Motion, Neutral, Relation,
        Scheme, Seed, Status, StatusSeed, ThemeIntent, STATUS_BAND, STATUS_HUE,
    };
    use crate::model::{PAGE_SURFACES, WELL};
    use crate::oklch::{laid_over, shipped_contrast_ratio};

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

    /// A field's text clears the target on the field's well over every
    /// surface of a page of its own color. Solved against the ladder alone,
    /// the quiet ink measured 3.89:1 on the well in a dialog on a #333333 page,
    /// and 4.02:1 to 4.06:1 on the well over the sunken surface of the four
    /// light ones.
    #[test]
    fn a_field_reads_on_every_surface_of_a_page_of_its_own_color() {
        for (scheme, page) in [
            (Scheme::Dark, "#333333"),
            (Scheme::Light, "#f7f2eb"),
            (Scheme::Light, "#e8dcc4"),
            (Scheme::Light, "#d9d9d9"),
            (Scheme::Light, "#bfb39a"),
        ] {
            let background = if scheme == Scheme::Dark {
                Background {
                    dark: Some(hex(page)),
                    light: None,
                }
            } else {
                Background {
                    dark: None,
                    light: Some(hex(page)),
                }
            };
            let theme = derive_theme(&ThemeIntent {
                background: Some(background),
                scheme: Some(scheme),
                ..ThemeIntent::new(hex("#FF6200"))
            })
            .expect("the page derives");
            let foreground = token(&theme, "color-foreground").value;
            for ground in PAGE_SURFACES {
                let well = laid_over(foreground, WELL.percent, token(&theme, ground).value);
                for ink in ["color-foreground", "color-foreground-muted"] {
                    let ratio = shipped_contrast_ratio(token(&theme, ink).value, well);
                    assert!(
                        ratio >= 4.5,
                        "{page}: {ink} on the well over {ground} is {ratio:.2}:1"
                    );
                }
            }
            assert!(
                theme.violations.is_empty(),
                "{page}: {:?}",
                theme.violations
            );
        }
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

    /// A navy for light and a sky blue for dark, each a color that reads where
    /// it is given.
    fn two_brands() -> Brand {
        Brand::Each(BrandPair {
            dark: Some(hex("#7dd3fc")),
            light: Some(hex("#1e3a8a")),
        })
    }

    #[test]
    fn a_brand_that_reads_is_kept_as_its_ink_and_its_fill() {
        let theme = derive_theme(&ThemeIntent::new(hex("#1e3a8a"))).expect("navy derives");
        assert_eq!(token(&theme, "color-primary").hex, "#1e3a8a");
        assert_eq!(token(&theme, "color-primary-surface").hex, "#1e3a8a");
        assert!(theme.violations.is_empty(), "{:?}", theme.violations);
    }

    #[test]
    fn a_brand_that_does_not_read_is_still_solved() {
        /* Fusion's blue is 3.68 to 1 on white, under the 4.5 the ink needs, so
        the ink and the fill are both solved darker. */
        let theme = derive_theme(&ThemeIntent::new(hex("#3b82f6"))).expect("blue derives");
        assert_ne!(token(&theme, "color-primary").hex, "#3b82f6");
        assert_ne!(token(&theme, "color-primary-surface").hex, "#3b82f6");
        assert!(theme.violations.is_empty(), "{:?}", theme.violations);
    }

    #[test]
    fn a_brand_for_each_scheme_is_the_brand_each_scheme_takes() {
        let light = derive_theme(&ThemeIntent {
            brand: Some(two_brands()),
            ..ThemeIntent::ink()
        })
        .expect("the light half derives");
        let dark = derive_theme(&ThemeIntent {
            brand: Some(two_brands()),
            scheme: Some(Scheme::Dark),
            ..ThemeIntent::ink()
        })
        .expect("the dark half derives");
        assert_eq!(token(&light, "color-primary").hex, "#1e3a8a");
        assert_eq!(token(&dark, "color-primary").hex, "#7dd3fc");
        assert!(light.violations.is_empty(), "{:?}", light.violations);
        assert!(dark.violations.is_empty(), "{:?}", dark.violations);
    }

    #[test]
    fn a_scheme_the_pair_leaves_out_is_ink() {
        let dark = derive_theme(&ThemeIntent {
            brand: Some(Brand::Each(BrandPair {
                dark: None,
                light: Some(hex("#1e3a8a")),
            })),
            scheme: Some(Scheme::Dark),
            ..ThemeIntent::ink()
        })
        .expect("derives");
        let ink = derive_theme(&ThemeIntent {
            scheme: Some(Scheme::Dark),
            ..ThemeIntent::ink()
        })
        .expect("ink derives");
        assert_eq!(
            token(&dark, "color-primary").hex,
            token(&ink, "color-primary").hex
        );
        assert!(!dark.seeds.iter().any(|(name, _)| name == "seed-brand"));
    }

    #[test]
    fn an_unreadable_half_of_a_pair_is_refused_by_its_own_name() {
        let refused = derive_theme(&ThemeIntent {
            brand: Some(Brand::Each(BrandPair {
                dark: Some(hex("not-a-color")),
                light: Some(hex("#1e3a8a")),
            })),
            ..ThemeIntent::ink()
        });
        let Err(IntentError::Unreadable { label, .. }) = refused else {
            panic!("an unreadable dark brand is refused on a light derive, got {refused:?}")
        };
        assert_eq!(label, "brand.dark");
    }

    #[test]
    fn a_type_motion_or_material_number_outside_its_range_is_refused_by_its_own_name() {
        let refused = |intent: ThemeIntent| {
            derive_theme(&intent)
                .expect_err("the intent is refused")
                .to_string()
        };
        assert_eq!(
            refused(ThemeIntent {
                font: Some(Font {
                    base: Some(0.0),
                    ..Font::default()
                }),
                ..ThemeIntent::ink()
            }),
            "font.base must be positive"
        );
        assert_eq!(
            refused(ThemeIntent {
                motion: Some(Motion {
                    character: None,
                    scale: Some(f64::NAN),
                }),
                ..ThemeIntent::ink()
            }),
            "motion.scale must be a finite number, received NaN"
        );
        assert_eq!(
            refused(ThemeIntent {
                material: Some(Material {
                    blur: None,
                    opacity: Some(2.0),
                }),
                ..ThemeIntent::ink()
            }),
            "material.opacity must be between 0 and 1"
        );
    }

    fn named(namespace: &str) -> ThemeIntent {
        ThemeIntent {
            namespace: Some(namespace.to_owned()),
            ..ThemeIntent::ink()
        }
    }

    #[test]
    fn a_namespace_that_is_not_a_token_prefix_is_refused_with_what_was_given() {
        let refused = |namespace: &str| {
            derive_theme(&named(namespace))
                .expect_err("the namespace is refused")
                .to_string()
        };
        assert_eq!(
            refused("--my"),
            "namespace is not a token prefix of ASCII letters, digits, hyphens, and \
             underscores with no hyphen at either end, received \"--my\""
        );
        /* Empty, a hyphen at either end, characters a custom property name
        cannot hold, and a letter outside ASCII. The block carried each of these
        as it was given. */
        for namespace in ["", "-my", "my-", "a b;}", "my.brand", "café"] {
            let message = refused(namespace);
            assert!(
                message.starts_with("namespace is not a token prefix")
                    && message.ends_with(&format!("received {namespace:?}")),
                "{namespace:?}: {message}"
            );
        }
    }

    #[test]
    fn a_namespace_of_name_characters_prefixes_every_token() {
        for namespace in ["acme", "my-brand", "my_brand", "3m", "Acme2"] {
            assert!(
                resolve(&named(namespace)).is_ok(),
                "{namespace:?} is refused"
            );
        }
        let theme = derive_theme(&named("my-brand")).expect("a hyphenated namespace derives");
        let css = crate::css::to_css(&theme, ":root");
        assert!(
            css.contains("\n  --my-brand-color-background: #ffffff;"),
            "{css}"
        );
        assert!(!css.contains("--helix-"), "{css}");
    }

    /// Ink with one status given a hue.
    fn hued(name: &str, hue: f64) -> ThemeIntent {
        let seed = Some(StatusSeed::Hue(Some(hue)));
        let mut status = Status::default();
        match name {
            "danger" => status.danger = seed,
            "info" => status.info = seed,
            "success" => status.success = seed,
            _ => status.warning = seed,
        }
        ThemeIntent {
            status: Some(status),
            ..ThemeIntent::ink()
        }
    }

    #[test]
    fn each_status_band_holds_the_hue_that_ships_and_no_two_overlap() {
        for (at, (from, to)) in STATUS_BAND.iter().enumerate() {
            assert!((from..=to).contains(&&STATUS_HUE[at]), "{at}");
            for (start, end) in STATUS_BAND.iter().skip(at + 1) {
                assert!(to < start || end < from, "{from}-{to} and {start}-{end}");
            }
        }
    }

    #[test]
    fn a_status_hue_outside_its_band_is_refused_with_the_band() {
        let refused = |name: &str, hue: f64| {
            derive_theme(&hued(name, hue))
                .expect_err("the hue is refused")
                .to_string()
        };
        assert_eq!(
            refused("danger", 140.0),
            "status.danger.hue must be between 15 and 40 degrees, the reds from crimson to \
             red-orange, received 140"
        );
        /* A pink and an orange either side of danger, a purple read around the
        circle, a yellow-green, a teal, and a violet. */
        for (name, hue) in [
            ("danger", 5.0),
            ("danger", 42.0),
            ("danger", 999.0),
            ("warning", 120.0),
            ("success", 190.0),
            ("info", 300.0),
        ] {
            let message = refused(name, hue);
            assert!(
                message.starts_with(&format!("status.{name}.hue must be between"))
                    && message.ends_with(&format!(", received {hue}")),
                "{message}"
            );
        }
        assert_eq!(
            refused("info", f64::NAN),
            "status.info.hue must be a finite number, received NaN"
        );
    }

    #[test]
    fn a_status_hue_inside_its_band_is_the_hue_it_takes() {
        for (name, hue) in [
            ("danger", 15.0),
            ("danger", 40.0),
            ("danger", 387.0),
            ("danger", -340.0),
            ("info", 204.0),
            ("info", 277.0),
            ("success", 126.0),
            ("success", 170.0),
            ("warning", 45.0),
            ("warning", 102.0),
        ] {
            assert!(
                resolve(&hued(name, hue)).is_ok(),
                "{name} at {hue} is refused"
            );
        }
        let crimson = derive_theme(&ThemeIntent {
            status: Some(Status {
                allowance: Some(0.0),
                danger: Some(StatusSeed::Hue(Some(20.0))),
                ..Status::default()
            }),
            ..ThemeIntent::ink()
        })
        .expect("a crimson danger derives");
        let hue = token(&crimson, "color-danger").value.hue;
        assert!((hue - 20.0).abs() < 1.0, "{hue}");
    }
}
