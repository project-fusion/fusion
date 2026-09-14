//! An observer built once is torn down against a lifecycle that runs many times.
//!
//! **`firstUpdated` runs once for the life of an element and
//! `disconnectedCallback` runs every time it moves.** A component building an
//! observer in the first and tearing it down in the second works perfectly until
//! something reorders the DOM, and then comes back permanently dead: the
//! observer is gone, nothing rebuilds it, and the component goes on rendering.
//! No error, no warning, and the symptom is a feature that silently stopped.
//!
//! A framework moves nodes for ordinary reasons. React reorders a list, a router
//! swaps a subtree, a drag lands a panel somewhere else. So the rule is
//! symmetry: **if `disconnectedCallback` tears an observer down,
//! `connectedCallback` has to be able to build one**, directly or through a
//! method that does.
//!
//! **`observe` and not `new`, which is the whole question.** An observer that
//! exists and watches nothing is exactly as dead as one that does not exist, and
//! the two failures are reached from opposite directions: one component holds
//! its observer in a field so the object survives a disconnect and only the
//! registration is lost, another builds a fresh observer on connect and
//! registers its targets in `firstUpdated`, which never runs again. Asking for
//! `new` *or* `observe` passes the second on the `new`, which is a check
//! agreeing with the half of the code that was already fine.
//!
//! **What is deliberately not checked** is whether the rebuild is correct, or
//! guarded, or watches the same targets. It asks whether the teardown has a
//! counterpart at all, which is the failure that actually shipped.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::uncommented;
use crate::component::{sources, Context, Finding, Report};

static OBSERVER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"new\s+(?:Intersection|Mutation|Resize|Performance)Observer\b")
        .expect("a literal pattern compiles")
});

/// A call on `this`, which is how a lifecycle hook reaches its builder.
static CALLED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"this\.(\w+)\s*\(").expect("a literal pattern compiles"));

/// The body of a named method, by brace matching from its signature.
///
/// **Not preceded by a dot or a word character, or this finds the *call***.
/// `connectedCallback` containing `this.watch()` matches its own call site, and
/// the body taken is the two characters after it, so a component rebuilding
/// correctly reads as never rebuilding. The same guard is what keeps
/// `connectedCallback` from matching the tail of `disconnectedCallback`.
///
/// **The name alone, with the modifiers left out of the pattern.** A leading
/// `(?:private|override|\s)*` is how the script this comes from writes it, and
/// there it is harmless: a lookbehind that fails slides the start forward one
/// character at a time until the whitespace run begins somewhere legal.
/// `find_iter` has no such move. It yields the one leftmost match, whose start
/// sits against the previous line's last word character, and resumes *past* the
/// declaration, so the method is never found and a component doing the right
/// thing is reported for doing nothing. Three of them were, and the modifiers
/// were buying nothing in either language.
fn body(text: &str, name: &str) -> String {
    let signature = Regex::new(&format!(r"{}\s*\(", regex::escape(name)))
        .expect("a method name escapes to a literal");

    let Some(found) = signature.find_iter(text).find(|one| {
        text[..one.start()]
            .chars()
            .next_back()
            .is_none_or(|before| before != '.' && !before.is_alphanumeric() && before != '_')
    }) else {
        return String::new();
    };

    let bytes = text.as_bytes();
    let mut index = found.end() - 1;
    let mut parens = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'(' => parens += 1,
            b')' => {
                parens -= 1;
                if parens == 0 {
                    break;
                }
            }
            _ => {}
        }
        index += 1;
    }
    let Some(start) = text[index.min(text.len())..].find('{').map(|at| at + index) else {
        return String::new();
    };

    let mut depth = 0;
    let mut index = start;
    while index < bytes.len() {
        match bytes[index] {
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            }
            _ => {}
        }
        index += 1;
    }
    text[start..(index + 1).min(text.len())].to_owned()
}

/// Whether a body starts watching again, following one level of `this.method()`.
///
/// One level rather than a whole call graph, because a lifecycle hook calls its
/// builder directly, and a deeper walk would be reach nothing has asked for.
fn builds(text: &str, source: &str) -> bool {
    if source.contains(".observe(") {
        return true;
    }
    CALLED
        .captures_iter(source)
        .any(|one| body(text, &one[1]).contains(".observe("))
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
            if !OBSERVER.is_match(&text) {
                continue;
            }
            if !body(&text, "disconnectedCallback").contains(".disconnect()") {
                continue;
            }
            checked += 1;
            if builds(&text, &body(&text, "connectedCallback")) {
                continue;
            }
            findings.push(Finding {
                detail: "Rebuilding the observer is not enough on its own: it has to be \
                         registered on something."
                    .to_owned(),
                file: context.relative(&file),
                message: "disconnects an observer and never observes again, so it watches \
                          nothing after a reorder"
                    .to_owned(),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "components tearing an observer down",
    }
}
