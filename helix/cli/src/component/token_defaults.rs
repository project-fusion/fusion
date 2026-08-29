//! A token a component reads resolves on a page that matches no state.
//!
//! **Being defined is not the same as resolving, and the difference is a
//! component drawn at 950 pixels.** A rule that builds its set of known tokens
//! from any declaration anywhere in the styles package counts one declared only
//! inside `[data-density]` as present. Every ordinary page is in no density
//! region at all, and there the `var()` falls through to nothing and the whole
//! declaration is dropped.
//!
//! Measured when exactly that happened to six relative size tokens, against the
//! values from before they existed: a select caret went from 16px to 950, a menu
//! item from 32 to 18, a tree item from 40 to 20. The defined-ness check
//! reported green throughout, because four `[data-density*]` rules still
//! declared them, while fifty-nine stylesheets were reading a token that
//! resolved to nothing on the default page.
//!
//! **A selector list containing `:root` is unconditional.** A list applies if
//! any one of its selectors matches, so a single `:root` among five is enough,
//! and `html` is the same element. Comments are stripped before the braces are
//! counted: a `{` inside one ends the block early and every token after it reads
//! as conditional.
//!
//! **Depth one, so a `:root` nested inside `@media (prefers-color-scheme)` is
//! correctly not a default**: it is the dark arm of one.
//!
//! **Where the layer is comes from configuration**, because it is not component
//! source and a rule that guessed would be reading a directory rather than a
//! decision. Without it there is nothing to compare against and the rule reports
//! nothing rather than reporting every token as undefined.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{stylesheets, Context, Finding, Report};

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static DECLARATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(--helix-[\w-]+)\s*:").expect("a literal pattern compiles"));

static READS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\((--helix-[\w-]+)").expect("a literal pattern compiles"));

static UNCONDITIONAL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(:root|html)\s*$").expect("a literal pattern compiles"));

/// Whether a rule applies with no attribute, no theme stamp and no media query.
fn unconditional(selector: &str) -> bool {
    selector.split(',').any(|one| UNCONDITIONAL.is_match(one))
}

/// Tokens declared at the top level of an unconditional rule.
fn defaults(css: &str, found: &mut Vec<String>) {
    let mut stack: Vec<String> = Vec::new();
    let mut buffer = String::new();
    for character in css.chars() {
        match character {
            '{' => {
                stack.push(buffer.trim().to_owned());
                buffer.clear();
            }
            '}' => {
                stack.pop();
                buffer.clear();
            }
            ';' => {
                if let Some(declared) = DECLARATION.captures(&buffer) {
                    if stack.len() == 1 && unconditional(&stack[0]) {
                        found.push(declared[1].to_owned());
                    }
                }
                buffer.clear();
            }
            _ => buffer.push(character),
        }
    }
}

pub fn run(context: &Context) -> Report {
    if context.settings.layer.is_empty() {
        return Report {
            checked: 0,
            findings: Vec::new(),
            unit: "tokens read by components",
        };
    }

    let mut unconditional = Vec::new();
    for sheet in &context.settings.layer {
        let Ok(raw) = fs::read_to_string(context.root.join(sheet)) else {
            continue;
        };
        defaults(&COMMENT.replace_all(&raw, ""), &mut unconditional);
    }

    /* Every token a component reads, and the first sheet that reads it. */
    let mut read: BTreeMap<String, String> = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            if sheet.to_string_lossy().contains(".examples") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");
            for found in READS.captures_iter(&COMMENT.replace_all(&raw, "")) {
                read.entry(found[1].to_owned())
                    .or_insert_with(|| where_.clone());
            }
        }
    }

    let findings = read
        .iter()
        .filter(|(token, _)| !unconditional.contains(token))
        .map(|(token, where_)| Finding {
            detail: "On a page matching none of those the `var()` resolves to nothing and the \
                     declaration is dropped, which is silent: nothing errors and the component \
                     draws at whatever the property falls back to."
                .to_owned(),
            file: where_.clone(),
            message: format!(
                "`{token}` has no definition that applies with no attribute, no theme stamp and \
                 no media query"
            ),
        })
        .collect();

    Report {
        checked: read.len(),
        findings,
        unit: "tokens read by components",
    }
}
