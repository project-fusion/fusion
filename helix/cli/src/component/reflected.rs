//! No reflected property carries a default.
//!
//! **The two together write onto a host nobody configured.** Reflection exists
//! so a selector can reach a value; a default is what the element holds before
//! anyone says otherwise. A property with both writes its attribute onto every
//! host the moment the element upgrades, including the ones a consumer rendered
//! and never touched.
//!
//! The consequences are worse than untidy markup. React reports it as a
//! hydration mismatch, the server having sent one thing and the client having
//! found another because the element wrote on itself in between. A serialized
//! host re-parses as a declaration, so copying a loaded image's markup and
//! pasting it back produces an element claiming to have fetched something it
//! never did. And the stylesheet gets harder rather than easier: with no
//! default the resting arrangement is the attribute's absence, so a rule only
//! has to name the departure.
//!
//! **`false`, `undefined` and `null` are not defaults**, they are the absence
//! of one written out, and reflecting any of them writes nothing: Lit removes
//! the attribute. The empty string is a default, and was listed here as one of
//! them: Lit reflects it as `name=""`, which is an attribute the server never
//! sent, and `reflected-defaults` said so while this said the opposite.
//!
//! **A type annotation may sit between the name and the `=`.** A pattern
//! assuming the simple form sees nothing in
//! `orientation: 'horizontal' | 'vertical' = 'vertical'` and reports clean.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::line_of;
use crate::component::{sources, Context, Finding, Report};

/// Values meaning "nothing was said", rather than a choice made for a consumer.
const RESTING: [&str; 3] = ["false", "undefined", "null"];

static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)@property\(\{[^}]*reflect:\s*true[^}]*\}\)\s*\n\s*(?:override\s+)?(?:declare\s+)?(\w+)\s*(?::[^=\n]+)?(?:=\s*([^\n]+?))?\s*$",
    )
    .expect("the declaration pattern is a literal and compiles")
});

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            for capture in DECLARATION.captures_iter(&text) {
                checked += 1;
                let Some(value) = capture.get(2) else {
                    continue;
                };
                let value = value.as_str().trim().trim_end_matches(';');
                if RESTING.contains(&value) {
                    continue;
                }
                let name = capture.get(1).map_or("", |one| one.as_str());
                /* The member's own line, which a decorator over two lines or a
                blank line under it put somewhere other than one below. */
                let line = line_of(&text, capture.get(1).map_or(0, |one| one.start()));
                findings.push(Finding {
                    detail: "Declare it optional and let the resting arrangement be the \
                             attribute's absence, which is what the stylesheet should be asking \
                             about anyway."
                        .to_owned(),
                    file: format!("{}:{line}", context.relative(&file)),
                    message: format!(
                        "`{name}` reflects and defaults to {value}, so every host gains an \
                         attribute nobody wrote"
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "reflected properties",
    }
}
