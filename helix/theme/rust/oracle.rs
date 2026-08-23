//! The port held to the engine it replaces.
//!
//! `oracle.json` is what `src/oklch.ts` answers, frozen by `bun run oracle`.
//! Every value below is asserted against it, so "the port agrees" is measured on
//! each `cargo test` rather than concluded from reading both files. 142 asks for
//! exactly this and says why: both functions here bisect, so agreement on intent
//! is not agreement on output, and a last-place difference in one channel moves
//! a byte, which moves the luminance, which moves the side of 4.5 the search
//! lands on.
//!
//! **The port is bit-exact almost everywhere, and finding that out took
//! correcting the harness twice.**
//!
//! Bit equality was the first assertion written, on the reasoning that both
//! engines are IEEE-754 doubles doing the same operations in the same order. It
//! appeared to fail widely, and the reported divergence was recorded as V8's
//! libm differing from Rust's in the last place. That was wrong: `serde_json`
//! without `float_roundtrip` takes a fast path that is not correctly rounded,
//! and it was parsing the oracle's own numbers an ulp out. The harness was
//! corrupting its reference and reporting the port for it.
//!
//! With the parser fixed, measured:
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
//! parsed hex            6 of  45 differ, worst by 5.55e-17
//! ```
//!
//! So everything is asserted to the bit except the three components
//! `hex_to_oklch` returns, which go through `cbrt` and `atan2` and are the only
//! place the two libms actually part company. That one tolerance carries its
//! measurement; every other assertion is exact and stays exact, which is what
//! makes a future regression in the solver visible rather than absorbed.
//!
//! **Twice now the harness has been the bug**, after the `NaN` that compared
//! equal to everything. A differential check is a measuring instrument, and an
//! instrument that reads its own scale wrong reports the specimen.

use serde_json::Value;

use crate::derive::perceptual_distance;
use crate::intent::{
    is_relation, status_seed, to_oklch, Color, From, Relation, Seed, STATUS_CHROMA, STATUS_HUE,
    STATUS_NAMES,
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
/// `cbrt` and `atan2`, and 6 of 45 components come back a last place out, by at
/// most 5.55e-17. Eleven orders below the byte those components are rounded
/// into, and the exact hex assertions are what would catch it if it ever reached
/// one.
const PARSE_TOLERANCE: f64 = 1e-15;

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
        /* **A difference that is not a number is not a small difference.** This
        compared `apart >= self.worst` and nothing else, and `NaN >= 0.0` is
        false, so a `NaN` on either side left `worst` at zero and the assert
        below passed: the harness would have certified agreement with a value
        that is not a value. Measured before fixing, which is the only way this
        kind of hole is ever visible, since it makes the suite greener rather
        than redder. */
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
        "{} of {} colours render to a different hex:\n  {}",
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
        "{} of {} fitted colours render to a different hex:\n  {}",
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
/// exact, which localises any residual to the trigonometry.
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
        let mine = crate::derive::hypot3_for_test(l1 - l2, a1 - a2, b1 - b2);
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
        let mine = crate::derive::to_lab_for_test(color(&entry["a"]));
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
