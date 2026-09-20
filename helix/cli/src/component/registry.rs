//! Every prose copy of the axis registry agrees with the registry.
//!
//! **The vocabulary lives in three files and only one of them is checked.**
//! `AXES` is the registry, `CONVENTIONS.md` restates it as a table, and the
//! reference page restates it again. Nothing held the two copies to it, which is
//! how `tone: surface` and `width: standard` stayed on a published page after
//! both were gone from the registry: two people read that page and neither had a
//! reason to doubt it, because CONVENTIONS names the check that holds the
//! vocabulary and the page does not.
//!
//! **And a copy goes stale by omission as often as by outliving a value.**
//! Registering an axis means editing three files by hand, so the way this breaks
//! next is a row nobody added rather than a row nobody deleted. The axis names
//! are compared as sets for that reason, in both directions.
//!
//! **A cell that is prose is held to a weaker claim, on purpose.** The reference
//! page writes `tone` as "the status and intent words" and names four of seven,
//! which is the right thing for a page to do and would fail an equality test.
//! Where a cell is nothing but backticked words it is a list and must match; the
//! moment it carries a sentence it is a gloss, and the claim is only that every
//! word it does name is real. The fault this rule exists to catch, a value on a
//! page the registry does not have, is caught either way.
//!
//! **The per-value tables are read as well**, which is the other half. Each axis
//! carries a table saying what its values mean, because membership is what the
//! `axes` rule can see and meaning is what it cannot, and a table of meanings
//! rots exactly as a table of values does. One is recognized by its first column
//! being `Value`.
//!
//! **Its rows are one axis's words, all of them.** A table mixing two axes is a
//! table about nothing, and a table naming four of an axis's five is the stale
//! copy this rule exists to catch, arriving by omission the way the axis names
//! above do: the next value registered is one nine tables have to gain by hand,
//! and the one that does not gain it says the value does not exist. Held to
//! equality for that reason rather than to membership. Every complete table
//! names its own axis unambiguously, so nothing is guessed: `auto` alone sits in
//! two vocabularies, `auto` beside `full` in one.

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::component::axes::AXES;
use crate::component::{Context, Finding, Report};

/// A backticked word, which is how both files write a registered one.
static QUOTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`([a-z][a-z0-9-]*)`").expect("a literal pattern compiles"));

/// The prose a domain publishes about itself.
///
/// Its conventions and every page under `docs/content`, found the way the
/// `documented` prose rule finds them, so a page added tomorrow is read without
/// being named here.
fn prose(root: &Path, domain: &str) -> Vec<PathBuf> {
    let mut found = Vec::new();
    let conventions = root.join(domain).join("CONVENTIONS.md");
    if conventions.is_file() {
        found.push(conventions);
    }
    let mut pages: Vec<PathBuf> = fs::read_dir(root.join(domain).join("docs/content"))
        .into_iter()
        .flatten()
        .flatten()
        .map(|one| one.path())
        .filter(|one| one.extension().is_some_and(|kind| kind == "mdx"))
        .collect();
    pages.sort();
    found.extend(pages);
    found
}

/// The domains this workspace holds components in, by the first path segment.
fn domains(context: &Context) -> BTreeSet<String> {
    context
        .settings
        .tiers
        .iter()
        .filter_map(|tier| tier.split('/').next())
        .map(str::to_owned)
        .collect()
}

/// The cells of one markdown table row, trimmed, without the outer pipes.
fn cells(line: &str) -> Vec<String> {
    let trimmed = line.trim();
    let inner = trimmed
        .strip_prefix('|')
        .and_then(|one| one.strip_suffix('|'))
        .unwrap_or(trimmed);
    inner.split('|').map(|one| one.trim().to_owned()).collect()
}

/// Whether a cell is a list of words rather than a sentence naming some.
///
/// Everything outside the backticks has to be punctuation for the cell to be a
/// list, which is what tells `` `arc`, `circle` `` from "the status and intent
/// words: `primary`, and so on".
fn is_a_list(cell: &str) -> bool {
    QUOTED
        .replace_all(cell, " ")
        .chars()
        .all(|one| one.is_whitespace() || one == ',' || one == ';')
}

fn quoted(cell: &str) -> Vec<String> {
    QUOTED
        .captures_iter(cell)
        .map(|one| one[1].to_owned())
        .collect()
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for domain in domains(context) {
        for file in prose(&context.root, &domain) {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);
            checked += table_of_axes(&text, &where_, &mut findings);
            checked += table_of_values(&text, &where_, &mut findings);
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "restatements of the axis registry",
    }
}

/// A table whose first column is `Axis`, held to the registry in both directions.
fn table_of_axes(text: &str, where_: &str, findings: &mut Vec<Finding>) -> usize {
    let lines: Vec<&str> = text.lines().collect();
    let mut checked = 0;

    for (at, line) in lines.iter().enumerate() {
        let header = cells(line);
        if header.first().map(String::as_str) != Some("Axis") {
            continue;
        }
        let mut named: BTreeSet<String> = BTreeSet::new();
        for row in lines
            .iter()
            .skip(at + 2)
            .take_while(|one| one.trim_start().starts_with('|'))
        {
            let row = cells(row);
            let (Some(axis), Some(values)) = (row.first(), row.get(1)) else {
                continue;
            };
            let Some(name) = quoted(axis).into_iter().next() else {
                continue;
            };
            named.insert(name.clone());
            checked += 1;
            let Some((_, registered)) = AXES.iter().find(|(one, _)| *one == name) else {
                findings.push(Finding {
                    detail: "The registry is `AXES` in the `axes` rule, and a row here is a copy \
                             of it. A copy naming an axis the registry does not have tells a \
                             reader to write an attribute no component answers."
                        .to_owned(),
                    file: where_.to_owned(),
                    message: format!("lists `{name}` as an axis, which the registry does not have"),
                });
                continue;
            };
            let said: BTreeSet<String> = quoted(values).into_iter().collect();
            let held: BTreeSet<String> = registered.iter().map(|one| (*one).to_owned()).collect();
            for dead in said.difference(&held) {
                findings.push(Finding {
                    detail: "A value on a page outlives the registry silently: the attribute is \
                             written, nothing matches it, and the component keeps its default, \
                             which looks deliberate."
                        .to_owned(),
                    file: where_.to_owned(),
                    message: format!(
                        "gives `{name}` the value `{dead}`, which the axis does not have"
                    ),
                });
            }
            if !is_a_list(values) {
                continue;
            }
            for missing in held.difference(&said) {
                findings.push(Finding {
                    detail: "The cell is a list rather than a gloss, so it is read as the whole \
                             vocabulary. A list short of one value is a value nobody knows they \
                             may write."
                        .to_owned(),
                    file: where_.to_owned(),
                    message: format!("lists `{name}` without `{missing}`, which the axis has"),
                });
            }
        }

        for (axis, _) in AXES {
            if named.contains(axis) {
                continue;
            }
            findings.push(Finding {
                detail: "Registering an axis means writing it in three places by hand, so a copy \
                         goes stale by omission as readily as by outliving a value."
                    .to_owned(),
                file: where_.to_owned(),
                message: format!("tabulates the axes and leaves out `{axis}`"),
            });
        }
    }
    checked
}

/// A table whose first column is `Value`, which says what one axis's words mean.
fn table_of_values(text: &str, where_: &str, findings: &mut Vec<Finding>) -> usize {
    let lines: Vec<&str> = text.lines().collect();
    let mut checked = 0;

    for (at, line) in lines.iter().enumerate() {
        if cells(line).first().map(String::as_str) != Some("Value") {
            continue;
        }
        let mut said: BTreeSet<String> = BTreeSet::new();
        for row in lines
            .iter()
            .skip(at + 2)
            .take_while(|one| one.trim_start().starts_with('|'))
        {
            let row = cells(row);
            let Some(value) = row.first().and_then(|one| quoted(one).into_iter().next()) else {
                continue;
            };
            said.insert(value);
            checked += 1;
        }
        if said.is_empty() {
            continue;
        }
        if AXES.iter().any(|(_, values)| {
            said.len() == values.len() && said.iter().all(|one| values.contains(&one.as_str()))
        }) {
            continue;
        }
        /* Inside one axis and short of it, which is the omission case and worth
           naming what is missing: a reader who has to diff two tables by eye is
           being asked to do what this rule is for. */
        if let Some((axis, values)) = AXES
            .iter()
            .filter(|(_, values)| said.iter().all(|one| values.contains(&one.as_str())))
            /* The nearest axis, not the first one listed. A table left holding
               `auto` alone sits inside `orientation` and inside `width`, and the
               one it is missing least of is the one it was. */
            .min_by_key(|(_, values)| values.len() - said.len())
        {
            findings.push(Finding {
                detail: "A table of what values mean is a copy of the registry, so it goes stale \
                         by omission as much as by outliving a value. A value with no row reads \
                         as a value that does not exist."
                    .to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "explains `{axis}` and omits {}",
                    values
                        .iter()
                        .filter(|one| !said.contains(**one))
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<String>>()
                        .join(", ")
                ),
            });
            continue;
        }
        findings.push(Finding {
            detail: "A table of what values mean belongs to one axis, and its rows have to be \
                     that axis's words. Rows spanning two axes describe nothing a consumer can \
                     write, and a row in neither is a value that outlived the registry."
                .to_owned(),
            file: where_.to_owned(),
            message: format!(
                "explains the values {}, which are not one axis's",
                said.iter()
                    .map(|one| format!("`{one}`"))
                    .collect::<Vec<String>>()
                    .join(", ")
            ),
        });
    }
    checked
}
