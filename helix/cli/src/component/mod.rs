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
//! layout is not this repository's. A `helix` key in `fusion.rules.json` names
//! the tiers, or `helix.rules.json` does where that product is not in use;
//! without either there is nothing to read and the command says so rather than
//! reporting that it found no faults.
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
pub mod attributes;
pub mod axes;
pub mod cancelable;
pub mod categories;
pub mod composed;
pub mod compositions;
pub mod corners;
pub mod disabled;
pub mod events;
pub mod example_values;
pub mod examples;
pub mod examples_paired;
pub mod exportparts;
pub mod fallbacks;
pub mod floors;
pub mod focus_ring;
pub mod glyphs;
pub mod grounds;
pub mod hook_names;
pub mod hooks;
pub mod leaks;
pub mod motion;
pub mod observers;
pub mod overruled;
pub mod pairings;
pub mod parts;
pub mod platform_fidelity;
pub mod print;
pub mod properties;
pub mod reachable;
pub mod redeclared;
pub mod reflected;
pub mod reflected_defaults;
pub mod run;
pub mod seams;
pub mod seeds;
pub mod selectors;
pub mod separation;
pub mod ssr;
pub mod stable;
pub mod tier;
pub mod tui;
pub mod token_defaults;
pub mod tokens;
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

/// What Helix is told about a workspace, from whichever file carries it.
///
/// **One field, because one field is what is read.** A `tagPrefix` belongs here
/// the moment a rule asks about element names, and not before: this repository's
/// own rule about `@cssproperty` is that a declared hook nothing reads is a
/// promise on the API page with nothing behind it, and a config key is the same
/// promise made to a consumer who has to guess whether setting it does anything.
#[derive(Debug, Deserialize)]
pub struct Settings {
    /// The file these came from, for a rule reporting against the configuration.
    ///
    /// Not read from it: set by [`Settings::read`] to whichever of the two
    /// answered, so a finding names a file the reader actually has.
    #[serde(skip)]
    pub source: String,

    /// Directories holding component source, relative to the root.
    pub tiers: Vec<String>,

    /// Places a consumer writes `::part()` from outside a component.
    ///
    /// **A selector naming a part nothing publishes is dead wherever it is
    /// written**, and the rules about parts read a component's own sheet and
    /// stop, so documentation, examples and a marketing site are the places
    /// nobody looks. Relative to the root; build output is skipped.
    #[serde(default)]
    pub outside: Vec<String>,

    /// Ink-on-ground pairs a component paints on purpose that the model omits.
    ///
    /// A map rather than a list, for the reason every allowlist here is one: an
    /// exemption without a reason becomes the place things go to stop being
    /// questioned, and an entry nothing paints is reported so it gets deleted.
    #[serde(default)]
    pub accepted: BTreeMap<String, String>,

    /// Roots holding document stylesheets, which beat a component's own.
    ///
    /// A base layer and an application alike: both write rules outside every
    /// shadow root, and a rule written there wins whatever the specificity.
    #[serde(default)]
    pub documents: Vec<String>,

    /// What the theme engine emitted, which is where the measured pairs are.
    ///
    /// **Read from what the engine emits, never from its source.** A status
    /// ink's grounds are built by a loop no pattern can see, so matching the
    /// model's source leaves twenty pairs unchecked.
    #[serde(default)]
    pub oracle: Option<String>,

    /// Families whose `width` is a length rather than a policy, each with why.
    ///
    /// One axis, two value kinds. `width` asks how much room a thing takes and
    /// most answer with a policy; a table column answers with a grid track,
    /// because the question there is not which of three behaviors but exactly
    /// how wide. The value space is a continuum the registry cannot hold, so
    /// this says which families are on that side of it.
    #[serde(default)]
    pub lengths: BTreeMap<String, String>,

    /// Prefixes owned by a shared vocabulary rather than by one family.
    ///
    /// **Registered rather than inferred, so the exemption is a decision
    /// somebody made.** A hook five components read is not one family's however
    /// it was declared, and naming it after the family that happens to declare
    /// it would be the lie. The bar is a file more than one family imports;
    /// anything else is a family hook that has drifted.
    #[serde(default)]
    pub shared: Vec<String>,

    /// The vocabulary of what each family stands in for, and what is excused.
    ///
    /// **Data rather than rule.** Which native interface a family wraps, which
    /// property group comes with it, and why each omission is wanted: the rule
    /// is the argument and this file is the subject it argues about, so a
    /// consumer with their own components has their own subject.
    #[serde(default)]
    pub platform: Option<String>,

    /// The layout modes a preview frame offers an example.
    ///
    /// A name matching no rule is silent: the value reaches the frame as an
    /// attribute, nothing matches, and the example renders unstyled by any mode
    /// and looks merely wrong.
    #[serde(default)]
    pub layouts: Vec<String>,

    /// The stylesheets defining the token layer, in cascade order.
    ///
    /// Not component source, which is why it is its own key: a rule asking
    /// whether a token resolves has to read the sheets that declare it, and
    /// guessing at a directory would be reading a layout rather than a decision.
    #[serde(default)]
    pub layer: Vec<String>,

    /// The tiers that extend one another, ordered from the base outward.
    ///
    /// **`tiers` is where the source is and this is how it is stacked**, and the
    /// two answer different questions. A rule holding a reflected property to no
    /// default wants every file; a rule about what the layer above can override
    /// wants to know which layer that is, and a rule about a prefix wants a
    /// different prefix for each of them.
    ///
    /// Optional, and the rules that need it report nothing without it: a library
    /// with one layer has no layer above to disagree with.
    #[serde(default)]
    pub layers: Vec<Layer>,

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

    /// Families a component may render inline, each with why no seam is owed.
    ///
    /// A leaf takes a name and draws it. There is no version of "render a
    /// different one of these" that a consumer wants and their own element does
    /// not already give them, so wrapping each use would be seams nobody opens.
    #[serde(default)]
    pub leaves: BTreeMap<String, String>,

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

    /// The two derivations of the palette, and where each of them is written.
    #[serde(default)]
    pub seeds: Seeds,
}

/// Where each side of the palette is written, and what is knowingly missing.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Seeds {
    /// Names a consumer pinned, which are emitted and are not the engine's.
    ///
    /// One intent adds a token of its own, which is the whole point of that
    /// feature: a caller may name a token and have it verified beside the rest.
    /// Left in the emitted set it reads as a name the engine invented, and this
    /// rule would go looking for it in the token layer and ask for a declaration
    /// nobody should write.
    pub pinned: Vec<String>,

    /// Seeds the stylesheet reads that the engine is not expected to emit yet,
    /// and why.
    ///
    /// Each entry is a claim that a consumer writing CSS by hand is the intended
    /// path today, which is exactly the kind of claim that should expire. The
    /// rule reports an entry nothing reads and an entry the engine has started
    /// emitting, so neither can outlive its reason quietly.
    pub planned: BTreeMap<String, String>,

    /// The stylesheets that read the seeds and declare the tokens.
    pub sheets: Vec<String>,
}

impl Settings {
    /// Reads the settings, from the product's file or from this tool's own.
    ///
    /// **Precedence is stated rather than discovered**, the way
    /// [`crate::config`] states it, because a reader debugging "why did it use
    /// that" needs an answer they can read:
    ///
    /// 1. `fusion.rules.json`, under a `helix` key. Helix is a plugin of that
    ///    product, and a product's configuration is where its plugins are
    ///    configured — one file to find, one file to review.
    /// 2. `helix.rules.json`, for a consumer who has this tool and not that
    ///    product. Standalone is the constraint every product CLI is built
    ///    under, and it would be broken by *requiring* a file named for
    ///    something they never installed.
    /// 3. Neither, which is an error rather than a default: without `tiers`
    ///    every rule walks nothing and reports a clean run.
    ///
    /// **Which file it came from travels with the settings**, because four
    /// rules report findings against the configuration itself and a finding
    /// naming a file the reader does not have is worse than no finding at all.
    pub fn read(root: &Path) -> Result<Self, String> {
        let product = root.join("fusion.rules.json");
        if let Ok(raw) = fs::read_to_string(&product) {
            let held = serde_json::from_str::<serde_json::Value>(&raw)
                .map_err(|error| format!("{}: {error}", product.display()))?;
            if let Some(section) = held.get("helix") {
                let mut settings: Self = serde_json::from_value(section.clone())
                    .map_err(|error| format!("{}: `helix`: {error}", product.display()))?;
                "fusion.rules.json".clone_into(&mut settings.source);
                return Ok(settings);
            }
        }

        let file = root.join("helix.rules.json");
        let raw = fs::read_to_string(&file).map_err(|_| {
            format!(
                "no configuration at {}.\n  Helix reads a `helix` key in `fusion.rules.json`, or \
                 `helix.rules.json` when that product is not in use. Either names the directories \
                 holding component source, without which there is nothing to read:\n\n  \
                 {{ \"tiers\": [\"src/components\"] }}",
                root.display()
            )
        })?;
        let mut settings: Self =
            serde_json::from_str(&raw).map_err(|error| format!("{}: {error}", file.display()))?;
        "helix.rules.json".clone_into(&mut settings.source);
        Ok(settings)
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

/// One layer of the stack: where its source is and how it names an element.
#[derive(Debug, Deserialize)]
pub struct Layer {
    /// The prefix on a custom element declared here, stripped to get its key.
    #[serde(default)]
    pub prefix: String,
    /// Where this layer's source is, relative to the root.
    pub source: String,
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
    /// Work rather than fault: named, counted, and not part of the verdict.
    ///
    /// **The first rule to need this was the one about visual axes**, which
    /// reports families in a group that disagree about declaring one. Whether a
    /// component *should* have an axis needs a reading of what it is for, so
    /// failing would pressure somebody into declaring one to silence a rule.
    /// A count that does not fall is visible work; a finding is a defect.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub notes: Vec<String>,
    pub unit: &'static str,
}

impl Report {
    pub fn ok(&self) -> bool {
        self.findings.is_empty()
    }
}

pub struct Rule {
    /// `None` for a rule that judges and cannot write, which is most of them.
    ///
    /// **A rule that can write still judges first.** The verb decides which half
    /// runs, so a `fix` is never a second opinion about what is wrong: it is the
    /// same reading, applied. Only an ordering rule has one here, because an
    /// order is the one kind of finding whose repair is mechanical.
    pub fix: Option<fn(&Context) -> Vec<String>>,
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

/* A table rather than a function: four lines per rule, no branches, and it grows
by one entry per port. Splitting it would put half the rules somewhere else and
make the set harder to read, which is the opposite of what the lint is for. */
#[allow(clippy::too_many_lines)]
pub fn all() -> Vec<Rule> {
    vec![
        Rule {
            fix: None,
            name: "attribute-names",
            run: Runner::Source(attribute_names::run),
            summary: "a property mirroring a platform attribute uses the platform's spelling",
        },
        Rule {
            fix: None,
            name: "focus-ring",
            run: Runner::Source(focus_ring::run),
            summary: "the focus ring is spelled one of the ways the registry names, and no other",
        },
        Rule {
            fix: None,
            name: "redeclared",
            run: Runner::Source(redeclared::run),
            summary: "one selector is written once, or the blocks after it add rather than replace",
        },
        Rule {
            fix: None,
            name: "floors",
            run: Runner::Meta(floors::run),
            summary: "every rule counted something",
        },
        Rule {
            fix: None,
            name: "attributes",
            run: Runner::Source(attributes::run),
            summary: "a document rule selects a component only by an attribute it reflects",
        },
        Rule {
            fix: None,
            name: "axes",
            run: Runner::Source(axes::run),
            summary: "every visual value a component declares is drawn from a registered axis",
        },
        Rule {
            fix: None,
            name: "cancelable",
            run: Runner::Source(cancelable::run),
            summary: "an event that can be refused says so, and one that cannot does not",
        },
        Rule {
            fix: None,
            name: "categories",
            run: Runner::Source(categories::run),
            summary: "both layers give one answer about what a family is for",
        },
        Rule {
            fix: None,
            name: "composed",
            run: Runner::Source(composed::run),
            summary: "a component renders a tag it imports, and never names one literally",
        },
        Rule {
            fix: None,
            name: "corners",
            run: Runner::Source(corners::run),
            summary: "every panel that floats over the page takes the same corner",
        },
        Rule {
            fix: None,
            name: "disabled",
            run: Runner::Source(disabled::run),
            summary: "a form control reads `:host(:disabled)` rather than the attribute",
        },
        Rule {
            fix: None,
            name: "events",
            run: Runner::Source(events::run),
            summary: "an event a component dispatches is one it declares",
        },
        Rule {
            fix: None,
            name: "example-values",
            run: Runner::Source(example_values::run),
            summary: "every attribute value in an example is one its component states",
        },
        Rule {
            fix: None,
            name: "examples",
            run: Runner::Source(examples::run),
            summary: "every example is checked against the manifest it documents",
        },
        Rule {
            fix: None,
            name: "examples-paired",
            run: Runner::Source(examples_paired::run),
            summary: "every example is authored on both layers and in both syntaxes",
        },
        Rule {
            fix: None,
            name: "exportparts",
            run: Runner::Source(exportparts::run),
            summary: "a composed child's parts are forwarded, prefixed and reachable",
        },
        Rule {
            fix: None,
            name: "fallbacks",
            run: Runner::Source(fallbacks::run),
            summary: "a slot's fallback markup sits behind a seam a tier can move",
        },
        Rule {
            fix: None,
            name: "glyphs",
            run: Runner::Source(glyphs::run),
            summary: "no component renders the icon element for itself",
        },
        Rule {
            fix: None,
            name: "grounds",
            run: Runner::Source(grounds::run),
            summary: "a component painting the page's color can be corrected",
        },
        Rule {
            fix: None,
            name: "hook-names",
            run: Runner::Source(hook_names::run),
            summary: "a component hook spells one idea one way",
        },
        Rule {
            fix: None,
            name: "hooks",
            run: Runner::Source(hooks::run),
            summary: "a documented CSS hook is read, named after its family, and owned by one",
        },
        Rule {
            fix: None,
            name: "leaks",
            run: Runner::Source(leaks::run),
            summary: "a subscription an element takes out does not outlive the element",
        },
        Rule {
            fix: None,
            name: "motion",
            run: Runner::Source(motion::run),
            summary: "a stylesheet that moves answers `prefers-reduced-motion`",
        },
        Rule {
            fix: None,
            name: "observers",
            run: Runner::Source(observers::run),
            summary: "an observer torn down on disconnect is registered again on reconnect",
        },
        Rule {
            fix: None,
            name: "overruled",
            run: Runner::Source(overruled::run),
            summary: "a component's own CSS is not silently beaten by a document rule",
        },
        Rule {
            fix: None,
            name: "pairings",
            run: Runner::Source(pairings::run),
            summary: "every ink-on-ground pair a component paints is one the model measures",
        },
        Rule {
            fix: None,
            name: "parts",
            run: Runner::Source(parts::run),
            summary: "a documented part is rendered, and a rendered part is documented",
        },
        Rule {
            fix: None,
            name: "platform-fidelity",
            run: Runner::Source(platform_fidelity::run),
            summary: "a component standing in for a native element mirrors what it has",
        },
        Rule {
            fix: None,
            name: "print",
            run: Runner::Source(print::run),
            summary: "every family with a stylesheet says what it does on paper",
        },
        Rule {
            fix: Some(properties::fix),
            name: "properties",
            run: Runner::Source(properties::run),
            summary: "a component declares its reactive properties in one order",
        },
        Rule {
            fix: None,
            name: "reachable",
            run: Runner::Source(reachable::run),
            summary: "every attribute a stylesheet selects on the host reflects from a property",
        },
        Rule {
            fix: None,
            name: "reflected",
            run: Runner::Source(reflected::run),
            summary: "no reflected property carries a default",
        },
        Rule {
            fix: None,
            name: "reflected-defaults",
            run: Runner::Source(reflected_defaults::run),
            summary: "a reflected property is silent until something sets it",
        },
        Rule {
            fix: None,
            name: "seams",
            run: Runner::Source(seams::run),
            summary: "a base component renders another family behind an overridable method",
        },
        Rule {
            fix: None,
            name: "seeds",
            run: Runner::Source(seeds::run),
            summary: "every name the theme engine emits is one the stylesheet reads",
        },
        Rule {
            fix: None,
            name: "selectors",
            run: Runner::Source(selectors::run),
            summary: "every selector a component writes matches something it renders",
        },
        Rule {
            fix: None,
            name: "separation",
            run: Runner::Source(separation::run),
            summary: "a surface hooks both its edge and its lift",
        },
        Rule {
            fix: None,
            name: "ssr",
            run: Runner::Source(ssr::run),
            summary: "a server-rendered assertion is made against structure, not the string",
        },
        Rule {
            fix: None,
            name: "stable",
            run: Runner::Source(stable::run),
            summary: "`@status stable` means what stable has to mean",
        },
        Rule {
            fix: None,
            name: "tier",
            run: Runner::Source(tier::run),
            summary: "a component that renders a child renders one from its own layer",
        },
        Rule {
            fix: None,
            name: "token-defaults",
            run: Runner::Source(token_defaults::run),
            summary: "a token a component reads resolves on a page matching no state",
        },
        Rule {
            fix: None,
            name: "tokens",
            run: Runner::Source(tokens::run),
            summary: "no raw value where a token belongs, and none reached for or dangling",
        },
        Rule {
            fix: None,
            name: "vocabulary",
            run: Runner::Source(vocabulary::run),
            summary: "one spelling for each role a part name can play",
        },
    ]
}

/// Every file under `directory` a rule about authored text could read.
///
/// Build output is skipped: it is a copy of a source this already reads, so
/// including it reports every finding twice and names the copy. The sandbox
/// frame's stylesheet is the style layers concatenated, so `public` holds the
/// primitives by construction and reading it would report the library against
/// itself.
pub fn walk_outside(directory: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if path.is_dir() {
            /* Build output, and a directory holding a `.git`, which is another
            checkout: a worktree under `.claude` is a whole second copy of the
            repository, and reading it reports every finding twice and names a
            file on a branch nobody here is editing. */
            let skip = matches!(
                name.as_str(),
                ".git"
                    | ".local"
                    | ".next"
                    | ".next-dev"
                    | ".turbo"
                    | "dist"
                    | "node_modules"
                    | "public"
                    | "target"
            ) || path.join(".git").exists();
            if !skip {
                walk_outside(&path, found);
            }
            continue;
        }
        let readable = matches!(
            path.extension()
                .map(|one| one.to_string_lossy().to_string())
                .as_deref(),
            Some("css" | "md" | "mdx" | "ts" | "tsx")
        );
        if readable && !name.ends_with(".css.ts") {
            found.push(path);
        }
    }
}

/// Every spec under `directory` whose name ends with `suffix`.
///
/// **The one walker that wants what `sources` throws away.** A rule about the
/// components reads what declares them; a rule about whether they are proven
/// reads what asserts about them, and the two sets do not overlap.
pub fn specs(directory: &Path, suffix: &'static str, found: &mut Vec<PathBuf>) {
    collect(directory, found, &|_, name| name.ends_with(suffix));
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
