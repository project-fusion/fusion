//! A comment naming a path or a script names one that exists.
//!
//! **A stale comment is worse than no comment, because it is believed.** Prose
//! is the one part of a file nothing compiles, so a reference in it survives the
//! rename that invalidated it and goes on telling every later reader something
//! that stopped being true. One stylesheet described a slot that had been gone
//! for months, and a spec three files away existed specifically to say there was
//! no such slot.
//!
//! This is the mechanical half of that problem, which is the half a check can
//! hold: a backticked path, a `bun run` script, or a `check:*` name is either
//! there or it is not, and asking is free. The other half is whether a comment
//! carries the reasoning or restates the code, and no check decides that.
//!
//! **What is checked.** Inside comments only, and only three shapes, all chosen
//! because a false positive is worse than a miss here:
//!
//! - A backticked path rooted at the repository, with a known extension. A path
//!   that starts somewhere else is illustrative rather than a claim.
//! - A backticked `bun run <script>`, against the nearest manifest and every one
//!   above it, since a package names its own scripts.
//! - A backticked `check:<name>`, likewise.
//!
//! A bare word in backticks is not checked, because it is usually a property, a
//! CSS value or a piece of English, and guessing which would report the prose
//! that is doing its job.
//!
//! **And a markdown link target, which is the fourth shape.** The three above
//! all live inside comments, and markdown prose is not a comment, so a link is
//! invisible to every one of them. The usual slip is naming a `.md` where the
//! file is `.mdx`. Resolved relative to the file that holds the link, which is
//! how a reader follows it, and only for targets that look like a repository
//! file: anything with a scheme, an anchor alone, or a bare word is left alone.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

static BLOCK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));
static LINE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"//[^\n]*").expect("a literal pattern compiles"));
static PATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)`([a-z][\w./-]*/[\w.-]+)`").expect("a literal pattern compiles")
});
/// A script name, hyphens included.
///
/// **The hyphen is not decoration in this workspace**: fifteen root scripts
/// carry one. A pattern without it does not report those references as wrong —
/// it stops matching before the closing backtick and skips them, which is the
/// silent half of the failure and the one worth naming here.
static RUN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`bun run ([\w:-]+)`").expect("a literal pattern compiles"));
/// A check's name, colons included.
///
/// **A script name is namespaced and the colon is part of it.** A pattern that
/// stops at the first one validates the prefix instead of the name: every
/// `check:prose:*` in a comment resolved to `check:prose`, which exists, so a
/// group that had never had a member by that name read as correct. Two such
/// references had been sitting in comments naming rules that live under a
/// different noun entirely.
/// A turbo task, which is the other way a comment names something runnable.
///
/// **The task list moved out of the manifest and the check followed it.** When a
/// root script was `turbo run docs`, a comment could name the script and this
/// rule would resolve it; deleting those aliases in favor of the task itself
/// would have taken 39 references out of reach. `turbo.json` declares the tasks,
/// so it is as answerable a question as the manifest was.
static TASK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`turbo run ([\w:-]+)`").expect("a literal pattern compiles"));

static NAMED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`(check:[\w:-]+)`").expect("a literal pattern compiles"));
static SPAN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"`[^`\n]*`").expect("a literal pattern compiles"));
static LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\]\(([^)\s]+)\)").expect("a literal pattern compiles"));
static SCHEME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^[a-z]+:").expect("a literal pattern compiles"));

const EXTENSIONS: [&str; 10] = [
    ".css", ".html", ".json", ".md", ".mjs", ".rs", ".toml", ".ts", ".tsx", ".txt",
];

fn named(path: &str) -> bool {
    EXTENSIONS.iter().any(|one| path.ends_with(one))
}

/// Scripts from the nearest manifest and every one above it, not the root alone.
///
/// A package names its own build script in a comment and is right to: the script
/// is in its own manifest, and a check reading only the root reported the one
/// comment in the repository that had looked it up.
///
/// **Prose *about* a reference looks exactly like a reference**, so quoting a
/// script the file cannot run makes this check report itself. That is the honest
/// limit of the idea, and the reason it reads only three narrow shapes.
fn scripts_for(root: &Path, file: &Path) -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    let mut here = file.parent();
    while let Some(directory) = here {
        if let Some(scripts) = fs::read_to_string(directory.join("package.json"))
            .ok()
            .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
            .and_then(|one| Some(one.get("scripts")?.as_object()?.clone()))
        {
            found.extend(scripts.keys().cloned());
        }
        if directory == root {
            break;
        }
        here = directory.parent();
    }
    found
}

/// Every task `turbo.json` declares, which is what a `turbo run` may name.
fn tasks(root: &Path) -> BTreeSet<String> {
    /* Line comments, which the format does not have and this file uses. */
    let raw = fs::read_to_string(root.join("turbo.json")).unwrap_or_default();
    let stripped: String = raw
        .lines()
        .filter(|line| !line.trim_start().starts_with("//"))
        .collect::<Vec<&str>>()
        .join("\n");
    serde_json::from_str::<Value>(&stripped)
        .ok()
        .and_then(|one| Some(one.get("tasks")?.as_object()?.keys().cloned().collect()))
        .unwrap_or_default()
}

#[expect(
    clippy::too_many_lines,
    reason = "a rule is one reading of its corpus, and splitting it puts half the reading somewhere else"
)]
pub fn run(context: &Context) -> Report {
    /* The trees a backticked path may be rooted at, read off the workspace
    rather than listed: a directory added or renamed at the top level is exactly
    the event that makes a listed prefix stop matching, silently. */
    let domains: BTreeSet<String> = fs::read_dir(&context.root)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.path().is_dir())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();

    /* Markdown is collected separately, because the comment scan has nothing to
    say about it and counting it there would make the report claim a corpus it
    had not read. */
    let mut sources = Vec::new();
    let mut prose = Vec::new();
    let mut all = Vec::new();
    crawl(&context.root, &|_| true, &mut all);
    for file in all {
        let name = file
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if name.ends_with(".css.ts") {
            continue;
        }
        if [".css", ".mjs", ".ts", ".tsx"]
            .iter()
            .any(|one| name.ends_with(one))
        {
            sources.push(file);
        } else if file
            .extension()
            .is_some_and(|one| one == "md" || one == "mdx")
        {
            prose.push(file);
        }
    }

    let declared = tasks(&context.root);
    let mut findings = Vec::new();
    let mut seen = BTreeSet::new();
    let mut fault = |file: &Path, message: String, detail: &str| {
        let where_ = context.relative(file);
        if seen.insert(format!("{where_}{message}")) {
            findings.push(Finding {
                detail: detail.to_owned(),
                file: where_,
                message,
            });
        }
    };

    for file in &sources {
        let Ok(source) = fs::read_to_string(file) else {
            continue;
        };
        let scripts = scripts_for(&context.root, file);
        for comment in BLOCK
            .find_iter(&source)
            .chain(LINE.find_iter(&source))
            .map(|one| one.as_str())
        {
            for caught in PATH.captures_iter(comment) {
                let path = caught[1].to_owned();
                /* Rooted at the repository, so an illustrative path is left
                alone: one package's docs describe the output it avoids by
                naming a source path that is not a file and is not meant to be
                one, and a check reading every slashed string as a claim
                reported it. */
                let rooted = path
                    .split_once('/')
                    .is_some_and(|(head, _)| domains.contains(head));
                if rooted && named(&path) && !context.root.join(&path).exists() {
                    fault(
                        file,
                        format!("names `{path}`, which is not there"),
                        "Prose is the one part of a file nothing compiles, so a reference in it \
                         survives the rename that invalidated it.",
                    );
                }
            }
            for caught in RUN.captures_iter(comment) {
                let script = caught[1].to_owned();
                if !scripts.contains(&script) {
                    fault(
                        file,
                        format!("names `bun run {script}`, which no manifest above it has"),
                        "A package names its own scripts, so this asks the nearest manifest and \
                         every one above it.",
                    );
                }
            }
            for caught in TASK.captures_iter(comment) {
                let task = caught[1].to_owned();
                if !declared.contains(&task) {
                    fault(
                        file,
                        format!("names `turbo run {task}`, which `turbo.json` does not declare"),
                        "A task turbo does not know is one it refuses to run, naming the file it \
                         could not find it in.",
                    );
                }
            }
            for caught in NAMED.captures_iter(comment) {
                let script = caught[1].to_owned();
                if !scripts.contains(&script) {
                    fault(
                        file,
                        format!("names `{script}`, which no manifest above it has"),
                        "A package names its own scripts, so this asks the nearest manifest and \
                         every one above it.",
                    );
                }
            }
        }
    }

    /* Markdown links, resolved the way a reader follows them: relative to the
    file holding the link rather than to the repository. */
    for file in &prose {
        let Ok(text) = fs::read_to_string(file) else {
            continue;
        };
        let Some(from) = file.parent() else {
            continue;
        };
        /* Inline code spans are stripped first, because a link inside one is an
        illustration of the shape rather than a link: a line describing the
        format of a link is not a link to anywhere. */
        let text = SPAN.replace_all(&text, "");
        for caught in LINK.captures_iter(&text) {
            let target = caught[1].to_owned();
            let path = target.split('#').next().unwrap_or_default();
            if path.is_empty() || SCHEME.is_match(path) || !named(path) {
                continue;
            }
            if !from.join(path).exists() {
                fault(
                    file,
                    format!("links to `{target}`, which is not there"),
                    "A reader follows a link relative to the file that holds it.",
                );
            }
        }
    }

    Report {
        checked: sources.len() + prose.len(),
        findings,
        notes: Vec::new(),
        unit: "sources and documents",
    }
}
