//! An event a component dispatches is one it declares.
//!
//! **An undeclared event reaches no manifest, no reference page and no
//! generated framework binding**, so a consumer has no way to find the channel
//! except by reading the file that sends it. The event works perfectly; nothing
//! tells anybody it exists.
//!
//! **The whole inheritance chain, not the class alone.** Half of what an element
//! emits comes from a mixin (a controller mixin holding the cancelable change
//! that is the only way to refuse one), and checking a class's own constructions
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

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::rc::Rc;
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

static EXPORT_CLAUSE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)\bexport\s+(?:type\s+)?\{(.*?)\}").expect("a literal pattern compiles")
});

static EXPORT_CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\bexport\s+(?:declare\s+)?class\s+(\w+)").expect("a literal pattern compiles")
});

static DEFINED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@customElement\(").expect("a literal pattern compiles"));

/// The names a barrel exports: those inside an `export { … }` clause, with or
/// without `from`, and those declared with `export class`. A name that is only
/// imported, or only listed in a registry, is not one of them.
fn exported_names(text: &str) -> HashSet<String> {
    let code = uncommented(text);
    let mut found = HashSet::new();
    for clause in EXPORT_CLAUSE.captures_iter(&code) {
        found.extend(WORD.find_iter(&clause[1]).map(|one| one.as_str().to_owned()));
    }
    found.extend(
        EXPORT_CLASS
            .captures_iter(&code)
            .map(|one| one[1].to_owned()),
    );
    found
}

fn barrel_exports(folder: &Path) -> HashSet<String> {
    exported_names(&fs::read_to_string(folder.join("index.ts")).unwrap_or_default())
}

/// The sets that may export a class: its own folder's barrel and its tier's.
type Barrel = Vec<Rc<HashSet<String>>>;

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

/// The event classes, every registry, and the barrels that have to export them.
///
/// Found by content: a file holding `static readonly eventName` is a class
/// module and a file holding `const registry = {…} as const` is a registry,
/// wherever either lives, which is what lets this read a library that keeps
/// its events in one folder or in a folder for each family. A class is
/// exported when the `index.ts` of its own folder or the `index.ts` of its
/// tier exports it by name, which an import or a registry entry does not, and
/// registered when any registry names it.
fn declared(
    tiers: &[PathBuf],
) -> (
    BTreeMap<String, String>,
    BTreeSet<String>,
    BTreeMap<String, Barrel>,
) {
    let mut names: BTreeMap<String, String> = BTreeMap::new();
    let mut registered: BTreeSet<String> = BTreeSet::new();
    let mut barrels: BTreeMap<String, Barrel> = BTreeMap::new();
    let mut folders: HashMap<PathBuf, Rc<HashSet<String>>> = HashMap::new();
    for tier in tiers {
        let tier_barrel = Rc::new(barrel_exports(tier));
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            if let Some(found) = REGISTRY.captures(&text) {
                registered.extend(
                    found[1]
                        .split(',')
                        .map(str::trim)
                        .filter(|one| !one.is_empty())
                        .map(str::to_owned),
                );
            }
            if !text.contains("static readonly eventName") {
                continue;
            }
            let folder_barrel = file.parent().map_or_else(Rc::default, |folder| {
                Rc::clone(
                    folders
                        .entry(folder.to_path_buf())
                        .or_insert_with(|| Rc::new(barrel_exports(folder))),
                )
            });
            for found in EVENT_CLASS.captures_iter(&text) {
                names.insert(found[1].to_owned(), found[2].to_owned());
                barrels.insert(
                    found[1].to_owned(),
                    vec![Rc::clone(&folder_barrel), Rc::clone(&tier_barrel)],
                );
            }
        }
    }

    (names, registered, barrels)
}

/// The two lists a person keeps by hand beside the classes.
fn checked_lists(
    names: &BTreeMap<String, String>,
    registered: &BTreeSet<String>,
    barrels: &BTreeMap<String, Barrel>,
    findings: &mut Vec<Finding>,
) {
    /* **Each barrel is read once, in `declared`, and looked up here.** A
    `\b{class}\b` compiled inside the loop cost a compile per event class. A
    name counts only inside an `export { … }` clause or an `export class`, so
    the import and the registry entry that every family folder also holds do
    not make a class exported. */
    for (class, event) in names {
        if !WORD.is_match(class) {
            continue;
        }
        let exported = barrels
            .get(class)
            .is_some_and(|sets| sets.iter().any(|set| set.contains(class.as_str())));
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
    let (names, registered, barrels) = declared(&tiers);

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

    checked_lists(&names, &registered, &barrels, &mut findings);

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
    tiers: &[PathBuf],
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

#[cfg(test)]
mod tests {
    use super::*;

    fn names() -> BTreeMap<String, String> {
        BTreeMap::from([
            ("HelixPinEvent".to_owned(), "helix-pin".to_owned()),
            ("HelixRejectEvent".to_owned(), "helix-reject".to_owned()),
        ])
    }

    fn messages(registered: &[&str], barrels: &[(&str, &str)]) -> Vec<String> {
        let registered = registered.iter().map(|one| (*one).to_owned()).collect();
        let barrels = barrels
            .iter()
            .map(|(class, text)| ((*class).to_owned(), vec![Rc::new(exported_names(text))]))
            .collect();
        let mut findings = Vec::new();
        checked_lists(&names(), &registered, &barrels, &mut findings);
        findings.into_iter().map(|one| one.message).collect()
    }

    #[test]
    fn a_class_in_its_own_folders_registry_and_barrel_is_whole() {
        let found = messages(
            &["HelixPinEvent", "HelixRejectEvent"],
            &[
                ("HelixPinEvent", "export { HelixPinEvent } from './events.js'"),
                ("HelixRejectEvent", "export { HelixRejectEvent }"),
            ],
        );
        assert!(found.is_empty(), "{found:?}");
    }

    #[test]
    fn a_family_class_missing_from_every_registry_is_reported() {
        let found = messages(
            &["HelixPinEvent"],
            &[
                ("HelixPinEvent", "export { HelixPinEvent }"),
                ("HelixRejectEvent", "export { HelixRejectEvent }"),
            ],
        );
        assert_eq!(found.len(), 1);
        assert!(found[0].contains("`HelixRejectEvent` is exported and is not in `registry`"));
    }

    #[test]
    fn a_class_named_by_neither_its_folder_nor_its_tier_is_not_exported() {
        let found = messages(
            &["HelixPinEvent", "HelixRejectEvent"],
            &[
                ("HelixPinEvent", "export { HelixPinEvent }"),
                ("HelixRejectEvent", "export * from ./x.js"),
            ],
        );
        assert_eq!(
            found,
            vec!["`HelixRejectEvent` is registered and is not exported"]
        );
    }

    #[test]
    fn a_class_only_imported_and_registered_is_not_exported() {
        let folder = "import { HelixRejectEvent } from './reject.js'\n\
                      const registry = { HelixRejectEvent } as const";
        let found = messages(
            &["HelixPinEvent", "HelixRejectEvent"],
            &[
                ("HelixPinEvent", "export { HelixPinEvent }"),
                ("HelixRejectEvent", folder),
            ],
        );
        assert_eq!(
            found,
            vec!["`HelixRejectEvent` is registered and is not exported"]
        );
    }

    #[test]
    fn a_class_in_a_forwarding_or_type_export_clause_is_exported() {
        let found = messages(
            &["HelixPinEvent", "HelixRejectEvent"],
            &[
                ("HelixPinEvent", "export { HelixPinEvent } from './pin.js'"),
                (
                    "HelixRejectEvent",
                    "export type {\n  HelixRejectEvent,\n} from './reject.js'",
                ),
            ],
        );
        assert!(found.is_empty(), "{found:?}");
    }
}
