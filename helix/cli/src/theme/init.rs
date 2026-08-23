//! `helix theme init`: the starter intent.

use std::path::Path;

use crate::args::Init;
use crate::config::FILE;
use crate::error::{Failure, Outcome};
use crate::exit::Code;

/// # Errors
///
/// [`Failure`] when the file exists and `--force` was not given, or when it
/// cannot be written.
pub fn run(args: &Init, from: &Path, json: bool) -> Outcome<Code> {
    let path = args.out.clone().unwrap_or_else(|| from.join(FILE));

    /* **Refusing to overwrite is not politeness.** This file is the only record
    of what a consumer decided; the CSS beside it is derived and can be rebuilt,
    and the intent cannot. */
    if path.exists() && !args.force {
        return Err(Failure::input(
            format!("{} already exists", path.display()),
            "the intent is the one file here that cannot be regenerated",
        )
        .hint("helix theme init --force"));
    }

    /* **A brand and nothing else, which is what the engine asks for.** A starter
    file listing every field with its default in it teaches a reader that a theme
    is a hundred decisions, and it goes stale the first time a default moves: a
    written-out default is a value this file then owns.

    **And no `$schema` line, which the first version of this had.** It pointed at
    a URL nothing publishes, and the intent reader refuses unknown keys, so the
    tool's own starter file was rejected by the tool on the very next command. It
    is the right convention and it needs two things this does not have yet: a
    published schema, and a reader that knows to ignore the key. Serde's
    `deny_unknown_fields` does not compose with `flatten`, so allowing one key
    through cannot be done in a wrapper without giving up the typo-catching that
    is the whole reason unknown keys are refused. Both halves land together or
    neither does. */
    let starter = format!("{{\n  \"brand\": \"{}\"\n}}\n", args.brand);
    std::fs::write(&path, &starter).map_err(|failure| {
        Failure::input(
            format!("cannot write {}", path.display()),
            failure.to_string(),
        )
    })?;

    if json {
        println!(
            "{}",
            serde_json::json!({ "brand": args.brand, "written": path.display().to_string() })
        );
    } else {
        eprintln!("helix: wrote {}", path.display());
        eprintln!("  try: helix theme audit");
    }
    Ok(Code::Ok)
}
