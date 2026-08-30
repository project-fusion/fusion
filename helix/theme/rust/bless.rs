//! Regenerating the oracle from the engine.
//!
//! **The oracle is a snapshot, not a second implementation.** `oracle.json` was
//! the TypeScript engine's answers, frozen so the Rust port could be held to
//! them; that engine is deleted, keeping two implementations of a search being
//! what (142) was filed to prevent. So these tests prove that nothing has
//! changed since somebody last looked, which is regression detection rather than
//! correctness. The committed file still holds the numbers the TypeScript
//! produced, so the assertions keep their provenance until the day a bless
//! overwrites them, and a bless is a reviewable diff rather than a green tick.
//!
//! **Which is why it is deliberately awkward to run.** An env var and an ignored
//! test, so it cannot happen as a side effect of `cargo test`. A snapshot tool
//! that updates itself when the suite is red is a suite that always passes.
//!
//! ```text
//! HELIX_BLESS_ORACLE=1 cargo test -p fusion-helix-theme -- --ignored bless
//! ```

use serde_json::{json, Map, Value};

use crate::css::to_css;
use crate::derive::theme::derive_theme;
use crate::derive::{perceptual_distance, to_lab};
use crate::intent::{STATUS_CHROMA, STATUS_HUE, STATUS_NAMES};
use crate::model::{Contrast, GROUNDS, INKS};
use crate::oklch::{
    contrast_ratio, fit_to_gamut, hex_to_oklch, is_out_of_gamut, lightness_for_contrast,
    oklch_to_hex, relative_luminance, shipped_contrast_ratio, shipped_luminance, Oklch,
    CONTRAST_STEPS, GAMUT_STEPS,
};

/* Hexes a reader could actually pick, plus the shapes that break parsers: the
three digit form, the extremes, and a gray where chroma is zero and the hue
`atan2` returns is arbitrary. */
const HEXES: [&str; 15] = [
    "#000000", "#ffffff", "#808080", "#3b82f6", "#f00", "#0f0", "#00f", "#fff", "#123456",
    "#fedcba", "#ff0080", "#00ffcc", "#7f7f80", "#010203", "#fefdfc",
];

/* Lightness and chroma across the whole range including past what sRGB can
hold, and hues on the axes where a sign flips as well as between them. */
const LIGHTNESS: [f64; 8] = [0.0, 0.05, 0.25, 0.5, 0.539, 0.75, 0.95, 1.0];
const CHROMA: [f64; 6] = [0.0, 0.02, 0.1, 0.19, 0.25, 0.4];
const HUE: [f64; 10] = [
    0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 258.0, 270.0, 315.0, 359.9,
];

const TARGETS: [f64; 3] = [3.0, 4.5, 7.0];

/* The grounds a palette is actually solved against: the page in both modes, a
raised surface, and a mid brand, which is the case where neither black nor white
text is obviously right and a luminance heuristic picks wrong. */
const BACKGROUNDS: [&str; 5] = ["#ffffff", "#000000", "#fafafa", "#18181b", "#3b82f6"];

fn triple(color: Oklch) -> Value {
    json!({ "chroma": color.chroma, "hue": color.hue, "lightness": color.lightness })
}

fn grid() -> Vec<Oklch> {
    let mut colors = Vec::new();
    for lightness in LIGHTNESS {
        for chroma in CHROMA {
            for hue in HUE {
                colors.push(Oklch {
                    chroma,
                    hue,
                    lightness,
                });
            }
        }
    }
    colors
}

fn read(hex: &str) -> Oklch {
    hex_to_oklch(hex).expect("every hex in this file is one")
}

/// The whole document, in the order the keys are written.
///
/// **A `Map` built by insertion rather than a struct**, because `serde_json`'s own
/// map sorts, and the committed file is in the order the generator wrote it: the
/// header first and `statuses` last, where it was appended. Rewriting the file in
/// sorted order would be a diff of every line saying nothing about any value.
#[must_use]
pub fn oracle() -> Value {
    let colors = grid();
    let mut out = Map::new();

    /* Regenerating is cheap and reviewing a thousand changed floats is not, so
    the header says what to run rather than leaving a reader to guess. */
    out.insert(
        "//".to_owned(),
        json!("Generated from the Rust engine by `HELIX_BLESS_ORACLE=1 cargo test -p fusion-helix-theme -- --ignored bless`. Do not edit."),
    );

    out.insert(
        "colors".to_owned(),
        colors
            .iter()
            .map(|color| {
                let fitted = fit_to_gamut(*color, GAMUT_STEPS);
                let mut row = Map::new();
                row.insert("chroma".to_owned(), json!(color.chroma));
                row.insert("hue".to_owned(), json!(color.hue));
                row.insert("lightness".to_owned(), json!(color.lightness));
                /* The other bisection, dumped directly rather than left to be
                exercised through the search that calls it. */
                row.insert(
                    "fitted".to_owned(),
                    json!({
                        "chroma": fitted.chroma,
                        "hue": fitted.hue,
                        "lightness": fitted.lightness,
                        "hex": oklch_to_hex(fitted),
                    }),
                );
                row.insert("hex".to_owned(), json!(oklch_to_hex(*color)));
                row.insert("luminance".to_owned(), json!(relative_luminance(*color)));
                row.insert("outOfGamut".to_owned(), json!(is_out_of_gamut(*color)));
                row.insert(
                    "shippedLuminance".to_owned(),
                    json!(shipped_luminance(*color)),
                );
                Value::Object(row)
            })
            .collect::<Vec<_>>()
            .into(),
    );

    out.insert("distances".to_owned(), distances(&colors));

    /* The model is data, so it cannot drift by a float. It drifts by a typo in a
    token name, which solves a pair against a ground nobody paints and which no
    compiler would mention. */
    out.insert(
        "grounds".to_owned(),
        GROUNDS
            .iter()
            .map(|ground| json!({ "bounded": ground.bounded, "name": ground.name }))
            .collect::<Vec<_>>()
            .into(),
    );

    out.insert(
        "hexes".to_owned(),
        HEXES
            .iter()
            .map(|hex| {
                let color = read(hex);
                json!({
                    "chroma": color.chroma,
                    "hue": color.hue,
                    "lightness": color.lightness,
                    "hex": hex,
                    "roundTrip": oklch_to_hex(color),
                })
            })
            .collect::<Vec<_>>()
            .into(),
    );

    out.insert(
        "inks".to_owned(),
        INKS.iter()
            .map(|ink| {
                json!({
                    "contrast": match ink.contrast {
                        Contrast::Component => "component",
                        Contrast::Text => "text",
                    },
                    "grounds": ink.grounds,
                    "name": ink.name,
                })
            })
            .collect::<Vec<_>>()
            .into(),
    );

    out.insert("pairs".to_owned(), pairs(&colors));

    out.insert("searches".to_owned(), searches());

    /* Whole derived themes, which is what every phase is ultimately asserted
    against. The artifact is uniquely named tokens, so a disagreement names
    itself rather than needing a search bisected by hand. */
    out.insert("themes".to_owned(), themes());

    let by_status = |values: [f64; 4]| {
        let mut map = Map::new();
        for (name, value) in STATUS_NAMES.iter().zip(values) {
            map.insert((*name).to_owned(), json!(value));
        }
        Value::Object(map)
    };
    out.insert(
        "statuses".to_owned(),
        json!({ "chroma": by_status(STATUS_CHROMA), "hue": by_status(STATUS_HUE) }),
    );

    Value::Object(out)
}

/// Writes the oracle, when explicitly asked to.
///
/// Ignored *and* gated on an environment variable, which is one guard more than
/// it looks like it needs. `--ignored` keeps it out of a plain `cargo test`; the
/// variable keeps it out of a `--include-ignored` run, which is what a
/// thorough CI configuration reaches for. A snapshot that updates itself when
/// the suite is red is a suite that always passes.
#[test]
#[ignore = "rewrites the oracle; run it deliberately"]
fn bless() {
    assert!(
        std::env::var_os("HELIX_BLESS_ORACLE").is_some(),
        "set HELIX_BLESS_ORACLE=1 to rewrite the oracle. It is the record every \
         other test in this crate is asserted against, so overwriting it turns a \
         failure into a new expectation, and that has to be somebody's decision."
    );
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/rust/oracle.json");
    let written = format!(
        "{}\n",
        serde_json::to_string_pretty(&oracle()).expect("the oracle serializes")
    );
    std::fs::write(path, written).expect("the oracle is writable");
    println!("blessed {path}");
}

/// The distance table, and the lab triples that localize a disagreement in it.
fn distances(colors: &[Oklch]) -> Value {
    /* `perceptual_distance`, whose `hypot` of three is not the square root of the
    sum of the squares: a naive port differs on 37 per cent of inputs. It feeds a
    threshold the status hue search branches on, so a flipped comparison is a
    different palette rather than a last-place difference.

    The lab triples as well as the distance, so a disagreement can be localized:
    `hypot` fed the same three numbers, or `cos` and `sin` an ulp out upstream of
    it. Two very different answers. */
    let mut distances = Vec::new();
    for (at, a) in colors.iter().take(80).enumerate() {
        for b in colors.iter().skip(at + 1).take(3) {
            distances.push(json!({
                "a": triple(*a),
                "b": triple(*b),
                "distance": perceptual_distance(*a, *b),
                "labA": to_lab(*a),
                "labB": to_lab(*b),
            }));
        }
    }
    distances.into()
}

/// Every measured pair, against the grounds a palette is really solved against.
fn pairs(colors: &[Oklch]) -> Value {
    let mut pairs = Vec::new();
    for hex in BACKGROUNDS {
        let background = read(hex);
        for color in colors.iter().take(60) {
            pairs.push(json!({
                "background": triple(background),
                "color": triple(*color),
                "ratio": contrast_ratio(*color, background),
                "shipped": shipped_contrast_ratio(*color, background),
            }));
        }
    }
    pairs.into()
}

/// Every contrast search, across both directions and the undirected case.
fn searches() -> Value {
    let mut searches = Vec::new();
    for hex in BACKGROUNDS {
        let background = read(hex);
        for target in TARGETS {
            for chroma in [0.0, 0.1, 0.2] {
                for hue in [0.0, 145.0, 258.0] {
                    for darker in [None, Some(true), Some(false)] {
                        let solved = lightness_for_contrast(
                            chroma,
                            hue,
                            background,
                            target,
                            darker,
                            CONTRAST_STEPS,
                        );
                        searches.push(json!({
                            "background": triple(background),
                            "chroma": chroma,
                            "darker": darker,
                            "hex": oklch_to_hex(solved),
                            "hue": hue,
                            "lightness": solved.lightness,
                            "shipped": shipped_contrast_ratio(solved, background),
                            "target": target,
                        }));
                    }
                }
            }
        }
    }
    searches.into()
}

/// Whole derived themes, which is what every phase is ultimately asserted
/// against. The artifact is uniquely named tokens, so a disagreement names itself
/// rather than needing a search bisected by hand.
fn themes() -> Value {
    crate::oracle::labels()
        .into_iter()
        .map(|label| {
            let theme = derive_theme(&crate::oracle::intent_for(label))
                .expect("the oracle's intents all derive");
            let mut row = Map::new();
            row.insert("collisions".to_owned(), json!(theme.collisions));
            row.insert("css".to_owned(), json!(to_css(&theme, ":root")));
            row.insert("label".to_owned(), json!(label));
            row.insert("pairings".to_owned(), crate::shape::pairings(&theme));
            row.insert("seeds".to_owned(), crate::shape::seeds(&theme));
            row.insert("tokens".to_owned(), crate::shape::tokens(&theme));
            row.insert("violations".to_owned(), json!(theme.violations));
            Value::Object(row)
        })
        .collect::<Vec<_>>()
        .into()
}
