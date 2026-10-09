//! `fusion`, the Fusion command line: the door to each product's, and this
//! repository's own checks behind `x`.
//!
//! **Each product's command line is routed, never reimplemented.** `fusion
//! helix ...` and `fusion locus ...` hand the rest of the line to that binary and
//! return its exit code, and each works on its own without this one.
//!
//! **This repository's checks are under `x`, and only in its own builds.**
//! `workspace`, `prose` and `spec` hold this repository to its conventions, which
//! serve nobody who installs Fusion, so they sit behind the `internal` feature:
//! on by default, which is every build here, and off in the binaries
//! `binaries.yml` publishes, which never show `x`. `x` is the name the Rust
//! compiler's own repository gives its internal tooling.
//!
//! **The shape is `helix`'s, because the two read it from one crate.** Exit
//! codes, the error format, color, the runner and the audit screen are
//! `fusion-rules`'s, which carries no product and is what lets both command
//! lines take it. Two command lines from one company that disagree about what
//! 3 means, or which stream an error lands on, are worse than either shape,
//! and `fusion helix ...` returning its child's code untouched is only honest
//! while the two tables are one table.

#[cfg(feature = "internal")]
mod plugins;
#[cfg(feature = "internal")]
mod prose;
mod route;
#[cfg(feature = "internal")]
mod rules;
#[cfg(feature = "internal")]
mod spec;
mod workspace;
#[cfg(feature = "internal")]
mod x;

use clap::{Parser, Subcommand};
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;

/// The word every printed failure opens with, and the corner of every screen.
const PRODUCT: &str = "fusion";

/// The npm package this binary ships in, which is what tells it its version.
const PACKAGE: &str = "@fusion.dev/cli";

/// What `--version` prints: the release this binary was installed as, read from
/// the package beside it rather than compiled in. `fusion_rules::version`
/// carries why, and `helix` does the same for the same reason.
fn shipped() -> &'static str {
    fusion_rules::version::shipped(PACKAGE, env!("CARGO_PKG_VERSION"))
}

#[derive(Debug, Parser)]
#[command(
    name = "fusion",
    about = "The Fusion command line: Helix, Locus, and the checks this repository holds itself to.",
    version = shipped(),
    subcommand_required = true,
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    noun: Noun,

    /* **Available on every verb, always**, which is the contract rather than a
    convenience: a command with a human form and no JSON form is one a script
    has to parse prose out of, and prose is the thing this reserves the right to
    improve. The reasoning stays here and out of the help text, which is a
    reader's and carries no markup. */
    /// Emit machine-readable JSON on stdout.
    ///
    /// Passed to `helix` when written before its name, and read by every `x`
    /// verb. A usage error is JSON on stderr.
    #[arg(long, global = true)]
    json: bool,

    /// Never color the output.
    ///
    /// Color is already off when stdout is not a terminal and when `NO_COLOR`
    /// is set. This is the third way, for a terminal that reports itself capable
    /// and is not.
    #[arg(long, global = true)]
    no_color: bool,
}

#[derive(Debug, Subcommand)]
enum Noun {
    /* **A route rather than a reimplementation**, which is what keeps the two
    from disagreeing: the line goes to `helix` untouched and its exit code comes
    back. A convenience over a CLI that works standalone, never a gate in front
    of one. */
    /// Run the Helix command line, which owns its own nouns.
    ///
    /// Everything after `helix` is passed to it as written, and its exit code
    /// is returned. Needs `helix` installed.
    #[command(disable_help_flag = true)]
    Helix {
        /// Everything after `helix`, handed over as written.
        #[arg(allow_hyphen_values = true, trailing_var_arg = true)]
        args: Vec<String>,
    },
    /// Run the Fusion Locus command line, which owns its own nouns.
    ///
    /// Everything after `locus` is passed to it as written, and its exit code
    /// is returned. Needs `locus` installed.
    #[command(disable_help_flag = true)]
    Locus {
        /// Everything after `locus`, handed over as written.
        #[arg(allow_hyphen_values = true, trailing_var_arg = true)]
        args: Vec<String>,
    },
    /// Run this repository's own checks and fixes.
    #[cfg(feature = "internal")]
    #[command(subcommand_required = true, arg_required_else_help = true)]
    X {
        #[command(subcommand)]
        noun: x::Internal,
    },
}

fn main() {
    let cli: Cli = fusion_rules::args::parse(PRODUCT);
    let paint = if cli.json {
        Paint::never()
    } else {
        Paint::decide(PRODUCT, cli.no_color)
    };

    std::process::exit(match run(&cli, paint) {
        Ok(code) => code,
        Err(failure) => report_failure(&failure, cli.json),
    });
}

/// **Errors go to stderr in both modes.** A reader piping `--json` into another
/// program gets a clean stream or nothing at all: an error object on stdout is a
/// document the consumer has to inspect to find out whether it is an answer, and
/// a half-written artifact followed by one is worse still.
fn report_failure(failure: &Failure, json: bool) -> i32 {
    if json {
        eprintln!("{}", failure.as_json());
    } else {
        eprintln!("{}", failure.render(PRODUCT));
    }
    failure.code.as_i32()
}

/* `Code::Usage` and `Code::Internal` are not returned by name below, and that
is not an oversight in either case. Clap owns usage: it prints its own message
and exits 2 before `main` sees an argument, which is the number this enum
records rather than one it chooses. Internal is what a failure to open the
screen or to write a fix carries, and what a panic reaches the runtime with.
Both are in the enum because the enum is the published set. */
const _: () = {
    assert!(Code::Usage as i32 == 2);
    assert!(Code::Internal as i32 == 4);
};
/// The whole command, as the exit code it ends with.
///
/// **A routed noun returns the child's own code**, whatever it was, which is
/// why this is an `i32` rather than a [`Code`]: `fusion helix theme check` is
/// `helix theme check`, and a caller reading its exit reads `helix`'s table.
/// The two tables are the same table, on purpose.
#[cfg_attr(
    not(feature = "internal"),
    expect(
        unused_variables,
        reason = "paint is for `x`, which this build leaves out"
    )
)]
fn run(cli: &Cli, paint: Paint) -> Outcome<i32> {
    match &cli.noun {
        /* **The channel flags reach `helix`**, which takes both, when they are
        written before its name: `fusion --json helix scan` would otherwise
        swallow `--json` and print prose. Locus takes neither. */
        Noun::Helix { args } => {
            let mut forwarded: Vec<String> = Vec::new();
            if cli.json {
                forwarded.push("--json".to_owned());
            }
            if cli.no_color {
                forwarded.push("--no-color".to_owned());
            }
            forwarded.extend(args.iter().cloned());
            route::to("helix", &forwarded)
        }
        Noun::Locus { args } => route::to("locus", args),
        #[cfg(feature = "internal")]
        Noun::X { noun } => x::run(noun, cli.json, paint),
    }
}
