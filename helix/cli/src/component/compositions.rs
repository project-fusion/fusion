//! What a component renders of another, and what each tag publishes.
//!
//! **Four rules read this and none of them could answer it alone.** A part
//! surface is a fact about a tag rather than about a file: it is unioned across
//! the layers, because a styled component usually renders none of its own markup
//! and takes it from the class it extends, and it is resolved through `extends`,
//! because a base class's parts are the subclass's parts.
//!
//! **By tag and not by directory.** `this.tag('menu-item')` names an element
//! living in `menu/item/`, so a directory lookup asks for a family called
//! `menu-item`, finds none, and reports composition sites as having nothing to
//! forward.
//!
//! **A tag held in a name is a composition too.** `const pagination =
//! this.tag('pagination')` and then `<${pagination}>` is the form
//! `static-html` asks for, and CONVENTIONS shows it. Reading only
//! `<${this.tag(...)}` missed every one of them: Data Table rendered a
//! pagination and forwarded none of its parts, and nothing said so.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::uncommented;
use crate::component::{sources, Context};

static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+)(?: extends (.*?))?\s*\{")
        .expect("a literal pattern compiles")
});

static WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\w+)").expect("a literal pattern compiles"));

static DEFINED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"@customElement\(\s*['"]([a-z0-9-]+)['"]"#).expect("a literal pattern compiles")
});

static DOCUMENTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@csspart\s+([a-z0-9-]+)\s+-\s+(.*)").expect("a literal pattern compiles")
});

static COMPOSES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"<\$\{this\.tag\(\s*['"]([a-z-]+)['"]\s*\)\}"#)
        .expect("a literal pattern compiles")
});

/// A tag bound to a name, for a template to open later.
static BINDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"\b(?:const|let)\s+(\w+)\s*=\s*this\.tag\(\s*['"]([a-z-]+)['"]\s*\)"#)
        .expect("a literal pattern compiles")
});

/// An open tag whose name is interpolated from a variable.
static OPENS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<\$\{\s*(\w+)\s*\}").expect("a literal pattern compiles"));

static ROLE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:^|\s)part="([a-z0-9-]+)""#).expect("a literal pattern compiles")
});

static FORWARDS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"exportparts="([^"]*)""#).expect("a literal pattern compiles"));

/// The attributes of the open tag beginning at `from`.
///
/// **A fixed window of N characters is not good enough.** An open tag here
/// carries template bindings, so it holds `${…}` with nested braces, quotes
/// inside those braces, and `>` inside arrow functions: measured, a fixed window
/// cut four of twenty-eight composition sites in half and silently reported them
/// as carrying no `exportparts`.
pub fn open_tag(source: &str, from: usize) -> String {
    let bytes = source.as_bytes();
    let mut depth = 0usize;
    let mut quote = 0u8;
    let mut at = from;
    while at < bytes.len() {
        let character = bytes[at];
        if quote != 0 {
            if character == quote {
                quote = 0;
            }
            at += 1;
            continue;
        }
        match character {
            b'"' | b'\'' | b'`' => quote = character,
            b'$' if bytes.get(at + 1) == Some(&b'{') => {
                depth += 1;
                at += 1;
            }
            b'{' if depth > 0 => depth += 1,
            b'}' if depth > 0 => depth -= 1,
            b'>' if depth == 0 => return source[from..at].to_owned(),
            _ => {}
        }
        at += 1;
    }
    source[from..].to_owned()
}

/// One class, as far as this module needs it.
struct Declared {
    bases: Vec<String>,
    docs: Vec<(String, String)>,
    tags: Vec<String>,
}

/// Every class in the configured source, keyed by name.
fn declared(context: &Context) -> BTreeMap<String, Declared> {
    let mut classes = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let Some(found) = CLASS.captures(&text) else {
                continue;
            };
            let code = uncommented(&text);
            classes.insert(
                found[1].to_owned(),
                Declared {
                    bases: WORD
                        .captures_iter(found.get(2).map_or("", |one| one.as_str()))
                        .map(|one| one[1].to_owned())
                        .collect(),
                    docs: DOCUMENTED
                        .captures_iter(&text)
                        .map(|one| (one[1].to_owned(), one[2].trim().to_owned()))
                        .collect(),
                    tags: DEFINED
                        .captures_iter(&code)
                        .map(|one| one[1].to_owned())
                        .collect(),
                },
            );
        }
    }
    classes
}

/// A tag with each configured layer prefix taken off, longest first.
fn suffix(tag: &str, context: &Context) -> String {
    let mut prefixes: Vec<&str> = context
        .settings
        .layers
        .iter()
        .map(|one| one.prefix.as_str())
        .filter(|one| !one.is_empty())
        .collect();
    prefixes.sort_by_key(|one| std::cmp::Reverse(one.len()));
    for prefix in prefixes {
        if let Some(rest) = tag.strip_prefix(prefix) {
            return rest.to_owned();
        }
    }
    tag.to_owned()
}

/// What each tag's parts are called, by tag suffix, resolved through `extends`.
///
/// The description is the child's own, because a forwarded part is the child's
/// part: a parent inventing a second description for it is two pages saying
/// different things about one element.
pub fn part_docs_by_tag(context: &Context) -> BTreeMap<String, BTreeMap<String, String>> {
    let classes = declared(context);
    let mut by_tag: BTreeMap<String, BTreeMap<String, String>> = BTreeMap::new();
    for (name, entry) in &classes {
        for tag in &entry.tags {
            let found = by_tag.entry(suffix(tag, context)).or_default();
            let mut seen = BTreeSet::new();
            resolve_docs(&classes, name, &mut seen, found);
        }
    }
    by_tag
}

/// Bases first, so a subclass's own description wins over the one it inherits.
fn resolve_docs(
    classes: &BTreeMap<String, Declared>,
    name: &str,
    seen: &mut BTreeSet<String>,
    found: &mut BTreeMap<String, String>,
) {
    let Some(entry) = classes.get(name) else {
        return;
    };
    if !seen.insert(name.to_owned()) {
        return;
    }
    for base in &entry.bases {
        resolve_docs(classes, base, seen, found);
    }
    for (part, description) in &entry.docs {
        found.insert(part.clone(), description.clone());
    }
}

/// What a child's part is called once it is forwarded.
///
/// Prefixed with the role the parent gave the child, so two levels agreeing on a
/// word cannot collide. **Except where the part already is the role**, which is
/// the stutter the rule would otherwise produce: a `dialog` inside a
/// `part="dialog"` is `dialog`, not `dialog-dialog`.
pub fn exposed_as(role: &str, part: &str) -> String {
    if part == role {
        role.to_owned()
    } else {
        format!("{role}-{part}")
    }
}

/// One place a component renders another.
pub struct Site {
    pub at: usize,
    pub child: String,
    pub forwarded: BTreeMap<String, String>,
    pub path: std::path::PathBuf,
    pub role: Option<String>,
}

/// Every site where a component renders another, with what it forwards.
///
/// A site is `<${this.tag('child')} …>`, or `<${name} …>` where `name` holds
/// `this.tag('child')`, which are the only ways a component may name another.
/// The `part` on that element is the role the child plays here, and is what a
/// forwarded name is prefixed with.
///
/// **A tag handed to a shared helper is not followed.** `drawTooltip` opens
/// `<${tag}>` for six charts, and the tag is the caller's argument: nothing in
/// the helper's file says which element it is. It forwards by hand, under the
/// `tooltip` its charts published before the prefix rule, beside the
/// `tooltip-anchor` role that rule would take instead.
pub fn compositions(context: &Context) -> Vec<Site> {
    let mut found = Vec::new();
    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let code = uncommented(&text);
            let bound: Vec<(usize, String, String)> = BINDS
                .captures_iter(&code)
                .map(|one| {
                    let at = one.get(0).expect("group zero always matches").start();
                    (at, one[1].to_owned(), one[2].to_owned())
                })
                .collect();
            /* The nearest binding above the site, which is the one in scope: two
            methods binding `option` to two different tags is legal, and the file
            order is what tells them apart. A name bound to nothing here is not a
            Helix tag this file chose, and is left alone. */
            let held = OPENS.captures_iter(&code).filter_map(|one| {
                let whole = one.get(0).expect("group zero always matches");
                bound
                    .iter()
                    .rev()
                    .find(|(at, name, _)| *at < whole.start() && name == &one[1])
                    .map(|(_, _, child)| (whole.end(), child.clone()))
            });
            let inline = COMPOSES.captures_iter(&code).map(|one| {
                let whole = one.get(0).expect("group zero always matches");
                (whole.end(), one[1].to_owned())
            });
            for (end, child) in inline.chain(held).collect::<Vec<_>>() {
                let attributes = open_tag(&code, end);
                let mut forwarded = BTreeMap::new();
                let raw = FORWARDS
                    .captures(&attributes)
                    .map_or(String::new(), |two| two[1].to_owned());
                for pair in raw.split(',') {
                    let mut halves = pair.split(':').map(str::trim);
                    let Some(inner) = halves.next().filter(|one| !one.is_empty()) else {
                        continue;
                    };
                    let outer = halves.next().filter(|one| !one.is_empty()).unwrap_or(inner);
                    forwarded.insert(inner.to_owned(), outer.to_owned());
                }
                found.push(Site {
                    at: end,
                    child,
                    forwarded,
                    path: file.clone(),
                    role: ROLE.captures(&attributes).map(|two| two[1].to_owned()),
                });
            }
        }
    }
    found
}
