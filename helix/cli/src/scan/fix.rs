//! `helix scan --fix`: the findings a scan can write into the page's source.
//!
//! **One kind, `unlinked-trigger`.** A tooltip describes a plain trigger at
//! rest only through an `aria-describedby` the page writes, since a tooltip
//! never writes into the page's markup. The page's own source is the one place
//! the attribute can go so that the server's HTML carries it, so the fix writes
//! it there: `aria-describedby` on the trigger, and an `id` on the tooltip
//! where it has none.
//!
//! **Only what the text says once.** The scan's readers decide which tooltip
//! names which trigger, and the edit finds each opening tag by its own `id` or
//! `for`. Where that tag is not found exactly once, as with an `id` written
//! twice or a value built in an expression, the file is left as it is and the
//! finding stays for a person.

use std::path::Path;

use oxc_span::SourceType;
use regex::Regex;

use super::files::Kind;
use super::jsx;
use super::markup::{self, Element, Template, Value};

/// A literal attribute's value, where it is written out and not empty.
fn literal(element: &Element, name: &str) -> Option<String> {
    element
        .attributes
        .iter()
        .find(|attribute| attribute.name == name)
        .and_then(|attribute| match &attribute.value {
            Value::Literal(value) if !value.is_empty() => Some(value.clone()),
            _ => None,
        })
}

/// Whether an element carries an attribute in any binding syntax.
fn writes(element: &Element, name: &str) -> bool {
    element.attributes.iter().any(|attribute| {
        let raw = attribute.name.as_str();
        let bare = raw
            .strip_prefix("v-bind:")
            .or_else(|| raw.strip_prefix([':', '.', '?']))
            .unwrap_or(raw);
        bare.trim_start_matches('[').trim_end_matches(']') == name
    })
}

/// Where an opening tag's name ends, for the one `<tag … name="value"` the
/// text holds. `None` where it holds none, or more than one.
fn opening(text: &str, tag: &str, name: &str, value: &str) -> Option<usize> {
    let pattern = format!(
        r#"<{}\s[^>]*?\b{}\s*=\s*["']{}["']"#,
        regex::escape(tag),
        regex::escape(name),
        regex::escape(value)
    );
    let found: Vec<_> = Regex::new(&pattern).ok()?.find_iter(text).collect();
    match found.as_slice() {
        [one] => Some(one.start() + 1 + tag.len()),
        _ => None,
    }
}

/// An id no element in the file has, from the trigger's own.
fn fresh_id(elements: &[Element], named: &str) -> String {
    let taken = |id: &str| {
        elements
            .iter()
            .any(|one| literal(one, "id").as_deref() == Some(id))
    };
    let base = format!("{named}-tooltip");
    let mut id = base.clone();
    let mut count = 2;
    while taken(&id) {
        id = format!("{base}-{count}");
        count += 1;
    }
    id
}

/// The file's text with every tooltip's plain trigger linked, and how many it
/// linked.
pub fn link_tooltips(text: &str, template: &Template) -> (String, usize) {
    let elements = &template.elements;
    let mut edits: Vec<(usize, String)> = Vec::new();
    for tooltip in elements
        .iter()
        .filter(|one| matches!(one.tag.as_str(), "helix-tooltip" | "helix-headless-tooltip"))
    {
        let Some(named) = literal(tooltip, "for") else {
            continue;
        };
        let triggers: Vec<&Element> = elements
            .iter()
            .filter(|one| literal(one, "id").as_deref() == Some(named.as_str()))
            .collect();
        let [trigger] = triggers.as_slice() else {
            continue;
        };
        if trigger.tag.starts_with("helix-")
            || trigger.tag.is_empty()
            || writes(trigger, "aria-describedby")
            || writes(trigger, "aria-labelledby")
        {
            continue;
        }
        let Some(at) = opening(text, &trigger.tag, "id", &named) else {
            continue;
        };
        let (id, add_id) = if let Some(id) = literal(tooltip, "id") {
            (id, None)
        } else {
            if writes(tooltip, "id") {
                continue;
            }
            let Some(where_) = opening(text, &tooltip.tag, "for", &named) else {
                continue;
            };
            let id = fresh_id(elements, &named);
            (id.clone(), Some((where_, format!(" id=\"{id}\""))))
        };
        edits.push((at, format!(" aria-describedby=\"{id}\"")));
        edits.extend(add_id);
    }
    let linked = edits
        .iter()
        .filter(|(_, edit)| edit.starts_with(" aria-describedby"))
        .count();
    edits.sort_by_key(|edit| std::cmp::Reverse(edit.0));
    let mut out = text.to_owned();
    for (at, edit) in edits {
        out.insert_str(at, &edit);
    }
    (out, linked)
}

/// Reads a file the way the scan reads it, for the fix. MDX is left out,
/// since its code samples are taken out before it is read and the offsets
/// would not be the file's.
pub fn template(path: &Path, kind: Kind, text: &str) -> Option<Template> {
    match kind {
        Kind::Template => Some(markup::read(text, 1)),
        Kind::Module { jsx } => {
            let source = SourceType::from_path(path)
                .unwrap_or_else(|_| SourceType::tsx())
                .with_jsx(jsx);
            jsx::read(text, source)
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::link_tooltips;
    use crate::scan::markup;

    fn fixed(text: &str) -> (String, usize) {
        link_tooltips(text, &markup::read(text, 1))
    }

    #[test]
    fn a_plain_trigger_names_the_tooltip_and_a_tooltip_with_no_id_gets_one() {
        assert_eq!(
            fixed(r#"<button id="save">Save</button><helix-tooltip for="save" content="Save your work"></helix-tooltip>"#),
            (
                r#"<button aria-describedby="save-tooltip" id="save">Save</button><helix-tooltip id="save-tooltip" for="save" content="Save your work"></helix-tooltip>"#.to_owned(),
                1
            )
        );
        assert_eq!(
            fixed(r#"<a id="docs" href="/docs">Docs</a><helix-tooltip id="tip" for="docs"></helix-tooltip>"#),
            (
                r#"<a aria-describedby="tip" id="docs" href="/docs">Docs</a><helix-tooltip id="tip" for="docs"></helix-tooltip>"#.to_owned(),
                1
            )
        );
    }

    #[test]
    fn a_described_trigger_a_helix_trigger_and_an_id_written_twice_are_left_alone() {
        for text in [
            r#"<button id="s" aria-describedby="x">S</button><helix-tooltip for="s"></helix-tooltip>"#,
            r#"<helix-button id="s">S</helix-button><helix-tooltip for="s"></helix-tooltip>"#,
            r#"<button id="s">S</button><button id="s">T</button><helix-tooltip for="s"></helix-tooltip>"#,
            r#"<button id="s">S</button><helix-tooltip for="elsewhere"></helix-tooltip>"#,
        ] {
            assert_eq!(fixed(text), (text.to_owned(), 0), "{text}");
        }
    }

    #[test]
    fn an_id_already_taken_is_not_given_to_the_tooltip() {
        let (out, linked) = fixed(
            r#"<p id="s-tooltip"></p><button id="s">S</button><helix-tooltip for="s"></helix-tooltip>"#,
        );
        assert_eq!(linked, 1);
        assert!(
            out.contains(r#"<helix-tooltip id="s-tooltip-2" for="s">"#),
            "{out}"
        );
    }
}
