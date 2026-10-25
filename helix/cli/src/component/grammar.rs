//! The event grammar, held for `conventions`: a request is named for itself and
//! says what follows it.
//!
//! **Three things, each a sentence `helix/CONVENTIONS.md` already made.**
//!
//! 1. **An event is cancelable exactly when its name is `helix-before-*`**,
//!    apart from the commands in [`COMMANDS`]. A plain name that can be refused
//!    reads as a notification, and a consumer who binds it to learn what
//!    happened reads a `currentTarget` that has not moved yet. Thirteen such
//!    names had shipped by October 25, 2026, and five of them were documented.
//! 2. **Every request names its follow-up**, under `@followedBy` on its class,
//!    and the family that declares the request declares one of those names
//!    too. A request with nothing after it leaves a consumer who wants to know
//!    where things stand nothing to listen for but a proposal.
//! 3. **The table in `events.mdx` lists every name in `names.ts`.** The page is
//!    where a reader looks a name up, and `helix-toggle` shipped on three
//!    families with neither page nor convention saying it existed.
//!
//! **The classes are found by scanning the configured tiers**, as `cancelable`
//! finds them, so a class that changes its flag moves every finding at once.
//! The page and the list are this repository's, read where they are and
//! skipped where they are not, so a project built on Helix gets the first two
//! and never a finding about a page it does not have.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::text::line_of;
use crate::component::{sources, Context, Finding};

/// The cancelable events whose names carry no `before`, because each is a
/// command the reader gave rather than a state about to change.
///
/// Refusing one stops what the library would do with it: a chat composer keeps
/// its text, a terminal opens no address, a combobox adds nothing. Nothing is
/// in force afterwards for a notification to report, so none follows. The
/// same list is in `helix/CONVENTIONS.md` and `helix/docs/content/events.mdx`.
pub const COMMANDS: [&str; 5] = [
    "helix-create",
    "helix-dismiss",
    "helix-send",
    "helix-shortcut",
    "helix-terminal-link",
];

/// Native events a request may be followed by, which no Helix class carries.
const NATIVE: [&str; 4] = ["change", "close", "input", "toggle"];

/// Where this repository keeps the list of names and the page that tables them.
const NAMES: &str = "helix/core/src/events/names.ts";
const PAGE: &str = "helix/docs/content/events.mdx";

static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+) extends [^{]*\{(.*?)\n\}")
        .expect("a literal pattern compiles")
});

static NAME: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static readonly eventName = '([a-z0-9-]+)'").expect("a literal pattern compiles")
});

static FLAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"cancelable:\s*(true|false)").expect("a literal pattern compiles")
});

static FOLLOWED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@followedBy[ \t]+([a-z0-9 \t-]*)").expect("a literal pattern compiles")
});

/// A name in backticks in a table row's first cell.
static ROW: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^\|([^|\n]*)\|").expect("a literal pattern compiles"));

static TICKED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`(helix-[a-z0-9-]+)`").expect("a literal pattern compiles"));

/// One event class as its module writes it.
#[derive(Debug)]
pub struct Class {
    pub cancelable: bool,
    pub file: String,
    pub follows: Vec<String>,
    pub line: usize,
    pub name: String,
}

/// The event classes in one module: each class with a literal `eventName`, its
/// flag, and the names its doc block gives under `@followedBy`.
pub fn classes_in(text: &str, file: &str) -> Vec<Class> {
    let mut found = Vec::new();
    for class in CLASS.captures_iter(text) {
        let body = &class[2];
        let Some(name) = NAME.captures(body) else {
            continue;
        };
        /* A constructor that passes no flag takes `CustomEvent`'s default,
        which is not cancelable. */
        let cancelable = FLAG.captures(body).is_some_and(|one| &one[1] == "true");
        let start = class.get(0).map_or(0, |one| one.start());
        let doc = doc_before(text, start);
        let follows = FOLLOWED
            .captures(doc)
            .map(|one| {
                one[1]
                    .split_whitespace()
                    .map(str::to_owned)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        found.push(Class {
            cancelable,
            file: file.to_owned(),
            follows,
            line: line_of(text, start),
            name: name[1].to_owned(),
        });
    }
    found
}

/// The doc block that ends right before `at`, or nothing.
fn doc_before(text: &str, at: usize) -> &str {
    let before = text[..at].trim_end();
    if !before.ends_with("*/") {
        return "";
    }
    before.rfind("/**").map_or("", |open| &before[open..])
}

/// Whether a name is a request.
fn requests(name: &str) -> bool {
    name.starts_with("helix-before-")
}

/// What each class gets wrong about its own name and what follows it.
pub fn judge_classes(classes: &[Class]) -> Vec<Finding> {
    let notifications: BTreeSet<&str> = classes
        .iter()
        .filter(|one| !one.cancelable)
        .map(|one| one.name.as_str())
        .chain(NATIVE)
        .collect();
    let mut findings = Vec::new();
    for class in classes {
        let file = format!("{}:{}", class.file, class.line);
        let name = class.name.as_str();
        if class.cancelable && !requests(name) && !COMMANDS.contains(&name) {
            findings.push(Finding {
                detail: format!(
                    "Name the request `helix-before-{}`, and send `{name}` once the change stands. A command a reader gave belongs in `COMMANDS` and in the lists in `helix/CONVENTIONS.md` and `events.mdx`.",
                    name.trim_start_matches("helix-")
                ),
                file: file.clone(),
                message: format!("`{name}` is cancelable and is not named `helix-before-*`"),
            });
        }
        if !class.cancelable && requests(name) {
            findings.push(Finding {
                detail: "A `helix-before-*` event is a request, and a request a listener cannot refuse is a notification under the wrong name.".to_owned(),
                file: file.clone(),
                message: format!("`{name}` is named for a request and is not cancelable"),
            });
        }
        if !requests(name) {
            continue;
        }
        if class.follows.is_empty() {
            findings.push(Finding {
                detail: "Write `@followedBy` in the class's doc block with the notification that says the change stood, such as `helix-sort` after `helix-before-sort`.".to_owned(),
                file: file.clone(),
                message: format!("`{name}` names no follow-up"),
            });
        }
        for follow in &class.follows {
            if !notifications.contains(follow.as_str()) {
                findings.push(Finding {
                    detail: "A follow-up is an event no listener can refuse: a Helix class that is not cancelable, or `change`, `input`, `toggle` or `close`.".to_owned(),
                    file: file.clone(),
                    message: format!("`{name}` is followed by `{follow}`, which is no notification"),
                });
            }
        }
    }
    findings
}

/// The family a declaration belongs to: its `@family`, or its folder.
fn family_of<'a>(declaration: &'a Value, path: &'a str) -> &'a str {
    declaration
        .get("helix")
        .and_then(|one| one.get("family"))
        .and_then(Value::as_str)
        .unwrap_or_else(|| path.split('/').nth(1).unwrap_or_default())
}

/// What one family declares: every event name, and each request with the
/// module that declares it.
#[derive(Debug, Default)]
pub struct Declared {
    pub names: BTreeSet<String>,
    pub requests: Vec<(String, String)>,
}

/// Every family's declarations, by family.
pub type Families = BTreeMap<String, Declared>;

/// Every event name each family declares, with the file that declares each
/// request, from one manifest.
pub fn declared(manifest: &Value) -> Families {
    let mut families = Families::new();
    let list = |value: &Value, field: &str| -> Vec<Value> {
        value
            .get(field)
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()
    };
    for module in list(manifest, "modules") {
        let path = module
            .get("path")
            .and_then(Value::as_str)
            .unwrap_or_default();
        for declaration in list(&module, "declarations") {
            if declaration.get("tagName").is_none() {
                continue;
            }
            let family = family_of(&declaration, path).to_owned();
            let entry = families.entry(family).or_default();
            for event in list(&declaration, "events") {
                let Some(name) = event.get("name").and_then(Value::as_str) else {
                    continue;
                };
                entry.names.insert(name.to_owned());
                if requests(name) {
                    entry.requests.push((name.to_owned(), path.to_owned()));
                }
            }
        }
    }
    families
}

/// The families each family's files reach, which is what composing one is:
/// a relative import from `../../<family>/`.
pub fn compositions(tier: &Path) -> BTreeMap<String, BTreeSet<String>> {
    static COMPOSES: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"from '\.\./\.\./([a-z0-9-]+)/").expect("a literal pattern compiles")
    });
    let mut composed: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut files = Vec::new();
    sources(tier, &mut files);
    for file in files {
        let Some(family) = file
            .strip_prefix(tier)
            .ok()
            .and_then(|rest| rest.components().next())
            .map(|one| one.as_os_str().to_string_lossy().into_owned())
        else {
            continue;
        };
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        for reached in COMPOSES.captures_iter(&text) {
            if reached[1] != family {
                composed
                    .entry(reached[1].to_owned())
                    .or_default()
                    .insert(family.clone());
            }
        }
    }
    composed
}

/// A request a family declares with none of its follow-ups beside it, in the
/// family or in a family that composes it: an option's choice is followed by
/// the listbox's `change`.
pub fn judge_families(
    families: &Families,
    composers: &BTreeMap<String, BTreeSet<String>>,
    classes: &[Class],
    package: &str,
) -> Vec<Finding> {
    let follows: BTreeMap<&str, &[String]> = classes
        .iter()
        .map(|one| (one.name.as_str(), one.follows.as_slice()))
        .collect();
    let mut findings = Vec::new();
    for (family, declared) in families {
        let mut names = declared.names.clone();
        for composer in composers.get(family).into_iter().flatten() {
            if let Some(theirs) = families.get(composer) {
                names.extend(theirs.names.iter().cloned());
            }
        }
        let mut seen = BTreeSet::new();
        for (request, path) in &declared.requests {
            if !seen.insert(request) {
                continue;
            }
            let Some(after) = follows.get(request.as_str()) else {
                continue;
            };
            if after.is_empty() || after.iter().any(|one| names.contains(one)) {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "Send {} once the change stands, and declare it with `@event`, so a page can learn where things are without reading a proposal.",
                    after
                        .iter()
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<_>>()
                        .join(" or ")
                ),
                file: format!("{package}/{path}"),
                message: format!(
                    "the `{family}` family declares `{request}` and none of what follows it"
                ),
            });
        }
    }
    findings
}

/// The names the list holds and the names the page's tables hold, each
/// missing from the other.
pub fn judge_page(names_ts: &str, page: &str) -> Vec<Finding> {
    let listed: BTreeSet<String> = listed_names(names_ts);
    let tabled: BTreeSet<String> = ROW
        .captures_iter(page)
        .flat_map(|row| {
            TICKED
                .captures_iter(&row[1])
                .map(|one| one[1].to_owned())
                .collect::<Vec<_>>()
        })
        .collect();
    let mut findings = Vec::new();
    for name in listed.difference(&tabled) {
        findings.push(Finding {
            detail: "Add a row for it to the table in `events.mdx`, with what it means.".to_owned(),
            file: PAGE.to_owned(),
            message: format!("`{name}` is dispatched and the events table does not list it"),
        });
    }
    for name in tabled.difference(&listed) {
        findings.push(Finding {
            detail: "Take the row out, or put the name back in `names.ts` if a class sends it."
                .to_owned(),
            file: PAGE.to_owned(),
            message: format!("`{name}` is in the events table and no class sends it"),
        });
    }
    findings
}

/// The names `names.ts` writes, each without the shared prefix and separated
/// by spaces inside string literals.
fn listed_names(text: &str) -> BTreeSet<String> {
    static QUOTED: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"'([a-z0-9 -]+)'").expect("a literal pattern compiles"));
    let Some(start) = text.find("new Set(") else {
        return BTreeSet::new();
    };
    let end = text[start..]
        .find(".split(")
        .map_or(text.len(), |one| start + one);
    QUOTED
        .captures_iter(&text[start..end])
        .flat_map(|one| {
            one[1]
                .split_whitespace()
                .map(|name| format!("helix-{name}"))
                .collect::<Vec<_>>()
        })
        .collect()
}

/// Every finding the grammar makes over a workspace, and how many classes it
/// read.
pub fn run(context: &Context) -> (usize, Vec<Finding>) {
    let tiers = context.settings.roots(&context.root);
    let mut classes = Vec::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            if let Ok(text) = fs::read_to_string(&file) {
                classes.extend(classes_in(&text, &context.relative(&file)));
            }
        }
    }
    let mut findings = judge_classes(&classes);
    /* Composition is read across the tiers, because a styled family takes
    its parts the way its headless one does without importing them again:
    the styled Listbox registers no Option, and the headless one composes it. */
    let mut composers: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for tier in &tiers {
        for (family, by) in compositions(tier) {
            composers.entry(family).or_default().extend(by);
        }
    }
    for tier in &tiers {
        let Some(manifest) = context.manifest(tier) else {
            continue;
        };
        let package = context.relative(tier.parent().unwrap_or(Path::new("")));
        findings.extend(judge_families(
            &declared(manifest),
            &composers,
            &classes,
            &package,
        ));
    }
    if let (Ok(names), Ok(page)) = (
        fs::read_to_string(context.root.join(NAMES)),
        fs::read_to_string(context.root.join(PAGE)),
    ) {
        findings.extend(judge_page(&names, &page));
    }
    (classes.len(), findings)
}

#[cfg(test)]
mod tests {
    use std::collections::{BTreeMap, BTreeSet};

    use serde_json::json;

    use super::{classes_in, declared, judge_classes, judge_families, judge_page};

    fn class(doc: &str, name: &str, cancelable: bool) -> String {
        format!(
            "{doc}\nexport class X extends CustomEvent<D> {{\n  static readonly eventName = '{name}'\n\n  constructor() {{\n    super(X.eventName, {{ cancelable: {cancelable} }})\n  }}\n}}\n"
        )
    }

    fn messages(text: &str) -> Vec<String> {
        judge_classes(&classes_in(text, "events.ts"))
            .into_iter()
            .map(|one| one.message)
            .collect()
    }

    #[test]
    fn a_request_is_named_before_and_names_what_follows_it() {
        let text = class(
            "/**\n * Asks.\n *\n * @followedBy helix-sort\n */",
            "helix-before-sort",
            true,
        ) + &class("/** Says. */", "helix-sort", false);
        assert_eq!(messages(&text), Vec::<String>::new());
    }

    /// `helix-sort` was the request before October 25, 2026.
    #[test]
    fn a_cancelable_plain_name_is_refused_unless_it_is_a_command() {
        assert_eq!(
            messages(&class("/** Asks. */", "helix-sort", true)),
            ["`helix-sort` is cancelable and is not named `helix-before-*`"]
        );
        assert!(messages(&class("/** Sends. */", "helix-send", true)).is_empty());
    }

    #[test]
    fn a_request_that_cannot_be_refused_is_reported() {
        assert!(
            messages(&class("/** @followedBy change */", "helix-before-x", false)).contains(
                &"`helix-before-x` is named for a request and is not cancelable".to_owned()
            )
        );
    }

    #[test]
    fn a_request_names_a_follow_up_that_is_a_notification() {
        assert_eq!(
            messages(&class("/** Asks. */", "helix-before-x", true)),
            ["`helix-before-x` names no follow-up"]
        );
        assert_eq!(
            messages(&class("/** @followedBy helix-x */", "helix-before-x", true)),
            ["`helix-before-x` is followed by `helix-x`, which is no notification"]
        );
        assert!(messages(&class("/** @followedBy change */", "helix-before-x", true)).is_empty());
    }

    #[test]
    fn a_family_declaring_a_request_declares_what_follows_it() {
        let classes = classes_in(
            &class("/** @followedBy helix-sort */", "helix-before-sort", true),
            "x.ts",
        );
        let manifest = |events: serde_json::Value| {
            json!({ "modules": [{ "path": "src/table/root/table-root.ts", "declarations": [
                { "tagName": "helix-table", "events": events },
            ]}]})
        };
        let alone = declared(&manifest(json!([{ "name": "helix-before-sort" }])));
        let none = BTreeMap::new();
        assert_eq!(
            judge_families(&alone, &none, &classes, "helix/headless")
                .into_iter()
                .map(|one| one.message)
                .collect::<Vec<_>>(),
            ["the `table` family declares `helix-before-sort` and none of what follows it"]
        );
        let paired = declared(&manifest(json!([
            { "name": "helix-before-sort" },
            { "name": "helix-sort" },
        ])));
        assert!(judge_families(&paired, &none, &classes, "helix/headless").is_empty());
    }

    /// An option's choice is followed by the `change` of the listbox around it.
    #[test]
    fn a_follow_up_may_come_from_a_family_that_composes_this_one() {
        let classes = classes_in(
            &class("/** @followedBy change */", "helix-before-select", true),
            "x.ts",
        );
        let manifest = json!({ "modules": [
            { "path": "src/option/root/option-root.ts", "declarations": [
                { "tagName": "helix-option", "events": [{ "name": "helix-before-select" }] },
            ]},
            { "path": "src/listbox/root/listbox-root.ts", "declarations": [
                { "tagName": "helix-listbox", "events": [{ "name": "change" }] },
            ]},
        ]});
        let composers =
            BTreeMap::from([("option".to_owned(), BTreeSet::from(["listbox".to_owned()]))]);
        assert!(
            judge_families(&declared(&manifest), &composers, &classes, "helix/headless").is_empty()
        );
        assert_eq!(
            judge_families(
                &declared(&manifest),
                &BTreeMap::new(),
                &classes,
                "helix/headless"
            )
            .len(),
            1
        );
    }

    #[test]
    fn the_page_tables_every_name_the_list_holds() {
        let names = "export const helixEventNames = new Set(\n  ('before-sort sort ' + 'check')\n    .split(' ')\n)";
        let page = "| Event | Meaning |\n|---|---|\n| `helix-before-sort`, `helix-sort` | A sort |\n| `helix-toggle` | Gone |\n";
        assert_eq!(
            judge_page(names, page)
                .into_iter()
                .map(|one| one.message)
                .collect::<Vec<_>>(),
            [
                "`helix-check` is dispatched and the events table does not list it",
                "`helix-toggle` is in the events table and no class sends it",
            ]
        );
    }
}
