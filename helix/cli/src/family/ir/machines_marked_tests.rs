//! The machines of a set whose items mark themselves, as a navigation's
//! destinations, and the state an element is in while one inside stands open.

use super::*;

const NAVIGATION: &str = "export default headless('navigation', {
  collection: { currentFromItems: true, itemOpen: 'open', keys: { loop: false, orientation: 'orientation', selectionFollowsFocus: false, typeahead: false }, roves: 'arrows' },
  events: [],
  props: [prop('arrows', 'boolean'), prop('orientation', ['vertical'])],
  states: ['open'],
  tree: [box('nav', {}, [box('indicator', { decorative: true, marks: 'chosen' }), region('default')])],
})";

#[test]
fn a_set_whose_items_mark_themselves_runs_the_marked_set_roving_focus_and_the_indicator() {
    let navigation = family(NAVIGATION);
    assert_eq!(
        named(&navigation.machines),
        vec!["marked-set", "roving-focus", "indicator", "disclosed"]
    );
    assert_eq!(navigation.machines[0].bind, bound(&[]));
    assert_eq!(
        navigation.machines[1].bind,
        bound(&[("roves", Bound::Prop("arrows".to_owned()))])
    );
    assert_eq!(
        navigation.machines[2].bind,
        bound(&[("mark", Bound::Part("indicator".to_owned()))])
    );
    assert_eq!(
        navigation.machines[3].bind,
        bound(&[("state", Bound::State("open".to_owned()))])
    );
}

#[test]
fn a_set_whose_items_mark_themselves_holds_no_chosen_value() {
    let source = NAVIGATION.replace(
        "currentFromItems: true,",
        "currentFromItems: true, prop: 'arrows',",
    );
    let refused = headless(&default_export(&source).unwrap()).unwrap_err();
    assert!(refused.contains("`currentFromItems`"), "{refused}");
}

#[test]
fn a_set_whose_items_mark_themselves_closes_on_its_items_own_event() {
    let source = NAVIGATION.replace(
        "currentFromItems: true,",
        "closeOn: 'beforeSelect', currentFromItems: true,",
    );
    let closing = family(&source);
    assert_eq!(
        closing
            .api
            .collection
            .as_ref()
            .and_then(|one| one.closes.as_ref())
            .map(|one| one.event.as_str()),
        Some("before-select")
    );
    assert_eq!(
        crate::family::resolve::unresolved(&closing),
        Vec::<String>::new()
    );
}
