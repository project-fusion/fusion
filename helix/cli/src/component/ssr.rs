//! A server-rendered assertion is made against structure, not against the string.
//!
//! **Declarative shadow DOM inlines the component's stylesheet into the very
//! markup being asserted**, and that stylesheet names every part, host attribute
//! and token the component uses. So `toContain('part="media"')` passes on a
//! *selector*, and `not.toContain('data-scrolled')` fails on a
//! `:host([data-scrolled])` *rule*. Both say nothing about what rendered.
//!
//! The structural helpers are the way through: one strips the sheet, others read
//! the host tag, the host attributes, or one rendered part. Anything that went
//! through one of them is fine; the raw return of the render is not.
//!
//! **`toContain` and `toMatch`, in both polarities.** A pattern lies the same
//! way a substring does: `toMatch(/orientation="horizontal"/)` passes against
//! `:host([orientation="horizontal"])` in the component's own inlined
//! stylesheet, on a host carrying no such attribute at all.
//!
//! **A whole-string `toBe` is left alone**: it is not a substring search and
//! would fail loudly rather than quietly.
//!
//! **The script this replaces could not fail, and porting it is how that was
//! found.** It read the asserted subject with `expect\(\s*([\w.()]+)`, whose
//! class holds both parens, so `expect(markup).toContain(...)` captured
//! `markup).toContain(` and the call-stripping step left `markup).toContain` —
//! a name no binding ever has. Every assertion it looked at was therefore
//! somebody else's. Two things hid it: the fault it exists for was never
//! planted, and its success line carries no number, so the meta-rule that
//! refuses a check counting nothing had nothing to read and skipped it. The
//! subject is matched with `[\w.]+` here, which stops at the first paren or
//! bracket on its own and needs no second step.
//!
//! **Making it fire then exposed the second thing it had never had to get
//! right.** The script keeps one set of raw names per file, and a spec file
//! routinely binds `markup` once per test: narrowed in the first, whole in the
//! third. A per-file set reports every use of the name, so switching the rule on
//! produced 65 findings across 32 files of which most were the same binding
//! read in the wrong test. The binding is resolved per use here, by the nearest
//! `const` above it, and its value is read as a balanced expression rather than
//! to the end of a line, because the narrowing call routinely wraps a render
//! across three of them.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{specs, Context, Finding, Report};

/// The helpers that narrow a rendered document to something structural.
const HELPERS: [&str; 6] = [
    "hasPart",
    "hostAttributes",
    "hostTag",
    "partTag",
    /* The counterpart to stripping: a test asserting the sheet is *carried* is
    asking about the styles rather than about the markup, and reaching for the
    whole document to do it reads identically to the fault this rule is for. */
    "styles",
    "withoutStyles",
];

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// A binding, up to and including its `=`.
static BOUND: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:const|let)\s+(\w+)\s*=").expect("a literal pattern compiles"));

static RENDERED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bssr\(").expect("a literal pattern compiles"));

/// A substring or pattern assertion, in either polarity.
static LOOSE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\.(not\.)?(toContain|toMatch)\(").expect("a literal pattern compiles")
});

static SUBJECT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"expect\(\s*([\w.]+)").expect("a literal pattern compiles"));

/// The byte offset a line starts at.
fn offset_of(text: &str, line: usize) -> usize {
    text.split_inclusive('\n').take(line).map(str::len).sum()
}

/// What the nearest `const` above `at` assigned to `name`.
///
/// **The nearest, because a spec file binds `markup` once per test** and the
/// same name is narrowed in one and whole in another. A set of names per file
/// cannot tell those apart and reports both.
fn bound(text: &str, name: &str, at: usize) -> Option<String> {
    let start = BOUND
        .captures_iter(&text[..at])
        .filter(|found| found.get(1).is_some_and(|one| one.as_str() == name))
        .map(|found| found.get(0).expect("group zero always matches").end())
        .last()?;
    Some(expression(text, start))
}

/// The expression beginning at `from`, as far as its parentheses balance.
///
/// A narrowing call routinely wraps a render across three lines, so reading to
/// the end of the first one sees the call and not what it was given, or the
/// render and not the call around it, depending which way it was written.
fn expression(text: &str, from: usize) -> String {
    let bytes = text.as_bytes();
    let line_end = text[from..].find('\n').map_or(text.len(), |at| at + from);
    let Some(open) = text[from..line_end].find('(').map(|at| at + from) else {
        return text[from..line_end].to_owned();
    };
    let mut depth = 0;
    let mut index = open;
    while index < bytes.len() {
        match bytes[index] {
            b'(' => depth += 1,
            b')' => {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            }
            _ => {}
        }
        index += 1;
    }
    text[from..(index + 1).min(text.len())].to_owned()
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        specs(&tier, ".ssr.spec.ts", &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let text = COMMENT.replace_all(&raw, "");
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");

            for (number, line) in text.lines().enumerate() {
                if !LOOSE.is_match(line) {
                    continue;
                }
                let Some(found) = SUBJECT.captures(line) else {
                    continue;
                };
                let subject = found.get(1).expect("the subject always matches").as_str();
                checked += 1;

                /* The render itself, asserted without ever being named. */
                if subject != "ssr" {
                    let at = offset_of(&text, number);
                    let Some(value) = bound(&text, subject, at) else {
                        continue;
                    };
                    /* Narrowed by a helper, whatever else the expression does. */
                    if !RENDERED.is_match(&value)
                        || HELPERS
                            .iter()
                            .any(|helper| value.contains(&format!("{helper}(")))
                    {
                        continue;
                    }
                }

                findings.push(Finding {
                    detail: "Read it through a structural helper first: one that strips the \
                             stylesheet, or one that reads the host or a single part."
                        .to_owned(),
                    file: format!("{where_}:{}", number + 1),
                    message: format!(
                        "`{subject}` is the whole server document, stylesheet included, so a \
                         substring or pattern match finds a selector as readily as a rendered \
                         attribute"
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        unit: "server-rendered assertions",
    }
}
