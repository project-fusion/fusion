//! A component painting the page's color lets a consumer correct it.
//!
//! **`--helix-color-background` is the page, and a component is not the page.**
//! Every use of it inside a component is a claim about what that component is
//! sitting on, and the claim is right exactly as often as the component is put
//! on the page and no other ground. A timeline marker painted itself the page
//! color to knock its rail out behind it and came out darker than any surface
//! that was not the page: a card showed it as a black disc.
//!
//! The trap is that those *work*, for months, because the page is what anybody
//! building a component puts it on. They fail on a card, a drawer, a toast, a
//! panel, a photograph, and none of those is where a component gets built.
//!
//! **Two ways to be right, and this holds a component to one of them.** Be
//! page-level chrome, which is named in configuration with a reason each. Or
//! take the color from a hook and fall back to the page, written
//! `var(--thing-background, var(--helix-color-background))`, where the guess is
//! still the guess and a consumer on a card can say otherwise in one
//! declaration. That is the whole difference between a default and a hardcoding.
//!
//! **Every paint channel, not just `background-color`.** A ground can be painted
//! as a `border-color`, a `fill`, a `stroke`, or the spread of a `box-shadow`,
//! and a sweep looking only at backgrounds misses an arc tick that strokes one
//! and a ring that spreads one.
//!
//! **A mix toward the page is a tint and is left alone.** A fill built as
//! `color-mix(in oklab, tone 14%, background)` names this token and is deriving
//! a color rather than painting a ground; so is taking the page's color as the
//! *ink* on a filled tone. Reporting them makes the rule un-actionable, which is
//! why it reads the property as well as the token.
//!
//! **What is deliberately not checked** is whether the fix is a hook at all. A
//! mark meaning "a gap in the thing behind me" is honest only if it is cut
//! rather than filled. A hook makes the guess correctable; geometry makes it
//! unnecessary, and no pattern can tell which a given mark wants.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{family, stylesheets, Context, Finding, Report};

const TOKEN: &str = "--helix-color-background";

/// A declaration naming the page color, whatever property it lands in.
static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(r"[\w-]+\s*:[^;{{}}]*{TOKEN}")).expect("a literal pattern compiles")
});

/// The properties that put a color on the page.
///
/// A custom property is excluded by construction: it is a name for a color and
/// says nothing about where the color goes, and the declaration using it is the
/// one this is about.
static PAINTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^\s*(background|background-color|border-color|border-block-color|border-block-end-color|border-block-start-color|border-inline-color|border-inline-end-color|border-inline-start-color|border-top-color|border-right-color|border-bottom-color|border-left-color|box-shadow|caret-color|color|fill|outline-color|stroke|text-decoration-color)\s*:",
    )
    .expect("a literal pattern compiles")
});

/// A `var()` whose first argument is a hook and which carries a fallback.
static HOOK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--[\w-]+)\s*,").expect("a literal pattern compiles"));

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// Comments blanked to spaces, newlines kept.
///
/// Replacing a comment with spaces of its own length keeps the character count
/// and loses the line count, and every report past the first comment then points
/// into the middle of one.
fn uncommented(text: &str) -> String {
    COMMENT
        .replace_all(text, |found: &regex::Captures| {
            found[0]
                .chars()
                .map(|one| if one == '\n' { '\n' } else { ' ' })
                .collect::<String>()
        })
        .into_owned()
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            let Some(family) = family(&sheet, &tier) else {
                continue;
            };
            if context.settings.chrome.contains_key(family) {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            let text = uncommented(&raw);
            let where_ = sheet
                .strip_prefix(&context.root)
                .unwrap_or(&sheet)
                .to_string_lossy()
                .replace('\\', "/");

            for found in DECLARATION.find_iter(&text) {
                let declaration = found.as_str();
                if !PAINTS.is_match(declaration) {
                    continue;
                }
                /* Inside a `color-mix()` it is a tint and not a ground, whatever
                property it lands in. Reporting one of a pair that are the same
                decision is worse than reporting neither. */
                if declaration.contains("color-mix(") {
                    continue;
                }
                /* Behind a hook is the whole test: a per-component property with
                the page as its fallback. */
                if HOOK
                    .captures_iter(declaration)
                    .any(|one| !one[1].starts_with("--helix-"))
                {
                    checked += 1;
                    continue;
                }
                let line = text[..found.start()].lines().count();
                findings.push(Finding {
                    detail: "A component is not the page, so this is a guess about what it was \
                             put on, and it is wrong on a card, a drawer or a photograph. Put it \
                             behind a per-component property with the page as the fallback, or \
                             cut a real hole instead of painting one."
                        .to_owned(),
                    file: format!("{where_}:{line}"),
                    message: format!("paints `{TOKEN}` with no hook to correct it"),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        unit: "declarations falling back to the page color",
    }
}
