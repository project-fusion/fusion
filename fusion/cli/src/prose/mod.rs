//! Rules about what this repository wrote down, rather than what it built.
//!
//! **A separate noun and the same `Rule`**, which is the shape the split wants:
//! a prose rule measures and returns exactly as a workspace rule does, so the
//! three verbs, the JSON contract and the floor all work unchanged. What differs
//! is the subject, and a subject is what a noun is.

pub mod art;
pub mod dialect;
pub mod documented;
pub mod orphans;
pub mod references;
pub mod tag_order;
pub mod repository;

use crate::rules::{floor, Rule, Runner};

pub fn all() -> Vec<Rule> {
    vec![
        floor(),
        Rule {
            fix: None,
            name: "art",
            run: Runner::Source(art::run),
            summary: "every family in the catalog has a gallery card, and the prose says how many",
        },
        Rule {
            fix: Some(dialect::fix),
            name: "dialect",
            run: Runner::Source(dialect::run),
            summary: "every word this repository writes is in American spelling",
        },
        Rule {
            fix: None,
            name: "documented",
            run: Runner::Source(documented::run),
            summary: "every API name the documentation uses is one that exists",
        },
        Rule {
            fix: None,
            name: "orphans",
            run: Runner::Source(orphans::run),
            summary: "every doc block documents the thing under it",
        },
        Rule {
            fix: None,
            name: "references",
            run: Runner::Source(references::run),
            summary: "every path and script a comment names is one that is there",
        },
        Rule {
            fix: None,
            name: "repository",
            run: Runner::Source(repository::run),
            summary: "every reference to this repository names the one place it lives",
        },
        Rule {
            fix: Some(tag_order::fix),
            name: "tag-order",
            run: Runner::Source(tag_order::run),
            summary: "every class doc block carries its tags in one order, with every list sorted",
        },
    ]
}
