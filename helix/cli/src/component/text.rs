//! What a rule does to a file before reading it, written once.
//!
//! **Comments are blanked and never removed.** Every rule reports a line number,
//! and a line number is a count of newlines before an offset into the text the
//! pattern ran over. Removing a comment shifts every offset after it, so each
//! comment becomes spaces of its own length with its newlines kept, and an
//! offset into the blanked text still names the line in the file.
//!
//! **Two variants, because the two languages disagree about `//`.** In a
//! TypeScript module it opens a line comment; in a stylesheet it is the middle
//! of `url(https://...)`, and a rule that blanked it there would read a
//! background image as ending at the colon. [`uncommented`] is for a module and
//! [`blanked`] for a sheet, and a rule about a `css` template inside a module
//! wants the second: the template is CSS, and its `//` is a URL.

use std::sync::LazyLock;

use regex::Regex;

/// A block comment, in either language.
pub static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// Block comments blanked to spaces, newlines kept. For a stylesheet.
pub fn blanked(text: &str) -> String {
    COMMENT.replace_all(text, spaces).into_owned()
}

/// Block and line comments blanked to spaces, newlines kept. For a module.
///
/// The lexer is shared with `fusion`, whose rules read modules too, so the two
/// command lines cannot disagree about what is a comment.
pub use fusion_rules::source::uncommented;

/// The line a byte offset falls on, counting from one.
pub fn line_of(text: &str, at: usize) -> usize {
    text[..at].matches('\n').count() + 1
}

/// A match as spaces of its own length in bytes, with its newlines where they
/// were. Bytes and not characters: an offset is a byte offset, and a comment
/// holding an em dash blanked one space short per dash, so every offset after
/// it was wrong and one cut the file inside a character.
fn spaces(found: &regex::Captures) -> String {
    found[0]
        .chars()
        .map(|one| {
            if one == '\n' {
                "\n".to_owned()
            } else {
                " ".repeat(one.len_utf8())
            }
        })
        .collect()
}

/// Every `part="…"` whose value interpolates, rewritten as the names it can
/// take, at the same length. For a module, after [`uncommented`].
///
/// **A state is published as a second part name, written only while it
/// holds**: `part="page${current ? ' page-current' : ''}"`. The names are still
/// literals in the source, which is the property every part rule depends on,
/// and this is what lets a rule read them as literals: the static words and
/// every quoted word inside an interpolation, `part="page page-current"`. So a
/// quoted word in that interpolation is a part name and nothing else may be
/// quoted there. The rest of the value becomes spaces, newlines kept, so an
/// offset still names its line.
///
/// **A `[part="${…}"]` is a selector string, not a render**, and is left as it
/// is: the rules that read renders already refuse a leading bracket.
pub fn flattened(code: &str) -> String {
    const OPEN: &str = "part=\"";
    let bytes = code.as_bytes();
    let mut out = String::with_capacity(code.len());
    let mut from = 0;
    let mut search = 0;
    while let Some(found) = code[search..].find(OPEN) {
        let start = search + found;
        let value = start + OPEN.len();
        search = value;
        if code[..start].ends_with('[') {
            continue;
        }
        let Some((close, names)) = interpolated(bytes, value) else {
            continue;
        };
        let written = names.join(" ");
        let replaced = &code[value..=close];
        let newlines = replaced.matches('\n').count();
        out.push_str(&code[from..value]);
        out.push_str(&written);
        out.push('"');
        out.extend(std::iter::repeat_n(
            ' ',
            replaced.len() - written.len() - 1 - newlines,
        ));
        out.extend(std::iter::repeat_n('\n', newlines));
        from = close + 1;
        search = from;
    }
    out.push_str(&code[from..]);
    out
}

/// Where an attribute value beginning at `from` closes, and the names it can
/// take, if it interpolates. `None` for a plain value, which needs nothing.
fn interpolated(bytes: &[u8], from: usize) -> Option<(usize, Vec<String>)> {
    let mut names = Vec::new();
    let mut run = Vec::new();
    let mut depth = 0usize;
    let mut quote = 0u8;
    let mut interpolates = false;
    let mut at = from;
    loop {
        let character = *bytes.get(at)?;
        if depth == 0 {
            match character {
                b'"' => break,
                b'$' if bytes.get(at + 1) == Some(&b'{') => {
                    words(&run, &mut names);
                    run.clear();
                    interpolates = true;
                    depth = 1;
                    at += 1;
                }
                b'>' | b'`' => return None,
                _ => run.push(character),
            }
        } else if quote != 0 {
            if character == quote {
                quote = 0;
                words(&run, &mut names);
                run.clear();
            } else {
                run.push(character);
            }
        } else {
            match character {
                b'\'' | b'"' => quote = character,
                b'{' => depth += 1,
                b'}' => depth -= 1,
                _ => {}
            }
        }
        at += 1;
    }
    if !interpolates {
        return None;
    }
    words(&run, &mut names);
    Some((at, names))
}

/// The part-shaped words in a run of text, appended in order.
fn words(text: &[u8], names: &mut Vec<String>) {
    for word in String::from_utf8_lossy(text).split_whitespace() {
        if word
            .bytes()
            .all(|one| one.is_ascii_lowercase() || one.is_ascii_digit() || one == b'-')
        {
            names.push(word.to_owned());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{blanked, flattened, uncommented};

    #[test]
    fn a_comment_holding_non_ascii_blanks_to_its_length_in_bytes() {
        let code = "/* \u{2014} \u{201c}quoted\u{201d} \u{2014} */\nx";
        assert_eq!(blanked(code).len(), code.len());
        assert_eq!(uncommented(code).len(), code.len());
        assert!(uncommented(code).ends_with("\nx"));
    }

    #[test]
    fn a_state_part_reads_as_both_names_at_the_same_length() {
        let code = "<b part=\"page${on ? ' page-current' : ''}\"\n  type=\"button\">";
        let flat = flattened(code);
        assert_eq!(flat.len(), code.len());
        assert!(flat.starts_with("<b part=\"page page-current\""));
        assert_eq!(flat.matches('\n').count(), 1);
        assert!(flat.ends_with("  type=\"button\">"));
    }

    #[test]
    fn a_plain_value_and_a_selector_are_left_alone() {
        let code = "<b part=\"page\"></b> find(`[part=\"${name}\"]`)";
        assert_eq!(flattened(code), code);
    }
}
