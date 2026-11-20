//! The machines of a set whose items open and close, as an accordion's.

use super::*;

#[test]
fn a_set_whose_items_open_runs_the_toggle_set_bound_to_its_mode() {
    let accordion = family(
        "export default headless('accordion', {
          collection: { itemsToggle: true, openMode: 'mode' },
          events: [],
          props: [prop('mode', ['multiple', 'single', 'single-collapsible'])],
          tree: [region('default')],
        })",
    );
    assert_eq!(named(&accordion.machines), vec!["toggle-set"]);
    assert_eq!(
        accordion.machines[0].bind,
        bound(&[("opens", Bound::Prop("mode".to_owned()))])
    );
}

#[test]
fn an_item_that_opens_binds_an_event_for_each_direction() {
    let item = family(
        "export default headless('accordion-item', {
          events: [event('before-close', { cancelable: true }), event('before-open', { cancelable: true })],
          item: item('accordion'),
          props: [prop('open', 'boolean')],
          toggle: { onBeforeClose: 'beforeClose', onBeforeOpen: 'beforeOpen', prop: 'open' },
          tree: [pressable('trigger', { toggles: true }, [region('summary')]), box('content', { closed: not('open') }, [region('default')])],
        })",
    );
    assert_eq!(
        item.machines.last().map(|one| one.bind.clone()),
        Some(bound(&[
            ("checked", Bound::Prop("open".to_owned())),
            ("closes", Bound::Event("before-close".to_owned())),
            ("opens", Bound::Event("before-open".to_owned())),
            ("part", Bound::Part("trigger".to_owned())),
        ]))
    );
}

#[test]
fn a_set_whose_items_open_says_they_turn_and_needs_no_chosen_prop() {
    let refused = headless(
        &default_export(
            "export default headless('accordion', {
              collection: { keys: { loop: false, selectionFollowsFocus: false }, openMode: 'mode' },
              events: [],
              props: [prop('mode', ['single'])],
              tree: [region('default')],
            })",
        )
        .unwrap(),
    )
    .unwrap_err();
    assert!(refused.contains("says `itemsToggle: true`"), "{refused}");
}

#[test]
fn a_toggle_drawn_at_either_end_of_a_bar_runs_one_press_and_one_toggle() {
    let bar = family(
        "export default headless('app-header', {
          derived: { 'toggle-end': derive('app-header-toggle-end'), 'toggle-start': derive('app-header-toggle-start') },
          events: [event('before-close', { cancelable: true }), event('before-open', { cancelable: true })],
          props: [prop('open', 'boolean')],
          toggle: { onBeforeClose: 'beforeClose', onBeforeOpen: 'beforeOpen', prop: 'open' },
          tree: [
            when('toggle-start', pressable('toggle', { toggles: true }, [])),
            region('default'),
            when('toggle-end', pressable('toggle', { toggles: true }, [])),
          ],
        })",
    );
    assert_eq!(named(&bar.machines), vec!["press", "toggle"]);
    let unresolved = crate::family::resolve::unresolved(&bar);
    assert!(unresolved.is_empty(), "{unresolved:?}");
}
