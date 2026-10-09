//! A doc comment in a published package says nothing only this repository can
//! read.
//!
//! **A doc comment ships.** Declarations build with comments kept, so a `/** */`
//! block in a published package's source is what an editor shows a consumer on
//! hover. A queue row, a pointer to `AGENTS.md`, or "measured on this
//! repository" is a note to us, and a consumer has no queue and no checkout to
//! follow it into.
//!
//! **Only `/** */` blocks, and only in packages that publish.** A `/* */` or a
//! `//` comment is dropped from the declarations, and a private package ships
//! nothing, so both are ours to write in as we like.

use std::fs;
use std::sync::LazyLock;

use fusion_rules::walk::crawl;
use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace;

/// A doc comment, from its opening to its close.
static DOC: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*\*.*?\*/").expect("a literal pattern compiles"));

/// What a note to us looks like, and what a consumer reads it as.
static NOTES: LazyLock<[(Regex, &'static str); 4]> = LazyLock::new(|| {
    [
        (
            Regex::new(r"queue\.md|\[#\d+\]").expect("a literal pattern compiles"),
            "a queue row",
        ),
        (
            Regex::new(r"AGENTS\.md|CONVENTIONS\.md|CLAUDE\.md|\.local/")
                .expect("a literal pattern compiles"),
            "a file in this repository's checkout",
        ),
        (
            Regex::new(r"(?i)\bthis (?:repository|repo)\b").expect("a literal pattern compiles"),
            "this repository",
        ),
        (
            Regex::new(r"fusion\.json").expect("a literal pattern compiles"),
            "this repository's configuration",
        ),
    ]
});

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for manifest in workspace::manifests(&context.root) {
        let private = manifest.value.get("private").and_then(Value::as_bool) == Some(true);
        if private || manifest.directory.is_empty() {
            continue;
        }
        let source = context.root.join(&manifest.directory).join("src");
        let mut files = Vec::new();
        crawl(
            &source,
            &|path| {
                let name = path.to_string_lossy();
                name.ends_with(".ts")
                    && !name.ends_with(".d.ts")
                    && !name.contains(".spec.")
                    && !name.contains(".generated.")
            },
            &mut files,
        );
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);
            for block in DOC.find_iter(&text) {
                checked += 1;
                for (pattern, what) in NOTES.iter() {
                    let Some(found) = pattern.find(block.as_str()) else {
                        continue;
                    };
                    let line = text[..block.start() + found.start()].lines().count().max(1);
                    findings.push(Finding {
                        detail: format!(
                            "Declarations keep doc comments, so a consumer reads this on hover \
                             and has no way to follow it. Say it without {what}, or make the \
                             block a `/* */` comment if it is a note to us."
                        ),
                        file: format!("{where_}:{line}"),
                        message: format!(
                            "a published doc comment names {what}: `{}`",
                            found.as_str()
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "doc comments in published sources",
    }
}
