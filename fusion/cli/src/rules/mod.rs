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
pub mod react_bridge;
pub mod registration;
pub mod scoped;
pub mod scripts;
pub mod shaders;
pub mod shipped;

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

    /// The list of names an icon set actually has.
    pub icons: Option<String>,

    /// The one npm scope every package in this repository is published under.
    pub scope: Option<String>,

    /// Paths inside `hydrates` that are their own document, with nothing to
    /// hydrate, where registering at module scope is what an entry point is for.
    pub standalone: Vec<String>,
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

/// What a rule can do, beyond judging.
pub struct Rule {
    /// Runs the others, so it is never part of the set it runs.
    pub meta: bool,
    pub name: &'static str,
    pub summary: &'static str,
    /// `None` for a rule that judges and cannot write, which is most of them.
    pub fix: Option<fn(&Context) -> Vec<String>>,
    pub run: fn(&Context) -> Report,
}

/// Every rule, in the order they are listed and run.
pub fn all() -> Vec<Rule> {
    vec![
        Rule {
            fix: None,
            meta: false,
            name: "barrels",
            run: barrels::run,
            summary: "no barrel import of a package that cannot be tree-shaken",
        },
        Rule {
            fix: None,
            meta: true,
            name: "floors",
            run: floors::run,
            summary: "every rule counted something",
        },
        Rule {
            fix: None,
            meta: false,
            name: "icons",
            run: icons::run,
            summary: "every icon named in markup is one the set actually has",
        },
        Rule {
            fix: None,
            meta: false,
            name: "modules",
            run: modules::run,
            summary: "no plain stylesheet selects a class only a CSS module declares",
        },
        Rule {
            fix: None,
            meta: false,
            name: "node",
            run: node::run,
            summary: "the Node on this machine, and its types, satisfy the declared floor",
        },
        Rule {
            fix: Some(order::fix),
            meta: false,
            name: "order",
            run: order::run,
            summary: "every manifest has its keys in one order",
        },
        Rule {
            fix: None,
            meta: false,
            name: "prerequisites",
            run: prerequisites::run,
            summary: "every typecheck builds what its build builds before compiling",
        },
        Rule {
            fix: None,
            meta: false,
            name: "react-bridge",
            run: react_bridge::run,
            summary: "the key the framework bridge reads still exists in the framework installed",
        },
        Rule {
            fix: None,
            meta: false,
            name: "registration",
            run: registration::run,
            summary: "an import that registers a custom element is deferred past hydration",
        },
        Rule {
            fix: None,
            meta: false,
            name: "scoped",
            run: scoped::run,
            summary: "no class a CSS module owns is still written as a bare string",
        },
        Rule {
            fix: None,
            meta: false,
            name: "scripts",
            run: scripts::run,
            summary: "every `bun run` in a manifest names a script that manifest declares",
        },
        Rule {
            fix: None,
            meta: false,
            name: "shaders",
            run: shaders::run,
            summary: "GLSL written inside a template literal is still GLSL",
        },
        Rule {
            fix: None,
            meta: false,
            name: "shipped",
            run: shipped::run,
            summary: "nothing in `dist` outlives the source it was compiled from",
        },
    ]
}
