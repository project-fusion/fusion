use super::*;
use crate::family::ir::family;
use crate::family::read::default_export;

fn rules(table: &str) -> Vec<Rule> {
    family(&default_export(table).unwrap())
        .unwrap()
        .rules
        .into_iter()
        .filter_map(|item| match item {
            Item::Rule(rule) => Some(*rule),
            Item::Keyframes(_) => None,
        })
        .collect()
}

fn first_rule(table: &str) -> Rule {
    rules(table).into_iter().next().expect("a rule")
}

#[test]
fn a_generic_hover_outranks_an_emphasis_as_the_browser_ranks_them() {
    let hover = first_rule(
        "export default family('b', { rules: [{ on: 'button', set: [], when: { disabled: false, hover: true } }] })",
    );
    let emphasis = first_rule(
        "export default family('b', { rules: [{ on: 'button', set: [], when: { emphasis: 'solid' } }] })",
    );
    assert_eq!(hover.specificity, [0, 4, 0]);
    assert_eq!(emphasis.specificity, [0, 3, 0]);
}

#[test]
fn a_print_rule_is_web_only() {
    let rule = first_rule(
        "export default family('b', { rules: [{ on: 'host', set: [], when: { print: true } }] })",
    );
    assert!(rule.web_only);
}

#[test]
fn a_native_rule_is_kept_for_native_alone() {
    let rule = first_rule(
        "export default family('b', { rules: [{ on: 'host', platform: 'native', set: [] }] })",
    );
    assert!(rule.native_only);
    assert!(!rule.web_only);
}

#[test]
fn several_whens_are_several_rules_in_order() {
    let read = rules(
        "export default family('b', { rules: [{ on: 'tab', set: [['color', 'red']], when: [{ state: 'selected' }, { hover: true, state: 'selected' }] }] })",
    );
    assert_eq!(read.len(), 2);
    assert_eq!((read[0].order, read[1].order), (0, 1));
    assert_eq!(read[1].specificity, [0, 4, 0]);
}

#[test]
fn a_helper_outside_the_vocabulary_is_refused() {
    let refused = family(
        &default_export(
            "export default family('b', { rules: [{ on: 'host', set: [['gap', calc(1)]] }] })",
        )
        .unwrap(),
    )
    .unwrap_err();
    assert!(refused.contains("`calc()`"), "{refused}");
}

#[test]
fn refuses_a_field_a_styled_source_does_not_have() {
    let refused = family(
        &default_export("export default family('b', { rules: [], stylesheets: '' })").unwrap(),
    )
    .unwrap_err();
    assert_eq!(refused, "`stylesheets` is not a field a styled source has");
}
