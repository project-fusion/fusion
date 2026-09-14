//! The Node on this machine, and its types, satisfy the floor the repository sets.
//!
//! **What carries a Node shebang and is not run with `bun --bun` runs under
//! Node**: Next's `bin` in `build` and `dev`, and npm in the release. The
//! manifest analyzer was the reason the floor was first set, its `.ts` config
//! loading only where type stripping needs no flag (measured on 18.16: a
//! manifest with every plugin missing, 69,081 lines shorter, reported as
//! success), and it runs as `bun --bun` now for exactly that reason. The floor
//! stays at the oldest line the rest is supported on.
//!
//! **It also holds the type package to that floor**, which is a different
//! failure with the same shape. The types declare what the standard library has,
//! so a major ahead of the floor type-checks code using APIs added after the
//! oldest Node the repository supports: nothing fails here, and the consumer on
//! the floor gets a `TypeError` at run time for a call TypeScript approved. A
//! dependency bot proposes that bump every time Node ships a major, and it is
//! right about the version and wrong about this repository, so the answer is a
//! rule rather than a judgment repeated per pull request.
//!
//! The two move together: raise the engine floor and the types follow, which is
//! the order that keeps them honest.
//!
//! **The floor is parsed from the manifest rather than written twice.** A floor
//! stated in two places is one that disagrees with itself the first time one
//! moves.
//!
//! **Node is asked for its own version, which is the one difference from the
//! script this replaces.** That one ran *under* Node and read the version it was
//! running as; a Rust binary asks the `node` on the path, which is the same
//! runtime the analyzer will get and the same answer for the same reason.
//!
//! **What it deliberately does not do** is check the Node that CI uses: a
//! different problem with a different fix, which a workflow pins the way it
//! already pins everything else.
//!
//! **The bun types are held to `packageManager` by the same argument**, and
//! that one notes rather than fails. `packageManager` is the bun the lockfile
//! was written by and the one `.github/actions/setup` installs, so it is the
//! runtime every spec runs on; `@types/bun` a line ahead of it type-checks the
//! specs against a `bun:test` the runner does not have. The tree cannot go the
//! other way: under `@types/bun` 1.1.18, the newest on the runtime's line, six
//! specs fail on `expect`'s typings (measured 14 Sep 2026). A finding would be
//! red until the runtime moved, which is a decision about what CI runs and not
//! about a manifest, so the mismatch is reported where it can be seen and the
//! runtime is what moves.

use std::cmp::Ordering;
use std::process::Command;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::Manifest;

static VERSION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\d+)\.(\d+)").expect("a literal pattern compiles"));

static MAJOR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\d+)\.").expect("a literal pattern compiles"));

static BUN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^bun@(\d+)\.(\d+)").expect("a literal pattern compiles"));

/// The range a manifest declares for a dependency, wherever it declares it.
fn dependency(manifest: &Value, name: &str) -> Option<String> {
    ["devDependencies", "dependencies"]
        .into_iter()
        .find_map(|where_| manifest.get(where_)?.get(name)?.as_str().map(str::to_owned))
}

/// The first `major.minor` in a range, which is the line it names.
fn line(range: &str) -> Option<(u32, u32)> {
    let found = VERSION.captures(range)?;
    Some((
        found[1].parse::<u32>().unwrap_or(0),
        found[2].parse::<u32>().unwrap_or(0),
    ))
}

pub fn run(context: &Context) -> Report {
    let nothing = |findings| Report {
        checked: 0,
        findings,
        notes: Vec::new(),
        unit: "declared floors",
    };
    let all = context.manifests();
    let Some(root) = all
        .iter()
        .find(|one| one.directory.is_empty() || one.directory == ".")
    else {
        return nothing(Vec::new());
    };

    let declared = root
        .value
        .get("engines")
        .and_then(|one| one.get("node"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let Some(wanted) = VERSION.captures(declared) else {
        return nothing(vec![Finding {
            detail: "It expects a form like `>=22.18`.".to_owned(),
            file: "package.json".to_owned(),
            message: format!("`engines.node` is {declared:?}, which cannot be read as a floor"),
        }]);
    };
    let (want_major, want_minor) = (
        wanted[1].parse::<u32>().unwrap_or(0),
        wanted[2].parse::<u32>().unwrap_or(0),
    );

    let mut findings = Vec::new();
    let mut checked = 0;

    /* The runtime on the path, which is what the analyzer will get. */
    if let Some(running) = Command::new("node")
        .arg("--version")
        .output()
        .ok()
        .filter(|one| one.status.success())
        .and_then(|one| String::from_utf8(one.stdout).ok())
    {
        checked += 1;
        if let Some(found) = VERSION.captures(running.trim()) {
            let (major, minor) = (
                found[1].parse::<u32>().unwrap_or(0),
                found[2].parse::<u32>().unwrap_or(0),
            );
            if major < want_major || (major == want_major && minor < want_minor) {
                findings.push(Finding {
                    detail: "Below the floor the analyzer cannot load a TypeScript config, falls \
                             back to a default one, writes a manifest with every plugin missing, \
                             and reports success."
                        .to_owned(),
                    file: "package.json".to_owned(),
                    message: format!(
                        "the `node` on this path is {} and the floor is {want_major}.{want_minor}",
                        running.trim()
                    ),
                });
            }
        }
    }

    /* The types describe a standard library, so they describe the oldest one
    this repository supports rather than the newest one that exists. */
    let types = dependency(&root.value, "@types/node").unwrap_or_default();
    if let Some(found) = MAJOR.captures(&types) {
        checked += 1;
        let major = found[1].parse::<u32>().unwrap_or(0);
        if major != want_major {
            findings.push(Finding {
                detail: format!(
                    "Either pin the types to ^{want_major}, or raise `engines.node` first and let \
                     them follow. They move together, in that order."
                ),
                file: "package.json".to_owned(),
                message: format!(
                    "`@types/node` is {types} and `engines.node` floors at \
                     {want_major}.{want_minor}, so it type-checks calls the floor does not have"
                ),
            });
        }
    }

    let (bun, notes) = bun_types(all, &root.value);
    checked += bun;

    Report {
        checked,
        findings,
        notes,
        unit: "declared floors",
    }
}

/// The bun types, held to the bun the lockfile was written by.
///
/// Every manifest that declares them, because each package's specs type-check
/// against its own copy. Returns how many floors were checked and what was
/// noted: this one notes rather than fails, for the reason the module doc
/// gives.
fn bun_types(all: &[Manifest], root: &Value) -> (usize, Vec<String>) {
    let mut notes = Vec::new();
    let manager = root
        .get("packageManager")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let Some(bun) = BUN.captures(manager) else {
        return (0, Vec::new());
    };
    let runtime = (
        bun[1].parse::<u32>().unwrap_or(0),
        bun[2].parse::<u32>().unwrap_or(0),
    );
    let mut ahead = Vec::new();
    let mut behind = Vec::new();
    for manifest in all {
        let Some(range) = dependency(&manifest.value, "@types/bun") else {
            continue;
        };
        let Some(types) = line(&range) else {
            continue;
        };
        let file = if manifest.directory.is_empty() || manifest.directory == "." {
            "package.json".to_owned()
        } else {
            format!("{}/package.json", manifest.directory)
        };
        match types.cmp(&runtime) {
            Ordering::Greater => ahead.push(format!("{file} ({range})")),
            Ordering::Less => behind.push(format!("{file} ({range})")),
            Ordering::Equal => {}
        }
    }
    let (major, minor) = runtime;
    if !ahead.is_empty() {
        notes.push(format!(
            "`@types/bun` is ahead of `packageManager`'s bun@{major}.{minor} in {}, so the \
             specs type-check against a `bun:test` the runtime does not have. The runtime \
             moves up rather than the types back: on the runtime's line the tree does not \
             type-check.",
            ahead.join(", ")
        ));
    }
    if !behind.is_empty() {
        notes.push(format!(
            "`@types/bun` is behind `packageManager`'s bun@{major}.{minor} in {}, so a call \
             the runtime has is refused by the types. Raise them to ^{major}.{minor}.",
            behind.join(", ")
        ));
    }
    (1, notes)
}
