//! No raw value where a token belongs, no primitive reached for, none dangling.
//!
//! **Four rules on one subject, and each fails a different way.** A raw value is
//! a design decision written where a theme cannot reach it. A primitive reached
//! for from outside the styles package is a component binding itself to the
//! layer below the one it is given. A token referenced and not defined resolves
//! to nothing, and the whole declaration is dropped. And a *primitive*
//! referenced and not defined is worse than a dangling semantic token, because
//! the component that goes unstyled is not the file that names it: one shadow
//! ink defined nowhere resolves every shadow in the library to none, with all
//! 177 tokens present and every other check passing.
//!
//! **A token definition may hold a raw value**, which is what a token is. The
//! styles package owns primitives and raw values by definition, so the raw-value
//! rules do not apply inside it and the dangling-primitive rule applies *only*
//! inside it: everywhere else, reaching for a primitive is refused outright, and
//! reporting both would say the name is wrong when what is wrong is reaching for
//! it at all.
//!
//! **A bare reference only, for the dangling case.** `var(--x, y)` is not
//! dropped, it resolves to `y`, so an undefined name behind a fallback is the
//! idiom for a primitive a theme may supply and this library need not. Flagging
//! it would be the rule telling a working declaration it is broken.
//!
//! **Prose can open a CSS block, and the cost is silence.** A comment naming a
//! stylesheet writes the word `css` immediately before a backtick, so a mention
//! of `site.css` looks exactly like a tagged template, runs past the real one
//! and consumes its opening backtick. The stylesheet is then never extracted and
//! the rule passes over a file it has not read: renaming eight tokens to
//! something nonexistent still reported nothing. Comments are blanked first,
//! which removes the class, and the `css` is required not to be part of a longer
//! name, which covers the case where no comment is involved.
//!
//! **Inside `@font-face` the tokenized properties are facts about a file rather
//! than choices about a design.** `font-weight: 100 900` there is the range the
//! variable font supplies; a token would be a category error and could not be
//! written in that slot anyway.
//!
//! **And one rule the others cannot see: a token named after a component that
//! no component reads.** Asking that every token *declared* is read would fire
//! on scale rungs, which have no reader today and are still part of a complete
//! scale a consumer reaches into. But a token whose last word is a component's
//! name is not a rung: it is a promise about that component, and when the
//! component stops reading it the promise is left standing, offering a consumer
//! a number that stopped meaning anything.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{walk_outside, Context, Finding, Report};

/// Properties whose values must come from a token, and which category serves them.
static TOKENIZED: LazyLock<[(&str, Regex); 7]> = LazyLock::new(|| {
    let one = |pattern: &str| Regex::new(pattern).expect("a literal pattern compiles");
    [
        (
            "color",
            one(
                r"(?:^|[^-\w])(?:color|background-color|border-color|outline-color|fill|stroke|caret-color|text-decoration-color|border-(?:block|inline)(?:-(?:start|end))?-color)\s*:",
            ),
        ),
        (
            "space",
            one(
                r"(?:^|[^-\w])(?:padding|margin|gap|row-gap|column-gap)(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?\s*:",
            ),
        ),
        ("radii", one(r"(?:^|[^-\w])border-radius\s*:")),
        ("text", one(r"(?:^|[^-\w])font-size\s*:")),
        ("weight", one(r"(?:^|[^-\w])font-weight\s*:")),
        (
            "duration",
            one(r"(?:^|[^-\w])(?:transition-duration|animation-duration)\s*:"),
        ),
        ("layer", one(r"(?:^|[^-\w])z-index\s*:")),
    ]
});

static RAW_COLOR: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\s*\(")
        .expect("a literal pattern compiles")
});

static RAW_LENGTH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:^|[\s:(,])-?\d*\.?\d+(?:px|rem|em|ms|s)?(?:[\s;,)]|$)")
        .expect("a literal pattern compiles")
});

/// Operands of a `calc()` multiplication or division.
///
/// `calc(var(--_card-inset) * -1)` scales a token; the `-1` is a factor rather
/// than a length, and flagging it would push authors toward a second token
/// existing only to hold the number minus one. Addition and subtraction are left
/// alone, because `calc(var(--x) + 4px)` really is a raw length.
static CALC_FACTOR: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[*/]\s*-?\d*\.?\d+|-?\d*\.?\d+\s*[*/]").expect("a literal pattern compiles")
});

/// Values that are structural rather than design decisions.
const ALLOWED: [&str; 16] = [
    "0",
    "0px",
    "0rem",
    "1",
    "100%",
    "1px",
    "50%",
    "9999px",
    "auto",
    "currentColor",
    "inherit",
    "initial",
    "none",
    "revert",
    "transparent",
    "unset",
];

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static TEMPLATE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"css`((?:[^`\\]|\\(?s:.))*)`").expect("a literal pattern compiles")
});

static SEMANTIC: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(--helix-[\w-]+)\s*:").expect("a literal pattern compiles")
});

static PRIMITIVE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(--_helix-[\w-]+)\s*:").expect("a literal pattern compiles")
});

static BARE_PRIMITIVE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"var\(\s*(--_helix-[\w-]+)\s*\)").expect("a literal pattern compiles")
});

static ANY_PRIMITIVE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*--_helix-").expect("a literal pattern compiles"));

static READS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--helix-[\w-]+)").expect("a literal pattern compiles"));

static FONT_FACE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^@font-face\b").expect("a literal pattern compiles"));

/// Blanks block comments, keeping every byte and every newline where it was.
fn blanked(source: &str) -> String {
    COMMENT
        .replace_all(source, |found: &regex::Captures| {
            found[0]
                .chars()
                .map(|one| if one == '\n' { '\n' } else { ' ' })
                .collect::<String>()
        })
        .into_owned()
}

/// The whole file for a stylesheet, or each tagged template inside a module.
fn blocks(path: &Path, source: &str) -> Vec<(usize, String)> {
    if path
        .extension()
        .is_some_and(|one| one.eq_ignore_ascii_case("css"))
    {
        return vec![(0, source.to_owned())];
    }
    let scanned = blanked(source);
    TEMPLATE
        .captures_iter(&scanned)
        .filter(|found| {
            let at = found.get(0).expect("group zero always matches").start();
            scanned[..at]
                .chars()
                .next_back()
                .is_none_or(|before| before != '.' && before != '-' && !before.is_alphanumeric())
        })
        .map(|found| {
            (
                found.get(0).expect("group zero always matches").start(),
                found[1].to_owned(),
            )
        })
        .collect()
}

fn line_of(text: &str, at: usize) -> usize {
    text[..at].matches('\n').count() + 1
}

/// Every file a rule about authored CSS could read, across the workspace.
fn corpus(root: &Path) -> Vec<std::path::PathBuf> {
    let mut found = Vec::new();
    walk_outside(root, &mut found);
    found.retain(|one| {
        let name = one.to_string_lossy();
        one.extension()
            .is_some_and(|two| two.eq_ignore_ascii_case("css") || two.eq_ignore_ascii_case("ts"))
            && !name.ends_with(".spec.ts")
            && !name.ends_with(".css.ts")
    });
    found
}

pub fn run(context: &Context) -> Report {
    /* The package owning primitives, derived from where the token layer is. */
    let Some(owns) = context
        .settings
        .layer
        .first()
        .and_then(|one| Path::new(one).parent()?.parent().map(Path::to_path_buf))
    else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "declarations read for a raw value",
        };
    };

    let mut defined: BTreeSet<String> = BTreeSet::new();
    let mut privates: BTreeSet<String> = BTreeSet::new();
    for file in corpus(&context.root.join(&owns)) {
        if file
            .extension()
            .is_none_or(|one| !one.eq_ignore_ascii_case("css"))
        {
            continue;
        }
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        defined.extend(SEMANTIC.captures_iter(&source).map(|one| one[1].to_owned()));
        privates.extend(
            PRIMITIVE
                .captures_iter(&source)
                .map(|one| one[1].to_owned()),
        );
    }
    if defined.is_empty() {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "declarations read for a raw value",
        };
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in corpus(&context.root) {
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        let where_ = file
            .strip_prefix(&context.root)
            .unwrap_or(&file)
            .to_string_lossy()
            .replace('\\', "/");
        let owns_primitives = where_.starts_with(&owns.to_string_lossy().to_string());

        /* An example showing the base layer writes raw values on purpose: a
        consumer taking that layer alone has no token to reach for, and an
        example reaching for one would teach the opposite of what it is for.
        Read off the markup rather than the filename, both layers calling the
        file the same thing. */
        if where_.contains(".examples")
            && file
                .extension()
                .is_some_and(|one| one.eq_ignore_ascii_case("css"))
        {
            let markup = file.with_extension("html");
            let base = context
                .settings
                .layers
                .first()
                .map(|one| one.prefix.as_str());
            if let (Some(base), Ok(text)) = (base, fs::read_to_string(&markup)) {
                if text.contains(&format!("<{base}")) {
                    continue;
                }
            }
        }

        checked += read(
            &blocks(&file, &source),
            &source,
            Against {
                defined: &defined,
                owns_primitives,
                privates: &privates,
                where_: &where_,
            },
            &mut findings,
        );
    }

    findings.extend(dead(context, &owns));

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "declarations read for a raw value",
    }
}

/// What one file is judged against.
#[derive(Clone, Copy)]
struct Against<'a> {
    defined: &'a BTreeSet<String>,
    owns_primitives: bool,
    privates: &'a BTreeSet<String>,
    where_: &'a str,
}

/// Every line of every CSS block, judged.
fn read(
    blocks: &[(usize, String)],
    source: &str,
    against: Against,
    findings: &mut Vec<Finding>,
) -> usize {
    let Against {
        defined,
        owns_primitives,
        privates,
        where_,
    } = against;
    let mut checked = 0;
    {
        for (offset, block) in blocks {
            let offset = *offset;
            let text = COMMENT.replace_all(block, "");
            let mut in_face = false;
            let mut depth = 0i32;
            for (number, raw) in text.lines().enumerate() {
                let line = raw.trim();
                let at = format!("{where_}:{}", line_of(source, offset) + number);

                if FONT_FACE.is_match(line) {
                    in_face = true;
                    depth = 0;
                }
                if in_face {
                    depth += i32::try_from(line.matches('{').count()).unwrap_or(0)
                        - i32::try_from(line.matches('}').count()).unwrap_or(0);
                    let closed = depth <= 0 && line.contains('}');
                    if line.contains(':') {
                        if closed {
                            in_face = false;
                        }
                        continue;
                    }
                    if closed {
                        in_face = false;
                    }
                }

                judge(
                    line,
                    &at,
                    Against {
                        defined,
                        owns_primitives,
                        privates,
                        where_,
                    },
                    &mut checked,
                    findings,
                );
            }
        }
    }
    checked
}

/// One line, against every rule that can speak about it.
fn judge(line: &str, at: &str, against: Against, checked: &mut usize, findings: &mut Vec<Finding>) {
    let Against {
        defined,
        owns_primitives,
        privates,
        ..
    } = against;
    {
        {
            {
                if owns_primitives {
                    for found in BARE_PRIMITIVE.captures_iter(line) {
                        if privates.contains(&found[1]) {
                            continue;
                        }
                        findings.push(Finding {
                            detail: "A missing primitive makes the whole declaration invalid at \
                                     computed-value time, and the file that goes unstyled is not \
                                     this one."
                                .to_owned(),
                            file: at.to_owned(),
                            message: format!(
                                "`{}` is referenced and defined nowhere, so this declaration is \
                                 dropped",
                                &found[1]
                            ),
                        });
                    }
                }

                /* A token definition may hold a raw value. */
                if line.is_empty() || line.starts_with("--") {
                    return;
                }

                if !owns_primitives && ANY_PRIMITIVE.is_match(line) {
                    findings.push(Finding {
                        detail: "Use a semantic token.".to_owned(),
                        file: at.to_owned(),
                        message: "references an internal primitive".to_owned(),
                    });
                }

                for found in READS.captures_iter(line) {
                    if defined.contains(&found[1]) {
                        continue;
                    }
                    findings.push(Finding {
                        detail: "Renamed or mistyped, and the declaration is dropped.".to_owned(),
                        file: at.to_owned(),
                        message: format!("`{}` is not defined by the styles package", &found[1]),
                    });
                }

                for (category, property) in TOKENIZED.iter() {
                    if !property.is_match(line) || owns_primitives {
                        continue;
                    }
                    let Some(colon) = line.find(':') else {
                        continue;
                    };
                    let value = line[colon + 1..]
                        .split(';')
                        .next()
                        .unwrap_or("")
                        .trim()
                        .to_owned();
                    if value.is_empty()
                        || value.contains("var(--helix-")
                        || ALLOWED.contains(&value.as_str())
                    {
                        continue;
                    }
                    *checked += 1;
                    let scalar = CALC_FACTOR.replace_all(&value, "");
                    if !RAW_COLOR.is_match(&scalar) && !RAW_LENGTH.is_match(&scalar) {
                        continue;
                    }
                    findings.push(Finding {
                        detail: format!("A raw value here is a design decision a theme cannot reach. Use a `--helix-{category}-*` token."),
                        file: at.to_owned(),
                        message: format!("raw value where a `--helix-{category}-*` token belongs"),
                    });
                }
            }
        }
    }
}

/// A token named after a component that no component reads.
fn dead(context: &Context, owns: &Path) -> Vec<Finding> {
    let Some(over) = context.settings.layers.last() else {
        return Vec::new();
    };
    let Some(sheet) = context
        .settings
        .layer
        .iter()
        .find(|one| one.ends_with("tokens.css"))
    else {
        return Vec::new();
    };
    let Ok(raw) = fs::read_to_string(context.root.join(sheet)) else {
        return Vec::new();
    };
    let source = COMMENT.replace_all(&raw, "");

    let families: BTreeSet<String> = fs::read_dir(context.root.join(&over.source))
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.path().is_dir())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();

    let mut read: BTreeSet<String> = BTreeSet::new();
    for file in corpus(&context.root) {
        let name = file.to_string_lossy();
        if name.ends_with("tokens.css") || name.ends_with("primitives.css") {
            continue;
        }
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        read.extend(READS.captures_iter(&text).map(|one| one[1].to_owned()));
    }

    let _ = owns;
    SEMANTIC
        .captures_iter(&source)
        .map(|one| one[1].to_owned())
        .filter(|name| {
            name.rsplit('-')
                .next()
                .is_some_and(|leaf| families.contains(leaf))
                && !read.contains(name)
        })
        .map(|name| {
            let leaf = name.rsplit('-').next().unwrap_or("").to_owned();
            Finding {
                detail: "A token naming a component is a promise about it: either that component \
                         should read it, or it should go. A scale rung with no reader is fine and \
                         this is not one."
                    .to_owned(),
                file: sheet.clone(),
                message: format!(
                    "`{name}` is named after the `{leaf}` component and read by nothing"
                ),
            }
        })
        .collect()
}
