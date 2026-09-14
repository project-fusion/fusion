//! No package's script names a path inside another package.
//!
//! **A relative path out of a package is a dependency the manifest does not
//! declare.** The site ran a sibling's WebAssembly build by walking three levels
//! up to its file; two tiers ran a shared generator the same way. Each of those
//! works until the file moves, and then it fails in a package that never said it
//! needed the thing that moved, so the rename passes every check in the package
//! that owns the file and breaks the one that does not.
//!
//! **The fix is the package boundary, and there are two shapes of it.** A build
//! a sibling owns is `bun run --filter <name> <script>`, which asks the package
//! rather than the file. A tool several packages share is a `bin`, declared once
//! and depended on, which is what makes the caller's manifest say out loud that
//! it needs it.
//!
//! **Reaching the workspace root is not this.** A Rust workspace has one
//! `Cargo.toml` and a TypeScript one has a base config, and a package naming
//! either is naming the workspace it is a member of rather than a neighbor's
//! private file. So the rule is exactly what it says: a path that lands inside
//! *another package* is the fault, and a path that lands anywhere else is not.
//!
//! **The root manifest is exempt, and that is the whole point of a root.** It
//! orchestrates, so naming what it orchestrates is its job.
//!
//! **A script file's imports are read for the same climb.** A manifest's
//! `scripts` were the only text this read, and the site's catalog generator
//! imported `helix/docs/src/catalog.ts` and `fusion/docs/insights/src/index.ts`
//! by relative path for as long as that was true: a dependency on a package's
//! layout rather than on what it exports, and one the manifest did declare, so
//! nothing said that the import was the wrong door. Every `.mjs` in a package
//! is read for an `import` or `from` naming a path that climbs into another
//! package.

use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::LazyLock;

use fusion_rules::walk::crawl;
use regex::Regex;

use crate::rules::{Context, Finding, Report};

/// A relative path that climbs out of where it is written.
///
/// Anchored on the climb rather than on any path, because a path that stays
/// inside the package is the package reading its own files.
static CLIMBS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:^|[\s'"=(])(\.\.(?:/[\w.@-]+)+)"#).expect("a literal pattern compiles")
});

/// An import specifier that climbs out of the file it is written in: static
/// `from '../x'`, a bare `import '../x'`, or a dynamic `import('../x')`.
static IMPORTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"\b(?:from|import)\s*\(?\s*['"](\.\./[^'"\n]+)['"]"#)
        .expect("a literal pattern compiles")
});

/// The package a path is inside, taking the deepest when packages nest.
fn owner_of<'a>(packages: &'a [PathBuf], path: &Path) -> Option<&'a PathBuf> {
    packages
        .iter()
        .filter(|one| path.starts_with(one))
        .max_by_key(|one| one.components().count())
}

/// Where a climb lands, or nothing if it climbs past the workspace.
fn lands(from: &Path, written: &str) -> Option<PathBuf> {
    let mut at = from.to_path_buf();
    for part in Path::new(written).components() {
        match part {
            Component::ParentDir => {
                at = at.parent()?.to_path_buf();
            }
            Component::CurDir => {}
            other => at.push(other.as_os_str()),
        }
    }
    Some(at)
}

pub fn run(context: &Context) -> Report {
    let all = context.manifests();
    let packages: Vec<PathBuf> = all
        .iter()
        .filter(|one| !one.directory.is_empty())
        .map(|one| context.root.join(&one.directory))
        .collect();

    let mut findings = Vec::new();
    let mut checked = 0;

    for manifest in all {
        /* The root orchestrates, so naming what it orchestrates is its job. */
        if manifest.directory.is_empty() {
            continue;
        }
        let directory = context.root.join(&manifest.directory);
        let where_ = format!("{}/package.json", manifest.directory);

        for (name, value) in manifest.scripts() {
            /* **Every script tested, not every climb found.** A climb is what
            this reports, and the healthy number of them is zero, so counting
            those would make a clean workspace look to `floors` exactly like a
            rule that had stopped reading manifests. */
            checked += 1;
            for caught in CLIMBS.captures_iter(value) {
                let written = caught[1].to_owned();
                let Some(landed) = lands(&directory, &written) else {
                    continue;
                };
                let Some(owner) = owner_of(&packages, &landed).filter(|one| **one != directory)
                else {
                    continue;
                };
                let owner = context.relative(owner);
                findings.push(Finding {
                    detail: "Ask the package rather than the file: `bun run --filter <name> \
                             <script>` for a build a sibling owns, or a `bin` it declares and \
                             this manifest depends on for a tool several packages share."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!("`{name}` names `{written}`, which is inside `{owner}`"),
                });
            }
        }

        /* The package's own script files, which a nested package's are not: a
        file is read by the deepest package holding it, or the parent would
        report the child's own imports as climbs out of itself. */
        let mut files = Vec::new();
        crawl(
            &directory,
            &|path| path.extension().is_some_and(|extension| extension == "mjs"),
            &mut files,
        );
        for file in files {
            if owner_of(&packages, &file) != Some(&directory) {
                continue;
            }
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            checked += 1;
            let from = file.parent().unwrap_or(&directory);
            for caught in IMPORTS.captures_iter(&text) {
                let written = caught[1].to_owned();
                let Some(landed) = lands(from, &written) else {
                    continue;
                };
                let Some(owner) = owner_of(&packages, &landed).filter(|one| **one != directory)
                else {
                    continue;
                };
                findings.push(Finding {
                    detail: "Import the package by name. What it exports is the surface a \
                             file can move behind; a relative path into its source pins a \
                             layout this package never declared it depends on."
                        .to_owned(),
                    file: context.relative(&file),
                    message: format!(
                        "imports `{written}`, which is inside `{}`",
                        context.relative(owner)
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "scripts and script files read for a path out of their package",
    }
}
