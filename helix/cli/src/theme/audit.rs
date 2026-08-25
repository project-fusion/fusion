//! `helix theme audit` and `helix theme check`: the report.
//!
//! One measurement, three presentations. `audit` opens a screen on a terminal
//! and prints the matrix anywhere else, exiting 1 if anything failed; `check`
//! prints nothing on success and the failures otherwise. Sharing the body is what
//! keeps them from disagreeing about what a violation is, which is the failure
//! mode of every pair of commands where one is "the quiet version of" the other.
//!
//! **The screen and the table share [`report`](super::report) rather than each
//! reading the theme.** Two renderings of one audit stay two renderings only
//! while neither of them decides anything: the glyph, the margin, the widths and
//! the order are computed once, on the other side of a boundary a terminal is not
//! required to cross, and that is also the half the tests can reach.

use std::io::IsTerminal;
use std::path::Path;

use fusion_helix_theme::derive::report::Outcome as Pair;
use fusion_helix_theme::derive::theme::Theme;

use crate::args::{Audit, Common};
use crate::error::{Failure, Outcome};
use crate::exit::Code;
use crate::style::Paint;
use crate::theme::load;
use crate::theme::report::{measured, rows, widths, Counts, Filter, Order};
use crate::theme::tui;

/// # Errors
///
/// [`Failure`] when the intent cannot be loaded, or when the terminal cannot be
/// put into raw mode. **A terminal failure is `Internal` rather than `Input`**:
/// it is not a statement about anything the reader wrote.
pub fn run(args: &Audit, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    let (theme, source) = load(
        args.common.intent.as_deref(),
        args.common.config.as_deref(),
        from,
    )?;
    let code = verdict(&theme);

    if json {
        println!("{}", report(&theme, &source));
        return Ok(code);
    }
    /* **The tty decides, and `--plain` is the only override.** A screen written
    to a pipe is escape sequences in a log file, and the check for that is the
    same one `style.rs` makes about color, asked here rather than inherited from
    it: color is off in a file for a reason that is about legibility, and a
    screen is off there for a reason that is about the file being unusable. */
    if args.plain || !std::io::stdout().is_terminal() {
        matrix(&theme, &source, paint);
        return Ok(code);
    }
    tui::run(&theme, &source).map_err(|failure| {
        Failure::new(
            Code::Internal,
            "cannot open the audit screen".to_owned(),
            format!("{failure}. Run `helix theme audit --plain` for the table."),
        )
    })?;
    Ok(code)
}

/// `check`, which is `audit` with nothing to look at.
///
/// A separate entry point rather than a boolean on the one above, because they
/// diverged the moment `audit` gained a screen: every branch of `run` asks what
/// the terminal is, and none of that is a question `check` has any business
/// asking. The measurement is the shared part and it is the part that is shared.
///
/// # Errors
///
/// [`Failure`] when the intent cannot be loaded.
pub fn check(args: &Common, from: &Path, json: bool) -> Outcome<Code> {
    let (theme, source) = load(args.intent.as_deref(), args.config.as_deref(), from)?;
    let code = verdict(&theme);

    if json {
        println!("{}", report(&theme, &source));
        return Ok(code);
    }
    /* A clean theme says nothing at all, so a green pipeline stays quiet and the
    one that is not green is the only one with output in it. */
    for line in &theme.violations {
        eprintln!("helix: {line}");
    }
    Ok(code)
}

/// One place decides whether a theme passed, so three presentations cannot
/// disagree about the exit code.
fn verdict(theme: &Theme) -> Code {
    let failed = theme
        .pairings
        .iter()
        .any(|pairing| pairing.status == Pair::Fail);
    if failed {
        Code::Failed
    } else {
        Code::Ok
    }
}

fn report(theme: &Theme, source: &str) -> serde_json::Value {
    serde_json::json!({
        "collisions": theme.collisions,
        "pairings": theme.pairings.iter().map(|pairing| serde_json::json!({
            "background": pairing.background,
            "foreground": pairing.foreground,
            "ratio": pairing.ratio,
            "status": match pairing.status {
                Pair::Fail => "fail",
                Pair::Pass => "pass",
                Pair::Unverifiable => "unverifiable",
            },
            "target": pairing.target,
        })).collect::<Vec<_>>(),
        "source": source,
        "violations": theme.violations,
    })
}

/// The matrix, as a table.
///
/// Source order and every row, because a table is what a reader diffs and a
/// pipeline stores: filtering and sorting are things you do to a screen you are
/// looking at, and a file whose contents depend on a flag is a file two runs
/// cannot be compared across.
fn matrix(theme: &Theme, source: &str, paint: Paint) {
    println!("{}", paint.bold(source));
    println!();

    let rows = rows(&theme.pairings, Filter::All, Order::Source);
    let (ink, ground) = widths(&rows);

    for row in &rows {
        let mark = match row.status {
            Pair::Fail => paint.fail(row.mark),
            Pair::Pass => paint.pass(row.mark),
            Pair::Unverifiable => paint.dim(row.mark),
        };
        /* **The measurement and the target on every row, passing or not.** A
        table that prints a number only where it failed makes the reader trust a
        blank, and a pair that cleared its target by a hundredth is the one worth
        seeing before somebody nudges a color. */
        println!(
            "  {mark}  {:ink$}  on  {:ground$}  {} / {:.1}",
            row.ink,
            row.ground,
            measured(row),
            row.target
        );
    }

    println!();
    let counts = Counts::of(&theme.pairings);
    println!(
        "  {} passed, {} failed, {} unverifiable",
        counts.passed, counts.failed, counts.unverifiable
    );

    /* **Collisions are a second finding and are printed as one.** Contrast is a
    token against a ground; a collision is two roles against each other, and a
    palette can be perfectly legible with three statuses that look like one
    color. Folding them into the same count would hide that. */
    if !theme.collisions.is_empty() {
        println!();
        for line in &theme.collisions {
            println!("  {} {line}", paint.fail("!"));
        }
    }
}
