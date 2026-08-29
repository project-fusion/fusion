//! A base component renders another family behind a method the tier above can move.
//!
//! **A styled tier can override a method and cannot override a fragment.** When
//! a base template names another family's element inline, the tier above
//! inherits that decision whole: it can restyle that element through its own
//! definition of the tag, and it cannot render something else there, wrap it,
//! pass it a property the base does not know about, or leave it out. Every one
//! of those is a normal thing for a tier to want, and each one otherwise costs a
//! complete reimplementation of `render`.
//!
//! **The seam is a `protected render<Something>()` method**, one per composed
//! element, called from `render`. Overriding it is then the ordinary way to
//! change what goes there, and it is the same seam a consumer subclassing the
//! base gets.
//!
//! **What counts as another family.** The name inside `this.tag()`, resolved to
//! where that element is declared rather than read off the name itself: an item
//! element declared in `menu/item/` belongs to `menu`. A component rendering its
//! own family is exempt, since a part rendering a sibling part is one folder
//! composing itself and there is no tier decision in it.
//!
//! **It reads the interpolation, not a literal tag**, and reading literals is
//! how the first version stopped working. A template names no tag: `this.tag()`
//! resolves to the base element here and the styled one in the tier above, so a
//! scan for a literal `<helix-...` matched nothing at all and reported "0
//! families compose another" as a pass.
//!
//! **Which tier is the base is configuration, because it is a fact about a
//! layout rather than about a language.** So is the prefix on an element name,
//! and so is the list of leaves: an icon that takes a name and draws it appears
//! in fourteen families, and there is no version of "render a different icon
//! element" that a consumer wants and their own icon element does not already
//! give them. Wrapping every one would be fourteen seams nobody opens.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

static BLOCK_COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

static LINE_COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"//[^\n]*").expect("a literal pattern compiles"));

static DEFINED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"@customElement\(['"]([a-z0-9-]+)['"]\)"#).expect("a literal pattern compiles")
});

static COMPOSED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<\$\{this\.tag\('([a-z0-9-]+)'\)\}").expect("a literal pattern compiles")
});

static SEAM: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\bprotected\s+(?:override\s+)?render[A-Z]\w*\s*\(")
        .expect("a literal pattern compiles")
});

/// Comments blanked to spaces, for the reason every rule here records: a class
/// doc is full of usage examples naming tags the file has no business rendering,
/// and those are prose.
fn uncommented(text: &str) -> String {
    let blank = |found: &regex::Captures| -> String {
        found[0]
            .chars()
            .map(|one| if one == '\n' { '\n' } else { ' ' })
            .collect()
    };
    let once = BLOCK_COMMENT.replace_all(text, &blank);
    LINE_COMMENT.replace_all(&once, &blank).into_owned()
}

/// The family a component file belongs to: its folder's parent's name.
///
/// A component lives at `<tier>/<family>/<part>/<file>.ts`, so the family is
/// three levels up rather than the file's own directory.
fn owner(file: &Path) -> Option<&str> {
    file.parent()?.parent()?.file_name()?.to_str()
}

/// The byte ranges of every `protected render<Something>()` body.
fn seams(text: &str) -> Vec<(usize, usize)> {
    let bytes = text.as_bytes();
    let mut ranges = Vec::new();
    for found in SEAM.find_iter(text) {
        /* Past the parameter list before looking for the body. Taking the first
        `{` after the name finds the type literal in
        `renderTag(option: { text: string })`, so the range covers the signature
        and stops, and the method's own body counts as outside itself. */
        let mut index = found.end() - 1;
        let mut parens = 0;
        while index < bytes.len() {
            match bytes[index] {
                b'(' => parens += 1,
                b')' => {
                    parens -= 1;
                    if parens == 0 {
                        break;
                    }
                }
                _ => {}
            }
            index += 1;
        }
        let Some(start) = text[index.min(text.len())..].find('{').map(|at| at + index) else {
            continue;
        };
        let mut depth = 0;
        let mut index = start;
        while index < bytes.len() {
            match bytes[index] {
                b'{' => depth += 1,
                b'}' => {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                }
                _ => {}
            }
            index += 1;
        }
        ranges.push((start, index));
    }
    ranges
}

pub fn run(context: &Context) -> Report {
    let Some(base) = context.settings.layers.first() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "families composing another",
        };
    };
    let tier = context.root.join(&base.source);
    let mut files = Vec::new();
    sources(&tier, &mut files);

    /* Where each tag is declared, so a part's family is its folder and not its
    name. */
    let mut families: BTreeMap<String, String> = BTreeMap::new();
    for file in &files {
        let (Some(owner), Ok(text)) = (owner(file), fs::read_to_string(file)) else {
            continue;
        };
        let Some(found) = DEFINED.captures(&text) else {
            continue;
        };
        let tag = &found[1];
        let name = tag.strip_prefix(&base.prefix).unwrap_or(tag);
        families.insert(name.to_owned(), owner.to_owned());
    }

    let mut findings = Vec::new();
    let mut composing: BTreeSet<String> = BTreeSet::new();

    for file in &files {
        let (Some(own), Ok(raw)) = (owner(file), fs::read_to_string(file)) else {
            continue;
        };
        let text = uncommented(&raw);
        let ranges = seams(&text);
        let mut reported: BTreeSet<&str> = BTreeSet::new();
        let where_ = file
            .strip_prefix(&context.root)
            .unwrap_or(file)
            .to_string_lossy()
            .replace('\\', "/");

        for found in COMPOSED.captures_iter(&text) {
            let tag = found.get(1).expect("the name always matches").as_str();
            let Some(family) = families.get(tag) else {
                continue;
            };
            if family == own || context.settings.leaves.contains_key(family) {
                continue;
            }
            composing.insert(own.to_owned());
            let at = found.get(0).expect("group zero always matches").start();
            let inside = ranges.iter().any(|(from, to)| at > *from && at < *to);
            if inside || !reported.insert(tag) {
                continue;
            }
            findings.push(Finding {
                detail: "Put it behind a `protected render...()` method, so the styled tier can \
                         render something else there without reimplementing `render`."
                    .to_owned(),
                file: where_.clone(),
                message: format!("renders `{tag}` inline"),
            });
        }
    }

    Report {
        checked: composing.len(),
        findings,
        notes: Vec::new(),
        unit: "families composing another",
    }
}
