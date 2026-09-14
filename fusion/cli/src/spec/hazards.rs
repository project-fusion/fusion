//! Three ways a spec stops being a test and becomes an outage.
//!
//! A failing assertion is cheap. A spec that hangs the run, or exhausts the
//! machine, or silently tests the previous build reports nothing at all: the
//! runner has no output to give, and the symptom looks like a hardware problem.
//!
//! **A deep equality against a DOM node exhausts the machine.** It is instant
//! while the two match by reference and catastrophic the moment they do not: the
//! runner walks the expected value to build a diff, and a rendered element is a
//! graph with cycles in it, parent to document to shadow root and back. It
//! allocates until the kernel kills something, and because a file's output is
//! buffered until the file ends, what a reader sees is a machine going unusable
//! during a test run. The rule is keyed on the declaration rather than the
//! assertion, because that is the part a pattern can see: an array of elements
//! may not reach a deep matcher. Count it, and compare identity.
//!
//! **A spec importing its own package by name tests `dist`.** The package name
//! resolves through `exports` to the built output, so the run holds two copies
//! of every element class, and the registrar declines a taken tag quietly by
//! design: the winner is decided by file order and never announced. After any
//! edit to the sources, one such import registers the previous build for the
//! whole suite. Nine tests in three unrelated families failed exactly that way,
//! passing when their own file ran alone. Relative paths already work.
//!
//! **An unbounded settle loop hangs the run.** Awaiting an update in a `while`
//! is the right idea and needs a ceiling. A component that asks for another
//! update every time turns it into an infinite await: it blocks nothing,
//! allocates nothing, prints nothing, and never returns. The testing package's
//! own `settle` is the same loop with a bound, and it names the element when it
//! gives up.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

/// Array types whose members are DOM nodes, which no deep matcher may walk.
const NODES: [&str; 5] = [
    "EventTarget",
    "HTMLElement",
    "Element",
    "Node",
    "ShadowRoot",
];
const DEEP: [&str; 2] = ["toEqual", "toStrictEqual"];

static HOLDER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:const|let)\s+(\w+)\s*:\s*(\w+)\[\]").expect("a literal pattern compiles")
});
static ASSERTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"expect\(\s*(\w+)").expect("a literal pattern compiles"));
static UNBOUNDED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"while\s*\(\(await\s+[\w.?]+\.updateComplete\)\s*===\s*false\)")
        .expect("a literal pattern compiles")
});

#[expect(
    clippy::too_many_lines,
    reason = "a rule is one reading of its corpus, and splitting it puts half the reading somewhere else"
)]
pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut read = 0;

    /* Every package that holds specs, with the name it publishes under, so the
    self-import rule can name the import a file may not make. */
    let mut manifests = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| path.file_name().is_some_and(|one| one == "package.json"),
        &mut manifests,
    );

    for manifest in manifests {
        let Some(directory) = manifest.parent() else {
            continue;
        };
        let source = directory.join("src");
        if !source.is_dir() {
            continue;
        }
        let Some(name) = fs::read_to_string(&manifest)
            .ok()
            .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
            .and_then(|one| Some(one.get("name")?.as_str()?.to_owned()))
        else {
            continue;
        };

        let mut specs = Vec::new();
        crawl(
            &source,
            &|path: &Path| {
                path.file_name()
                    .is_some_and(|one| one.to_string_lossy().ends_with(".spec.ts"))
            },
            &mut specs,
        );

        for file in specs {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            read += 1;
            let where_ = context.relative(&file);
            let lines: Vec<&str> = text.split('\n').collect();

            /* Arrays of nodes, and whether a deep matcher is handed one.
            Declaration first, because the assertion alone says nothing about
            what is in it.

            **Nearest declaration above, not any declaration in the file.** One
            spec holds two `heard`s, an `EventTarget[]` in one test and a
            `string[]` in another, and matching on the name alone reported the
            safe one. A name is reused across tests far more often than it is
            unique to a file. */
            let declared: Vec<(usize, String, String)> = lines
                .iter()
                .enumerate()
                .filter_map(|(at, line)| {
                    let caught = HOLDER.captures(line)?;
                    Some((at, caught[1].to_owned(), caught[2].to_owned()))
                })
                .collect();
            let type_of = |holder: &str, at: usize| {
                declared
                    .iter()
                    .rfind(|(index, name, _)| name == holder && *index < at)
                    .map(|(_, _, kind)| kind.clone())
            };

            for (at, line) in lines.iter().enumerate() {
                for matcher in DEEP {
                    if !line.contains(&format!(".{matcher}(")) {
                        continue;
                    }
                    let Some(named) = ASSERTED.captures(line) else {
                        continue;
                    };
                    let holder = named[1].to_owned();
                    if type_of(&holder, at).is_some_and(|kind| NODES.contains(&kind.as_str())) {
                        findings.push(Finding {
                            detail: "A rendered element is a graph with cycles in it, so the \
                                     moment this stops matching the runner walks it to build a \
                                     diff and exhausts the machine rather than failing. Assert \
                                     the count, and compare identity with `toBe`."
                                .to_owned(),
                            file: format!("{where_}:{}", at + 1),
                            message: format!(
                                "`{matcher}` is handed `{holder}`, which holds DOM nodes"
                            ),
                        });
                    }
                }

                if UNBOUNDED.is_match(line) {
                    findings.push(Finding {
                        detail: "A component that never settles hangs the whole run with no \
                                 output and no failing test. Use `settle` from the testing \
                                 package, which is the same loop with a ceiling that names the \
                                 element."
                            .to_owned(),
                        file: format!("{where_}:{}", at + 1),
                        message: "settles in an unbounded loop".to_owned(),
                    });
                }
            }

            /* The package's own name, in either import form and either quote.
            The quote style is settled by the formatter and is not this rule's
            to depend on: a pattern that reads one of them goes quiet rather
            than wrong the day the other is written, which is the failure this
            whole file is about. */
            for form in [
                format!("from '{name}'"),
                format!("from \"{name}\""),
                format!("import('{name}')"),
                format!("import(\"{name}\")"),
            ] {
                if let Some(at) = lines.iter().position(|line| line.contains(&form)) {
                    findings.push(Finding {
                        detail: "That puts a second copy of every class in the run and lets file \
                                 order decide which one registers each tag. Import the relative \
                                 path instead."
                            .to_owned(),
                        file: format!("{where_}:{}", at + 1),
                        message: format!(
                            "imports `{name}`, its own package, which resolves to `dist`"
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked: read,
        findings,
        notes: Vec::new(),
        unit: "specs",
    }
}
