//! Standard output, for a reader that may stop reading.
//!
//! **A closed pipe ends the output and leaves the verdict alone.** `println!`
//! panics when the reader has gone, so `helix --json theme check | head` used
//! to print a Rust panic where the JSON stopped. The reader that closed the
//! pipe has everything it asked for, so the rest of the output is dropped, and
//! the command still runs to its end and exits with its own code: under
//! `pipefail`, a failing check piped into `head` is still a failing check.
//!
//! Any other write failure is a broken tool and panics as `println!` did.

use std::fmt::Arguments;
use std::io::{ErrorKind, Write};
use std::sync::atomic::{AtomicBool, Ordering};

/// Set once a write finds the pipe closed. Nothing is written after it.
static CLOSED: AtomicBool = AtomicBool::new(false);

/// Writes to stdout and flushes, unless the reader has gone.
///
/// # Panics
///
/// On a write failure other than a closed pipe, as `print!` does.
pub fn write(text: Arguments<'_>) {
    if CLOSED.load(Ordering::Relaxed) {
        return;
    }
    let mut stdout = std::io::stdout().lock();
    if let Err(failure) = stdout.write_fmt(text).and_then(|()| stdout.flush()) {
        if failure.kind() == ErrorKind::BrokenPipe {
            CLOSED.store(true, Ordering::Relaxed);
            return;
        }
        panic!("failed printing to stdout: {failure}");
    }
}

/// `println!`, ending quietly on a closed pipe.
#[macro_export]
macro_rules! say {
    () => {
        $crate::out::write(format_args!("\n"))
    };
    ($($arg:tt)*) => {
        $crate::out::write(format_args!("{}\n", format_args!($($arg)*)))
    };
}

/// `print!`, ending quietly on a closed pipe.
#[macro_export]
macro_rules! put {
    ($($arg:tt)*) => {
        $crate::out::write(format_args!($($arg)*))
    };
}
