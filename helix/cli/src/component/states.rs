//! A custom state an element records is documented, and a documented one is
//! recorded.
//!
//! **A custom state is API a stylesheet selects on**, `helix-select:state(open)`,
//! and it is invisible everywhere else: it is in no attribute, no property and
//! no DOM a reader can inspect, so the manifest is the only place a consumer
//! learns it exists. `Select` recorded `open` for its caret to turn on and
//! nothing said so, and the reader who wrote its headless example concluded it
//! had no open state. The two failures are the ones `parts` has: a state
//! nothing documents is one a later edit removes without knowing it was API,
//! and a documented one nothing records is a selector that matches nothing.
//!
//! **Recorded through the whole chain, documented through classes only.** A
//! mixin records for whatever applies it, so `MixinControllerOpen`'s `open` is
//! every open element's. Its documentation does not travel the same way: the
//! analyzer reads `@cssstate` off a class and carries it to subclasses, and a
//! class-level tag on a mixin reaches the manifest as nothing, measured on the
//! mixin's `JSDoc` and on its inner class alike. So a mixin's states are listed on
//! each element that applies it, as its parts are, and a `@cssstate` on a mixin
//! is a finding of its own.
//!
//! **Reported where the state arrives.** An element inheriting a recorded state
//! from a class above it is that class's to document, so the finding names the
//! class whose own code, or whose own mixin, first records it, rather than every
//! element under it.
//!
//! **A state is read from the source as a literal**, the way a part is. A name
//! computed at the call, a template literal of `more-` and an edge, is one
//! nothing can pair with its documentation, so it is a finding rather than a
//! guess.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::PathBuf;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{line_of, uncommented};
use crate::component::{sources, Context, Finding, Report};

static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+)(?: extends (.*?))?\s*\{")
        .expect("a literal pattern compiles")
});

static MIXIN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export const (Mixin\w+)\s*=").expect("a literal pattern compiles")
});

/// A call recording a state, on any receiver: `this.toggleState(` and the
/// method's own definition are told apart by the dot.
static RECORDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\.toggleState\(\s*(?:'([a-z0-9-]+)'|(\S))").expect("a literal pattern compiles")
});

/// A tag opening a `JSDoc` line, and not the same words quoted in prose: a
/// mixin's note saying each element lists it as `@cssstate open` is not a tag.
static DOCUMENTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*\*\s*@cssstate\s+([a-z0-9-]+)").expect("a literal pattern compiles")
});

static WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\w+)").expect("a literal pattern compiles"));

struct Declared {
    bases: Vec<String>,
    documented: Vec<String>,
    mixin: bool,
    path: PathBuf,
    recorded: Vec<String>,
}

/// Every class and mixin in the source, with what it records and documents.
fn survey(context: &Context, findings: &mut Vec<Finding>) -> BTreeMap<String, Declared> {
    let mut declared = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let (name, base, mixin) = match (CLASS.captures(&text), MIXIN.captures(&text)) {
                (Some(one), _) => (
                    one[1].to_owned(),
                    one.get(2).map_or("", |two| two.as_str()).to_owned(),
                    false,
                ),
                (None, Some(one)) => (one[1].to_owned(), String::new(), true),
                (None, None) => continue,
            };
            let code = uncommented(&text);
            let mut recorded = Vec::new();
            for one in RECORDS.captures_iter(&code) {
                if let Some(state) = one.get(1) {
                    recorded.push(state.as_str().to_owned());
                    continue;
                }
                let at = one.get(0).expect("group zero always matches").start();
                findings.push(Finding {
                    detail: "Write the name out, one call per state: a name assembled at the call \
                             is one nothing can pair with its `@cssstate`."
                        .to_owned(),
                    file: format!("{}:{}", context.relative(&file), line_of(&code, at)),
                    message: format!("{name} records a state whose name is computed"),
                });
            }
            declared.insert(
                name,
                Declared {
                    bases: WORD
                        .captures_iter(&base)
                        .map(|one| one[1].to_owned())
                        .collect(),
                    documented: DOCUMENTED
                        .captures_iter(&text)
                        .map(|one| one[1].to_owned())
                        .collect(),
                    mixin,
                    path: file.clone(),
                    recorded,
                },
            );
        }
    }
    declared
}

/// What a chain adds up to: `recorded` through every base, `documented`
/// through the classes, which is what the analyzer carries.
fn resolve(
    declared: &BTreeMap<String, Declared>,
    name: &str,
    seen: &mut BTreeSet<String>,
    recorded: &mut BTreeSet<String>,
    documented: &mut BTreeSet<String>,
) {
    let Some(entry) = declared.get(name) else {
        return;
    };
    if !seen.insert(name.to_owned()) {
        return;
    }
    recorded.extend(entry.recorded.iter().cloned());
    if !entry.mixin {
        documented.extend(entry.documented.iter().cloned());
    }
    for base in &entry.bases {
        resolve(declared, base, seen, recorded, documented);
    }
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let declared = survey(context, &mut findings);
    let mut checked = 0;

    for (name, entry) in &declared {
        let where_ = context.relative(&entry.path);
        if entry.mixin {
            for state in &entry.documented {
                findings.push(Finding {
                    detail: "The analyzer reads `@cssstate` off a class, so on a mixin it reaches \
                             no manifest. List it on each element that applies the mixin."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!("{name} documents `@cssstate {state}` on a mixin"),
                });
            }
            continue;
        }

        let mut recorded = BTreeSet::new();
        let mut documented = BTreeSet::new();
        resolve(
            &declared,
            name,
            &mut BTreeSet::new(),
            &mut recorded,
            &mut documented,
        );
        checked += entry.documented.len();

        for state in &entry.documented {
            if recorded.contains(state) {
                continue;
            }
            findings.push(Finding {
                detail: "A `:state()` for a state nothing records is valid CSS that matches \
                         nothing, so a consumer styling it sees no error and no effect."
                    .to_owned(),
                file: where_.clone(),
                message: format!(
                    "{name} documents `@cssstate {state}` and nothing in its chain records it"
                ),
            });
        }

        /* What a class above already records is that class's to document, so
        only what arrives here is asked about here. */
        let mut above = BTreeSet::new();
        for base in &entry.bases {
            if declared.get(base).is_some_and(|one| !one.mixin) {
                resolve(
                    &declared,
                    base,
                    &mut BTreeSet::new(),
                    &mut above,
                    &mut BTreeSet::new(),
                );
            }
        }
        for state in recorded.difference(&above) {
            if documented.contains(state) {
                continue;
            }
            findings.push(Finding {
                detail: "A custom state is in no attribute and no property, so the manifest is \
                         the only place a consumer learns it exists. Add a `@cssstate` saying \
                         what it means."
                    .to_owned(),
                file: where_.clone(),
                message: format!("{name} records `:state({state})` and no `@cssstate` lists it"),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "documented custom states",
    }
}
