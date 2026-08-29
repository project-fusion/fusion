//! Running the component rules and saying what they found.
//!
//! **`audit` reports and gates; `check` is its quiet form.** The same
//! measurement and the same exit code, differing only in volume, which is the
//! pair `theme` already established here and the reason this reads like it
//! belongs beside it rather than beneath it.

use std::path::{Path, PathBuf};

use crate::args::Rules;
use crate::component::{all, Context, Report, Rule, Settings};
use crate::error::Failure;
use crate::exit::Code;
use crate::style::Paint;

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

    let selected = all()
        .into_iter()
        .filter(|rule| args.only.is_empty() || args.only.iter().any(|one| one == rule.name))
        .collect();
    Ok((selected, Context { root, settings }))
}

/// Prints every rule and what it found, then the findings.
pub fn audit(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let (selected, context) = prepare(args, from)?;
    let reports: Vec<(Rule, Report)> = selected
        .into_iter()
        .map(|rule| {
            let report = (rule.run)(&context);
            (rule, report)
        })
        .collect();

    if json {
        let payload = serde_json::json!({
            "ok": reports.iter().all(|(_, report)| report.ok()),
            "rules": reports.iter().map(|(rule, report)| serde_json::json!({
                "checked": report.checked,
                "findings": report.findings,
                "name": rule.name,
                "unit": report.unit,
            })).collect::<Vec<_>>(),
        });
        println!("{payload:#}");
        return Ok(verdict(&reports));
    }

    for (rule, report) in &reports {
        println!(
            "{} {:<18}{} {} checked",
            if report.ok() { " " } else { "x" },
            paint.bold(rule.name),
            report.checked,
            report.unit
        );
    }
    println!();
    speak(&reports, paint);
    let code = verdict(&reports);
    if code == Code::Ok {
        println!("component: {} rules, every one clean", reports.len());
    }
    Ok(code)
}

/// The same measurement, silent unless something is wrong.
pub fn check(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let (selected, context) = prepare(args, from)?;
    let reports: Vec<(Rule, Report)> = selected
        .into_iter()
        .map(|rule| {
            let report = (rule.run)(&context);
            (rule, report)
        })
        .collect();
    if json {
        let payload = serde_json::json!({
            "ok": reports.iter().all(|(_, report)| report.ok()),
            "rules": reports.iter().map(|(rule, report)| serde_json::json!({
                "checked": report.checked,
                "findings": report.findings,
                "name": rule.name,
                "unit": report.unit,
            })).collect::<Vec<_>>(),
        });
        println!("{payload:#}");
        return Ok(verdict(&reports));
    }
    speak(&reports, paint);
    Ok(verdict(&reports))
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
