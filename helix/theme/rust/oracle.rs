//! The engine held to what it answered.
//!
//! **This is a snapshot, not a differential check, and the difference is worth
//! stating plainly.** `oracle.json` holds what the TypeScript engine answered,
//! and that engine is now deleted. So these tests prove that nothing has changed
//! since somebody last looked, rather than that the answers are right.
//!
//! That is still worth having: both functions here bisect, so agreement on
//! intent is not agreement on output, and a last-place difference in one channel
//! moves a byte, which moves the luminance, which moves the side of 4.5 the
//! search lands on. A regression of that shape is invisible to a type checker
//! and to a reviewer, and this catches it.
//!
//! `bless.rs` is what rewrites the file, deliberately awkwardly.
//!
//! **`serde_json` must keep `float_roundtrip`**, which `Cargo.toml` says beside
//! the dependency. Without it the parser takes a fast path that is not correctly
//! rounded and reads the oracle's own numbers an ulp out, so the harness
//! corrupts its reference and reports the port for it.
//!
//! The port is bit-exact almost everywhere. With the parser correct, measured:
//!
//! ```text
//! rendered hex          0 of 480 differ
//! gamut membership      0 of 480 differ
//! fitted chroma         0 of 480 differ
//! relative luminance    0 of 480 differ
//! shipped luminance     0 of 480 differ
//! contrast ratio        0 of 300 differ
//! shipped contrast      0 of 300 differ
//! solved lightness      0 of 405 differ
//! search emitted hex    0 of 405 differ
//! perceptual distance   0 of 240 differ
//! parsed hex            6 of  45 differ, worst by 5.55e-17 (macOS)
//!                       7 of  45 differ, worst by 8.53e-14 (Linux)
//! ```
//!
//! So everything is asserted to the bit except the three components
//! `hex_to_oklch` returns, which go through `cbrt` and `atan2` and are the only
//! place the two libms actually part company. That one tolerance carries its
//! measurement; every other assertion is exact and stays exact, which is what
//! makes a future regression in the solver visible rather than absorbed.

use serde_json::Value;

use crate::css::to_css;
use crate::derive::accent::{seeded, settle};
use crate::derive::emphasis::emphasis;
use crate::derive::inks::neutral_inks;
use crate::derive::marks::walk_outward;
use crate::derive::report::Outcome;
use crate::derive::resolve::{brand_and_neutral, default_pairings, resolve, Policy};
use crate::derive::solve::solve_against;
use crate::derive::status::{repair_hue, statuses};
use crate::derive::surfaces::{ladder, surfaces};
use crate::derive::theme::derive_theme;
use crate::derive::tokens::derive_tokens;
use crate::derive::{perceptual_distance, token, Cast, DerivedToken, Deriving, Origin};
use crate::intent::{
    is_relation, status_seed, to_oklch, Character, Chroma, Color, Floating, Font, From, Material,
    Mechanism, Motion, Relation, Scheme, Seed, Separation, Status, StatusSeed, ThemeIntent, Weight,
    STATUS_CHROMA, STATUS_HUE, STATUS_NAMES,
};
use crate::model::{GROUNDS, INKS};
use crate::oklch::{
    contrast_ratio, fit_to_gamut, hex_to_oklch, is_out_of_gamut, lightness_for_contrast,
    oklch_to_hex, relative_luminance, shipped_contrast_ratio, shipped_luminance, Oklch,
    CONTRAST_STEPS, GAMUT_STEPS,
};

/// Exact. Everything that can agree to the bit is held to it.
const EXACT: f64 = 0.0;

/// The one place two libms genuinely part company: `hex_to_oklch` goes through
/// `cbrt` and `atan2`, and a few of 45 components come back a last place out.
///
/// **How far out depends on the libm, and 1e-15 was measured on one of them.**
/// macOS gives 6 of 45, worst by 5.55e-17. Linux gives 7 of 45, worst by
/// 8.53e-14, about fifteen hundred times further, and the tolerance written
/// from the macOS figure failed there every time. Nobody saw it because
/// `verify` had never completed in CI, which is 261.
///
/// 1e-12 covers both with room, and is the same figure `check-wasm.mjs` already
/// carries for the same reason: `wasm32` takes Rust's own libm rather than the
/// host's, so it is a third answer to the same three functions. Still nine
/// orders below the byte those components are rounded into, and every other
/// assertion here stays exact, so a regression in the solver is still visible
/// rather than absorbed.
const PARSE_TOLERANCE: f64 = 1e-12;

fn oracle() -> Value {
    serde_json::from_str(include_str!("oracle.json")).expect("oracle.json is valid JSON")
}

fn number(value: &Value, key: &str) -> f64 {
    value[key]
        .as_f64()
        .unwrap_or_else(|| panic!("`{key}` is a number"))
}

fn color(value: &Value) -> Oklch {
    Oklch {
        chroma: number(value, "chroma"),
        hue: number(value, "hue"),
        lightness: number(value, "lightness"),
    }
}

/// Reports the worst disagreement rather than the first, so one run says how far
/// apart the two engines are instead of only that they are.
struct Divergence {
    count: usize,
    worst: f64,
    where_at: String,
}

impl Divergence {
    fn new() -> Self {
        Self {
            count: 0,
            worst: 0.0,
            where_at: String::new(),
        }
    }

    fn check(&mut self, mine: f64, theirs: f64, at: &str) {
        if mine.to_bits() == theirs.to_bits() {
            return;
        }
        self.count += 1;
        let apart = (mine - theirs).abs();
        /* **A difference that is not a number is not a small difference.**
        `apart >= self.worst` on its own is not enough: `NaN >= 0.0` is false, so
        a `NaN` on either side leaves `worst` at zero and the assert below
        passes, certifying agreement with a value that is not a value. The hole
        makes the suite greener rather than redder, so nothing else shows it. */
        if !apart.is_finite() {
            self.worst = f64::INFINITY;
            self.where_at =
                format!("{at}: rust {mine:?} against typescript {theirs:?}, which is not a number");
            return;
        }
        if apart >= self.worst {
            self.worst = apart;
            self.where_at = format!("{at}: rust {mine:?} against typescript {theirs:?}");
        }
    }

    fn assert(&self, what: &str, total: usize, tolerance: f64) {
        assert!(
            self.worst <= tolerance,
            "{what}: {} of {total} disagree with the TypeScript engine, worst by {:e}.\n  {}",
            self.count,
            self.worst,
            self.where_at
        );
    }
}

#[test]
fn hex_matches_the_typescript_for_every_colour() {
    let data = oracle();
    let colors = data["colors"].as_array().expect("colors is an array");
    let mut wrong = Vec::new();
    for entry in colors {
        let subject = color(entry);
        let mine = oklch_to_hex(subject);
        let theirs = entry["hex"].as_str().expect("hex is a string");
        if mine != theirs {
            wrong.push(format!(
                "{subject:?}: rust {mine} against typescript {theirs}"
            ));
        }
    }
    assert!(
        wrong.is_empty(),
        "{} of {} colors render to a different hex:\n  {}",
        wrong.len(),
        colors.len(),
        wrong.join("\n  ")
    );
}

#[test]
fn gamut_and_luminance_match_for_every_colour() {
    let data = oracle();
    let colors = data["colors"].as_array().expect("colors is an array");
    let mut luminance = Divergence::new();
    let mut shipped = Divergence::new();
    for entry in colors {
        let subject = color(entry);
        assert_eq!(
            is_out_of_gamut(subject),
            entry["outOfGamut"].as_bool().expect("outOfGamut is a bool"),
            "{subject:?} disagrees about the gamut"
        );
        luminance.check(
            relative_luminance(subject),
            number(entry, "luminance"),
            &format!("{subject:?}"),
        );
        shipped.check(
            shipped_luminance(subject),
            number(entry, "shippedLuminance"),
            &format!("{subject:?}"),
        );
    }
    luminance.assert("relative luminance", colors.len(), EXACT);
    shipped.assert("shipped luminance", colors.len(), EXACT);
}

#[test]
fn hex_parses_the_way_the_typescript_parses_it() {
    let data = oracle();
    let hexes = data["hexes"].as_array().expect("hexes is an array");
    let mut apart = Divergence::new();
    for entry in hexes {
        let text = entry["hex"].as_str().expect("hex is a string");
        let mine = hex_to_oklch(text).unwrap_or_else(|| panic!("{text} parses"));
        apart.check(
            mine.chroma,
            number(entry, "chroma"),
            &format!("{text} chroma"),
        );
        apart.check(mine.hue, number(entry, "hue"), &format!("{text} hue"));
        apart.check(
            mine.lightness,
            number(entry, "lightness"),
            &format!("{text} lightness"),
        );
        assert_eq!(
            oklch_to_hex(mine),
            entry["roundTrip"].as_str().expect("roundTrip is a string"),
            "{text} does not round trip the way the TypeScript does"
        );
    }
    apart.assert("hex parsing", hexes.len() * 3, PARSE_TOLERANCE);
}

#[test]
fn contrast_matches_for_every_pair() {
    let data = oracle();
    let pairs = data["pairs"].as_array().expect("pairs is an array");
    let mut plain = Divergence::new();
    let mut shipped = Divergence::new();
    for entry in pairs {
        let subject = color(&entry["color"]);
        let background = color(&entry["background"]);
        let at = format!("{subject:?} on {background:?}");
        plain.check(
            contrast_ratio(subject, background),
            number(entry, "ratio"),
            &at,
        );
        shipped.check(
            shipped_contrast_ratio(subject, background),
            number(entry, "shipped"),
            &at,
        );
    }
    plain.assert("contrast ratio", pairs.len(), EXACT);
    shipped.assert("shipped contrast ratio", pairs.len(), EXACT);
}

/// The one that matters most: a bisection agreeing to the last bit means every
/// branch it took was the same branch.
#[test]
fn the_contrast_search_lands_where_the_typescript_lands() {
    let data = oracle();
    let searches = data["searches"].as_array().expect("searches is an array");
    let mut lightness = Divergence::new();
    let mut wrong_hex = Vec::new();
    for entry in searches {
        let background = color(&entry["background"]);
        let darker = entry["darker"].as_bool();
        let solved = lightness_for_contrast(
            number(entry, "chroma"),
            number(entry, "hue"),
            background,
            number(entry, "target"),
            darker,
            CONTRAST_STEPS,
        );
        let at = format!(
            "chroma {} hue {} on {background:?} at {} ({:?})",
            number(entry, "chroma"),
            number(entry, "hue"),
            number(entry, "target"),
            darker
        );
        lightness.check(solved.lightness, number(entry, "lightness"), &at);
        let mine = oklch_to_hex(solved);
        let theirs = entry["hex"].as_str().expect("hex is a string");
        if mine != theirs {
            wrong_hex.push(format!("{at}: rust {mine} against typescript {theirs}"));
        }
    }
    lightness.assert("solved lightness", searches.len(), EXACT);
    assert!(
        wrong_hex.is_empty(),
        "{} of {} searches emit a different hex:\n  {}",
        wrong_hex.len(),
        searches.len(),
        wrong_hex.join("\n  ")
    );
}

/// The other bisection, which the searches only exercised through their own.
/// A twenty step halving is exactly the shape that agrees on every input anyone
/// thought to try and diverges on the one nobody did, so it is asserted on the
/// same grid rather than inferred from the search that calls it.
#[test]
fn fitting_to_gamut_lands_where_the_typescript_lands() {
    let data = oracle();
    let colors = data["colors"].as_array().expect("colors is an array");
    let mut chroma = Divergence::new();
    let mut wrong_hex = Vec::new();
    for entry in colors {
        let subject = color(entry);
        let fitted = fit_to_gamut(subject, GAMUT_STEPS);
        let at = format!("{subject:?}");
        chroma.check(fitted.chroma, number(&entry["fitted"], "chroma"), &at);
        let mine = oklch_to_hex(fitted);
        let theirs = entry["fitted"]["hex"].as_str().expect("hex is a string");
        if mine != theirs {
            wrong_hex.push(format!("{at}: rust {mine} against typescript {theirs}"));
        }
        assert!(
            !is_out_of_gamut(fitted),
            "{at} is still outside the gamut after fitting"
        );
    }
    chroma.assert("fitted chroma", colors.len(), EXACT);
    assert!(
        wrong_hex.is_empty(),
        "{} of {} fitted colors render to a different hex:\n  {}",
        wrong_hex.len(),
        colors.len(),
        wrong_hex.join("\n  ")
    );
}

#[test]
fn fitting_to_gamut_is_idempotent_on_a_colour_already_inside_it() {
    let inside = Oklch {
        chroma: 0.05,
        hue: 258.0,
        lightness: 0.5,
    };
    assert_eq!(fit_to_gamut(inside, GAMUT_STEPS), inside);
}

#[test]
fn a_hex_that_is_not_one_is_refused_rather_than_carried() {
    /* `##abcdef` is here because the port accepted it while the TypeScript
    returned `NaN`: `trim_start_matches` strips every leading hash and the
    engine being ported strips one. */
    for text in [
        "", "#", "#ab", "#abcd", "nonsense", "#gggggg", "##abcdef", "##abc",
    ] {
        assert!(hex_to_oklch(text).is_none(), "{text} should not parse");
    }
}

/// The model is data, so it cannot drift by a float. It drifts by a typo in a
/// token name, which solves a pair against a ground nobody paints or emits an
/// ink nobody reads, and neither compiler would say a word. Name for name,
/// order included, since the order is what `defaultPairings` walks.
#[test]
fn the_surface_model_is_the_one_the_typescript_declares() {
    let data = oracle();
    let grounds = data["grounds"].as_array().expect("grounds is an array");
    assert_eq!(
        GROUNDS.len(),
        grounds.len(),
        "a different number of grounds"
    );
    for (mine, theirs) in GROUNDS.iter().zip(grounds) {
        assert_eq!(
            mine.name,
            theirs["name"].as_str().expect("name is a string")
        );
        assert_eq!(
            mine.bounded,
            theirs["bounded"].as_bool().expect("bounded is a bool"),
            "{} disagrees about whether its ground is knowable",
            mine.name
        );
    }

    let inks = data["inks"].as_array().expect("inks is an array");
    assert_eq!(INKS.len(), inks.len(), "a different number of inks");
    for (mine, theirs) in INKS.iter().zip(inks) {
        assert_eq!(
            mine.name,
            theirs["name"].as_str().expect("name is a string")
        );
        assert_eq!(
            mine.contrast.as_str(),
            theirs["contrast"].as_str().expect("contrast is a string"),
            "{} answers to a different target",
            mine.name
        );
        let theirs_grounds: Vec<&str> = theirs["grounds"]
            .as_array()
            .expect("grounds is an array")
            .iter()
            .map(|name| name.as_str().expect("a ground name is a string"))
            .collect();
        assert_eq!(
            mine.grounds, theirs_grounds,
            "{} lands on different grounds",
            mine.name
        );
    }
}

/// Every ink names grounds that exist. The TypeScript cannot check this either,
/// its ground list being strings, so a rename in one list and not the other is a
/// pair solved against nothing.
#[test]
fn every_ground_an_ink_names_is_a_ground() {
    let known: Vec<&str> = GROUNDS.iter().map(|ground| ground.name.as_str()).collect();
    for ink in INKS.iter() {
        for ground in &ink.grounds {
            assert!(
                known.contains(&ground.as_str()),
                "{} names `{ground}`, which is not a ground",
                ink.name
            );
        }
    }
}

#[test]
fn the_status_tables_are_the_ones_the_typescript_declares() {
    let data = oracle();
    for (at, name) in STATUS_NAMES.iter().enumerate() {
        let (hue, chroma) = status_seed(name).expect("a named status has a seed");
        assert_eq!(
            hue.to_bits(),
            number(&data["statuses"]["hue"], name).to_bits(),
            "{name} hue"
        );
        assert_eq!(
            chroma.to_bits(),
            number(&data["statuses"]["chroma"], name).to_bits(),
            "{name} chroma"
        );
        /* By bits, like everything else here: these are the same literal twice
        and clippy is right that `==` on a float is usually a question rather
        than an answer. */
        assert_eq!(hue.to_bits(), STATUS_HUE[at].to_bits());
        assert_eq!(chroma.to_bits(), STATUS_CHROMA[at].to_bits());
    }
    assert!(
        status_seed("nonsense").is_none(),
        "an unknown status has no seed"
    );
}

#[test]
fn a_colour_is_a_triple_however_it_was_written() {
    let hex = Color::Hex("#3b82f6".to_owned());
    let triple = to_oklch(&hex).expect("a valid hex converts");
    assert_eq!(
        to_oklch(&Color::Oklch(triple)),
        Some(triple),
        "a triple is returned as it came"
    );
    assert_eq!(
        to_oklch(&Color::Hex("nonsense".to_owned())),
        None,
        "a bad hex is refused"
    );
}

#[test]
fn a_seed_says_what_it_is_or_how_it_relates() {
    let relation = Seed::Relation(Relation {
        allowance: None,
        chroma: None,
        from: From::Brand,
        rotate: 180.0,
    });
    assert!(is_relation(&relation));
    assert!(!is_relation(&Seed::Color(Color::Hex("#3b82f6".to_owned()))));
}

/// `Math.hypot` of three arguments is not the square root of the sum of the
/// squares, and this is where that matters: the distance feeds
/// `>= COLLISION_DISTANCE`, and that comparison decides which hue a status takes
/// when it rotates clear of the brand. A flipped branch is a different palette,
/// not a last-place difference in a reported number, so this one is asserted to
/// the bit rather than to the tolerance.
#[test]
fn perceptual_distance_matches_the_typescript_to_the_bit() {
    let data = oracle();
    let distances = data["distances"].as_array().expect("distances is an array");
    let mut wrong = Vec::new();
    for entry in distances {
        let a = color(&entry["a"]);
        let b = color(&entry["b"]);
        let mine = perceptual_distance(a, b);
        let theirs = number(entry, "distance");
        if mine.to_bits() != theirs.to_bits() {
            wrong.push(format!(
                "{a:?} to {b:?}: rust {mine:?} against typescript {theirs:?}"
            ));
        }
    }
    assert!(
        wrong.is_empty(),
        "{} of {} distances differ, and a naive sqrt is why:\n  {}",
        wrong.len(),
        distances.len(),
        wrong.join("\n  ")
    );
}

/// Isolates the disagreement above: is `hypot3` wrong, or is `cos` an ulp out
/// upstream of it? Fed the TypeScript's own lab triples, `hypot3` should be
/// exact, which localizes any residual to the trigonometry.
#[test]
fn hypot_is_exact_when_it_is_given_the_same_three_numbers() {
    let data = oracle();
    let distances = data["distances"].as_array().expect("distances is an array");
    let triple = |value: &Value| {
        let parts = value.as_array().expect("a lab triple is an array");
        [
            parts[0].as_f64().expect("l"),
            parts[1].as_f64().expect("a"),
            parts[2].as_f64().expect("b"),
        ]
    };
    let mut wrong = 0;
    let mut lab_wrong = 0;
    for entry in distances {
        let [l1, a1, b1] = triple(&entry["labA"]);
        let [l2, a2, b2] = triple(&entry["labB"]);
        let mine = crate::derive::hypot3_isolated(l1 - l2, a1 - a2, b1 - b2);
        let theirs = number(entry, "distance");
        if mine.to_bits() != theirs.to_bits() {
            wrong += 1;
            if wrong <= 3 {
                println!(
                    "  a={:?} b={:?}\n    labA={:?} labB={:?}\n    rust {mine:?} ts {theirs:?}",
                    color(&entry["a"]),
                    color(&entry["b"]),
                    [l1, a1, b1],
                    [l2, a2, b2]
                );
            }
        }
        /* And whether our own lab triples match theirs, which is the other half
        of the question. */
        let mine = crate::derive::to_lab(color(&entry["a"]));
        if mine[1].to_bits() != a1.to_bits() || mine[2].to_bits() != b1.to_bits() {
            lab_wrong += 1;
        }
    }
    println!(
        "hypot3 given identical inputs: {wrong} of {} differ; our lab triples: {lab_wrong} of {} differ",
        distances.len(),
        distances.len()
    );
    assert_eq!(wrong, 0, "hypot3 differs given identical inputs");
}

/// The themes whose token list is a pure derivation.
///
/// **A per-phase test looks its token up by name, and a pinned token is the one
/// case where that name does not hold what the phase computed.** The `pinned`
/// theme overrides `color-primary` outright, so the primary test read a color
/// the primary phase never produced and reported the phase as broken. Filtering
/// here rather than special-casing in five tests, because the property is about
/// the theme rather than about any one phase.
///
/// [`every_token_of_every_theme_matches`] deliberately does not filter: the
/// override is exactly what it is there to check.
fn derived_themes(data: &Value) -> Vec<&Value> {
    data["themes"]
        .as_array()
        .expect("themes is an array")
        .iter()
        .filter(|theme| {
            let label = theme["label"].as_str().expect("label");
            intent_for(label)
                .tokens
                .is_none_or(|pinned| pinned.is_empty())
        })
        .collect()
}

fn token_of<'a>(theme: &'a Value, name: &str) -> &'a Value {
    theme["tokens"]
        .as_array()
        .expect("tokens is an array")
        .iter()
        .find(|token| token["name"].as_str() == Some(name))
        .unwrap_or_else(|| panic!("{name} is emitted"))
}

/// Asserts one built token against the one the TypeScript emitted.
///
/// This covers `token()` as well as the phase that produced the value: the hex,
/// the fitted triple and the chroma-reduced flag all come from it, so a phase
/// asserting its tokens is asserting the builder too.
fn assert_token(mine: &DerivedToken, theirs: &Value, at: &str) {
    assert_eq!(mine.hex, theirs["hex"].as_str().expect("hex"), "{at}: hex");
    assert_eq!(
        mine.origin.as_str(),
        theirs["origin"].as_str().expect("origin"),
        "{at}: origin"
    );
    assert_eq!(
        mine.chroma_reduced,
        theirs["chromaReduced"].as_bool().expect("chromaReduced"),
        "{at}: chromaReduced"
    );
    /* **The hex above is exact and the triple under it is not, and the difference
    in kind is the point.** The hex is what ships; the triple is an intermediate,
    and it inherits the one divergence this port has: `cbrt` and `atan2` in
    `hex_to_oklch` differ from V8's by a last place on 6 of 45 components, so a
    brand parsed an ulp out carries that ulp into every color derived from it.
    Traced rather than assumed: `#c1272d` parses to chroma 0.189192543111386 in
    V8 and 0.18919254311138597 here, and `red`'s `color-primary` differs by
    exactly that while emitting the same six hex digits. Held to the parse
    tolerance, so a difference that is *not* the parse, a search taking a
    different branch, still fails here, and would fail on the hex regardless. */
    for (label, mine, theirs) in [
        (
            "chroma",
            mine.value.chroma,
            number(&theirs["value"], "chroma"),
        ),
        ("hue", mine.value.hue, number(&theirs["value"], "hue")),
        (
            "lightness",
            mine.value.lightness,
            number(&theirs["value"], "lightness"),
        ),
    ] {
        assert!(
            (mine - theirs).abs() <= PARSE_TOLERANCE,
            "{at}: {label} is {mine:?} against {theirs:?}"
        );
    }
    /* The measured contrast, which the TypeScript omits rather than nulls where a
    token has no ground to report against. Absent on both sides or equal to the
    bit on both: a token reporting a ratio nobody asked it to measure is as wrong
    as one reporting the wrong ratio. */
    match (
        mine.contrast,
        theirs.get("contrast").and_then(Value::as_f64),
    ) {
        (None, None) => {}
        (Some(mine), Some(theirs)) => assert!(
            (mine - theirs).abs() <= PARSE_TOLERANCE,
            "{at}: contrast is {mine:?} against {theirs:?}"
        ),
        (mine, theirs) => {
            panic!(
                "{at}: one side reports a contrast and the other does not, {mine:?} / {theirs:?}"
            )
        }
    }
}

/// The first phase: defaults, the chroma policy, and the ladder the page stands
/// on. One oracle intent per part of it that can move.
#[test]
fn the_surface_ladder_is_the_one_the_typescript_derives() {
    let data = oracle();
    let themes = data["themes"].as_array().expect("themes is an array");
    for theme in themes {
        let label = theme["label"].as_str().expect("label");
        let intent = intent_for(label);
        let resolved = resolve(&intent).expect("the oracle's intents all resolve");
        let policy = Policy::new(resolved.chroma);
        let (_raw_brand, _brand, neutral) = brand_and_neutral(&resolved, policy);
        let built = surfaces(
            resolved.scheme,
            neutral,
            ladder(resolved.separation.surface),
        );

        for (name, raw) in [
            ("color-background", built.raw_background),
            ("color-surface", built.raw_surface),
            ("color-surface-raised", built.raw_raised),
            ("color-surface-overlay", built.raw_overlay),
            ("color-surface-sunken", built.raw_sunken),
        ] {
            let mine = token(name, raw, Origin::Derived, None);
            assert_token(&mine, token_of(theme, name), &format!("{label}/{name}"));
        }
    }
}

/// The defaults, which decide what every phase after them is solving for.
#[test]
fn resolving_fills_in_what_the_typescript_fills_in() {
    let resolved = resolve(&ThemeIntent::new(Color::Hex("#3b82f6".to_owned())))
        .expect("a plain brand resolves");
    assert_eq!(resolved.contrast_target.to_bits(), 4.5_f64.to_bits());
    assert_eq!(resolved.density.to_bits(), 1.0_f64.to_bits());
    assert_eq!(resolved.radius.to_bits(), 0.5_f64.to_bits());
    assert_eq!(resolved.namespace, "helix");
    assert_eq!(resolved.scheme, Scheme::Light);
    /* Derived from the target rather than constant, which is what lets a theme
    at AAA check its text against AAA. */
    assert_eq!(resolved.pairings.len(), default_pairings(4.5).len());
    let aaa = resolve(&ThemeIntent {
        contrast_target: Some(7.0),
        ..ThemeIntent::new(Color::Hex("#3b82f6".to_owned()))
    })
    .expect("AAA resolves");
    assert!(
        aaa.pairings
            .iter()
            .any(|pair| pair.target.to_bits() == 7.0_f64.to_bits()),
        "a theme at AAA checks its text against AAA"
    );
    /* And the ring stays at 3 whatever the text target does, per WCAG 1.4.11. */
    assert!(
        aaa.pairings
            .iter()
            .any(|pair| pair.foreground == "color-focus-ring"
                && pair.target.to_bits() == 3.0_f64.to_bits()),
        "raising a theme to AAA raises what its text must reach, not what a ring must"
    );
}

/// The guard that exists because `violations` fails open: every `ratio < target`
/// against `NaN` is false, so a theme derived from a bad brand passes every
/// check and emits `#000000` everywhere.
#[test]
fn an_intent_that_would_pass_every_check_by_accident_is_refused() {
    let brand = || Color::Hex("#3b82f6".to_owned());
    let cases: Vec<(&str, ThemeIntent)> = vec![
        (
            "an unreadable brand",
            ThemeIntent::new(Color::Hex("nonsense".to_owned())),
        ),
        (
            "a NaN target",
            ThemeIntent {
                contrast_target: Some(f64::NAN),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "a target below 1",
            ThemeIntent {
                contrast_target: Some(0.5),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "a target above 21",
            ThemeIntent {
                contrast_target: Some(22.0),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "a density of zero",
            ThemeIntent {
                density: Some(0.0),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "a negative radius",
            ThemeIntent {
                radius: Some(-1.0),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "an infinite ceiling",
            ThemeIntent {
                chroma: Some(Chroma {
                    ceiling: Some(f64::INFINITY),
                    scale: None,
                }),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "an unreadable pinned status, which the TypeScript derived instead",
            ThemeIntent {
                status: Some(Status {
                    danger: Some(StatusSeed::Color(Color::Hex("nonsense".to_owned()))),
                    ..Status::default()
                }),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "an unreadable pinned accent",
            ThemeIntent {
                accent: Some(Seed::Color(Color::Hex("nonsense".to_owned()))),
                ..ThemeIntent::new(brand())
            },
        ),
        (
            "an allowance past half the circle",
            ThemeIntent {
                status: Some(Status {
                    allowance: Some(181.0),
                    ..Status::default()
                }),
                ..ThemeIntent::new(brand())
            },
        ),
    ];
    for (what, intent) in cases {
        assert!(resolve(&intent).is_err(), "{what} should be refused");
    }
    assert!(
        resolve(&ThemeIntent::new(brand())).is_ok(),
        "and a plain brand is not"
    );
}

/// Every theme the oracle records, in the order it records them.
///
/// **The order is the file's order and is load-bearing for review**, not for any
/// assertion: a bless that reordered them would rewrite every theme block and
/// bury whatever actually changed.
pub fn labels() -> Vec<&'static str> {
    vec![
        "default",
        "dark",
        "fill",
        "space",
        "dark-fill",
        "monotone",
        "aaa",
        "red",
        "amber",
        "quiet",
        "cast",
        "pinned",
        "pale",
        "expressive",
        "instant",
        "tiny",
        "paced",
        "complement",
        "pinned-accent",
    ]
}

/// Rebuilds the intent the oracle derived a theme from, by label.
///
/// **Stated here and in `fusion/scripts/lib/theme-intents.mjs`, and it is the
/// one duplication in this file**: the oracle stores what a theme *came out as*
/// and not what went in, and a port asserted against outputs whose inputs it
/// cannot reproduce is asserting nothing. The labels are the join.
///
/// One arm per oracle theme, so this grows by a few lines every time a branch
/// turns out to need an input that shows it. Splitting it would file half the
/// intents somewhere else and leave a reader chasing which half.
#[allow(clippy::too_many_lines)]
pub fn intent_for(label: &str) -> ThemeIntent {
    let blue = || Color::Hex("#3b82f6".to_owned());
    let mut intent = ThemeIntent::new(blue());
    match label {
        "default" => {}
        "dark" => intent.scheme = Some(Scheme::Dark),
        "fill" => {
            intent.separation = Some(Separation {
                floating: None,
                surface: Some(Mechanism::Fill),
            });
        }
        "space" => {
            intent.separation = Some(Separation {
                floating: None,
                surface: Some(Mechanism::Space),
            });
        }
        "dark-fill" => {
            intent.scheme = Some(Scheme::Dark);
            intent.separation = Some(Separation {
                floating: None,
                surface: Some(Mechanism::Fill),
            });
        }
        "monotone" => {
            intent.chroma = Some(Chroma {
                ceiling: Some(0.0),
                scale: None,
            });
        }
        "aaa" => intent.contrast_target = Some(7.0),
        "red" => intent.brand = Color::Hex("#c1272d".to_owned()),
        "amber" => intent.brand = Color::Hex("#f59e0b".to_owned()),
        "quiet" => {
            intent.chroma = Some(Chroma {
                ceiling: None,
                scale: Some(0.05),
            });
        }
        "cast" => {
            intent.neutral = Some(crate::intent::Neutral {
                chroma: Some(0.01),
                hue: Some(250.0),
            });
        }
        "pinned" => {
            intent.tokens = Some(vec![
                (
                    "color-house-teal".to_owned(),
                    Color::Hex("#0f766e".to_owned()),
                ),
                ("color-primary".to_owned(), Color::Hex("#7c3aed".to_owned())),
            ]);
        }
        "pale" => intent.brand = Color::Hex("#fef08a".to_owned()),
        "expressive" => {
            intent.font = Some(Font {
                base: Some(16.0),
                body: Some("Inter".to_owned()),
                display: None,
                mono: Some("Berkeley Mono".to_owned()),
                scale: Some(1.25),
                weight: Some(Weight::Strong),
            });
            intent.material = Some(Material {
                blur: Some(12.0),
                opacity: Some(0.72),
            });
            intent.motion = Some(Motion {
                character: Some(Character::Springy),
                scale: Some(1.2),
            });
            intent.namespace = Some("acme".to_owned());
            intent.separation = Some(Separation {
                floating: Some(Floating::Shadow),
                surface: Some(Mechanism::Shadow),
            });
        }
        "instant" => {
            intent.motion = Some(Motion {
                character: Some(Character::Instant),
                scale: Some(3.0),
            });
        }
        "tiny" => {
            intent.font = Some(Font {
                base: Some(12.0),
                body: None,
                display: None,
                mono: None,
                scale: None,
                weight: None,
            });
        }
        "paced" => {
            intent.font = Some(Font {
                base: None,
                body: None,
                display: Some("Playfair Display".to_owned()),
                mono: None,
                scale: None,
                weight: Some(Weight::Light),
            });
            intent.material = Some(Material {
                blur: Some(0.0),
                opacity: Some(1.0),
            });
            intent.motion = Some(Motion {
                character: None,
                scale: Some(0.5),
            });
            intent.separation = Some(Separation {
                floating: Some(Floating::Border),
                surface: None,
            });
        }
        /* An accent named both ways. Unnamed, an accent is the brand and never
        reaches `settle`, so without these the oracle would hold no accent that
        rotates or pins at all. `complement` is what every intent above
        defaulted to before, and lands exactly where they did. */
        "complement" => {
            intent.accent = Some(Seed::Relation(Relation {
                allowance: None,
                chroma: None,
                from: From::Brand,
                rotate: 180.0,
            }));
        }
        "pinned-accent" => intent.accent = Some(Seed::Color(Color::Hex("#db2777".to_owned()))),
        other => panic!("no intent is recorded for `{other}`"),
    }
    intent
}

/// The first tokens that go through the contrast search rather than off a
/// ladder, and the first that carry a measured ratio.
///
/// A bisection agreeing to the bit across every theme means every branch it took
/// was the same branch: twenty-four halvings per candidate, four candidates per
/// ink, both directions tried.
#[test]
fn the_neutral_inks_land_where_the_typescript_lands() {
    let data = oracle();
    for theme in derived_themes(&data) {
        let label = theme["label"].as_str().expect("label");
        let intent = intent_for(label);
        let resolved = resolve(&intent).expect("the oracle's intents all resolve");
        let policy = Policy::new(resolved.chroma);
        let (_raw, _brand, neutral) = brand_and_neutral(&resolved, policy);
        let built = surfaces(
            resolved.scheme,
            neutral,
            ladder(resolved.separation.surface),
        );
        let inks = neutral_inks(built, neutral, resolved.contrast_target);

        for (name, raw) in [
            ("color-foreground", inks.foreground),
            ("color-foreground-muted", inks.muted),
            ("color-border", inks.border),
        ] {
            let mine = token(name, raw, Origin::Derived, Some(built.raw_background));
            assert_token(&mine, token_of(theme, name), &format!("{label}/{name}"));
        }
    }
}

/// `solve_against` keeps the candidate whose weakest pairing is strongest.
///
/// **Asserted as the property rather than as an outcome, because an outcome
/// test cannot catch it.** Solving a neutral against a white page and a black
/// one and checking the answer looks reasonable passes with the rule inverted to
/// "best best case": white and black are symmetric, so the two rules agree
/// there.
///
/// So this states the rule itself: of the candidates, the one chosen has a
/// weakest pairing at least as strong as any other's. That is false the moment
/// the rule is inverted, on grounds where the two disagree, which is what the
/// asymmetric sets below are for.
#[test]
fn the_solver_maximises_the_weakest_pairing() {
    let ground = |lightness: f64| Oklch {
        chroma: 0.0,
        hue: 0.0,
        lightness,
    };
    /* Deliberately lopsided. A page and a near-page agree with almost any rule;
    a page, a near-page and one dark recess do not. */
    let sets: [&[Oklch]; 4] = [
        &[ground(1.0), ground(0.96)],
        &[ground(1.0), ground(0.96), ground(0.2)],
        &[ground(0.0), ground(0.21), ground(0.29)],
        &[ground(1.0), ground(0.5), ground(0.0)],
    ];
    let casts = [
        Cast {
            chroma: 0.0,
            hue: 0.0,
        },
        Cast {
            chroma: 0.12,
            hue: 258.0,
        },
    ];

    let mut disagreements = 0;
    for grounds in sets {
        for cast in casts {
            for target in [3.0_f64, 4.5, 7.0] {
                let worst = |ink: Oklch| {
                    let fitted = fit_to_gamut(ink, GAMUT_STEPS);
                    grounds
                        .iter()
                        .map(|g| shipped_contrast_ratio(fitted, *g))
                        .fold(f64::INFINITY, f64::min)
                };
                let best_of = |ink: Oklch| {
                    let fitted = fit_to_gamut(ink, GAMUT_STEPS);
                    grounds
                        .iter()
                        .map(|g| shipped_contrast_ratio(fitted, *g))
                        .fold(f64::NEG_INFINITY, f64::max)
                };
                let chosen = solve_against(grounds, cast, target);
                let candidates: Vec<Oklch> = grounds
                    .iter()
                    .map(|g| {
                        lightness_for_contrast(
                            cast.chroma,
                            cast.hue,
                            *g,
                            target,
                            None,
                            CONTRAST_STEPS,
                        )
                    })
                    .collect();

                for candidate in &candidates {
                    assert!(
                        worst(chosen) >= worst(*candidate),
                        "a candidate has a stronger weakest pairing than the one chosen: \
                         {:?} at {worst:?} against {candidate:?}",
                        chosen,
                        worst = worst(chosen)
                    );
                }
                /* And record that this input can tell the two rules apart, so a
                set that could not is a set that proves nothing. */
                let by_best = candidates.iter().copied().fold(candidates[0], |best, c| {
                    if best_of(c) > best_of(best) {
                        c
                    } else {
                        best
                    }
                });
                if by_best.lightness.to_bits() != chosen.lightness.to_bits() {
                    disagreements += 1;
                }
            }
        }
    }
    assert!(
        disagreements > 0,
        "no input here distinguishes best-worst-case from best-best-case, so this test \
         would pass with the rule inverted"
    );
}

/// Builds the shared capture every phase after the ladder takes.
fn deriving_for(label: &str) -> (crate::derive::resolve::Resolved, Deriving, Oklch) {
    let intent = intent_for(label);
    let resolved = resolve(&intent).expect("the oracle's intents all resolve");
    let policy = Policy::new(resolved.chroma);
    let (_raw, brand, neutral) = brand_and_neutral(&resolved, policy);
    let built = surfaces(
        resolved.scheme,
        neutral,
        ladder(resolved.separation.surface),
    );
    let ctx = Deriving {
        contrast_target: resolved.contrast_target,
        policy,
        scheme: resolved.scheme,
        surfaces: built,
    };
    (resolved, ctx, brand)
}

/// The emphasis role, which is the first phase that genuinely exercises the
/// best-worst-case rule: it solves against the surfaces *and* the tint, and the
/// tint is the ground that made the rule necessary.
#[test]
fn the_primary_role_lands_where_the_typescript_lands() {
    let data = oracle();
    for theme in derived_themes(&data) {
        let label = theme["label"].as_str().expect("label");
        let (_resolved, ctx, brand) = deriving_for(label);
        let primary = emphasis(brand, &ctx);

        /* `color-primary` reports against the page; the other four report
        against nothing, which `assert_token` holds them to. */
        assert_token(
            &token(
                "color-primary",
                primary.raw,
                Origin::Derived,
                Some(ctx.surfaces.raw_background),
            ),
            token_of(theme, "color-primary"),
            &format!("{label}/color-primary"),
        );
        for (name, raw) in [
            ("color-primary-hover", primary.hover),
            ("color-primary-active", primary.active),
            ("color-primary-subtle", primary.subtle),
            ("color-primary-surface", primary.filled),
        ] {
            let mine = token(name, raw, Origin::Derived, None);
            assert_token(&mine, token_of(theme, name), &format!("{label}/{name}"));
        }
    }
}

/// The statuses, which is the first phase where `perceptual_distance` and its
/// `hypot3` do real work: the hue repair branches on
/// `distance >= COLLISION_DISTANCE`, so a last-place difference there is a
/// different hue and a different palette rather than a different digit.
///
/// `red` and `amber` are in the oracle for this phase. A brand that *is* a
/// status color is the case twenty degrees of allowance cannot fully answer,
/// so those two exercise the search running its full width and giving up, where
/// the blue clears on the first or second step.
#[test]
fn the_statuses_land_where_the_typescript_lands() {
    let data = oracle();
    for theme in derived_themes(&data) {
        let label = theme["label"].as_str().expect("label");
        let (resolved, ctx, brand) = deriving_for(label);
        let primary = emphasis(brand, &ctx);
        let resolved_statuses = statuses(&resolved.status, brand.chroma, primary.raw, &ctx);

        assert_eq!(resolved_statuses.len(), 4, "{label}: four statuses");
        for status in resolved_statuses {
            let name = format!("color-{}", status.name);
            let origin = if status.pinned {
                Origin::Pinned
            } else {
                Origin::Derived
            };
            let mine = token(
                &name,
                status.color,
                origin,
                Some(ctx.surfaces.raw_background),
            );
            assert_token(&mine, token_of(theme, &name), &format!("{label}/{name}"));
        }
    }
}

/// The hue search, asserted directly because no output can show it.
///
/// Planting the flipped order in `repair_hue` and running the whole suite
/// changes nothing: the order only decides anything when both directions clear
/// at the same step, and no theme in the oracle does that. So the things the
/// search promises are stated here instead.
#[test]
fn the_hue_repair_widens_outward_and_gives_up_rather_than_settling() {
    /* Asked for, and available: nothing moves. */
    assert_eq!(
        repair_hue(75.0, 20.0, |_| true).to_bits(),
        75.0_f64.to_bits()
    );

    /* Taken, so it widens. `+step` is tried before `-step`, which is only
    visible when both would clear, so both do here. */
    let taken = |candidate: f64| (candidate - 75.0).abs() > 1e-9;
    assert_eq!(repair_hue(75.0, 20.0, taken).to_bits(), 76.0_f64.to_bits());

    /* And it spends only what it needs: five degrees away when four will not do. */
    let far = |candidate: f64| (candidate - 75.0).abs() >= 5.0;
    assert_eq!(repair_hue(75.0, 20.0, far).to_bits(), 80.0_f64.to_bits());

    /* Nothing clears inside the bound, so the hue asked for stands rather than a
    half-rotation that is neither the convention nor distinguishable. */
    assert_eq!(
        repair_hue(75.0, 20.0, |_| false).to_bits(),
        75.0_f64.to_bits()
    );

    /* And it wraps, since a hue is an angle: two degrees minus four is 358. */
    let only_358 = |candidate: f64| (candidate - 358.0).abs() < 1e-9;
    assert_eq!(
        repair_hue(2.0, 20.0, only_358).to_bits(),
        358.0_f64.to_bits()
    );

    /* An allowance of zero is the loop running once at step 0, which is the
    caller's guard made explicit: a status holds its hue and reports. */
    assert_eq!(
        repair_hue(75.0, 0.0, |_| false).to_bits(),
        75.0_f64.to_bits()
    );
}

/// The accent, which settles after the statuses and reports `related` unless the
/// consumer pinned a color, and is the brand's own emphasis when nobody named
/// one.
///
/// A named complement, `rotate: 180`, lands at 80 degrees on the shipped blue
/// against an amber `warning` at 75. This is the phase that was reported as an
/// unrepairable collision on every derivation before the accent was made the
/// role that yields.
#[test]
fn the_accent_lands_where_the_typescript_lands() {
    let data = oracle();
    for theme in derived_themes(&data) {
        let label = theme["label"].as_str().expect("label");
        let (resolved, ctx, brand) = deriving_for(label);
        let raw_brand = to_oklch(&resolved.brand).expect("a resolved brand reads");
        let primary = emphasis(brand, &ctx);
        let statuses_resolved = statuses(&resolved.status, brand.chroma, primary.raw, &ctx);

        let (steps, origin) = match &resolved.accent {
            None => (primary, Origin::Derived),
            Some(named) => {
                let (accent, pinned) = seeded(named, raw_brand, Policy::new(resolved.chroma));
                let bound = match named {
                    Seed::Relation(relation) => relation.allowance.unwrap_or(45.0),
                    Seed::Color(_) => 0.0,
                };
                let settled = settle(accent, pinned, bound, primary.raw, &statuses_resolved, &ctx);
                let origin = if pinned {
                    Origin::Pinned
                } else {
                    Origin::Related
                };
                (emphasis(settled, &ctx), origin)
            }
        };

        assert_token(
            &token(
                "color-accent",
                steps.raw,
                origin,
                Some(ctx.surfaces.raw_background),
            ),
            token_of(theme, "color-accent"),
            &format!("{label}/color-accent"),
        );
        for (name, raw) in [
            ("color-accent-hover", steps.hover),
            ("color-accent-active", steps.active),
            ("color-accent-subtle", steps.subtle),
            ("color-accent-surface", steps.filled),
        ] {
            assert_token(
                &token(name, raw, origin, None),
                token_of(theme, name),
                &format!("{label}/{name}"),
            );
        }
    }
}

/// **Every token of every theme, in order, by name.**
///
/// This is the assertion the per-phase tests above were building toward, and it
/// subsumes most of them: a phase that derives the right color and files it
/// under the wrong name, or emits it in the wrong position, or does not emit it
/// at all, is invisible to a test that looks its own token up by name. Three of
/// those four failures produce a theme that still looks derived.
///
/// The count is asserted first and separately, because a length mismatch read
/// through a zipped comparison reports whichever pair happens to diverge first
/// and says nothing about the token that went missing.
#[test]
fn every_token_of_every_theme_matches() {
    let data = oracle();
    for theme in data["themes"].as_array().expect("themes is an array") {
        let label = theme["label"].as_str().expect("label");
        let resolved = resolve(&intent_for(label)).expect("the oracle's intents all resolve");
        let ours = derive_tokens(&resolved).tokens;
        let theirs = theme["tokens"].as_array().expect("tokens is an array");

        assert_eq!(
            ours.len(),
            theirs.len(),
            "{label} emits a different number of tokens: ours {:?}, theirs {:?}",
            ours.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(),
            theirs
                .iter()
                .map(|t| t["name"].as_str().expect("name"))
                .collect::<Vec<_>>(),
        );

        for (index, (ours, theirs)) in ours.iter().zip(theirs).enumerate() {
            let name = theirs["name"].as_str().expect("name");
            assert_eq!(
                ours.name, name,
                "{label} token {index} is named differently"
            );
            assert_token(ours, theirs, &format!("{label}/{name}"));
        }
    }
}

/// **The brand mark walks down before up, which no theme's output can show.**
///
/// The direction only decides an answer when both neighbors clear at the same
/// step, and for every brand in the oracle either the mark does not move at all
/// or exactly one side clears first. Reversing the two entries leaves every
/// theme byte-identical: measured by making that edit and watching the suite
/// stay green.
///
/// So it is asserted as a rule, the way `repair_hue`'s own order is, and against
/// a synthetic predicate rather than real contrast. **Real contrast cannot
/// produce the tie**: against a mid gray the lighter side clears a full step
/// earlier, so the walk returns before both sides are ever true at once.
#[test]
fn the_brand_mark_prefers_the_darker_side_of_a_tie() {
    /* Both neighbors of the fifth step clear and nothing nearer does, so the
    two entries in the walk are the only thing deciding the answer. */
    let tie = |lightness: f64| (lightness - 0.5).abs() >= 0.05 - 1e-9;
    assert!(
        (walk_outward(0.5, tie) - 0.45).abs() < 1e-12,
        "the walk took the lighter side of a tie"
    );

    /* And a lightness with no room below still walks the side that has room. */
    let only_light = |lightness: f64| lightness >= 0.5;
    assert!(
        (walk_outward(0.02, only_light) - 0.5).abs() < 1e-12,
        "the walk did not reach the one side with room"
    );

    /* **Out of range is skipped, not clamped**, which is a claim about the
    answer rather than about the work. 0.015 is off the hundredths grid, so pure
    black is not a step this walk can reach; clamping would fold the first
    negative step onto it and return a lightness the caller never asked for. The
    honest answer is that nothing cleared. */
    let only_black = |lightness: f64| lightness == 0.0;
    assert!(
        (walk_outward(0.015, only_black) - 0.015).abs() < 1e-12,
        "the walk clamped an out-of-range step onto black"
    );
}

/// **The emitted block, byte for byte.**
///
/// This is the end of the port and the only assertion that covers the tail of
/// `to_css`: everything below the tokens is emitted only when asked for, so a
/// port that dropped the whole of it would pass every other test in this file on
/// every theme that says nothing about fonts, motion or material. Several oracle
/// intents exist purely to turn those branches on.
///
/// Byte equality rather than a parse, because the artifact is a file a consumer
/// pastes. Two blocks that mean the same thing and differ in a trailing zero are
/// a diff in somebody's repository, and `1.000` where the TypeScript writes `1`
/// is exactly the shape that produces one.
#[test]
fn the_emitted_css_is_byte_identical() {
    let data = oracle();
    for theme in data["themes"].as_array().expect("themes is an array") {
        let label = theme["label"].as_str().expect("label");
        let derived = derive_theme(&intent_for(label)).expect("the oracle's intents all derive");
        let ours = to_css(&derived, ":root");
        let theirs = theme["css"].as_str().expect("css is a string");
        if ours == theirs {
            continue;
        }
        /* Reported as the first differing line rather than as two whole blocks:
        a theme emits fifty of them, and an assertion that prints both in full
        makes the reader do the diff. */
        let mismatch = ours
            .lines()
            .zip(theirs.lines())
            .find(|(ours, theirs)| ours != theirs);
        match mismatch {
            Some((ours, theirs)) => {
                panic!("{label} emits `{ours}` where the TypeScript emits `{theirs}`")
            }
            None => panic!(
                "{label} emits {} lines against the TypeScript's {}",
                ours.lines().count(),
                theirs.lines().count()
            ),
        }
    }
}

/// The findings: every pair the theme was checked against, the ones that failed,
/// and the roles a reader cannot tell apart.
///
/// **The pair count is asserted before the pairs**, for the same reason the token
/// count is: a pairing silently missing from the results is how a guarantee
/// becomes a claim about the pairs that happened to be easy, and that is a
/// failure a zipped comparison reports as a disagreement about some other pair.
#[test]
fn the_findings_are_the_ones_the_typescript_reports() {
    let data = oracle();
    /* One accumulator across every theme, so the failure names the worst
    disagreement anywhere rather than the first theme that happens to hold one. */
    let mut apart = Divergence::new();
    let mut measured = 0;
    for theme in data["themes"].as_array().expect("themes is an array") {
        let label = theme["label"].as_str().expect("label");
        let derived = derive_theme(&intent_for(label)).expect("the oracle's intents all derive");

        let theirs = theme["pairings"].as_array().expect("pairings is an array");
        assert_eq!(
            derived.pairings.len(),
            theirs.len(),
            "{label} checks a different number of pairs"
        );
        for (ours, theirs) in derived.pairings.iter().zip(theirs) {
            let where_ = format!(
                "{label}/{} on {}",
                theirs["foreground"].as_str().expect("foreground"),
                theirs["background"].as_str().expect("background"),
            );
            assert_eq!(
                ours.foreground, theirs["foreground"],
                "{where_}: foreground"
            );
            assert_eq!(
                ours.background, theirs["background"],
                "{where_}: background"
            );
            assert_eq!(
                match ours.status {
                    Outcome::Fail => "fail",
                    Outcome::Pass => "pass",
                    Outcome::Unverifiable => "unverifiable",
                },
                theirs["status"].as_str().expect("status"),
                "{where_}: status"
            );
            /* Compared exactly, which for a float usually deserves a second
            look and here is the assertion: a target passes from the request to
            the result untouched, so anything but bit equality means it was
            recomputed somewhere it should have been carried. */
            #[allow(clippy::float_cmp)]
            {
                assert_eq!(ours.target, number(theirs, "target"), "{where_}: target");
            }
            match ours.ratio {
                None => assert!(
                    theirs["ratio"].is_null(),
                    "{where_}: we measured nothing and the TypeScript measured {}",
                    theirs["ratio"]
                ),
                /* Held to the parse tolerance rather than exactly, for the
                reason `assert_token` gives: a brand parsed an ulp out carries
                that ulp into the ratio measured against it. The `status` beside
                it is exact, and it is the half a consumer branches on. */
                Some(ratio) => {
                    measured += 1;
                    apart.check(ratio, number(theirs, "ratio"), &format!("{where_}: ratio"));
                }
            }
        }

        assert_sentences(
            "violations",
            &derived.violations,
            &theme["violations"],
            label,
        );
        assert_sentences(
            "collisions",
            &derived.collisions,
            &theme["collisions"],
            label,
        );
        assert_seeds(&derived.seeds, &theme["seeds"], label);
    }
    apart.assert("measured contrast", measured, PARSE_TOLERANCE);
}

/// Two lists of rendered sentences, compared as lists.
///
/// Rendered rather than structured, so the comparison is the whole string:
/// `violations` reports a ratio to two decimals and `collisions` a distance to
/// three, and both roundings are part of what a reader is shown.
fn assert_sentences(what: &str, ours: &[String], theirs: &Value, label: &str) {
    let theirs: Vec<&str> = theirs
        .as_array()
        .expect("an array")
        .iter()
        .map(|line| line.as_str().expect("a string"))
        .collect();
    assert_eq!(
        ours.iter().map(String::as_str).collect::<Vec<_>>(),
        theirs,
        "{label} reports different {what}"
    );
}

fn assert_seeds(ours: &[(String, String)], theirs: &Value, label: &str) {
    let theirs = theirs.as_object().expect("seeds is an object");
    assert_eq!(ours.len(), theirs.len(), "{label} seeds a different set");
    for (name, value) in ours {
        assert_eq!(
            value,
            theirs[name].as_str().expect("a seed is a string"),
            "{label}/{name}"
        );
    }
}
