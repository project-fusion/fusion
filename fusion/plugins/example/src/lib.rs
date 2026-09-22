//! A rule from outside, which is what the host exists to run.
//!
//! **It reads the payload and nothing else**, which is the whole of what a
//! plugin may do: no filesystem, no clock, no network, and nothing kept between
//! two calls. What it judges is deliberately small and real, a description
//! nobody finished, so the example is about the boundary rather than the rule.

wit_bindgen::generate!({ path: "../wit", world: "plugin" });

use serde::Deserialize;

/// What the host passes: every tier's manifest, and every stylesheet's text.
#[derive(Deserialize)]
struct Payload {
    tiers: Vec<Tier>,
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
        if cfg!(feature = "future") { 2 } else { 1 }
    }

    fn rules() -> Vec<Rule> {
        vec![Rule {
            name: "unfinished".to_owned(),
            summary: "a published description has no note to its author left in it".to_owned(),
            unit: "described components".to_owned(),
        }]
    }

    fn check(rule: String, payload: String) -> Result<String, String> {
        if rule != "unfinished" {
            return Err(format!("this plugin provides no rule called `{rule}`"));
        }
        let read: Payload =
            serde_json::from_str(&payload).map_err(|why| format!("the payload will not read: {why}"))?;

        let mut checked = 0;
        let mut findings = Vec::new();
        for tier in &read.tiers {
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
}

export!(Plugin);
