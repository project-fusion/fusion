//! Every icon named in markup is one the set actually has.
//!
//! **An unknown name draws nothing and says nothing.** The element indexes the
//! set by name, so a typo resolves to no glyph, renders an empty box, and
//! reports nothing anywhere: the page simply has a hole in it where a mark
//! should be.
//!
//! **A braced value is skipped**, since the name is computed and this cannot
//! know it. What is asked is only about the names somebody wrote down.
//!
//! **However the attribute is written.** An HTML example puts it on its own
//! line, a template inlines it, and JSX may brace it, so the pattern reads the
//! attribute rather than the shape of the file.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use fusion_rules::walk::crawl;
use regex::Regex;

use crate::rules::{Context, Finding, Report};

/// `name` on an icon element, in either quoting, unbraced.
static NAMED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"<[a-z-]*icon\b[^>]*?\bname=(?:"([^"{}]+)"|'([^'{}]+)')"#)
        .expect("a literal pattern compiles")
});

pub fn run(context: &Context) -> Report {
    let Some(list) = context.settings.icons.as_ref() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "icon names in markup",
        };
    };
    let known: BTreeSet<String> = fs::read_to_string(context.root.join(list))
        .unwrap_or_default()
        .lines()
        .map(str::trim)
        .filter(|one| !one.is_empty() && !one.starts_with('#'))
        .map(str::to_owned)
        .collect();
    if known.is_empty() {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "icon names in markup",
        };
    }

    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path| {
            let name = path.to_string_lossy();
            (name.ends_with(".html") || name.ends_with(".tsx") || name.ends_with(".ts"))
                && !name.contains(".spec.")
        },
        &mut files,
    );

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in files {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        let where_ = context.relative(&file);
        for found in NAMED.captures_iter(&text) {
            let name = found
                .get(1)
                .or_else(|| found.get(2))
                .map_or("", |one| one.as_str())
                .to_owned();
            checked += 1;
            if known.contains(&name) {
                continue;
            }
            let at = found.get(0).expect("group zero always matches").start();
            findings.push(Finding {
                detail: format!(
                    "An unknown name draws nothing and says nothing. Add it to `{list}` and \
                     rebuild the set, or use one that is there."
                ),
                file: format!("{where_}:{}", text[..at].matches('\n').count() + 1),
                message: format!("`name=\"{name}\"` is not in the set"),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "icon names in markup",
    }
}
