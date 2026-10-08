//! `proof`, the Fusion Proof command line.
//!
//! **A Rust core with capture in Node, decided on October 8, 2026.** This
//! binary will hold the config, discovery, sharding, baselines, the environment
//! fingerprint, the codecs, the diff and the report. Chromium is about 94% of
//! the time of a picture, and Playwright drives it with auto-waiting, request
//! routing and media emulation that a client of the browser protocol written
//! here would have to rebuild. So capture goes through the Node driver that
//! ships in the same npm package: driving Chromium from Rust changes the
//! capture code and leaves the capture time the same.
//!
//! **Only `--version` and `--help` for now.** The commands land with the work
//! that makes them true, so the help text never lists one that does nothing.

use clap::Parser;

/// The npm package this binary ships in, which is what tells it its version.
const PACKAGE: &str = "@fusion.dev/proof";

/// What `--version` prints: the release this binary was installed as, read
/// from the package beside it rather than compiled in. `fusion_rules::version`
/// carries why.
fn shipped() -> &'static str {
    fusion_rules::version::shipped(PACKAGE, env!("CARGO_PKG_VERSION"))
}

#[derive(Debug, Parser)]
#[command(
    name = "proof",
    about = "Visual regression testing with baselines kept in git.",
    after_help = "No commands yet. Fusion Proof is in development, and `proof test`, \
                  `proof update`, and `proof report` are the first commands planned.",
    version = shipped(),
    /* A bare `proof` prints the help and exits 2, the way a bare `helix` does. */
    arg_required_else_help = true
)]
struct Cli {}

fn main() {
    Cli::parse();
}
