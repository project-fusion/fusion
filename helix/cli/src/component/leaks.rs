//! A subscription an element takes out does not outlive the element.
//!
//! **Anything the element does not own outlives it**, and a handler on a removed
//! element is a write to a tree nobody is looking at. A timer parked on a field
//! is worse: the closure holds the element for as long as the timer has left to
//! run, so the element cannot be collected at all.
//!
//! **Events the element owns by construction are not this.** A `slotchange` or
//! an `input` is fired by something inside the element's own shadow root, which
//! is discarded with it, so listening without removing is the ordinary way a
//! component hears from its own markup rather than a leak.
//!
//! **What this deliberately cannot see.** Whether an add runs more often than
//! its remove is a run-time argument that no count of source text can make, and
//! a `removeEventListener` handed a different function object than the one added
//! — which is every inline arrow — removes nothing while reading as if it does.
//! Both are why the fix is a field holding what is currently subscribed rather
//! than a matching pair of calls.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// Fired by something inside the element's own shadow root.
const OWNED: [&str; 6] = [
    "animationend",
    "change",
    "input",
    "invalid",
    "slotchange",
    "transitionend",
];

static ADDED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"addEventListener\(\s*'([a-zA-Z-]+)'").expect("a literal pattern compiles")
});

static REMOVED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"removeEventListener\(\s*'([a-zA-Z-]+)'").expect("a literal pattern compiles")
});

static PARKED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"this\.(\w+)\s*=\s*setTimeout\(").expect("a literal pattern compiles")
});

static BLOCK_COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static LINE_COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"//[^\n]*").expect("a literal pattern compiles"));

/// Comments blanked, newlines kept so a line number still names its line.
///
/// A class doc is full of prose about listeners the file does not add, which is
/// the trap every rule here records hitting.
fn uncommented(text: &str) -> String {
    let blank = |found: &regex::Captures| -> String {
        found[0]
            .chars()
            .map(|one| if one == '\n' { '\n' } else { ' ' })
            .collect()
    };
    let once = BLOCK_COMMENT.replace_all(text, &blank);
    LINE_COMMENT.replace_all(&once, &blank).into_owned()
}

fn line_of(text: &str, at: usize) -> usize {
    text[..at].matches('\n').count() + 1
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
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");

            let released: BTreeSet<&str> = REMOVED
                .captures_iter(&text)
                .map(|one| one.get(1).expect("the name always matches").as_str())
                .collect();
            let mut seen: BTreeSet<&str> = BTreeSet::new();
            for found in ADDED.captures_iter(&text) {
                let event = found.get(1).expect("the name always matches").as_str();
                if !seen.insert(event) {
                    continue;
                }
                checked += 1;
                if OWNED.contains(&event) || released.contains(event) {
                    continue;
                }
                /* `once: true` takes itself off, which is the platform doing
                the work. */
                let clears = Regex::new(&format!(
                    r"addEventListener\(\s*'{}'[^;]*?once:\s*true",
                    regex::escape(event)
                ))
                .is_ok_and(|one| one.is_match(&text));
                if clears {
                    continue;
                }
                let at = found.get(0).expect("group zero always matches").start();
                findings.push(Finding {
                    detail: "Anything the element does not own outlives it, and a handler on a \
                             removed element is a write to a tree nobody is looking at."
                        .to_owned(),
                    file: format!("{where_}:{}", line_of(&text, at)),
                    message: format!("listens for `{event}` and never stops"),
                });
            }

            /* A timer parked on a field, and nothing that clears that field. */
            for found in PARKED.captures_iter(&text) {
                let field = found.get(1).expect("the name always matches").as_str();
                let cleared = Regex::new(&format!(
                    r"clearTimeout\(\s*this\.{}\b",
                    regex::escape(field)
                ))
                .is_ok_and(|one| one.is_match(&text));
                if cleared {
                    continue;
                }
                let at = found.get(0).expect("group zero always matches").start();
                findings.push(Finding {
                    detail: "The closure holds the element for as long as the timer has left to \
                             run."
                        .to_owned(),
                    file: format!("{where_}:{}", line_of(&text, at)),
                    message: format!("parks a timer on `this.{field}` and never clears it"),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "listened-for events",
    }
}
