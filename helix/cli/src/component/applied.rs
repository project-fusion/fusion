//! An event only a mixin sends is declared only by a component that applies it.
//!
//! **`events` runs one direction on purpose, and this is the sliver of the other
//! one that is safe to run.** "Declared and never dispatched here" has two
//! legitimate shapes, a parent declaring the bubbling event its children send
//! and a control relaying a native one, and enforcing it flagged fifteen of
//! those and nothing else. So a declaration nothing sends is ordinarily
//! unjudgeable.
//!
//! It stops being unjudgeable when **every construction of the event in the
//! whole library sits inside a mixin or a controller**. Then there is no child
//! to relay it from and no native element to relay it out of: the only way to
//! emit it is to apply the thing that emits it, and a component that declares it
//! without doing so has published a channel that can never carry anything. Both
//! legitimate shapes are excluded by that test rather than exempted from it,
//! which is what makes this one checkable where the general rule is not.
//!
//! **Found in the library rather than named.** `toggle` is announced once, by
//! the open controller, for the sixteen families whose open state it owns;
//! `Tour` declared it and applies no controller, its `open` being a plain
//! property, so `ontoggle` on a tour had never fired. The shipped events example
//! bound a listener to it and the row could not appear, which is how far a
//! promise like this travels before anything notices.
//!
//! **An event nothing at all constructs is not this rule's.** `load`, `error`,
//! `close`, `play`, `pause` and `ended` are relayed through one helper that
//! builds whatever name it was handed, so the library constructs no literal for
//! any of them and they are outside the test above rather than inside it and
//! forgiven.
//!
//! **One of the two shapes survives the test after all, and it is the parent's.**
//! "No child to relay it from" holds only while no element applies the mixin. An
//! element that applies one is exactly such a child, so a family whose row is
//! dismissible has a root that legitimately declares `helix-dismiss`: Toast,
//! Notifications and Filter Input all do, and all three are right. So a family
//! member's events count for every element in that family.
//!
//! **Gated on bubbling, which is what keeps the teeth.** A parent can only
//! declare what reaches it, and only a bubbling composed event does.
//! `helix-dismiss` is `bubbles: true`; the `toggle` the open controller sends is
//! `bubbles: false`, matching the platform's own, so Tour declaring it with no
//! controller anywhere in its family is still the fault this rule was written
//! for. Without the gate that case would come back.

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

static BUILT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"new (\w*Event)\s*\(").expect("a literal pattern compiles"));

/// `new Event('toggle', …)`, whatever the name.
///
/// **Any name rather than the library's own prefix**, which is what `events`
/// matches and is exactly wrong here: the one event this rule exists for carries
/// the platform's name on purpose, so that a consumer arriving from `<details>`
/// reads the same two words.
static RAW: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"new (?:Custom)?Event(?:<[^>]*>)?\s*\(\s*['"`]([a-z][\w-]*)['"`]"#)
        .expect("a literal pattern compiles")
});

static WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\w+)").expect("a literal pattern compiles"));

static DEFINED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@customElement\(").expect("a literal pattern compiles"));

/// A raw construction and the options it was given, for reading `bubbles`.
///
/// `[^)]*` is enough because an options object carries no parentheses of its
/// own: it stops at the call's own closing paren every time.
static RAW_OPTIONS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"new (?:Custom)?Event(?:<[^>]*>)?\s*\(\s*['"`]([a-z][\w-]*)['"`]([^)]*)"#)
        .expect("a literal pattern compiles")
});

/// The family a component file belongs to: its folder's parent's name.
///
/// The same unit `decided` takes, and for the same reason: a root and the rows
/// it holds are one component from a consumer's side, so what one of them sends
/// is what the other may promise.
fn owner(file: &std::path::Path) -> Option<String> {
    Some(file.parent()?.parent()?.file_name()?.to_str()?.to_owned())
}

/// Every event name in the library that bubbles, by either construction.
fn bubbling(tiers: &[std::path::PathBuf], names: &BTreeMap<String, String>) -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    for tier in tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            for one in RAW_OPTIONS.captures_iter(&text) {
                if one[2].contains("bubbles: true") {
                    found.insert(one[1].to_owned());
                }
            }
            if !text.contains("static readonly eventName") {
                continue;
            }
            /* A class's own constructor, read from its declaration to the next
            one: the options are in the `super()` call and nowhere else. */
            for one in EVENT_CLASS.captures_iter(&text) {
                let Some(whole) = one.get(0) else {
                    continue;
                };
                let rest = &text[whole.end()..];
                let body = rest.split("export class").next().unwrap_or(rest);
                if body.contains("bubbles: true") {
                    if let Some(event) = names.get(&one[1]) {
                        found.insert(event.clone());
                    }
                }
            }
        }
    }
    found
}

/// One class or mixin: what it is built on, what it emits, what it promises.
struct Unit {
    bases: Vec<String>,
    built: BTreeSet<String>,
    declared: Vec<String>,
    element: bool,
    family: Option<String>,
    path: String,
}

/// Every event reachable from a unit, through the classes and mixins it is made of.
fn reachable(
    units: &BTreeMap<String, Unit>,
    name: &str,
    seen: &mut BTreeSet<String>,
) -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    let Some(unit) = units.get(name) else {
        return found;
    };
    if !seen.insert(name.to_owned()) {
        return found;
    }
    found.extend(unit.built.iter().cloned());
    for base in &unit.bases {
        found.extend(reachable(units, base, seen));
    }
    found
}

/// Every event class in the library, keyed to the name it carries.
///
/// Found by content rather than by path, the way `events` finds them: a file
/// holding `static readonly eventName` is the one, wherever a library keeps it.
fn classes(tiers: &[std::path::PathBuf]) -> BTreeMap<String, String> {
    let mut names = BTreeMap::new();
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
        }
    }
    names
}

/// Every class and mixin, what it is built on, what it emits and what it promises.
fn survey(
    context: &Context,
    tiers: &[std::path::PathBuf],
    names: &BTreeMap<String, String>,
) -> BTreeMap<String, Unit> {
    let mut units: BTreeMap<String, Unit> = BTreeMap::new();
    for tier in tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
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
            let mut built: BTreeSet<String> = BUILT
                .captures_iter(&code)
                .filter_map(|one| names.get(&one[1]).cloned())
                .collect();
            built.extend(RAW.captures_iter(&code).map(|one| one[1].to_owned()));
            units.insert(
                name,
                Unit {
                    bases: WORD
                        .captures_iter(&base)
                        .map(|one| one[1].to_owned())
                        .collect(),
                    built,
                    declared: DECLARED
                        .captures_iter(&text)
                        .map(|one| one[2].to_owned())
                        .collect(),
                    element: DEFINED.is_match(&text),
                    family: owner(&file),
                    path: context.relative(&file),
                },
            );
        }
    }
    units
}

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);
    let names = classes(&tiers);
    if names.is_empty() {
        /* Loud rather than empty: with no names every construction resolves to
        nothing, and finding nothing wrong because nothing can be seen is total
        failure and total success sharing one output. */
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "events only a mixin sends",
        };
    }

    let units = survey(context, &tiers, &names);

    /* An event every one of whose builders is a mixin or a controller. Empty is
    not the same as "nobody builds it": a name with no literal anywhere is
    relayed rather than constructed, and is not this rule's to judge. */
    let mut builders: BTreeMap<String, Vec<bool>> = BTreeMap::new();
    for unit in units.values() {
        for event in &unit.built {
            builders
                .entry(event.clone())
                .or_default()
                .push(unit.element);
        }
    }
    let grafted: BTreeSet<&String> = builders
        .iter()
        .filter(|(_, where_)| !where_.is_empty() && where_.iter().all(|element| !element))
        .map(|(event, _)| event)
        .collect();

    let bubbles = bubbling(&tiers, &names);

    /* Every element of a family, so a root can be asked what its own rows send.
    Elements only: a mixin belongs to whoever applies it rather than to the
    folder it happens to sit in. */
    let mut kin: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for (name, unit) in &units {
        if let (true, Some(family)) = (unit.element, unit.family.as_ref()) {
            kin.entry(family.clone()).or_default().push(name.clone());
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for (name, unit) in &units {
        if !unit.element {
            continue;
        }
        let mut emits = reachable(&units, name, &mut BTreeSet::new());
        /* What a family member sends, for the events that can reach one. See the
        note at the top: a bubbling event a row sends is one its root may
        promise, and a `bubbles: false` one is not. */
        for sibling in unit
            .family
            .as_ref()
            .and_then(|one| kin.get(one))
            .into_iter()
            .flatten()
        {
            if sibling == name {
                continue;
            }
            for event in reachable(&units, sibling, &mut BTreeSet::new()) {
                if bubbles.contains(&event) {
                    emits.insert(event);
                }
            }
        }
        for event in &unit.declared {
            if !grafted.contains(event) {
                continue;
            }
            checked += 1;
            if emits.contains(event) {
                continue;
            }
            findings.push(Finding {
                detail: "Nothing outside a mixin builds it, so applying one is the only way to \
                         send it: a consumer binding a handler here is bound to a channel that \
                         can never carry anything."
                    .to_owned(),
                file: unit.path.clone(),
                message: format!("{name} declares `{event}` and applies nothing that sends it"),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "events only a mixin sends",
    }
}
