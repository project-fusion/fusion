use super::*;
use crate::family::api::headless;
use crate::family::ir::{styled, Family};
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
fn a_source_whose_names_resolve_has_nothing_to_say() {
    let button = family(
        "export default headless('button', {
          events: [event('press')],
          props: [prop('pending', 'boolean'), prop('tone', ['brand', 'neutral'])],
          states: ['pending'],
          tree: [pressable('button', { busy: bind('pending'), sends: 'press' }, [when('pending', box('spinner'))])],
        })",
        "export default family('button', { stylesheet: 'button/button.css', rules: [
          { on: 'button', when: { tone: 'brand' }, values: [['ink', token('color-foreground')]], set: [['color', own('ink')]] },
          { on: 'spinner', when: { state: 'pending' }, set: [['opacity', 1]] },
        ] })",
    );
    assert_eq!(unresolved(&button), Vec::<String>::new());
}

#[test]
fn a_wrap_or_a_box_reads_whether_a_region_holds_something() {
    let card = family(
        "export default headless('card', {
          tree: [wrap('header-row', { while: bind('header-actions') }, [region('header'), region('header-actions')])],
        })",
        STYLED,
    );
    assert_eq!(unresolved(&card), Vec::<String>::new());
    let divider = family(
        "export default headless('divider', {
          tree: [box('content', { hidden: not('default') }, [region('default')])],
        })",
        STYLED,
    );
    assert_eq!(unresolved(&divider), Vec::<String>::new());
    let unknown = family(
        "export default headless('card', {
          tree: [box('header-row', { label: bind('header-actions') }, [region('header-actions')])],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&unknown),
        vec!["`box('header-row')` reads `header-actions`, and no prop has that name"]
    );
}

#[test]
fn says_each_name_that_resolves_to_nothing() {
    let button = family(
        "export default headless('button', {
          events: [event('press')],
          props: [prop('tone', ['brand', 'neutral'])],
          tree: [pressable('button', { busy: bind('pendng'), sends: 'pres' }, [when('loading', box('spinner'))])],
        })",
        "export default family('button', { stylesheet: 'button/button.css', rules: [
          { on: 'buton', set: [['opacity', 1]] },
          { on: 'button', when: { tone: 'brnd', state: 'busy' }, set: [['color', own('ink')]] },
        ] })",
    );
    assert_eq!(
        unresolved(&button),
        vec![
            "`pressable('button')` reads `pendng`, and no prop has that name",
            "`pressable('button')` sends `pres`, and no event has that name",
            "`when('loading')` reads no prop or state by that name",
            "a rule is on `buton`, and no part has that name",
            "a rule on `button` reads `tone=\"brnd\"`, and `tone` never takes `brnd`",
            "a rule on `button` reads the state `busy`, and no state has that name",
        ]
    );
}

#[test]
fn holds_a_toggle_to_its_props_and_events_and_to_one_pressable() {
    let checkbox = family(
        "export default headless('checkbox', {
          events: [event('chang', { bare: true }), event('before-check', { cancelable: true })],
          props: [prop('checked', 'boolean'), prop('readonly', 'boolean')],
          toggle: { indeterminate: 'indeterminate', onBeforeChange: 'beforeCheck', onChange: 'change', prop: 'checked', readonly: 'readonly' },
          tree: [pressable('control', {}, [])],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&checkbox),
        vec![
            "`toggle.onChange` names `change`, and no event has that name",
            "`toggle.indeterminate` names `indeterminate`, and no prop has that name",
            "the element declares a `toggle`, and 0 pressables toggle it, where one does",
        ]
    );
    let stray = family(
        "export default headless('button', {
          tree: [pressable('button', { toggles: true }, [])],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&stray),
        vec!["`pressable('button')` toggles, and the element declares no `toggle`"]
    );
}

#[test]
fn holds_a_collection_to_its_props_events_and_states() {
    let list = family(
        "export default headless('list', {
          collection: { empty: 'empty', keys: { loop: false, selectionFollowsFocus: false }, onChange: 'change', prop: 'value' },
          events: [event('chang', { bare: true })],
          props: [prop('valu', 'string')],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&list),
        vec![
            "`collection.onChange` names `change`, and no event has that name",
            "`collection.prop` names `value`, and no prop has that name",
            "`collection.empty` names `empty`, and no state has that name",
        ]
    );
}

#[test]
fn holds_a_region_and_the_part_around_it_to_the_tree() {
    let stat = family(
        "export default headless('stat', {
          props: [prop('direction', ['row', 'column'])],
          tree: [box('value', {}, [region('unit')]), region('label')],
        })",
        "export default family('stat', { rules: [
          { on: { region: ['label', 'default'] }, set: [['color', 'red']] },
          { on: { region: '*' }, set: [['margin', 0]], when: { within: 'valu', direction: ['row', 'diagonal'] } },
        ] })",
    );
    assert_eq!(
        unresolved(&stat),
        vec![
            "a rule is on the region `default`, and no region has that name",
            "a rule is `within` `valu`, and no part has that name",
            "a rule on `host` reads `direction=\"diagonal\"`, and `direction` never takes `diagonal`",
        ]
    );
}

#[test]
fn a_picked_string_reads_a_prop_and_the_values_it_takes() {
    let group = family(
        "export default headless('toggle-group', {
          props: [prop('selection-mode', ['multiple', 'single'])],
          tree: [box('row', { role: pick('selection-mode', { multiple: 'toolbar' }, 'radiogroup') })],
        })",
        STYLED,
    );
    assert_eq!(unresolved(&group), Vec::<String>::new());
    let unknown = family(
        "export default headless('toggle-group', {
          props: [prop('selection-mode', ['multiple', 'single'])],
          tree: [box('row', { role: pick('selection-mode', { several: 'toolbar' }, 'radiogroup') })],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&unknown),
        vec!["`box('row')` picks: it reads `selection-mode=\"several\"`, and `selection-mode` never takes `several`"]
    );
}

#[test]
fn a_toolbar_needs_a_part_whose_role_is_toolbar() {
    let toolbar = family(
        "export default headless('toolbar', {
          props: [prop('orientation', ['horizontal', 'vertical'])],
          toolbar: { orientation: 'orientation', stopAtEnds: 'stopAtEnds' },
          tree: [box('toolbar', {}, [region('default')])],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&toolbar),
        vec![
            "`toolbar.stopAtEnds` names `stopAtEnds`, and no prop has that name",
            "the element declares a `toolbar`, and no part has the role `toolbar`",
        ]
    );
}

#[test]
fn an_item_state_and_a_pressing_mode_resolve_to_what_the_elements_have() {
    let button = family(
        "export default headless('button', {
          item: item('button-group', { chooses: true, selectedState: 'held' }),
          states: ['pressed'],
          tree: [pressable('button', { chooses: true })],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&button),
        vec!["`memberOf.selectedState` names `held`, and no state has that name"]
    );
    let group = family(
        "export default headless('button-group', {
          collection: { keys: { loop: true, selectionFollowsFocus: false }, pressMode: 'selectionMode', prop: 'value', selectionMode: 'selectionMode' },
          props: [prop('selection-mode', ['one', 'single']), prop('value', 'string')],
          tree: [region('default')],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&group),
        vec!["`collection.pressMode` reads `selection-mode=\"multiple\"`, and `selection-mode` never takes `multiple`"]
    );
}

#[test]
fn a_value_the_element_computes_resolves_as_a_prop_and_as_a_state() {
    let badge = family(
        "export default headless('badge', {
          derived: { unset: derive('badge-unset'), words: derive('badge-words'), 'has-icon': bind('icon') },
          props: [prop('value', 'number | string')],
          tree: [box('indicator', { 'data-dot': bind('unset'), decorative: not('words') }, [when('unset', region('icon'))])],
        })",
        "export default family('badge', { stylesheet: 'badge/badge.css', rules: [
          { on: 'indicator', platform: 'native', when: { state: 'unset' }, set: [['opacity', 1]] },
        ] })",
    );
    assert_eq!(unresolved(&badge), Vec::<String>::new());
    let unknown = family(
        "export default headless('badge', {
          derived: { 'has-icon': bind('glyph') },
          host: { label: bind('caption') },
          tree: [region('icon')],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&unknown),
        vec![
            "`derived.has-icon` reads `glyph`, and no prop or region has that name",
            "the host's `label` reads `caption`, and no prop, region or computed value has that name",
        ]
    );
}

#[test]
fn an_event_follows_a_computed_value_and_gives_fields_its_detail_has() {
    let progress = family(
        "export default headless('progress', {
          derived: { complete: derive('progress-complete'), top: derive('progress-max') },
          events: [event('complete', { detail: ['value'], follows: 'complete', gives: { value: 'top' } })],
          props: [prop('max', 'number')],
          tree: [box('track')],
        })",
        STYLED,
    );
    assert_eq!(unresolved(&progress), Vec::<String>::new());
    let unknown = family(
        "export default headless('progress', {
          derived: { complete: derive('progress-complete') },
          events: [
            event('complete', { detail: ['value'], follows: 'done', gives: { value: 'top', at: 'max' } }),
            event('band', { detail: ['band'], gives: { band: 'complete' } }),
          ],
          props: [prop('max', 'number')],
          tree: [box('track')],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&unknown),
        vec![
            "event `complete` follows `done`, and no computed value has that name",
            "event `complete` gives `at`, and its detail has no such field",
            "event `complete` gives `value` from `top`, and no computed value or prop has that name",
        ]
    );
}

#[test]
fn a_link_part_reads_its_href_and_an_item_is_named_by_regions_it_draws() {
    let tag = family(
        "export default headless('tag', {
          item: item('tag-group', { labelledby: ['start', 'default'] }),
          props: [prop('href', 'string')],
          tree: [region('start'), wrap('link', { href: bind('href') }, [region('default')])],
        })",
        "export default family('tag', { stylesheet: 'tag/tag.css', rules: [
          { on: 'link', when: { canHover: true, hover: true, part: { href: true } }, set: [['text-decoration', 'underline']] },
        ] })",
    );
    assert_eq!(unresolved(&tag), Vec::<String>::new());
    let unnamed = family(
        "export default headless('tag', {
          item: item('tag-group', { labelledby: ['category'] }),
          tree: [region('default')],
        })",
        STYLED,
    );
    assert_eq!(
        unresolved(&unnamed),
        vec!["`memberOf.labelledby` lists `category`, and no region has that name"]
    );
}

/// A copy button's source, with `presses` written in.
fn copying(presses: &str) -> Family {
    family(
        &format!(
            "export default headless('copy-button', {{
          copy: {{ copied: 'copied', duration: 'feedbackDuration', failed: 'failed', label: 'says', labels: {{ copied: 'copiedLabel', failed: 'errorLabel', idle: 'label' }}, onCopy: 'copy', onError: 'copyError', prop: 'value', status: 'told' }},
          events: [event('copy', {{ detail: ['value'] }}), event('copy-error')],
          props: [prop('copied-label', 'string'), prop('error-label', 'string'), prop('feedback-duration', 'number'), prop('label', 'string'), prop('value', 'string')],
          states: ['copied', 'failed'],
          tree: [{presses}],
        }})"
        ),
        STYLED,
    )
}

#[test]
fn a_copy_names_what_it_reads_and_one_pressable_copies() {
    let button = copying(
        "pressable('button', { copies: true, label: bind('says'), role: 'button' }, [region('default', { hidden: bind('told') }), region('copied', { hidden: not('copied') })])",
    );
    assert_eq!(unresolved(&button), Vec::<String>::new());
    let copy = button
        .machines
        .iter()
        .find(|one| one.machine == "copy")
        .expect("a copy machine");
    assert_eq!(
        copy.bind.get("part"),
        Some(&crate::family::ir::machines::Bound::Part(
            "button".to_owned()
        ))
    );
    assert_eq!(
        unresolved(&copying("pressable('button', { role: 'button' }, [])")),
        vec!["the element declares a `copy`, and 0 pressables copy, where one does"]
    );
}
