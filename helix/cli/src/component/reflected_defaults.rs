//! A reflected property is silent until something sets it.
//!
//! **A reflected property with a default writes an attribute on upgrade that the
//! server did not send**, which is a hydration mismatch a consumer reports and
//! cannot patch up. The markup arrives without the attribute, the element
//! upgrades, and the attribute appears — so the served HTML and the live DOM
//! disagree from the first frame, and nothing anywhere says so.
//!
//! **Three initializers are genuinely silent**: an absent one, an explicit
//! `undefined`, and `false`, because a reflected boolean removes the attribute
//! rather than writing it. `''` is not one of them: Lit reflects the empty
//! string as `name=""`, which is an attribute a consumer's server never sent.
//!
//! **A getter with no setter is refused outright**, for a different reason worth
//! keeping in the same place: Lit reflects what is in `changedProperties`, and
//! nothing puts a derived getter there after the first update, so the attribute
//! is right on load and wrong from the first change. Reflection on a computed
//! value is a promise the mechanism cannot keep.
//!
//! **A getter has a default too, and it is one line further away.** A controlled
//! property reads `this.xState ?? this.defaultX`, so what it returns before
//! anybody writes to it is `defaultX`'s initializer. Reflected, that writes an
//! attribute onto a host the server served without one, and the setter rule
//! above lets the accessor through, so nothing else catches it.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// The decorator, then the field or getter that follows it.
///
/// A doc block between the two is consumed explicitly, because `\s*` does not
/// cross one and the declaration would then read as unreflected.
static REFLECTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)@property\(([^)]*reflect:\s*true[^)]*)\)\s*(?:(?s:/\*.*?\*/)\s*)?(?:override\s+)?(get\s+)?(\w+)(?:\([^)]*\))?(?:\??:[^=\n]+)?(?:\s*=\s*([^\n]+?))?\s*$",
    )
    .expect("a literal pattern compiles")
});

/// The body of the accessor that begins at a match, by its closing indent.
static BODY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)\{(.*?)\n\s{2}\}").expect("a literal pattern compiles"));

/// `?? this.somethingElse`, which is where a controlled getter keeps its default.
static BACKING: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\?\?\s*this\.(\w+)").expect("a literal pattern compiles"));

/// Whether an initializer writes no attribute when reflected.
fn silent(initializer: Option<&str>) -> bool {
    match initializer.map(str::trim) {
        None => true,
        Some(one) => matches!(one.trim_end_matches(','), "false" | "undefined"),
    }
}

fn line_of(text: &str, at: usize) -> usize {
    text[..at].matches('\n').count() + 1
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");

            for found in REFLECTED.captures_iter(&text) {
                let name = found.get(3).map_or("", |one| one.as_str());
                let at = found.get(0).expect("group zero always matches").start();
                let line = line_of(&text, at);
                checked += 1;

                if found.get(2).is_none() {
                    let initializer = found.get(4).map(|one| one.as_str());
                    if silent(initializer) {
                        continue;
                    }
                    findings.push(Finding {
                        detail: "Default it to nothing, or write the attribute in `updated` after \
                                 the first render."
                            .to_owned(),
                        file: format!("{where_}:{line}"),
                        message: format!(
                            "`{name}` reflects and defaults to `{}`, so it writes an attribute on \
                             upgrade that the server did not",
                            initializer.unwrap_or("").trim()
                        ),
                    });
                    continue;
                }

                /* A getter with a setter beside it reflects correctly, because
                the setter is what puts the property in `changedProperties`. */
                let has_setter = Regex::new(&format!(r"\bset\s+{}\s*\(", regex::escape(name)))
                    .is_ok_and(|one| one.is_match(&text));
                if !has_setter {
                    findings.push(Finding {
                        detail: "Lit reflects what is in `changedProperties`, and nothing puts a \
                                 derived getter there after the first update, so the attribute is \
                                 right on load and wrong from the first change. Write it in \
                                 `updated`, or give it a setter."
                            .to_owned(),
                        file: format!("{where_}:{line}"),
                        message: format!("`{name}` is a getter with no setter and reflects"),
                    });
                    continue;
                }

                let body = BODY
                    .captures(&text[at..])
                    .map_or(String::new(), |one| one[1].to_owned());
                let Some(backing) = BACKING.captures(&body).map(|one| one[1].to_owned()) else {
                    continue;
                };
                let fallback = Regex::new(&format!(
                    r"(?m)\b{}\s*(?::[^=\n]+)?=\s*([^\n]+?)\s*$",
                    regex::escape(&backing)
                ))
                .ok()
                .and_then(|one| Some(one.captures(&text)?.get(1)?.as_str().to_owned()));
                if silent(fallback.as_deref()) {
                    continue;
                }
                findings.push(Finding {
                    detail: "That is a hydration mismatch a consumer reports and cannot patch up. \
                             Default it to nothing, or write the attribute in `updated`."
                        .to_owned(),
                    file: format!("{where_}:{line}"),
                    message: format!(
                        "`{name}` reflects and falls back to `{backing}`, which defaults to `{}`, \
                         so it writes an attribute on upgrade that the server did not",
                        fallback.unwrap_or_default()
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        unit: "reflected properties",
    }
}
