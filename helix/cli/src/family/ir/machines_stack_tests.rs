//! The machines of a stack of pages and its rows, as a drilldown's.

use super::*;
use crate::family::resolve::unresolved;

/// A drilldown whose stack is `stack`, with a back press, a title, and a before-navigate event.
fn drilldown(stack: &str, cancelable: bool) -> Family {
    family(&format!(
        "export default headless('drilldown', {{
          collection: collection({{ keys: {{ chooses: false, wrap: false }}, mixes: true }}),
          events: [event('before-navigate', {{ cancelable: {cancelable} }})],
          props: [prop('page', 'string')],
          stack: stack({{ {stack} }}),
          tree: [
            when('drilled', box('header', {{}}, [pressable('back', {{}}, []), box('title', {{}}, [text('title-words', {{ says: bind('page-label') }})])])),
            region('default'),
          ],
        }})"
    ))
}

#[test]
fn a_stack_runs_stack_bound_to_its_press_its_event_its_values_and_its_page() {
    let root = drilldown(
        "back: 'back', before: 'before-navigate', drilled: 'drilled', label: 'page-label', page: 'page'",
        true,
    );
    assert_eq!(unresolved(&root), Vec::<String>::new());
    let stack = root.machines.iter().find(|one| one.machine == "stack");
    assert_eq!(
        stack.map(|one| one.bind.clone()),
        Some(bound(&[
            ("back", Bound::Part("back".to_owned())),
            ("before", Bound::Event("before-navigate".to_owned())),
            ("drilled", Bound::State("drilled".to_owned())),
            ("label", Bound::State("page-label".to_owned())),
            ("page", Bound::Prop("page".to_owned())),
        ]))
    );
}

#[test]
fn a_stack_goes_back_through_a_press_and_asks_through_a_cancelable_event() {
    let root = drilldown(
        "back: 'title', before: 'before-navigate', drilled: 'drilled', label: 'page-label'",
        false,
    );
    assert_eq!(
        unresolved(&root),
        vec![
            "the stack's `before` names `before-navigate`, which is not cancelable, so a page cannot refuse a move",
            "the stack's `back` names `title`, which is no pressable",
        ]
    );
}

#[test]
fn a_row_that_holds_a_page_runs_stack_row_bound_to_its_region() {
    let row = family(
        "export default headless('drilldown-item', {
          item: item('drilldown', { chooses: true, page: 'page' }),
          tree: [pressable('row', { chooses: true }, [region('default')]), region('page')],
        })",
    );
    assert_eq!(named(&row.machines), vec!["press", "stack-row"]);
    assert_eq!(
        row.machines[1].bind,
        bound(&[("page", Bound::Region("page".to_owned()))])
    );
    let missing = family(
        "export default headless('drilldown-item', {
          item: item('drilldown', { page: 'pages' }),
          tree: [region('default')],
        })",
    );
    assert_eq!(
        unresolved(&missing),
        vec!["the item's `page` names `pages`, and no region has that name"]
    );
}
