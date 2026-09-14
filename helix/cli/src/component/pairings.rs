//! Every ink-on-ground pair a component paints is one the theme model measures.
//!
//! **The contrast guarantee is a claim about the pairs somebody thought of.**
//! The surface model declares which inks land on which grounds and the engine
//! measures every pair it produces, which is a real guarantee about a list a
//! human wrote. A pair a component paints and the model has never heard of is
//! not failing: it is unmeasured, and nothing anywhere says so.
//!
//! **What it can see, said plainly, because it is a third of the problem.** Only
//! a rule setting an ink *and* a ground together is legible: measured across one
//! tier, twelve rules do that while 165 set only an ink and 112 only a ground.
//! The rest inherit their ground from a host, a part above them, or the page,
//! and no scan of the text can know which without laying the page out. So this
//! is a floor rather than a census: a pair it finds is real, and the pairs it
//! cannot find need a walker compositing real grounds on a rendered page.
//!
//! **The pairs are read from what the engine emitted, never from its source.**
//! Every status ink's grounds are built by a loop no pattern can see, so
//! matching the model's source with a regular expression leaves twenty pairs
//! unchecked, which is exactly the case a status fill painted by hand lands in.
//! The oracle is the emitted answer and the engine's own test suite asserts
//! against it, so it cannot go stale without that suite going red.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::text::COMMENT;
use crate::component::{stylesheets, Context, Finding, Report};

static RULE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\{([^{}]*)\}").expect("a literal pattern compiles"));

/// An ink. Not `border-color` or any other `-color`, which is why the character
/// before it is checked rather than trusted to the pattern.
static INK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"color:\s*var\(--helix-(color-[a-z0-9-]+)").expect("a literal pattern compiles")
});

static GROUND: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"background-color:\s*var\(--helix-(color-[a-z0-9-]+)")
        .expect("a literal pattern compiles")
});

/// Every `<ink> on <ground>` the model declares, whatever the pair measured.
fn measured(context: &Context) -> Option<BTreeSet<String>> {
    let raw = fs::read_to_string(context.root.join(context.settings.oracle.as_ref()?)).ok()?;
    let value: Value = serde_json::from_str(&raw).ok()?;
    let themes = value.get("themes")?.as_array()?;
    /* The default derivation, which is the one carrying the model unmodified:
    every other intent changes something, and the pairs are a fact about the
    surface model rather than about any theme. */
    let base = themes
        .iter()
        .find(|one| one.get("label").and_then(Value::as_str) == Some("default"))?;
    Some(
        base.get("pairings")?
            .as_array()?
            .iter()
            .filter_map(|one| {
                Some(format!(
                    "{} on {}",
                    one.get("foreground")?.as_str()?,
                    one.get("background")?.as_str()?
                ))
            })
            .collect(),
    )
}

pub fn run(context: &Context) -> Report {
    let Some(pairs) = measured(context) else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "pairs painted in one rule",
        };
    };

    let mut painted: BTreeMap<String, String> = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            if sheet.to_string_lossy().contains(".examples") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            let source = COMMENT.replace_all(&raw, " ");
            let where_ = context.relative(&sheet);
            for rule in RULE.captures_iter(&source) {
                let body = &rule[1];
                /* The *first accepted* match, not the first match. Taking
                `captures` and filtering gives up at `background-color:`, which
                is the one every rule with a ground has, so every pair goes
                unseen and the rule reports a confident zero. */
                let ink = INK.captures_iter(body).find(|found| {
                    let at = found.get(0).expect("group zero always matches").start();
                    body[..at]
                        .chars()
                        .next_back()
                        .is_none_or(|before| before != '-' && !before.is_alphanumeric())
                });
                let (Some(ink), Some(ground)) = (ink, GROUND.captures(body)) else {
                    continue;
                };
                painted.insert(format!("{} on {}", &ink[1], &ground[1]), where_.clone());
            }
        }
    }

    let mut findings = Vec::new();
    for (pair, where_) in &painted {
        if pairs.contains(pair) || context.settings.accepted.contains_key(pair) {
            continue;
        }
        findings.push(Finding {
            detail: "Add the ground to that ink in the surface model, or record it as accepted \
                     with the reason it is not the engine's to check."
                .to_owned(),
            file: where_.clone(),
            message: format!(
                "paints `{pair}` and the engine does not measure it, so a theme reports it \
                 neither passing nor failing"
            ),
        });
    }

    /* An exemption for a pair no component makes is an entry nobody will
    remove, which is the same argument the unresolved part words make. */
    for (pair, why) in &context.settings.accepted {
        if painted.contains_key(pair) {
            continue;
        }
        findings.push(Finding {
            detail: why.clone(),
            file: context.settings.source.clone(),
            message: format!("`{pair}` is accepted and nothing paints it"),
        });
    }

    Report {
        checked: painted.len(),
        findings,
        notes: Vec::new(),
        unit: "pairs painted in one rule",
    }
}
