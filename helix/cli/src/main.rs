//! `helix`, the Helix command line.
//!
//! **The contract this implements is deliberately larger than the one noun it
//! has**, and writing it down is what makes the second one cheap: argument
//! grammar in [`args`], exit codes in [`exit`], error format in [`error`],
//! config discovery and precedence in [`config`]. Each of those is a module with
//! its reasoning in it rather than a paragraph in a document nobody opens while
//! writing a command.
//!
//! **Every product CLI works standalone**, which is the Sovereignty Constraint
//! applied to tooling: `helix theme build` needs nothing else installed, and a
//! future `fusion` that routes to it is a convenience rather than a gate. A
//! router that discovers `fusion-*` on `PATH` is a plugin protocol, and a
//! protocol designed against one plugin is an abstraction validated against
//! nothing, so it is deliberately not built yet.

mod args;
mod config;
mod error;
mod exit;
mod style;
mod theme;

use std::path::PathBuf;

use clap::Parser;

use crate::args::{Cli, Noun, Theme};
use crate::error::Failure;
use crate::exit::Code;
use crate::style::Paint;

fn main() {
    let cli = Cli::parse();
    let paint = if cli.json {
        Paint::never()
    } else {
        Paint::decide(cli.no_color)
    };

    let from = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let outcome = match &cli.noun {
        Noun::Theme { verb } => match verb {
            Theme::Audit(args) => theme::audit::run(args, &from, cli.json, paint, false),
            Theme::Build(args) => theme::build::run(args, &from, cli.json),
            Theme::Check(args) => theme::audit::run(args, &from, cli.json, paint, true),
            Theme::Init(args) => theme::init::run(args, &from, cli.json),
        },
    };

    std::process::exit(match outcome {
        Ok(code) => code.as_i32(),
        Err(failure) => report(&failure, cli.json),
    });
}

/// **Errors go to stderr in both modes.** A reader piping `--json` into another
/// program gets a clean stream or nothing at all: an error object on stdout is a
/// document the consumer has to inspect to find out whether it is an answer, and
/// a half-written artifact followed by one is worse still.
fn report(failure: &Failure, json: bool) -> i32 {
    if json {
        eprintln!("{}", failure.as_json());
    } else {
        eprintln!("{failure}");
    }
    failure.code.as_i32()
}

/* `Code::Usage` and `Code::Internal` are not returned by any verb above, and
that is not an oversight in either case. Clap owns usage: it prints its own
message and exits 2 before `main` sees an argument, which is the number this enum
records rather than one it chooses. Internal is for a panic, which reaches the
runtime rather than this function. Both are in the enum because the enum is the
published set, and a caller writing a case for 2 should find it documented rather
than have to discover it from clap's behavior. */
const _: () = {
    assert!(Code::Usage as i32 == 2);
    assert!(Code::Internal as i32 == 4);
};
