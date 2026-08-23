//! `helix theme build`: the artifact.

use std::path::Path;

use helix_theme::css::to_css;

use crate::args::Build;
use crate::error::{Failure, Outcome};
use crate::exit::Code;
use crate::theme::load;

/// # Errors
///
/// [`Failure`] when the intent cannot be loaded, when the theme has violations
/// and `--force` was not given, or when the output cannot be written.
pub fn run(args: &Build, from: &Path, json: bool) -> Outcome<Code> {
    let (theme, source) = load(
        args.common.intent.as_deref(),
        args.common.config.as_deref(),
        from,
    )?;

    /* **Refusing by default is the argument for deriving at all.** A palette that
    does not meet the contrast it claims is the failure this engine exists to
    prevent, and writing it with a warning above it produces a file that outlives
    the warning by years. */
    if !theme.violations.is_empty() && !args.force {
        /* **The count and the first line, not all of them.** Seven violations
        joined with semicolons is one unreadable paragraph, and the command that
        prints them properly is named right underneath. One example is what makes
        the count concrete without becoming the report. */
        let count = theme.violations.len();
        let plural = if count == 1 { "pair" } else { "pairs" };
        return Err(Failure::new(
            Code::Failed,
            format!("cannot build {source}"),
            format!(
                "{count} {plural} miss their contrast target, starting with {}",
                theme.violations.first().map_or("", String::as_str)
            ),
        )
        .hint("helix theme audit"));
    }

    /* **A forced build says what it forced.** Exit 0 is right, `--force` being a
    request rather than a mistake, but a file that does not meet the contrast it
    claims must not be produced in silence: the flag is typed once and the file
    is read for years. To stderr, so it never lands in the artifact. */
    if !theme.violations.is_empty() {
        eprintln!(
            "helix: forced past {} failing {}, starting with {}",
            theme.violations.len(),
            if theme.violations.len() == 1 {
                "pair"
            } else {
                "pairs"
            },
            theme.violations.first().map_or("", String::as_str)
        );
    }

    let css = to_css(&theme, &args.selector);
    let written = match &args.out {
        None => None,
        Some(path) => {
            std::fs::write(path, &css).map_err(|failure| {
                Failure::input(
                    format!("cannot write {}", path.display()),
                    failure.to_string(),
                )
            })?;
            Some(path.display().to_string())
        }
    };

    if json {
        /* The CSS is a field rather than the whole document, so a caller reading
        the JSON gets the violations beside it and does not have to run the
        command twice to learn whether `--force` was carrying anything. */
        println!(
            "{}",
            serde_json::json!({
                "css": css,
                "tokens": theme.tokens.len(),
                "violations": theme.violations,
                "written": written,
            })
        );
    } else if written.is_none() {
        print!("{css}");
    } else {
        /* **To stderr, because stdout is the artifact even when it went to a
        file.** A caller redirecting stdout and passing `--out` gets an empty
        redirect and a note on the terminal, rather than a note in the file they
        were building. */
        eprintln!(
            "helix: wrote {} tokens to {}",
            theme.tokens.len(),
            written.unwrap_or_default()
        );
    }
    Ok(Code::Ok)
}
