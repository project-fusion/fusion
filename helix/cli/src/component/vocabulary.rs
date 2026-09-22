//! One spelling for each role a part name or a slot name can play.
//!
//! **A part name is the most coupled door a consumer goes through**, and it is
//! the last one they are told to try. Twenty vocabularies for twenty components
//! is what makes it a last resort rather than a structure. Counted across two
//! tiers when this was written, 204 part names served 92 families and nine of
//! those words meant "the box in the middle": `surface` in five families,
//! `content` in eleven, `panel` in three, `container` in two, `box` in two,
//! `viewport` in two, and one each for `body` and `wrapper`. One family used
//! both `panel` and `content`; another used both `content` and `container`.
//!
//! **Only the generic words are registered, and that is the whole design.** A
//! `thumb`, a `terminus`, a `swatch` or a `weekday` names a thing that component
//! actually has, and no registry should have an opinion about it. What drifts is
//! the words naming a *position* rather than a thing, because every component
//! has a box in the middle and nothing tells the next one what to call it.
//!
//! **The registry ships with the rule and the exceptions do not.** A consumer
//! extending Helix inherits Helix's vocabulary, which is the point: their
//! `wrapper` is as confusing as ours was. What their own components render
//! outside it is theirs, so `unresolved` is configuration, and an entry nothing
//! renders any more is reported so it gets deleted rather than kept.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::text::{flattened, uncommented};
use crate::component::{sources, Context, Finding, Report};

/// The registered words, each with the one question it answers.
const ROLES: [(&str, &str); 6] = [
    ("box", "the drawn control, where the host is not it"),
    ("container", "an element's own outer box"),
    ("content", "a region the consumer fills"),
    (
        "panel",
        "a region switched between, or a sheet anchored to an edge",
    ),
    ("surface", "a floating panel drawn over the page"),
    (
        "viewport",
        "a scrollport the component reads the position of",
    ),
];

/// Spellings a registered word already covers, each naming its replacement.
///
/// **A permanent deny-list, not a queue.** The point of recording that `wrapper`
/// means `container` is that the next person reaching for it is stopped, rather
/// than told the entry is stale once nothing renders it.
const REFUSED: [(&str, &str); 1] = [("wrapper", "container")];

/// The slot names that name a position, each with the one thing it means.
///
/// **The same design as the part names, for the other door a consumer goes
/// through.** A slot is where content lands, and every component has a leading
/// edge and a heading somewhere, so the words for those drift the way part
/// names did while a `poster`, a `composer` or a `swatch` names what that
/// component has. Measured across both tiers on 22 Sep 2026: these eleven were
/// already one word each in every family using them, and the heading was two.
///
/// **`heading` and `header` are two things, and both are registered.** A
/// header is a region, holding a heading and whatever sits beside it, which is
/// what Card, Chat, Dialog, Drawer and Notifications publish; Dialog's says it
/// in as many words. A heading is the heading alone, which is all Callout and
/// Empty have. A component with a heading and nothing beside it takes
/// `heading`, and one that grows an action beside it grows a `header`.
const SLOT_ROLES: [(&str, &str); 11] = [
    (
        "actions",
        "what a reader can do about the component, one control or several",
    ),
    ("end", "content at the trailing edge"),
    ("feedback", "what a field says about its value"),
    ("footer", "a region closing the component"),
    (
        "header",
        "a region opening the component: its heading, and anything beside it",
    ),
    ("heading", "the component's heading, alone"),
    ("hint", "what a field says before it is used"),
    ("icon", "the component's glyph"),
    ("label", "the component's name, where it is more than text"),
    ("start", "content at the leading edge"),
    ("toolbar", "a bar of controls above what they act on"),
];

/// Slot names a registered word already covers, each naming its replacement.
///
/// **`title` is `heading`.** Callout published `title` for "a heading above the
/// content" while Empty published `heading` for the same thing, one question
/// answered in two words. `heading` survived because it names what the element
/// is, where `title` is also the attribute every element has, whose tooltip a
/// reader of `slot="title"` could fairly expect.
const SLOT_REFUSED: [(&str, &str); 1] = [("title", "heading")];

/// Every slot a component documents, with the file that documents it.
fn slots(context: &Context) -> Vec<(String, String)> {
    let mut found = Vec::new();
    for tier in context.settings.roots(&context.root) {
        let Some(manifest) = context.manifest(&tier) else {
            continue;
        };
        let package = tier.parent().unwrap_or(tier.as_path());
        for module in manifest
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let path = module
                .get("path")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let file = context.relative(&package.join(path));
            for declaration in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                for slot in declaration
                    .get("slots")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    /* Inherited entries are the base's declaration, reported
                    once where it is written rather than on every subclass. */
                    if slot.get("inheritedFrom").is_some() {
                        continue;
                    }
                    let name = slot.get("name").and_then(Value::as_str).unwrap_or_default();
                    if !name.is_empty() {
                        found.push((name.to_owned(), file.clone()));
                    }
                }
            }
        }
    }
    found
}

static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"part="([a-z0-9 -]+)""#).expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    let roles: BTreeMap<&str, &str> = ROLES.into_iter().collect();
    let refused: BTreeMap<&str, &str> = REFUSED.into_iter().collect();
    let mut findings = Vec::new();
    let mut seen: BTreeMap<String, String> = BTreeMap::new();

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let code = flattened(&uncommented(&raw));
            let where_ = context.relative(&file);

            for found in PART.captures_iter(&code) {
                let whole = found.get(0).expect("group zero always matches");
                /* `[part="x"]` is a selector reaching for a name, not a
                declaration of one, and the rule is about what is rendered. */
                if code[..whole.start()].ends_with('[') {
                    continue;
                }
                let line = code[..whole.start()].matches('\n').count() + 1;
                for word in found[1].split_whitespace() {
                    seen.entry(word.to_owned())
                        .or_insert_with(|| format!("{where_}:{line}"));
                    let Some(instead) = refused.get(word) else {
                        continue;
                    };
                    findings.push(Finding {
                        detail: format!(
                            "One spelling per role, or a consumer styling twenty components \
                             learns twenty vocabularies. `{instead}` is the registered word for \
                             {}.",
                            roles.get(instead).unwrap_or(instead)
                        ),
                        file: format!("{where_}:{line}"),
                        message: format!("renders `part=\"{word}\"`"),
                    });
                }
            }
        }
    }

    /* The slot names, against their own registry. What a component documents
    rather than what it renders, `slots` holding the two to one another. */
    let slot_roles: BTreeMap<&str, &str> = SLOT_ROLES.into_iter().collect();
    let slot_refused: BTreeMap<&str, &str> = SLOT_REFUSED.into_iter().collect();
    let mut slots_seen: BTreeSet<String> = BTreeSet::new();
    for (word, file) in slots(context) {
        slots_seen.insert(word.clone());
        let Some(instead) = slot_refused.get(word.as_str()) else {
            continue;
        };
        findings.push(Finding {
            detail: format!(
                "One spelling per role, or a consumer filling twenty components learns twenty \
                 vocabularies. `{instead}` is the registered word for {}.",
                slot_roles.get(instead).unwrap_or(instead)
            ),
            file,
            message: format!("documents `slot=\"{word}\"`"),
        });
    }

    /* An entry nothing renders is a note about a fix that already happened. */
    for (word, note) in &context.settings.unresolved {
        if seen.contains_key(word) {
            continue;
        }
        findings.push(Finding {
            detail: note.clone(),
            file: context.settings.source.clone(),
            message: format!("`{word}` is listed as unresolved and nothing renders it any more"),
        });
    }

    Report {
        checked: ROLES
            .iter()
            .filter(|(word, _)| seen.contains_key(*word))
            .count()
            + SLOT_ROLES
                .iter()
                .filter(|(word, _)| slots_seen.contains(*word))
                .count(),
        findings,
        notes: Vec::new(),
        unit: "registered part and slot words in use",
    }
}
