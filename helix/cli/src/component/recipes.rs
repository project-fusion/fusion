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
        "emphasis hover and press",
        r#"^\[data-button="([a-z]+)"\]:not\(:disabled\):is\(:hover, :active\)$"#,
        r#"^:host\(:not\(:disabled\)\[emphasis="([a-z]+)"\]\) \[part="button"\]:is\(:hover, :active\)$"#,
    ),
];

static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]+)\{([^{}]*)\}").expect("a literal pattern compiles"));

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// One space between tokens and none inside a parenthesis, so a wrapped
/// `var()` reads as its own spelling: `var( --a, b )` written by hand is
/// `var(--a, b)` as the compiler writes it.
fn flatten(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
        .replace("( ", "(")
        .replace(" )", ")")
}

/// A selector with each `:where(...)` replaced by what it holds, so
/// `:host(:where([emphasis="solid"])) [part="button"]`, as Helix's compiler
/// writes a rule whose conditions add no weight, reads as the selector a
/// hand-written sheet has.
fn unwrapped(selector: &str) -> String {
    let mut out = String::with_capacity(selector.len());
    let mut rest = selector;
    let mut closes: Vec<usize> = Vec::new();
    let mut depth = 0usize;
    while let Some(character) = rest.chars().next() {
        if rest.starts_with(":where(") {
            depth += 1;
            closes.push(depth);
            rest = &rest[":where(".len()..];
            continue;
        }
        match character {
            '(' => {
                depth += 1;
                out.push(character);
            }
            ')' => {
                if closes.last() == Some(&depth) {
                    closes.pop();
                } else {
                    out.push(character);
                }
                depth = depth.saturating_sub(1);
            }
            _ => out.push(character),
        }
        rest = &rest[character.len_utf8()..];
    }
    out
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
            let one = unwrapped(one.trim());
            for (cell, pattern) in &patterns {
                if let Some(captured) = pattern.captures(&one) {
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
    /* The stylesheet `helix system stylesheets` writes from Button's table,
    or one written by hand where a styled layer has no table. */
    let folder = context.root.join(&styled.source).join("button/root");
    let element_at = ["button-root.generated.css", "button-root.css"]
        .iter()
        .map(|name| folder.join(name))
        .find(|path| path.is_file())
        .unwrap_or_else(|| folder.join("button-root.css"));
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

#[cfg(test)]
mod tests {
    use super::{flatten, unwrapped};

    #[test]
    fn a_selector_with_no_weight_reads_as_one_written_by_hand() {
        assert_eq!(
            unwrapped(
                r#":host(:where(:not(:disabled)[emphasis="solid"])) [part="button"]:where(:is(:hover, :active))"#
            ),
            r#":host(:not(:disabled)[emphasis="solid"]) [part="button"]:is(:hover, :active)"#
        );
        assert_eq!(
            unwrapped(r#":host(:where([tone="primary"]))"#),
            r#":host([tone="primary"])"#
        );
    }

    #[test]
    fn a_wrapped_value_reads_as_the_compiler_writes_it() {
        assert_eq!(
            flatten("var(\n    --button-fill,\n    color-mix(in oklab, red 14%, transparent)\n  )"),
            "var(--button-fill, color-mix(in oklab, red 14%, transparent))"
        );
    }
}
