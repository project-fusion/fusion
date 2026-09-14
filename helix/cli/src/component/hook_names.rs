//! A component hook spells one idea one way.
//!
//! **A hook is the name a consumer predicts**, and two spellings for one idea is
//! one they cannot. `--card-background` and `--chip-background-color` are the
//! same decision written twice, so a consumer who learned one guesses wrong at
//! the other and gets no error, no warning and no effect.
//!
//! **A physical name over a logical property is a name that can be wrong.**
//! Every stylesheet here authors logical properties, so a hook called `-height`
//! feeding `block-size` reads correctly in one writing mode and lies in another.
//! `border-width` and `stroke-width` are exempt: the first names part of a
//! shorthand and the second is SVG's own, physical by nature.
//!
//! **`-inset` is conditional rather than banned.** It is right where it feeds a
//! real `inset-*` and wrong where it feeds `padding`, which is the property a
//! consumer would guess and the one they would be wrong about.
//!
//! **One level of indirection is followed, because the library's own idiom needs
//! it.** A sheet commonly reads a hook once into a private at the top, so a
//! consumer overriding it moves every use at once: `--_card-inset:
//! var(--card-padding, …)` and then `padding: var(--_card-inset)`. Recording
//! only direct reads misses those entirely, which was 131 of 490 published hooks
//! unchecked, including the one this rule was written for.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

/// A spelling this library already has a word for.
const SYNONYMS: [(&str, &str); 2] = [("background", "background-color"), ("radii", "radius")];

/// A physical name and the logical property it should be named for.
const LOGICAL: [(&str, &str); 2] = [("height", "block-size"), ("width", "inline-size")];

/// Names whose last two words are physical by nature.
const PHYSICAL_IS_FINE: [&str; 2] = ["border-width", "stroke-width"];

static DECLARATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*([-\w]+)\s*:\s*(.*)$").expect("a literal pattern compiles"));

static READ: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\((--[a-z0-9-]+)").expect("a literal pattern compiles"));

static PRIVATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\((--_[a-z0-9-]+)").expect("a literal pattern compiles"));

static SIZE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(^|-)(block|inline)-size$").expect("a literal pattern compiles"));

/// Where one hook is read, and in what.
struct Feeds {
    properties: BTreeSet<String>,
    where_: String,
}

/// Every hook, the properties it feeds, and where it was first read.
fn survey(context: &Context) -> BTreeMap<String, Feeds> {
    let mut privates: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut reads: Vec<(String, String, String)> = Vec::new();

    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            if sheet.to_string_lossy().contains(".examples") {
                continue;
            }
            let Ok(text) = fs::read_to_string(&sheet) else {
                continue;
            };
            let where_ = context.relative(&sheet);

            for line in text.lines() {
                let Some(declaration) = DECLARATION.captures(line) else {
                    continue;
                };
                let property = declaration[1].to_owned();
                let value = declaration[2].to_owned();

                for found in READ.captures_iter(&value) {
                    let hook = found[1].to_owned();
                    /* A design token is not a component hook. */
                    if hook.starts_with("--helix-") {
                        continue;
                    }
                    reads.push((where_.clone(), hook, property.clone()));
                    if property.starts_with("--") {
                        privates.entry(property.clone()).or_default();
                    }
                }
                if !property.starts_with("--") {
                    for found in PRIVATE.captures_iter(&value) {
                        privates
                            .entry(found[1].to_owned())
                            .or_default()
                            .insert(property.clone());
                    }
                }
            }
        }
    }

    let mut feeds: BTreeMap<String, Feeds> = BTreeMap::new();
    for (where_, hook, property) in reads {
        if hook.starts_with("--_") {
            continue;
        }
        let resolved: Vec<String> = if property.starts_with("--") {
            privates
                .get(&property)
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .collect()
        } else {
            vec![property]
        };
        if resolved.is_empty() {
            continue;
        }
        let entry = feeds.entry(hook).or_insert_with(|| Feeds {
            properties: BTreeSet::new(),
            where_: where_.clone(),
        });
        entry.properties.extend(resolved);
    }

    feeds
}

pub fn run(context: &Context) -> Report {
    let synonyms: BTreeMap<&str, &str> = SYNONYMS.into_iter().collect();
    let logical: BTreeMap<&str, &str> = LOGICAL.into_iter().collect();
    let feeds = survey(context);

    let mut findings = Vec::new();
    for (hook, feeds) in &feeds {
        let name = hook.trim_start_matches("--");
        let words: Vec<&str> = name.split('-').collect();
        let last = *words.last().unwrap_or(&"");
        let listed = feeds
            .properties
            .iter()
            .cloned()
            .collect::<Vec<String>>()
            .join(", ");

        if let Some(instead) = synonyms.get(last) {
            findings.push(Finding {
                detail: "One idea with two spellings is one a consumer cannot predict.".to_owned(),
                file: feeds.where_.clone(),
                message: format!(
                    "`{hook}` ends with `-{last}`, and this library spells that `-{instead}`"
                ),
            });
            continue;
        }

        if last == "inset" && !feeds.properties.iter().any(|one| one.starts_with("inset")) {
            findings.push(Finding {
                detail: "Name it `-padding`, which is what a consumer guesses.".to_owned(),
                file: feeds.where_.clone(),
                message: format!("`{hook}` is read in {listed} and not in any `inset-*`"),
            });
            continue;
        }

        let tail = words[words.len().saturating_sub(2)..].join("-");
        let Some(instead) = logical.get(last) else {
            continue;
        };
        if PHYSICAL_IS_FINE.contains(&tail.as_str()) {
            continue;
        }
        if !feeds.properties.iter().any(|one| SIZE.is_match(one)) {
            continue;
        }
        findings.push(Finding {
            detail: format!(
                "Name it `-{instead}`: a physical name over a logical property is correct in one \
                 writing mode and wrong in another."
            ),
            file: feeds.where_.clone(),
            message: format!(
                "`{hook}` is read in {listed}, which is a logical property, and its name is \
                 physical"
            ),
        });
    }

    Report {
        checked: feeds.len(),
        findings,
        notes: Vec::new(),
        unit: "component hooks",
    }
}
