//! A document rule selects a component only by an attribute it reflects.
//!
//! **The reflection rule read from the consumer's side.** The library says
//! reflect only what CSS selects on, which decides what a component publishes.
//! Nothing says the reverse to whoever writes the CSS, so a document rule can
//! reach for an attribute a component never promised, and it fails in exactly
//! one navigation mode.
//!
//! **The failure this exists for.** A theme builder routed two colored slider
//! tracks with `.themeChannel[label="Saturation"]`. A `label` attribute is only
//! in the DOM when a *server* wrote the element into HTML: on a client-side
//! navigation React creates the element and assigns `label` as a property, Lit
//! does not reflect it, and the selector matches nothing. Measured on the
//! running site, soft navigation against reload: ten sliders, every label empty
//! on the first and every one present on the second. A reload of the same page
//! shows them, which is what makes this survive every screenshot anybody takes.
//!
//! **The line is whether the component declares the property**, not whether the
//! attribute is unusual. React sets a value as a property when one exists on the
//! element and as an attribute when it does not, so there are three cases:
//! declared and reflecting, where Lit writes the attribute back whichever way it
//! was set; declared and not reflecting, where the attribute exists solely in
//! server-rendered markup, **this is the bug**; and not declared at all, where
//! React has nowhere to put it but an attribute.
//!
//! **The globals are exempt for the right reason.** Each *is* a property on
//! `HTMLElement`, so React assigns it the same way it assigns `label`; what
//! makes it safe is that HTML defines it as a reflected IDL attribute, so
//! writing the property writes the attribute with no help from Lit. `data-` and
//! `aria-` are exempt for the other reason: they are not properties at all.
//!
//! **Which components a rule reaches is read from the markup**, not guessed from
//! the selector, because a rule may name a class rather than a tag, which is
//! exactly what the failing one did. A stylesheet reaches its own subtree, which
//! is what a colocated layout means; a selector naming a tag outright is held to
//! that tag instead, which is stricter and needs no guess about reach.
//!
//! **One rule is one finding.** A selector reaches every component in its
//! subtree that carries the attribute, and reporting each pair separately turned
//! a single broken rule into thirty-four lines saying the same thing.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::text::uncommented;
use crate::component::{walk_outside, Context, Finding, Report};

/// Attributes the platform reflects itself, whoever writes them.
const ALWAYS_WRITTEN: [&str; 11] = [
    "class", "dir", "hidden", "id", "lang", "part", "role", "slot", "style", "tabindex", "title",
];

/// An attribute selector, with whatever compound it sits in.
static SELECTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([^\s{}();,]*)\[\s*([a-zA-Z][\w-]*)\s*[~^|$*]?=?[^\]]*\]")
        .expect("a literal pattern compiles")
});

static ELEMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)((?:\s+[^>]*)?)>")
        .expect("a literal pattern compiles")
});

static WRITES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:^|\s)([a-zA-Z][\w-]*)\s*=").expect("a literal pattern compiles")
});

static A_TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$").expect("a literal pattern compiles")
});

/// Where an attribute is selected on, or written onto a component.
struct At {
    tag: Option<String>,
    where_: String,
    within: String,
}

/// What each tag declares as an attribute, and whether it reflects it.
fn declared(context: &Context) -> BTreeMap<String, BTreeMap<String, bool>> {
    let mut found: BTreeMap<String, BTreeMap<String, bool>> = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let Some(value) = context.manifest(&tier) else {
            continue;
        };
        for declaration in value
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|one| one.get("declarations")?.as_array())
            .flatten()
        {
            let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                continue;
            };
            let members = found.entry(tag.to_owned()).or_default();
            for member in declaration
                .get("members")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(attribute) = member.get("attribute").and_then(Value::as_str) else {
                    continue;
                };
                members.insert(
                    attribute.to_owned(),
                    member.get("reflects").and_then(Value::as_bool) == Some(true),
                );
            }
        }
    }
    found
}

/// The directory a path sits in, which is how far a stylesheet reaches.
fn within(path: &str) -> String {
    path.rsplit_once('/')
        .map_or(String::new(), |(head, _)| head.to_owned())
}

/// What every document rule selects on, and what the markup beside it writes.
type Sides = (BTreeMap<String, Vec<At>>, BTreeMap<String, Vec<At>>);

fn sides(context: &Context, declared: &BTreeMap<String, BTreeMap<String, bool>>) -> Sides {
    let mut selected: BTreeMap<String, Vec<At>> = BTreeMap::new();
    let mut written: BTreeMap<String, Vec<At>> = BTreeMap::new();

    for root in &context.settings.documents {
        let mut files = Vec::new();
        walk_outside(&context.root.join(root), &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);
            let extension = file
                .extension()
                .map(|one| one.to_string_lossy().to_string())
                .unwrap_or_default();

            if extension == "css" {
                /* Attribute selectors only: a bare `[foo]` and `[foo="bar"]`
                fail the same way. */
                let source = uncommented(&raw);
                for found in SELECTS.captures_iter(&source) {
                    let name = found[2].to_lowercase();
                    if name.starts_with("data-")
                        || name.starts_with("aria-")
                        || ALWAYS_WRITTEN.contains(&name.as_str())
                    {
                        continue;
                    }
                    let compound = found[1].to_owned();
                    selected.entry(name).or_default().push(At {
                        /* A rule naming a tag is held to that tag; one naming a
                        class is held to its neighbourhood. */
                        tag: A_TAG.is_match(&compound).then_some(compound),
                        where_: where_.clone(),
                        within: within(&where_),
                    });
                }
                continue;
            }

            if extension != "tsx" && extension != "html" {
                continue;
            }
            for element in ELEMENT.captures_iter(&raw) {
                let tag = element[1].to_owned();
                if !declared.contains_key(&tag) {
                    continue;
                }
                for attribute in WRITES.captures_iter(&element[2]) {
                    written
                        .entry(attribute[1].to_lowercase())
                        .or_default()
                        .push(At {
                            tag: Some(tag.clone()),
                            where_: where_.clone(),
                            within: within(&where_),
                        });
                }
            }
        }
    }

    (selected, written)
}

pub fn run(context: &Context) -> Report {
    let declared = declared(context);
    let (selected, written) = sides(context, &declared);

    /* One rule is one finding, so the pairs are gathered before any is said. */
    let mut unmatched: BTreeMap<(String, String), BTreeSet<String>> = BTreeMap::new();
    for (name, rules) in &selected {
        for rule in rules {
            for element in written.get(name).into_iter().flatten() {
                let Some(tag) = element.tag.as_ref() else {
                    continue;
                };
                let reaches = rule.tag.as_ref().map_or_else(
                    || element.within.starts_with(&rule.within),
                    |one| one == tag,
                );
                if !reaches
                    || context
                        .settings
                        .accepted
                        .contains_key(&format!("{tag}[{name}]"))
                {
                    continue;
                }
                /* Declared and reflecting is fine; not declared at all is fine,
                React having nowhere to put it but an attribute. */
                if declared.get(tag).and_then(|one| one.get(name)) != Some(&false) {
                    continue;
                }
                unmatched
                    .entry((rule.where_.clone(), name.clone()))
                    .or_default()
                    .insert(tag.clone());
            }
        }
    }

    let mut findings: Vec<Finding> = unmatched
        .into_iter()
        .map(|((where_, name), tags)| {
            let named: Vec<String> = tags.iter().take(3).map(|one| format!("<{one}>")).collect();
            let rest = if tags.len() > 3 {
                format!(" and {} more", tags.len() - 3)
            } else {
                String::new()
            };
            Finding {
                detail: "React assigns a declared property as a property, so the attribute is in \
                         the DOM only when a server rendered the element: the rule matches after a \
                         reload and matches nothing after a client-side navigation. Reflect the \
                         property, or style it some way that does not read an attribute."
                    .to_owned(),
                file: where_,
                message: format!(
                    "selects on `[{name}]` and reaches {}{rest}, which declare `{name}` as a \
                     property and do not reflect it",
                    named.join(", ")
                ),
            }
        })
        .collect();

    /* An exemption nothing writes any more is a line the next reader has to
    check, which is the same argument every allowlist here makes. */
    for key in context.settings.accepted.keys() {
        let Some((tag, name)) = key
            .strip_suffix(']')
            .and_then(|one| one.split_once('['))
            .filter(|(tag, _)| declared.contains_key(*tag))
        else {
            continue;
        };
        let lives = written
            .get(name)
            .into_iter()
            .flatten()
            .any(|one| one.tag.as_deref() == Some(tag));
        if lives {
            continue;
        }
        findings.push(Finding {
            detail: "The honest fix is to reflect the property or to stop selecting on it, so an \
                     entry here is a claim that server-rendered markup is the only path that \
                     matters for one rule."
                .to_owned(),
            file: context.settings.source.clone(),
            message: format!("`{key}` is accepted and nothing writes it any more"),
        });
    }

    Report {
        checked: selected.len(),
        findings,
        notes: Vec::new(),
        unit: "attributes selected by document rules",
    }
}
