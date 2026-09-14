//! The `theme` noun.

pub mod audit;
pub mod build;
pub mod init;
pub mod report;
pub mod tui;

use std::path::Path;

use fusion_helix_theme::derive::theme::{derive_theme, Theme};
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;

use crate::config;

/// Locate, read and derive, which is the first half of three of the four verbs.
///
/// # Errors
///
/// [`Failure`] when no intent is found, when it cannot be read, or when the
/// engine refuses it. **An engine refusal is `Input` rather than `Internal`**:
/// `resolve` refuses an intent that would produce a palette reporting itself
/// clean without having been measured, which is a statement about what the
/// reader wrote.
pub fn load(intent: Option<&Path>, config: Option<&Path>, from: &Path) -> Outcome<(Theme, String)> {
    let path = config::locate(intent, config, from)?;
    let intent = config::read(&path)?;
    let theme = derive_theme(&intent).map_err(|failure| {
        Failure::new(
            Code::Input,
            format!("cannot derive {}", path.display()),
            failure.to_string(),
        )
    })?;
    Ok((theme, path.display().to_string()))
}
