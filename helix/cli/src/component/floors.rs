//! A rule that reports a corpus of nothing has stopped checking.
//!
//! **A check that silently stops checking reads exactly like a check that
//! passes**, and the case that proves it is in this repository's own history: a
//! shader rule spelled its scan roots out, a directory was renamed, and the
//! pattern went on matching nothing under the old name. It scanned 1,117 files
//! where 1,343 existed, missed three quarters of its subject, and stayed green
//! throughout, because what it could still reach was fine.
//!
//! **That one would not have been caught here either**, which is the honest
//! limit of this rule: its corpus fell to 1,117 rather than to zero. A floor
//! catches the fall to nothing. The fall by three quarters needs somebody to
//! read the number, which is why `audit` prints every count rather than only
//! the failures.
//!
//! **The other half is refused before any rule runs.** A configuration whose
//! every tier is missing makes all of them report zero at once, and that is a
//! fault in the configuration rather than in the rules, so `run` names it
//! rather than letting this report it N times.

use crate::component::{all, Context, Finding, Report};

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    for rule in all().iter().filter(|rule| !rule.meta) {
        checked += 1;
        let report = (rule.run)(context);
        if report.checked > 0 {
            continue;
        }
        findings.push(Finding {
            detail: "The number a rule reports has to be what it tested. Zero means it looked at \
                     nothing, which reads identically to having found nothing wrong."
                .to_owned(),
            file: format!("rule: {}", rule.name),
            message: format!("counted no {}", report.unit),
        });
    }
    Report {
        checked,
        findings,
        unit: "rules",
    }
}
