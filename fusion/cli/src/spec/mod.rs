//! Rules about the specs, rather than about what they test.
//!
//! **Four ways a spec stops protecting anything while still reading as one.** It
//! reaches a matcher one of its two runners does not have; it hangs or exhausts
//! the run instead of failing; no script reaches its file at all; or it tests a
//! second copy of the library that a page registered underneath it.
//!
//! None of those is a failing assertion, which is the whole reason they need a
//! check: a failing assertion announces itself.

pub mod hazards;
pub mod isolated;
pub mod matchers;
pub mod runners;

use crate::rules::{floor, Rule, Runner};

pub fn all() -> Vec<Rule> {
    vec![
        floor(),
        Rule {
            fix: None,
            name: "hazards",
            run: Runner::Source(hazards::run),
            summary: "no spec hangs the run, exhausts the machine, or tests the previous build",
        },
        Rule {
            fix: None,
            name: "isolated",
            run: Runner::Source(isolated::run),
            summary: "the specs document never registers the component library a second time",
        },
        Rule {
            fix: None,
            name: "matchers",
            run: Runner::Source(matchers::run),
            summary: "every matcher a spec reaches for exists in both runners",
        },
        Rule {
            fix: None,
            name: "runners",
            run: Runner::Source(runners::run),
            summary: "every spec file is reached by the script that claims to run the specs",
        },
    ]
}
