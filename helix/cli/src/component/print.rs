//! Every family with a stylesheet says what it does on paper.
//!
//! **A page cannot answer this for a component.** `@media print` does not cross
//! a shadow boundary, any more than a reduced-motion rule does, so a consumer
//! who wants a clean printout cannot write one: the rule has to be inside the
//! sheet the component adopts. It is the same finding the motion rule makes, for
//! the same reason.
//!
//! **Every family, with no exempt categories.** A family with a stylesheet says
//! what it does on paper, or it fails here.
//!
//! The answers are four, and each family's own sheet carries the reason. Chrome
//! hides, because a printed page has no elsewhere to go and a spinner is a
//! promise nothing will keep. Surfaces flatten, because a lift is a shadow and a
//! printer turns a shadow into a gray smear. Boxes that scroll unclip, because a
//! box that hides is a box that loses content on paper. And anything whose fill
//! *is* the information forces itself to print: a chart with no fill is a frame,
//! and a ticked checkbox whose tick is a background prints as an empty box,
//! which is a document saying the opposite of the truth.
//!
//! **Comments are blanked, which is a departure from the script this comes
//! from.** Every converted stylesheet explains the policy above the rule, and
//! the sentence explaining it names `@media print`, so a scan reading the raw
//! file passes a family whose only answer is its own documentation. Planting the
//! fault found it: deleting the rule and leaving the paragraph left both
//! implementations green. It is the trap three other rules here record hitting,
//! in the one that had not been told.
//!
//! **`.examples` is not a component's stylesheet.** An example sheet styles a
//! demonstration page, which is markup a consumer never adopts, so holding it to
//! a rule about shadow boundaries would be asking a page to answer for itself.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{family, stylesheets, Context, Finding, Report};

static PRINT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@media\s+print").expect("a literal pattern compiles"));

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    /* A family answers once, however many sheets it has, so the sheets are
    gathered per family before any of them is judged. */
    let mut answers: BTreeMap<String, bool> = BTreeMap::new();

    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            if sheet
                .components()
                .any(|one| one.as_os_str() == std::ffi::OsStr::new(".examples"))
            {
                continue;
            }
            let (Some(family), Ok(text)) = (family(&sheet, &tier), fs::read_to_string(&sheet))
            else {
                continue;
            };
            let answered = answers.entry(family.to_owned()).or_insert(false);
            *answered = *answered || PRINT.is_match(&COMMENT.replace_all(&text, " "));
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for (family, answered) in &answers {
        if *answered {
            checked += 1;
            continue;
        }
        findings.push(Finding {
            detail:
                "A page cannot answer for it: `@media print` does not cross a shadow \
                     boundary, which is why every family says this for itself. Hide it, flatten \
                     it, unclip it, or force its fill to print, and put the reason beside the rule."
                    .to_owned(),
            file: family.clone(),
            message: "has a stylesheet and no `@media print` rule, so it prints whatever the \
                      browser decides"
                .to_owned(),
        });
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "families saying what they do on paper",
    }
}
