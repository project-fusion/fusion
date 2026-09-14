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
//!
//! **The shape is `helix`'s, because the two read it from one crate.** Exit
//! codes, the error format, color, the runner and the audit screen are
//! `fusion-rules`'s, which carries no product and is what lets both command
//! lines take it. Two command lines from one company that disagree about what
//! 3 means, or which stream an error lands on, are worse than either shape,
//! and `fusion helix ...` returning its child's code untouched is only honest
//! while the two tables are one table.

mod prose;
mod route;
mod rules;
mod spec;
mod workspace;

use std::io::IsTerminal;
use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use fusion_rules::{measure, only_known, payload, tui, verdict};

use crate::rules::{all, Context, Settings};

/// The word every printed failure opens with, and the corner of every screen.
const PRODUCT: &str = "fusion";

/* Every rule borrows the one context from its own thread, which is what this
holds `Context` to. */
const _: fn() = || {
    fn shared<T: Sync>() {}
    shared::<Context>();
};

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

    /* **Available on every verb, always**, which is the contract rather than a
    convenience: a command with a human form and no JSON form is one a script
    has to parse prose out of, and prose is the thing this reserves the right to
    improve. The reasoning stays here and out of the help text, which is a
    reader's and carries no markup. */
    /// Emit machine-readable JSON on stdout.
    ///
    /// Available on every verb. Rules, their counts and their findings, in a
    /// shape a script can read without parsing sentences.
    #[arg(long, global = true)]
    json: bool,

    /// Never color the output.
    ///
    /// Color is already off when stdout is not a terminal and when `NO_COLOR`
    /// is set. This is the third way, for a terminal that reports itself capable
    /// and is not.
    #[arg(long, global = true)]
    no_color: bool,
}

#[derive(Debug, Subcommand)]
enum Noun {
    /* **A route rather than a reimplementation**, which is what keeps the two
    from disagreeing: the line goes to `helix` untouched and its exit code comes
    back. A convenience over a CLI that works standalone, never a gate in front
    of one. */
    /// Run the Helix command line, which owns its own nouns.
    ///
    /// Everything after `helix` is passed to it as written, and its exit code
    /// is returned. Needs `helix` installed.
    #[command(disable_help_flag = true)]
    Helix {
        /// Everything after `helix`, handed over as written.
        #[arg(allow_hyphen_values = true, trailing_var_arg = true)]
        args: Vec<String>,
    },

    /* **A separate noun rather than more workspace rules**, because the subject
    is different and a consumer asking one question should not pay for the
    other: a workspace rule reads manifests and build output, and a prose rule
    reads what people wrote. */
    /// Hold the prose to what it describes.
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

    /// The word the reader typed, for a message that names it back.
    fn name(&self) -> &'static str {
        match self {
            Self::Helix { .. } => "helix",
            Self::Prose { .. } => "prose",
            Self::Spec { .. } => "spec",
            Self::Workspace { .. } => "workspace",
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

    /* **The tty already decides and this is the override.** A screen written to
    a pipe is escape sequences in a log file, so `audit` prints when stdout is
    not a terminal. */
    /// Print the audit rather than drawing it.
    ///
    /// `audit` already prints when its output is not a terminal. Use this at
    /// one, to copy the lines, to grep them, or because a screen is the wrong
    /// shape for what you are doing.
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

fn main() {
    let cli = Cli::parse();
    let paint = if cli.json {
        Paint::never()
    } else {
        Paint::decide(PRODUCT, cli.no_color)
    };

    std::process::exit(match run(&cli, paint) {
        Ok(code) => code,
        Err(failure) => report_failure(&failure, cli.json),
    });
}

/// **Errors go to stderr in both modes.** A reader piping `--json` into another
/// program gets a clean stream or nothing at all: an error object on stdout is a
/// document the consumer has to inspect to find out whether it is an answer, and
/// a half-written artifact followed by one is worse still.
fn report_failure(failure: &Failure, json: bool) -> i32 {
    if json {
        eprintln!("{}", failure.as_json());
    } else {
        eprintln!("{}", failure.render(PRODUCT));
    }
    failure.code.as_i32()
}

/* `Code::Usage` and `Code::Internal` are not returned by name below, and that
is not an oversight in either case. Clap owns usage: it prints its own message
and exits 2 before `main` sees an argument, which is the number this enum
records rather than one it chooses. Internal is what a failure to open the
screen or to write a fix carries, and what a panic reaches the runtime with.
Both are in the enum because the enum is the published set. */
const _: () = {
    assert!(Code::Usage as i32 == 2);
    assert!(Code::Internal as i32 == 4);
};

/// The whole command, as the exit code it ends with.
///
/// **A routed noun returns the child's own code**, whatever it was, which is
/// why this is an `i32` rather than a [`Code`]: `fusion helix theme check` is
/// `helix theme check`, and a caller reading its exit reads `helix`'s table.
/// The two tables are the same table, on purpose.
fn run(cli: &Cli, paint: Paint) -> Outcome<i32> {
    /* **Routed before anything else is read**, because a routed noun has no verb
    and no rule set: everything below belongs to the nouns this binary answers
    for itself, and asking a route for its rules is a question with no answer. */
    if let Noun::Helix { args } = &cli.noun {
        return route::to("helix", args);
    }

    let verb = cli.noun.verb();
    let common = verb.common();

    let rules = cli.noun.rules();
    only_known(cli.noun.name(), &rules, &common.only)?;

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let Some(root) = common.root.clone().or_else(|| workspace::find_root(&cwd)) else {
        return Err(Failure::input(
            format!("no workspace at {}", cwd.display()),
            "no `package.json` here or in any directory above it",
        )
        .hint(format!(
            "fusion {} check --root <workspace>",
            cli.noun.name()
        )));
    };

    let settings = Settings::read(&root)?;
    let context = Context::new(root, settings);
    let selected: Vec<rules::Rule> = rules
        .into_iter()
        .filter(|rule| common.only.is_empty() || common.only.iter().any(|one| one == rule.name))
        .collect();

    let code = match verb {
        Verb::Fix(_) => fusion_rules::fix(&selected, &context, cli.json, paint, PRODUCT)?,
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
            report(&selected, &context, &form, cli.noun.name(), paint)?
        }
        Verb::Check(_) => {
            let form = if cli.json {
                Form::Json
            } else {
                Form::Printed { loud: false }
            };
            report(&selected, &context, &form, cli.noun.name(), paint)?
        }
    };
    Ok(code.as_i32())
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

fn report(
    selected: &[rules::Rule],
    context: &Context,
    form: &Form,
    noun: &str,
    paint: Paint,
) -> Outcome<Code> {
    let reports = measure(selected, context);
    let failed: Vec<&(&rules::Rule, rules::Report)> =
        reports.iter().filter(|(_, report)| !report.ok()).collect();

    if matches!(form, Form::Json) {
        println!("{:#}", payload(&reports));
        return Ok(verdict(&reports));
    }

    /* Both forms read the same measurement, so nothing here can disagree with
    what the other would have shown. */
    if matches!(form, Form::Screen) {
        let code = verdict(&reports);
        let drawn: Vec<(&rules::Rule, &rules::Report)> = reports
            .iter()
            .map(|(rule, report)| (*rule, report))
            .collect();
        tui::run(PRODUCT, &drawn).map_err(|why| {
            Failure::new(
                Code::Internal,
                "cannot open the audit screen",
                format!("{why}. Run `fusion {noun} audit --plain` for the report."),
            )
        })?;
        return Ok(code);
    }

    if matches!(form, Form::Printed { loud: true }) {
        for (rule, report) in &reports {
            /* Padded before painting: a width applies to bytes, and an escape
            sequence is bytes that occupy no column. */
            let mark = if report.ok() {
                " ".to_owned()
            } else {
                paint.fail("x")
            };
            println!(
                "{mark} {}{} {} checked",
                paint.bold(&format!("{:<15}", rule.name)),
                report.checked,
                report.unit
            );
        }
        println!();
    }

    for (rule, report) in &failed {
        /* The summary once per rule, because a finding says what is wrong and
        the summary says what was wanted, and a reader needs both. */
        eprintln!("{} {}", paint.bold(rule.name), paint.dim(rule.summary));
        for finding in &report.findings {
            eprintln!(
                "{} {}  {}",
                paint.fail("x"),
                paint.bold(rule.name),
                finding.file
            );
            eprintln!("    {}", finding.message);
            eprintln!("{}", paint.dim(&format!("    {}", finding.detail)));
        }
    }

    if !failed.is_empty() {
        let total: usize = failed.iter().map(|(_, report)| report.findings.len()).sum();
        let plural = if total == 1 { "" } else { "s" };
        eprintln!(
            "\nfusion: {total} finding{plural} across {} rules",
            failed.len()
        );
        return Ok(Code::Failed);
    }

    if matches!(form, Form::Printed { loud: true }) {
        println!("fusion: {} rules, every one clean", reports.len());
    }
    Ok(Code::Ok)
}
