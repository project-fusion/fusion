//! The native components: one module per family, which draws each of its
//! elements from the element's intermediate form with the native adapter, and
//! types the element's props.
//!
//! **Typed from three records, each the one for its part.** The form says
//! which props, regions, and events an element has on a phone, and which
//! fields each event carries. The styled manifest describes each of them and
//! names each event's class. Core's event classes, and the detail types in
//! `events/details.ts`, type each field as the web's event types it.
//!
//! **Each module carries its family's forms as constants.** A React Native
//! bundler, Jest, and a web bundler all import a module the same way, where a
//! JSON import needs an import attribute in some and is refused with one in
//! others. A form written as a constant typed `Family` is also checked against
//! the form's types wherever the module compiles.
//!
//! **A module imports the runtime by its package name**,
//! `@fusion.dev/helix-native`, whose entry checks the native peers before
//! anything else in it runs. The styled package compiles the modules into its
//! `dist`, where the `react-native` condition of each family's entry names
//! them.

pub mod anatomy;
mod details;
mod emit;
mod hooks;
mod members;
mod platforms;
#[cfg(test)]
mod tests;

use std::collections::BTreeMap;

use serde_json::Value as Json;

use crate::family::compile::Compiled;
use crate::family::ir::Family;
use crate::family::project::Project;
pub use details::Details;
use emit::{Origin, Part};
pub use platforms::print;

/// The manifest's declaration of the element `tag`.
fn declaration<'a>(manifest: &'a Json, tag: &str) -> Option<&'a Json> {
    manifest["modules"]
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|module| module["declarations"].as_array().into_iter().flatten())
        .find(|declaration| declaration["tagName"] == tag)
}

/// The elements among `all` that join `one` as its items.
fn items_of<'a>(one: &Compiled, all: &[&'a Compiled]) -> Vec<&'a Family> {
    all.iter()
        .filter(|other| {
            other
                .family
                .api
                .item
                .as_ref()
                .is_some_and(|item| item.of == one.family.name)
        })
        .map(|other| &other.family)
        .collect()
}

/// One element, typed and ready to write. `items` are the elements that
/// join it.
fn part(
    one: &Compiled,
    element: &str,
    manifest: &Json,
    details: &Details,
    items: &[&Family],
) -> Result<Part, Vec<String>> {
    let tag = &one.family.tag;
    let declaration = declaration(manifest, tag).ok_or_else(|| {
        vec![format!(
            "{tag}: the styled manifest has no element of that tag"
        )]
    })?;
    let component = declaration["name"]
        .as_str()
        .ok_or_else(|| vec![format!("{tag}: the styled manifest gives it no class name")])?
        .to_owned();
    let typed = members::typed_members(&one.family, &component, declaration, details, items)?;
    let form = serde_json::to_string(&one.family).map_err(|error| {
        vec![format!(
            "{tag}: the intermediate form does not serialize: {error}"
        )]
    })?;
    Ok(Part {
        component,
        constant: format!("{}Form", members::camel(element)),
        events: typed.events,
        form,
        hooks: typed.hooks,
        members: typed.members,
        summary: declaration["summary"]
            .as_str()
            .map(str::trim)
            .filter(|summary| !summary.is_empty())
            .map(str::to_owned),
        tag: tag.clone(),
        web_only: one.family.api.platform.is_some(),
    })
}

/// Each family's module, as the family's name and the module's text, for every
/// element with a part tree.
///
/// # Errors
///
/// A sentence for each element the manifest lacks, and each event whose
/// detail cannot be typed.
pub fn modules(
    compiled: &[Compiled],
    manifest: &Json,
    details: &Details,
    project: &Project,
) -> Result<Vec<(String, String)>, Vec<String>> {
    let families = project.named(&project.families);
    let events = project
        .events
        .as_deref()
        .map(|events| project.named(events))
        .unwrap_or_default();
    let origin = Origin {
        families: &families,
        events: &events,
        runtime: &project.runtime.native,
        event_type: &project.runtime.event_type,
    };
    let mut families: BTreeMap<&str, Vec<Part>> = BTreeMap::new();
    let mut faults = Vec::new();
    let drawn: Vec<&Compiled> = compiled
        .iter()
        .filter(|one| !one.family.tree.is_empty())
        .collect();
    for one in &drawn {
        let (family, element) = one
            .element
            .split_once('/')
            .unwrap_or((one.element.as_str(), "root"));
        match part(one, element, manifest, details, &items_of(one, &drawn)) {
            Ok(part) => families.entry(family).or_default().push(part),
            Err(why) => faults.extend(why),
        }
    }
    if !faults.is_empty() {
        return Err(faults);
    }
    /* The folder each element's module is in, by its tag, as a form names
    an element a box draws. */
    let folders: BTreeMap<String, String> = drawn
        .iter()
        .map(|one| {
            let folder = one
                .element
                .split_once('/')
                .map_or(one.element.as_str(), |(f, _)| f);
            (one.family.tag.clone(), folder.to_owned())
        })
        .collect();
    Ok(families
        .into_iter()
        .map(|(family, mut parts)| {
            /* The root first, as the element the family is named for, then
            its parts in path order, which a stable sort keeps. */
            parts.sort_by_key(|part| part.constant != "rootForm");
            (
                family.to_owned(),
                emit::module_in(family, &parts, &folders, &origin),
            )
        })
        .collect())
}
