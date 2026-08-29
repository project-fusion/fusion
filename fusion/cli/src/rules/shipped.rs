//! Nothing in `dist` outlives the source it was compiled from.
//!
//! **`tsc` leaves the output of a deleted source behind**, Turborepo caches the
//! directory it was told to cache, and every later cache hit restores them. So a
//! module a consumer can import goes on existing after the file that produced it
//! is gone, and nothing in the build says so: the package publishes a name
//! nobody maintains.
//!
//! **Which packages can be asked is derived from how they build.** A package
//! whose build runs `tsc` emits one file per source file, so the mapping back is
//! exact. A package built by a script that emits a bundle has no such mapping,
//! and a list of names kept by hand is one more thing to forget when a package
//! is added.
//!
//! **Not built is not a fault.** A package nobody has compiled has shipped
//! nothing to be wrong about.
//!
//! **A generated stylesheet module counts as its own origin.** A `.css.ts` is
//! written beside its stylesheet and compiles like any other source.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::manifests;

/// Everything under a directory, relative to it.
fn walk(directory: &Path, base: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        if path.is_dir() {
            walk(&path, base, found);
        } else if let Ok(relative) = path.strip_prefix(base) {
            found.push(relative.to_path_buf());
        }
    }
}

/// The compiled suffixes, longest first so `.d.ts` wins over `.ts`.
const SUFFIXES: [&str; 4] = [".d.ts.map", ".js.map", ".d.ts", ".js"];

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for manifest in manifests(&context.root) {
        let builds_per_file = manifest
            .value
            .get("scripts")
            .and_then(|one| one.get("build"))
            .and_then(Value::as_str)
            .is_some_and(|one| one.contains("tsc"));
        if !builds_per_file {
            continue;
        }
        let package = context.root.join(&manifest.directory);
        let (dist, source) = (package.join("dist"), package.join("src"));
        if !dist.is_dir() {
            continue;
        }

        let mut compiled = Vec::new();
        walk(&dist, &dist, &mut compiled);
        for file in compiled {
            let name = file.to_string_lossy().replace('\\', "/");
            let Some(stem) = SUFFIXES.iter().find_map(|suffix| name.strip_suffix(suffix)) else {
                continue;
            };
            checked += 1;
            let origins = [
                format!("{stem}.ts"),
                format!("{stem}.tsx"),
                format!("{stem}.css.ts"),
            ];
            if origins.iter().any(|one| source.join(one).is_file()) {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "`tsc` leaves the output of a deleted source behind and a cache restores it. \
                     Remove it, and rebuild forced so the poisoned entry is replaced: `rm -rf \
                     {}/dist && bunx turbo run build --force --filter={}`.",
                    manifest.directory, manifest.name
                ),
                file: format!("{}/dist/{name}", manifest.directory),
                message: format!("no source at {}/src/{stem}.ts", manifest.directory),
            });
        }
    }

    Report {
        checked,
        findings,
        unit: "compiled files",
    }
}
