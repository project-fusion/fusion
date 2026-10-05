//! The `theme` noun.

pub mod audit;
pub mod build;
pub mod init;
pub mod report;
pub mod tui;

use std::path::Path;

use fusion_helix_theme::derive::resolve::IntentError;
use fusion_helix_theme::derive::theme::{derive_theme, Theme};
use fusion_helix_theme::intent::{Scheme, ThemeIntent};
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
pub fn load(
    intent: Option<&Path>,
    config: Option<&Path>,
    from: &Path,
) -> Outcome<(Vec<Theme>, String)> {
    let path = config::locate(intent, config, from)?;
    let intent = config::read(&path)?;
    let themes = modes(&intent).map_err(|failure| {
        Failure::new(
            Code::Input,
            format!("cannot derive {}", path.display()),
            failure.to_string(),
        )
    })?;
    Ok((themes, path.display().to_string()))
}

/// The theme in each mode it is written for: **both, unless the intent names
/// one.**
///
/// Every token the stylesheet ships is a `light-dark()` pair, so a theme in one
/// mode is half a theme on a site that follows the operating system's setting.
/// An intent that names `scheme` gets that one mode.
///
/// # Errors
///
/// [`IntentError`] when the engine refuses the intent in either mode.
pub fn modes(intent: &ThemeIntent) -> Result<Vec<Theme>, IntentError> {
    let schemes = intent
        .scheme
        .map_or_else(|| vec![Scheme::Light, Scheme::Dark], |one| vec![one]);
    schemes
        .into_iter()
        .map(|scheme| {
            derive_theme(&ThemeIntent {
                scheme: Some(scheme),
                ..intent.clone()
            })
        })
        .collect()
}

/// The word a mode is written as, in the intent and in a report.
#[must_use]
pub fn scheme_name(scheme: Scheme) -> &'static str {
    match scheme {
        Scheme::Dark => "dark",
        Scheme::Light => "light",
    }
}

/// Every violation in every mode, each named by its mode where there are two.
#[must_use]
pub fn violations(themes: &[Theme]) -> Vec<String> {
    themes
        .iter()
        .flat_map(|theme| {
            let mode = (themes.len() > 1).then(|| scheme_name(theme.intent.scheme));
            theme.violations.iter().map(move |line| match mode {
                Some(mode) => format!("{mode}: {line}"),
                None => line.clone(),
            })
        })
        .collect()
}
