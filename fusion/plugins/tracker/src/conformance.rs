//! The suite every tracker passes, built in or loaded.
//!
//! **A tracker is a source first**, so the suite runs the sources suite and
//! then holds the four calls a tracker adds to what `check` says the binding
//! allows:
//!
//! - **Where it can write back**, `update` returns a new version and the item
//!   comes back after the cursor taken before it, a stale version is refused
//!   where the tracker checks versions, `claim` shows and clears a holder, and
//!   `link` attaches an address once.
//! - **Where it cannot**, as with a read-only credential, every write is
//!   refused as denied and the item does not change.
//! - **`create`** files an item that lands as proposed, or is declined.
//!
//! **Run it against a binding made for it, because it writes.** The first
//! item the fixture names is the one it changes.

use fusion_plugin_sources::conformance::{listed, Fixture, Report};
use fusion_plugin_sources::{Error, Item, Status};

use crate::{Change, Draft, Tracker};

/// The holder the suite claims items for.
const HOLDER: &str = "conformance";

/// The address the suite links.
const ADDRESS: &str = "https://example.com/conformance/1";

/// Runs the sources suite and every tracker check against `tracker`, which
/// holds what `fixture` says.
pub fn run(tracker: &dyn Tracker, fixture: &Fixture) -> Report {
    let mut report = fusion_plugin_sources::conformance::run(tracker, fixture);
    let Some(id) = fixture.known.first() else {
        return report;
    };
    let Ok(access) = tracker.check() else {
        return report;
    };
    let Ok(before) = tracker.get(id) else {
        return report;
    };

    report.record(
        "write.missing-is-not-found",
        missing(tracker, &fixture.missing),
    );

    if access.write_back {
        writes(tracker, &mut report, &before, access.versions);
    } else {
        refuses(tracker, &mut report, &before);
    }

    report.record(
        "create.files-a-proposed-item-or-declines",
        creates(tracker, access.create && access.write_back),
    );

    report
}

/// `Ok` where `said` is not-found.
fn not_found<T>(call: &str, said: Result<T, Error>) -> Result<(), String> {
    match said {
        Err(Error::NotFound(_)) => Ok(()),
        Ok(_) => Err(format!(
            "{call} on an item that does not exist returned as if it did"
        )),
        Err(other) => Err(format!(
            "{call} on an item that does not exist returned {} where not-found was expected",
            other.sentence()
        )),
    }
}

/// Every write to an item that does not exist is not-found.
fn missing(tracker: &dyn Tracker, id: &str) -> Result<(), String> {
    not_found("claim", tracker.claim(id, Some(HOLDER)))?;
    not_found(
        "update",
        tracker.update(
            id,
            "1",
            &Change {
                status: Status::Ready,
                waiting_on: None,
            },
        ),
    )?;
    not_found("link", tracker.link(id, ADDRESS))
}

/// The checks for a binding that can write back.
fn writes(tracker: &dyn Tracker, report: &mut Report, before: &Item, versions: bool) {
    let id = before.id.as_str();
    let cursor = listed(tracker, None).map(|(_, cursor)| cursor);

    let updated = tracker.update(
        id,
        &before.version,
        &Change {
            status: Status::Ready,
            waiting_on: None,
        },
    );
    report.record(
        "update.returns-a-new-version",
        match &updated {
            Ok(version) if *version == before.version => Err(format!(
                "update returned the version it was sent, {version}"
            )),
            Ok(version) => match tracker.get(id) {
                Ok(after) if after.version != *version => Err(format!(
                    "update returned version {version} and get returns {}",
                    after.version
                )),
                Ok(after) if after.status.is_some_and(|shown| shown != Status::Ready) => Err(
                    format!("update wrote ready and the item shows {:?}", after.status),
                ),
                Ok(_) => Ok(()),
                Err(why) => Err(format!("get after update failed: {}", why.sentence())),
            },
            Err(why) => Err(format!("update failed: {}", why.sentence())),
        },
    );
    let Ok(version) = updated else {
        return;
    };

    report.record(
        "update.listed-after-the-cursor-before-it",
        cursor
            .and_then(|cursor| listed(tracker, Some(&cursor)))
            .and_then(|(again, _)| {
                if again.iter().any(|item| item.id == id) {
                    Ok(())
                } else {
                    Err(format!(
                        "{id} changed and listing since the cursor before the change left it out"
                    ))
                }
            }),
    );

    if versions {
        report.record(
            "update.refuses-a-stale-version",
            stale(tracker, before, &version),
        );
    }

    report.record(
        "update.writes-what-it-waits-on",
        tracker
            .get(id)
            .and_then(|now| {
                tracker.update(
                    id,
                    &now.version,
                    &Change {
                        status: Status::Waiting,
                        waiting_on: Some("a person's answer".to_owned()),
                    },
                )
            })
            .map(|_| ())
            .map_err(|why| format!("update to waiting failed: {}", why.sentence())),
    );

    report.record(
        "claim.shows-and-clears-a-holder",
        tracker
            .claim(id, Some(HOLDER))
            .and_then(|()| tracker.claim(id, None))
            .map_err(|why| format!("claim failed: {}", why.sentence())),
    );

    report.record(
        "link.attaches-an-address-once",
        tracker
            .link(id, ADDRESS)
            .and_then(|()| tracker.link(id, ADDRESS))
            .and_then(|()| tracker.get(id))
            .map_err(|why| format!("link failed: {}", why.sentence()))
            .and_then(
                |after| match after.links.iter().filter(|one| *one == ADDRESS).count() {
                    1 => Ok(()),
                    0 => Err(format!("{id} was linked to {ADDRESS} and does not show it")),
                    many => Err(format!(
                        "{id} was linked to {ADDRESS} twice and shows it {many} times"
                    )),
                },
            ),
    );
}

/// An update from the version read before the last one is refused as a
/// conflict, and the item stays at `version`.
fn stale(tracker: &dyn Tracker, before: &Item, version: &str) -> Result<(), String> {
    let id = before.id.as_str();
    match tracker.update(
        id,
        &before.version,
        &Change {
            status: Status::Waiting,
            waiting_on: Some("a stale write".to_owned()),
        },
    ) {
        Err(Error::Conflict(_)) => match tracker.get(id) {
            Ok(after) if after.version == version => Ok(()),
            Ok(after) => Err(format!(
                "a stale update was refused and the version still moved to {}",
                after.version
            )),
            Err(why) => Err(format!("get failed: {}", why.sentence())),
        },
        Ok(_) => Err("an update from a stale version was written".to_owned()),
        Err(other) => Err(format!(
            "an update from a stale version returned {} where conflict was expected",
            other.sentence()
        )),
    }
}

/// The checks for a binding that cannot write back: each write is denied
/// and changes nothing.
fn refuses(tracker: &dyn Tracker, report: &mut Report, before: &Item) {
    let id = before.id.as_str();
    let denied = |call: &str, said: Result<(), Error>| -> Result<(), String> {
        match said {
            Err(Error::Denied(_)) => match tracker.get(id) {
                Ok(after) if after == *before => Ok(()),
                Ok(_) => Err(format!("{call} was denied and the item changed anyway")),
                Err(why) => Err(format!("get failed: {}", why.sentence())),
            },
            Ok(()) => Err(format!(
                "check says the binding cannot write back, and {call} returned as if it wrote"
            )),
            Err(other) => Err(format!(
                "check says the binding cannot write back, and {call} returned {} where \
                 denied was expected",
                other.sentence()
            )),
        }
    };
    report.record(
        "claim.denied-without-write-back",
        denied("claim", tracker.claim(id, Some(HOLDER))),
    );
    report.record(
        "update.denied-without-write-back",
        denied(
            "update",
            tracker
                .update(
                    id,
                    &before.version,
                    &Change {
                        status: Status::Ready,
                        waiting_on: None,
                    },
                )
                .map(|_| ()),
        ),
    );
    report.record(
        "link.denied-without-write-back",
        denied("link", tracker.link(id, ADDRESS)),
    );
}

/// `create` files a proposed item that `get` and the listing then show, or,
/// where `allowed` is false, is declined as unsupported or denied.
fn creates(tracker: &dyn Tracker, allowed: bool) -> Result<(), String> {
    let draft = Draft {
        title: "Filed by the conformance suite".to_owned(),
        body: "An item the suite files to see it land.".to_owned(),
        labels: Vec::new(),
    };
    let (_, cursor) = listed(tracker, None)?;
    match (allowed, tracker.create(&draft)) {
        (true, Ok(item)) => {
            if item.title.text != draft.title {
                return Err(format!(
                    "create filed {} with the title {:?}",
                    item.id, item.title.text
                ));
            }
            if item.status.is_some_and(|shown| shown != Status::Proposed) {
                return Err(format!(
                    "create filed {} as {:?}, and a new item lands as proposed",
                    item.id, item.status
                ));
            }
            tracker
                .get(&item.id)
                .map_err(|why| format!("get {} after create: {}", item.id, why.sentence()))?;
            let (again, _) = listed(tracker, Some(&cursor))?;
            if again.iter().any(|one| one.id == item.id) {
                Ok(())
            } else {
                Err(format!(
                    "create filed {} and listing since the cursor before it left it out",
                    item.id
                ))
            }
        }
        (true, Err(why)) => Err(format!(
            "check says create is allowed, and create returned {}",
            why.sentence()
        )),
        (false, Err(Error::Unsupported(_) | Error::Denied(_))) => Ok(()),
        (false, Ok(item)) => Err(format!(
            "check says create is not allowed and it filed {}",
            item.id
        )),
        (false, Err(other)) => Err(format!(
            "check says create is not allowed, and create returned {} where unsupported or \
             denied was expected",
            other.sentence()
        )),
    }
}
