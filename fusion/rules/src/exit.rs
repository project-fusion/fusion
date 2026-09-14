//! Exit codes, which are the half of a CLI's interface that scripts read.
//!
//! **Stable and few.** A script branching on an exit code needs the set to be
//! small enough to enumerate and fixed enough to rely on, which is the opposite
//! of the temptation to give every error its own number. Four categories, and
//! the line between the first two is the one that matters: `Failed` means the
//! tool ran correctly and the answer was no, `Input` means it never got far
//! enough to have an answer. A CI job that treats those alike reports a missing
//! file as a contrast violation.
//!
//! Numbered from 2 upward because 1 is the conventional "it did not work" that a
//! shell already produces for an uncaught error, and because 0 and 1 are the two
//! a caller who reads nothing else will still get right.
//!
//! **One table for both command lines.** `fusion helix ...` hands its child's
//! code back untouched, which is only honest while the two agree about what 3
//! means, and the way they agree is by reading it here.

/// The complete set. Adding to it is a change to the interface.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Code {
    /// Everything asked for, and the answer was yes.
    Ok = 0,
    /// The tool ran and the answer was no: a theme with violations, an audit
    /// that found a failing pair. Nothing went wrong.
    Failed = 1,
    /// The command line does not parse: an unknown verb, a missing argument, a
    /// flag that takes a value and was given none.
    Usage = 2,
    /// The input is unusable: no config found, a file that is not JSON, an
    /// intent the engine refuses.
    Input = 3,
    /// The tool broke. A bug, and it says so.
    Internal = 4,
}

impl Code {
    /// `std::process::exit` takes an `i32`, and the cast is total: every variant
    /// is a small non-negative literal.
    #[must_use]
    pub fn as_i32(self) -> i32 {
        self as i32
    }
}
