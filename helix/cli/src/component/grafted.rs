//! A component that applies `MixinField` renders at least one of its seams.
//!
//! **The mixin is a graft rather than a helper.** Applying it adds `label`,
//! `hint`, `feedback` and `required` to the class, and the manifest publishes
//! all four on the family's reference page the moment it is applied. What draws
//! them is `renderLabel`, `renderGroupLabel`, `renderHint` and `renderFeedback`,
//! and a component is free to call none of them.
//!
//! **Which fails in two directions at once and reports neither.** Four rows of
//! documented API a consumer can set and never see, and a required control that
//! computes a validation message with nowhere to put it: `reportRequired` hands
//! `setValidity` a message and an anchor, the browser refuses the submit, and
//! the sentence explaining why is never drawn. Nothing throws, the reference
//! page is complete, and the component renders.
//!
//! **Rating shipped that way and nothing could see it.** It applied the mixin
//! and called no seam for as long as it had existed. `parts` was satisfied,
//! because the parts it never drew were never declared either; `slots` reads one
//! way only; `properties` compares the manifest against the class, and the class
//! really did have all four. The absence is between the two halves, which is the
//! one place a rule pairing them cannot look.
//!
//! **A component that never applied the mixin owes nothing here**, which is the
//! distinction the conventions spent two edits getting wrong. A panel composed
//! into a field that already owns the label, the hint and the feedback writes
//! `required` out and reaches `ElementInternals` directly: Date Picker, Time
//! Picker and Color Picker each do, and each carries its reasons. This rule
//! reads the `extends` clause, so those three are not in its corpus at all.
//!
//! **One seam is the bar and not four**, because which of them a field draws is
//! a layout decision. Checkbox and Switch put their label beside the box through
//! a slot and render the hint and the feedback under it; Pin Input and Rating
//! take `renderGroupLabel` rather than `renderLabel`, a row of controls having
//! no single control for a `<label for>` to name. Asking for all four would be
//! this rule taking a decision that belongs to the component.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{line_of, uncommented};
use crate::component::{family, sources, Context, Finding, Report};

/// A class whose `extends` clause applies the mixin, however deeply nested.
///
/// The clause runs to the opening brace, so `[^{]` cannot reach into a body and
/// find the name in a method. It has to cross newlines: four families spell the
/// clause over three lines, and a pattern anchored to one reported them clean.
static GRAFTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\bclass\s+(\w+)\s+extends[^{]*\bMixinField\s*\(")
        .expect("a literal pattern compiles")
});

/// What drawing the graft looks like, any one of which is enough.
static DRAWS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"this\.render(?:Label|GroupLabel|Hint|Feedback)\s*\(")
        .expect("a literal pattern compiles")
});

/// Whether anything in the family draws one, the class's own file included.
///
/// The family and not the file, because a template is a seam a part can own: a
/// root rendering its own field through a method another file in the folder
/// defines is the composition this repository asks for, and reading one file
/// would report it as a fault.
fn draws(file: &Path, tier: &Path) -> bool {
    let mut files = vec![file.to_path_buf()];
    if let Some(name) = family(file, tier) {
        sources(&tier.join(name), &mut files);
    }
    files
        .iter()
        .any(|one| fs::read_to_string(one).is_ok_and(|text| DRAWS.is_match(&uncommented(&text))))
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let text = uncommented(&raw);
            for found in GRAFTS.captures_iter(&text) {
                let (Some(whole), Some(name)) = (found.get(0), found.get(1)) else {
                    continue;
                };
                checked += 1;
                if draws(&file, &tier) {
                    continue;
                }
                findings.push(Finding {
                    detail: "Take the mixin for what you render, and reach for \
                             `ElementInternals` directly for the rest."
                        .to_owned(),
                    file: format!(
                        "{}:{}",
                        context.relative(&file),
                        line_of(&text, whole.start())
                    ),
                    message: format!(
                        "`{}` applies `MixinField` and calls none of `renderLabel`, \
                         `renderGroupLabel`, `renderHint` or `renderFeedback`, so `label`, \
                         `hint` and `feedback` are published and undrawable and a required \
                         control computes a message with nowhere to put it",
                        name.as_str()
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "classes applying MixinField",
    }
}
