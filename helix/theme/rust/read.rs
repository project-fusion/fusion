//! Reading JSON at the JavaScript boundary, and naming what could not be read.
//!
//! **A refusal names the field and quotes the value, as the engine's own
//! refusals do**: "brand is not a color this engine can read, received red".
//! Serde's reader gives a line and a column, which in a file a person wrote is
//! where to look. Across the boundary the text is one line
//! `JSON.stringify` wrote, so "at line 1 column 35" points into a string the
//! caller never saw.
//!
//! **The text is read as it always was, and only a refusal is read again.** The
//! first reading is the one `helix theme build` makes, tokens in the order they
//! were written. When it refuses, the text is parsed into a [`Value`] and read a
//! second time by a deserializer that keeps the path it has walked, so the
//! refusal can say which field it stopped in and what was there.

use std::cell::RefCell;
use std::fmt;

use serde::de::value::BorrowedStrDeserializer;
use serde::de::{
    self, DeserializeOwned, DeserializeSeed, Deserializer, Expected, MapAccess, SeqAccess,
    Unexpected, Visitor,
};
use serde_json::Value;

/// Reads `text` as a `T`, or says which field could not be read and what was
/// in it.
///
/// `name` is what the whole value is called in a refusal. A key at the top is
/// named as it is written, `brand` and `font.base`, and an item of a list at
/// the top by `name` and its index, `selectors[0]`.
///
/// # Errors
///
/// The sentence a caller is shown, when `text` is not JSON or not a `T`.
pub fn read<T: DeserializeOwned>(text: &str, name: &str) -> Result<T, String> {
    let failure = match serde_json::from_str(text) {
        Ok(read) => return Ok(read),
        Err(failure) => failure,
    };
    /* Not JSON at all, which the wrapper never sends, so there is no field to
    name and the position is the useful part. */
    let Ok(value) = serde_json::from_str::<Value>(text) else {
        return Err(failure.to_string());
    };
    let trail = RefCell::new(Vec::new());
    match T::deserialize(Walked {
        trail: &trail,
        value: &value,
    }) {
        Err(refusal) => Err(refusal.sentence(name, &trail.borrow(), &value)),
        /* A refusal only the text can produce: a key written twice, which a
        `Value` holds once. */
        Ok(_) => Err(failure.to_string()),
    }
}

/// One step of the path from the top of the value to where a refusal is.
#[derive(Clone, Copy)]
enum Step<'v> {
    Index(usize),
    Key(&'v str),
}

/// Why a value could not be read, kept apart so each reads as a sentence.
#[derive(Debug)]
enum Refusal {
    /// A key the object does not have, and the ones it does.
    Field(&'static [&'static str]),
    /// A key the object needs and the value leaves out.
    Missing(&'static str),
    /// Anything serde says in a sentence of its own.
    Said(String),
    /// A value of the wrong kind, and what the field takes.
    Takes(String),
    /// A word the field does not take, and the ones it does.
    Variant(&'static [&'static str]),
}

impl Refusal {
    fn sentence(&self, name: &str, trail: &[Step<'_>], value: &Value) -> String {
        let named = label(name, trail);
        let received =
            at(value, trail).map_or_else(String::new, |found| format!(", received {found}"));
        match self {
            Self::Field(fields) => {
                let parent = label(name, &trail[..trail.len().saturating_sub(1)]);
                format!(
                    "{named} is not a field of {parent}. Its fields are {}",
                    listed(fields, "and")
                )
            }
            Self::Missing(field) => format!("{named} is missing `{field}`{received}"),
            Self::Said(message) => format!("{named}: {message}"),
            Self::Takes(expected) => format!("{named} is not {}{received}", noun(expected)),
            Self::Variant(words) => {
                format!("{named} is not one of {}{received}", listed(words, "or"))
            }
        }
    }
}

/// Only ever shown through [`Refusal::sentence`], which has the path; serde
/// asks for `Display` all the same.
impl fmt::Display for Refusal {
    fn fmt(&self, out: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Debug::fmt(self, out)
    }
}

impl std::error::Error for Refusal {}

impl de::Error for Refusal {
    fn custom<T: fmt::Display>(message: T) -> Self {
        Self::Said(message.to_string())
    }

    fn invalid_type(_: Unexpected<'_>, expected: &dyn Expected) -> Self {
        Self::Takes(expected.to_string())
    }

    fn invalid_value(_: Unexpected<'_>, expected: &dyn Expected) -> Self {
        Self::Takes(expected.to_string())
    }

    fn missing_field(field: &'static str) -> Self {
        Self::Missing(field)
    }

    fn unknown_field(_: &str, expected: &'static [&'static str]) -> Self {
        Self::Field(expected)
    }

    fn unknown_variant(_: &str, expected: &'static [&'static str]) -> Self {
        Self::Variant(expected)
    }
}

/// The path as a consumer writes it: `font.base`, `pairings[0].target`.
fn label(name: &str, trail: &[Step<'_>]) -> String {
    let mut label = String::new();
    for step in trail {
        label = match step {
            Step::Index(index) if label.is_empty() => format!("{name}[{index}]"),
            Step::Index(index) => format!("{label}[{index}]"),
            Step::Key(key) if label.is_empty() => (*key).to_owned(),
            Step::Key(key) => format!("{label}.{key}"),
        };
    }
    if label.is_empty() {
        name.to_owned()
    } else {
        label
    }
}

/// The value at the end of `trail`.
fn at<'v>(mut value: &'v Value, trail: &[Step<'_>]) -> Option<&'v Value> {
    for step in trail {
        value = match step {
            Step::Index(index) => value.get(*index)?,
            Step::Key(key) => value.get(*key)?,
        };
    }
    Some(value)
}

/// What a field takes, in the words JSON is written in. Serde names the Rust
/// type where a field holds one: `f64`, `struct Font`, `a sequence`.
fn noun(expected: &str) -> &str {
    match expected {
        "f64" => "a number",
        "a sequence" => "an array",
        _ if expected.starts_with("struct ") => "an object",
        _ => expected,
    }
}

/// Words in backticks, joined as a sentence joins them.
fn listed(words: &[&str], conjunction: &str) -> String {
    let quoted: Vec<String> = words.iter().map(|word| format!("`{word}`")).collect();
    match quoted.as_slice() {
        [] => String::new(),
        [one] => one.clone(),
        [first, second] => format!("{first} {conjunction} {second}"),
        [rest @ .., last] => format!("{}, {conjunction} {last}", rest.join(", ")),
    }
}

/// A [`Value`] read as serde reads one, with each key and index it enters
/// pushed onto `trail` and popped once it reads.
///
/// **A refusal leaves the trail where it stopped**, which is the whole
/// mechanism: nothing pops after an error, so the trail that is left is the
/// path to it.
struct Walked<'v, 't> {
    trail: &'t RefCell<Vec<Step<'v>>>,
    value: &'v Value,
}

impl<'v> Deserializer<'v> for Walked<'v, '_> {
    type Error = Refusal;

    fn deserialize_any<V: Visitor<'v>>(self, visitor: V) -> Result<V::Value, Refusal> {
        match self.value {
            Value::Array(items) => visitor.visit_seq(Items {
                left: items.iter().enumerate(),
                trail: self.trail,
            }),
            Value::Bool(value) => visitor.visit_bool(*value),
            Value::Null => visitor.visit_unit(),
            Value::Number(number) => {
                if let Some(value) = number.as_u64() {
                    visitor.visit_u64(value)
                } else if let Some(value) = number.as_i64() {
                    visitor.visit_i64(value)
                } else {
                    visitor.visit_f64(number.as_f64().unwrap_or(f64::NAN))
                }
            }
            Value::Object(entries) => visitor.visit_map(Entries {
                left: entries.iter(),
                pending: None,
                trail: self.trail,
            }),
            Value::String(text) => visitor.visit_borrowed_str(text),
        }
    }

    /* A unit enum is a word, and anything else in its place is refused with
    the words it takes. */
    fn deserialize_enum<V: Visitor<'v>>(
        self,
        _: &'static str,
        words: &'static [&'static str],
        visitor: V,
    ) -> Result<V::Value, Refusal> {
        match self.value {
            Value::String(text) => visitor.visit_enum(BorrowedStrDeserializer::new(text)),
            _ => Err(Refusal::Variant(words)),
        }
    }

    fn deserialize_option<V: Visitor<'v>>(self, visitor: V) -> Result<V::Value, Refusal> {
        if self.value.is_null() {
            visitor.visit_none()
        } else {
            visitor.visit_some(self)
        }
    }

    serde::forward_to_deserialize_any! {
        <W: Visitor<'v>>
        bool i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 f32 f64 char str string bytes
        byte_buf unit unit_struct newtype_struct seq tuple tuple_struct map struct
        identifier ignored_any
    }
}

/// What is left of an object to read.
struct Entries<'v, 't> {
    left: serde_json::map::Iter<'v>,
    pending: Option<(&'v str, &'v Value)>,
    trail: &'t RefCell<Vec<Step<'v>>>,
}

impl<'v> MapAccess<'v> for Entries<'v, '_> {
    type Error = Refusal;

    fn next_key_seed<K: DeserializeSeed<'v>>(
        &mut self,
        seed: K,
    ) -> Result<Option<K::Value>, Refusal> {
        let Some((key, value)) = self.left.next() else {
            return Ok(None);
        };
        self.pending = Some((key, value));
        /* On the trail while it is read, so a key the object does not have is
        the one named. */
        self.trail.borrow_mut().push(Step::Key(key));
        let read = seed.deserialize(BorrowedStrDeserializer::new(key))?;
        self.trail.borrow_mut().pop();
        Ok(Some(read))
    }

    fn next_value_seed<S: DeserializeSeed<'v>>(&mut self, seed: S) -> Result<S::Value, Refusal> {
        let Some((key, value)) = self.pending.take() else {
            return Err(de::Error::custom("a value was read before its key"));
        };
        self.trail.borrow_mut().push(Step::Key(key));
        let read = seed.deserialize(Walked {
            trail: self.trail,
            value,
        })?;
        self.trail.borrow_mut().pop();
        Ok(read)
    }
}

/// What is left of an array to read, each item with its index.
struct Items<'v, 't> {
    left: std::iter::Enumerate<std::slice::Iter<'v, Value>>,
    trail: &'t RefCell<Vec<Step<'v>>>,
}

impl<'v> SeqAccess<'v> for Items<'v, '_> {
    type Error = Refusal;

    fn next_element_seed<S: DeserializeSeed<'v>>(
        &mut self,
        seed: S,
    ) -> Result<Option<S::Value>, Refusal> {
        let Some((index, value)) = self.left.next() else {
            return Ok(None);
        };
        self.trail.borrow_mut().push(Step::Index(index));
        let read = seed.deserialize(Walked {
            trail: self.trail,
            value,
        })?;
        self.trail.borrow_mut().pop();
        Ok(Some(read))
    }
}

#[cfg(test)]
mod tests {
    use super::read;
    use crate::intent::{Color, ThemeIntent};

    fn refused(json: &str) -> String {
        read::<ThemeIntent>(json, "the intent").expect_err("the intent is refused")
    }

    #[test]
    fn a_refusal_names_the_field_and_quotes_the_value() {
        assert_eq!(
            refused(r#"{"brand":255}"#),
            "brand is not a color this engine can read, or one for each scheme, received 255"
        );
        assert_eq!(
            refused(r#"{"background":{"light":true}}"#),
            "background.light is not a color this engine can read, received true"
        );
        assert_eq!(
            refused(r#"{"tokens":{"color-primary":5}}"#),
            "tokens.color-primary is not a color this engine can read, received 5"
        );
        assert_eq!(
            refused(r#"{"status":{"danger":true}}"#),
            "status.danger is not a color this engine can read, or a hue, received true"
        );
        assert_eq!(
            refused(r#"{"contrastTarget":"4.5"}"#),
            r#"contrastTarget is not a number, received "4.5""#
        );
        assert_eq!(
            refused(r#"{"font":"Inter"}"#),
            r#"font is not an object, received "Inter""#
        );
        assert_eq!(
            refused(r#"{"scheme":"sepia"}"#),
            r#"scheme is not one of `dark` or `light`, received "sepia""#
        );
        assert_eq!(
            refused(r#"{"pairings":[{"background":"color-surface","foreground":"x"}]}"#),
            r#"pairings[0] is missing `target`, received {"background":"color-surface","foreground":"x"}"#
        );
        assert_eq!(refused("5"), "the intent is not an object, received 5");
    }

    #[test]
    fn a_key_the_object_does_not_have_is_named_with_the_ones_it_does() {
        assert_eq!(
            refused(r#"{"font":{"bodyy":"Inter"}}"#),
            "font.bodyy is not a field of font. Its fields are `base`, `body`, `display`, \
             `mono`, `scale`, and `weight`"
        );
        assert!(refused(r#"{"brnad":"red"}"#)
            .starts_with("brnad is not a field of the intent. Its fields are `accent`, "));
    }

    #[test]
    fn a_list_at_the_top_is_named_by_its_name() {
        assert_eq!(
            read::<Vec<String>>(r#"":root""#, "selectors").expect_err("refused"),
            r#"selectors is not an array, received ":root""#
        );
        assert_eq!(
            read::<Vec<String>>(r#"[":root",5]"#, "selectors").expect_err("refused"),
            "selectors[1] is not a string, received 5"
        );
    }

    #[test]
    fn an_intent_that_reads_is_the_one_the_text_holds() {
        let intent = read::<ThemeIntent>(
            r##"{"tokens":{"color-surface":"#ffffff","color-border":"#d9d9d9"}}"##,
            "the intent",
        )
        .expect("reads");
        let names: Vec<&str> = intent
            .tokens
            .iter()
            .flatten()
            .map(|(name, _)| name.as_str())
            .collect();
        assert_eq!(names, ["color-surface", "color-border"]);
        assert_eq!(
            intent.tokens.expect("tokens")[0].1,
            Color::Hex("#ffffff".to_owned())
        );
    }
}
