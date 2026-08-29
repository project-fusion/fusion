//! The specs document never registers the component library a second time.
//!
//! The spec runner imports a bundle per family, and each of those carries the
//! family it tests. It has to: the same bundles run against a blank page in CI,
//! where nothing else registers anything. So in the sandbox's iframe, anything
//! that registers the library again is a second copy, and the registrar warns
//! once per tag saying so. The frame states the intent in as many words — that
//! it imports no components, because loading every component would be loading
//! ninety-two families to test one — and a root layout sits above that intent: a
//! child route cannot un-render a parent's component.
//!
//! **Two mechanisms satisfy this and the rule accepts either**, which is the
//! point of writing it as an invariant rather than as a test of today's code. A
//! path guard in the registrar is what holds it now. A root layout of its own
//! for the tool routes is the structural version, at the cost of moving every
//! route in the app into a group. Either way the assertion is the same.
//!
//! **What it is really guarding is the string.** The guard compares the
//! pathname against a literal, and the route is a directory on disk: move the
//! specs page and the literal goes on matching nothing, the registration
//! silently resumes, and what a reader sees is a console warning on one route in
//! one iframe. So the route is derived from where the frame actually sits, with
//! route groups stripped the way the framework strips them, and compared to the
//! literal. Nothing else in the repository holds those two together.
//!
//! **And it refuses a static import of the library in the registrar**, which is
//! the edit this file most expects to see. The comment there says a module-scope
//! import is safe *for hydration*, which is true and reads as an invitation to
//! simplify the effect away. It is not safe for this: an import at module scope
//! runs on every route including the one below, and no guard inside a hook can
//! reach it.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

static RENDERS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<HelixElements\b").expect("a literal pattern compiles"));

#[allow(clippy::too_many_lines)]
pub fn run(context: &Context) -> Report {
    let settings = &context.settings.spec;
    let app = context.root.join(&settings.app);
    let registrar = context.root.join(&settings.registrar);
    let unit = "layouts above the specs document";
    let nothing = |findings| Report {
        checked: 0,
        findings,
        unit,
    };
    let said = |message: &str, detail: &str, file: &str| Finding {
        detail: detail.to_owned(),
        file: file.to_owned(),
        message: message.to_owned(),
    };

    let mut files = Vec::new();
    crawl(&app, &|_| true, &mut files);

    /* Anchored on the frame component rather than on a written-down path, so
    moving the route moves the rule with it. That is the whole failure this
    exists for. */
    let Some(frame) = files
        .iter()
        .find(|one| one.file_name().is_some_and(|two| two == "spec-frame.tsx"))
    else {
        return nothing(vec![said(
            "there is no `spec-frame.tsx` under the app",
            "This rule finds the specs document by that file. If the frame was renamed, rename it \
             here too; if the specs route is gone, so is this rule.",
            &settings.app,
        )]);
    };
    let Some(directory) = frame.parent() else {
        return nothing(Vec::new());
    };

    /* Route groups are parentheses and contribute no URL segment, which is
    exactly why the literal cannot be read off the directory path by eye. */
    let route = format!(
        "/{}",
        directory
            .strip_prefix(&app)
            .unwrap_or(directory)
            .components()
            .map(|one| one.as_os_str().to_string_lossy().to_string())
            .filter(|one| !one.starts_with('('))
            .collect::<Vec<String>>()
            .join("/")
    );

    let mut ancestors: Vec<PathBuf> = Vec::new();
    let mut cursor: &Path = directory;
    loop {
        let layout = cursor.join("layout.tsx");
        if layout.is_file() {
            ancestors.push(layout);
        }
        if cursor == app {
            break;
        }
        match cursor.parent() {
            Some(next) => cursor = next,
            None => break,
        }
    }

    let registering: Vec<&PathBuf> = ancestors
        .iter()
        .filter(|layout| fs::read_to_string(layout).is_ok_and(|source| RENDERS.is_match(&source)))
        .collect();
    let Ok(source) = fs::read_to_string(&registrar) else {
        return nothing(vec![said(
            "the registrar is not there",
            "This rule holds the registrar's guard to where the specs route actually is. Without \
             the registrar there is nothing to hold.",
            &settings.registrar,
        )]);
    };

    /* A static import outranks every guard below it, so this is checked
    whichever mechanism is in force. */
    let statically = Regex::new(&format!(
        r#"(?m)^import\s[^\n]*['"]{}(?:helix-sandbox/specs|helix)['"]"#,
        regex::escape(&context.settings.scope.clone().unwrap_or_default())
    ))
    .expect("a pattern built from an escaped scope compiles");
    if statically.is_match(&source) {
        return nothing(vec![said(
            "the registrar imports the library at module scope",
            "That runs on every route, including the specs document, and no guard inside a hook \
             can reach it. The dynamic `import()` inside the effect is what makes the guard \
             reachable. A module-scope import is safe for hydration now, which is what invites \
             this edit, and it is a different question from this one.",
            &settings.registrar,
        )]);
    }

    /* Held structurally: nothing above the route renders the registrar, so the
    path guard is no longer what holds it. */
    if registering.is_empty() {
        return Report {
            checked: ancestors.len(),
            findings: Vec::new(),
            unit,
        };
    }

    let mut findings = Vec::new();
    if !source.contains(&format!("'{route}'")) && !source.contains(&format!("\"{route}\"")) {
        findings.push(said(
            &format!("`{route}` inherits the registrar and nothing keeps the library out of it"),
            "Every element registers a second time inside the spec runner's iframe, where the \
             family bundles have already registered the one family under test. Either guard on \
             that path in the registrar, or give the tool routes a root layout of their own that \
             does not render it. This rule accepts both.",
            &settings.registrar,
        ));
    } else if !source.contains("window.location.pathname") {
        findings.push(said(
            &format!("the registrar names `{route}` and never reads the pathname"),
            "The literal is only a guard if something compares it to where the page actually is.",
            &settings.registrar,
        ));
    }

    Report {
        checked: registering.len(),
        findings,
        unit,
    }
}
