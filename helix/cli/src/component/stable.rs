//! `@status stable` means what stable has to mean.
//!
//! **A status is a promise to a consumer, and a promise nothing checks is a word
//! somebody typed.** `stable` says an API will not change under you, which is
//! the single most consequential thing a library says about itself: it is what
//! decides whether somebody builds on a component or waits.
//!
//! So it is earned rather than declared. Three conditions, all mechanical,
//! because a mechanical bar is one that cannot quietly slip:
//!
//! 1. **Every part of the family has both specs.** A DOM spec proves it behaves
//!    after hydration and a server spec proves the server output carries the
//!    right state. The second is the one that catches a promise broken at first
//!    paint, and it is the one that goes missing.
//! 2. **Both layers agree.** A base class marked stable whose subclass above is
//!    experimental is two answers to one question, and a reference page picks by
//!    layer, so a reader sees whichever one their import gave them.
//! 3. **It has at least one example.** A component nobody has written a usage
//!    for is one whose API has been read and not used, which is not the same as
//!    settled.
//!
//! **What it deliberately does not check is whether the component is any good.**
//! That is a judgment and it belongs to a person.

use std::fs;
use std::path::Path;

use crate::component::{Context, Finding, Report};

/// Every family folder in a layer, a family being a folder with an entry point.
fn families(layer: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(layer) else {
        return Vec::new();
    };
    let mut found: Vec<String> = entries
        .flatten()
        .filter(|entry| entry.path().is_dir() && entry.path().join("index.ts").is_file())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    found.sort();
    found
}

/// The part folders of a family, which are its directories minus the dotted ones.
fn parts(directory: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut found: Vec<String> = entries
        .flatten()
        .filter(|entry| {
            entry.path().is_dir() && !entry.file_name().to_string_lossy().starts_with('.')
        })
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    found.sort();
    found
}

/// Whether any source file under a folder declares the given status.
fn declares(directory: &Path, status: &str) -> bool {
    let mut found = Vec::new();
    crate::component::sources(directory, &mut found);
    let wanted = format!("@status {status}");
    found
        .iter()
        .any(|file| fs::read_to_string(file).is_ok_and(|text| text.contains(&wanted)))
}

/// The file names directly inside a folder, empty where there is no folder.
fn names(directory: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    entries
        .flatten()
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect()
}

pub fn run(context: &Context) -> Report {
    let [base, over, ..] = context.settings.layers.as_slice() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "families claiming stable",
        };
    };
    let base = context.root.join(&base.source);
    let over = context.root.join(&over.source);

    let mut findings = Vec::new();
    let mut checked = 0;

    for family in families(&over) {
        let above = over.join(&family);
        let below = base.join(&family);
        if !declares(&above, "stable") && !declares(&below, "stable") {
            continue;
        }
        checked += 1;

        if declares(&above, "experimental") || declares(&below, "experimental") {
            findings.push(Finding {
                detail: "A reference page picks by layer, so a reader sees whichever their \
                         import gave them."
                    .to_owned(),
                file: family.clone(),
                message: "one layer says stable and the other says experimental".to_owned(),
            });
        }

        for part in parts(&above) {
            /* Both layers, because a part's specs are split across them: the
            functional ones live where the behavior is, and what sits above
            asserts presentation. A part is covered when the pair exists
            somewhere, not when it exists here. */
            let mut files = names(&above.join(&part));
            files.extend(names(&below.join(&part)));
            if !files.iter().any(|one| one.ends_with(".dom.spec.ts")) {
                findings.push(Finding {
                    detail: "A part with no DOM spec is a part nothing proves behaves after \
                             hydration."
                        .to_owned(),
                    file: format!("{family}/{part}"),
                    message: "stable with no `*.dom.spec.ts` in either layer".to_owned(),
                });
            }
            if !files.iter().any(|one| one.ends_with(".ssr.spec.ts")) {
                findings.push(Finding {
                    detail: "A DOM spec runs after hydration, when a promise broken at first \
                             paint already looks kept."
                        .to_owned(),
                    file: format!("{family}/{part}"),
                    message: "stable with no `*.ssr.spec.ts` in either layer".to_owned(),
                });
            }
        }

        let examples = above.join(".examples");
        let example = names(&examples).iter().any(|one| {
            Path::new(one)
                .extension()
                .is_some_and(|one| one.eq_ignore_ascii_case("html"))
        });
        if !example {
            findings.push(Finding {
                detail: "An API that has been read and not used is not settled.".to_owned(),
                file: family.clone(),
                message: "stable with no example".to_owned(),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "families claiming stable",
    }
}
