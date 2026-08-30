//! A surface hooks both the edge and the lift that separate it from its ground.
//!
//! **A surface is told apart from what is behind it by exactly one of four
//! things: a fill, an edge, a lift, or space.** A design language leads with one
//! of them, and a library that can express only one of them cannot be themed
//! into the others. The policy tokens are `--helix-border-surface` and
//! `--helix-shadow-surface` for a surface in the flow, `--helix-border-floating`
//! and `--helix-shadow-floating` for one over content.
//!
//! **What is checked is that a surface can be themed in both directions**, not
//! that it names both policy tokens, and the difference is the whole of the
//! rule. A surface carrying a border and a lift on purpose defaults its width to
//! something other than the floating policy, and is themeable all the same:
//! what matters is that the width sits behind *a* hook, not which default is
//! inside it.
//!
//! **The half-converted surface is the failure worth catching, because it reads
//! as done.** A menu hooking its shadow and hardcoding `border: none` themes
//! perfectly for anybody going shadow-first, cannot be made border-first at all,
//! and nothing in the file says so.
//!
//! **Which rules ought to be surfaces is deliberately not asked.** An elevation
//! is as often a control drawing itself (a thumb, a handle, a ring) as a surface
//! separating from a ground, and a policy flattening those would be a bug
//! wearing a theme. That classification is a judgment and does not belong in a
//! pattern.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

/// The two policies, each an edge and a lift that answer for one another.
const PAIRS: [(&str, &str, &str); 2] = [
    (
        "--helix-border-floating",
        "floating",
        "--helix-shadow-floating",
    ),
    (
        "--helix-border-surface",
        "in-flow",
        "--helix-shadow-surface",
    ),
];

/// One rule: its selector, and the declarations inside it.
///
/// Braces are excluded from both halves, so a nested block is reached as itself
/// rather than swallowed by the outer one.
static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([^{}]*)\{([^{}]*)\}").expect("a literal pattern compiles"));

/// A comment, blanked before anything is read.
///
/// **Every converted stylesheet explains the policy above the rule**, naming
/// both tokens, so a scan that does not blank comments reports the
/// documentation as a half-converted surface.
static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// A width behind any hook, whatever the default sits inside it.
static HOOKED_EDGE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"border:\s*var\(--[a-z-]+-border-width,").expect("a literal pattern compiles")
});

static HOOKED_LIFT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"box-shadow:\s*var\(--[a-z-]+-shadow,").expect("a literal pattern compiles")
});

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
            let source = COMMENT.replace_all(&raw, " ");
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");

            for rule in RULE.captures_iter(&source) {
                let body = rule.get(2).map_or("", |one| one.as_str());
                for (edge, kind, lift) in PAIRS {
                    if !body.contains(edge) && !body.contains(lift) {
                        continue;
                    }
                    let edged = body.contains(edge) || HOOKED_EDGE.is_match(body);
                    let lifted = body.contains(lift) || HOOKED_LIFT.is_match(body);
                    if edged && lifted {
                        checked += 1;
                        continue;
                    }
                    let selector: String = rule
                        .get(1)
                        .map_or("", |one| one.as_str())
                        .lines()
                        .next_back()
                        .unwrap_or("")
                        .trim()
                        .chars()
                        .take(60)
                        .collect();
                    findings.push(Finding {
                        detail: format!(
                            "A surface hooking one mechanism and fixing the other themes \
                             perfectly in one direction and not at all in the other, and nothing \
                             in the file says so. Put it behind a hook defaulting to `{}`.",
                            if edged { lift } else { edge }
                        ),
                        file: where_.clone(),
                        message: format!(
                            "`{selector}` is a {kind} surface and {} is hardcoded",
                            if edged { "a lift" } else { "an edge" }
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
        unit: "surfaces",
    }
}
