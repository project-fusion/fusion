//! What a command line says it is, read from the package it was installed in.
//!
//! **A version compiled in is a build per release, and the builds are what
//! cost.** `helix` ships as five platform binaries, two of them macOS at about
//! ten times the Linux rate, and `CARGO_PKG_VERSION` put the release number
//! inside every one of them: the same sources at a new number are a different
//! binary, so no cache could ever hold across a release and most releases
//! change no Rust at all. Read at run time, one build serves every release that
//! does not touch the Rust, and the binary still reports the release a consumer
//! installed rather than the placeholder it was compiled at.
//!
//! **Beside the binary, because that is where npm puts the answer.** The shims
//! run `node_modules/@fusion.dev/helix-cli-<platform>/helix`, and that
//! directory's `package.json` is the platform package's, stamped by the release
//! seconds before it packed. `publish.mjs` runs the binary from exactly there,
//! so what it proves is what a consumer sees.
//!
//! **It says the compiled value rather than guessing.** A binary run out of
//! `target/` in this checkout has no manifest beside it and reports
//! `0.0.0-dev`, which is what the crate holds and what that build is. A
//! manifest that does not parse, or belongs to some other package that happens
//! to sit beside a binary of ours, is not an answer either.

use std::sync::OnceLock;

use serde::Deserialize;

/// The two fields of a manifest this reads. Everything else in a `package.json`
/// is somebody else's business, and serde ignores it.
#[derive(Deserialize)]
struct Manifest {
    name: String,
    version: String,
}

/// The version this binary is installed as, or `compiled` where nothing says.
///
/// `package` is the npm package the command ships in, `@fusion.dev/helix-cli`
/// for `helix`. A platform package is that name plus its platform, so either
/// manifest beside the binary answers and a stranger's does not.
#[must_use]
pub fn shipped(package: &str, compiled: &'static str) -> &'static str {
    /* One process is one command line and every call site passes that command
    line's own pair, so the file is read once and the answer outlives the call,
    which is what `--version` needs it to be. */
    static SHIPPED: OnceLock<String> = OnceLock::new();
    SHIPPED
        .get_or_init(|| installed(package).unwrap_or_else(|| compiled.to_owned()))
        .as_str()
}

/// The `version` of a manifest sitting beside this binary, where there is one
/// and it belongs to `package`.
fn installed(package: &str) -> Option<String> {
    let binary = std::env::current_exe().ok()?;
    /* **Through the symlinks, since a package manager makes plenty of them.**
    `current_exe` resolves them on Linux and macOS and is not promised to
    anywhere, and the directory this wants is the real one the manifest is in
    rather than whatever `node_modules/.bin` points from. */
    let binary = std::fs::canonicalize(&binary).unwrap_or(binary);
    let read = std::fs::read_to_string(binary.parent()?.join("package.json")).ok()?;
    let manifest: Manifest = serde_json::from_str(&read).ok()?;
    /* The wrapper exactly, or one of its platform packages. A `package.json`
    beside a binary on someone's `PATH` is not a claim about our version. */
    if manifest.name != package && !manifest.name.starts_with(&format!("{package}-")) {
        return None;
    }
    if manifest.version.is_empty() {
        return None;
    }
    Some(manifest.version)
}
