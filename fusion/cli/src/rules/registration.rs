//! An import that registers a custom element is deferred past hydration.
//!
//! **A custom element registers on import, and a framework that hydrates commits
//! after that.** An element imported at module scope upgrades during the client
//! bundle's evaluation, writes its own attributes onto itself before the
//! framework has committed, and the framework then reports a hydration mismatch
//! naming an attribute nobody typed. The fix is to ask for it inside an effect,
//! or to take the type alone.
//!
//! **Whether a specifier registers anything is asked of the package**, not of a
//! list. A subpath resolves to a directory under the package's source, and a
//! directory registers if anything in it defines an element. A barrel is
//! followed from its entry point instead, because what a package *declares* is
//! not what its barrel *reaches*: one package here declares elements on two
//! subpaths and exports a single pure function from its index, so asking the
//! manifest reports an import that registers nothing.
//!
//! **A document with nothing to hydrate is exempt**, because registering at
//! module scope is what its entry point is *for* and the race cannot happen
//! there.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use crate::rules::{Context, Finding, Report};
use crate::workspace::{crawl, manifests};
use regex::Regex;

static STATIC_IMPORT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?m)^import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]"#)
        .expect("a literal pattern compiles")
});

static TYPE_ONLY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^import\s+type\b").expect("a literal pattern compiles"));

/// A relative specifier a module re-exports or imports for its side effects.
static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/|//[^\n]*").expect("a literal pattern compiles"));

static RELATIVE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?m)^\s*(?:export\s+\*|export\s*\{[^}]*\}|import)\s+(?:from\s+)?['"](\.[^'"]+)['"]"#,
    )
    .expect("a literal pattern compiles")
});

/// Whether a file defines an element, rather than quoting one.
///
/// **A generated module carries source as data.** One here holds a whole styled
/// tier as documentation strings, decorators and all, and a bundler evaluates
/// none of it — while the real definitions it was generated *from* are read by
/// this walk in their own right, so nothing is lost by skipping it.
///
/// Counting backticks was tried first, on the theory that an odd number before
/// the occurrence puts it inside a literal. It does not survive a file that
/// quotes code: the samples contain escaped backticks of their own, and the
/// count was even at exactly the wrong place.
fn defines_here(file: &Path, raw: &str) -> bool {
    let name = file.to_string_lossy();
    if name.ends_with(".generated.ts") {
        return false;
    }
    COMMENT.replace_all(raw, " ").contains("@customElement")
}

/// Whether a module's own graph reaches a custom element definition.
///
/// **What a package declares is not what its barrel reaches.** A published
/// subpath may define an element while the index exports one pure function, so
/// the entry point is followed rather than the manifest asked.
fn reaches(file: &Path, seen: &mut BTreeSet<std::path::PathBuf>) -> bool {
    if !seen.insert(file.to_path_buf()) {
        return false;
    }
    let Ok(raw) = fs::read_to_string(file) else {
        return false;
    };
    /* Comments blanked, or a barrel is credited with registering an element
    because a docblock further down the graph explains the decorator. */
    if defines_here(file, &raw) {
        return true;
    }
    let text = COMMENT.replace_all(&raw, " ");
    RELATIVE.captures_iter(&text).any(|found| {
        let Some(directory) = file.parent() else {
            return false;
        };
        /* A specifier is written the way the runtime resolves it, so `.js` on
        disk is `.ts`, and a bare directory is its index. */
        let bare = found[1].trim_end_matches(".js");
        [
            directory.join(format!("{bare}.ts")),
            directory.join(bare).join("index.ts"),
        ]
        .iter()
        .any(|one| reaches(one, seen))
    })
}

/// Whether anything under a directory defines a custom element.
fn defines(directory: &Path) -> bool {
    if !directory.is_dir() {
        return false;
    }
    let mut files = Vec::new();
    crawl(
        directory,
        &|path| {
            let name = path.to_string_lossy();
            (name.ends_with(".ts") || name.ends_with(".tsx")) && !name.ends_with(".d.ts")
        },
        &mut files,
    );
    files
        .iter()
        .any(|one| fs::read_to_string(one).is_ok_and(|raw| defines_here(one, &raw)))
}

pub fn run(context: &Context) -> Report {
    /* Every package that could register something, by published name. */
    let mut packages: BTreeMap<String, (String, bool)> = BTreeMap::new();
    for manifest in manifests(&context.root) {
        let entry = context.root.join(&manifest.directory).join("src/index.ts");
        let reaches = reaches(&entry, &mut BTreeSet::new());
        packages.insert(manifest.name.clone(), (manifest.directory.clone(), reaches));
    }

    let mut findings = Vec::new();
    let mut checked = 0;

    for root in &context.settings.hydrates {
        let mut files = Vec::new();
        crawl(
            &context.root.join(root),
            &|path| {
                let name = path.to_string_lossy();
                (name.ends_with(".ts") || name.ends_with(".tsx")) && !name.ends_with(".d.ts")
            },
            &mut files,
        );
        for file in files {
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");
            if context
                .settings
                .standalone
                .iter()
                .any(|one| where_.starts_with(one.as_str()))
            {
                continue;
            }
            let Ok(source) = fs::read_to_string(&file) else {
                continue;
            };
            checked += 1;

            for found in STATIC_IMPORT.captures_iter(&source) {
                let whole = found.get(0).expect("group zero always matches").as_str();
                if TYPE_ONLY.is_match(whole) {
                    continue;
                }
                let specifier = found[1].to_owned();
                /* A scoped name is two segments, so the package is what is left
                once the subpath is taken off. */
                let parts: Vec<&str> = specifier.split('/').collect();
                let (name, rest) = if specifier.starts_with('@') && parts.len() >= 2 {
                    (parts[..2].join("/"), &parts[2..])
                } else {
                    (parts[..1].join("/"), &parts[1..])
                };
                let Some((directory, declares)) = packages.get(&name) else {
                    continue;
                };
                let registers = if rest.is_empty() {
                    *declares
                } else {
                    defines(&context.root.join(directory).join("src").join(rest[0]))
                };
                if !registers {
                    continue;
                }
                findings.push(Finding {
                    detail: "They upgrade before the framework commits, write their own \
                             attributes onto themselves, and it reports a mismatch naming one \
                             nobody typed. Ask for it with a dynamic `import()` inside an effect, \
                             or take the type alone with `import type`."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!(
                        "imports `{specifier}` at module scope, which registers its elements \
                         during the client bundle's evaluation rather than after hydration"
                    ),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "files that run under hydration",
    }
}
