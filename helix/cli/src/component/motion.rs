//! A stylesheet that moves answers `prefers-reduced-motion`.
//!
//! **A document rule cannot reach into a shadow tree**, so the global cap an
//! application writes over `*` answers for the whole page and nothing inside a
//! component. A component sheet is all shadow tree, so everything in one has to
//! be named. The one construct that crosses the boundary from outside is
//! `::part()`, which is why a document sheet is read too, and only for those.
//!
//! **A reduce rule has to repeat the selector.** Naming a looser one loses on
//! specificity and does nothing, so the two are compared as normalized selector
//! text rather than by whether some reduce block exists in the file.
//!
//! **One comma-separated selector at a time**, because a rule can be half
//! answered and legitimately so: a base-layer rule pairing a plain-element
//! recipe with a `::part()` needs only the `::part()` half named, the other
//! being light DOM the global cap already reaches.
//!
//! **And a `@starting-style` needs its ordinary rule above it.** This is the
//! shape of a transition that only works one way: identical selectors carry
//! identical specificity, so source order is the whole of the decision, and a
//! starting style written first loses even on the opening frame. The element
//! arrives already open and the exit still runs, because closing is an ordinary
//! change between two rendered states, which is what makes it hard to see. A
//! starting style with no ordinary twin is not flagged: winning on specificity
//! is the other legitimate way to do this.
//!
//! **What this deliberately does not check** is whether a component that
//! transitions `display` with `allow-discrete` has a starting style at all. That
//! looks like the same bug and is not: a component that rests closed and opens
//! on an attribute written after the element is rendered changes between two
//! rendered states and needs no starting value. Which of the two shapes a
//! component wants is its own call; that it does not half-write the one it
//! picked is what this catches.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// `transition` and `animation` both: a transition on `opacity` moves a reader
/// exactly as much as an animation does, and both are capped by the rule that
/// does not reach here.
static MOVES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*(animation|transition)(-duration|-name)?\s*:")
        .expect("a literal pattern compiles")
});

/// A transition carrying only `none` is a component switching motion off, which
/// is the answer rather than the question.
static ONLY_NONE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*(animation|transition)[^:]*:\s*none\s*;?\s*$")
        .expect("a literal pattern compiles")
});

static REDUCE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@media[^{]*prefers-reduced-motion:\s*reduce").expect("a literal pattern compiles")
});

static STARTING: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@starting-style").expect("a literal pattern compiles"));

struct Rule {
    at: usize,
    body: String,
    reduced: bool,
    selector: String,
    starting: bool,
}

/// Every rule in a sheet, brace-counted rather than pattern-matched.
///
/// A nested `@media` or `@supports` is walked into rather than swallowed, and a
/// rule inside a reduce block is marked as such however deeply it sits.
fn rules(css: &str) -> Vec<Rule> {
    let bytes = css.as_bytes();
    let mut found = Vec::new();
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
                if !head.starts_with('@') {
                    found.push(Rule {
                        at: start,
                        body: css[start..at].to_owned(),
                        reduced: stack.iter().any(|outer| REDUCE.is_match(outer)),
                        selector: head.split_whitespace().collect::<Vec<&str>>().join(" "),
                        starting: stack.iter().any(|outer| STARTING.is_match(outer)),
                    });
                }
                start = at + 1;
            }
            _ => {}
        }
    }
    found
}

/// One selector per comma, normalized so the two sides compare.
fn parts(selector: &str) -> Vec<String> {
    selector
        .split(',')
        .map(|one| one.split_whitespace().collect::<Vec<&str>>().join(" "))
        .filter(|one| !one.is_empty())
        .collect()
}

pub fn run(context: &Context) -> Report {
    let mut roots: Vec<std::path::PathBuf> = context.settings.roots(&context.root);
    for one in &context.settings.documents {
        let path = context.root.join(one);
        if path.is_dir() && !roots.contains(&path) {
            roots.push(path);
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;

    for root in &roots {
        /* A document sheet answers for the whole page through its global cap, so
        only what it writes through `::part()` has to be named here. */
        let document = context
            .settings
            .documents
            .iter()
            .any(|one| root.ends_with(one));
        let mut sheets = Vec::new();
        stylesheets(root, &mut sheets);
        for sheet in sheets {
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            let css = COMMENT.replace_all(&raw, "");
            let parsed = rules(&css);
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");

            /* What the sheet has already answered for, compared as normalized
            selector text: a reduce rule naming the same selector carries the
            same specificity and therefore actually wins. */
            let answered: BTreeSet<String> = parsed
                .iter()
                .filter(|rule| rule.reduced)
                .flat_map(|rule| parts(&rule.selector))
                .collect();

            for rule in &parsed {
                if rule.reduced {
                    continue;
                }
                let moves = rule
                    .body
                    .lines()
                    .any(|line| MOVES.is_match(line) && !ONLY_NONE.is_match(line));
                if !moves {
                    continue;
                }
                checked += 1;
                let unanswered: Vec<String> = parts(&rule.selector)
                    .into_iter()
                    .filter(|one| !answered.contains(one) && (!document || one.contains("::part(")))
                    .collect();
                if unanswered.is_empty() {
                    continue;
                }
                findings.push(Finding {
                    detail: "A reduce rule has to repeat the selector: one written looser loses \
                             on specificity and does nothing."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!(
                        "`{}` moves and is not named in a `@media (prefers-reduced-motion: \
                         reduce)` block",
                        unanswered.join(", ")
                    ),
                });
            }

            order(&parsed, &where_, &mut findings);
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "rules that move",
    }
}

/// A `@starting-style` sitting above the ordinary rule of its own selector.
fn order(parsed: &[Rule], where_: &str, findings: &mut Vec<Finding>) {
    if !parsed.iter().any(|rule| rule.starting) {
        return;
    }
    /* Earliest ordinary appearance per selector, which is the one a starting
    style has to sit below. */
    let mut ordinary: BTreeMap<String, usize> = BTreeMap::new();
    for rule in parsed {
        if rule.starting || rule.reduced {
            continue;
        }
        for one in parts(&rule.selector) {
            ordinary.entry(one).or_insert(rule.at);
        }
    }
    for rule in parsed.iter().filter(|rule| rule.starting) {
        for one in parts(&rule.selector) {
            if ordinary.get(&one).is_none_or(|settled| *settled <= rule.at) {
                continue;
            }
            findings.push(Finding {
                detail: "Equal specificity, so source order decides and the starting value loses \
                         the one frame it exists for: the element arrives already open and only \
                         the exit animates. Move it below."
                    .to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "the `@starting-style` for `{one}` sits above the ordinary rule of the same \
                     selector"
                ),
            });
        }
    }
}
