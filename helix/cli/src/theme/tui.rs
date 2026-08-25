//! `helix theme audit` as a screen, for the case where there is somebody there.
//!
//! **A contrast matrix is a grid of numbers with three states, which is a thing a
//! terminal renders better than a web page does.** That is the whole argument for
//! this existing, and it comes with its own scope: a terminal can show a swatch
//! and cannot show a component, so this owns the numbers and the theme builder on
//! the site owns the look. Nothing here draws a color square.
//!
//! **The table is not replaced by it.** `style.rs` already decides whether there
//! is a tty, and without one the table is what prints, so CI and a pipe are
//! unaffected and `--plain` forces the table on a terminal. Both read
//! [`report`](super::report), which is what stops either becoming the real one.
//!
//! **The palette rule applies harder here than anywhere.** A reader has themed
//! their terminal and one of them has a background this tool would call a
//! violation, so a state is never carried by color: the glyph is in the row, the
//! number is beside it, and color is reinforcement. There is no red and green
//! pair, for the reason `style.rs` gives.

use std::io::{self, Stdout};

use ratatui::crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use ratatui::crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::crossterm::ExecutableCommand;
use ratatui::layout::{Constraint, Layout};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Row as TableRow, Table, TableState};
use ratatui::{Frame, Terminal};

use fusion_helix_theme::derive::report::Outcome;
use fusion_helix_theme::derive::theme::Theme;

use super::report::{measured, rows, Counts, Filter, Order, Row};

/// What the screen is showing, which is all the state there is.
struct View {
    counts: Counts,
    filter: Filter,
    order: Order,
    /// The rows as currently filtered and ordered, rebuilt whenever either
    /// changes rather than re-derived on every frame: a draw runs on every
    /// keypress and a sort does not have to.
    rows: Vec<Row>,
    selected: usize,
    source: String,
}

impl View {
    fn new(theme: &Theme, source: String) -> Self {
        Self {
            counts: Counts::of(&theme.pairings),
            filter: Filter::default(),
            order: Order::default(),
            rows: rows(&theme.pairings, Filter::default(), Order::default()),
            selected: 0,
            source,
        }
    }

    /// Rebuild after a filter or an order change, keeping the selection in range.
    ///
    /// **Clamped rather than reset.** Filtering to failures from row sixty leaves
    /// a selection past the end, and a reader who presses a key to narrow a list
    /// has not asked to be sent back to the top.
    fn refresh(&mut self, theme: &Theme) {
        self.rows = rows(&theme.pairings, self.filter, self.order);
        self.selected = self.selected.min(self.rows.len().saturating_sub(1));
    }

    fn move_by(&mut self, delta: isize) {
        if self.rows.is_empty() {
            return;
        }
        let last = self.rows.len() - 1;
        self.selected = match delta {
            /* Saturating rather than wrapping. A list that jumps from the last
            row to the first loses a reader who was holding a key down. */
            delta if delta < 0 => self.selected.saturating_sub(delta.unsigned_abs()),
            delta => (self.selected + delta.unsigned_abs()).min(last),
        };
    }
}

/// Runs the screen until the reader leaves it.
///
/// # Errors
///
/// Any terminal failure, which the caller reports as an internal fault: a
/// terminal that cannot be put into raw mode is not something the reader wrote.
pub fn run(theme: &Theme, source: &str) -> io::Result<()> {
    let mut terminal = enter()?;
    let mut view = View::new(theme, source.to_owned());
    let outcome = draw_loop(&mut terminal, &mut view, theme);
    /* **Restored before the error is returned**, so a failure inside the loop
    does not leave the reader in a raw-mode alternate screen with no echo. That
    is the one thing a TUI can do that is worse than not running. */
    leave(&mut terminal)?;
    outcome
}

fn draw_loop(
    terminal: &mut Terminal<ratatui::backend::CrosstermBackend<Stdout>>,
    view: &mut View,
    theme: &Theme,
) -> io::Result<()> {
    loop {
        terminal.draw(|frame| render(frame, view))?;
        let Event::Key(key) = event::read()? else {
            continue;
        };
        /* Press only. A terminal that reports releases would otherwise move the
        selection twice per keystroke, which is invisible on the platform where it
        does not and immediate on the one where it does. */
        if key.kind != KeyEventKind::Press {
            continue;
        }
        match key.code {
            KeyCode::Char('c' | 'd') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                return Ok(())
            }
            KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
            KeyCode::Char('j') | KeyCode::Down => view.move_by(1),
            KeyCode::Char('k') | KeyCode::Up => view.move_by(-1),
            KeyCode::PageDown => view.move_by(10),
            KeyCode::PageUp => view.move_by(-10),
            KeyCode::Home => view.selected = 0,
            KeyCode::End => view.move_by(isize::MAX),
            KeyCode::Char('f') => {
                view.filter = match view.filter {
                    Filter::All => Filter::Failing,
                    Filter::Failing => Filter::All,
                };
                view.refresh(theme);
            }
            KeyCode::Char('s') => {
                view.order = match view.order {
                    Order::Source => Order::Worst,
                    Order::Worst => Order::Source,
                };
                view.refresh(theme);
            }
            _ => {}
        }
    }
}

fn enter() -> io::Result<Terminal<ratatui::backend::CrosstermBackend<Stdout>>> {
    enable_raw_mode()?;
    let mut out = io::stdout();
    out.execute(EnterAlternateScreen)?;
    Terminal::new(ratatui::backend::CrosstermBackend::new(out))
}

fn leave(terminal: &mut Terminal<ratatui::backend::CrosstermBackend<Stdout>>) -> io::Result<()> {
    disable_raw_mode()?;
    terminal.backend_mut().execute(LeaveAlternateScreen)?;
    terminal.show_cursor()
}

fn render(frame: &mut Frame, view: &View) {
    let [head, body, foot] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Min(1),
        Constraint::Length(2),
    ])
    .areas(frame.area());

    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled(&view.source, Style::new().add_modifier(Modifier::BOLD)),
            Span::raw("  "),
            Span::raw(describe(view)),
        ])),
        head,
    );

    let mut state = TableState::default().with_selected(Some(view.selected));
    frame.render_stateful_widget(matrix(view), body, &mut state);

    frame.render_widget(Paragraph::new(footer(view)), foot);
}

/// What the view is showing, said in words rather than by a highlighted key.
///
/// A reader who pressed `f` and sees four rows needs to be told the other
/// sixty-six are filtered, not gone.
fn describe(view: &View) -> String {
    let filter = match view.filter {
        Filter::All => "all",
        Filter::Failing => "failing only",
    };
    let order = match view.order {
        Order::Source => "in order",
        Order::Worst => "worst first",
    };
    format!(
        "{} of {} shown, {filter}, {order}",
        view.rows.len(),
        view.counts.total()
    )
}

fn matrix(view: &View) -> Table<'_> {
    let rows = view.rows.iter().map(|row| {
        /* The glyph first and in every row, which is the palette rule: a reader
        who cannot tell the reinforcing colors apart has already been told the
        state by the two characters at the start of the line. */
        TableRow::new(vec![
            row.mark.to_owned(),
            row.ink.clone(),
            row.ground.clone(),
            measured(row),
            format!("{:.1}", row.target),
            row.margin
                .map_or_else(|| "  -  ".to_owned(), |margin| format!("{margin:+5.2}")),
        ])
        .style(reinforce(row.status))
    });

    Table::new(
        rows,
        [
            Constraint::Length(2),
            Constraint::Fill(2),
            Constraint::Fill(2),
            Constraint::Length(5),
            Constraint::Length(5),
            Constraint::Length(5),
        ],
    )
    .header(
        TableRow::new(vec!["", "ink", "on ground", "  is", "wants", "   by"])
            .style(Style::new().add_modifier(Modifier::DIM)),
    )
    .block(Block::default().borders(Borders::TOP))
    /* **Reversed rather than colored.** The selection is the one thing that must
    read on every terminal theme, and inverting the cell is the only treatment
    that cannot collide with the reader's own background. */
    .row_highlight_style(Style::new().add_modifier(Modifier::REVERSED))
}

/// Color as reinforcement, never as the message.
///
/// Yellow for a failure rather than red, and no green anywhere: the same pair
/// `style.rs` refuses, refused here for the same reason.
fn reinforce(status: Outcome) -> Style {
    match status {
        Outcome::Fail => Style::new().fg(ratatui::style::Color::Yellow),
        Outcome::Pass => Style::new(),
        Outcome::Unverifiable => Style::new().add_modifier(Modifier::DIM),
    }
}

fn footer(view: &View) -> Vec<Line<'_>> {
    let counts = view.counts;
    let mut lines = vec![Line::from(format!(
        "  {} passed, {} failed, {} unverifiable",
        counts.passed, counts.failed, counts.unverifiable
    ))];
    lines.push(Line::styled(
        "  j/k move   f failing only   s worst first   q quit",
        Style::new().add_modifier(Modifier::DIM),
    ));
    lines
}

#[cfg(test)]
mod tests {
    use super::{render, View};
    use crate::theme::report::{Counts, Filter, Order};
    use fusion_helix_theme::derive::report::{Outcome, Pairing};
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    fn pairings() -> Vec<Pairing> {
        let pair = |ink: &str, ground: &str, ratio: Option<f64>, status| Pairing {
            background: ground.to_owned(),
            foreground: ink.to_owned(),
            ratio,
            status,
            target: 4.5,
        };
        vec![
            pair("ink-a", "ground-a", Some(8.0), Outcome::Pass),
            pair("ink-b", "ground-b", Some(3.0), Outcome::Fail),
            pair("ink-c", "ground-c", None, Outcome::Unverifiable),
        ]
    }

    /// A view over those pairings, built the way `run` builds one.
    fn view() -> View {
        let pairings = pairings();
        View {
            counts: Counts::of(&pairings),
            filter: Filter::default(),
            order: Order::default(),
            rows: crate::theme::report::rows(&pairings, Filter::default(), Order::default()),
            selected: 0,
            source: "helix.theme.json".to_owned(),
        }
    }

    /// **Rendered rather than inspected.** A screen is the one part of this that
    /// cannot be tested by reading a struct, and `TestBackend` is what makes it
    /// testable without a terminal: it is a buffer of cells, so what a reader
    /// would see is a string this can assert on.
    fn drawn(view: &View, width: u16, height: u16) -> String {
        let mut terminal = Terminal::new(TestBackend::new(width, height)).expect("a test backend");
        terminal
            .draw(|frame| render(frame, view))
            .expect("a frame to draw");
        terminal
            .backend()
            .buffer()
            .content()
            .chunks(width as usize)
            .map(|line| {
                line.iter()
                    .map(ratatui::buffer::Cell::symbol)
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn the_screen_names_its_source_and_says_what_it_is_showing() {
        let screen = drawn(&view(), 80, 12);
        assert!(screen.contains("helix.theme.json"));
        assert!(screen.contains("3 of 3 shown"));
        assert!(screen.contains("all"));
        assert!(screen.contains("in order"));
    }

    /// The counts are the whole report's, so the footer of a filtered screen
    /// still tells a reader what they narrowed away from.
    #[test]
    fn the_footer_counts_the_report_and_not_the_view() {
        let mut view = view();
        view.filter = Filter::Failing;
        view.rows = crate::theme::report::rows(&pairings(), Filter::Failing, Order::Source);

        let screen = drawn(&view, 80, 12);
        assert!(screen.contains("1 of 3 shown"), "{screen}");
        assert!(screen.contains("failing only"));
        assert!(
            screen.contains("1 passed, 1 failed, 1 unverifiable"),
            "{screen}"
        );
    }

    /// **The palette rule, asserted.** Every visible row carries its glyph, so a
    /// reader who cannot tell the reinforcing colors apart has still been told the
    /// state. This is the one assertion here that is about the rule rather than
    /// about the layout.
    #[test]
    fn every_row_shows_its_glyph_and_not_only_a_color() {
        let screen = drawn(&view(), 80, 12);
        assert!(screen.contains("ok"), "{screen}");
        assert!(screen.contains(" x"), "{screen}");
        assert!(screen.contains("--"), "{screen}");
    }

    /// The keys are on the screen rather than in the manual, because a reader who
    /// opened this by running `audit` was not sent here by documentation.
    #[test]
    fn the_keys_are_on_the_screen() {
        let screen = drawn(&view(), 80, 12);
        for hint in ["j/k", "f ", "s ", "q quit"] {
            assert!(screen.contains(hint), "missing {hint} in\n{screen}");
        }
    }

    /// **A screen too short to hold a row still draws**, which is the case a
    /// layout with three fixed bands and one `Min(1)` is written for: a reader
    /// with a two-line terminal gets something rather than a panic.
    #[test]
    fn a_tiny_terminal_does_not_panic() {
        drawn(&view(), 20, 4);
        drawn(&view(), 8, 3);
    }

    /// Clamped rather than reset, so narrowing a list from row three does not
    /// send a reader back to the top, and never past the end.
    #[test]
    fn the_selection_stays_in_range_when_the_view_narrows() {
        let mut view = view();
        view.selected = 2;
        view.rows = crate::theme::report::rows(&pairings(), Filter::Failing, Order::Source);
        view.filter = Filter::Failing;
        view.selected = view.selected.min(view.rows.len().saturating_sub(1));
        assert_eq!(view.selected, 0);
        drawn(&view, 80, 12);
    }

    /// Saturating rather than wrapping, at both ends.
    #[test]
    fn moving_stops_at_the_ends() {
        let mut view = view();
        view.move_by(-1);
        assert_eq!(view.selected, 0);
        view.move_by(isize::MAX);
        assert_eq!(view.selected, 2);
        view.move_by(1);
        assert_eq!(view.selected, 2);
    }

    /// An empty view is reachable: a clean theme filtered to failures has no rows,
    /// and moving inside it must not index one.
    #[test]
    fn an_empty_view_is_drawable_and_unmovable() {
        let mut view = view();
        view.rows.clear();
        view.move_by(1);
        view.move_by(-1);
        assert_eq!(view.selected, 0);
        assert!(drawn(&view, 80, 12).contains("0 of 3 shown"));
    }
}
