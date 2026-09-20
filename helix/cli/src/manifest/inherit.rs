//! What a class takes from the class it extends.
//!
//! **Each link above the class in turn, nearest first.** A mixin is a link and
//! not a wrapper to see past: `MixinControllerChecked(MixinField(
//! HelixFormElement))` gives Checkbox members from all three, in that order,
//! which is the prototype chain written down.
//!
//! **The parent's list is copied whole, and that is the rest of the
//! algorithm.** A
//! parent's own list is already itself own-then-inherited, so copying it in
//! order reproduces the chain without walking it: `helix-badge` carries one
//! member of its own and twenty-four from above, six from the headless badge
//! and eighteen from `HelixElement` beneath those, and that is exactly the
//! headless badge's own list appended to the styled one.
//!
//! **A stamp is applied once and never rewritten.** An entry arriving with an
//! `inheritedFrom` already on it keeps the one it has: `tier` reaches the
//! styled badge saying it came from `HelixElement` in core's own module path,
//! not from the headless badge it was copied through. Only an entry that was
//! the parent's own gains a stamp, naming the parent.
//!
//! **A name the child declares itself keeps its own text and is marked all the
//! same.** A styled accordion item describes its `content-inner` part at more
//! length than the headless one does, and the manifest keeps the longer words
//! and calls the part inherited: refining what you were given is not the same
//! as introducing it. Measured across the styled tier, 5,217 members appear in
//! both a class and its parent and not one of them is unmarked.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::{json, Value};

/// The lists that inherit. `attributes` among them: a styled badge carries four
/// and three came from above.
const INHERITS: [&str; 5] = ["attributes", "cssParts", "cssStates", "events", "slots"];

/// Manifests of other packages, by the package name a specifier names them by.
pub type Dependencies = BTreeMap<String, Value>;

/// `@fusion.dev/helix-headless/badge` is the badge entry point of one package.
///
/// A specifier says which module of a package to import, and a manifest speaks
/// for the package, so the subpath is taken off before the lookup. A scoped
/// name keeps two segments and a bare one keeps a single segment.
fn package_of(specifier: &str) -> String {
    let parts: Vec<&str> = specifier.split('/').collect();
    let keep = if specifier.starts_with('@') { 2 } else { 1 };
    parts
        .into_iter()
        .take(keep)
        .collect::<Vec<&str>>()
        .join("/")
}

/// A declaration by name, and the module it was found in, from one manifest.
fn find<'a>(manifest: &'a Value, name: &str) -> Option<(&'a Value, String)> {
    for module in manifest
        .get("modules")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let path = module
            .get("path")
            .and_then(Value::as_str)
            .unwrap_or_default();
        for declaration in module
            .get("declarations")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if declaration.get("name").and_then(Value::as_str) == Some(name) {
                return Some((declaration, path.to_owned()));
            }
        }
    }
    None
}

/// The child's entries, stamped where the parent has them too, then the rest.
///
/// **Declaring a name the parent declares does not make it yours.** A styled
/// accordion item writes its own `@csspart content-inner` with a longer
/// description than the headless one, and the manifest keeps the longer text
/// *and* marks it inherited: the child is refining what it was given rather
/// than introducing something. Measured across the styled tier, 5,217 members
/// appear in both a class and its parent and every one of them is stamped.
///
/// **A stamp names where an entry started, not where it was picked up.** The
/// styled area chart declares `tier` itself and so does the headless one, and
/// the manifest marks the styled one `HelixElement`: the parent was given it
/// too, so the parent is not the answer. An entry the parent owns names the
/// parent; an entry the parent inherited names whatever the parent named.
fn joined(mine: Option<&Value>, theirs: Option<&Value>, from: &Value) -> Option<Value> {
    let theirs: Vec<Value> = theirs
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    /* Where each of the parent's entries came from, which is the parent itself
    unless the parent was given it too. */
    let origin: BTreeMap<&str, Value> = theirs
        .iter()
        .filter_map(|one| {
            let name = one.get("name").and_then(Value::as_str)?;
            Some((
                name,
                one.get("inheritedFrom")
                    .cloned()
                    .unwrap_or_else(|| from.clone()),
            ))
        })
        .collect();

    let mut all: Vec<Value> = Vec::new();
    let mut taken: BTreeSet<String> = BTreeSet::new();
    for entry in mine.and_then(Value::as_array).into_iter().flatten() {
        let name = entry
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default();
        taken.insert(name.to_owned());
        let mut copy = entry.clone();
        if let Some(source) = origin.get(name) {
            if let Some(fields) = copy.as_object_mut() {
                fields
                    .entry("inheritedFrom")
                    .or_insert_with(|| source.clone());
            }
        }
        all.push(copy);
    }
    for entry in theirs {
        let name = entry
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if taken.contains(name) {
            continue;
        }
        let mut copy = entry.clone();
        if let Some(fields) = copy.as_object_mut() {
            fields
                .entry("inheritedFrom")
                .or_insert_with(|| from.clone());
        }
        all.push(copy);
    }
    if all.is_empty() {
        None
    } else {
        Some(json!(all))
    }
}

/// Give a declaration what each link above it has, nearest link first.
///
/// **Every link, not only the base.** `MixinControllerChecked(MixinField(
/// HelixFormElement))` gives Checkbox seven members from the outer mixin,
/// fifteen from the inner and nine from the base, and the manifest lists them
/// in that order, which is the prototype chain. Unwrapping to the base alone
/// dropped twenty-two members and an event from one element.
///
/// Silent where a link is not found. A mixin from a package nobody named is a
/// question this cannot answer, and inventing an empty one would publish a
/// class as having nothing rather than as having something unread.
pub fn apply(declaration: &mut Value, heritage: &[(String, Option<String>)], deps: &Dependencies) {
    for (name, specifier) in heritage {
        let Some(specifier) = specifier else {
            /* Declared in the package being built. Resolving it means that
            package's other modules, which this pass is not given: it works a
            declaration at a time against manifests of packages already
            built. */
            continue;
        };
        let Some(manifest) = deps.get(&package_of(specifier)) else {
            continue;
        };
        let Some((above, module)) = find(manifest, name) else {
            continue;
        };
        let from = json!({ "module": module, "name": name });

        let mut lists: Vec<(&str, Option<Value>)> = vec![(
            "members",
            joined(declaration.get("members"), above.get("members"), &from),
        )];
        for list in INHERITS {
            lists.push((list, joined(declaration.get(list), above.get(list), &from)));
        }
        let Some(fields) = declaration.as_object_mut() else {
            return;
        };
        for (list, value) in lists {
            if let Some(entries) = value {
                fields.insert(list.to_owned(), entries);
            }
        }
    }
}
