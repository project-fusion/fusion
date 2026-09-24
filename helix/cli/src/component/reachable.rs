//! Every attribute a stylesheet selects on can be reached from a property, on a
//! host and on an element it slots.
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
//! **A `::slotted()` rule keyed on an attribute is the same fault one element
//! over.** Data Table gives a sortable heading its pointer through
//! `::slotted(helix-table-column[sortable])`, and while this read `:host()`
//! alone it never asked whether `sortable` reflected: it did not, and every
//! column React made sortable went without. The attribute belongs to the family
//! that registers the tag, whichever family's sheet wrote the selector, and a
//! slotted selector naming no tag of ours is keyed on a consumer's element.
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

use crate::component::text::COMMENT;
use crate::component::{decorator, family, sources, stylesheets, Context, Finding, Report};

/// Written by the component itself or by the platform, not by a property.
static NOT_A_PROPERTY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^(data-|aria-|role$|slot$|hidden$|inert$|popover$|dir$|lang$|part$|id$|class$|style$)",
    )
    .expect("a literal pattern compiles")
});

/// A `:host(...)` selector, tolerating one level of nested parens inside it.
static HOST: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r":host\(([^)]*(?:\([^)]*\)[^)]*)*)\)").expect("a literal pattern compiles")
});

/// A `::slotted(...)` selector, tolerating one level of nested parens inside it.
static SLOTTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"::slotted\(([^)]*(?:\([^)]*\)[^)]*)*)\)").expect("a literal pattern compiles")
});

/// The custom element a compound selector opens with, when it opens with one.
static TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*([a-z][a-z0-9]*(?:-[a-z0-9]+)+)").expect("a literal pattern compiles")
});

/// The tag a source file registers.
static ELEMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"@customElement\(\s*['"]([a-z][a-z0-9-]*)['"]\s*\)"#)
        .expect("a literal pattern compiles")
});

/// An attribute name opening a bracket inside a selector.
static ATTRIBUTE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[\s*([a-zA-Z][\w-]*)").expect("a literal pattern compiles"));

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

/// The attribute names inside one selector's parentheses that a property could set.
fn attributes(inside: &str) -> impl Iterator<Item = &str> {
    ATTRIBUTE
        .captures_iter(inside)
        .filter_map(|found| found.get(1).map(|one| one.as_str()))
        .filter(|name| !NOT_A_PROPERTY.is_match(name))
}

/// Family to the attribute names its stylesheets key on.
type Selected = BTreeMap<String, BTreeSet<String>>;

/// Each tag and attribute a `::slotted()` keys on.
type Slotted = Vec<(String, String)>;

/// What the stylesheets select on: the attributes keyed on each family's hosts,
/// and every tag and attribute a `::slotted()` keys on, whose family is the
/// tag's and is known only once the sources have been read.
fn selected_on(tiers: &[std::path::PathBuf]) -> (Selected, Slotted) {
    let mut selected = Selected::new();
    let mut slotted = Vec::new();
    for tier in tiers {
        let mut sheets = Vec::new();
        stylesheets(tier, &mut sheets);
        for sheet in sheets {
            let (Some(family), Ok(raw)) = (family(&sheet, tier), fs::read_to_string(&sheet)) else {
                continue;
            };
            let text = COMMENT.replace_all(&raw, "");
            for host in HOST.captures_iter(&text) {
                for name in attributes(host.get(1).map_or("", |one| one.as_str())) {
                    selected
                        .entry(family.to_owned())
                        .or_default()
                        .insert(name.to_owned());
                }
            }
            for one in SLOTTED.captures_iter(&text) {
                let inside = one.get(1).map_or("", |two| two.as_str());
                let Some(tag) = TAG.captures(inside).and_then(|two| two.get(1)) else {
                    continue;
                };
                for name in attributes(inside) {
                    slotted.push((tag.as_str().to_owned(), name.to_owned()));
                }
            }
        }
    }
    (selected, slotted)
}

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);
    let (mut selected, slotted) = selected_on(&tiers);

    /* Declared: every tier, since a styled sheet routinely selects on something
    the headless base declares. */
    let mut declared: BTreeMap<String, BTreeMap<String, Declared>> = BTreeMap::new();
    let mut tags: BTreeMap<String, String> = BTreeMap::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let (Some(family), Ok(text)) = (family(&file, tier), fs::read_to_string(&file)) else {
                continue;
            };
            for one in ELEMENT.captures_iter(&text) {
                tags.insert(one[1].to_owned(), family.to_owned());
            }
            let where_ = context.relative(&file);
            for capture in DECLARATION.captures_iter(&text) {
                let options = capture.get(1).map_or("", |one| one.as_str());
                let name = capture.get(2).map_or("", |one| one.as_str());
                if decorator::unattributed(options) {
                    continue;
                }
                let attribute =
                    decorator::attribute(options).unwrap_or_else(|| name.to_lowercase());
                let held = declared.entry(family.to_owned()).or_default();
                /* A getter and a setter are two matches for one property, so
                either of them carrying `reflect` settles it. */
                let reflects = held.get(&attribute).is_some_and(|one| one.reflect)
                    || decorator::reflects(options);
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

    /* A slotted element belongs to the family that registers its tag, whichever
    family's sheet selects on it. A tag nobody here registers is a consumer's
    element, and its attributes are the consumer's to write. */
    for (tag, name) in slotted {
        if let Some(family) = tags.get(&tag) {
            selected.entry(family.clone()).or_default().insert(name);
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
                detail:
                    "Add `reflect: true`. If the property carries a default other than `false`, \
                         make it optional first, or `reflected` will refuse it: a reflected \
                         property takes no default."
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
        notes: Vec::new(),
        unit: "attribute rules on a host or a slotted element",
    }
}
