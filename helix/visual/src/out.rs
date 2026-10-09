//! Where a line goes: stdout for a reader, and stderr when `--json` has
//! claimed stdout for the run's one document.
//!
//! **One switch, set once per command.** Every verb prints progress and a
//! verdict as sentences, and under `--json` a script reads stdout as JSON, so a
//! sentence there would make the stream unparseable. The sentences still help
//! the person watching the job, so they move to stderr rather than vanish.

use std::sync::atomic::{AtomicBool, Ordering};

static JSON: AtomicBool = AtomicBool::new(false);

/// Claims stdout for one JSON document, or gives it back to sentences.
pub fn claim(json: bool) {
    JSON.store(json, Ordering::Relaxed);
}

/// Whether stdout holds the run's JSON.
pub fn json() -> bool {
    JSON.load(Ordering::Relaxed)
}

/// A sentence for the reader: stdout, or stderr under `--json`.
macro_rules! say {
    ($($arg:tt)*) => {
        if $crate::out::json() {
            eprintln!($($arg)*);
        } else {
            println!($($arg)*);
        }
    };
}
pub(crate) use say;
