//! A layer's names, the machine it runs, and the rules only it takes.

use std::collections::BTreeMap;

use crate::family::api::headless;
use crate::family::css::emit;
use crate::family::ir::machines::{Bound, MachineUse};
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;
use crate::family::resolve::unresolved;

/// A popover: a trigger it is placed against, and a panel that opens.
const POPOVER: &str = "export default headless('popover', {
  events: [event('before-open', { cancelable: true }), event('before-close', { cancelable: true })],
  props: [prop('open', 'boolean'), prop('modal', 'boolean'), prop('placement', 'string')],
  states: ['open', 'placed-bottom', 'placed-left', 'placed-right', 'placed-top', 'aligned-end', 'aligned-start'],
  toggle: { onBeforeClose: 'beforeClose', onBeforeOpen: 'beforeOpen', prop: 'open' },
  tree: [
    region('trigger', { part: 'trigger' }),
    layer('surface', { anchor: 'trigger', modal: bind('modal'), open: bind('open'), placement: bind('placement'), role: 'dialog' }, [
      box('content', {}, [region('default')]),
    ]),
  ],
})";

/// A menu: a popover that is a sheet in a narrow window, with an arrow.
const MENU: &str = "export default headless('menu', {
  props: [prop('open', 'boolean'), prop('presentation', ['auto', 'popover', 'sheet'])],
  states: ['open', 'sheet', 'placed-bottom', 'placed-left', 'placed-right', 'placed-top', 'aligned-end', 'aligned-start'],
  toggle: { prop: 'open' },
  tree: [
    region('trigger', { part: 'trigger' }),
    layer('surface', { anchor: 'trigger', arrow: 'arrow', open: bind('open'), presentation: bind('presentation'), role: 'menu' }, [
      box('arrow', {}),
      box('content', {}, [region('default')]),
    ]),
  ],
})";

/// The rule that keeps a sheet's last row clear of the home indicator.
const CLEAR: &str = "{ on: 'surface', when: { state: 'sheet' }, set: [['padding-block-end', sum(token('space-lg'), safeArea('bottom'))]] }";

fn family(headless_source: &str, rules: &str) -> Family {
    Family::new(
        styled(
            &default_export(&format!(
                "export default family('popover', {{ stylesheet: 'popover/popover.css', rules: [{rules}] }})"
            ))
            .unwrap(),
        )
        .unwrap(),
        Some(headless(&default_export(headless_source).unwrap()).unwrap()),
        "popover",
        "root",
    )
}

#[test]
fn a_layer_runs_layer_bound_to_its_part_its_anchor_and_the_props_it_reads() {
    let popover = family(POPOVER, "");
    let layer = popover
        .machines
        .iter()
        .find(|one| one.machine == "layer")
        .expect("a layer machine");
    assert_eq!(
        layer,
        &MachineUse {
            bind: BTreeMap::from([
                ("anchor".to_owned(), Bound::Part("trigger".to_owned())),
                ("modal".to_owned(), Bound::Prop("modal".to_owned())),
                ("open".to_owned(), Bound::Prop("open".to_owned())),
                ("part".to_owned(), Bound::Part("surface".to_owned())),
                ("placement".to_owned(), Bound::Prop("placement".to_owned())),
            ]),
            machine: "layer".to_owned(),
        }
    );
    assert_eq!(unresolved(&popover), Vec::<String>::new());
}

#[test]
fn a_layer_reads_its_anchor_its_states_and_its_toggle() {
    let lacking = family(
        "export default headless('popover', {
          props: [prop('open', 'boolean'), prop('shown', 'boolean')],
          states: [],
          toggle: { prop: 'shown' },
          tree: [layer('surface', { anchor: 'trigger', open: bind('open') }, [region('default')])],
        })",
        "",
    );
    assert_eq!(
        unresolved(&lacking),
        vec![
            "the element declares a `toggle`, and 0 pressables toggle it, where one does",
            "`layer('surface')` is placed against `trigger`, and no part has that name",
            "`layer('surface')` is placed against its anchor, and the element declares no state `placed-bottom` for the side it lands on",
            "`layer('surface')` is placed against its anchor, and the element declares no state `placed-left` for the side it lands on",
            "`layer('surface')` is placed against its anchor, and the element declares no state `placed-right` for the side it lands on",
            "`layer('surface')` is placed against its anchor, and the element declares no state `placed-top` for the side it lands on",
            "`layer('surface')` is placed against its anchor, and the element declares no state `aligned-end` for the end of the side it is aligned to",
            "`layer('surface')` is placed against its anchor, and the element declares no state `aligned-start` for the end of the side it is aligned to",
            "`layer('surface')` opens, and the element declares no state `open` for it to stand in",
            "`layer('surface')` opens on `open`, and the element's `toggle` does not hold it as checked",
        ]
    );
    let inside = family(
        "export default headless('popover', {
          props: [prop('open', 'boolean')],
          states: ['open', 'placed-bottom', 'placed-left', 'placed-right', 'placed-top', 'aligned-end', 'aligned-start'],
          toggle: { prop: 'open' },
          tree: [layer('surface', { anchor: 'content', open: bind('open') }, [box('content', {}, [region('default')])])],
        })",
        "",
    );
    assert_eq!(
        unresolved(&inside),
        vec!["`layer('surface')` is placed against `content`, which stands inside it"]
    );
}

#[test]
fn a_toggle_that_opens_a_layer_needs_no_press() {
    let dialog = family(
        "export default headless('dialog', {
          props: [prop('open', 'boolean')],
          states: ['open'],
          toggle: { prop: 'open' },
          tree: [layer('surface', { modal: true, open: bind('open') }, [region('default')])],
        })",
        "",
    );
    assert_eq!(unresolved(&dialog), Vec::<String>::new());
}

#[test]
fn only_a_layers_rules_read_the_window_its_backdrop_or_a_viewport_length() {
    let popover = family(
        POPOVER,
        "{ on: 'surface', set: [['max-block-size', 'calc(100dvh - 2rem)']] },
         { on: 'surface', when: { window: { below: '30rem' } }, set: [['inline-size', '100vw']] },
         { on: 'surface', inner: '::backdrop', set: [['background-color', token('color-overlay')]] }",
    );
    assert_eq!(unresolved(&popover), Vec::<String>::new());
    let content = family(
        POPOVER,
        "{ on: 'content', set: [['max-block-size', '50vh']] },
         { on: 'content', when: { window: { below: '30rem' } }, set: [['padding', 0]] },
         { on: 'host', set: [['inline-size', 'min(100vw, 20rem)']] }",
    );
    let found = unresolved(&content);
    assert!(
        found.contains(&"a rule on `content` writes a viewport length, and only a layer's rules do, as only a layer is placed in the window".to_owned()),
        "{found:?}"
    );
    assert!(
        found.contains(&"a rule on `host` writes a viewport length, and only a layer's rules do, as only a layer is placed in the window".to_owned()),
        "{found:?}"
    );
    assert!(
        found.contains(&"a rule on `content` reads `window`, and only a layer's rules do, as only a layer is placed in the window".to_owned()),
        "{found:?}"
    );
}

#[test]
fn the_web_writes_the_window_as_a_media_query_and_the_backdrop_as_its_pseudo_element() {
    let popover = family(
        POPOVER,
        "{ on: 'surface', when: { window: { below: '30rem' }, reducedMotion: true }, set: [['translate', 'none']] },
         { on: 'surface', inner: '::backdrop', when: { state: 'open' }, set: [['opacity', 1]] }",
    );
    let css = emit(&popover);
    assert!(
        css.contains("@media (width < 30rem) and (prefers-reduced-motion: reduce) {"),
        "{css}"
    );
    assert!(
        css.contains(":host(:where(:state(open))) [part=\"surface\"]::backdrop {"),
        "{css}"
    );
}

#[test]
fn a_layer_binds_its_arrow_and_its_presentation() {
    let menu = family(MENU, CLEAR);
    let layer = menu
        .machines
        .iter()
        .find(|one| one.machine == "layer")
        .expect("a layer machine");
    assert_eq!(
        layer.bind.get("arrow"),
        Some(&Bound::Part("arrow".to_owned()))
    );
    assert_eq!(
        layer.bind.get("presentation"),
        Some(&Bound::Prop("presentation".to_owned()))
    );
    assert_eq!(unresolved(&menu), Vec::<String>::new());
}

#[test]
fn a_layer_placed_against_a_target_binds_the_prop_and_lands_in_the_placed_states() {
    let stop = family(
        "export default headless('tour-stop', {
          props: [prop('open', 'boolean'), prop('for', 'string')],
          states: ['open'],
          toggle: { prop: 'open' },
          tree: [layer('surface', { open: bind('open'), target: bind('for') }, [region('default')])],
        })",
        "",
    );
    let layer = stop
        .machines
        .iter()
        .find(|one| one.machine == "layer")
        .expect("a layer machine");
    assert_eq!(
        layer.bind.get("target"),
        Some(&Bound::Prop("for".to_owned()))
    );
    assert_eq!(unresolved(&stop).len(), 6, "{:?}", unresolved(&stop));
}

#[test]
fn an_arrow_is_a_part_inside_its_layer() {
    let outside = family(&MENU.replace("arrow: 'arrow'", "arrow: 'trigger'"), CLEAR);
    assert_eq!(
        unresolved(&outside),
        vec!["`layer('surface')` points at its anchor with `trigger`, and no part inside it has that name"]
    );
}

#[test]
fn a_layer_that_may_be_a_sheet_says_so_and_keeps_clear_of_the_home_indicator() {
    let bare = family(
        &MENU.replace("'open', 'sheet',", "'open',").replace(
            "prop('presentation', ['auto', 'popover', 'sheet'])",
            "prop('presentation', 'string')",
        ),
        "",
    );
    assert_eq!(
        unresolved(&bare),
        vec![
            "`layer('surface')` may be a sheet, and the element declares no state `sheet` for it to stand in",
            "`layer('surface')` is presented as `presentation` says, and `presentation` does not take `auto`, `popover` and `sheet`",
            "`layer('surface')` may be a sheet along the window's bottom edge, and no rule on it under `state: 'sheet'` pads it by `safeArea('bottom')`",
        ]
    );
    /* Padding by the safe area while it is not a sheet keeps nothing clear. */
    let always = family(
        MENU,
        "{ on: 'surface', set: [['padding-block-end', safeArea('bottom')]] }",
    );
    assert_eq!(unresolved(&always).len(), 1, "{:?}", unresolved(&always));
}

#[test]
fn only_a_layers_rules_read_the_safe_area() {
    let content = family(
        MENU,
        &format!("{CLEAR}, {{ on: 'content', set: [['padding-inline', safeArea('left')]] }}"),
    );
    assert_eq!(
        unresolved(&content),
        vec!["a rule on `content` reads the safe area, and only a layer's rules do, as only a layer is placed in the window"]
    );
}

#[test]
fn the_host_reads_the_safe_area_and_no_other_part_beside_a_layer_does() {
    let host = family(
        MENU,
        &format!("{CLEAR}, {{ on: 'host', set: [['padding-block-start', safeArea('top')]] }}"),
    );
    assert_eq!(unresolved(&host), Vec::<String>::new());
    let slotted = family(
        MENU,
        &format!(
            "{CLEAR}, {{ on: 'host', slotted: '*', set: [['padding-block-start', safeArea('top')]] }}"
        ),
    );
    assert_eq!(unresolved(&slotted).len(), 1, "{:?}", unresolved(&slotted));
}

#[test]
fn the_web_writes_the_sheet_as_a_state_and_the_safe_area_as_env() {
    let css = emit(&family(MENU, CLEAR));
    assert!(
        css.contains(":host(:where(:state(sheet))) [part=\"surface\"] {"),
        "{css}"
    );
    assert!(
        css.contains(
            "padding-block-end: calc(var(--helix-space-lg) + env(safe-area-inset-bottom, 0px));"
        ),
        "{css}"
    );
}

#[test]
fn a_layer_binds_its_offsets_its_flip_and_its_hint_and_is_another_part_while_a_state_holds() {
    let tooltip = family(
        "export default headless('tooltip', {
          derived: { hint: derive('tooltip-hint') },
          props: [prop('content', 'string'), prop('flip', 'boolean'), prop('offset', 'number'), prop('open', 'boolean'), prop('persist', 'boolean')],
          states: ['open', 'placed-bottom', 'placed-left', 'placed-right', 'placed-top', 'aligned-end', 'aligned-start'],
          toggle: { prop: 'open' },
          tree: [
            wrap('trigger', { platform: 'native', while: true }, [region('default')]),
            layer('surface', { also: { 'surface-top': bind('placed-top') }, anchor: 'trigger', flip: bind('flip'), hint: bind('hint'), offset: bind('offset'), open: bind('open'), presses: pick('persist', { true: 'none' }, 'close'), role: 'tooltip' }, [
              region('content'),
            ]),
          ],
        })",
        "",
    );
    let layer = tooltip
        .machines
        .iter()
        .find(|one| one.machine == "layer")
        .expect("a layer machine");
    for (name, prop) in [("flip", "flip"), ("hint", "hint"), ("offset", "offset")] {
        assert_eq!(
            layer.bind.get(name),
            Some(&Bound::Prop(prop.to_owned())),
            "{name}"
        );
    }
    assert_eq!(unresolved(&tooltip), Vec::<String>::new());
    let css = emit(&family(
        "export default headless('tooltip', {
          props: [prop('open', 'boolean')],
          states: ['open', 'placed-bottom', 'placed-left', 'placed-right', 'placed-top', 'aligned-end', 'aligned-start'],
          toggle: { prop: 'open' },
          tree: [
            region('trigger', { part: 'trigger' }),
            layer('surface', { also: { 'surface-top': bind('placed-top') }, anchor: 'trigger', open: bind('open') }, [region('default')]),
          ],
        })",
        "{ on: 'surface', set: [['opacity', 0]] }",
    ));
    assert!(css.contains(":host [part~=\"surface\"]"), "{css}");
}

#[test]
fn a_band_stands_under_its_anchor_on_no_side_so_it_declares_no_placed_states() {
    let band = family(
        "export default headless('popover', {
          props: [prop('open', 'boolean')],
          states: ['open'],
          toggle: { prop: 'open' },
          tree: [
            region('trigger', { part: 'trigger' }),
            layer('surface', { anchor: 'trigger', band: true, enters: 'down', open: bind('open'), presses: 'toggle', returns: 'dismissed' }, [region('default')]),
          ],
        })",
        "",
    );
    assert_eq!(unresolved(&band), Vec::<String>::new());
}

#[test]
fn a_stack_of_messages_opens_its_notice_on_what_it_holds_with_no_toggle_or_open_state() {
    let stack = family(
        "export default headless('toast', {
          notices: { maxVisible: 'maxVisible', showing: 'showing' },
          props: [prop('max-visible', 'number')],
          states: [],
          tree: [layer('region', { closedby: 'none', notice: true, open: bind('showing') }, [region('default')])],
        })",
        "{ on: 'region', when: { lacks: 'data-color-mode' }, set: [['color-scheme', 'dark']] }",
    );
    assert_eq!(unresolved(&stack), Vec::<String>::new());
    let unheld = family(
        "export default headless('toast', {
          states: [],
          tree: [layer('region', { notice: true, open: bind('showing') }, [region('default')])],
        })",
        "",
    );
    assert!(unresolved(&unheld)
        .iter()
        .any(|why| why.contains("declares no state `open`")));
}
