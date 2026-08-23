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
//! **The hex is exact and the floats are not, which was measured rather than
//! assumed.** Bit equality was the first assertion written, on the reasoning
//! that both engines are IEEE-754 doubles doing the same operations in the same
//! order. It very nearly holds, and where it fails it fails in the last place:
//!
//! ```text
//! rendered hex          0 of 480 differ
//! parsed hex            0 of  15 differ, and all 15 round trip identically
//! gamut membership      0 of 480 differ
//! search emitted hex    0 of 405 differ
//! relative luminance   47 of 480 differ, worst by 1.11e-16
//! contrast ratio       37 of 300 differ, worst by 3.55e-15
//! solved lightness     24 of 405 differ, worst by 1.11e-16
//! ```
//!
//! The arithmetic is identical; the transcendentals are not. `cos`, `sin`,
//! `powf`, `cbrt` and `atan2` are each allowed a last-place difference between
//! V8's libm and Rust's, and that is what these are.
//!
//! **So the artifact is asserted exactly and the intermediates to a tolerance.**
//! A byte is 1/255, about 3.9e-3, which is eleven orders of magnitude above the
//! worst divergence above: nothing at this scale can move a rounded channel
//! unless a value sits exactly on a half, and the exact hex assertions are what
//! would catch that if it ever did. The tolerance is a statement about two
//! libms, not a way of admitting a wrong answer, and it is deliberately far
//! tighter than the byte it protects. Widening it is a decision to be argued in
//! this comment, never a way to make the suite go green.

use serde_json::Value;

use crate::oklch::{
    contrast_ratio, fit_to_gamut, hex_to_oklch, is_out_of_gamut, lightness_for_contrast,
    oklch_to_hex, relative_luminance, shipped_contrast_ratio, shipped_luminance, Oklch,
    CONTRAST_STEPS, GAMUT_STEPS,
};

/// Comfortably above the 3.55e-15 measured above and comfortably below a byte.
const TOLERANCE: f64 = 1e-12;

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
        if apart >= self.worst {
            self.worst = apart;
            self.where_at = format!("{at}: rust {mine:?} against typescript {theirs:?}");
        }
    }

    fn assert(&self, what: &str, total: usize) {
        assert!(
            self.worst <= TOLERANCE,
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
    luminance.assert("relative luminance", colors.len());
    shipped.assert("shipped luminance", colors.len());
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
    apart.assert("hex parsing", hexes.len() * 3);
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
    plain.assert("contrast ratio", pairs.len());
    shipped.assert("shipped contrast ratio", pairs.len());
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
    lightness.assert("solved lightness", searches.len());
    assert!(
        wrong_hex.is_empty(),
        "{} of {} searches emit a different hex:\n  {}",
        wrong_hex.len(),
        searches.len(),
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
    for text in ["", "#", "#ab", "#abcd", "nonsense", "#gggggg"] {
        assert!(hex_to_oklch(text).is_none(), "{text} should not parse");
    }
}
