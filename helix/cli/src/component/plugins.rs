//! The rules somebody else wrote, as rules this command line runs.
//!
//! **The host knows what a module is and this knows what a component is.** What
//! `fusion-plugins` passes a plugin is a string, because `fusion prose check`
//! and `fusion spec check` are the same shape over different input and a host
//! that named a manifest would have to be widened on the day the second one
//! arrives. What is in that string is this file's business: the manifests and
//! the stylesheet text, which is what the rules compiled in here read and so is
//! what the work needs rather than a restriction invented for safety.
//!
//! **Built once for the whole run.** Every plugin rule reads the same payload,
//! so the alternative is reading the manifests and the sheets once per rule and
//! serializing them again each time. A plugin asking for something not in it is
//! a request to widen the world, reviewed once, rather than a filesystem handed
//! over so nothing has to be decided.

use std::path::Path;
use std::sync::{Arc, OnceLock};

use fusion_plugins::{Host, Loaded};
use fusion_rules::error::Failure;
use serde_json::{json, Value};

use crate::component::{Context, Finding, Report, Rule, Runner};

/// Where a plugin is looked for, under the workspace root.
///
/// Settable, because a consumer vendoring plugins into their own tree should
/// not have to lay it out the way this repository does.
pub const DIRECTORY: &str = ".helix/plugins";

/// The plugins a workspace holds, loaded and ready to be asked.
///
/// # Errors
///
/// [`Failure`] naming the module that would not load and why, which is an input
/// fault rather than a finding: a plugin that cannot run is not a workspace that
/// is wrong, and a run that quietly skipped it would be a check that stopped
/// checking without saying so.
pub fn read(root: &Path, at: &str) -> Result<Host, Failure> {
    Host::read(&root.join(at)).map_err(|refused| {
        Failure::input(
            "a plugin could not be loaded",
            format!("{refused}"),
        )
        .hint("remove it from the plugin directory, or rebuild it against the world this command line speaks")
    })
}

/// What every plugin rule is handed, built the first time one is run.
///
/// **Paths are the repository's own**, the way a finding names one, so nothing
/// in the payload says where this checkout sits on the machine. A plugin that
/// wrote an absolute path into a finding would print somebody's home directory
/// into a CI log.
fn payload(context: &Context) -> &str {
    static BUILT: OnceLock<String> = OnceLock::new();
    BUILT.get_or_init(|| {
        let mut tiers = Vec::new();
        for tier in context.settings.roots(&context.root) {
            let Some(manifest) = context.manifest(&tier) else {
                continue;
            };
            tiers.push(json!({
                "manifest": manifest,
                "source": fusion_rules::relative(&context.root, &tier),
            }));
        }
        let mut sheets = Vec::new();
        for tier in context.settings.roots(&context.root) {
            let mut found = Vec::new();
            crate::component::stylesheets(&tier, &mut found);
            for file in found {
                let Ok(text) = std::fs::read_to_string(&file) else {
                    continue;
                };
                sheets.push(json!({
                    "file": fusion_rules::relative(&context.root, &file),
                    "text": text,
                }));
            }
        }
        json!({ "sheets": sheets, "tiers": tiers }).to_string()
    })
}

/// What a plugin's refusal reads as, which is a finding against the plugin.
///
/// **A plugin that fails is a failing run rather than a silent one.** The rule
/// counted nothing, so a floor rule cannot mistake it for a clean sheet, and the
/// finding names the module rather than the workspace: nothing in the tree is
/// wrong, and the person reading has to know which file to go and fix.
fn unanswered(rule: &str, why: &str) -> Report {
    Report {
        checked: 0,
        findings: vec![Finding {
            detail: format!(
                "A plugin is a rule like any other and is held to answering like one. Until it \
                 does, nothing it was going to check is being checked: {why}."
            ),
            file: DIRECTORY.to_owned(),
            message: format!("the plugin providing `{rule}` did not answer"),
        }],
        notes: Vec::new(),
        unit: "plugin calls",
    }
}

/// Every rule the loaded plugins provide, as this command line's own type.
///
/// **Names are leaked, and the leak is the whole lifetime.** A rule's name is
/// `&'static str` because every rule compiled in has one, and a plugin's arrives
/// at run time; a process that loads eight plugins leaks eight names and then
/// exits, which is the cheapest correct answer and the one that leaves the type
/// alone for the rules that do not need it.
#[must_use]
pub fn rules(host: &Arc<Host>) -> Vec<Rule> {
    let mut found = Vec::new();
    for loaded in host.loaded() {
        for provided in &loaded.provides {
            let name: &'static str = Box::leak(provided.name.clone().into_boxed_str());
            let summary: &'static str = Box::leak(provided.summary.clone().into_boxed_str());
            let unit: &'static str = Box::leak(provided.unit.clone().into_boxed_str());
            let host = Arc::clone(host);
            found.push(Rule {
                fix: None,
                name,
                run: Runner::Hosted(Box::new(move |context: &Context| {
                    match host.check(name, payload(context)) {
                        Ok(judged) => Report {
                            checked: judged.checked,
                            findings: judged.findings.into_iter().map(Into::into).collect(),
                            notes: judged.notes,
                            unit,
                        },
                        Err(refused) => unanswered(name, &refused.why),
                    }
                })),
                summary,
            });
        }
    }
    found
}

/// The register, as a line per module: what was loaded, and what it hashes to.
///
/// **Printed on every run, which is what a directory costs.** Discovery by
/// directory is a rule being a file rather than a file and an entry in a
/// manifest, and what that trades away is a reader seeing the list without
/// running anything. This is how it is bought back, so a plugin cannot arrive
/// without anybody noticing.
#[must_use]
pub fn register(loaded: &[&Loaded]) -> Vec<String> {
    loaded
        .iter()
        .map(|one| {
            let rules = one
                .provides
                .iter()
                .map(|two| two.name.as_str())
                .collect::<Vec<&str>>()
                .join(", ");
            let digest: String = one.digest.chars().take(23).collect();
            format!("plugin {} {digest} providing {rules}", one.name)
        })
        .collect()
}

/// The register as JSON, for the caller that reads the run rather than watches.
#[must_use]
pub fn listed(loaded: &[&Loaded]) -> Value {
    loaded
        .iter()
        .map(|one| {
            json!({
                "digest": one.digest,
                "name": one.name,
                "rules": one.provides.iter().map(|two| two.name.clone()).collect::<Vec<String>>(),
            })
        })
        .collect()
}
