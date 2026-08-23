//! Colour, and the rule a tool about contrast has to follow.
//!
//! **A tool about contrast cannot assume its own palette.** The reader has
//! themed their terminal, and one of them has a background this tool would call
//! a violation. So pass and fail are never carried by colour alone: the glyph
//! and the number say it, and the colour reinforces what a reader has already
//! been told.
//!
//! That is also why there is no red-green pair here. Red and green are the two
//! most commonly confused, and they are the two every other tool reaches for
//! first.

use std::io::IsTerminal;

/// Whether to colour, decided once.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Paint(bool);

impl Paint {
    /// **Three ways off and one way on**, which is the right asymmetry: a stray
    /// escape sequence in a log file is a real cost and a missing colour is not.
    ///
    /// `NO_COLOR` is honoured by its own rule, which is presence rather than
    /// value: the specification says any non-empty value, and tools that test it
    /// for "1" break for everybody who set it to "true".
    #[must_use]
    pub fn decide(asked_off: bool) -> Self {
        if asked_off {
            return Self(false);
        }
        if std::env::var_os("NO_COLOR").is_some_and(|value| !value.is_empty()) {
            return Self(false);
        }
        Self(std::io::stdout().is_terminal())
    }

    /// Off, for the JSON path and for tests.
    #[must_use]
    pub fn never() -> Self {
        Self(false)
    }

    fn wrap(self, code: &str, text: &str) -> String {
        if self.0 {
            format!("\u{1b}[{code}m{text}\u{1b}[0m")
        } else {
            text.to_owned()
        }
    }

    pub fn pass(self, text: &str) -> String {
        self.wrap("32", text)
    }

    /// Yellow rather than red, per the note above: the glyph carries the
    /// meaning, and yellow is legible on both a light and a dark terminal where
    /// a saturated red is not.
    pub fn fail(self, text: &str) -> String {
        self.wrap("33", text)
    }

    pub fn dim(self, text: &str) -> String {
        self.wrap("2", text)
    }

    pub fn bold(self, text: &str) -> String {
        self.wrap("1", text)
    }
}

/// The glyph that carries the state, colour or no colour.
///
/// ASCII, because a terminal that cannot render a box-drawing character renders
/// a replacement glyph that looks like a third state.
#[must_use]
pub fn glyph(outcome: helix_theme::derive::report::Outcome) -> &'static str {
    use helix_theme::derive::report::Outcome::{Fail, Pass, Unverifiable};
    match outcome {
        Fail => "x",
        Pass => "ok",
        /* **Its own glyph, not a blank.** An unmeasured pair is not a quiet pass,
        and a column of `ok` with gaps in it reads as one. */
        Unverifiable => "--",
    }
}
