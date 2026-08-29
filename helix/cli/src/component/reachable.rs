//! Every attribute a stylesheet selects on the host can be reached from a property.
//!
//! **The direction the reflection rules do not ask about.** `reflected` bans a
//! default on a property that reflects; it looks at properties that already do.
//! Neither it nor its siblings notice a property that *should* reflect and does
//! not, which is the half the rule states first: reflection exists so a selector
//! can reach a value.
//!
//! A rule keyed on `:host([x])` where `x` does not reflect works for whoever
//! wrote the attribute in markup and silently does nothing for anybody setting
//! the property. That is every script, and it is every React consumer by
//! default, React assigning a matching property rather than an attribute. The
//! four this found in Helix had each drifted after the selector was written, and
//! three of them were invisible to reading: a group whose overflow count claimed
//! avatars were hidden while every one drew full size, a trail losing 8px per
//! crumb at once, a gutter reserved for a button that had gone away.
//!
//! **What is not asked about.** A `data-` name is the library's own answer to
//! this problem, written by the component rather than by a property, and
//! `aria-`, `role`, `slot`, `hidden`, `inert` and `popover` belong to the
//! platform. An attribute with no property of that name is an author's to write
//! and nothing else can set it, which is a different shape and not this fault.
//!
//! **The converter case this cannot reach.** A same-named attribute whose
//! property carries `type: Number` or a `converter` has a second version of the
//! problem: React assigns the property verbatim, so the converter never runs and
//! `split="35"` arrives as a string. That is a fault in the example rather than
//! in the component, and rendering both syntaxes is what holds it.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{family, sources, stylesheets, Context, Finding, Report};

/// Written by the component itself or by the platform, not by a property.
static NOT_A_PROPERTY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^(data-|aria-|role$|slot$|hidden$|inert$|popover$|dir$|lang$|part$|id$|class$|style$)",
    )
    .expect("a literal pattern compiles")
});

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// A `:host(...)` selector, tolerating one level of nested parens inside it.
static HOST: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r":host\(([^)]*(?:\([^)]*\)[^)]*)*)\)").expect("a literal pattern compiles")
});

/// An attribute name opening a bracket inside a selector.
static ATTRIBUTE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[\s*([a-zA-Z][\w-]*)").expect("a literal pattern compiles"));

/// The attribute a declaration names, when it names one.
static DECLARED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"attribute:\s*'([^']+)'").expect("a literal pattern compiles"));

/// A property declaration, its options and the member it sits on.
static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"@property\(\s*(?:\{([^}]*)\})?\s*\)\s*(?:\n\s*)*(?:(?:get|set|override|declare|readonly)\s+)*([A-Za-z_$][\w$]*)",
    )
    .expect("a literal pattern compiles")
});

/// What a family declares under one attribute name.
struct Declared {
    file: String,
    name: String,
    reflect: bool,
}

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);

    /* Selected on: family to the attribute names its stylesheets key on. */
    let mut selected: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for tier in &tiers {
        let mut sheets = Vec::new();
        stylesheets(tier, &mut sheets);
        for sheet in sheets {
            let (Some(family), Ok(raw)) = (family(&sheet, tier), fs::read_to_string(&sheet)) else {
                continue;
            };
            let text = COMMENT.replace_all(&raw, "");
            for host in HOST.captures_iter(&text) {
                let inside = host.get(1).map_or("", |one| one.as_str());
                for found in ATTRIBUTE.captures_iter(inside) {
                    let name = found.get(1).map_or("", |one| one.as_str());
                    if NOT_A_PROPERTY.is_match(name) {
                        continue;
                    }
                    selected
                        .entry(family.to_owned())
                        .or_default()
                        .insert(name.to_owned());
                }
            }
        }
    }

    /* Declared: every tier, since a styled sheet routinely selects on something
    the headless base declares. */
    let mut declared: BTreeMap<String, BTreeMap<String, Declared>> = BTreeMap::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let (Some(family), Ok(text)) = (family(&file, tier), fs::read_to_string(&file)) else {
                continue;
            };
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");
            for capture in DECLARATION.captures_iter(&text) {
                let options = capture.get(1).map_or("", |one| one.as_str());
                let name = capture.get(2).map_or("", |one| one.as_str());
                if options.contains("attribute: false") {
                    continue;
                }
                let attribute = DECLARED
                    .captures(options)
                    .and_then(|one| one.get(1))
                    .map_or_else(|| name.to_lowercase(), |one| one.as_str().to_owned());
                let held = declared.entry(family.to_owned()).or_default();
                /* A getter and a setter are two matches for one property, so
                either of them carrying `reflect` settles it. */
                let reflects = held.get(&attribute).is_some_and(|one| one.reflect)
                    || options.contains("reflect: true");
                held.insert(
                    attribute,
                    Declared {
                        file: where_.clone(),
                        name: name.to_owned(),
                        reflect: reflects,
                    },
                );
            }
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for (family, attributes) in &selected {
        for attribute in attributes {
            /* No property of that name is an attribute the author writes and
            nothing else can set, which is a different shape and not this
            fault. */
            let Some(property) = declared.get(family).and_then(|one| one.get(attribute)) else {
                continue;
            };
            checked += 1;
            if property.reflect {
                continue;
            }
            findings.push(Finding {
                detail: "Add `reflect: true`. If the property carries a default, make it optional \
                         first, or `reflected` will refuse it: a reflected property takes no \
                         default."
                    .to_owned(),
                file: property.file.clone(),
                message: format!(
                    "{family}: `{attribute}` is selected on by CSS, and `{}` does not reflect",
                    property.name
                ),
            });
        }
    }

    Report {
        checked,
        findings,
        unit: "host-attribute rules",
    }
}
