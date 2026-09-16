//! A part, a slot and an event are each declared once in the file that owns them.
//!
//! **A duplicate declaration pairs with the code exactly as a single one does.**
//! The part is rendered, the slot is written, the event is dispatched, and the
//! name is documented, so both directions of every two-way check are satisfied,
//! twice over, and nothing reports anything. The cost is downstream: the
//! manifest keeps every declaration, so the reference page lists the name twice,
//! and where the two descriptions differ it lists it twice saying different
//! things about it. A reader then has two answers to one question with nothing
//! to say which is current.
//!
//! **This closes a shape that was known and guarded in one place only.** `hooks`
//! grew the same count after `Divider` declared `--divider-color` and
//! `--divider-thickness` twice apiece under two different descriptions and the
//! reference page listed six hooks as eight: the rule had been recording
//! declarations in a map, so the second `set` overwrote the first and the
//! duplicate was invisible to the rule built to find exactly that class of
//! fault. The same argument applies unchanged to `@csspart`, `@slot` and
//! `@event`, and nothing was holding those.
//!
//! **One rule over three tags rather than three counts in three rules**, because
//! it is one fault. `parts` reads a render chain, `slots` reads the manifests
//! and `events` reads dispatch sites, and none of the three has a reason to open
//! a file and count what it says: this does, and it is the whole of what it
//! does. `@cssproperty` is deliberately not here, being already counted where
//! the live case was found.
//!
//! **Per file rather than per doc block.** A component's tags for one element
//! sit in one block, and a file carrying two blocks that each declare a name has
//! the same problem and the same page: one entry, repeated.
//!
//! **Comments are not blanked**, which is the one place this differs from its
//! neighbors: a doc tag *is* a comment, so blanking them would leave the rule
//! reading a file with nothing in it.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// The three tags, each with the group that holds the name it declares.
static TAGS: LazyLock<[(&str, Regex); 3]> = LazyLock::new(|| {
    [
        (
            "csspart",
            Regex::new(r"@csspart\s+([a-z0-9-]+)").expect("a literal pattern compiles"),
        ),
        (
            "slot",
            Regex::new(r"@slot\s+([a-z0-9-]+)").expect("a literal pattern compiles"),
        ),
        /* The type in braces is optional here and required by `events`, so a
        declaration missing one is still counted rather than skipped: two of them
        is two entries on the page whether or not either names a class. */
        (
            "event",
            Regex::new(r"@event\s+(?:\{[^}]*\}\s+)?([\w:-]+)").expect("a literal pattern compiles"),
        ),
    ]
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
            let where_ = context.relative(&file);
            for (tag, pattern) in TAGS.iter() {
                let mut counts: BTreeMap<&str, usize> = BTreeMap::new();
                for found in pattern.captures_iter(&text) {
                    let Some(name) = found.get(1) else {
                        continue;
                    };
                    *counts.entry(name.as_str()).or_default() += 1;
                }
                checked += counts.len();
                for (name, count) in counts {
                    if count == 1 {
                        continue;
                    }
                    findings.push(Finding {
                        detail: "The manifest keeps every one, so the reference page lists the \
                                 name twice, and where the two descriptions differ it lists it \
                                 twice saying different things."
                            .to_owned(),
                        file: where_.clone(),
                        message: format!("`@{tag} {name}` is declared {count} times in one file"),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "declared part, slot and event names",
    }
}
