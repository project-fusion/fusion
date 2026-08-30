//! No component renders the icon element for itself.
//!
//! **The element indexes the whole set at run time**, which no bundler can
//! shake: one component rendering one glyph puts every glyph into every consumer
//! that imports it — about 15kB gzipped of path data for a mark that is one
//! path. A named import through a draw helper ships the one.
//!
//! **Two smaller reasons, both real.** A named import is checked when the
//! package compiles, where a `name` string is checked only when a rule like this
//! runs. And the element is registered on one layer under one tag, so a consumer
//! on the other layer gets an inert element and no mark at all.
//!
//! **The library's own components, and nothing else.** The icon element is
//! public, and an application writing one is using it as intended: it pays for
//! the whole set once rather than once per component. What this forbids is a
//! *component* making that choice on a consumer's behalf, which is the case they
//! cannot opt out of. An example is a consumer writing markup, so it is excluded
//! for the same reason an application is.
//!
//! **Nothing does this today, and the rule is what keeps it that way**, since
//! adding the next one costs nobody anything. Comments are stripped first,
//! because several files explain this very decision by naming the tag they no
//! longer use.

use std::fs;

use regex::Regex;

use crate::component::compositions::uncommented;
use crate::component::{sources, Context, Finding, Report};

pub fn run(context: &Context) -> Report {
    let prefixes: Vec<&str> = context
        .settings
        .layers
        .iter()
        .map(|one| one.prefix.as_str())
        .filter(|one| !one.is_empty())
        .collect();
    if prefixes.is_empty() {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "component files that could reach for the whole set",
        };
    }
    let Ok(rendered) = Regex::new(&format!(
        r"<(?:{})icon\b",
        prefixes
            .iter()
            .map(|one| regex::escape(one))
            .collect::<Vec<String>>()
            .join("|")
    )) else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "component files that could reach for the whole set",
        };
    };

    let mut findings = Vec::new();
    let mut checked = 0;
    /* Only the layers, because a shared module has no consumer of its own to
    charge, and only outside the icon family itself, which is where the element
    is supposed to be. */
    for layer in &context.settings.layers {
        let root = context.root.join(&layer.source);
        let mut files = Vec::new();
        sources(&root, &mut files);
        for file in files {
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");
            if where_.contains("/icon/") || where_.contains("/.examples/") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            checked += 1;
            if !rendered.is_match(&uncommented(&raw)) {
                continue;
            }
            findings.push(Finding {
                detail: "The element indexes every glyph at run time, so one use ships all of \
                         them to every consumer. Use a draw helper with a named import."
                    .to_owned(),
                file: where_,
                message: "renders the icon element for itself".to_owned(),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "component files that could reach for the whole set",
    }
}
