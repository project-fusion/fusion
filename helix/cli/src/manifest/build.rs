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

use std::collections::{BTreeMap, BTreeSet};

use serde_json::{json, Value};

pub use crate::manifest::inherit::Dependencies;
use crate::manifest::jsdoc::{entry, Documented};

use crate::manifest::inherit;
use crate::manifest::inherit::INHERITS;
use crate::manifest::parse;
use crate::manifest::parse::{
    declarations, exports, Declared, Exported, Origin, Parameter, Readonly, Superclass, Written,
};
use crate::manifest::unions;

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

/// What the analyzer saw dispatched, beside what the class declared.
///
/// An inferred event carries a type and sometimes a name and never a
/// description, which is what marks it: `declared` drops exactly those from a
/// component, leaving the empty list the two roots in core carry. On a mixin
/// they stand, which is the only place in the library they survive.
///
/// A name the class already declared is not added twice.
fn seen(dispatched: &[(String, Option<String>)], declared: Option<&Value>) -> Value {
    let mut events = declared
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let held: BTreeSet<String> = events
        .iter()
        .filter_map(|one| Some(one.get("name")?.as_str()?.to_owned()))
        .collect();
    for (kind, name) in dispatched {
        if name.as_ref().is_some_and(|two| held.contains(two)) {
            continue;
        }
        /* Named before it is typed, which is the order the pass over the class
        body reads a dispatch in and the reverse of an `@event` tag's. */
        let mut said = serde_json::Map::new();
        if let Some(name) = name {
            said.insert("name".to_owned(), json!(name));
        }
        said.insert("type".to_owned(), json!({ "text": kind }));
        events.push(Value::Object(said));
    }
    json!(events)
}

/// The lists a class was given, in the order the inheritance walk creates
/// them.
///
/// **A key is made where an entry is first added to it, and the walk reaches a
/// parent's mixins before the parent.** The styled checkbox is given `events`
/// before `slots` because `MixinControllerChecked`, which the headless
/// checkbox applies, comes before the headless checkbox itself; reading the
/// parent's own lists in order instead put `slots` first, which is twenty-five
/// of styled's classes.
///
/// The chain is the analyzer's `getInheritanceTree`: the class, then its own
/// mixins, then for each step up the superclass chain that class's mixins and
/// the class. Only the order is taken from it, what each list holds having
/// been settled already.
fn chained(finished: &mut [Vec<Value>], deps: &Dependencies) {
    let mut index: BTreeMap<String, Value> = BTreeMap::new();
    for manifest in deps.values() {
        for module in manifest
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            for one in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                if let Some(name) = one.get("name").and_then(Value::as_str) {
                    index.entry(name.to_owned()).or_insert_with(|| one.clone());
                }
            }
        }
    }
    for declared in finished.iter() {
        for one in declared {
            if let Some(name) = one.get("name").and_then(Value::as_str) {
                index.entry(name.to_owned()).or_insert_with(|| one.clone());
            }
        }
    }

    for declared in finished.iter_mut() {
        for one in declared.iter_mut() {
            let order = creation(one, &index);
            if let Some(fields) = one.as_object_mut() {
                regrouped(fields, &order);
            }
        }
    }
}

/// The names a class inherits from, in the order the walk reaches them.
fn ancestry(one: &Value, index: &BTreeMap<String, Value>) -> Vec<String> {
    let names = |at: &Value, key: &str| -> Vec<String> {
        at.get(key)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|two| Some(two.get("name")?.as_str()?.to_owned()))
            .collect()
    };
    let mut tree: Vec<String> = names(one, "mixins");
    let mut at = one.clone();
    let mut guard = 0;
    while let Some(above) = at
        .get("superclass")
        .and_then(|two| two.get("name"))
        .and_then(Value::as_str)
        .and_then(|two| index.get(two))
        .cloned()
    {
        guard += 1;
        if guard > 32 {
            break;
        }
        tree.extend(names(&at, "mixins"));
        tree.extend(names(&above, "mixins"));
        tree.push(
            above
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_owned(),
        );
        at = above;
    }
    tree
}

/// The list keys the walk creates, in the order it creates them.
fn creation(one: &Value, index: &BTreeMap<String, Value>) -> Vec<&'static str> {
    let mut order: Vec<&'static str> = Vec::new();
    for name in ancestry(one, index) {
        let Some(above) = index.get(&name) else {
            continue;
        };
        for list in INHERITS {
            if above.get(list).is_some() && !order.contains(&list) {
                order.push(list);
            }
        }
    }
    order
}

/// The lists a class was given put in that order, the rest left alone.
///
/// A list the class filled itself sits ahead of the heritage and the plugins
/// and is not touched; one it was given trails them, and those are the ones
/// this puts in order.
fn regrouped(fields: &mut serde_json::Map<String, Value>, order: &[&'static str]) {
    let divides = [
        "mixins",
        "superclass",
        "summary",
        "helix",
        "tagName",
        "customElement",
    ]
    .iter()
    .filter_map(|key| fields.keys().position(|one| one == key))
    .min();
    let Some(divides) = divides else {
        return;
    };
    let given: Vec<String> = fields
        .keys()
        .enumerate()
        .filter(|(at, one)| *at > divides && INHERITS.contains(&one.as_str()))
        .map(|(_, one)| one.clone())
        .collect();
    if given.len() < 2 {
        return;
    }
    let mut wanted: Vec<String> = fields
        .keys()
        .filter(|one| !given.contains(one))
        .cloned()
        .collect();
    wanted.extend(
        order
            .iter()
            .filter(|list| given.iter().any(|one| one == *list))
            .map(|list| (*list).to_owned()),
    );
    let mut held: Vec<(String, Value)> = std::mem::take(fields).into_iter().collect();
    for key in wanted {
        if let Some(at) = held.iter().position(|(name, _)| *name == key) {
            let (name, value) = held.remove(at);
            fields.insert(name, value);
        }
    }
    for (name, value) in held {
        fields.insert(name, value);
    }
}

/// The React prop an event answers to, which is a convention written down.
///
/// It is the event name with `on` in front, and recording it makes a mapping
/// inspectable that is otherwise only in a reader's head.
///
/// **Written after inheritance, which is where it shows.** An event a mixin
/// was seen to dispatch reaches a component as a name and a type, gains the
/// sentence the component's `@event` tag wrote and the stamp saying where it
/// came from, and only then this: `name, type, description, inheritedFrom,
/// reactProp`. Written where the tag is read instead, it came third and the
/// order said the wrong thing about which of them the entry began as.
///
/// Only on a component, which is why the two events inferred on mixins in
/// core carry none.
fn reacted(finished: &mut [Vec<Value>]) {
    for declared in finished.iter_mut() {
        for one in declared.iter_mut() {
            if one.get("kind").and_then(Value::as_str) != Some("class")
                || one.get("helix").and_then(|two| two.get("tier")).is_none()
            {
                continue;
            }
            let Some(events) = one.get_mut("events").and_then(Value::as_array_mut) else {
                continue;
            };
            for event in events {
                let Some(name) = event.get("name").and_then(Value::as_str) else {
                    continue;
                };
                let prop = json!(format!("on{name}"));
                if let Some(fields) = event.as_object_mut() {
                    fields.insert("reactProp".to_owned(), prop);
                }
            }
        }
    }
}

/// A public method's signature, written once everything else about it is.
///
/// **Last of all, because where it sits says who wrote it.** A method taken
/// from a class that already had a signature arrives with it, ahead of the
/// stamp naming where it came from; one taken from a mixin, which has none,
/// gains it after. Written where the method is read instead, both came out the
/// same way.
fn signatures(finished: &mut [Vec<Value>]) {
    for declared in finished.iter_mut() {
        for one in declared.iter_mut() {
            if one.get("customElement").and_then(Value::as_bool) != Some(true) {
                continue;
            }
            let Some(members) = one.get_mut("members").and_then(Value::as_array_mut) else {
                continue;
            };
            for member in members {
                inherit::sign(member);
            }
        }
    }
}

/// Where a class lives and where its tag is registered, which are the same
/// file and are said twice.
///
/// The schema has one field for each, and in this library a component's
/// `@customElement` sits on the class it registers, so both answer the same
/// thing: the schema's shape rather than a duplication to tidy.
///
/// **Written after everything else**, because the analyzer writes them in a
/// plugin that runs once inheritance has finished, so they trail the lists it
/// added rather than leading them.
fn registered(written: &[(String, Vec<Pending>, Vec<Value>)], finished: &mut [Vec<Value>]) {
    for ((path, _, _), declared) in written.iter().zip(finished.iter_mut()) {
        for one in declared.iter_mut() {
            if one.get("tagName").is_none() {
                continue;
            }
            if let Some(fields) = one.as_object_mut() {
                fields.insert("modulePath".to_owned(), json!(path));
                fields.insert("definitionPath".to_owned(), json!(path));
            }
        }
    }
}

/// An event a component publishes is one it declared, and no other.
///
/// **What the analyzer infers is not API.** It records an event for every
/// `dispatchEvent` it can see, and a call inside a mixin or a helper is not
/// something it can name correctly: a dispatch through `emit(name, detail)`
/// yields a phantom event called `name` on every element that inherits it,
/// which is why this library ships no such helper. An event with no
/// description came from inference rather than from an `@event` tag, and that
/// is what marks it.
///
/// Only on a component, which is a class descending from `HelixElement`. A
/// mixin keeps what was inferred on it, and the two in core are the only
/// places in the library where an inferred event survives.
///
/// **The empty list stays.** `HelixElement` and `HelixFormElement` dispatch
/// between them six events and declare none, and both carry `"events": []`
/// rather than nothing, which is a different thing to write.
fn declared(finished: &mut [Vec<Value>]) {
    for declared in finished.iter_mut() {
        for one in declared.iter_mut() {
            /* A component is a class descending from `HelixElement`, which is
            what the tier in its block says. Every class has a block now, so
            the block alone no longer tells them apart. */
            if one.get("kind").and_then(Value::as_str) != Some("class")
                || one.get("helix").and_then(|two| two.get("tier")).is_none()
            {
                continue;
            }
            let Some(events) = one.get("events").and_then(Value::as_array) else {
                continue;
            };
            let mut kept: Vec<Value> = events
                .iter()
                .filter(|two| {
                    two.get("description")
                        .and_then(Value::as_str)
                        .is_some_and(|said| !said.trim().is_empty())
                })
                .cloned()
                .collect();
            /* **The React prop, which is a convention written down.** It is
            the event name with `on` in front, and recording it makes a mapping
            inspectable that is otherwise only in a reader's head. Written here
            rather than where the `@event` tag is read, because the analyzer
            writes it in a plugin that runs once inheritance has finished: an
            event a component declares and a mixin below it also dispatches
            comes out in the mixin's order, with the prop last of all. */
            for two in &mut kept {
                let Some(name) = two.get("name").and_then(Value::as_str) else {
                    continue;
                };
                let prop = format!("on{name}");
                if let Some(said) = two.as_object_mut() {
                    said.insert("reactProp".to_owned(), json!(prop));
                }
            }
            if let Some(fields) = one.as_object_mut() {
                fields.insert("events".to_owned(), json!(kept));
            }
        }
    }
}

/// Hooks a class answers because it took another's stylesheet outright.
///
/// **Borrowing a stylesheet is not inheritance and no field has a name for
/// it.** `HelixCopyButton` writes `static override styles = [
/// HelixIconButton.styles, styles]`, so it really does answer
/// `--icon-button-radius`, `--icon-button-shadow` and `--icon-button-size`:
/// the rules reading them are in its shadow root because it put them there.
/// Nothing in the class relationship says so, and without this the three are
/// missing from its page.
///
/// The borrower's own `@cssproperty` wins, documenting the hook against the
/// component a reader is actually reading about, and a second entry under one
/// name would print the row twice. The rest are appended rather than merged:
/// what the component owns is what a reader came for, and the borrowed ones
/// follow in the order the lender declared them.
///
/// `inheritedFrom` names the lender, because the hook still belongs to it.
fn lend(
    written: &[(String, Vec<Pending>, Vec<Value>)],
    finished: &mut [Vec<Value>],
    deps: &Dependencies,
) {
    /* Every class by name, with the module it sits in, taken after inheritance
    has run so a lender's own inherited hooks are lent on too. */
    let mut index: BTreeMap<String, (Value, String)> = BTreeMap::new();
    for manifest in deps.values() {
        for module in manifest
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let path = module
                .get("path")
                .and_then(Value::as_str)
                .unwrap_or_default();
            for one in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                if let Some(name) = one.get("name").and_then(Value::as_str) {
                    index
                        .entry(name.to_owned())
                        .or_insert_with(|| (one.clone(), path.to_owned()));
                }
            }
        }
    }
    for ((path, _, _), declared) in written.iter().zip(finished.iter()) {
        for one in declared {
            if let Some(name) = one.get("name").and_then(Value::as_str) {
                index
                    .entry(name.to_owned())
                    .or_insert_with(|| (one.clone(), path.clone()));
            }
        }
    }

    for ((_, pending, _), declared) in written.iter().zip(finished.iter_mut()) {
        for ((_, _, _, borrows), one) in pending.iter().zip(declared.iter_mut()) {
            if borrows.is_empty() {
                continue;
            }
            let mut held: BTreeSet<String> = one
                .get("cssProperties")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|two| Some(two.get("name")?.as_str()?.to_owned()))
                .collect();
            let mut gained: Vec<Value> = Vec::new();
            for source in borrows {
                let Some((lender, module)) = index.get(source) else {
                    continue;
                };
                for hook in lender
                    .get("cssProperties")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    let Some(name) = hook.get("name").and_then(Value::as_str) else {
                        continue;
                    };
                    if !held.insert(name.to_owned()) {
                        continue;
                    }
                    let mut copy = hook.clone();
                    if let Some(fields) = copy.as_object_mut() {
                        fields.insert(
                            "inheritedFrom".to_owned(),
                            json!({ "name": source, "module": module }),
                        );
                    }
                    gained.push(copy);
                }
            }
            if gained.is_empty() {
                continue;
            }
            if let Some(fields) = one.as_object_mut() {
                let mut all = fields
                    .get("cssProperties")
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default();
                all.extend(gained);
                fields.insert("cssProperties".to_owned(), json!(all));
            }
        }
    }
}

/// A list of parameters as the manifest writes them.
///
/// **One writer, because it is written from two.** A method's parameters and a
/// plain function's are the same thing said in the same way, and they were
/// written by two pieces of code that had drifted: the second knew nothing of
/// defaults, of optionality or of `@param`, so `drawIcon`, `ticks` and seven
/// others lost what they say about their own arguments.
///
/// `@param` opens with the name it describes, so its text is the rest, and a
/// parameter nobody wrote a tag for carries no description rather than an
/// empty one.
fn parameters(taken: &[Parameter], tags: &[(String, String)]) -> Vec<Value> {
    let described: BTreeMap<&str, &str> = tags
        .iter()
        .filter(|(tag, _)| tag == "param")
        .filter_map(|(_, text)| text.split_once(char::is_whitespace))
        /* **A dash between the name and the sentence is punctuation.** The
        library writes `@param tilt - The angle handed to the shader`, and the
        description is the sentence rather than the sentence with a dash in
        front of it. */
        .map(|(name, said)| (name.trim(), said.trim().trim_start_matches("- ").trim()))
        .collect();
    taken
        .iter()
        .map(|one| {
            let mut said = serde_json::Map::new();
            said.insert("name".to_owned(), json!(one.name));
            if let Some(value) = &one.default {
                said.insert("default".to_owned(), json!(value));
            }
            if let Some(text) = &one.type_text {
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
        .collect()
}

/// The directives an example opens with, by the word each carries.
///
/// **Comments rather than tags in a doc block**, because an example is markup
/// and markup has no doc blocks. Anywhere in the file, not only at its head:
/// two of the slider's examples open with the stylesheet they need and write
/// the directive under it, and reading only the opening lines lost those. `@summary` says what it
/// shows, `@min` the height it needs to be worth looking at, and `@layout` the
/// frame it wants around it.
///
/// Read until the first line that is not one, so a comment further down is
/// markup a consumer wrote rather than something said about the example.
fn directives(text: &str) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    let mut rest = text;
    while let Some(at) = rest.find("<!--") {
        let after = &rest[at + 4..];
        let Some(end) = after.find("-->") else {
            break;
        };
        let inner = &after[..end];
        rest = &after[end + 3..];
        let Some(said) = inner.trim().strip_prefix('@') else {
            continue;
        };
        let (name, text) = said.split_once(char::is_whitespace).unwrap_or((said, ""));
        /* **A directive may wrap, and the wrap is the file's width.** Image's
        placeholder writes three lines of `@summary` and the manifest has one
        sentence, so the breaks and the indent that follows them become single
        spaces. */
        let text = text.split_whitespace().collect::<Vec<&str>>().join(" ");
        /* The first of a name wins, a second being a consumer's markup rather
        than a second answer to the same question. Nothing in the library
        writes one twice, so this is a choice rather than a measurement. */
        found.entry(name.to_owned()).or_insert(text);
    }
    found
}

/// A family's examples, by the slug each is filed under.
///
/// **`preview` first and the rest by file name**, which is the order the
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
    /* **By the file name, which is not the same as by the slug.** A directory
    holding `compact.html` and `compact-counts.html` reads the second first,
    because the dash sorts before the dot that follows `compact`. All hundred
    and ninety-four families with examples order this way and none orders by
    the slug alone. */
    found.sort_by(|left, right| {
        let rank = |name: &str| u8::from(name != "preview");
        let file = |name: &str| format!("{name}.html");
        rank(&left.0)
            .cmp(&rank(&right.0))
            .then_with(|| file(&left.0).cmp(&file(&right.0)))
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
/// A package's directory as the repository names it, in forward slashes.
///
/// The root is the nearest directory above holding a `.git`, which is how the
/// plugin this replaced found it. Where there is none, the path is given back
/// as the caller wrote it, which is the most that can be said.
fn rooted(package: &Path, given: &str) -> String {
    let Ok(here) = package.canonicalize() else {
        return given.trim_end_matches('/').to_owned();
    };
    let Some(root) = here.ancestors().find(|one| one.join(".git").exists()) else {
        return given.trim_end_matches('/').to_owned();
    };
    let Ok(inside) = here.strip_prefix(root) else {
        return given.trim_end_matches('/').to_owned();
    };
    inside
        .components()
        .map(|one| one.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<String>>()
        .join("/")
}

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
    /* **`@groups` is held to a list and a typo is dropped rather than kept.**
    The plugin's own reason: a misspelling lands a family in a group of one,
    which is invisible, where dropping it leaves the family ungrouped and the
    check says so. One group exists today and the list is written here because
    it is written there. */
    let grouped: Vec<String> = single("groups")
        .unwrap_or_default()
        .split(',')
        .map(|one| one.trim().to_owned())
        .filter(|one| one == "charts")
        .collect();
    if !grouped.is_empty() {
        block.insert("groups".to_owned(), json!(grouped));
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
                /* **From the repository root, whoever asked and from wherever.**
                A reader following this opens a path in a checkout, so an
                absolute one from whichever machine ran the build is no use to
                them, and neither is one relative to wherever the command
                happened to be run: `helix/headless/src/accordion` from the root
                and `./src/accordion` from the package are the same directory,
                and the second is what the first build from a package's own
                directory wrote. */
                let at = package.join("src").join(family);
                block.insert(
                    "source".to_owned(),
                    json!(match rooted(package, given).as_str() {
                        /* The package is the repository, which the plugin this
                        replaced wrote as `src/…` rather than `/src/…`. */
                        "" => format!("src/{family}"),
                        prefix => format!("{prefix}/src/{family}"),
                    }),
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
    /* A type the field wrote is read with the field; one taken from a constant
    beside it is written later, by the pass that resolves initializers. */
    let resolved = member
        .written
        .as_ref()
        .is_some_and(|one| one.type_text.is_none());
    let text = member.type_text.map(|one| (one, resolved));
    if let Some((one, false)) = &text {
        at.insert("type".to_owned(), json!({ "text": one }));
    }
    if let Some(privacy) = member.privacy {
        at.insert("privacy".to_owned(), json!(privacy));
    }
    if member.is_static {
        at.insert("static".to_owned(), json!(true));
    }
    /* **These four go in the order the analyzer reads them, because that is
    the order they are written in.** A `readonly` modifier is read with the
    other modifiers and a getter is called readonly by a later pass; a default
    the field wrote is read before the description and one assigned in the
    constructor after it. `order` leaves these where they are put and places
    what sits around them. */
    if member.readonly == Readonly::Modifier {
        at.insert("readonly".to_owned(), json!(true));
    }
    let default = member.default.map(|one| (one, member.assigned));
    if let Some((one, false)) = &default {
        at.insert("default".to_owned(), json!(one));
    }
    if let Some(description) = member.documented.description {
        at.insert("description".to_owned(), json!(description));
    }
    if member.readonly == Readonly::Accessor {
        at.insert("readonly".to_owned(), json!(true));
    }
    if let Some((one, true)) = &default {
        at.insert("default".to_owned(), json!(one));
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
    if let Some(attribute) = &member.attribute {
        at.insert("attribute".to_owned(), json!(attribute));
    }
    if member.reflects {
        at.insert("reflects".to_owned(), json!(true));
    }
    if !references.is_empty() {
        at.insert("helix".to_owned(), json!({ "references": references }));
    }
    if !member.parameters.is_empty() {
        at.insert(
            "parameters".to_owned(),
            json!(parameters(&member.parameters, &member.documented.tags)),
        );
    }

    /* Last of all, the resolving pass running after everything that reads the
    field itself, the attribute it declares included. */
    if let Some((one, true)) = &text {
        at.insert("type".to_owned(), json!({ "text": one }));
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
fn attributes_of(members: &[Value], written: &[Option<Written>]) -> Vec<Value> {
    members
        .iter()
        .zip(written)
        .filter_map(|(member, written)| {
            let name = member.get("attribute")?.as_str()?;
            let mut said = serde_json::Map::new();
            said.insert("name".to_owned(), json!(name));
            for carried in ["type", "default", "description"] {
                /* **The attribute says what the field wrote.** Where a
                constant was resolved for the field, the attribute keeps the
                constant's name, and has no type where the field's type came
                from the constant as well. */
                let value = match (carried, written) {
                    ("default", Some(one)) => one.default.as_ref().map(|two| json!(two)),
                    ("type", Some(one)) => one.type_text.as_ref().map(|two| json!({ "text": two })),
                    _ => member.get(carried).cloned(),
                };
                if let Some(value) = value {
                    said.insert(carried.to_owned(), value);
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
    /* **A class always carries the block, empty where it has nothing to say.**
    All three hundred and forty-one in the library do and no mixin, function or
    variable does: a controller with no tier and no group still says `{}`. The
    comparison could not see this either, an empty object holding no leaf to
    compare. */
    let block = helix(&one.documented, path, tier, one.is_element, package, given);
    if let Some(block) = block.or_else(|| (one.kind == "class").then(|| json!({}))) {
        fields.insert("helix".to_owned(), block);
    }
    for (field, entries) in tagged(&one.documented) {
        fields.insert(field.to_owned(), entries);
    }
    if !one.dispatched.is_empty() {
        fields.insert(
            "events".to_owned(),
            seen(&one.dispatched, fields.get("events")),
        );
    }
    /* **A class always says something, even when it says nothing.** A function
    or a variable with no prose carries no `description` at all, and a class or
    a mixin carries an empty one: `HelixStep`'s block opens straight at
    `@summary` and `MixinControlSurface` has no block, the one above it
    belonging to the interface beside it, and both publish `""`. */
    let said = one
        .documented
        .description
        .or_else(|| matches!(one.kind, "class" | "mixin").then(String::new));
    if let Some(description) = said {
        fields.insert("description".to_owned(), json!(description));
    }
    if let Some(text) = &one.type_text {
        fields.insert("type".to_owned(), json!({ "text": text }));
    }
    if let Some(default) = &one.default {
        fields.insert("default".to_owned(), json!(default));
    }
    if let Some(returns) = &one.returns {
        /* **`@returns` takes the annotation's place, and says nothing.** The
        tag carries a sentence and no type, and the analyzer writes the tag's
        type rather than the one the signature states: both declarations in
        the library that carry the tag have an empty return, and all hundred
        and eight without it have the annotation. */
        let said = if one.documented.tags.iter().any(|(tag, _)| tag == "returns") {
            ""
        } else {
            returns.as_str()
        };
        fields.insert("return".to_owned(), json!({ "type": { "text": said } }));
    }
    if !one.parameters.is_empty() {
        fields.insert(
            "parameters".to_owned(),
            json!(parameters(&one.parameters, &one.documented.tags)),
        );
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
        /* **A name the library keeps to itself, dropped where the framework's
        are.** The analyzer publishes it and a plugin of ours removes it, which
        is after the list exists: a class whose body holds nothing else still
        has the key, and it leads rather than trailing what inheritance adds. */
        let hidden: BTreeSet<String> = one
            .members
            .iter()
            .filter(|two| two.documented.tags.iter().any(|(tag, _)| tag == "internal"))
            .map(|two| two.name.clone())
            .collect();
        let written: Vec<Option<Written>> =
            one.members.iter().map(|two| two.written.clone()).collect();
        let members: Vec<Value> = one.members.into_iter().map(member_of).collect();
        let attributes = attributes_of(&members, &written);
        if !attributes.is_empty() {
            fields.insert("attributes".to_owned(), json!(attributes));
        }
        /* The attributes are drawn first, because a framework name declares one
        and is not itself published. */
        let members: Vec<Value> = members
            .into_iter()
            .filter(|one| {
                let name = one.get("name").and_then(Value::as_str).unwrap_or_default();
                !parse::framework(name) && !hidden.contains(name)
            })
            .collect();
        /* **The list is written even where nothing survived the filter.** The
        analyzer deletes an empty `members` before that filter runs, not after:
        a styled class whose body holds only `styles` and `render` still has
        the key, and it leads rather than trailing what inheritance adds. */
        fields.insert("members".to_owned(), json!(members));
    }
    let heritage = one
        .heritage
        .iter()
        .map(|link| (link.name.clone(), link.from.clone()))
        .collect();
    /* **In the analyzer's order, while this function still knows what it
    wrote.** Every list here is one the class itself filled, which is what
    decides whether it leads or trails: the inheritance step appends whatever
    it adds after all of this, and `order` leaves both where they fall. */
    crate::manifest::order::declaration(&mut fields);
    (Value::Object(fields), heritage)
}

/// The manifest as far as this generator has been taken.
/// A declaration as the first pass leaves it: what it says, what it extends,
/// and whether it is an element.
type Pending = (Value, Vec<(String, Option<String>)>, bool, Vec<String>);

pub fn build(package: &Path, given: &str, tier: &str, dependencies: &Dependencies) -> Value {
    /* **Two passes, because a class may extend one in its own package.**
    `HelixFormElement extends HelixElement` through a relative import, and
    resolving it means this package's other modules, which nothing has read
    until every module has been read. So the first pass writes the declarations
    and the second gives each what its heritage has, with this package's own
    manifest standing among the dependencies by the name nothing imports it by. */
    let read: Vec<(String, String)> = sources(package)
        .into_iter()
        .map(|path| {
            let text = fs::read_to_string(package.join(&path)).unwrap_or_default();
            (path, text)
        })
        .collect();
    /* **The names are written out before anything inherits them.** A subclass
    is given what its parent declares, so resolving `Placement` once where the
    parent writes it puts the words on every family that inherits the property,
    and doing it afterwards would mean doing it twice. */
    let mut unions = unions::Unions::read(package, &read);
    let written: Vec<(String, Vec<Pending>, Vec<Value>)> = read
        .iter()
        .map(|(path, text)| {
            let published = published_by(text, path);
            let declared = declarations(text, path)
                .into_iter()
                .map(|one| {
                    let is_element = one.is_element;
                    let borrows = one.borrows.clone();
                    let (mut declaration, heritage) =
                        declaration_of(one, path, tier, package, given);
                    unions.apply(path, &mut declaration);
                    (declaration, heritage, is_element, borrows)
                })
                .collect();
            (path.clone(), declared, published)
        })
        .collect();

    /* **Resolved again until it stops changing, because a chain has links.**
    `HelixHeadlessIconButton extends HelixHeadlessButton` and the copy button
    extends the icon button, all three in one package. One pass gives the icon
    button what the button *declares*, twenty members, where the analyzer gives
    it what the button *has*, which is forty-seven, and the copy button
    inherits the shortfall. A dependency's manifest arrives already resolved
    and needs none of this; a package's own does not, so each round resolves
    against the last one's answer and a chain of any length settles. Ninety-
    nine of headless's differences were this, across ten modules.

    Each round starts from the declarations as parsed rather than from the
    round before, so nothing is merged twice. The cap is a guard against a
    cycle in the source, which would not compile but should not hang this. */
    let raw = |written: &Vec<(String, Vec<Pending>, Vec<Value>)>| {
        json!({
            "modules": written
                .iter()
                .map(|(path, declared, _)| json!({
                    "declarations": declared
                        .iter()
                        .map(|(one, _, _, _)| one.clone())
                        .collect::<Vec<Value>>(),
                    "path": path,
                }))
                .collect::<Vec<Value>>()
        })
    };
    let resolve = |against: &Value| -> Vec<Vec<Value>> {
        written
            .iter()
            .map(|(_, declared, _)| {
                declared
                    .iter()
                    .map(|(one, heritage, is_element, _)| {
                        let mut copy = one.clone();
                        inherit::apply(&mut copy, heritage, dependencies, against, *is_element);
                        copy
                    })
                    .collect()
            })
            .collect()
    };

    let mut mine = raw(&written);
    let mut finished = Vec::new();
    for _ in 0..16 {
        finished = resolve(&mine);
        let next = json!({
            "modules": written
                .iter()
                .zip(&finished)
                .map(|((path, _, _), declared)| json!({
                    "declarations": declared,
                    "path": path,
                }))
                .collect::<Vec<Value>>()
        });
        if next == mine {
            break;
        }
        mine = next;
    }

    lend(&written, &mut finished, dependencies);
    declared(&mut finished);
    chained(&mut finished, dependencies);
    registered(&written, &mut finished);
    signatures(&mut finished);
    reacted(&mut finished);

    let modules: Vec<Value> = written
        .into_iter()
        .zip(finished)
        .map(|((path, _, published), declared)| {
            /* The analyzer's own order, which is what it wrote rather than
            what sorts: every object here is built in the sequence the
            analyzer builds it, so the two files agree byte for byte and the
            switch is a diff of nothing. */
            json!({
                "kind": "javascript-module",
                "path": path,
                "declarations": declared,
                "exports": published,
            })
        })
        .collect();
    /* The version the analyzer writes, which is not the newest one: it is
    pinned to what the tool emits, and the four tiers all say `1.0.0`. */
    let mut said = json!({ "schemaVersion": "1.0.0", "readme": "", "modules": modules });
    /* The keys go in the analyzer's order last of all, so the builders above
    can write each field where it reads best and one place holds the sequence
    the file is actually in. */
    crate::manifest::order::apply(&mut said);
    said
}

/// A module's `exports`, with each declaration's module said the way the
/// analyzer says it.
fn published_by(text: &str, path: &str) -> Vec<Value> {
    exports(text, path)
        .into_iter()
        .map(|one| {
            let Exported {
                kind,
                name,
                declaration,
                origin,
            } = one;
            let mut points = serde_json::Map::new();
            points.insert("name".to_owned(), json!(declaration));
            match origin {
                Origin::Own => {
                    points.insert("module".to_owned(), json!(path));
                }
                /* A specifier that does not start with a dot is a package, and
                the manifest says so with a different key rather than writing a
                path that would not resolve. */
                Origin::Written(from) | Origin::Resolved(from) if !from.starts_with('.') => {
                    points.insert("package".to_owned(), json!(from));
                }
                Origin::Written(from) => {
                    points.insert("module".to_owned(), json!(from));
                }
                /* Resolved and then unrooted. A superclass's module is
                written with a leading slash and an export's is not, which is
                the analyzer's inconsistency rather than a choice here. */
                Origin::Resolved(from) => {
                    let at = beside(path, &from)
                        .map(|one| one.trim_start_matches('/').to_owned())
                        .unwrap_or(from);
                    points.insert("module".to_owned(), json!(at));
                }
            }
            json!({ "kind": kind, "name": name, "declaration": points })
        })
        .collect()
}
