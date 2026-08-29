//! A rule that reports a corpus of nothing has stopped checking.
//!
//! **A check that silently stops checking reads exactly like a check that
//! passes.** The case this was written after: a rule held number words in some
//! prose against a real count, and its pattern ran `forty` through `seventy` and
//! stopped matching the day the count passed seventy-nine. It went on printing a
//! success line naming eighty-five items through two items' worth of drift,
//! because eighty-five things were still being *looked at*.
//!
//! That is the trap, and it is specific: the number a rule reports has to be
//! what it *tested*, not what it walked past. A corpus size is reassuring and
//! proves nothing.
//!
//! **A floor rather than a baseline.** Comparing against committed numbers fails
//! every time something is deleted, and the fall worth catching is the fall to
//! nothing rather than the fall by one.
//!
//! **In process, which is the one thing a binary does better here.** As a script
//! this spawned every other check and parsed integers out of their success
//! lines, so it cost the whole suite a second time and could be fooled by a
//! sentence. A rule returns its count, so this reads the count.
//!
//! **What it cannot catch, said plainly.** A rule whose corpus is intact and
//! whose predicate has gone stale still reports its corpus and still passes. The
//! only defense is each rule counting its assertions, which is a property of how
//! each is written and not something a sibling can impose.

use crate::rules::{Finding, Measured, Report};

pub fn run(measured: &[Measured]) -> Report {
    let findings = measured
        .iter()
        .filter(|one| one.checked == 0)
        .map(|one| Finding {
            detail: "The number a rule reports has to be what it tested. Zero means it looked at \
                     nothing, which reads identically to having found nothing wrong."
                .to_owned(),
            file: format!("rule: {}", one.name),
            message: format!("counted no {}", one.unit),
        })
        .collect();
    Report {
        checked: measured.len(),
        findings,
        unit: "rules",
    }
}
