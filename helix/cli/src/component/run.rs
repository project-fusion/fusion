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
use std::sync::Arc;

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use fusion_rules::{measure, only_known, payload, tui, verdict};

use crate::args::{ComponentAudit, Rules};
use crate::component::{all, plugins, Context, Report, Rule, Settings};

/// The word the printed forms open with.
const NOUN: &str = "component";

/* Every rule borrows the one context from its own thread, which is what this
holds `Context` to. */
const _: fn() = || {
    fn shared<T: Sync>() {}
    shared::<Context>();
};

/// What a run is made of: the rules asked for, the workspace, and the register.
struct Prepared {
    context: Context,
    /// What the plugin host loaded, printed by every form before it measures.
    register: Vec<String>,
    /// The same, for the form that is read rather than watched.
    listed: serde_json::Value,
    selected: Vec<Rule>,
}

/// Resolves the rules asked for, the workspace, and its settings.
///
/// **The plugins are read before `--only` is judged**, because a rule a plugin
/// provides is a rule this command line has: naming one and being told there is
/// no such rule would be true of the binary and false of the run.
fn prepare(args: &Rules, from: &Path) -> Result<Prepared, Failure> {
    let root: PathBuf = args.root.clone().unwrap_or_else(|| from.to_path_buf());
    /* **A typo beats a missing configuration, and only when both are true.**
    Reading the settings has to come first, because what rules a run has depends
    on the plugins they point at. But a workspace with no configuration has no
    plugin directory either, so the rules it could have are the ones compiled in:
    a name none of them has is a typo, which is the more useful of the two things
    to be told and is what `fusion workspace` says in the same position. */
    let settings = match Settings::read(&root) {
        Ok(settings) => settings,
        Err(unconfigured) => {
            only_known(NOUN, &all(), &args.only)?;
            return Err(unconfigured);
        }
    };

    let host = Arc::new(plugins::read(
        &root,
        settings.plugins.as_deref().unwrap_or(plugins::DIRECTORY),
    )?);
    let loaded = host.loaded();
    let register = plugins::register(&loaded);
    let listed = plugins::listed(&loaded);

    let mut rules = all();
    rules.extend(plugins::rules(&host));
    only_known(NOUN, &rules, &args.only)?;

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
    Ok(Prepared {
        context: Context::new(root, settings),
        register,
        listed,
        selected,
    })
}

/// Prints every rule and what it found, then the findings.
pub fn audit(
    args: &ComponentAudit,
    from: &Path,
    json: bool,
    paint: Paint,
) -> Result<Code, Failure> {
    let Prepared {
        context,
        register,
        listed,
        selected,
    } = prepare(&args.rules, from)?;
    let reports = measure(&selected, &context);

    if json {
        println!("{:#}", said(&reports, listed));
        return Ok(verdict(&reports));
    }
    told(&register);

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
    let Prepared {
        context,
        register,
        listed,
        selected,
    } = prepare(args, from)?;
    let reports = measure(&selected, &context);
    if json {
        println!("{:#}", said(&reports, listed));
        return Ok(verdict(&reports));
    }
    /* **Even here, where silence is the shape of success.** What `check` is
    quiet about is a workspace with nothing wrong in it; a module somebody
    dropped into a directory is not that, and a plugin arriving without anybody
    noticing is the failure discovery by directory risks. */
    told(&register);
    speak(&reports, paint);
    Ok(verdict(&reports))
}

/// Runs the rules that can write, and says what they wrote.
pub fn fix(args: &Rules, from: &Path, json: bool, paint: Paint) -> Result<Code, Failure> {
    let Prepared {
        context,
        register,
        selected,
        ..
    } = prepare(args, from)?;
    /* **Most of all here**, because this is the verb where a plugin writes. A
    module that rewrote a file in a run that never said which modules it loaded
    is the worst version of what discovery by directory risks. */
    if !json {
        told(&register);
    }
    fusion_rules::fix(&selected, &context, json, paint, NOUN)
}

/// The register, one line per module, before anything is measured.
fn told(register: &[String]) {
    for line in register {
        println!("{line}");
    }
}

/// The measurement as JSON, with the register beside it.
fn said(reports: &[(&Rule, Report)], listed: serde_json::Value) -> serde_json::Value {
    let mut payload = payload(reports);
    if let Some(fields) = payload.as_object_mut() {
        fields.insert("plugins".to_owned(), listed);
    }
    payload
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
