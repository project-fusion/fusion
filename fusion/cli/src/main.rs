//! `fusion`, the command line for rules a workspace can be held to.
//!
//! **Noun then verb, both required**, so a bare `fusion` or a bare
//! `fusion workspace` prints help and exits 2 rather than guessing. That is the
//! grammar `helix` already sets, and two command lines from one company that
//! disagree about their own shape are worse than either shape.
//!
//! **`audit` reports and gates; `check` is its quiet form.** Same measurement,
//! same exit code, different volume: `audit` prints every rule and what it
//! found, `check` prints nothing on success so a green pipeline stays quiet.
//! `fix` is the same rule set again, running the ones that can write.
//!
//! **Selection is a flag, never a verb.** A verb per rule multiplies with every
//! rule added, and the set a caller wants is rarely the set anybody would have
//! named.

mod prose;
mod rules;
mod workspace;

use std::io::IsTerminal;
use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Args, Parser, Subcommand};

use crate::rules::{all, Context, Settings};

#[derive(Debug, Parser)]
#[command(
    name = "fusion",
    about = "Rules a workspace can be held to.",
    version,
    subcommand_required = true,
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    noun: Noun,

    /// Emit machine-readable JSON on stdout.
    ///
    /// **Available on every verb, always**, which is the contract rather than a
    /// convenience: a command with a human form and no JSON form is one a script
    /// has to parse prose out of, and prose is the thing this reserves the right
    /// to improve.
    #[arg(long, global = true)]
    json: bool,

    /// Never color the output.
    #[arg(long, global = true)]
    no_color: bool,
}

#[derive(Debug, Subcommand)]
enum Noun {
    /// Hold the prose to what it describes.
    ///
    /// **A separate noun rather than more workspace rules**, because the subject
    /// is different and a consumer asking one question should not pay for the
    /// other: a workspace rule reads manifests and build output, and a prose
    /// rule reads what people wrote. Nothing in either can answer the other's
    /// question.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Prose {
        #[command(subcommand)]
        verb: Verb,
    },
    /// Hold a workspace to what it says about itself.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Workspace {
        #[command(subcommand)]
        verb: Verb,
    },
}

impl Noun {
    fn verb(&self) -> &Verb {
        match self {
            Self::Prose { verb } | Self::Workspace { verb } => verb,
        }
    }

    /// The rules this noun holds, which is the whole of what makes it a noun.
    fn rules(&self) -> Vec<rules::Rule> {
        match self {
            Self::Prose { .. } => prose::all(),
            Self::Workspace { .. } => all(),
        }
    }
}

#[derive(Debug, Subcommand)]
enum Verb {
    /// Report every rule and what it found, and exit 1 on a finding.
    Audit(Common),
    /// The CI shape of `audit`: same measurement, nothing printed on success.
    Check(Common),
    /// Run the rules that can write.
    Fix(Common),
}

#[derive(Args, Debug)]
struct Common {
    /// Run just these rules.
    #[arg(long, value_delimiter = ',')]
    only: Vec<String>,

    /// The workspace to read. Defaults to the nearest one above the cwd.
    #[arg(long)]
    root: Option<PathBuf>,
}

impl Verb {
    fn common(&self) -> &Common {
        match self {
            Self::Audit(common) | Self::Check(common) | Self::Fix(common) => common,
        }
    }
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let verb = cli.noun.verb();
    let common = verb.common();

    let known: Vec<&str> = cli.noun.rules().iter().map(|rule| rule.name).collect();
    let unknown: Vec<&String> = common
        .only
        .iter()
        .filter(|name| !known.contains(&name.as_str()))
        .collect();
    if !unknown.is_empty() {
        eprintln!(
            "fusion: no such rule {}. Known rules: {}.",
            unknown
                .iter()
                .map(|one| format!("`{one}`"))
                .collect::<Vec<String>>()
                .join(", "),
            known.join(", ")
        );
        return ExitCode::from(2);
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let Some(root) = common.root.clone().or_else(|| workspace::find_root(&cwd)) else {
        eprintln!(
            "fusion: no `package.json` at or above this directory, so there is no workspace to \
             read."
        );
        return ExitCode::from(2);
    };

    let settings = Settings::read(&root);
    let context = Context { root, settings };
    let selected: Vec<rules::Rule> = cli
        .noun
        .rules()
        .into_iter()
        .filter(|rule| common.only.is_empty() || common.only.iter().any(|one| one == rule.name))
        .collect();

    let color =
        !cli.no_color && std::io::stdout().is_terminal() && std::env::var_os("NO_COLOR").is_none();

    match verb {
        Verb::Fix(_) => fix(&selected, &context, cli.json),
        Verb::Audit(_) => report(&selected, &context, cli.json, true, color),
        Verb::Check(_) => report(&selected, &context, cli.json, false, color),
    }
}

fn fix(selected: &[rules::Rule], context: &Context, json: bool) -> ExitCode {
    let mut wrote: Vec<(&str, String)> = Vec::new();
    let mut ran = 0;
    for rule in selected {
        let Some(apply) = rule.fix else {
            continue;
        };
        ran += 1;
        for file in apply(context) {
            wrote.push((rule.name, file));
        }
    }
    if json {
        let payload = serde_json::json!({
            "ran": ran,
            "wrote": wrote.iter().map(|(rule, file)| serde_json::json!({ "file": file, "rule": rule })).collect::<Vec<_>>(),
        });
        println!(
            "{}",
            serde_json::to_string_pretty(&payload).unwrap_or_default()
        );
    } else if wrote.is_empty() {
        let plural = if ran == 1 { "" } else { "s" };
        println!("fusion: {ran} rule{plural} can write, and nothing needed it");
    } else {
        for (rule, file) in &wrote {
            println!("  {rule}  {file}");
        }
        let plural = if wrote.len() == 1 { "" } else { "s" };
        println!("fusion: {} file{plural} written", wrote.len());
    }
    ExitCode::SUCCESS
}

fn report(
    selected: &[rules::Rule],
    context: &Context,
    json: bool,
    loud: bool,
    color: bool,
) -> ExitCode {
    let reports: Vec<(&rules::Rule, rules::Report)> = selected
        .iter()
        .map(|rule| (rule, (rule.run)(context)))
        .collect();
    let failed: Vec<&(&rules::Rule, rules::Report)> =
        reports.iter().filter(|(_, report)| !report.ok()).collect();

    if json {
        let payload = serde_json::json!({
            "ok": failed.is_empty(),
            "rules": reports.iter().map(|(rule, report)| serde_json::json!({
                "checked": report.checked,
                "findings": report.findings,
                "name": rule.name,
                "unit": report.unit,
            })).collect::<Vec<_>>(),
        });
        println!(
            "{}",
            serde_json::to_string_pretty(&payload).unwrap_or_default()
        );
        return if failed.is_empty() {
            ExitCode::SUCCESS
        } else {
            ExitCode::FAILURE
        };
    }

    let paint = |code: &str, text: &str| {
        if color {
            format!("\u{1b}[{code}m{text}\u{1b}[0m")
        } else {
            text.to_owned()
        }
    };

    if loud {
        for (rule, report) in &reports {
            let mark = if report.ok() { " " } else { &paint("31", "x") };
            println!(
                "{mark} {:<15}{} {} checked",
                paint("1", rule.name),
                report.checked,
                report.unit
            );
        }
        println!();
    }

    for (rule, report) in &failed {
        /* The summary once per rule, because a finding says what is wrong and
        the summary says what was wanted, and a reader needs both. */
        eprintln!("{} {}", paint("1", rule.name), paint("2", rule.summary));
        for finding in &report.findings {
            eprintln!(
                "{} {}  {}",
                paint("31", "x"),
                paint("1", rule.name),
                finding.file
            );
            eprintln!("    {}", finding.message);
            eprintln!("{}", paint("2", &format!("    {}", finding.detail)));
        }
    }

    if !failed.is_empty() {
        let total: usize = failed.iter().map(|(_, report)| report.findings.len()).sum();
        let plural = if total == 1 { "" } else { "s" };
        eprintln!(
            "\nfusion: {total} finding{plural} across {} rules",
            failed.len()
        );
        return ExitCode::FAILURE;
    }

    if loud {
        println!("fusion: {} rules, every one clean", reports.len());
    }
    ExitCode::SUCCESS
}
