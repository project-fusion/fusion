//! Rules about components built to Helix's conventions.
//!
//! **This is the design system telling a consumer whether they extended it
//! correctly**, which is why it is a Helix verb rather than a generic linter
//! somebody has to configure into usefulness. A library built on Helix has
//! parts, hooks, tiers and reflected properties because Helix does; the rules
//! that hold Helix to its own conventions are the same rules that hold theirs.
//!
//! **`Rule` and `Report` are declared here rather than shared with
//! `fusion-cli`.** They are forty lines, and a crate holding them would be a
//! dependency from the helix domain onto the fusion one: per-domain lockstep
//! exists so a release of either does not wait on the other, and a shared crate
//! is exactly the thing that makes it wait. Forty duplicated lines is the
//! cheaper of the two.
//!
//! **Where the source is comes from configuration**, because a consumer's
//! layout is not this repository's. `helix.rules.json` at the workspace root
//! names the tiers and the tag prefix; without it there is nothing to read and
//! the command says so rather than reporting that it found no faults.

pub mod reflected;
pub mod run;

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// What a rule is run against.
pub struct Context {
    pub root: PathBuf,
    pub settings: Settings,
}

/// `helix.rules.json`, which is the whole configuration surface.
///
/// **One field, because one field is what is read.** A `tagPrefix` belongs here
/// the moment a rule asks about element names, and not before: this repository's
/// own rule about `@cssproperty` is that a declared hook nothing reads is a
/// promise on the API page with nothing behind it, and a config key is the same
/// promise made to a consumer who has to guess whether setting it does anything.
#[derive(Debug, Deserialize)]
pub struct Settings {
    /// Directories holding component source, relative to the root.
    pub tiers: Vec<String>,
}

impl Settings {
    /// Reads the settings beside the workspace, or says what is missing.
    pub fn read(root: &Path) -> Result<Self, String> {
        let file = root.join("helix.rules.json");
        let raw = fs::read_to_string(&file).map_err(|_| {
            format!(
                "no `helix.rules.json` at {}.\n  It names the directories holding component \
                 source, without which there is nothing to read:\n\n  {{ \"tiers\": \
                 [\"src/components\"], \"tagPrefix\": \"acme-\" }}",
                root.display()
            )
        })?;
        serde_json::from_str(&raw).map_err(|error| format!("{}: {error}", file.display()))
    }

    /// The tiers as absolute paths, skipping any that are not there.
    pub fn roots(&self, root: &Path) -> Vec<PathBuf> {
        self.tiers
            .iter()
            .map(|tier| root.join(tier))
            .filter(|path| path.is_dir())
            .collect()
    }
}

/// One thing wrong, in the place it is wrong.
#[derive(Serialize)]
pub struct Finding {
    pub detail: String,
    pub file: String,
    pub message: String,
}

/// What a rule reports, whether or not it found anything.
#[derive(Serialize)]
pub struct Report {
    /// What was tested, never what was walked past.
    pub checked: usize,
    pub findings: Vec<Finding>,
    pub unit: &'static str,
}

impl Report {
    pub fn ok(&self) -> bool {
        self.findings.is_empty()
    }
}

pub struct Rule {
    pub name: &'static str,
    pub summary: &'static str,
    pub run: fn(&Context) -> Report,
}

pub fn all() -> Vec<Rule> {
    vec![Rule {
        name: "reflected",
        run: reflected::run,
        summary: "no reflected property carries a default",
    }]
}

/// Every component source file under `directory`, specs and generated
/// stylesheets excluded.
///
/// A `.spec.ts` asserts about components rather than declaring one, and a
/// `.css.ts` is emitted from a stylesheet. Reading either would report faults in
/// files nobody wrote by hand.
pub fn sources(directory: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        if path.is_dir() {
            sources(&path, found);
            continue;
        }
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let typescript = path
            .extension()
            .is_some_and(|one| one.eq_ignore_ascii_case("ts"));
        if typescript && !name.contains(".spec.") && !name.ends_with(".css.ts") {
            found.push(path);
        }
    }
}
