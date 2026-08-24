//! `helix theme audit` and `helix theme check`: the report.
//!
//! One measurement, two presentations. `audit` prints the whole matrix and exits
//! 1 if anything failed; `check` prints nothing on success and the failures
//! otherwise. Sharing the body is what keeps them from disagreeing about what a
//! violation is, which is the failure mode of every pair of commands where one
//! is "the quiet version of" the other.

use std::path::Path;

use helix_theme::derive::report::Outcome as Pair;
use helix_theme::derive::theme::Theme;

use crate::args::Common;
use crate::error::Outcome;
use crate::exit::Code;
use crate::style::{glyph, Paint};
use crate::theme::load;

/// # Errors
///
/// [`Failure`](crate::error::Failure) when the intent cannot be loaded.
pub fn run(args: &Common, from: &Path, json: bool, paint: Paint, quiet: bool) -> Outcome<Code> {
    let (theme, source) = load(args.intent.as_deref(), args.config.as_deref(), from)?;
    let failed = theme
        .pairings
        .iter()
        .filter(|pairing| pairing.status == Pair::Fail)
        .count();
    let code = if failed == 0 { Code::Ok } else { Code::Failed };

    if json {
        println!("{}", report(&theme, &source));
        return Ok(code);
    }
    /* `check` on a clean theme says nothing at all, so a green pipeline stays
    quiet and the one that is not green is the only one with output in it. */
    if quiet && failed == 0 {
        return Ok(code);
    }
    if quiet {
        for line in &theme.violations {
            eprintln!("helix: {line}");
        }
        return Ok(code);
    }
    matrix(&theme, &source, paint);
    Ok(code)
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

/// The matrix, as a table a terminal renders better than a web page does.
///
/// **Widths are measured rather than guessed**, because a token name is as long
/// as it is and a column padded to a constant is either ragged or truncated.
fn matrix(theme: &Theme, source: &str, paint: Paint) {
    println!("{}", paint.bold(source));
    println!();

    let width = |pick: fn(&helix_theme::derive::report::Pairing) -> &String| {
        theme
            .pairings
            .iter()
            .map(|pairing| pick(pairing).chars().count())
            .max()
            .unwrap_or(0)
    };
    let ink = width(|pairing| &pairing.foreground);
    let ground = width(|pairing| &pairing.background);

    for pairing in &theme.pairings {
        let mark = glyph(pairing.status);
        let mark = match pairing.status {
            Pair::Fail => paint.fail(mark),
            Pair::Pass => paint.pass(mark),
            Pair::Unverifiable => paint.dim(mark),
        };
        /* **The measurement and the target on every row, passing or not.** A
        table that prints a number only where it failed makes the reader trust a
        blank, and a pair that cleared its target by a hundredth is the one worth
        seeing before somebody nudges a color. */
        let measured = pairing
            .ratio
            .map_or_else(|| "  -  ".to_owned(), |ratio| format!("{ratio:5.2}"));
        println!(
            "  {mark}  {:ink$}  on  {:ground$}  {measured} / {:.1}",
            pairing.foreground, pairing.background, pairing.target
        );
    }

    println!();
    let counted = |wanted: Pair| {
        theme
            .pairings
            .iter()
            .filter(|pairing| pairing.status == wanted)
            .count()
    };
    println!(
        "  {} passed, {} failed, {} unverifiable",
        counted(Pair::Pass),
        counted(Pair::Fail),
        counted(Pair::Unverifiable),
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
