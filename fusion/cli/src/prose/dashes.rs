//! Holds every line this repository writes to no em dash.
//!
//! **The rule was written down and nothing checked it**, which is the same
//! story `dialect` tells: `AGENTS.md` has said "no em dashes in code, docs,
//! comments, or copy" since it was written, and the tree held 140 of them on 14
//! Sep 2026 across 89 files, comments and stylesheets and conventions alike.
//! An unwritten convention is learned from the corpus, and so is a written one
//! nobody enforces.
//!
//! **No fix, on purpose.** A dash stands in for a period, a colon, a comma or a
//! pair of parentheses, and which one is a reading of the sentence. A sweep
//! that picked one would be right often enough to be trusted and wrong often
//! enough to matter, so this reports the line and a person writes what the
//! dash meant.
//!
//! **The corpus is `dialect`'s**: what a person wrote, as against what a build
//! wrote from it. A file that names the character in order to forbid it writes
//! the escape, `\u2014`, which is the character to a parser and not to this
//! rule. The one block this skips is what `next dev` writes into
//! `fusion/site/AGENTS.md` on every start: a fix there is undone by the next
//! run, which is the argument `dialect` makes about generated files, applied to
//! a block rather than a file.

use std::fs;

use crate::prose::dialect::corpus;
use crate::rules::{Context, Finding, Report};

/// The character. Written as its escape so this file passes its own rule.
const EM_DASH: char = '\u{2014}';

/// Where the block Next.js rewrites begins and ends.
const NEXT_BEGINS: &str = "<!-- BEGIN:nextjs-agent-rules -->";
const NEXT_ENDS: &str = "<!-- END:nextjs-agent-rules -->";

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for file in corpus(context) {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        checked += 1;
        let where_ = context.relative(&file);
        let mut rewritten = false;
        for (number, line) in text.split('\n').enumerate() {
            if line.contains(NEXT_BEGINS) {
                rewritten = true;
            }
            if line.contains(NEXT_ENDS) {
                rewritten = false;
            }
            if rewritten || !line.contains(EM_DASH) {
                continue;
            }
            /* One finding per line, because a line is what a person opens, and
            a line with two dashes is usually one parenthetical. */
            findings.push(Finding {
                detail: "Write what the dash meant: a period ends the thought, a colon \
                         introduces it, a comma or a pair of parentheses sets it aside."
                    .to_owned(),
                file: format!("{where_}:{}", number + 1),
                message: "an em dash, which this repository does not write".to_owned(),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "files of prose",
    }
}
