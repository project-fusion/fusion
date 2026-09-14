//! Finding the intent, and deciding which one wins.
//!
//! **Precedence is stated rather than discovered**, because a reader debugging
//! "why did it use that file" needs an answer they can read rather than
//! reproduce:
//!
//! 1. A path given as an argument. Explicit beats everything.
//! 2. `--config <path>`. Explicit at the session level.
//! 3. `helix.theme.json`, searched from the working directory upward.
//! 4. Nothing, which is an error rather than a default.
//!
//! **The fourth rung is deliberate.** A tool that invents a default theme when
//! it cannot find one produces output that looks right and is about nothing the
//! reader wrote, and the mistake surfaces at the far end, in a browser, as a
//! palette nobody chose. Refusing costs one line of output and no confusion.
//!
//! **The search walks up and stops at a repository root.** A monorepo has one
//! theme near the top and many packages under it, so walking up is what lets a
//! command run from anywhere in the tree; stopping at `.git` is what keeps it
//! from finding a colleague's file two directories above the checkout.

use std::path::{Path, PathBuf};

use fusion_helix_theme::intent::ThemeIntent;
use fusion_rules::error::{Failure, Outcome};

/// The name a discovered intent is expected to have.
pub const FILE: &str = "helix.theme.json";

/// Walks up from `start` looking for [`FILE`].
///
/// Returns `None` rather than an error: not finding one is only a failure once
/// the caller knows nothing more explicit was given, and this function does not.
#[must_use]
pub fn discover(start: &Path) -> Option<PathBuf> {
    for directory in start.ancestors() {
        let candidate = directory.join(FILE);
        if candidate.is_file() {
            return Some(candidate);
        }
        /* Stopped *after* looking, so a theme file beside `.git` at the root is
        found rather than skipped by a check that ran first. */
        if directory.join(".git").exists() {
            return None;
        }
    }
    None
}

/// Resolves the three explicit rungs against the search.
///
/// # Errors
///
/// [`Failure`] when nothing is found, naming the file it looked for and the
/// command that writes one.
pub fn locate(argument: Option<&Path>, flag: Option<&Path>, from: &Path) -> Outcome<PathBuf> {
    if let Some(path) = argument.or(flag) {
        return Ok(path.to_path_buf());
    }
    discover(from).ok_or_else(|| {
        Failure::input(
            format!("no {FILE}"),
            format!(
                "searched {} and every directory above it up to the repository root",
                from.display()
            ),
        )
        .hint("helix theme init")
    })
}

/// Reads and parses one.
///
/// # Errors
///
/// [`Failure`] when the file cannot be read or is not an intent. **The parse
/// error carries serde's own message**, which names the offending key and its
/// line, rather than being flattened into "invalid theme": a config file is hand
/// written and the reader's next action is to open it at that line.
pub fn read(path: &Path) -> Outcome<ThemeIntent> {
    let source = std::fs::read_to_string(path).map_err(|failure| {
        Failure::input(
            format!("cannot read {}", path.display()),
            lowercase(&failure.to_string()),
        )
    })?;
    serde_json::from_str(&source).map_err(|failure| {
        Failure::input(
            format!("cannot use {}", path.display()),
            failure.to_string(),
        )
    })
}

/// `io::Error` renders capitalised and the error format continues a sentence.
fn lowercase(message: &str) -> String {
    let mut characters = message.chars();
    match characters.next() {
        None => String::new(),
        Some(first) => first.to_lowercase().collect::<String>() + characters.as_str(),
    }
}
