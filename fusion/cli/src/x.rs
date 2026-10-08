//! `fusion x`: the checks this repository holds itself to.
//!
//! **Compiled only with the `internal` feature**, which every build in this
//! repository has and the published binary does not. `workspace`, `prose` and
//! `spec` hold Fusion's own sources to Fusion's conventions, and nobody who
//! installs Fusion runs them.
//!
//! **Noun then verb, both required**, so a bare `fusion x` or a bare
//! `fusion x workspace` prints help and exits 2 rather than guessing. That is
//! the grammar `helix` already sets.
//!
//! **`audit` reports and gates; `check` is its quiet form.** Same measurement,
//! same exit code, different volume: `audit` prints every rule and what it
//! found, `check` prints nothing on success so a green pipeline stays quiet.
//! `fix` is the same rule set again, running the ones that can write.
//!
//! **Selection is a flag, never a verb.** A verb per rule multiplies with every
//! rule added, and the set a caller wants is rarely the set anybody would have
//! named.

use std::io::IsTerminal;
use std::path::PathBuf;
use std::sync::Arc;

use clap::{Args, Subcommand};
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use fusion_rules::{measure, only_known, payload, tui, verdict};

use crate::rules::{all, Context, Settings};
use crate::{plugins, prose, rules, spec, workspace, PRODUCT};

/* Every rule borrows the one context from its own thread, which is what this
holds `Context` to. */
const _: fn() = || {
    fn shared<T: Sync>() {}
    shared::<Context>();
};

/// The nouns this repository holds itself to, under `fusion x`.
#[derive(Debug, Subcommand)]
pub enum Internal {
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

impl Internal {
    /// The verb asked of the noun.
    fn verb(&self) -> &Verb {
        match self {
            Self::Prose { verb } | Self::Spec { verb } | Self::Workspace { verb } => verb,
        }
    }

    /// The rules this noun holds, which is the whole of what makes it a noun.
    fn rules(&self) -> Vec<rules::Rule> {
        match self {
            Self::Prose { .. } => prose::all(),
            Self::Spec { .. } => spec::all(),
            Self::Workspace { .. } => all(),
        }
    }

    /// The word the reader typed, for a message that names it back.
    fn name(&self) -> &'static str {
        match self {
            Self::Prose { .. } => "prose",
            Self::Spec { .. } => "spec",
            Self::Workspace { .. } => "workspace",
        }
    }
}

#[derive(Debug, Subcommand)]
pub enum Verb {
    /// Report every rule and what it found, and exit 1 on a finding.
    Audit(Common),
    /// The CI shape of `audit`: same measurement, nothing printed on success.
    Check(Common),
    /// Run the rules that can write.
    Fix(Common),
}

#[derive(Args, Debug)]
pub struct Common {
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

/// One of this repository's nouns, as the exit code it ends with.
pub fn run(noun: &Internal, json: bool, paint: Paint) -> Outcome<i32> {
    let verb = noun.verb();
    let common = verb.common();

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let Some(root) = common.root.clone().or_else(|| workspace::find_root(&cwd)) else {
        return Err(Failure::input(
            format!("no workspace at {}", cwd.display()),
            "no `package.json` here or in any directory above it",
        )
        .hint(format!("fusion x {} check --root <workspace>", noun.name())));
    };

    /* **The plugins are read before `--only` is judged**, because a rule a
    plugin provides is a rule this noun has: naming one and being told there is
    no such rule would be true of the binary and false of the run. A noun with no
    parts to compose takes none, which is `workspace` until somebody asks. */
    let mut rules = noun.rules();
    let noun = noun.name();
    let mut register = Vec::new();
    let mut listed = serde_json::Value::Array(Vec::new());
    if !plugins::parts(noun).is_empty() {
        let host = Arc::new(plugins::read(&root, noun)?);
        let loaded = host.loaded();
        let (provided, elsewhere) = plugins::rules(&host, noun)?;
        register = plugins::register(&loaded, &elsewhere);
        listed = plugins::listed(&loaded);
        rules.extend(provided);
    }
    only_known(noun, &rules, &common.only)?;

    let settings = Settings::read(&root)?;
    let context = Context::new(root, settings);
    let selected: Vec<rules::Rule> = rules
        .into_iter()
        .filter(|rule| common.only.is_empty() || common.only.iter().any(|one| one == rule.name))
        .collect();

    /* **Every module, on every run and every verb.** Discovery by directory is
    a rule being a file rather than a file and an entry in a manifest, and a line
    per module is what stops one arriving without anybody noticing. */
    if !json {
        for line in &register {
            fusion_rules::say!("{line}");
        }
    }

    let code = match verb {
        Verb::Fix(_) => fusion_rules::fix(&selected, &context, json, paint, PRODUCT)?,
        /* **The tty decides here, where the verb is known**, rather than inside
        the renderer: a screen written to a pipe is escape sequences in a log
        file, and `check` never draws whatever the terminal is. */
        Verb::Audit(_) => {
            let form = if json {
                Form::Json
            } else if common.plain || !std::io::stdout().is_terminal() {
                Form::Printed { loud: true }
            } else {
                Form::Screen
            };
            report(&selected, &context, &form, noun, paint, &listed)?
        }
        Verb::Check(_) => {
            let form = if json {
                Form::Json
            } else {
                Form::Printed { loud: false }
            };
            report(&selected, &context, &form, noun, paint, &listed)?
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
    listed: &serde_json::Value,
) -> Outcome<Code> {
    let reports = measure(selected, context);
    let failed: Vec<&(&rules::Rule, rules::Report)> =
        reports.iter().filter(|(_, report)| !report.ok()).collect();

    if matches!(form, Form::Json) {
        let mut said = payload(&reports);
        if let Some(fields) = said.as_object_mut() {
            fields.insert("plugins".to_owned(), listed.clone());
        }
        fusion_rules::say!("{said:#}");
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
                format!("{why}. Run `fusion x {noun} audit --plain` for the report."),
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
            fusion_rules::say!(
                "{mark} {}{} {} checked",
                paint.bold(&format!("{:<15}", rule.name)),
                report.checked,
                report.unit
            );
        }
        /* Notes after the table, as `helix component` prints them: work rather
        than fault, so they are not a mark in the margin, and not only in
        `--json`, or a note is registered where nobody running the audit reads. */
        for (rule, report) in reports
            .iter()
            .filter(|(_, report)| !report.notes.is_empty())
        {
            fusion_rules::say!();
            fusion_rules::say!(
                "{} {}",
                paint.bold(rule.name),
                paint.dim(&format!("{} noted, not failing", report.notes.len()))
            );
            for note in &report.notes {
                fusion_rules::say!("  {note}");
            }
        }
        fusion_rules::say!();
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
        fusion_rules::say!("fusion: {} rules, every one clean", reports.len());
    }
    Ok(Code::Ok)
}
