//! The focus ring is spelled one of the ways the registry names, and no other.
//!
//! **Four situations, and every sheet that picked one had a reason.** A ring
//! sits outside the control it marks; it goes inside when a container clips it,
//! which is a scroller, a cell in a grid, or anything with `overflow` between
//! the control and the eye; it sits flush when the control's own border is what
//! the ring thickens; and it is dropped entirely when the ring belongs on an
//! ancestor, the chat composer moving it to `[part="composer"]` because the box
//! is the focused thing and the textarea inside it is not.
//!
//! **What was missing is not consistency, it is the record of it.** Measured 31
//! Aug 2026 across 54 sheets that style a focus state: three offset spellings
//! and two outline spellings, with no outlier among them. The vocabulary was
//! already one vocabulary. Nothing held it there, so the next sheet to invent a
//! fourth spelling would have been the first anyone noticed, and it would have
//! been noticed by looking rather than by a check.
//!
//! **Only inside a focus selector**, which is the scoping that makes this a
//! rule about focus rather than about `outline`. Heatmap draws a hover ring and
//! a print hairline with `outline`, both offset by `--helix-border-thin`,
//! because there the ring *is* a hairline and the border token is the right one.
//! A rule reading every `outline-offset` in the tree calls all three of those a
//! defect, which is how a check teaches people to write worse CSS to silence it.
//!
//! **The color is not part of the offset's vocabulary.** An invalid control
//! recolors the ring to `--helix-color-danger` and keeps whichever offset its
//! situation asks for, so the two axes are registered apart rather than as a
//! product of themselves.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

/// Where the ring sits, and the one spelling each situation is written with.
const OFFSETS: [(&str, &str); 3] = [
    (
        "var(--helix-size-focus-offset)",
        "outside, which is the default and wants no comment",
    ),
    (
        "calc(var(--helix-size-focus-offset) * -1)",
        "inset, for a control a container clips",
    ),
    ("0", "flush, where the control's own border is what thickens"),
];

/// What the ring is drawn with. `none` is the fourth situation, not a fourth
/// spelling: the ring is somewhere else, or deliberately absent.
const OUTLINES: [&str; 3] = [
    "var(--helix-size-focus-ring) solid var(--helix-color-focus-ring)",
    "var(--helix-size-focus-ring) solid var(--helix-color-danger)",
    "none",
];

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]+)\{([^{}]*)\}").expect("a literal pattern compiles"));

static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(outline|outline-offset)\s*:\s*([^;]+)").expect("a literal pattern compiles")
});

/// One space between tokens, so a wrapped declaration reads as its own spelling.
fn flatten(value: &str) -> String {
    value.split_whitespace().collect::<Vec<&str>>().join(" ")
}

pub fn run(context: &Context) -> Report {
    let registered: BTreeSet<&str> = OFFSETS.iter().map(|(one, _)| *one).collect();
    let mut findings = Vec::new();
    let mut checked = 0;

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
            /* The examples are hand-written demonstration CSS and spell the
            offset as a literal throughout. They are a population of their own,
            and sweeping them is filed rather than done. */
            if where_.contains("/.examples/") {
                continue;
            }

            let mut counted = false;
            for rule in RULE.captures_iter(&COMMENT.replace_all(&css, "")) {
                let selector = flatten(&rule[1]);
                if !selector.contains("focus") {
                    continue;
                }
                if !counted {
                    checked += 1;
                    counted = true;
                }
                for declaration in DECLARATION.captures_iter(&rule[2]) {
                    let value = flatten(&declaration[2]);
                    let known = if &declaration[1] == "outline" {
                        OUTLINES.contains(&value.as_str())
                    } else {
                        registered.contains(value.as_str())
                    };
                    if known {
                        continue;
                    }
                    findings.push(Finding {
                        detail: format!(
                            "The registry holds three offsets and three outlines: {}. A fourth \
                             spelling is either a situation the registry is missing, in which \
                             case add it there, or the same situation written a new way, which \
                             is what leaves a reader unable to tell them apart.",
                            OFFSETS
                                .iter()
                                .map(|(spelling, why)| format!("`{spelling}` is {why}"))
                                .collect::<Vec<String>>()
                                .join("; ")
                        ),
                        file: where_.clone(),
                        message: format!(
                            "`{selector}` sets `{}: {value}`, which the registry does not name",
                            &declaration[1]
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "stylesheets styling a focus state",
    }
}
