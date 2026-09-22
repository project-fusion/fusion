//! A rule from outside, which is what the host exists to run.
//!
//! **It reads the payload and nothing else**, which is the whole of what a
//! plugin may do: no filesystem, no clock, no network, and nothing kept between
//! two calls. What it judges is deliberately small and real, a description
//! nobody finished, so the example is about the boundary rather than the rule.

wit_bindgen::generate!({ path: "../wit", world: "plugin" });

use serde::Deserialize;

/// What the host passes: the parts this plugin's rules asked to read.
///
/// **Unknown fields are refused, which is how this plugin holds the host to
/// the bargain.** A rule that asked for the manifests and was handed the
/// stylesheets too would be reading a payload nobody composed for it, and the
/// cost of composing it is exactly what asking is for.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Payload {
    #[serde(default)]
    manifests: Vec<Tier>,
    #[serde(default)]
    sheets: Vec<Sheet>,
    #[serde(default)]
    documents: Vec<Sheet>,
}

/// One stylesheet, as the host reads it off disk.
#[derive(Deserialize)]
struct Sheet {
    file: String,
    text: String,
}

#[derive(Deserialize)]
struct Tier {
    manifest: Manifest,
}

#[derive(Deserialize)]
struct Manifest {
    #[serde(default)]
    modules: Vec<Module>,
}

#[derive(Deserialize)]
struct Module {
    #[serde(default)]
    declarations: Vec<Declaration>,
    #[serde(default)]
    path: String,
}

#[derive(Deserialize)]
struct Declaration {
    #[serde(default)]
    description: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    #[serde(rename = "tagName")]
    tag_name: Option<String>,
}

struct Plugin;

impl Guest for Plugin {
    fn world_version() -> u32 {
        if cfg!(feature = "past") { 1 } else { 2 }
    }

    fn rules() -> Vec<Rule> {
        vec![
            Rule {
                name: "unfinished".to_owned(),
                summary: "a published description has no note to its author left in it".to_owned(),
                unit: "described components".to_owned(),
                /* The manifests and not the stylesheets: a description is
                   published prose and lives in the manifest, and asking for a
                   megabyte of CSS this rule never reads would be a megabyte
                   composed for nothing. */
                reads: vec!["manifests".to_owned()],
            },
            Rule {
                name: "trailing-space".to_owned(),
                summary: "a stylesheet has no space left at the end of a line".to_owned(),
                unit: "stylesheet lines".to_owned(),
                reads: vec!["sheets".to_owned()],
            },
            /* A rule for another noun, from the same module, which is what the
               mechanism allows and the directory decides: this one is only ever
               loaded by `fusion prose`, whose payload has documents in it. */
            Rule {
                name: "titled".to_owned(),
                summary: "a document opens with a heading rather than with prose".to_owned(),
                unit: "documents".to_owned(),
                reads: vec!["documents".to_owned()],
            },
        ]
    }

    fn check(rule: String, payload: String) -> Result<String, String> {
        let read: Payload = serde_json::from_str(&payload)
            .map_err(|why| format!("the payload will not read: {why}"))?;
        match rule.as_str() {
            "unfinished" => unfinished(&read),
            "trailing-space" => trailing_space(&read),
            "titled" => titled(&read),
            other => Err(format!("this plugin provides no rule called `{other}`")),
        }
    }
}

/// A note to the author, left in prose a consumer reads.
fn unfinished(read: &Payload) -> Result<String, String> {
    let mut checked = 0;
    let mut findings = Vec::new();
    for tier in &read.manifests {
        for module in &tier.manifest.modules {
            for declaration in &module.declarations {
                if declaration.tag_name.is_none() || declaration.description.is_empty() {
                    continue;
                }
                checked += 1;
                let said = declaration.description.to_lowercase();
                let Some(word) = ["todo", "fixme", "tbd", "xxx"]
                    .into_iter()
                    .find(|one| said.contains(one))
                else {
                    continue;
                };
                findings.push(serde_json::json!({
                    "detail": format!(
                        "A description is published prose: it renders on the component's \
                         reference page, so `{}` reaches a consumer rather than the author it \
                         was addressed to. Finish the sentence or delete it.",
                        word.to_uppercase()
                    ),
                    "file": module.path,
                    "message": format!("`{}` publishes a description with `{}` in it", declaration.name, word.to_uppercase()),
                }));
            }
        }
    }

    Ok(serde_json::json!({
        "checked": checked,
        "findings": findings,
        "notes": [],
    })
    .to_string())
}

/// A document that opens with prose, which is a rule for another noun.
fn titled(read: &Payload) -> Result<String, String> {
    let mut findings = Vec::new();
    for document in &read.documents {
        let Some(first) = document.text.lines().find(|line| !line.trim().is_empty()) else {
            continue;
        };
        if first.starts_with('#') {
            continue;
        }
        findings.push(serde_json::json!({
            "detail": "A reader arriving from a search result sees the first line before \
                       anything else, and a document whose first line is a sentence gives them \
                       no title to read.",
            "file": document.file,
            "message": format!("`{}` opens with prose rather than a heading", document.file),
        }));
    }
    Ok(serde_json::json!({
        "checked": read.documents.len(),
        "findings": findings,
        "notes": [],
    })
    .to_string())
}

/// Space at the end of a line, which is the half of a rule that can repair.
///
/// **It judges and writes in one call**, because the repair is the reading
/// applied: the host carries the edits back and writes none of them unless the
/// run asked for fixes, so the same answer serves `check` and `fix`.
fn trailing_space(read: &Payload) -> Result<String, String> {
    let mut checked = 0;
    let mut findings = Vec::new();
    let mut edits = Vec::new();
    for sheet in &read.sheets {
        checked += sheet.text.lines().count();
        if !sheet.text.lines().any(|line| line.ends_with([' ', '\t'])) {
            continue;
        }
        let at = sheet
            .text
            .lines()
            .position(|line| line.ends_with([' ', '\t']))
            .unwrap_or(0)
            + 1;
        findings.push(serde_json::json!({
            "detail": "Space at the end of a line is invisible in the editor and visible in \
                       every diff that touches the line. `fix` removes it.",
            "file": format!("{}:{at}", sheet.file),
            "message": format!("`{}` leaves space at the end of a line", sheet.file),
        }));
        let mended: Vec<&str> = sheet.text.lines().map(str::trim_end).collect();
        let mut text = mended.join("\n");
        if sheet.text.ends_with('\n') {
            text.push('\n');
        }
        edits.push(serde_json::json!({
            /* Where the escape test points it somewhere it may not go, which is
               a fault of this plugin that the host is held to catching. */
            "file": if cfg!(feature = "escape") {
                format!("../{}", sheet.file)
            } else {
                sheet.file.clone()
            },
            "text": text,
        }));
    }
    Ok(serde_json::json!({
        "checked": checked,
        "edits": edits,
        "findings": findings,
        "notes": [],
    })
    .to_string())
}

export!(Plugin);
