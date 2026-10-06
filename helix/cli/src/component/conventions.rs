//! Holds each component's manifest to what the conventions say it must carry.
//!
//! **The manifest is where an omission lands.** IDE tooltips, the framework
//! typings, the reference pages and every agent writing against the library
//! read it, so a public property with no description is invisible across all of
//! them at once rather than merely untidy in a file. These conventions were
//! written down in `AGENTS.md` and followed as often as someone remembered them,
//! which is why they are checked where the consequence is.
//!
//! **Ported from `helix-convention-lint`**, which ran inside `analyze` as the
//! last of the analyzer's plugins and stayed there, still TypeScript, after the
//! analyzer was replaced. It read a finished manifest and reported findings,
//! which is what a component rule is, so it is one now. Every check it made is
//! made here, with one exception said below, and the two were held to the same
//! findings over the four real manifests with hundreds of violations seeded
//! into them before the TypeScript was deleted.
//!
//! **The exception is the em dash.** The plugin forbade em and en dashes in a
//! description, and `fusion prose`'s `dashes` already holds every line a person
//! writes to no em dash, doc comments included, which is where a description comes
//! from. An en dash is the half nobody else checks, so it is the half kept.
//!
//! **A component is a class carrying a tier**, which the generator writes on
//! every class descending from `HelixElement` by the same walk the plugin made
//! through `eachComponent`: the two pick out the same 271 classes across the four
//! tiers.

use std::path::Path;

use serde_json::Value;

use crate::component::{Context, Finding, Report};

/// Words that describe how a component looks rather than what it is for.
const APPEARANCE: [&str; 4] = ["themed", "a styled", "styled", "a themed"];

/// Native events a component may re-emit from its host under the native name.
///
/// Relaying is what makes a component behave like the control it wraps, and the
/// name has to be the native one for a consumer, and for React, to hear it.
///
/// `close`, `cancel`, `toggle` and `beforetoggle` are here because the browser
/// fires them already: a `<dialog>` opened with `showModal()` and a panel shown
/// with `showPopover()` fire them on an element inside a shadow root, where they
/// neither bubble nor compose and so reach nobody. Relaying is the platform
/// doing the work rather than an invention.
///
/// The media names are the HTML standard's events of a media element, every
/// one of them, which `Video` relays from its inner `<video>` so a listener on
/// the player hears what it would hear on the element. `scroll` and `scrollend`
/// are `Scroll Area`'s, sent from the host for the viewport it scrolls.
const RELAYED: [&str; 35] = [
    "abort",
    "beforetoggle",
    "blur",
    "cancel",
    "canplay",
    "canplaythrough",
    "change",
    "close",
    "durationchange",
    "emptied",
    "ended",
    "error",
    "focus",
    "input",
    "invalid",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "pause",
    "play",
    "playing",
    "progress",
    "ratechange",
    "resize",
    "scroll",
    "scrollend",
    "seeked",
    "seeking",
    "stalled",
    "suspend",
    "timeupdate",
    "toggle",
    "volumechange",
    "waiting",
];

/// The metadata every component carries, and the tag it comes from.
const REQUIRED: [&str; 3] = ["since", "status", "documentation"];

/// The one dash left to this rule; the em dash is `fusion prose`'s.
const EN_DASH: char = '\u{2013}';

/// A field of an entry, as text, empty where it is absent.
fn text<'a>(entry: &'a Value, field: &str) -> &'a str {
    entry.get(field).and_then(Value::as_str).unwrap_or_default()
}

/// The entries of one of a declaration's lists.
fn list<'a>(declaration: &'a Value, field: &str) -> impl Iterator<Item = &'a Value> {
    declaration
        .get(field)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
}

/// Whether an event is named the way a component's own events are.
///
/// **Prefixed and lowercase, because an event from inside a shadow root is
/// retargeted to look like it came from the host**: a bare `input` from a
/// `<helix-input>` is indistinguishable from the inner control's own. The name
/// also decides the framework prop, the manifest deriving one from the other.
fn prefixed(name: &str) -> bool {
    name.strip_prefix("helix-").is_some_and(|rest| {
        rest.starts_with(|one: char| one.is_ascii_lowercase())
            && rest
                .chars()
                .all(|one| one.is_ascii_lowercase() || one.is_ascii_digit() || one == '-')
    })
}

/// One finding, named by the subject it is about.
fn say(into: &mut Vec<Finding>, file: &str, subject: &str, message: &str, detail: &str) {
    into.push(Finding {
        detail: detail.to_owned(),
        file: file.to_owned(),
        message: format!("`{subject}` {message}"),
    });
}

/// What one component is missing, as findings against the file it lives in.
fn judge(declaration: &Value, file: &str, into: &mut Vec<Finding>) {
    described(declaration, file, into);
    published(declaration, file, into);
}

/// What the class says about itself: what it is for, and the metadata a page
/// is drawn from.
fn described(declaration: &Value, file: &str, into: &mut Vec<Finding>) {
    let name = text(declaration, "name");
    let helix = declaration.get("helix");
    let mut say = |subject: String, message: &str, detail: &str| {
        say(into, file, &subject, message, detail);
    };

    /* The summary where there is one, and the description where there is not,
    which is what a reference page leads with. An empty summary is still the
    summary: it stands in front of the description rather than deferring. */
    let summary = declaration
        .get("summary")
        .or_else(|| declaration.get("description"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let lowered = summary.trim().to_lowercase();
    if summary.trim().is_empty() {
        say(
            name.to_owned(),
            "has no class-level description",
            "Write what it is for in the class's doc block, or under `@summary`.",
        );
    }
    if APPEARANCE.iter().any(|one| lowered.starts_with(one)) {
        say(
            name.to_owned(),
            "opens its description with how it looks",
            "Lead with what the component is for; its appearance is the styled tier's business.",
        );
    }
    if summary.contains(EN_DASH) {
        say(
            name.to_owned(),
            "has an en dash in its description",
            "Write what the dash meant: a period, a colon, a comma or a pair of parentheses.",
        );
    }

    /* These live only in comments unless they reach the manifest, and only
    there can a page render a status badge or an agent know what is stable. */
    for field in REQUIRED {
        let present = helix
            .and_then(|one| one.get(field))
            .and_then(Value::as_str)
            .is_some_and(|one| !one.is_empty());
        if !present {
            say(
                name.to_owned(),
                &format!("has no `@{field}`"),
                &format!("Add `@{field}` to the class's doc block."),
            );
        }
    }

    /* **A family carries a category; its parts do not.** `@category` answers
    what a component is for, which is a question about the family: `Tabs.Tab`
    has no answer separate from the family it belongs to, and giving it one
    would put a part in the gallery beside its own root. Empty rather than
    absent is what this catches, a word outside the closed set being dropped
    rather than becoming a category of one. */
    if helix
        .and_then(|one| one.get("part"))
        .and_then(Value::as_str)
        == Some("Root")
    {
        let category = helix
            .and_then(|one| one.get("category"))
            .and_then(Value::as_str)
            .is_some_and(|one| !one.is_empty());
        if !category {
            say(
                name.to_owned(),
                "has no `@category`, or one outside the closed set",
                "Name one of the categories `helix/CONVENTIONS.md` lists.",
            );
        }
    }
}

/// What the class publishes: each public member, each event and each part.
fn published(declaration: &Value, file: &str, into: &mut Vec<Finding>) {
    let name = text(declaration, "name");
    let mut say = |subject: String, message: &str, detail: &str| {
        say(into, file, &subject, message, detail);
    };

    for member in list(declaration, "members") {
        let privacy = text(member, "privacy");
        if !privacy.is_empty() && privacy != "public" {
            continue;
        }
        let subject = format!("{name}.{}", text(member, "name"));
        let described = text(member, "description");
        if described.trim().is_empty() {
            say(
                subject.clone(),
                "is public and has no description",
                "Document it where it is declared: a consumer reads the manifest, not the source.",
            );
        }
        if described.contains(EN_DASH) {
            say(
                subject,
                "has an en dash in its description",
                "Write what the dash meant: a period, a colon, a comma or a pair of parentheses.",
            );
        }
    }

    for event in list(declaration, "events") {
        let event_name = text(event, "name");
        let subject = format!("{name}:{event_name}");
        if text(event, "description").trim().is_empty() {
            say(
                subject.clone(),
                "has no description, and an event is public API",
                "Describe it on the `@event` tag that declares it.",
            );
        }
        if !prefixed(event_name) && !RELAYED.contains(&event_name) {
            say(
                subject,
                "is named neither `helix-{verb}` nor a native event being relayed",
                "Prefix it `helix-`, lowercase; a relayed native event keeps the native name.",
            );
        }
    }

    for part in list(declaration, "cssParts") {
        if text(part, "description").trim().is_empty() {
            say(
                format!("{name}::part({})", text(part, "name")),
                "has no description, and a part is the public override API",
                "Describe it on the `@csspart` tag that declares it.",
            );
        }
    }
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let Some(manifest) = context.manifest(&tier) else {
            continue;
        };
        /* A module's path is its package's, so a finding names the file from
        the repository instead, which is where somebody goes to fix it. */
        let package = tier.parent().unwrap_or(Path::new(""));
        for module in list(manifest, "modules") {
            let file = context.relative(&package.join(text(module, "path")));
            for declaration in list(module, "declarations") {
                let component = text(declaration, "kind") == "class"
                    && declaration
                        .get("helix")
                        .and_then(|one| one.get("tier"))
                        .is_some();
                if !component {
                    continue;
                }
                checked += 1;
                judge(declaration, &file, &mut findings);
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "components, with the members, events and parts they publish",
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::judge;

    /// A component carrying everything, which each case takes one thing from.
    fn documented(over: &Value) -> Value {
        let mut base = json!({
            "description": "Does a thing.",
            "helix": {
                "documentation": "https://example.com/components/thing",
                "since": "0.1.0",
                "status": "experimental",
                "tier": "styled",
            },
            "kind": "class",
            "name": "HelixThing",
        });
        if let (Some(into), Some(from)) = (base.as_object_mut(), over.as_object()) {
            for (key, value) in from {
                into.insert(key.clone(), value.clone());
            }
        }
        base
    }

    /// What the rule says about one component, as its messages.
    fn said(over: &Value) -> Vec<String> {
        let mut found = Vec::new();
        judge(&documented(over), "src/thing.ts", &mut found);
        found.into_iter().map(|one| one.message).collect()
    }

    fn says(over: &Value, needle: &str) -> bool {
        said(over).iter().any(|one| one.contains(needle))
    }

    #[test]
    fn a_fully_documented_component_passes() {
        let over = json!({
            "cssParts": [{ "description": "The wrapper.", "name": "container" }],
            "events": [{ "description": "Fired when it opens.", "name": "helix-open" }],
            "members": [{ "description": "Whether it is open.", "kind": "field", "name": "open" }],
        });
        assert_eq!(said(&over), Vec::<String>::new());
    }

    #[test]
    fn the_metadata_a_badge_is_drawn_from_is_required() {
        let helix = |drop: &str| {
            let mut all = json!({
                "documentation": "https://x", "since": "0.1.0", "status": "experimental", "tier": "styled",
            });
            all.as_object_mut().map(|one| one.remove(drop));
            json!({ "helix": all })
        };
        assert!(says(&helix("since"), "has no `@since`"));
        assert!(says(&helix("status"), "has no `@status`"));
        assert!(says(&helix("documentation"), "has no `@documentation`"));
    }

    /// A family's root says what it is for; its parts inherit the answer.
    #[test]
    fn a_root_carries_a_category_and_a_part_need_not() {
        let root = json!({ "helix": {
            "documentation": "https://x", "since": "0.1.0", "status": "experimental",
            "tier": "styled", "part": "Root",
        }});
        assert!(says(&root, "has no `@category`"));
        let part = json!({ "helix": {
            "documentation": "https://x", "since": "0.1.0", "status": "experimental",
            "tier": "styled", "part": "Item",
        }});
        assert!(!says(&part, "`@category`"));
    }

    #[test]
    fn a_public_member_is_described_and_a_private_one_need_not_be() {
        assert!(says(
            &json!({ "members": [{ "kind": "field", "name": "open" }] }),
            "is public and has no description"
        ));
        assert!(said(&json!({ "members": [
            { "kind": "field", "name": "internal", "privacy": "private" },
            { "kind": "field", "name": "guarded", "privacy": "protected" },
        ]}))
        .is_empty());
    }

    #[test]
    fn an_event_is_described_and_named_for_the_host() {
        assert!(says(
            &json!({ "events": [{ "name": "helix-open" }] }),
            "an event is public API"
        ));
        /* Retargeted out of a shadow root, a bare name is indistinguishable
        from the inner control's own. */
        assert!(says(
            &json!({ "events": [{ "description": "x", "name": "open" }] }),
            "is named neither"
        ));
        for wrong in [
            "OpenChange",
            "helix-Open",
            "helix-9x",
            "helix-",
            "helixopen",
        ] {
            assert!(
                says(
                    &json!({ "events": [{ "description": "x", "name": wrong }] }),
                    "is named neither"
                ),
                "{wrong}"
            );
        }
    }

    /// Being indistinguishable from the native event is the point of relaying.
    #[test]
    fn a_relayed_native_event_keeps_the_native_name() {
        assert!(said(&json!({ "events": [{ "description": "x", "name": "change" }] })).is_empty());
    }

    /// A player relays every media event, and a scroll area its scrolling.
    #[test]
    fn media_and_scroll_events_are_relayed_under_their_native_names() {
        for name in [
            "timeupdate",
            "volumechange",
            "loadedmetadata",
            "scroll",
            "scrollend",
        ] {
            assert!(
                said(&json!({ "events": [{ "description": "x", "name": name }] })).is_empty(),
                "{name}"
            );
        }
    }

    /* **Hyphens are not limited.** Measured in Chrome against React 19.2.8,
    `ona-b-c-d` binds exactly as `onhelix-open` does: `react-dom` slices `on`
    off the prop and hands the rest to `addEventListener` without looking at it.
    What looks like a hyphen limit is hydration, React attaching no custom
    element listener on a server-rendered page until it commits an update for
    some other reason. */
    #[test]
    fn an_event_name_may_carry_more_hyphens() {
        assert!(said(&json!({ "events": [
            { "description": "x", "name": "helix-value-change" },
            { "description": "x", "name": "helix-step-2" },
        ]}))
        .is_empty());
    }

    #[test]
    fn a_part_is_described() {
        assert!(says(
            &json!({ "cssParts": [{ "name": "container" }] }),
            "a part is the public override API"
        ));
    }

    #[test]
    fn a_description_says_what_a_component_is_for_first() {
        assert!(says(
            &json!({ "description": "" }),
            "has no class-level description"
        ));
        assert!(says(
            &json!({ "description": "Themed collapsible section." }),
            "opens its description with how it looks"
        ));
        /* The summary leads where there is one, and an empty one stands in
        front of the description rather than deferring to it. */
        assert!(says(
            &json!({ "summary": "", "description": "Does a thing." }),
            "has no class-level description"
        ));
    }

    /// The en dash is this rule's; the em dash is `fusion prose`'s `dashes`.
    #[test]
    fn an_en_dash_is_reported_and_an_em_dash_is_left_to_the_prose_rule() {
        assert!(says(
            &json!({ "description": "Does a thing \u{2013} nicely." }),
            "has an en dash"
        ));
        assert!(says(
            &json!({ "members": [{ "description": "Pages 1\u{2013}9.", "kind": "field", "name": "x" }] }),
            "has an en dash"
        ));
        assert!(said(&json!({ "description": "Does a thing \u{2014} nicely." })).is_empty());
    }
}
