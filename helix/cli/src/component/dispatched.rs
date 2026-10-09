//! An event a component dispatches by name is one it documents.
//!
//! **`events` reads Helix's typed event classes**, which a project built on
//! Helix does not have to use: its own components send `new CustomEvent('x')`
//! or `new Event('x')`. An event nobody documents reaches no manifest, no
//! reference and no framework typing, so a consumer finds it only by reading
//! the file that sends it.
//!
//! **Only a file that registers an element is judged.** A base class, a mixin
//! or a helper dispatches for the components that apply it, and those document
//! the event where a consumer reads it.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// An event constructed by name.
static CONSTRUCTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"new (?:Custom)?Event\(\s*['"`]([\w:-]+)['"`]"#)
        .expect("a literal pattern compiles")
});

/// A file that registers an element.
static REGISTERS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@customElement\(|customElements\.define\(").expect("a literal pattern compiles")
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
            if !REGISTERS.is_match(&text) {
                continue;
            }
            let where_ = context.relative(&file);
            let mut seen = std::collections::BTreeSet::new();
            for found in CONSTRUCTED.captures_iter(&text) {
                let name = &found[1];
                if !seen.insert(name.to_owned()) {
                    continue;
                }
                checked += 1;
                let documented = Regex::new(&format!(
                    r"@(?:event|fires)\s+(?:\{{[^}}]*\}}\s+)?{}\b",
                    regex::escape(name)
                ))
                .is_ok_and(|pattern| pattern.is_match(&text));
                if documented {
                    continue;
                }
                let line = text[..found.get(0).map_or(0, |one| one.start())]
                    .lines()
                    .count()
                    .max(1);
                findings.push(Finding {
                    detail: format!(
                        "Document it with `@event {name} - what it means` in the class's doc block, so the manifest, the reference and the framework typings carry it."
                    ),
                    file: format!("{where_}:{line}"),
                    message: format!("dispatches `{name}`, which no `@event` documents"),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "events dispatched by name",
    }
}
