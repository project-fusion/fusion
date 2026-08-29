//! No `.js` file sits in a package's source tree.
//!
//! **A tool writes an entry module, measures it, and does not delete it.** The
//! bundle-size measurement writes a one-line module — `import` the thing, bundle
//! it, weigh the output — and it has to write it *inside* the workspace, because
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
//! a file is for — it asks the one question that separates what a person wrote
//! from what a tool dropped.
//!
//! **What a package publishes as a directory is output, and is skipped.** The
//! walk already skips `dist` and the rest by name, and one package builds its
//! WebAssembly glue into a directory of its own — generated `.js`, and correctly
//! there. Rather than adding that name to the shared list, this reads each
//! manifest's `files`: a directory a package declares as published output is
//! output by the package's own account, which stays true for the next one.
//!
//! **What it does not catch, said plainly.** Scratch written as `.ts` or `.mjs`
//! is indistinguishable from source to this rule, and it will pass. The general
//! version — a tracked file nothing reaches — is the one worth wanting and is
//! not writable without an allowlist: an ambient `.d.ts` is reached by the
//! compiler's `include` and never by name, and a generated `.css.ts` is reached
//! by a bundler convention, so both look exactly like the strays. A rule with a
//! growing exemption list is one nobody reads. This one is total or it is
//! nothing, and it is total.

use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::{crawl, manifests};

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for manifest in manifests(&context.root) {
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
            if published.iter().any(|one| file.starts_with(one)) {
                continue;
            }
            /* **Every file read, not every stray found.** Zero strays is the
            healthy state, so counting those would make a clean tree look to
            `floors` exactly like a rule that had stopped walking. */
            checked += 1;
            if file.extension().is_none_or(|one| one != "js") {
                continue;
            }
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");
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
        unit: "files read for a stray",
    }
}
