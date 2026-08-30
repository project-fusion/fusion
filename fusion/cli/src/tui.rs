//! `audit` as a screen, for the case where there is somebody there.
//!
//! **An audit is a list of rules and a list of findings, and the terminal is
//! where the second one is unreadable.** Printed, a run with forty findings
//! scrolls the counts off the top and puts the detail of the first rule where
//! nobody looks; the reader wanted one rule and got every line of every other.
//! A screen keeps the rules in view and shows one rule's findings at a time,
//! which is the whole argument for it existing.
//!
//! **The printed form is not replaced by it.** A screen written to a pipe is
//! escape sequences in a log file, so a tty decides and `--plain` overrides. The
//! two read the same `Vec<(Rule, Report)>`, which is what stops either becoming
//! the real one: nothing here measures anything, and a rule cannot tell whether
//! it is being drawn or printed.
//!
//! **A state is never carried by color alone.** The reader has themed their
//! terminal and one of those themes makes any given hue unreadable, so the mark
//! is a glyph in the row and the count is beside it; color reinforces and never
//! informs. There is no red-and-green pair, for the reason `style.rs` gives
//! about the readers who cannot tell them apart.

use std::io::{self, Stdout};

use ratatui::crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use ratatui::crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::crossterm::ExecutableCommand;
use ratatui::layout::{Constraint, Layout};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Row as TableRow, Table, TableState, Wrap};
use ratatui::{Frame, Terminal};

use crate::rules::{Report, Rule};

/// One rule as the screen holds it: what it is, and what it found.
pub struct Measured {
    pub checked: usize,
    pub findings: Vec<(String, String, String)>,
    pub name: String,
    pub notes: Vec<String>,
    pub summary: String,
    pub unit: String,
}

impl Measured {
    fn ok(&self) -> bool {
        self.findings.is_empty()
    }
}

/// Everything the screen is showing, which is all the state there is.
struct View {
    /// Whether the pane on the right is the one taking keys.
    inside: bool,
    /// Which finding is selected, within the selected rule.
    at: usize,
    rules: Vec<Measured>,
    selected: usize,
    /// Failing rules only, which is what a reader wants after the first look.
    failing: bool,
}

impl View {
    fn new(rules: Vec<Measured>) -> Self {
        Self {
            at: 0,
            failing: false,
            inside: false,
            rules,
            selected: 0,
        }
    }

    /// The rows as filtered, by index into `rules` so the detail pane can follow.
    fn shown(&self) -> Vec<usize> {
        (0..self.rules.len())
            .filter(|&at| !self.failing || !self.rules[at].ok())
            .collect()
    }

    fn current(&self) -> Option<&Measured> {
        self.shown().get(self.selected).map(|&at| &self.rules[at])
    }

    fn move_by(&mut self, delta: isize) {
        let len = if self.inside {
            self.current().map_or(0, |one| one.findings.len())
        } else {
            self.shown().len()
        };
        if len == 0 {
            return;
        }
        let slot = if self.inside { self.at } else { self.selected };
        let next = isize::try_from(slot).unwrap_or(0).saturating_add(delta);
        let bounded = next.clamp(0, isize::try_from(len - 1).unwrap_or(0));
        let bounded = usize::try_from(bounded).unwrap_or(0);
        if self.inside {
            self.at = bounded;
        } else {
            self.selected = bounded;
            /* A new rule starts at its first finding rather than wherever the
            last one was scrolled to, which would look like a scroll position
            the reader set. */
            self.at = 0;
        }
    }
}

/// Draws the audit and returns when the reader leaves.
pub fn run(reports: &[(&Rule, Report)]) -> io::Result<()> {
    let rules = reports
        .iter()
        .map(|(rule, report)| Measured {
            checked: report.checked,
            findings: report
                .findings
                .iter()
                .map(|one| {
                    (
                        one.file.clone(),
                        one.message.clone(),
                        one.detail.clone(),
                    )
                })
                .collect(),
            name: rule.name.to_owned(),
            notes: report.notes.clone(),
            summary: rule.summary.to_owned(),
            unit: report.unit.to_owned(),
        })
        .collect();

    let mut terminal = enter()?;
    let mut view = View::new(rules);
    let outcome = draw_loop(&mut terminal, &mut view);
    /* **Restored before the error is returned**, so a failure inside the loop
    does not leave the reader in a raw-mode alternate screen with no echo. That
    is the one thing a screen can do that is worse than not running. */
    leave(&mut terminal)?;
    outcome
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

fn draw_loop(
    terminal: &mut Terminal<ratatui::backend::CrosstermBackend<Stdout>>,
    view: &mut View,
) -> io::Result<()> {
    loop {
        terminal.draw(|frame| render(frame, view))?;
        let Event::Key(key) = event::read()? else {
            continue;
        };
        /* Press only. A terminal that reports releases would otherwise move the
        selection twice per keystroke, which is invisible on the platform where
        it does not and immediate on the one where it does. */
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
            KeyCode::Home => {
                if view.inside {
                    view.at = 0;
                } else {
                    view.selected = 0;
                }
            }
            KeyCode::End => view.move_by(isize::MAX),
            KeyCode::Char('l' | '\t') | KeyCode::Right | KeyCode::Enter => view.inside = true,
            KeyCode::Char('h') | KeyCode::Left => view.inside = false,
            KeyCode::Char('f') => {
                view.failing = !view.failing;
                view.selected = 0;
                view.at = 0;
            }
            _ => {}
        }
    }
}

fn render(frame: &mut Frame, view: &View) {
    let [head, body, foot] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Min(1),
        Constraint::Length(1),
    ])
    .areas(frame.area());

    let failed = view.rules.iter().filter(|one| !one.ok()).count();
    let findings: usize = view.rules.iter().map(|one| one.findings.len()).sum();
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled("fusion", Style::new().add_modifier(Modifier::BOLD)),
            Span::raw(format!(
                "  {} rules, {} clean, {failed} with {findings} finding{}",
                view.rules.len(),
                view.rules.len() - failed,
                if findings == 1 { "" } else { "s" }
            )),
            Span::raw(if view.failing { "   [failing only]" } else { "" }),
        ])),
        head,
    );

    let [left, right] =
        Layout::horizontal([Constraint::Percentage(38), Constraint::Min(20)]).areas(body);

    let shown = view.shown();
    let rows: Vec<TableRow> = shown
        .iter()
        .map(|&at| {
            let one = &view.rules[at];
            /* The glyph carries the state and the color repeats it, never the
            other way round. */
            TableRow::new(vec![
                if one.ok() { " " } else { "x" }.to_owned(),
                one.name.clone(),
                format!("{}", one.checked),
            ])
        })
        .collect();

    let mut state = TableState::default().with_selected(Some(view.selected));
    frame.render_stateful_widget(
        Table::new(
            rows,
            [
                Constraint::Length(1),
                Constraint::Min(10),
                Constraint::Length(7),
            ],
        )
        .block(
            Block::default()
                .borders(Borders::RIGHT)
                .title(if view.inside { " rules " } else { " rules ◂ " }),
        )
        .row_highlight_style(Style::new().add_modifier(Modifier::REVERSED)),
        left,
        &mut state,
    );

    frame.render_widget(detail(view), right);

    frame.render_widget(
        Paragraph::new(Line::from(Span::styled(
            "j/k move · l detail · h back · f failing only · q quit",
            Style::new().add_modifier(Modifier::DIM),
        ))),
        foot,
    );
}

/// The selected rule, spelled out.
fn detail(view: &View) -> Paragraph<'_> {
    let Some(rule) = view.current() else {
        return Paragraph::new("Nothing to show.").block(Block::default().title(" detail "));
    };

    let mut lines = vec![
        Line::from(Span::styled(
            rule.name.clone(),
            Style::new().add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            rule.summary.clone(),
            Style::new().add_modifier(Modifier::DIM),
        )),
        Line::raw(""),
        Line::from(format!("{} {} checked", rule.checked, rule.unit)),
    ];

    for note in &rule.notes {
        lines.push(Line::raw(format!("  {note}")));
    }
    if rule.findings.is_empty() {
        lines.push(Line::raw(""));
        lines.push(Line::from(Span::styled(
            "No findings.",
            Style::new().add_modifier(Modifier::DIM),
        )));
    }

    for (at, (file, message, detail)) in rule.findings.iter().enumerate() {
        lines.push(Line::raw(""));
        let mark = if view.inside && at == view.at { "▸ " } else { "  " };
        lines.push(Line::from(vec![
            Span::raw(mark),
            Span::styled(file.clone(), Style::new().add_modifier(Modifier::BOLD)),
        ]));
        lines.push(Line::raw(format!("    {message}")));
        if view.inside && at == view.at {
            lines.push(Line::from(Span::styled(
                format!("    {detail}"),
                Style::new().add_modifier(Modifier::DIM),
            )));
        }
    }

    Paragraph::new(lines)
        .block(Block::default().title(if view.inside { " detail ◂ " } else { " detail " }))
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(view.at.saturating_mul(3)).unwrap_or(0), 0))
}
