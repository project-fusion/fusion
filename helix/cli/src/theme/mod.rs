//! The `theme` noun.

pub mod audit;
pub mod build;
pub mod init;

use std::path::Path;

use helix_theme::derive::theme::{derive_theme, Theme};

use crate::config;
use crate::error::{Failure, Outcome};
use crate::exit::Code;

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
