//! What may leave the repository, and what a package must be to do it.
//!
//! **The failures here are the ones nobody sees until a consumer installs.**
//! Every one of them is fine on this machine, where a package manager links
//! siblings from disk, and wrong on every other, where a registry answers.
//!
//! **A name outside the one scope, or inside it and belonging to no product.**
//! The scope no longer says what ships, so `private` is the only thing that
//! does, and a package without it is one publish away from being public under a
//! name chosen on the assumption that it never would be.
//!
//! **A `private` package still describing how it would be published** has two
//! statements about itself and one of them is out of date.
//!
//! **A condition order.** Conditions match top to bottom, so a `types` after
//! anything else is never read and the package reports as untyped.
//!
//! **A published package taking an unpublished dependency**, which is the one
//! that cannot be seen from inside the package: it resolves here because the
//! manager links it from disk, and 404s on install anywhere else.
//!
//! **A path `exports` promises and `files` does not pack**, which fails the same
//! way and is quieter still: the specifier resolves in this repository, where
//! the package is a directory, and there is no such file in the tarball. Nothing
//! in a build says so, because every build here has the file. `helix.css` was
//! exported and unpacked, and the console found it by installing.
//!
//! **One visibility for everything, because a release is all of it or none.** A
//! product half public and half restricted installs for nobody, and the failure
//! names the dependency rather than the setting that caused it. A registry also
//! decides visibility at first publish, so a package that goes out wrong is not
//! corrected by editing the field afterwards.
//!
//! **Lockstep, per product**, which is what makes one version of a package work
//! with the same version of its sibling. A release stamps whatever it finds.
//!
//! **And the Rust half, which fails in the one direction nothing else watches.**
//! A product spanning two package managers carries a version in each, and a
//! release pushes its tag whether or not a crate ever leaves: the day somebody
//! turns publishing on is the day the tag starts claiming a release no workflow
//! performs. A crate may not inherit its version from the workspace either —
//! one value cannot be two products, and whichever stamped last would win.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::{manifests, Manifest};

static MEMBERS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)members\s*=\s*\[(.*?)\]").expect("a literal pattern compiles")
});

static QUOTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#""([^"]+)""#).expect("a literal pattern compiles"));

static PUBLISH: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^publish = (.+)$").expect("a literal pattern compiles"));

static WORKSPACE_VERSION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^version\s*=").expect("a literal pattern compiles"));

static INHERITS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^version\.workspace\s*=\s*true$").expect("a literal pattern compiles")
});

static CARGO_PUBLISH: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"cargo\s+publish").expect("a literal pattern compiles"));

/// Which product a package name belongs to, or none.
fn domain_of<'a>(name: &str, context: &'a Context) -> Option<&'a String> {
    let scope = context.settings.scope.as_ref()?;
    let bare = name.strip_prefix(scope.as_str())?;
    context
        .settings
        .domains
        .iter()
        .find(|one| bare == one.as_str() || bare.starts_with(&format!("{one}-")))
}

/// Whether a manifest is one a registry would accept.
fn publishes(manifest: &Manifest) -> bool {
    manifest.value.get("private").and_then(Value::as_bool) != Some(true)
}

/// Every `types`-bearing condition set in an exports tree, in written order.
fn conditions(node: &Value, trail: &[String], found: &mut Vec<(Vec<String>, Vec<String>)>) {
    let Some(object) = node.as_object() else {
        return;
    };
    let keys: Vec<String> = object.keys().cloned().collect();
    if keys.iter().any(|one| one == "types") {
        found.push((keys.clone(), trail.to_vec()));
    }
    for key in keys {
        let mut deeper = trail.to_vec();
        deeper.push(key.clone());
        conditions(&object[&key], &deeper, found);
    }
}

/// Every string leaf in an exports tree, which is every path it promises.
///
/// A `null` target blocks a subpath rather than naming one, so it is not a path
/// and is skipped with everything else that is not a string.
fn targets(node: &Value, found: &mut BTreeSet<String>) {
    match node {
        Value::String(one) => {
            found.insert(one.clone());
        }
        Value::Array(list) => {
            for value in list {
                targets(value, found);
            }
        }
        Value::Object(map) => {
            for value in map.values() {
                targets(value, found);
            }
        }
        _ => {}
    }
}

/// What npm packs whatever `files` says, so a target naming one is not a fault.
///
/// The root's own, and not a file of the same name anywhere below it.
///
/// `licen` rather than the two spellings npm accepts. Listing both would put a
/// British word in the source, which `fusion prose` refuses and is right to:
/// the prefix covers `LICENSE` and `LICENCE` both. dialect:quoted, those are
/// filenames npm accepts rather than words this repository writes. This read
/// `["readme", "license", "license", "changelog"]` until the review of 19
/// noticed the repetition, and a duplicated literal in an array is something
/// `clippy::pedantic` does not see, which is what the test below is for.
fn always(path: &str) -> bool {
    if path.contains('/') {
        return false;
    }
    let lower = path.to_ascii_lowercase();
    lower == "package.json"
        || ["readme", "licen", "changelog"]
            .iter()
            .any(|one| lower.starts_with(one))
}

/// Whether some `files` entry puts a path in the tarball.
///
/// A directory entry carries everything under it, which is what makes `dist`
/// cover `./dist/index.js` and every subpath pattern below it: a `*` in the
/// target is inside a segment this never has to expand.
fn packed(files: &[String], target: &str) -> bool {
    let path = target.trim_start_matches("./");
    files.iter().any(|entry| {
        let entry = entry.trim_start_matches("./").trim_end_matches('/');
        path == entry || path.starts_with(&format!("{entry}/"))
    })
}

pub fn run(context: &Context) -> Report {
    if context.settings.scope.is_none() {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "packages",
        };
    }
    let packages = manifests(&context.root);
    let known: BTreeSet<&str> = packages.iter().map(|one| one.name.as_str()).collect();
    let shipping: BTreeSet<&str> = packages
        .iter()
        .filter(|one| domain_of(&one.name, context).is_some() && publishes(one))
        .map(|one| one.name.as_str())
        .collect();

    let mut findings = Vec::new();
    let mut checked = 0;
    let mut versions: Vec<(&String, String, String)> = Vec::new();
    let mut access: BTreeSet<String> = BTreeSet::new();

    for manifest in &packages {
        let name = &manifest.name;
        let at = manifest.directory.clone();
        let Some(domain) = domain_of(name, context) else {
            checked += 1;
            let scope = context.settings.scope.clone().unwrap_or_default();
            if !name.starts_with(&scope) {
                findings.push(Finding {
                    detail: format!(
                        "Every package here is in the one scope, and the name after it says which \
                         product owns it: {}, or neither.",
                        context.settings.domains.join(" and ")
                    ),
                    file: at,
                    message: format!("`{name}` is outside `{scope}`"),
                });
            } else if publishes(manifest) {
                findings.push(Finding {
                    detail: "The scope no longer says what ships, so `private` is the only thing \
                             that does, and this is one publish away from being public under a \
                             name chosen on the assumption that it never would be."
                        .to_owned(),
                    file: at,
                    message: format!("`{name}` belongs to no product and is not `private`"),
                });
            }
            continue;
        };

        /* Lockstep is a property of the product, so an internal member versions
        with its siblings too: a byproduct is still part of it. */
        versions.push((
            domain,
            at.clone(),
            manifest
                .value
                .get("version")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_owned(),
        ));

        if !publishes(manifest) {
            checked += 1;
            if manifest.value.get("publishConfig").is_some() {
                findings.push(Finding {
                    detail: "One of the two is out of date.".to_owned(),
                    file: at,
                    message: format!(
                        "`{name}` is `private` and still carries `publishConfig`, which describes \
                         how it would be published"
                    ),
                });
            }
            continue;
        }
        checked += 1;
        judge(manifest, context, &known, &shipping, &mut findings);
        if let Some(one) = manifest
            .value
            .get("publishConfig")
            .and_then(|one| one.get("access"))
            .and_then(Value::as_str)
        {
            access.insert(one.to_owned());
        }
    }

    agreed(&access, &versions, context, &mut findings);
    checked += cargo(context, &mut findings);

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "packages",
    }
}

/// One visibility for everything, and one version per product.
fn agreed(
    access: &BTreeSet<String>,
    versions: &[(&String, String, String)],
    context: &Context,
    findings: &mut Vec<Finding>,
) {
    if access.len() > 1 {
        findings.push(Finding {
            detail: "Visibility is one decision for all of them, and a registry fixes it at first \
                     publish."
                .to_owned(),
            file: "the published packages".to_owned(),
            message: format!(
                "`publishConfig.access` disagrees across them: {}",
                access.iter().cloned().collect::<Vec<String>>().join(", ")
            ),
        });
    }

    for domain in &context.settings.domains {
        let inside: Vec<&(&String, String, String)> =
            versions.iter().filter(|one| one.0 == domain).collect();
        let distinct: BTreeSet<&String> = inside.iter().map(|one| &one.2).collect();
        if distinct.len() <= 1 {
            continue;
        }
        findings.push(Finding {
            detail: format!(
                "Lockstep is what makes one version of a package work with the same version of \
                 its sibling, and the release stamps whatever it finds: {}.",
                inside
                    .iter()
                    .map(|one| format!("{} is {}", one.1, one.2))
                    .collect::<Vec<String>>()
                    .join(", ")
            ),
            file: domain.clone(),
            message: format!(
                "versions disagree across the product: {}",
                distinct
                    .iter()
                    .map(|one| one.as_str())
                    .collect::<Vec<&str>>()
                    .join(", ")
            ),
        });
    }
}

/// What a published manifest has to carry, and what it may depend on.
fn judge(
    manifest: &Manifest,
    context: &Context,
    known: &BTreeSet<&str>,
    shipping: &BTreeSet<&str>,
    findings: &mut Vec<Finding>,
) {
    let (name, at) = (&manifest.name, manifest.directory.clone());
    for field in ["description", "files", "license", "repository", "version"] {
        if manifest.value.get(field).is_none() {
            findings.push(Finding {
                detail: "A registry rejects it, or accepts it and shows nothing.".to_owned(),
                file: at.clone(),
                message: format!("`{name}` has no `{field}`, which a published package needs"),
            });
        }
    }
    if manifest
        .value
        .get("publishConfig")
        .and_then(|one| one.get("access"))
        .is_none()
    {
        findings.push(Finding {
            detail: "Publication would depend on whatever the registry defaults to for the scope \
                     that day."
                .to_owned(),
            file: at.clone(),
            message: format!("`{name}` declares no `publishConfig.access`"),
        });
    }
    if let Some(points) = manifest
        .value
        .get("repository")
        .and_then(|one| one.get("directory"))
        .and_then(Value::as_str)
    {
        if points != at {
            findings.push(Finding {
                detail: "A published tarball links back to source that is not its own.".to_owned(),
                file: at.clone(),
                message: format!("`{name}` points `repository.directory` at `{points}`"),
            });
        }
    }

    let mut found = Vec::new();
    if let Some(exports) = manifest.value.get("exports") {
        conditions(exports, &[], &mut found);
    }
    for (keys, trail) in found {
        if keys.first().map(String::as_str) == Some("types") {
            continue;
        }
        findings.push(Finding {
            detail: format!(
                "Conditions match top to bottom, so `types` after `{}` is never read and the \
                 package reports as untyped.",
                keys.first().cloned().unwrap_or_default()
            ),
            file: at.clone(),
            message: format!(
                "`{name}` orders `exports{}` as {}",
                trail.iter().fold(String::new(), |mut all, one| {
                    all.push('[');
                    all.push_str(one);
                    all.push(']');
                    all
                }),
                keys.join(", ")
            ),
        });
    }

    /* The one that cannot be seen from inside the package. */
    for field in ["dependencies", "peerDependencies"] {
        let Some(object) = manifest.value.get(field).and_then(Value::as_object) else {
            continue;
        };
        for dependency in object.keys() {
            if !known.contains(dependency.as_str()) || shipping.contains(dependency.as_str()) {
                continue;
            }
            findings.push(Finding {
                detail: "Resolves here because the package manager links it from disk; 404s on \
                         install anywhere else."
                    .to_owned(),
                file: at.clone(),
                message: format!(
                    "`{name}` is published and takes `{dependency}` as a {} dependency, which is \
                     not",
                    if field == "dependencies" {
                        "runtime"
                    } else {
                        "peer"
                    }
                ),
            });
        }
    }

    unpacked(manifest, findings);
    let _ = context;
}

/// A path `exports` promises that `files` does not pack.
///
/// Its own function because `judge` is already at the length clippy allows, and
/// because this is the one check here that reads two fields against each other
/// rather than judging one on its own.
fn unpacked(manifest: &Manifest, findings: &mut Vec<Finding>) {
    let (name, at) = (&manifest.name, manifest.directory.clone());
    let listed: Vec<String> = manifest
        .value
        .get("files")
        .and_then(Value::as_array)
        .map(|all| {
            all.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default();
    /* A glob in `files` leaves the package unjudged rather than reported against
    a pattern this does not expand. Nothing in this workspace writes one, and
    a wrong finding here costs more than a missed one: it names a file that is
    in the tarball. */
    if listed.iter().any(|one| one.contains('*')) {
        return;
    }
    let mut promised = BTreeSet::new();
    if let Some(exports) = manifest.value.get("exports") {
        targets(exports, &mut promised);
    }
    for target in promised {
        if always(target.trim_start_matches("./")) || packed(&listed, &target) {
            continue;
        }
        findings.push(Finding {
            detail: "Resolves from a checkout, where the package is a directory on disk, and is \
                 absent from the tarball everyone else installs."
                .to_owned(),
            file: at.clone(),
            message: format!("`{name}` exports `{target}`, which `files` does not pack"),
        });
    }
}

/// The Rust half: what the workspace says it publishes, and what a release does.
fn cargo(context: &Context, findings: &mut Vec<Finding>) -> usize {
    let Ok(source) = fs::read_to_string(context.root.join("Cargo.toml")) else {
        return 0;
    };
    let section = source
        .find("[workspace.package]")
        .map_or("", |at| &source[at..]);
    let declared = PUBLISH
        .captures(section)
        .map(|one| one[1].trim().to_owned())
        .unwrap_or_default();
    let releases = fs::read_to_string(context.root.join(".github/workflows/release.yml"))
        .is_ok_and(|one| CARGO_PUBLISH.is_match(&one));

    let mut checked = 1;
    if declared != "false" && !releases {
        findings.push(Finding {
            detail: "A product tag would name a crate release that never happened.".to_owned(),
            file: "Cargo.toml".to_owned(),
            message: format!(
                "`[workspace.package] publish` is {declared}, so the crates are meant to be \
                 published, and the release workflow runs no `cargo publish`"
            ),
        });
    }
    if declared == "false" && releases {
        findings.push(Finding {
            detail: "The release will fail at the last step, after the registry has already \
                     published."
                .to_owned(),
            file: "Cargo.toml".to_owned(),
            message: "`[workspace.package] publish` is false while the release workflow runs \
                      `cargo publish`"
                .to_owned(),
        });
    }
    if WORKSPACE_VERSION.is_match(section) {
        findings.push(Finding {
            detail: "One value cannot be two products, and a release computes each from its own \
                     tags. Each crate carries its own."
                .to_owned(),
            file: "Cargo.toml".to_owned(),
            message: "`[workspace.package]` declares a `version`".to_owned(),
        });
    }

    /* Read off `members` rather than a glob, so a crate added without being
    listed fails here rather than being skipped by the rule that would have
    caught it. */
    let members: Vec<String> = MEMBERS
        .captures(&source)
        .map(|one| {
            QUOTED
                .captures_iter(&one[1])
                .map(|two| two[1].to_owned())
                .collect()
        })
        .unwrap_or_default();
    if members.is_empty() {
        findings.push(Finding {
            detail: "Nothing was checked for an inherited version.".to_owned(),
            file: "Cargo.toml".to_owned(),
            message: "no `members` found".to_owned(),
        });
    }
    for member in members {
        checked += 1;
        let manifest = context.root.join(&member).join("Cargo.toml");
        let Ok(text) = fs::read_to_string(&manifest) else {
            findings.push(Finding {
                detail: "A member with no manifest is a build that fails somewhere else."
                    .to_owned(),
                file: "Cargo.toml".to_owned(),
                message: format!("lists `{member}` as a member and there is no manifest there"),
            });
            continue;
        };
        if INHERITS.is_match(&text) {
            findings.push(Finding {
                detail: "That is the one workspace version, which is one product's only while \
                         every crate belongs to it. Declare a version on the crate."
                    .to_owned(),
                file: format!("{member}/Cargo.toml"),
                message: "takes `version.workspace = true`".to_owned(),
            });
        }
    }
    checked
}

#[cfg(test)]
mod tests {
    use super::always;

    /// The list, rather than the intention.
    ///
    /// A duplicated literal in the array this reads was live and invisible:
    /// `clippy::pedantic` does not look inside one, and every name the check
    /// cared about still matched, so nothing failed. The entry meant to be
    /// there was the British spelling, which `fusion prose` refuses in source,
    /// so the fix was a prefix covering both rather than a second word.
    ///
    /// Naming each file npm always packs is what makes a dropped one fail here.
    #[test]
    fn every_name_npm_always_packs_is_covered() {
        for name in [
            "package.json",
            "README",
            "README.md",
            "readme.markdown",
            "LICENSE",
            "LICENCE", // dialect:quoted, npm packs the file under either spelling
            "license.txt",
            "CHANGELOG.md",
        ] {
            assert!(always(name), "{name} is packed whatever `files` says");
        }
    }

    /// The root's own, and nothing that merely shares its name.
    #[test]
    fn a_file_below_the_root_is_not_one_of_them() {
        for name in ["src/README.md", "docs/LICENSE", "packed.js"] {
            assert!(
                !always(name),
                "{name} is not what npm packs unconditionally"
            );
        }
    }

    /// **Prefixes, so `licensing.ts` reads as packed and is not.**
    ///
    /// Recorded rather than fixed. The cost is a missed finding: a target
    /// exporting it without listing it in `files` goes unreported. The comment
    /// at the head of this rule argues that a wrong finding costs more than a
    /// missed one, so loose is the direction to be loose in, and exact names
    /// would refuse `README.markdown` and every case extension.
    #[test]
    fn the_prefixes_are_loose_and_that_is_the_safe_direction() {
        assert!(always("licensing.ts"));
        assert!(always("readmeme.md"));
    }
}
