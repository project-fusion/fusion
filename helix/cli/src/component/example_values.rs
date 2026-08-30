//! Every attribute value in an example is one its component states.
//!
//! **An unknown value is not an error at runtime.** The element keeps its
//! default and the example looks deliberate: it renders, it is screenshotted, it
//! ships on a documentation page, and the only sign that it asked for something
//! the component does not have is that the picture shows the default. A consumer
//! copying it gets the same silence.
//!
//! **The union is the authority and it is read from the manifest**, which is
//! generated from the source, so a value the component adds is available here
//! the moment the manifest is regenerated and a value it drops stops being
//! allowed at the same moment. The manifest sits beside its source, one level up
//! from the tier, which is where every package in this shape keeps it.
//!
//! **One member the reader cannot parse makes the whole union unreadable.** A
//! partial list would report every value it did not happen to parse, which is a
//! rule that fails loudest where it understands least.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::{Context, Finding, Report};

static OPENING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)([^>]*)>").expect("a literal pattern compiles")
});

static ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"([a-z][a-z0-9-]*)="([^"]*)""#).expect("a literal pattern compiles")
});

/// Every literal in a union type, or nothing where the type is not one.
fn literals(text: &str) -> Option<Vec<String>> {
    if !text.contains('\'') {
        return None;
    }
    let mut values = Vec::new();
    for part in text.split('|').map(str::trim) {
        if part == "undefined" || part == "null" {
            continue;
        }
        let quoted = part
            .strip_prefix('\'')
            .and_then(|one| one.strip_suffix('\''))
            .filter(|one| !one.contains('\''))?;
        values.push(quoted.to_owned());
    }
    (!values.is_empty()).then_some(values)
}

/// Every tag's attributes and the values each takes, read from the manifests.
fn allowed(context: &Context) -> BTreeMap<String, BTreeMap<String, Vec<String>>> {
    let mut found: BTreeMap<String, BTreeMap<String, Vec<String>>> = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let Some(manifest) = tier.parent().map(|one| one.join("custom-elements.json")) else {
            continue;
        };
        let Ok(raw) = fs::read_to_string(&manifest) else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(&raw) else {
            continue;
        };
        let modules = value.get("modules").and_then(Value::as_array);
        for declaration in modules
            .into_iter()
            .flatten()
            .filter_map(|one| one.get("declarations")?.as_array())
            .flatten()
        {
            let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                continue;
            };
            for attribute in declaration
                .get("attributes")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let (Some(name), Some(text)) = (
                    attribute.get("name").and_then(Value::as_str),
                    attribute
                        .get("type")
                        .and_then(|one| one.get("text"))
                        .and_then(Value::as_str),
                ) else {
                    continue;
                };
                let Some(values) = literals(text) else {
                    continue;
                };
                found
                    .entry(tag.to_owned())
                    .or_default()
                    .insert(name.to_owned(), values);
            }
        }
    }
    found
}

pub fn run(context: &Context) -> Report {
    let allowed = allowed(context);
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let Ok(entries) = fs::read_dir(&tier) else {
            continue;
        };
        let mut families: Vec<std::path::PathBuf> = entries
            .flatten()
            .map(|one| one.path())
            .filter(|one| one.is_dir())
            .collect();
        families.sort();
        for family in families {
            let Ok(examples) = fs::read_dir(family.join(".examples")) else {
                continue;
            };
            let mut files: Vec<std::path::PathBuf> =
                examples.flatten().map(|one| one.path()).collect();
            files.sort();
            for file in files {
                if file.extension().is_none_or(|one| one != "html") {
                    continue;
                }
                let Ok(markup) = fs::read_to_string(&file) else {
                    continue;
                };
                let where_ = file
                    .strip_prefix(&context.root)
                    .unwrap_or(&file)
                    .to_string_lossy()
                    .replace('\\', "/");
                /* Opening tags only: a closing tag carries nothing to check. */
                for tag in OPENING.captures_iter(&markup) {
                    let Some(attributes) = allowed.get(&tag[1]) else {
                        continue;
                    };
                    for pair in ATTRIBUTE.captures_iter(&tag[2]) {
                        let Some(values) = attributes.get(&pair[1]) else {
                            continue;
                        };
                        checked += 1;
                        if values.iter().any(|one| one == &pair[2]) {
                            continue;
                        }
                        findings.push(Finding {
                            detail: "An unknown value is not an error at runtime: the element \
                                     keeps its default and the example looks deliberate. Use one \
                                     the component states, or give the component the value the \
                                     example wants."
                                .to_owned(),
                            file: where_.clone(),
                            message: format!(
                                "`<{} {}=\"{}\">` is not one of {}",
                                &tag[1],
                                &pair[1],
                                &pair[2],
                                values
                                    .iter()
                                    .map(|one| format!("`{one}`"))
                                    .collect::<Vec<String>>()
                                    .join(", ")
                            ),
                        });
                    }
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "attribute values across the examples",
    }
}
