//! A component's own CSS is not silently beaten by a document rule.
//!
//! **A document rule wins whatever the specificity and whatever the layer.** A
//! rule written outside a shadow root for a property the component also sets on
//! its host does not merely compete with the component's declaration; it
//! replaces it. The component's rule is dead, and the only sign is that the
//! component looks wrong.
//!
//! **An app is the more likely source than the base layer**, which is why both
//! are read: a consumer writing a rule for a component they are using has no
//! reason to know it beats the component's own.
//!
//! **The host and the slots are two sets, because a document rule reaches one or
//! the other and never both.** Merging them reports a rule for the host against
//! what the file declares on a slotted child, which it cannot reach. What
//! follows the tag in the document selector is what decides: nothing after it is
//! the host, anything after it is a descendant, which is what `::slotted`
//! styles.
//!
//! **The element a file styles, not the family it lives in.** Comparing every
//! stylesheet in a family against the family's own tag holds a rule for the root
//! against each of the family's parts, which it cannot reach. A part's tag is
//! its file's folder, which is how the tree is read everywhere else.
//!
//! **Two shapes are exempt.** A `::part()` is the published door and is meant to
//! win. And a selector list naming a `data-` recipe beside the component is one
//! decision written for a plain element and for the component alike.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::COMMENT;
use crate::component::{stylesheets, walk_outside, Context, Finding, Report};

static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]+)\{([^{}]*)\}").expect("a literal pattern compiles"));

/// One rule: its selector and the declarations inside it.
struct Rule {
    body: String,
    selector: String,
}

/// Every `selector { … }` pair, flattened out of any at-rule wrapping them.
fn rules(css: &str) -> Vec<Rule> {
    let text = COMMENT.replace_all(css, "");
    RULE.captures_iter(&text)
        .filter_map(|found| {
            let selector = found[1].trim().to_owned();
            let last = selector.lines().next_back().unwrap_or("").trim();
            (!last.starts_with('@') && !last.is_empty()).then(|| Rule {
                body: found[2].to_owned(),
                selector,
            })
        })
        .collect()
}

/// The properties a rule sets, shorthands included as written.
fn declared(body: &str) -> BTreeSet<String> {
    body.split(';')
        .filter_map(|one| one.split(':').next().map(str::trim))
        .filter(|one| !one.is_empty() && !one.starts_with("--") && !one.starts_with('/'))
        .map(str::to_owned)
        .collect()
}

/// Which component a document selector reaches into, and what follows the tag.
fn reaches(selector: &str, prefix: &str) -> Option<(String, String)> {
    let tag_pattern = Regex::new(&format!(r"{}[a-z0-9-]+", regex::escape(prefix))).ok()?;
    let compact = selector.split_whitespace().collect::<Vec<&str>>().join(" ");
    let parts: Vec<&str> = compact.split(',').map(str::trim).collect();
    /* One decision written for a plain element and for the component. */
    if parts.iter().any(|one| one.contains("data-")) {
        return None;
    }
    for one in parts {
        let Some(tag) = tag_pattern.find(one) else {
            continue;
        };
        if one.contains("::part(") {
            continue;
        }
        return Some((one[tag.end()..].trim().to_owned(), tag.as_str().to_owned()));
    }
    None
}

/// A document rule that reaches a component.
struct Document {
    path: String,
    properties: BTreeSet<String>,
    rest: String,
    selector: String,
    tag: String,
}

/// Every rule in a document stylesheet that reaches a component.
fn reaching(context: &Context, prefix: &str) -> Vec<Document> {
    let mut documents = Vec::new();
    for root in &context.settings.documents {
        /* `walk_outside` rather than `stylesheets`, because a document root is a
        whole application: build output under it is a copy of a source this
        already reads, and reporting both names a file nobody edits. */
        let mut sheets = Vec::new();
        walk_outside(&context.root.join(root), &mut sheets);
        sheets.retain(|one| {
            one.extension()
                .is_some_and(|two| two.eq_ignore_ascii_case("css"))
        });
        for sheet in sheets {
            let Ok(css) = fs::read_to_string(&sheet) else {
                continue;
            };
            let where_ = context.relative(&sheet);
            for rule in rules(&css) {
                let Some((rest, tag)) = reaches(&rule.selector, prefix) else {
                    continue;
                };
                documents.push(Document {
                    path: where_.clone(),
                    properties: declared(&rule.body),
                    rest,
                    selector: rule.selector,
                    tag,
                });
            }
        }
    }

    documents
}

pub fn run(context: &Context) -> Report {
    let Some(over) = context.settings.layers.last() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "document rules reaching a component",
        };
    };
    let documents = reaching(context, &over.prefix);

    let mut findings = Vec::new();
    let over_root = context.root.join(&over.source);
    let mut sheets = Vec::new();
    stylesheets(&over_root, &mut sheets);
    for sheet in sheets {
        let Some(part) = sheet.parent().and_then(|one| one.file_name()) else {
            continue;
        };
        let Some(family) = sheet
            .parent()
            .and_then(|one| one.parent())
            .and_then(|one| one.file_name())
        else {
            continue;
        };
        let (part, family) = (part.to_string_lossy(), family.to_string_lossy());
        let tag = if part == "root" {
            format!("{}{family}", over.prefix)
        } else {
            format!("{}{family}-{part}", over.prefix)
        };

        let Ok(css) = fs::read_to_string(&sheet) else {
            continue;
        };
        let mut host = BTreeSet::new();
        let mut slotted = BTreeSet::new();
        for rule in rules(&css) {
            let into = if rule.selector.contains("::slotted(") {
                &mut slotted
            } else if rule.selector.contains(":host") {
                &mut host
            } else {
                continue;
            };
            into.extend(declared(&rule.body));
        }

        let where_ = context.relative(&sheet);
        for rule in documents.iter().filter(|one| one.tag == tag) {
            let owned = if rule.rest.is_empty() {
                &host
            } else {
                &slotted
            };
            let dead: Vec<String> = rule
                .properties
                .iter()
                .filter(|one| owned.contains(*one))
                .map(|one| format!("`{one}`"))
                .collect();
            if dead.is_empty() {
                continue;
            }
            findings.push(Finding {
                detail: "A document rule wins whatever the specificity and whatever the layer, so \
                         the component's declaration here is dead."
                    .to_owned(),
                file: where_.clone(),
                message: format!(
                    "sets {} on its host or a slot, and `{}` in {} sets the same",
                    dead.join(", "),
                    rule.selector,
                    rule.path
                ),
            });
        }
    }

    Report {
        checked: documents.len(),
        findings,
        notes: Vec::new(),
        unit: "document rules reaching a component",
    }
}
