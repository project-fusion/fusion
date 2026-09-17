//! A family's aliases are one list, whichever tier's root declares them.
//!
//! **An alias is a word somebody searches for, and the gallery's search field
//! is fed from it.** It is a fact about the family rather than about a tier: a
//! reader looking for "contribution graph" wants `Heatmap` whether they would
//! have reached for the headless package or the styled one.
//!
//! **The catalog reads both roots because fourteen families declare on the
//! headless one alone.** It took the styled root and stopped, every family has
//! a styled root, so the fallback never fired and those fourteen published no
//! aliases at all. Reading both is the fix, and the union is only safe while
//! the two lists are the same list, which is what this holds. Left to itself a
//! union is the quieter fault: the tiers drift, both sets get published, and a
//! word that is no longer anybody's decision keeps working.
//!
//! **Order is part of the declaration and is not compared.** The two roots are
//! two writings of one set, and asking them to agree on the sequence as well
//! would report a fault nothing downstream can see: the catalog deduplicates,
//! and the styled root's order is the one a reader gets.
//!
//! **Declaring on one root only is not a fault.** Eighty-four families declare
//! on both and fourteen on the headless root alone, and there is no argument
//! for which is right that this rule could hold anybody to. What there is an
//! argument about is two roots saying different things, which nothing else can
//! see and a reader never would.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use crate::component::{Context, Finding, Report};

/// The alias sets one family's roots declare, by the tag that declared each.
type Declared = BTreeMap<String, BTreeMap<String, BTreeSet<String>>>;

pub fn run(context: &Context) -> Report {
    let mut declared: Declared = BTreeMap::new();

    for layer in &context.settings.layers {
        let source = context.root.join(&layer.source);
        let Some(value) = context.manifest(&source) else {
            continue;
        };
        for module in value
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let path = module.get("path").and_then(Value::as_str).unwrap_or("");
            let Some(family) = path.split('/').nth(1) else {
                continue;
            };
            for declaration in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                    continue;
                };
                /* The family's root, which is the element whose tag is the
                family name on that layer. A part declares no aliases and is
                not asked to: `helix-tab` is not a second opinion about what
                `Tabs` is called. */
                if tag != format!("{}{family}", layer.prefix) {
                    continue;
                }
                let aliases: BTreeSet<String> = declaration
                    .get("helix")
                    .and_then(|one| one.get("aliases"))
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect();
                if aliases.is_empty() {
                    continue;
                }
                declared
                    .entry(family.to_owned())
                    .or_default()
                    .insert(tag.to_owned(), aliases);
            }
        }
    }

    let mut findings = Vec::new();
    for (family, roots) in &declared {
        let mut sets = roots.iter();
        let Some((first_tag, first)) = sets.next() else {
            continue;
        };
        for (tag, aliases) in sets {
            if aliases == first {
                continue;
            }
            let only = |one: &BTreeSet<String>, other: &BTreeSet<String>| {
                one.difference(other)
                    .map(|word| format!("`{word}`"))
                    .collect::<Vec<String>>()
                    .join(", ")
            };
            let mut said = Vec::new();
            let ours = only(aliases, first);
            if !ours.is_empty() {
                said.push(format!("{tag} alone says {ours}"));
            }
            let theirs = only(first, aliases);
            if !theirs.is_empty() {
                said.push(format!("{first_tag} alone says {theirs}"));
            }
            findings.push(Finding {
                detail: "The catalog publishes the union of both roots, so a word only one of \
                         them declares still reaches the gallery's search and stops being \
                         anybody's decision. Declare the same list on both, or on one."
                    .to_owned(),
                file: family.clone(),
                message: format!(
                    "declares different aliases on its two roots: {}",
                    said.join("; ")
                ),
            });
        }
    }

    Report {
        checked: declared.values().map(BTreeMap::len).sum(),
        findings,
        notes: Vec::new(),
        unit: "roots declaring aliases",
    }
}
