//! What a rule is, and the set of them.
//!
//! **A rule measures and returns; it never prints and never exits.** That split
//! is what makes one command able to render the same measurement three ways:
//! quiet for CI, printed for a person, and JSON for a script. It is also what
//! lets `floors` read another rule's count rather than parsing integers out of
//! its prose, which is how it was done before and could be fooled by a sentence.

pub mod barrels;
pub mod floors;
pub mod order;
pub mod prerequisites;
pub mod scripts;

use std::path::PathBuf;

use serde::Serialize;

/// The workspace under test.
pub struct Context {
    pub root: PathBuf,
}

/// One thing wrong, in the place it is wrong.
#[derive(Serialize)]
pub struct Finding {
    /// What to do about it. Rendered dim, and omitted from nothing.
    pub detail: String,
    /// Repository-relative, with a line number where there is one.
    pub file: String,
    pub message: String,
}

/// What a rule reports, whether or not it found anything.
#[derive(Serialize)]
pub struct Report {
    /// **What was tested, never what was walked past.** `floors` reads this,
    /// and a corpus size here would make that rule agree with a check that had
    /// silently stopped checking.
    pub checked: usize,
    pub findings: Vec<Finding>,
    /// What `checked` counts, for a sentence that reads.
    pub unit: &'static str,
}

impl Report {
    pub fn ok(&self) -> bool {
        self.findings.is_empty()
    }
}

/// What a rule can do, beyond judging.
pub struct Rule {
    /// Runs the others, so it is never part of the set it runs.
    pub meta: bool,
    pub name: &'static str,
    pub summary: &'static str,
    /// `None` for a rule that judges and cannot write, which is most of them.
    pub fix: Option<fn(&Context) -> Vec<String>>,
    pub run: fn(&Context) -> Report,
}

/// Every rule, in the order they are listed and run.
pub fn all() -> Vec<Rule> {
    vec![
        Rule {
            fix: None,
            meta: false,
            name: "barrels",
            run: barrels::run,
            summary: "no barrel import of a package that cannot be tree-shaken",
        },
        Rule {
            fix: None,
            meta: true,
            name: "floors",
            run: floors::run,
            summary: "every rule counted something",
        },
        Rule {
            fix: Some(order::fix),
            meta: false,
            name: "order",
            run: order::run,
            summary: "every manifest has its keys in one order",
        },
        Rule {
            fix: None,
            meta: false,
            name: "prerequisites",
            run: prerequisites::run,
            summary: "every typecheck builds what its build builds before compiling",
        },
        Rule {
            fix: None,
            meta: false,
            name: "scripts",
            run: scripts::run,
            summary: "every `bun run` in a manifest names a script that manifest declares",
        },
    ]
}
