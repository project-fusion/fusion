//! A token's value as `tokens.ts` writes it: a call to a typed builder, such
//! as `times(rem(2.5), density)`, read as syntax and never run.
//!
//! **A subset of TypeScript, and it refuses the rest.** A value is a number, a
//! single-quoted string, a name, a call, an object of named values or an array,
//! so anything a reader would have to execute, such as an operator or a
//! template, is refused with a sentence naming it. [`print`] writes a typed
//! expression back as builder calls, which is how a token is held to print
//! back as it was written.

pub mod print;

#[cfg(test)]
mod tests;

use std::fmt;

/// One value in builder syntax.
#[derive(Clone, Debug, PartialEq)]
pub enum Built {
    /// A builder and its arguments, such as `rem(2.5)`.
    Call(String, Vec<Built>),
    /// `[...]`.
    List(Vec<Built>),
    /// A name the builders export, such as `density` or `transparent`.
    Name(String),
    Number(f64),
    /// `{ key: value }`, in the order written.
    Object(Vec<(String, Built)>),
    /// A single-quoted string, without its quotes.
    Text(String),
}

/// The builder value `text` holds, with whitespace and comments around it
/// ignored.
///
/// # Errors
///
/// A sentence naming what in `text` is outside the subset, or where it ends
/// early.
pub fn parse(text: &str) -> Result<Built, String> {
    let characters: Vec<char> = text.chars().collect();
    let mut at = 0;
    let value = value(&characters, &mut at, text)?;
    skip(&characters, &mut at);
    if at < characters.len() {
        return Err(format!(
            "`{}` continues past its value at `{}`",
            text.trim(),
            characters[at..].iter().collect::<String>().trim()
        ));
    }
    Ok(value)
}

/// Passes whitespace and comments.
fn skip(characters: &[char], at: &mut usize) {
    loop {
        while characters.get(*at).is_some_and(|one| one.is_whitespace()) {
            *at += 1;
        }
        match (characters.get(*at), characters.get(*at + 1)) {
            (Some('/'), Some('*')) => {
                *at += 2;
                while *at < characters.len()
                    && !(characters[*at] == '*' && characters.get(*at + 1) == Some(&'/'))
                {
                    *at += 1;
                }
                *at = (*at + 2).min(characters.len());
            }
            (Some('/'), Some('/')) => {
                while characters.get(*at).is_some_and(|one| *one != '\n') {
                    *at += 1;
                }
            }
            _ => return,
        }
    }
}

fn value(characters: &[char], at: &mut usize, text: &str) -> Result<Built, String> {
    skip(characters, at);
    let Some(&character) = characters.get(*at) else {
        return Err(format!("`{}` ends where it expects a value", text.trim()));
    };
    match character {
        '0'..='9' | '-' | '.' => number(characters, at, text),
        '\'' => quoted(characters, at, text).map(Built::Text),
        '[' => {
            *at += 1;
            items(characters, at, ']', text).map(Built::List)
        }
        '{' => {
            *at += 1;
            object(characters, at, text).map(Built::Object)
        }
        one if one.is_ascii_alphabetic() || one == '_' => {
            let name = name(characters, at);
            skip(characters, at);
            if characters.get(*at) == Some(&'(') {
                *at += 1;
                return items(characters, at, ')', text)
                    .map(|arguments| Built::Call(name, arguments));
            }
            Ok(Built::Name(name))
        }
        other => Err(format!(
            "`{}` holds `{other}`, which no builder value is written with",
            text.trim()
        )),
    }
}

fn name(characters: &[char], at: &mut usize) -> String {
    let start = *at;
    while characters
        .get(*at)
        .is_some_and(|one| one.is_ascii_alphanumeric() || *one == '_')
    {
        *at += 1;
    }
    characters[start..*at].iter().collect()
}

fn number(characters: &[char], at: &mut usize, text: &str) -> Result<Built, String> {
    let start = *at;
    if characters[*at] == '-' {
        *at += 1;
    }
    while characters
        .get(*at)
        .is_some_and(|one| one.is_ascii_digit() || *one == '.' || *one == '_')
    {
        *at += 1;
    }
    let digits: String = characters[start..*at]
        .iter()
        .filter(|one| **one != '_')
        .collect();
    digits
        .parse::<f64>()
        .map(Built::Number)
        .map_err(|_| format!("`{}` writes `{digits}`, which is not a number", text.trim()))
}

fn quoted(characters: &[char], at: &mut usize, text: &str) -> Result<String, String> {
    *at += 1;
    let mut out = String::new();
    while let Some(&one) = characters.get(*at) {
        *at += 1;
        match one {
            '\'' => return Ok(out),
            '\\' => match characters.get(*at) {
                Some(&escaped @ ('\'' | '\\')) => {
                    out.push(escaped);
                    *at += 1;
                }
                _ => return Err(format!("`{}` escapes a character in a string", text.trim())),
            },
            _ => out.push(one),
        }
    }
    Err(format!("`{}` leaves a string unclosed", text.trim()))
}

/// Values separated by commas up to `close`, a trailing comma allowed.
fn items(
    characters: &[char],
    at: &mut usize,
    close: char,
    text: &str,
) -> Result<Vec<Built>, String> {
    let mut found = Vec::new();
    loop {
        skip(characters, at);
        if characters.get(*at) == Some(&close) {
            *at += 1;
            return Ok(found);
        }
        found.push(value(characters, at, text)?);
        skip(characters, at);
        match characters.get(*at) {
            Some(',') => *at += 1,
            Some(&one) if one == close => {}
            _ => return Err(format!("`{}` leaves a `{close}` unclosed", text.trim())),
        }
    }
}

fn object(characters: &[char], at: &mut usize, text: &str) -> Result<Vec<(String, Built)>, String> {
    let mut found = Vec::new();
    loop {
        skip(characters, at);
        if characters.get(*at) == Some(&'}') {
            *at += 1;
            return Ok(found);
        }
        if !characters.get(*at).is_some_and(char::is_ascii_alphabetic) {
            return Err(format!(
                "`{}` holds an object key that is not a name",
                text.trim()
            ));
        }
        let key = name(characters, at);
        skip(characters, at);
        if characters.get(*at) != Some(&':') {
            return Err(format!("`{}` gives `{key}` no value", text.trim()));
        }
        *at += 1;
        found.push((key, value(characters, at, text)?));
        skip(characters, at);
        match characters.get(*at) {
            Some(',') => *at += 1,
            Some('}') => {}
            _ => return Err(format!("`{}` leaves a `}}` unclosed", text.trim())),
        }
    }
}

/// A number as TypeScript writes it: the shortest text that reads back as it.
fn number_text(value: f64) -> String {
    format!("{value}")
}

impl fmt::Display for Built {
    /// Builder syntax on one line, a space after each comma, as Biome writes
    /// a call that fits.
    fn fmt(&self, out: &mut fmt::Formatter<'_>) -> fmt::Result {
        let joined = |items: &[Built]| {
            items
                .iter()
                .map(ToString::to_string)
                .collect::<Vec<_>>()
                .join(", ")
        };
        match self {
            Self::Call(name, arguments) => write!(out, "{name}({})", joined(arguments)),
            Self::List(items) => write!(out, "[{}]", joined(items)),
            Self::Name(name) => write!(out, "{name}"),
            Self::Number(value) => write!(out, "{}", number_text(*value)),
            Self::Object(entries) => {
                let entries: Vec<String> = entries
                    .iter()
                    .map(|(key, value)| format!("{key}: {value}"))
                    .collect();
                write!(out, "{{ {} }}", entries.join(", "))
            }
            Self::Text(text) => {
                write!(out, "'{}'", text.replace('\\', "\\\\").replace('\'', "\\'"))
            }
        }
    }
}
