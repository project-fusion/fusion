//! A custom elements manifest, generated from the sources rather than from a
//! JavaScript analyzer reading them through a pinned compiler.
//!
//! **Why this exists at all.** The analyzer in use pins `typescript@~5.4.2` and
//! vendors its own copy, while this repository is on 7.0.2, so every manifest
//! shipped today is source written for one compiler read by another three major
//! versions behind it. Moving to a different JavaScript analyzer moves that pin;
//! parsing here removes it.
//!
//! **Built a layer at a time, each held to the analyzer's output before the
//! next is started.** `manifest diff` is the instrument and it is unforgiving on
//! purpose: a layer is done when the two manifests disagree about nothing in
//! that layer's terms. Nothing here is trusted because it looks right.
//!
//! **The modules are the first layer, and they are a file walk.** Measured
//! against all four tiers: the analyzer's module list is exactly `src/**/*.ts`
//! less the specs, the declarations and the generated files, sorted, with no
//! parse involved in deciding what is in it. So this layer can be finished and
//! proved before a parser is pointed at anything.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

pub use crate::manifest::inherit::Dependencies;
use crate::manifest::jsdoc::{entry, Documented};

use crate::manifest::inherit;
use crate::manifest::parse::{declarations, Declared, Superclass};

/// Files the analyzer is told to skip, by the suffix that names them.
///
/// A spec is not API, a `.d.ts` declares something else's, and a generated file
/// is an output rather than a source. These are the analyzer's own three
/// exclusions, kept verbatim: this layer is held to its output, so a fourth of
/// our own would be a difference to explain rather than a tidy-up.
const SKIPPED: [&str; 3] = [".spec.ts", ".d.ts", ".generated.ts"];

fn walk(at: &Path, package: &Path, into: &mut Vec<String>) {
    let Ok(entries) = fs::read_dir(at) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|one| one.path()).collect();
    /* Read in a fixed order rather than the directory's, which is the file
    system's business and differs between one machine and another. The sort
    in `sources` settles the result either way; this keeps a partial run from
    differing too. */
    paths.sort();
    for path in paths {
        if path.is_dir() {
            walk(&path, package, into);
            continue;
        }
        let Some(name) = path.file_name().and_then(|one| one.to_str()) else {
            continue;
        };
        /* The extension through `Path`, which compares the one segment rather
        than the tail of the name, and the three exclusions as suffixes,
        because `.spec.ts` and `.d.ts` are not extensions: the extension of
        `area.spec.ts` is `ts`, and what marks it is the segment before. */
        if path.extension().is_none_or(|one| one != "ts") {
            continue;
        }
        if SKIPPED.iter().any(|one| name.ends_with(one)) {
            continue;
        }
        if let Ok(relative) = path.strip_prefix(package) {
            /* Forward slashes whatever the host writes, because this is a value
            in a JSON document read on every platform rather than a path this
            program will open again. */
            let parts: Vec<String> = relative
                .components()
                .map(|one| one.as_os_str().to_string_lossy().into_owned())
                .collect();
            into.push(parts.join("/"));
        }
    }
}

/// Every source the manifest speaks for, by its path relative to the package.
///
/// Sorted, which is the order the analyzer emits and therefore the order this
/// has to emit: `manifest diff` reads order as well as membership, because one
/// of the analyzer's own plugins exists to keep the output stable.
pub fn sources(package: &Path) -> Vec<String> {
    let mut found = Vec::new();
    walk(&package.join("src"), package, &mut found);
    found.sort();
    found
}

/// The tags a declaration carries, by the field each one fills.
///
/// **The tag's own name, not a guess from its shape.** `@cssproperty` fills
/// `cssProperties` and `@cssstate` fills `cssStates`, which are two words apart
/// and four characters, so they are written down rather than derived.
const LISTS: [(&str, &str); 5] = [
    ("csspart", "cssParts"),
    ("cssproperty", "cssProperties"),
    ("cssstate", "cssStates"),
    ("event", "events"),
    ("slot", "slots"),
];

/// What a doc block's tags say, as the lists the manifest carries.
///
/// In the order they are written. The analyzer sorts the modules of a manifest
/// and nothing inside a declaration, and every list in these sources is written
/// alphabetically already, so source order is both what it does and what the
/// sources want.
fn tagged(documented: &Documented) -> Vec<(&'static str, Value)> {
    let mut found = Vec::new();
    for (tag, field) in LISTS {
        let entries: Vec<Value> = documented
            .tags
            .iter()
            .filter(|(name, _)| name == tag)
            .map(|(_, text)| {
                let one = entry(text);
                let mut said = serde_json::Map::new();
                if let Some(written) = one.type_text {
                    said.insert("type".to_owned(), json!({ "text": written }));
                }
                if let Some(description) = one.description {
                    said.insert("description".to_owned(), json!(description));
                }
                said.insert("name".to_owned(), json!(one.name));
                Value::Object(said)
            })
            .collect();
        if !entries.is_empty() {
            found.push((field, json!(entries)));
        }
    }
    found
}

/// A relative specifier resolved against the module that wrote it.
///
/// **Kept as written, and rooted.** `../helix-element/helix-element.js` from
/// `src/helix-form-element/…` is recorded as
/// `/src/helix-element/helix-element.js`: the `.js` the source wrote rather
/// than the `.ts` it is, and a leading slash the manifest's own module paths do
/// not carry.
///
/// **Which makes two formats for one field**, since a superclass with no import
/// takes the module's path verbatim, unrooted and with its real extension. Both
/// are the analyzer's and both are reproduced: this is measured against it, and
/// tidying either would be a difference to defend.
fn beside(path: &str, specifier: &str) -> Option<String> {
    let mut parts: Vec<String> = path.split('/').map(ToOwned::to_owned).collect();
    parts.pop();
    for step in specifier.split('/') {
        match step {
            "." => {}
            ".." => {
                parts.pop()?;
            }
            other => parts.push(other.to_owned()),
        }
    }
    Some(format!("/{}", parts.join("/")))
}

/// A kebab name in the `PascalCase` a group and a part are written in.
fn pascal(value: &str) -> String {
    value
        .split('-')
        .filter(|one| !one.is_empty())
        .map(|one| {
            let mut chars = one.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect()
}

/// The `helix` block: what the library records about a component beyond the
/// custom elements schema.
///
/// **Its own plugins put this there and the schema says nothing about it**, so
/// the rules are read from those plugins rather than inferred: the tag-derived
/// half from `helix-metadata`, and the family's place in the library from
/// `helix-composition`, which takes the two directories under `src` and writes
/// them `PascalCase`, prefixing a headless group with `Base` because that tier is
/// a parallel family rather than a variant.
fn helix(documented: &Documented, path: &str, tier: &str, is_component: bool) -> Option<Value> {
    let mut block = serde_json::Map::new();
    let single = |name: &str| {
        documented
            .tags
            .iter()
            .find(|(tag, _)| tag == name)
            .map(|(_, text)| text.trim().to_owned())
            .filter(|one| !one.is_empty())
    };
    if let Some(category) = single("category") {
        block.insert("category".to_owned(), json!(category));
    }
    if let Some(since) = single("since") {
        block.insert("since".to_owned(), json!(since));
    }
    /* Anything but the three is ignored rather than trusted, which is the
    plugin's own rule: a typo would otherwise publish a badge nobody meant. */
    if let Some(status) = single("status")
        .filter(|one| matches!(one.as_str(), "deprecated" | "experimental" | "stable"))
    {
        block.insert("status".to_owned(), json!(status));
    }
    if let Some(documentation) = single("documentation") {
        block.insert("documentation".to_owned(), json!(documentation));
    }
    let aliases: Vec<String> = single("aliases")
        .unwrap_or_default()
        .split(',')
        .map(|one| one.trim().to_owned())
        .filter(|one| !one.is_empty())
        .collect();
    if !aliases.is_empty() {
        block.insert("aliases".to_owned(), json!(aliases));
    }
    if is_component {
        block.insert("tier".to_owned(), json!(tier));
        let parts: Vec<&str> = path.split('/').collect();
        /* `src/<family>/<part>/<file>.ts` and nothing else: a file directly
        under a family has no part to name, so the pair is left off rather
        than half written. */
        /* The file itself is not examined: `sources` yields nothing but `.ts`,
        so a fourth segment here is one by construction. */
        if let ["src", family, part, _] = parts.as_slice() {
            let prefix = if tier == "headless" { "Base" } else { "" };
            block.insert(
                "group".to_owned(),
                json!(format!("{prefix}{}", pascal(family))),
            );
            block.insert("part".to_owned(), json!(pascal(part)));
        }
    }
    if block.is_empty() {
        None
    } else {
        Some(Value::Object(block))
    }
}

/// One class member, as the manifest carries it.
fn member_of(member: crate::manifest::parse::Member) -> Value {
    let mut at = serde_json::Map::new();
    at.insert("kind".to_owned(), json!(member.kind));
    at.insert("name".to_owned(), json!(member.name));
    if let Some(description) = member.documented.description {
        at.insert("description".to_owned(), json!(description));
    }
    if let Some(text) = member.type_text {
        at.insert("type".to_owned(), json!({ "text": text }));
    }
    if let Some(default) = member.default {
        at.insert("default".to_owned(), json!(default));
    }
    if member.is_static {
        at.insert("static".to_owned(), json!(true));
    }
    if member.readonly {
        at.insert("readonly".to_owned(), json!(true));
    }
    if let Some(privacy) = member.privacy {
        at.insert("privacy".to_owned(), json!(privacy));
    }
    if let Some(returns) = member.returns {
        at.insert("return".to_owned(), json!({ "type": { "text": returns } }));
    }
    if !member.parameters.is_empty() {
        let taken: Vec<Value> = member
            .parameters
            .into_iter()
            .map(|(name, written)| match written {
                Some(text) => json!({ "name": name, "type": { "text": text } }),
                None => json!({ "name": name }),
            })
            .collect();
        at.insert("parameters".to_owned(), json!(taken));
    }
    Value::Object(at)
}

/// Where a base class came from, in the shape the manifest records it.
fn heritage(superclass: Superclass, path: &str) -> Value {
    let mut said = serde_json::Map::new();
    said.insert("name".to_owned(), json!(superclass.name));
    /* **A relative import names a module and a bare one names a package.**
    `../x/x.js` is resolved against the module importing it and kept as written,
    rooted with a slash; anything else is a package, carried verbatim.

    **A name with no import at all is this module's own**, which is the
    analyzer's rule and is reproduced rather than corrected: `HelixActivateEvent
    extends CustomEvent` is recorded as extending something in
    `src/events/events.ts`, and `CustomEvent` is the platform's. Arguably wrong,
    certainly not ours to change while this is measured against it. */
    match superclass.from {
        Some(from) if from.starts_with('.') => {
            if let Some(module) = beside(path, &from) {
                said.insert("module".to_owned(), json!(module));
            }
        }
        Some(from) => {
            said.insert("package".to_owned(), json!(from));
        }
        None => {
            said.insert("module".to_owned(), json!(path));
        }
    }
    Value::Object(said)
}

/// One declaration, as the manifest carries it.
fn declaration_of(one: Declared, path: &str, tier: &str) -> Value {
    let mut fields = serde_json::Map::new();
    fields.insert("kind".to_owned(), json!(one.kind));
    fields.insert("name".to_owned(), json!(one.name));
    if let Some(tag) = &one.tag_name {
        fields.insert("tagName".to_owned(), json!(tag));
        fields.insert("customElement".to_owned(), json!(true));
    }
    if let Some(summary) = one
        .documented
        .tags
        .iter()
        .find(|(name, _)| name == "summary")
        .map(|(_, text)| text.trim().to_owned())
    {
        fields.insert("summary".to_owned(), json!(summary));
    }
    if let Some(block) = helix(&one.documented, path, tier, one.tag_name.is_some()) {
        fields.insert("helix".to_owned(), block);
    }
    for (field, entries) in tagged(&one.documented) {
        fields.insert(field.to_owned(), entries);
    }
    if let Some(description) = one.documented.description {
        fields.insert("description".to_owned(), json!(description));
    }
    if let Some(superclass) = one.superclass {
        fields.insert("superclass".to_owned(), heritage(superclass, path));
    }
    if !one.members.is_empty() {
        let members: Vec<Value> = one.members.into_iter().map(member_of).collect();
        fields.insert("members".to_owned(), json!(members));
    }
    Value::Object(fields)
}

/// The manifest as far as this generator has been taken.
pub fn build(package: &Path, tier: &str, dependencies: &Dependencies) -> Value {
    let modules: Vec<Value> = sources(package)
        .into_iter()
        .map(|path| {
            let text = fs::read_to_string(package.join(&path)).unwrap_or_default();
            let declared: Vec<Value> = declarations(&text, &path)
                .into_iter()
                .map(|one| {
                    let mut declaration = declaration_of(one, &path, tier);
                    inherit::apply(&mut declaration, dependencies);
                    declaration
                })
                .collect();
            json!({
                "declarations": declared,
                "exports": [],
                "kind": "javascript-module",
                "path": path,
            })
        })
        .collect();
    json!({ "modules": modules, "readme": "", "schemaVersion": "2.1.0" })
}
