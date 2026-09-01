//! One selector is written once, or the blocks after it add rather than replace.
//!
//! **Writing a selector twice is this repository's authoring style and is not
//! the fault.** A block, then prose explaining what comes next, then another
//! block on the same selector, is how a stylesheet here is read as an argument
//! rather than as a table. Reporting that would be reporting the house style,
//! so it is counted and named and left alone.
//!
//! **The fault is the second block setting a property the first one set.** Both
//! blocks are valid, both are at one nesting level and one specificity, and
//! source order alone decides which survives. Nothing about the file looks
//! wrong: the losing declaration is still there, still spelled correctly, and
//! still has its comment above it describing what it was for. What is missing
//! is the effect.
//!
//! **A selector list is read per selector, and judged per block.** Keyed by the
//! whole prelude, `[part="segment"]` and `[part="segment"], [part="track"]`
//! under one at-rule are two different keys and never compare, which left a
//! live instance in `donut-chart-root.css` invisible to the rule written to
//! find it, and made `A, B` and `B, A` incomparable too. So the prelude is
//! split on top-level commas and each selector tracked on its own.
//!
//! **But a declaration is dead only if every selector in its block is beaten.**
//! Six parts sharing one rule and one of them overriding a property below it is
//! how this repository writes a default and an exception, and the shared
//! declaration is still doing work for the other five. Reporting that would be
//! reporting the pattern, and a rule that fires on correct CSS teaches people to
//! write worse CSS to silence it. Measured: judging per selector reported five
//! of these and none was a defect.
//!
//! **The same selector under a different parent is a different rule**, so
//! blocks are keyed by the whole path down to them rather than by depth. A
//! declaration inside `@media (prefers-reduced-motion: reduce)` is meant to beat
//! the one outside it, and keying by depth alone would call that the defect it
//! is the opposite of.
//!
//! **Value equality is not the test.** Two blocks setting one property to the
//! same value are as dead as two setting it to different ones, and are the more
//! confusing case to read, because the file looks like it means it twice.
//!
//! **The examples are in scope, and they were the larger half.** They were held
//! out on this rule's first run so it swept the population it was measured
//! against: 26 findings across the `.examples/` sheets to the component sheets'
//! 4. Those closed one sheet at a time, because in an example the duplicate is
//! usually the whole block and the repair is a reading of what the example is
//! showing rather than a deletion of whatever a later block re-sets. With the
//! count at zero the skip comes out, which is what turns this from a sweep into
//! a rule: the next example to grow a dead block fails here on the day it is
//! written. The `hooks` rule still draws its own line elsewhere, for its own
//! reasons.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// One block: every selector path that reaches it, and what it declares.
struct Block {
    declarations: Vec<String>,
    /// One per selector in the prelude, each with the at-rules above it.
    paths: Vec<String>,
}

/// One prelude as the selectors it actually names.
///
/// Top-level commas only: a comma inside `:is(a, b)` joins one selector rather
/// than separating two, so depth is tracked and only a comma at zero splits.
fn split(prelude: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut depth = 0;
    let mut buffer = String::new();
    for character in prelude.chars() {
        match character {
            '(' | '[' => {
                depth += 1;
                buffer.push(character);
            }
            ')' | ']' => {
                depth -= 1;
                buffer.push(character);
            }
            ',' if depth == 0 => {
                out.push(buffer.split_whitespace().collect::<Vec<&str>>().join(" "));
                buffer.clear();
            }
            _ => buffer.push(character),
        }
    }
    let last = buffer.split_whitespace().collect::<Vec<&str>>().join(" ");
    if !last.is_empty() {
        out.push(last);
    }
    out
}

/// Every block in a stylesheet, each keyed by the path of selectors above it.
///
/// A hand walk rather than a regex, because the pattern the other rules use for
/// a rule body cannot see a block holding another block, and nesting is the
/// whole subject here.
fn blocks(css: &str) -> Vec<Block> {
    let mut found: Vec<Block> = Vec::new();
    let mut stack: Vec<String> = Vec::new();
    let mut declarations: Vec<Vec<String>> = Vec::new();
    let mut buffer = String::new();

    let flush = |buffer: &mut String, into: Option<&mut Vec<String>>| {
        let text = buffer.trim();
        if let Some(one) = text.split(':').next() {
            let property = one.trim();
            if !text.is_empty() && text.contains(':') && !property.is_empty() {
                if let Some(list) = into {
                    list.push(property.to_owned());
                }
            }
        }
        buffer.clear();
    };

    for character in css.chars() {
        match character {
            '{' => {
                let selector = buffer.split_whitespace().collect::<Vec<&str>>().join(" ");
                buffer.clear();
                stack.push(selector);
                declarations.push(Vec::new());
            }
            '}' => {
                flush(&mut buffer, declarations.last_mut());
                if let (Some(list), Some(innermost)) = (declarations.pop(), stack.last()) {
                    let above = stack[..stack.len() - 1].join(" > ");
                    found.push(Block {
                        declarations: list,
                        paths: split(innermost)
                            .into_iter()
                            .map(|one| {
                                if above.is_empty() {
                                    one
                                } else {
                                    format!("{above} > {one}")
                                }
                            })
                            .collect(),
                    });
                }
                stack.pop();
            }
            ';' => flush(&mut buffer, declarations.last_mut()),
            _ => buffer.push(character),
        }
    }

    found
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut notes = Vec::new();
    let mut checked = 0;
    let mut repetitions = 0;

    for root in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&root, &mut sheets);
        for sheet in sheets {
            let Ok(css) = fs::read_to_string(&sheet) else {
                continue;
            };
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");
            checked += 1;

            /* Path to the blocks written at it, in source order, which is the
            order that decides the winner. */
            let parsed = blocks(&COMMENT.replace_all(&css, ""));
            /* Selector path to the blocks reaching it, in source order, each as
            an index into `parsed` so a block keeps its whole prelude. */
            let mut written: BTreeMap<&str, Vec<usize>> = BTreeMap::new();
            for (index, block) in parsed.iter().enumerate() {
                for path in &block.paths {
                    written.entry(path.as_str()).or_default().push(index);
                }
            }

            /* Judged per block rather than per path: a declaration is dead only
            where every selector the block names is beaten for it. A shared rule
            over six parts with one of them overriding below is a default and an
            exception, and the shared declaration is still doing work. */
            for (index, block) in parsed.iter().enumerate() {
                let repeated = block
                    .paths
                    .iter()
                    .any(|path| written.get(path.as_str()).is_some_and(|one| one.len() > 1));
                if !repeated {
                    continue;
                }
                let mut beaten: Vec<String> = Vec::new();
                for property in &block.declarations {
                    let everywhere = block.paths.iter().all(|path| {
                        written.get(path.as_str()).is_some_and(|reaching| {
                            reaching
                                .iter()
                                .filter(|one| **one > index)
                                .any(|one| parsed[*one].declarations.contains(property))
                        })
                    });
                    if everywhere && !beaten.contains(property) {
                        beaten.push(property.clone());
                    }
                }
                let path = block.paths.join(", ");
                if beaten.is_empty() {
                    /* Counted here rather than before the check, so the note
                    about repetitions that redeclare nothing does not also count
                    the ones that do. */
                    repetitions += 1;
                    continue;
                }
                findings.push(Finding {
                    detail: "Two blocks on one selector at one nesting level and one \
                             specificity, so source order alone decides it and the earlier \
                             declaration is dead with nothing to say so."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!(
                        "`{path}` is written more than once and a later block redeclares {}",
                        beaten
                            .iter()
                            .map(|one| format!("`{one}`"))
                            .collect::<Vec<String>>()
                            .join(", ")
                    ),
                });
            }
        }
    }

    if repetitions > 0 {
        notes.push(format!(
            "{repetitions} selectors are written more than once without redeclaring anything, \
             which is the authoring style rather than a defect"
        ));
    }

    Report {
        checked,
        findings,
        notes,
        unit: "stylesheets",
    }
}
