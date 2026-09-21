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

/// The lists that inherit, which is every list a declaration carries.
///
/// `attributes` among them, a styled badge carrying four of which three came
/// from above; and `cssProperties`, which a styled heatmap takes from the
/// headless one so a consumer setting `--heatmap-tone-1` finds it documented on
/// the element they are actually using.
const INHERITS: [&str; 6] = [
    "attributes",
    "cssParts",
    "cssProperties",
    "cssStates",
    "events",
    "slots",
];

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
fn joined(
    mine: Option<&Value>,
    theirs: Option<&Value>,
    above: &Value,
    from: &Value,
) -> Option<Value> {
    let theirs: Vec<Value> = theirs
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    /* The parent's entries by name, for filling in a member the child
    redeclared and for saying where each came from. */
    let above_by_name: BTreeMap<&str, &Value> = theirs
        .iter()
        .filter_map(|one| Some((one.get("name")?.as_str()?, one)))
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
        if let Some(parent) = above_by_name.get(name) {
            if let Some(fields) = copy.as_object_mut() {
                /* **A redeclared member is filled in from the one above it.**
                A styled component writes `static override tier = 'helix-'` and
                says nothing else about it; the manifest carries that default
                beside the description and the type the base wrote, because a
                consumer reading the child is owed what the field means and the
                child only changed what it is. Everything the child does say
                stands: only what it left out is filled. */
                if let Some(said) = parent.as_object() {
                    for (key, value) in said {
                        if key != "name" {
                            fields.entry(key.clone()).or_insert_with(|| value.clone());
                        }
                    }
                }
                fields.entry("inheritedFrom").or_insert_with(|| {
                    parent
                        .get("inheritedFrom")
                        .cloned()
                        .unwrap_or_else(|| from.clone())
                });
            }
        }
        all.push(copy);
    }
    /* **The parent's list is regrouped, not appended whole.** A parent writes
    its own entries first and what its mixins gave it after; a child reading
    that parent takes the mixins' first and the parent's own after them.
    `AccordionItem` is the plain case: the headless item lists seven of its own
    and then six from `MixinControllerOpen`, and the styled item lists the six
    first. Measured, not guessed, and three models were tried before this one.

    Deeper entries, from further up than the parent, keep their place at the
    end: the order is one pass per ancestor, nearest first, and within each the
    mixins come before the class. */
    let mixins: BTreeSet<&str> = above
        .get("mixins")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|one| one.get("name")?.as_str())
        .collect();
    let rank = |entry: &Value| match entry.get("inheritedFrom").and_then(|one| one.get("name")) {
        None => 1,
        Some(Value::String(from)) if mixins.contains(from.as_str()) => 0,
        _ => 2,
    };
    let mut rest: Vec<Value> = theirs
        .into_iter()
        .filter(|entry| {
            !taken.contains(
                entry
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or_default(),
            )
        })
        .collect();
    rest.sort_by_key(rank);
    for entry in rest {
        let mut copy = entry;
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
/// A method's signature, written where the member lands rather than where it
/// was declared.
///
/// **The analyzer computes this at the consuming class.** `MixinControllerOpen`
/// declares `requestOpen` and carries no type for it, being a plain class; the
/// element that inherits it has `requestOpen(next: boolean) => boolean`. So a
/// signature is not copied along with a member, it is written when the member
/// arrives somewhere that publishes one.
fn signed(entry: &mut Value) {
    let Some(fields) = entry.as_object_mut() else {
        return;
    };
    if fields.get("kind").and_then(Value::as_str) != Some("method")
        || fields.contains_key("type")
        || fields.contains_key("privacy")
    {
        return;
    }
    let Some(name) = fields.get("name").and_then(Value::as_str) else {
        return;
    };
    let taken: Vec<String> = fields
        .get("parameters")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|one| {
            let said = one.get("name")?.as_str()?;
            /* The mark travels with the parameter, the same way it does when a
            signature is written where the method is declared. */
            let mark = if one.get("optional").and_then(Value::as_bool) == Some(true) {
                "?"
            } else {
                ""
            };
            Some(match one.get("type").and_then(|two| two.get("text")) {
                Some(Value::String(text)) => format!("{said}{mark}: {text}"),
                _ => format!("{said}{mark}"),
            })
        })
        .collect();
    let returns = fields
        .get("return")
        .and_then(|one| one.get("type"))
        .and_then(|one| one.get("text"))
        .and_then(Value::as_str)
        .unwrap_or("void")
        .to_owned();
    let written = format!("{name}({}) => {returns}", taken.join(", "));
    fields.insert("type".to_owned(), json!({ "text": written }));
}

pub fn apply(
    declaration: &mut Value,
    heritage: &[(String, Option<String>)],
    deps: &Dependencies,
    mine: &Value,
    is_element: bool,
) {
    for (name, specifier) in heritage {
        /* **A relative import, or none at all, is this package's own.** Both
        resolve against the manifest the first pass wrote, which holds every
        declaration this package makes and is to them exactly what a
        dependency's manifest is to the classes that import it:
        `HelixFormElement extends HelixElement` through
        `../helix-element/helix-element.js`, and until every module had been
        read there was nothing to resolve it in. */
        let manifest = match specifier {
            Some(one) if !one.starts_with('.') => match deps.get(&package_of(one)) {
                Some(found) => found,
                None => continue,
            },
            _ => mine,
        };
        let Some((above, module)) = find(manifest, name) else {
            continue;
        };
        /* **Descending from `HelixElement` is what makes a component**, and
        that is a different test from carrying a tag. The analyzer marks
        `customElement` for a class with the decorator or Lit's own base, and
        stamps the `helix` block on anything descending from this library's
        root: `HelixFormElement` has the second and not the first, which is
        why the two cannot be read off one another. Taken from the parent so
        a chain of any length reaches the same answer. */
        if let Some(tier) = above
            .get("helix")
            .and_then(|one| one.get("tier"))
            .and_then(Value::as_str)
        {
            if let Some(fields) = declaration.as_object_mut() {
                let block = fields.entry("helix").or_insert_with(|| json!({}));
                if let Some(inside) = block.as_object_mut() {
                    inside.entry("tier").or_insert_with(|| json!(tier));
                }
            }
        }
        let from = json!({ "module": module, "name": name });

        let mut lists: Vec<(&str, Option<Value>)> = vec![(
            "members",
            joined(
                declaration.get("members"),
                above.get("members"),
                above,
                &from,
            ),
        )];
        for list in INHERITS {
            lists.push((
                list,
                joined(declaration.get(list), above.get(list), above, &from),
            ));
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
    if !is_element {
        return;
    }
    if let Some(members) = declaration.get_mut("members").and_then(Value::as_array_mut) {
        for member in members {
            signed(member);
        }
    }
}
