//! Both layers give one answer about what a family is for.
//!
//! **`@category` is written twice and only one copy is read.** It sits on the
//! base root and on the styled root, and the catalog reads the styled one: the
//! reference pages and the components index group on what it found. So the base
//! copy is documentation that nothing renders and nothing contradicts, which is
//! the shape a value drifts in.
//!
//! **And it drifts silently.** Splitting a category and moving only the styled
//! layer leaves the base roots naming a category the styled roots have left, and
//! nothing fails, because the stale value is still a legal word: 25 of 88
//! families disagreed the last time one was retired. A vocabulary check cannot
//! catch a stale value that is spelled correctly; only the other layer can.
//!
//! **Why a check rather than one declaration.** The obvious fix is to write the
//! category once and have the layer above inherit it, and there is nowhere to
//! put it: these are `JSDoc` tags on two classes in two packages, read by an
//! analyzer that sees one file at a time. A tag existing on only one layer would
//! leave that layer's manifest unable to say what its own components are for.
//! Two declarations checked against each other is the honest shape.
//!
//! **A family on one layer only is not this rule's business.** The layers are
//! deliberately not a mirror, and where that question lives is elsewhere.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{Context, Finding, Report};

static CATEGORY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@category ([a-z-]+)").expect("a literal pattern compiles"));

/// The category on a family's root element, where there is a root.
fn root_category(layer: &Path, family: &str) -> Option<String> {
    let mut entries: Vec<_> = fs::read_dir(layer.join(family).join("root"))
        .ok()?
        .flatten()
        .map(|entry| entry.path())
        .collect();
    entries.sort();
    for entry in entries {
        let name = entry.file_name()?.to_string_lossy().to_string();
        if !name.ends_with("-root.ts") || name.ends_with(".spec.ts") {
            continue;
        }
        let text = fs::read_to_string(&entry).ok()?;
        if let Some(found) = CATEGORY.captures(&text) {
            return Some(found[1].to_owned());
        }
    }
    None
}

pub fn run(context: &Context) -> Report {
    let [base, over, ..] = context.settings.layers.as_slice() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            unit: "families whose layers name one category",
        };
    };
    let base = context.root.join(&base.source);
    let over = context.root.join(&over.source);

    let Ok(entries) = fs::read_dir(&base) else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            unit: "families whose layers name one category",
        };
    };
    let mut families: Vec<String> = entries
        .flatten()
        .filter(|entry| entry.path().is_dir())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    families.sort();

    let mut findings = Vec::new();
    let mut checked = 0;
    for family in families {
        let (Some(below), Some(above)) =
            (root_category(&base, &family), root_category(&over, &family))
        else {
            continue;
        };
        if below == above {
            checked += 1;
            continue;
        }
        findings.push(Finding {
            detail:
                "Only the outer layer's copy reaches the catalog, so the components index is \
                     already showing one of these and the other is a value nobody reads. Move both."
                    .to_owned(),
            file: family.clone(),
            message: format!("the base says `{below}` and the layer above says `{above}`"),
        });
    }

    Report {
        checked,
        findings,
        unit: "families whose layers name one category",
    }
}
