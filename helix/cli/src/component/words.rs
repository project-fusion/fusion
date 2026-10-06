//! Every built-in English default is a word property.
//!
//! **A page translates a component through the words registry**, which reads
//! a property only where `@words` declares it: `registerWords('de', {
//! 'helix-combobox': { emptyText: 'Keine Treffer' } })` reaches `emptyText`
//! because it is a word property, and reaches nothing a component wrote
//! anywhere else. So an English default outside the registry is a sentence
//! that stays English on every page.
//!
//! **A component moves to the registry by declaring `static words`**, the key
//! its words register under, and from then on this holds it to three things:
//!
//! 1. A property whose name says it holds words (`…Label`, `…Labels`, `…Text`,
//!    `…Message`, `…Description`, `…Words`, `label` or `placeholder`) and
//!    whose default is English is declared `@words`, above its `@property`.
//! 2. A `@words` property has an English default, which is what the registry
//!    falls back to and what translators translate.
//! 3. No plain template literal joins a word property with other text. The
//!    order of a sentence is the translator's, so it belongs in the message.
//!
//! **A component that has not moved yet is counted, not failed.** The registry
//! arrived with Combobox and Data Table on it and every other family still to
//! move, so the count is visible work, in the notes, until it reaches zero.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{line_of, uncommented};
use crate::component::{sources, Context, Finding, Report};

/// A reactive property: whether `@words` sits above it, its name, and its
/// initializer.
static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)^[ \t]*(@words(?:\(\))?[ \t]*\n[ \t]*)?@property\((?:[^()]|\([^()]*\))*\)\s*\n\s*(?:override\s+)?(?:declare\s+)?(\w+)\??\s*(?::[^=\n]+)?(?:=\s*([^\n]+?))?\s*$",
    )
    .expect("a literal pattern compiles")
});

/// A name that says the property holds words.
static WORDY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:label|placeholder|\w+(?:Label|Labels|Text|Message|Description|Words))$")
        .expect("a literal pattern compiles")
});

/// The key a class registers its words under.
static KEY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static\s+(?:override\s+)?words\s*=\s*['`]").expect("a literal pattern compiles")
});

/// A template literal with no tag, which builds a string in code.
static PLAIN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:^|[^\w$.`])`([^`]*)`").expect("a literal pattern compiles"));

/// An interpolation in a template literal.
static HOLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\$\{([^}]*)\}").expect("a literal pattern compiles"));

/// One reactive property as written.
struct Declared {
    at: usize,
    name: String,
    words: bool,
    /// The initializer, where it is a string or a table holding a letter.
    english: bool,
}

/// Every reactive property in a module.
fn declared(code: &str) -> Vec<Declared> {
    DECLARATION
        .captures_iter(code)
        .map(|found| {
            let value = found.get(3).map_or("", |one| one.as_str().trim());
            let name = found[2].to_owned();
            let quoted = value.starts_with(['\'', '"', '`']);
            let table =
                value.starts_with('{') && (name.ends_with("Words") || name.ends_with("Labels"));
            Declared {
                at: found.get(2).map_or(0, |one| one.start()),
                english: (quoted || table) && value.chars().any(char::is_alphabetic),
                name,
                words: found.get(1).is_some(),
            }
        })
        .collect()
}

/// The family a source file belongs to: the folder under its tier.
fn family_of(tier: &Path, file: &Path) -> String {
    file.strip_prefix(tier)
        .ok()
        .and_then(|rest| rest.components().next())
        .map_or_else(String::new, |one| {
            one.as_os_str().to_string_lossy().to_string()
        })
}

/// What a moved class says about its own properties: how many it holds to the
/// registry, and where it falls short.
fn judged(properties: &[Declared], at: &dyn Fn(usize) -> String) -> (usize, Vec<Finding>) {
    let mut checked = 0;
    let mut findings = Vec::new();
    for one in properties {
        if one.words {
            checked += 1;
            if !one.english {
                findings.push(Finding {
                    detail: "The English is what the registry falls back to and what a \
                             translator translates."
                        .to_owned(),
                    file: at(one.at),
                    message: format!("`@words` property `{}` has no English default", one.name),
                });
            }
        } else if one.english && WORDY.is_match(&one.name) {
            checked += 1;
            findings.push(Finding {
                detail: "Write `@words` above its `@property`, so a page can register words \
                         for it by locale."
                    .to_owned(),
                file: at(one.at),
                message: format!(
                    "`{}` defaults to English and is not a word property",
                    one.name
                ),
            });
        }
    }
    (checked, findings)
}

/// Every plain template literal that joins one of `wordy` with other text.
fn joins(code: &str, wordy: &[&str], at: &dyn Fn(usize) -> String) -> Vec<Finding> {
    let mut findings = Vec::new();
    for literal in PLAIN.captures_iter(code) {
        let body = &literal[1];
        let holes: Vec<String> = HOLE
            .captures_iter(body)
            .map(|hole| hole[1].trim().to_owned())
            .collect();
        let Some(joined) = holes.iter().find(|hole| {
            hole.strip_prefix("this.")
                .is_some_and(|name| wordy.contains(&name))
        }) else {
            continue;
        };
        if holes.len() < 2 && HOLE.replace_all(body, "").trim().is_empty() {
            continue;
        }
        findings.push(Finding {
            detail: "Put the other text in the message, with a placeholder for each value, so a \
                     translation can order the sentence."
                .to_owned(),
            file: at(literal.get(1).map_or(0, |one| one.start())),
            message: format!("a template literal joins `{joined}` with other text"),
        });
    }
    findings
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    let mut waiting: BTreeMap<String, usize> = BTreeMap::new();

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let code = uncommented(&text);
            let properties = declared(&code);
            let at =
                |offset: usize| format!("{}:{}", context.relative(&file), line_of(&code, offset));

            if !KEY.is_match(&code) {
                let held = properties
                    .iter()
                    .filter(|one| one.english && WORDY.is_match(&one.name))
                    .count();
                if held > 0 {
                    *waiting.entry(family_of(&tier, &file)).or_default() += held;
                }
                if let Some(first) = properties.iter().find(|one| one.words) {
                    findings.push(Finding {
                        detail: "Name the family's styled tag, `static words = 'helix-…'`, so a \
                                 page can register words for it."
                            .to_owned(),
                        file: at(first.at),
                        message: format!(
                            "`{}` is a word property in a class that declares no `static words`",
                            first.name
                        ),
                    });
                }
                continue;
            }

            let (counted, found) = judged(&properties, &at);
            checked += counted;
            findings.extend(found);
            let wordy: Vec<&str> = properties
                .iter()
                .filter(|one| one.words)
                .map(|one| one.name.as_str())
                .collect();
            findings.extend(joins(&code, &wordy, &at));
        }
    }

    let notes = if waiting.is_empty() {
        Vec::new()
    } else {
        let total: usize = waiting.values().sum();
        vec![format!(
            "{total} built-in English defaults in {} families are not word properties yet: {}",
            waiting.len(),
            waiting.keys().cloned().collect::<Vec<_>>().join(", ")
        )]
    };

    Report {
        checked,
        findings,
        notes,
        unit: "word properties",
    }
}
