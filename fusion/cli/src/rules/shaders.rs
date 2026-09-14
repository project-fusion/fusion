//! GLSL written inside a JavaScript template literal is still GLSL.
//!
//! **A backtick inside a shader ends its template literal**, and what follows is
//! parsed as JavaScript. The shader is then cut off mid-source, the program
//! fails to compile at run time, and the file itself looks perfectly ordinary.
//!
//! **It reads the string the way the parser does, not the way it looks.** The
//! next backtick is where JavaScript ends the literal, whatever the author
//! meant, so three things are asked of what is actually between them: that it is
//! closed at all, that it reaches its entry point, and that its braces balance.
//!
//! **The corpus is the whole workspace rather than a list of roots.** A folder
//! that moves leaves a written-out pattern matching nothing under its new name,
//! and the check goes on passing, which is exactly what happened here once: a
//! glob naming three roots by hand scanned 1,117 files where 1,343 existed,
//! missed three quarters of its subject, and stayed green.

use std::fs;

use fusion_rules::walk::crawl;

use crate::rules::{Context, Finding, Report};

/// What opens a shader, including the backtick that starts the literal.
const OPENER: &str = "`#version 300 es";

pub fn run(context: &Context) -> Report {
    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path| {
            matches!(
                path.extension()
                    .map(|one| one.to_string_lossy().to_string())
                    .as_deref(),
                Some("js" | "mjs" | "ts" | "tsx")
            )
        },
        &mut files,
    );

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in files {
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        let where_ = context.relative(&file);

        let mut at = source.find(OPENER);
        while let Some(start) = at {
            let open = start + 1;
            let close = source[open..].find('`').map(|one| one + open);
            let line = source[..start].matches('\n').count() + 1;
            let literal = close.map_or(&source[open..], |one| &source[open..one]);
            checked += 1;

            let opens = literal.matches('{').count();
            let closes = literal.matches('}').count();
            let complaint = if close.is_none() {
                Some("is never closed".to_owned())
            } else if !literal.contains("void main") {
                Some(
                    "ends before `void main`, so a backtick inside it closed the template early"
                        .to_owned(),
                )
            } else if opens == closes {
                None
            } else {
                Some(format!(
                    "has {opens} `{{` against {closes} `}}`, so it was cut short or mangled"
                ))
            };
            if let Some(complaint) = complaint {
                findings.push(Finding {
                    detail: "A backtick inside a shader ends its template literal. Use no \
                             backticks in GLSL."
                        .to_owned(),
                    file: format!("{where_}:{line}"),
                    message: format!("shader literal {complaint}"),
                });
            }

            at = close.and_then(|one| source[one..].find(OPENER).map(|two| two + one));
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "GLSL literals",
    }
}
