//! Every slot a component documents is one its family renders.
//!
//! **A slot nobody declares assigns nothing, and nothing says so.** Naming a
//! slot that does not exist is not an error at runtime: the child is assigned to
//! no slot, so it is not rendered at all, and the page shows a component with a
//! piece missing rather than a page with an error on it. Measured on
//! `helix-app-header`, whose documentation named `brand` and `actions` after the
//! slots had been renamed `start` and `end`: an example followed the
//! documentation, its wordmark and its button rendered nowhere, and every check
//! in this suite passed.
//!
//! **The declaration is what this checks, not the example.** An example naming a
//! slot the docs do not have is the shallower half of the same bug and the rarer
//! one, because an example is usually written by reading the docs. When the docs
//! are wrong, a correct example is impossible: the App Header example was
//! faithful to a page that was lying.
//!
//! **Rendered names are gathered across the family, across both tiers, and
//! across core**, and each of those three was needed. A styled component almost
//! never renders its own template: it extends its headless twin and inherits it,
//! so `helix-app-header`'s slots are written in `helix/headless` and documented
//! in both places. And a field's `label`, `hint` and `feedback` are rendered by
//! `MixinField` in `helix/core`, which is not a family at all: reading only the
//! two tiers reported `Select`, `TimeInput` and `RadioGroup` for slots that are
//! rendered once and shared by twenty-odd components.
//!
//! The default slot is exempt. `@slot -` documents the unnamed slot, which every
//! component with content has and which no `<slot name>` spells.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::text::uncommented;
use crate::component::{Context, Finding, Report};

/// A `<slot>` with a written name, wherever among its attributes the name
/// sits: `<slot part="a" name="b">` and one with a listener first are as
/// rendered as one that leads with it, which this read as never rendered.
static RENDERED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"<slot\b[^>]*?\sname=["']([a-z][a-z0-9-]*)["']"#)
        .expect("a literal pattern compiles")
});

/// A slot whose name is worked out at run time rather than written down.
static COMPUTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<slot\b[^>]*?\sname=\$\{").expect("a literal pattern compiles"));

/// Every `<slot name>` written anywhere under a directory, and whether any of
/// them was assembled rather than written.
fn rendered(root: &Path) -> (BTreeSet<String>, bool) {
    let mut found = BTreeSet::new();
    let mut computed = false;
    let mut stack = vec![root.to_path_buf()];
    while let Some(at) = stack.pop() {
        let Ok(entries) = fs::read_dir(&at) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                /* `.examples` holds a consumer's markup rather than a
                component's template, so a `<slot name>` there is a consumer
                forwarding one and says nothing about what this renders. */
                if path.file_name().is_some_and(|one| one == ".examples") {
                    continue;
                }
                stack.push(path);
                continue;
            }
            /* Not a spec, whose markup is what it asserts about rather than
            what anything renders. */
            if path.extension().is_none_or(|one| one != "ts")
                || path.to_string_lossy().contains(".spec.")
            {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&path) else {
                continue;
            };
            /* Comments blanked, or a slot written in a sentence about one
            counted as rendered. */
            let source = uncommented(&raw);
            for hit in RENDERED.captures_iter(&source) {
                found.insert(hit[1].to_owned());
            }
            if COMPUTED.is_match(&source) {
                computed = true;
            }
        }
    }
    (found, computed)
}

/// What a component is, once the manifests have been read.
struct Declared {
    /// The folder its own source is in.
    family: String,
    /// The class it extends, by the name the manifest calls it.
    parent: Option<String>,
    /// The folder that class's source is in, where the reference names one.
    parent_family: Option<String>,
    slots: Vec<String>,
}

/// The family a superclass reference points at.
///
/// **Two spellings, because a manifest writes whichever it knows.** Within a
/// package it is a module path, `/src/button/root/button-root.js`; across one it
/// is a package specifier, `@fusion.dev/helix-headless/icon-button`. Both end up
/// naming the folder, which is all this needs.
fn family_of(superclass: &Value) -> Option<String> {
    if let Some(module) = superclass.get("module").and_then(Value::as_str) {
        let mut parts = module.split('/').filter(|one| !one.is_empty());
        if parts.next() == Some("src") {
            return parts.next().map(str::to_owned);
        }
    }
    superclass
        .get("package")
        .and_then(Value::as_str)
        .and_then(|one| one.rsplit('/').next())
        .filter(|one| !one.starts_with('@'))
        .map(str::to_owned)
}

/// Every tag's declared slot names, and where to look for the ones it inherits.
fn declared(context: &Context) -> BTreeMap<String, Declared> {
    let mut found = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let Some(value) = context.manifest(&tier) else {
            continue;
        };
        for module in value
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let Some(path) = module.get("path").and_then(Value::as_str) else {
                continue;
            };
            /* `src/<family>/<part>/<file>.ts`, which is the shape every
            component in this repository has. */
            let Some(family) = path.split('/').nth(1) else {
                continue;
            };
            for declaration in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                /* Keyed by class name rather than by tag, because a superclass
                is referred to by the first and half of them have no second:
                a base class nothing registers still renders the slots its
                subclasses document. */
                let Some(name) = declaration.get("name").and_then(Value::as_str) else {
                    continue;
                };
                let slots: Vec<String> = declaration
                    .get("slots")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(|one| one.get("name")?.as_str())
                    .filter(|one| !one.is_empty())
                    .map(str::to_owned)
                    .collect();
                let superclass = declaration.get("superclass");
                found.insert(
                    name.to_owned(),
                    Declared {
                        family: family.to_owned(),
                        parent: superclass
                            .and_then(|one| one.get("name"))
                            .and_then(Value::as_str)
                            .map(str::to_owned),
                        parent_family: superclass.and_then(family_of),
                        slots,
                    },
                );
            }
        }
    }
    found
}

pub fn run(context: &Context) -> Report {
    let declared = declared(context);
    let tiers: Vec<std::path::PathBuf> = context.settings.roots(&context.root);
    let mut findings = Vec::new();
    let mut checked = 0;

    /* Read once. Every field in the library shares `MixinField`'s `label`,
    `hint` and `feedback`, and re-walking core for each of ninety-odd
    components is the same answer ninety times. */
    let (shared, _) = rendered(&context.root.join("helix/core/src"));

    /* Read once per family, since both tiers of a family and every subclass of
    it ask the same question. */
    let mut per_family: BTreeMap<String, (BTreeSet<String>, bool)> = BTreeMap::new();
    let mut unreadable: BTreeSet<String> = BTreeSet::new();

    for (class, entry) in &declared {
        if entry.slots.is_empty() {
            continue;
        }
        /* **Every family up the chain, not only this one.** `IconButton` and
        `CopyButton` extend `Button` and render none of its template, so
        `start` and `end` are written in the button family and documented
        here. Reading one family reported both of them for slots that work. */
        let mut families = vec![entry.family.clone()];
        /* Walked by reference, so a chain costs no copies of its own names. */
        let mut at: Option<&String> = Some(class);
        let mut steps = 0;
        while let Some(name) = at {
            let Some(one) = declared.get(name) else {
                break;
            };
            if let Some(parent) = &one.parent_family {
                families.push(parent.clone());
            }
            /* Bounded, so a manifest describing a cycle cannot hang the check. */
            steps += 1;
            if steps > 8 {
                break;
            }
            at = one.parent.as_ref();
        }

        let mut available = shared.clone();
        let mut assembled = false;
        for family in &families {
            let known = per_family.entry(family.clone()).or_insert_with(|| {
                let mut names = BTreeSet::new();
                let mut computed = false;
                for tier in &tiers {
                    let folder = tier.join(family);
                    if folder.is_dir() {
                        let (found, any) = rendered(&folder);
                        names.extend(found);
                        computed = computed || any;
                    }
                }
                (names, computed)
            });
            available.extend(known.0.iter().cloned());
            assembled = assembled || known.1;
        }

        /* **A name assembled at run time is one this cannot read**, so the
        family is left alone and said out loud rather than reported. `Sandbox`
        writes `<slot name=${first}>` to swap which pane leads, so `preview`
        and `source` are real slots that no literal spells, and a rule
        guessing here would be loudest exactly where it understands least.
        `Carousel` records the same trade about `part=`: written out rather
        than bound, so that a check can read it. */
        if assembled {
            unreadable.insert(entry.family.clone());
            continue;
        }

        /* A family whose sources could not be read says nothing, rather than
        reporting every slot it declares. */
        if available.is_empty() {
            continue;
        }
        let tag = class;
        let family = &entry.family;
        for name in &entry.slots {
            checked += 1;
            if available.contains(name) {
                continue;
            }
            findings.push(Finding {
                detail: "A child assigned to a slot that does not exist is assigned to no slot \
                         and is not rendered, which looks like a component with a piece missing \
                         rather than an error. Rename the tag to the slot the family renders, or \
                         render the slot the tag promises."
                    .to_owned(),
                file: format!("helix/*/src/{family}"),
                message: format!(
                    "`{tag}` documents `@slot {name}` and nothing in `{family}` renders it. \
                     Rendered: {}",
                    available
                        .iter()
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<String>>()
                        .join(", ")
                ),
            });
        }
    }

    let mut notes = Vec::new();
    if !unreadable.is_empty() {
        notes.push(format!(
            "{} assembles a slot name at run time, so its slots are not checked: {}",
            if unreadable.len() == 1 {
                "one family"
            } else {
                "some families"
            },
            unreadable
                .iter()
                .map(|one| format!("`{one}`"))
                .collect::<Vec<String>>()
                .join(", ")
        ));
    }

    Report {
        checked,
        findings,
        notes,
        unit: "documented slot names checked against the ones their family renders",
    }
}
