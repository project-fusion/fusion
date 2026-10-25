//! The keys the framework bridge reads still exist in the framework installed.
//!
//! **A bridge that finds a framework's own props by an internal prefix is a
//! measurement, not a contract.** It is how every prefixed event handler
//! survives hydration, and if the key is renamed or removed those handlers are
//! silently dead again on any server-rendered page: no error, no warning, and
//! the component works everywhere the page was not rendered on a server.
//!
//! **The mark the framework leaves on a document is the second key.** An
//! element whose props arrive after its first frame goes on looking for them
//! only in a document that carries it, so a renamed mark leaves a hydrated
//! data table empty, and silently, as a renamed props key does.
//!
//! **The mark it leaves on the node it renders into is the third.** A
//! development build warns when React has a root on a page and no element found
//! its props, and only for an element under that mark, so a renamed mark makes
//! the warning that reports the first two keys going silent with them.
//!
//! **Both bundles**, because a key present in the development build and absent
//! from the production one fails only where nobody is looking.
//!
//! **And the prose that rests on it has to name the version it was measured
//! against.** Two rules rest on those probes: that a hyphenated `on` prop binds
//! at all, and that binding at dispatch does not double up with the framework's
//! own listener. Both are claims about one release's internals, and prose does
//! not move when a dependency does. A note is true on a date, so a bump fails
//! here until somebody re-runs the probe and moves the date, which is the only
//! thing that makes the note worth trusting.
//!
//! **Wherever the note is written: Markdown, MDX, and the comments in
//! TypeScript.** Most of the bridge's measurements are argued beside the code
//! they shaped, and the docs a consumer reads state the range. Until October
//! 25, 2026 only `.md` was read, so `react-bridge.ts` and
//! `using-the-elements.mdx` still named 19.2.8 with 19.3.1 installed. A
//! declaration file and a `*.generated.*` file are skipped: each is a copy a
//! build wrote of a comment read where it was written, and would report it
//! twice.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use fusion_rules::walk::crawl;
use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};

static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"const (REACT_PROPS|REACT_LISTENING|REACT_CONTAINER) = '([^']+)'")
        .expect("a literal pattern compiles")
});

/// A note claiming to have been measured against a named release.
///
/// **The framework has to be named, which the script this comes from could
/// leave optional.** That one read one file and could afford `against 1.2.3`;
/// this reads every note in the repository, where the same words describe a
/// compiler probe, a bundler measurement and anything else somebody dated.
///
/// **A line break may fall anywhere in it**, and in a comment the next line
/// starts with ` * ` or `// `, so those marks count as the space they replace.
static MEASURED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[Aa]gainst[\s*/]+React[\s*/]+(\d+\.\d+\.\d+)")
        .expect("a literal pattern compiles")
});

/// The bridge's prefixes, each by the name it is declared under, found by
/// content wherever they are declared.
fn prefixes(context: &Context) -> Vec<(String, String)> {
    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path| {
            path.extension()
                .is_some_and(|one| one.eq_ignore_ascii_case("ts"))
        },
        &mut files,
    );
    let mut found: Vec<(String, String)> = Vec::new();
    for file in &files {
        let Ok(text) = fs::read_to_string(file) else {
            continue;
        };
        for one in DECLARED.captures_iter(&text) {
            if !found.iter().any(|(name, _)| *name == one[1]) {
                found.push((one[1].to_owned(), one[2].to_owned()));
            }
        }
    }
    found
}

/// Whether a file is one a measurement is written in: Markdown, MDX, or a
/// TypeScript source, and never a copy a build wrote of one.
fn noted(path: &Path) -> bool {
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_ascii_lowercase();
    if name.ends_with(".d.ts") || name.contains(".generated.") {
        return false;
    }
    [".md", ".mdx", ".ts", ".tsx"]
        .iter()
        .any(|one| name.ends_with(one))
}

/// Why a prefix the installed framework no longer carries matters.
fn why(name: &str) -> &'static str {
    if name == "REACT_CONTAINER" {
        "A development build warns when the framework has a root on a page and no element \
         found its props, and only for an element under the node carrying this mark. Find \
         the mark the framework now leaves on the node it renders into, and follow it, or \
         the warning that reports the other two keys is silent with them."
    } else if name == "REACT_LISTENING" {
        "An element whose props arrive after its first frame looks for them only in a \
         document carrying this mark, which the framework leaves as it makes a root. Find \
         the mark the framework now leaves on a document it has a root in, and follow it."
    } else {
        "The bridge finds the props the framework is holding by that prefix, and it is how \
         every prefixed handler survives hydration. Check whether the framework has fixed \
         the underlying issue, in which case the bridge can be deleted, or renamed the key, \
         in which case follow it."
    }
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

    let declared = prefixes(context);
    let Ok(installed) =
        fs::read_to_string(context.root.join("node_modules/react-dom/package.json"))
    else {
        return nothing;
    };
    if declared.is_empty() {
        return nothing;
    }
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
        for (name, prefix) in &declared {
            if text.contains(prefix.as_str()) {
                continue;
            }
            findings.push(Finding {
                detail: why(name).to_owned(),
                file: bundle.to_owned(),
                message: format!("`{prefix}` is gone from react-dom {version}"),
            });
        }
    }
    if checked == 0 {
        return nothing;
    }

    /* Every version the rules the bridge rests on claim to have measured
    against, read rather than written here so the two cannot drift apart. */
    let mut prose = Vec::new();
    crawl(&context.root, &noted, &mut prose);
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
