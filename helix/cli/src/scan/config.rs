//! The project's `helix-diagnostics.json`, read as the page reads it.
//!
//! **One shape, from the same file, with the same refusals.** `config.ts` and
//! `rules.ts` in `@fusion.dev/helix-diagnostics` say what a project may set and
//! throw on a setting that names nothing, naming the closest. A scan that
//! accepted what the page refuses would let one file mean two things, so the
//! table and every sentence here are those files', ported.

use serde_json::{json, Map, Value};

use super::identity::{nearest, shipped, KINDS};

/// The categories a run holds, each sent or withheld.
pub const CATEGORIES: [&str; 7] = [
    "assist",
    "configuration",
    "coverage",
    "findings",
    "performance",
    "runtime",
    "usage",
];

/// What one setting may take.
enum Takes {
    /// One of these values.
    One(Vec<Value>),
    /// A string.
    Text,
    /// A list of strings.
    Tags,
    /// `true`, `false`, or an address on a local host.
    Address,
    /// `false`, or `{ sample }` from 0 to 1.
    Sample,
}

fn allowed(section: &str) -> Option<Vec<(&'static str, Takes)>> {
    let on_off = || Takes::One(vec![Value::Bool(true), Value::Bool(false)]);
    let words = |list: &[&str]| {
        Takes::One(
            list.iter()
                .map(|one| Value::String((*one).to_owned()))
                .collect(),
        )
    };
    Some(match section {
        "console" => vec![
            ("coverage", words(&["info", "off"])),
            ("findings", words(&["error", "warn", "info", "off"])),
            ("performance", words(&["info", "off"])),
            ("runtime", words(&["warn", "off"])),
            ("usage", words(&["debug", "off"])),
        ],
        "core" => vec![("warnings", on_off())],
        "detail" => vec![
            ("evidence", words(&["full", "selector", "none"])),
            ("hookValues", on_off()),
            ("pages", words(&["patterns", "full", "none"])),
        ],
        "environments" => vec![
            ("ci", on_off()),
            ("development", on_off()),
            ("production", Takes::Sample),
        ],
        "project" => vec![
            ("key", Takes::Text),
            ("name", Takes::Text),
            ("tags", Takes::Tags),
        ],
        "send" => CATEGORIES
            .iter()
            .map(|category| (*category, on_off()))
            .collect(),
        "sinks" => vec![("overlay", on_off()), ("relay", Takes::Address)],
        _ => return None,
    })
}

/// Every section, in the order the page offers them as suggestions.
const SECTIONS: [&str; 8] = [
    "console",
    "core",
    "detail",
    "environments",
    "project",
    "send",
    "sinks",
    "rules",
];

/// Whether `address` is an origin on a local host, as the page asks.
fn local(address: &str) -> bool {
    let Some(rest) = address
        .strip_prefix("http://")
        .or_else(|| address.strip_prefix("https://"))
    else {
        return false;
    };
    if rest.is_empty() || rest.contains(['/', '?', '#', '@']) {
        return false;
    }
    let host = if rest.starts_with('[') {
        rest.split_inclusive(']').next().unwrap_or("")
    } else {
        rest.split(':').next().unwrap_or("")
    }
    .to_ascii_lowercase();
    matches!(host.as_str(), "localhost" | "127.0.0.1" | "[::1]")
        || [".localhost", ".test"].iter().any(|suffix| {
            host.strip_suffix(suffix)
                .is_some_and(|name| !name.is_empty())
        })
}

/// A value's name in a sentence: a string in backticks, anything else as JSON.
fn shown(value: &Value) -> String {
    match value {
        Value::String(text) => format!("`{text}`"),
        other => other.to_string(),
    }
}

/// Refuses a setting that names nothing, or a value it cannot take, with the
/// page's sentence.
pub fn check(config: &Value, layer: &str) -> Result<(), String> {
    let Some(sections) = config.as_object() else {
        return Err(format!("The {layer} is not a configuration object."));
    };
    for (section, value) in sections {
        if section == "rules" {
            check_rules(value, layer)?;
            continue;
        }
        let Some(table) = allowed(section) else {
            let close = nearest(section, SECTIONS, None);
            return Err(format!(
                "The {layer} sets `{section}`, which is no setting.{}",
                close.map_or(String::new(), |close| format!(" The closest is `{close}`."))
            ));
        };
        let Some(entries) = value.as_object() else {
            continue;
        };
        for (name, one) in entries {
            let Some((_, takes)) = table.iter().find(|(key, _)| key == name) else {
                let close = nearest(name, table.iter().map(|(key, _)| *key), None);
                return Err(format!(
                    "The {layer} sets `{section}.{name}`, which is no setting.{}",
                    close.map_or(String::new(), |close| format!(
                        " The closest is `{section}.{close}`."
                    ))
                ));
            };
            let fits = match takes {
                Takes::Text => one.is_string(),
                Takes::Tags => one
                    .as_array()
                    .is_some_and(|list| list.iter().all(Value::is_string)),
                Takes::Address => one.is_boolean() || one.as_str().is_some_and(local),
                Takes::Sample => {
                    *one == Value::Bool(false)
                        || one
                            .get("sample")
                            .and_then(Value::as_f64)
                            .is_some_and(|sample| (0.0..=1.0).contains(&sample))
                }
                Takes::One(values) => values.contains(one),
            };
            if !fits {
                let expected = match takes {
                    Takes::Text => "a string".to_owned(),
                    Takes::Tags => "a list of strings".to_owned(),
                    Takes::Address => "`true`, `false`, or an address on a local host, such as `http://127.0.0.1:7417`".to_owned(),
                    Takes::Sample => "`false`, or `{ sample }` from 0 to 1".to_owned(),
                    Takes::One(values) => values.iter().map(shown).collect::<Vec<_>>().join(", "),
                };
                return Err(format!(
                    "The {layer} sets `{section}.{name}` to `{one}`. It takes {expected}."
                ));
            }
        }
    }
    Ok(())
}

/// Refuses an override that would silently do nothing.
fn check_rules(rules: &Value, layer: &str) -> Result<(), String> {
    let Some(rules) = rules.as_object() else {
        return Ok(());
    };
    for (kind, value) in rules {
        if !KINDS.contains(&kind.as_str()) {
            let close = nearest(kind, KINDS, None);
            return Err(format!(
                "The {layer} overrides `{kind}`, which is no kind of finding.{}",
                close.map_or_else(
                    || format!(" The kinds are {}.", KINDS.join(", ")),
                    |close| format!(" The closest is `{close}`.")
                )
            ));
        }
        let list = match value {
            Value::Array(list) => list.clone(),
            one => vec![one.clone()],
        };
        for one in list {
            let severity = one
                .as_str()
                .or_else(|| one.get("severity").and_then(Value::as_str));
            if !severity
                .is_some_and(|severity| ["error", "info", "off", "warn"].contains(&severity))
            {
                return Err(format!(
                    "The {layer} sets `{kind}` to `{}`. A severity is error, warn, info, or off.",
                    severity.map_or_else(
                        || one
                            .get("severity")
                            .map_or_else(|| "undefined".to_owned(), ToString::to_string),
                        str::to_owned
                    )
                ));
            }
            if one.is_object()
                && one
                    .get("tags")
                    .and_then(Value::as_array)
                    .is_none_or(Vec::is_empty)
            {
                return Err(format!(
                    "The {layer} scopes `{kind}` with no tags. Give the tags it applies to, or set the severity alone."
                ));
            }
        }
    }
    Ok(())
}

/// The settings in effect: the shipped defaults with the file over them.
pub struct Resolved {
    /// The report's `configuration`, before the overrides and what they silenced.
    pub configuration: Map<String, Value>,
    /// The project's name and labels. The key is never written into a run.
    pub project: Value,
    /// The file's rules, where it has any.
    pub rules: Option<Value>,
    /// Each category's sending, and which place decided it.
    pub send: Vec<(&'static str, bool, &'static str)>,
}

impl Resolved {
    /// Whether hook values go with the hooks a run counts.
    pub fn hook_values(&self) -> bool {
        self.configuration
            .get("detail")
            .and_then(|detail| detail.get("hookValues"))
            .and_then(Value::as_bool)
            .unwrap_or(true)
    }
}

/// The shipped defaults, merged with the file section by section.
pub fn resolve(file: Option<&Value>) -> Resolved {
    let defaults = json!({
        "console": { "coverage": "info", "findings": "info", "performance": "off", "runtime": "warn", "usage": "debug" },
        "core": { "warnings": true },
        "detail": { "evidence": "full", "hookValues": true, "pages": "patterns" },
        "environments": { "ci": true, "development": true, "production": false },
        "sinks": { "overlay": true, "relay": false },
    });
    let mut configuration = Map::new();
    for section in ["console", "core", "detail", "environments", "sinks"] {
        let mut merged = defaults[section].as_object().cloned().unwrap_or_default();
        if let Some(given) = file
            .and_then(|file| file.get(section))
            .and_then(Value::as_object)
        {
            for (key, value) in given {
                merged.insert(key.clone(), value.clone());
            }
        }
        configuration.insert(section.to_owned(), Value::Object(merged));
    }
    let send_defaults = [
        ("assist", true),
        ("configuration", true),
        ("coverage", true),
        ("findings", true),
        ("performance", false),
        ("runtime", true),
        ("usage", true),
    ];
    let send = send_defaults
        .iter()
        .map(|(category, on)| {
            match file
                .and_then(|file| file.pointer(&format!("/send/{category}")))
                .and_then(Value::as_bool)
            {
                Some(given) => (*category, given, "file"),
                None => (*category, *on, "shipped"),
            }
        })
        .collect();
    let project = file.and_then(|file| file.get("project"));
    let mut written = Map::new();
    if let Some(name) = project
        .and_then(|project| project.get("name"))
        .and_then(Value::as_str)
    {
        written.insert("name".to_owned(), json!(name));
    }
    written.insert(
        "tags".to_owned(),
        project
            .and_then(|project| project.get("tags"))
            .cloned()
            .unwrap_or_else(|| json!([])),
    );
    Resolved {
        configuration,
        project: Value::Object(written),
        rules: file.and_then(|file| file.get("rules")).cloned(),
        send,
    }
}

/// The severity of one finding after the shipped rule and the file, with the
/// layer that decided it, or `off`.
///
/// An override scoped to the finding's tag outranks one that is not.
pub fn severity(rules: Option<&Value>, kind: &str, tag: &str) -> (String, &'static str) {
    let Some(value) = rules.and_then(|rules| rules.get(kind)) else {
        return (shipped(kind).to_owned(), "shipped");
    };
    let list = match value {
        Value::Array(list) => list.clone(),
        one => vec![one.clone()],
    };
    let scoped = list.iter().find_map(|one| {
        let tags = one.get("tags")?.as_array()?;
        tags.iter()
            .any(|one| one.as_str() == Some(tag))
            .then(|| {
                one.get("severity")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
            })
            .flatten()
    });
    if let Some(severity) = scoped {
        return (severity, "file");
    }
    match list.iter().find_map(Value::as_str) {
        Some(plain) => (plain.to_owned(), "file"),
        None => (shipped(kind).to_owned(), "shipped"),
    }
}

/// Every override in the file, flattened, for the run's `configuration`.
pub fn overrides(rules: Option<&Value>) -> Vec<Value> {
    let Some(rules) = rules.and_then(Value::as_object) else {
        return Vec::new();
    };
    rules
        .iter()
        .flat_map(|(kind, value)| {
            let list = match value {
                Value::Array(list) => list.clone(),
                one => vec![one.clone()],
            };
            list.into_iter().map(move |one| match one {
                Value::String(severity) => {
                    json!({ "kind": kind, "layer": "file", "severity": severity })
                }
                other => json!({
                    "kind": kind,
                    "layer": "file",
                    "severity": other.get("severity").cloned().unwrap_or(Value::Null),
                    "tags": other.get("tags").cloned().unwrap_or_else(|| json!([])),
                }),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{check, resolve, severity};

    #[test]
    fn a_setting_that_names_nothing_names_the_closest() {
        let refused = check(&json!({ "detial": {} }), "file").expect_err("refused");
        assert_eq!(
            refused,
            "The file sets `detial`, which is no setting. The closest is `detail`."
        );
        let refused = check(&json!({ "send": { "usages": true } }), "file").expect_err("refused");
        assert_eq!(
            refused,
            "The file sets `send.usages`, which is no setting. The closest is `send.usage`."
        );
        /* Two edits in a five-letter name is past a third of it, so the page
        names nothing, and neither does this. */
        let refused = check(&json!({ "send": { "usgae": true } }), "file").expect_err("refused");
        assert_eq!(refused, "The file sets `send.usgae`, which is no setting.");
        let refused =
            check(&json!({ "rules": { "dead-hok": "off" } }), "file").expect_err("refused");
        assert_eq!(
            refused,
            "The file overrides `dead-hok`, which is no kind of finding. The closest is `dead-hook`."
        );
    }

    #[test]
    fn a_scoped_override_outranks_a_plain_one() {
        let rules = json!({ "dead-hook": ["warn", { "severity": "off", "tags": ["helix-card"] }] });
        assert_eq!(
            severity(Some(&rules), "dead-hook", "helix-card"),
            ("off".to_owned(), "file")
        );
        assert_eq!(
            severity(Some(&rules), "dead-hook", "helix-tag"),
            ("warn".to_owned(), "file")
        );
        assert_eq!(
            severity(None, "dead-part", "helix-tag"),
            ("error".to_owned(), "shipped")
        );
    }

    #[test]
    fn the_file_wins_over_the_defaults_section_by_section() {
        let resolved = resolve(Some(
            &json!({ "detail": { "hookValues": false }, "send": { "usage": false } }),
        ));
        assert!(!resolved.hook_values());
        assert!(resolved.send.contains(&("usage", false, "file")));
    }
}
