//! Every panel that floats over the page takes the same corner.
//!
//! **A radius is read against the corner beside it, never against the area
//! behind it.** That is what makes this a system-level fact rather than a
//! per-component one: a menu at 4px next to a dropdown at 8px reads as two
//! design languages, and the reader has no way to know the second one is a
//! larger panel rather than a different kind of thing. So the size of a panel is
//! not a reason for it to round differently, and neither is what it contains.
//!
//! **`sm` is the house corner and the floating panels are where it matters
//! most**, because they are the surfaces a reader sees beside each other. A
//! select's panel opens directly under its own trigger; a menu and a tooltip
//! land on the same screen; a dialog and a toast share a page.
//!
//! **A check rather than a convention, because the convention does not hold.**
//! One panel drifted under a comment reading "which is `Popover`'s panel by
//! another name and is deliberately the same shape", while `Popover` is `sm` and
//! it had taken `md`. The rule was written down, in the right file, directly
//! above the declaration that broke it.
//!
//! **A floating panel is one that lifts, which the stylesheet already says.**
//! `--helix-shadow-floating` is the separation policy for a surface over
//! content, so the panels name themselves and no list has to be kept here. That
//! also means this rule follows a new component without being edited, which a
//! list of family names would not.
//!
//! **Keyed on the part rather than on the rule**, because a panel routinely sets
//! its corner in one rule and its lift in another: Drawer rounds `[part="panel"]`
//! and lifts `:host(:state(open)) [part="panel"]`, so a rule-local reading sees a
//! radius with no shadow beside it and a shadow with no radius, and checks
//! neither.
//!
//! **What is asked is which rung, not whether there is one.** A panel with no
//! radius at all is a legitimate shape — a sheet that reaches the edge of the
//! viewport has nothing to round against — and requiring one would fire on it.
//! `radii-none` passes for the same reason: it is the vocabulary being used to
//! say "square" out loud. What fails is a *different* rung, or a raw length,
//! which is the drift actually observed.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::COMMENT;
use crate::component::{stylesheets, Context, Finding, Report};

/// The lift that means "over the page rather than on it".
const FLOATING: &str = "--helix-shadow-floating";

/// The corner a floating panel takes, and the one way to say "square".
const HOUSE: &str = "--helix-radii-sm";
const SQUARE: &str = "--helix-radii-none";

/// One rule: its selector, and the declarations inside it.
static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]*)\{([^{}]*)\}").expect("a literal pattern compiles"));

/// The part a selector styles, which is the last one it names.
///
/// `[part="surface"] [part="option"]` styles the option; the surface is only
/// where it sits. Taking the first would file every descendant's corner under
/// the panel it happens to be inside.
static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\[part="([a-z-]+)"\]"#).expect("a literal pattern compiles"));

/// `border-radius` and the longhands, since a sheet may round two corners only.
static RADIUS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(border(?:-(?:start|end)-(?:start|end))?-radius)\s*:([^;]*);")
        .expect("a literal pattern compiles")
});

/// What a panel rounded itself with, and where it was written.
#[derive(Default)]
struct Panel {
    floating: bool,
    radii: Vec<(String, String)>,
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            /* Blanked before anything is read: the prose above these rules
            quotes the tokens it is explaining, so a scan that reads comments
            reports the reasoning as a second declaration. */
            let source = COMMENT.replace_all(&raw, " ");
            let where_ = context.relative(&sheet);

            /* One entry per part in this file, since a part's corner and its
            lift are routinely declared in different rules. A file is the right
            scope: a part name means one box within the component that renders
            it and nothing outside. */
            let mut panels: BTreeMap<String, Panel> = BTreeMap::new();
            for rule in RULE.captures_iter(&source) {
                let selector = rule.get(1).map_or("", |one| one.as_str());
                let body = rule.get(2).map_or("", |one| one.as_str());
                let Some(part) = PART.captures_iter(selector).last() else {
                    continue;
                };
                let panel = panels.entry(part[1].to_string()).or_default();
                if body.contains(FLOATING) {
                    panel.floating = true;
                }
                for radius in RADIUS.captures_iter(body) {
                    panel
                        .radii
                        .push((radius[1].to_string(), radius[2].trim().to_string()));
                }
            }

            for (part, panel) in panels {
                if !panel.floating {
                    continue;
                }
                for (property, value) in panel.radii {
                    /* A hook wrapping the token is the token: `var(--drawer-radius,
                    var(--helix-radii-sm))` is a consumer's override defaulting to
                    the house corner, which is the shape the hooks rule asks for. */
                    if value.contains(HOUSE) || value.contains(SQUARE) {
                        checked += 1;
                        continue;
                    }
                    findings.push(Finding {
                        detail: format!(
                            "A radius is read against the corner beside it rather than against \
                             the area behind it, so a panel that rounds differently reads as a \
                             second design language rather than as a larger panel. Neither its \
                             size nor what it holds is a reason. Use `{HOUSE}`, or `{SQUARE}` to \
                             say square on purpose."
                        ),
                        file: where_.clone(),
                        message: format!(
                            "`{part}` floats and sets `{property}: {value}`, which is not the \
                             corner every other floating panel takes"
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
        unit: "floating corners",
    }
}
