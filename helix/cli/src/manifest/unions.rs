//! A named union written out, so an attribute's values are in the manifest.
//!
//! **A name in the type column tells a reader nothing they can type.** A
//! property declared `format?: ColorFormat` arrives as that word and no values,
//! and everything downstream carries it: the reference page prints the name, the
//! framework typings publish it, and the `axes` rule goes looking for words that
//! are not there. Seventeen attributes across ten names were in that state, and
//! the answer is not to inline twelve placements in five files, which is what
//! the name exists to prevent. It is to resolve the name where the manifest is
//! written.
//!
//! **A parser can do this, which is why it is here rather than in a checker.**
//! The `resolved` rule already refuses an attribute whose type is a name these
//! sources do not define as a union of literals, so every name that survives it
//! is one a reader of the text can substitute: the alias is written out as a
//! union of quoted words, in a file this package holds or one it imports from.
//! That is a substitution and not an inference, and what cannot be substituted
//! is left exactly as written, which is the platform's `ScrollBehavior` and the
//! object types whose name is the honest answer.
//!
//! **The import decides which file answers, never the bare name.** Two packages
//! may each define a `Format` and mean different things, so a name is resolved
//! through the specifier that brought it in: the same file, a file beside it, or
//! the sources of the package it was imported from, reached the way the runtime
//! reaches it.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

/// The head of a type alias, up to and including its `=`.
///
/// **The value is read by the scanner below rather than by this pattern**, which
/// stops at the `=` for a reason. A union is written on one line until it does
/// not fit on one: at `lineWidth` 100 a seven-word union already wraps, so
/// `OrbState` and `Placement` both continue onto the lines beneath them, and a
/// pattern anchored to a single line reads the first member as the whole union.
/// `\s*` before the `=` must not cross a newline either, or the pattern finds a
/// value on the next line and half-matches exactly what it meant to skip.
static HEAD: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^[^\S\n]*(?:export[^\S\n]+)?type[^\S\n]+(\w+)[^\S\n]*=")
        .expect("a literal pattern compiles")
});

/// What a type alias is equal to, gathered across the lines it is written on.
///
/// The first line after the `=` if there is anything on it, and then every line
/// below that opens with a `|`, which is how a wrapped union is written and is
/// not how an object type's members are. A line that opens with anything else
/// ends the value, so a multi-line object stops at its first field instead of
/// contributing its names to a union.
pub(crate) fn value_of(rest: &str) -> String {
    let mut body = String::new();
    for (at, line) in rest.lines().enumerate() {
        let line = line.trim();
        if at == 0 {
            if let Some(head) = line.split(';').next() {
                body.push_str(head);
            }
            if !body.is_empty() && !body.ends_with('|') {
                break;
            }
            continue;
        }
        if !line.starts_with('|') {
            break;
        }
        if !body.is_empty() {
            body.push(' ');
        }
        body.push_str(line.split(';').next().unwrap_or(line));
    }
    body
}

/// Every type alias one file declares, by name.
pub(crate) fn aliases_in(text: &str) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for capture in HEAD.captures_iter(text) {
        let (Some(name), Some(whole)) = (capture.get(1), capture.get(0)) else {
            continue;
        };
        let body = value_of(&text[whole.end()..]);
        if body.is_empty() {
            continue;
        }
        found
            .entry(name.as_str().to_owned())
            .or_insert_with(|| body.clone());
    }
    found
}

/// A union of quoted words, as one line, or nothing where it is anything else.
///
/// **Only literals, and every one of them.** `Side | AlignedPlacement` and
/// `(typeof ORB_STATES)[number]` are names and derivations rather than values,
/// and writing out the half of a union that is quoted would publish a shorter
/// list than the type accepts, which is worse than publishing the name.
fn literals(body: &str) -> Option<String> {
    let said: Vec<&str> = body
        .trim()
        .trim_start_matches('|')
        .split('|')
        .map(str::trim)
        .collect();
    if said.is_empty() {
        return None;
    }
    for one in &said {
        let quoted = one.len() >= 2 && one.starts_with('\'') && one.ends_with('\'');
        if !quoted || one[1..one.len() - 1].contains('\'') {
            return None;
        }
    }
    Some(said.join(" | "))
}

/// Whether a written type is a bare name rather than something with values in.
fn is_a_name(text: &str) -> bool {
    !text.is_empty()
        && text
            .chars()
            .next()
            .is_some_and(|one| one.is_ascii_uppercase())
        && text
            .chars()
            .all(|one| one.is_ascii_alphanumeric() || one == '_')
}

/// Where a package's sources are, for a specifier that names a package.
///
/// **`node_modules` because that is where the import leads.** A workspace links
/// its packages there, a consumer's install puts them there, and following the
/// specifier is the only way to be sure the `Placement` written out is the one
/// this file imported. Nothing is resolved by name alone.
fn installed(from: &Path, specifier: &str) -> Option<PathBuf> {
    let parts: Vec<&str> = specifier.split('/').collect();
    let named = if specifier.starts_with('@') {
        parts.get(..2)?.join("/")
    } else {
        (*parts.first()?).to_owned()
    };
    let mut at = Some(from);
    while let Some(here) = at {
        let candidate = here.join("node_modules").join(&named);
        if candidate.is_dir() {
            return Some(candidate);
        }
        at = here.parent();
    }
    None
}

/// Every `.ts` file under a directory, deepest last, leaving specs out.
fn sources(at: &Path, into: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(at) else {
        return;
    };
    let mut found: Vec<PathBuf> = entries.flatten().map(|one| one.path()).collect();
    found.sort();
    for one in found {
        if one.is_dir() {
            sources(&one, into);
            continue;
        }
        let name = one.file_name().unwrap_or_default().to_string_lossy();
        if name.ends_with(".ts") && !name.contains(".spec.") {
            into.push(one);
        }
    }
}

/// The aliases this package and the ones it imports from write out.
///
/// Read once and kept, because a package's sources answer for every module in
/// it and the same three names are imported by a dozen families.
pub struct Unions {
    package: PathBuf,
    /// Each source file's own aliases, by the path the manifest calls it.
    own: BTreeMap<String, BTreeMap<String, String>>,
    /// What each module imported, by name, so a specifier can be followed.
    imported: BTreeMap<String, BTreeMap<String, String>>,
    /// Another package's aliases, gathered when its first name is asked for.
    installed: BTreeMap<String, BTreeMap<String, String>>,
}

impl Unions {
    /// Read the package's own sources, which is every module the manifest has.
    pub fn read(package: &Path, modules: &[(String, String)]) -> Self {
        let mut own = BTreeMap::new();
        let mut imported = BTreeMap::new();
        for (path, text) in modules {
            own.insert(path.clone(), aliases_in(text));
            imported.insert(path.clone(), crate::manifest::parse::imported(text));
        }
        Self {
            package: package.to_path_buf(),
            own,
            imported,
            installed: BTreeMap::new(),
        }
    }

    /// The aliases of a package this one imports from, read on first ask.
    fn package_aliases(&mut self, specifier: &str) -> &BTreeMap<String, String> {
        let key = specifier.to_owned();
        if !self.installed.contains_key(&key) {
            let mut found = BTreeMap::new();
            if let Some(at) = installed(&self.package, specifier) {
                let mut files = Vec::new();
                sources(&at.join("src"), &mut files);
                for file in files {
                    let Ok(text) = fs::read_to_string(&file) else {
                        continue;
                    };
                    for (name, body) in aliases_in(&text) {
                        found.entry(name).or_insert(body);
                    }
                }
            }
            self.installed.insert(key.clone(), found);
        }
        self.installed.get(&key).expect("just inserted")
    }

    /// What one name means where it was written, or nothing where it leads out.
    fn body_of(&mut self, module: &str, name: &str) -> Option<String> {
        if let Some(body) = self.own.get(module).and_then(|one| one.get(name)) {
            return Some(body.clone());
        }
        let specifier = self
            .imported
            .get(module)
            .and_then(|one| one.get(name))
            .cloned()?;
        if specifier.starts_with('.') {
            /* A relative import names a file in this package, and a package's
            own type names are unique across it: the file it points at is a
            barrel as often as the declaration, and following the re-exports
            would answer the same question the whole package already answers. */
            return self
                .own
                .values()
                .find_map(|one| one.get(name))
                .map(ToOwned::to_owned);
        }
        self.package_aliases(&specifier).get(name).cloned()
    }

    /// A written type with every name this can substitute written out.
    fn written(&mut self, module: &str, text: &str) -> Option<String> {
        let parts: Vec<String> = text.split('|').map(|one| one.trim().to_owned()).collect();
        let mut said: Vec<String> = Vec::new();
        let mut changed = false;
        for part in parts {
            if !is_a_name(&part) {
                said.push(part);
                continue;
            }
            match self.body_of(module, &part).as_deref().and_then(literals) {
                Some(values) => {
                    said.push(values);
                    changed = true;
                }
                None => said.push(part),
            }
        }
        changed.then(|| said.join(" | "))
    }

    /// Write out every name a declaration carries, where one resolves.
    ///
    /// The attributes as well as the members: an attribute is written from the
    /// field it stands behind and carries its type, and a reader of markup is
    /// the one who most needs the words.
    pub fn apply(&mut self, module: &str, declaration: &mut Value) {
        for list in ["attributes", "members"] {
            let Some(rows) = declaration.get_mut(list).and_then(Value::as_array_mut) else {
                continue;
            };
            for row in rows {
                let Some(text) = row
                    .get("type")
                    .and_then(|one| one.get("text"))
                    .and_then(Value::as_str)
                else {
                    continue;
                };
                let Some(said) = self.written(module, text) else {
                    continue;
                };
                row["type"]["text"] = Value::String(said);
            }
        }
    }
}
