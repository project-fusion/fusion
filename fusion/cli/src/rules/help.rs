//! A doc comment a command line prints is a reader's, not a maintainer's.
//!
//! **`--help` is rendered by a terminal, which has no idea what `**` means.** A
//! doc comment on a clap item becomes the help text verbatim, so this
//! repository's house style — bold openings that state the argument before the
//! detail — arrived on screen as literal asterisks around a paragraph about
//! contracts and the right to improve prose. Eleven of them, across both command
//! lines, on the flags a first-time reader meets first.
//!
//! **The reasoning is not the problem and deleting it would be the wrong fix.**
//! Why `--json` is on every verb is worth writing down; it is worth writing down
//! *for a maintainer*, in a block comment above the item, where every other
//! argument in these files lives. What clap prints is the other half: what the
//! flag does, and what a reader needs to decide whether to type it.
//!
//! **So the rule is about markup and not about length.** A long help text is
//! fine and often right. A help text carrying `**`, or a backticked path into
//! this repository, is one written for somebody reading the source.
//!
//! **Scoped to the types clap reads, not the files that hold them.** A doc
//! comment anywhere else is documentation and markup in it is correct — the
//! first draft of this scoped by file and reported three comments on free
//! functions in `main.rs`, which clap never sees. So it opens at a `derive` of
//! one of clap's traits, runs to the end of the type that follows, and asks
//! about the fields and variants inside it.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

/// A derive that hands the type below it to clap.
static DECLARES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"derive\([^)]*\b(Parser|Subcommand|Args)\b").expect("a literal pattern compiles")
});

/// The line that opens the type a derive applies to.
static OPENS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*(pub )?(struct|enum) \w+").expect("a literal pattern compiles")
});

/// A doc comment line, which is what clap prints.
static DOC: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*///(.*)$").expect("a literal pattern compiles"));

/// What a terminal cannot render, and what a reader cannot follow.
fn unrenderable(text: &str) -> Option<&'static str> {
    if text.contains("**") {
        return Some("bold markup, which a terminal prints as asterisks");
    }
    /* A path into this repository is a maintainer's landmark: a reader of
    `--help` has this tool and not necessarily its source. */
    if text.contains("`helix/") || text.contains("`fusion/") || text.contains("`cortex/") {
        return Some("a path into this repository, which a reader of the help does not have");
    }
    None
}

pub fn run(context: &Context) -> Report {
    let mut sources = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| path.extension().is_some_and(|one| one == "rs"),
        &mut sources,
    );

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in sources {
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        if !DECLARES.is_match(&source) {
            continue;
        }
        let where_ = file
            .strip_prefix(&context.root)
            .unwrap_or(&file)
            .to_string_lossy()
            .replace('\\', "/");

        /* Inside a clap type, by brace depth from the line that opens it. */
        let mut armed = false;
        let mut inside = false;
        let mut depth = 0usize;

        for (at, line) in source.split('\n').enumerate() {
            if DECLARES.is_match(line) {
                armed = true;
            } else if armed && OPENS.is_match(line) {
                armed = false;
                inside = true;
                depth = 0;
            }
            if inside {
                depth += line.matches('{').count();
                depth = depth.saturating_sub(line.matches('}').count());
                if depth == 0 && line.contains('}') {
                    inside = false;
                }
            }
            if !inside {
                continue;
            }

            let Some(caught) = DOC.captures(line) else {
                continue;
            };
            checked += 1;
            if let Some(why) = unrenderable(&caught[1]) {
                findings.push(Finding {
                    detail: "Clap prints a doc comment verbatim. Move the reasoning to a block \
                             comment above the item, where a maintainer reads it, and leave the \
                             doc comment saying what the reader needs."
                        .to_owned(),
                    file: format!("{where_}:{}", at + 1),
                    message: format!("help text carries {why}"),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "help lines a command line prints",
    }
}
