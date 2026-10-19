//! Every DOM spec registers the DOM before anything else in it runs.
//!
//! **A spec that passes only after another file does is not a test of itself.**
//! The DOM specs share a process, so a file that reads the DOM before it
//! registers one passes wherever an earlier file registered it, and fails when
//! it runs alone or first. Two things in a file run before a `registerDom()`
//! call in it: every import, since a module evaluates its imports before its
//! own code, and every `describe` body, since a file is collected before any
//! `beforeAll`. An import that loads Lit settles on its server shim for
//! `HTMLElement`; a `describe` body reading `window` finds none.
//!
//! **So the rule is about position, and not about what the file reads.** A
//! check for each way a file can reach the DOM early would miss the next one:
//! `Object.getOwnPropertyDescriptor(globalThis, 'CSS')` in a `describe` body
//! names no DOM global and broke a file all the same. A module's imports are
//! evaluated in order, so `@fusion.dev/helix-testing/dom/register` as the first
//! import runs before all of it. Measured 18 Oct 2026: 8 of 651 DOM specs
//! failed alone without it, and none with it.
//!
//! A spec that never imports `@fusion.dev/helix-testing/dom` asks for no DOM,
//! such as a pure reading named `.dom.spec.ts` for its runner, and is left
//! alone.

use std::fs;
use std::path::Path;

use fusion_rules::walk::crawl;

use crate::rules::{Context, Finding, Report};

const REGISTER: &str = "import '@fusion.dev/helix-testing/dom/register'";
const HARNESS: &str = "'@fusion.dev/helix-testing/dom'";

pub fn run(context: &Context) -> Report {
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
    let mut read = 0;
    for file in specs {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        if !text.contains(HARNESS) {
            continue;
        }
        read += 1;
        let first = text
            .split('\n')
            .enumerate()
            .find(|(_, line)| line.starts_with("import ") || line.starts_with("import{"));
        if first.is_some_and(|(_, line)| line.trim_end() == REGISTER) {
            continue;
        }
        let at = first.map_or(1, |(at, _)| at + 1);
        findings.push(Finding {
            detail: format!(
                "Its imports and its `describe` bodies run before a `registerDom()` call in it, so \
                 it passes only where an earlier file in the process registered the DOM. Put \
                 `{REGISTER}` above every other import."
            ),
            file: format!("{}:{at}", context.relative(&file)),
            message: "reads the DOM before the DOM is registered".to_owned(),
        });
    }

    Report {
        checked: read,
        findings,
        notes: Vec::new(),
        unit: "DOM specs",
    }
}
