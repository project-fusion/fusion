//! `helix theme init`: the starter intent.

use std::path::Path;

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::{Map, Value};

use crate::args::Init;
use crate::config::{flat, FILE, PRODUCT_FILE};
use crate::theme::modes;
use fusion_helix_theme::intent::ThemeIntent;

/// Writes the starter intent as the `theme` of `helix.json` here, or with
/// `--out` as a theme file of its own.
///
/// # Errors
///
/// [`Failure`] when there is already a theme and `--force` was not given,
/// when the `fusion.json` here holds the configuration, or when the file
/// cannot be written.
pub fn run(args: &Init, from: &Path, json: bool) -> Outcome<Code> {
    let path = args.out.clone().unwrap_or_else(|| from.join(FILE));
    let own = args.out.is_none();

    /* **Never written into `fusion.json`.** Its `helix` key is read before
    `helix.json`, so a theme written beside it would be one nothing reads,
    and rewriting the product's file would reformat what its owner wrote. */
    if own && holds_helix(&from.join(PRODUCT_FILE)) {
        return Err(Failure::input(
            format!("cannot write a theme into {}", path.display()),
            format!("the `helix` key of {PRODUCT_FILE} here is read before {FILE}"),
        )
        .hint("add \"theme\" under the `helix` key of fusion.json, or write a theme file with --out and name it there"));
    }

    /* A directory is refused on its own terms. `--force` would not help and
    saying "already exists" about one sends a reader looking for a file. */
    if path.is_dir() {
        return Err(Failure::input(
            format!("cannot write {}", path.display()),
            "is a directory, and --out names the file to write",
        ));
    }

    /* **Refusing to overwrite is not politeness.** The intent is the only
    record of what a consumer decided; the CSS beside it is derived and can be
    rebuilt, and the intent cannot. In `helix.json` it is the `theme` alone
    that is protected: the file's other sections are kept as they are. */
    let existing = if own { configuration(&path)? } else { None };
    if let Some(held) = existing.as_ref().filter(|held| flat(held)) {
        return Err(Failure::input(
            format!("cannot write a theme into {}", path.display()),
            format!(
                "it holds the component settings at the top, {}, and a theme beside them would make it neither shape",
                held.keys().cloned().collect::<Vec<_>>().join(", ")
            ),
        )
        .hint("move the settings under \"components\" first"));
    }
    let taken = match &existing {
        Some(held) => held.contains_key("theme"),
        None => path.exists(),
    };
    if taken && !args.force {
        return Err(Failure::input(
            if own {
                format!("{} already has a theme", path.display())
            } else {
                format!("{} already exists", path.display())
            },
            "the intent is the one file here that cannot be regenerated",
        )
        .hint("helix theme init --force"));
    }

    /* **The brand and nothing else, or nothing at all, which is ink.** A starter
    file listing every field with its default in it teaches a reader that a theme
    is a hundred decisions, and it goes stale the first time a default moves: a
    written-out default is a value this file then owns.

    **And no `$schema` key in the intent.** The intent reader refuses unknown
    keys, so adding one makes the tool reject its own starter file on the next
    command. Serde's `deny_unknown_fields` does not compose with `flatten`, so
    allowing one key through costs the typo-catching that is the reason unknown
    keys are refused. `helix.json` takes a `$schema` at its top, beside the
    sections, where the intent's reader never sees it. */
    /* **The brand is read before anything is written**, by the same reader
    `build` uses. A starter file holding a brand the engine cannot read is a
    file every later command refuses, and the refusal arrives one command after
    the mistake. */
    if let Some(brand) = &args.brand {
        let intent: ThemeIntent = serde_json::from_value(serde_json::json!({ "brand": brand }))
            .map_err(|failure| {
                Failure::input(format!("cannot use --brand {brand}"), failure.to_string())
            })?;
        modes(&intent).map_err(|failure| {
            Failure::input(format!("cannot use --brand {brand}"), failure.to_string())
                .hint("helix theme init --brand '#0b3d91'")
        })?;
    }

    let intent = match &args.brand {
        Some(brand) => serde_json::json!({ "brand": brand }),
        None => serde_json::json!({}),
    };
    let starter = if own {
        let mut held = existing.unwrap_or_default();
        held.insert("theme".to_owned(), intent);
        pretty(&Value::Object(held))
    } else {
        pretty(&intent)
    };
    std::fs::write(&path, &starter).map_err(|failure| {
        Failure::input(
            format!("cannot write {}", path.display()),
            failure.to_string(),
        )
    })?;

    if json {
        fusion_rules::say!(
            "{}",
            serde_json::json!({ "brand": args.brand, "written": path.display().to_string() })
        );
    } else {
        if own {
            eprintln!("helix: wrote the theme of {}", path.display());
        } else {
            eprintln!("helix: wrote {}", path.display());
            eprintln!("  name it in {FILE} as \"theme\" for every theme command to find it");
        }
        if args.brand.is_none() {
            eprintln!(
                "  no brand, so the theme is ink: add \"brand\" with a hex color to change it"
            );
        }
        eprintln!("  try: helix theme audit");
    }
    Ok(Code::Ok)
}

/// Whether `file` is there and has a `helix` key.
fn holds_helix(file: &Path) -> bool {
    std::fs::read_to_string(file)
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .is_some_and(|value| value.get("helix").is_some())
}

/// What the `helix.json` at `path` holds, or `None` where there is none yet.
///
/// # Errors
///
/// [`Failure`] when it is there and is not a JSON object.
fn configuration(path: &Path) -> Outcome<Option<Map<String, Value>>> {
    let Ok(text) = std::fs::read_to_string(path) else {
        return Ok(None);
    };
    match serde_json::from_str::<Value>(&text) {
        Ok(Value::Object(held)) => Ok(Some(held)),
        Ok(_) => Err(Failure::input(
            format!("cannot use {}", path.display()),
            "it is not a JSON object",
        )),
        Err(failure) => Err(Failure::input(
            format!("cannot use {}", path.display()),
            failure.to_string(),
        )),
    }
}

/// `value` as the file is written: two spaces, and a closing newline.
fn pretty(value: &Value) -> String {
    let mut text = serde_json::to_string_pretty(value).unwrap_or_default();
    text.push('\n');
    text
}
