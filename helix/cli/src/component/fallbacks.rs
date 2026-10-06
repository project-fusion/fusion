//! A slot's fallback markup sits behind a seam the tier above can move.
//!
//! **A fallback answers a consumer and a seam answers the tier above, and they
//! are different people.** Slotting something replaces the fallback for whoever
//! wrote the markup. A `protected render...()` around it replaces the fallback
//! for whoever is extending the component, and without one their only route is
//! reimplementing the whole template to reach three elements.
//!
//! **The case this exists for is the one the tier rule creates.** A base tier
//! must not depend on the styled one, so a base component cannot draw a styled
//! button: it writes a bare `<button>` and the tier above, which has buttons,
//! overrides the method to use one. That only works if there is a method.
//!
//! **A bare property fallback is not this, and is allowed.**
//! `<slot>${this.label}</slot>` is the content-property rule: the property *is*
//! the fallback, there is no markup to restyle, and no tier wants to override a
//! string. Only fallbacks containing elements are asked about, so words with no
//! tag, the `+` of a zoom button, pass as well.
//!
//! **A call is not a property, and neither is a getter.** Two spellings of the
//! same fault, both found after the first version let them through on the shape
//! of the expression. A static helper returning a template reads as a bare
//! reference: parentheses are the test. A `private get dot()` returning a
//! template looks barer still, `${this.dot}` having no parentheses at all to
//! notice, so a name the file declares as a getter is markup until shown
//! otherwise.
//!
//! **Two things have to be got right to read this at all.** A `>` inside `${}`
//! does not close the tag, and a first pass reading one as the end of an opening
//! tag reports an event handler's own text as fallback content. And comments
//! hold `<slot>` too, since the components explaining the bare-slot rule explain
//! it in prose.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{line_of, uncommented};
use crate::component::{sources, Context, Finding, Report};

/// A method declaration at class-body indentation.
static METHOD: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^ {2}(?:(protected|private|public) )?(?:override )?(\w+)\s*\(")
        .expect("a literal pattern compiles")
});

static GETTER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bget\s+(\w+)\s*\(").expect("a literal pattern compiles"));

static SLOT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<slot\b").expect("a literal pattern compiles"));

/// A fallback that is nothing but property references and whitespace.
static ONLY_PROPERTIES: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(\$\{[^{}()]*\}|\s)+$").expect("a literal pattern compiles"));

/// One interpolation, whatever it holds.
static INTERPOLATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\$\{[^{}]*\}").expect("a literal pattern compiles"));

/// A `${this.name}` inside a fallback, whose name might be a getter.
static REFERENCED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\$\{\s*this\.(\w+)").expect("a literal pattern compiles"));

/// The index just past the `>` closing the tag that starts at `at`.
///
/// Interpolations are tracked, because a Lit attribute routinely holds one and
/// an arrow function inside it routinely holds `>`.
fn tag_end(text: &str, at: usize) -> Option<usize> {
    let bytes = text.as_bytes();
    let mut depth = 0usize;
    let mut index = at;
    while index < bytes.len() {
        if bytes[index] == b'$' && bytes.get(index + 1) == Some(&b'{') {
            depth += 1;
            index += 2;
            continue;
        }
        if bytes[index] == b'}' && depth > 0 {
            depth -= 1;
        } else if bytes[index] == b'>' && depth == 0 {
            return Some(index + 1);
        }
        index += 1;
    }
    None
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let text = uncommented(&raw);
            let where_ = context.relative(&file);

            let methods: Vec<(usize, String, String)> = METHOD
                .captures_iter(&text)
                .map(|one| {
                    (
                        one.get(0).expect("group zero always matches").start(),
                        one.get(1)
                            .map_or(String::new(), |two| two.as_str().to_owned()),
                        one[2].to_owned(),
                    )
                })
                .collect();

            /* A getter returning a template is markup wearing a property's
            spelling, so the exemption below has to know the names. */
            let getters: BTreeSet<&str> = GETTER
                .captures_iter(&text)
                .map(|one| one.get(1).expect("the name always matches").as_str())
                .collect();

            for open in SLOT.find_iter(&text) {
                let Some(end) = tag_end(&text, open.start()) else {
                    continue;
                };
                let Some(close) = text[end..].find("</slot").map(|at| at + end) else {
                    continue;
                };
                let body = text[end..close].trim();
                if body.is_empty() {
                    continue;
                }
                /* A property or two and nothing else is the content-property
                rule, not markup a tier would want to draw differently. Words
                with no tag in them, a `+` on a zoom button, are the same: there
                is no element to restyle. */
                let wording = !body.contains('<')
                    && INTERPOLATION
                        .find_iter(body)
                        .all(|one| ONLY_PROPERTIES.is_match(one.as_str()));
                if (wording || ONLY_PROPERTIES.is_match(body))
                    && !REFERENCED
                        .captures_iter(body)
                        .any(|one| getters.contains(&one[1]))
                {
                    continue;
                }

                let owner = methods.iter().rfind(|(at, _, _)| *at < open.start());
                let seamed = owner.is_some_and(|(_, visibility, name)| {
                    name.starts_with("render") && name != "render" && visibility == "protected"
                });
                if seamed {
                    checked += 1;
                    continue;
                }
                findings.push(Finding {
                    detail: "Move it to a `protected render...()` of its own: the slot answers a \
                             consumer and the method answers the tier, which are different people."
                        .to_owned(),
                    file: format!("{where_}:{}", line_of(&text, open.start())),
                    message: format!(
                        "a slot's fallback draws markup inside `{}`, so a tier above can only \
                         replace it by reimplementing the whole template",
                        owner.map_or("the template", |(_, _, name)| name.as_str())
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "slot fallbacks drawing markup behind a seam",
    }
}
