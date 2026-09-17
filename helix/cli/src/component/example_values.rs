//! Every attribute an example writes is one its component has.
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
//!
//! **Both syntaxes, because the pair is authored twice.** `examples-paired`
//! asks every example for an HTML half and a React half and compares neither to
//! the other, which is the decision that makes the React half a second place a
//! wrong value can live. Reading only the HTML left the two halves judged to
//! different standards while the rule reported a number covering both. The
//! attribute pattern is anchored on the separator for the same reason: JSX
//! carries `className` and `columnName` on a custom element, and an unanchored
//! one reads the tail of either as an attribute called `ame`.
//!
//! **Markup an example quotes is markup a consumer copies.** A code block holds
//! its sample in the text it renders and a source pane takes its document as an
//! attribute, and both escape it, so a rule reading the file as markup sees a
//! string rather than an element. Two of the worst faults this rule exists to
//! catch were written that way and it read past both.
//!
//! **What is decoded is the fragment and never the file.** A source pane spells
//! its own quotes `&quot;`, so freeing them across the whole file ends the
//! pane's attribute early and hands the sample's attributes to the pane, which
//! reports `<helix-sandbox-source tone="primary">` and no such element exists.
//! The text between tags and each attribute value are decoded separately and
//! read as documents of their own.
//!
//! **An undeclared attribute name is judged only where the library owns the
//! word.** A name a component does not declare is dropped at parse time as
//! silently as a wrong value is, and the four things it can be do not want the
//! same answer: `appearance` is the axis the library refused, a registered axis
//! the element does not carry is an example promising a knob that is not there,
//! and a `data-` hook or a framework prop is a consumer's business and no list
//! here could say which names are theirs to use. So the vocabulary `axes`
//! registers is the whole of what is read, and everything outside it is left
//! alone rather than guessed at. A typo of a component's own attribute is out of
//! reach and stays there: telling `lable` from a hook needs a spell-checker over
//! names nobody registered, and a rule that guessed would report noise on the
//! examples worth authoring.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::axes::{AXES, REFUSED};
use crate::component::{Context, Finding, Report};

static OPENING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)([^>]*)>").expect("a literal pattern compiles")
});

/// An attribute, anchored on what separates it from the name before it.
static ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:^|[\s/])([a-z][a-z0-9-]*)="([^"]*)""#).expect("a literal pattern compiles")
});

/// Anything in angle brackets, to leave the text an example renders.
static ELEMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<[^>]*>").expect("a literal pattern compiles"));

/// The character references that can carry markup.
///
/// A reference this does not know is left as it was written, because the
/// decoding here exists to find elements and nothing but these five and a
/// numeric one can open a tag, close it, or quote an attribute. `&mdash;` in a
/// caption is text either way.
const NAMED: [(&str, char); 5] = [
    ("amp", '&'),
    ("apos", '\''),
    ("gt", '>'),
    ("lt", '<'),
    ("quot", '"'),
];

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

/// A numeric character reference, decimal or hexadecimal.
fn numeric(body: &str) -> Option<char> {
    let digits = body.strip_prefix('#')?;
    let code = match digits.strip_prefix(['X', 'x']) {
        Some(hex) => u32::from_str_radix(hex, 16).ok()?,
        None => digits.parse().ok()?,
    };
    char::from_u32(code)
}

/// One pass over the character references, left to right.
///
/// One pass rather than a replacement per name, because a replacement per name
/// resolves `&amp;lt;` to `<` and the author wrote `&lt;`.
fn decoded(text: &str) -> String {
    if !text.contains('&') {
        return text.to_owned();
    }
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find('&') {
        out.push_str(&rest[..at]);
        rest = &rest[at..];
        let resolved = rest[1..].split_once(';').and_then(|(body, _)| {
            let one = NAMED
                .iter()
                .find(|(name, _)| *name == body)
                .map(|(_, one)| *one)
                .or_else(|| numeric(body))?;
            Some((body.len(), one))
        });
        let Some((length, one)) = resolved else {
            out.push('&');
            rest = &rest[1..];
            continue;
        };
        out.push(one);
        rest = &rest[length + 2..];
    }
    out.push_str(rest);
    out
}

/// The markup an example quotes rather than renders.
///
/// **Nothing is followed that decoding did not change**, which is what ends the
/// walk: a reference is at least three characters and resolves to one, so each
/// document is shorter than the one that produced it and a file with no
/// references yields none.
fn quoted(markup: &str) -> Vec<String> {
    let mut found = Vec::new();
    let shown = ELEMENT.replace_all(markup, " ").into_owned();
    let text = decoded(&shown);
    if text != shown && text.contains('<') {
        found.push(text);
    }
    for tag in OPENING.captures_iter(markup) {
        for pair in ATTRIBUTE.captures_iter(&tag[2]) {
            let value = decoded(&pair[2]);
            if value != pair[2] && value.contains('<') {
                found.push(value);
            }
        }
    }
    found
}

/// What the components accept, read from the manifests.
#[derive(Default)]
struct Declared {
    /// Every attribute name a tag declares, whatever its type.
    names: BTreeMap<String, BTreeSet<String>>,
    /// The values an attribute takes, where its type is a union of literals.
    states: BTreeMap<String, BTreeMap<String, Vec<String>>>,
}

fn declared(context: &Context) -> Declared {
    let mut found = Declared::default();
    for tier in context.settings.roots(&context.root) {
        let Some(value) = context.manifest(&tier) else {
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
            let names = found.names.entry(tag.to_owned()).or_default();
            for attribute in declaration
                .get("attributes")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(name) = attribute.get("name").and_then(Value::as_str) else {
                    continue;
                };
                names.insert(name.to_owned());
                let values = attribute
                    .get("type")
                    .and_then(|one| one.get("text"))
                    .and_then(Value::as_str)
                    .and_then(literals);
                let Some(values) = values else {
                    continue;
                };
                found
                    .states
                    .entry(tag.to_owned())
                    .or_default()
                    .insert(name.to_owned(), values);
            }
        }
    }
    found
}

/// Every attribute of every element in one document, judged.
fn read(document: &str, declared: &Declared, where_: &str, findings: &mut Vec<Finding>) -> usize {
    let mut checked = 0;
    /* Opening tags only: a closing tag carries nothing to check. */
    for tag in OPENING.captures_iter(document) {
        let Some(names) = declared.names.get(&tag[1]) else {
            continue;
        };
        let states = declared.states.get(&tag[1]);
        for pair in ATTRIBUTE.captures_iter(&tag[2]) {
            let value = decoded(&pair[2]);
            if let Some(values) = states.and_then(|one| one.get(&pair[1])) {
                checked += 1;
                if values.iter().any(|one| one == &value) {
                    continue;
                }
                findings.push(Finding {
                    detail: "An unknown value is not an error at runtime: the element keeps its \
                             default and the example looks deliberate. Use one the component \
                             states, or give the component the value the example wants."
                        .to_owned(),
                    file: where_.to_owned(),
                    message: format!(
                        "`<{} {}=\"{}\">` is not one of {}",
                        &tag[1],
                        &pair[1],
                        value,
                        values
                            .iter()
                            .map(|one| format!("`{one}`"))
                            .collect::<Vec<String>>()
                            .join(", ")
                    ),
                });
                continue;
            }
            if names.contains(&pair[1]) {
                continue;
            }
            if &pair[1] == REFUSED {
                checked += 1;
                findings.push(Finding {
                    detail: "It held four axes at once: `separation` is where a surface ends, \
                             `emphasis` is how much ink a control claims, `material` is what it \
                             is made of, `tone` is what it means, and a component-specific \
                             choice that is none of those is `variant`."
                        .to_owned(),
                    file: where_.to_owned(),
                    message: format!(
                        "`<{} {}=\"{}\">` writes the word this library retired, and an example \
                         is the copy a consumer takes",
                        &tag[1], &pair[1], value
                    ),
                });
                continue;
            }
            if AXES.iter().any(|(axis, _)| *axis == &pair[1]) {
                checked += 1;
                findings.push(Finding {
                    detail: "An attribute the element does not declare is dropped at parse time \
                             and nothing says so, which is the silence a wrong value has. Ask \
                             for an axis the element carries, or give it the axis the example \
                             wants."
                        .to_owned(),
                    file: where_.to_owned(),
                    message: format!(
                        "`<{} {}=\"{}\">` asks for an axis `{}` does not declare",
                        &tag[1], &pair[1], value, &tag[1]
                    ),
                });
            }
        }
    }
    checked
}

pub fn run(context: &Context) -> Report {
    let declared = declared(context);
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
                let extension = file.extension().and_then(|one| one.to_str()).unwrap_or("");
                if !matches!(extension, "html" | "tsx") {
                    continue;
                }
                let Ok(markup) = fs::read_to_string(&file) else {
                    continue;
                };
                let where_ = context.relative(&file);
                let mut documents = vec![markup];
                while let Some(document) = documents.pop() {
                    documents.extend(quoted(&document));
                    checked += read(&document, &declared, &where_, &mut findings);
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
