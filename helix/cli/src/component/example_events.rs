//! An example listens on an element only for events that element declares.
//!
//! **A listener for an event nobody sends is silent in every direction.** It
//! never runs, so it never throws, the example renders exactly as it would with
//! it, and its log row simply never appears. Two shipped that way, found only by
//! running them: Pagination's events example listened for a
//! `helix-before-change` the component has never sent, since `helix-navigate` is
//! its request and the only way to refuse a move, and Video Playlist's listened
//! for the entry's `helix-select`, which the playlist stops on purpose so a press
//! is not heard twice under two names, and never for the `helix-activate` it
//! does send.
//!
//! **The element's own declarations, not its family's.** A parent declares the
//! bubbling event its children send, which CONVENTIONS asks of every parent, and
//! that is what makes this checkable at all: whether a child's event reaches a
//! page is the parent's decision, and Video Playlist decided against. Read
//! across the family instead, the pagination fault passed, since the page-size
//! control beside it declares the very `helix-before-change` the example waited
//! for.
//!
//! **Only the family's own elements, and only `helix-` events.** A listener on a
//! layout container is waiting for something bubbling up from inside it, which
//! is not this family's to declare, and a native event is the platform's.
//!
//! **Both syntaxes**, since the two twins are authored separately: an
//! `addEventListener` in the HTML, reached through the `id` it looked up, and an
//! `onhelix-` attribute in the React view, on the nearest element opened before
//! it.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::{Context, Finding, Report};

static ID: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"<(helix-[a-z-]+)\b[^>]*?\sid="([^"]+)""#).expect("a literal pattern compiles")
});

static LOOKUP: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?:const|let)\s+(\w+)\s*=\s*document\.(?:getElementById\('([^']+)'\)|querySelector\('#([^']+)'\))",
    )
    .expect("a literal pattern compiles")
});

static LISTEN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(\w+)\.addEventListener\(\s*'(helix-[a-z-]+)'")
        .expect("a literal pattern compiles")
});

static OPENS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<(helix-[a-z-]+)\b").expect("a literal pattern compiles"));

static HANDLER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bon(helix-[a-z-]+)=").expect("a literal pattern compiles"));

/// Every tag a layer declares, keyed to its family, and the events each tag
/// declares.
fn declared(manifest: &Path) -> (BTreeMap<String, String>, BTreeMap<String, BTreeSet<String>>) {
    let mut families = BTreeMap::new();
    let mut events: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let Some(value) = fs::read_to_string(manifest)
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
    else {
        return (families, events);
    };
    for module in value
        .get("modules")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        /* `src/<family>/<part>/<file>.ts`, which is the shape every component in
        this repository has. */
        let Some(family) = module
            .get("path")
            .and_then(Value::as_str)
            .and_then(|path| path.split('/').nth(1))
        else {
            continue;
        };
        for declaration in module
            .get("declarations")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                continue;
            };
            families.insert(tag.to_owned(), family.to_owned());
            events.entry(tag.to_owned()).or_default().extend(
                declaration
                    .get("events")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(|one| one.get("name")?.as_str())
                    .map(str::to_owned),
            );
        }
    }
    (families, events)
}

/// What an HTML example listens for, as the tag it listens on and the event.
fn scripted(html: &str) -> Vec<(String, String)> {
    let Some(script) = html.find("<script") else {
        return Vec::new();
    };
    let (markup, script) = html.split_at(script);
    let tags: BTreeMap<&str, &str> = ID
        .captures_iter(markup)
        .map(|one| {
            (
                one.get(2).map_or("", |m| m.as_str()),
                one.get(1).map_or("", |m| m.as_str()),
            )
        })
        .collect();
    let names: BTreeMap<String, String> = LOOKUP
        .captures_iter(script)
        .filter_map(|one| {
            let id = one.get(2).or_else(|| one.get(3))?.as_str();
            Some((one[1].to_owned(), (*tags.get(id)?).to_owned()))
        })
        .collect();
    LISTEN
        .captures_iter(script)
        .filter_map(|one| Some((names.get(&one[1])?.clone(), one[2].to_owned())))
        .collect()
}

/// What a React example listens for, on the nearest element opened before each
/// handler.
fn handled(tsx: &str) -> Vec<(String, String)> {
    HANDLER
        .captures_iter(tsx)
        .filter_map(|one| {
            let at = one.get(0)?.start();
            let tag = OPENS.captures_iter(&tsx[..at]).last()?[1].to_owned();
            Some((tag, one[1].to_owned()))
        })
        .collect()
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for layer in &context.settings.layers {
        let source = context.root.join(&layer.source);
        let Some(manifest) = source.parent().map(|one| one.join("custom-elements.json")) else {
            continue;
        };
        let (families, events) = declared(&manifest);
        let Ok(entries) = fs::read_dir(&source) else {
            continue;
        };
        for entry in entries.flatten() {
            let family = entry.file_name().to_string_lossy().into_owned();
            let Ok(examples) = fs::read_dir(entry.path().join(".examples")) else {
                continue;
            };
            for example in examples.flatten() {
                let path = example.path();
                let Ok(text) = fs::read_to_string(&path) else {
                    continue;
                };
                let extension = path.extension().and_then(|one| one.to_str()).unwrap_or("");
                let heard = if extension.eq_ignore_ascii_case("html") {
                    scripted(&text)
                } else if extension.eq_ignore_ascii_case("tsx") {
                    handled(&text)
                } else {
                    continue;
                };
                for (tag, event) in heard {
                    if families.get(&tag) != Some(&family) {
                        continue;
                    }
                    checked += 1;
                    if events.get(&tag).is_some_and(|sent| sent.contains(&event)) {
                        continue;
                    }
                    findings.push(Finding {
                        detail: format!(
                            "`<{tag}>` does not declare `{event}`. Either nothing sends it and the \
                             listener never runs, or a child sends it and this element does not \
                             say it passes it on, which a parent is asked to. Listen for what the \
                             element declares, or declare the relay where it is real."
                        ),
                        file: path
                            .strip_prefix(&context.root)
                            .unwrap_or(&path)
                            .to_string_lossy()
                            .replace('\\', "/"),
                        message: format!(
                            "listens on `<{tag}>` for `{event}`, which it does not declare"
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "listeners on a family's own elements",
    }
}
