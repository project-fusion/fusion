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
//! **A stamp names where an entry started, and the furthest link wins.** An
//! entry arriving with an `inheritedFrom` already on it carries that one down:
//! `tier` reaches the styled badge saying it came from `HelixElement` in
//! core's own module path, not from the headless badge it was copied through.
//! Where two links of one chain both declare a name, it is the further that
//! the stamp names: `requestValue` is declared by `MixinPickerEditing` and
//! again by `MixinControllerValue` beneath it, and the date input says the
//! second. The links are walked nearest first, so the last to claim a name is
//! the one that began it. Only an entry no link above claims gains a stamp
//! naming the parent.
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
///
/// **In `apply-inheritance`'s own order, which is not alphabetical.** A list
/// the class itself never filled is created here, and where a class is given
/// two of them the one this reaches first leads: a headless class given both
/// `attributes` and `members` says `attributes` first.
pub const INHERITS: [&str; 7] = [
    "slots",
    "cssParts",
    "cssProperties",
    "attributes",
    "members",
    "events",
    "cssStates",
];

/// The key a declaration carries what it keeps back of its parent's lists
/// under, from the first pass until inheritance is over: by list, the members
/// it redeclares `@internal` under `members`, and the slots, parts, custom
/// properties, states and events its `@withheld` tags name under each list's
/// own field.
pub const WITHHELD: &str = "_withheld";

/// What a declaration keeps back, by list.
pub type Withheld = BTreeMap<String, BTreeSet<String>>;

/// Takes the withheld names off every declaration, once nothing reads them.
pub fn withheld(declared: &mut [Vec<Value>]) {
    for one in declared.iter_mut().flatten() {
        if let Some(fields) = one.as_object_mut() {
            fields.remove(WITHHELD);
        }
    }
}

/// Whether the child keeps an inherited entry of `list` to itself.
///
/// **A member the child redeclares `@internal` is not inherited either.**
/// Before this, `@internal` hid only the child's own entry and the parent's
/// came back through inheritance, so Copy Button published Button's `type`,
/// `command` and form overrides, which it never uses. The member goes, and the
/// attribute it declares goes with it, matched by the field it names.
///
/// **A slot, part, custom property, state or event goes by its name**, where
/// the child's class doc names it with `@withheld`: Copy Button's `start` and
/// `end` slots and its `text` part, which it does not render.
fn kept_back(entry: &Value, list: &str, withheld: &Withheld) -> bool {
    let (from, key) = match list {
        "members" => ("members", "name"),
        "attributes" => ("members", "fieldName"),
        other => (other, "name"),
    };
    withheld.get(from).is_some_and(|names| {
        entry
            .get(key)
            .and_then(Value::as_str)
            .is_some_and(|name| names.contains(name))
    })
}

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
/// One entry of a parent's list, read where it started rather than where it
/// was picked up.
///
/// **An entry the parent was given is taken from whoever gave it.** The styled
/// color input inherits `anchor` through the headless one, which declares
/// `anchor` itself at some length and carries a stamp saying `MixinPickerField`
/// all the same. The manifest gives the styled class the mixin's words, not the
/// headless class's: a stamp names the origin, and the origin is where the
/// entry is read from. Twenty of styled's descriptions differ this way and
/// every one of them matches the origin's, with none matching the parent's.
///
/// The stamp itself is kept, because it is already the origin's.
///
/// All twenty-four entries in the library whose parent and origin disagree
/// read correctly this way. Three earlier attempts read seven, twenty and
/// twenty-two of them: the pair that settled it was the styled date input and
/// the styled date picker, which inherit `requestValue` from parents whose
/// entries are identical, from the same origin, and which the analyzer
/// resolves differently. What tells them apart is the parent's own mixins.
fn at_origin(entry: &Value, link: &Link<'_>) -> Value {
    let Link {
        declaration: above,
        list,
        deps,
        ours: mine,
        wrapped,
        ..
    } = *link;
    /* **A mixin of the child's puts the class above it back in the chain.**
    The styled copy button extends `MixinControlSurface(HelixHeadlessCopyButton)`
    and takes the headless copy button's own `'Copy'` for `label`, where a
    child extending its parent outright reads past the parent's own words to
    whatever gave them to it. Two entries in the library reach a child this
    way and both take the parent's. */
    if wrapped {
        return entry.clone();
    }
    let Some(stamp) = entry.get("inheritedFrom") else {
        return entry.clone();
    };
    /* **The nearest of the parent's mixins that names it, not the furthest.**
    The stamp says where an entry started and the words are whoever last wrote
    them: `requestValue` is declared by `MixinControllerValue` and again by
    `MixinPickerEditing` above it, the date input's stamp says the first and
    its sentence is the second's. Twenty-four entries in the library have a
    parent and an origin that disagree and this reads all of them. */
    let wanted = entry
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let nearest = above
        .get("mixins")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|one| one.get("name")?.as_str())
        .find_map(|name| {
            let found = deps
                .values()
                .chain(std::iter::once(mine))
                .find_map(|manifest| named_in(manifest, name))?;
            found
                .get(list)?
                .as_array()?
                .iter()
                .find(|two| two.get("name").and_then(Value::as_str) == Some(wanted))
                .cloned()
        });
    if let Some(found) = nearest {
        let mut copy = found;
        if let Some(fields) = copy.as_object_mut() {
            if let Some(said) = entry.as_object() {
                for (key, value) in said {
                    fields.entry(key.clone()).or_insert_with(|| value.clone());
                }
            }
            fields.insert("inheritedFrom".to_owned(), stamp.clone());
        }
        return copy;
    }
    let (Some(module), Some(name)) = (
        stamp.get("module").and_then(Value::as_str),
        stamp.get("name").and_then(Value::as_str),
    ) else {
        return entry.clone();
    };
    let wanted = entry
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or_default();
    for manifest in deps.values().chain(std::iter::once(mine)) {
        let Some(declaration) = declared_at(manifest, module, name) else {
            continue;
        };
        let Some(found) = declaration
            .get(list)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .find(|one| one.get("name").and_then(Value::as_str) == Some(wanted))
        else {
            continue;
        };
        /* **What the origin says, filled in from what came through.** The
        origin's entry is the one to read, and it is not always the fuller of
        the two: the analyzer infers `input` on `MixinControllerChecked` as a
        bare name and a type, while the checkbox below it carries the sentence
        an `@event` tag wrote and the React prop. Replacing outright lost
        those; only what the origin does not say is taken from the parent. */
        let mut copy = found.clone();
        if let Some(fields) = copy.as_object_mut() {
            if let Some(said) = entry.as_object() {
                for (key, value) in said {
                    fields.entry(key.clone()).or_insert_with(|| value.clone());
                }
            }
            fields.insert("inheritedFrom".to_owned(), stamp.clone());
        }
        return copy;
    }
    entry.clone()
}

/// The declaration of that name, wherever in the manifest it sits.
fn named_in<'a>(manifest: &'a Value, name: &str) -> Option<&'a Value> {
    manifest
        .get("modules")?
        .as_array()?
        .iter()
        .filter_map(|one| one.get("declarations").and_then(Value::as_array))
        .flatten()
        .find(|one| one.get("name").and_then(Value::as_str) == Some(name))
}

/// The declaration of that name in that module, where the manifest holds one.
fn declared_at<'a>(manifest: &'a Value, module: &str, name: &str) -> Option<&'a Value> {
    manifest
        .get("modules")?
        .as_array()?
        .iter()
        .find(|one| one.get("path").and_then(Value::as_str) == Some(module))?
        .get("declarations")?
        .as_array()?
        .iter()
        .find(|one| one.get("name").and_then(Value::as_str) == Some(name))
}

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
/// What one link of a chain is, for the sake of joining its lists in.
struct Link<'a> {
    /// The declaration the link names.
    declaration: &'a Value,
    /// The stamp an entry of its own earns.
    from: &'a Value,
    /// Which list is being joined, the same one on both sides.
    list: &'a str,
    deps: &'a Dependencies,
    /// This package's own manifest, which is a dependency to its own classes.
    ours: &'a Value,
    /// Whether a mixin of the child's stands between it and this link.
    wrapped: bool,
}

fn joined(
    mine: Option<&Value>,
    theirs: Option<&Value>,
    link: &Link<'_>,
    withheld: &Withheld,
) -> Option<Value> {
    let Link { from, list, .. } = *link;
    let theirs: Vec<Value> = theirs
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|one| !kept_back(one, list, withheld))
        /* **An entry with no name is not passed down.** The analyzer infers an
        event on `MixinControllerActive` from a `dispatchEvent` it could not
        name, and the four classes below it carry no such event: a nameless
        entry is a record of what the analyzer saw rather than anything a
        consumer can reach. A name that is present and empty is different and
        stays, the default slot being written that way. */
        .filter(|one| one.get("name").is_some())
        .map(|one| at_origin(one, link))
        .collect();
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
            /* **A redeclared member is filled in from the one above it, and
            laid over it.** A styled component writes `static override tier =
            'helix-'` and says nothing else about it; the manifest carries that
            default beside the description and the type the base wrote, because
            a consumer reading the child is owed what the field means and the
            child only changed what it is. Everything the child does say
            stands: only what it left out is filled.
            *
            The one above goes first, which is what decides the order rather
            than the content: an `input` event a checkbox declares and the
            mixin under it dispatches comes out named before it is typed,
            because that is how the mixin has it. */
            let mut merged = (*parent).clone();
            if let (Some(fields), Some(said)) = (merged.as_object_mut(), entry.as_object()) {
                for (key, value) in said {
                    fields.insert(key.clone(), value.clone());
                }
            }
            copy = merged;
            if let Some(fields) = copy.as_object_mut() {
                /* **The furthest link wins, because a stamp names where an
                entry started.** `requestValue` is declared by
                `MixinPickerEditing` and again by `MixinControllerValue`
                further down the same chain, and the date input's says the
                second. The links are walked nearest first, so the last to
                claim the name is the one that began it. */
                fields.insert(
                    "inheritedFrom".to_owned(),
                    parent
                        .get("inheritedFrom")
                        .cloned()
                        .unwrap_or_else(|| from.clone()),
                );
            }
        }
        all.push(copy);
    }
    /* **The parent's list is regrouped, not appended whole.** A parent writes
    its own entries first and what its mixins gave it after; a child reading
    that parent takes the mixins' first, in the order the parent applied them,
    and everything else after. `AccordionItem` is the plain case: the headless
    item lists seven of its own and then six from `MixinControllerOpen`, and
    the styled item lists the six first. See `regroup`, which says which mixin
    a given entry counts as coming from and why that is not its stamp. */
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
    regroup(&mut rest, link);
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
pub fn sign(entry: &mut Value) {
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
            let written = match one.get("type").and_then(|two| two.get("text")) {
                Some(Value::String(text)) => format!("{said}{mark}: {text}"),
                _ => format!("{said}{mark}"),
            };
            /* A default stands in the signature, the same way it does where a
            method is declared: `markRead(next = true) => boolean` is how a
            caller would write the call it may leave out. */
            Some(match one.get("default").and_then(Value::as_str) {
                Some(value) => format!("{written} = {value}"),
                None => written,
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
    fields.insert(
        "type".to_owned(),
        json!({ "text": crate::manifest::parse::signature(name, &taken, &returns) }),
    );
}

pub fn apply(
    declaration: &mut Value,
    heritage: &[(String, Option<String>)],
    deps: &Dependencies,
    mine: &Value,
    is_element: bool,
) {
    /* A mixin of the child's stands between it and everything below, which
    changes how an entry reaching it is read. The base class is the last link
    and anything before it is a mixin this class applied. */
    let wrapped = heritage.len() > 1;
    let withheld: Withheld = declaration
        .get(WITHHELD)
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .map(|(list, names)| {
            let names = names
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(|one| one.as_str().map(str::to_owned))
                .collect();
            (list.clone(), names)
        })
        .collect();
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

        let link = |list: &'static str| Link {
            declaration: above,
            from: &from,
            list,
            deps,
            ours: mine,
            wrapped,
        };
        let lists: Vec<(&str, Option<Value>)> = INHERITS
            .into_iter()
            .map(|list| {
                (
                    list,
                    joined(
                        declaration.get(list),
                        above.get(list),
                        &link(list),
                        &withheld,
                    ),
                )
            })
            .collect();
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
            sign(member);
        }
    }
}

/// A parent's inherited entries put in the order a child reads them.
///
/// **By the mixin that wrote each entry, in the order the parent applied
/// them.** The styled date input lists `MixinPickerEditing`'s five first, in
/// that mixin's own order, then `MixinPickerField`'s twelve, and so on down
/// the parent's list; what no mixin of the parent's wrote follows, keeping the
/// place the parent had it in.
///
/// Which mixin wrote an entry is not what its stamp says. `requestValue` is
/// stamped `MixinControllerValue`, which is where it started, and sits third
/// among `MixinPickerEditing`'s, which is where it was last written. Grouping
/// by the stamp put it at the head of a group of its own and moved forty-two
/// of the date input's hundred and fourteen members.
fn regroup(rest: &mut [Value], link: &Link<'_>) {
    rest.sort_by_key(|entry| match wrote(entry, link) {
        Some(at) => (0, at),
        /* A constant key, so a stable sort leaves these where the parent had
        them. */
        None => (1, (usize::MAX, usize::MAX)),
    });
}

/// Which of the parent's mixins last wrote an entry, and where in its list.
fn wrote(entry: &Value, link: &Link<'_>) -> Option<(usize, usize)> {
    let wanted = entry.get("name").and_then(Value::as_str)?;
    link.declaration
        .get("mixins")
        .and_then(Value::as_array)?
        .iter()
        .enumerate()
        .find_map(|(which, one)| {
            let name = one.get("name")?.as_str()?;
            let found = link
                .deps
                .values()
                .chain(std::iter::once(link.ours))
                .find_map(|manifest| named_in(manifest, name))?;
            let at = found
                .get(link.list)?
                .as_array()?
                .iter()
                .position(|two| two.get("name").and_then(Value::as_str) == Some(wanted))?;
            Some((which, at))
        })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{kept_back, withheld, Withheld, WITHHELD};

    #[test]
    fn a_member_redeclared_internal_keeps_its_row_and_its_attribute_back() {
        let names: Withheld = [("members".to_owned(), ["type".to_owned()].into())].into();
        assert!(kept_back(&json!({ "name": "type" }), "members", &names));
        assert!(kept_back(
            &json!({ "name": "type", "fieldName": "type" }),
            "attributes",
            &names
        ));
        assert!(!kept_back(&json!({ "name": "value" }), "members", &names));
        /* An attribute observed through an internal field names no field, and
        stays: `aria-label` through `namedBy`. */
        assert!(!kept_back(
            &json!({ "name": "aria-label" }),
            "attributes",
            &names
        ));
        assert!(!kept_back(&json!({ "name": "type" }), "slots", &names));
    }

    /* Copy Button published Button's `start` and `end` slots and `text`
    part, which it does not render. */
    #[test]
    fn a_withheld_slot_or_part_keeps_only_that_list_back() {
        let names: Withheld = [
            ("slots".to_owned(), ["start".to_owned()].into()),
            ("cssParts".to_owned(), ["text".to_owned()].into()),
        ]
        .into();
        assert!(kept_back(&json!({ "name": "start" }), "slots", &names));
        assert!(kept_back(&json!({ "name": "text" }), "cssParts", &names));
        assert!(!kept_back(&json!({ "name": "end" }), "slots", &names));
        assert!(!kept_back(&json!({ "name": "start" }), "cssParts", &names));
        assert!(!kept_back(&json!({ "name": "text" }), "members", &names));
    }

    #[test]
    fn the_withheld_names_are_taken_off_once_inheritance_is_over() {
        let mut declared = vec![vec![
            json!({ "name": "A", WITHHELD: { "members": ["type"] } }),
        ]];
        withheld(&mut declared);
        assert_eq!(declared[0][0], json!({ "name": "A" }));
    }
}
