//! Targets and conditions as the web writes them, and how each ranks.

use crate::family::css::{emit, shipped};
use crate::family::ir::{family, Item, Rule};
use crate::family::read::default_export;

/// A table of `rules`, read.
fn rules(rules: &str) -> Vec<Rule> {
    let table = format!("export default family('b', {{ rules: [{rules}] }})");
    family(&default_export(&table).unwrap())
        .unwrap()
        .rules
        .into_iter()
        .filter_map(|item| match item {
            Item::Rule(rule) => Some(*rule),
            Item::Keyframes(_) => None,
        })
        .collect()
}

/// The stylesheet `rules` ship as.
fn css(rules: &str) -> String {
    let table = format!("export default family('b', {{ rules: [{rules}] }})");
    shipped(&emit(&family(&default_export(&table).unwrap()).unwrap()))
}

/// The one rule's selector, its specificity, and whether only the web has it.
fn one(rule: &str) -> (String, [u32; 3], bool) {
    let read = rules(rule);
    let written = css(rule);
    let selector = written.split(" {").next().unwrap_or_default().to_owned();
    (selector, read[0].specificity, read[0].web_only)
}

#[test]
fn writes_a_region_by_its_slot_with_that_selectors_weight() {
    assert_eq!(
        one("{ on: { region: 'label' }, set: [['color', 'red']] }"),
        ("slot[name=\"label\"]".to_owned(), [0, 1, 1], false)
    );
    assert_eq!(
        one("{ on: { region: 'default' }, set: [['color', 'red']] }"),
        ("slot:not([name])".to_owned(), [0, 1, 1], false)
    );
    assert_eq!(
        one("{ on: { region: 'label' }, set: [['margin', 0]], slotted: '*', when: { direction: 'row' } }"),
        (":host([direction=\"row\"]) slot[name=\"label\"]::slotted(*)".to_owned(), [0, 3, 2], false)
    );
    assert_eq!(
        one("{ on: { region: '*' }, set: [['margin', 0]], slotted: '*', when: { within: 'content' } }"),
        ("[part=\"content\"] slot::slotted(*)".to_owned(), [0, 1, 2], false)
    );
}

#[test]
fn several_regions_are_several_rules_under_one_selector_list() {
    assert_eq!(
        css("{ on: { region: ['icon', 'start-icon'] }, set: [['--icon-size', '1em']], slotted: '*' }"),
        "slot[name=\"icon\"]::slotted(*), slot[name=\"start-icon\"]::slotted(*) {--icon-size: 1em}"
    );
}

#[test]
fn writes_an_interaction_and_a_place_inside_slotted() {
    assert_eq!(
        one("{ on: 'host', set: [['z-index', 1]], slotted: '*', when: { focusWithin: true } }").0,
        "::slotted(*:focus-within)"
    );
    assert_eq!(
        one("{ on: 'host', set: [['margin', 0]], slotted: '*', when: { child: 'earlier', variant: { not: 'spaced' } } }"),
        (
            ":host(:not([variant=\"spaced\"])) ::slotted(*:not(:last-child))".to_owned(),
            [0, 3, 1],
            false
        )
    );
    assert_eq!(
        one("{ on: 'host', set: [['margin', 0]], slotted: 'helix-toggle', when: { state: 'pressed' } }").0,
        ":host(:state(pressed)) ::slotted(helix-toggle)"
    );
}

#[test]
fn writes_values_a_prop_does_not_take_and_any_of_several() {
    assert_eq!(
        one("{ on: 'button', set: [['color', 'red']], when: { emphasis: { not: 'solid' }, raised: true } }"),
        (":host([raised]:not([emphasis=\"solid\"])) [part=\"button\"]".to_owned(), [0, 4, 0], false)
    );
    assert_eq!(
        one("{ on: 'host', set: [['block-size', 'auto']], when: { has: 'lines', lines: { not: ['1', '0'] } } }").0,
        ":host([lines]:not([lines=\"1\"]):not([lines=\"0\"]))"
    );
    assert_eq!(
        one("{ on: 'box', set: [['margin', 0]], when: { separation: ['filled', 'outlined'] } }"),
        (
            ":host(:is([separation=\"filled\"], [separation=\"outlined\"])) [part=\"box\"]"
                .to_owned(),
            [0, 3, 0],
            false
        )
    );
}

#[test]
fn writes_every_state_and_a_state_that_does_not_hold() {
    assert_eq!(
        one("{ on: 'host', set: [['color', 'red']], when: { state: ['invalid', 'checked'] } }").0,
        ":host(:state(invalid):state(checked))"
    );
    assert_eq!(
        one("{ on: 'host', set: [['color', 'red']], when: { state: { 'has-label': false, open: true } } }"),
        (":host(:not(:state(has-label)):state(open))".to_owned(), [0, 3, 0], false)
    );
}

#[test]
fn writes_the_hosts_place_among_its_own_kind() {
    assert_eq!(
        one("{ on: 'host', set: [['opacity', '1']], when: { ofType: 2 } }"),
        (":host(:nth-of-type(2))".to_owned(), [0, 2, 0], false)
    );
    assert_eq!(
        one("{ on: 'fill', set: [['box-shadow', 'none']], when: { ofType: 1 } }"),
        (
            ":host(:nth-of-type(1)) [part=\"fill\"]".to_owned(),
            [0, 3, 0],
            false
        )
    );
}

#[test]
fn writes_the_hosts_own_interaction_and_place() {
    assert_eq!(
        one("{ on: 'host', set: [['position', 'absolute']], when: { focusWithin: false } }"),
        (":host(:not(:focus-within))".to_owned(), [0, 2, 0], false)
    );
    assert_eq!(
        one("{ on: 'separator', set: [['display', 'none']], when: { place: 'first' } }"),
        (
            ":host(:first-child) [part=\"separator\"]".to_owned(),
            [0, 3, 0],
            false
        )
    );
    assert_eq!(
        one(
            "{ inner: '::after', on: 'host', set: [['display', 'none']], when: { child: 'last' } }"
        )
        .0,
        ":host(:last-child)::after"
    );
}

#[test]
fn writes_a_parts_place_its_value_and_the_part_around_it() {
    assert_eq!(
        one("{ on: 'line', set: [['inline-size', '60%']], when: { child: 'last' } }"),
        ("[part=\"line\"]:last-child".to_owned(), [0, 2, 0], false)
    );
    assert_eq!(
        one("{ on: 'indicator', set: [['color', 'green']], when: { part: { 'data-band': 'good' } } }").0,
        "[part=\"indicator\"][data-band=\"good\"]"
    );
    assert_eq!(
        one("{ on: 'control', set: [['color', 'red']], when: { within: 'field', hover: true } }"),
        (
            "[part=\"field\"] [part=\"control\"]:hover".to_owned(),
            [0, 3, 0],
            false
        )
    );
}

#[test]
fn joins_media_conditions_and_keeps_the_webs_own_from_native() {
    assert_eq!(
        css("{ on: 'sheen', set: [['forced-color-adjust', 'none']], when: { forcedColors: true, reducedMotion: false } }"),
        "@media (forced-colors: active) and (prefers-reduced-motion: no-preference) {[part=\"sheen\"] {forced-color-adjust: none}}"
    );
    assert!(rules("{ on: 'sheen', set: [], when: { forcedColors: true } }")[0].web_only);
    assert!(!rules("{ on: 'sheen', set: [], when: { forcedColors: false } }")[0].web_only);
    assert_eq!(
        one("{ on: 'host', set: [['color', 'red']], when: [{ state: 'better' }, { defined: false, good: 'up', movement: 'up' }] }").0,
        ":host(:state(better)), :host(:not(:defined)[good=\"up\"][movement=\"up\"])"
    );
    let read = rules("{ on: 'host', set: [], when: [{ state: 'better' }, { defined: false }] }");
    assert_eq!((read[0].web_only, read[1].web_only), (false, true));
}

#[test]
fn refuses_a_condition_the_target_has_no_meaning_for() {
    let refused = |rule: &str| {
        let table = format!("export default family('b', {{ rules: [{rule}] }})");
        family(&default_export(&table).unwrap()).unwrap_err()
    };
    assert!(
        refused("{ on: { region: 'label' }, set: [], when: { hover: true } }")
            .contains("a region's slot has no interaction")
    );
    assert!(refused("{ on: 'host', set: [], when: { within: 'field' } }").contains("`within`"));
    assert!(
        refused("{ on: 'host', set: [], when: { part: { hidden: true } } }")
            .contains("a part's state applies to a part")
    );
    assert!(refused("{ on: 'box', set: [], when: { child: 'second' } }").contains("`child` is"));
    assert!(refused("{ on: 'box', set: [], when: { tone: { is: 'red' } } }").contains("`{ not:"));
}

#[test]
fn writes_what_holds_of_a_part_around_and_inside_with_its_weight() {
    assert_eq!(
        one("{ on: 'control', set: [['color', 'red']], when: { disabled: false, within: { field: { hover: true } } } }"),
        (
            ":host(:not(:disabled)) [part=\"field\"]:hover [part=\"control\"]".to_owned(),
            [0, 5, 0],
            false
        )
    );
    assert_eq!(
        one("{ on: 'thumb', set: [['color', 'red']], when: { within: { track: { holds: { control: 'focusVisible' } } } } }"),
        (
            "[part=\"track\"]:has([part=\"control\"]:focus-visible) [part=\"thumb\"]".to_owned(),
            [0, 4, 0],
            false
        )
    );
    assert_eq!(
        one("{ on: 'field', set: [['color', 'red']], when: { holds: { control: 'focusVisible' } } }"),
        (
            "[part=\"field\"]:has([part=\"control\"]:focus-visible)".to_owned(),
            [0, 3, 0],
            false
        )
    );
}

#[test]
fn writes_the_hosts_own_interaction_on_a_part_inside_host() {
    assert_eq!(
        one(
            "{ on: 'dismiss', set: [['opacity', 1]], when: { within: { host: { hover: true } } } }"
        ),
        (
            ":host(:hover) [part=\"dismiss\"]".to_owned(),
            [0, 3, 0],
            false
        )
    );
    assert_eq!(
        one("{ on: 'dismiss', set: [['opacity', 1]], when: { state: 'selected', within: { host: { focusWithin: true } } } }"),
        (
            ":host(:state(selected):focus-within) [part=\"dismiss\"]".to_owned(),
            [0, 4, 0],
            false
        )
    );
}

#[test]
fn writes_the_entering_place_presence_filled_and_pointer_conditions() {
    assert_eq!(
        css("{ on: 'host', set: [['opacity', 0]], when: { entering: true } }"),
        "@starting-style {:host {opacity: 0}}"
    );
    assert_eq!(
        one("{ on: 'time', set: [['text-align', 'end']], when: { place: 'even' } }"),
        (
            ":host(:nth-child(even)) [part=\"time\"]".to_owned(),
            [0, 3, 0],
            false
        )
    );
    assert_eq!(
        one("{ on: 'row', set: [['gap', 0]], when: { holds: { icon: true } } }").0,
        "[part=\"row\"]:has([part=\"icon\"])"
    );
    assert_eq!(
        one("{ on: 'row', set: [['gap', 0]], when: { filled: 'label' } }"),
        (
            ":host(:state(has-label)) [part=\"row\"]".to_owned(),
            [0, 3, 0],
            false
        )
    );
    assert_eq!(
        css("{ on: 'row', set: [['gap', 0]], when: { canHover: false } }"),
        "@media (hover: none) {[part=\"row\"] {gap: 0}}"
    );
}
