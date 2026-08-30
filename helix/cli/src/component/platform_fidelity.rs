//! A component standing in for a native element mirrors what that element has.
//!
//! **A stand-in that drops a property has not simplified it, it has moved the
//! work.** A consumer who reaches for `step` on a number field, or `loop` on a
//! video, finds nothing there and no error saying why, and what they write
//! instead is whatever workaround the missing name forced.
//!
//! **Hardcoded is worse than absent**: the consumer cannot reach it at all, and
//! the component has taken the decision on their behalf without saying so.
//!
//! **An excuse that no longer applies is reported too.** A property excused as
//! unwanted and then declared anyway leaves a reason standing that the code
//! disagrees with, which is a note the next reader has to check.
//!
//! **A stand-in sends what the element it stands in for sends.** A native
//! `change` is what a consumer binds with `onchange` in HTML, and an inline
//! handler attribute cannot name a prefixed event at all, so there is no
//! spelling that works without it.
//!
//! **And a prefixed event whose verb the platform already owns is a rename.**
//! Reported once per event rather than once per family: one such rename is a
//! single decision taken across every component that sends it, and a line per
//! family would bury every other finding.
//!
//! **The event names are read from the element maps and nothing wider.** Reading
//! every `*EventMap` catches `open` from web sockets, `navigate` from the
//! navigation API and `complete` from a database, none of which an element ever
//! sends, so a prefixed `open` would be reported as shadowing a word nothing on
//! a page uses.
//!
//! **The vocabulary is data rather than rule.** Which native interface each
//! family wraps, which property group comes with it, what is excused and why:
//! the rule is the argument and the file is the subject it argues about, and a
//! consumer with their own components has their own subject.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;
use serde::Deserialize;
use serde_json::Value;

use crate::component::{Context, Finding, Report};

/// Properties no component can mirror, whatever it stands in for.
///
/// A live object, a validity state, a collection the platform maintains: each is
/// a thing an element *is* rather than a value a consumer sets.
const UNMIRRORABLE: [&str; 27] = [
    "audioTracks",
    "buffered",
    "caption",
    "error",
    "form",
    "labels",
    "length",
    "list",
    "mediaKeys",
    "networkState",
    "options",
    "played",
    "readyState",
    "remote",
    "rows",
    "seekable",
    "selectedOptions",
    "sinkId",
    "srcObject",
    "tBodies",
    "textTracks",
    "tFoot",
    "tHead",
    "validationMessage",
    "validity",
    "videoTracks",
    "willValidate",
];

/// Presentational attributes the platform kept and stopped recommending.
///
/// The DOM library marks most of these itself and `own_members` reads the
/// marker; this list is the half it does not mark, which needs a person.
const DEPRECATED: [&str; 25] = [
    "align",
    "bgColor",
    "border",
    "cellPadding",
    "cellSpacing",
    "ch",
    "chOff",
    "color",
    "compact",
    "frame",
    "height",
    "hspace",
    "isMap",
    "longDesc",
    "lowsrc",
    "noShade",
    "noWrap",
    "rules",
    "size",
    "sortable",
    "summary",
    "useMap",
    "vAlign",
    "vspace",
    "width",
];

/// The maps an element's own listeners are typed by.
const ELEMENT_EVENT_MAPS: [&str; 6] = [
    "DocumentAndElementEventHandlersEventMap",
    "ElementEventMap",
    "GlobalEventHandlersEventMap",
    "HTMLElementEventMap",
    "HTMLMediaElementEventMap",
    "HTMLVideoElementEventMap",
];

static MEMBER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:readonly\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*:\s")
        .expect("a literal pattern compiles")
});

static EVENT_NAME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?m)^\s*"([a-z]+)":"#).expect("a literal pattern compiles"));

static DASHED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"-([a-z])").expect("a literal pattern compiles"));

/// What a family stands in for, from the vocabulary file.
#[derive(Debug, Deserialize)]
struct Native {
    also: Option<String>,
    interface: String,
    properties: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Vocabulary {
    excused: BTreeMap<String, BTreeMap<String, String>>,
    #[serde(rename = "excusedEvents")]
    excused_events: BTreeMap<String, String>,
    #[serde(rename = "expectedEvents")]
    expected_events: BTreeMap<String, Vec<String>>,
    native: BTreeMap<String, Native>,
    #[serde(rename = "propertyGroups")]
    property_groups: BTreeMap<String, Vec<String>>,
    tags: BTreeMap<String, String>,
}

/// The DOM library, found wherever the toolchain put it.
///
/// **Globbing the scope is what makes this run on a laptop and on a runner
/// alike**, the package being platform-suffixed. The analyzer's own nested
/// TypeScript is the fallback rather than the first choice: it is pinned older.
fn dom_library(root: &Path) -> Option<(String, String)> {
    let scope = root.join("node_modules/@typescript");
    if let Ok(entries) = fs::read_dir(&scope) {
        let mut paths: Vec<PathBuf> = entries.flatten().map(|one| one.path()).collect();
        paths.sort();
        for path in paths {
            let candidate = path.join("lib/lib.dom.d.ts");
            if let Ok(source) = fs::read_to_string(&candidate) {
                return Some((candidate.to_string_lossy().to_string(), source));
            }
        }
    }
    let fallback = root.join(
        "node_modules/@custom-elements-manifest/analyzer/node_modules/typescript/lib/lib.dom.d.ts",
    );
    fs::read_to_string(&fallback)
        .ok()
        .map(|source| (fallback.to_string_lossy().to_string(), source))
}

/// Property names declared directly in an interface body, methods excluded.
///
/// The deprecation marker is carried from a doc comment onto the member it
/// documents, because the answer is already in the file being read.
fn own_members(source: &str, name: &str) -> Option<BTreeSet<String>> {
    let opening = Regex::new(&format!(r"\ninterface {}\b[^{{]*\{{", regex::escape(name)))
        .ok()?
        .find(source)?;
    let bytes = source.as_bytes();
    let start = opening.end();
    let mut at = start;
    let mut depth = 1;
    while depth > 0 && at < bytes.len() {
        match bytes[at] {
            b'{' => depth += 1,
            b'}' => depth -= 1,
            _ => {}
        }
        at += 1;
    }

    let mut members = BTreeSet::new();
    let mut deprecated = false;
    for line in source[start..at.saturating_sub(1)].lines() {
        let text = line.trim();
        if text.starts_with('/') || text.starts_with('*') {
            if text.contains("@deprecated") {
                deprecated = true;
            }
            continue;
        }
        if text.is_empty() {
            continue;
        }
        if let Some(found) = MEMBER.captures(text) {
            let signature = &text[..text.find(':').unwrap_or(0)];
            if !signature.contains('(') && !deprecated {
                members.insert(found[1].to_owned());
            }
        }
        deprecated = false;
    }
    Some(members)
}

/// Every event name an element can send, read out of the element maps.
fn native_events(source: &str) -> BTreeSet<String> {
    let mut names = BTreeSet::new();
    for map in ELEMENT_EVENT_MAPS {
        let Some(found) = Regex::new(&format!(r"(?s)\ninterface {map} \{{(.*?)\n\}}"))
            .ok()
            .and_then(|one| one.captures(source))
        else {
            continue;
        };
        for entry in EVENT_NAME.captures_iter(&found[1]) {
            names.insert(entry[1].to_owned());
        }
    }
    names
}

/// What each tag declares and dispatches, read from the manifest.
type Manifest = (
    BTreeMap<String, BTreeSet<String>>,
    BTreeMap<String, BTreeSet<String>>,
);

fn manifest(context: &Context) -> Option<Manifest> {
    let over = context.settings.layers.last()?;
    let source = context.root.join(&over.source);
    let raw = fs::read_to_string(source.parent()?.join("custom-elements.json")).ok()?;
    let value: Value = serde_json::from_str(&raw).ok()?;

    let mut declared = BTreeMap::new();
    let mut dispatched = BTreeMap::new();
    for declaration in value
        .get("modules")?
        .as_array()?
        .iter()
        .filter_map(|one| one.get("declarations")?.as_array())
        .flatten()
    {
        let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
            continue;
        };
        let mut names: BTreeSet<String> = BTreeSet::new();
        /* **Public only, and omitting this hid the fault it is meant to find.**
        A private field satisfies a name comparison while a consumer cannot
        reach it, so a component counted as having a property on the strength of
        one it paints and never publishes. */
        for member in declaration
            .get("members")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let public = member.get("privacy").and_then(Value::as_str);
            if member.get("kind").and_then(Value::as_str) == Some("field")
                && public != Some("private")
                && public != Some("protected")
            {
                if let Some(name) = member.get("name").and_then(Value::as_str) {
                    names.insert(name.to_owned());
                }
            }
        }
        for attribute in declaration
            .get("attributes")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|one| one.get("name")?.as_str())
        {
            names.insert(attribute.to_owned());
        }
        /* Attribute case and property case are the same surface, so both
        spellings of every name count as declared. */
        let camel: Vec<String> = names
            .iter()
            .map(|one| {
                DASHED
                    .replace_all(one, |found: &regex::Captures| found[1].to_uppercase())
                    .into_owned()
            })
            .collect();
        names.extend(camel);
        declared.insert(tag.to_owned(), names);
        dispatched.insert(
            tag.to_owned(),
            declaration
                .get("events")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|one| one.get("name")?.as_str())
                .map(str::to_owned)
                .collect(),
        );
    }
    Some((declared, dispatched))
}

pub fn run(context: &Context) -> Report {
    let nothing = |unit| Report {
        checked: 0,
        findings: Vec::new(),
        notes: Vec::new(),
        unit,
    };
    let Some(path) = context.settings.platform.as_ref() else {
        return nothing("native properties and events");
    };
    let Ok(vocabulary) = fs::read_to_string(context.root.join(path))
        .ok()
        .ok_or(())
        .and_then(|raw| serde_json::from_str::<Vocabulary>(&raw).map_err(|_| ()))
    else {
        return nothing("native properties and events");
    };
    let (Some((declared, dispatched)), Some((where_, library))) =
        (manifest(context), dom_library(&context.root))
    else {
        return nothing("native properties and events");
    };

    let mut findings = Vec::new();
    let mut checked = properties(
        &vocabulary,
        &declared,
        &library,
        (path, &where_),
        &mut findings,
    );
    checked += events(&vocabulary, &dispatched, &library, context, &mut findings);

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "native properties and events",
    }
}

/// Every native property a stand-in should mirror, and every stale excuse.
fn properties(
    vocabulary: &Vocabulary,
    declared: &BTreeMap<String, BTreeSet<String>>,
    library: &str,
    at: (&str, &str),
    findings: &mut Vec<Finding>,
) -> usize {
    let (path, where_) = at;
    let mut checked = 0;
    for (tag, native) in &vocabulary.native {
        let Some(ours) = declared.get(tag) else {
            findings.push(Finding {
                detail: "Either the family was renamed and this map was not, or it was removed \
                         and this entry should go with it."
                    .to_owned(),
                file: path.to_owned(),
                message: format!(
                    "`{tag}` stands in for `{}` and is absent from the manifest",
                    native.interface
                ),
            });
            continue;
        };
        let Some(mut members) = own_members(library, &native.interface) else {
            findings.push(Finding {
                detail: "The name is wrong, or the DOM library has moved it.".to_owned(),
                file: where_.to_owned(),
                message: format!("`{}` is not an interface there", native.interface),
            });
            continue;
        };
        if let Some(also) = &native.also {
            members.extend(own_members(library, also).unwrap_or_default());
        }
        let scope = native
            .properties
            .as_ref()
            .and_then(|one| vocabulary.property_groups.get(one));
        let excused = vocabulary.excused.get(tag);

        for property in &members {
            if scope.is_some_and(|one| !one.contains(property))
                || UNMIRRORABLE.contains(&property.as_str())
                || DEPRECATED.contains(&property.as_str())
            {
                continue;
            }
            checked += 1;
            if ours.contains(property) || excused.is_some_and(|one| one.contains_key(property)) {
                continue;
            }
            let spelled = vocabulary
                .tags
                .get(&native.interface)
                .cloned()
                .unwrap_or_else(|| {
                    native
                        .interface
                        .trim_start_matches("HTML")
                        .trim_end_matches("Element")
                        .to_lowercase()
                });
            findings.push(Finding {
                detail: "Mirror it, or excuse it with the reason it is not wanted.".to_owned(),
                file: tag.clone(),
                message: format!("`<{spelled}>` has `{property}` and this does not"),
            });
        }

        for property in excused.into_iter().flatten().map(|(one, _)| one) {
            if !ours.contains(property) {
                continue;
            }
            findings.push(Finding {
                detail: "Drop the excuse.".to_owned(),
                file: tag.clone(),
                message: format!("`{property}` is excused and the component declares it anyway"),
            });
        }
    }
    checked
}

/// The events a stand-in should send, and the words it should not invent.
fn events(
    vocabulary: &Vocabulary,
    dispatched: &BTreeMap<String, BTreeSet<String>>,
    library: &str,
    context: &Context,
    findings: &mut Vec<Finding>,
) -> usize {
    let mut events = 0;
    for (tag, expected) in &vocabulary.expected_events {
        let Some(sends) = dispatched.get(tag) else {
            continue;
        };
        for event in expected {
            events += 1;
            if sends.contains(event) {
                continue;
            }
            findings.push(Finding {
                detail: "An inline handler attribute cannot name a prefixed event at all, so \
                         there is no spelling that works without it."
                    .to_owned(),
                file: tag.clone(),
                message: format!(
                    "a native `{event}` is what a consumer binds with `on{event}`, and this sends \
                     none"
                ),
            });
        }
    }
    /* A prefixed event whose verb the platform already owns is a rename. */
    let known = native_events(library);
    let prefix = context
        .settings
        .layers
        .last()
        .map_or(String::new(), |one| one.prefix.clone());
    let mut shadowed: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for (tag, sends) in dispatched {
        for event in sends {
            let Some(verb) = event.strip_prefix(&prefix) else {
                continue;
            };
            if !known.contains(verb) || vocabulary.excused_events.contains_key(event) {
                continue;
            }
            shadowed.entry(event.clone()).or_default().push(tag.clone());
        }
    }
    for (event, tags) in &shadowed {
        let verb = event.strip_prefix(&prefix).unwrap_or(event);
        findings.push(Finding {
            detail: format!(
                "Either it means something the native `{verb}` does not, in which case say so, \
                 or it is a word invented for something already named."
            ),
            file: tags.first().cloned().unwrap_or_default(),
            message: format!(
                "`{event}` says what the platform already says with `{verb}`, on {} {}",
                tags.len(),
                if tags.len() == 1 {
                    "family"
                } else {
                    "families"
                }
            ),
        });
    }
    events
}
