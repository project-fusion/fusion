//! No class field is initialized from the element's own DOM.
//!
//! **A field initializer runs in the constructor, and a parsed element has no
//! attributes there.** Creating an element for a start tag runs the constructor
//! first and appends the attributes afterwards, so `this.hasAttribute('x')` in an
//! initializer answers `false` for every element a page wrote in markup. The
//! upgrade path is the other way round, the attributes being present before the
//! definition arrives, so the same line answers differently depending on whether
//! the consumer's script tag ran before or after the elements it defines.
//!
//! **Which is worse than being wrong, because it is wrong quietly.** Nothing
//! throws, no attribute is missing, and the property simply reports the opposite
//! of what the markup says. Measured on `Toggle`, `Option` and `Radio`, each of
//! which snapshotted `selected` into a private field and exposed it as
//! `defaultSelected`: `<helix-toggle value="light" selected>` reported `false`
//! from parsed markup and `false` again from `createElement` followed by
//! `setAttribute`, which between them are every way a consumer writes one. Three
//! published properties that could not be true.
//!
//! **The repair is to read it when it is asked for**, which is what the three
//! now do. A snapshot is only worth taking where something later overwrites the
//! source, and nothing did: `selected` does not reflect, so the attribute kept
//! saying what the markup said for the life of the element.
//!
//! The same argument covers the rest of an element's own tree, which is why the
//! list is not only attributes. `children` is empty during construction and
//! `querySelector` finds nothing, both for the same reason, and both fail in the
//! same silent direction.
//!
//! **A field and not an assignment**, so `connectedCallback` and `willUpdate`
//! are untouched: those run after the element is in a document with its
//! attributes on it, which is where reading the DOM is correct. What this names
//! is the one position where the read is guaranteed to be early.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// What a class field may not be initialized from.
///
/// Every one of them is a read of the element's own tree, which is the thing a
/// constructor does not have yet.
static READS: &str = "attributes|childNodes|children|closest|firstElementChild|getAttribute|getAttributeNames|hasAttribute|innerHTML|innerText|lastElementChild|querySelector|querySelectorAll|textContent";

/// `  private seeded = this.hasAttribute('selected')`, and every spelling of it.
///
/// The name is captured rather than excluded in the pattern, this crate's regex
/// having no look-around, and [`STATEMENT`] is applied to it below.
static FIELD: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)^[ \t]+(?:@\w+\([^\n]*\)[ \t\n]+)?(?:(?:private|protected|public|readonly|static|override|declare|accessor)\s+)*([A-Za-z_$][\w$]*)\??(?::[^=\n]+)?\s*=\s*(.+)$",
    )
    .expect("a literal pattern compiles")
});

/// What the right-hand side has to begin with to be one of the reads.
static READ: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(r"^this\.({READS})\b")).expect("a literal pattern compiles")
});

/// A word a field declaration cannot begin with, which is what separates it
/// from a local.
///
/// `const hidden = this.getAttribute('hidden')` inside a method has the same
/// tail and is correct there, a method running long after construction. So the
/// distinction is exactly the leading keyword, and it holds without having to
/// parse a class body.
const STATEMENT: [&str; 6] = ["await", "const", "let", "return", "this", "var"];

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
            for found in FIELD.captures_iter(&text) {
                let (Some(name), Some(value)) = (found.get(1), found.get(2)) else {
                    continue;
                };
                if STATEMENT.contains(&name.as_str()) {
                    continue;
                }
                checked += 1;
                let Some(read) = READ.captures(value.as_str().trim()) else {
                    continue;
                };
                findings.push(Finding {
                    detail: "The parser appends attributes after the constructor has run, so \
                             this answers for markup nobody wrote."
                        .to_owned(),
                    file: context.relative(&file),
                    message: format!(
                        "a field is initialized from `this.{}`, which the constructor reads \
                         before there is anything to read",
                        &read[1]
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "class fields with an initializer",
    }
}
