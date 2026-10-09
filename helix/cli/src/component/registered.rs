//! A component built on a headless one registers everything it renders, under
//! its own prefix.
//!
//! **The failure the headless-tier guide opens with.** A headless component
//! renders other families with an interpolated tag, `acme-listbox` for a class
//! whose `tier` is `acme-`, and nothing registers that tag for you. Register
//! `acme-combobox` without `acme-listbox` and the panel renders an undefined
//! element: an inert inline box, no error, and a combobox that seems not to
//! open. A subclass that never sets `tier` renders `helix-headless-` children
//! inside its own element, which is the second shape of the same mistake.
//!
//! **What a headless family renders is read from its manifest**, the
//! `helix.renders` the headless tier publishes, and followed through each child
//! in turn: Combobox renders Listbox, and Listbox renders Option. The tags a
//! project registers are read from its own sources, an `@customElement` or a
//! `customElements.define` with a literal name.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::{sources, Context, Finding, Report};

/// A class extending a headless one: its name and the base's.
static EXTENDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^export class (\w+) extends (HelixHeadless\w+)\b")
        .expect("a literal pattern compiles")
});

/// The prefix a class sets for the children it renders.
static TIER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static\s+(?:override\s+)?tier\s*=\s*'([^']*)'")
        .expect("a literal pattern compiles")
});

/// A tag registered by name.
static DEFINED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?:@customElement\(\s*|customElements\.define\(\s*)['"]([a-z][a-z0-9]*-[a-z0-9-]+)['"]"#,
    )
    .expect("a literal pattern compiles")
});

/// The headless manifest, from the project's `node_modules` up.
fn manifest(root: &Path) -> Option<Value> {
    root.ancestors()
        .map(|dir| dir.join("node_modules/@fusion.dev/helix-headless/custom-elements.json"))
        .find(|path| path.is_file())
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
}

/// What each headless class renders, and what each family renders, which is
/// the union of its classes.
fn graph(
    manifest: &Value,
) -> (
    BTreeMap<String, BTreeSet<String>>,
    BTreeMap<String, BTreeSet<String>>,
) {
    let mut by_class: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut renders: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for module in manifest["modules"].as_array().into_iter().flatten() {
        let Some(family) = module["path"]
            .as_str()
            .and_then(|path| path.strip_prefix("src/"))
            .and_then(|rest| rest.split('/').next())
        else {
            continue;
        };
        for declaration in module["declarations"].as_array().into_iter().flatten() {
            let name = declaration["name"].as_str().unwrap_or_default().to_owned();
            let own = by_class.entry(name).or_default();
            for child in declaration["helix"]["renders"]
                .as_array()
                .into_iter()
                .flatten()
            {
                if let Some(child) = child.as_str() {
                    own.insert(child.to_owned());
                    renders
                        .entry(family.to_owned())
                        .or_default()
                        .insert(child.to_owned());
                }
            }
        }
    }
    (by_class, renders)
}

/// What a class renders, and everything those families render in turn.
fn closure(
    direct: &BTreeSet<String>,
    renders: &BTreeMap<String, BTreeSet<String>>,
) -> BTreeSet<String> {
    let mut found: BTreeSet<String> = direct.clone();
    let mut next: Vec<&str> = direct.iter().map(String::as_str).collect();
    while let Some(one) = next.pop() {
        for child in renders.get(one).into_iter().flatten() {
            if found.insert(child.clone()) {
                next.push(child);
            }
        }
    }
    found
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    let unit = "components built on a headless one";

    let Some(manifest) = manifest(&context.root) else {
        return Report {
            checked,
            findings,
            notes: vec!["no @fusion.dev/helix-headless manifest in node_modules, so what a headless component renders is unknown".to_owned()],
            unit,
        };
    };
    let (by_class, renders) = graph(&manifest);

    let mut files = Vec::new();
    for tier in context.settings.roots(&context.root) {
        sources(&tier, &mut files);
    }
    let texts: Vec<(String, String)> = files
        .iter()
        .filter_map(|file| Some((context.relative(file), fs::read_to_string(file).ok()?)))
        .collect();
    let defined: BTreeSet<String> = texts
        .iter()
        .flat_map(|(_, text)| DEFINED.captures_iter(text).map(|found| found[1].to_owned()))
        .collect();

    for (where_, text) in &texts {
        for found in EXTENDS.captures_iter(text) {
            let (class, base) = (&found[1], &found[2]);
            /* The headless tier's own subclasses keep its prefix on purpose. */
            if class.starts_with("HelixHeadless") {
                continue;
            }
            let Some(direct) = by_class.get(base) else {
                continue;
            };
            let children = closure(direct, &renders);
            if children.is_empty() {
                continue;
            }
            checked += 1;
            let line = text[..found.get(0).map_or(0, |one| one.start())]
                .lines()
                .count()
                + 1;
            let Some(prefix) = TIER.captures(text).map(|one| one[1].to_owned()) else {
                findings.push(Finding {
                    detail: format!(
                        "{base} renders {} with the prefix its class sets, and {class} sets none, so it renders `helix-headless-` children inside your element. Add `static override tier = 'your-'` and register each child under that prefix.",
                        listed(&children)
                    ),
                    file: format!("{where_}:{line}"),
                    message: format!("{class} renders children and sets no `tier`"),
                });
                continue;
            };
            for child in &children {
                let tag = format!("{prefix}{child}");
                if defined.contains(&tag) {
                    continue;
                }
                findings.push(Finding {
                    detail: format!(
                        "{base} renders `<{tag}>` with the prefix {class} sets, and an unregistered custom element is an inert inline box with no error. Subclass the headless {child} and register it as `{tag}`."
                    ),
                    file: format!("{where_}:{line}"),
                    message: format!("{class} renders `<{tag}>`, which nothing in the project registers"),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit,
    }
}

fn listed(children: &BTreeSet<String>) -> String {
    children
        .iter()
        .map(|child| format!("`{child}`"))
        .collect::<Vec<_>>()
        .join(", ")
}
