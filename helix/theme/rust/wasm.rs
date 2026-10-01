//! The JavaScript boundary.
//!
//! **One implementation, two distributions.** The crate is the engine and this
//! is how a browser reaches it, which is the whole reason the port was a move
//! rather than a second engine: `fit_to_gamut` is a twenty-step bisection and
//! `lightness_for_contrast` searches too, so iteration count, bisection order and
//! float arithmetic are implementation choices, and two implementations disagree
//! by construction rather than by accident.
//!
//! **JSON across the boundary, not a bound object graph.** `serde-wasm-bindgen`
//! would map the intent field by field and would have to be kept in step with
//! the schema in a third place; a string is the same schema the CLI already
//! reads, through the same reader, so a file that works in `helix theme build`
//! works here and there is one parser to be wrong. The cost is a `JSON.stringify`
//! per call on an object with a dozen keys, which is nothing beside a derivation
//! that runs several hundred bisections.
//!
//! **Errors are `JsError`, so they arrive as exceptions rather than as a shape
//! the caller has to inspect.** A derivation either produces a theme or refuses
//! the intent, and a caller who forgets to check a returned discriminant gets a
//! theme-shaped object full of nothing.

use wasm_bindgen::prelude::*;

use crate::css::{to_css, to_css_modes};
use crate::derive::theme::derive_theme;
use crate::intent::{Scheme, ThemeIntent};
use crate::shape::report;

/// Derives a theme, and renders it under every selector asked for.
///
/// **One call, because a derivation is the expensive part and rendering is not.**
/// Measured in this build: 17ms to derive and a fraction of a millisecond to
/// render a block. The theme builder wants the same theme under two selectors,
/// one for the preview and one for the block a reader copies, so an
/// intent-in-CSS-out function would have it deriving twice for one keystroke.
/// The result carries `css` keyed by selector, empty when none were asked for.
///
/// `selectors` is a JSON array, keeping the boundary uniformly JSON in and JSON
/// out rather than mixing in a bound array type for one argument.
///
/// # Errors
///
/// When either argument is not the JSON it should be, or when the engine refuses
/// the intent.
#[wasm_bindgen(js_name = derive)]
pub fn derive(intent: &str, selectors: &str) -> Result<String, JsError> {
    let intent: ThemeIntent = serde_json::from_str(intent)?;
    let selectors: Vec<String> = serde_json::from_str(selectors)?;
    let theme = derive_theme(&intent)?;

    let mut report = report(&theme);
    let blocks = selectors
        .into_iter()
        .map(|selector| {
            let block = to_css(&theme, &selector);
            (selector, serde_json::Value::String(block))
        })
        .collect::<serde_json::Map<_, _>>();
    report["css"] = serde_json::Value::Object(blocks);
    Ok(serde_json::to_string(&report)?)
}

/// Derives a theme in both modes, and renders them as one block under every
/// selector asked for, each color a `light-dark()` pair.
///
/// The intent's own `scheme` is set aside, since both are derived. The result
/// carries each mode's report, `light` and `dark`, so a finding in either is
/// still read, and `css` keyed by selector.
///
/// # Errors
///
/// When either argument is not the JSON it should be, or when the engine refuses
/// the intent in either mode.
#[wasm_bindgen(js_name = deriveModes)]
pub fn derive_modes(intent: &str, selectors: &str) -> Result<String, JsError> {
    let intent: ThemeIntent = serde_json::from_str(intent)?;
    let selectors: Vec<String> = serde_json::from_str(selectors)?;
    let in_mode = |scheme| {
        let mut one = intent.clone();
        one.scheme = Some(scheme);
        derive_theme(&one)
    };
    let light = in_mode(Scheme::Light)?;
    let dark = in_mode(Scheme::Dark)?;

    let blocks = selectors
        .into_iter()
        .map(|selector| {
            let block = to_css_modes(&light, &dark, &selector);
            (selector, serde_json::Value::String(block))
        })
        .collect::<serde_json::Map<_, _>>();
    /* Each mode's report as `derive` returns one, `css` and all, empty here
    because the block is the pair's. */
    let alone = |theme| {
        let mut one = report(theme);
        one["css"] = serde_json::Value::Object(serde_json::Map::new());
        one
    };
    Ok(serde_json::to_string(&serde_json::json!({
        "css": blocks,
        "dark": alone(&dark),
        "light": alone(&light),
    }))?)
}

/// Reads a hex color into its OKLCH components, as JSON.
///
/// **Throws rather than returning a `NaN` triple**, which is the decision
/// `resolve` makes for a brand: every comparison against `NaN` is false, so a
/// color that could not be read travels onward looking like a color. A caller
/// passing the value of a color input never sees this.
///
/// # Errors
///
/// When the string is not a hex color.
#[wasm_bindgen(js_name = hexToOklch)]
pub fn hex_to_oklch_json(hex: &str) -> Result<String, JsError> {
    let color = crate::oklch::hex_to_oklch(hex)
        .ok_or_else(|| JsError::new(&format!("`{hex}` is not a hex color")))?;
    Ok(serde_json::to_string(&serde_json::json!({
        "chroma": color.chroma,
        "hue": color.hue,
        "lightness": color.lightness,
    }))?)
}
