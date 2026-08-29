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
mod route;
mod tui;
mod rules;
mod spec;
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
    /// Run the Helix command line, which owns its own nouns.
    ///
    /// **A route rather than a reimplementation.** The rest of the line goes to
    /// `helix` untouched and its exit code comes back, so `fusion helix
    /// component audit` and `helix component audit` cannot disagree. It is a
    /// convenience over a CLI that works standalone, never a gate in front of
    /// one.
    #[command(disable_help_flag = true)]
    Helix {
        /// Everything after `helix`, handed over as written.
        #[arg(allow_hyphen_values = true, trailing_var_arg = true)]
        args: Vec<String>,
    },

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
    /// Hold the specs to being specs, rather than to what they test.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Spec {
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
    /// The verb asked of a noun this binary answers for itself.
    ///
    /// **A routed noun never reaches here.** `main` hands its line to the other
    /// product before reading a verb, because the verbs are that product's and
    /// this one has no business naming them.
    fn verb(&self) -> &Verb {
        match self {
            Self::Prose { verb } | Self::Spec { verb } | Self::Workspace { verb } => verb,
            Self::Helix { .. } => unreachable!("routed before a verb is read"),
        }
    }

    /// The rules this noun holds, which is the whole of what makes it a noun.
    fn rules(&self) -> Vec<rules::Rule> {
        match self {
            Self::Prose { .. } => prose::all(),
            Self::Spec { .. } => spec::all(),
            Self::Workspace { .. } => all(),
            Self::Helix { .. } => unreachable!("routed before a rule set is asked for"),
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

    /// Print the audit rather than drawing it.
    ///
    /// **The tty already decides and this is the override.** A screen written to
    /// a pipe is escape sequences in a log file, so `audit` prints when stdout
    /// is not a terminal; this is for the reader who is at one and wants the
    /// lines anyway — to copy them, to grep them, or because a screen is the
    /// wrong shape for what they are doing.
    #[arg(long)]
    plain: bool,

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

    /* **Routed before anything else is read**, because a routed noun has no verb
    and no rule set: everything below belongs to the nouns this binary answers
    for itself, and asking a route for its rules is a question with no answer. */
    if let Noun::Helix { args } = &cli.noun {
        return match route::to("helix", args) {
            Ok(code) => ExitCode::from(u8::try_from(code).unwrap_or(70)),
            Err(why) => {
                eprintln!("fusion: {why}");
                ExitCode::from(69)
            }
        };
    }

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
        /* **The tty decides here, where the verb is known**, rather than inside
        the renderer: a screen written to a pipe is escape sequences in a log
        file, and `check` never draws whatever the terminal is. */
        Verb::Audit(_) => {
            let form = if cli.json {
                Form::Json
            } else if common.plain || !std::io::stdout().is_terminal() {
                Form::Printed { loud: true }
            } else {
                Form::Screen
            };
            report(&selected, &context, &form, color)
        }
        Verb::Check(_) => {
            let form = if cli.json {
                Form::Json
            } else {
                Form::Printed { loud: false }
            };
            report(&selected, &context, &form, color)
        }
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

/// Runs the source rules once, then the meta rules over what they counted.
///
/// **Once, which is the point of the split.** The meta rule wants the numbers,
/// not the workspace, and a version of it that re-ran its siblings to find them
/// cost the whole set a second time on every audit.
fn measure<'a>(
    selected: &'a [rules::Rule],
    context: &Context,
) -> Vec<(&'a rules::Rule, rules::Report)> {
    let (meta, source): (Vec<&rules::Rule>, Vec<&rules::Rule>) =
        selected.iter().partition(|rule| rule.meta());

    let mut reports: Vec<(&rules::Rule, rules::Report)> = source
        .into_iter()
        .map(|rule| {
            let report = match rule.run {
                rules::Runner::Source(run) => run(context),
                rules::Runner::Meta(_) => unreachable!("partitioned above"),
            };
            (rule, report)
        })
        .collect();

    let measured: Vec<rules::Measured> = reports
        .iter()
        .map(|(rule, report)| rules::Measured {
            checked: report.checked,
            name: rule.name,
            unit: report.unit,
        })
        .collect();
    for rule in meta {
        let report = match rule.run {
            rules::Runner::Meta(run) => run(&measured),
            rules::Runner::Source(_) => unreachable!("partitioned above"),
        };
        reports.push((rule, report));
    }

    reports.sort_by_key(|(rule, _)| rule.name);
    reports
}

/// How a measurement comes out, which is one choice rather than four flags.
///
/// **Named rather than four bools**, because they were never independent: JSON
/// outranks the rest, a screen is only ever an `audit` on a terminal, and
/// `check`'s whole shape is silence on success, which a screen cannot be. As
/// bools that is four values with three illegal combinations; as this it is
/// three, and the call site says which one it means.
enum Form {
    /// Machine-readable on stdout. The contract, on every verb, always.
    Json,
    /// Every rule and its findings, printed. `loud` prints the clean ones too.
    Printed { loud: bool },
    /// Drawn, for a reader at a terminal who asked for an audit.
    Screen,
}

fn report(selected: &[rules::Rule], context: &Context, form: &Form, color: bool) -> ExitCode {
    let reports = measure(selected, context);
    let failed: Vec<&(&rules::Rule, rules::Report)> =
        reports.iter().filter(|(_, report)| !report.ok()).collect();

    if matches!(form, Form::Json) {
        let payload = serde_json::json!({
            "ok": failed.is_empty(),
            "rules": reports.iter().map(|(rule, report)| serde_json::json!({
                "checked": report.checked,
                "findings": report.findings,
                "name": rule.name,
                "notes": report.notes,
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

    /* Both forms read the same measurement, so nothing here can disagree with
    what the other would have shown. */
    if matches!(form, Form::Screen) {
        let code = if failed.is_empty() {
            ExitCode::SUCCESS
        } else {
            ExitCode::FAILURE
        };
        let drawn: Vec<(&rules::Rule, rules::Report)> = reports;
        if let Err(why) = tui::run(&drawn) {
            eprintln!(
                "fusion: cannot open the audit screen: {why}.\n  \
                 Run the same command with `--plain` for the printed form."
            );
            return ExitCode::from(70);
        }
        return code;
    }

    let paint = |code: &str, text: &str| {
        if color {
            format!("\u{1b}[{code}m{text}\u{1b}[0m")
        } else {
            text.to_owned()
        }
    };

    if matches!(form, Form::Printed { loud: true }) {
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

    if matches!(form, Form::Printed { loud: true }) {
        println!("fusion: {} rules, every one clean", reports.len());
    }
    ExitCode::SUCCESS
}
