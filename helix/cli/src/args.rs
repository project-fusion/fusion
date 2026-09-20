//! The argument grammar.
//!
//! **`helix <noun> <verb>`, and the noun is not optional.** Scaffolding,
//! templates and theming are the same binary, so `theme` is one branch of a
//! surface that will also hold `new` and `template`. A flat `helix build` would
//! be shorter today and ambiguous the moment the second noun lands, and the
//! version of this that reads well now is the one that has to be broken later.
//!
//! **Two global flags and no more.** `--json` and `--no-color` are about the
//! *channel* rather than the command, so they belong to the binary; everything
//! else belongs to a verb. A global flag that only some verbs honor is a
//! promise the help text makes and the code does not keep.

use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(
    name = "helix",
    about = "The Helix command line.",
    /* The release this binary was installed as, not the number it was compiled
    at: one build then serves every release that changes no Rust. */
    version = crate::shipped(),
    /* Every subcommand is required, at every level: a bare `helix` or a bare
    `helix theme` prints help and exits 2 rather than guessing. */
    subcommand_required = true,
    arg_required_else_help = true
)]
pub struct Cli {
    #[command(subcommand)]
    pub noun: Noun,

    /* **Available on every verb, always**, which is the contract rather than a
    convenience: a command that has a human form and no JSON form is one a
    script has to parse prose out of, and prose is the thing this repository
    reserves the right to improve. The reasoning stays here and out of the help
    text, which is a reader's and carries no markup. */
    /// Emit machine-readable JSON on stdout.
    ///
    /// Available on every verb, in a shape a script can read without parsing
    /// sentences.
    #[arg(long, global = true)]
    pub json: bool,

    /// Never color the output.
    ///
    /// Color is already off when stdout is not a terminal and when `NO_COLOR`
    /// is set. This is the third way, for a terminal that reports itself capable
    /// and is not.
    #[arg(long, global = true)]
    pub no_color: bool,
}

#[derive(Debug, Subcommand)]
pub enum Noun {
    /* **A noun with no verb, and that is the shape rather than an omission.**
    Every other noun here does several things to one subject; this does one
    thing and the client asks for the rest over the protocol. A `helix mcp
    serve` would be a word a reader types to no effect. */
    /// Serve the derivation to an agent, over stdio, as an MCP server.
    ///
    /// Takes no verb: the client asks for what it wants over the protocol.
    Mcp,

    /* **The design system saying whether you extended it correctly**, rather
    than a linter to be configured into usefulness. */
    /// Hold components to the conventions Helix is built on.
    ///
    /// Reads the tiers named by a `helix` key in `fusion.json`, or by
    /// `helix.json` where that product is not in use.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Component {
        #[command(subcommand)]
        verb: Component,
    },

    /* **A noun with no verb, like `mcp` and for the opposite reason.** `new`
    does one thing to one subject and there is no second verb it could take:
    `helix new list` would be a word for what an omitted `--template` already
    prints. */
    /* **A noun for the artifact rather than a verb on the component noun.**
    `component` holds a design system to its conventions; a manifest is a file,
    and what is asked of a file is whether two of them say the same thing. */
    /// Read and compare custom elements manifests.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Manifest {
        #[command(subcommand)]
        verb: Manifest,
    },

    /// Scaffold a project from a Helix template.
    ///
    /// Reads `@fusion.dev/helix-templates` from `node_modules`. Omit
    /// `--template` to be shown what there is.
    New(New),

    /// Derive, verify and inspect a theme.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Theme {
        #[command(subcommand)]
        verb: Theme,
    },
}

#[derive(Debug, Subcommand)]
pub enum Theme {
    /// Write a starter intent.
    Init(Init),
    /// Emit the theme as CSS.
    Build(Build),
    /// Report every pair the theme was checked against.
    ///
    /// Exits 1 when a pair fails, so it works as a gate, and prints the matrix
    /// either way, so it works as an answer. Opens a screen on a terminal and
    /// prints the table anywhere else.
    Audit(Audit),
    /// Fail if the theme has violations, and print nothing when it does not.
    ///
    /// The CI shape of `audit`: same measurement, quiet on success.
    Check(Common),
}

/// What every theme verb that reads an intent takes.
#[derive(Args, Debug)]
pub struct Common {
    /// The intent to read. Defaults to the nearest `helix.theme.json`.
    pub intent: Option<PathBuf>,

    /// Read the intent from here instead of searching.
    ///
    /// The positional argument does the same; this reads better beside other
    /// flags. The positional wins if both are given.
    #[arg(long, value_name = "PATH")]
    pub config: Option<PathBuf>,
}

#[derive(Args, Debug)]
pub struct Audit {
    #[command(flatten)]
    pub common: Common,

    /// Print the table instead of opening the screen.
    ///
    /// For scrollback, copying a row, or diffing two runs. Not needed in a
    /// pipeline, where the table already prints.
    #[arg(long)]
    pub plain: bool,
}

#[derive(Args, Debug)]
pub struct Build {
    #[command(flatten)]
    pub common: Common,

    /// Write to this file instead of stdout.
    #[arg(long, short, value_name = "PATH")]
    pub out: Option<PathBuf>,

    /// The selector the block is written under.
    #[arg(long, default_value = ":root", value_name = "SELECTOR")]
    pub selector: String,

    /* **The default is to refuse**, which is the whole argument for a tool that
    derives rather than generates: writing a failing palette with a warning
    above it produces a file that outlives the warning. */
    /// Emit the block even when a pair fails its target.
    ///
    /// Refused by default: a palette that does not meet the contrast it claims
    /// is the failure this engine exists to prevent. Use it while iterating, to
    /// see what you have.
    #[arg(long)]
    pub force: bool,
}

#[derive(Args, Debug)]
pub struct Init {
    /// Where to write it. Defaults to `helix.theme.json` here.
    #[arg(long, short, value_name = "PATH")]
    pub out: Option<PathBuf>,

    /// The brand color to seed it with.
    #[arg(long, default_value = "#3b82f6", value_name = "HEX")]
    pub brand: String,

    /// Overwrite an existing file.
    #[arg(long)]
    pub force: bool,
}

/// What can be asked of a manifest.
#[derive(Debug, Subcommand)]
pub enum Manifest {
    /* **The instrument a second generator is held to.** Replacing the analyzer
    is only safe if the thing replacing it can be shown to produce what the
    thing it replaces produced, and the manifest is the most-checked artifact
    here: the reference pages, the framework typings and sixty component rules
    all read it. */
    /// Say what two manifests disagree about, in the manifest's own terms.
    ///
    /// Exits 1 on any difference, so a generator that claims to match can be
    /// made to prove it in a pipeline.
    Diff(ManifestDiff),

    /* **Not wired into any build.** Held to the analyzer's output by `diff`
    until it matches, and only then does anything read it. Until that day this
    is a generator being measured rather than one being used. */
    /// Generate a manifest from a package's sources.
    ///
    /// Writes to stdout. Incomplete: the layers it has been taken through are
    /// the ones `diff` reports no difference in.
    Build(ManifestBuild),
}

/// What `manifest build` takes.
#[derive(Args, Debug)]
pub struct ManifestBuild {
    /// The package to read, which is the directory holding its `src`.
    pub package: PathBuf,

    /* **Given rather than discovered.** The analyzer takes it from a
    TypeScript config, and a Rust binary that executed one to find out would be
    doing the thing this exists to stop doing. Sandbox declares `styled`, which
    is why it cannot be guessed from the directory either. */
    /// The design-system tier the package belongs to.
    #[arg(default_value = "styled", long)]
    pub tier: String,
}

/// What `manifest diff` takes.
#[derive(Args, Debug)]
pub struct ManifestDiff {
    /// The manifest to treat as what is expected.
    pub before: PathBuf,

    /// The manifest to hold against it.
    pub after: PathBuf,

    /* A cap rather than a page, because the question this answers first is
    "did anything move", and a generator part way through its first tier
    answers it with tens of thousands of lines. */
    /// How many differences to print before stopping. Zero for all of them.
    #[arg(default_value_t = 40, long)]
    pub limit: usize,
}

/// What can be asked of the component rules.
#[derive(Debug, Subcommand)]
pub enum Component {
    /// Report every rule and what it found, and exit 1 on a finding.
    Audit(ComponentAudit),
    /// The CI shape of `audit`: same measurement, nothing printed on success.
    Check(Rules),
    /// Run the rules that can write.
    Fix(Rules),
}

/// What `component audit` takes, which is the rules plus how to show them.
#[derive(Args, Debug)]
pub struct ComponentAudit {
    #[command(flatten)]
    pub rules: Rules,

    /* **Not the CI flag**: without a tty the report already prints, so a
    pipeline needs nothing, and a flag that had to be remembered there would be
    one nobody remembered. */
    /// Print the report instead of opening the screen.
    ///
    /// For scrolling your own scrollback, copying a line, or diffing two runs.
    /// Not needed in a pipeline, where the report already prints.
    #[arg(long)]
    pub plain: bool,
}

/// What the component verbs take.
#[derive(Args, Debug)]
pub struct Rules {
    /// Run just these rules.
    #[arg(long, value_delimiter = ',')]
    pub only: Vec<String>,

    /// The workspace to read. Defaults to the current directory.
    #[arg(long)]
    pub root: Option<PathBuf>,
}

#[derive(Debug, Args)]
pub struct New {
    /// The project's name, and the directory it is written into.
    ///
    /// Written wherever the template's register says the name belongs, which is
    /// its manifest and whatever else that template names.
    pub name: String,

    /// Which template to use.
    ///
    /// Omitted, the templates are listed and nothing is written: a scaffolder
    /// that picks for you writes a project the reader did not choose.
    #[arg(long)]
    pub template: Option<String>,

    /// Write into this directory instead of one named after the project.
    #[arg(long)]
    pub into: Option<PathBuf>,
}
