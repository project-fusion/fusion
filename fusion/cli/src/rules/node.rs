//! The Node on this machine, and its types, satisfy the floor the repository sets.
//!
//! **A manifest analyzer runs under Node rather than under bun, and its config
//! is TypeScript.** Below the floor it cannot load that config, falls back to a
//! default one, writes a manifest with every plugin missing, and reports
//! success: measured on 18.16, 69,081 lines shorter. A docs site, the framework
//! wrappers and eight rules all read that file. The floor is where type
//! stripping stopped needing a flag, which is the whole of the requirement.
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

use std::process::Command;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::manifests;

static VERSION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\d+)\.(\d+)").expect("a literal pattern compiles"));

static MAJOR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\d+)\.").expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    let nothing = |findings| Report {
        checked: 0,
        findings,
        notes: Vec::new(),
        unit: "declared floors",
    };
    let Some(root) = manifests(&context.root)
        .into_iter()
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
    let types = ["devDependencies", "dependencies"]
        .into_iter()
        .find_map(|where_| {
            root.value
                .get(where_)?
                .get("@types/node")?
                .as_str()
                .map(str::to_owned)
        })
        .unwrap_or_default();
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

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "declared floors",
    }
}
