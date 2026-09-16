//! What a workspace rule reads, and the set of them.
//!
//! **What a rule is comes from `fusion-rules`, and what a workspace rule reads
//! is declared here.** A rule measures and returns; it never prints and never
//! exits, and that split, the runner that holds it, the `fix` verb and the
//! JSON payload are the same for `helix component` and so live in the crate
//! both command lines take. This [`Context`] and these [`Settings`] are the
//! half that is Fusion's: which manifests a workspace has, what it says about
//! itself, and what a prose or spec rule needs to know about its layout.

pub mod barrels;
pub mod floors;
pub mod help;
pub mod icons;
pub mod modules;
pub mod node;
pub mod order;
pub mod prerequisites;
pub mod publishable;
pub mod reaching;
pub mod react_bridge;
pub mod registration;
pub mod scoped;
pub mod scripts;
pub mod shaders;
pub mod shipped;
pub mod strays;

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use fusion_rules::error::{Failure, Outcome};
pub use fusion_rules::{Finding, Measured, Report, Unwritten, Written};
use serde::Deserialize;

use crate::workspace::{self, Manifest};

/// A workspace rule, which is a rule that reads this crate's [`Context`].
pub type Rule = fusion_rules::Rule<Context>;
/// How a workspace rule is run. See [`fusion_rules::Runner`].
pub type Runner = fusion_rules::Runner<Context>;

/// The workspace under test.
pub struct Context {
    pub root: PathBuf,
    pub settings: Settings,
    /// Every manifest in the workspace, read once. See [`Context::manifests`].
    manifests: OnceLock<Vec<Manifest>>,
}

impl Context {
    pub fn new(root: PathBuf, settings: Settings) -> Self {
        Self {
            manifests: OnceLock::new(),
            root,
            settings,
        }
    }

    /// Every manifest in the workspace, the root's included.
    ///
    /// **Read once and borrowed, because nine rules want the same list.** Each
    /// of them walked the workspace and parsed every `package.json` for itself,
    /// and a rule cannot know whether it is the first to ask.
    pub fn manifests(&self) -> &[Manifest] {
        self.manifests
            .get_or_init(|| workspace::manifests(&self.root))
    }

    /// A path as a finding names it: relative to the root, with forward slashes.
    pub fn relative(&self, path: &Path) -> String {
        fusion_rules::relative(&self.root, path)
    }
}

/// `fusion.json`, which is what a workspace says about itself.
///
/// **Optional, every key of it, and the file is not.** A rule needing something
/// this does not carry reports nothing rather than guessing, and `floors` is
/// what makes that visible rather than silent: a rule counting zero is a rule
/// that stopped checking. The file itself is required for the same reason
/// `helix` requires its own: a file that is not there and a file that says
/// nothing would be the same empty set, and a typo in the name would pass every
/// allowlist rule against nothing and report a clean workspace.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// The products a package name can belong to, which is what versions in
    /// lockstep and what may be published beside what.
    pub domains: Vec<String>,

    /// Roots whose modules run under a framework that hydrates, where
    /// registering a custom element at module scope is a fault.
    pub hydrates: Vec<String>,

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

    /// Where the site declares its address, and where it says what it serves.
    #[serde(default)]
    pub site: Site,

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
    /// The package `src` holding `gallery.css` and the drawings, one per file
    /// under `art/`.
    pub art: String,

    /// The tier whose exporting folders the prose counts against.
    pub families: String,

    /// The manifests a family is derived from, which is how the page derives it.
    pub manifests: Vec<String>,
}

/// The three paths that answer "what does this site publish, and where".
///
/// **Grouped rather than three loose keys**, for the reason [`Gallery`] is
/// grouped: an address taken from one site and a catalog taken from another
/// would resolve every link against the wrong tree and report the difference as
/// a fault. Unset is a workspace with no site of its own, which is most of them.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Site {
    /// The module declaring the published address, which is read for the host.
    ///
    /// Read out of the module rather than repeated here, because the module is
    /// where a move would be made and a second spelling is a move half made.
    pub address: String,

    /// The route tree, whose handlers answer at addresses that are not pages.
    pub app: String,

    /// The generated document per route, which is the catalog a link resolves
    /// against, and the assets served at their own paths beside it.
    pub routes: String,
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
    /// Reads the settings beside the workspace.
    ///
    /// # Errors
    ///
    /// [`Failure`] when the file is not there or is not this shape. **The parse
    /// error carries serde's own message**, which names the key and the line,
    /// because the file is hand written and the reader's next action is to open
    /// it at that line. Before this the file was read with `.ok()`, so a
    /// malformed one was an empty set and every rule passed against it.
    pub fn read(root: &Path) -> Outcome<Self> {
        const WHAT: &str = "the rules need to know what the workspace says about itself";
        let file = root.join("fusion.json");
        let raw = fs::read_to_string(&file).map_err(|_| {
            Failure::input(
                WHAT,
                format!(
                    "no configuration at {}.\n  `fusion` reads `fusion.json` beside the root \
                     manifest. Every key in it is optional and the file is not, so a workspace \
                     with nothing to say writes an empty one:\n\n  {{}}",
                    root.display()
                ),
            )
        })?;
        serde_json::from_str(&raw)
            .map_err(|error| Failure::input(WHAT, format!("{}: {error}", file.display())))
    }
}

/// The floor, which every noun carries and none of them declares twice.
///
/// **A function rather than a copy in each `all()`.** Three lists naming the
/// same rule is three places for one of them to stop naming it, and a noun with
/// no floor is a noun whose rules may quietly count nothing, which is the exact
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
            name: "help",
            run: Runner::Source(help::run),
            summary: "a doc comment a command line prints is written for its reader",
        },
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
            name: "reaching",
            run: Runner::Source(reaching::run),
            summary: "no package's script names a path inside another package",
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
            name: "strays",
            run: Runner::Source(strays::run),
            summary: "no `.js` file sits in a package's source tree",
        },
        Rule {
            fix: None,
            name: "shipped",
            run: Runner::Source(shipped::run),
            summary: "nothing in `dist` outlives the source it was compiled from",
        },
    ]
}
