//! `helix api anatomy`: what each element of a family is made of, on the web
//! and on React Native, as the installed `api.json` records it.
//!
//! **Read, never computed.** `analyze` writes each styled element's anatomy
//! from the compiler's intermediate form into `api.json`, so this prints what
//! the installed version draws, as `helix api family` does for its API.

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::say;
use serde_json::{json, Value};

use super::{family, text};

/// Each element of a family with the anatomy its package records.
///
/// # Errors
///
/// [`Failure`] where no package is installed, nothing answers to `name`, or
/// the installed package records no anatomy for the family.
pub fn anatomy(from: &std::path::Path, name: &str, tier: Option<&str>) -> Outcome<Value> {
    let found = family(from, name, tier)?;
    /* The root first, then the rest in the order the family lists them. */
    let mut listed: Vec<&Value> = found["family"]["elements"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|element| element["anatomy"].is_object())
        .collect();
    listed.sort_by_key(|element| element["part"] != "Root");
    let elements: Vec<Value> = listed
        .into_iter()
        .map(|element| {
            json!({
                "anatomy": element["anatomy"],
                "component": element["platforms"]["react-native"]["component"],
                "tag": element["tagName"],
            })
        })
        .collect();
    let slug = text(&found["family"]["slug"]);
    if elements.is_empty() {
        return Err(Failure::input(
            format!("no anatomy for `{slug}`"),
            format!(
                "{} {} records no anatomy for it. A styled element's anatomy is in `api.json` from the release that adds it.",
                text(&found["package"]),
                text(&found["version"])
            ),
        ));
    }
    Ok(json!({
        "anatomy": elements,
        "family": slug,
        "package": found["package"],
        "version": found["version"],
    }))
}

/// Prints each element's two trees, the web's and the phone's.
pub fn print(answer: &Value) {
    for (index, element) in answer["anatomy"]
        .as_array()
        .into_iter()
        .flatten()
        .enumerate()
    {
        if index > 0 {
            say!();
        }
        let tag = text(&element["tag"]);
        let anatomy = &element["anatomy"];
        say!("<{tag}>");
        side(&anatomy["web"], "#shadow-root");
        if let Some(component) = element["component"].as_str() {
            if anatomy["native"].is_object() {
                say!();
                say!("<{component}>");
                side(&anatomy["native"], "draws");
            }
        }
    }
}

/// One platform's host and tree, under the line that opens the tree.
fn side(side: &Value, opens: &str) {
    for taken in side["takes"].as_array().into_iter().flatten() {
        say!("  {}: {}", text(&taken["name"]), text(&taken["holds"]));
    }
    let listed = |field: &str| -> Vec<String> {
        side[field]
            .as_array()
            .into_iter()
            .flatten()
            .map(text)
            .collect()
    };
    let states = listed("states");
    if !states.is_empty() {
        say!("  states: {}", states.join(", "));
    }
    let sends = listed("sends");
    if !sends.is_empty() {
        say!("  sends: {}", sends.join(", "));
    }
    say!("  {opens}");
    for node in side["tree"].as_array().into_iter().flatten() {
        drawn(node, 2);
    }
}

fn drawn(node: &Value, depth: usize) {
    let says: Vec<String> = node["says"]
        .as_array()
        .into_iter()
        .flatten()
        .map(text)
        .collect();
    let indent = "  ".repeat(depth);
    if says.is_empty() {
        say!("{indent}{}", text(&node["draws"]));
    } else {
        say!("{indent}{}  {}", text(&node["draws"]), says.join(" "));
    }
    for child in node["children"].as_array().into_iter().flatten() {
        drawn(child, depth + 1);
    }
}
