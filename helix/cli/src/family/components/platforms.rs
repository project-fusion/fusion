//! What each element is called on React Native, for the manifest: its
//! component, and the prop each property, slot, and event of the web element
//! becomes there.
//!
//! **The names come from the rules the modules are written by**, in
//! `members`, so `helix api` names the props the component takes.

use std::path::Path;

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;
use fusion_rules::say;
use serde_json::{json, Map, Value as Json};

use super::declaration;
use super::members::{camel, handler_of, region_prop, regions, slot_of, web_event};
use crate::args::FamilyArgs;
use crate::family::api::Prop;
use crate::family::compile::{self, Compiled};
use crate::family::{open, read_manifest};

#[cfg(test)]
#[path = "platforms_tests.rs"]
mod tests;

/// **Every component the compiler draws on React Native is experimental
/// there.** That is the pilot's stage: the runtime, the forms, and the props a
/// component takes may change in any release, whatever the web element's own
/// status. A family leaves it by a decision written here.
const STATUS: &str = "experimental";

/// The names in `names`, sorted and once each.
fn sorted(names: impl Iterator<Item = String>) -> Vec<String> {
    let mut all: Vec<String> = names.collect();
    all.sort();
    all.dedup();
    all
}

/// One element's names on React Native: its component, each event's handler,
/// each property it takes, each slot's prop, and the web's properties it
/// leaves out.
fn named(compiled: &Compiled, component: &str) -> Json {
    let family = &compiled.family;
    let (taken, omitted): (Vec<&Prop>, Vec<&Prop>) = family
        .api
        .props
        .iter()
        .partition(|prop| prop.platform.is_none());
    let mut events: Vec<(String, String)> = family
        .api
        .events
        .iter()
        .filter(|event| event.platform.is_none())
        .map(|event| (web_event(event, &family.names), handler_of(event)))
        .collect();
    events.sort();
    let mut drawn = Vec::new();
    regions(&family.tree, &mut drawn);
    let mut slots: Vec<(&str, String)> = drawn
        .iter()
        .map(|region| (slot_of(region), region_prop(region)))
        .collect();
    slots.sort();
    json!({
        "component": component,
        "events": events
            .iter()
            .map(|(name, prop)| json!({ "name": name, "prop": prop }))
            .collect::<Vec<_>>(),
        "omitted": sorted(omitted.iter().map(|prop| camel(&prop.name))),
        "properties": sorted(taken.iter().map(|prop| camel(&prop.name))),
        "slots": slots
            .iter()
            .map(|(name, prop)| json!({ "name": name, "prop": prop }))
            .collect::<Vec<_>>(),
    })
}

/// Every element with a part tree, by its tag, and the status its family has,
/// under the platform's name:
/// `{ "react-native": { "elements": { "<tag>": … }, "status": … } }`.
///
/// # Errors
///
/// A sentence for each element the styled manifest lacks or gives no class.
pub fn platforms(compiled: &[Compiled], manifest: &Json) -> Result<Json, Vec<String>> {
    let mut elements = Map::new();
    let mut faults = Vec::new();
    /* An element only the web has draws nothing on a phone, and has no
    native component to name. */
    let drawn = compiled
        .iter()
        .filter(|one| !one.family.tree.is_empty() && one.family.api.platform.is_none());
    for one in drawn {
        let tag = &one.family.tag;
        match declaration(manifest, tag).and_then(|found| found["name"].as_str()) {
            Some(component) => {
                elements.insert(tag.clone(), named(one, component));
            }
            None => faults.push(format!(
                "{tag}: the styled manifest has no element of that tag with a class name"
            )),
        }
    }
    if faults.is_empty() {
        Ok(json!({ "react-native": { "elements": elements, "status": STATUS } }))
    } else {
        Err(faults)
    }
}

/// `helix family platforms`: prints, as JSON, what each element with a native
/// component is called on React Native.
///
/// # Errors
///
/// [`Failure`] when a source cannot be compiled, or the styled manifest cannot
/// be read or lacks an element the sources have.
pub fn print(args: &FamilyArgs, config: Option<&Path>, from: &Path) -> Result<Code, Failure> {
    let project = open(config, args.package.as_ref(), from)?;
    let named = platforms(&compile::all(&project)?, &read_manifest(&project)?)
        .map_err(|faults| Failure::input("cannot name the native components", faults.join("\n")))?;
    say!("{named}");
    Ok(Code::Ok)
}
