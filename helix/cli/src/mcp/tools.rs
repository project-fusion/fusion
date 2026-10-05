//! The tools, and why there are two of them.
//!
//! **Both are the derivation and neither is a lookup.** An agent asking what
//! `#c1272d` produces, or whether a palette it is proposing clears its contrast
//! targets, is asking a question whose answer does not exist until it is
//! computed. Everything a document can hold is a document: the manifest, the
//! token set, the examples, all of them URLs.
//!
//! The two split the way `build` and `audit` do, and for the same reason those
//! are two verbs over one computation: one hands back what to write and the other
//! hands back what was measured. An agent picking a brand color wants the second
//! long before it wants the first.

use fusion_helix_theme::css::{to_css, to_css_modes};
use fusion_helix_theme::derive::report::Outcome as Pair;
use fusion_helix_theme::intent::ThemeIntent;

use crate::theme::audit::measurement;
use crate::theme::{modes, violations};

/// What the tools take, described for a client that has never seen Helix.
///
/// **The intent is passed as the same JSON a `helix.theme.json` holds**, rather
/// than as a flattened set of parameters. One shape to document, one parser, and
/// an agent that has read the file format can already call the tool. A schema
/// enumerating every optional field here would be a third copy of it, after the
/// Rust struct and the starter file `helix theme init` writes.
fn intent_schema() -> serde_json::Value {
    serde_json::json!({
        "properties": {
            "intent": {
                "description": "A theme intent, the same JSON `helix.theme.json` holds. Every key is optional. `brand` is a hex color, and without one the theme is ink: near-black on a light page and near-white on a dark one. Without `scheme` (\"light\" or \"dark\") the theme is derived in both modes. Other keys include `contrastTarget` (4.5 for AA, 7 for AAA), `accent`, `background` (the page's color, `{ \"light\": hex, \"dark\": hex }`), `chroma`, `neutral`, `radius`, `density`, and `separation`.",
                "type": "object",
            },
        },
        "required": ["intent"],
        "type": "object",
    })
}

/// Every tool, as `tools/list` returns them.
pub fn catalog() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({
            "description": "Derives a complete Helix token set from a brand color, or from none for ink, and returns the CSS to write, with each color a `light-dark()` pair unless the intent names one mode. Every foreground and background pair meets its contrast target by construction. Use this when you need the actual custom properties for a theme.",
            "inputSchema": intent_schema(),
            "name": "helix_derive_theme",
        }),
        serde_json::json!({
            "description": "Measures every foreground against the ground it is really painted on and reports each pair with its ratio and target, plus any roles too close to tell apart. Use this to find out whether a brand color can produce an accessible palette before committing to it.",
            "inputSchema": intent_schema(),
            "name": "helix_audit_theme",
        }),
    ]
}

/// Runs one tool.
///
/// # Errors
///
/// The message to show the caller, which is prose rather than a code: the reader
/// is a model, and "cannot derive: brand is not a hex color" is a thing it can
/// act on where a number is not.
pub fn call(name: &str, arguments: &serde_json::Value) -> Result<String, String> {
    /* **The name is checked before the arguments are read**, never the other way
    round. Both tools take an intent, so parsing first tells a caller who
    misspelled a tool name that their intent is malformed. An error describing
    the wrong mistake is worse than a generic one: it sends the reader to fix
    something that is correct. */
    if name != "helix_audit_theme" && name != "helix_derive_theme" {
        return Err(format!(
            "no tool named {name}. This server has helix_audit_theme and helix_derive_theme."
        ));
    }
    let intent = read(arguments)?;
    let themes =
        modes(&intent).map_err(|failure| format!("cannot derive that intent: {failure}"))?;

    match name {
        "helix_audit_theme" => {
            let failed = themes
                .iter()
                .flat_map(|theme| &theme.pairings)
                .filter(|pairing| pairing.status == Pair::Fail)
                .count();
            /* The same shape `helix theme audit --json` emits, deliberately. Two
            representations of one report would be two things to keep true, and
            an agent that learned one has learned the other. */
            let mut report = measurement(&themes);
            report.insert("failed".to_owned(), failed.into());
            Ok(serde_json::Value::Object(report).to_string())
        }
        "helix_derive_theme" => {
            /* **Refused when it fails its own contract, the way `build` is.** A
            palette that does not meet the contrast it claims is the failure
            this engine exists to prevent, and handing one to a model that will
            paste it into a stylesheet is worse than handing it to a person who
            might read the warning above it. */
            let failing = violations(&themes);
            if !failing.is_empty() {
                return Err(format!(
                    "that intent derives a palette that fails its own contrast targets, so it is not returned. {}\n\nCall helix_audit_theme with the same intent to see every pair.",
                    failing.join(" ")
                ));
            }
            Ok(match themes.as_slice() {
                [light, dark] => to_css_modes(light, dark, ":root"),
                [one, ..] => to_css(one, ":root"),
                [] => unreachable!("an intent derives in at least one mode"),
            })
        }
        /* Unreachable: the guard above is exhaustive over the two names, and it
        is there rather than here so the message can be written once. */
        other => Err(format!("no tool named {other}")),
    }
}

/// Reads the intent out of the arguments.
///
/// **Accepts the intent bare as well as wrapped**, because a model that has read
/// the schema sends `{"intent": {...}}` and a model that has read the file format
/// sends `{"brand": "#..."}`, and both are the caller being reasonable. The
/// wrapped form is tried first so an intent that somehow has an `intent` key of
/// its own resolves the documented way.
fn read(arguments: &serde_json::Value) -> Result<ThemeIntent, String> {
    let body = arguments.get("intent").unwrap_or(arguments);
    serde_json::from_value(body.clone()).map_err(|failure| {
        format!("that is not a theme intent: {failure}. It is the JSON `helix.theme.json` holds, such as `{{\"brand\": \"#0b3d91\"}}`.")
    })
}
