//! Reading an intent out of JSON.
//!
//! **Behind a feature, so the library it is part of stays dependency-free by
//! default.** The WASM wrapper takes its intent from a JavaScript object and has
//! no JSON to parse; the CLI reads a file and does. Making everyone carry
//! `serde` for the one consumer that needs it is how a small artifact stops
//! being small.
//!
//! Four of the intent's types are TypeScript unions, and a union is the one
//! shape `derive` cannot be pointed at:
//!
//! - `Color` is a hex string or a triple.
//! - `Brand` is a color or a pair of them, one per scheme.
//! - `Seed` is a color or a relationship.
//! - `StatusSeed` is a color or a bare hue.
//!
//! Each gets a wire enum that `serde(untagged)` *can* read, and a conversion.
//! The rest are plain derives on the types themselves.
//!
//! **`deny_unknown_fields` everywhere, which is a departure from the
//! TypeScript** and the right one: a mistyped key is silently ignored by
//! `JSON.parse` into a structural type, and this is a config file a person hand
//! writes. `contrastTraget` accepted and dropped is a theme that quietly ships
//! at AA when its author asked for AAA, and nothing anywhere would say so.
//!
//! It is also what makes the untagged reads unambiguous, which is worth knowing
//! before anyone relaxes it. `{ "hue": 30 }` is a `StatusSeed::Hue`, and
//! `{ "lightness": 0.5, "chroma": 0.1, "hue": 30 }` is a `Color::Oklch`; with
//! unknown fields allowed, the second matches the first with two keys thrown
//! away, and a pinned status color becomes a hue nudge without a word.

use serde::de::{Deserializer, Error as _, MapAccess, Visitor};
use serde::Deserialize;

use crate::intent::{Brand, BrandPair, Color, Relation, Seed, StatusSeed};
use crate::oklch::Oklch;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Triple {
    chroma: f64,
    hue: f64,
    lightness: f64,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum ColorWire {
    /* Hex first. A string and an object cannot be confused, so the order here is
    only about which error a reader sees when neither matches. */
    Hex(String),
    Oklch(Triple),
}

impl<'de> Deserialize<'de> for Color {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        Ok(match ColorWire::deserialize(reader)? {
            ColorWire::Hex(hex) => Self::Hex(hex),
            ColorWire::Oklch(triple) => Self::Oklch(Oklch {
                chroma: triple.chroma,
                hue: triple.hue,
                lightness: triple.lightness,
            }),
        })
    }
}

#[derive(Deserialize)]
#[serde(untagged)]
enum BrandWire {
    /* A color first, so a triple is read as one color. A pair's keys are
    `light` and `dark`, which no triple has, and `deny_unknown_fields` on both
    is what keeps the two apart. */
    One(Color),
    Each(BrandPair),
}

impl<'de> Deserialize<'de> for Brand {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        Ok(match BrandWire::deserialize(reader)? {
            BrandWire::One(color) => Self::One(color),
            BrandWire::Each(pair) => Self::Each(pair),
        })
    }
}

#[derive(Deserialize)]
#[serde(untagged)]
enum SeedWire {
    Color(Color),
    Relation(Relation),
}

impl<'de> Deserialize<'de> for Seed {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        Ok(match SeedWire::deserialize(reader)? {
            SeedWire::Color(color) => Self::Color(color),
            SeedWire::Relation(relation) => Self::Relation(relation),
        })
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct HueOnly {
    hue: Option<f64>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum StatusSeedWire {
    /* **Color first, and the order is load-bearing here.** A triple carries a
    `hue` of its own, so `HueOnly` would match one and drop the other two keys if
    it were tried first. `deny_unknown_fields` on `HueOnly` is what makes the
    reverse impossible; the order is what keeps the error message about the right
    variant. */
    Color(Color),
    Hue(HueOnly),
}

impl<'de> Deserialize<'de> for StatusSeed {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        Ok(match StatusSeedWire::deserialize(reader)? {
            StatusSeedWire::Color(color) => Self::Color(color),
            StatusSeedWire::Hue(hue) => Self::Hue(hue.hue),
        })
    }
}

/// `tokens` is a JSON object and the intent holds pairs.
///
/// **A `Vec` rather than a map, because the order is the emitted order**, and it
/// is the document's order: the TypeScript walks `Object.entries`, which is
/// insertion order, and an override appended to the token list lands where its
/// author put it. A `HashMap` would randomize that per run and a `BTreeMap`
/// would sort it, and both would emit a different file from the same input.
///
/// **Which is why this is a visitor rather than `Vec<(String, Color)>`.** Serde
/// reads that shape from a JSON *array* of pairs, so the derived version parses
/// nothing a consumer would ever write and says "invalid type: map, expected a
/// sequence" about a file that is correct.
///
/// # Errors
///
/// Whatever the reader reports, plus a duplicate key, which `JSON.parse` resolves
/// silently by keeping the last. A file naming one token twice is a file whose
/// author believed something untrue about one of the two lines.
pub fn tokens<'de, D: Deserializer<'de>>(
    reader: D,
) -> Result<Option<Vec<(String, Color)>>, D::Error> {
    struct Pairs;

    impl<'de> Visitor<'de> for Pairs {
        type Value = Vec<(String, Color)>;

        fn expecting(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            out.write_str("an object of token names to colors")
        }

        fn visit_map<M: MapAccess<'de>>(self, mut entries: M) -> Result<Self::Value, M::Error> {
            let mut pairs: Vec<(String, Color)> = Vec::new();
            while let Some((name, color)) = entries.next_entry::<String, Color>()? {
                if pairs.iter().any(|(earlier, _)| *earlier == name) {
                    return Err(M::Error::custom(format!(
                        "`{name}` is given twice, and only one of the two can be what you meant"
                    )));
                }
                pairs.push((name, color));
            }
            Ok(pairs)
        }
    }

    /* `Option` around the visitor rather than inside it: an absent `tokens` is
    `None` and an empty object is `Some([])`, and the two are the same output
    while meaning different things about the file. */
    reader.deserialize_option(OptionalMap(Pairs))
}

/// Threads `Option` through a visitor that only knows how to read a map.
struct OptionalMap<V>(V);

impl<'de, V> Visitor<'de> for OptionalMap<V>
where
    V: Visitor<'de>,
{
    type Value = Option<V::Value>;

    fn expecting(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.expecting(out)
    }

    fn visit_none<E: serde::de::Error>(self) -> Result<Self::Value, E> {
        Ok(None)
    }

    fn visit_unit<E: serde::de::Error>(self) -> Result<Self::Value, E> {
        Ok(None)
    }

    fn visit_some<D: Deserializer<'de>>(self, reader: D) -> Result<Self::Value, D::Error> {
        reader.deserialize_map(self.0).map(Some)
    }
}
