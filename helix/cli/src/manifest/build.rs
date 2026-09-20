//! A custom elements manifest, generated from the sources rather than from a
//! JavaScript analyzer reading them through a pinned compiler.
//!
//! **Why this exists at all.** The analyzer in use pins `typescript@~5.4.2` and
//! vendors its own copy, while this repository is on 7.0.2, so every manifest
//! shipped today is source written for one compiler read by another three major
//! versions behind it. Moving to a different JavaScript analyzer moves that pin;
//! parsing here removes it.
//!
//! **Built a layer at a time, each held to the analyzer's output before the
//! next is started.** `manifest diff` is the instrument and it is unforgiving on
//! purpose: a layer is done when the two manifests disagree about nothing in
//! that layer's terms. Nothing here is trusted because it looks right.
//!
//! **The modules are the first layer, and they are a file walk.** Measured
//! against all four tiers: the analyzer's module list is exactly `src/**/*.ts`
//! less the specs, the declarations and the generated files, sorted, with no
//! parse involved in deciding what is in it. So this layer can be finished and
//! proved before a parser is pointed at anything.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use crate::manifest::parse::declarations;

/// Files the analyzer is told to skip, by the suffix that names them.
///
/// A spec is not API, a `.d.ts` declares something else's, and a generated file
/// is an output rather than a source. These are the analyzer's own three
/// exclusions, kept verbatim: this layer is held to its output, so a fourth of
/// our own would be a difference to explain rather than a tidy-up.
const SKIPPED: [&str; 3] = [".spec.ts", ".d.ts", ".generated.ts"];

fn walk(at: &Path, package: &Path, into: &mut Vec<String>) {
    let Ok(entries) = fs::read_dir(at) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|one| one.path()).collect();
    /* Read in a fixed order rather than the directory's, which is the file
    system's business and differs between one machine and another. The sort
    in `sources` settles the result either way; this keeps a partial run from
    differing too. */
    paths.sort();
    for path in paths {
        if path.is_dir() {
            walk(&path, package, into);
            continue;
        }
        let Some(name) = path.file_name().and_then(|one| one.to_str()) else {
            continue;
        };
        /* The extension through `Path`, which compares the one segment rather
           than the tail of the name, and the three exclusions as suffixes,
           because `.spec.ts` and `.d.ts` are not extensions: the extension of
           `area.spec.ts` is `ts`, and what marks it is the segment before. */
        if path.extension().is_none_or(|one| one != "ts") {
            continue;
        }
        if SKIPPED.iter().any(|one| name.ends_with(one)) {
            continue;
        }
        if let Ok(relative) = path.strip_prefix(package) {
            /* Forward slashes whatever the host writes, because this is a value
            in a JSON document read on every platform rather than a path this
            program will open again. */
            let parts: Vec<String> = relative
                .components()
                .map(|one| one.as_os_str().to_string_lossy().into_owned())
                .collect();
            into.push(parts.join("/"));
        }
    }
}

/// Every source the manifest speaks for, by its path relative to the package.
///
/// Sorted, which is the order the analyzer emits and therefore the order this
/// has to emit: `manifest diff` reads order as well as membership, because one
/// of the analyzer's own plugins exists to keep the output stable.
pub fn sources(package: &Path) -> Vec<String> {
    let mut found = Vec::new();
    walk(&package.join("src"), package, &mut found);
    found.sort();
    found
}

/// The manifest as far as this generator has been taken.
pub fn build(package: &Path) -> Value {
    let modules: Vec<Value> = sources(package)
        .into_iter()
        .map(|path| {
            let text = fs::read_to_string(package.join(&path)).unwrap_or_default();
            let declared: Vec<Value> = declarations(&text, &path)
                .into_iter()
                .map(|one| json!({ "kind": one.kind, "name": one.name }))
                .collect();
            json!({
                "declarations": declared,
                "exports": [],
                "kind": "javascript-module",
                "path": path,
            })
        })
        .collect();
    json!({ "modules": modules, "readme": "", "schemaVersion": "2.1.0" })
}
