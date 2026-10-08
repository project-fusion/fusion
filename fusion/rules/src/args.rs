//! Reading the command line, with `--json` honored before it parses.
//!
//! **A usage error is an error like any other.** Clap prints its own prose and
//! exits 2 before `main` sees an argument, so `helix --json bogus` answered a
//! script with a paragraph. Under `--json` the same failure is the object
//! every other error is, on stderr, with code 2 and the names that would have
//! parsed as `choices`. Help and `--version` are answers, so they print as
//! clap prints them in both modes.

use clap::error::{ContextKind, ContextValue, ErrorKind};
use clap::{Command, Parser};

use crate::error::Failure;
use crate::exit::Code;

/// Parses the command line, or exits 2 with the failure in the asked-for form.
#[must_use]
pub fn parse<T: Parser>(product: &str) -> T {
    let args: Vec<String> = std::env::args_os()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect();
    let json = args.iter().skip(1).any(|arg| arg == "--json");
    match T::try_parse_from(&args) {
        Ok(parsed) => parsed,
        Err(error)
            if !json
                || matches!(
                    error.kind(),
                    ErrorKind::DisplayHelp | ErrorKind::DisplayVersion
                ) =>
        {
            error.exit()
        }
        Err(error) => {
            let failure = usage(&T::command(), &args, &error, product);
            eprintln!("{}", failure.as_json());
            std::process::exit(Code::Usage.as_i32())
        }
    }
}

/// The clap error as a [`Failure`]: its first line, the hint clap suggested,
/// and the values or verbs the command line could have held.
fn usage(command: &Command, args: &[String], error: &clap::Error, product: &str) -> Failure {
    /* The command the line got as far as, so a missing verb lists that
    noun's verbs rather than the binary's nouns. */
    let mut reached = command;
    let mut path = vec![product.to_owned()];
    for arg in args.iter().skip(1) {
        if let Some(sub) = reached.find_subcommand(arg) {
            reached = sub;
            path.push(arg.clone());
        }
    }
    let verbs: Vec<String> = reached
        .get_subcommands()
        .map(|sub| sub.get_name().to_owned())
        .filter(|name| name != "help")
        .collect();

    let mut choices = Vec::new();
    let mut suggested = None;
    for (kind, value) in error.context() {
        match (kind, value) {
            (
                ContextKind::ValidValue | ContextKind::ValidSubcommand,
                ContextValue::Strings(all),
            ) => {
                choices = all.iter().filter(|name| *name != "help").cloned().collect();
            }
            (
                ContextKind::SuggestedSubcommand | ContextKind::SuggestedArg,
                ContextValue::String(one),
            ) => {
                suggested = Some(one.clone());
            }
            (
                ContextKind::SuggestedSubcommand | ContextKind::SuggestedArg,
                ContextValue::Strings(all),
            ) => {
                suggested = all.first().cloned();
            }
            _ => {}
        }
    }
    let missing_verb = matches!(
        error.kind(),
        ErrorKind::MissingSubcommand
            | ErrorKind::DisplayHelpOnMissingArgumentOrSubcommand
            | ErrorKind::InvalidSubcommand
    );
    if choices.is_empty() && missing_verb {
        choices = verbs;
    }

    let why = if error.kind() == ErrorKind::DisplayHelpOnMissingArgumentOrSubcommand {
        format!("`{}` needs a command", path.join(" "))
    } else {
        let rendered = error.to_string();
        let first = rendered.lines().next().unwrap_or_default();
        first.strip_prefix("error: ").unwrap_or(first).to_owned()
    };
    let hint = match suggested {
        Some(one) => format!("{} {one}", path.join(" ")),
        None => format!("{} --help", path.join(" ")),
    };
    Failure::new(Code::Usage, "the command line", why)
        .hint(hint)
        .choices(choices)
}
