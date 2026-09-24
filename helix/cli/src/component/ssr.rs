//! A server-rendered assertion is made against what rendered, not against the document.
//!
//! **The document is wider than the render twice over, and each layer had to be
//! taken off before the next one was visible.**
//!
//! **The stylesheet.** Declarative shadow DOM inlines the component's own sheet
//! into the very markup being asserted, and that sheet names every part, host
//! attribute and token the component uses. So `toContain('part="media"')` passes
//! on a *selector*, and `not.toContain('data-scrolled')` fails on a
//! `:host([data-scrolled])` *rule*. Both say nothing about what rendered.
//!
//! **The host's own opening tag**, which `withoutStyles` leaves behind and which
//! is the consumer's markup echoed back. Measured: `<helix-date-input
//! value="2026-08-18">` renders `August 18, 2026` into its field by design, and
//! the spec claiming the date was already in the field passed for six weeks on
//! the `value` sitting in the host tag two characters away. It would have passed
//! had the field rendered nothing at all.
//!
//! The sweep that preceded this rule found six more read one at a time, of which
//! the plainest is a tree asserting `toContain('helix')` on a document opening
//! `<helix-headless-tree`: it passed with the whole render replaced by one empty
//! element. And it found the same fault in a shape twenty-five specs shared, a
//! part's server spec asking whether it renders at all by searching the document
//! for its own tag name, which is the host's opening tag and is there whatever
//! the shadow root holds. Each of those passed against an empty render.
//!
//! So the line is drawn by polarity, because the two halves need different
//! subjects.
//!
//! **A positive match has to come through a helper that takes the host tag off**
//! as well as the sheet: `rendered` for the render, `partTag` for one part of
//! it, `servedParts` for the frame whole, `styles` for the sheet a test is
//! deliberately asking about, and `hostTag` or `hostAttributes` for an assertion
//! that is honestly about what the consumer wrote and should say so.
//!
//! **A negative match may still come through `withoutStyles`.** What it asks is
//! that something is absent from the document, and the host tag cannot satisfy
//! it: a `part=` or a rendered `role` is not something a consumer writes on a
//! host, so the wider subject only makes the claim stronger.
//!
//! **`toContain` and `toMatch`.** A pattern lies the same way a substring does:
//! `toMatch(/orientation="horizontal"/)` passes against
//! `:host([orientation="horizontal"])` in the component's own inlined
//! stylesheet, on a host carrying no such attribute at all.
//!
//! **A whole-string `toBe` is left alone**: it is not a substring search and
//! would fail loudly rather than quietly. So is `toEqual`, which is how
//! `servedParts` and `hostAttributes` are read.
//!
//! **The subject is read as a balanced expression and the assertion off its
//! tail**, rather than both being matched on one line. This is the third bug of
//! that family in this one rule and the reason for the shape.
//!
//! The script this replaced read the subject with `expect\(\s*([\w.]+)`, whose
//! class holds both parens, so `expect(markup).toContain(…)` captured
//! `markup).toContain(`, a name no binding ever has, and every assertion it
//! examined was somebody else's.
//!
//! Then a per-file set of raw names reported every use of a name that was
//! narrowed in one test and whole in another: 65 findings across 32 files, most
//! of them the same binding read in the wrong test. A binding is resolved per
//! use here, by the nearest `const` above it.
//!
//! Then requiring `expect(` and `toContain(` on one line missed every assertion
//! a formatter had wrapped, which is most of the ones whose subject is a call:
//! measured at the sweep, 65 of 97. Reading the subject as a balanced expression
//! and the assertion off what follows it sees both shapes and neither depends on
//! where the lines fall.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{line_of, uncommented};
use crate::component::{specs, Context, Finding, Report};

/// The helpers that narrow a rendered document to what a component rendered, or
/// that name the consumer's own markup as the subject rather than stumbling on
/// it.
const NARROWING: [&str; 7] = [
    "hasPart",
    "hostAttributes",
    "hostTag",
    "partTag",
    "rendered",
    "servedParts",
    /* The counterpart to stripping: a test asserting the sheet is *carried* is
    asking about the styles rather than about the markup, and reaching for the
    whole document to do it reads identically to the fault this rule is for. */
    "styles",
];

/// What an assertion is being made against.
#[derive(Clone, Copy, PartialEq)]
enum Subject {
    /// The sheet gone and the host's own opening tag still there.
    Document,
    /// Through one of the helpers, whatever else the expression does.
    Narrowed,
    /// Not a render at all.
    Other,
    /// The raw return of the render, stylesheet and all.
    Raw,
}

/// A binding, up to and including its `=`.
static BOUND: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:const|let)\s+(\w+)\s*=").expect("a literal pattern compiles"));

static RENDERED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bssr\(").expect("a literal pattern compiles"));

/// A substring or pattern assertion, in either polarity, at the head of what
/// follows the subject.
static LOOSE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*\.(not\.)?(toContain|toMatch)\(").expect("a literal pattern compiles")
});

/// The call an expression opens with, if it opens with one.
static CALL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(\w+)\s*\(").expect("a literal pattern compiles"));

/// A bare name, alone.
static NAME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(\w+)\s*$").expect("a literal pattern compiles"));

/// Where `expect(` opens.
static EXPECT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bexpect\(").expect("a literal pattern compiles"));

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
    let line_end = text[from..].find('\n').map_or(text.len(), |at| at + from);
    let Some(open) = text[from..line_end].find('(').map(|at| at + from) else {
        return text[from..line_end].to_owned();
    };
    let close = closing(text, open).unwrap_or(text.len() - 1);
    text[from..=close].to_owned()
}

/// The `)` matching the `(` at `open`.
fn closing(text: &str, open: usize) -> Option<usize> {
    let mut depth = 0usize;
    for (at, byte) in text.bytes().enumerate().skip(open) {
        match byte {
            b'(' => depth += 1,
            b')' => {
                depth -= 1;
                if depth == 0 {
                    return Some(at);
                }
            }
            _ => {}
        }
    }
    None
}

/// The first argument of an argument list, which is the subject `expect` reads.
///
/// `expect(structure, name)` takes a second argument naming the case in the
/// failure message, so the whole list is not the subject.
fn first(arguments: &str) -> &str {
    let mut depth = 0usize;
    for (at, byte) in arguments.bytes().enumerate() {
        match byte {
            b'(' | b'[' | b'{' => depth += 1,
            b')' | b']' | b'}' => depth = depth.saturating_sub(1),
            b',' if depth == 0 => return &arguments[..at],
            _ => {}
        }
    }
    arguments
}

/// How wide the binding named inside `expr` is, resolved at `at`.
///
/// `expr` is a bare name or one call around one, which is how a subject reaches
/// here: `markup`, or `withoutStyles(markup)`.
fn bound_width(text: &str, expr: &str, at: usize) -> Subject {
    let inner = match expr.find('(') {
        Some(open) if CALL.is_match(expr) => expr[open + 1..].trim_end().trim_end_matches(')'),
        _ => expr,
    };
    let Some(found) = NAME.captures(inner) else {
        return Subject::Other;
    };
    let name = found.get(1).expect("the name always matches").as_str();
    bound(text, name, at).map_or(Subject::Other, |value| width(&value))
}

/// How wide an expression's value is.
fn width(value: &str) -> Subject {
    if NARROWING
        .iter()
        .any(|helper| value.contains(&format!("{helper}(")))
    {
        return Subject::Narrowed;
    }
    if !RENDERED.is_match(value) {
        return Subject::Other;
    }
    if value.contains("withoutStyles(") {
        Subject::Document
    } else {
        Subject::Raw
    }
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
            /* Blanked rather than cut, so every offset and every line number
            here is the one the file has. Cutting a block comment out took the
            newlines with it, and this rule reported a drilldown finding at line
            9 that is at line 34. Line comments too, a spec being a module: an
            assertion commented out is not one this file makes. */
            let text = uncommented(&raw);
            let where_ = context.relative(&file);

            for found in EXPECT.find_iter(&text) {
                let open = found.end() - 1;
                let Some(close) = closing(&text, open) else {
                    continue;
                };
                let Some(polarity) = LOOSE.captures(&text[close + 1..]) else {
                    continue;
                };
                checked += 1;

                let subject = first(&text[open + 1..close]).trim();
                /* Named inline rather than bound: the render itself, the render
                with its sheet off, or a helper that has already narrowed it. */
                let head = CALL
                    .captures(subject)
                    .map(|one| one.get(1).expect("the call always matches").as_str());
                let width = match head {
                    Some("ssr") => Subject::Raw,
                    /* `withoutStyles(markup)` where `markup` is the binding
                    holding the render, which is how half the tree writes it: the
                    call names no `ssr(` of its own, so reading the expression
                    alone answers "not a render" and the assertion goes
                    unexamined. */
                    Some("withoutStyles") => match bound_width(&text, subject, open) {
                        /* The call is the stripping, so a binding holding the
                        raw render arrives here already narrowed by one layer. */
                        Subject::Raw | Subject::Document => Subject::Document,
                        Subject::Narrowed => Subject::Narrowed,
                        Subject::Other => width(subject),
                    },
                    Some(name) if NARROWING.contains(&name) => Subject::Narrowed,
                    Some(_) => continue,
                    None => bound_width(&text, subject, open),
                };

                let negated = polarity.get(1).is_some();
                let named = head.map_or(subject, |one| one);
                let (message, detail) = match width {
                    Subject::Raw => (
                        format!(
                            "`{named}` is the whole server document, stylesheet included, so a \
                             substring or pattern match finds a selector as readily as a rendered \
                             attribute"
                        ),
                        "Read it through a structural helper first: one that strips the \
                         stylesheet, or one that reads the host or a single part.",
                    ),
                    /* The host tag only ever adds to what a positive match can
                    land on, so a negative one is left alone: nothing a consumer
                    writes on a host can satisfy a claim about a part or about a
                    rendered role. */
                    Subject::Document if !negated => (
                        format!(
                            "`{named}` still opens with the host's own tag, which is the \
                             consumer's markup echoed back, so this passes on an attribute nobody \
                             rendered"
                        ),
                        "`rendered(markup, tag)` takes the host tag off as well as the sheet, and \
                         `partTag` narrows to one part. An assertion about what the consumer wrote \
                         says so with `hostTag` or `hostAttributes`.",
                    ),
                    _ => continue,
                };

                findings.push(Finding {
                    detail: detail.to_owned(),
                    file: format!("{where_}:{}", line_of(&text, open)),
                    message,
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "server-rendered assertions",
    }
}
