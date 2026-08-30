//! Every example is authored on both layers and in both syntaxes.
//!
//! **Neither is generated from the other, and that is the point.** Deriving the
//! React view from the HTML at read time emitted a `<script>` into a JSX
//! fragment, so every script-bearing example produced a *syntax error* rather
//! than a wrong picture. It was wrong on script-free examples too, silently: a
//! leading comment was not counted as a root so no fragment was emitted, a
//! stylesheet-to-import rule required its attributes in an order no example
//! writes so it never once fired, and `for` was renamed to `htmlFor` on custom
//! elements, where React writes the attribute verbatim and the browser
//! lowercases it to something no component reads.
//!
//! **The canonical example reads the same on both layers**, because the two are
//! the same demonstration drawn twice, and a difference is a real edit made to
//! one and not the other. Only the copy is compared: markup, styles and scripts
//! legitimately differ between a layer that ships CSS and a layer that does not.
//!
//! **A family with no base twin has nothing to pair with.** Layout and tooling
//! families are not implemented on both layers, and the absence of the directory
//! is the answer rather than a gap, so nothing here keeps a list of them.
//!
//! **Both directions, because a base example whose twin was deleted is a page
//! nothing renders and no list shows.**
//!
//! **What is asserted across syntaxes is that both exist, not that they read
//! alike.** A React example legitimately moves copy out of the markup: a caption
//! becomes a constant, a row of months becomes an array a map walks. Comparing
//! text would fail on exactly the examples worth authoring by hand. Whether they
//! render the same is a picture's job.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{Context, Finding, Report};

/// The one example every family draws, which is what makes the pair comparable.
const CANONICAL: &str = "preview.html";

static STRIPPED: LazyLock<[Regex; 5]> = LazyLock::new(|| {
    [
        Regex::new(r"(?is)<style.*?</style>").expect("a literal pattern compiles"),
        Regex::new(r"(?is)<script.*?</script>").expect("a literal pattern compiles"),
        Regex::new(r"(?s)<!--.*?-->").expect("a literal pattern compiles"),
        Regex::new(r"<[^>]+>").expect("a literal pattern compiles"),
        Regex::new(r"&[a-z]+;").expect("a literal pattern compiles"),
    ]
});

static EXPORTS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"export function Example\b").expect("a literal pattern compiles"));

/// The words an example shows, with everything that draws them taken away.
fn copy(markup: &str) -> String {
    let mut text = markup.to_owned();
    for pattern in STRIPPED.iter() {
        text = pattern.replace_all(&text, " ").into_owned();
    }
    text.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// The directory names directly inside a layer.
fn families(layer: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(layer) else {
        return Vec::new();
    };
    let mut found: Vec<String> = entries
        .flatten()
        .filter(|entry| entry.path().is_dir())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    found.sort();
    found
}

pub fn run(context: &Context) -> Report {
    let [base, over, ..] = context.settings.layers.as_slice() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "examples authored on both layers",
        };
    };
    let base = context.root.join(&base.source);
    let over = context.root.join(&over.source);

    let mut findings = Vec::new();
    let mut checked = 0;

    for family in families(&over) {
        let shown = over.join(&family).join(".examples").join(CANONICAL);
        if !shown.is_file() || !base.join(&family).is_dir() {
            continue;
        }
        let twin = base.join(&family).join(".examples").join(CANONICAL);
        let Ok(headless) = fs::read_to_string(&twin) else {
            /* Reported rather than skipped: a family with one example and not
            the other is the base layer going unexercised, which is the case
            these examples exist to catch and the one a missing file hides. */
            findings.push(Finding {
                detail: "Both layers are authored, neither generated from the other.".to_owned(),
                file: family.clone(),
                message: format!("the outer layer has {CANONICAL} and the base does not"),
            });
            continue;
        };
        let Ok(styled) = fs::read_to_string(&shown) else {
            continue;
        };
        checked += 1;
        let (styled, headless) = (copy(&styled), copy(&headless));
        if styled == headless {
            continue;
        }
        findings.push(Finding {
            detail: format!(
                "The two are authored, neither derived, so a difference is a real edit to one \
                 and not the other.\n      outer: {}\n       base: {}",
                styled.chars().take(90).collect::<String>(),
                headless.chars().take(90).collect::<String>()
            ),
            file: family.clone(),
            message: "the two layers do not read the same".to_owned(),
        });
    }

    /* The other direction, because a base example whose twin was deleted is a
    page nothing renders and no list shows. */
    for family in families(&base) {
        if base
            .join(&family)
            .join(".examples")
            .join(CANONICAL)
            .is_file()
            && !over
                .join(&family)
                .join(".examples")
                .join(CANONICAL)
                .is_file()
        {
            findings.push(Finding {
                detail: "A base example whose twin was deleted is a page nothing renders."
                    .to_owned(),
                file: family.clone(),
                message: format!("the base has {CANONICAL} and the outer layer does not"),
            });
        }
    }

    checked += syntaxes(&[base, over], &mut findings);

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "examples authored on both layers",
    }
}

/// Every example authored in both syntaxes, on either layer.
fn syntaxes(layers: &[std::path::PathBuf], findings: &mut Vec<Finding>) -> usize {
    let mut checked = 0;
    for layer in layers {
        for family in families(layer) {
            let directory = layer.join(&family).join(".examples");
            let Ok(entries) = fs::read_dir(&directory) else {
                continue;
            };
            let held: BTreeSet<String> = entries
                .flatten()
                .map(|entry| entry.file_name().to_string_lossy().to_string())
                .collect();
            let slugs: BTreeSet<String> = held
                .iter()
                .filter_map(|one| {
                    one.strip_suffix(".html")
                        .or_else(|| one.strip_suffix(".tsx"))
                        .map(str::to_owned)
                })
                .collect();
            for slug in slugs {
                let missing: Vec<&str> = [("html", "HTML"), ("tsx", "TSX")]
                    .into_iter()
                    .filter(|(extension, _)| !held.contains(&format!("{slug}.{extension}")))
                    .map(|(_, name)| name)
                    .collect();
                if !missing.is_empty() {
                    findings.push(Finding {
                        detail: "Both are authored, neither generated from the other. Write the \
                                 missing one by hand rather than converting its twin."
                            .to_owned(),
                        file: format!("{family}/{slug}"),
                        message: format!("missing {}", missing.join(" and ")),
                    });
                    continue;
                }
                /* A `.tsx` exporting nothing is a file no sandbox can show and
                no picture harness can render, which is the shape a half-finished
                conversion leaves behind. */
                let exports = fs::read_to_string(directory.join(format!("{slug}.tsx")))
                    .is_ok_and(|text| EXPORTS.is_match(&text));
                if exports {
                    checked += 1;
                } else {
                    findings.push(Finding {
                        detail: "The sandbox cannot show it and the picture harness cannot \
                                 render it."
                            .to_owned(),
                        file: format!("{family}/{slug}.tsx"),
                        message: "no `export function Example`".to_owned(),
                    });
                }
            }
        }
    }

    checked
}
