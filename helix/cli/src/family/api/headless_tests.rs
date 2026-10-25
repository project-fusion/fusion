use std::collections::BTreeSet;

use super::*;
use crate::family::read::default_export;

const SOURCE: &str = "export default headless('button', {
  events: [event('press', { detail: ['pointerType'] })],
  props: [prop('pending', 'boolean', { default: false }), prop('expanded', 'boolean', { attribute: false })],
  states: ['pending'],
  tree: [pressable('button', { busy: bind('pending'), role: 'button' }, [region('default', { part: 'text' }), when('pending', box('spinner'))])],
})";

#[test]
fn reads_the_api_and_the_tree() {
    let read = headless(&default_export(SOURCE).unwrap()).unwrap();
    assert!(!read.api.props[1].attribute);
    assert_eq!(
        read.tree[0].attributes["busy"],
        Attribute::Bound(Binding::Bind("pending".to_owned()))
    );
    assert_eq!(read.tree[0].children[1].kind, NodeKind::When);
}

#[test]
fn reads_true_among_the_values_as_the_attribute_present_with_no_value() {
    let read = headless(
        &default_export(
            "export default headless('flex', {
              props: [prop('wrap', [true, 'reverse'], { default: false })],
              tree: [region('default')],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        read.api.props[0].kind,
        PropType::Values(vec![String::new(), "reverse".to_owned()])
    );
}

#[test]
fn says_what_the_element_has_that_the_source_does_not() {
    let read = headless(&default_export(SOURCE).unwrap()).unwrap();
    let manifest = serde_json::json!({ "modules": [{ "declarations": [{
        "tagName": "helix-button",
        "attributes": [{ "name": "pending" }, { "name": "label" }],
        "events": [{ "name": "helix-press" }],
        "slots": [{ "name": "" }],
        "cssParts": [{ "name": "spinner" }, { "name": "text" }, { "name": "button" }],
        "cssStates": [{ "name": "pending" }],
    }] }] });
    assert_eq!(
        parity("helix-button", &read.api, &read.tree, &manifest),
        vec!["attribute `label`: the element has it and the source does not".to_owned()]
    );
}

#[test]
fn reads_a_collection_its_items_and_what_a_region_draws_while_empty() {
    let set = headless(
        &default_export(
            "export default headless('tabs', {
              collection: collection({ chosen: 'active', initial: 'default-active', keys: { chooses: true, wrap: true } }),
              tree: [box('tabs', {}, [region('end', {}, [box('end-mark', { glyph: 'x' })])])],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&set.api.collection).unwrap(),
        serde_json::json!({
            "chosen": "active",
            "initial": "default-active",
            "keys": { "chooses": true, "keeps": [], "wrap": true },
        })
    );
    let mut exposed = BTreeSet::new();
    parts(&set.tree, &mut exposed);
    assert!(exposed.contains("end-mark"));
    let panel = headless(
        &default_export(
            "export default headless('tab-panel', {
              item: item('tabs'),
              tree: [box('panel', { hidden: not('selected') })],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&panel.api.item).unwrap(),
        serde_json::json!({ "of": "tabs" })
    );
    assert_eq!(
        serde_json::to_value(&panel.tree[0].attributes["hidden"]).unwrap(),
        serde_json::json!({ "not": "selected" })
    );
}

#[test]
fn refuses_a_field_a_headless_source_does_not_have() {
    let refused =
        headless(&default_export("export default headless('button', { evnts: [] })").unwrap());
    assert!(refused.is_err_and(|why| why == "`evnts` is not a field a headless source has"));
}

#[test]
fn a_collection_names_what_holds_the_choice() {
    let refused = headless(
        &default_export(
            "export default headless('tabs', { collection: collection({ initial: 'x' }) })",
        )
        .unwrap(),
    );
    assert!(refused.is_err_and(|why| why.contains("chosen value")));
}

#[test]
fn reads_how_a_collection_reorders_and_the_grip_its_items_carry() {
    let list = headless(
        &default_export(
            "export default headless('list', {
              collection: collection({
                chosen: 'value',
                keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
                reorder: {
                  after: 'reorder',
                  before: 'before-reorder',
                  enabled: 'reorderable',
                  move: 'move-label',
                  moved: 'moved-label',
                },
              }),
            })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&list.api.collection).unwrap(),
        serde_json::json!({
            "chosen": "value",
            "keys": { "chooses": false, "keeps": ["ArrowLeft", "ArrowRight"], "wrap": false },
            "reorder": {
                "after": "reorder",
                "before": "before-reorder",
                "enabled": "reorderable",
                "move": "move-label",
                "moved": "moved-label",
            },
        })
    );
    let row = headless(
        &default_export(
            "export default headless('list-item', { item: item('list', { chooses: true, grip: 'grip' }) })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&row.api.item).unwrap(),
        serde_json::json!({ "chooses": true, "grip": "grip", "of": "list" })
    );
    let partial = headless(
        &default_export(
            "export default headless('list', {
              collection: collection({ chosen: 'value', reorder: { enabled: 'reorderable' } }),
            })",
        )
        .unwrap(),
    );
    assert!(partial.is_err_and(|why| why.contains("names its `after`")));
}

#[test]
fn reads_the_prop_that_flags_an_item_chosen() {
    let step = headless(
        &default_export(
            "export default headless('step', { item: item('steps', { chooses: true, flag: 'current' }) })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&step.api.item).unwrap(),
        serde_json::json!({ "chooses": true, "flag": "current", "of": "steps" })
    );
}

#[test]
fn reads_the_values_an_element_computes_and_what_its_host_is() {
    let read = headless(
        &default_export(
            "export default headless('stat', {
              derived: { 'label-last': derive('stat-label-last'), 'has-unit': bind('unit') },
              host: { label: bind('label'), role: 'group' },
              props: [prop('format-options', 'object'), prop('value', 'number | string')],
              tree: [region('label'), region('unit')],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        read.api.derived["label-last"],
        Attribute::Derived {
            derive: "statLabelLast".to_owned()
        }
    );
    assert_eq!(
        read.api.derived["has-unit"],
        Attribute::Bound(Binding::Bind("unit".to_owned()))
    );
    assert_eq!(read.api.host["role"], Attribute::Text("group".to_owned()));
    assert_eq!(
        read.api.props[0].kind,
        PropType::Primitive(Primitive::Object)
    );
    assert_eq!(
        read.api.props[1].kind,
        PropType::Primitive(Primitive::NumberOrString)
    );
}

#[test]
fn reads_a_moment_as_a_time() {
    let read = headless(
        &default_export(
            "export default headless('timeline-item', {
              props: [prop('datetime', 'time')],
              tree: [],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(read.api.props[0].kind, PropType::Primitive(Primitive::Time));
}

#[test]
fn refuses_a_computed_value_that_is_neither_a_derivation_nor_a_prop() {
    let refused = headless(
        &default_export("export default headless('badge', { derived: { dot: not('value') } })")
            .unwrap(),
    )
    .unwrap_err();
    assert_eq!(refused, "`derived.dot` is `derive()` or `bind()`");
    let host = headless(
        &default_export("export default headless('badge', { host: { hidden: true } })").unwrap(),
    )
    .unwrap_err();
    assert!(host.starts_with("`host` takes ") && host.contains("`hidden` is"));
}

#[test]
fn a_wrap_only_a_phone_draws_leaves_its_children_to_the_web() {
    let read = headless(
        &default_export(
            "export default headless('stat', {
              tree: [wrap('figure', { platform: 'native', while: true }, [region('default', { part: 'value' })])],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    let manifest = serde_json::json!({ "modules": [{ "declarations": [{
        "tagName": "helix-stat",
        "slots": [{ "name": "" }],
        "cssParts": [{ "name": "value" }],
    }] }] });
    assert_eq!(
        parity("helix-stat", &read.api, &read.tree, &manifest),
        Vec::<String>::new()
    );
}

#[test]
fn reads_a_copy_that_is_another_part_while_a_field_of_its_entry_holds() {
    let read = headless(
        &default_export(
            "export default headless('outline', {
              tree: [repeat('links', { each: bind('sections'), key: 'id' }, [
                pressable('link', { also: { 'link-current': field('marked') } }, []),
              ])],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    let Attribute::Parts(also) = &read.tree[0].children[0].attributes["also"] else {
        panic!("`also` is an object of parts");
    };
    assert_eq!(
        also["link-current"],
        tree::Flag::Field {
            field: "marked".to_owned()
        }
    );
}
