//! Stylesheets, read for what a scan asks of them: each style rule's selector
//! and declarations, where it starts, and every custom property read.
//!
//! **A reader, with no cascade.** The page judges a rule against the elements
//! it matches; a scan has the text alone. So this keeps what the text says
//! outright, a rule's selector and what it sets, and the analysis decides what
//! the text alone can settle.
//!
//! **What projects write, beyond plain CSS**:
//!
//! - native nesting, with `&` and without it, which Sass and Less write too;
//! - at-rule blocks, `@media` and `@supports` among them, inside a rule or
//!   around it;
//! - the scoping wrappers frameworks add to a selector, CSS Modules'
//!   `:global()`, Vue's `:deep()`, and Angular's `::ng-deep`, each taken off
//!   so the selector reads as the browser finally matches it;
//! - the `//` comments of Sass and Less.

use std::sync::LazyLock;

use regex::Regex;

/// One style rule, with its selector flattened out of any nesting.
#[derive(Clone, Debug, PartialEq)]
pub struct StyleRule {
    /// What it sets, in order: each property and its value, trimmed.
    pub declarations: Vec<(String, String)>,
    /// Its position among the sheet's style rules.
    pub index: usize,
    /// The line its first declaration is on, counting from 1.
    pub line: usize,
    pub selector: String,
}

impl StyleRule {
    /// The rule as text, for a finding's evidence.
    pub fn text(&self) -> String {
        let body = self
            .declarations
            .iter()
            .map(|(property, value)| format!("{property}: {value};"))
            .collect::<Vec<_>>()
            .join(" ");
        format!("{} {{ {body} }}", self.selector)
    }
}

static READ: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--[A-Za-z0-9_-]+)").expect("a literal pattern"));

/// Every custom property a `var()` reads in `text`, which may be any file:
/// a module that writes `var(--card-gap)` in a style reads it as surely as a
/// sheet does.
pub fn reads(text: &str) -> impl Iterator<Item = &str> {
    READ.captures_iter(text)
        .filter_map(|found| found.get(1).map(|name| name.as_str()))
}

/// At-rules whose block holds rules: anything else, `@keyframes` and
/// `@font-face` among them, holds no selector a scan asks about.
const GROUPING: [&str; 6] = [
    "media",
    "supports",
    "layer",
    "container",
    "scope",
    "document",
];

/// Reads a sheet's style rules. `first` is the line the text starts on, for a
/// `<style>` block inside a template, and `line_comments` is whether `//`
/// opens a comment, as it does in Sass and Less.
pub fn read(text: &str, first: usize, line_comments: bool) -> Vec<StyleRule> {
    let plain = blank_comments(text, line_comments);
    let bytes = plain.as_bytes();
    let mut reader = Reader {
        bytes,
        first,
        lines: bytes
            .iter()
            .enumerate()
            .filter(|(_, byte)| **byte == b'\n')
            .map(|(at, _)| at)
            .collect(),
        text: &plain,
    };
    let mut rules = Vec::new();
    reader.block(0, bytes.len(), &[], &mut rules);
    for (index, rule) in rules.iter_mut().enumerate() {
        rule.index = index;
    }
    rules
}

/// Comments as spaces, newlines kept, so every offset still names its line.
///
/// A `//` comment is read only outside parentheses, where `url(http://...)`
/// cannot be.
fn blank_comments(text: &str, line_comments: bool) -> String {
    let mut out = text.as_bytes().to_vec();
    let mut at = 0;
    let mut depth = 0usize;
    let mut quote: Option<u8> = None;
    while at < out.len() {
        let one = out[at];
        if let Some(open) = quote {
            if one == b'\\' {
                at += 1;
            } else if one == open {
                quote = None;
            }
            at += 1;
            continue;
        }
        let end = if one == b'/' && out.get(at + 1) == Some(&b'*') {
            Some(
                text[at + 2..]
                    .find("*/")
                    .map_or(out.len(), |found| at + 2 + found + 2),
            )
        } else if line_comments && depth == 0 && one == b'/' && out.get(at + 1) == Some(&b'/') {
            Some(text[at..].find('\n').map_or(out.len(), |found| at + found))
        } else {
            None
        };
        if let Some(end) = end {
            for byte in &mut out[at..end] {
                if *byte != b'\n' {
                    *byte = b' ';
                }
            }
            at = end;
            continue;
        }
        match one {
            b'"' | b'\'' => quote = Some(one),
            b'(' => depth += 1,
            b')' => depth = depth.saturating_sub(1),
            _ => {}
        }
        at += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| text.to_owned())
}

struct Reader<'a> {
    bytes: &'a [u8],
    first: usize,
    /// Where each newline is, for a line from an offset.
    lines: Vec<usize>,
    text: &'a str,
}

impl Reader<'_> {
    fn line(&self, at: usize) -> usize {
        self.first + self.lines.partition_point(|newline| *newline < at)
    }

    /// Where the item starting at `at` stops: the first `;`, `{`, or `}` at
    /// the top level, outside strings, parentheses, and brackets.
    fn stop(&self, mut at: usize, end: usize) -> usize {
        let mut depth = 0usize;
        let mut quote: Option<u8> = None;
        while at < end {
            let one = self.bytes[at];
            match quote {
                Some(open) => {
                    if one == b'\\' {
                        at += 1;
                    } else if one == open {
                        quote = None;
                    }
                }
                None => match one {
                    b'"' | b'\'' => quote = Some(one),
                    b'(' | b'[' => depth += 1,
                    b')' | b']' => depth = depth.saturating_sub(1),
                    b';' | b'{' | b'}' if depth == 0 => return at,
                    _ => {}
                },
            }
            at += 1;
        }
        end
    }

    /// Where the block opened at `open` closes, the matching `}`.
    fn close(&self, open: usize, end: usize) -> usize {
        let mut depth = 0usize;
        let mut quote: Option<u8> = None;
        let mut at = open;
        while at < end {
            let one = self.bytes[at];
            match quote {
                Some(close) => {
                    if one == b'\\' {
                        at += 1;
                    } else if one == close {
                        quote = None;
                    }
                }
                None => match one {
                    b'"' | b'\'' => quote = Some(one),
                    b'{' => depth += 1,
                    b'}' => {
                        depth -= 1;
                        if depth == 0 {
                            return at;
                        }
                    }
                    _ => {}
                },
            }
            at += 1;
        }
        end
    }

    /// Reads the items between `start` and `end`, inside the rules whose
    /// selectors are `parents`: declarations for them, and the rules nested
    /// in them.
    fn block(&mut self, start: usize, end: usize, parents: &[String], into: &mut Vec<StyleRule>) {
        let mut declarations = Vec::new();
        let mut first_line = None;
        let mut at = start;
        while at < end {
            while at < end && (self.bytes[at].is_ascii_whitespace() || self.bytes[at] == b';') {
                at += 1;
            }
            if at >= end {
                break;
            }
            let stop = self.stop(at, end);
            let item = self.text[at..stop].trim();
            if stop < end && self.bytes[stop] == b'{' {
                let close = self.close(stop, end);
                if let Some(rule) = item.strip_prefix('@') {
                    let name = rule
                        .split(|one: char| !(one.is_ascii_alphanumeric() || one == '-'))
                        .next()
                        .unwrap_or("")
                        .to_ascii_lowercase();
                    if GROUPING.contains(&name.as_str()) {
                        self.block(stop + 1, close, parents, into);
                    }
                } else {
                    let selectors = nest(parents, &unwrap(item));
                    self.block(stop + 1, close, &selectors, into);
                }
                at = close + 1;
                continue;
            }
            if !item.is_empty() && !item.starts_with('@') && !parents.is_empty() {
                if let Some((property, value)) = item.split_once(':') {
                    let property = property.trim();
                    if !property.is_empty() && !property.contains(char::is_whitespace) {
                        first_line.get_or_insert_with(|| self.line(at));
                        /* A property set twice in one rule is one property,
                        with the later value, as the page reads it. */
                        declarations.retain(|(one, _): &(String, String)| one != property);
                        declarations.push((property.to_owned(), clean(value)));
                    }
                }
            }
            if stop < end && self.bytes[stop] == b'}' {
                break;
            }
            at = stop + 1;
        }
        if !declarations.is_empty() {
            into.push(StyleRule {
                declarations,
                index: 0,
                line: first_line.unwrap_or(0),
                selector: parents.join(", "),
            });
        }
    }
}

/// A declaration's value as the page reads it: trimmed, with `!important`
/// taken off.
fn clean(value: &str) -> String {
    let value = value.trim();
    let lower = value.to_ascii_lowercase();
    match lower.rfind("!important") {
        Some(at) if lower[at..].trim() == "!important" => value[..at].trim_end().to_owned(),
        _ => value.to_owned(),
    }
}

static WRAPPED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r":(?:global|local|deep)\(\s*([^()]*(?:\([^()]*\)[^()]*)*)\)")
        .expect("a literal pattern")
});
static BARE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:::v-deep|::ng-deep|/deep/|>>>|:global|:local)\s*").expect("a literal pattern")
});
static SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").expect("a literal pattern"));

/// A selector with the frameworks' scoping wrappers taken off.
pub fn unwrap(selector: &str) -> String {
    let inner = WRAPPED.replace_all(selector, "$1");
    let bare = BARE.replace_all(&inner, " ");
    SPACE.replace_all(bare.trim(), " ").into_owned()
}

/// Splits a selector list on its top-level commas.
fn list(selector: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut depth = 0usize;
    let mut from = 0;
    for (at, one) in selector.char_indices() {
        match one {
            '(' | '[' => depth += 1,
            ')' | ']' => depth = depth.saturating_sub(1),
            ',' if depth == 0 => {
                parts.push(selector[from..at].trim().to_owned());
                from = at + 1;
            }
            _ => {}
        }
    }
    parts.push(selector[from..].trim().to_owned());
    parts.retain(|part| !part.is_empty());
    parts
}

/// The selectors a nested rule reaches: each of its own against each of its
/// parent's, with `&` standing for the parent, and a descendant where it
/// names none.
fn nest(parents: &[String], own: &str) -> Vec<String> {
    let children = list(own);
    if parents.is_empty() {
        return children;
    }
    let mut out = Vec::new();
    for parent in parents {
        for child in &children {
            out.push(if child.contains('&') {
                child.replace('&', parent)
            } else {
                format!("{parent} {child}")
            });
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{read, reads};

    #[test]
    fn rules_are_read_with_their_lines_and_values() {
        let rules = read(
            "/* a comment { not a rule } */\n.card {\n  --card-padding: 1rem !important;\n  color: red;\n}\n",
            1,
            false,
        );
        assert_eq!(rules.len(), 1);
        let rule = &rules[0];
        assert_eq!(rule.selector, ".card");
        assert_eq!(rule.line, 3);
        assert_eq!(
            rule.declarations[0],
            ("--card-padding".to_owned(), "1rem".to_owned())
        );
    }

    #[test]
    fn nesting_and_at_rules_are_flattened() {
        let rules = read(
            ".frame {\n  & helix-card { --card-gap: 0; }\n  helix-tag::part(label) { color: red; }\n  @media (width > 40rem) { --frame-x: 1; }\n}\n@media print { helix-button { --button-radius: 0; } }\n",
            1,
            false,
        );
        let selectors: Vec<&str> = rules.iter().map(|rule| rule.selector.as_str()).collect();
        assert_eq!(
            selectors,
            [
                ".frame helix-card",
                ".frame helix-tag::part(label)",
                ".frame",
                "helix-button"
            ]
        );
    }

    #[test]
    fn scoping_wrappers_come_off_and_reads_are_kept() {
        let text = ".brand :global(helix-color-input) { --x: var(--helix-space-md); }\n:deep(helix-card) { gap: var( --card-gap ); }\n";
        let rules = read(text, 1, false);
        assert_eq!(rules[0].selector, ".brand helix-color-input");
        assert_eq!(rules[1].selector, "helix-card");
        assert_eq!(
            reads(text).collect::<Vec<_>>(),
            ["--helix-space-md", "--card-gap"]
        );
    }

    #[test]
    fn sass_comments_and_parent_suffixes_are_read() {
        let rules = read(
            "// a { b: c }\n.card {\n  background: url(http://example.com/a.png); // trailing\n  &__title { --card-gap: 0; }\n}\n",
            1,
            true,
        );
        let selectors: Vec<&str> = rules.iter().map(|rule| rule.selector.as_str()).collect();
        assert_eq!(selectors, [".card__title", ".card"]);
        assert_eq!(rules[1].declarations[0].1, "url(http://example.com/a.png)");
    }
}
