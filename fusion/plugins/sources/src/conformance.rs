//! The suite every source passes, built in or loaded.
//!
//! **Run against a binding made for it.** The suite is handed the ids of
//! items the binding is known to hold and one it is known not to, and checks
//! what any source owes a host: a schema, a result from `check`, a listing
//! that ends and names each item once, a cursor that only brings back what
//! changed, and `get` agreeing with `list`. A source that reads a remote
//! service runs it against a fake of that service.
//!
//! **Every check is named**, so a failure says which part of the contract
//! broke, and a host's docs and a source's tests mean the same thing by it.

use std::collections::BTreeSet;
use std::fmt;

use crate::{Error, Item, Source};

/// The most pages a listing may take before the suite calls it endless.
const MOST_PAGES: usize = 1000;

/// What the binding under test is known to hold.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Fixture {
    /// Ids of items the binding holds: at least one.
    pub known: Vec<String>,
    /// An id no item in the binding has.
    pub missing: String,
}

/// One check that did not hold.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Failure {
    /// The check's name, such as `list.ends`.
    pub check: &'static str,
    pub why: String,
}

/// What a run of the suite found.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Report {
    /// The checks that held, in the order they ran.
    pub passed: Vec<&'static str>,
    pub failed: Vec<Failure>,
}

impl Report {
    /// Whether every check held.
    #[must_use]
    pub fn ok(&self) -> bool {
        self.failed.is_empty()
    }

    /// Records one check: held where `result` is `Ok`.
    pub fn record(&mut self, check: &'static str, result: Result<(), String>) {
        match result {
            Ok(()) => self.passed.push(check),
            Err(why) => self.failed.push(Failure { check, why }),
        }
    }

    /// Panics naming every check that did not hold, for a test.
    ///
    /// # Panics
    ///
    /// Where any check did not hold.
    #[track_caller]
    pub fn assert_passed(&self) {
        assert!(self.ok(), "{self}");
    }
}

impl fmt::Display for Report {
    fn fmt(&self, into: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            into,
            "{} checks held and {} did not",
            self.passed.len(),
            self.failed.len()
        )?;
        for failure in &self.failed {
            write!(into, "\n  {}: {}", failure.check, failure.why)?;
        }
        Ok(())
    }
}

/// Every item listed from `since` to the end, and the cursor the listing
/// ended at.
///
/// # Errors
///
/// A sentence where a page failed, or where the listing did not end
/// within a thousand pages.
pub fn listed(source: &dyn Source, since: Option<&str>) -> Result<(Vec<Item>, String), String> {
    let mut items = Vec::new();
    let mut cursor = since.map(str::to_owned);
    for _ in 0..MOST_PAGES {
        let page = source
            .list(cursor.as_deref())
            .map_err(|why| format!("list failed: {}", why.sentence()))?;
        items.extend(page.items);
        cursor = Some(page.next);
        if !page.more {
            return Ok((items, cursor.unwrap_or_default()));
        }
    }
    Err(format!(
        "list still said there was more after {MOST_PAGES} pages"
    ))
}

/// Whether an item is whole: an id, a version, and each link once.
///
/// # Errors
///
/// A sentence naming what is missing.
pub fn whole(item: &Item) -> Result<(), String> {
    if item.id.is_empty() {
        return Err("an item has no id".to_owned());
    }
    if item.version.is_empty() {
        return Err(format!("item {} has no version", item.id));
    }
    let links: BTreeSet<&String> = item.links.iter().collect();
    if links.len() != item.links.len() {
        return Err(format!("item {} names one link twice", item.id));
    }
    Ok(())
}

/// `spec` returns a JSON Schema object.
fn schema(source: &dyn Source) -> Result<(), String> {
    let said = source
        .spec()
        .map_err(|why| format!("spec failed: {}", why.sentence()))?;
    let schema = serde_json::from_str::<serde_json::Value>(&said)
        .map_err(|why| format!("spec is not JSON: {why}"))?;
    if schema.is_object() {
        Ok(())
    } else {
        Err("spec is JSON but not a schema object".to_owned())
    }
}

/// `discover` names each entry once, each with a kind and an id.
fn discovered(source: &dyn Source) -> Result<(), String> {
    let entries = source
        .discover()
        .map_err(|why| format!("discover failed: {}", why.sentence()))?;
    let mut seen = BTreeSet::new();
    for entry in &entries {
        if entry.id.is_empty() || entry.kind.is_empty() {
            return Err("an entry has no kind or no id".to_owned());
        }
        if !seen.insert((entry.kind.clone(), entry.id.clone())) {
            return Err(format!("{} {} is listed twice", entry.kind, entry.id));
        }
    }
    Ok(())
}

/// Runs every check against `source`, which holds what `fixture` says.
pub fn run(source: &dyn Source, fixture: &Fixture) -> Report {
    let mut report = Report::default();

    report.record("spec.is-a-schema", schema(source));

    report.record(
        "check.reads",
        match source.check() {
            Ok(access) if access.read => Ok(()),
            Ok(_) => Err("check says the binding cannot read".to_owned()),
            Err(why) => Err(format!("check failed: {}", why.sentence())),
        },
    );

    report.record("discover.names-each-once", discovered(source));

    if fixture.known.is_empty() {
        report.record(
            "fixture.names-an-item",
            Err("the fixture names no item the binding holds".to_owned()),
        );
        return report;
    }

    let listing = listed(source, None);
    report.record(
        "list.ends",
        listing.as_ref().map(|_| ()).map_err(Clone::clone),
    );
    let Ok((items, cursor)) = listing else {
        return report;
    };

    report.record("list.items-are-whole", items.iter().try_for_each(whole));

    report.record("list.each-item-once", {
        let mut seen = BTreeSet::new();
        items
            .iter()
            .find(|item| !seen.insert(item.id.as_str()))
            .map_or(Ok(()), |twice| {
                Err(format!("item {} is listed twice", twice.id))
            })
    });

    report.record("list.every-known-item", {
        let ids: BTreeSet<&str> = items.iter().map(|item| item.id.as_str()).collect();
        let absent: Vec<&str> = fixture
            .known
            .iter()
            .map(String::as_str)
            .filter(|id| !ids.contains(id))
            .collect();
        if absent.is_empty() {
            Ok(())
        } else {
            Err(format!("the listing leaves out {}", absent.join(", ")))
        }
    });

    report.record(
        "list.quiet-since-its-cursor",
        listed(source, Some(&cursor)).and_then(|(again, _)| {
            if again.is_empty() {
                Ok(())
            } else {
                Err(format!(
                    "nothing changed, and listing since the last cursor brought back {}",
                    again
                        .iter()
                        .map(|item| item.id.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
            }
        }),
    );

    report.record(
        "get.matches-list",
        fixture.known.iter().try_for_each(|id| {
            let got = source
                .get(id)
                .map_err(|why| format!("get {id} failed: {}", why.sentence()))?;
            let listed = items.iter().find(|item| &item.id == id);
            match listed {
                Some(listed) if *listed != got => Err(format!(
                    "get {id} returns an item that differs from the listing's, at version {} \
                     against {}",
                    got.version, listed.version
                )),
                _ if got.id != *id => Err(format!("get {id} returned item {}", got.id)),
                _ => Ok(()),
            }
        }),
    );

    report.record("get.missing-is-not-found", absent(source, &fixture.missing));

    report
}

/// `get` on an id no item has is not-found.
fn absent(source: &dyn Source, missing: &str) -> Result<(), String> {
    match source.get(missing) {
        Err(Error::NotFound(_)) => Ok(()),
        Ok(item) => Err(format!(
            "get {missing} returned item {}, and the fixture says there is none",
            item.id
        )),
        Err(other) => Err(format!(
            "get {missing} returned {} where not-found was expected",
            other.sentence()
        )),
    }
}
