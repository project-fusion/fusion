//! The custom properties a stylesheet declares on `:root`, which is where the
//! primitives, the seeds and the modes' defaults are.
//!
//! **Only rules whose selector names `:root`, and none inside an at-rule.**
//! `_modes.css` also declares under `[data-color-mode]`, under
//! `prefers-color-scheme` and under `pointer: coarse`, and each of those is a
//! condition a page meets or does not. The defaults are what a page holds with
//! none of them met, which is what a native app has: it picks its mode itself,
//! and a touch screen there has no browser to zoom into a small field, so
//! `--_helix-text-field-min` keeps its `0px`.

/// `(name, value)` for each custom property the `:root` rules declare, in the
/// order written. A later declaration of a name wins, as the cascade has it.
pub fn declarations(css: &str) -> Vec<(String, String)> {
    declared_under(css, ":root")
}

/// `(name, value)` for each custom property the rules whose selector list
/// holds `selector` declare, outside any at-rule, such as the density stop
/// `[data-density="sm"]` in `base.css`.
pub fn declared_under(css: &str, selector: &str) -> Vec<(String, String)> {
    let text = uncommented(css);
    let mut found: Vec<(String, String)> = Vec::new();
    let mut rest = text.as_str();
    while let Some(open) = rest.find('{') {
        let prelude = rest[..open].trim();
        let Some(close) = closing(rest, open) else {
            break;
        };
        let body = &rest[open + 1..close];
        if !prelude.starts_with('@') && prelude.split(',').any(|one| one.trim() == selector) {
            for (name, value) in properties(body) {
                found.retain(|(known, _)| *known != name);
                found.push((name, value));
            }
        }
        rest = &rest[close + 1..];
    }
    found
}

/// `css` without its comments.
fn uncommented(css: &str) -> String {
    let mut out = String::with_capacity(css.len());
    let mut rest = css;
    while let Some(start) = rest.find("/*") {
        out.push_str(&rest[..start]);
        rest = rest[start + 2..]
            .find("*/")
            .map_or("", |end| &rest[start + 2 + end + 2..]);
    }
    out.push_str(rest);
    out
}

/// Where the brace opened at `open` closes.
fn closing(text: &str, open: usize) -> Option<usize> {
    let mut depth = 0usize;
    for (at, character) in text[open..].char_indices() {
        match character {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(open + at);
                }
            }
            _ => {}
        }
    }
    None
}

/// The custom properties in one rule's body, split on the semicolons outside
/// parentheses and strings.
fn properties(body: &str) -> Vec<(String, String)> {
    let mut statements = Vec::new();
    let mut depth = 0usize;
    let mut quote = None;
    let mut start = 0;
    for (at, character) in body.char_indices() {
        match (quote, character) {
            (Some(open), _) if character == open => quote = None,
            (None, '"' | '\'') => quote = Some(character),
            (None, '(') => depth += 1,
            (None, ')') => depth = depth.saturating_sub(1),
            (None, ';') if depth == 0 => {
                statements.push(&body[start..at]);
                start = at + 1;
            }
            _ => {}
        }
    }
    statements.push(&body[start..]);
    statements
        .into_iter()
        .filter_map(|statement| {
            let (name, value) = statement.split_once(':')?;
            let name = name.trim();
            name.starts_with("--")
                .then(|| (name.to_owned(), value.trim().to_owned()))
        })
        .collect()
}
