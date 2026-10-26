//! The machines of a set that mixes commands and choices, as a menu's rows.

use super::*;

#[test]
fn a_set_that_mixes_runs_the_mixed_set_with_roving_focus_and_typeahead() {
    let menu = family(
        "export default headless('menu', {
          collection: { disabled: 'disabled', keys: { loop: true, selectionFollowsFocus: false }, mixes: true },
          events: [],
          props: [prop('disabled', 'boolean')],
          tree: [region('default')],
        })",
    );
    assert_eq!(
        named(&menu.machines),
        vec!["mixed-set", "roving-focus", "typeahead"]
    );
    assert_eq!(
        menu.machines[0].bind,
        bound(&[("disabled", Bound::Prop("disabled".to_owned()))])
    );
}

#[test]
fn an_item_of_a_set_that_mixes_binds_its_switches_and_the_event_it_asks() {
    let row = family(
        "export default headless('menu-item', {
          events: [event('before-check', { cancelable: true }), event('before-select', { cancelable: true })],
          item: item('menu', { checkable: 'checkable', checked: 'checked', exclusive: 'exclusive', onBeforeChange: 'beforeCheck' }),
          props: [prop('checkable', 'boolean'), prop('checked', 'boolean'), prop('exclusive', 'boolean')],
          tree: [pressable('item', { chooses: true, role: 'menuitem', sends: 'before-select' }, [region('default')])],
        })",
    );
    assert_eq!(named(&row.machines), vec!["press", "mixed-item"]);
    assert_eq!(
        row.machines[1].bind,
        bound(&[
            ("before", Bound::Event("before-check".to_owned())),
            ("checkable", Bound::Prop("checkable".to_owned())),
            ("checked", Bound::Prop("checked".to_owned())),
            ("exclusive", Bound::Prop("exclusive".to_owned())),
        ])
    );
}

#[test]
fn a_set_that_mixes_holds_no_chosen_value_and_an_item_that_turns_names_checked() {
    let chosen = headless(
        &default_export(
            "export default headless('menu', {
              collection: { keys: { loop: true, selectionFollowsFocus: false }, mixes: true, prop: 'value' },
              props: [prop('value', 'string')],
            })",
        )
        .unwrap(),
    )
    .unwrap_err();
    assert!(chosen.contains("names no `prop`"), "{chosen}");
    let unchecked = headless(
        &default_export(
            "export default headless('menu-item', { item: item('menu', { exclusive: 'exclusive' }) })",
        )
        .unwrap(),
    )
    .unwrap_err();
    assert!(
        unchecked.contains("names the prop that holds whether it is `checked`"),
        "{unchecked}"
    );
}
