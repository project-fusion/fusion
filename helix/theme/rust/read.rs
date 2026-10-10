//! Reading JSON at the JavaScript boundary.
//!
//! **A refusal names its field and drops serde's position.** Across the
//! boundary the text is one line `JSON.stringify` wrote, so "at line 1 column
//! 35" points into a string the caller never saw. The CLI reads the same types
//! through the same reader and keeps the position, which in a file a person
//! wrote is where to look.
//!
//! **The position becomes the field, and nothing is read twice.** A refusal
//! serde raises itself, such as a number written as a string or a key the
//! object does not have, is placed at the value or key it is about, so the
//! deepest value holding that place is the field. A union names its own
//! field in its refusal, in `wire.rs`, because serde places that refusal after
//! the object around it. Measured October 10, 2026: a second reading of the
//! text, through a deserializer that kept its path, named every field too, and
//! took the module from 493,294 bytes to 638,344.

use serde::de::DeserializeOwned;
use serde_json::error::Category;

/// How deep the field search goes, which is where serde stops reading too.
const DEPTH: usize = 128;

/// Reads `text` as a `T`.
///
/// `name` is what the whole value is called, and is empty for the intent,
/// whose fields are named as they are written: `brand`, `font.base`.
///
/// # Errors
///
/// The sentence a caller is shown, when `text` is not JSON or not a `T`.
pub fn read<T: DeserializeOwned>(text: &str, name: &str) -> Result<T, String> {
    serde_json::from_str(text).map_err(|failure| refusal(text, name, &failure))
}

fn refusal(text: &str, name: &str, failure: &serde_json::Error) -> String {
    let message = failure.to_string();
    /* Text that is not JSON has no field to name, and its position is where it
    stops being JSON. */
    if failure.classify() != Category::Data || failure.line() == 0 {
        return message;
    }
    let place = format!(" at line {} column {}", failure.line(), failure.column());
    let reason = worded(message.strip_suffix(&place).unwrap_or(&message));
    let field = offset(text, failure.line(), failure.column())
        .map(|at| format!("{name}{}", path(text, at)))
        .unwrap_or_default();
    /* A union's refusal starts with its own field, which is the place serde
    gives it or a field under that place. */
    if field.is_empty() || reason.starts_with(&field) {
        reason
    } else {
        format!("{field}: {reason}")
    }
}

/// Serde's reason in the words JSON is written in, where it names the Rust
/// type a number field holds. A struct's refusal says "an object" through
/// `expecting` in `intent.rs`.
fn worded(reason: &str) -> String {
    reason.strip_suffix(", expected f64").map_or_else(
        || reason.to_owned(),
        |head| format!("{head}, expected a number"),
    )
}

/// The byte serde's line and column point at. The column counts bytes from the
/// start of the line.
fn offset(text: &str, line: usize, column: usize) -> Option<usize> {
    let start = match line {
        0 | 1 => 0,
        _ => text.match_indices('\n').nth(line - 2)?.0 + 1,
    };
    Some(start + column)
}

/// The path to the deepest value that holds byte `at`, from its first byte to
/// just past its last, as a consumer writes it: `font.base`, `pairings[0]`.
/// Empty for the whole text.
fn path(text: &str, at: usize) -> String {
    let mut scan = Scan {
        at,
        bytes: text.as_bytes(),
        found: None,
        next: 0,
        path: Vec::new(),
    };
    scan.value();
    scan.found.unwrap_or_default()
}

/// A walk over JSON text that keeps the path to where it is, and stops looking
/// once it has found the value at `at`.
struct Scan<'t> {
    at: usize,
    bytes: &'t [u8],
    found: Option<String>,
    next: usize,
    path: Vec<String>,
}

impl Scan<'_> {
    fn value(&mut self) {
        self.space();
        let start = self.next;
        match self.bytes.get(self.next) {
            None => return,
            Some(b'{') => self.entries(b'}'),
            Some(b'[') => self.entries(b']'),
            Some(b'"') => self.string(),
            Some(_) => {
                while self.bytes.get(self.next).is_some_and(|byte| {
                    !matches!(byte, b',' | b'}' | b']' | b' ' | b'\n' | b'\r' | b'\t')
                }) {
                    self.next += 1;
                }
            }
        }
        /* An inner value ends first, so the first to hold the place is the
        deepest. Serde places a refusal at the end of a value, or at the start
        of an object or array given where something else belongs. */
        if self.found.is_none() && start <= self.at && self.at <= self.next {
            self.found = Some(self.path.concat());
        }
    }

    /// An object's entries or an array's items, through the closing `end`.
    fn entries(&mut self, end: u8) {
        self.next += 1;
        let mut index = 0;
        loop {
            self.space();
            match self.bytes.get(self.next) {
                None => return,
                Some(&byte) if byte == end => {
                    self.next += 1;
                    return;
                }
                Some(b',') => {
                    self.next += 1;
                    continue;
                }
                Some(_) => {}
            }
            let step = if end == b'}' {
                let from = self.next + 1;
                self.string();
                let key = self
                    .bytes
                    .get(from..self.next.saturating_sub(1))
                    .map(String::from_utf8_lossy)
                    .unwrap_or_default();
                let step = if self.path.is_empty() {
                    key.into_owned()
                } else {
                    format!(".{key}")
                };
                self.space();
                /* The colon. */
                self.next += 1;
                step
            } else {
                index += 1;
                format!("[{}]", index - 1)
            };
            if self.path.len() == DEPTH {
                return;
            }
            self.path.push(step);
            self.value();
            self.path.pop();
        }
    }

    fn string(&mut self) {
        self.next += 1;
        while let Some(&byte) = self.bytes.get(self.next) {
            self.next += 1;
            match byte {
                b'\\' => self.next += 1,
                b'"' => return,
                _ => {}
            }
        }
    }

    fn space(&mut self) {
        while self
            .bytes
            .get(self.next)
            .is_some_and(|byte| matches!(byte, b' ' | b'\n' | b'\r' | b'\t'))
        {
            self.next += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::read;
    use crate::intent::ThemeIntent;

    fn refused(json: &str) -> String {
        read::<ThemeIntent>(json, "").expect_err("the intent is refused")
    }

    #[test]
    fn a_refusal_names_its_field_and_carries_no_position() {
        for (json, refusal) in [
            (
                r#"{"brand":255}"#,
                "brand is not a color this engine can read, or one for each scheme, received 255",
            ),
            (
                r#"{"brand":255,"density":1}"#,
                "brand is not a color this engine can read, or one for each scheme, received 255",
            ),
            (
                r#"{"contrastTarget":"4.5"}"#,
                r#"contrastTarget: invalid type: string "4.5", expected a number"#,
            ),
            (
                r#"{"font":{"base":"14","body":"Inter"}}"#,
                r#"font.base: invalid type: string "14", expected a number"#,
            ),
            (
                r#"{"font":"Inter"}"#,
                r#"font: invalid type: string "Inter", expected an object"#,
            ),
            (
                r#"{"tokens":["color-surface"],"density":1}"#,
                "tokens: invalid type: sequence, expected an object of token names to colors",
            ),
            (
                r#"{"scheme":"sepia"}"#,
                "scheme: unknown variant `sepia`, expected `dark` or `light`",
            ),
            (
                r#"{"pairings":{"background":"color-surface"}}"#,
                "pairings: invalid type: map, expected a sequence",
            ),
            (
                r#"{"pairings":[{"background":"color-surface","foreground":"x"}]}"#,
                "pairings[0]: missing field `target`",
            ),
            (
                r#"{"status":{"danger":true}}"#,
                "status.danger is not a color this engine can read, or a hue, received true",
            ),
            (
                r#"{"tokens":{"color-surface":5,"color-border":"x"}}"#,
                "tokens.color-surface is not a color this engine can read, received 5",
            ),
        ] {
            assert_eq!(refused(json), refusal, "{json}");
        }
    }

    #[test]
    fn a_key_the_object_does_not_have_is_named_under_its_object() {
        assert!(refused(r#"{"font":{"bodyy":"Inter"}}"#)
            .starts_with("font: unknown field `bodyy`, expected one of `base`, "));
        assert!(refused(r#"{"brnad":"red"}"#)
            .starts_with("unknown field `brnad`, expected one of `accent`, "));
    }

    #[test]
    fn a_list_at_the_top_is_named_by_its_name() {
        assert_eq!(
            read::<Vec<String>>(r#"[":root",5]"#, "selectors").expect_err("refused"),
            "selectors[1]: invalid type: integer `5`, expected a string"
        );
        assert_eq!(
            read::<Vec<String>>(r#"":root""#, "selectors").expect_err("refused"),
            r#"selectors: invalid type: string ":root", expected a sequence"#
        );
    }

    #[test]
    fn text_that_is_not_json_keeps_its_position() {
        assert_eq!(
            refused(r##"{"brand":"#fff""##),
            "EOF while parsing an object at line 1 column 15"
        );
    }
}
