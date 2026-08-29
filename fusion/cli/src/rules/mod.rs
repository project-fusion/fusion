//! What a rule is, and the set of them.
//!
//! **A rule measures and returns; it never prints and never exits.** That split
//! is what makes one command able to render the same measurement three ways:
//! quiet for CI, printed for a person, and JSON for a script. It is also what
//! lets `floors` read another rule's count rather than parsing integers out of
//! its prose, which is how it was done before and could be fooled by a sentence.

pub mod barrels;
pub mod floors;
pub mod icons;
pub mod modules;
pub mod node;
pub mod order;
pub mod prerequisites;
pub mod publishable;
pub mod react_bridge;
pub mod registration;
pub mod scoped;
pub mod scripts;
pub mod shaders;
pub mod shipped;

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// The workspace under test.
pub struct Context {
    pub root: PathBuf,
    pub settings: Settings,
}

/// `fusion.rules.json`, which is what a workspace says about itself.
///
/// **Optional, every key of it.** A rule needing something this does not carry
/// reports nothing rather than guessing, and `floors` is what makes that visible
/// rather than silent: a rule counting zero is a rule that stopped checking.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// The products a package name can belong to, which is what versions in
    /// lockstep and what may be published beside what.
    pub domains: Vec<String>,

    /// Roots whose modules run under a framework that hydrates, where
    /// registering a custom element at module scope is a fault.
    pub hydrates: Vec<String>,

    /// Paths this repository has lived at before. Add one when it moves again.
    ///
    /// **A list rather than an inference**, because which paths on the host are
    /// ours cannot be inferred: a dependency's own repository is in this tree
    /// and is nobody's mistake. A move is an event, so the name it moved from is
    /// what catches whatever the move missed.
    #[serde(default)]
    pub former: Vec<String>,

    /// British spellings and the American form each is written as.
    ///
    /// **Here rather than in the rule**, because the file it is in is the one
    /// file whose British forms are the point of it, and a settings file the
    /// walk already exempts costs nothing to be exempt from a sweep as well.
    pub dialect: BTreeMap<String, String>,

    /// Where the catalog's card art lives, what it draws, and what it counts.
    #[serde(default)]
    pub gallery: Gallery,

    /// The list of names an icon set actually has.
    pub icons: Option<String>,

    /// The paths the spec rules read, and what routes a suffix to a runner.
    pub spec: Spec,

    /// The one npm scope every package in this repository is published under.
    pub scope: Option<String>,

    /// Paths inside `hydrates` that are their own document, with nothing to
    /// hydrate, where registering at module scope is what an entry point is for.
    pub standalone: Vec<String>,
}

/// The three paths the gallery rule reads, which are one subject.
///
/// **Grouped rather than three loose keys**, because a manifest list that names
/// a different set of packages than `families` comes from would compare two
/// catalogs and report the difference as a fault.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Gallery {
    /// The folder holding the hand-written card drawings and their stylesheet.
    pub art: String,

    /// The tier whose exporting folders the prose counts against.
    pub families: String,

    /// The manifests a family is derived from, which is how the page derives it.
    pub manifests: Vec<String>,
}

/// What the spec rules need to know about a workspace they do not assume.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Spec {
    /// The route tree the specs document lives somewhere inside.
    pub app: String,

    /// The browser harness whose interface declares the matchers that exist.
    pub harness: String,

    /// The component that registers the library on the pages that want it.
    pub registrar: String,

    /// Each spec suffix, and the script that is supposed to run it.
    pub runners: BTreeMap<String, String>,
}

impl Settings {
    /// Reads the settings beside the workspace, or an empty set.
    pub fn read(root: &Path) -> Self {
        fs::read_to_string(root.join("fusion.rules.json"))
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }
}

/// One thing wrong, in the place it is wrong.
#[derive(Serialize)]
pub struct Finding {
    /// What to do about it. Rendered dim, and omitted from nothing.
    pub detail: String,
    /// Repository-relative, with a line number where there is one.
    pub file: String,
    pub message: String,
}

/// What a rule reports, whether or not it found anything.
#[derive(Serialize)]
pub struct Report {
    /// **What was tested, never what was walked past.** `floors` reads this,
    /// and a corpus size here would make that rule agree with a check that had
    /// silently stopped checking.
    pub checked: usize,
    pub findings: Vec<Finding>,
    /// What `checked` counts, for a sentence that reads.
    pub unit: &'static str,
}

impl Report {
    pub fn ok(&self) -> bool {
        self.findings.is_empty()
    }
}

/// What one rule counted, which is all a meta rule needs of it.
pub struct Measured {
    pub checked: usize,
    pub name: &'static str,
    pub unit: &'static str,
}

/// How a rule is run, which is also what says whether it is a meta rule.
///
/// **A runner rather than a flag beside one.** A boolean and a function pointer
/// are two statements about the same fact, and the failure when they disagree is
/// a meta rule handed a workspace or a source rule handed a list of counts.
/// Naming the shape once makes that unrepresentable.
pub enum Runner {
    /// Reads what the source rules counted, and never the workspace.
    Meta(fn(&[Measured]) -> Report),
    /// Reads the workspace.
    Source(fn(&Context) -> Report),
}

/// What a rule can do, beyond judging.
pub struct Rule {
    pub name: &'static str,
    pub summary: &'static str,
    /// `None` for a rule that judges and cannot write, which is most of them.
    pub fix: Option<fn(&Context) -> Vec<String>>,
    pub run: Runner,
}

impl Rule {
    /// Runs the others, so it is never part of the set it runs.
    pub fn meta(&self) -> bool {
        matches!(self.run, Runner::Meta(_))
    }
}

/// The floor, which every noun carries and none of them declares twice.
///
/// **A function rather than a copy in each `all()`.** Three lists naming the
/// same rule is three places for one of them to stop naming it, and a noun with
/// no floor is a noun whose rules may quietly count nothing — which is the exact
/// failure the rule exists to catch, one level up.
pub fn floor() -> Rule {
    Rule {
        fix: None,
        name: "floors",
        run: Runner::Meta(floors::run),
        summary: "every rule counted something",
    }
}

/// Every rule, in the order they are listed and run.
pub fn all() -> Vec<Rule> {
    vec![
        Rule {
            fix: None,
            name: "barrels",
            run: Runner::Source(barrels::run),
            summary: "no barrel import of a package that cannot be tree-shaken",
        },
        floor(),
        Rule {
            fix: None,
            name: "icons",
            run: Runner::Source(icons::run),
            summary: "every icon named in markup is one the set actually has",
        },
        Rule {
            fix: None,
            name: "modules",
            run: Runner::Source(modules::run),
            summary: "no plain stylesheet selects a class only a CSS module declares",
        },
        Rule {
            fix: None,
            name: "node",
            run: Runner::Source(node::run),
            summary: "the Node on this machine, and its types, satisfy the declared floor",
        },
        Rule {
            fix: Some(order::fix),
            name: "order",
            run: Runner::Source(order::run),
            summary: "every manifest has its keys in one order",
        },
        Rule {
            fix: None,
            name: "prerequisites",
            run: Runner::Source(prerequisites::run),
            summary: "every typecheck builds what its build builds before compiling",
        },
        Rule {
            fix: None,
            name: "publishable",
            run: Runner::Source(publishable::run),
            summary: "what may leave the repository, and what a package must be to do it",
        },
        Rule {
            fix: None,
            name: "react-bridge",
            run: Runner::Source(react_bridge::run),
            summary: "the key the framework bridge reads still exists in the framework installed",
        },
        Rule {
            fix: None,
            name: "registration",
            run: Runner::Source(registration::run),
            summary: "an import that registers a custom element is deferred past hydration",
        },
        Rule {
            fix: None,
            name: "scoped",
            run: Runner::Source(scoped::run),
            summary: "no class a CSS module owns is still written as a bare string",
        },
        Rule {
            fix: None,
            name: "scripts",
            run: Runner::Source(scripts::run),
            summary: "every `bun run` in a manifest names a script that manifest declares",
        },
        Rule {
            fix: None,
            name: "shaders",
            run: Runner::Source(shaders::run),
            summary: "GLSL written inside a template literal is still GLSL",
        },
        Rule {
            fix: None,
            name: "shipped",
            run: Runner::Source(shipped::run),
            summary: "nothing in `dist` outlives the source it was compiled from",
        },
    ]
}
