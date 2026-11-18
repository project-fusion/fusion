//! A family's design guidance says when to use it, names real families to use
//! instead, and numbers parts the family publishes.
//!
//! **Three tags on the family's root**, in the grammar `@slot` already uses.
//! `@use` names a situation the family is for. `@instead <family> - <when>`
//! names another family and the situation it is for. `@anatomy` lists the
//! parts, slots, and csspart names that matter most, and a `?` marks one as
//! optional. The manifest carries them, and the reference page, the family's
//! `.md` and `.json`, `helix api`, and the MCP server read them from there, so
//! a person and an agent read the same lines.
//!
//! **What this holds is what a family declares.**
//!
//! - At most three `@use` and three `@instead`. A fourth case usually means the
//!   family does two jobs, which is a design question a longer list does not
//!   answer.
//! - Every `@instead` names a family the catalog has, other than the family
//!   itself, and says when to use it. A line that names no real family leaves
//!   you with no answer.
//! - Every `@anatomy` name is a slot, a csspart, or a part the family
//!   publishes, so the numbered legend can never point at nothing.
//! - Guidance sits on the family's root, and two roots that both declare it say
//!   the same thing, as `aliases` holds the two lists of aliases to one.
//!
//! **Shared aliases are notes for now.** An alias two families share is where
//! you already pick the wrong family: "Dropdown" leads to Menu and to Select.
//! Each pair is settled by an `@instead` between the two families, or by
//! dropping the alias from one of them. Until every family has guidance, an
//! unsettled pair is counted work, and the same is true of a stable family
//! with no guidance at all. Once the last category is written, both become
//! findings.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use crate::component::{Context, Finding, Report};

/// The most `@use` or `@instead` lines a family writes.
const MOST: usize = 3;

/// What one root declares.
#[derive(Clone, Debug, Default, PartialEq)]
struct Guidance {
    uses: Vec<String>,
    /// Each line's family and, where the line has one, its description.
    instead: Vec<(String, Option<String>)>,
    /// Each name, and whether it is marked optional.
    anatomy: Vec<(String, bool)>,
}

impl Guidance {
    fn read(helix: &Value) -> Self {
        let strings = |key: &str| -> Vec<String> {
            helix[key]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        };
        Self {
            uses: strings("use"),
            instead: helix["instead"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|one| {
                    (
                        one["family"].as_str().unwrap_or_default().to_owned(),
                        one["description"].as_str().map(str::to_owned),
                    )
                })
                .collect(),
            anatomy: helix["anatomy"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|one| {
                    (
                        one["name"].as_str().unwrap_or_default().to_owned(),
                        one["optional"] == true,
                    )
                })
                .collect(),
        }
    }

    fn is_empty(&self) -> bool {
        self.uses.is_empty() && self.instead.is_empty() && self.anatomy.is_empty()
    }
}

/// What the rule knows about one family, read from every layer.
#[derive(Debug, Default)]
struct Family {
    /// Each root's guidance, by the root's tag, where it declares any.
    roots: BTreeMap<String, Guidance>,
    /// Whether any layer has the family's root, which is what makes it a family.
    rooted: bool,
    /// The names an `@anatomy` may use: slots, csspart names, and part folders.
    names: BTreeSet<String>,
    /// Every alias any element of the family declares, lowercased.
    aliases: BTreeSet<String>,
    /// Whether a root says `@status stable`.
    stable: bool,
    /// Elements other than a root that declare guidance, by tag.
    stray: Vec<String>,
}

pub fn run(context: &Context) -> Report {
    let mut families: BTreeMap<String, Family> = BTreeMap::new();
    for layer in &context.settings.layers {
        let source = context.root.join(&layer.source);
        let Some(value) = context.manifest(&source) else {
            continue;
        };
        read(value, &layer.prefix, &mut families);
    }
    let (findings, notes) = judged(&families);
    Report {
        checked: families
            .values()
            .filter(|one| one.roots.values().any(|said| !said.is_empty()))
            .count(),
        findings,
        notes,
        unit: "families with guidance",
    }
}

/// One layer's manifest, folded into what the rule knows about each family.
fn read(value: &Value, prefix: &str, families: &mut BTreeMap<String, Family>) {
    for module in value
        .get("modules")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let path = module.get("path").and_then(Value::as_str).unwrap_or("");
        let segments: Vec<&str> = path.split('/').collect();
        let Some(slug) = segments.get(1).copied() else {
            continue;
        };
        for declaration in module
            .get("declarations")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                continue;
            };
            let helix = declaration.get("helix").cloned().unwrap_or(Value::Null);
            /* **The family an element joins, from `@family` first**, which is
            how the catalog files an element whose folder cannot say it. */
            let slug = helix["family"].as_str().unwrap_or(slug).to_owned();
            let family = families.entry(slug.clone()).or_default();
            for list in ["slots", "cssParts"] {
                for one in declaration
                    .get(list)
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    if let Some(name) = one
                        .get("name")
                        .and_then(Value::as_str)
                        .filter(|name| !name.is_empty())
                    {
                        family.names.insert(name.to_owned());
                    }
                }
            }
            /* `src/<family>/<part>/<file>.ts`, whose folder is the part's name. */
            if let [_, _, part, _] = segments.as_slice() {
                family.names.insert((*part).to_owned());
            }
            for alias in helix["aliases"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
            {
                family.aliases.insert(alias.trim().to_lowercase());
            }
            let said = Guidance::read(&helix);
            if tag == format!("{prefix}{slug}") {
                family.rooted = true;
                family.stable |= helix["status"] == "stable";
                if !said.is_empty() {
                    family.roots.insert(tag.to_owned(), said);
                }
            } else if !said.is_empty() {
                family.stray.push(tag.to_owned());
            }
        }
    }
}

/// What every family's guidance gets wrong, and the work still to do.
fn judged(families: &BTreeMap<String, Family>) -> (Vec<Finding>, Vec<String>) {
    let real: BTreeSet<&str> = families
        .iter()
        .filter(|(_, one)| one.rooted)
        .map(|(slug, _)| slug.as_str())
        .collect();
    let mut findings = Vec::new();
    for (slug, family) in families {
        for tag in &family.stray {
            findings.push(Finding {
                detail: "The catalog reads a family's guidance from its root, so guidance on any \
                         other element reaches no page. Move it to the root."
                    .to_owned(),
                file: slug.clone(),
                message: format!("{tag} declares guidance and is not the family's root"),
            });
        }
        for (tag, said) in &family.roots {
            findings.extend(declared(slug, tag, said, family, &real));
        }
        let mut roots = family.roots.iter();
        if let (Some((first_tag, first)), Some((tag, other))) = (roots.next(), roots.next()) {
            if first != other {
                findings.push(Finding {
                    detail: "The catalog publishes the styled root's guidance where it has any, \
                             so the other root's lines are a second answer nobody reads. Write \
                             the same lines on both roots, or on one."
                        .to_owned(),
                    file: slug.clone(),
                    message: format!("{first_tag} and {tag} declare different guidance"),
                });
            }
        }
    }
    (findings, notes(families))
}

/// What is wrong with one root's guidance.
fn declared(
    slug: &str,
    tag: &str,
    said: &Guidance,
    family: &Family,
    real: &BTreeSet<&str>,
) -> Vec<Finding> {
    let mut findings = Vec::new();
    let fault = |message: String, detail: &str| Finding {
        detail: detail.to_owned(),
        file: slug.to_owned(),
        message: format!("{tag} {message}"),
    };
    for (key, count) in [("@use", said.uses.len()), ("@instead", said.instead.len())] {
        if count > MOST {
            findings.push(fault(
                format!("writes {count} {key} lines, and the most is {MOST}"),
                "A fourth case usually means the family does two jobs, which is a design \
                 question. Keep the three cases you meet most.",
            ));
        }
    }
    let mut named = BTreeSet::new();
    for (other, description) in &said.instead {
        if other == slug {
            findings.push(fault(
                format!("names its own family, `{other}`, in an @instead"),
                "An @instead names another family. Remove the line.",
            ));
        } else if !real.contains(other.as_str()) {
            findings.push(fault(
                format!("names `{other}` in an @instead, and no family has that slug"),
                "An @instead names a family by its slug, such as `select`, so the page can \
                 link to it. Use the slug of a family Helix ships.",
            ));
        }
        if description.is_none() {
            findings.push(fault(
                format!("names `{other}` in an @instead without saying when to use it"),
                "Write the line as `@instead <family> - <when>`, with the situation the other \
                 family is for after the dash.",
            ));
        }
        if !named.insert(other.as_str()) {
            findings.push(fault(
                format!("names `{other}` in two @instead lines"),
                "Each @instead names a different family. Join the two situations in one line.",
            ));
        }
    }
    for (name, _) in &said.anatomy {
        if !family.names.contains(name) {
            findings.push(fault(
                format!("lists `{name}` in its @anatomy, and the family publishes no part, slot, or csspart by that name"),
                "The anatomy legend numbers parts the family publishes. Use the name of a \
                 slot, a csspart, or a part folder.",
            ));
        }
    }
    findings
}

/// The shared aliases no family has settled, and the stable families with no
/// guidance, as counted work.
fn notes(families: &BTreeMap<String, Family>) -> Vec<String> {
    let mut sharing: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
    for (slug, family) in families {
        for alias in &family.aliases {
            sharing
                .entry(alias.as_str())
                .or_default()
                .push(slug.as_str());
        }
    }
    let names = |family: &str, other: &str| {
        families.get(family).is_some_and(|one| {
            one.roots
                .values()
                .any(|said| said.instead.iter().any(|(named, _)| named == other))
        })
    };
    let mut notes = Vec::new();
    for (alias, slugs) in &sharing {
        for (at, one) in slugs.iter().enumerate() {
            for other in &slugs[at + 1..] {
                if names(one, other) || names(other, one) {
                    continue;
                }
                notes.push(format!(
                    "`{alias}` is an alias of `{one}` and `{other}`, and neither names the other \
                     in an @instead. Add one, or drop the alias from one family."
                ));
            }
        }
    }
    let unguided: Vec<&str> = families
        .iter()
        .filter(|(_, one)| one.rooted && one.stable && one.roots.is_empty())
        .map(|(slug, _)| slug.as_str())
        .collect();
    if !unguided.is_empty() {
        notes.push(format!(
            "{} stable families write no guidance yet, which this rule will require once every \
             category is written",
            unguided.len()
        ));
    }
    notes
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde_json::json;

    use super::{judged, read, Family};

    fn families(declarations: &[(&str, serde_json::Value)]) -> BTreeMap<String, Family> {
        let modules: Vec<serde_json::Value> = declarations
            .iter()
            .map(|(path, declaration)| json!({ "path": path, "declarations": [declaration] }))
            .collect();
        let mut found = BTreeMap::new();
        read(&json!({ "modules": modules }), "helix-", &mut found);
        found
    }

    fn menu(helix: &serde_json::Value) -> (&'static str, serde_json::Value) {
        (
            "src/menu/root/menu-root.ts",
            json!({
                "tagName": "helix-menu",
                "slots": [{ "name": "trigger" }],
                "cssParts": [{ "name": "surface" }],
                "helix": helix,
            }),
        )
    }

    fn select(helix: &serde_json::Value) -> (&'static str, serde_json::Value) {
        (
            "src/select/root/select-root.ts",
            json!({ "tagName": "helix-select", "helix": helix }),
        )
    }

    #[test]
    fn guidance_that_names_real_families_and_parts_is_clean() {
        let read = families(&[
            menu(&json!({
                "use": ["Commands that act at once."],
                "instead": [{ "family": "select", "description": "A value a form submits." }],
                "anatomy": [{ "name": "trigger" }, { "name": "surface", "optional": true }],
            })),
            select(&json!({})),
        ]);
        let (findings, notes) = judged(&read);
        assert!(
            findings.is_empty(),
            "{:?}",
            findings.iter().map(|one| &one.message).collect::<Vec<_>>()
        );
        assert!(notes.is_empty(), "{notes:?}");
    }

    #[test]
    fn an_unknown_family_a_missing_description_and_an_unknown_part_are_findings() {
        let read = families(&[
            menu(&json!({
                "instead": [{ "family": "dropdown" }, { "family": "menu", "description": "No." }],
                "anatomy": [{ "name": "thumb" }],
            })),
            select(&json!({})),
        ]);
        let (findings, _) = judged(&read);
        let messages: Vec<&str> = findings.iter().map(|one| one.message.as_str()).collect();
        assert!(
            messages
                .iter()
                .any(|one| one.contains("no family has that slug")),
            "{messages:?}"
        );
        assert!(
            messages
                .iter()
                .any(|one| one.contains("without saying when")),
            "{messages:?}"
        );
        assert!(
            messages.iter().any(|one| one.contains("its own family")),
            "{messages:?}"
        );
        assert!(
            messages.iter().any(|one| one.contains("`thumb`")),
            "{messages:?}"
        );
    }

    #[test]
    fn four_uses_is_one_too_many() {
        let read = families(&[menu(&json!({ "use": ["A.", "B.", "C.", "D."] }))]);
        let (findings, _) = judged(&read);
        assert_eq!(findings.len(), 1);
        assert!(findings[0].message.contains("writes 4 @use lines"));
    }

    #[test]
    fn two_roots_that_disagree_are_a_finding() {
        let mut read = families(&[menu(&json!({ "use": ["Commands."] }))]);
        let mut headless = BTreeMap::new();
        super::read(
            &json!({ "modules": [{
                "path": "src/menu/root/menu-root.ts",
                "declarations": [{ "tagName": "helix-headless-menu", "helix": { "use": ["Actions."] } }],
            }] }),
            "helix-headless-",
            &mut headless,
        );
        for (slug, family) in headless {
            read.entry(slug).or_default().roots.extend(family.roots);
        }
        let (findings, _) = judged(&read);
        assert_eq!(findings.len(), 1);
        assert!(findings[0].message.contains("declare different guidance"));
    }

    #[test]
    fn a_shared_alias_is_a_note_until_one_family_names_the_other() {
        let open = families(&[
            menu(&json!({ "aliases": ["Dropdown"] })),
            select(&json!({ "aliases": ["Dropdown"] })),
        ]);
        let (_, notes) = judged(&open);
        assert_eq!(notes.len(), 1, "{notes:?}");
        assert!(notes[0].contains("`dropdown`"));

        let settled = families(&[
            menu(&json!({
                "aliases": ["Dropdown"],
                "instead": [{ "family": "select", "description": "A value a form submits." }],
            })),
            select(&json!({ "aliases": ["Dropdown"] })),
        ]);
        let (_, notes) = judged(&settled);
        assert!(notes.is_empty(), "{notes:?}");
    }

    #[test]
    fn guidance_on_a_part_is_a_finding() {
        let read = families(&[
            menu(&json!({})),
            (
                "src/menu/item/menu-item.ts",
                json!({ "tagName": "helix-menu-item", "helix": { "use": ["A command."] } }),
            ),
        ]);
        let (findings, _) = judged(&read);
        assert_eq!(findings.len(), 1);
        assert!(findings[0].message.contains("is not the family's root"));
    }
}
