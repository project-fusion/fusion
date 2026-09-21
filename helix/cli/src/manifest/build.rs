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

use std::collections::BTreeMap;

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
                /* **The React prop, which is a convention written down.** It is
                the event name with `on` in front, and recording it makes a
                mapping inspectable that is otherwise only in a reader's head. */
                if field == "events" {
                    said.insert("reactProp".to_owned(), json!(format!("on{}", one.name)));
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

/// The directives an example opens with, by the word each carries.
///
/// **Comments on the first lines rather than tags in a doc block**, because an
/// example is markup and markup has no doc blocks. `@summary` says what it
/// shows, `@min` the height it needs to be worth looking at, and `@layout` the
/// frame it wants around it.
///
/// Read until the first line that is not one, so a comment further down is
/// markup a consumer wrote rather than something said about the example.
fn directives(text: &str) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for line in text.lines() {
        let line = line.trim();
        let Some(inner) = line
            .strip_prefix("<!--")
            .and_then(|one| one.strip_suffix("-->"))
        else {
            break;
        };
        let Some(said) = inner.trim().strip_prefix('@') else {
            break;
        };
        let (name, rest) = said.split_once(char::is_whitespace).unwrap_or((said, ""));
        found.insert(name.to_owned(), rest.trim().to_owned());
    }
    found
}

/// A family's examples, by the slug each is filed under.
///
/// **`preview` first and the rest alphabetically**, which is the order the
/// reference page reads them in: the preview is the picture at the top and the
/// others are a list beneath it, so it is not one of them.
///
/// Only the `.html`. Each has a `.tsx` beside it saying the same thing for a
/// framework consumer, and counting both would list every example twice.
fn examples_in(directory: &Path) -> Vec<Value> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut found: Vec<(String, BTreeMap<String, String>)> = entries
        .flatten()
        .filter_map(|one| {
            let path = one.path();
            let slug = path
                .file_name()?
                .to_str()?
                .strip_suffix(".html")?
                .to_owned();
            let text = fs::read_to_string(&path).ok()?;
            Some((slug, directives(&text)))
        })
        .collect();
    found.sort_by(|left, right| {
        let rank = |name: &str| u8::from(name != "preview");
        rank(&left.0)
            .cmp(&rank(&right.0))
            .then_with(|| left.0.cmp(&right.0))
    });
    found
        .into_iter()
        .map(|(slug, said)| {
            let mut entry = serde_json::Map::new();
            if let Some(description) = said.get("summary").filter(|one| !one.is_empty()) {
                entry.insert("description".to_owned(), json!(description));
            }
            /* A height is a number in the manifest and a word in the markup, so
            it is read as one; anything that is not becomes nothing rather than a
            string nobody can compare. */
            if let Some(min) = said.get("min").and_then(|one| one.parse::<i64>().ok()) {
                entry.insert("min".to_owned(), json!(min));
            }
            if let Some(layout) = said.get("layout").filter(|one| !one.is_empty()) {
                entry.insert("layout".to_owned(), json!(layout));
            }
            entry.insert("slug".to_owned(), json!(slug));
            Value::Object(entry)
        })
        .collect()
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
fn helix(
    documented: &Documented,
    path: &str,
    tier: &str,
    is_component: bool,
    package: &Path,
    given: &str,
) -> Option<Value> {
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
            /* **The root's, and not every part's.** A family has one directory
            and one set of examples, and an accordion item is not a second
            family: `Accordion` carries six examples and `Accordion.Item`
            carries none, which is the reference page's own shape, one page per
            family with the parts described inside it. */
            if *part == "root" {
                /* From the repository root rather than the package, because a
                reader following this opens a path in a checkout, and the
                package argument is what says where the package sits. */
                let at = package.join("src").join(family);
                /* **Written as the caller wrote it, not as it resolved.** The
                path is read by a person opening a checkout, so an absolute one
                from whichever machine ran the build is no use to them: `given`
                is the argument as typed and the manifest speaks in those. */
                block.insert(
                    "source".to_owned(),
                    json!(format!("{}/src/{family}", given.trim_end_matches('/'))),
                );
                let examples = examples_in(&at.join(".examples"));
                if !examples.is_empty() {
                    block.insert("examples".to_owned(), json!(examples));
                }
            }
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
    /* **`@reference` is a url and then what to call it.** The tag opens with
    the link because that is the fact; the words after it are how a page says it
    to a reader, and a reference with no words is a bare url nobody would click
    on purpose. */
    let references: Vec<Value> = member
        .documented
        .tags
        .iter()
        .filter(|(tag, _)| tag == "reference")
        .filter_map(|(_, text)| {
            let (url, label) = text.trim().split_once(char::is_whitespace)?;
            Some(json!({ "label": label.trim(), "url": url }))
        })
        .collect();
    if !references.is_empty() {
        at.insert("helix".to_owned(), json!({ "references": references }));
    }
    if let Some(attribute) = &member.attribute {
        at.insert("attribute".to_owned(), json!(attribute));
    }
    if member.reflects {
        at.insert("reflects".to_owned(), json!(true));
    }
    if !member.parameters.is_empty() {
        /* **`@param` says which parameter it describes.** The tag opens with
        the name, so its text is the rest, and a parameter nobody wrote a tag
        for carries no description rather than an empty one. */
        let described: BTreeMap<&str, &str> = member
            .documented
            .tags
            .iter()
            .filter(|(tag, _)| tag == "param")
            .filter_map(|(_, text)| text.split_once(char::is_whitespace))
            .map(|(name, said)| (name.trim(), said.trim()))
            .collect();
        let taken: Vec<Value> = member
            .parameters
            .into_iter()
            .map(|one| {
                let mut said = serde_json::Map::new();
                said.insert("name".to_owned(), json!(one.name));
                if let Some(text) = one.type_text {
                    said.insert("type".to_owned(), json!({ "text": text }));
                }
                if let Some(about) = described.get(one.name.as_str()) {
                    said.insert("description".to_owned(), json!(about));
                }
                if one.optional {
                    said.insert("optional".to_owned(), json!(true));
                }
                Value::Object(said)
            })
            .collect();
        at.insert("parameters".to_owned(), json!(taken));
    }
    Value::Object(at)
}

/// The attributes a class's own fields stand behind.
///
/// **Written from the members rather than beside them.** An attribute is a
/// field with a name in markup, so the two carry the same type, default and
/// description, and generating one from the other is what keeps them from
/// disagreeing. `fieldName` is the join: the attribute says which field it
/// writes to, because the two names differ whenever a camel-cased field takes
/// a kebab-cased attribute.
fn attributes_of(members: &[Value]) -> Vec<Value> {
    members
        .iter()
        .filter_map(|member| {
            let name = member.get("attribute")?.as_str()?;
            let mut said = serde_json::Map::new();
            said.insert("name".to_owned(), json!(name));
            for carried in ["type", "default", "description"] {
                if let Some(value) = member.get(carried) {
                    said.insert(carried.to_owned(), value.clone());
                }
            }
            said.insert(
                "fieldName".to_owned(),
                member.get("name").cloned().unwrap_or_default(),
            );
            Some(Value::Object(said))
        })
        .collect()
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
fn declaration_of(
    one: Declared,
    path: &str,
    tier: &str,
    package: &Path,
    given: &str,
) -> (Value, Vec<(String, Option<String>)>) {
    let mut fields = serde_json::Map::new();
    fields.insert("kind".to_owned(), json!(one.kind));
    fields.insert("name".to_owned(), json!(one.name));
    /* Being an element and registering a tag are two facts, and one class has
    the first without the second: `HelixElement` is Lit's base wearing this
    library's name, and it registers nothing. */
    if one.is_element {
        fields.insert("customElement".to_owned(), json!(true));
    }
    if let Some(tag) = &one.tag_name {
        fields.insert("tagName".to_owned(), json!(tag));
        /* **Both the module this is written in, and both said twice.** The
        schema has one field for where a class lives and another for where its
        tag is registered, and in this library those are the same file: a
        component's `@customElement` sits on the class it registers. Two fields
        with one answer, which is the schema's shape rather than a duplication
        to tidy. */
        fields.insert("definitionPath".to_owned(), json!(path));
        fields.insert("modulePath".to_owned(), json!(path));
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
    if let Some(block) = helix(&one.documented, path, tier, one.is_element, package, given) {
        fields.insert("helix".to_owned(), block);
    }
    for (field, entries) in tagged(&one.documented) {
        fields.insert(field.to_owned(), entries);
    }
    if let Some(description) = one.documented.description {
        fields.insert("description".to_owned(), json!(description));
    }
    if let Some(text) = &one.type_text {
        fields.insert("type".to_owned(), json!({ "text": text }));
    }
    if let Some(default) = &one.default {
        fields.insert("default".to_owned(), json!(default));
    }
    if let Some(returns) = &one.returns {
        fields.insert("return".to_owned(), json!({ "type": { "text": returns } }));
    }
    if !one.parameters.is_empty() {
        let taken: Vec<Value> = one
            .parameters
            .iter()
            .map(|one| match &one.type_text {
                Some(text) => json!({ "name": one.name, "type": { "text": text } }),
                None => json!({ "name": one.name }),
            })
            .collect();
        fields.insert("parameters".to_owned(), json!(taken));
    }
    /* **The base class is the last link and the only one the manifest names
    here.** A mixin between the class and its base contributes members, which is
    the inheritance pass's business, and is not a superclass. */
    if let Some(base) = one.heritage.last() {
        fields.insert("superclass".to_owned(), heritage(base.clone(), path));
    }
    /* **The mixins beside the superclass, and every link but the last is one.**
    A heritage clause is read outermost first with the base class at the end, so
    what remains is exactly what wrapped it, each resolved the same way: a bare
    import names a package and a relative one names a module. */
    if one.heritage.len() > 1 {
        let wrapped: Vec<Value> = one.heritage[..one.heritage.len() - 1]
            .iter()
            .map(|link| heritage(link.clone(), path))
            .collect();
        fields.insert("mixins".to_owned(), json!(wrapped));
    }
    if !one.members.is_empty() {
        let members: Vec<Value> = one.members.into_iter().map(member_of).collect();
        let attributes = attributes_of(&members);
        if !attributes.is_empty() {
            fields.insert("attributes".to_owned(), json!(attributes));
        }
        fields.insert("members".to_owned(), json!(members));
    }
    let heritage = one
        .heritage
        .iter()
        .map(|link| (link.name.clone(), link.from.clone()))
        .collect();
    (Value::Object(fields), heritage)
}

/// The manifest as far as this generator has been taken.
/// A declaration as the first pass leaves it: what it says, what it extends,
/// and whether it is an element.
type Pending = (Value, Vec<(String, Option<String>)>, bool);

pub fn build(package: &Path, given: &str, tier: &str, dependencies: &Dependencies) -> Value {
    /* **Two passes, because a class may extend one in its own package.**
    `HelixFormElement extends HelixElement` through a relative import, and
    resolving it means this package's other modules, which nothing has read
    until every module has been read. So the first pass writes the declarations
    and the second gives each what its heritage has, with this package's own
    manifest standing among the dependencies by the name nothing imports it by. */
    let written: Vec<(String, Vec<Pending>)> = sources(package)
        .into_iter()
        .map(|path| {
            let text = fs::read_to_string(package.join(&path)).unwrap_or_default();
            let declared = declarations(&text, &path)
                .into_iter()
                .map(|one| {
                    let is_element = one.is_element;
                    let (declaration, heritage) = declaration_of(one, &path, tier, package, given);
                    (declaration, heritage, is_element)
                })
                .collect();
            (path, declared)
        })
        .collect();

    let mine = json!({
        "modules": written
            .iter()
            .map(|(path, declared)| json!({
                "declarations": declared.iter().map(|(one, _, _)| one.clone()).collect::<Vec<Value>>(),
                "path": path,
            }))
            .collect::<Vec<Value>>()
    });

    let modules: Vec<Value> = written
        .into_iter()
        .map(|(path, declared)| {
            let finished: Vec<Value> = declared
                .into_iter()
                .map(|(mut declaration, heritage, is_element)| {
                    inherit::apply(&mut declaration, &heritage, dependencies, &mine, is_element);
                    declaration
                })
                .collect();
            json!({
                "declarations": finished,
                "exports": [],
                "kind": "javascript-module",
                "path": path,
            })
        })
        .collect();
    json!({ "modules": modules, "readme": "", "schemaVersion": "2.1.0" })
}
