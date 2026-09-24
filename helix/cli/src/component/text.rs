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
/// **Read the way the language reads it, not by pattern**, because a pattern
/// cannot tell a comment from the same characters in a string. `//` opened a
/// comment in `href="https://..."` and blanked the rest of the template line,
/// parts and all, and a `/*` in a regex swallowed code up to the next `*/`.
/// So strings, template literals with their `${}` nested to any depth, and
/// regex literals are stepped over, and only what is a comment there is
/// blanked.
pub fn uncommented(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = bytes.to_vec();
    let blank = |out: &mut Vec<u8>, from: usize, to: usize| {
        for one in &mut out[from..to] {
            if *one != b'\n' {
                *one = b' ';
            }
        }
    };
    /* The brace depth each open `${` was entered at, so the `}` that closes
       it goes back into its template rather than being counted as code. */
    let mut interpolations: Vec<usize> = Vec::new();
    let mut depth = 0usize;
    let mut in_template = false;
    /* Where the last byte that was not space sits, which is what decides
       whether a `/` divides or opens a regex. */
    let mut last: Option<usize> = None;
    let mut at = 0;
    while at < bytes.len() {
        let one = bytes[at];
        let next = bytes.get(at + 1).copied();
        if in_template {
            match one {
                b'\\' => at += 2,
                b'`' => {
                    in_template = false;
                    last = Some(at);
                    at += 1;
                }
                b'$' if next == Some(b'{') => {
                    interpolations.push(depth);
                    depth += 1;
                    in_template = false;
                    last = Some(at + 1);
                    at += 2;
                }
                _ => at += 1,
            }
            continue;
        }
        match one {
            b'/' if next == Some(b'/') => {
                let end = text[at..].find('\n').map_or(bytes.len(), |found| at + found);
                blank(&mut out, at, end);
                at = end;
                continue;
            }
            b'/' if next == Some(b'*') => {
                let end = text[at + 2..].find("*/").map_or(bytes.len(), |found| at + 2 + found + 2);
                blank(&mut out, at, end);
                at = end;
                continue;
            }
            b'\'' | b'"' => {
                at = past_string(bytes, at);
                last = Some(at - 1);
                continue;
            }
            b'`' => in_template = true,
            b'{' => depth += 1,
            b'}' => {
                if interpolations.last() == Some(&(depth.saturating_sub(1))) {
                    interpolations.pop();
                    depth -= 1;
                    in_template = true;
                    at += 1;
                    continue;
                }
                depth = depth.saturating_sub(1);
            }
            b'/' if opens_regex(bytes, last) => {
                at = past_regex(bytes, at);
                last = Some(at - 1);
                continue;
            }
            _ => {}
        }
        if !one.is_ascii_whitespace() {
            last = Some(at);
        }
        at += 1;
    }
    String::from_utf8(out).expect("only whole comments, which begin and end in ASCII, were blanked")
}

/// Where a quoted string opening at `from` ends, one past its closing quote.
/// A string does not cross a line, so an unclosed one ends there.
fn past_string(bytes: &[u8], from: usize) -> usize {
    let quote = bytes[from];
    let mut at = from + 1;
    while let Some(&one) = bytes.get(at) {
        match one {
            b'\\' => at += 2,
            b'\n' => return at,
            _ if one == quote => return at + 1,
            _ => at += 1,
        }
    }
    bytes.len()
}

/// Whether a `/` after the byte at `last` opens a regex rather than divides.
///
/// A regex follows an operator, an opening bracket, a comma or a keyword like
/// `return`; a division follows a value, a name or a closing bracket.
fn opens_regex(bytes: &[u8], last: Option<usize>) -> bool {
    const KEYWORDS: [&[u8]; 9] = [
        b"return", b"typeof", b"case", b"in", b"of", b"void", b"yield", b"await", b"else",
    ];
    let Some(last) = last else {
        return true;
    };
    let one = bytes[last];
    if one.is_ascii_alphanumeric() || one == b'_' || one == b'$' {
        let start = bytes[..=last]
            .iter()
            .rposition(|byte| !(byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'$'))
            .map_or(0, |found| found + 1);
        return KEYWORDS.contains(&&bytes[start..=last]);
    }
    !matches!(one, b')' | b']' | b'}' | b'\'' | b'"' | b'`')
}

/// Where a regex literal opening at `from` ends, past its flags. A `/` inside
/// a character class does not close it.
fn past_regex(bytes: &[u8], from: usize) -> usize {
    let mut at = from + 1;
    let mut class = false;
    while let Some(&one) = bytes.get(at) {
        match one {
            b'\\' => at += 2,
            b'\n' => return at,
            b'[' => {
                class = true;
                at += 1;
            }
            b']' => {
                class = false;
                at += 1;
            }
            b'/' if !class => {
                at += 1;
                while bytes.get(at).is_some_and(u8::is_ascii_alphabetic) {
                    at += 1;
                }
                return at;
            }
            _ => at += 1,
        }
    }
    bytes.len()
}

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
        let code = "/* — “quoted” — */\nx";
        assert_eq!(blanked(code).len(), code.len());
        assert_eq!(uncommented(code).len(), code.len());
        assert!(uncommented(code).ends_with("\nx"));
    }

    #[test]
    fn a_url_in_a_string_or_a_template_is_not_a_comment() {
        let code = "html`<a href=\"https://x.dev\" part=\"link\">` + 'http://y' // gone";
        let out = uncommented(code);
        assert!(out.contains("part=\"link\""));
        assert!(out.contains("'http://y'"));
        assert!(!out.contains("gone"));
        assert_eq!(out.len(), code.len());
    }

    #[test]
    fn a_comment_inside_an_interpolation_is_blanked_and_the_template_resumes() {
        let code = "html`<b part=\"a\">${ok /* no */ ? `x${1}` : ''}<i part=\"c//d\">`";
        let out = uncommented(code);
        assert!(!out.contains("no"));
        assert!(out.contains("part=\"c//d\""));
    }

    #[test]
    fn a_regex_literal_is_stepped_over_and_a_division_is_not_one() {
        let code = "x.match(/['\"]\\/\\*[/]/g) // a\nconst half = w / 2 // b\nreturn /'/.test(y) // c";
        let out = uncommented(code);
        assert!(!out.contains("// a") && !out.contains("// b") && !out.contains("// c"));
        assert!(out.contains("w / 2"));
        assert!(out.contains("/['\"]\\/\\*[/]/g"));
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
