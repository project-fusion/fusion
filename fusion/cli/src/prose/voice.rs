//! Holds the text a reader sees to the patterns `.github/VOICE.md` rules out.
//!
//! VOICE.md asks for plain statements. Three of its rules can be checked by
//! pattern, so this checks them:
//!
//! - no contractions, such as "don't" or "it's"
//! - no "rather than", the most common way a claim gets argued against a
//!   position nobody took
//! - no sentence that ends in ", not" and a short phrase, such as "Tokens are a
//!   function, not a table."
//!
//! **Only the text a reader sees.** That is the docs pages, the example
//! summaries, the descriptions on a component's tags, and the first paragraph of
//! each property, which are the parts the reference shows. Later paragraphs of
//! a doc comment reach only an editor's hover, and code comments reach no
//! reader, so neither is checked. An article with an `author` is the author's
//! own essay, and is exempt.
//!
//! **No fix.** Each pattern needs the sentence rewritten, and which rewrite is a
//! reading of the sentence.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::prose::dialect::corpus;
use crate::rules::{Context, Finding, Report};

/// A contraction. The list is the common ones, so a possessive never matches.
static CONTRACTION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)\b(?:don|doesn|isn|aren|can|won|wouldn|shouldn|couldn|didn|hasn|haven|wasn|weren)['\u{2019}]t\b|\b(?:it|that|there|what|let|here)['\u{2019}]s\b|\b(?:you|we|they)['\u{2019}](?:re|ll|ve|d)\b|\bI['\u{2019}](?:m|ve|d|ll)\b",
    )
    .expect("a literal pattern compiles")
});

static RATHER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)\brather than\b").expect("a literal pattern compiles"));

/// ", not" and a phrase of up to five words that ends the sentence.
static NOT_THAT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r", not (?:a |an |the )?[\w'\u{2019} -]{1,30}[.;](?:\s|$)")
        .expect("a literal pattern compiles")
});

/// Inline code, which quotes a name and is never prose.
static CODE_SPAN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`[^`]*`").expect("a literal pattern compiles"));

/// A doc comment tag whose description the reference shows.
static TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^\s*\*\s*@(?:summary|slot|csspart|cssproperty|cssprop|cssstate|event|fires)\b(.*)$",
    )
    .expect("a literal pattern compiles")
});

/// What each pattern asks for instead.
const PATTERNS: [(&str, &str); 3] = [
    (
        "a contraction",
        "Write the words out, such as \"does not\" and \"it is\". See VOICE.md, rule 7.",
    ),
    (
        "\"rather than\"",
        "State the claim, and drop the position it argues against. See VOICE.md, rule 2.",
    ),
    (
        "a sentence that ends \", not\" and a phrase",
        "State what the thing is. See VOICE.md, rule 2.",
    ),
];

fn regex(index: usize) -> &'static Regex {
    match index {
        0 => &CONTRACTION,
        1 => &RATHER,
        _ => &NOT_THAT,
    }
}

/// Which lines of a file are prose a reader sees, by where the file lives.
enum Scope {
    /// A docs page: every line outside frontmatter keys, fences, and markers.
    Page,
    /// An example: its `@summary` line.
    Example,
    /// Component source: tag descriptions, and each property's first paragraph.
    Source,
}

/// Whether a path has an extension, compared without case.
fn has_extension(relative: &str, extension: &str) -> bool {
    Path::new(relative)
        .extension()
        .is_some_and(|one| one.eq_ignore_ascii_case(extension))
}

/// Whether a path is a spec, whose markup is fixtures and not a reader's text.
fn is_spec(relative: &str) -> bool {
    Path::new(relative)
        .file_stem()
        .is_some_and(|stem| stem.to_string_lossy().ends_with(".spec"))
}

fn scope(relative: &str, text: &str) -> Option<Scope> {
    let page = [
        "helix/docs/content/",
        "cortex/docs/content/",
        "fusion/docs/insights/content/",
    ]
    .iter()
    .any(|root| relative.starts_with(root))
        && has_extension(relative, "mdx");
    if page {
        /* An article with an author is that person's essay. */
        let front = text.split("\n---").next().unwrap_or("");
        return (!front.lines().any(|line| line.starts_with("author:"))).then_some(Scope::Page);
    }
    if relative.contains("/.examples/") && has_extension(relative, "html") {
        return Some(Scope::Example);
    }
    let source = [
        "helix/headless/src/",
        "helix/styled/src/",
        "helix/core/src/",
    ]
    .iter()
    .any(|root| relative.starts_with(root))
        && has_extension(relative, "ts")
        && !is_spec(relative);
    source.then_some(Scope::Source)
}

/// The lines to check, as (line number, text).
fn lines(scope: &Scope, text: &str) -> Vec<(usize, String)> {
    let all: Vec<&str> = text.split('\n').collect();
    let mut out = Vec::new();
    match scope {
        Scope::Page => {
            let mut fenced = false;
            for (index, line) in all.iter().enumerate() {
                if line.trim_start().starts_with("```") {
                    fenced = !fenced;
                    continue;
                }
                if fenced || line.starts_with("[//]") {
                    continue;
                }
                out.push((index, (*line).to_owned()));
            }
        }
        Scope::Example => {
            for (index, line) in all.iter().enumerate() {
                if let Some(at) = line.find("@summary ") {
                    out.push((index, line[at + 9..].replace("-->", "")));
                }
            }
        }
        Scope::Source => {
            for (index, line) in all.iter().enumerate() {
                if let Some(found) = TAG.captures(line) {
                    out.push((index, found[1].to_owned()));
                }
            }
            /* A property's first paragraph: the doc block that ends right above
            an `@property` decorator, up to its first blank line. */
            for (index, line) in all.iter().enumerate() {
                if !line.trim_start().starts_with("@property(") {
                    continue;
                }
                let Some(end) = index.checked_sub(1) else {
                    continue;
                };
                if !all[end].trim_end().ends_with("*/") {
                    continue;
                }
                let mut start = end;
                while start > 0 && !all[start].contains("/**") {
                    start -= 1;
                }
                for (at, text) in all.iter().enumerate().take(end + 1).skip(start) {
                    let prose = text
                        .trim()
                        .trim_start_matches("/**")
                        .trim_end_matches("*/")
                        .trim_start_matches('*')
                        .trim();
                    if prose.is_empty() && at > start {
                        break;
                    }
                    if prose.starts_with('@') {
                        break;
                    }
                    out.push((at, prose.to_owned()));
                }
            }
        }
    }
    out
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for file in corpus(context) {
        let where_ = context.relative(&file);
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        let Some(scope) = scope(&where_, &text) else {
            continue;
        };
        checked += 1;
        for (index, line) in lines(&scope, &text) {
            let prose = CODE_SPAN.replace_all(&line, "");
            for (at, (message, detail)) in PATTERNS.iter().enumerate() {
                if regex(at).is_match(&prose) {
                    findings.push(Finding {
                        detail: (*detail).to_owned(),
                        file: format!("{where_}:{}", index + 1),
                        message: format!("{message}, which VOICE.md rules out"),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "files a reader sees",
    }
}
