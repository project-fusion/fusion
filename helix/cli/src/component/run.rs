//! Running the component rules and saying what they found.
//!
//! **`audit` reports and gates; `check` is its quiet form.** The same
//! measurement and the same exit code, differing only in volume, which is the
//! pair `theme` already established here and the reason this reads like it
//! belongs beside it rather than beneath it.
//!
//! **The measurement is `fusion-rules`'s and the printed form is this
//! crate's.** What a set of rules does when run, how `--json` is shaped and
//! what the screen looks like are the same for every command line, so they
//! live there; which rules run by default, how a tier that is missing is
//! refused, and what an audit prints on paper are Helix's, so they live here.

use std::io::IsTerminal;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use fusion_rules::{measure, only_known, payload, tui, verdict};

use crate::args::{ComponentAudit, Rules};
use crate::component::{all, Context, Report, Rule, Settings};

/// The word the printed forms open with.
const NOUN: &str = "component";

/* Every rule borrows the one context from its own thread, which is what this
holds `Context` to. */
const _: fn() = || {
    fn shared<T: Sync>() {}
    shared::<Context>();
};

/// Resolves the rules asked for, the workspace, and its settings.
fn prepare(args: &Rules, from: &Path) -> Result<(Vec<Rule>, Context), Failure> {
    let rules = all();
    only_known(NOUN, &rules, &args.only)?;

    let root: PathBuf = args.root.clone().unwrap_or_else(|| from.to_path_buf());
    let settings = Settings::read(&root)?;

    /* **Every tier missing is a configuration fault, not a clean run.** Rules
    would each read nothing and report nothing, and a command that says every
    rule is clean because it looked at no files is the exact shape this
    repository has a meta-rule about. One stale entry among several is
    tolerated: the rest still answer. */
    let missing = settings.missing(&root);
    if missing.len() == settings.tiers.len() {
        return Err(Failure::input(
            "none of the configured tiers exist",
            format!(
                "`{}` names {}, and none of them is a directory under {}",
                settings.source,
                missing
                    .iter()
                    .map(|one| format!("`{one}`"))
                    .collect::<Vec<String>>()
                    .join(", "),
                root.display()
            ),
        ));
    }

    let selected = rules
        .into_iter()
        .filter(|rule| {
            if args.only.is_empty() {
                /* A meta rule runs by default only where it was asked for. */
                !rule.meta() || settings.floors
            } else {
                args.only.iter().any(|one| one == rule.name)
            }
        })
        .collect();
    Ok((selected, Context::new(root, settings)))
}

/// Prints every rule and what it found, then the findings.
pub fn audit(
    args: &ComponentAudit,
    from: &Path,
    json: bool,
    paint: Paint,
) -> Result<Code, Failure> {
    let (selected, context) = prepare(&args.rules, from)?;
    let reports = measure(&selected, &context);

    if json {
        println!("{:#}", payload(&reports));
        return Ok(verdict(&reports));
    }

    /* **The tty decides, and `--plain` is the only override.** A screen written
    to a pipe is escape sequences in a log file, and `check` never draws at all:
    its whole shape is silence on success, which a screen cannot be. Both forms
    read the same measurement, so neither can disagree with the other. */
    if !args.plain && std::io::stdout().is_terminal() {
        let code = verdict(&reports);
        let drawn: Vec<(&Rule, &Report)> = reports
            .iter()
            .map(|(rule, report)| (*rule, report))
            .collect();
        if let Err(why) = tui::run("helix", &drawn) {
            return Err(Failure::new(
                Code::Internal,
                "cannot open the audit screen".to_owned(),
                format!("{why}. Run `helix component audit --plain` for the report."),
            ));
        }
        return Ok(code);
    }

    let width = reports
        .iter()
        .map(|(rule, _)| rule.name.len())
        .max()
        .unwrap_or(0)
        + 2;
    for (rule, report) in &reports {
        /* Padded before painting: a width applies to bytes, and an escape
        sequence is bytes that occupy no column. */
        println!(
            "{} {}{} {} checked",
            if report.ok() { " " } else { "x" },
            paint.bold(&format!("{:<width$}", rule.name)),
            report.checked,
            report.unit
        );
    }
    for (rule, report) in reports
        .iter()
        .filter(|(_, report)| !report.notes.is_empty())
    {
        println!();
        println!(
            "{} {}",
            paint.bold(rule.name),
            paint.dim(&format!("{} noted, not failing", report.notes.len()))
        );
        for note in &report.notes {
            println!("  {note}");
        }
    }
    println!();
    speak(&reports, paint);
    let code = verdict(&reports);
    if code == Code::Ok {
        println!(
            "{NOUN}: {} rule{}, every one clean",
            reports.len(),
            if reports.len() == 1 { "" } else { "s" }
        );
    }
    Ok(code)
}

/// The same measurement, silent unless something is wrong.
pub fn check(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let (selected, context) = prepare(args, from)?;
    let reports = measure(&selected, &context);
    if json {
        println!("{:#}", payload(&reports));
        return Ok(verdict(&reports));
    }
    speak(&reports, paint);
    Ok(verdict(&reports))
}

/// Runs the rules that can write, and says what they wrote.
pub fn fix(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let (selected, context) = prepare(args, from)?;
    fusion_rules::fix(&selected, &context, json, paint, NOUN)
}

/// Findings to stderr, so a caller piping stdout keeps a clean stream.
fn speak(reports: &[(&Rule, Report)], paint: Paint) {
    for (rule, report) in reports.iter().filter(|(_, report)| !report.ok()) {
        eprintln!("{} {}", paint.bold(rule.name), paint.dim(rule.summary));
        for finding in &report.findings {
            eprintln!("  {}", finding.file);
            eprintln!("    {}", finding.message);
            eprintln!("{}", paint.dim(&format!("    {}", finding.detail)));
        }
    }
}
