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
//! **The examples are out of scope here and have their own row.** They carry 22
//! of these against the component sheets' 4, they are demonstration code rather
//! than shipped CSS, and folding them in would have made the first run of this
//! rule a sweep of a different population than the one it was written for. The
//! `hooks` rule draws the line in the same place.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// One block: the selector path that reaches it, and what it declares.
struct Block {
    declarations: Vec<String>,
    path: String,
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
                if let (Some(list), Some(_)) = (declarations.pop(), stack.last()) {
                    found.push(Block {
                        declarations: list,
                        path: stack.join(" > "),
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
            if where_.contains("/.examples/") {
                continue;
            }
            checked += 1;

            /* Path to the blocks written at it, in source order, which is the
            order that decides the winner. */
            let mut written: BTreeMap<String, Vec<Vec<String>>> = BTreeMap::new();
            for block in blocks(&COMMENT.replace_all(&css, "")) {
                written.entry(block.path).or_default().push(block.declarations);
            }

            for (path, blocks) in &written {
                if blocks.len() < 2 {
                    continue;
                }
                repetitions += blocks.len() - 1;
                let mut beaten: Vec<String> = Vec::new();
                for (index, block) in blocks.iter().enumerate() {
                    for property in block {
                        let earlier = blocks[..index].iter().any(|one| one.contains(property));
                        if earlier && !beaten.contains(property) {
                            beaten.push(property.clone());
                        }
                    }
                }
                if beaten.is_empty() {
                    continue;
                }
                findings.push(Finding {
                    detail: "Two blocks on one selector at one nesting level and one \
                             specificity, so source order alone decides it and the earlier \
                             declaration is dead with nothing to say so."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!(
                        "`{path}` is written {} times and the later block redeclares {}",
                        blocks.len(),
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
