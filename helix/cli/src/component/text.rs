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

/// A line comment, which only a module has.
static LINE_COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"//[^\n]*").expect("a literal pattern compiles"));

/// Block comments blanked to spaces, newlines kept. For a stylesheet.
pub fn blanked(text: &str) -> String {
    COMMENT.replace_all(text, spaces).into_owned()
}

/// Block and line comments blanked to spaces, newlines kept. For a module.
pub fn uncommented(text: &str) -> String {
    let once = COMMENT.replace_all(text, spaces);
    LINE_COMMENT.replace_all(&once, spaces).into_owned()
}

/// The line a byte offset falls on, counting from one.
pub fn line_of(text: &str, at: usize) -> usize {
    text[..at].matches('\n').count() + 1
}

/// A match as spaces of its own length, with its newlines where they were.
fn spaces(found: &regex::Captures) -> String {
    found[0]
        .chars()
        .map(|one| if one == '\n' { '\n' } else { ' ' })
        .collect()
}
