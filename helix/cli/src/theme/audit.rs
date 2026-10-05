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
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;

use crate::args::{Audit, Common};
use crate::theme::report::{measured, rows, widths, Counts, Filter, Order};
use crate::theme::{load, scheme_name, tui, violations};

/// # Errors
///
/// [`Failure`] when the intent cannot be loaded, or when the terminal cannot be
/// put into raw mode. **A terminal failure is `Internal` rather than `Input`**:
/// it is not a statement about anything the reader wrote.
pub fn run(args: &Audit, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    let (themes, source) = load(
        args.common.intent.as_deref(),
        args.common.config.as_deref(),
        from,
    )?;
    let code = verdict(&themes);

    if json {
        println!("{}", report(&themes, &source));
        return Ok(code);
    }
    /* **The tty decides, and `--plain` is the only override.** A screen written
    to a pipe is escape sequences in a log file, and the check for that is the
    same one `style.rs` makes about color, asked here rather than inherited from
    it: color is off in a file for a reason that is about legibility, and a
    screen is off there for a reason that is about the file being unusable. */
    if args.plain || !std::io::stdout().is_terminal() {
        for (at, theme) in themes.iter().enumerate() {
            if at > 0 {
                println!();
            }
            matrix(theme, &title(&source, &themes, theme), paint);
        }
        return Ok(code);
    }
    tui::run(&themes, &source).map_err(|failure| {
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
    let (themes, source) = load(args.intent.as_deref(), args.config.as_deref(), from)?;
    let code = verdict(&themes);

    if json {
        println!("{}", report(&themes, &source));
        return Ok(code);
    }
    /* A clean theme says nothing at all, so a green pipeline stays quiet and the
    one that is not green is the only one with output in it. */
    for line in violations(&themes) {
        eprintln!("helix: {line}");
    }
    Ok(code)
}

/// One place decides whether a theme passed, in every mode it was derived in,
/// so three presentations cannot disagree about the exit code.
fn verdict(themes: &[Theme]) -> Code {
    let failed = themes
        .iter()
        .flat_map(|theme| &theme.pairings)
        .any(|pairing| pairing.status == Pair::Fail);
    if failed {
        Code::Failed
    } else {
        Code::Ok
    }
}

/// The heading a mode's table is printed under.
fn title(source: &str, themes: &[Theme], theme: &Theme) -> String {
    if themes.len() > 1 {
        format!("{source}, {}", scheme_name(theme.intent.scheme))
    } else {
        source.to_owned()
    }
}

fn report(themes: &[Theme], source: &str) -> serde_json::Value {
    let mut report = measurement(themes);
    report.insert("source".to_owned(), source.into());
    serde_json::Value::Object(report)
}

/// What was measured, in every mode, as `--json` and `helix_audit_theme` both
/// return it.
///
/// **Each pair carries its mode**, and a finding is named by its mode where
/// there are two. The pairs are one list, so filtering it for failures finds
/// every failure in both modes.
#[must_use]
pub fn measurement(themes: &[Theme]) -> serde_json::Map<String, serde_json::Value> {
    let named = |theme: &Theme, line: &String| {
        if themes.len() > 1 {
            format!("{}: {line}", scheme_name(theme.intent.scheme))
        } else {
            line.clone()
        }
    };
    let collisions: Vec<String> = themes
        .iter()
        .flat_map(|theme| theme.collisions.iter().map(move |line| named(theme, line)))
        .collect();
    let pairings: Vec<serde_json::Value> = themes
        .iter()
        .flat_map(|theme| {
            theme.pairings.iter().map(|pairing| {
                serde_json::json!({
                    "background": pairing.background,
                    "foreground": pairing.foreground,
                    "ratio": pairing.ratio,
                    "scheme": scheme_name(theme.intent.scheme),
                    "status": match pairing.status {
                        Pair::Fail => "fail",
                        Pair::Pass => "pass",
                        Pair::Unverifiable => "unverifiable",
                    },
                    "target": pairing.target,
                })
            })
        })
        .collect();
    let mut report = serde_json::Map::new();
    report.insert("collisions".to_owned(), collisions.into());
    report.insert("pairings".to_owned(), pairings.into());
    report.insert("violations".to_owned(), violations(themes).into());
    report
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
