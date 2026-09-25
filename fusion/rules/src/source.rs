//! Source text, read the way the language reads it.
//!
//! **Comments are blanked and never removed.** Every rule reports a line
//! number, and a line number is a count of newlines before an offset into the
//! text the pattern ran over, so each comment becomes spaces of its own length
//! in bytes, with its newlines kept, and an offset into the blanked text still
//! names the line in the file.
//!
//! Here rather than in either command line because both read modules: `helix
//! component` for its parts and slots, `fusion` for registration and the paths
//! prose names, and each had its own pattern that took `//` in a string for a
//! comment.

/// Block and line comments blanked to spaces, newlines kept. For a module.
///
/// **Read the way the language reads it, not by pattern**, because a pattern
/// cannot tell a comment from the same characters in a string. `//` opened a
/// comment in `href="https://..."` and blanked the rest of the template line,
/// parts and all, and a `/*` in a regex swallowed code up to the next `*/`.
/// So strings, template literals with their `${}` nested to any depth, and
/// regex literals are stepped over, and only what is a comment there is
/// blanked.
///
/// # Panics
///
/// Never: only whole comments are blanked, and a comment begins and ends in
/// ASCII, so the bytes left are the text's own and still UTF-8.
pub fn uncommented(text: &str) -> String {
    let mut out = text.as_bytes().to_vec();
    for span in comments(text) {
        for one in &mut out[span] {
            if *one != b'\n' {
                *one = b' ';
            }
        }
    }
    String::from_utf8(out).expect("only whole comments, which begin and end in ASCII, were blanked")
}

/// Where each comment in a module is, block and line alike, in order.
///
/// For a rule that reads what the comments say rather than the code around
/// them: a path named in a comment, and not the `//` of a URL in a string.
pub fn comments(text: &str) -> Vec<std::ops::Range<usize>> {
    let bytes = text.as_bytes();
    let mut found = Vec::new();
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
                let end = text[at..]
                    .find('\n')
                    .map_or(bytes.len(), |found| at + found);
                found.push(at..end);
                at = end;
                continue;
            }
            b'/' if next == Some(b'*') => {
                let end = text[at + 2..]
                    .find("*/")
                    .map_or(bytes.len(), |found| at + 2 + found + 2);
                found.push(at..end);
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
    found
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

/// Where each comment in a stylesheet is, in order.
///
/// **A sheet is not a module**, and reading it as one found regexes in it: CSS
/// has no regex literals and no line comments, so `hsl(0 0% 0% / 0.5)` read as
/// a pattern opening at the `/` and ran past the comment after it, and a
/// `url(//cdn…)` would read as a line comment. Only block comments, with the
/// sheet's strings stepped over.
pub fn sheet_comments(text: &str) -> Vec<std::ops::Range<usize>> {
    let bytes = text.as_bytes();
    let mut found = Vec::new();
    let mut at = 0;
    while at < bytes.len() {
        match bytes[at] {
            b'"' | b'\'' => at = past_string(bytes, at),
            b'/' if bytes.get(at + 1) == Some(&b'*') => {
                let end = text[at + 2..]
                    .find("*/")
                    .map_or(bytes.len(), |close| at + 2 + close + 2);
                found.push(at..end);
                at = end;
            }
            _ => at += 1,
        }
    }
    found
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
    /* `a++ / 2`: an increment or a decrement ends a value, so what follows
    divides it. */
    if (one == b'+' || one == b'-') && last > 0 && bytes[last - 1] == one {
        return false;
    }
    if one.is_ascii_alphanumeric() || one == b'_' || one == b'$' {
        let start = bytes[..=last]
            .iter()
            .rposition(|byte| !(byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'$'))
            .map_or(0, |found| found + 1);
        return KEYWORDS.contains(&&bytes[start..=last]);
    }
    if one == b')' {
        return closes_condition(bytes, last);
    }
    !matches!(one, b']' | b'}' | b'\'' | b'"' | b'`')
}

/// Whether the `)` at `close` ends the condition of an `if`, `while`, `for` or
/// `with`, after which a statement starts and a `/` opens a regex:
/// `if (ok) /x/.test(s)`. Any other `)` ends a value, which a `/` divides.
fn closes_condition(bytes: &[u8], close: usize) -> bool {
    const HEADS: [&[u8]; 4] = [b"if", b"while", b"for", b"with"];
    let mut depth = 0usize;
    let mut at = close;
    loop {
        match bytes[at] {
            b')' => depth += 1,
            b'(' => {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            }
            _ => {}
        }
        if at == 0 {
            return false;
        }
        at -= 1;
    }
    let before = bytes[..at].trim_ascii_end();
    let start = before
        .iter()
        .rposition(|byte| !(byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'$'))
        .map_or(0, |found| found + 1);
    HEADS.contains(&&before[start..])
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

#[cfg(test)]
mod tests {
    use super::{comments, sheet_comments, uncommented};

    #[test]
    fn a_comment_holding_non_ascii_blanks_to_its_length_in_bytes() {
        let code = "/* \u{2014} \u{201c}quoted\u{201d} \u{2014} */\nx";
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
        let code =
            "x.match(/['\"]\\/\\*[/]/g) // a\nconst half = w / 2 // b\nreturn /'/.test(y) // c";
        let out = uncommented(code);
        assert!(!out.contains("// a") && !out.contains("// b") && !out.contains("// c"));
        assert!(out.contains("w / 2"));
        assert!(out.contains("/['\"]\\/\\*[/]/g"));
    }

    #[test]
    fn an_increment_ends_a_value_so_what_follows_divides() {
        let code = "x = a++ / 2 // gone\ny = b-- / 2 // also";
        let found: Vec<&str> = comments(code).into_iter().map(|span| &code[span]).collect();
        assert_eq!(found, ["// gone", "// also"]);
    }

    #[test]
    fn a_regex_after_a_condition_is_a_regex_and_a_call_divides() {
        let code = "if (ok) /\\/*/.test(s)\nconst keep = [part]\n/* end */\nx = f(a) / 2 // half";
        let found: Vec<&str> = comments(code).into_iter().map(|span| &code[span]).collect();
        assert_eq!(found, ["/* end */", "// half"]);
    }

    #[test]
    fn a_sheet_has_block_comments_only() {
        let sheet = ".a { color: hsl(0 0% 0% / 0.5); background: url(//cdn.x/a.png); \
                     content: '/* not */'; } /* moved */";
        let found: Vec<&str> = sheet_comments(sheet)
            .into_iter()
            .map(|span| &sheet[span])
            .collect();
        assert_eq!(found, ["/* moved */"]);
    }
}
