//! No class a CSS module owns is still written as a bare string.
//!
//! **A module scopes every class it defines, and a bare name then matches
//! nothing.** That is the one failure mode of moving styles into modules, and it
//! is silent: no build error, no type error, no failing test. The page simply
//! loses a rule.
//!
//! **The bare name is easiest to miss inside a template literal**, and a
//! descendant selector left behind in a global sheet (`.heroInstall code`,
//! where `.heroInstall` has moved) is the same fault seen from the other side.
//!
//! **`:global()` names are exempt**, because that is exactly what the syntax is
//! for: a rule reaching a name the module does not own.
//!
//! **A module's classes are owned inside the package that resolves them.** The
//! bundler scopes a name to one build, so a component example writing
//! `class="stack"` in its own demo markup has nothing to do with a `stack` a
//! site's module happens to declare. Comparing across packages reported
//! thirty-one of those, every one of them a component example that has never
//! been near the site's stylesheet.
//!
//! **The sibling of the module rule, from the other direction.** That one asks
//! whether a plain stylesheet selects a class only a module declares; this asks
//! whether markup writes one out as a literal. Both are the same boundary, and
//! neither reports what the other does.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use fusion_rules::walk::crawl;
use regex::Regex;

use crate::rules::{Context, Finding, Report};

/// The package a file belongs to, which is how far a scoped name travels.
fn package_of(path: &str) -> String {
    path.split('/').take(2).collect::<Vec<&str>>().join("/")
}

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static GLOBAL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r":global\([^)]*\)").expect("a literal pattern compiles"));

static DECLARES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)(?:^|[,\s>+~])\.([A-Za-z][\w-]*)").expect("a literal pattern compiles")
});

static WRITTEN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:className|class)=(?:"([^"]*)"|\{`([^`]*)`\})"#)
        .expect("a literal pattern compiles")
});

static INTERPOLATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\$\{[^}]*\}").expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path| {
            let name = path.to_string_lossy();
            name.ends_with(".module.css") || name.ends_with(".tsx")
        },
        &mut files,
    );

    /* Every class a module owns, and the module that owns it. */
    let mut owned: BTreeMap<(String, String), String> = BTreeMap::new();
    for file in files
        .iter()
        .filter(|one| one.to_string_lossy().ends_with(".module.css"))
    {
        let Ok(raw) = fs::read_to_string(file) else {
            continue;
        };
        let text = GLOBAL
            .replace_all(&COMMENT.replace_all(&raw, " "), " ")
            .into_owned();
        let where_ = context.relative(file);
        for found in DECLARES.captures_iter(&text) {
            owned
                .entry((package_of(&where_), found[1].to_owned()))
                .or_insert_with(|| where_.clone());
        }
    }

    let mut findings = Vec::new();
    for file in files
        .iter()
        .filter(|one| one.to_string_lossy().ends_with(".tsx"))
    {
        let Ok(text) = fs::read_to_string(file) else {
            continue;
        };
        let where_ = context.relative(file);
        for (number, line) in text.lines().enumerate() {
            for found in WRITTEN.captures_iter(line) {
                let value = found
                    .get(1)
                    .or_else(|| found.get(2))
                    .map_or("", |one| one.as_str());
                let value = INTERPOLATION.replace_all(value, " ");
                for word in value.split_whitespace() {
                    let Some(module) = owned.get(&(package_of(&where_), word.to_owned())) else {
                        continue;
                    };
                    findings.push(Finding {
                        detail: format!(
                            "Reference it through {module}, or mark the rule `:global()` if it is \
                             shared."
                        ),
                        file: format!("{where_}:{}", number + 1),
                        message: format!(
                            "`{word}` is scoped by a module, so this string matches nothing"
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked: owned.len(),
        findings,
        notes: Vec::new(),
        unit: "module classes",
    }
}
