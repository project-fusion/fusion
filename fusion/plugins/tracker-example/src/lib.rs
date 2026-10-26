//! A tracker from outside, which is what the `fusion:tracker` world exists to
//! run.
//!
//! **Its items are its binding's settings.** A tracker is lent its binding's
//! settings and nothing else, so this one lists and reads the items a person
//! wrote there, and declines every write as a tracker bound with a read-only
//! credential does. A tracker for a real service reaches it the same way,
//! once the host lends it requests, and the example an author copies is about
//! the contract alone.

wit_bindgen::generate!({
    path: ["../wit/sources", "../wit/tracker"],
    world: "fusion:tracker/writer",
    // The sources world's records come from its own package, generated here
    // beside the tracker's.
    generate_all,
});

use fusion::sources::binding;
use fusion::sources::types::{Access, Author, Entry, Error, Item, Page, Untrusted};
use exports::fusion::sources::source::Guest as Source;
use exports::fusion::tracker::tracker::{Change, Draft, Guest as Tracker};
use serde::Deserialize;

/// The most items one page of a listing holds, small so a host meets paging.
const PAGE: usize = 2;

/// The binding's settings, as `spec` describes them.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Settings {
    items: Vec<Written>,
}

/// One item as a person wrote it in the settings.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Written {
    id: String,
    title: String,
    #[serde(default)]
    body: String,
    #[serde(default)]
    labels: Vec<String>,
    author: String,
    #[serde(default)]
    address: Option<String>,
}

/// The settings read, or a sentence saying why they will not.
fn settings() -> Result<Settings, Error> {
    serde_json::from_str(&binding::settings())
        .map_err(|why| Error::Invalid(format!("the binding's settings will not read: {why}")))
}

/// FNV-1a, which is enough to tell one text from another and needs no
/// dependency.
fn fingerprint(text: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in text.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0100_0000_01b3);
    }
    format!("{hash:016x}")
}

/// One item as the world hands it over, every word a person wrote marked
/// untrusted, and its version the fingerprint of what they wrote.
fn item(written: &Written) -> Item {
    let version = fingerprint(&format!(
        "{}\u{0}{}\u{0}{}\u{0}{}\u{0}{:?}",
        written.title,
        written.body,
        written.labels.join("\u{1}"),
        written.author,
        written.address
    ));
    Item {
        id: written.id.clone(),
        address: written.address.clone(),
        version,
        title: Untrusted {
            text: written.title.clone(),
        },
        body: Untrusted {
            text: written.body.clone(),
        },
        labels: written
            .labels
            .iter()
            .map(|label| Untrusted {
                text: label.clone(),
            })
            .collect(),
        open: true,
        status: None,
        author: Author {
            name: Untrusted {
                text: written.author.clone(),
            },
            can_write: None,
        },
        links: Vec::new(),
    }
}

/// Why every write is declined.
fn read_only() -> Error {
    Error::Denied(
        "this tracker's items are its binding's settings, so it writes nothing back".to_owned(),
    )
}

struct Example;

impl Source for Example {
    fn spec() -> String {
        serde_json::json!({
            "type": "object",
            "required": ["items"],
            "additionalProperties": false,
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "title", "author"],
                        "additionalProperties": false,
                        "properties": {
                            "id": { "type": "string" },
                            "title": { "type": "string" },
                            "body": { "type": "string" },
                            "labels": { "type": "array", "items": { "type": "string" } },
                            "author": { "type": "string" },
                            "address": { "type": "string" }
                        }
                    }
                }
            }
        })
        .to_string()
    }

    fn check() -> Result<Access, Error> {
        settings()?;
        Ok(Access {
            read: true,
            write_back: false,
            create: false,
            versions: false,
        })
    }

    fn discover() -> Result<Vec<Entry>, Error> {
        let mut labels: Vec<String> = settings()?
            .items
            .into_iter()
            .flat_map(|written| written.labels)
            .collect();
        labels.sort();
        labels.dedup();
        Ok(labels
            .into_iter()
            .map(|label| Entry {
                kind: "label".to_owned(),
                id: label.clone(),
                name: Untrusted { text: label },
            })
            .collect())
    }

    /// **A cursor is where the listing stopped and what the settings were.**
    /// Nothing changes while the settings stay the same, so a listing that
    /// reached the end brings nothing back until a person edits them, and
    /// then brings back everything.
    fn list(since: Option<String>) -> Result<Page, Error> {
        let settings = settings()?;
        let seen = fingerprint(&binding::settings());
        let start = match since.as_deref().map(|cursor| cursor.split_once(':')) {
            None => 0,
            Some(Some((at, fingerprint))) if fingerprint == seen => at
                .parse::<usize>()
                .map_err(|_| Error::Invalid(format!("{at} is not a cursor this tracker gave")))?,
            Some(Some(_)) => 0,
            Some(None) => {
                return Err(Error::Invalid(
                    "that is not a cursor this tracker gave".to_owned(),
                ));
            }
        };
        let end = (start + PAGE).min(settings.items.len());
        let items = settings
            .items
            .get(start..end)
            .unwrap_or_default()
            .iter()
            .map(item)
            .collect();
        Ok(Page {
            items,
            next: format!("{end}:{seen}"),
            more: end < settings.items.len(),
        })
    }

    fn get(id: String) -> Result<Item, Error> {
        settings()?
            .items
            .iter()
            .find(|written| written.id == id)
            .map(item)
            .ok_or_else(|| Error::NotFound(format!("no item is called {id}")))
    }
}

impl Tracker for Example {
    fn claim(id: String, _: Option<String>) -> Result<(), Error> {
        Self::get(id)?;
        Err(read_only())
    }

    fn update(id: String, _: String, _: Change) -> Result<String, Error> {
        Self::get(id)?;
        Err(read_only())
    }

    fn link(id: String, _: String) -> Result<(), Error> {
        Self::get(id)?;
        Err(read_only())
    }

    fn create(_: Draft) -> Result<Item, Error> {
        Err(Error::Unsupported(
            "this tracker's items are its binding's settings, so it files none".to_owned(),
        ))
    }
}

export!(Example);
