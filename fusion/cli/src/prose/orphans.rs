//! A doc block has to document the thing under it, or it documents nothing.
//!
//! **Two doc blocks in a row is the shape**: the first sits on the second rather
//! than on a member, so nothing reads it. It reaches no manifest, prints on no
//! reference page, and shows in no editor tooltip, while looking in the source
//! exactly like documentation that works. That is the whole problem with it —
//! the words are still there, so nobody deletes them and nobody notices they
//! stopped being attached to anything. The fix is to demote the stranded block
//! to a plain comment, which keeps every word where it is and stops it claiming
//! to describe the member below.
//!
//! **A blank line between them changes nothing**, which is why this looks past
//! whitespace. A reader sees two paragraphs and assumes the first belongs to the
//! file; the parser sees a block with no declaration after it.
//!
//! **A file header is not this, and exempting it is the whole subtlety.** A
//! module's own block sits above the first member's block by convention, so
//! every file with both looks like the fault from the pattern alone: matching on
//! the pattern reports thirty-eight, of which twenty-nine are headers doing
//! their job. A header is recognized by position rather than by a tag, because
//! most of ours carry no `@file` and adding one to every file to satisfy a check
//! would be the check deciding the house style. Nothing but a shebang and
//! whitespace above it means it is the file's.
//!
//! **It also catches a doc block at the end of a file**, where there is nothing
//! under it at all. That is rarer and the same fault.
//!
//! **The second shape is prose that sits after a tag**, which is dropped the
//! same way and is harder to see, because the block it is in does document
//! something. A description ends at the first tag, so a paragraph written below
//! `@csspart` or `@documentation` reaches no manifest and prints on no page
//! while sitting in the middle of a block that works.
//!
//! A tag's own description may run to several lines and often does, so a
//! continuation is not this: the fault is a *new paragraph*, marked by a blank
//! comment line before it and text at the comment margin rather than indented
//! under a bullet. Without that distinction the same scan reports sixty-eight,
//! forty-three of them a tag's own words wrapping.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

static OPENS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*/\*\*").expect("a literal pattern compiles"));
static TERMINAL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^\s*\*\s+@(since|status|category|aliases|documentation|slot|csspart|cssproperty|event|controlled)\b",
    )
    .expect("a literal pattern compiles")
});
static PROSE_TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*\*\s+@(description|remarks|example)\b").expect("a literal pattern compiles")
});
static BLANK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\*\s*$").expect("a literal pattern compiles"));
static MARGIN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\* \S").expect("a literal pattern compiles"));
static INDENTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\* {2}").expect("a literal pattern compiles"));
static TAGGED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\*\s+@").expect("a literal pattern compiles"));
static SHEBANG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^#![^\n]*\n").expect("a literal pattern compiles"));

/// Every paragraph that sits after a tag, by line number.
fn stranded(text: &str) -> Vec<usize> {
    let lines: Vec<&str> = text.split('\n').collect();
    let mut found = Vec::new();
    let mut inside = false;
    let mut tagged = false;
    for (at, line) in lines.iter().enumerate() {
        if OPENS.is_match(line) {
            inside = true;
            tagged = false;
        } else if !inside {
        } else if line.contains("*/") {
            inside = false;
        } else if PROSE_TAG.is_match(line) {
            tagged = false;
        } else if TERMINAL.is_match(line) {
            tagged = true;
        } else if tagged
            && at > 0
            && BLANK.is_match(lines[at - 1])
            && MARGIN.is_match(line)
            && !INDENTED.is_match(line)
            && !TAGGED.is_match(line)
        {
            found.push(at + 1);
            tagged = false;
        }
    }
    found
}

pub fn run(context: &Context) -> Report {
    /* Generated typings and stylesheets are written by a generator from the
    manifest, so a stranded block in one is a fault in that template rather than
    something anybody edits here. */
    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            (name.ends_with(".mjs") || name.ends_with(".ts") || name.ends_with(".tsx"))
                && !name.ends_with(".css.ts")
                && !name.ends_with("jsx.d.ts")
                && !name.ends_with("vue.d.ts")
        },
        &mut files,
    );

    let mut findings = Vec::new();
    let mut held = 0;

    for file in files {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        let where_ = context.relative(&file);
        let line_of = |at: usize| text[..at].matches('\n').count() + 1;

        for at in stranded(&text) {
            findings.push(Finding {
                detail: "A description ends at the first tag. Move it above the first tag."
                    .to_owned(),
                file: format!("{where_}:{at}"),
                message: "a paragraph sits after a tag, so it reaches no manifest and no \
                          reference page"
                    .to_owned(),
            });
        }

        for open in text.match_indices("/**").map(|(at, _)| at) {
            let Some(close) = text[open + 3..].find("*/").map(|at| open + 3 + at + 2) else {
                continue;
            };
            /* The file's own block, which belongs above the first member's and
            is not stranded. Recognized by having nothing but a shebang and
            whitespace above it. */
            if SHEBANG.replace(&text[..open], "").trim().is_empty() {
                held += 1;
                continue;
            }
            /* What follows, with whitespace skipped. A blank line between two
            blocks reads as separation and is not: the parser attaches a block to
            the next declaration whatever sits between them. */
            let after = text[close..].trim_start();
            if after.is_empty() {
                findings.push(Finding {
                    detail: "Demote it to a plain comment or move it onto a member.".to_owned(),
                    file: format!("{where_}:{}", line_of(open)),
                    message: "a doc block ends the file, so there is nothing under it to document"
                        .to_owned(),
                });
                continue;
            }
            if !after.starts_with("/**") {
                held += 1;
                continue;
            }
            findings.push(Finding {
                detail: "Demote it to a plain comment, which keeps the words and drops the claim."
                    .to_owned(),
                file: format!("{where_}:{}", line_of(open)),
                message: "a doc block sits directly on another one, so it reaches no manifest, no \
                          reference page and no tooltip"
                    .to_owned(),
            });
        }
    }

    Report {
        checked: held,
        findings,
        notes: Vec::new(),
        unit: "doc blocks attached to something",
    }
}
