//! A form control reads `:host(:disabled)` rather than the attribute.
//!
//! **The pseudo-class matches on two things and the attribute selector on one.**
//! `:disabled` is true for a control carrying the attribute *and* for one inside
//! an ancestor `<fieldset disabled>`, which sets no attribute on anything. So a
//! component styled with `:host([disabled])` refuses interaction from the
//! fieldset, because the platform disables it either way, and paints itself as
//! live. That reads as a control that is simply broken, and it is invisible in
//! every example that does not happen to use a fieldset.
//!
//! **Measured** by rendering every form control twice, once with the attribute
//! and once inside a disabled fieldset: nineteen of twenty matched, and the one
//! that did not painted full primary in the fieldset against half opacity with
//! the attribute, from a single `:host([disabled])` on one rule.
//!
//! **Only form-associated components are held to this, and per part rather than
//! per family**, which is what makes the rule precise rather than a blanket ban.
//! A lone radio is not a control, it is an answer to one, so it never inherits a
//! fieldset's state and the `disabled` its group writes onto it really is a
//! plain attribute; keying on the family reports it as a bug. A part qualifies
//! if the source at the same relative path reaches the form base class.
//!
//! **The base classes are Helix's and travel with the rule**, the way the
//! platform attribute table does: a consumer extending Helix extends
//! `HelixFormElement`, and a library with its own form base has its own version
//! of this rule to write.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::COMMENT;
use crate::component::{sources, stylesheets, Context, Finding, Report};

/// Reaching either of these makes a part form-associated.
static FORM_BASE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"extends\s+[\w(]*(?:HelixFormElement|MixinField)")
        .expect("a literal pattern compiles")
});

/// `:host([disabled])`, which is the half of the truth that is written down.
static ON_ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r":host\(\[disabled\][^)]*\)").expect("a literal pattern compiles")
});

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);

    /* Keyed by the path a part has inside its tier, which is what lets a
    stylesheet in one tier find the class its source declares in another. */
    let mut form_associated: BTreeSet<String> = BTreeSet::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            if !FORM_BASE.is_match(&COMMENT.replace_all(&raw, "")) {
                continue;
            }
            let Ok(within) = file.strip_prefix(tier) else {
                continue;
            };
            form_associated.insert(
                within
                    .with_extension("")
                    .to_string_lossy()
                    .replace('\\', "/"),
            );
        }
    }

    let mut findings = Vec::new();
    for tier in &tiers {
        let mut sheets = Vec::new();
        stylesheets(tier, &mut sheets);
        for sheet in sheets {
            let Ok(within) = sheet.strip_prefix(tier) else {
                continue;
            };
            let part = within
                .with_extension("")
                .to_string_lossy()
                .replace('\\', "/");
            if !form_associated.contains(&part) {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            let code = COMMENT.replace_all(&raw, "");
            let where_ = context.relative(&sheet);
            for found in ON_ATTRIBUTE.find_iter(&code) {
                findings.push(Finding {
                    detail: "Use `:host(:disabled)`, which is true for the attribute and for an \
                             ancestor `<fieldset disabled>` alike."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!(
                        "{} misses an ancestor `<fieldset disabled>`",
                        found.as_str()
                    ),
                });
            }
        }
    }

    Report {
        checked: form_associated.len(),
        findings,
        notes: Vec::new(),
        unit: "form-associated parts",
    }
}
