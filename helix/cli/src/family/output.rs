//! What `helix system` writes and prints.
//!
//! **A check writes nothing.** Each command that writes files takes `--check`,
//! which compiles the same outputs and says which written ones are missing or
//! differ, byte for byte. A build followed by `build --check` is two builds
//! compared, which is how CI holds the compiler to giving the same bytes.

use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;

use crate::family::compile::Compiled;
use crate::family::ir::{self, Item};

/// Writes each output, or with `check` writes nothing and says which written
/// ones are missing or out of date, naming `command` as what writes them.
///
/// # Errors
///
/// [`Failure`] when an output cannot be written.
pub fn settle(
    outputs: &[(PathBuf, String)],
    check: bool,
    command: &str,
    json: bool,
) -> Result<Code, Failure> {
    let mut stale = Vec::new();
    let mut written = Vec::new();
    for (path, text) in outputs {
        if check {
            if fs::read_to_string(path).ok().as_deref() != Some(text.as_str()) {
                stale.push(path.display().to_string());
            }
        } else {
            write(path, text)?;
            written.push(path.display().to_string());
        }
    }
    if json {
        println!(
            "{}",
            serde_json::json!({ "stale": stale, "written": written })
        );
    } else {
        for path in &written {
            println!("wrote {path}");
        }
        for path in &stale {
            println!("{path} is missing or out of date: run `{command}` without `--check`");
        }
    }
    Ok(if stale.is_empty() {
        Code::Ok
    } else {
        Code::Failed
    })
}

/// Writes `text` to `path`, making its directory.
///
/// # Errors
///
/// [`Failure`] when the directory or the file cannot be written.
pub fn write(path: &Path, text: &str) -> Result<(), Failure> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            Failure::new(
                Code::Failed,
                "cannot create an output directory",
                format!("{}: {error}", parent.display()),
            )
        })?;
    }
    fs::write(path, text).map_err(|error| {
        Failure::new(
            Code::Failed,
            "cannot write an output",
            format!("{}: {error}", path.display()),
        )
    })
}

/// Counts what each element needed the web's own selectors or values for, and
/// says where a checked element differs.
pub fn report(compiled: &[Compiled], json: bool, differences: Option<&[String]>) {
    let rows: Vec<serde_json::Value> = compiled.iter().map(row).collect();
    if json {
        println!(
            "{}",
            serde_json::json!({ "differences": differences, "elements": rows })
        );
        return;
    }
    for row in &rows {
        println!(
            "{}: {} props, {} web only; {} rules, {} need the web's own selectors; {} values are web only",
            row["element"].as_str().unwrap_or_default(),
            row["props"],
            row["webOnlyProps"],
            row["rules"],
            row["webOnlyRules"],
            row["webOnlyValues"],
        );
    }
    for one in compiled {
        for note in &one.notes {
            println!("{}: {note}", one.element);
        }
    }
    let Some(differences) = differences else {
        return;
    };
    for difference in differences {
        println!("{difference}");
    }
    if differences.is_empty() {
        println!("every element matches what it is held to");
    }
}

/// One element's counts.
fn row(one: &Compiled) -> serde_json::Value {
    let rules: Vec<&ir::Rule> = one
        .family
        .rules
        .iter()
        .filter_map(|item| match item {
            Item::Rule(rule) => Some(&**rule),
            Item::Keyframes(_) => None,
        })
        .collect();
    let web_rules = rules
        .iter()
        .filter(|rule| rule.web_only || rule.web_selector())
        .count();
    let web_values = rules
        .iter()
        .flat_map(|rule| rule.set.iter())
        .filter(|(_, value)| matches!(value, ir::Value::Web(_)))
        .count();
    let props = &one.family.api.props;
    serde_json::json!({
        "element": one.element,
        "notes": one.notes,
        "props": props.len(),
        "rules": rules.len(),
        "source": one.source.display().to_string(),
        "webOnlyProps": props.iter().filter(|prop| prop.platform.is_some()).count(),
        "webOnlyRules": web_rules,
        "webOnlyValues": web_values,
    })
}
