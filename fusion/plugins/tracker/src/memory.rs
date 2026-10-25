//! The reference tracker: every call of the world, over items held in memory.

use std::collections::BTreeSet;
use std::sync::{Mutex, MutexGuard, PoisonError};

use fusion_plugin_sources::{Access, Author, Entry, Error, Item, Page, Source, Status, Untrusted};

use crate::{Change, Draft, Tracker};

/// One item, with when it last changed and who the host says holds it.
#[derive(Clone, Debug)]
struct Held {
    item: Item,
    /// The clock's reading at its last change, which is its version and what
    /// a cursor compares.
    changed: u64,
    holder: Option<String>,
    waiting_on: Option<String>,
}

#[derive(Debug, Default)]
struct State {
    /// Rises with every change, so a cursor is a reading of it.
    clock: u64,
    items: Vec<Held>,
}

/// A tracker that holds its items in memory: the reference every other
/// tracker is measured beside, and a stand-in for one in a host's own tests.
///
/// **Every call of the world, and nothing a service would add.** It checks
/// versions, files items, and pages its listings, so a host tested against
/// it meets each result a tracker can return.
#[derive(Debug)]
pub struct Memory {
    /// The most items one page of a listing holds.
    page: usize,
    state: Mutex<State>,
}

impl Default for Memory {
    fn default() -> Self {
        Self::new()
    }
}

impl Memory {
    /// An empty tracker whose listings hold up to fifty items a page.
    #[must_use]
    pub fn new() -> Self {
        Self::paged(50)
    }

    /// An empty tracker whose listings hold up to `page` items a page.
    #[must_use]
    pub fn paged(page: usize) -> Self {
        Self {
            page: page.max(1),
            state: Mutex::new(State::default()),
        }
    }

    /// Files an item as somebody in the service would, by `author`, and
    /// returns it.
    pub fn file(&self, draft: &Draft, author: &str) -> Item {
        let mut state = self.held();
        state.clock += 1;
        let changed = state.clock;
        let item = Item {
            id: format!("item-{changed}"),
            address: None,
            version: changed.to_string(),
            title: Untrusted::new(draft.title.clone()),
            body: Untrusted::new(draft.body.clone()),
            labels: draft.labels.iter().cloned().map(Untrusted::new).collect(),
            open: true,
            status: Some(Status::Proposed),
            author: Author {
                name: Untrusted::new(author),
                can_write: None,
            },
            links: Vec::new(),
        };
        state.items.push(Held {
            item: item.clone(),
            changed,
            holder: None,
            waiting_on: None,
        });
        item
    }

    /// Who the host's claim on `id` names, as the tracker shows it.
    #[must_use]
    pub fn holder(&self, id: &str) -> Option<String> {
        self.held()
            .items
            .iter()
            .find(|held| held.item.id == id)
            .and_then(|held| held.holder.clone())
    }

    /// What `id` waits on, as the last update wrote it.
    #[must_use]
    pub fn waiting_on(&self, id: &str) -> Option<String> {
        self.held()
            .items
            .iter()
            .find(|held| held.item.id == id)
            .and_then(|held| held.waiting_on.clone())
    }

    fn held(&self) -> MutexGuard<'_, State> {
        self.state.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// The item with `id`, or not-found.
fn find<'a>(state: &'a mut State, id: &str) -> Result<&'a mut Held, Error> {
    state
        .items
        .iter_mut()
        .find(|held| held.item.id == id)
        .ok_or_else(|| Error::NotFound(format!("no item is called {id}")))
}

/// Marks `held` changed at the next reading of the clock.
fn touch(clock: &mut u64, held: &mut Held) {
    *clock += 1;
    held.changed = *clock;
    held.item.version = clock.to_string();
}

impl Source for Memory {
    fn spec(&self) -> Result<String, Error> {
        Ok(r#"{"type":"object","properties":{},"additionalProperties":false}"#.to_owned())
    }

    fn check(&self) -> Result<Access, Error> {
        Ok(Access {
            read: true,
            write_back: true,
            create: true,
            versions: true,
        })
    }

    fn discover(&self) -> Result<Vec<Entry>, Error> {
        let state = self.held();
        let labels: BTreeSet<&str> = state
            .items
            .iter()
            .flat_map(|held| held.item.labels.iter().map(|label| label.text.as_str()))
            .collect();
        Ok(labels
            .into_iter()
            .map(|label| Entry {
                kind: "label".to_owned(),
                id: label.to_owned(),
                name: Untrusted::new(label),
            })
            .collect())
    }

    fn list(&self, since: Option<&str>) -> Result<Page, Error> {
        let since = match since {
            None => 0,
            Some(cursor) => cursor.parse::<u64>().map_err(|_| {
                Error::Invalid(format!("{cursor} is not a cursor this tracker gave"))
            })?,
        };
        let state = self.held();
        let mut changed: Vec<&Held> = state
            .items
            .iter()
            .filter(|held| held.changed > since)
            .collect();
        changed.sort_by_key(|held| held.changed);
        let more = changed.len() > self.page;
        changed.truncate(self.page);
        let next = if more {
            changed.last().map_or(since, |held| held.changed)
        } else {
            state.clock.max(since)
        };
        Ok(Page {
            items: changed.into_iter().map(|held| held.item.clone()).collect(),
            next: next.to_string(),
            more,
        })
    }

    fn get(&self, id: &str) -> Result<Item, Error> {
        let mut state = self.held();
        find(&mut state, id).map(|held| held.item.clone())
    }
}

impl Tracker for Memory {
    fn claim(&self, id: &str, holder: Option<&str>) -> Result<(), Error> {
        let mut state = self.held();
        find(&mut state, id)?.holder = holder.map(str::to_owned);
        Ok(())
    }

    fn update(&self, id: &str, version: &str, change: &Change) -> Result<String, Error> {
        let mut state = self.held();
        let State { clock, items } = &mut *state;
        let held = items
            .iter_mut()
            .find(|held| held.item.id == id)
            .ok_or_else(|| Error::NotFound(format!("no item is called {id}")))?;
        if held.item.version != version {
            return Err(Error::Conflict(format!(
                "{id} is at version {} and the update was made from version {version}",
                held.item.version
            )));
        }
        held.item.status = Some(change.status);
        held.waiting_on.clone_from(&change.waiting_on);
        touch(clock, held);
        Ok(held.item.version.clone())
    }

    fn link(&self, id: &str, address: &str) -> Result<(), Error> {
        let mut state = self.held();
        let State { clock, items } = &mut *state;
        let held = items
            .iter_mut()
            .find(|held| held.item.id == id)
            .ok_or_else(|| Error::NotFound(format!("no item is called {id}")))?;
        if !held.item.links.iter().any(|link| link == address) {
            held.item.links.push(address.to_owned());
            touch(clock, held);
        }
        Ok(())
    }

    fn create(&self, draft: &Draft) -> Result<Item, Error> {
        Ok(self.file(draft, "the host"))
    }
}
