//! Whether every name an element's sources use names something it has.
//!
//! **A name that resolves to nothing is a compile error.** A misspelled prop
//! in a `bind()`, an event a press sends that the API never declares, or a rule
//! on a part the tree never draws would compile and do nothing on one platform
//! or both. Each is a sentence here, and the element does not compile.
//!
//! **What a name may resolve to:**
//!
//! - `bind()` and `not()` name a prop or a value the element computes, and
//!   `when()` a prop, a custom state, or a computed value. A computed value
//!   that binds names a prop or a region, and so does the host's `label`.
//! - `sends` names an event, and `bubbles` events, by their names.
//! - The collection's, the toggle's and the item's fields name the props,
//!   events, states and parts their docs say they do.
//! - A pressable `toggles` only where the element declares a `toggle`, and an
//!   element that declares one has exactly one pressable that toggles it.
//! - A layer is placed against a part or a region outside it, opens on the
//!   prop its element's toggle holds, and alone takes a rule that reads the
//!   window.
//! - A rule is `on` the host, a part, or a region the tree draws, `within` a
//!   part it has, and its conditions name a prop that is an attribute, one of
//!   that prop's values, or a custom state. A rule on slotted children reads
//!   the children's attributes, which are theirs.
//!
//! The names one element shares with the rest of its family resolve in
//! [`super::shared`].

use std::collections::BTreeSet;

use crate::family::api::{self, Api, Attribute, Names as Refers, Node, NodeKind, Prop, PropType};
use crate::family::ir::{Family, Item, Rule};
use crate::family::vocabulary::layer::layers;
use rule_names::attribute_value;

/// What an element has, by name.
struct Names<'a> {
    /// The values the element computes from its props, its `derived`.
    derived: BTreeSet<&'a str>,
    events: BTreeSet<&'a str>,
    /// The layers the tree draws, by name, which alone take a rule that
    /// reads the window.
    layers: BTreeSet<String>,
    parts: BTreeSet<String>,
    props: Vec<&'a Prop>,
    regions: BTreeSet<&'a str>,
    states: BTreeSet<&'a str>,
}

/// The name of every region in a tree.
fn regions<'a>(nodes: &'a [Node], into: &mut BTreeSet<&'a str>) {
    for node in nodes {
        if node.kind == NodeKind::Region {
            into.insert(node.name.as_str());
        }
        regions(&node.children, into);
    }
}

impl<'a> Names<'a> {
    fn of(family: &'a Family) -> Self {
        let mut parts = BTreeSet::new();
        api::parts(&family.tree, &mut parts);
        let mut held = BTreeSet::new();
        regions(&family.tree, &mut held);
        Self {
            /* A total's `holds` is computed too, as a meter's `segmented`. */
            derived: family
                .api
                .derived
                .keys()
                .map(String::as_str)
                .chain(
                    family
                        .api
                        .total
                        .iter()
                        .filter_map(|total| total.holds.as_deref()),
                )
                /* And a delay's `waiting`, as a loader's. */
                .chain(family.api.delay.iter().map(|delay| delay.waiting.as_str()))
                /* A countdown's `paused` and a queue's `waiting`, as an announcement's. */
                .chain(family.api.countdown.iter().map(|one| one.paused.as_str()))
                .chain(family.api.queue.iter().map(|queue| queue.waiting.as_str()))
                .chain(api::Notices::computed(&family.api).chain(api::Tour::of(&family.api)))
                /* And the list an element's sections give it, as an outline's. */
                .chain(family.api.sections.iter().map(|one| one.list.as_str()))
                /* And what a stack computes as it moves, as a drilldown is `drilled`. */
                .chain(family.api.stack.iter().flat_map(api::Stack::computed))
                /* And the words a copy names the element by, as a copy button `says`. */
                .chain(family.api.copy.iter().flat_map(api::Copy::computed))
                .collect(),
            regions: held,
            events: family
                .api
                .events
                .iter()
                .map(|event| event.name.as_str())
                .collect(),
            layers: layers(&family.tree)
                .into_iter()
                .map(|layer| layer.name.clone())
                .collect(),
            parts,
            props: family.api.props.iter().collect(),
            states: family.api.states.iter().map(String::as_str).collect(),
        }
    }

    fn prop(&self, name: &str) -> Option<&Prop> {
        self.props.iter().copied().find(|prop| prop.name == name)
    }
}

/// Where one element's names resolve to nothing, one sentence each.
pub fn unresolved(family: &Family) -> Vec<String> {
    let names = Names::of(family);
    let mut found = Vec::new();
    tree(&family.tree, &names, &mut found);
    computed(&family.api, &names, &mut found);
    events::followed(&family.api, &names, &mut found);
    collection(&family.api, &names, &mut found);
    toggle(family, &names, &mut found);
    toolbar(family, &names, &mut found);
    sources::timed(family, &names, &mut found);
    layered::layered(family, &names, &mut found);
    gestures::gestures(family, &names, &mut found);
    stack::stacked(family, &names, &mut found);
    if let Some(validation) = &family.api.validation {
        references("validation", validation.references(), &names, &mut found);
        if family.api.toggle.is_none() && family.api.collection.is_none() {
            found.push(
                "the element declares a `validation`, and neither a `toggle` nor a `collection` holds its answer"
                    .to_owned(),
            );
        }
    }
    items::item(family, &names, &mut found);
    /* An element with no headless source has no tree to hold its rules to. */
    if !family.tree.is_empty() {
        for rule in rules(family) {
            rule_names::check(rule, &names, &mut found);
            found.extend(layered::window_rule(rule, &names));
        }
        items::drawn(family, &rules(family).collect::<Vec<_>>(), &mut found);
    }
    found
}

/// The element's rules, without its animations.
pub fn rules(family: &Family) -> impl Iterator<Item = &Rule> {
    family.rules.iter().filter_map(|item| match item {
        Item::Rule(rule) => Some(&**rule),
        Item::Keyframes(_) => None,
    })
}

fn tree(nodes: &[Node], names: &Names, found: &mut Vec<String>) {
    for node in nodes {
        let at = format!("`{}('{}')`", node.kind, node.name);
        if node.kind == NodeKind::When
            && names.prop(&node.name).is_none()
            && !names.states.contains(node.name.as_str())
            && !names.derived.contains(node.name.as_str())
        {
            found.push(format!("{at} reads no prop or state by that name"));
        }
        for (attribute, value) in &node.attributes {
            for prop in value.props() {
                /* Whether a region holds something: a wrap drawn while it
                does, as a card's header row while its actions do, and a box
                hidden while it does not, as a divider's content. A phone
                reads the region's prop, and the web element its slot. */
                let filled = matches!(
                    (node.kind, attribute.as_str()),
                    (NodeKind::Wrap, "while") | (NodeKind::Box, "hidden")
                ) && names.regions.contains(prop);
                /* A part is another as well while a state holds, as a
                popover's arrow is `arrow-bottom` while its panel is
                `placed-bottom`. */
                let stated = attribute == "also" && names.states.contains(prop);
                if !filled && !stated && !names.derived.contains(prop) {
                    expect_prop(names, prop, &at, found);
                }
            }
        }
        for value in node.attributes.values() {
            if let Attribute::Picked { pick, values, .. } = value {
                if names.derived.contains(pick.as_str()) {
                    continue;
                }
                for known in values.keys() {
                    if let Some(why) = attribute_value(names.prop(pick), pick, known) {
                        found.push(format!("{at} picks: it {why}"));
                    }
                }
            }
        }
        if let Some(Attribute::Text(region)) = node.attributes.get("labelledby") {
            if !names.regions.contains(region.as_str()) {
                found.push(format!(
                    "{at} is labeled by `{region}`, and no region has that name"
                ));
            }
        }
        if let Some(Attribute::Text(regions)) = node.attributes.get("describedby") {
            for region in regions.split_whitespace() {
                if !names.regions.contains(region) {
                    found.push(format!(
                        "{at} is described by `{region}`, and no region has that name"
                    ));
                }
            }
        }
        for attribute in ["sends", "loads", "fails", "bubbles"] {
            if let Some(Attribute::Text(events)) = node.attributes.get(attribute) {
                for sends in events.split_whitespace() {
                    if !names.events.contains(sends) {
                        found.push(format!(
                            "{at} {attribute} `{sends}`, and no event has that name"
                        ));
                    }
                }
            }
        }
        tree(&node.children, names, found);
    }
}

/// The values the element computes, and the host's semantics: each `bind()`
/// names a prop or a region, and the host's also a computed value.
fn computed(api: &Api, names: &Names, found: &mut Vec<String>) {
    let reads = |name: &str| names.prop(name).is_some() || names.regions.contains(name);
    for (name, value) in &api.derived {
        for prop in value.props() {
            if !reads(prop) {
                found.push(format!(
                    "`derived.{name}` reads `{prop}`, and no prop or region has that name"
                ));
            }
        }
    }
    for (attribute, value) in &api.host {
        for prop in value.props() {
            if !reads(prop) && !names.derived.contains(prop) {
                found.push(format!(
                    "the host's `{attribute}` reads `{prop}`, and no prop, region or computed value has that name"
                ));
            }
        }
    }
}

/// The collection's fields, each held to what its docs say it names.
fn collection(api: &Api, names: &Names, found: &mut Vec<String>) {
    if let Some(collection) = &api.collection {
        references("collection", collection.references(), names, found);
        /* The prop that says how the items are pressed takes `multiple`,
        under which each item presses on its own. */
        if let Some(presses) = &collection.presses {
            let prop = names.prop(presses);
            let listed = prop.is_some_and(|prop| matches!(prop.kind, PropType::Values(_)));
            match attribute_value(prop, presses, "multiple") {
                Some(why) => found.push(format!("`collection.pressMode` {why}")),
                None if !listed => found.push(format!(
                    "`collection.pressMode` reads `{presses}`, which takes no values to name `multiple` among"
                )),
                None => {}
            }
        }
    }
}

/// The toggle's fields, each held to what its docs say it names, and the
/// pressable that turns it.
fn toggle(family: &Family, names: &Names, found: &mut Vec<String>) {
    let mut toggling = Vec::new();
    pressables_that_toggle(&family.tree, &mut toggling);
    let Some(toggle) = &family.api.toggle else {
        for name in toggling {
            found.push(format!(
                "`pressable('{name}')` toggles, and the element declares no `toggle`"
            ));
        }
        return;
    };
    references("toggle", toggle.references(), names, found);
    /* A layer's toggle may have no pressable: the page or the layer's
    anchor opens it, and a dismissal closes it. */
    let unpressed = toggling.is_empty() && layered::opened_by(family, toggle);
    /* An element with no headless source has no tree to look in. One press
    drawn in either of two places, as an app header's toggle, is one. */
    toggling.sort_unstable();
    toggling.dedup();
    if !family.tree.is_empty() && toggling.len() != 1 && !unpressed {
        found.push(format!(
            "the element declares a `toggle`, and {} pressables toggle it, where one does",
            toggling.len()
        ));
    }
}

/// The toolbar's props, and the part whose role is `toolbar`, which holds the
/// controls it walks.
fn toolbar(family: &Family, names: &Names, found: &mut Vec<String>) {
    let Some(toolbar) = &family.api.toolbar else {
        return;
    };
    references("toolbar", toolbar.references(), names, found);
    if !family.tree.is_empty() && toolbar_part(&family.tree).is_none() {
        found.push(
            "the element declares a `toolbar`, and no part has the role `toolbar`".to_owned(),
        );
    }
}

/// The first part whose role is `toolbar`, in the order the tree draws them.
pub fn toolbar_part(nodes: &[Node]) -> Option<&Node> {
    nodes.iter().find_map(|node| {
        let toolbar =
            matches!(node.attributes.get("role"), Some(Attribute::Text(role)) if role == "toolbar");
        if toolbar {
            Some(node)
        } else {
            toolbar_part(&node.children)
        }
    })
}

/// The name of each pressable marked `toggles`, in the order the tree draws them.
pub fn pressables_that_toggle<'a>(nodes: &'a [Node], found: &mut Vec<&'a str>) {
    for node in nodes {
        if node.kind == NodeKind::Pressable
            && matches!(node.attributes.get("toggles"), Some(Attribute::Flag(true)))
        {
            found.push(node.name.as_str());
        }
        pressables_that_toggle(&node.children, found);
    }
}

/// Each name a feature holds, held to what it names, and said as the
/// source writes it: `toggle.onChange` names `beforeX`.
fn references(
    feature: &str,
    references: Vec<(&'static str, &str, Refers)>,
    names: &Names,
    found: &mut Vec<String>,
) {
    for (at, name, what) in references {
        let resolves = match what {
            Refers::Event => names.events.contains(name),
            Refers::Part => names.parts.contains(name),
            Refers::Prop => names.prop(name).is_some(),
            Refers::State => names.states.contains(name),
        };
        if !resolves {
            let field = api::spelling::written(feature, at);
            let name = match what {
                Refers::Part => name.to_owned(),
                _ => api::spelling::camel(name),
            };
            found.push(format!(
                "`{field}` names `{name}`, and no {} has that name",
                what.word()
            ));
        }
    }
}

fn expect_prop(names: &Names, prop: &str, at: &str, found: &mut Vec<String>) {
    if names.prop(prop).is_none() {
        found.push(format!("{at} reads `{prop}`, and no prop has that name"));
    }
}

#[path = "resolve_events.rs"]
mod events;

#[path = "resolve_sources.rs"]
mod sources;
pub use sources::pressables_that_copy;

#[path = "resolve_rules.rs"]
mod rule_names;

#[path = "resolve_layers.rs"]
mod layered;

#[path = "resolve_items.rs"]
mod items;

#[path = "resolve_gestures.rs"]
mod gestures;

#[cfg(test)]
#[path = "resolve_tests.rs"]
mod tests;

#[path = "resolve_stack.rs"]
mod stack;
