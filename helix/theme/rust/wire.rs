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
//! **Each wire enum ends in [`Shape`], which reads anything**, so a value that
//! is none of the union's kinds is refused by the conversion, by the field it
//! is in and what that field takes: `brand is not a color this engine can read,
//! or one for each scheme, received 255`. Without it, serde refuses it with
//! `data did not match any variant of untagged enum BrandWire`, which names a
//! type in this file and nothing a consumer wrote. A union read in more than
//! one field, a status or a page, is read through a function per field that
//! carries its name.
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

use serde::de::{Deserializer, Error as _, IgnoredAny, MapAccess, SeqAccess, Visitor};
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
    Other(Shape),
}

/// What a field holding a color takes, in a refusal.
const A_COLOR: &str = "a color this engine can read";

/// A color read, or refused by `label`, the field it was given in.
fn color<E: serde::de::Error>(wire: ColorWire, label: &str) -> Result<Color, E> {
    match wire {
        ColorWire::Hex(hex) => Ok(Color::Hex(hex)),
        ColorWire::Oklch(triple) => Ok(Color::Oklch(Oklch {
            chroma: triple.chroma,
            hue: triple.hue,
            lightness: triple.lightness,
        })),
        ColorWire::Other(shape) => Err(shape.refused(label, A_COLOR)),
    }
}

/// **Read without a name only inside a union**, whose refusal replaces this
/// one. A field holding a color is read through [`page`] or [`tokens`].
impl<'de> Deserialize<'de> for Color {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        color(ColorWire::deserialize(reader)?, "the value")
    }
}

/// `background.dark`, read by its name.
///
/// # Errors
///
/// Whatever the reader reports, and a value that is not a color.
pub fn dark_page<'de, D: Deserializer<'de>>(reader: D) -> Result<Option<Color>, D::Error> {
    page(reader, "background.dark")
}

/// `background.light`, read by its name.
///
/// # Errors
///
/// Whatever the reader reports, and a value that is not a color.
pub fn light_page<'de, D: Deserializer<'de>>(reader: D) -> Result<Option<Color>, D::Error> {
    page(reader, "background.light")
}

fn page<'de, D: Deserializer<'de>>(reader: D, label: &str) -> Result<Option<Color>, D::Error> {
    Option::<ColorWire>::deserialize(reader)?
        .map(|wire| color(wire, label))
        .transpose()
}

#[derive(Deserialize)]
#[serde(untagged)]
enum BrandWire {
    /* A color first, so a triple is read as one color. A pair's keys are
    `light` and `dark`, which no triple has, and `deny_unknown_fields` on both
    is what keeps the two apart. */
    One(Color),
    Each(BrandPair),
    Other(Shape),
}

impl<'de> Deserialize<'de> for Brand {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        Ok(match BrandWire::deserialize(reader)? {
            BrandWire::One(color) => Self::One(color),
            BrandWire::Each(pair) => Self::Each(pair),
            BrandWire::Other(shape) => {
                return Err(shape.refused(
                    "brand",
                    "a color this engine can read, or one for each scheme",
                ))
            }
        })
    }
}

#[derive(Deserialize)]
#[serde(untagged)]
enum SeedWire {
    Color(Color),
    Relation(Relation),
    Other(Shape),
}

impl<'de> Deserialize<'de> for Seed {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        Ok(match SeedWire::deserialize(reader)? {
            SeedWire::Color(color) => Self::Color(color),
            SeedWire::Relation(relation) => Self::Relation(relation),
            SeedWire::Other(shape) => {
                return Err(shape.refused(
                    "accent",
                    "a color this engine can read, or a relation to the brand",
                ))
            }
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
    Other(Shape),
}

/// `status.danger`, read by its name.
///
/// # Errors
///
/// Whatever the reader reports, and a value that is neither a color nor a hue.
pub fn danger<'de, D: Deserializer<'de>>(reader: D) -> Result<Option<StatusSeed>, D::Error> {
    status(reader, "status.danger")
}

/// `status.info`, read by its name.
///
/// # Errors
///
/// Whatever the reader reports, and a value that is neither a color nor a hue.
pub fn info<'de, D: Deserializer<'de>>(reader: D) -> Result<Option<StatusSeed>, D::Error> {
    status(reader, "status.info")
}

/// `status.success`, read by its name.
///
/// # Errors
///
/// Whatever the reader reports, and a value that is neither a color nor a hue.
pub fn success<'de, D: Deserializer<'de>>(reader: D) -> Result<Option<StatusSeed>, D::Error> {
    status(reader, "status.success")
}

/// `status.warning`, read by its name.
///
/// # Errors
///
/// Whatever the reader reports, and a value that is neither a color nor a hue.
pub fn warning<'de, D: Deserializer<'de>>(reader: D) -> Result<Option<StatusSeed>, D::Error> {
    status(reader, "status.warning")
}

fn status<'de, D: Deserializer<'de>>(
    reader: D,
    label: &str,
) -> Result<Option<StatusSeed>, D::Error> {
    Option::<StatusSeedWire>::deserialize(reader)?
        .map(|wire| match wire {
            StatusSeedWire::Color(color) => Ok(StatusSeed::Color(color)),
            StatusSeedWire::Hue(hue) => Ok(StatusSeed::Hue(hue.hue)),
            StatusSeedWire::Other(shape) => {
                Err(shape.refused(label, "a color this engine can read, or a hue"))
            }
        })
        .transpose()
}

/// A value that is none of a union's kinds, kept as far as its refusal needs.
///
/// **The last kind of every wire enum, and the order is load-bearing**: an
/// untagged enum takes the first kind that reads, and this one reads anything.
enum Shape {
    Bool(bool),
    Float(f64),
    Map,
    Null,
    Seq,
    Signed(i64),
    Text(String),
    Unsigned(u64),
}

impl Shape {
    /// The refusal of this value in the field `label`, which takes `expected`.
    fn refused<E: serde::de::Error>(&self, label: &str, expected: &str) -> E {
        E::custom(format_args!("{label} is not {expected}, received {self}"))
    }
}

/// As JSON writes a value, and an object or an array by its kind.
impl std::fmt::Display for Shape {
    fn fmt(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Bool(value) => write!(out, "{value}"),
            Self::Float(value) => write!(out, "{value}"),
            Self::Map => out.write_str("an object"),
            Self::Null => out.write_str("null"),
            Self::Seq => out.write_str("an array"),
            Self::Signed(value) => write!(out, "{value}"),
            Self::Text(value) => write!(out, "{value:?}"),
            Self::Unsigned(value) => write!(out, "{value}"),
        }
    }
}

impl<'de> Deserialize<'de> for Shape {
    fn deserialize<D: Deserializer<'de>>(reader: D) -> Result<Self, D::Error> {
        struct Anything;

        impl<'de> Visitor<'de> for Anything {
            type Value = Shape;

            fn expecting(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                out.write_str("any value")
            }

            fn visit_bool<E>(self, value: bool) -> Result<Shape, E> {
                Ok(Shape::Bool(value))
            }

            fn visit_f64<E>(self, value: f64) -> Result<Shape, E> {
                Ok(Shape::Float(value))
            }

            fn visit_i64<E>(self, value: i64) -> Result<Shape, E> {
                Ok(Shape::Signed(value))
            }

            fn visit_map<M: MapAccess<'de>>(self, mut entries: M) -> Result<Shape, M::Error> {
                while entries.next_entry::<IgnoredAny, IgnoredAny>()?.is_some() {}
                Ok(Shape::Map)
            }

            fn visit_none<E>(self) -> Result<Shape, E> {
                Ok(Shape::Null)
            }

            fn visit_seq<S: SeqAccess<'de>>(self, mut items: S) -> Result<Shape, S::Error> {
                while items.next_element::<IgnoredAny>()?.is_some() {}
                Ok(Shape::Seq)
            }

            fn visit_str<E>(self, value: &str) -> Result<Shape, E> {
                Ok(Shape::Text(value.to_owned()))
            }

            fn visit_u64<E>(self, value: u64) -> Result<Shape, E> {
                Ok(Shape::Unsigned(value))
            }

            fn visit_unit<E>(self) -> Result<Shape, E> {
                Ok(Shape::Null)
            }
        }

        reader.deserialize_any(Anything)
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
            while let Some((name, wire)) = entries.next_entry::<String, ColorWire>()? {
                if pairs.iter().any(|(earlier, _)| *earlier == name) {
                    return Err(M::Error::custom(format!(
                        "`{name}` is given twice, and only one of the two can be what you meant"
                    )));
                }
                let read = color(wire, &format!("tokens.{name}"))?;
                pairs.push((name, read));
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

#[cfg(test)]
mod tests {
    use crate::intent::ThemeIntent;

    /// The refusal without its position, which is the file's and not the
    /// wording's.
    fn refused(json: &str) -> String {
        let refusal = serde_json::from_str::<ThemeIntent>(json)
            .expect_err("the intent is refused")
            .to_string();
        refusal
            .split(" at line ")
            .next()
            .unwrap_or_default()
            .to_owned()
    }

    #[test]
    fn a_union_that_reads_as_none_of_its_kinds_is_refused_by_its_field() {
        assert_eq!(
            refused(r#"{"brand": 255}"#),
            "brand is not a color this engine can read, or one for each scheme, received 255"
        );
        assert_eq!(
            refused(r#"{"background": {"light": true}}"#),
            "background.light is not a color this engine can read, received true"
        );
        assert_eq!(
            refused(r#"{"accent": {"from": "brand"}}"#),
            "accent is not a color this engine can read, or a relation to the brand, \
             received an object"
        );
        assert_eq!(
            refused(r##"{"status": {"info": "#0075af", "danger": [27, 1]}}"##),
            "status.danger is not a color this engine can read, or a hue, received an array"
        );
        assert_eq!(
            refused(r#"{"tokens": {"color-primary": null}}"#),
            "tokens.color-primary is not a color this engine can read, received null"
        );
    }

    #[test]
    fn each_union_still_reads_every_kind_it_takes() {
        let intent: ThemeIntent = serde_json::from_str(
            r##"{
                "accent": {"from": "brand", "rotate": 180},
                "background": {"light": {"chroma": 0.01, "hue": 80, "lightness": 0.97}},
                "brand": {"dark": "#7dd3fc", "light": "#1e3a8a"},
                "status": {"danger": {"hue": 20}, "info": "#0075af"},
                "tokens": {"color-primary": {"chroma": 0.2, "hue": 250, "lightness": 0.5}}
            }"##,
        )
        .expect("every kind reads");
        assert!(matches!(intent.brand, Some(crate::intent::Brand::Each(_))));
        assert!(matches!(
            intent.accent,
            Some(crate::intent::Seed::Relation(_))
        ));
    }
}
