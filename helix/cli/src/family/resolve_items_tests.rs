//! Rules on the parts of an element a box draws: written through
//! `::part()` on the web, and held to what the element around can read.

use crate::family::api::headless;
use crate::family::css::emit;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;
use crate::family::resolve::unresolved;

/// A group that draws a checkbox above its set, exposing its box and its mark.
const GROUP: &str = "export default headless('checkbox-group', {
  props: [prop('disabled', 'boolean')],
  states: ['invalid'],
  tree: [
    box('select-all', { draws: 'checkbox', exports: { box: true, mark: true } }),
    box('items', {}, [region('default')]),
  ],
})";

fn family(rules: &str) -> Family {
    Family::new(
        styled(
            &default_export(&format!(
                "export default family('checkbox-group', {{ stylesheet: 'checkbox-group/g.css', rules: [{rules}] }})"
            ))
            .unwrap(),
        )
        .unwrap(),
        Some(headless(&default_export(GROUP).unwrap()).unwrap()),
        "checkbox-group",
        "root",
    )
}

#[test]
fn the_web_reaches_a_drawn_part_through_the_box_that_draws_it() {
    let group = family(
        "{ on: 'select-all-box', set: [['border-color', token('color-border')]] },
         { on: 'select-all-mark', when: { state: 'invalid' }, set: [['color', token('color-danger')]] }",
    );
    assert_eq!(unresolved(&group), Vec::<String>::new());
    let css = emit(&group);
    assert!(css.contains("[part=\"select-all\"]::part(box) {"), "{css}");
    assert!(
        css.contains(":host(:state(invalid)) [part=\"select-all\"]::part(mark) {"),
        "{css}"
    );
}

#[test]
fn a_rule_on_a_drawn_part_reads_the_element_around_alone() {
    let group = family(
        "{ on: 'select-all-box', when: { interaction: ['hover'] }, set: [['opacity', 0.5]] },
         { on: 'select-all-box', inner: '::before', set: [['content', '\"\"']] }",
    );
    let found = unresolved(&group);
    assert!(
        found.iter().any(|one| one.starts_with("a rule on `select-all-box`, the `box` of the element `select-all` draws, reads a state of the part, an interaction")),
        "{found:?}"
    );
    assert!(
        found
            .iter()
            .any(|one| one.contains("writes generated content or a selector")),
        "{found:?}"
    );
}

/// A menu item whose item fields are `fields`, with two switches, a string, and two events.
fn menu_item(fields: &str) -> Family {
    let source = format!(
        "export default headless('menu-item', {{
          events: [event('before-toggle', {{ cancelable: true }}), event('toggle')],
          item: item('menu', {{ {fields} }}),
          props: [prop('checkable', 'boolean'), prop('checked', 'boolean'), prop('label', 'string')],
          tree: [pressable('item', {{ chooses: true, role: 'menuitem' }}, [region('default')])],
        }})"
    );
    Family::new(
        styled(
            &default_export(
                "export default family('menu', { stylesheet: 'menu/item.css', rules: [] })",
            )
            .unwrap(),
        )
        .unwrap(),
        Some(headless(&default_export(&source).unwrap()).unwrap()),
        "menu",
        "item",
    )
}

#[test]
fn an_item_of_a_set_that_mixes_reads_switches_and_asks_through_a_cancelable_event() {
    assert_eq!(
        unresolved(&menu_item(
            "before: 'before-toggle', checkable: 'checkable', checked: 'checked'"
        )),
        Vec::<String>::new()
    );
    assert_eq!(
        unresolved(&menu_item(
            "before: 'toggle', checked: 'label', exclusive: 'exclusiv'"
        )),
        vec![
            "the item's `before` names `toggle`, which is not cancelable, so a page cannot keep the item as it is",
            "the item's `checked` reads `label`, which is not a boolean",
            "the item's `exclusive` reads `exclusiv`, and no prop has that name",
        ]
    );
}
