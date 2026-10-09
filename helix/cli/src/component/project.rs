//! A project's own components, read the way the rules that judge an extender
//! need them: each class built on another, the tags each file registers, and
//! which files each one imports.
//!
//! **Read from the sources, with no manifest asked for.** A project extending
//! Helix may never generate one, and the facts these rules need are written in
//! the class itself: what it extends, the prefix it sets, and the `@slot` and
//! `@csspart` lines above it.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::component::installed::Installed;
use crate::component::text::uncommented;
use crate::component::{sources, Context};

/// A class declared on another, with where its body opens.
static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^export\s+(?:default\s+)?class\s+(\w+)\s+extends\s+([\w.]+)")
        .expect("a literal pattern compiles")
});

/// The prefix a class sets for the children it renders.
static TIER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static\s+(?:override\s+)?tier\s*=\s*['`]([^'`]*)['`]")
        .expect("a literal pattern compiles")
});

/// A tag registered by name, and the class `customElements.define` names.
static DEFINED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?:@customElement\(\s*|customElements\.define\(\s*)['"]([a-z][a-z0-9]*-[a-z0-9-]+)['"](?:\s*,\s*(\w+))?"#,
    )
    .expect("a literal pattern compiles")
});

/// A relative import or re-export, side effect or not.
static IMPORT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?m)^\s*(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.\.?/[^'"]+)['"]"#)
        .expect("a literal pattern compiles")
});

/// A `@slot` line: the name, or `-` for the default slot.
static SLOT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*\*?\s*@slot\s+([a-z][a-z0-9-]*)").expect("a literal pattern compiles")
});

/// A `@csspart` line and its description.
static PART: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*\*?\s*@csspart\s+([a-z][a-z0-9-]*)(?:\s+-\s+(.*))?")
        .expect("a literal pattern compiles")
});

/// One module of the project.
pub struct Module {
    pub path: PathBuf,
    /// As written.
    pub text: String,
    /// Comments blanked, offsets kept.
    pub code: String,
}

/// A class built on another.
pub struct Extension {
    /// The module it is in, by its index.
    pub module: usize,
    pub class: String,
    pub base: String,
    /// Where `export class` starts, in the module's text.
    pub at: usize,
    /// The prefix it sets for its children, where it sets one.
    pub tier: Option<String>,
    /// The doc comment above it, decorators between the two allowed.
    pub docs: String,
}

impl Extension {
    /// The named slots its doc comment lists.
    pub fn slots(&self) -> BTreeSet<String> {
        SLOT.captures_iter(&self.docs)
            .map(|found| found[1].to_owned())
            .collect()
    }

    /// The parts its doc comment lists, with their descriptions.
    pub fn parts(&self) -> BTreeMap<String, String> {
        PART.captures_iter(&self.docs)
            .map(|found| {
                (
                    found[1].to_owned(),
                    found
                        .get(2)
                        .map_or("", |one| one.as_str())
                        .trim()
                        .to_owned(),
                )
            })
            .collect()
    }
}

/// The project, read once.
pub struct Project {
    pub modules: Vec<Module>,
    pub extensions: Vec<Extension>,
    /// Each tag, and the module that registers it.
    pub defined: BTreeMap<String, usize>,
    /// Each tag, and the class it registers, where that is readable: the one
    /// `customElements.define` names, or the class below the decorator.
    pub registers: BTreeMap<String, String>,
    /// Each module's relative imports, resolved to modules.
    imports: Vec<BTreeSet<usize>>,
}

/// The doc comment that ends just above `at`, past any decorator lines.
fn docs_above(text: &str, at: usize) -> String {
    let mut before = text[..at].trim_end();
    loop {
        let start = before.rfind('\n').map_or(0, |one| one + 1);
        if !before[start..].trim_start().starts_with('@') {
            break;
        }
        before = before[..start].trim_end();
        if start == 0 {
            break;
        }
    }
    if !before.ends_with("*/") {
        return String::new();
    }
    before
        .rfind("/**")
        .map_or_else(String::new, |open| before[open..].to_owned())
}

/// The module a relative specifier names, as TypeScript resolves it: a `.js`
/// written for the `.ts` beside it, a bare path, or a folder's index.
fn resolve(from: &Path, specifier: &str, known: &BTreeMap<PathBuf, usize>) -> Option<usize> {
    let base = from.parent()?.join(specifier);
    let stem = base.with_extension("");
    let mut candidates = vec![base.clone()];
    for extension in ["ts", "tsx", "js"] {
        candidates.push(stem.with_extension(extension));
        candidates.push(base.join(format!("index.{extension}")));
    }
    candidates.iter().find_map(|candidate| {
        let normal = normalize(candidate);
        known.get(&normal).copied()
    })
}

/// A path with its `.` and `..` folded, without touching the disk.
fn normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for part in path.components() {
        match part {
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                out.pop();
            }
            other => out.push(other),
        }
    }
    out
}

/// The specifier `from` writes to import `to`: relative, `./` or `../`
/// first, and `.js` for a `.ts` module, which is what TypeScript resolves.
pub fn specifier(from: &Path, to: &Path) -> String {
    let from_path = normalize(from.parent().unwrap_or(from));
    let from: Vec<_> = from_path.components().collect();
    let to_path = normalize(&to.with_extension("js"));
    let to: Vec<_> = to_path.components().collect();
    let shared = from.iter().zip(&to).take_while(|(a, b)| a == b).count();
    let mut parts: Vec<String> = vec!["..".to_owned(); from.len() - shared];
    if parts.is_empty() {
        parts.push(".".to_owned());
    }
    parts.extend(
        to[shared..]
            .iter()
            .map(|one| one.as_os_str().to_string_lossy().into_owned()),
    );
    parts.join("/")
}

impl Project {
    /// Every module under the project's tiers.
    pub fn read(context: &Context) -> Self {
        let mut paths = Vec::new();
        for tier in context.settings.roots(&context.root) {
            sources(&tier, &mut paths);
        }
        let modules: Vec<Module> = paths
            .into_iter()
            .filter_map(|path| {
                let text = fs::read_to_string(&path).ok()?;
                let code = uncommented(&text);
                Some(Module { path, text, code })
            })
            .collect();
        let known: BTreeMap<PathBuf, usize> = modules
            .iter()
            .enumerate()
            .map(|(at, module)| (normalize(&module.path), at))
            .collect();

        let mut extensions = Vec::new();
        let mut defined = BTreeMap::new();
        let mut registers = BTreeMap::new();
        let mut imports = Vec::new();
        for (at, module) in modules.iter().enumerate() {
            let classes: Vec<_> = CLASS.captures_iter(&module.code).collect();
            for (index, found) in classes.iter().enumerate() {
                let start = found.get(0).map_or(0, |one| one.start());
                /* The class's own body, up to the next class, so a module
                holding two reads each one's prefix and not the first. */
                let end = classes
                    .get(index + 1)
                    .and_then(|next| next.get(0))
                    .map_or(module.code.len(), |next| next.start());
                extensions.push(Extension {
                    module: at,
                    class: found[1].to_owned(),
                    base: found[2].to_owned(),
                    at: start,
                    tier: TIER
                        .captures(&module.code[start..end])
                        .map(|one| one[1].to_owned()),
                    docs: docs_above(&module.text, start),
                });
            }
            for found in DEFINED.captures_iter(&module.code) {
                defined.insert(found[1].to_owned(), at);
                let after = found.get(0).map_or(0, |one| one.end());
                let class = found.get(2).map(|one| one.as_str().to_owned()).or_else(|| {
                    CLASS
                        .captures(&module.code[after..])
                        .map(|one| one[1].to_owned())
                });
                if let Some(class) = class {
                    registers.insert(found[1].to_owned(), class);
                }
            }
            imports.push(
                IMPORT
                    .captures_iter(&module.code)
                    .filter_map(|found| resolve(&module.path, &found[1], &known))
                    .collect(),
            );
        }
        Self {
            modules,
            extensions,
            defined,
            registers,
            imports,
        }
    }

    /// Every module `from` imports, directly or through what it imports, and
    /// itself.
    pub fn reachable(&self, from: usize) -> BTreeSet<usize> {
        let mut seen = BTreeSet::from([from]);
        let mut next = vec![from];
        while let Some(at) = next.pop() {
            for &one in self.imports.get(at).into_iter().flatten() {
                if seen.insert(one) {
                    next.push(one);
                }
            }
        }
        seen
    }

    /// The class a project class extends, where the project declares it.
    pub fn extension(&self, class: &str) -> Option<&Extension> {
        self.extensions.iter().find(|one| one.class == class)
    }

    /// The Helix class a project class rests on, through any project classes
    /// between them, and the first prefix set on the way down.
    ///
    /// **The walk stops at the first class the installed packages describe**,
    /// since their manifest is the answer for it and everything under it. In
    /// this repository the headless tier is source as well as a package, and
    /// walking on past `HelixHeadlessCombobox` reached a base that renders
    /// nothing.
    pub fn grounded<'a>(
        &'a self,
        from: &'a Extension,
        installed: Option<&Installed>,
    ) -> (&'a str, Option<&'a str>) {
        let mut at = from;
        let mut tier = from.tier.as_deref();
        for _ in 0..8 {
            if installed.is_some_and(|one| one.classes.contains_key(&at.base)) {
                break;
            }
            let Some(next) = self.extension(&at.base) else {
                break;
            };
            at = next;
            tier = tier.or(next.tier.as_deref());
        }
        (&at.base, tier)
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{docs_above, specifier};

    #[test]
    fn a_specifier_is_relative_and_names_the_built_file() {
        assert_eq!(
            specifier(
                Path::new("/p/src/combobox/combobox.ts"),
                Path::new("/p/src/tag/tag.ts")
            ),
            "../tag/tag.js"
        );
        assert_eq!(
            specifier(Path::new("/p/src/a.ts"), Path::new("/p/src/b.ts")),
            "./b.js"
        );
    }

    #[test]
    fn the_doc_comment_is_found_past_decorators() {
        let text = "/**\n * A badge.\n * @slot icon - The icon.\n */\n@customElement('acme-badge')\nexport class AcmeBadge extends HelixHeadlessBadge {}\n";
        let at = text.find("export class").unwrap();
        assert!(docs_above(text, at).contains("@slot icon"));
        let bare = "export class AcmeBadge extends HelixHeadlessBadge {}\n";
        assert_eq!(docs_above(bare, 0), "");
    }
}
