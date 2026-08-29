//! An event that can be refused says so, and one that cannot does not claim it.
//!
//! **The gap this closes is a sentence, and a sentence is the whole interface
//! here.** A request event dispatches before it applies, so a cancelable event
//! is the consumer's only way to take a decision, and it is also the one moment
//! when `currentTarget` still holds the *previous* state. Which of those two
//! things a consumer believes they are holding is decided entirely by the
//! `@event` line, because nothing in the type says it: two `CustomEvent`
//! subclasses look identical and only one of them can be refused.
//!
//! Two ways to be wrong and both are reported:
//!
//! - **Cancelable and not saying so.** A consumer reads a notification, binds a
//!   handler to learn what happened, and reads a stale `currentTarget`. Worse, a
//!   handler calling `preventDefault()` for an unrelated reason silently freezes
//!   the component: refusing a select on a carousel stops the slide moving.
//! - **Saying so and not being cancelable.** A consumer writes a veto that never
//!   takes, which is the failure this repository keeps naming: valid code, no
//!   error, and the feature quietly not happening.
//!
//! **The event's own class is the authority rather than a list**, so a class
//! that changes its `cancelable` moves every component dispatching it in one
//! edit and this follows. The classes are found by scanning the configured
//! source rather than by naming a file, because where a library keeps them is
//! its own business.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// An event class and its body, for the `cancelable` its constructor passes.
///
/// The constructor is the only place this is decided and every one of them
/// passes the flag literally, so the parse is a scan rather than an evaluation.
static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+) extends [^{]*\{(.*?)\n\}")
        .expect("a literal pattern compiles")
});

static FLAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"cancelable:\s*(true|false)").expect("a literal pattern compiles")
});

/// `@event {SomeEvent} the-name - The description.`
///
/// **The spaces around the dash are load-bearing.** Written `\s*-\s*`, the name
/// class backtracks to find a dash inside the name itself, so a docblock
/// explaining the convention with `` `@event {HelixBeforeOpenEvent}
/// helix-before-open` `` parses as an event called `helix-before` whose
/// description begins `open`. That prose sits in the file declaring the event
/// classes, which the script this comes from never read, so the wider corpus is
/// what turned it up.
static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@event\s*\{(\w+)\}\s*([\w-]+)\s+-\s+(.+)").expect("a literal pattern compiles")
});

/// A word that tells a reader the decision is theirs.
///
/// The word is what matters rather than the phrasing, so a component is free to
/// say it in its own voice.
static SAYS_SO: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)cancelab|refus|veto").expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);

    let mut cancelable: BTreeMap<String, bool> = BTreeMap::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            for found in CLASS.captures_iter(&text) {
                let Some(flag) = FLAG.captures(&found[2]) else {
                    continue;
                };
                cancelable.insert(found[1].to_owned(), &flag[1] == "true");
            }
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");
            for found in DECLARATION.captures_iter(&text) {
                let class = &found[1];
                let event = &found[2];
                let Some(can) = cancelable.get(class) else {
                    continue;
                };
                checked += 1;
                let claims = SAYS_SO.is_match(&found[3]);
                if *can == claims {
                    continue;
                }
                findings.push(if *can {
                    Finding {
                        detail: "A consumer reads it as a notification, binds a handler to learn \
                                 what happened, and finds `currentTarget` still holding the \
                                 previous state. Say that refusing it takes the decision."
                            .to_owned(),
                        file: where_.clone(),
                        message: format!(
                            "`{event}` is cancelable and its description does not say so"
                        ),
                    }
                } else {
                    Finding {
                        detail: "A consumer's `preventDefault()` does nothing and nothing says \
                                 so."
                        .to_owned(),
                        file: where_.clone(),
                        message: format!(
                            "`{event}` describes itself as refusable and `{class}` is not \
                             cancelable"
                        ),
                    }
                });
            }
        }
    }

    Report {
        checked,
        findings,
        unit: "event declarations",
    }
}
