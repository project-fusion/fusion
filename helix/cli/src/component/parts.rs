//! A documented part is rendered, and a rendered part is documented.
//!
//! **Both directions are silent failures and they are different failures.** A
//! `::part()` for a part nothing renders is valid CSS matching nothing, so a
//! consumer styling it sees no error and no effect. A part that works and is not
//! published is one a later edit renames without knowing it was API.
//!
//! **The whole render chain, not the class's own markup.** Asking only what the
//! file in front of it wrote leaves one gap, and it is the expensive one: a part
//! rendered by a *base* that nobody in the chain documents is invisible to both
//! halves. The subclass never renders it, so the first loop never sees it; the
//! base documents nothing, so the guard skips the base entirely. A collection
//! mixin sat in that gap, writing `part="loading"` and `part="empty"` for five
//! families that style both, with nine of the ten pairs published to nobody.
//!
//! **A mixin is a function returning a class, so its parts belong to whatever
//! applies it.** A field mixin renders the label, the hint and the feedback that
//! every field component documents, and a rule following only `extends` reports
//! all three as undocumented on nine components at once.
//!
//! **`exportparts` publishes a part too.** Missing it reads as
//! documented-but-never-rendered, and the fix that finding suggests is to stop
//! documenting a part consumers can style. The exposed name is what they write,
//! so an aliased `inner: outer` counts as `outer`.
//!
//! **A shared `draw…` helper writes this component's parts.** Such a helper
//! holds the markup a set of components share, because a mixin cannot carry a
//! protected render seam across its declared interface. Walking `extends` alone,
//! its parts read as documented-and-never-rendered on every component that calls
//! it.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::PathBuf;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{flattened, uncommented};
use crate::component::{sources, Context, Finding, Report};

static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+)(?: extends (.*?))?\s*\{")
        .expect("a literal pattern compiles")
});

static MIXIN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export const (Mixin\w+)\s*=").expect("a literal pattern compiles")
});

static HELPER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export const (draw[A-Z]\w*)").expect("a literal pattern compiles")
});

static CALLS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b(draw[A-Z]\w*)\s*\(").expect("a literal pattern compiles"));

static DOCUMENTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@csspart\s+([a-z0-9-]+)").expect("a literal pattern compiles"));

static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"part="([a-z0-9 -]+)""#).expect("a literal pattern compiles"));

static FORWARDS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"exportparts="([^"]+)""#).expect("a literal pattern compiles"));

static WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\w+)").expect("a literal pattern compiles"));

/// Parts a file writes: its own, what it forwards, and what a helper draws.
fn written(code: &str) -> Vec<String> {
    let mut found: Vec<String> = PART
        .captures_iter(code)
        .filter(|one| {
            let at = one.get(0).expect("group zero always matches").start();
            !code[..at].ends_with('[')
        })
        .flat_map(|one| {
            one[1]
                .split_whitespace()
                .map(str::to_owned)
                .collect::<Vec<String>>()
        })
        .collect();
    for one in FORWARDS.captures_iter(code) {
        for pair in one[1].split(',') {
            let exposed = pair.split(':').next_back().unwrap_or("").trim();
            if !exposed.is_empty() {
                found.push(exposed.to_owned());
            }
        }
    }
    found
}

struct Component {
    bases: Vec<String>,
    documented: Vec<String>,
    path: PathBuf,
    rendered: Vec<String>,
}

fn resolve<'a>(
    components: &'a BTreeMap<String, Component>,
    name: &str,
    seen: &mut BTreeSet<String>,
    pick: fn(&'a Component) -> &'a Vec<String>,
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
        resolve(components, base, seen, pick, found);
    }
}

/// Every class and mixin in the source, with what it renders and documents.
fn survey(context: &Context) -> BTreeMap<String, Component> {
    let tiers = context.settings.roots(&context.root);

    /* What each shared `draw…` helper writes, read once. */
    let mut helpers: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            /* **Comments blanked here as well as on a component**, and the
            script this comes from read the helper raw. A helper's own docstring
            explains why it takes no `part` option by *naming* the part a caller
            has to write out, so the sentence reads as a render and every family
            calling the helper inherits a part it does not have. Found the hour a
            prose pass added that sentence. */
            let code = flattened(&uncommented(&text));
            let Some(name) = HELPER.captures(&code) else {
                continue;
            };
            helpers.insert(name[1].to_owned(), written(&code));
        }
    }

    let mut components: BTreeMap<String, Component> = BTreeMap::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
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
            let code = flattened(&uncommented(&text));
            let mut rendered = written(&code);
            for one in CALLS.captures_iter(&code) {
                if let Some(parts) = helpers.get(&one[1]) {
                    rendered.extend(parts.iter().cloned());
                }
            }
            components.insert(
                name,
                Component {
                    bases: WORD
                        .captures_iter(&base)
                        .map(|one| one[1].to_owned())
                        .collect(),
                    documented: DOCUMENTED
                        .captures_iter(&text)
                        .map(|one| one[1].to_owned())
                        .collect(),
                    path: file.clone(),
                    rendered,
                },
            );
        }
    }

    components
}

pub fn run(context: &Context) -> Report {
    let components = survey(context);
    let mut findings = Vec::new();
    let mut checked = 0;
    for (name, entry) in &components {
        let mut rendered = BTreeSet::new();
        resolve(
            &components,
            name,
            &mut BTreeSet::new(),
            |one| &one.rendered,
            &mut rendered,
        );
        let mut documented = BTreeSet::new();
        resolve(
            &components,
            name,
            &mut BTreeSet::new(),
            |one| &one.documented,
            &mut documented,
        );
        if rendered.is_empty() && documented.is_empty() {
            continue;
        }
        checked += entry.documented.len();
        let where_ = context.relative(&entry.path);

        for part in &entry.documented {
            if rendered.contains(part) {
                continue;
            }
            findings.push(Finding {
                detail: "A `::part()` for a part nothing renders is valid CSS that matches \
                         nothing, so a consumer styling it sees no error and no effect."
                    .to_owned(),
                file: where_.clone(),
                message: format!(
                    "{name} documents `@csspart {part}` and nothing in its render chain writes it"
                ),
            });
        }

        /* Only where the class documents at least one part. A component that
        documents none has not published a part surface at all, and half of
        those are deliberate. */
        if entry.documented.is_empty() {
            continue;
        }
        for part in &rendered {
            if documented.contains(part) {
                continue;
            }
            findings.push(Finding {
                detail: "A part that works and is not published is one a later edit renames \
                         without knowing it was API."
                    .to_owned(),
                file: where_.clone(),
                message: format!("{name} renders `part=\"{part}\"` and no `@csspart` declares it"),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "documented parts",
    }
}
