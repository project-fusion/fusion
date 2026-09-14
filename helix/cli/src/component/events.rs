//! An event a component dispatches is one it declares.
//!
//! **An undeclared event reaches no manifest, no reference page and no
//! generated framework binding**, so a consumer has no way to find the channel
//! except by reading the file that sends it. The event works perfectly; nothing
//! tells anybody it exists.
//!
//! **The whole inheritance chain, not the class alone.** Half of what an element
//! emits comes from a mixin — a controller mixin holding the cancelable change
//! that is the only way to refuse one — and checking a class's own constructions
//! sees none of it.
//!
//! **Any construction, not only one inside a `dispatchEvent`.** Half of them are
//! built in a factory the controlled-change utility dispatches for you, so
//! matching the dispatch site misses every one. These classes exist to be
//! dispatched and are constructed nowhere else, which is what makes the looser
//! match the accurate one. Hand-rolled `new Event(...)` and `new CustomEvent(...)`
//! are held to the same rule: dispatched raw, an event bubbles and composes and
//! a consumer can listen for it while appearing nowhere at all.
//!
//! **One direction only, and the other was tried.** "Declared and never
//! dispatched here" has two legitimate shapes and no way to tell them from a
//! fault: a parent declares the bubbling event its own children send, and a form
//! control declares the native event it relays. Enforcing it flagged fifteen of
//! those and nothing else.
//!
//! **Three lists a person keeps by hand, each failing one step further away.** A
//! class left out of the registry means the element event map does not carry it,
//! so `addEventListener` types it as a bare `Event` and a consumer reads the
//! payload through a cast. A class left out of the barrel fails one package
//! away: the package declaring it compiles and the package told to dispatch it
//! cannot import it. And a class nobody dispatches at all satisfies both halves
//! above by being absent from both, while the name still type-checks against
//! `addEventListener` and the handler is never called.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::uncommented;
use crate::component::{sources, Context, Finding, Report};

static EVENT_CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w*Event).*?static readonly eventName = '([a-z-]+)'")
        .expect("a literal pattern compiles")
});

static REGISTRY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)const registry = \{(.*?)\} as const").expect("a literal pattern compiles")
});

static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+)(?: extends (.*?))?\s*\{")
        .expect("a literal pattern compiles")
});

static MIXIN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export const (Mixin\w+)\s*=").expect("a literal pattern compiles")
});

static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@event\s+\{(\w+)\}\s+([\w-]+)").expect("a literal pattern compiles")
});

static CONSTRUCTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"new (\w*Event)\s*\(").expect("a literal pattern compiles"));

static WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\w+)").expect("a literal pattern compiles"));

static DEFINED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@customElement\(").expect("a literal pattern compiles"));

struct Component {
    bases: Vec<String>,
    declared: Vec<String>,
    dispatched: Vec<String>,
    /// Only a registered element publishes anything: a mixin and a base class
    /// are where events come from, and the element is where they are promised.
    element: bool,
    path: String,
}

fn inherited(
    components: &BTreeMap<String, Component>,
    name: &str,
    pick: fn(&Component) -> &Vec<String>,
    seen: &mut BTreeSet<String>,
    found: &mut BTreeSet<String>,
) {
    let Some(entry) = components.get(name) else {
        return;
    };
    if !seen.insert(name.to_owned()) {
        return;
    }
    found.extend(pick(entry).iter().cloned());
    for base in &entry.bases {
        inherited(components, base, pick, seen, found);
    }
}

/// The event classes, the registry, and the barrel that has to export them.
///
/// Found by content: a file holding `static readonly eventName` is the one,
/// wherever it lives, which is what lets this read a library that keeps them
/// somewhere else.
fn declared(tiers: &[std::path::PathBuf]) -> (BTreeMap<String, String>, BTreeSet<String>, String) {
    let mut names: BTreeMap<String, String> = BTreeMap::new();
    let mut registered: BTreeSet<String> = BTreeSet::new();
    let mut declaring: Option<std::path::PathBuf> = None;
    for tier in tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            if !text.contains("static readonly eventName") {
                continue;
            }
            for found in EVENT_CLASS.captures_iter(&text) {
                names.insert(found[1].to_owned(), found[2].to_owned());
            }
            if let Some(found) = REGISTRY.captures(&text) {
                registered.extend(
                    found[1]
                        .split(',')
                        .map(str::trim)
                        .filter(|one| !one.is_empty())
                        .map(str::to_owned),
                );
                declaring = Some(tier.clone());
            }
        }
    }

    let barrel = declaring
        .map(|tier| fs::read_to_string(tier.join("index.ts")).unwrap_or_default())
        .unwrap_or_default();
    (names, registered, barrel)
}

/// The two lists a person keeps by hand beside the classes.
fn checked_lists(
    names: &BTreeMap<String, String>,
    registered: &BTreeSet<String>,
    barrel: &str,
    findings: &mut Vec<Finding>,
) {
    for (class, event) in names {
        if !WORD.is_match(class) {
            continue;
        }
        let exported = Regex::new(&format!(r"\b{}\b", regex::escape(class)))
            .is_ok_and(|one| one.is_match(barrel));
        if !exported {
            findings.push(Finding {
                detail: "No other package can import it, and the one that dispatches it cannot \
                         name its type."
                    .to_owned(),
                file: "the package barrel".to_owned(),
                message: format!("`{class}` is registered and is not exported"),
            });
        }
        if !registered.contains(class) {
            findings.push(Finding {
                detail: "`addEventListener` types it as a bare `Event`, nothing fails, and a \
                         consumer reads the payload through a cast."
                    .to_owned(),
                file: "the event registry".to_owned(),
                message: format!(
                    "`{class}` is exported and is not in `registry`, so the element event map \
                     does not carry `{event}`"
                ),
            });
        }
    }
}

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);
    let (names, registered, barrel) = declared(&tiers);

    let mut findings = Vec::new();
    if names.is_empty() {
        /* Loud rather than empty: with no names every construction resolves to
        nothing and the rule finds nothing wrong because it can see nothing at
        all, which is total failure and total success sharing one output. */
        return Report {
            checked: 0,
            findings,
            notes: Vec::new(),
            unit: "declared events",
        };
    }

    checked_lists(&names, &registered, &barrel, &mut findings);

    /* The hand-rolled shape, held to the same rule. The prefix is the library's
    own, taken from the names it declares rather than assumed. */
    let prefix = names
        .values()
        .next()
        .and_then(|one| one.split_once('-'))
        .map_or(String::new(), |(head, _)| format!("{head}-"));
    let raw = Regex::new(&format!(
        r#"new (?:Custom)?Event(?:<[^>]*>)?\s*\(\s*['"`]({}[\w-]+)['"`]"#,
        regex::escape(&prefix)
    ))
    .expect("a prefix escapes to a literal");

    let (components, every_dispatch) = survey(context, &tiers, &names, &raw);
    judge(&components, &names, &every_dispatch, &mut findings);

    Report {
        checked: components
            .values()
            .filter(|one| one.element)
            .map(|one| one.declared.len())
            .sum(),
        findings,
        notes: Vec::new(),
        unit: "declared events",
    }
}

/// Every class and mixin, what it declares, and what anything constructs.
fn survey(
    context: &Context,
    tiers: &[std::path::PathBuf],
    names: &BTreeMap<String, String>,
    raw: &Regex,
) -> (BTreeMap<String, Component>, BTreeSet<String>) {
    let mut components: BTreeMap<String, Component> = BTreeMap::new();
    let mut every_dispatch: BTreeSet<String> = BTreeSet::new();
    for tier in tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            for found in CONSTRUCTED.captures_iter(&text) {
                if let Some(event) = names.get(&found[1]) {
                    every_dispatch.insert(event.clone());
                }
            }
            if text.contains("static readonly eventName") {
                continue;
            }
            let declaration = CLASS.captures(&text);
            let mixin = MIXIN.captures(&text);
            let (name, base) = match (&declaration, &mixin) {
                (Some(one), _) => (
                    one[1].to_owned(),
                    one.get(2).map_or("", |two| two.as_str()).to_owned(),
                ),
                (None, Some(one)) => (one[1].to_owned(), String::new()),
                (None, None) => continue,
            };
            let code = uncommented(&text);
            let mut dispatched: Vec<String> = CONSTRUCTED
                .captures_iter(&code)
                .filter_map(|one| names.get(&one[1]).cloned())
                .collect();
            dispatched.extend(raw.captures_iter(&code).map(|one| one[1].to_owned()));
            components.insert(
                name,
                Component {
                    bases: WORD
                        .captures_iter(&base)
                        .map(|one| one[1].to_owned())
                        .collect(),
                    declared: DECLARED
                        .captures_iter(&text)
                        .map(|one| one[2].to_owned())
                        .collect(),
                    dispatched,
                    element: DEFINED.is_match(&text),
                    path: context.relative(&file),
                },
            );
        }
    }

    (components, every_dispatch)
}

/// Every dispatch with no declaration, and every class with no dispatch.
fn judge(
    components: &BTreeMap<String, Component>,
    names: &BTreeMap<String, String>,
    every_dispatch: &BTreeSet<String>,
    findings: &mut Vec<Finding>,
) {
    for (name, entry) in components {
        if !entry.element {
            continue;
        }
        let mut declared = BTreeSet::new();
        inherited(
            components,
            name,
            |one| &one.declared,
            &mut BTreeSet::new(),
            &mut declared,
        );
        let mut dispatched = BTreeSet::new();
        inherited(
            components,
            name,
            |one| &one.dispatched,
            &mut BTreeSet::new(),
            &mut dispatched,
        );
        for event in &dispatched {
            if declared.contains(event) {
                continue;
            }
            findings.push(Finding {
                detail: "It reaches no manifest, no reference page and no generated binding, so \
                         a consumer has no way to find the channel except by reading this file."
                    .to_owned(),
                file: entry.path.clone(),
                message: format!("{name} dispatches `{event}` and no `@event` declares it"),
            });
        }
    }

    /* A class nobody dispatches, which neither half above can see: it satisfies
    both by being absent from both. Every source file rather than the component
    classes, because a controller is not a component and dispatches all the same. */
    for (class, event) in names {
        if every_dispatch.contains(event) {
            continue;
        }
        findings.push(Finding {
            detail: "It is exported and in the element event map, so the name type-checks \
                     against `addEventListener` and the handler is never called. Delete it, or \
                     dispatch it."
                .to_owned(),
            file: "the event classes".to_owned(),
            message: format!("`{class}` declares `{event}` and no component constructs it"),
        });
    }
}
