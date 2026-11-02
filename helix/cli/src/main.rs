//! `helix`, the Helix command line.
//!
//! **The contract this implements is deliberately larger than the one noun it
//! has**, and writing it down is what makes the second one cheap: argument
//! grammar in [`args`], config discovery and precedence in [`config`], and the
//! exit codes and error format in `fusion-rules`, which is the crate both
//! command lines read them from so that `fusion helix ...` can hand this
//! binary's code back untouched. Each of those is a module with its reasoning
//! in it rather than a paragraph in a document nobody opens while writing a
//! command.
//!
//! **Every product CLI works standalone**: `helix theme build` needs nothing
//! else installed, and `fusion`, which routes to it, is a convenience rather
//! than a gate. A router that discovers `fusion-*` on `PATH` is a plugin
//! protocol, and a protocol designed against one plugin is an abstraction
//! validated against nothing, so it is deliberately not built.

mod api;
mod args;
mod component;
mod config;
mod diagnostics;
mod family;
mod manifest;
mod mcp;
mod new;
mod scan;
mod shared;
mod theme;

use std::path::PathBuf;

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;

use crate::args::{Api, Cli, Component, Manifest, McpVerb, Noun, System, Theme};

/// The word every printed failure opens with, and the corner of every screen.
pub const PRODUCT: &str = "helix";

/// The family compiler's folder in the repository, as a module it writes from
/// its own definitions names its source.
pub const COMPILER: &str = "helix/cli/src/family";

/// The npm package this binary ships in, which is what tells it its version.
const PACKAGE: &str = "@fusion.dev/helix-cli";

/// What `--version` prints and what the MCP server calls itself: the release
/// this binary was installed as, read from the package beside it rather than
/// compiled in. `fusion_rules::version` carries why.
fn shipped() -> &'static str {
    fusion_rules::version::shipped(PACKAGE, env!("CARGO_PKG_VERSION"))
}

/// What `helix --version --json` prints: the version as one JSON object that
/// names the package. `--version` alone prints the line a release is checked
/// against, `helix 0.205.2`.
///
/// **The npm shim reads it to tell this command line from another program
/// named `helix` on `PATH`.** The name proves nothing: on Arch Linux `helix` is
/// the Helix text editor, whose `--version` prints a line shaped like this
/// one's. The editor exits with an error on `--json`, and a build of this
/// command line from before this output prints its plain line, so neither
/// names the package.
fn version_json(args: &[String]) -> Option<String> {
    let mut asked: Vec<&str> = args.iter().map(String::as_str).collect();
    asked.sort_unstable();
    matches!(asked.as_slice(), ["--json", "--version" | "-V"]).then(|| {
        serde_json::json!({ "name": PRODUCT, "package": PACKAGE, "version": shipped() }).to_string()
    })
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if let Some(said) = version_json(&args) {
        fusion_rules::say!("{said}");
        return;
    }
    let cli: Cli = fusion_rules::args::parse(PRODUCT);
    let paint = if cli.json {
        Paint::never()
    } else {
        Paint::decide(PRODUCT, cli.no_color)
    };

    let from = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let outcome = match &cli.noun {
        /* **No `--json` branch and no paint.** The protocol *is* the format, and
        a server that honored a flag about human output would be a server whose
        stream a client could not parse. */
        Noun::Mcp(args) => match &args.verb {
            None => mcp::run(),
            Some(McpVerb::Init(init)) => mcp::init::run(init, &from, cli.json),
        },
        Noun::Api { verb } => {
            let answer = match verb {
                Api::Find(args) => api::find(&from, &args.query, args.limit),
                Api::Family(args) => api::family(&from, &args.family, args.tier.as_deref()),
                Api::Example(args) => api::example(
                    &from,
                    &args.family,
                    args.example.as_deref(),
                    args.tier.as_deref(),
                ),
                Api::Anatomy(args) => api::anatomy(&from, &args.family, args.tier.as_deref()),
                Api::Imports(args) => api::imports(&from, &args.tags),
                Api::Tokens(args) => {
                    api::tokens(&from, args.query.as_deref(), args.category.as_deref())
                }
            };
            answer.map(|answer| {
                api::print(&answer, cli.json);
                fusion_rules::exit::Code::Ok
            })
        }
        Noun::Component { verb } => match verb {
            Component::Audit(args) => component::run::audit(args, &from, cli.json, paint),
            Component::Check(args) => component::run::check(args, &from, cli.json, paint),
            Component::Fix(args) => component::run::fix(args, &from, cli.json, paint),
        },
        Noun::Manifest { verb } => match verb {
            #[cfg(feature = "internal")]
            Manifest::Build(args) => manifest::generate(args, &from, cli.json),
            Manifest::Diff(args) => manifest::diff(args, &from, cli.json),
        },
        Noun::Diagnostics(args) => diagnostics::run(args, &from, cli.json, paint),
        Noun::New(args) => new::run(args, &from, cli.json, paint),
        Noun::Scan(args) => scan::run(args, &from, cli.json, paint),
        Noun::Shared(args) => shared::run(args, &from, cli.json, paint),
        Noun::System { config, verb } => {
            let config = config.as_deref();
            match verb {
                System::Anatomy(args) => family::anatomy(args, config, &from),
                System::Build(args) => family::build(args, config, &from, cli.json),
                #[cfg(feature = "internal")]
                System::Capabilities(args) => family::capabilities(args, config, &from, cli.json),
                System::Check(args) => family::check(args, config, &from, cli.json),
                System::Components(args) => family::components(args, config, &from, cli.json),
                System::Config(args) => family::config(args, config, &from),
                #[cfg(feature = "internal")]
                System::DesignTokens(args) => family::design_tokens(args, config, &from, cli.json),
                #[cfg(feature = "internal")]
                System::Machines(args) => family::machines(args, config, &from, cli.json),
                System::Parts(args) => family::parts(args, config, &from, cli.json),
                System::Platforms(args) => family::platforms(args, config, &from),
                System::Stylesheets(args) => family::stylesheets(args, config, &from, cli.json),
                System::Tokens(args) => family::tokens(args, config, &from, cli.json),
                #[cfg(feature = "internal")]
                System::Types(args) => family::types(args, config, &from, cli.json),
            }
        }
        Noun::Theme { verb } => match verb {
            Theme::Audit(args) => theme::audit::run(args, &from, cli.json, paint),
            Theme::Build(args) => theme::build::run(args, &from, cli.json),
            Theme::Check(args) => theme::audit::check(args, &from, cli.json),
            Theme::Init(args) => theme::init::run(args, &from, cli.json),
        },
        Noun::Visual { verb } => fusion_helix_visual::run(verb, cli.json),
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
        eprintln!("{}", failure.render(PRODUCT));
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
