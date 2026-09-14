//! Holds every component's class doc block to one order, and sorts what is a list.
//!
//! **The order was real before it was written down, which is the state a
//! convention decays from.** Measured across the 246 class doc blocks on 27 Aug
//! 2026: the metadata prefix is unanimous — `@summary`, `@description`,
//! `@since`, `@status`, `@category`, `@groups`, `@aliases`, `@documentation`, in
//! that sequence, in every block that carries them. The API groups were not.
//! `@slot` came before `@csspart` 115 times and after it 3, and `@cssproperty`
//! came last 17 times against 2, so both of those are the corpus stating a rule.
//! `@csspart` against `@event` split 38 to 36, which is not a convention, it is
//! a coin landing. That one was decided rather than derived, and the decision is
//! [`SECTIONS`].
//!
//! **Within a group the entries sort alphabetically.** An unsorted list reads as
//! deliberate until it is long enough to search, and then it reads as nothing:
//! one root declares 48 parts, appended in the order they were built, and a
//! family split into three runs is invisible to any reader who does not already
//! know the answer.
//!
//! **A docs page is generated from this order.** The manifest carries the tags
//! in source order and the reference generator writes them out that way, so an
//! unsorted block is not untidy source, it is a published API table a reader
//! scans and does not find a part in. That is the whole argument for judging it
//! here rather than leaving it to review.
//!
//! **Only blocks carrying `@summary` are touched**, which is this repository's
//! marker for a component's class doc block. A member's block uses `@internal`,
//! `@param` and `@reference`, whose order is the order of the thing they
//! describe and not alphabetical, and none of them appears beside a `@summary`.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::{Captures, Regex};

use crate::rules::{Context, Finding, Report, Unwritten, Written};
use crate::workspace::crawl;

/// The tag order, one row per section, and a blank line between sections.
///
/// Tags inside a section sit together with no blank line, which is what makes
/// the six metadata tags read as one block rather than six statements.
///
/// The sequence is the corpus's own except for `@event` against `@csspart`,
/// which the corpus split almost evenly and which is settled here: slots and
/// events are what a consumer writes markup against, parts and custom properties
/// are what they write CSS against, and the two pairs are worth not
/// interleaving.
const SECTIONS: [&[&str]; 7] = [
    &["summary"],
    &["description"],
    &[
        "since",
        "status",
        "category",
        "groups",
        "aliases",
        "documentation",
    ],
    &["slot"],
    &["event"],
    &["csspart"],
    &["cssproperty"],
];

/// The tags whose entries are a list, and so are sorted within their section.
///
/// The metadata tags are not here because each appears once, and `@description`
/// is prose whose paragraphs are an argument in sequence.
const SORTED: [&str; 4] = ["csspart", "cssproperty", "event", "slot"];

static BLOCK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?ms)^([ \t]*)/\*\*\n(.*?)^[ \t]*\*/").expect("a literal pattern compiles")
});
static SUMMARY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^\s*\*\s*@summary\b").expect("a literal pattern compiles"));
static TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\*\s*@(\w+)\b").expect("a literal pattern compiles"));
static HEAD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\*\s*@\w+\s*").expect("a literal pattern compiles"));
static TYPED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:\{[^}]*\}\s+)?(\S+)\s+-").expect("a literal pattern compiles")
});
static PLAIN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(\S+)\s+-").expect("a literal pattern compiles"));
static EMPTY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\*?\s*$").expect("a literal pattern compiles"));

struct Entry {
    lines: Vec<String>,
    tag: String,
}

fn section_of(tag: &str) -> usize {
    SECTIONS
        .iter()
        .position(|one| one.contains(&tag))
        .unwrap_or(SECTIONS.len())
}

fn is_sorted(tag: &str) -> bool {
    SORTED.contains(&tag)
}

/// The name an entry sorts under, which is not in the same place for every tag.
///
/// `@event` carries a brace-wrapped type before its name and the others do not,
/// and the default slot is written with no name at all. It sorts first, which is
/// where a reader looks for it: it is the slot a component has before it has any
/// other.
fn name_of(tag: &str, line: &str) -> String {
    let body = HEAD.replace(line, "");
    let pattern = if tag == "event" { &TYPED } else { &PLAIN };
    pattern
        .captures(&body)
        .map_or_else(String::new, |caught| caught[1].to_owned())
}

/// Splits a block into its leading prose and one entry per tag.
///
/// An entry owns every line after its tag until the next one, so a wrapped
/// description and the blank line inside a multi-paragraph `@description` both
/// travel with the tag that opened them. Trailing blanks are dropped because the
/// rebuild puts the separators back, and keeping them would double every one.
fn parse(inner: &str) -> (Vec<String>, Vec<Entry>) {
    let mut lines: Vec<String> = inner.split('\n').map(str::to_owned).collect();
    if lines.last().is_some_and(|one| one.trim().is_empty()) {
        lines.pop();
    }
    let mut lead: Vec<String> = Vec::new();
    let mut entries: Vec<Entry> = Vec::new();
    for line in lines {
        if let Some(caught) = TAG.captures(&line) {
            entries.push(Entry {
                lines: vec![line.clone()],
                tag: caught[1].to_owned(),
            });
        } else if let Some(last) = entries.last_mut() {
            last.lines.push(line);
        } else {
            lead.push(line);
        }
    }
    for entry in &mut entries {
        while entry.lines.len() > 1 && EMPTY.is_match(entry.lines.last().expect("checked")) {
            entry.lines.pop();
        }
    }
    while lead.last().is_some_and(|one| EMPTY.is_match(one)) {
        lead.pop();
    }
    (lead, entries)
}

/// The entries in the order they belong in.
///
/// Sorted on the section, then the entry's name where the tag is one whose
/// entries are a list, then where it already sat. That last key is what makes
/// this stable for everything the order does not speak to.
fn ordered(entries: &[Entry]) -> Vec<usize> {
    let mut order: Vec<usize> = (0..entries.len()).collect();
    order.sort_by_key(|&at| {
        let entry = &entries[at];
        let name = if is_sorted(&entry.tag) {
            name_of(&entry.tag, &entry.lines[0]).to_lowercase()
        } else {
            String::new()
        };
        (section_of(&entry.tag), name, at)
    });
    order
}

fn rebuild(indent: &str, lead: &[String], entries: &[Entry]) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut previous: Option<usize> = None;
    for at in ordered(entries) {
        let entry = &entries[at];
        let section = section_of(&entry.tag);
        if previous.is_some_and(|one| one != section) {
            out.push(format!("{indent} *"));
        }
        out.extend(entry.lines.iter().cloned());
        previous = Some(section);
    }
    let body: Vec<&String> = lead.iter().chain(out.iter()).collect();
    let joined = body
        .into_iter()
        .map(String::as_str)
        .collect::<Vec<&str>>()
        .join("\n");
    format!("{indent}/**\n{joined}\n{indent} */")
}

/// What is wrong with a block, said in the terms the author wrote it in.
///
/// A diff would be shorter to produce and useless to read: the fix is almost
/// always one tag in the wrong place, and a reader needs to be told which one
/// rather than shown fourteen moved lines. Ordering faults are named first
/// because a spacing fault beside one is a consequence of it.
fn faults(entries: &[Entry]) -> Vec<String> {
    let mut found = Vec::new();
    for pair in entries.windows(2) {
        let (here, next) = (&pair[0], &pair[1]);
        if section_of(&here.tag) > section_of(&next.tag) {
            found.push(format!(
                "`@{}` comes after `@{}`, and belongs before it",
                next.tag, here.tag
            ));
            continue;
        }
        if here.tag != next.tag || !is_sorted(&here.tag) {
            continue;
        }
        let first = name_of(&here.tag, &here.lines[0]);
        let second = name_of(&next.tag, &next.lines[0]);
        if first.to_lowercase() > second.to_lowercase() {
            found.push(format!(
                "`@{} {second}` comes after `{first}`, and sorts before it",
                here.tag
            ));
        }
    }
    found
}

/// A file the sort would rewrite: where it is, what it was, what it becomes,
/// and what to say about each block it moved.
type Rewritten = (PathBuf, String, String, Vec<(usize, Vec<String>)>);

/// Every source that could carry a class doc block, and what a sort makes of it.
fn survey(context: &Context) -> (usize, Vec<Rewritten>) {
    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            (name.ends_with(".ts") || name.ends_with(".tsx"))
                && !name.ends_with(".d.ts")
                && !name.contains(".spec.")
                && !name.contains(".generated.")
        },
        &mut files,
    );

    let mut blocks = 0;
    let mut changed = Vec::new();
    for file in files {
        let Ok(before) = fs::read_to_string(&file) else {
            continue;
        };
        if !before.contains("@summary") {
            continue;
        }
        let mut said: Vec<(usize, Vec<String>)> = Vec::new();
        let after = BLOCK.replace_all(&before, |caught: &Captures| {
            let whole = caught[0].to_owned();
            if !SUMMARY.is_match(&caught[2]) {
                return whole;
            }
            let (lead, entries) = parse(&caught[2]);
            if entries.is_empty() {
                return whole;
            }
            blocks += 1;
            let next = rebuild(&caught[1], &lead, &entries);
            if next == whole {
                return whole;
            }
            let at = caught.get(0).map_or(0, |one| one.start());
            let line = before[..at].matches('\n').count() + 1;
            let mut named = faults(&entries);
            if named.is_empty() {
                named.push("the blank lines between tag groups are off".to_owned());
            }
            said.push((line, named));
            next
        });
        let after = after.into_owned();
        if after != before {
            changed.push((file, before, after, said));
        }
    }
    (blocks, changed)
}

pub fn run(context: &Context) -> Report {
    let (blocks, changed) = survey(context);
    let mut findings = Vec::new();
    for (file, _, _, said) in changed {
        let where_ = context.relative(&file);
        for (line, named) in said {
            for one in named {
                findings.push(Finding {
                    detail: "The reference page is generated from this order, so an unsorted \
                             block is a published API table a reader scans and does not find a \
                             part in. Run `fusion prose fix --only tag-order`."
                        .to_owned(),
                    file: format!("{where_}:{line}"),
                    message: one,
                });
            }
        }
    }
    Report {
        checked: blocks,
        findings,
        notes: Vec::new(),
        unit: "class doc blocks",
    }
}

pub fn fix(context: &Context) -> Written {
    let (_, changed) = survey(context);
    let mut written = Vec::new();
    for (file, _, after, _) in changed {
        fs::write(&file, after).map_err(|error| Unwritten {
            file: context.relative(&file),
            why: error.to_string(),
        })?;
        written.push(context.relative(&file));
    }
    Ok(written)
}
