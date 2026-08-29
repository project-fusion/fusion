//! A component that renders a child renders one from its own layer.
//!
//! **`tag()` composes a child's tag name from a static, and a static is
//! inherited.** The base class declares the base prefix; each class in the layer
//! above overrides it, and `this.tag('tooltip')` is then the styled element
//! rather than the headless one. A class that forgets the override inherits the
//! base prefix from the class it extends and renders base children into its own
//! shadow root.
//!
//! **Which fails silently, and that is the reason this exists.** The child is
//! the right element with the right behavior and no stylesheet, so it works: it
//! opens, it closes, it announces itself, and it is drawn by the browser's own
//! defaults. What that looks like is a UA border, square corners, the page's font
//! size and a UA `margin: auto` centering an overlay in the viewport, which reads
//! as a styling or positioning bug and gets chased at the wrong layer.
//!
//! Nothing else catches it. A manifest describes what a component renders and
//! not which layer it renders it from; a spec mounts the styled tag and asserts
//! behavior, which is exactly the half that still works.
//!
//! **Asked of the base source and answered by the one above**, because the call
//! and the override live in different files. `this.tag()` is written in the base
//! class; the class above inherits the method and has only to declare the prefix
//! it should compose with. Keying on the outer file finds nothing at all, which
//! is a check that passes by looking in the wrong place.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

static OVERRIDE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static\s+override\s+tier\s*=\s*'([^']*)'").expect("a literal pattern compiles")
});

pub fn run(context: &Context) -> Report {
    let [base, over, ..] = context.settings.layers.as_slice() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            unit: "components inheriting a `tag()` call",
        };
    };
    let root = context.root.join(&base.source);
    let above = context.root.join(&over.source);

    let mut files = Vec::new();
    sources(&root, &mut files);

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in files {
        let Ok(text) = fs::read_to_string(&file) else {
            continue;
        };
        if !text.contains("this.tag(") {
            continue;
        }
        /* A base component with no twin above is skipped: there is no second
        layer to disagree with. */
        let Ok(within) = file.strip_prefix(&root) else {
            continue;
        };
        let twin = above.join(within);
        let Ok(declared) = fs::read_to_string(&twin) else {
            continue;
        };
        checked += 1;
        if OVERRIDE
            .captures(&declared)
            .is_some_and(|found| found[1] == over.prefix)
        {
            continue;
        }
        findings.push(Finding {
            detail: format!(
                "Add `static override tier = '{}'` to the class, or it composes its children \
                 from the prefix it inherited.",
                over.prefix
            ),
            file: twin
                .strip_prefix(&context.root)
                .unwrap_or(&twin)
                .to_string_lossy()
                .replace('\\', "/"),
            message: "inherits a `this.tag()` call and does not override `tier`, so it renders \
                      base children into its own shadow root"
                .to_owned(),
        });
    }

    Report {
        checked,
        findings,
        unit: "components inheriting a `tag()` call",
    }
}
