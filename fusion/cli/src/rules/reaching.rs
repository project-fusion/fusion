//! No package's script names a path inside another package.
//!
//! **A relative path out of a package is a dependency the manifest does not
//! declare.** The site ran a sibling's WebAssembly build by walking three levels
//! up to its file; two tiers ran a shared generator the same way. Each of those
//! works until the file moves, and then it fails in a package that never said it
//! needed the thing that moved — so the rename passes every check in the package
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

use std::path::{Component, Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::rules::{Context, Finding, Report};
use crate::workspace::manifests;

/// A relative path that climbs out of where it is written.
///
/// Anchored on the climb rather than on any path, because a path that stays
/// inside the package is the package reading its own files.
static CLIMBS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:^|[\s'"=(])(\.\.(?:/[\w.@-]+)+)"#).expect("a literal pattern compiles")
});

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
    let all = manifests(&context.root);
    let packages: Vec<PathBuf> = all
        .iter()
        .filter(|one| !one.directory.is_empty())
        .map(|one| context.root.join(&one.directory))
        .collect();

    let mut findings = Vec::new();
    let mut checked = 0;

    for manifest in &all {
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
                let Some(owner) = packages
                    .iter()
                    .filter(|one| landed.starts_with(one) && **one != directory)
                    .max_by_key(|one| one.components().count())
                else {
                    continue;
                };
                let owner = owner
                    .strip_prefix(&context.root)
                    .unwrap_or(owner)
                    .to_string_lossy()
                    .replace('\\', "/");
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
    }

    Report {
        checked,
        findings,
        unit: "scripts read for a path out of their package",
    }
}
