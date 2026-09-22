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

use std::collections::BTreeMap;
use std::path::{Component, Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

use fusion_plugins::{Host, Loaded};
use fusion_rules::error::Failure;
use serde_json::{json, Value};

use crate::component::{Context, Finding, Report, Rule, Runner, Unwritten, Written};

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

/// The parts of the payload this command line can compose, by the name a rule
/// asks for them by.
///
/// **Named rather than numbered, because a third one is coming.** `fusion prose
/// check` composes different parts under the same mechanism, and a rule that
/// asked for part 0 would be asking a different question of each verb.
pub const PARTS: [&str; 2] = ["manifests", "sheets"];

/// Every tier's manifest, read once however many rules ask for them.
///
/// **Paths are the repository's own**, the way a finding names one, so nothing
/// in the payload says where this checkout sits on the machine. A plugin that
/// wrote an absolute path into a finding would print somebody's home directory
/// into a CI log.
fn manifests(context: &Context) -> &Value {
    static BUILT: OnceLock<Value> = OnceLock::new();
    BUILT.get_or_init(|| {
        let mut found = Vec::new();
        for tier in context.settings.roots(&context.root) {
            let Some(manifest) = context.manifest(&tier) else {
                continue;
            };
            found.push(json!({
                "manifest": manifest,
                "source": fusion_rules::relative(&context.root, &tier),
            }));
        }
        Value::Array(found)
    })
}

/// Every stylesheet under a tier, with its text.
fn sheets(context: &Context) -> &Value {
    static BUILT: OnceLock<Value> = OnceLock::new();
    BUILT.get_or_init(|| {
        let mut found = Vec::new();
        for tier in context.settings.roots(&context.root) {
            let mut files = Vec::new();
            crate::component::stylesheets(&tier, &mut files);
            for file in files {
                let Ok(text) = std::fs::read_to_string(&file) else {
                    continue;
                };
                found.push(json!({
                    "file": fusion_rules::relative(&context.root, &file),
                    "text": text,
                }));
            }
        }
        Value::Array(found)
    })
}

/// What one rule is handed: the parts it asked for and no others.
///
/// **Composed per set of parts and kept, not per rule.** The manifests run to
/// thirteen megabytes and the sheets to one, and serializing either again for
/// the second rule that wanted it is the cost that stops a rule per plugin being
/// affordable. Two rules asking for the same parts are handed the same string.
///
/// **A part nobody asked for is absent rather than empty.** A rule handed
/// `"sheets": []` cannot tell a workspace with no stylesheets from a host that
/// did not compose them, and the first is a finding while the second is a
/// mistake in the rule's own declaration.
fn payload(context: &Context, reads: &[String]) -> String {
    static BUILT: OnceLock<Mutex<BTreeMap<Vec<String>, Arc<str>>>> = OnceLock::new();
    let cache = BUILT.get_or_init(|| Mutex::new(BTreeMap::new()));

    let mut wanted: Vec<String> = reads
        .iter()
        .filter(|one| PARTS.contains(&one.as_str()))
        .cloned()
        .collect();
    wanted.sort();
    wanted.dedup();

    let mut held = cache
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    if let Some(said) = held.get(&wanted) {
        return said.to_string();
    }
    let mut fields = serde_json::Map::new();
    for part in &wanted {
        match part.as_str() {
            "manifests" => fields.insert(part.clone(), manifests(context).clone()),
            "sheets" => fields.insert(part.clone(), sheets(context).clone()),
            _ => None,
        };
    }
    let said: Arc<str> = Arc::from(Value::Object(fields).to_string());
    held.insert(wanted, Arc::clone(&said));
    said.to_string()
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

/// Where a plugin's edit may land: inside the workspace, and nowhere else.
///
/// **A path from a plugin is input, not instruction.** The sandbox stops a
/// module reaching the filesystem itself, and this is the other half of it: an
/// edit naming `../../.ssh/config`, an absolute path or a symbolic link out of
/// the tree is the same escape by a longer route. The root is what a plugin was
/// pointed at, so the root is where its writing ends.
fn inside(root: &Path, file: &str) -> Result<PathBuf, String> {
    let said = Path::new(file);
    if said.is_absolute() {
        return Err(format!("`{file}` is an absolute path"));
    }
    if said
        .components()
        .any(|one| matches!(one, Component::ParentDir))
    {
        return Err(format!("`{file}` climbs out of the workspace"));
    }
    let at = root.join(said);
    /* Resolved where it exists, because a symbolic link inside the tree can
    point anywhere outside it. A file that does not exist yet is judged by the
    directory it would land in, which does. */
    let checked = at
        .parent()
        .and_then(|one| one.canonicalize().ok())
        .ok_or_else(|| format!("`{file}` is in no directory this workspace has"))?;
    let bounds = root
        .canonicalize()
        .map_err(|why| format!("the workspace root will not resolve: {why}"))?;
    if !checked.starts_with(&bounds) {
        return Err(format!("`{file}` resolves outside the workspace"));
    }
    Ok(at)
}

/// Applies what a plugin asked to write, once a run has asked for fixes.
///
/// **A plugin judges and the host writes.** The module never touches a file: it
/// hands back the text it would put there, which is the same split `check` and
/// `fix` have everywhere else, and it means a plugin cannot write during a run
/// that only asked what was wrong.
fn apply(host: &Arc<Host>, name: &'static str, reads: &[String], context: &Context) -> Written {
    let judged = host
        .check(name, &payload(context, reads))
        .map_err(|refused| Unwritten {
            file: DIRECTORY.to_owned(),
            why: refused.why,
        })?;
    let mut wrote = Vec::new();
    for edit in judged.edits {
        let at = inside(&context.root, &edit.file).map_err(|why| Unwritten {
            file: edit.file.clone(),
            why: format!("`{name}` asked to write outside the workspace: {why}"),
        })?;
        std::fs::write(&at, &edit.text).map_err(|why| Unwritten {
            file: edit.file.clone(),
            why: format!("{why}"),
        })?;
        wrote.push(edit.file);
    }
    Ok(wrote)
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
            let reads = provided.reads.clone();
            let host = Arc::clone(host);
            let writing = Arc::clone(&host);
            let wants = reads.clone();
            found.push(Rule {
                /* **Every plugin rule can write, because the world says any of
                them may.** A rule with nothing to repair answers with no edits,
                which is what `fix` reports as a rule that could write and did
                not need to: the alternative is asking a module whether it might
                write before asking it what is wrong, which is the same call
                twice. */
                fix: Some(Box::new(move |context: &Context| {
                    apply(&writing, name, &wants, context)
                })),
                name,
                run: Runner::Hosted(Box::new(move |context: &Context| {
                    match host.check(name, &payload(context, &reads)) {
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
