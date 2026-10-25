//! A layer's vocabulary: what it takes, what it reads together, and where
//! it may stand.

use crate::family::api::headless;
use crate::family::read::default_export;

fn read(tree: &str) -> Result<(), String> {
    headless(&default_export(&format!("export default headless('popover', {{ props: [prop('open', 'boolean'), prop('placement', 'string')], tree: [{tree}] }})")).unwrap())
        .map(|_| ())
}

#[test]
fn a_layer_opens_on_a_prop_and_holds_what_it_opens() {
    assert_eq!(
        read("layer('surface', { open: bind('open'), modal: true, role: 'dialog', label: 'Settings' }, [region('default')])"),
        Ok(())
    );
    let written = read("layer('surface', { open: true }, [region('default')])").unwrap_err();
    assert!(
        written.contains("a layer opens on a prop, `open: bind('open')`"),
        "{written}"
    );
    let missing = read("layer('surface', { modal: true }, [region('default')])").unwrap_err();
    assert!(missing.contains("a layer opens on a prop"), "{missing}");
    let empty = read("layer('surface', { open: bind('open') })").unwrap_err();
    assert!(empty.contains("a layer holds what it opens"), "{empty}");
}

#[test]
fn a_placement_is_against_an_anchor_and_names_a_side_floating_ui_knows() {
    assert_eq!(
        read("region('trigger'), layer('surface', { anchor: 'trigger', offset: 4, open: bind('open'), placement: bind('placement') }, [region('default')])"),
        Ok(())
    );
    assert_eq!(
        read("region('trigger'), layer('surface', { anchor: 'trigger', open: bind('open'), placement: 'top-start' }, [region('default')])"),
        Ok(())
    );
    let unknown = read("region('trigger'), layer('surface', { anchor: 'trigger', open: bind('open'), placement: 'above' }, [region('default')])").unwrap_err();
    assert!(
        unknown.contains("`placement` takes one of `bottom`, `bottom-end`"),
        "{unknown}"
    );
    let loose =
        read("layer('surface', { open: bind('open'), placement: 'top' }, [region('default')])")
            .unwrap_err();
    assert!(
        loose.contains("`placement` places a layer against its `anchor`, and it names none"),
        "{loose}"
    );
    let offset = read("layer('surface', { offset: 4, open: bind('open') }, [region('default')])")
        .unwrap_err();
    assert!(offset.contains("`offset` places a layer"), "{offset}");
    for attribute in ["arrow: 'arrow'", "presentation: 'sheet'"] {
        let loose = read(&format!(
            "layer('surface', {{ {attribute}, open: bind('open') }}, [box('arrow', {{}}), region('default')])"
        ))
        .unwrap_err();
        assert!(
            loose.contains("places a layer against its `anchor`, and it names none"),
            "{loose}"
        );
    }
}

#[test]
fn an_anchored_layer_is_a_sheet_a_popover_or_either_by_the_window() {
    for value in ["'auto'", "'popover'", "'sheet'", "bind('placement')"] {
        assert_eq!(
            read(&format!("region('trigger'), layer('surface', {{ anchor: 'trigger', arrow: 'arrow', open: bind('open'), presentation: {value} }}, [box('arrow', {{}}), region('default')])")),
            Ok(())
        );
    }
    let unknown = read("region('trigger'), layer('surface', { anchor: 'trigger', open: bind('open'), presentation: 'drawer' }, [region('default')])").unwrap_err();
    assert!(
        unknown.contains("`presentation` takes one of `auto`, `popover`, `sheet`, or `bind()`"),
        "{unknown}"
    );
}

#[test]
fn a_layer_is_placed_against_a_registered_target_by_the_prop_that_holds_its_id() {
    assert_eq!(
        read("layer('surface', { open: bind('open'), placement: 'right-start', target: bind('placement') }, [region('default')])"),
        Ok(())
    );
    let written =
        read("layer('surface', { open: bind('open'), target: 'save' }, [region('default')])")
            .unwrap_err();
    assert!(written.contains("`target: bind('for')`"), "{written}");
    let both = read("region('trigger'), layer('surface', { anchor: 'trigger', open: bind('open'), target: bind('placement') }, [region('default')])").unwrap_err();
    assert!(
        both.contains("placed against its `anchor` or its `target`, and not both"),
        "{both}"
    );
}

#[test]
fn a_notice_stands_above_the_dialogs_and_holds_no_reader() {
    assert_eq!(
        read("layer('stack', { notice: true, open: bind('open') }, [region('default')])"),
        Ok(())
    );
    let modal = read(
        "layer('stack', { modal: true, notice: true, open: bind('open') }, [region('default')])",
    )
    .unwrap_err();
    assert!(
        modal.contains(
            "a `notice` stands above the dialogs and holds no reader, so it is not `modal`"
        ),
        "{modal}"
    );
}

#[test]
fn closedby_names_how_a_reader_dismisses_a_layer() {
    for value in ["any", "closerequest", "none"] {
        assert_eq!(
            read(&format!("layer('surface', {{ closedby: '{value}', open: bind('open') }}, [region('default')])")),
            Ok(())
        );
    }
    let unknown =
        read("layer('surface', { closedby: 'escape', open: bind('open') }, [region('default')])")
            .unwrap_err();
    assert!(
        unknown.contains("`closedby` takes one of `any`, `closerequest`, `none`, or `bind()`"),
        "{unknown}"
    );
}

#[test]
fn only_a_layer_takes_the_attributes_that_open_and_place_it() {
    for attribute in [
        "anchor: 'x'",
        "arrow: 'x'",
        "closedby: 'any'",
        "modal: true",
        "notice: true",
        "offset: 4",
        "open: bind('open')",
        "placement: 'top'",
        "presentation: 'auto'",
    ] {
        let boxed = read(&format!("box('panel', {{ {attribute} }})")).unwrap_err();
        assert!(boxed.contains("a box does not take"), "{boxed}");
    }
    let busy = read("layer('surface', { busy: true, open: bind('open') }, [region('default')])")
        .unwrap_err();
    assert!(busy.contains("a layer does not take `busy`"), "{busy}");
}

#[test]
fn a_layer_stands_in_no_layer_repeat_or_vector() {
    let nested = read("layer('surface', { open: bind('open') }, [layer('inner', { open: bind('open') }, [region('default')])])").unwrap_err();
    assert!(
        nested.contains("`layer('inner')` is inside `layer('surface')`, and a layer stands in no layer, repeat or vector"),
        "{nested}"
    );
    let repeated = read("repeat('rows', { count: 2 }, [layer('surface', { open: bind('open') }, [region('default')])])").unwrap_err();
    assert!(
        repeated.contains("is inside `repeat('rows')`"),
        "{repeated}"
    );
}

#[test]
fn the_roles_of_overlays_and_menus_are_known_and_checked_where_they_check() {
    for role in ["alertdialog", "dialog", "menu", "tooltip"] {
        assert_eq!(
            read(&format!(
                "layer('surface', {{ open: bind('open'), role: '{role}' }}, [region('default')])"
            )),
            Ok(())
        );
    }
    assert_eq!(
        read("box('items', { role: 'menu' }, [pressable('item', { role: 'menuitem' }, [])])"),
        Ok(())
    );
    assert_eq!(
        read("pressable('item', { checked: bind('open'), role: 'menuitemcheckbox' }, []), pressable('choice', { checked: bind('open'), role: 'menuitemradio' }, [])"),
        Ok(())
    );
    let unchecked = read("pressable('item', { role: 'menuitemcheckbox' }, [])").unwrap_err();
    assert!(
        unchecked.contains("a menuitemcheckbox is checked or not"),
        "{unchecked}"
    );
}

#[test]
fn a_layer_that_swipes_stands_along_an_edge_and_rests_at_its_snap_points() {
    assert_eq!(
        read("layer('panel', { edge: 'end', open: bind('open'), snap: bind('placement'), swipe: true }, [region('default')])"),
        Ok(())
    );
    assert_eq!(
        read("layer('panel', { edge: bind('placement'), open: bind('open'), swipe: bind('open') }, [region('default')])"),
        Ok(())
    );
    let unknown = read(
        "layer('panel', { edge: 'left', open: bind('open'), swipe: true }, [region('default')])",
    )
    .unwrap_err();
    assert!(
        unknown.contains("`edge` takes one of `bottom`, `end`, `start`, `top`"),
        "{unknown}"
    );
    let edgeless = read("layer('panel', { open: bind('open'), swipe: true }, [region('default')])")
        .unwrap_err();
    assert!(
        edgeless.contains("a layer that swipes stands along an edge"),
        "{edgeless}"
    );
    let still = read("layer('panel', { edge: 'bottom', open: bind('open'), snap: bind('placement') }, [region('default')])").unwrap_err();
    assert!(still.contains("the layer does not swipe"), "{still}");
    let written = read("layer('panel', { edge: 'bottom', open: bind('open'), snap: '0.5 1', swipe: true }, [region('default')])").unwrap_err();
    assert!(
        written.contains("`snap` binds the prop that holds the snap points"),
        "{written}"
    );
}

#[test]
fn a_press_held_down_is_a_flag() {
    assert_eq!(
        read("pressable('trigger', { held: bind('open') }, [region('default')])"),
        Ok(())
    );
    let worded = read("pressable('trigger', { held: 'long' }, [region('default')])").unwrap_err();
    assert!(worded.contains("`held` takes `true`, `false`"), "{worded}");
    let boxed = read("box('trigger', { held: true }, [region('default')])").unwrap_err();
    assert!(boxed.contains("a box does not take `held`"), "{boxed}");
}

#[test]
fn a_layer_that_refuses_says_so_as_a_flag() {
    assert_eq!(
        read("layer('surface', { modal: true, open: bind('open'), refuses: true }, [region('default')])"),
        Ok(())
    );
    assert!(
        read("layer('surface', { open: bind('open'), refuses: 'yes' }, [region('default')])")
            .is_err()
    );
}

#[test]
fn a_press_in_the_anchor_and_a_hint_reach_an_anchored_layer() {
    assert_eq!(
        read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', 'cross-offset': 6, flip: false, hint: 'Save your work', open: bind('open'), presses: 'toggle' }, [region('default')])"),
        Ok(())
    );
    assert_eq!(
        read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', open: bind('open'), presses: pick('open', { true: 'none' }, 'close') }, [region('default')])"),
        Ok(())
    );
    let unknown = read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', open: bind('open'), presses: 'open' }, [region('default')])").unwrap_err();
    assert!(
        unknown.contains("`presses` takes one of `close`, `none`, `toggle`"),
        "{unknown}"
    );
    for attribute in [
        "hint: 'Save'",
        "presses: 'toggle'",
        "flip: false",
        "'cross-offset': 4",
    ] {
        let loose = read(&format!(
            "layer('surface', {{ {attribute}, open: bind('open') }}, [region('default')])"
        ))
        .unwrap_err();
        assert!(
            loose.contains("places a layer against its `anchor`, and it names none"),
            "{attribute}: {loose}"
        );
    }
}

#[test]
fn a_wrap_that_draws_an_element_holds_what_it_passes_in_and_says_while() {
    assert_eq!(
        read("wrap('tooltip', { draws: 'tooltip', gives: { content: bind('placement'), persist: true }, while: true }, [pressable('button', { role: 'button' }, [])])"),
        Ok(())
    );
    let unsaid = read(
        "wrap('tooltip', { draws: 'tooltip' }, [pressable('button', { role: 'button' }, [])])",
    )
    .unwrap_err();
    assert!(unsaid.contains("says `while` it draws it"), "{unsaid}");
    let held = read("box('tooltip', { draws: 'tooltip' }, [box('mark')])").unwrap_err();
    assert!(
        held.contains("a box that `draws` an element holds nothing"),
        "{held}"
    );
    let given = read("box('tooltip', { gives: { persist: true } })").unwrap_err();
    assert!(given.contains("`exports` and `gives`"), "{given}");
}

#[test]
fn a_band_stands_under_its_anchor_and_takes_nothing_that_places_a_layer_on_a_side() {
    assert_eq!(
        read("region('trigger', { part: 'trigger' }), layer('surface', { alone: true, anchor: 'trigger', band: true, open: bind('open') }, [region('default')])"),
        Ok(())
    );
    let loose = read("layer('surface', { band: true, open: bind('open') }, [region('default')])")
        .unwrap_err();
    assert!(
        loose.contains("a `band` stands under its `anchor`, and it names none"),
        "{loose}"
    );
    let placed = read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', band: true, open: bind('open'), placement: 'top' }, [region('default')])").unwrap_err();
    assert!(placed.contains("so it takes no `placement`"), "{placed}");
    assert!(read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', band: false, open: bind('open') }, [region('default')])").is_err());
}

#[test]
fn focus_enters_on_down_and_returns_where_a_reader_dismissed_the_layer() {
    assert_eq!(
        read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', enters: 'down', open: bind('open'), presses: 'toggle', returns: 'dismissed' }, [region('default')])"),
        Ok(())
    );
    let unknown = read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', enters: 'up', open: bind('open') }, [region('default')])").unwrap_err();
    assert!(unknown.contains("`always`, `down`, `press`"), "{unknown}");
    let back = read("region('trigger', { part: 'trigger' }), layer('surface', { anchor: 'trigger', open: bind('open'), returns: 'never' }, [region('default')])").unwrap_err();
    assert!(back.contains("`always`, `dismissed`, `held`"), "{back}");
}
