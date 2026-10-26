//! The names one element shares with the rest of its family, resolved across
//! every element.
//!
//! - An item joins a collection an element holds, by the name the element's
//!   headless source gives it.
//! - A private value a rule reads, `own()`, is one a rule of the same family
//!   declares: a tab panel reads the padding its tabs set for their
//!   orientation, which it inherits.
//! - A name another family owns is one it declares, as [`names`] says.

use std::collections::{BTreeMap, BTreeSet};

use crate::family::ir::{Family, Item, Value};
use crate::family::resolve::rules;

mod names;

pub use names::{cross_family, visit};

/// Where an item joins a collection no element holds, where an item that is
/// checked or not joins a set that does not mix commands and choices, and
/// where an item that holds a page joins an element with no stack, one
/// sentence each.
pub fn collections(families: &[&Family]) -> Vec<String> {
    let held: BTreeMap<&str, bool> = families
        .iter()
        .filter_map(|family| {
            let collection = family.api.collection.as_ref()?;
            Some((family.tag.strip_prefix("helix-")?, collection.mixes))
        })
        .collect();
    let stacks: BTreeSet<&str> = families
        .iter()
        .filter(|family| family.api.stack.is_some())
        .filter_map(|family| family.tag.strip_prefix("helix-"))
        .collect();
    families
        .iter()
        .filter_map(|family| {
            let item = family.api.item.as_ref()?;
            let of = item.of.as_str();
            match held.get(of) {
                None => Some(format!(
                    "`{}` joins `{of}`, and no element holds a collection by that name",
                    family.tag
                )),
                Some(false) if item.mixes() => Some(format!(
                    "`{}` names whether it is `checked`, and `{of}`'s collection does not say `mixes: true`",
                    family.tag
                )),
                Some(_) if item.page.is_some() && !stacks.contains(of) => Some(format!(
                    "`{}` holds a `page`, and `{of}` declares no `stack` to show it in",
                    family.tag
                )),
                Some(_) => None,
            }
        })
        .collect()
}

/// Private values one family's rules read that none of its rules declares,
/// one sentence each. `elements` are one family's.
pub fn private_values(elements: &[&Family]) -> Vec<String> {
    let mut declared = BTreeSet::new();
    let mut read = BTreeSet::new();
    for family in elements {
        for rule in rules(family) {
            declared.extend(rule.values.iter().map(|(name, _)| name.as_str()));
            for (_, value) in rule.values.iter().chain(&rule.set) {
                owns(value, &mut read);
            }
        }
        for item in &family.rules {
            if let Item::Keyframes(keyframes) = item {
                for (_, value) in keyframes.frames.iter().flat_map(|(_, set)| set) {
                    owns(value, &mut read);
                }
            }
        }
    }
    read.difference(&declared)
        .map(|name| format!("a rule reads `own('{name}')`, and no rule of its family declares it"))
        .collect()
}

fn owns<'a>(value: &'a Value, into: &mut BTreeSet<&'a str>) {
    match value {
        Value::Own { name, fallback } => {
            into.insert(name.as_str());
            if let Some(fallback) = fallback {
                owns(fallback, into);
            }
        }
        Value::Calc {
            operands: values, ..
        }
        | Value::List(values)
        | Value::Space(values) => {
            for value in values {
                owns(value, into);
            }
        }
        Value::Function { arguments, .. } => {
            for value in arguments {
                owns(value, into);
            }
        }
        /* A derived value is the element's to compute, so no rule declares
        it. */
        Value::Derived { fallback, .. }
        | Value::Hook { fallback, .. }
        | Value::Inherited { fallback, .. }
        | Value::Measured { fallback, .. }
        | Value::Quote { alt: fallback, .. } => {
            if let Some(fallback) = fallback {
                owns(fallback, into);
            }
        }
        Value::Mix { first, second, .. }
        | Value::Scheme {
            dark: first,
            light: second,
        } => {
            owns(first, into);
            owns(second, into);
        }
        Value::Web(value) => owns(value, into),
        Value::Fit(_) | Value::Keyword(_) | Value::Number(_) | Value::Text(_) | Value::Token(_) => {
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::family::api::headless;
    use crate::family::ir::styled;
    use crate::family::read::default_export;

    fn family(headless_source: &str, styled_source: &str) -> Family {
        Family::new(
            styled(&default_export(styled_source).unwrap()).unwrap(),
            Some(headless(&default_export(headless_source).unwrap()).unwrap()),
            "button",
            "root",
        )
    }

    const STYLED: &str =
        "export default family('button', { stylesheet: 'button/button.css', rules: [] })";

    #[test]
    fn a_private_value_resolves_to_any_element_of_the_family() {
        let root = family(
            "export default headless('tabs', { tree: [box('panels')] })",
            "export default family('tabs', { rules: [{ on: 'host', values: [['tabs-gap', 4]] }] })",
        );
        let panel = family(
            "export default headless('tab-panel', { tree: [box('panel')] })",
            "export default family('tabs', { rules: [{ on: 'panel', set: [['gap', own('tabs-gap')]] }] })",
        );
        assert_eq!(private_values(&[&root, &panel]), Vec::<String>::new());
        assert_eq!(private_values(&[&panel]).len(), 1);
    }

    #[test]
    fn says_where_an_item_joins_no_collection() {
        let set = family("export default headless('tabs', { collection: { keys: { loop: false, selectionFollowsFocus: false }, prop: 'active' }, props: [prop('active', 'string')] })", STYLED);
        let tab = family(
            "export default headless('tab', { item: item('tab-set') })",
            STYLED,
        );
        assert_eq!(
            collections(&[&set, &tab]),
            vec!["`helix-tab` joins `tab-set`, and no element holds a collection by that name"]
        );
    }

    #[test]
    fn says_where_an_item_that_is_checked_joins_a_set_that_does_not_mix() {
        let tabs = family("export default headless('tabs', { collection: { keys: { loop: false, selectionFollowsFocus: false }, prop: 'active' }, props: [prop('active', 'string')] })", STYLED);
        let menu = family("export default headless('menu', { collection: { keys: { loop: true, selectionFollowsFocus: false }, mixes: true } })", STYLED);
        let row = |of: &str| {
            family(
                &format!("export default headless('row', {{ item: item('{of}', {{ checked: 'checked' }}), props: [prop('checked', 'boolean')] }})"),
                STYLED,
            )
        };
        assert_eq!(
            collections(&[&tabs, &menu, &row("tabs"), &row("menu")]),
            vec!["`helix-row` names whether it is `checked`, and `tabs`'s collection does not say `mixes: true`"]
        );
    }

    #[test]
    fn says_where_an_item_that_holds_a_page_joins_an_element_with_no_stack() {
        let menu = family("export default headless('menu', { collection: { keys: { loop: true, selectionFollowsFocus: false }, mixes: true } })", STYLED);
        let row = family(
            "export default headless('row', { item: item('menu', { pageSlot: 'page' }), tree: [region('page')] })",
            STYLED,
        );
        assert_eq!(
            collections(&[&menu, &row]),
            vec!["`helix-row` holds a `page`, and `menu` declares no `stack` to show it in"]
        );
    }
}
