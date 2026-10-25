//! The `helix api` answers as a person reads them. `--json` prints the answer
//! itself, which is what the MCP server returns.

use fusion_rules::say;
use serde_json::Value;

use super::text;

/// What an element is called on React Native, where Helix draws it there:
/// the component, then each slot's and event's prop beside its web name.
fn native(drawn: &Value) {
    let Some(component) = drawn["component"].as_str() else {
        return;
    };
    say!("  on React Native: <{component}>");
    for slot in drawn["slots"].as_array().into_iter().flatten() {
        let name = text(&slot["name"]);
        let web = if name.is_empty() {
            "the default slot".to_owned()
        } else {
            format!("slot {name}")
        };
        say!("    {} ({web})", text(&slot["prop"]));
    }
    for event in drawn["events"].as_array().into_iter().flatten() {
        say!("    {} ({})", text(&event["prop"]), text(&event["name"]));
    }
    let omitted: Vec<String> = drawn["omitted"]
        .as_array()
        .into_iter()
        .flatten()
        .map(text)
        .collect();
    if !omitted.is_empty() {
        say!("    leaves out {}", omitted.join(", "));
    }
}

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
    /* Every package the family was read from, with its version, so two
    installed at different versions say so. */
    let read: Vec<String> = answer["versions"]
        .as_object()
        .map(|all| {
            all.iter()
                .map(|(package, version)| format!("{package} {}", text(version)))
                .collect()
        })
        .unwrap_or_default();
    say!("{} ({})", text(&family["label"]), read.join(", "));
    if let Some(missing) = answer["missing"].as_str() {
        say!("{missing}");
    }
    say!("{}", text(&family["summary"]));
    if let Some(platforms) = family["platforms"].as_object() {
        let each: Vec<String> = platforms
            .iter()
            .map(|(platform, one)| format!("{platform} {}", text(&one["status"])))
            .collect();
        say!("platforms: {}", each.join(", "));
    }
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
        native(&element["platforms"]["react-native"]);
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
