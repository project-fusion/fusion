//! `helix theme build`: the artifact.

use std::path::Path;

use fusion_helix_theme::css::{to_css, to_css_modes};
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;

use crate::args::Build;
use crate::theme::{load, violations};

/// # Errors
///
/// [`Failure`] when the intent cannot be loaded, when the theme has violations
/// and `--force` was not given, or when the output cannot be written.
pub fn run(args: &Build, from: &Path, json: bool) -> Outcome<Code> {
    let (themes, source) = load(
        args.common.intent.as_deref(),
        args.common.config.as_deref(),
        from,
    )?;
    let violations = violations(&themes);

    /* **Refusing by default is the argument for deriving at all.** A palette that
    does not meet the contrast it claims is the failure this engine exists to
    prevent, and writing it with a warning above it produces a file that outlives
    the warning by years. */
    if !violations.is_empty() && !args.force {
        /* **The count and the first line, not all of them.** Seven violations
        joined with semicolons is one unreadable paragraph, and the command that
        prints them properly is named right underneath. One example is what makes
        the count concrete without becoming the report. */
        let count = violations.len();
        let plural = if count == 1 { "pair" } else { "pairs" };
        return Err(Failure::new(
            Code::Failed,
            format!("cannot build {source}"),
            format!(
                "{count} {plural} miss their contrast target, starting with {}",
                violations.first().map_or("", String::as_str)
            ),
        )
        .hint("helix theme audit"));
    }

    /* **A forced build says what it forced.** Exit 0 is right, `--force` being a
    request rather than a mistake, but a file that does not meet the contrast it
    claims must not be produced in silence: the flag is typed once and the file
    is read for years. To stderr, so it never lands in the artifact. */
    if !violations.is_empty() {
        eprintln!(
            "helix: forced past {} failing {}, starting with {}",
            violations.len(),
            if violations.len() == 1 {
                "pair"
            } else {
                "pairs"
            },
            violations.first().map_or("", String::as_str)
        );
    }

    /* **Both modes as one block of `light-dark()` pairs**, the way the
    stylesheet writes its own tokens, unless the intent named one mode. */
    let css = match themes.as_slice() {
        [light, dark] => to_css_modes(light, dark, &args.selector),
        [one, ..] => to_css(one, &args.selector),
        [] => unreachable!("an intent derives in at least one mode"),
    };
    let tokens = themes.first().map_or(0, |theme| theme.tokens.len());
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
                "tokens": tokens,
                "violations": violations,
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
            "helix: wrote {tokens} tokens to {}",
            written.unwrap_or_default()
        );
    }
    Ok(Code::Ok)
}
