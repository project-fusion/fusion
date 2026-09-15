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

use crate::component::text::{flattened, uncommented};
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
    Regex::new(r#"(?:^|\s)part="([a-z0-9-]+)[\s"]"#).expect("a literal pattern compiles")
});

/// Where an `exportparts` value opens.
const FORWARDS: &str = "exportparts=\"";

/// A name an interpolation reads, where no `.` before it makes it a member.
static NAMED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:^|[^.\w$])([A-Za-z_$][\w$]*)").expect("a literal pattern compiles")
});

/// Every `inner: outer` pair a comma-separated list names, in order. A bare
/// name forwards under itself.
fn pairs(list: &str, into: &mut Vec<(String, String)>) {
    for pair in list.split(',') {
        let mut halves = pair.split(':').map(str::trim);
        let Some(inner) = halves.next().filter(|one| !one.is_empty()) else {
            continue;
        };
        let outer = halves.next().filter(|one| !one.is_empty()).unwrap_or(inner);
        into.push((inner.to_owned(), outer.to_owned()));
    }
}

/// Where the brace or quote opening at `open` closes, stepping over strings
/// and nested braces. The end of the text where it never does.
fn closing(bytes: &[u8], open: usize) -> usize {
    let mut depth = 0usize;
    let mut quote = 0u8;
    let mut at = open;
    while let Some(&character) = bytes.get(at) {
        if quote != 0 {
            if character == b'\\' {
                at += 1;
            } else if character == quote {
                quote = 0;
            }
        } else {
            match character {
                b'\'' | b'"' | b'`' => quote = character,
                b'{' => depth += 1,
                b'}' => {
                    depth = depth.saturating_sub(1);
                    if depth == 0 {
                        return at;
                    }
                }
                _ => {}
            }
        }
        at += 1;
    }
    bytes.len()
}

/// The single- and double-quoted strings in a stretch of code, and the code
/// with every string, template ones too, blanked out of it.
fn strings(code: &str) -> (Vec<String>, String) {
    let bytes = code.as_bytes();
    let mut found = Vec::new();
    let mut rest = String::with_capacity(code.len());
    let mut at = 0;
    while let Some(&character) = bytes.get(at) {
        if matches!(character, b'\'' | b'"' | b'`') {
            let mut end = at + 1;
            while let Some(&inside) = bytes.get(end) {
                if inside == b'\\' {
                    end += 1;
                } else if inside == character {
                    break;
                }
                end += 1;
            }
            let end = end.min(bytes.len());
            if character != b'`' {
                found.push(code[at + 1..end].to_owned());
            }
            rest.push(' ');
            at = end + 1;
            continue;
        }
        let next = code[at..].chars().next().map_or(1, char::len_utf8);
        rest.push_str(&code[at..at + next]);
        at += next;
    }
    (found, rest)
}

/// The object literal a module-level `const` of this name is initialized with.
fn table<'a>(code: &'a str, name: &str) -> Option<&'a str> {
    let declared = Regex::new(&format!(
        r"\bconst\s+{}\s*(?::[^=]*)?=\s*\{{",
        regex::escape(name)
    ))
    .ok()?;
    let open = declared.find(code)?.end() - 1;
    let close = closing(code.as_bytes(), open);
    code.get(open..=close)
}

/// Every `inner: outer` pair the `exportparts` value starting at `from`
/// forwards, in order.
///
/// **A value may add names that hold only while something is true**, as a chat
/// fed as data does for the turn's author and its state, and they are literals
/// all the same: the static text is the list, and an interpolation adds every
/// quoted string inside it and inside the object literal of any `const` of
/// this file it names, each read as a list of its own. So a quoted string there
/// is forwards and nothing else, the promise a state part name makes, and a
/// value built out of pieces reads as forwarding nothing rather than as
/// forwarding whatever it happens to assemble.
pub fn forwarded(code: &str, from: usize) -> Vec<(String, String)> {
    let bytes = code.as_bytes();
    let mut lists = vec![String::new()];
    let mut run = from;
    let mut at = from;
    while let Some(&character) = bytes.get(at) {
        if character == b'"' {
            break;
        }
        if character == b'$' && bytes.get(at + 1) == Some(&b'{') {
            lists[0].push_str(&code[run..at]);
            lists[0].push(',');
            let close = closing(bytes, at + 1);
            let (quoted, rest) = strings(code.get(at + 2..close).unwrap_or(""));
            lists.extend(quoted);
            for name in NAMED.captures_iter(&rest) {
                if let Some(found) = table(code, &name[1]) {
                    lists.extend(strings(found).0);
                }
            }
            at = close + 1;
            run = at;
            continue;
        }
        at += 1;
    }
    lists[0].push_str(code.get(run..at).unwrap_or(""));
    let mut found = Vec::new();
    for list in &lists {
        pairs(list, &mut found);
    }
    /* Once each: a table named by two interpolations is read twice, and the
    same pair written twice forwards one name, not two. */
    let mut seen = BTreeSet::new();
    found.retain(|one| seen.insert(one.clone()));
    found
}

/// Every pair any `exportparts` in a file forwards.
pub fn forwards_in(code: &str) -> Vec<(String, String)> {
    code.match_indices(FORWARDS)
        .flat_map(|(at, _)| forwarded(code, at + FORWARDS.len()))
        .collect()
}

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

/// Whether `name` is a second name for a part forwarded as `exposed`.
///
/// **One word more, and only one**: `<exposed>-<state>`, the name a state drawn
/// on a part takes, forwarded beside the plain name while the state holds. A
/// second word would let `message: message-body-mine` pass as `message` in a
/// state called `body-mine`, which is another part's name wearing this one's
/// prefix.
pub fn second_name_of(name: &str, exposed: &str) -> bool {
    name.strip_prefix(exposed)
        .and_then(|rest| rest.strip_prefix('-'))
        .is_some_and(|state| {
            !state.is_empty()
                && state
                    .bytes()
                    .all(|one| one.is_ascii_lowercase() || one.is_ascii_digit())
        })
}

/// One place a component renders another.
pub struct Site {
    pub at: usize,
    pub child: String,
    /// `inner: outer`, in the order written. A list and not a map, because one
    /// part may be forwarded under a second name beside its first.
    pub forwarded: Vec<(String, String)>,
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
            let code = flattened(&uncommented(&text));
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
                let forwarded = attributes
                    .find(FORWARDS)
                    .map_or_else(Vec::new, |at| forwarded(&code, end + at + FORWARDS.len()));
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

#[cfg(test)]
mod tests {
    use super::{forwards_in, second_name_of};

    fn names(code: &str) -> Vec<String> {
        forwards_in(code)
            .into_iter()
            .map(|(inner, outer)| format!("{inner}:{outer}"))
            .collect()
    }

    #[test]
    fn a_plain_list_reads_as_it_is_written() {
        assert_eq!(
            names(r#"<x exportparts="body: message-body, message">"#),
            ["body:message-body", "message:message"]
        );
    }

    #[test]
    fn a_second_name_is_read_from_the_interpolation_and_the_table_it_names() {
        let code = r#"const NAMES = {
  me: 'body: message-body-mine',
  failed: 'meta: message-meta-failed',
}
html`<x exportparts="body: message-body${pick(NAMES, a)}${pick(NAMES, b)}${on ? ', meta: message-meta-on' : ''}">`"#;
        assert_eq!(
            names(code),
            [
                "body:message-body",
                "body:message-body-mine",
                "meta:message-meta-failed",
                "meta:message-meta-on",
            ]
        );
    }

    #[test]
    fn a_name_assembled_from_pieces_forwards_nothing() {
        assert_eq!(
            names(r#"<x exportparts="body: message-body${`, ${part}: message-${part}-mine`}">"#),
            ["body:message-body"]
        );
    }

    #[test]
    fn a_second_name_is_the_first_and_one_word_more() {
        assert!(second_name_of("message-body-mine", "message-body"));
        assert!(second_name_of("message-mine", "message"));
        assert!(!second_name_of("message-body", "message-body"));
        assert!(!second_name_of("message-body-mine", "message"));
        assert!(!second_name_of("message-bodyx", "message-body"));
    }
}
