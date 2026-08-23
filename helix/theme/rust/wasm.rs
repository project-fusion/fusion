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

use crate::css::to_css;
use crate::derive::theme::derive_theme;
use crate::intent::ThemeIntent;

/// Derives a theme, and renders it under every selector asked for.
///
/// **One call, because a derivation is the expensive part and rendering is not.**
/// Measured in this build: 17ms to derive and a fraction of a millisecond to
/// render a block. The theme builder wants the same theme under two selectors,
/// one for the preview and one for the block a reader copies, so an
/// intent-in-CSS-out function would have it deriving twice for one keystroke.
/// The result carries `css` keyed by selector, empty when none were asked for.
///
/// For reference, the TypeScript engine this replaces took 39ms for the
/// derivation alone, so the builder does less work than it did rather than more.
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

/// Reads a hex colour into its OKLCH components, as JSON.
///
/// **Throws where the TypeScript returned `NaN`**, which is a deliberate change
/// and the same one `resolve` makes for a brand: `Number.parseInt` of something
/// that is not hex gives `NaN`, every comparison against which is false, so a
/// colour that could not be read travelled onward looking like a colour. A
/// caller passing the value of a colour input never sees this.
///
/// # Errors
///
/// When the string is not a hex colour.
#[wasm_bindgen(js_name = hexToOklch)]
pub fn hex_to_oklch_json(hex: &str) -> Result<String, JsError> {
    let color = crate::oklch::hex_to_oklch(hex)
        .ok_or_else(|| JsError::new(&format!("`{hex}` is not a hex colour")))?;
    Ok(serde_json::to_string(&serde_json::json!({
        "chroma": color.chroma,
        "hue": color.hue,
        "lightness": color.lightness,
    }))?)
}

/// The theme as the JavaScript shape, which is the TypeScript engine's shape.
///
/// **Hand-written rather than derived, and that is deliberate.** The keys here
/// are the published interface of `@helix-io/theme` and the Rust field names are
/// not: `chroma_reduced` is `chromaReduced` on the wire, `seeds` is an object
/// where the crate holds ordered pairs, and `Outcome` renders as the same three
/// strings the TypeScript's union has. A `rename_all` derive would produce most
/// of that and would silently rename anything added later, which is how a
/// consumer's key disappears in a release nobody thought touched them.
fn report(theme: &crate::derive::theme::Theme) -> serde_json::Value {
    use crate::derive::report::Outcome;
    serde_json::json!({
        "collisions": theme.collisions,
        "pairings": theme.pairings.iter().map(|pairing| {
            let mut row = serde_json::Map::new();
            row.insert("background".to_owned(), pairing.background.clone().into());
            row.insert("foreground".to_owned(), pairing.foreground.clone().into());
            optional(&mut row, "ratio", pairing.ratio);
            row.insert("status".to_owned(), match pairing.status {
                Outcome::Fail => "fail",
                Outcome::Pass => "pass",
                Outcome::Unverifiable => "unverifiable",
            }.into());
            row.insert("target".to_owned(), pairing.target.into());
            serde_json::Value::Object(row)
        }).collect::<Vec<_>>(),
        "seeds": theme
            .seeds
            .iter()
            .map(|(name, value)| (name.clone(), serde_json::Value::String(value.clone())))
            .collect::<serde_json::Map<_, _>>(),
        "tokens": theme.tokens.iter().map(|token| {
            let mut row = serde_json::Map::new();
            row.insert("chromaReduced".to_owned(), token.chroma_reduced.into());
            optional(&mut row, "contrast", token.contrast);
            row.insert("hex".to_owned(), token.hex.clone().into());
            row.insert("name".to_owned(), token.name.clone().into());
            row.insert("origin".to_owned(), token.origin.as_str().into());
            row.insert("value".to_owned(), serde_json::json!({
                "chroma": token.value.chroma,
                "hue": token.value.hue,
                "lightness": token.value.lightness,
            }));
            serde_json::Value::Object(row)
        }).collect::<Vec<_>>(),
        "violations": theme.violations,
    })
}

/// **An absent optional key is absent, not `null`.**
///
/// TypeScript writes `contrast?: number` and `JSON.stringify` drops the key when
/// it is `undefined`; `serde_json` writes `null` for a `None`, which is a
/// different document. It reads the same through `token.contrast ?? fallback`
/// and differently through `'contrast' in token`, `Object.keys`, an equality
/// check on the serialised form, and any schema that distinguishes optional from
/// nullable.
///
/// Found by the check that compares the two, on the first token of the first
/// theme, which is the argument for that check existing: nothing in either
/// language would have mentioned it, and the wrapper is a *replacement* for the
/// engine whose shape it has to keep.
fn optional(row: &mut serde_json::Map<String, serde_json::Value>, key: &str, value: Option<f64>) {
    if let Some(value) = value {
        row.insert(key.to_owned(), value.into());
    }
}
