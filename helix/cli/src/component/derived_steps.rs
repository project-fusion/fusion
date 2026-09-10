//! A scope that moves a base step moves the steps derived from it.
//!
//! **A custom property is substituted where it is declared, not where it is
//! read.** The token layer declares `--helix-size-icon-tight` once, at the root,
//! as `calc(var(--helix-size-icon) * 0.8)`, and that `var()` is resolved there:
//! every element in the document inherits the root's tight step, whatever the
//! icon size is where the element stands. So a component that shrinks
//! `--helix-size-icon` for its own subtree and then reads `-tight` gets 0.8 of
//! the root's icon, not 0.8 of its own.
//!
//! **Measured, on a filter chip.** The chip sets its icon to `sm`, 16 pixels,
//! and drew its remove mark at `-tight`, which answered 16 rather than 12.8: the
//! same size as the button holding it, so the glyph filled its own hit box and
//! read as an X far too big for the chip. The computed value said so outright,
//! `calc(calc(1.25rem * 1) * 0.8)`, with the root's `1.25rem` baked in.
//!
//! **The layer already knows this.** `[data-density]` redeclares all six derived
//! steps beside the base ones, because a density region is exactly a scope that
//! moves a base step. A component that writes `--helix-size-icon` on its own
//! host is a density region in all but name, and twelve of them were not
//! re-deriving. This rule holds them to the layer's own pattern, and reads the
//! formulas out of the layer rather than keeping a copy, so a changed factor is
//! a changed rule rather than a stale one.
//!
//! **It reads `[data-density]` as well as the root**, because the root's copy is
//! in `tokens.css`, which is generated and gitignored, and CI audits source
//! without building it. `base.css` is committed, so the density region is the
//! copy every run can see; where both are present they have to agree, and a
//! step derived two ways is reported rather than one of them picked.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]+)\{([^{}]*)\}").expect("a literal pattern compiles"));

static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(--helix-size-[\w-]+)\s*:\s*([^;]+)").expect("a literal pattern compiles")
});

static BASE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"var\((--helix-size-[\w-]+)\)").expect("a literal pattern compiles")
});

static DERIVING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*(:root|html|\[data-density\])\s*$").expect("a literal pattern compiles")
});

/// One space between tokens, so a wrapped value reads as its own spelling.
fn flatten(value: &str) -> String {
    value.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// Every formula the layer gives each derived step, at its root and in its
/// density region: one each, unless the two copies have drifted apart.
fn derived(context: &Context) -> BTreeMap<String, BTreeSet<String>> {
    let mut formulas: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for sheet in &context.settings.layer {
        let Ok(raw) = fs::read_to_string(context.root.join(sheet)) else {
            continue;
        };
        for rule in RULE.captures_iter(&COMMENT.replace_all(&raw, "")) {
            if !rule[1].split(',').any(|one| DERIVING.is_match(one)) {
                continue;
            }
            for declaration in DECLARATION.captures_iter(&rule[2]) {
                let name = declaration[1].to_string();
                if !(name.ends_with("-tight") || name.ends_with("-loose")) {
                    continue;
                }
                formulas
                    .entry(name)
                    .or_default()
                    .insert(flatten(&declaration[2]));
            }
        }
    }
    formulas
}

/// The layer's formulas grouped by the base step each one multiplies:
/// `--helix-size-icon` to its `-tight` and `-loose`. A step derived two ways is
/// reported and left out, since there is no one formula to hold a scope to.
fn by_base(
    context: &Context,
    findings: &mut Vec<Finding>,
) -> BTreeMap<String, Vec<(String, String)>> {
    let mut by_base: BTreeMap<String, Vec<(String, String)>> = BTreeMap::new();
    for (step, written) in derived(context) {
        if written.len() > 1 {
            findings.push(Finding {
                detail: "`[data-density]` redeclares every derived step with the formula \
                         the root gives it, so a region is sized as the page is. Change \
                         the factor in both, or the density region and the rest of the \
                         page disagree about what the step means."
                    .to_string(),
                file: context.settings.layer.join(", "),
                message: format!(
                    "the layer derives `{step}` two ways: {}",
                    written
                        .iter()
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<String>>()
                        .join(" and ")
                ),
            });
            continue;
        }
        let Some(formula) = written.into_iter().next() else {
            continue;
        };
        let Some(base) = BASE.captures(&formula).map(|one| one[1].to_string()) else {
            continue;
        };
        by_base.entry(base).or_default().push((step, formula));
    }
    by_base
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    let by_base = by_base(context, &mut findings);

    /* **Nothing found is a failure, not a pass.** A run that finds no formulas
    checks nothing, and would otherwise report every scope in the library clean. */
    if by_base.is_empty() {
        if findings.is_empty() && !context.settings.layer.is_empty() {
            findings.push(Finding {
                detail: "The rule compares every scope against the formulas the layer \
                         declares at its root and in `[data-density]`, and found none: \
                         the derived steps moved out of an unconditional rule, or the \
                         layer's sheets moved. Either way nothing was checked."
                    .to_string(),
                file: context.settings.layer.join(", "),
                message: "the token layer declares no derived steps to check against".to_string(),
            });
        }
        return Report {
            checked,
            findings,
            notes: Vec::new(),
            unit: "scopes moving a base step",
        };
    }

    for root in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&root, &mut sheets);
        for sheet in sheets {
            let Ok(css) = fs::read_to_string(&sheet) else {
                continue;
            };
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");
            if where_.contains("/.examples/") {
                continue;
            }

            for rule in RULE.captures_iter(&COMMENT.replace_all(&css, "")) {
                let selector = flatten(&rule[1]);
                let declared: BTreeMap<String, String> = DECLARATION
                    .captures_iter(&rule[2])
                    .map(|one| (one[1].to_string(), flatten(&one[2])))
                    .collect();
                for (base, steps) in &by_base {
                    if !declared.contains_key(base) {
                        continue;
                    }
                    checked += 1;
                    for (step, formula) in steps {
                        match declared.get(step) {
                            Some(written) if written == formula => {}
                            Some(written) => findings.push(Finding {
                                detail: format!(
                                    "The layer declares `{step}: {formula}`. A scope that \
                                     re-derives the step with a different formula has two \
                                     definitions of one token, and whichever is read decides \
                                     the size."
                                ),
                                file: where_.clone(),
                                message: format!(
                                    "`{selector}` re-derives `{step}` as `{written}`, not as \
                                     the layer does"
                                ),
                            }),
                            None => findings.push(Finding {
                                detail: format!(
                                    "Declare `{step}: {formula}` in the same block. The layer's \
                                     own is substituted at the root, so everything under this \
                                     scope reads the root's step rather than one relative to \
                                     `{base}` here. `[data-density]` redeclares all six for \
                                     exactly this reason."
                                ),
                                file: where_.clone(),
                                message: format!(
                                    "`{selector}` moves `{base}` and leaves `{step}` at the \
                                     root's value"
                                ),
                            }),
                        }
                    }
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "scopes moving a base step",
    }
}
