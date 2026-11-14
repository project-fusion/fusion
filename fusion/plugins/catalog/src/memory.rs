//! The reference catalog: records held in memory, which the suite runs
//! against and a host's tests stand a service in with.

use std::cell::RefCell;
use std::collections::BTreeMap;

use crate::{
    Access, Catalog, Delivery, Draft, Editor, Error, Field, Page, Record, State, Untrusted, Variant,
};

/// The header a delivery to [`Memory`] carries its key in. A real catalog
/// checks a signature instead, such as an HMAC of the body.
pub const KEY_HEADER: &str = "x-memory-key";

/// The most records a page holds.
const PAGE: usize = 2;

/// A catalog held in memory. Each change takes the next number, a cursor is
/// the number it was read at, and a delivery is a JSON list of ids sent with
/// the key the catalog was made with.
#[derive(Debug)]
pub struct Memory {
    key: String,
    held: RefCell<Held>,
}

#[derive(Debug, Default)]
struct Held {
    clock: u64,
    /// Each record, with the number it last changed at.
    records: BTreeMap<String, (u64, Record)>,
    /// Each removed id, with the number it was removed at.
    removed: BTreeMap<String, u64>,
    made: u64,
}

impl Memory {
    /// An empty catalog that takes deliveries sent with `key`.
    #[must_use]
    pub fn new(key: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            held: RefCell::new(Held::default()),
        }
    }

    /// Holds `record` as the service's own, as if a person changed it there.
    pub fn put(&self, mut record: Record) {
        let mut held = self.held.borrow_mut();
        held.clock += 1;
        let at = held.clock;
        record.version = at.to_string();
        held.removed.remove(&record.id);
        held.records.insert(record.id.clone(), (at, record));
    }

    /// Removes a record, as if a person deleted it in the service.
    pub fn remove(&self, id: &str) {
        let mut held = self.held.borrow_mut();
        held.clock += 1;
        let at = held.clock;
        if held.records.remove(id).is_some() {
            held.removed.insert(id.to_owned(), at);
        }
    }

    /// A record with a title and one variant, for tests.
    #[must_use]
    pub fn record(id: &str, title: &str) -> Record {
        Record {
            id: id.to_owned(),
            version: String::new(),
            address: None,
            handle: Some(id.to_owned()),
            title: Untrusted::new(title),
            description: Untrusted::new(""),
            state: State::Active,
            fields: Vec::new(),
            images: Vec::new(),
            variants: vec![Variant {
                id: format!("{id}-default"),
                title: Untrusted::new("Default"),
                sku: None,
                price: None,
                available: Some(true),
                options: Vec::new(),
            }],
        }
    }
}

fn apply(record: &mut Record, draft: &Draft) {
    if let Some(title) = &draft.title {
        record.title = Untrusted::new(title.clone());
    }
    if let Some(description) = &draft.description {
        record.description = Untrusted::new(description.clone());
    }
    if let Some(state) = draft.state {
        record.state = state;
    }
    if let Some(handle) = &draft.handle {
        record.handle = Some(handle.clone());
    }
    for field in &draft.fields {
        set(&mut record.fields, field);
    }
    for change in &draft.variants {
        let at = change
            .id
            .as_ref()
            .and_then(|id| record.variants.iter().position(|held| &held.id == id));
        let variant = if let Some(at) = at {
            &mut record.variants[at]
        } else {
            let id = format!("{}-{}", record.id, record.variants.len() + 1);
            record.variants.push(Variant {
                id,
                title: Untrusted::new(""),
                sku: None,
                price: None,
                available: Some(true),
                options: Vec::new(),
            });
            let last = record.variants.len() - 1;
            &mut record.variants[last]
        };
        variant.title = Untrusted::new(change.title.clone());
        if change.sku.is_some() {
            variant.sku.clone_from(&change.sku);
        }
        if change.price.is_some() {
            variant.price.clone_from(&change.price);
        }
        for option in &change.options {
            set(&mut variant.options, option);
        }
    }
}

fn set(fields: &mut Vec<Field>, field: &Field) {
    match fields.iter_mut().find(|held| held.name == field.name) {
        Some(held) => held.value = field.value.clone(),
        None => fields.push(field.clone()),
    }
}

fn after(since: Option<&str>) -> Result<u64, Error> {
    since.map_or(Ok(0), |since| {
        since
            .parse()
            .map_err(|_| Error::Invalid(format!("`{since}` is not a cursor this catalog made")))
    })
}

impl Catalog for Memory {
    fn spec(&self) -> Result<String, Error> {
        Ok(r#"{"type":"object","properties":{},"additionalProperties":false}"#.to_owned())
    }

    fn check(&self) -> Result<Access, Error> {
        Ok(Access {
            read: true,
            write: true,
            create: true,
        })
    }

    fn list(&self, since: Option<&str>) -> Result<Page, Error> {
        let from = after(since)?;
        let held = self.held.borrow();
        let mut changed: Vec<&(u64, Record)> =
            held.records.values().filter(|(at, _)| *at > from).collect();
        changed.sort_by_key(|(at, _)| *at);
        let more = changed.len() > PAGE;
        changed.truncate(PAGE);
        let next = if more {
            changed.last().map_or(from, |(at, _)| *at)
        } else {
            held.clock
        };
        let removed = held
            .removed
            .iter()
            .filter(|(_, at)| **at > from && **at <= next)
            .map(|(id, _)| id.clone())
            .collect();
        Ok(Page {
            records: changed
                .into_iter()
                .map(|(_, record)| record.clone())
                .collect(),
            removed,
            next: next.to_string(),
            more,
        })
    }

    fn get(&self, id: &str) -> Result<Record, Error> {
        self.held
            .borrow()
            .records
            .get(id)
            .map(|(_, record)| record.clone())
            .ok_or_else(|| Error::NotFound(format!("no record has the id `{id}`")))
    }

    fn search(&self, query: &str, limit: u32) -> Result<Vec<Record>, Error> {
        let query = query.to_lowercase();
        let limit = usize::try_from(limit).unwrap_or(usize::MAX);
        Ok(self
            .held
            .borrow()
            .records
            .values()
            .map(|(_, record)| record)
            .filter(|record| record.title.text.to_lowercase().contains(&query))
            .take(limit)
            .cloned()
            .collect())
    }

    fn receive(&self, delivery: &Delivery) -> Result<Vec<String>, Error> {
        let key = delivery
            .headers
            .iter()
            .find(|(name, _)| name == KEY_HEADER)
            .map(|(_, value)| value.as_str());
        if key != Some(self.key.as_str()) {
            return Err(Error::Denied(
                "the delivery was not sent with this catalog's key".into(),
            ));
        }
        serde_json::from_slice(&delivery.body)
            .map_err(|why| Error::Invalid(format!("the delivery is not a list of ids: {why}")))
    }
}

impl Editor for Memory {
    fn create(&self, draft: &Draft) -> Result<Record, Error> {
        let id = {
            let mut held = self.held.borrow_mut();
            held.made += 1;
            format!("made-{}", held.made)
        };
        let mut record = Self::record(&id, "");
        record.state = State::Draft;
        record.variants.clear();
        apply(&mut record, draft);
        if record.variants.is_empty() {
            record.variants = Self::record(&id, "").variants;
        }
        self.put(record);
        self.get(&id)
    }

    fn update(&self, id: &str, version: &str, draft: &Draft) -> Result<Record, Error> {
        let mut record = self.get(id)?;
        if record.version != version {
            return Err(Error::Conflict(format!(
                "the record is at version {}, not {version}",
                record.version
            )));
        }
        apply(&mut record, draft);
        self.put(record);
        self.get(id)
    }
}
