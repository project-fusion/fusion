//! A library that warns through one channel calls `console.warn` only there.
//!
//! **A warning printed beside the channel is a warning nothing counts.** Helix
//! sends every runtime warning through `reportRuntime`, which hands it to a
//! diagnostics run when one is listening and prints it when none is. A
//! `console.warn` written anywhere else reaches the console and no run, so the
//! counts a team reads leave it out.
//!
//! **The channel and the roots come from `fusion.json`.** A workspace with no
//! `warnings` key has no channel to keep, and the rule counts nothing, which
//! `floors` reports.
//!
//! **Specs and examples are not the library.** A spec replaces `console.warn`
//! to see what was printed, and an example is code a consumer writes, where a
//! warning is theirs to print.
//!
//! **Read with comments blanked**, since a comment saying which method the
//! channel prints with names `console.warn` without calling it.

use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use fusion_rules::source::uncommented;
use fusion_rules::walk::crawl;
use regex::Regex;

use crate::rules::{Context, Finding, Report};

/// The method, with any space the language allows around the dot.
static CALL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bconsole\s*\.\s*warn\b").expect("a literal pattern compiles"));

/// A module of the library, which leaves out specs, examples, and declarations.
fn library(path: &Path) -> bool {
    let name = path.file_name().unwrap_or_default().to_string_lossy();
    let module = matches!(
        path.extension()
            .map(|one| one.to_string_lossy().to_string())
            .as_deref(),
        Some("js" | "mjs" | "ts" | "tsx")
    );
    module
        && !name.contains(".spec.")
        && !name.ends_with(".d.ts")
        && !path
            .components()
            .any(|part| part.as_os_str() == ".examples")
}

pub fn run(context: &Context) -> Report {
    let settings = &context.settings.warnings;
    let mut findings = Vec::new();
    let mut checked = 0;
    for root in &settings.roots {
        let mut files = Vec::new();
        crawl(&context.root.join(root), &library, &mut files);
        for file in files {
            let where_ = context.relative(&file);
            if where_ == settings.channel {
                continue;
            }
            let Ok(source) = fs::read_to_string(&file) else {
                continue;
            };
            checked += 1;
            let code = uncommented(&source);
            for found in CALL.find_iter(&code) {
                let line = code[..found.start()].matches('\n').count() + 1;
                findings.push(Finding {
                    detail: format!(
                        "A warning printed here reaches the console and nothing that counts \
                         warnings. Report it through the channel, `{}`.",
                        settings.channel
                    ),
                    file: format!("{where_}:{line}"),
                    message: "calls `console.warn` itself".to_owned(),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "modules",
    }
}
