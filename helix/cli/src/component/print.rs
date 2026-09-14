//! Every family with a stylesheet says what it does on paper, and says something.
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
//! The answers are five, and each family's own sheet carries the reason. Chrome
//! hides, because a printed page has no elsewhere to go and a spinner is a
//! promise nothing will keep. Surfaces flatten, because a lift is a shadow and a
//! printer turns a shadow into a gray smear. Boxes that scroll unclip, because a
//! box that hides is a box that loses content on paper. Anything whose fill
//! *is* the information forces itself to print: a chart with no fill is a frame,
//! and a ticked checkbox whose tick is a background prints as an empty box,
//! which is a document saying the opposite of the truth. And a family with none
//! of those says so, with `print-color-adjust: economy`: the browser's own
//! answer, restated, so that "prints as it is" is a sentence rather than a rule
//! somebody forgot to write. It is the fourth spelling the focus-ring registry
//! holds under `none`, for the same reason.
//!
//! **A flatten or an unclip resets a property, so the property has to be set.**
//! Fifty sheets carried `box-shadow: none` on paper and named `box-shadow`
//! nowhere else, which is a family answering the question with a sentence that
//! means nothing: the printer was never going to smear a shadow the component
//! never drew. Measured 14 Sep 2026, and every one read as a family that had
//! thought about paper. So a declaration that is neither a hide nor a
//! `print-color-adjust` has to name a property, or a longhand or shorthand of
//! one, that the family's sheets set outside the print block.
//!
//! **Comments are blanked, which is a departure from the script this comes
//! from.** Every converted stylesheet explains the policy above the rule, and
//! the sentence explaining it names `@media print`, so a scan reading the raw
//! file passes a family whose only answer is its own documentation. Planting the
//! fault found it: deleting the rule and leaving the paragraph left both
//! implementations green. It is the trap three other rules here record hitting,
//! in the one that had not been told.
//!
//! **`.examples` is not a component's stylesheet, and `shared/` is not a
//! family.** An example sheet styles a demonstration page, which is markup a
//! consumer never adopts, so holding it to a rule about shadow boundaries would
//! be asking a page to answer for itself. A shared sheet answers through every
//! family that composes it, and is read as part of each.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::COMMENT;
use crate::component::{family, stylesheets, Context, Finding, Report};

/// The answers that need no property behind them, each with what it says.
///
/// Anything else written on paper is a flatten or an unclip, and those answer
/// for a property the family sets: see [`flattens`]. `white-space: pre-wrap` is
/// the one unclip that answers for the UA rather than the family, a `<pre>`
/// arriving with `pre` already on it and running its long lines off the page.
const ANSWERS: [(&str, &str, &str); 4] = [
    (
        "display",
        "none",
        "hides, because a printed page has no elsewhere to go",
    ),
    (
        "print-color-adjust",
        "exact",
        "forces its fill to print, because the fill is the information",
    ),
    (
        "print-color-adjust",
        "economy",
        "prints as it is: nothing here lifts, scrolls or carries its state in a fill",
    ),
    (
        "white-space",
        "pre-wrap",
        "unclips preformatted text the UA would run off the page",
    ),
];

/// Properties that are instructions to the printer rather than resets of the
/// page, so they answer for themselves: where a page may break, and what a
/// pseudo-element adds beside a link or a date once there is no hover to reveal
/// it.
const OWN: [&str; 9] = [
    "break-after",
    "break-before",
    "break-inside",
    "content",
    "orphans",
    "page-break-after",
    "page-break-before",
    "page-break-inside",
    "widows",
];

static PRINT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^@media\s+print\b").expect("a literal pattern compiles"));

/// One declaration written on paper, and where.
struct Printed {
    property: String,
    selector: String,
    value: String,
    where_: String,
}

/// What one family says on paper, and what it sets off it.
#[derive(Default)]
struct Answer {
    answered: bool,
    printed: Vec<Printed>,
    set: BTreeSet<String>,
}

/// Every declaration in a sheet, brace-counted, sorted into paper and page.
///
/// A hand walk rather than the rule pattern the other checks use, because a
/// print block holds rules of its own and the pattern cannot see a block inside
/// a block.
fn read(css: &str, where_: &str, into: &mut Answer) {
    let bytes = css.as_bytes();
    let mut stack: Vec<String> = Vec::new();
    let mut start = 0;
    for at in 0..bytes.len() {
        match bytes[at] {
            b'{' => {
                stack.push(css[start..at].trim().to_owned());
                start = at + 1;
            }
            b'}' => {
                let head = stack.pop().unwrap_or_default();
                let printing = stack
                    .iter()
                    .chain(std::iter::once(&head))
                    .any(|one| PRINT.is_match(one));
                if printing {
                    into.answered = true;
                }
                if !head.starts_with('@') {
                    for declaration in css[start..at].split(';') {
                        let Some((property, value)) = declaration.split_once(':') else {
                            continue;
                        };
                        let property = property.trim().to_owned();
                        if property.is_empty() || property.starts_with("--") {
                            continue;
                        }
                        if printing {
                            into.printed.push(Printed {
                                property,
                                selector: head.split_whitespace().collect::<Vec<&str>>().join(" "),
                                value: value.split_whitespace().collect::<Vec<&str>>().join(" "),
                                where_: where_.to_owned(),
                            });
                        } else {
                            into.set.insert(property);
                        }
                    }
                }
                start = at + 1;
            }
            _ => {}
        }
    }
}

/// Whether a property reset on paper is one the family sets on the page.
///
/// A longhand answers for its shorthand and a shorthand for its longhands:
/// `overflow-x: visible` unclips a box the family gave `overflow: auto`, and
/// `background-color: transparent` flattens a fill written as `background`.
fn flattens(reset: &str, set: &BTreeSet<String>) -> bool {
    set.iter().any(|one| {
        one == reset
            || one.starts_with(&format!("{reset}-"))
            || reset.starts_with(&format!("{one}-"))
    })
}

pub fn run(context: &Context) -> Report {
    /* A family answers once, however many sheets it has, so the sheets are
    gathered per family before any of them is judged. */
    let mut answers: BTreeMap<String, Answer> = BTreeMap::new();

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
            if family == "shared" {
                continue;
            }
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");
            let answer = answers.entry(family.to_owned()).or_default();
            read(&COMMENT.replace_all(&text, " "), &where_, answer);
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for (family, answer) in &answers {
        if !answer.answered {
            findings.push(Finding {
                detail: "A page cannot answer for it: `@media print` does not cross a shadow \
                         boundary, which is why every family says this for itself. Hide it, \
                         flatten it, unclip it, force its fill to print, or say `print-color-adjust: \
                         economy` for a family that does none of those, and put the reason beside \
                         the rule."
                    .to_owned(),
                file: family.clone(),
                message: "has a stylesheet and no `@media print` rule, so it prints whatever the \
                          browser decides"
                    .to_owned(),
            });
            continue;
        }
        checked += 1;
        for printed in &answer.printed {
            let registered = ANSWERS.iter().any(|(property, value, _)| {
                printed.property == *property && printed.value == *value
            });
            if registered
                || OWN.contains(&printed.property.as_str())
                || flattens(&printed.property, &answer.set)
            {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "A reset on paper answers for a property the family draws on the page, and \
                     `{}` names one it never sets, so this flattens nothing and reads as an answer. \
                     Reset a property the sheets set, or give one of the registered answers: {}.",
                    printed.property,
                    ANSWERS
                        .iter()
                        .map(|(property, value, why)| format!("`{property}: {value}` {why}"))
                        .collect::<Vec<String>>()
                        .join("; ")
                ),
                file: printed.where_.clone(),
                message: format!(
                    "`{}` prints `{}: {}`, and nothing in `{family}` sets `{}`",
                    printed.selector, printed.property, printed.value, printed.property
                ),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "families saying what they do on paper",
    }
}
