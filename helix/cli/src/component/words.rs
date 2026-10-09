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
//! **The same in a project built on Helix**, whose components declare
//! `@words` and `static words` from `@fusion.dev/helix-core` and are
//! translated by the same registry.
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
            let value = found.get(3).map_or("", |one| {
                table_at(code, one.start()).unwrap_or(one.as_str()).trim()
            });
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

/// A table initializer from its opening brace to the brace that closes it,
/// where it begins at `at`, so a table written over several lines reads as a
/// whole: its English is on the lines after the one it starts on.
fn table_at(code: &str, at: usize) -> Option<&str> {
    let bytes = code.as_bytes();
    if bytes.get(at) != Some(&b'{') {
        return None;
    }
    let mut depth = 0usize;
    let mut quote: Option<u8> = None;
    let mut index = at;
    while index < bytes.len() {
        let one = bytes[index];
        match quote {
            Some(_) if one == b'\\' => index += 1,
            Some(open) if one == open => quote = None,
            Some(_) => {}
            None => match one {
                b'\'' | b'"' | b'`' => quote = Some(one),
                b'{' => depth += 1,
                b'}' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(&code[at..=index]);
                    }
                }
                _ => {}
            },
        }
        index += 1;
    }
    None
}

/// What the scanner is inside: code, which may be an interpolation of a
/// template, or a template's text.
enum Frame {
    /// Code, with the braces opened in it and, inside an interpolation, the
    /// code as written, nested templates left out.
    Code { depth: usize, hole: Option<Vec<u8>> },
    /// A template literal's text, with whether a tag reads it and where it starts.
    Template {
        tagged: bool,
        at: usize,
        text: Vec<u8>,
    },
}

/// Every template literal no tag reads, each with the offset its text starts
/// at and its text, each interpolation kept as `${…}`.
///
/// **Templates nest**, so a closing backtick is paired with the backtick that
/// opened it. A regular expression pairing backticks in order read the text
/// after an inner `html` template's closing backtick as a plain literal, and
/// reported a word in the outer template as joined in code.
fn plain_templates(code: &str) -> Vec<(usize, String)> {
    let bytes = code.as_bytes();
    let mut stack = vec![Frame::Code {
        depth: 0,
        hole: None,
    }];
    let mut found = Vec::new();
    let mut index = 0;
    while index < bytes.len() {
        let one = bytes[index];
        let next = bytes.get(index + 1).copied();
        let Some(frame) = stack.last_mut() else {
            break;
        };
        match frame {
            Frame::Code { depth, hole } => match one {
                b'\'' | b'"' => {
                    let from = index;
                    index += 1;
                    while index < bytes.len() && bytes[index] != one && bytes[index] != b'\n' {
                        index += usize::from(bytes[index] == b'\\') + 1;
                    }
                    let to = (index + 1).min(bytes.len());
                    if let Some(hole) = hole {
                        hole.extend_from_slice(&bytes[from..to]);
                    }
                }
                b'`' => {
                    let tagged = index > 0 && {
                        let before = bytes[index - 1];
                        before.is_ascii_alphanumeric()
                            || matches!(before, b'_' | b'$' | b')' | b']')
                    };
                    if let Some(hole) = hole {
                        hole.extend_from_slice(b"``");
                    }
                    stack.push(Frame::Template {
                        tagged,
                        at: index + 1,
                        text: Vec::new(),
                    });
                }
                b'}' if *depth == 0 && hole.is_some() => {
                    let written = hole.take().unwrap_or_default();
                    stack.pop();
                    if let Some(Frame::Template { text, .. }) = stack.last_mut() {
                        text.extend_from_slice(&written);
                        text.push(b'}');
                    }
                }
                _ => {
                    match one {
                        b'{' => *depth += 1,
                        b'}' => *depth = depth.saturating_sub(1),
                        _ => {}
                    }
                    if let Some(hole) = hole {
                        hole.push(one);
                    }
                }
            },
            Frame::Template { tagged, at, text } => match one {
                b'\\' => {
                    text.push(one);
                    if let Some(escaped) = next {
                        text.push(escaped);
                    }
                    index += 1;
                }
                b'`' => {
                    if !*tagged {
                        found.push((*at, String::from_utf8_lossy(text).into_owned()));
                    }
                    stack.pop();
                }
                b'$' if next == Some(b'{') => {
                    text.extend_from_slice(b"${");
                    stack.push(Frame::Code {
                        depth: 0,
                        hole: Some(Vec::new()),
                    });
                    index += 1;
                }
                _ => text.push(one),
            },
        }
        index += 1;
    }
    found
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
    for (start, body) in plain_templates(code) {
        let body = body.as_str();
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
            file: at(start),
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
                        detail: "Set `static words` to the tag a page registers the family's \
                                 words under, such as its own tag, so a page can register words \
                                 for it."
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
