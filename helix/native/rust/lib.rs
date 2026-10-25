//! Helix's theme engine on a phone, reached through `UniFFI`.
//!
//! **The engine is `fusion-helix-theme`, and this crate only carries it
//! across.** Hermes runs no WebAssembly, so a phone takes the same Rust as a
//! native library: a static library in an `XCFramework` on iOS, and a shared
//! library for each ABI on Android. `UniFFI` writes the Swift and the Kotlin
//! that call it, and the native module in `ios/theme` and `android/` hands
//! the result to JavaScript.
//!
//! **The intent crosses as JSON, the schema the WebAssembly boundary and
//! `helix theme build` read**, through the same reader, so an intent that
//! derives in a browser derives on a phone and one that is refused there is
//! refused here in the same words. What comes back is typed: each mode's
//! colors by their token name after `--helix-`, which is how the native
//! theme's modes are keyed, and each mode's violations.

use fusion_helix_theme::derive::theme::{derive_theme, Theme};
use fusion_helix_theme::intent::{Scheme, ThemeIntent};
use fusion_helix_theme::read::read;

uniffi::setup_scaffolding!("helix_theme");

/// One color the engine derived.
#[derive(Clone, Debug, PartialEq, Eq, uniffi::Record)]
pub struct DerivedColor {
    /// The color as sRGB hex, as the engine writes it into a stylesheet.
    pub hex: String,
    /// The token's name after `--helix-`, such as `color-primary`.
    pub name: String,
}

/// One mode's derivation.
#[derive(Clone, Debug, PartialEq, Eq, uniffi::Record)]
pub struct DerivedMode {
    /// Each color the engine derived, in the order it emits them.
    pub colors: Vec<DerivedColor>,
    /// Each pair that missed its contrast target, as a sentence.
    pub violations: Vec<String>,
}

/// An intent's derivation in each mode.
#[derive(Clone, Debug, PartialEq, Eq, uniffi::Record)]
pub struct DerivedModes {
    pub dark: DerivedMode,
    pub light: DerivedMode,
}

/// Why an intent was not derived.
#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum Refusal {
    /// The intent is not JSON, is not an intent, or is one the engine refuses.
    /// `reason` names the field it is about where there is one.
    #[error("{reason}")]
    Intent { reason: String },
}

/// Derives an intent in light and in dark mode.
///
/// `intent` is the JSON `@fusion.dev/helix-theme` takes, such as
/// `{"brand":"#3b82f6"}`. Its `scheme` is set aside, since both are derived,
/// as `deriveModes` sets it aside in a browser.
///
/// # Errors
///
/// [`Refusal::Intent`] when `intent` cannot be read, or the engine refuses it in
/// either mode.
#[uniffi::export]
pub fn derive_modes(intent: &str) -> Result<DerivedModes, Refusal> {
    let intent: ThemeIntent = read(intent, "").map_err(|reason| Refusal::Intent { reason })?;
    let in_mode = |scheme| {
        let mut one = intent.clone();
        one.scheme = Some(scheme);
        derive_theme(&one)
            .map(|theme| mode(&theme))
            .map_err(|refused| Refusal::Intent {
                reason: refused.to_string(),
            })
    };
    Ok(DerivedModes {
        dark: in_mode(Scheme::Dark)?,
        light: in_mode(Scheme::Light)?,
    })
}

fn mode(theme: &Theme) -> DerivedMode {
    DerivedMode {
        colors: theme
            .tokens
            .iter()
            .map(|token| DerivedColor {
                hex: token.hex.clone(),
                name: token.name.clone(),
            })
            .collect(),
        violations: theme.violations.clone(),
    }
}

#[cfg(test)]
mod tests;
