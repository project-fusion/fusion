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
    version,
    /* Every subcommand is required, at every level: a bare `helix` or a bare
    `helix theme` prints help and exits 2 rather than guessing. */
    subcommand_required = true,
    arg_required_else_help = true
)]
pub struct Cli {
    #[command(subcommand)]
    pub noun: Noun,

    /// Emit machine-readable JSON on stdout.
    ///
    /// **Available on every verb, always**, which is the contract rather than a
    /// convenience: a command that has a human form and no JSON form is one a
    /// script has to parse prose out of, and prose is the thing this repository
    /// reserves the right to improve.
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
    /// Serve the derivation to an agent, over stdio, as an MCP server.
    ///
    /// **A noun with no verb, and that is the shape rather than an omission.**
    /// Every other noun here does several things to one subject; this does one
    /// thing and the client asks for the rest over the protocol. A `helix mcp
    /// serve` would be a word a reader types to no effect.
    Mcp,

    /// Hold components to the conventions Helix is built on.
    ///
    /// **The design system saying whether you extended it correctly**, rather
    /// than a linter to be configured into usefulness. Where the source is
    /// comes from `helix.rules.json`, because a consumer's layout is not this
    /// repository's.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Component {
        #[command(subcommand)]
        verb: Component,
    },

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
    /// **The one verb that is a report rather than an artifact.** It exits 1 when
    /// a pair fails, so it is usable as a gate, and prints the whole matrix
    /// either way, so it is usable as an answer.
    ///
    /// On a terminal it opens a screen; anywhere else it prints the table. Both
    /// read one report, so neither is the authoritative one.
    Audit(Audit),
    /// Fail if the theme has violations, and print nothing when it does not.
    ///
    /// The CI shape of `audit`: same measurement, no output on success, so a
    /// green pipeline stays quiet.
    Check(Common),
}

/// What every theme verb that reads an intent takes.
#[derive(Args, Debug)]
pub struct Common {
    /// The intent to read. Defaults to the nearest `helix.theme.json`.
    pub intent: Option<PathBuf>,

    /// Read the intent from here instead of searching.
    ///
    /// The same thing the positional argument does, and it exists for the caller
    /// who is already passing other flags and wants the source of the intent to
    /// read as one of them. The positional wins if both are given.
    #[arg(long, value_name = "PATH")]
    pub config: Option<PathBuf>,
}

#[derive(Args, Debug)]
pub struct Audit {
    #[command(flatten)]
    pub common: Common,

    /// Print the table instead of opening the screen.
    ///
    /// **The screen is what a terminal gets and this is how to refuse it**, for
    /// the reader who wants to scroll their own scrollback, copy a row, or diff
    /// two runs. It is not the CI flag: without a tty the table is already what
    /// prints, so a pipeline needs nothing, and a flag that had to be remembered
    /// there would be one nobody remembered.
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

    /// Emit the block even when a pair fails its target.
    ///
    /// **The default is to refuse**, which is the whole argument for a tool that
    /// derives rather than generates: a palette that does not meet the contrast
    /// it claims is the failure this engine exists to prevent, and writing it
    /// anyway with a warning above it produces a file that outlives the warning.
    /// The flag exists because a builder iterating wants to see what they have.
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

/// What can be asked of the component rules.
#[derive(Debug, Subcommand)]
pub enum Component {
    /// Report every rule and what it found, and exit 1 on a finding.
    Audit(Rules),
    /// The CI shape of `audit`: same measurement, nothing printed on success.
    Check(Rules),
}

/// What both component verbs take.
#[derive(Args, Debug)]
pub struct Rules {
    /// Run just these rules.
    #[arg(long, value_delimiter = ',')]
    pub only: Vec<String>,

    /// The workspace to read. Defaults to the current directory.
    #[arg(long)]
    pub root: Option<PathBuf>,
}
