//! The tools: five lookups, two checks, and two derivations.
//!
//! **The lookups answer from the installed packages.** Each is one decision an
//! agent makes while writing a page: which family, what it takes, an example
//! to start from, what to import, which token. Each reads the `api.json`,
//! `examples.json`, and `tokens.json` the project's Helix packages ship, so an
//! answer is the installed version's and names it. Each is a `helix api` verb
//! as well, so a script and an agent get the same answer from one function.
//!
//! **The check is `helix scan` on the agent's own code**: files in the
//! project, or a snippet before it is written, judged against everything the
//! project installs and imports, with the findings in the scan's own shape.
//! **The page check is its other half**: the agent's page, opened headless and
//! diagnosed as it runs, which finds what a read of the code cannot.
//!
//! **The derivations answer what no file can hold**: what a brand color
//! derives to, and whether it clears its contrast targets. They split the way
//! `build` and `audit` do, one handing back what to write and the other what
//! was measured.
//!
//! **Every result is structured**, with an `outputSchema` it conforms to and
//! the same object as JSON text for a client that reads only text.

use std::fmt::Write;
use std::path::Path;

use fusion_helix_theme::css::{to_css, to_css_modes};
use fusion_helix_theme::intent::ThemeIntent;
use fusion_rules::error::Failure;
use serde_json::{json, Value};

use crate::api;
use crate::theme::audit::measurement;
use crate::theme::{modes, violations};

/// What a tool hands back: the structured result and the text beside it.
pub struct Answer {
    pub structured: Value,
    pub text: String,
}

impl Answer {
    fn of(structured: Value) -> Self {
        Self {
            text: structured.to_string(),
            structured,
        }
    }
}

/// What the tools take, described for a client that has never seen Helix.
///
/// **The intent is passed as the same JSON a `helix.theme.json` holds**, rather
/// than as a flattened set of parameters. One shape to document, one parser, and
/// an agent that has read the file format can already call the tool. A schema
/// enumerating every optional field here would be a third copy of it, after the
/// Rust struct and the starter file `helix theme init` writes.
fn intent_schema() -> Value {
    json!({
        "properties": {
            "intent": {
                "description": "A theme intent, the same JSON `helix.theme.json` holds. Every key is optional. `brand` is a hex color, or `{ \"light\": hex, \"dark\": hex }` for one per mode, and without one the theme is ink: near-black on a light page and near-white on a dark one. Without `scheme` (\"light\" or \"dark\") the theme is derived in both modes. Other keys include `contrastTarget` (4.5 for AA, 7 for AAA), `accent`, `background` (the page's color, `{ \"light\": hex, \"dark\": hex }`), `chroma`, `neutral`, `radius`, `density`, and `separation`.",
                "type": "object",
            },
        },
        "required": ["intent"],
        "type": "object",
    })
}

/// The annotations a tool carries: none of them writes anything, and the
/// same call gives the same answer. Only the page check reaches past the
/// project, to the page it is given.
fn annotations(title: &str) -> Value {
    with_world(title, false)
}

/// The annotations, with whether the tool reaches anything outside the
/// project.
fn with_world(title: &str, open: bool) -> Value {
    json!({
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": open,
        "readOnlyHint": true,
        "title": title,
    })
}

/// An input schema of string arguments, the named ones required.
fn strings(properties: &[(&str, &str)], required: &[&str]) -> Value {
    let properties: serde_json::Map<String, Value> = properties
        .iter()
        .map(|(name, description)| {
            (
                (*name).to_owned(),
                json!({ "description": description, "type": "string" }),
            )
        })
        .collect();
    json!({ "properties": properties, "required": required, "type": "object" })
}

/// An output schema: an object with these keys required, each of this type.
fn output(keys: &[(&str, &str)]) -> Value {
    let properties: serde_json::Map<String, Value> = keys
        .iter()
        .map(|(name, kind)| ((*name).to_owned(), json!({ "type": kind })))
        .collect();
    let required: Vec<&str> = keys.iter().map(|(name, _)| *name).collect();
    json!({ "properties": properties, "required": required, "type": "object" })
}

const TIER: (&str, &str) = (
    "tier",
    "`styled` or `headless`. Defaults to the styled tier where it is installed.",
);

/// Every tool, as `tools/list` returns them.
pub fn catalog() -> Vec<Value> {
    vec![
        json!({
            "annotations": annotations("Find a Helix family"),
            "description": "Finds the Helix families that answer a name, an alias, a tag, a native element such as `button` or `h1`, or a purpose, such as `dropdown` or `date picker`, best first. Use it before writing a component you have not looked up. Each match has its slug, which helix_family takes.",
            "inputSchema": {
                "properties": {
                    "limit": { "description": "How many families to list. Defaults to 10.", "type": "integer" },
                    "query": { "description": "A name, alias, tag, or a few words of purpose.", "type": "string" },
                },
                "required": ["query"],
                "type": "object",
            },
            "name": "helix_find",
            "outputSchema": output(&[("matches", "array"), ("query", "string"), ("versions", "object")]),
            "title": "Find a Helix family",
        }),
        json!({
            "annotations": annotations("Read a Helix family"),
            "description": "Returns one Helix family's API from the installed package: each tag with its properties and their literal unions, attributes, events with the exact React prop, slots, parts, custom properties, custom states, the properties registerWords translates, and `usage`, the import lines to copy. Write only what it lists. Lists the family's examples by slug for helix_example.",
            "inputSchema": strings(&[("family", "The family's slug, label, alias, or one of its tags, such as `select` or `helix-option`."), TIER], &["family"]),
            "name": "helix_family",
            "outputSchema": output(&[("examples", "array"), ("family", "object"), ("package", "string"), ("version", "string")]),
            "title": "Read a Helix family",
        }),
        json!({
            "annotations": annotations("Read a Helix example"),
            "description": "Returns one example of a Helix family as HTML and TSX, with its stylesheet and `imports`, the import lines that register every element it writes. Copy the imports with the markup. Where the example is pictured, `renders` links its canonical pictures, wide, narrow, and dark, taken in `environment`: compare a render of your own to them.",
            "inputSchema": strings(&[("family", "The family's slug, label, alias, or one of its tags."), ("example", "The example's slug, from helix_family. Defaults to the family's preview."), TIER], &["family"]),
            "name": "helix_example",
            "outputSchema": output(&[("example", "object"), ("family", "string"), ("package", "string"), ("renders", "array"), ("version", "string")]),
            "title": "Read a Helix example",
        }),
        json!({
            "annotations": annotations("Import Helix tags"),
            "description": "Returns the import lines that register the given tags, such as `helix-select` and `helix-option`, and lists any tag no installed package publishes with the closest one. Call it with every tag a file writes.",
            "inputSchema": {
                "properties": {
                    "tags": { "description": "The tags a page writes.", "items": { "type": "string" }, "type": "array" },
                },
                "required": ["tags"],
                "type": "object",
            },
            "name": "helix_imports",
            "outputSchema": output(&[("lines", "array"), ("unknown", "array"), ("versions", "object")]),
            "title": "Import Helix tags",
        }),
        json!({
            "annotations": annotations("Find Helix tokens"),
            "description": "Returns the semantic tokens, the custom properties to style with, filtered by a word in the name or description and by category, each with its value and description. Read these and never a `--_helix-` primitive.",
            "inputSchema": strings(&[("query", "A word in the token's name or description, such as `surface`."), ("category", "Only this category, such as `color` or `space`.")], &[]),
            "name": "helix_tokens",
            "outputSchema": output(&[("categories", "array"), ("package", "string"), ("tokens", "array"), ("version", "string")]),
            "title": "Find Helix tokens",
        }),
        json!({
            "annotations": annotations("Check Helix code"),
            "description": "Checks Helix code you wrote against the installed packages, as `helix scan` does: unknown tags, attributes, values, slots, parts, hooks, events, and tokens, a `--_helix-` primitive read, `[disabled]` on a form control, a tag whose entry nothing imports, a native element a Helix family replaces, an interactive element inside a button or a link, and `\"false\"` on an attribute that is on wherever it is present. Pass `files`, paths in the project, or `code` with its `language`. The whole project is read, so imports elsewhere count. Fix every finding at `error`.",
            "inputSchema": {
                "properties": {
                    "code": { "description": "A snippet to check before you write it.", "type": "string" },
                    "files": { "description": "Paths of files in the project, relative to it.", "items": { "type": "string" }, "type": "array" },
                    "language": { "description": "The snippet's language: `tsx`, `jsx`, `html`, `vue`, `svelte`, `css`, and the like. Defaults to `tsx`.", "type": "string" },
                },
                "type": "object",
            },
            "name": "helix_check",
            "outputSchema": output(&[("counts", "object"), ("findings", "array"), ("unsettled", "array"), ("versions", "object")]),
            "title": "Check Helix code",
        }),
        json!({
            "annotations": with_world("Check a Helix page", true),
            "description": "Opens each page headless and runs the installed Helix diagnostics in it once it holds still, as `helix diagnostics --once` does: what a read of the code cannot see, such as a part that never rendered, an event no element dispatches, an element with no accessible name, and what the library logged as the page ran. Pass `urls`, such as your dev server's `http://localhost:3000/`. Needs `@fusion.dev/helix-diagnostics` and Playwright installed. Fix every finding at `error`.",
            "inputSchema": {
                "properties": {
                    "urls": { "description": "The pages to open, each a full address.", "items": { "type": "string" }, "type": "array" },
                },
                "required": ["urls"],
                "type": "object",
            },
            "name": "helix_check_page",
            "outputSchema": output(&[("counts", "object"), ("failed", "array"), ("runs", "array")]),
            "title": "Check a Helix page",
        }),
        json!({
            "annotations": annotations("Derive a Helix theme"),
            "description": "Derives a complete Helix token set from a brand color, or from none for ink, and returns the CSS to write, with each color a `light-dark()` pair unless the intent names one mode. Every foreground and background pair meets its contrast target by construction. Use this when you need the actual custom properties for a theme.",
            "inputSchema": intent_schema(),
            "name": "helix_derive_theme",
            "outputSchema": output(&[("css", "string")]),
            "title": "Derive a Helix theme",
        }),
        json!({
            "annotations": annotations("Audit a Helix theme"),
            "description": "Measures every foreground against the ground it is really painted on and reports each pair with its ratio and target, plus any roles too close to tell apart. Use this to find out whether a brand color can produce an accessible palette before committing to it.",
            "inputSchema": intent_schema(),
            "name": "helix_audit_theme",
            "outputSchema": output(&[("collisions", "array"), ("failed", "integer"), ("pairings", "array"), ("violations", "array")]),
            "title": "Audit a Helix theme",
        }),
    ]
}

/// The names `catalog` lists, for the message about a name it does not.
fn names() -> Vec<String> {
    catalog()
        .iter()
        .filter_map(|tool| tool["name"].as_str().map(str::to_owned))
        .collect()
}

/// A failure as the sentence a model reads, with the next step and the names
/// it could have used.
fn said(failure: &Failure) -> String {
    let mut line = format!("{}: {}.", failure.what, failure.why);
    if let Some(hint) = &failure.hint {
        let _ = write!(line, " Try: {hint}.");
    }
    if !failure.choices.is_empty() {
        let _ = write!(line, " It accepts: {}.", failure.choices.join(", "));
    }
    line
}

/// A required string argument, or the sentence saying it is missing.
fn argument<'a>(arguments: &'a Value, name: &str) -> Result<&'a str, String> {
    arguments[name]
        .as_str()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("`{name}` is required, as a string."))
}

/// Runs one tool, answering lookups from the packages installed at `from`.
///
/// # Errors
///
/// The message to show the caller, which is prose rather than a code: the reader
/// is a model, and "cannot derive: brand is not a hex color" is a thing it can
/// act on where a number is not.
pub fn call(name: &str, arguments: &Value, from: &Path) -> Result<Answer, String> {
    /* **The name is checked before the arguments are read**, never the other way
    round. Parsing first tells a caller who misspelled a tool name that their
    arguments are malformed, which sends them to fix something that is correct. */
    match name {
        "helix_find" => {
            let limit = arguments["limit"]
                .as_u64()
                .and_then(|limit| usize::try_from(limit).ok())
                .unwrap_or(10);
            api::find(from, argument(arguments, "query")?, limit)
                .map(Answer::of)
                .map_err(|failure| said(&failure))
        }
        "helix_family" => api::family(
            from,
            argument(arguments, "family")?,
            arguments["tier"].as_str(),
        )
        .map(Answer::of)
        .map_err(|failure| said(&failure)),
        "helix_example" => api::example(
            from,
            argument(arguments, "family")?,
            arguments["example"].as_str(),
            arguments["tier"].as_str(),
        )
        .map(Answer::of)
        .map_err(|failure| said(&failure)),
        "helix_imports" => {
            let tags: Vec<String> = arguments["tags"]
                .as_array()
                .map(|tags| {
                    tags.iter()
                        .filter_map(Value::as_str)
                        .map(str::to_owned)
                        .collect()
                })
                .unwrap_or_default();
            if tags.is_empty() {
                return Err("`tags` is required, as an array of tag names.".to_owned());
            }
            api::imports(from, &tags)
                .map(Answer::of)
                .map_err(|failure| said(&failure))
        }
        "helix_tokens" => api::tokens(
            from,
            arguments["query"].as_str(),
            arguments["category"].as_str(),
        )
        .map(Answer::of)
        .map_err(|failure| said(&failure)),
        "helix_check" => check(arguments, from),
        "helix_check_page" => check_page(arguments, from),
        "helix_audit_theme" | "helix_derive_theme" => theme(name, arguments),
        _ => Err(format!(
            "no tool named {name}. This server has {}.",
            names().join(", ")
        )),
    }
}

/// `helix scan`, narrowed to the files or the snippet asked about.
fn check(arguments: &Value, from: &Path) -> Result<Answer, String> {
    let files: Vec<std::path::PathBuf> = arguments["files"]
        .as_array()
        .map(|files| {
            files
                .iter()
                .filter_map(Value::as_str)
                .map(std::path::PathBuf::from)
                .collect()
        })
        .unwrap_or_default();
    let code = arguments["code"].as_str();
    if files.is_empty() && code.is_none() {
        return Err(
            "give `files`, paths in the project, or `code` with its `language`.".to_owned(),
        );
    }
    let scan = crate::args::Scan {
        build: None,
        config: None,
        dir: None,
        file: files,
        out: None,
        stdin: code.map(|_| arguments["language"].as_str().unwrap_or("tsx").to_owned()),
    };
    let (run, _) = crate::scan::scanned(&scan, from, code).map_err(|failure| said(&failure))?;
    let count = |severity: &str| {
        run["findings"].as_array().map_or(0, |all| {
            all.iter().filter(|one| one["severity"] == severity).count()
        })
    };
    Ok(Answer::of(json!({
        "counts": { "error": count("error"), "info": count("info"), "warn": count("warn") },
        "findings": run["findings"],
        "unsettled": run["unsettled"],
        "versions": run["versions"],
    })))
}

/// `helix diagnostics --once`, on the pages asked about: each run with its
/// findings and runtime events, and each page that could not be opened.
fn check_page(arguments: &Value, from: &Path) -> Result<Answer, String> {
    let urls: Vec<String> = arguments["urls"]
        .as_array()
        .map(|urls| {
            urls.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default();
    if urls.is_empty() {
        return Err("`urls` is required, as an array of page addresses.".to_owned());
    }
    let answered =
        crate::diagnostics::pages(from, &urls, None).map_err(|failure| said(&failure))?;
    let (failed, runs): (Vec<Value>, Vec<Value>) = urls
        .iter()
        .zip(answered)
        .map(|(url, run)| match run.get("error") {
            Some(error) => (Some(json!({ "error": error, "url": url })), None),
            None => (
                None,
                Some(json!({
                    "findings": run["findings"],
                    "page": run.pointer("/run/page").cloned().unwrap_or(Value::Null),
                    "runtime": run["runtime"],
                    "url": url,
                })),
            ),
        })
        .fold(
            (Vec::new(), Vec::new()),
            |(mut failed, mut runs), (one, two)| {
                failed.extend(one);
                runs.extend(two);
                (failed, runs)
            },
        );
    let count = |severity: &str| {
        runs.iter()
            .flat_map(|run| run["findings"].as_array().into_iter().flatten())
            .filter(|one| one["severity"] == severity)
            .count()
    };
    Ok(Answer::of(json!({
        "counts": { "error": count("error"), "info": count("info"), "warn": count("warn") },
        "failed": failed,
        "runs": runs,
    })))
}

/// The two derivations.
fn theme(name: &str, arguments: &Value) -> Result<Answer, String> {
    let intent = read(arguments)?;
    let themes =
        modes(&intent).map_err(|failure| format!("cannot derive that intent: {failure}"))?;
    if name == "helix_audit_theme" {
        /* The shape `helix theme audit --json` emits, key for key. Two
        representations of one report would be two things to keep true, and
        an agent that learned one has learned the other. There is no file,
        so `source` is null. */
        let mut report = measurement(&themes);
        report.insert("source".to_owned(), Value::Null);
        return Ok(Answer::of(Value::Object(report)));
    }
    /* **Refused when it fails its own contract, the way `build` is.** A
    palette that does not meet the contrast it claims is the failure this
    engine exists to prevent, and handing one to a model that will paste it
    into a stylesheet is worse than handing it to a person who might read the
    warning above it. */
    let failing = violations(&themes);
    if !failing.is_empty() {
        return Err(format!(
            "that intent derives a palette that fails its own contrast targets, so it is not returned. {}\n\nCall helix_audit_theme with the same intent to see every pair.",
            failing.join(" ")
        ));
    }
    let css = match themes.as_slice() {
        [light, dark] => to_css_modes(light, dark, ":root"),
        [one, ..] => to_css(one, ":root"),
        [] => unreachable!("an intent derives in at least one mode"),
    };
    /* The text is the CSS itself, as it always was, so a client that reads
    only text pastes a stylesheet. */
    Ok(Answer {
        structured: json!({ "css": css }),
        text: css,
    })
}

/// Reads the intent out of the arguments.
///
/// **Accepts the intent bare as well as wrapped**, because a model that has read
/// the schema sends `{"intent": {...}}` and a model that has read the file format
/// sends `{"brand": "#..."}`, and both are the caller being reasonable. The
/// wrapped form is tried first so an intent that somehow has an `intent` key of
/// its own resolves the documented way.
fn read(arguments: &Value) -> Result<ThemeIntent, String> {
    let body = arguments.get("intent").unwrap_or(arguments);
    serde_json::from_value(body.clone()).map_err(|failure| {
        format!("that is not a theme intent: {failure}. It is the JSON `helix.theme.json` holds, such as `{{\"brand\": \"#0b3d91\"}}`.")
    })
}
