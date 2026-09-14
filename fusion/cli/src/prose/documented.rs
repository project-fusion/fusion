//! Holds the documentation to the API that exists.
//!
//! **A docs page naming a property the build refuses is worse than no page.** A
//! reader follows it, writes what it says, and the failure arrives from a check
//! they have never heard of, in a repository they are not in. Everything else
//! here is verified against something: parts against what renders, hooks against
//! what reads them, events against what dispatches them, tokens against what
//! declares them. Prose was the one surface with no such tie, and a rename that
//! swept the code had nothing to make it sweep the pages.
//!
//! Seven things are held, and they are the seven a page can get wrong while
//! reading perfectly:
//!
//! - **A tag.** A tag in an example is an element that will not upgrade, and it
//!   looks exactly like one that will. In a selector too, which is the form an
//!   override example takes.
//! - **A token, and a per-component hook.** A misspelled custom property
//!   resolves to nothing and the declaration silently falls back, which is the
//!   same failure `helix component`'s `tokens` catches in CSS and could not see
//!   in prose. A hook is held only where its prefix is a real family, because a
//!   page legitimately shows a consumer's own properties: those are the reader's
//!   to name and not ours to verify.
//! - **An event.** A name in an `addEventListener` or an `on`-prefixed prop that
//!   nothing dispatches is a handler that never runs.
//! - **An exported name.** A mixin, an element class or a helper named in a code
//!   fence has to be something the workspace exports.
//! - **Anything said to be dispatched.** An invented event name carrying none of
//!   this library's prefixes slips every rule above, so the verb is what catches
//!   it: a sentence saying a thing is dispatched has to name a thing that is.
//! - **A subpath, resolved rather than assumed.** A package name existing says
//!   nothing about a path inside it, because an export map is a program: a
//!   wildcard key can rewrite a subpath into a directory that was never built,
//!   and an exact key can be absent from a map that looks complete.
//! - **A package.** The cheapest of these to verify, and a docs page naming a
//!   package the workspace does not have reads perfectly.
//!
//! **What it deliberately does not check is English.** A word in a sentence
//! about how something looks is not an API reference, so only backticked and
//! bracketed forms count. A check that read prose would fail on a page saying
//! "the whole styled appearance is built on", which is correct English about a
//! real thing.
//!
//! **And it reads the historical case as historical.** The page that explains
//! why a property was removed names it four times and must. A mention inside a
//! sentence that says it is gone is allowed, which is narrower than exempting
//! the page: the page can still be wrong about anything else.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::{Regex, RegexBuilder};
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

/// A mention that says the thing does not work is allowed to name it.
///
/// Two shapes. **Historical**: a sentence saying the thing was removed.
/// **Counter-example**: a sentence naming the wrong thing in order to warn about
/// it, which the rules files and the root `AGENTS.md` do deliberately, with a
/// typo that compiles clean and an event nobody dispatches.
///
/// Those are the check firing on prose that is correct, so exempting them is not
/// a loosening. A check with permanent false positives is one people learn to
/// skip, and then it holds nothing at all.
static HISTORICAL: LazyLock<Regex> = LazyLock::new(|| {
    RegexBuilder::new(
        r"\b(was|were|used to|no longer|removed|refused|gone|deleted|instead of|rather than|gained|renamed|nobody|nothing|invented|never|typo|cannot)\b",
    )
    .case_insensitive(true)
    .build()
    .expect("a literal pattern compiles")
});

/// Whether the name is the object of an immediate negation.
///
/// Narrower than the list above, and it catches the shape that list cannot reach
/// without exempting the word "not" everywhere. Only the twenty characters in
/// front of the match, so a negation earlier in the same sentence does not
/// license a name at the end of it.
static NEGATED: LazyLock<Regex> = LazyLock::new(|| {
    RegexBuilder::new(r#"\b(not|never|no)\b[\s`'"(]*$"#)
        .case_insensitive(true)
        .build()
        .expect("a literal pattern compiles")
});

/// Everything the workspace declares about itself, read once.
struct Api {
    events: BTreeSet<String>,
    exports: BTreeSet<String>,
    families: BTreeSet<String>,
    hooks: BTreeSet<String>,
    packages: BTreeMap<String, PathBuf>,
    tags: BTreeSet<String>,
    tokens: BTreeSet<String>,
}

/// Every directory holding a `package.json`, at whatever depth it sits.
///
/// **Walked rather than counted a level down**, because the depth varies and the
/// guess fails silently: the two published CLI shims sit one level deeper than
/// every other package, so a scan of the domains' immediate children reported
/// both of them as names this workspace does not have.
fn packages(root: &Path) -> Vec<PathBuf> {
    let mut manifests = Vec::new();
    crawl(
        root,
        &|path: &Path| path.file_name().is_some_and(|one| one == "package.json"),
        &mut manifests,
    );
    manifests
        .into_iter()
        .filter_map(|one| one.parent().map(Path::to_path_buf))
        .collect()
}

/// Reads a JSON file, or nothing.
fn read(path: &Path) -> Option<Value> {
    serde_json::from_str(&fs::read_to_string(path).ok()?).ok()
}

/// Every name a source file exports, from its sources.
///
/// **Read out of the sources rather than out of `dist`**, so this works on a
/// clean checkout and cannot report a stale build as a documentation error.
fn exported(from: &Path, into: &mut BTreeSet<String>) {
    static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(
            r"export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|class|function|interface|type|enum)\s+([A-Za-z_$][\w$]*)",
        )
        .expect("a literal pattern compiles")
    });
    static LISTED: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"export\s*\{([^}]*)\}").expect("a literal pattern compiles"));

    let Ok(entries) = fs::read_dir(from) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if path.is_dir() {
            if !name.starts_with('.') && name != "node_modules" && name != "dist" {
                exported(&path, into);
            }
            continue;
        }
        if path.extension().is_none_or(|one| one != "ts") || name.contains(".spec.") {
            continue;
        }
        let Ok(source) = fs::read_to_string(&path) else {
            continue;
        };
        for caught in DECLARED.captures_iter(&source) {
            into.insert(caught[1].to_owned());
        }
        for caught in LISTED.captures_iter(&source) {
            for part in caught[1].split(',') {
                let one = part
                    .rsplit(" as ")
                    .next()
                    .unwrap_or_default()
                    .trim()
                    .trim_start_matches("type ")
                    .trim();
                if !one.is_empty() {
                    into.insert(one.to_owned());
                }
            }
        }
    }
}

fn survey(root: &Path) -> Api {
    let mut api = Api {
        events: BTreeSet::new(),
        exports: BTreeSet::new(),
        families: BTreeSet::new(),
        hooks: BTreeSet::new(),
        packages: BTreeMap::new(),
        tags: BTreeSet::new(),
        tokens: BTreeSet::new(),
    };

    for package in packages(root) {
        if let Some(name) = read(&package.join("package.json"))
            .and_then(|one| Some(one.get("name")?.as_str()?.to_owned()))
        {
            api.packages.insert(name, package.clone());
        }
        if let Some(modules) = read(&package.join("custom-elements.json"))
            .and_then(|one| Some(one.get("modules")?.as_array()?.clone()))
        {
            for module in modules {
                let Some(declarations) = module.get("declarations").and_then(Value::as_array)
                else {
                    continue;
                };
                for declaration in declarations {
                    if let Some(tag) = declaration.get("tagName").and_then(Value::as_str) {
                        api.tags.insert(tag.to_owned());
                    }
                    for named in ["events", "cssProperties"] {
                        let Some(all) = declaration.get(named).and_then(Value::as_array) else {
                            continue;
                        };
                        for one in all {
                            let Some(name) = one.get("name").and_then(Value::as_str) else {
                                continue;
                            };
                            if named == "events" {
                                api.events.insert(name.to_owned());
                            } else {
                                api.hooks.insert(name.to_owned());
                            }
                        }
                    }
                }
            }
        }
        let source = package.join("src");
        if source.is_dir() {
            exported(&source, &mut api.exports);
        }
    }

    if let Some(tokens) = read(&root.join("helix/styles/dist/tokens.json"))
        .and_then(|one| Some(one.get("tokens")?.as_array()?.clone()))
    {
        for token in tokens {
            if let Some(name) = token.get("name").and_then(Value::as_str) {
                api.tokens.insert(name.to_owned());
            }
        }
    }

    api.families = api
        .tags
        .iter()
        .filter_map(|tag| tag.split_once('-').map(|(_, rest)| rest.to_owned()))
        .collect();
    api
}

/// Everything in this repository that tells somebody what the API is.
///
/// **The published pages and the files that instruct an agent, which is the same
/// problem twice.** The rules in `.claude/rules` and the skills in
/// `.agents/skills` are read by a machine that then writes code, and they drift
/// harder than the documentation does.
///
/// A page that is wrong misleads a reader who can push back. A rule that is
/// wrong is read by something that cannot, and it is read first.
///
/// **The skills are read where they live, not through the pointer.**
/// `.claude/skills/<name>` is a symlink into `.agents/skills/<name>`, because a
/// skill is agent-facing content and only the directory it sits in is one
/// vendor's. Scanning both would find the same `SKILL.md` twice and report every
/// fault in it twice, under a path that is not where anybody would fix it.
///
/// **The conventions are read the same way**, in `<domain>/CONVENTIONS.md`.
/// `.claude/rules/<domain>.md` carries the `paths:` frontmatter that loads them
/// and nothing else, so scanning it as well costs one thin file and keeps the
/// pointer honest.
fn pages(root: &Path) -> Vec<PathBuf> {
    let mut found = Vec::new();
    let ordered = |directory: PathBuf| {
        let mut all: Vec<PathBuf> = fs::read_dir(directory)
            .into_iter()
            .flatten()
            .flatten()
            .map(|one| one.path())
            .collect();
        all.sort();
        all
    };

    for domain in ordered(root.to_path_buf())
        .into_iter()
        .filter(|one| one.is_dir())
    {
        for page in ordered(domain.join("docs/content")) {
            if page.extension().is_some_and(|one| one == "mdx") {
                found.push(page);
            }
        }
        let conventions = domain.join("CONVENTIONS.md");
        if conventions.is_file() {
            found.push(conventions);
        }
    }
    for page in ordered(root.join(".claude/rules")) {
        if page.extension().is_some_and(|one| one == "md") {
            found.push(page);
        }
    }
    for skill in ordered(root.join(".agents/skills")) {
        let card = skill.join("SKILL.md");
        if card.is_file() {
            found.push(card);
        }
    }
    let agents = root.join("AGENTS.md");
    if agents.is_file() {
        found.push(agents);
    }
    found
}

/// What an export map answers for a subpath, and whether it answers at all.
///
/// **The subset of the specification these packages use**, which is exact keys,
/// a single `./*` wildcard, and condition objects. That is enough to be exact
/// about every specifier in this repository, and a map that grows past it fails
/// closed: an unrecognized shape answers nothing and is reported as refused,
/// which is louder than quietly passing.
fn answers(map: &Value, subpath: &str) -> Option<String> {
    let target = |one: &Value| -> Option<String> {
        match one {
            Value::String(path) => Some(path.clone()),
            Value::Object(conditions) => conditions
                .get("default")
                .or_else(|| conditions.get("types"))
                .and_then(|two| two.as_str().map(str::to_owned)),
            _ => None,
        }
    };
    let map = map.as_object()?;
    if let Some(found) = map.get(subpath) {
        return target(found);
    }
    for (key, found) in map {
        let Some((head, tail)) = key.split_once('*') else {
            continue;
        };
        if !subpath.starts_with(head) || !subpath.ends_with(tail) {
            continue;
        }
        let filled = &subpath[head.len()..subpath.len() - tail.len()];
        return target(found).map(|path| path.replace('*', filled));
    }
    None
}

#[allow(clippy::too_many_lines)]
pub fn run(context: &Context) -> Report {
    static MARKUP: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"<(helix-[a-z][a-z0-9-]*)").expect("a literal pattern compiles")
    });
    static SELECTOR: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"\b(helix-[a-z][a-z0-9-]*)(?:::|\s*\{)").expect("a literal pattern compiles")
    });
    static PROPERTY: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"--([a-z][a-z0-9-]*?)-([a-z][a-z0-9-]*)").expect("a literal pattern compiles")
    });
    static TOKEN: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"--helix-[a-z][a-z0-9-]*").expect("a literal pattern compiles")
    });
    static BOUND: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"onhelix-([a-z][a-z0-9-]*)").expect("a literal pattern compiles")
    });
    static LISTENED: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"addEventListener\(\s*'(helix-[a-z0-9-]+)'")
            .expect("a literal pattern compiles")
    });
    static DISPATCHED: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"dispatch(?:es|ed|ing)?\s+`([A-Za-z][\w-]*)`")
            .expect("a literal pattern compiles")
    });
    static NAMED: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"`((?:Helix|Mixin|With)[A-Z][A-Za-z0-9]*)`")
            .expect("a literal pattern compiles")
    });

    let api = survey(&context.root);
    let mut findings = Vec::new();
    let mut checked = 0;

    /* **Nothing to hold the pages to.** A workspace with no manifest has not
    been analyzed, and reporting every tag in every page as undeclared would be
    a check failing on its own missing input. */
    if api.tags.is_empty() {
        return Report {
            checked: 0,
            findings: vec![Finding {
                detail: "Run `bun run analyze` first. Reporting every tag in every page as \
                         undeclared would be this check failing on its own missing input."
                    .to_owned(),
                file: "custom-elements.json".to_owned(),
                message: "no manifest declares any tag, so there is nothing to hold a page to"
                    .to_owned(),
            }],
            notes: Vec::new(),
            unit: "API references in the documentation",
        };
    }

    /* Built once from the scope the workspace declares, rather than written out:
    a scope rename is exactly the event this rule exists to survive, and the
    pattern that names the old one finds nothing and reports agreement. */
    let scope = context.settings.scope.clone().unwrap_or_default();
    let specifier = Regex::new(&format!(
        r"{}[a-z][a-z0-9-]*(?:/[A-Za-z0-9][\w./-]*)?",
        regex::escape(&scope)
    ))
    .expect("a pattern built from an escaped scope compiles");

    let all = pages(&context.root);
    for page in &all {
        let Ok(text) = fs::read_to_string(page) else {
            continue;
        };
        let where_ = context.relative(page);

        /* Whether a mention here is prose explaining that the thing is not real:
        the sentence it sits in says so, or the words immediately before it do. */
        let explained = |at: usize| {
            let from = text[..at]
                .char_indices()
                .rev()
                .take(220)
                .last()
                .map_or(at, |(index, _)| index);
            let to = text[at..]
                .char_indices()
                .take(220)
                .last()
                .map_or(text.len(), |(index, one)| at + index + one.len_utf8());
            if HISTORICAL.is_match(&text[from..to]) {
                return true;
            }
            let before = &text[..at];
            let short = before
                .char_indices()
                .rev()
                .take(20)
                .last()
                .map_or(before, |(index, _)| &before[index..]);
            NEGATED.is_match(short)
        };

        let mut fault = |at: usize, message: String, detail: &str| {
            if !explained(at) {
                findings.push(Finding {
                    detail: detail.to_owned(),
                    file: where_.clone(),
                    message,
                });
            }
        };

        /* In markup and in a selector. The second is how an override example is
        written. */
        for caught in MARKUP
            .captures_iter(&text)
            .chain(SELECTOR.captures_iter(&text))
        {
            checked += 1;
            let tag = caught[1].to_owned();
            if !api.tags.contains(&tag) {
                fault(
                    caught.get(1).map_or(0, |one| one.start()),
                    format!("`{tag}` is not a tag any manifest declares"),
                    "An element that will not upgrade looks exactly like one that will.",
                );
            }
        }

        /* A hook whose prefix names a real family has to be one that family
        declares. Anything else is the consumer's own and not ours to check. */
        for caught in PROPERTY.captures_iter(&text) {
            let name = caught[0].to_owned();
            if name.starts_with("--helix-") || name.starts_with("--_") || api.hooks.contains(&name)
            {
                continue;
            }
            let family = caught[1].to_owned();
            if !api.families.contains(&family) {
                continue;
            }
            checked += 1;
            fault(
                caught.get(0).map_or(0, |one| one.start()),
                format!("`{name}` is not a hook `{family}` declares"),
                "The declaration silently falls back, which reads as if it worked.",
            );
        }

        for caught in TOKEN.find_iter(&text) {
            checked += 1;
            let name = caught.as_str().to_owned();
            /* Seeds and primitives are not semantic tokens and are documented
            on purpose: a seed is an input a consumer writes, and an underscored
            name is deliberately private. */
            if name.starts_with("--helix-seed-") || api.tokens.contains(&name) {
                continue;
            }
            fault(
                caught.start(),
                format!("`{name}` is not a token the styles package declares"),
                "It resolves to nothing and the declaration silently falls back.",
            );
        }

        for caught in BOUND.captures_iter(&text) {
            checked += 1;
            let name = format!("helix-{}", &caught[1]);
            if !api.events.contains(&name) {
                fault(
                    caught.get(0).map_or(0, |one| one.start()),
                    format!("`on{name}` binds `{name}`, which nothing dispatches"),
                    "A handler bound to an event nobody sends never runs.",
                );
            }
        }

        for caught in LISTENED.captures_iter(&text) {
            checked += 1;
            let name = caught[1].to_owned();
            if !api.events.contains(&name) {
                fault(
                    caught.get(1).map_or(0, |one| one.start()),
                    format!("listens for `{name}`, which nothing dispatches"),
                    "A handler bound to an event nobody sends never runs.",
                );
            }
        }

        /* A scoped name, and the subpath with it. The package half is a lookup
        and the subpath half is the export map, because a map is a program and
        reading one by eye is how a subpath that does not resolve gets believed. */
        for caught in specifier.find_iter(&text) {
            /* **A glob names a shape, not a package.** The convention prose
            writes the scope with a `*` after it, and a specifier pattern that
            stops at the hyphen reads the prefix as a name nothing declares. */
            if text[caught.end()..].starts_with('*') {
                continue;
            }
            let whole = caught.as_str();
            let name: String = whole.split('/').take(2).collect::<Vec<&str>>().join("/");
            checked += 1;
            let Some(package) = api.packages.get(&name) else {
                fault(
                    caught.start(),
                    format!("`{name}` is not a package in this workspace"),
                    "A package name is the cheapest of these to verify.",
                );
                continue;
            };
            if whole == name || explained(caught.start()) {
                continue;
            }
            let subpath = format!(".{}", &whole[name.len()..]);
            let map =
                read(&package.join("package.json")).and_then(|one| one.get("exports").cloned());
            let Some(map) = map else {
                continue;
            };
            let Some(target) = answers(&map, &subpath) else {
                fault(
                    caught.start(),
                    format!("`{whole}` is not a path `{name}` exports. Its export map refuses it."),
                    "A package name existing says nothing about a path inside it.",
                );
                continue;
            };
            /* **A target under a build that has not run is a build state, not a
            documentation fault.** Every other half of this rule reads sources
            for that reason, and a check that fails on a clean checkout is one
            people learn to run only after a build.
            The question is whether the build ran at all, which is the top of the
            output directory rather than the leaf the map named: a wildcard key
            rewrites a subpath into a directory under `dist`, so asking whether
            *that* directory exists is asking the question this is meant to
            answer and always getting no. */
            let resolved = package.join(target.trim_start_matches("./"));
            let output = target
                .trim_start_matches("./")
                .split_once('/')
                .map(|(head, _)| package.join(head));
            let built = output.is_none_or(|one| one.exists());
            if built && !resolved.exists() {
                fault(
                    caught.start(),
                    format!("`{whole}` resolves to `{target}`, which is not there"),
                    "The export map answers the subpath and the file it names does not exist.",
                );
            }
        }

        /* Whatever a page says is dispatched, whether or not it looks like ours.
        The verb is the tell: a sentence claiming something is sent has to name a
        thing that is sent. */
        for caught in DISPATCHED.captures_iter(&text) {
            checked += 1;
            let name = caught[1].to_owned();
            if !api.events.contains(&name) && !api.exports.contains(&name) {
                fault(
                    caught.get(1).map_or(0, |one| one.start()),
                    format!("says `{name}` is dispatched, and nothing dispatches it"),
                    "An invented name carrying none of this library's prefixes slips every other \
                     half of this rule, so the verb is what catches it.",
                );
            }
        }

        /* Only the names this library would own. A backticked `Promise` or `Set`
        is not ours to verify, and a bare capitalized word in prose is a
        sentence. */
        for caught in NAMED.captures_iter(&text) {
            checked += 1;
            let name = caught[1].to_owned();
            if !api.exports.contains(&name) {
                fault(
                    caught.get(1).map_or(0, |one| one.start()),
                    format!("`{name}` is not a name the workspace exports"),
                    "A name in a code fence is a name a reader will type.",
                );
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "API references in the documentation",
    }
}
