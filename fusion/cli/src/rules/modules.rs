//! A plain stylesheet may not select a class only a CSS module declares.
//!
//! **A CSS module rewrites its class names, so the source name is not the name
//! in the document.** A page stylesheet carried
//! `:root:has(.auraStage) .siteFooter { display: none }` from the day the page
//! was written and it had never once matched: `.siteFooter` is the source name
//! of a rule in a module, the element carries
//! `chrome-module__sKhELq__siteFooter`, and the only thing able to select that
//! is `styles.siteFooter` from inside the module. Measured before the fix, the
//! footer was `display: block` and 84 pixels tall under a stage that is already
//! `100svh`, on a page whose own stylesheet had been asking for it to be hidden
//! the whole time.
//!
//! **It is the same fault as a `[part=]` selector for a part nothing renders**,
//! and the module boundary makes it worse: the rule reads correctly, the name is
//! spelled correctly, the name it wants is right there in a sibling file, and
//! there is no error, no warning and no clue beyond the feature not happening.
//!
//! **What makes a class legitimate is markup that writes it out**, not another
//! stylesheet mentioning it. A name written `className="auraStage"` as a literal
//! reaches the document exactly as typed and the rule matches. A name reached
//! only through `styles.siteFooter` never appears literally anywhere and no
//! plain rule can ever see it.
//!
//! So the test is the row's own words: a class a module declares and **nothing
//! writes out**. Asking instead whether some other plain sheet mentions the name
//! fails on the exact case this exists for, since the offending rule
//! `.auraProbe .siteFooter` mentions the name itself and would clear itself.
//!
//! **The whole workspace, rather than a list of roots.** A root list goes stale
//! silently: it survives a rename by scanning a directory that is no longer
//! there and reporting green against a fraction of its subject. There is nothing
//! to keep current here.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// A class this sheet declares a rule for.
static DECLARES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)(?:^|[\s,>+~({])\.(-?[_a-zA-Z][\w-]*)").expect("a literal pattern compiles")
});

/// A class written into the document literally, under the name the author typed.
static WRITTEN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"\bclass(?:Name)?=(?:"([^"]*)"|'([^']*)')"#).expect("a literal pattern compiles")
});

fn declares(code: &str) -> Vec<String> {
    let text = COMMENT.replace_all(code, "");
    let mut found: Vec<String> = DECLARES
        .captures_iter(&text)
        .map(|one| one[1].to_owned())
        .collect();
    found.sort();
    found.dedup();
    found
}

pub fn run(context: &Context) -> Report {
    let mut sheets = Vec::new();
    crawl(
        &context.root,
        &|path| {
            path.extension()
                .is_some_and(|one| one.eq_ignore_ascii_case("css"))
        },
        &mut sheets,
    );

    /* Where a class is declared by a module, so the document never carries it
    under the name written here. */
    let mut rewritten: BTreeMap<String, String> = BTreeMap::new();
    for sheet in sheets.iter().filter(|one| {
        one.file_name()
            .is_some_and(|name| name.to_string_lossy().ends_with(".module.css"))
    }) {
        let Ok(text) = fs::read_to_string(sheet) else {
            continue;
        };
        let where_ = sheet
            .strip_prefix(&context.root)
            .unwrap_or(sheet)
            .to_string_lossy()
            .replace('\\', "/");
        for name in declares(&text) {
            rewritten.entry(name).or_insert_with(|| where_.clone());
        }
    }

    /* `styles.foo` is deliberately not counted: that is the rewritten form and
    is the whole reason a plain rule cannot see it. */
    let mut markup = Vec::new();
    crawl(
        &context.root,
        &|path| {
            path.extension().is_some_and(|one| {
                matches!(
                    one.to_string_lossy().as_ref(),
                    "ts" | "tsx" | "html" | "mdx"
                )
            })
        },
        &mut markup,
    );
    let mut literal: BTreeSet<String> = BTreeSet::new();
    for file in &markup {
        let Ok(code) = fs::read_to_string(file) else {
            continue;
        };
        for found in WRITTEN.captures_iter(&code) {
            let value = found
                .get(1)
                .or_else(|| found.get(2))
                .map_or("", |one| one.as_str());
            for name in value.split_whitespace() {
                literal.insert(name.to_owned());
            }
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for sheet in sheets.iter().filter(|one| {
        !one.file_name()
            .is_some_and(|name| name.to_string_lossy().ends_with(".module.css"))
    }) {
        let Ok(text) = fs::read_to_string(sheet) else {
            continue;
        };
        let where_ = sheet
            .strip_prefix(&context.root)
            .unwrap_or(sheet)
            .to_string_lossy()
            .replace('\\', "/");
        for name in declares(&text) {
            checked += 1;
            if literal.contains(&name) {
                continue;
            }
            let Some(owner) = rewritten.get(&name) else {
                continue;
            };
            findings.push(Finding {
                detail: format!(
                    "A CSS module rewrites its class names, so the document carries a hashed one \
                     and this rule matches nothing, silently. Select it by an attribute the \
                     bundler cannot rename, or move the rule inside the module and use \
                     `styles.{name}`."
                ),
                file: where_.clone(),
                message: format!("selects `.{name}`, which only `{owner}` declares"),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "class selectors in plain stylesheets",
    }
}
