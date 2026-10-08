//! The `helix api` answers as a person reads them. `--json` prints the answer
//! itself, which is what the MCP server returns.

use fusion_rules::say;
use serde_json::Value;

use super::text;

/// Prints one answer in the form `--json` asked for.
pub fn print(answer: &Value, json: bool) {
    if json {
        say!("{answer}");
        return;
    }
    if let Some(matches) = answer["matches"].as_array() {
        for found in matches {
            say!("{:<20} {}", text(&found["slug"]), text(&found["summary"]));
        }
        return;
    }
    if let Some(lines) = answer["lines"].as_array() {
        for line in lines {
            say!("{}", text(line));
        }
        for unknown in answer["unknown"].as_array().into_iter().flatten() {
            match unknown["closest"].as_str() {
                Some(closest) => eprintln!(
                    "helix: `{}` is in no installed package. The closest tag is `{closest}`.",
                    text(&unknown["tag"])
                ),
                None => eprintln!(
                    "helix: `{}` is in no installed package.",
                    text(&unknown["tag"])
                ),
            }
        }
        return;
    }
    if let Some(tokens) = answer["tokens"].as_array() {
        for token in tokens {
            say!("{}: {}", text(&token["name"]), text(&token["value"]));
        }
        return;
    }
    if answer["example"].is_object() {
        let example = &answer["example"];
        for line in example["imports"].as_array().into_iter().flatten() {
            say!("{}", text(line));
        }
        say!();
        say!("{}", text(&example["html"]));
        if let Some(css) = example["css"].as_str().filter(|css| !css.is_empty()) {
            say!();
            say!("{css}");
        }
        return;
    }
    let family = &answer["family"];
    say!(
        "{} ({} {})",
        text(&family["label"]),
        text(&answer["package"]),
        text(&answer["version"])
    );
    say!("{}", text(&family["summary"]));
    say!();
    let tier = family["elements"][0]["tier"].as_str().unwrap_or("styled");
    for line in family["usage"][tier].as_array().into_iter().flatten() {
        say!("{}", text(line));
    }
    for element in family["elements"].as_array().into_iter().flatten() {
        say!();
        say!("<{}>", text(&element["tagName"]));
        for property in element["properties"].as_array().into_iter().flatten() {
            say!("  {}: {}", text(&property["name"]), text(&property["type"]));
        }
        for event in element["events"].as_array().into_iter().flatten() {
            say!("  {} ({})", text(&event["name"]), text(&event["reactProp"]));
        }
    }
    let examples: Vec<String> = answer["examples"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|example| text(&example["slug"]))
        .collect();
    if !examples.is_empty() {
        say!();
        say!("examples: {}", examples.join(", "));
    }
}
