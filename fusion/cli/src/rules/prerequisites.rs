//! A task that reads a generated artifact declares that it builds it.
//!
//! **A `typecheck` that reads a generated file and does not generate it passes
//! only where an earlier build left one behind.** Green on the machine that just
//! built, green in a warm cache, red on a clean checkout in whatever order the
//! runner picks. The failure is about the environment rather than the code,
//! which is the kind nobody reproduces.
//!
//! So the claim is narrow: whatever a package's `build` does before it reaches a
//! compiler, its `typecheck` does too. Everything ahead of the compiler is a
//! prerequisite by definition, because a build put it there.

use crate::rules::{Context, Finding, Report};
use crate::workspace::manifests;

/// What counts as compiling.
///
/// Named rather than inferred: "the last step" is wrong for a build that copies
/// afterward, and "anything with build in it" matches the script itself.
const COMPILERS: [&str; 3] = ["tsc", "next build", "vite build"];

fn compiles(step: &str) -> bool {
    COMPILERS.iter().any(|compiler| {
        step == *compiler
            || step
                .strip_prefix(compiler)
                .is_some_and(|rest| rest.starts_with(' '))
    })
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    for manifest in manifests(&context.root) {
        let scripts = manifest.scripts();
        let (Some(build), Some(typecheck)) = (scripts.get("build"), scripts.get("typecheck"))
        else {
            continue;
        };
        let steps: Vec<&str> = build.split("&&").map(str::trim).collect();
        let Some(at) = steps.iter().position(|step| compiles(step)) else {
            continue;
        };
        if at < 1 {
            continue;
        }
        for prerequisite in &steps[..at] {
            checked += 1;
            if typecheck.contains(prerequisite) {
                continue;
            }
            findings.push(Finding {
                detail: format!("typecheck: {typecheck}"),
                file: manifest.label(),
                message: format!(
                    "build runs `{prerequisite}` before compiling and typecheck does not, so \
                     typecheck passes only where an earlier build left the artifact behind"
                ),
            });
        }
    }
    Report {
        checked,
        findings,
        unit: "prerequisites",
    }
}
