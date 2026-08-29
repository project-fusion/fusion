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
//! names the tiers; without it there is nothing to read and the command says so
//! rather than reporting that it found no faults.
//!
//! **One list of tiers for every rule, which is a deliberate departure from the
//! scripts these come from.** Those disagree with each other: the reflected-
//! default rule reads two tiers and the platform-spelling rule reads four, and
//! the difference is where each was written rather than a decision anybody
//! took. A reflected property carrying a default is wrong wherever it is
//! declared. So the tiers are the consumer's component source, once, and the
//! coverage here is a superset: 85 reflected properties against the script's
//! 80, the extra five clean.

pub mod attribute_names;
pub mod floors;
pub mod grounds;
pub mod observers;
pub mod reachable;
pub mod reflected;
pub mod run;
pub mod separation;
pub mod vocabulary;

use std::collections::BTreeMap;
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

    /// Families that are the page's own furniture, each with why it is.
    ///
    /// **An allowlist without reasons becomes the place things go to stop being
    /// questioned**, so this is a map rather than a list: a header bar and a
    /// development shell paint the page's color because that is what they are,
    /// and anything else claiming the exemption has to write the sentence.
    #[serde(default)]
    pub chrome: BTreeMap<String, String>,

    /// Part names doing something the registry has no word for, each with what.
    ///
    /// **This names work rather than blocking on it**, and an entry nothing
    /// renders any more is reported so it is deleted rather than kept. The
    /// registered vocabulary ships with the rule because it is Helix's; what a
    /// given library renders outside it is that library's own.
    #[serde(default)]
    pub unresolved: BTreeMap<String, String>,

    /// Whether to refuse a rule that counted nothing. Off unless asked for.
    ///
    /// **A floor is a maintainer's rule and not a consumer's.** A library with
    /// ninety families has a corpus for every rule, so one reporting zero has
    /// stopped checking. A consumer with three components may legitimately
    /// declare no reflected property at all, and telling them a rule is broken
    /// because their library is small is the kind of false positive that gets a
    /// whole command turned off.
    #[serde(default)]
    pub floors: bool,
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
    ///
    /// **Skipping is right and silence is not.** A consumer reorganizing their
    /// source leaves a stale entry behind and the rules should carry on reading
    /// the rest; a consumer whose entries are *all* stale has configured a
    /// command that reads nothing and reports every rule clean, which is
    /// indistinguishable from having no faults. `missing` is what the caller
    /// checks before running anything.
    pub fn roots(&self, root: &Path) -> Vec<PathBuf> {
        self.tiers
            .iter()
            .map(|tier| root.join(tier))
            .filter(|path| path.is_dir())
            .collect()
    }

    /// The configured tiers that are not directories, for the caller to refuse.
    pub fn missing(&self, root: &Path) -> Vec<&str> {
        self.tiers
            .iter()
            .filter(|tier| !root.join(tier).is_dir())
            .map(String::as_str)
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
    pub run: Runner,
    pub summary: &'static str,
}

/// Where a rule gets what it judges.
///
/// **A meta rule reads the others' measurements rather than re-running them.**
/// Re-running is the obvious shape and it doubles the walk of the whole source
/// tree, which is most of what this command spends its time on.
pub enum Runner {
    /// Reads what the source rules counted.
    Meta(fn(&[Measured]) -> Report),
    /// Reads the source.
    Source(fn(&Context) -> Report),
}

impl Rule {
    pub fn meta(&self) -> bool {
        matches!(self.run, Runner::Meta(_))
    }
}

/// What one rule counted, which is all a meta rule needs of it.
pub struct Measured {
    pub checked: usize,
    pub name: &'static str,
    pub unit: &'static str,
}

pub fn all() -> Vec<Rule> {
    vec![
        Rule {
            name: "attribute-names",
            run: Runner::Source(attribute_names::run),
            summary: "a property mirroring a platform attribute uses the platform's spelling",
        },
        Rule {
            name: "floors",
            run: Runner::Meta(floors::run),
            summary: "every rule counted something",
        },
        Rule {
            name: "grounds",
            run: Runner::Source(grounds::run),
            summary: "a component painting the page's color can be corrected",
        },
        Rule {
            name: "observers",
            run: Runner::Source(observers::run),
            summary: "an observer torn down on disconnect is registered again on reconnect",
        },
        Rule {
            name: "reachable",
            run: Runner::Source(reachable::run),
            summary: "every attribute a stylesheet selects on the host reflects from a property",
        },
        Rule {
            name: "reflected",
            run: Runner::Source(reflected::run),
            summary: "no reflected property carries a default",
        },
        Rule {
            name: "separation",
            run: Runner::Source(separation::run),
            summary: "a surface hooks both its edge and its lift",
        },
        Rule {
            name: "vocabulary",
            run: Runner::Source(vocabulary::run),
            summary: "one spelling for each role a part name can play",
        },
    ]
}

/// Every stylesheet under `directory`.
pub fn stylesheets(directory: &Path, found: &mut Vec<PathBuf>) {
    collect(directory, found, &|path, _| {
        path.extension()
            .is_some_and(|one| one.eq_ignore_ascii_case("css"))
    });
}

/// The family a file belongs to, which is its first segment under the tier.
///
/// **A family is a directory and not a naming convention**, which is what lets
/// a rule pair a styled stylesheet with the headless property it selects on
/// without either naming the other.
pub fn family<'a>(file: &'a Path, tier: &Path) -> Option<&'a str> {
    file.strip_prefix(tier)
        .ok()?
        .components()
        .next()?
        .as_os_str()
        .to_str()
}

/// Every file under `directory` the predicate accepts, in a stable order.
fn collect(directory: &Path, found: &mut Vec<PathBuf>, keep: &dyn Fn(&Path, &str) -> bool) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        if path.is_dir() {
            collect(&path, found, keep);
            continue;
        }
        let name = path.file_name().unwrap_or_default().to_string_lossy();
        if keep(&path, &name) {
            found.push(path.clone());
        }
    }
}

/// Every component source file under `directory`, specs and generated
/// stylesheets excluded.
///
/// A `.spec.ts` asserts about components rather than declaring one, and a
/// `.css.ts` is emitted from a stylesheet. Reading either would report faults in
/// files nobody wrote by hand.
pub fn sources(directory: &Path, found: &mut Vec<PathBuf>) {
    collect(directory, found, &|path, name| {
        path.extension()
            .is_some_and(|one| one.eq_ignore_ascii_case("ts"))
            && !name.contains(".spec.")
            && !name.ends_with(".css.ts")
    });
}
