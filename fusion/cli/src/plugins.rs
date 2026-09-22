//! The rules somebody else wrote, as rules this command line runs.
//!
//! **The second consumer of the host, which is what the first one was built
//! for.** `helix component check` took plugins first and the host's types name
//! no component anywhere, so what is here is this binary's half: which directory
//! a noun's plugins live in, what its payload carries, and nothing about
//! modules, worlds or sandboxes.
//!
//! **A directory per noun, because a rule belongs to a subject.** A prose rule
//! and a spec rule read different things and answer different questions, and a
//! module dropped in one directory for both would be a plugin that runs under a
//! noun it was not written for, handed a payload with none of the parts it
//! asked for and reporting nothing. The path says which noun a plugin is for,
//! the way the rule set already does.

use std::collections::BTreeMap;
use std::path::{Component, Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

use fusion_plugins::{Host, Loaded};
use fusion_rules::error::Failure;
use fusion_rules::walk::crawl;
use serde_json::{json, Value};

use crate::rules::{Context, Finding, Report, Rule, Runner, Unwritten, Written};

/// Where a noun's plugins live, under the workspace root.
#[must_use]
pub fn directory(noun: &str) -> String {
    format!(".fusion/plugins/{noun}")
}

/// The parts a noun can compose, by the name a rule asks for them by.
///
/// **A noun offers what its own rules read**, which is what makes a plugin
/// belong to one: `documents` is what the prose rules walk and `specs` is what
/// the spec rules do. A rule asking for a part its noun does not have gets
/// nothing under that key, which is a rule in the wrong directory and reads as
/// one.
#[must_use]
pub fn parts(noun: &str) -> &'static [&'static str] {
    match noun {
        "prose" => &["documents"],
        "spec" => &["specs"],
        _ => &[],
    }
}

/// The plugins a workspace holds for one noun.
///
/// # Errors
///
/// [`Failure`] naming the module that would not load and why, which is an input
/// fault rather than a finding: a plugin that cannot run is not a workspace that
/// is wrong, and a run that quietly skipped it would be a check that stopped
/// checking without saying so.
pub fn read(root: &Path, noun: &str) -> Result<Host, Failure> {
    Host::read(&root.join(directory(noun))).map_err(|refused| {
        Failure::input("a plugin could not be loaded", format!("{refused}")).hint(
            "remove it from the plugin directory, or rebuild it against the world this command \
             line speaks",
        )
    })
}

/// Every file under the root with one of these extensions, and its text.
///
/// Read once per part and kept: two rules asking for the documents are handed
/// the same two and a half megabytes rather than a copy each.
fn text(context: &Context, kinds: &[&str], marked: Option<&str>) -> Vec<Value> {
    let mut found = Vec::new();
    crawl(
        &context.root,
        &|path| {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            let kind = path
                .extension()
                .map(|one| one.to_string_lossy().to_string())
                .unwrap_or_default();
            kinds.contains(&kind.as_str()) && marked.is_none_or(|mark| name.contains(mark))
        },
        &mut found,
    );
    found.sort();
    found
        .into_iter()
        .filter_map(|file| {
            let text = std::fs::read_to_string(&file).ok()?;
            Some(json!({ "file": context.relative(&file), "text": text }))
        })
        .collect()
}

/// Everything a reader reads: the markdown this repository wrote.
fn documents(context: &Context) -> &Value {
    static BUILT: OnceLock<Value> = OnceLock::new();
    BUILT.get_or_init(|| Value::Array(text(context, &["md", "mdx"], None)))
}

/// Every spec, which is what the spec rules read.
fn specs(context: &Context) -> &Value {
    static BUILT: OnceLock<Value> = OnceLock::new();
    BUILT.get_or_init(|| Value::Array(text(context, &["ts", "tsx"], Some(".spec."))))
}

/// What one rule is handed: the parts it asked for and no others.
///
/// **Composed per set of parts and kept**, the way the component payload is: two
/// rules asking for the same parts are handed the same string, and a part
/// nobody asked for is absent rather than empty.
fn payload(context: &Context, noun: &str, reads: &[String]) -> String {
    static BUILT: OnceLock<Mutex<BTreeMap<Vec<String>, Arc<str>>>> = OnceLock::new();
    let cache = BUILT.get_or_init(|| Mutex::new(BTreeMap::new()));

    let mut wanted: Vec<String> = reads
        .iter()
        .filter(|one| parts(noun).contains(&one.as_str()))
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
            "documents" => fields.insert(part.clone(), documents(context).clone()),
            "specs" => fields.insert(part.clone(), specs(context).clone()),
            _ => None,
        };
    }
    let said: Arc<str> = Arc::from(Value::Object(fields).to_string());
    held.insert(wanted, Arc::clone(&said));
    said.to_string()
}

/// What a plugin's refusal reads as, which is a finding against the plugin.
fn unanswered(noun: &str, rule: &str, why: &str) -> Report {
    Report {
        checked: 0,
        findings: vec![Finding {
            detail: format!(
                "A plugin is a rule like any other and is held to answering like one. Until it \
                 does, nothing it was going to check is being checked: {why}."
            ),
            file: directory(noun),
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
/// edit naming an absolute path, one that climbs out of the tree or one that
/// resolves outside it through a link is the same escape by a longer route.
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
fn apply(
    host: &Arc<Host>,
    noun: &'static str,
    name: &'static str,
    reads: &[String],
    context: &Context,
) -> Written {
    let judged = host
        .check(name, &payload(context, noun, reads))
        .map_err(|refused| Unwritten {
            file: directory(noun),
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
/// **Names are leaked**, as they are on the other side of this mechanism: a
/// rule's name is `&'static str` because every rule compiled in has one, and a
/// process that loads eight plugins leaks eight names and then exits.
/// Every rule the loaded plugins provide that this noun can answer.
///
/// **A rule reading what this noun does not compose is another noun's**, and is
/// left to it rather than run against a payload with nothing in it: a plugin may
/// hold a prose rule and a spec rule in one module, and the directory it was
/// found in says which of them this run is asking for. What is skipped is
/// printed in the register, because the failure this risks is a rule nobody
/// notices is not running.
///
/// **A module with nothing for this noun is refused.** It is in the wrong
/// directory, which is a mistake with no useful reading: every rule it has would
/// be skipped and the run would report a plugin that does nothing.
///
/// # Errors
///
/// [`Failure`] naming the module, what it reads and what this noun composes.
pub fn rules(host: &Arc<Host>, noun: &'static str) -> Result<(Vec<Rule>, Vec<String>), Failure> {
    let mut found = Vec::new();
    let mut elsewhere = Vec::new();
    for loaded in host.loaded() {
        let mut mine = 0;
        for provided in &loaded.provides {
            if provided
                .reads
                .iter()
                .any(|one| !parts(noun).contains(&one.as_str()))
            {
                elsewhere.push(format!("{}: {}", loaded.name, provided.name));
                continue;
            }
            mine += 1;
            let name: &'static str = Box::leak(provided.name.clone().into_boxed_str());
            let summary: &'static str = Box::leak(provided.summary.clone().into_boxed_str());
            let unit: &'static str = Box::leak(provided.unit.clone().into_boxed_str());
            let reads = provided.reads.clone();
            let wants = reads.clone();
            let host = Arc::clone(host);
            let writing = Arc::clone(&host);
            found.push(Rule {
                fix: Some(Box::new(move |context: &Context| {
                    apply(&writing, noun, name, &wants, context)
                })),
                name,
                run: Runner::Hosted(Box::new(move |context: &Context| {
                    match host.check(name, &payload(context, noun, &reads)) {
                        Ok(judged) => Report {
                            checked: judged.checked,
                            findings: judged.findings.into_iter().map(Into::into).collect(),
                            notes: judged.notes,
                            unit,
                        },
                        Err(refused) => unanswered(noun, name, &refused.why),
                    }
                })),
                summary,
            });
        }
        if mine == 0 {
            return Err(Failure::input(
                format!("`{}` provides no rule `fusion {noun}` can run", loaded.name),
                format!(
                    "every rule it provides reads something this noun does not compose, which is \
                     {}",
                    parts(noun)
                        .iter()
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<String>>()
                        .join(" and ")
                ),
            )
            .hint(format!(
                "a plugin belongs to the noun whose payload it reads: move it out of {}",
                directory(noun)
            )));
        }
    }
    Ok((found, elsewhere))
}

/// The register, as a line per module: what was loaded, and what it hashes to.
///
/// `elsewhere` names the rules this noun left to another one, so a rule that is
/// not running is visible rather than merely absent.
#[must_use]
pub fn register(loaded: &[&Loaded], elsewhere: &[String]) -> Vec<String> {
    let mut said: Vec<String> = loaded
        .iter()
        .map(|one| {
            /* Only what this noun runs, because the line says what a run is
            doing: a rule left to another noun is named on its own line below
            rather than counted here as though it ran. */
            let rules = one
                .provides
                .iter()
                .map(|two| two.name.as_str())
                .filter(|two| !elsewhere.contains(&format!("{}: {two}", one.name)))
                .collect::<Vec<&str>>()
                .join(", ");
            let digest: String = one.digest.chars().take(23).collect();
            format!("plugin {} {digest} providing {rules}", one.name)
        })
        .collect();
    for one in elsewhere {
        said.push(format!(
            "plugin {one} is another noun's, and is not run here"
        ));
    }
    said
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
