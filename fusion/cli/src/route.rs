//! Reaching another product's command line, without depending on it.
//!
//! **`fusion helix component audit` runs `helix component audit`**, and the two
//! are the same command by construction rather than by agreement: this does not
//! reimplement a noun, it hands the rest of the line to the binary that owns it
//! and returns what that binary returned.
//!
//! **Exec rather than a library, which is the whole design.** Linking
//! `fusion-helix-cli` in would be a dependency from the fusion domain onto the
//! helix one, and per-domain lockstep exists so a release of either does not
//! wait on the other: a shared crate is exactly the thing that makes it wait.
//! Spawning costs a process and keeps the domains apart. What it costs instead
//! is the copy: about eight hundred lines the two crates hold in common, listed
//! in `helix`'s `component/mod.rs`, with the screen held identical by a test
//! here and the rest kept the same by hand.
//!
//! **Every product CLI still works standalone**, which is the constraint this is
//! built under rather than around: `helix component audit` needs nothing else
//! installed, and this is a convenience over it. That is also why a missing
//! binary is a plain message naming what to install rather than a failure that
//! reads like a bug in `fusion`.
//!
//! **Resolution order, and each step earns its place.** An environment variable
//! first, because a caller who knows better should not have to argue. Then the
//! cargo target directory, newest of release and debug by modification time —
//! preferring release outright is the trap a development machine sets, where one
//! `--release` build shadows every debug build after it. Then `PATH`, which is
//! what an installed binary looks like.

use std::env;
use std::path::PathBuf;
use std::process::Command;

use crate::error::{Failure, Outcome};
use crate::exit::Code;
use crate::workspace::find_root;

/// The most recently built binary under a cargo target directory.
fn built(name: &str) -> Option<PathBuf> {
    let root = env::current_dir()
        .ok()
        .and_then(|here| find_root(&here))
        .unwrap_or_else(|| PathBuf::from("."));
    let target = env::var_os("CARGO_TARGET_DIR").map_or_else(|| root.join("target"), PathBuf::from);
    let mut found: Vec<PathBuf> = ["release", "debug"]
        .iter()
        .map(|profile| target.join(profile).join(name))
        .filter(|path| path.is_file())
        .collect();
    found.sort_by_key(|path| std::fs::metadata(path).and_then(|one| one.modified()).ok());
    found.pop()
}

/// Runs another product's command line and returns its exit code.
///
/// # Errors
///
/// [`Failure`] with [`Code::Input`] when there is no such binary to run, and
/// with [`Code::Internal`] when there is one and it could not be started. A
/// child that exits by signal has no code, and is reported as this tool's own
/// failure rather than as a number the child never chose.
pub fn to(product: &str, args: &[String]) -> Outcome<i32> {
    let variable = format!("{}_BIN", product.to_uppercase());
    let binary = env::var_os(&variable)
        .map(PathBuf::from)
        .or_else(|| built(product))
        .unwrap_or_else(|| PathBuf::from(product));

    match Command::new(&binary).args(args).status() {
        Ok(status) => Ok(status.code().unwrap_or(Code::Internal.as_i32())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Err(Failure::input(
            format!("no `{product}` on this machine"),
            format!(
                "`fusion {product}` hands the rest of the line to it and does not reimplement \
                 it, so it has to be installed. Looked at ${variable}, the cargo target \
                 directory, and `{product}` on PATH"
            ),
        )
        .hint(format!("cargo install --path {product}/cli"))),
        Err(error) => Err(Failure::new(
            Code::Internal,
            format!("could not run `{}`", binary.display()),
            error.to_string(),
        )),
    }
}
