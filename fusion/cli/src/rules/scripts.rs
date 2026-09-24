//! Every `bun run` inside a manifest names a script that manifest declares.
//!
//! **A manifest reaches its own scripts and no others.** A `catalog` call inside
//! a package runs the `catalog` that package declares, and a root script of the
//! same name is not a fallback: measured with bun 1.1.43, `bun run` from a
//! package directory answers `Script not found` for a name only the root has.
//!
//! **The fault this exists for is a rename that is uniformly wrong.** Moving a
//! set of root scripts to a new prefix rewrote the calls inside a package that
//! had its own scripts of those names: ten call sites across three scripts, all
//! agreeing with each other and all naming something that was not there. Every
//! guard in that repository passed and the build was what said otherwise.
//!
//! `prerequisites` catches the other half, and it is worth knowing which. A
//! pass that rewrites some of a manifest's scripts leaves them disagreeing,
//! which that rule reads. A pass that rewrites all of them leaves them agreeing
//! perfectly about a name that does not exist, which only this one sees.
//!
//! Only `bun run`. A task runner resolves against its own graph, `bunx` and
//! `npx` reach into `node_modules`, and a shell fragment is not a claim about
//! the workspace. A false positive here is a rule nobody trusts.

use std::collections::BTreeSet;

use crate::rules::{Context, Finding, Report};

/// `bun run <name>`, the whole name, stopping at a space or a shell operator.
///
/// **Read to the end of the word, not to the first character a name usually
/// lacks.** Stopping there read `build_docs` as `build`, which passed where a
/// `build` existed and faulted a script that was there, and `scripts/gen.ts`
/// as `scripts`. A word with a slash or a dot is a file `bun run` executes,
/// not a script, and is not asked about.
fn called(value: &str) -> Vec<&str> {
    let mut found = Vec::new();
    let mut rest = value;
    while let Some(at) = rest.find("bun run ") {
        rest = &rest[at + "bun run ".len()..];
        let end = rest
            .find(|c: char| c.is_whitespace() || ";&|()<>`'\"".contains(c))
            .unwrap_or(rest.len());
        let word = &rest[..end];
        if end > 0
            && rest.as_bytes()[0].is_ascii_lowercase()
            && !word.contains('/')
            && !word.contains('.')
        {
            found.push(word);
        }
        rest = &rest[end..];
    }
    found
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    for manifest in context.manifests() {
        let scripts = manifest.scripts();
        let own: BTreeSet<&str> = scripts.keys().copied().collect();
        for (key, value) in &scripts {
            for name in called(value) {
                checked += 1;
                if own.contains(name) {
                    continue;
                }
                findings.push(Finding {
                    detail: "A manifest reaches its own scripts and nothing else, so this fails \
                             the moment it runs. A root script of the same name is not a fallback."
                        .to_owned(),
                    file: manifest.label(),
                    message: format!(
                        "`{key}` runs `bun run {name}`, and {} declares no such script",
                        manifest.name
                    ),
                });
            }
        }
    }
    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "`bun run` calls",
    }
}
