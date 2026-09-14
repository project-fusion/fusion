//! Running the component rules and saying what they found.
//!
//! **`audit` reports and gates; `check` is its quiet form.** The same
//! measurement and the same exit code, differing only in volume, which is the
//! pair `theme` already established here and the reason this reads like it
//! belongs beside it rather than beneath it.

use std::io::IsTerminal;
use std::path::{Path, PathBuf};
use std::thread::{self, ScopedJoinHandle};

use crate::args::{ComponentAudit, Rules};
use crate::component::{all, tui, Context, Measured, Report, Rule, Runner, Settings};
use crate::error::Failure;
use crate::exit::Code;
use crate::style::Paint;

/* Every rule borrows the one context from its own thread, which is what this
holds `Context` to. */
const _: fn() = || {
    fn shared<T: Sync>() {}
    shared::<Context>();
};

/// Resolves the rules asked for, the workspace, and its settings.
fn prepare(args: &Rules, from: &Path) -> Result<(Vec<Rule>, Context), Failure> {
    let known: Vec<&str> = all().iter().map(|rule| rule.name).collect();
    let unknown: Vec<&String> = args
        .only
        .iter()
        .filter(|name| !known.contains(&name.as_str()))
        .collect();
    if let Some(first) = unknown.first() {
        return Err(Failure::input(
            format!("no component rule called `{first}`"),
            format!("the rules are {}", known.join(", ")),
        ));
    }

    let root: PathBuf = args.root.clone().unwrap_or_else(|| from.to_path_buf());
    let settings = Settings::read(&root)
        .map_err(|why| Failure::input("component rules need to know where the source is", why))?;

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

    let selected = all()
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

/// Runs the source rules once, then the meta rules over what they counted.
///
/// **One thread per source rule, joined in declaration order.** A rule is a
/// `fn(&Context) -> Report` that reads files and returns, and none of them
/// shares anything but the context, so they were serial only because nothing
/// had made them otherwise. The reports come back in the order the rules were
/// declared whatever order the threads finish in, and every form below reads
/// the finished list, so nothing draws or prints while a rule is still running.
fn measure(selected: Vec<Rule>, context: &Context) -> Vec<(Rule, Report)> {
    let (meta, source): (Vec<Rule>, Vec<Rule>) = selected.into_iter().partition(Rule::meta);

    let mut reports: Vec<(Rule, Report)> = thread::scope(|scope| {
        let running: Vec<(Rule, ScopedJoinHandle<Report>)> = source
            .into_iter()
            .map(|rule| {
                let run = match rule.run {
                    Runner::Source(run) => run,
                    Runner::Meta(_) => unreachable!("partitioned above"),
                };
                (rule, scope.spawn(move || run(context)))
            })
            .collect();
        running
            .into_iter()
            .map(|(rule, handle)| {
                /* A rule that panicked has printed why on its own thread; the
                panic continues here so the process still ends the way it did
                when the rule ran on this one. */
                let report = handle
                    .join()
                    .unwrap_or_else(|panic| std::panic::resume_unwind(panic));
                (rule, report)
            })
            .collect()
    });

    let measured: Vec<Measured> = reports
        .iter()
        .map(|(rule, report)| Measured {
            checked: report.checked,
            name: rule.name,
            unit: report.unit,
        })
        .collect();
    for rule in meta {
        let report = match rule.run {
            Runner::Meta(run) => run(&measured),
            Runner::Source(_) => unreachable!("partitioned above"),
        };
        reports.push((rule, report));
    }

    reports.sort_by_key(|(rule, _)| rule.name);
    reports
}

/// Every rule and what it found, as JSON for a caller that parses it.
fn payload(reports: &[(Rule, Report)]) -> serde_json::Value {
    serde_json::json!({
        "ok": reports.iter().all(|(_, report)| report.ok()),
        "rules": reports.iter().map(|(rule, report)| serde_json::json!({
            "checked": report.checked,
            "findings": report.findings,
            "notes": report.notes,
            "name": rule.name,
            "unit": report.unit,
        })).collect::<Vec<_>>(),
    })
}

/// Prints every rule and what it found, then the findings.
pub fn audit(
    args: &ComponentAudit,
    from: &Path,
    json: bool,
    paint: Paint,
) -> Result<Code, Failure> {
    let (selected, context) = prepare(&args.rules, from)?;
    let reports = measure(selected, &context);

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
            .map(|(rule, report)| (rule, report))
            .collect();
        if let Err(why) = tui::run(&drawn) {
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
            "component: {} rule{}, every one clean",
            reports.len(),
            if reports.len() == 1 { "" } else { "s" }
        );
    }
    Ok(code)
}

/// The same measurement, silent unless something is wrong.
pub fn check(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let (selected, context) = prepare(args, from)?;
    let reports = measure(selected, &context);
    if json {
        println!("{:#}", payload(&reports));
        return Ok(verdict(&reports));
    }
    speak(&reports, paint);
    Ok(verdict(&reports))
}

/// Runs the rules that can write, and says what they wrote.
///
/// **The same selection as `check`, filtered to what has a `fix`.** A rule with
/// none is not an error to have asked for: `--only` names a subject, and the
/// answer to "fix the tokens rule" is that there is nothing mechanical to apply.
pub fn fix(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let (selected, context) = prepare(args, from)?;
    let mut wrote: Vec<(&str, String)> = Vec::new();
    let mut ran = 0;
    for rule in &selected {
        let Some(apply) = rule.fix else {
            continue;
        };
        ran += 1;
        for file in apply(&context) {
            wrote.push((rule.name, file));
        }
    }

    if json {
        println!(
            "{:#}",
            serde_json::json!({
                "ran": ran,
                "wrote": wrote.iter().map(|(rule, file)| serde_json::json!({
                    "file": file,
                    "rule": rule,
                })).collect::<Vec<_>>(),
            })
        );
        return Ok(Code::Ok);
    }
    if wrote.is_empty() {
        let plural = if ran == 1 { "" } else { "s" };
        println!("component: {ran} rule{plural} can write, and nothing needed it");
    } else {
        for (rule, file) in &wrote {
            println!("  {}  {file}", paint.bold(rule));
        }
        let plural = if wrote.len() == 1 { "" } else { "s" };
        println!("component: {} file{plural} written", wrote.len());
    }
    Ok(Code::Ok)
}

fn verdict(reports: &[(Rule, Report)]) -> Code {
    if reports.iter().all(|(_, report)| report.ok()) {
        Code::Ok
    } else {
        Code::Failed
    }
}

/// Findings to stderr, so a caller piping stdout keeps a clean stream.
fn speak(reports: &[(Rule, Report)], paint: Paint) {
    for (rule, report) in reports.iter().filter(|(_, report)| !report.ok()) {
        eprintln!("{} {}", paint.bold(rule.name), paint.dim(rule.summary));
        for finding in &report.findings {
            eprintln!("  {}", finding.file);
            eprintln!("    {}", finding.message);
            eprintln!("{}", paint.dim(&format!("    {}", finding.detail)));
        }
    }
}
