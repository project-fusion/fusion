//! What the code uses of Helix, counted as the page counts it.
//!
//! **The page's counts, from the code.** `usage.ts` counts the elements a page
//! renders, the axes and slots set on them, and the parts and hooks its
//! stylesheets reach for. A scan counts the same things in every file. An
//! element written once in a template counts once, however many times it
//! renders, so a scan's usage says it was `scanned`.

use std::collections::{BTreeMap, HashMap};

use serde_json::{json, Value};

use super::analyze::{parts, targets};
use super::css::StyleRule;
use super::lint::Index;
use super::markup::{Element, Value as Written};

/// The axes counted, which are the visual axes every styled family shares.
const AXES: [&str; 4] = ["emphasis", "material", "separation", "tone"];

/// The diagnostics overlay, which the page leaves out of everything it counts.
const OVERLAY: &str = "helix-diagnostics-overlay";

/// The longest hook value kept, in UTF-16 code units, as the page cuts it, so
/// a gradient or a data URL cannot swell a run.
const LONGEST: usize = 200;

type Counts = BTreeMap<String, u64>;

/// The counts so far.
#[derive(Debug, Default)]
pub struct Usage {
    axes: BTreeMap<String, BTreeMap<String, Counts>>,
    composed: Counts,
    hook_values: BTreeMap<String, BTreeMap<String, Counts>>,
    hooks: BTreeMap<String, Counts>,
    parts: BTreeMap<String, Counts>,
    slots: BTreeMap<String, Counts>,
    tags: Counts,
    unlisted: Counts,
}

fn bump(into: &mut Counts, key: &str) {
    *into.entry(key.to_owned()).or_default() += 1;
}

/// A value cut at `LONGEST` UTF-16 code units, never inside a character.
fn cut(value: &str) -> &str {
    let mut units = 0;
    for (at, one) in value.char_indices() {
        units += one.len_utf16();
        if units > LONGEST {
            return &value[..at];
        }
    }
    value
}

impl Usage {
    /// Counts the elements one template writes. `own` is whether the
    /// template is a Helix element's own, whose elements are `composed`.
    pub fn elements(&mut self, elements: &[Element], index: &Index, own: bool) {
        let mut counted = vec![false; elements.len()];
        for (at, element) in elements.iter().enumerate() {
            let tag = element.tag.as_str();
            if !tag.starts_with("helix-") || tag == OVERLAY {
                continue;
            }
            if index.get(tag).is_none() {
                bump(&mut self.unlisted, tag);
                continue;
            }
            if own {
                bump(&mut self.composed, tag);
                continue;
            }
            counted[at] = true;
            bump(&mut self.tags, tag);
            for axis in AXES {
                let set = element
                    .attributes
                    .iter()
                    .find(|one| one.name == axis)
                    .map(|one| &one.value);
                if let Some(Written::Literal(value)) = set {
                    if !value.is_empty() {
                        let axes = self.axes.entry(tag.to_owned()).or_default();
                        bump(axes.entry(axis.to_owned()).or_default(), value);
                    }
                }
            }
        }
        /* **A named slot filled, by its element's direct children**, which
        are the ones the slot takes. */
        for element in elements {
            let Some(parent) = element.parent.filter(|parent| counted[*parent]) else {
                continue;
            };
            let slot = element
                .attributes
                .iter()
                .find(|one| one.name == "slot")
                .map(|one| &one.value);
            if let Some(Written::Literal(name)) = slot {
                if !name.is_empty() {
                    let tag = &elements[parent].tag;
                    bump(self.slots.entry(tag.clone()).or_default(), name);
                }
            }
        }
    }

    /// Counts the parts and hooks one sheet's rules reach for, where the lint
    /// data says they exist. `listing` is the tags that list each hook, and
    /// `values` is whether hook values are kept.
    pub fn sheet(
        &mut self,
        rules: &[StyleRule],
        index: &Index,
        listing: &HashMap<String, Vec<String>>,
        values: bool,
    ) {
        for rule in rules {
            let selector = rule.selector.as_str();
            if selector.contains("helix-") {
                for (tag, names) in parts(selector) {
                    let Some(element) = index.get(&tag) else {
                        continue;
                    };
                    for name in names {
                        if element.has_part(&name) {
                            bump(self.parts.entry(tag.clone()).or_default(), &name);
                        }
                    }
                }
            }
            let named: Vec<String> = targets(selector)
                .into_iter()
                .filter(|tag| index.get(tag).is_some())
                .collect();
            for (property, value) in &rule.declarations {
                if !property.starts_with("--") {
                    continue;
                }
                if !named.is_empty() {
                    for tag in &named {
                        if index
                            .get(tag)
                            .is_some_and(|element| element.has_hook(property))
                        {
                            self.hook(tag, property, value, values);
                        }
                    }
                    continue;
                }
                /* **A hook set on a class, `:root`, or any selector naming no
                Helix tag** counts for every tag whose lint data lists it, as
                the page counts it. */
                for tag in listing.get(property).into_iter().flatten() {
                    self.hook(tag, property, value, values);
                }
            }
        }
    }

    /// One hook set for one tag, and its value where the project allows it.
    fn hook(&mut self, tag: &str, property: &str, value: &str, values: bool) {
        bump(self.hooks.entry(tag.to_owned()).or_default(), property);
        let value = cut(value.trim());
        if values && !value.is_empty() {
            let hooks = self.hook_values.entry(tag.to_owned()).or_default();
            bump(hooks.entry(property.to_owned()).or_default(), value);
        }
    }

    /// The counts as the run's `usage`.
    pub fn json(&self) -> Value {
        json!({
            "axes": self.axes,
            "composed": self.composed,
            "counted": "scanned",
            "hookValues": self.hook_values,
            "hooks": self.hooks,
            "parts": self.parts,
            "slots": self.slots,
            "tags": self.tags,
            "unlisted": self.unlisted,
        })
    }

    /// How many elements the code writes, and of how many tags.
    pub fn written(&self) -> (u64, usize) {
        (self.tags.values().sum(), self.tags.len())
    }
}

#[cfg(test)]
mod tests {
    use super::{cut, Usage};
    use crate::scan::css;
    use crate::scan::lint::{Index, LintData};
    use crate::scan::markup;

    fn index() -> Index {
        Index::of(&[LintData {
            package: "@fusion.dev/helix".to_owned(),
            tags: serde_json::json!({
                "helix-card": { "attributes": { "tone": ["primary", "neutral"] }, "family": "card", "hooks": ["--card-gap"], "parts": ["body"], "written": [] },
                "helix-tag": { "attributes": {}, "family": "tag", "hooks": ["--tag-gap"], "parts": [], "written": [] }
            })
            .as_object()
            .expect("an object")
            .clone(),
            version: None,
        }])
    }

    #[test]
    fn elements_axes_and_slots_are_counted() {
        let index = index();
        let mut usage = Usage::default();
        let template = markup::read(
            "<helix-card tone=\"primary\"><span slot=\"header\"></span><helix-tag></helix-tag></helix-card><helix-mine></helix-mine><helix-card tone=\"${t}\"></helix-card>",
            1,
        );
        usage.elements(&template.elements, &index, false);
        let json = usage.json();
        assert_eq!(
            json["tags"],
            serde_json::json!({ "helix-card": 2, "helix-tag": 1 })
        );
        assert_eq!(
            json["axes"]["helix-card"]["tone"],
            serde_json::json!({ "primary": 1 })
        );
        assert_eq!(
            json["slots"],
            serde_json::json!({ "helix-card": { "header": 1 } })
        );
        assert_eq!(json["unlisted"], serde_json::json!({ "helix-mine": 1 }));
        assert_eq!(json["counted"], "scanned");
    }

    #[test]
    fn hooks_count_for_every_tag_that_lists_them() {
        let index = index();
        let mut usage = Usage::default();
        let rules = css::read(
            ".a { --card-gap: 1rem; --mine: 0; }\nhelix-card::part(body) { --tag-gap: 2px; }\n",
            1,
            false,
        );
        usage.sheet(&rules, &index, &index.hooks(), true);
        let json = usage.json();
        assert_eq!(
            json["hooks"],
            serde_json::json!({ "helix-card": { "--card-gap": 1 } })
        );
        assert_eq!(
            json["hookValues"]["helix-card"]["--card-gap"],
            serde_json::json!({ "1rem": 1 })
        );
        assert_eq!(
            json["parts"],
            serde_json::json!({ "helix-card": { "body": 1 } })
        );
    }

    #[test]
    fn a_long_value_is_cut_at_a_character() {
        let long = format!("{}𝒳", "a".repeat(199));
        assert_eq!(cut(&long), "a".repeat(199));
    }
}
