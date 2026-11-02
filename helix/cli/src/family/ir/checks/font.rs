//! What a rule's `font` shorthand is held to.
//!
//! **A `font` shorthand names a size and a family, or is a keyword.** A browser
//! drops any other value, and a phone drops it in its splitting of the shorthand
//! and lists it among what it could not draw, so nothing at any step said the
//! text had lost its font. A value that names a token, a hook, or anything else
//! read only as it draws is taken as written.

use crate::family::ir::{Rule, Value};

/// The words of a literal `font` value, or nothing where any part of it is read later.
fn words(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::Text(text) => Some(text.split_whitespace().map(str::to_owned).collect()),
        Value::Web(inner) => words(inner),
        Value::Space(values) => {
            let mut all = Vec::new();
            for one in values {
                all.extend(words(one)?);
            }
            Some(all)
        }
        _ => None,
    }
}

/// Whether a word is a size: a length, a percentage, or `calc()`.
fn sized(word: &str) -> bool {
    word.starts_with("calc(")
        || word
            .trim_start_matches('-')
            .starts_with(|letter: char| letter.is_ascii_digit() || letter == '.')
}

/// Whether a size carries a unit, which a bare weight before it does not.
fn has_unit(word: &str) -> bool {
    word.starts_with("calc(")
        || word.split('/').next().is_some_and(|size| {
            sized(size)
                && size.contains(|letter: char| letter.is_ascii_alphabetic() || letter == '%')
        })
}

/// Whether the words name a keyword, or a size and a family after it, as a browser reads them.
fn parses(words: &[String]) -> bool {
    if let [only] = words {
        if ["inherit", "initial", "revert", "unset"].contains(&only.as_str()) {
            return true;
        }
    }
    let Some(at) = words.iter().position(|word| has_unit(word)) else {
        return false;
    };
    let rest = &words[at + 1..];
    let family = match rest {
        [slash, _, family @ ..] if slash == "/" => family,
        [height, family @ ..] if height.starts_with('/') => family,
        family => family,
    };
    !family.is_empty()
}

/// What is wrong with a rule's `font`, where it writes one that does not parse.
#[must_use]
pub fn fault(rule: &Rule) -> Option<String> {
    let (_, value) = rule.set.iter().find(|set| set.0 == "font")?;
    let read = words(value)?;
    if parses(&read) {
        return None;
    }
    let at = rule
        .at
        .clone()
        .unwrap_or_else(|| format!("rule {}", rule.order + 1));
    Some(format!(
        "{at}: `font: {}` names no size and family. Write a keyword, or a size with a family.",
        read.join(" ")
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok(text: &str) -> bool {
        parses(
            &text
                .split_whitespace()
                .map(str::to_owned)
                .collect::<Vec<_>>(),
        )
    }

    #[test]
    fn takes_a_keyword_and_a_size_with_a_family() {
        for text in [
            "inherit",
            "unset",
            "14px sans-serif",
            "italic bold 1rem/1.5 Inter, sans-serif",
            "500 14px / 1.2 Inter",
            "calc(1rem + 1px) Inter",
        ] {
            assert!(ok(text), "{text}");
        }
    }

    #[test]
    fn refuses_a_value_with_no_size_or_no_family() {
        for text in ["bold", "14px", "Inter", "bold Inter", "1rem/1.5", "500", ""] {
            assert!(!ok(text), "{text}");
        }
    }
}
