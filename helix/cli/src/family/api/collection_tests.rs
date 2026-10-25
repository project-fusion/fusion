use super::{collection, Keys};
use crate::family::read::Lit;

fn text(value: &str) -> Lit {
    Lit::Text(value.to_owned())
}

/// `collection({ chosen: 'value', keys })`.
fn with(keys: Option<Vec<(String, Lit)>>) -> Lit {
    let mut fields = vec![("chosen".to_owned(), text("value"))];
    if let Some(keys) = keys {
        fields.push(("keys".to_owned(), Lit::Object(keys)));
    }
    Lit::Call("collection".to_owned(), vec![Lit::Object(fields)])
}

#[test]
fn reads_how_the_keys_move() {
    let read = collection(&with(Some(vec![
        ("chooses".to_owned(), Lit::Bool(false)),
        (
            "keeps".to_owned(),
            Lit::Array(vec![text("ArrowLeft"), text("ArrowRight")]),
        ),
        ("wrap".to_owned(), Lit::Bool(false)),
    ])))
    .unwrap();
    assert_eq!(
        read.keys,
        Keys {
            adds: None,
            along: None,
            chooses: false,
            enter: None,
            escape: None,
            keeps: vec!["ArrowLeft".to_owned(), "ArrowRight".to_owned()],
            letterless: false,
            selects: None,
            wrap: false,
        }
    );
}

#[test]
fn refuses_a_collection_that_does_not_say_how_its_keys_move() {
    assert_eq!(
        collection(&with(None)).unwrap_err(),
        "a collection says how its keys move, as `keys: { chooses, wrap }`"
    );
    assert_eq!(
        collection(&with(Some(vec![("wrap".to_owned(), Lit::Bool(true))]))).unwrap_err(),
        "collection: `keys` says whether arriving chooses, as `chooses`"
    );
}

#[test]
fn reads_the_prop_the_moving_arrows_run_along() {
    let read = collection(&with(Some(vec![
        ("along".to_owned(), text("orientation")),
        ("chooses".to_owned(), Lit::Bool(false)),
        ("wrap".to_owned(), Lit::Bool(false)),
    ])))
    .unwrap();
    assert_eq!(read.keys.along.as_deref(), Some("orientation"));
    assert!(read
        .references()
        .contains(&("keys.along", "orientation", super::Names::Prop)));
}

#[test]
fn refuses_a_kept_key_that_moves_no_focus() {
    let read = collection(&with(Some(vec![
        ("chooses".to_owned(), Lit::Bool(true)),
        ("keeps".to_owned(), Lit::Array(vec![text("Enter")])),
        ("wrap".to_owned(), Lit::Bool(true)),
    ])));
    assert_eq!(
        read.unwrap_err(),
        "collection: `keys.keeps` holds the keys that move focus, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, End, Home"
    );
}

#[test]
fn reads_a_set_whose_items_press_themselves() {
    let mut fields = vec![
        ("chosen".to_owned(), text("value")),
        ("keeps".to_owned(), text("disallow-empty-selection")),
        ("label".to_owned(), text("label")),
        ("mode".to_owned(), text("selection-mode")),
        ("presses".to_owned(), text("selection-mode")),
        ("roves".to_owned(), text("selection-mode")),
    ];
    fields.push((
        "keys".to_owned(),
        Lit::Object(vec![
            ("chooses".to_owned(), Lit::Bool(false)),
            ("selects".to_owned(), Lit::Bool(false)),
            ("wrap".to_owned(), Lit::Bool(true)),
        ]),
    ));
    let read = collection(&Lit::Call(
        "collection".to_owned(),
        vec![Lit::Object(fields)],
    ))
    .unwrap();
    assert_eq!(read.keys.selects, Some(false));
    assert_eq!(read.keeps.as_deref(), Some("disallow-empty-selection"));
    assert_eq!(read.label.as_deref(), Some("label"));
    assert_eq!(read.presses.as_deref(), Some("selection-mode"));
    assert_eq!(read.roves.as_deref(), Some("selection-mode"));
}

#[test]
fn refuses_the_fields_presses_and_roves_say_for_it() {
    /* Which items are radios and how a set is announced in a toolbar follow
    from `presses`, `roves` and `keys.selects`, so no field says them. */
    for (key, value) in [("radios", text("single")), ("toolbar", Lit::Bool(true))] {
        let fields = vec![
            ("chosen".to_owned(), text("value")),
            (key.to_owned(), value),
        ];
        let read = collection(&Lit::Call(
            "collection".to_owned(),
            vec![Lit::Object(fields)],
        ));
        assert_eq!(
            read.unwrap_err(),
            format!("collection: `{key}` is not a field it has")
        );
    }
}

#[test]
fn reads_the_state_an_item_shows_while_chosen() {
    let read = crate::family::api::item::item(&Lit::Call(
        "item".to_owned(),
        vec![
            text("button-group"),
            Lit::Object(vec![("state".to_owned(), text("pressed"))]),
        ],
    ))
    .unwrap();
    assert_eq!(read.state.as_deref(), Some("pressed"));
}

#[test]
fn reads_how_an_item_is_removed_and_what_enter_does() {
    let fields = vec![
        ("chosen".to_owned(), text("value")),
        (
            "keys".to_owned(),
            Lit::Object(vec![
                ("adds".to_owned(), text("replace")),
                ("chooses".to_owned(), Lit::Bool(false)),
                ("enter".to_owned(), text("selects")),
                ("wrap".to_owned(), Lit::Bool(false)),
            ]),
        ),
        (
            "removes".to_owned(),
            Lit::Object(vec![
                ("empty".to_owned(), text("empty")),
                ("event".to_owned(), text("dismiss")),
            ]),
        ),
    ];
    let read = collection(&Lit::Call(
        "collection".to_owned(),
        vec![Lit::Object(fields)],
    ))
    .unwrap();
    assert_eq!(read.keys.enter.as_deref(), Some("selects"));
    assert_eq!(read.keys.adds.as_deref(), Some("replace"));
    let references = read.references();
    assert!(references.contains(&("removes.event", "dismiss", super::Names::Event)));
    assert!(references.contains(&("removes.empty", "empty", super::Names::Part)));
}

#[test]
fn refuses_an_enter_that_does_anything_but_select() {
    let read = collection(&with(Some(vec![
        ("chooses".to_owned(), Lit::Bool(false)),
        ("enter".to_owned(), text("acts")),
        ("wrap".to_owned(), Lit::Bool(false)),
    ])));
    assert!(read.unwrap_err().contains("`keys.enter` is `selects`"));
}

#[test]
fn refuses_an_adds_that_names_anything_but_replace() {
    let read = collection(&with(Some(vec![
        ("adds".to_owned(), text("toggle")),
        ("chooses".to_owned(), Lit::Bool(false)),
        ("wrap".to_owned(), Lit::Bool(false)),
    ])));
    assert!(read.unwrap_err().contains("`keys.adds` is `replace`"));
}

#[test]
fn reads_the_regions_an_item_is_named_by() {
    let read = crate::family::api::item::item(&Lit::Call(
        "item".to_owned(),
        vec![
            text("tag-group"),
            Lit::Object(vec![(
                "named".to_owned(),
                Lit::Array(vec![text("start"), text("default")]),
            )]),
        ],
    ))
    .unwrap();
    assert_eq!(read.named, vec!["start".to_owned(), "default".to_owned()]);
}

#[test]
fn reads_where_escape_lets_go_and_the_order_a_press_writes() {
    let fields = vec![
        ("chosen".to_owned(), text("value")),
        (
            "keys".to_owned(),
            Lit::Object(vec![
                ("chooses".to_owned(), Lit::Bool(false)),
                ("escape".to_owned(), text("plain")),
                ("wrap".to_owned(), Lit::Bool(false)),
            ]),
        ),
        ("order".to_owned(), text("pressed")),
    ];
    let read = collection(&Lit::Call(
        "collection".to_owned(),
        vec![Lit::Object(fields)],
    ))
    .unwrap();
    assert_eq!(read.keys.escape.as_deref(), Some("plain"));
    assert_eq!(read.order.as_deref(), Some("pressed"));
    assert!(!read.references().iter().any(|(at, _, _)| *at == "order"));
}

#[test]
fn refuses_an_escape_or_an_order_that_names_anything_else() {
    let read = collection(&with(Some(vec![
        ("chooses".to_owned(), Lit::Bool(false)),
        ("escape".to_owned(), text("always")),
        ("wrap".to_owned(), Lit::Bool(false)),
    ])));
    assert!(read.unwrap_err().contains("`keys.escape` is `plain`"));
    let fields = vec![
        ("chosen".to_owned(), text("value")),
        ("order".to_owned(), text("items")),
    ];
    let read = collection(&Lit::Call(
        "collection".to_owned(),
        vec![Lit::Object(fields)],
    ));
    assert!(read.unwrap_err().contains("`order` is `pressed`"));
}
