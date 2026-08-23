//! The JSON shape a JavaScript consumer sees.
//!
//! **Shared by the boundary and the bless, so the two cannot disagree.** The
//! oracle records what a theme looks like from JavaScript and `check:wasm`
//! compares the boundary against those records; if each built its own object
//! literal, a renamed field would move both at once and the comparison would go
//! on passing.
//!
//! Hand-written rather than derived, and that is deliberate. These keys are the
//! published interface of `@helix-io/theme` and the Rust field names are not:
//! `chroma_reduced` is `chromaReduced` on the wire, `seeds` is an object where
//! the crate holds ordered pairs, and `Outcome` renders as the three strings the
//! TypeScript union had. A `rename_all` derive would produce most of that and
//! would silently rename anything added later, which is how a consumer's key
//! disappears in a release nobody thought touched them.

use serde_json::{Map, Value};

use crate::derive::report::Outcome;
use crate::derive::theme::Theme;

/// The whole theme, as JavaScript sees it.
/// Every pair, as JavaScript sees it.
pub fn pairings(theme: &Theme) -> Value {
    theme
        .pairings
        .iter()
        .map(|pairing| {
            let mut row = Map::new();
            row.insert("background".to_owned(), pairing.background.clone().into());
            row.insert("foreground".to_owned(), pairing.foreground.clone().into());
            optional(&mut row, "ratio", pairing.ratio);
            row.insert(
                "status".to_owned(),
                match pairing.status {
                    Outcome::Fail => "fail",
                    Outcome::Pass => "pass",
                    Outcome::Unverifiable => "unverifiable",
                }
                .into(),
            );
            row.insert("target".to_owned(), pairing.target.into());
            Value::Object(row)
        })
        .collect::<Vec<_>>()
        .into()
}

/// Every token, as JavaScript sees it.
pub fn tokens(theme: &Theme) -> Value {
    theme
        .tokens
        .iter()
        .map(|token| {
            let mut row = Map::new();
            row.insert("chromaReduced".to_owned(), token.chroma_reduced.into());
            /* **Absent, not null.** `contrast?: number` drops the key in
            TypeScript and a `None` would write `null`, which reads the same
            through `?? fallback` and differently through `'contrast' in token`,
            `Object.keys`, and any schema separating optional from nullable. */
            optional(&mut row, "contrast", token.contrast);
            row.insert("hex".to_owned(), token.hex.clone().into());
            row.insert("name".to_owned(), token.name.clone().into());
            row.insert("origin".to_owned(), token.origin.as_str().into());
            row.insert(
                "value".to_owned(),
                serde_json::json!({
                    "chroma": token.value.chroma,
                    "hue": token.value.hue,
                    "lightness": token.value.lightness,
                }),
            );
            Value::Object(row)
        })
        .collect::<Vec<_>>()
        .into()
}

/// The seeds, as an object.
pub fn seeds(theme: &Theme) -> Value {
    theme
        .seeds
        .iter()
        .map(|(name, value)| (name.clone(), Value::String(value.clone())))
        .collect::<Map<_, _>>()
        .into()
}

/// The whole theme, as JavaScript sees it.
///
/// Used by the WASM boundary. The bless builds its own rows from the three
/// functions above, because a theme in the oracle carries a `label` and a `css`
/// block that a live derivation has no business inventing.
#[cfg(feature = "wasm")]
pub fn report(theme: &Theme) -> Value {
    serde_json::json!({
        "collisions": theme.collisions,
        "pairings": pairings(theme),
        "seeds": seeds(theme),
        "tokens": tokens(theme),
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
fn optional(row: &mut Map<String, Value>, key: &str, value: Option<f64>) {
    if let Some(value) = value {
        row.insert(key.to_owned(), value.into());
    }
}
