use super::*;
use crate::family::api::headless;
use crate::family::ir::{styled, sugar};
use crate::family::read::default_export;

/// The checks on a table written with `styles()` against a tree.
fn checked(tree: &str, rules: &str) -> Result<Vec<String>, String> {
    let source = format!(
        "import b from './headless.js'\nexport default styles(b, {{ prefix: 'b', props: {{ tone: oneOf(['a', 'b']) }}, stylesheet: 's' }}, ({{ on, rule }}) => [\n{rules}\n])"
    );
    let table = sugar::desugar(&default_export(&source).unwrap()).unwrap();
    let family = Family::new(
        styled(&table).unwrap(),
        Some(
            headless(
                &default_export(&format!(
                    "export default headless('b', {{ tree: [{tree}] }})"
                ))
                .unwrap(),
            )
            .unwrap(),
        ),
        "b",
        "root",
    );
    check(&family)
}

const SKELETON: &str = "box('skeleton', { also: { line: true } }, [box('sheen')])";
const MARK: &str = "box('mark', { also: { 'mark-dash': bind('tone') } })";

#[test]
fn two_parts_of_one_node_in_different_groups_are_refused() {
    /* Skeleton's lines are `skeleton line`: written in this order the line
    rule wins, and with the groups the other way round every line is 100%
    tall. */
    let refused = checked(
        SKELETON,
        "on('skeleton', [rule({ blockSize: '100%' })]),\non('line', [rule({ blockSize: '1em' })]),",
    )
    .unwrap_err();
    assert!(
        refused
            .starts_with("line 3 and line 4 are in different groups and can both set `block-size`"),
        "{refused}"
    );
}

#[test]
fn a_part_alone_does_not_meet_the_node_that_is_two() {
    checked(
        SKELETON,
        "on({ part: 'skeleton', exact: true }, [rule({ blockSize: '100%' })]),\non('line', [rule({ blockSize: '1em' })]),",
    )
    .unwrap();
}

#[test]
fn an_alias_competes_with_its_base_part_unless_it_is_asked_away() {
    let refused = checked(
        MARK,
        "on('mark', [rule({ maskImage: 'a' })]),\non('mark-dash', [rule({ maskImage: 'b' })]),",
    )
    .unwrap_err();
    assert!(refused.contains("`mask-image`"), "{refused}");
    checked(MARK, "on('mark', [rule({ maskImage: 'a' }), rule({ also: { 'mark-dash': true } }, { maskImage: 'b' })]),")
        .unwrap();
    checked(
        MARK,
        "on('mark', [rule({ also: { 'mark-dash': false } }, { maskImage: 'a' })]),\non('mark-dash', [rule({ maskImage: 'b' })]),",
    )
    .unwrap();
}

#[test]
fn a_shorthand_competes_with_its_longhand() {
    let refused = checked(
        "box('a', {}, [])",
        "on('a', [rule({ border: 'none' })]),\non(['a'], [rule({ borderBlockStartColor: 'red' })]),",
    )
    .unwrap_err();
    assert!(refused.contains("`border`"), "{refused}");
}

#[test]
fn specificity_two_values_of_a_prop_and_one_target_settle_it() {
    let tree = "box('a', {}, [])";
    /* More specific. */
    checked(
        tree,
        "on('a', [rule({ opacity: 1 })]),\non(['a'], [rule({ hover: true }, { opacity: 0 })]),",
    )
    .unwrap();
    /* Never at once. */
    checked(tree, "on('a', [rule({ tone: 'a' }, { opacity: 1 })]),\non(['a'], [rule({ tone: 'b' }, { opacity: 0 })]),")
        .unwrap();
    /* One target written twice keeps the order written. */
    checked(tree, "on('a', [rule({ opacity: 1 })]),\non('host', [rule({ opacity: 1 })]),\non('a', [rule({ opacity: 0 })]),")
        .unwrap();
}

#[test]
fn a_selector_that_cannot_be_located_is_reported_and_not_refused() {
    let notes = checked(
        "box('a', {}, [])",
        "on('a', [rule({ display: 'block' })]),\non({ part: 'a', selector: '[data-mark=\"x\"]' }, [rule({ platform: 'web' }, { display: 'none' })]),",
    )
    .unwrap();
    assert!(
        notes.iter().any(|note| note.contains("cannot be located")),
        "{notes:?}"
    );
}

#[test]
fn a_rule_another_always_overrides_is_reported() {
    let notes = checked(
        "box('a', {}, [])",
        "on('a', [rule({ hover: true }, { opacity: 1 }), rule({}, { opacity: 0 }), rule({ opacity: 0.5 })]),",
    )
    .unwrap();
    assert!(
        notes
            .iter()
            .any(|note| note.starts_with("line 3: every declaration is overridden by line 3")),
        "{notes:?}"
    );
}

#[test]
fn a_selector_is_ranked_as_a_browser_ranks_it() {
    assert_eq!(
        selector::specificity(":host(:state(end)) [part=\"link\"]:focus-visible"),
        [0, 4, 0]
    );
    assert_eq!(selector::specificity("a[part=\"link\"]:hover"), [0, 2, 1]);
    assert_eq!(selector::specificity("::slotted(a:hover)"), [0, 1, 2]);
}
