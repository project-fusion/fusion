//! Nothing in this tree is a file a tool left behind.
//!
//! **A tool writes an entry module, measures it, and does not delete it.** The
//! bundle-size measurement writes a one-line module (`import` the thing, bundle
//! it, weigh the output), and it has to write it *inside* the workspace, because
//! the module names a package by its scoped name and resolution walks up from
//! the file. A module in the system temp directory resolves nothing.
//!
//! So the scratch has to land in the tree, and the day it lands in a package
//! rather than in the ignored scratch directory, nothing says so: five of them
//! sat in a tier for two days, arriving inside a seven-hundred-file commit where
//! nobody was going to see them. They are not imported, not exported, not
//! published, and not wrong in any way a check was asking about.
//!
//! **The tell is the extension.** This workspace writes `.ts`, `.tsx` and
//! `.mjs`; the one thing that writes plain `.js` is a bundler, and a bundler's
//! output belongs in `dist`, which is not read here. Measured on the day this
//! was written: after those five were deleted, the three domains held zero `.js`
//! files between them. So the rule needs no allowlist and no judgment about what
//! a file is for: it asks the one question that separates what a person wrote
//! from what a tool dropped.
//!
//! **What a package publishes as a directory is output, and is skipped.** The
//! walk already skips `dist` and the rest by name, and one package builds its
//! WebAssembly glue into a directory of its own: generated `.js`, and correctly
//! there. Rather than adding that name to the shared list, this reads each
//! manifest's `files`: a directory a package declares as published output is
//! output by the package's own account, which stays true for the next one.
//!
//! **The second half is the suffix, and it reaches the root.** A file ending in
//! `.bak`, `.orig`, `.rej`, `.tmp` or a tilde is an editor's, a patch's or a
//! hand's: nobody writes one on purpose and nothing imports one. Two were
//! tracked when this was widened: a copy of a generated stylesheet module at the
//! repository root, and an empty `.css.tmp` beside the example whose stylesheet
//! it was a draft of. The first had been in the tree for a day and was picked up
//! by a comment sweep that rewrote it, which is what a stray costs: it is not
//! inert, it is one more file every sweep has to touch.
//!
//! **The root is where things get dropped and nothing else looks.** The `.js`
//! half asks about a package's source tree, because that is where its premise
//! was measured; this half asks about everywhere, because a backup at the root
//! belongs to no package and so belonged to no rule.
//!
//! **What it does not catch, said plainly.** Scratch written as `.ts` or `.mjs`
//! is indistinguishable from source to this rule, and it will pass. The general
//! version (a tracked file nothing reaches) is the one worth wanting and is
//! not writable without an allowlist: an ambient `.d.ts` is reached by the
//! compiler's `include` and never by name, and a generated `.css.ts` is reached
//! by a bundler convention, so both look exactly like the strays. A rule with a
//! growing exemption list is one nobody reads.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

/// Suffixes nobody writes on purpose.
///
/// `.orig` and `.rej` are a patch's leavings, `.swp` an editor's, and the rest
/// are what a hand reaches for before an edit it means to undo.
const LEFTOVER: [&str; 6] = [".bak", ".orig", ".rej", ".swp", ".swo", ".tmp"];

/// Why a name reads as something left behind, or nothing when it does not.
fn leftover(name: &str) -> Option<String> {
    if name.ends_with('~') || LEFTOVER.iter().any(|one| name.ends_with(one)) {
        return Some(
            "Nobody writes one of these on purpose and nothing imports one. Delete it, or if it \
             is a draft worth keeping, keep it under the ignored scratch directory."
                .to_owned(),
        );
    }
    None
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    /* The root's own files, which belong to no package and so belonged to no
    rule. Not recursed: everything below is a package and is walked as one. */
    for entry in fs::read_dir(&context.root).into_iter().flatten().flatten() {
        let path = entry.path();
        if path.is_dir() {
            continue;
        }
        checked += 1;
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(said) = leftover(&name) {
            findings.push(Finding {
                detail: said,
                file: name.clone(),
                message: format!("`{name}` is a file something left behind"),
            });
        }
    }

    for manifest in context.manifests() {
        /* The root is not a package's source tree; its own files are the
        workspace's, and `dist` is skipped by the walk rather than by name. */
        if manifest.directory.is_empty() {
            continue;
        }
        let directory = context.root.join(&manifest.directory);
        /* What the package itself calls published output. Only the directories:
        `files` names single files too, and one of those is source. */
        let published: Vec<PathBuf> = manifest
            .value
            .get("files")
            .and_then(Value::as_array)
            .map(|all| {
                all.iter()
                    .filter_map(Value::as_str)
                    .map(|one| directory.join(one))
                    .filter(|one| one.is_dir())
                    .collect()
            })
            .unwrap_or_default();

        let mut files = Vec::new();
        crawl(&directory, &|_: &Path| true, &mut files);

        for file in files {
            /* **Every file read, not every stray found.** Zero strays is the
            healthy state, so counting those would make a clean tree look to
            `floors` exactly like a rule that had stopped walking. */
            checked += 1;
            let where_ = context.relative(&file);
            let name = file
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if let Some(said) = leftover(&name) {
                findings.push(Finding {
                    detail: said,
                    file: where_.clone(),
                    message: format!("`{name}` is a file something left behind"),
                });
                continue;
            }
            /* **The output exemption covers the extension and not the
            leftovers.** A generated `.js` under a published directory is the
            build's and belongs there; a `.bak` under the same directory is in
            the tarball, which is worse than one in the source tree rather than
            excused by sitting next to output. */
            if published.iter().any(|one| file.starts_with(one))
                || file.extension().is_none_or(|one| one != "js")
            {
                continue;
            }
            findings.push(Finding {
                detail: "This workspace writes `.ts`, `.tsx` and `.mjs`. A plain `.js` here is \
                         something a tool wrote and did not delete; a bundler's own output \
                         belongs in `dist`, which this does not read. Scratch that has to live \
                         inside the workspace to resolve belongs under the ignored scratch \
                         directory."
                    .to_owned(),
                file: where_,
                message: format!("a `.js` file sits in `{}`", manifest.directory),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "files read for a stray",
    }
}
