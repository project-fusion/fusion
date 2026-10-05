//! `helix theme init`: the starter intent.

use std::path::Path;

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;

use crate::args::Init;
use crate::config::FILE;

/// # Errors
///
/// [`Failure`] when the file exists and `--force` was not given, or when it
/// cannot be written.
pub fn run(args: &Init, from: &Path, json: bool) -> Outcome<Code> {
    let path = args.out.clone().unwrap_or_else(|| from.join(FILE));

    /* A directory is refused on its own terms. `--force` would not help and
    saying "already exists" about one sends a reader looking for a file. */
    if path.is_dir() {
        return Err(Failure::input(
            format!("cannot write {}", path.display()),
            "is a directory, and --out names the file to write",
        ));
    }

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

    /* **The brand and nothing else, or nothing at all, which is ink.** A starter
    file listing every field with its default in it teaches a reader that a theme
    is a hundred decisions, and it goes stale the first time a default moves: a
    written-out default is a value this file then owns.

    **And no `$schema` line.** The intent reader refuses unknown keys, so adding
    one makes the tool reject its own starter file on the next command. It is the
    right convention and wants two things first: a published schema, and a reader
    that ignores the key. Serde's `deny_unknown_fields` does not compose with
    `flatten`, so allowing one key through costs the typo-catching that is the
    reason unknown keys are refused. Both halves land together or neither. */
    let starter = match &args.brand {
        Some(brand) => format!("{{\n  \"brand\": \"{brand}\"\n}}\n"),
        None => "{}\n".to_owned(),
    };
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
        if args.brand.is_none() {
            eprintln!(
                "  no brand, so the theme is ink: add \"brand\" with a hex color to change it"
            );
        }
        eprintln!("  try: helix theme audit");
    }
    Ok(Code::Ok)
}
