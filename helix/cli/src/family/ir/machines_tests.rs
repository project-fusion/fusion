use super::*;
use crate::family::api::headless;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

const STYLED: &str = "export default family('tabs', { stylesheet: 'tabs/tabs.css', rules: [] })";

fn family(headless_source: &str) -> Family {
    Family::new(
        styled(&default_export(STYLED).unwrap()).unwrap(),
        Some(headless(&default_export(headless_source).unwrap()).unwrap()),
        "tabs",
        "root",
    )
}

fn bound(pairs: &[(&str, Bound)]) -> BTreeMap<String, Bound> {
    pairs
        .iter()
        .map(|(name, to)| ((*name).to_owned(), to.clone()))
        .collect()
}

fn named(machines: &[MachineUse]) -> Vec<&str> {
    machines.iter().map(|one| one.machine.as_str()).collect()
}

#[test]
fn a_pressable_part_runs_press_bound_to_what_it_sends_and_reads() {
    let button = family(
        "export default headless('button', {
          events: [event('press')],
          props: [prop('disabled', 'boolean'), prop('pending', 'boolean')],
          tree: [pressable('button', { busy: bind('pending'), disabled: bind('disabled'), sends: 'press' })],
        })",
    );
    assert_eq!(
        button.machines,
        vec![MachineUse {
            bind: bound(&[
                ("disabled", Bound::Prop("disabled".to_owned())),
                ("part", Bound::Part("button".to_owned())),
                ("pending", Bound::Prop("pending".to_owned())),
                ("sends", Bound::Event("press".to_owned())),
            ]),
            machine: "press".to_owned(),
        }]
    );
}

#[test]
fn a_collection_with_one_chosen_item_runs_single_selection_focus_typeahead_and_its_indicator() {
    let tabs = family(
        "export default headless('tabs', {
          collection: { defaultProp: 'defaultActive', keys: { loop: true, selectionFollowsFocus: true }, manualActivation: 'manual', onBeforeChange: 'beforeActivate', onChange: 'activate', prop: 'active' },
          events: [event('activate'), event('before-activate', { cancelable: true })],
          props: [prop('active', 'string'), prop('default-active', 'string'), prop('manual', 'boolean')],
          tree: [box('tabs', {}, [region('default'), box('indicator', { decorative: true, marks: 'chosen' })])],
        })",
    );
    assert_eq!(
        named(&tabs.machines),
        ["single-selection", "roving-focus", "typeahead", "indicator"]
    );
    assert_eq!(
        tabs.machines[0].bind,
        bound(&[
            ("after", Bound::Event("activate".to_owned())),
            ("before", Bound::Event("before-activate".to_owned())),
            ("chosen", Bound::Prop("active".to_owned())),
            ("seed", Bound::Prop("default-active".to_owned())),
        ])
    );
    assert_eq!(
        tabs.machines[1].bind,
        bound(&[("manual", Bound::Prop("manual".to_owned()))])
    );
    assert_eq!(
        tabs.machines[3].bind,
        bound(&[("mark", Bound::Part("indicator".to_owned()))])
    );
}

#[test]
fn a_selection_mode_makes_the_selection_multiple_and_a_reorder_adds_its_machine() {
    let list = family(
        "export default headless('list', {
          collection: { keys: { itemKeys: ['ArrowLeft', 'ArrowRight'], loop: false, selectionFollowsFocus: false }, prop: 'value', reorder: { enabled: 'reorderable', move: 'Move', onBeforeReorder: 'beforeReorder', onReorder: 'reorder' }, selectionBehavior: 'selectionBehavior', selectionMode: 'selectionMode' },
          events: [event('before-reorder', { cancelable: true }), event('reorder')],
          props: [prop('reorderable', 'boolean'), prop('selection-behavior', ['replace', 'toggle']), prop('selection-mode', ['multiple', 'none', 'single']), prop('value', 'string')],
          tree: [box('list', {}, [region('default')])],
        })",
    );
    assert_eq!(
        named(&list.machines),
        ["multiple-selection", "roving-focus", "typeahead", "reorder"]
    );
    assert_eq!(
        list.machines[0].bind.get("mode"),
        Some(&Bound::Prop("selection-mode".to_owned()))
    );
    assert_eq!(
        list.machines[3].bind,
        bound(&[
            ("after", Bound::Event("reorder".to_owned())),
            ("before", Bound::Event("before-reorder".to_owned())),
            ("enabled", Bound::Prop("reorderable".to_owned())),
        ])
    );
}

#[test]
fn an_element_with_no_behavior_runs_no_machine() {
    let panel = family(
        "export default headless('tab-panel', { tree: [box('panel', {}, [region('default')])] })",
    );
    assert!(panel.machines.is_empty());
}

#[test]
fn an_element_that_turns_runs_toggle_bound_to_the_pressable_that_toggles_it() {
    let checkbox = family(
        "export default headless('checkbox', {
          events: [event('change', { bare: true }), event('before-check', { cancelable: true, detail: ['checked'] })],
          props: [prop('checked', 'boolean'), prop('default-checked', 'boolean'), prop('disabled', 'boolean'), prop('indeterminate', 'boolean'), prop('readonly', 'boolean')],
          toggle: { defaultProp: 'defaultChecked', indeterminate: 'indeterminate', onBeforeChange: 'beforeCheck', onChange: 'change', prop: 'checked', readonly: 'readonly' },
          tree: [pressable('control', { disabled: bind('disabled'), toggles: true }, [region('default')])],
        })",
    );
    assert_eq!(named(&checkbox.machines), vec!["press", "toggle"]);
    assert_eq!(
        checkbox.machines[1],
        MachineUse {
            bind: bound(&[
                ("after", Bound::Event("change".to_owned())),
                ("before", Bound::Event("before-check".to_owned())),
                ("checked", Bound::Prop("checked".to_owned())),
                ("disabled", Bound::Prop("disabled".to_owned())),
                ("mixed", Bound::Prop("indeterminate".to_owned())),
                ("part", Bound::Part("control".to_owned())),
                ("readonly", Bound::Prop("readonly".to_owned())),
                ("seed", Bound::Prop("default-checked".to_owned())),
            ]),
            machine: "toggle".to_owned(),
        }
    );
}

#[test]
fn a_toggle_the_runtime_holds_binds_what_holds_it_and_no_prop() {
    let motion = family(
        "export default headless('motion-toggle', {
          events: [event('change', { bare: true }), event('before-check', { cancelable: true, detail: ['checked'] })],
          toggle: { onBeforeChange: 'beforeCheck', onChange: 'change', shared: 'page-motion' },
          tree: [pressable('button', { toggles: true }, [])],
        })",
    );
    assert_eq!(
        motion.machines[1],
        MachineUse {
            bind: bound(&[
                ("after", Bound::Event("change".to_owned())),
                ("before", Bound::Event("before-check".to_owned())),
                ("held", Bound::Held("page-motion".to_owned())),
                ("part", Bound::Part("button".to_owned())),
            ]),
            machine: "toggle".to_owned(),
        }
    );
}

#[test]
fn a_pressable_that_names_its_key_binds_its_press_to_that_key_alone() {
    let checkbox = family(
        "export default headless('checkbox', {
          tree: [pressable('control', { keys: 'space' }, []), pressable('link', { keys: 'enter' }, []), pressable('button', {}, [])],
        })",
    );
    let keys: Vec<Option<&Bound>> = checkbox
        .machines
        .iter()
        .map(|one| one.bind.get("keys"))
        .collect();
    assert_eq!(
        keys,
        vec![
            Some(&Bound::Key(" ".to_owned())),
            Some(&Bound::Key("Enter".to_owned())),
            None
        ]
    );
}

#[test]
fn a_toggle_that_sends_several_events_after_it_turns_binds_them_in_order() {
    let checkbox = family(
        "export default headless('checkbox', {
          events: [event('change', { bare: true }), event('input', { bare: true })],
          props: [prop('checked', 'boolean')],
          toggle: { onChange: ['input', 'change'], prop: 'checked' },
          tree: [pressable('field', { toggles: true }, [])],
        })",
    );
    assert_eq!(
        checkbox.machines[1].bind.get("after"),
        Some(&Bound::Events(vec![
            "input".to_owned(),
            "change".to_owned()
        ]))
    );
}

#[test]
fn a_press_only_the_web_draws_runs_no_machine() {
    let switch = family(
        "export default headless('switch', {
          props: [prop('checked', 'boolean')],
          toggle: { prop: 'checked' },
          tree: [pressable('field', { toggles: true }, [
            pressable('control', { checked: bind('checked'), platform: 'web', role: 'switch' }, []),
          ])],
        })",
    );
    assert_eq!(named(&switch.machines), vec!["press", "toggle"]);
    assert_eq!(
        switch.machines[0].bind.get("part"),
        Some(&Bound::Part("field".to_owned()))
    );
}

#[test]
fn a_form_control_runs_validation_bound_to_where_its_answer_is_held() {
    let switch = family(
        "export default headless('switch', {
          props: [prop('checked', 'boolean'), prop('disabled', 'boolean'), prop('feedback', 'string'), prop('readonly', 'boolean'), prop('required', 'boolean'), prop('value-missing-message', 'string')],
          toggle: { prop: 'checked', readonly: 'readonly' },
          tree: [pressable('field', { toggles: true }, [])],
          validation: { feedback: 'feedback', required: 'required', valueMissing: 'valueMissingMessage' },
        })",
    );
    assert_eq!(
        switch.machines.last(),
        Some(&MachineUse {
            bind: bound(&[
                ("checked", Bound::Prop("checked".to_owned())),
                ("disabled", Bound::Prop("disabled".to_owned())),
                ("feedback", Bound::Prop("feedback".to_owned())),
                ("missing", Bound::Prop("value-missing-message".to_owned())),
                ("readonly", Bound::Prop("readonly".to_owned())),
                ("required", Bound::Prop("required".to_owned())),
            ]),
            machine: "validation".to_owned(),
        })
    );
}

#[test]
fn a_score_picked_from_a_row_of_steps_runs_scale_bound_to_its_row() {
    let rating = family(
        "export default headless('rating', {
          events: [event('change'), event('clear'), event('preview', ['value'])],
          props: [prop('clearable', 'boolean'), prop('disabled', 'boolean'), prop('max', 'number'), prop('option-label', 'string'), prop('value', 'string')],
          range: { clearable: 'clearable', full: 'full', max: 'max', onChange: 'change', onClear: 'clear', onPreview: 'preview', optionLabel: 'optionLabel', part: 'part', prop: 'value' },
          tree: [box('marks', { disabled: bind('disabled'), role: 'radiogroup' })],
        })",
    );
    assert_eq!(named(&rating.machines), vec!["scale"]);
    assert_eq!(
        rating.machines[0].bind,
        bound(&[
            ("change", Bound::Event("change".to_owned())),
            ("clear", Bound::Event("clear".to_owned())),
            ("clearable", Bound::Prop("clearable".to_owned())),
            ("disabled", Bound::Prop("disabled".to_owned())),
            ("full", Bound::State("full".to_owned())),
            ("max", Bound::Prop("max".to_owned())),
            ("option", Bound::Prop("option-label".to_owned())),
            ("part", Bound::Part("marks".to_owned())),
            ("preview", Bound::Event("preview".to_owned())),
            ("share", Bound::State("part".to_owned())),
            ("value", Bound::Prop("value".to_owned())),
        ])
    );
}

#[test]
fn a_number_a_reader_types_and_steps_runs_entry_and_spin_bound_to_its_field_and_steppers() {
    let number = family(
        "export default headless('number-input', {
          events: [event('change')],
          props: [prop('large-step', 'number'), prop('max', 'number'), prop('min', 'number'), prop('value', 'string')],
          range: { atMax: 'atMax', atMin: 'atMin', largeStep: 'largeStep', max: 'max', min: 'min', onChange: 'change', prop: 'value' },
          text: { onChange: 'change', prop: 'value' },
          tree: [
            pressable('decrement', { steps: 'down' }, []),
            field('control', { role: 'spinbutton', valuemax: bind('max'), valuemin: bind('min') }),
            pressable('increment', { steps: 'up' }, []),
          ],
        })",
    );
    assert_eq!(
        named(&number.machines),
        vec!["press", "press", "entry", "spin"]
    );
    assert_eq!(
        number.machines[3].bind,
        bound(&[
            ("ceiling", Bound::State("at-max".to_owned())),
            ("change", Bound::Event("change".to_owned())),
            ("down", Bound::Part("decrement".to_owned())),
            ("floor", Bound::State("at-min".to_owned())),
            ("large", Bound::Prop("large-step".to_owned())),
            ("max", Bound::Prop("max".to_owned())),
            ("min", Bound::Prop("min".to_owned())),
            ("part", Bound::Part("control".to_owned())),
            ("up", Bound::Part("increment".to_owned())),
            ("value", Bound::Prop("value".to_owned())),
        ])
    );
}

#[test]
fn a_set_with_no_letters_runs_no_typeahead_and_binds_what_it_may_hold() {
    let group = family(
        "export default headless('radio-group', {
          collection: { disabled: 'disabled', keys: { loop: true, selectionFollowsFocus: true, typeahead: false }, onChange: ['input', 'change'], optional: true, prop: 'value', readonly: 'readonly' },
          events: [event('change', { bare: true }), event('input', { bare: true })],
          props: [prop('disabled', 'boolean'), prop('readonly', 'boolean'), prop('value', 'string')],
          tree: [region('default')],
        })",
    );
    assert_eq!(
        named(&group.machines),
        vec!["single-selection", "roving-focus"]
    );
    assert_eq!(
        group.machines[0].bind,
        bound(&[
            (
                "after",
                Bound::Events(vec!["input".to_owned(), "change".to_owned()])
            ),
            ("chosen", Bound::Prop("value".to_owned())),
            ("disabled", Bound::Prop("disabled".to_owned())),
            ("optional", Bound::Prop("value".to_owned())),
            ("readonly", Bound::Prop("readonly".to_owned())),
        ])
    );
}

#[test]
fn a_set_whose_items_turn_runs_the_toggle_set_and_no_keys() {
    let group = family(
        "export default headless('checkbox-group', {
          collection: { itemsToggle: true, onBeforeChange: 'beforeChange', onChange: 'change', prop: 'value', selectAll: { label: 'selectAllLabel', part: 'select-all', prop: 'selectAll' } },
          events: [event('before-change', { cancelable: true }), event('change', { bare: true })],
          props: [prop('select-all', 'boolean'), prop('select-all-label', 'string'), prop('value', 'string')],
          tree: [box('select-all', { draws: 'checkbox' }), region('default')],
        })",
    );
    assert_eq!(named(&group.machines), vec!["toggle-set"]);
    assert_eq!(
        group.machines[0].bind,
        bound(&[
            ("after", Bound::Event("change".to_owned())),
            ("all", Bound::Prop("select-all".to_owned())),
            ("all-label", Bound::Prop("select-all-label".to_owned())),
            ("all-part", Bound::Part("select-all".to_owned())),
            ("before", Bound::Event("before-change".to_owned())),
            ("chosen", Bound::Prop("value".to_owned())),
        ])
    );
}

#[test]
fn a_set_whose_items_press_on_their_own_runs_single_selection_bound_to_that_prop() {
    let group = family(
        "export default headless('toggle-group', {
          collection: { allowEmptySelection: 'allowEmptySelection', keys: { loop: true, selectionFollowsFocus: true, typeahead: false }, pressMode: 'selectionMode', prop: 'value' },
          events: [],
          props: [prop('allow-empty-selection', 'boolean'), prop('selection-mode', ['multiple', 'single']), prop('value', 'string')],
          tree: [region('default')],
        })",
    );
    assert_eq!(
        named(&group.machines),
        vec!["single-selection", "roving-focus"]
    );
    assert_eq!(
        group.machines[0].bind,
        bound(&[
            ("chosen", Bound::Prop("value".to_owned())),
            ("clears", Bound::Prop("allow-empty-selection".to_owned())),
            ("presses", Bound::Prop("selection-mode".to_owned())),
        ])
    );
}

#[test]
fn a_set_that_keeps_one_chosen_and_roves_in_a_mode_binds_both() {
    let group = family(
        "export default headless('button-group', {
          collection: { disallowEmptySelection: 'disallowEmptySelection', keys: { loop: true, selectionFollowsFocus: false, selects: false, typeahead: false }, pressMode: 'selectionMode', prop: 'value', roves: 'selectionMode', selectionMode: 'selectionMode' },
          props: [prop('disallow-empty-selection', 'boolean'), prop('selection-mode', ['multiple', 'single']), prop('value', 'string')],
          tree: [region('default')],
        })",
    );
    assert_eq!(
        named(&group.machines),
        vec!["multiple-selection", "roving-focus"]
    );
    assert_eq!(
        group.machines[0].bind.get("keeps"),
        Some(&Bound::Prop("disallow-empty-selection".to_owned()))
    );
    assert_eq!(
        group.machines[0].bind.get("presses"),
        Some(&Bound::Prop("selection-mode".to_owned()))
    );
    assert_eq!(
        group.machines[1].bind,
        bound(&[("roves", Bound::Prop("selection-mode".to_owned()))])
    );
}

#[test]
fn a_toolbar_runs_roving_focus_over_the_part_whose_role_is_toolbar() {
    let toolbar = family(
        "export default headless('toolbar', {
          props: [prop('orientation', ['horizontal', 'vertical']), prop('stop-at-ends', 'boolean')],
          toolbar: { orientation: 'orientation', stopAtEnds: 'stopAtEnds' },
          tree: [box('toolbar', { role: 'toolbar' }, [region('default')])],
        })",
    );
    assert_eq!(
        toolbar.machines,
        vec![MachineUse {
            bind: bound(&[
                ("ends", Bound::Prop("stop-at-ends".to_owned())),
                ("orientation", Bound::Prop("orientation".to_owned())),
                ("part", Bound::Part("toolbar".to_owned())),
            ]),
            machine: "roving-focus".to_owned(),
        }]
    );
}

#[path = "machines_opening_tests.rs"]
mod opening;

#[path = "machines_marked_tests.rs"]
mod marked;

#[path = "machines_mixed_tests.rs"]
mod mixed;

#[path = "machines_stack_tests.rs"]
mod stack;
