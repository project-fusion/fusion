//! A layer that may be a sheet along the window's bottom edge, and the safe
//! area that only a layer's rules, and the host's, read.

use super::{family, CLEAR, MENU};
use crate::family::css::emit;
use crate::family::resolve::unresolved;

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
