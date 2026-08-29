//! Every matcher a spec reaches for exists in the browser harness.
//!
//! **Two runners, two matcher sets.** One runs the DOM specs under happy-dom
//! with the test runner's own `expect`, which has every matcher there is. The
//! other runs the same files through the hand-written browser harness, which has
//! the dozen somebody needed. A spec written against the first type-checks,
//! passes locally, and dies in the second on a name that object never had.
//!
//! **A missing matcher is worse than a failing assertion, because it looks like
//! one.** "is not a function" is reported as a failed test, so the suite is red
//! and the count is right and the reason is wrong: the thing it meant to compare
//! was never compared. Nine facts about arcs and slot centers were unchecked in
//! the only engine that computes them, and the report said they had been checked
//! and failed.
//!
//! **And the pressure is to write the spec around it, which is the real cost.**
//! An assertion the harness cannot express gets left unwritten and the one after
//! it carries the meaning alone. A spec shaped by its harness's gaps stops
//! saying what it meant, quietly, and nothing about it looks wrong afterwards.
//!
//! **What it cannot see.** A matcher called through a variable, a helper that
//! takes a matcher name, or anything built at run time. Nothing in this
//! repository does that, and if something starts, this check goes quiet rather
//! than wrong, which is the failure direction to prefer.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

/// The interface, not the object literal.
///
/// It is the declaration the harness has to satisfy, so a name typed there and
/// never implemented is the type checker's problem rather than this rule's, and
/// reading one list keeps the two from disagreeing about which is authoritative.
static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^ {2}(to[A-Za-z]+)\??:").expect("a literal pattern compiles")
});

/// `.not`, `.resolves` and `.rejects` are the modifiers that sit between the
/// call and the matcher; anything else after the close paren is not ours.
static REACHED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:\s*\.(?:not|resolves|rejects))*\s*\.(to[A-Z][A-Za-z]*)\s*\(")
        .expect("a literal pattern compiles")
});

/// Every matcher reached from an `expect(...)`, and nothing else.
///
/// **The obvious pattern is `).toX(` and it is wrong on ordinary code.** It
/// reads `new Date(x).toISOString()` and `list.slice(0, 1).toString()` as
/// matchers, because a close paren followed by a `to`-plus-capital method is
/// what a great deal of JavaScript looks like. Reported against a spec that was
/// correct, it sends whoever is reading it to add `toISOString` to a test
/// harness.
///
/// So the scan starts at `expect(`, balances the parentheses itself, and only
/// then looks for the matcher. A pattern cannot balance parens, which is the
/// whole reason this is a loop rather than a regex.
fn matchers_in(text: &str) -> Vec<(usize, String)> {
    let bytes = text.as_bytes();
    let mut found = Vec::new();
    let mut from = 0;
    while let Some(offset) = text[from..].find("expect(") {
        let at = from + offset;
        let mut depth = 0usize;
        let mut cursor = at + "expect".len();
        while cursor < bytes.len() {
            match bytes[cursor] {
                b'(' => depth += 1,
                b')' => {
                    depth -= 1;
                    if depth == 0 {
                        cursor += 1;
                        break;
                    }
                }
                _ => {}
            }
            cursor += 1;
        }
        if let Some(caught) = text.get(cursor..).and_then(|rest| REACHED.captures(rest)) {
            found.push((at, caught[1].to_owned()));
        }
        from = at + 1;
    }
    found
}

pub fn run(context: &Context) -> Report {
    let harness = context.root.join(&context.settings.spec.harness);
    let Ok(source) = fs::read_to_string(&harness) else {
        return Report {
            checked: 0,
            findings: vec![Finding {
                detail: "This rule holds the specs to the harness's own interface. Without it \
                         there is nothing to hold them to, and reporting every matcher as present \
                         would be the check passing on its own missing input."
                    .to_owned(),
                file: context.settings.spec.harness.clone(),
                message: "the browser harness is not there".to_owned(),
            }],
            unit: "assertions across the DOM specs",
        };
    };

    let declared: BTreeSet<String> = DECLARED
        .captures_iter(&source)
        .map(|caught| caught[1].to_owned())
        .collect();
    if declared.is_empty() {
        return Report {
            checked: 0,
            findings: vec![Finding {
                detail: "The names are read off the interface the harness declares. Reading none \
                         means this checked nothing, which reads exactly like finding nothing."
                    .to_owned(),
                file: context.settings.spec.harness.clone(),
                message: "no matcher names could be read out of the browser harness".to_owned(),
            }],
            unit: "assertions across the DOM specs",
        };
    }

    /* Every `*.dom.spec.ts`, which is the set the browser run bundles. */
    let mut specs = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| {
            path.file_name()
                .is_some_and(|one| one.to_string_lossy().ends_with(".dom.spec.ts"))
        },
        &mut specs,
    );

    let mut findings = Vec::new();
    let mut asserted = 0;
    for file in specs {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        let where_ = file
            .strip_prefix(&context.root)
            .unwrap_or(&file)
            .to_string_lossy()
            .replace('\\', "/");
        /* One report per name per file: a matcher the harness lacks is reached
        for the same reason everywhere it appears, and naming it once is what a
        reader acts on. */
        let mut seen: BTreeMap<String, usize> = BTreeMap::new();
        for (at, name) in matchers_in(&text) {
            asserted += 1;
            if !declared.contains(&name) {
                seen.entry(name)
                    .or_insert_with(|| text[..at].matches('\n').count() + 1);
            }
        }
        for (name, line) in seen {
            findings.push(Finding {
                detail: format!(
                    "Under happy-dom this passes, and in a real engine it is a `TypeError` \
                     reported as a failed assertion: the thing it meant to compare is never \
                     compared. Add it to `{}` rather than rewriting the spec around it.",
                    context.settings.spec.harness
                ),
                file: format!("{where_}:{line}"),
                message: format!("calls `{name}`, which the browser harness does not implement"),
            });
        }
    }

    Report {
        checked: asserted,
        findings,
        unit: "assertions across the DOM specs",
    }
}
