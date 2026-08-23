//! The error format, which is the other half a person reads.
//!
//! **One shape, whatever failed.** A tool that formats a parse error one way and
//! a filesystem error another teaches a reader to parse its output twice, and
//! the second format is always the one written in a hurry.
//!
//! ```text
//! helix: cannot read theme.json: no such file or directory
//!   try: helix theme init
//! ```
//!
//! Three parts, and the third is what most tools leave out. `what` names the
//! thing that failed in the reader's own vocabulary, the file they typed rather
//! than the function that opened it. `why` is the cause, lowercase and without a
//! full stop, because it continues a sentence. `try` is the next command, and it
//! is optional because inventing one is worse than omitting it: a suggestion
//! that does not work is a second failure with the tool's name on it.
//!
//! Never to stdout. A reader piping `--json` into another program gets a clean
//! stream or nothing, and an error that lands in the middle of that stream is a
//! parse failure two programs away from its cause.

use std::fmt::{Display, Formatter, Result as Fmt};

use crate::exit::Code;

/// A failure, ready to render.
#[derive(Clone, Debug)]
pub struct Failure {
    pub code: Code,
    /// The next command to run, where there is an honest one.
    pub hint: Option<String>,
    /// What failed, named as the reader named it.
    pub what: String,
    /// Why, lowercase and unpunctuated: it continues the line above.
    pub why: String,
}

impl Failure {
    pub fn new(code: Code, what: impl Into<String>, why: impl Into<String>) -> Self {
        Self {
            code,
            hint: None,
            what: what.into(),
            why: why.into(),
        }
    }

    /// The input was unusable. The commonest case, so it gets the short name.
    pub fn input(what: impl Into<String>, why: impl Into<String>) -> Self {
        Self::new(Code::Input, what, why)
    }

    #[must_use]
    pub fn hint(mut self, hint: impl Into<String>) -> Self {
        self.hint = Some(hint.into());
        self
    }

    /// The same failure as data, for `--json`.
    ///
    /// **Reported on stderr like the human form, not folded into the result on
    /// stdout.** A consumer reading stdout gets valid JSON or an empty stream,
    /// and never a document they have to inspect to find out whether it is an
    /// answer or an apology.
    #[must_use]
    pub fn as_json(&self) -> serde_json::Value {
        serde_json::json!({
            "code": self.code.as_i32(),
            "error": { "hint": self.hint, "what": self.what, "why": self.why },
        })
    }
}

impl Display for Failure {
    fn fmt(&self, out: &mut Formatter<'_>) -> Fmt {
        write!(out, "helix: {}: {}", self.what, self.why)?;
        if let Some(hint) = &self.hint {
            write!(out, "\n  try: {hint}")?;
        }
        Ok(())
    }
}

impl std::error::Error for Failure {}

/// Every command returns this.
pub type Outcome<T> = Result<T, Failure>;
