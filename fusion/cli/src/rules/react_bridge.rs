//! The key the framework bridge reads still exists in the framework installed.
//!
//! **A bridge that finds a framework's own props by an internal prefix is a
//! measurement, not a contract.** It is how every prefixed event handler
//! survives hydration, and if the key is renamed or removed those handlers are
//! silently dead again on any server-rendered page — no error, no warning, and
//! the component works everywhere the page was not rendered on a server.
//!
//! **Both bundles**, because a key present in the development build and absent
//! from the production one fails only where nobody is looking.
//!
//! **And the prose that rests on it has to name the version it was measured
//! against.** Two rules rest on those probes: that a hyphenated `on` prop binds
//! at all, and that binding at dispatch does not double up with the framework's
//! own listener. Both are claims about one release's internals, and prose does
//! not move when a dependency does. A note is true on a date, so a bump fails
//! here until somebody re-runs the probe and moves the date — which is the only
//! thing that makes the note worth trusting.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"const REACT_PROPS = '([^']+)'").expect("a literal pattern compiles")
});

/// A note claiming to have been measured against a named release.
///
/// **The framework has to be named, which the script this comes from could
/// leave optional.** That one read one file and could afford `against 1.2.3`;
/// this reads every note in the repository, where the same words describe a
/// compiler probe, a bundler measurement and anything else somebody dated.
static MEASURED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[Aa]gainst\s+React\s+(\d+\.\d+\.\d+)").expect("a literal pattern compiles")
});

/// Where the bridge's prefix is declared, found by content rather than by path.
fn prefix(context: &Context) -> Option<String> {
    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path| {
            path.extension()
                .is_some_and(|one| one.eq_ignore_ascii_case("ts"))
        },
        &mut files,
    );
    files.iter().find_map(|file| {
        let text = fs::read_to_string(file).ok()?;
        Some(DECLARED.captures(&text)?[1].to_owned())
    })
}

pub fn run(context: &Context) -> Report {
    let bundles = [
        "node_modules/react-dom/cjs/react-dom-client.development.js",
        "node_modules/react-dom/cjs/react-dom-client.production.js",
    ];
    let nothing = Report {
        checked: 0,
        findings: Vec::new(),
        notes: Vec::new(),
        unit: "framework bundles",
    };

    let (Some(prefix), Ok(installed)) = (
        prefix(context),
        fs::read_to_string(context.root.join("node_modules/react-dom/package.json")),
    ) else {
        return nothing;
    };
    let version = serde_json::from_str::<Value>(&installed)
        .ok()
        .and_then(|one| Some(one.get("version")?.as_str()?.to_owned()))
        .unwrap_or_default();

    let mut findings = Vec::new();
    let mut checked = 0;
    for bundle in bundles {
        let Ok(text) = fs::read_to_string(context.root.join(bundle)) else {
            continue;
        };
        checked += 1;
        if text.contains(&prefix) {
            continue;
        }
        findings.push(Finding {
            detail: "The bridge finds the props the framework is holding by that prefix, and it \
                     is how every prefixed handler survives hydration. Check whether the \
                     framework has fixed the underlying issue, in which case the bridge can be \
                     deleted, or renamed the key, in which case follow it."
                .to_owned(),
            file: bundle.to_owned(),
            message: format!("`{prefix}` is gone from react-dom {version}"),
        });
    }
    if checked == 0 {
        return nothing;
    }

    /* Every version the rules the bridge rests on claim to have measured
    against, read rather than written here so the two cannot drift apart. */
    let mut prose = Vec::new();
    crawl(
        &context.root,
        &|path| {
            path.extension()
                .is_some_and(|one| one.eq_ignore_ascii_case("md"))
        },
        &mut prose,
    );
    for file in prose {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        let stale: Vec<String> = MEASURED
            .captures_iter(&text)
            .map(|one| one[1].to_owned())
            .filter(|one| *one != version)
            .collect();
        if stale.is_empty() {
            continue;
        }
        checked += 1;
        findings.push(Finding {
            detail: "Both are claims about one release's internals, and prose does not move when \
                     a dependency does. Re-run the probes on this version and write the new \
                     number in, or pin the framework back."
                .to_owned(),
            file: context.relative(&file),
            message: format!(
                "reports measurements against React {} and react-dom is {version}",
                stale.join(", ")
            ),
        });
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "framework bundles and measured notes",
    }
}
