//! Values printed as JavaScript: strings, numbers, keys, and the literal
//! values a builder-form source holds.

use crate::family::read::Lit;

/// `dismiss-label` as `dismissLabel`.
pub fn camel(name: &str) -> String {
    let mut written = String::with_capacity(name.len());
    let mut upper = false;
    for character in name.chars() {
        if character == '-' {
            upper = true;
        } else if upper {
            written.extend(character.to_uppercase());
            upper = false;
        } else {
            written.push(character);
        }
    }
    written
}

/// Whether a name is written bare as an object key or after a dot.
pub fn identifier(name: &str) -> bool {
    let mut characters = name.chars();
    characters
        .next()
        .is_some_and(|first| first.is_ascii_alphabetic() || first == '_' || first == '$')
        && characters.all(|one| one.is_ascii_alphanumeric() || one == '_' || one == '$')
}

/// A string in single quotes, as Biome writes one.
pub fn quoted(text: &str) -> String {
    let mut written = String::with_capacity(text.len() + 2);
    written.push('\'');
    for character in text.chars() {
        match character {
            '\'' => written.push_str("\\'"),
            '\\' => written.push_str("\\\\"),
            '\n' => written.push_str("\\n"),
            '\t' => written.push_str("\\t"),
            other => written.push(other),
        }
    }
    written.push('\'');
    written
}

/// A key: bare where it can be, and quoted otherwise.
pub fn key(name: &str) -> String {
    if identifier(name) {
        name.to_owned()
    } else {
        quoted(name)
    }
}

/// A number as JavaScript writes it.
pub fn number(value: f64) -> String {
    if value.fract() == 0.0 && value.abs() < 1e15 {
        format!("{value:.0}")
    } else {
        format!("{value}")
    }
}

/// A literal value of a builder-form source, as JavaScript.
pub fn lit(value: &Lit) -> Result<String, String> {
    Ok(match value {
        Lit::Text(text) => quoted(text),
        Lit::Bool(flag) => flag.to_string(),
        Lit::Number(value) => number(*value),
        Lit::Null => "null".to_owned(),
        Lit::Array(items) => format!(
            "[{}]",
            items
                .iter()
                .map(lit)
                .collect::<Result<Vec<_>, _>>()?
                .join(", ")
        ),
        Lit::Object(fields) => {
            if fields.is_empty() {
                "{}".to_owned()
            } else {
                format!(
                    "{{ {} }}",
                    fields
                        .iter()
                        .map(|(name, value)| Ok(format!("{}: {}", key(name), lit(value)?)))
                        .collect::<Result<Vec<_>, String>>()?
                        .join(", ")
                )
            }
        }
        Lit::Call(helper, arguments) => format!(
            "{helper}({})",
            arguments
                .iter()
                .map(lit)
                .collect::<Result<Vec<_>, _>>()?
                .join(", ")
        ),
        other => return Err(format!("a value the printer does not write: {other:?}")),
    })
}
