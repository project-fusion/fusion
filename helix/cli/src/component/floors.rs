//! A rule that reports a corpus of nothing has stopped checking.
//!
//! **A check that silently stops checking reads exactly like a check that
//! passes.** A rule spelling its scan roots out survives a rename by matching
//! nothing under the old name, and stays green throughout because what it can
//! still reach is fine.
//!
//! **A floor catches only the fall to nothing**, which is this rule's honest
//! limit: a corpus that loses three quarters of its subject still passes here.
//! That one needs somebody to read the number, which is why `audit` prints every
//! count rather than only the failures.
//!
//! **The other half is refused before any rule runs.** A configuration whose
//! every tier is missing makes all of them report zero at once, and that is a
//! fault in the configuration rather than in the rules, so `run` names it
//! rather than letting this report it once per rule.

use crate::component::{Finding, Measured, Report};

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
        notes: Vec::new(),
        unit: "rules",
    }
}
