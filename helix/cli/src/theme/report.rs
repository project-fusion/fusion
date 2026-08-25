//! The report as rows, which is what both presentations read.
//!
//! **The table and the TUI share this or one of them becomes the real one.**
//! They are two renderings of one audit, and the way that stays true is that
//! neither computes anything: the widths, the glyph, the margin and the order
//! are decided here, once, and a printer or a widget only draws what it is
//! handed. A TUI that sorted its own rows and a table that did not would be two
//! answers to "which pair is worst", and the terminal would be the one people
//! believed.
//!
//! It is also the half that can be tested without a terminal. A ratatui screen
//! needs a backend and a size before it renders a character; a row does not, so
//! every decision worth asserting lives on this side of the boundary.

use fusion_helix_theme::derive::report::{Outcome, Pairing};

use crate::style::glyph;

/// One measured pair, ready to draw.
#[derive(Clone, Debug, PartialEq)]
pub struct Row {
    /// The ground it was measured against.
    pub ground: String,

    /// The ink.
    pub ink: String,

    /// How far it cleared its target, or missed it, and `None` where there was
    /// nothing to measure.
    ///
    /// **This is what an audit is looking for and the raw ratio is not.** A pair
    /// at 4.6 against a target of 4.5 and one at 7.1 against 7 are equally close
    /// to failing, and sorting by ratio puts the first of those thirty rows
    /// away from the second.
    pub margin: Option<f64>,

    /// The glyph, which carries the state before any color does.
    pub mark: &'static str,

    /// The measured ratio, absent where the pair had no ground.
    pub measured: Option<f64>,

    pub status: Outcome,

    pub target: f64,
}

impl Row {
    fn of(pairing: &Pairing) -> Self {
        Self {
            ground: pairing.background.clone(),
            ink: pairing.foreground.clone(),
            margin: pairing.ratio.map(|ratio| ratio - pairing.target),
            mark: glyph(pairing.status),
            measured: pairing.ratio,
            status: pairing.status,
            target: pairing.target,
        }
    }
}

/// Which rows to show.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Filter {
    #[default]
    All,
    /// Failures alone, which is what a reader fixing something wants and is the
    /// one filter worth having: `unverifiable` is not a failure and hiding the
    /// passes hides the pair that cleared by a hundredth.
    Failing,
}

/// What order to show them in.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Order {
    /// As the engine emitted them, which is `defaultPairings`' own order and is
    /// the one a reader comparing two runs wants.
    #[default]
    Source,

    /// Closest to failing first.
    ///
    /// **Unverifiable rows go last rather than first or interleaved.** They have
    /// no margin, so any numeric answer for them is invented, and putting them at
    /// the top of a list titled "worst" would say they are the worst thing here
    /// when they are the thing that was not measured.
    Worst,
}

/// The rows, filtered and ordered.
///
/// A stable sort, so `Worst` is `Source` order within a tie rather than whatever
/// the comparison happened to do. Two pairs at the same margin are two pairs a
/// reader will look at together.
///
/// **Takes the pairings rather than the theme**, which is what makes this half
/// testable at all: a `Theme` carries a fully resolved intent and every emitted
/// token, so a test that wanted three rows would have to derive a palette to get
/// them. The row model never needed any of that.
#[must_use]
pub fn rows(pairings: &[Pairing], filter: Filter, order: Order) -> Vec<Row> {
    let mut rows: Vec<Row> = pairings
        .iter()
        .filter(|pairing| filter == Filter::All || pairing.status == Outcome::Fail)
        .map(Row::of)
        .collect();
    if order == Order::Worst {
        rows.sort_by(|left, right| match (left.margin, right.margin) {
            (Some(left), Some(right)) => left.total_cmp(&right),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        });
    }
    rows
}

/// How many of each, counted over the whole theme rather than over the rows.
///
/// **Over the theme, and that is the point of it being separate.** A filtered
/// view showing four failures still has to say four of seventy, or a reader who
/// pressed a key believes the sixty-six that vanished never existed.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Counts {
    pub failed: usize,
    pub passed: usize,
    pub unverifiable: usize,
}

impl Counts {
    #[must_use]
    pub fn of(pairings: &[Pairing]) -> Self {
        let count = |wanted: Outcome| {
            pairings
                .iter()
                .filter(|pairing| pairing.status == wanted)
                .count()
        };
        Self {
            failed: count(Outcome::Fail),
            passed: count(Outcome::Pass),
            unverifiable: count(Outcome::Unverifiable),
        }
    }

    #[must_use]
    pub fn total(self) -> usize {
        self.failed + self.passed + self.unverifiable
    }
}

/// The widest ink and ground in a set of rows, in characters.
///
/// **Measured rather than guessed**, because a token name is as long as it is and
/// a column padded to a constant is either ragged or truncated. Measured over the
/// *rows given* rather than over the theme, so a filtered table is as narrow as
/// what it is showing.
#[must_use]
pub fn widths(rows: &[Row]) -> (usize, usize) {
    let widest = |pick: fn(&Row) -> &String| {
        rows.iter()
            .map(|row| pick(row).chars().count())
            .max()
            .unwrap_or(0)
    };
    (widest(|row| &row.ink), widest(|row| &row.ground))
}

/// The measured ratio as a reader sees it, or a dash where there is none.
///
/// Here rather than in either presentation, so the table and the TUI cannot
/// disagree about how many places a ratio is shown to.
#[must_use]
pub fn measured(row: &Row) -> String {
    row.measured
        .map_or_else(|| "  -  ".to_owned(), |ratio| format!("{ratio:5.2}"))
}

#[cfg(test)]
mod tests {
    use super::{measured, rows, widths, Counts, Filter, Order, Row};
    use fusion_helix_theme::derive::report::{Outcome, Pairing};

    /// Four pairs, arranged so every decision in this module is observable in at
    /// least one of them: a failure, two passes at different margins, and an
    /// unverifiable with no ratio at all.
    fn pairings() -> Vec<Pairing> {
        let pair = |ink: &str, ground: &str, ratio: Option<f64>, target: f64, status| Pairing {
            background: ground.to_owned(),
            foreground: ink.to_owned(),
            ratio,
            status,
            target,
        };
        vec![
            pair("ink-wide", "on-a", Some(8.0), 4.5, Outcome::Pass),
            pair("ink", "on-a-long-ground", Some(4.51), 4.5, Outcome::Pass),
            pair("ink", "on-b", Some(3.0), 4.5, Outcome::Fail),
            pair("ink", "on-c", None, 4.5, Outcome::Unverifiable),
        ]
    }

    fn names(rows: &[Row]) -> Vec<String> {
        rows.iter()
            .map(|row| format!("{}/{}", row.ink, row.ground))
            .collect()
    }

    #[test]
    fn source_order_is_the_order_it_was_given() {
        let rows = rows(&pairings(), Filter::All, Order::Source);
        assert_eq!(
            names(&rows),
            [
                "ink-wide/on-a",
                "ink/on-a-long-ground",
                "ink/on-b",
                "ink/on-c"
            ]
        );
    }

    /// The margin is what an audit is looking for, so the pair that cleared by a
    /// hundredth sorts above the one that cleared by three and a half.
    #[test]
    fn worst_first_is_by_margin_and_not_by_ratio() {
        let rows = rows(&pairings(), Filter::All, Order::Worst);
        assert_eq!(names(&rows)[0], "ink/on-b");
        assert_eq!(names(&rows)[1], "ink/on-a-long-ground");
        assert_eq!(names(&rows)[2], "ink-wide/on-a");
    }

    /// **Unverifiable last rather than first.** It has no margin, so any number
    /// for it is invented, and a list titled "worst" that opened with the rows
    /// nobody measured would be saying the wrong thing.
    #[test]
    fn unverifiable_sorts_last_however_it_is_ordered() {
        for order in [Order::Source, Order::Worst] {
            let rows = rows(&pairings(), Filter::All, order);
            assert_eq!(
                rows.last().map(|row| row.status),
                Some(Outcome::Unverifiable)
            );
        }
    }

    #[test]
    fn failing_only_keeps_the_failures_and_nothing_else() {
        let rows = rows(&pairings(), Filter::Failing, Order::Source);
        assert_eq!(names(&rows), ["ink/on-b"]);
    }

    /// Counted over everything, not over what survived the filter, so a filtered
    /// view can still say four of seventy.
    #[test]
    fn counts_are_of_the_whole_report() {
        let counts = Counts::of(&pairings());
        assert_eq!(counts.passed, 2);
        assert_eq!(counts.failed, 1);
        assert_eq!(counts.unverifiable, 1);
        assert_eq!(counts.total(), 4);
    }

    /// Over the rows given rather than over the report, so a filtered table is as
    /// narrow as what it is showing.
    #[test]
    fn widths_measure_what_is_being_shown() {
        let all = widths(&rows(&pairings(), Filter::All, Order::Source));
        assert_eq!(all, ("ink-wide".len(), "on-a-long-ground".len()));

        let failing = widths(&rows(&pairings(), Filter::Failing, Order::Source));
        assert_eq!(failing, ("ink".len(), "on-b".len()));
    }

    /// A dash rather than a zero, and the same width as a number so the column
    /// stays straight.
    #[test]
    fn an_unmeasured_pair_reads_as_a_dash_of_the_same_width() {
        let rows = rows(&pairings(), Filter::All, Order::Source);
        let shown = measured(&rows[3]);
        assert!(!shown.contains('0'));
        assert_eq!(shown.chars().count(), measured(&rows[0]).chars().count());
    }

    /// The glyph is in the row before any color is, which is the palette rule
    /// made structural: a presentation cannot draw a state without it.
    #[test]
    fn every_row_carries_its_glyph() {
        for row in rows(&pairings(), Filter::All, Order::Source) {
            assert!(!row.mark.trim().is_empty());
        }
    }
}
