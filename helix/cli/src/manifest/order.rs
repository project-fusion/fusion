//! The order a manifest's keys are written in.
//!
//! **Not an order anyone chose.** The analyzer's is a trace of its own
//! execution, and this file is that trace written down: a class begins as a
//! literal with ten keys in it, the empty lists among them are deleted, and
//! everything after that lands in the order the plugin that set it ran. A
//! method's `type` is last because the plugin writing its signature runs last;
//! a field's is third because the analyzer infers it while reading the field.
//!
//! **Read from the analyzer rather than guessed at.** The sequences here are
//! `createClass`'s `classTemplate`, `createClassField`'s handlers in the order
//! `createField` calls them, `cleanup-classes`'s deletion list and
//! `apply-inheritance`'s `forEach`, each of which is a literal in that package.
//! Deriving them from the output instead gave a cycle: `cssParts` leads for one
//! class and trails `customElement` for another, which is this rule seen from
//! the far side.
//!
//! A key nothing here names keeps the place it already had, so a field added
//! later fails visibly rather than silently sorting itself somewhere.

use serde_json::{Map, Value};

/// A class as `createClass` builds it, before anything is deleted.
///
/// The lists here are the ones that survive `cleanup-classes` because the class
/// itself filled them. One that was empty then is deleted and comes back later,
/// in [`INHERITED`], which is why the same key sits in two places.
const CLASS: [&str; 10] = [
    "kind",
    "description",
    "name",
    "cssProperties",
    "cssParts",
    "slots",
    "members",
    "events",
    "attributes",
    "cssStates",
];

/// What the analysis pass and the plugins add to a class, in the order they
/// run.
const AFTER: [&str; 6] = [
    "mixins",
    "superclass",
    "summary",
    "helix",
    "tagName",
    "customElement",
];

/// Put one declaration's keys in the analyzer's order, as it is built.
///
/// Every list present is one the class itself filled, which is what decides
/// whether it leads or trails: the lists `apply-inheritance` adds are appended
/// after this runs, and nothing moves them.
pub fn declaration(fields: &mut Map<String, Value>) {
    let mut order: Vec<&'static str> = CLASS.to_vec();
    order.extend(AFTER);
    *fields = sorted(std::mem::take(fields), &order);
}

/// Put a value's keys in the analyzer's order, all the way down.
pub fn apply(value: &mut Value) {
    walk(value, "");
}

/// The same, told which key the value was found under.
///
/// **The key rather than the contents.** Telling a parameter from an event by
/// what each holds was the first try, and `{ name, type }` is both of them.
fn walk(value: &mut Value, under: &str) {
    match value {
        Value::Array(items) => {
            for one in items {
                walk(one, under);
            }
        }
        Value::Object(fields) => {
            let keys: Vec<String> = fields.keys().cloned().collect();
            for key in keys {
                if let Some(one) = fields.get_mut(&key) {
                    walk(one, &key);
                }
            }
            let wanted = shape(fields, under);
            *fields = sorted(std::mem::take(fields), &wanted);
        }
        _ => {}
    }
}

/// The order this object's keys go in, by the key it was found under.
fn shape(fields: &Map<String, Value>, under: &str) -> Vec<&'static str> {
    match under {
        "" => vec!["schemaVersion", "readme", "modules"],
        "modules" => vec!["kind", "path", "declarations", "exports"],
        "exports" => vec!["kind", "name", "declaration"],
        "declaration" | "inheritedFrom" | "superclass" | "mixins" => {
            vec!["name", "module", "package"]
        }
        "type" | "return" => vec!["text", "type"],
        "parameters" => vec!["name", "default", "optional", "type", "description"],
        "attributes" => vec![
            "name",
            "type",
            "default",
            "description",
            "fieldName",
            "inheritedFrom",
        ],
        "slots" | "cssParts" | "cssProperties" | "cssStates" => {
            vec!["description", "name", "inheritedFrom"]
        }
        "examples" => vec!["description", "layout", "min", "slug"],
        "references" => vec!["label", "url"],
        "helix" => vec![
            "category",
            "since",
            "status",
            "documentation",
            "aliases",
            "groups",
            "tier",
            "group",
            "part",
            "examples",
            "source",
        ],
        "members" => member(fields),
        /* **Events fall to the wildcard and are left exactly as they were
        built.** One read from an `@event` tag is typed before it is named and
        one inferred from a dispatch the other way about, and what each gained
        at the merge came after both. The builders write that sequence; sorting
        it here threw the history away. */
        "declarations" => match fields.get("kind").and_then(Value::as_str) {
            /* Already in order, and in an order this cannot see: `declaration`
            put it there while the builder still knew which lists the class
            filled itself. */
            Some("class" | "mixin") => Vec::new(),
            Some("function") => vec!["kind", "name", "return", "parameters", "description"],
            _ => vec!["kind", "name", "type", "default", "description"],
        },
        _ => Vec::new(),
    }
}

/// One entry of a class body, whose two kinds are built by two creators.
///
/// A method's `type` is last of all, being the signature a plugin writes once
/// everything else about it is known, and `privacy` precedes `static` because
/// `handleModifiers` reads them in that order.
///
/// **A field's `readonly` and `default` are not in fixed places, and what
/// decides is where each came from.** A `readonly` modifier is read by
/// `handleModifiers`, before the description; a getter is called readonly by
/// the pass over accessors, after it. A default the field wrote is read by
/// `handleDefaultValue`, before the description; one filled in from an
/// ancestor arrives at the merge, after it. So those three keep the order they
/// were written in here and only what sits around them is placed.
fn member(fields: &Map<String, Value>) -> Vec<&'static str> {
    if fields.get("kind").and_then(Value::as_str) == Some("method") {
        /* **A method's `type` is its signature, and where it sits says who
        wrote it.** One inherited from a class that had a signature arrives
        with it, ahead of the stamp; one inherited from a mixin, which has no
        signatures, gains it afterwards. So everything past the parameters
        keeps the place it was written in. */
        return vec![
            "kind",
            "name",
            "privacy",
            "static",
            "return",
            "parameters",
            "description",
            "summary",
            "helix",
        ];
    }
    /* Everything but the two at the head and the stamp at the foot keeps the
    place it was written in, each of them having more than one: a `readonly`
    modifier is read before the description and a getter called readonly after
    it, a default the field wrote before and one the constructor assigns after,
    a type the field wrote before and one taken from a constant beside it after
    even the attribute it declares. */
    let mut order = vec!["kind", "name"];
    order.extend(
        fields
            .keys()
            .filter(|key| !matches!(key.as_str(), "kind" | "name" | "inheritedFrom"))
            .filter_map(|key| FIELD.iter().find(|one| *one == key).copied()),
    );
    order.push("inheritedFrom");
    order
}

/// Every key a field may carry, so one this does not know is not dropped from
/// the order and silently moved to the end.
const FIELD: [&str; 10] = [
    "type",
    "privacy",
    "static",
    "readonly",
    "default",
    "description",
    "summary",
    "attribute",
    "reflects",
    "helix",
];

/// The object's keys in that order, with anything unnamed left where it was.
fn sorted(fields: Map<String, Value>, wanted: &[&str]) -> Map<String, Value> {
    let mut held: Vec<(String, Value)> = fields.into_iter().collect();
    let mut out = Map::new();
    for key in wanted {
        if let Some(at) = held.iter().position(|(name, _)| name == key) {
            let (name, value) = held.remove(at);
            out.insert(name, value);
        }
    }
    for (name, value) in held {
        out.insert(name, value);
    }
    out
}
