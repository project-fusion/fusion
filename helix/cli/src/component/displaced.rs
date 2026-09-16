//! A property is documented beside the declaration, and the class block leaves
//! it there.
//!
//! **A `@property` tag in a class doc block does not add an entry, it replaces
//! one.** The analyzer keys members by name, so a tag naming a field the class
//! declares wins: the manifest, the reference page and the framework typings all
//! carry the one line from the tag, and the paragraphs written beside the code
//! reach nobody. Nothing reports it, because both halves are correct on their
//! own. The tag is well formed, the member is declared and documented, and the
//! two agree about everything except which sentence a consumer gets.
//!
//! **Measured on `Video.separation`**, which is where this was found: the member
//! carries thirty lines naming `filled`, naming `plain`, saying that the absent
//! attribute is the shadow the stylesheet reads as its base rule, and saying why
//! a reflecting property may not take a default. The class block above it says
//! "Whether the bar floats on the picture or sits on its own ground." That
//! sentence is the whole of the published API for the property, and neither of
//! its two values is named anywhere a consumer can reach.
//!
//! **This is `restated`'s fault with the loss on the other side.** There a name
//! declared twice reaches the page twice and a reader gets two answers to one
//! question; here it reaches the page once and the answer they get is the one
//! nobody wrote the reasoning into. `restated` cannot see it, counting
//! occurrences of one tag, and a class block's tag occurs once.
//!
//! **Only where the file declares the member**, which is what separates this
//! from the tag's real use. A class documenting a property it does not declare,
//! because a mixin above it does, is documenting something with no doc block of
//! its own to displace, and there is nothing to lose.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// A `@property` tag in a doc block, which is a name rather than a decorator.
///
/// The leading `*` and the bare name are both load bearing: a decorator is
/// `@property(` at the start of its own line and carries no `*`, so requiring
/// one of each is what tells the tag and the decorator apart without parsing.
static TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*\*\s*@property\s+([A-Za-z_$][\w$]*)").expect("a literal pattern compiles")
});

/// The member a `@property` decorator sits on, past any further decorators.
///
/// The same shape `properties` reads, and for the same reason: the decorator's
/// arguments run over several lines and another decorator can sit between it and
/// the name.
static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)^\s*@property\([^)]*\)\s*(?:\n\s*@[\w.]+\([^)]*\)\s*)*\n\s*(?:accessor\s+|declare\s+|get\s+|override\s+|readonly\s+|set\s+)*([A-Za-z_$][\w$]*)",
    )
    .expect("a literal pattern compiles")
});

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for layer in &context.settings.layers {
        let mut files = Vec::new();
        sources(&context.root.join(&layer.source), &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            /* Counted from the declarations rather than from the tags, which is
            the `floors` rule's point and not a style choice. A count of the tags
            is a count of the fault: with none left in the tree it reports zero,
            and zero reads identically to having looked at nothing. What this
            tested is every declared property, each asked whether a class block
            above it names it too. */
            let named: BTreeSet<&str> = TAG
                .captures_iter(&text)
                .filter_map(|found| found.get(1).map(|name| name.as_str()))
                .collect();
            for found in DECLARED.captures_iter(&text) {
                let Some(name) = found.get(1) else {
                    continue;
                };
                checked += 1;
                if !named.contains(name.as_str()) {
                    continue;
                }
                findings.push(Finding {
                    detail: "The analyzer keys members by name, so the tag wins and the block \
                             written beside the declaration reaches no consumer."
                        .to_owned(),
                    file: context.relative(&file),
                    message: format!(
                        "`@property {}` in a class doc block displaces the member's own block",
                        name.as_str()
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "declared properties a class doc block could name",
    }
}
