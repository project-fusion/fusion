//! A base-layer recipe says what the element it pairs with says, axis by axis.
//!
//! **`[data-button]` and `helix-button` are one decision written for two
//! surfaces**, which is the base layer's argument for carrying a recipe at all:
//! a plain anchor on a page and the component beside it read the same tokens
//! and come out the same height, type and inset at every density, and the
//! layer's own comment says so. What nothing held was the matrix. Every
//! emphasis and every tone is a rule in each file, and the two files are edited
//! by different hands for different reasons, so a fix landing on one side sits
//! there until somebody measures the other: `subtle` deepened its ink on the
//! element for AA, measured at 4.29:1 against 4.82 outlined, and the recipe
//! kept the wash and the old ink for a release.
//!
//! **Compared as declarations rather than rendered**, because the pairing is a
//! claim about the text: the recipe's `[data-button="solid"]` and the element's
//! `:host([emphasis="solid"]) [part="button"]` are meant to be the same three
//! lines, and a difference is a real edit made to one and not the other. The
//! base rule is not compared, since the element splits it between `:host` and
//! its part and rounds four corners where the recipe rounds one: the matrix is
//! where the drift lands, and the matrix is what is held.
//!
//! **The recipe is found by its attribute and the element by its family**, from
//! the settings rather than a path: the base layer is the last sheet in `layer`
//! and the element is the styled layer's `button`, so a consumer with their own
//! recipe over their own button has the same rule to run.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{Context, Finding, Report};

/// The three shapes a cell of the matrix takes, on each side.
///
/// Each pairs a pattern over the recipe's selector with one over the element's,
/// capturing the axis value, and names the cell for a finding.
const CELLS: [(&str, &str, &str); 3] = [
    (
        "tone",
        r#"^\[data-button\]\[data-button-tone="([a-z]+)"\]$"#,
        r#"^:host\(\[tone="([a-z]+)"\]\)$"#,
    ),
    (
        "emphasis",
        r#"^\[data-button="([a-z]+)"\]$"#,
        r#"^:host\(\[emphasis="([a-z]+)"\]\) \[part="button"\]$"#,
    ),
    (
        "emphasis hover",
        r#"^\[data-button="([a-z]+)"\]:not\(:disabled\):hover$"#,
        r#"^:host\(:not\(:disabled\)\[emphasis="([a-z]+)"\]\) \[part="button"\]:hover$"#,
    ),
];

static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]+)\{([^{}]*)\}").expect("a literal pattern compiles"));

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// One space between tokens, so a wrapped `var()` reads as its own spelling.
fn flatten(value: &str) -> String {
    value.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// Every rule in a sheet as `selector` to its declarations, each `property:
/// value` flattened, in source order.
fn rules(css: &str) -> Vec<(String, Vec<String>)> {
    let text = COMMENT.replace_all(css, " ");
    RULE.captures_iter(&text)
        .filter_map(|found| {
            let selector = flatten(&found[1]);
            if selector.starts_with('@') || selector.is_empty() {
                return None;
            }
            let declarations = found[2]
                .split(';')
                .filter_map(|one| {
                    let (property, value) = one.split_once(':')?;
                    let property = property.trim();
                    (!property.is_empty()).then(|| format!("{property}: {}", flatten(value)))
                })
                .collect();
            Some((selector, declarations))
        })
        .collect()
}

/// The matrix one side declares: cell and value to the declarations there.
fn matrix(css: &str, side: usize) -> BTreeMap<(String, String), Vec<String>> {
    let patterns: Vec<(&str, Regex)> = CELLS
        .iter()
        .map(|cell| {
            let pattern = if side == 0 { cell.1 } else { cell.2 };
            (
                cell.0,
                Regex::new(pattern).expect("a literal pattern compiles"),
            )
        })
        .collect();
    let mut found: BTreeMap<(String, String), Vec<String>> = BTreeMap::new();
    for (selector, declarations) in rules(css) {
        /* Each selector of a list on its own, so `a, b { }` reaches both. */
        for one in selector.split(',') {
            let one = one.trim();
            for (cell, pattern) in &patterns {
                if let Some(captured) = pattern.captures(one) {
                    found
                        .entry(((*cell).to_owned(), captured[1].to_owned()))
                        .or_default()
                        .extend(declarations.iter().cloned());
                }
            }
        }
    }
    found
}

/// How one cell differs between the element's declarations and the recipe's,
/// as a sentence, or nothing where they agree.
fn disagreement(theirs: &[String], ours: &[String]) -> Option<String> {
    let quoted = |list: Vec<&String>| {
        list.iter()
            .map(|one| format!("`{one}`"))
            .collect::<Vec<String>>()
            .join(", ")
    };
    let missing: Vec<&String> = theirs.iter().filter(|one| !ours.contains(one)).collect();
    let extra: Vec<&String> = ours.iter().filter(|one| !theirs.contains(one)).collect();
    let mut sides = Vec::new();
    if !missing.is_empty() {
        sides.push(format!(
            "the element sets {} and the recipe does not",
            quoted(missing)
        ));
    }
    if !extra.is_empty() {
        sides.push(format!(
            "the recipe sets {} and the element does not",
            quoted(extra)
        ));
    }
    (!sides.is_empty()).then(|| sides.join("; "))
}

pub fn run(context: &Context) -> Report {
    let empty = Report {
        checked: 0,
        findings: Vec::new(),
        notes: Vec::new(),
        unit: "cells of the button matrix",
    };
    let (Some(layer), Some(styled)) = (
        context.settings.layer.last(),
        context.settings.layers.last(),
    ) else {
        return empty;
    };
    let recipe_at = context.root.join(layer);
    let element_at = context
        .root
        .join(&styled.source)
        .join("button/root/button-root.css");
    let (Ok(recipe), Ok(element)) = (
        fs::read_to_string(&recipe_at),
        fs::read_to_string(&element_at),
    ) else {
        return empty;
    };
    let where_ = |path: &std::path::Path| {
        path.strip_prefix(&context.root)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/")
    };

    let recipe = matrix(&recipe, 0);
    let element = matrix(&element, 1);
    let mut findings = Vec::new();
    let mut checked = 0;

    for ((cell, value), theirs) in &element {
        let Some(ours) = recipe.get(&(cell.clone(), value.clone())) else {
            findings.push(Finding {
                detail: "Every tone and emphasis the element takes is written in the recipe, or \
                         an anchor asking for the missing one falls through to the base rule with \
                         no error."
                    .to_owned(),
                file: where_(&recipe_at),
                message: format!("has no `{cell}` cell for `{value}`, and the element does"),
            });
            continue;
        };
        checked += 1;
        let Some(sides) = disagreement(theirs, ours) else {
            continue;
        };
        findings.push(Finding {
            detail: "The recipe and the element are one decision written for two surfaces, so a \
                     fix landing on one side is a page and a component that disagree about the \
                     same button."
                .to_owned(),
            file: where_(&recipe_at),
            message: format!("the `{cell}` cell for `{value}` disagrees with the element: {sides}"),
        });
    }

    for (cell, value) in recipe.keys() {
        if element.contains_key(&(cell.clone(), value.clone())) {
            continue;
        }
        findings.push(Finding {
            detail: "A cell the element never takes is a recipe for a button that does not \
                     exist."
                .to_owned(),
            file: where_(&recipe_at),
            message: format!("has a `{cell}` cell for `{value}`, and the element does not"),
        });
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "cells of the button matrix",
    }
}
