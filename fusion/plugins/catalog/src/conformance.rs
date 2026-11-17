//! The suite every catalog passes, built in or loaded.
//!
//! **Run against a binding made for it.** The suite is handed the ids of
//! records the binding is known to hold, one it is known not to, and a
//! delivery the binding signed and one it did not, and checks what any
//! catalog owes a host: a schema, a result from `check`, a listing that ends
//! and names each record once, `get` agreeing with `list`, a search that
//! keeps to its limit, and a forged delivery refused. [`editor`] adds the
//! writer's checks. A catalog that reads a remote service runs it against a
//! stand-in of that service.
//!
//! **Every check is named**, so a failure says which part of the contract
//! broke.

use std::collections::BTreeSet;
use std::fmt;

use crate::{Catalog, Delivery, Draft, Editor, Error, Record};

/// The most pages a listing may take before the suite calls it endless.
const MOST_PAGES: usize = 1000;

/// What the binding under test is known to hold.
#[derive(Clone, Debug, PartialEq)]
pub struct Fixture {
    /// Ids of records the binding holds: at least one.
    pub known: Vec<String>,
    /// An id no record in the binding has.
    pub missing: String,
    /// A delivery the service signed, naming at least one record.
    pub signed: Delivery,
    /// The same delivery with its signature broken.
    pub forged: Delivery,
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

    /// Panics with every failure, for a test.
    ///
    /// # Panics
    ///
    /// Where any check failed.
    pub fn assert_passed(&self) {
        assert!(self.ok(), "the catalog failed the suite:\n{self}");
    }
}

impl fmt::Display for Report {
    fn fmt(&self, into: &mut fmt::Formatter<'_>) -> fmt::Result {
        for failure in &self.failed {
            writeln!(into, "{}: {}", failure.check, failure.why)?;
        }
        write!(
            into,
            "{} passed, {} failed",
            self.passed.len(),
            self.failed.len()
        )
    }
}

fn said(error: &Error) -> String {
    error.sentence()
}

/// Every record the catalog lists from the start, or why the listing broke.
fn everything(catalog: &dyn Catalog) -> Result<Vec<Record>, String> {
    let mut since: Option<String> = None;
    let mut records = Vec::new();
    for _ in 0..MOST_PAGES {
        let page = catalog.list(since.as_deref()).map_err(|why| said(&why))?;
        records.extend(page.records);
        if !page.more {
            return Ok(records);
        }
        if since.as_deref() == Some(page.next.as_str()) {
            return Err(format!(
                "the cursor stayed at `{}` with more to list",
                page.next
            ));
        }
        since = Some(page.next);
    }
    Err(format!("the listing took more than {MOST_PAGES} pages"))
}

/// Runs the reader's checks.
#[must_use]
pub fn run(catalog: &dyn Catalog, fixture: &Fixture) -> Report {
    let mut report = Report::default();
    report.record(
        "spec.schema",
        catalog.spec().map_err(|why| said(&why)).and_then(|spec| {
            serde_json::from_str::<serde_json::Value>(&spec)
                .map_err(|why| format!("the schema is not JSON: {why}"))
                .and_then(|schema| {
                    schema
                        .is_object()
                        .then_some(())
                        .ok_or_else(|| "the schema is not an object".to_owned())
                })
        }),
    );
    report.record(
        "check.reads",
        catalog
            .check()
            .map_err(|why| said(&why))
            .and_then(|access| {
                access
                    .read
                    .then_some(())
                    .ok_or_else(|| "the fixture's credential cannot read".to_owned())
            }),
    );
    let listed = everything(catalog);
    report.record(
        "list.ends",
        listed.as_ref().map(|_| ()).map_err(Clone::clone),
    );
    let listed = listed.unwrap_or_default();
    let mut ids = BTreeSet::new();
    let twice: Vec<&str> = listed
        .iter()
        .filter(|record| !ids.insert(record.id.as_str()))
        .map(|record| record.id.as_str())
        .collect();
    report.record(
        "list.once",
        if twice.is_empty() {
            Ok(())
        } else {
            Err(format!("listed more than once: {}", twice.join(", ")))
        },
    );
    let absent: Vec<&str> = fixture
        .known
        .iter()
        .map(String::as_str)
        .filter(|id| !ids.contains(id))
        .collect();
    report.record(
        "list.known",
        if absent.is_empty() {
            Ok(())
        } else {
            Err(format!("known records not listed: {}", absent.join(", ")))
        },
    );
    report.record(
        "get.agrees",
        fixture.known.iter().try_for_each(|id| {
            let got = catalog
                .get(id)
                .map_err(|why| format!("{id}: {}", said(&why)))?;
            match listed.iter().find(|record| &record.id == id) {
                Some(record) if record.version != got.version => Err(format!(
                    "{id}: listed at version {}, got at {}",
                    record.version, got.version
                )),
                _ => Ok(()),
            }
        }),
    );
    lookups(catalog, fixture, &mut report);
    report
}

/// The checks of `get` for a missing id, `search`, and `receive`.
fn lookups(catalog: &dyn Catalog, fixture: &Fixture, report: &mut Report) {
    report.record(
        "get.missing",
        match catalog.get(&fixture.missing) {
            Err(Error::NotFound(_)) => Ok(()),
            Err(other) => Err(format!("expected not found, got {}", said(&other))),
            Ok(_) => Err(format!("`{}` was found", fixture.missing)),
        },
    );
    report.record(
        "search.limit",
        catalog
            .search("", 1)
            .map_err(|why| said(&why))
            .and_then(|found| {
                (found.len() <= 1)
                    .then_some(())
                    .ok_or_else(|| format!("asked for 1, got {}", found.len()))
            }),
    );
    report.record(
        "receive.signed",
        catalog
            .receive(&fixture.signed)
            .map_err(|why| said(&why))
            .and_then(|ids| {
                (!ids.is_empty())
                    .then_some(())
                    .ok_or_else(|| "a signed delivery named no records".to_owned())
            }),
    );
    report.record(
        "receive.forged",
        match catalog.receive(&fixture.forged) {
            Err(Error::Denied(_)) => Ok(()),
            Err(other) => Err(format!("expected denied, got {}", said(&other))),
            Ok(ids) => Err(format!("a forged delivery was taken, naming {}", ids.len())),
        },
    );
}

/// Runs the reader's checks and the writer's: a write lands and changes the
/// version, a stale version is refused without writing, and a record made is
/// one `get` finds.
#[must_use]
pub fn editor(catalog: &dyn Editor, fixture: &Fixture) -> Report {
    let mut report = run(catalog, fixture);
    let Some(id) = fixture.known.first() else {
        report.record("update.lands", Err("the fixture names no record".into()));
        return report;
    };
    let before = catalog.get(id);
    let mut draft = Draft::empty();
    draft.title = Some("Renamed by the suite".into());
    let written = before.as_ref().map_err(said).and_then(|record| {
        catalog
            .update(id, &record.version, &draft)
            .map_err(|why| said(&why))
    });
    report.record(
        "update.lands",
        written.as_ref().map_err(Clone::clone).and_then(|record| {
            if record.title.text != "Renamed by the suite" {
                Err("the title did not change".into())
            } else if before
                .as_ref()
                .is_ok_and(|was| was.version == record.version)
            {
                Err("the version did not change".into())
            } else {
                Ok(())
            }
        }),
    );
    let mut stale = Draft::empty();
    stale.title = Some("Written over".into());
    report.record(
        "update.stale",
        match before.map(|was| catalog.update(id, &was.version, &stale)) {
            Ok(Err(Error::Conflict(_) | Error::Unsupported(_))) => Ok(()),
            Ok(Err(other)) => Err(format!("expected a conflict, got {}", said(&other))),
            Ok(Ok(_)) => Err("a write with a stale version landed".into()),
            Err(why) => Err(said(&why)),
        },
    );
    let mut made = Draft::empty();
    made.title = Some("Made by the suite".into());
    report.record(
        "create.found",
        match catalog.create(&made) {
            Ok(record) => catalog
                .get(&record.id)
                .map(|_| ())
                .map_err(|why| said(&why)),
            Err(Error::Unsupported(_)) => Ok(()),
            Err(other) => Err(said(&other)),
        },
    );
    report
}
