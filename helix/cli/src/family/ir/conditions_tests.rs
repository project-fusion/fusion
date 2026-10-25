use super::*;
use crate::family::read::default_export;

/// The conditions a `when` object reads as.
fn read(when: &str) -> Result<Vec<Condition>, String> {
    let Lit::Call(_, arguments) = default_export(&format!("export default f({when})")).unwrap()
    else {
        panic!("a call");
    };
    conditions(&arguments[0])
}

fn state(name: &str) -> Condition {
    Condition::State {
        name: name.to_owned(),
    }
}

#[test]
fn reads_none_of_several_values_as_a_not_each() {
    assert_eq!(
        read("{ lines: { not: ['0', '1'] } }").unwrap(),
        ["0", "1"]
            .iter()
            .map(|value| not(Condition::Attribute {
                name: "lines".to_owned(),
                value: Some((*value).to_owned()),
            }))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        read("{ separation: ['filled', 'outlined'] }").unwrap(),
        vec![Condition::OneOf {
            name: "separation".to_owned(),
            values: vec!["filled".to_owned(), "outlined".to_owned()],
        }]
    );
}

#[test]
fn reads_every_state_and_one_that_does_not_hold() {
    assert_eq!(
        read("{ state: ['invalid', 'checked'] }").unwrap(),
        vec![state("invalid"), state("checked")]
    );
    assert_eq!(
        read("{ state: { 'has-label': false } }").unwrap(),
        vec![not(state("has-label"))]
    );
}

#[test]
fn reads_an_interaction_that_does_not_hold_as_its_negation() {
    /* `hover: false` once read as an absent attribute named `hover`. */
    assert_eq!(
        read("{ hover: false, focusWithin: true }").unwrap(),
        vec![not(pseudo(&["hover"])), pseudo(&["focus-within"])]
    );
}

#[test]
fn marks_print_forced_colors_hovering_and_an_element_not_yet_upgraded_as_the_webs() {
    let web = |when: &str| read(when).unwrap().iter().any(web_only);
    assert!(web("{ print: true }"));
    assert!(web("{ forcedColors: true }"));
    assert!(web("{ canHover: true }"));
    assert!(web("{ defined: false }"));
    assert!(!web("{ defined: true }"));
    assert!(!web("{ reducedMotion: false }"));
}

#[test]
fn reads_places_for_the_target_and_for_the_host() {
    assert_eq!(
        read("{ child: 'earlier', place: 'last' }").unwrap(),
        vec![
            not(Condition::Place { place: Place::Last }),
            Condition::HostPlace { place: Place::Last },
        ]
    );
    assert_eq!(
        read("{ place: 'later' }").unwrap(),
        vec![not(Condition::HostPlace {
            place: Place::First
        })]
    );
}

#[test]
fn reads_the_hosts_place_among_its_own_kind() {
    assert_eq!(
        read("{ ofType: 3 }").unwrap(),
        vec![Condition::HostOfType { at: 3 }]
    );
    for refused in ["{ ofType: 0 }", "{ ofType: 1.5 }", "{ ofType: 'first' }"] {
        assert_eq!(
            read(refused).unwrap_err(),
            "`ofType` is a whole number from 1"
        );
    }
}

#[test]
fn says_what_a_condition_takes() {
    assert_eq!(
        read("{ part: { hidden: 1 } }").unwrap_err(),
        "`part.hidden` takes `true`, `false` or a value"
    );
    assert_eq!(
        read("{ tone: { is: 'red' } }").unwrap_err(),
        "`tone` in `when` takes `{ not: a value or an array of them }`"
    );
    assert!(read("{ interaction: ['focusWithin'] }").is_err());
}

#[test]
fn reads_a_width_below_a_length_in_rems() {
    assert_eq!(
        read("{ inlineSize: { below: '22rem' } }").unwrap(),
        vec![Condition::Container {
            below: "22rem".to_owned(),
        }]
    );
    assert!(read("{ inlineSize: { below: '300px' } }").is_err());
    assert!(read("{ inlineSize: { above: '22rem' } }").is_err());
}

#[test]
fn reads_what_holds_of_a_part_around_a_part_inside_and_the_parts_it_is() {
    let hover = Condition::Pseudo {
        names: vec!["hover".to_owned()],
    };
    let focus = Condition::Holds {
        names: vec!["focus-visible".to_owned()],
        part: "control".to_owned(),
    };
    assert_eq!(
        read("{ within: { field: { hover: true } } }").unwrap(),
        vec![Condition::Within {
            on: Some(vec![hover]),
            part: "field".to_owned(),
        }]
    );
    assert_eq!(
        read("{ within: { track: { holds: { control: 'focusVisible' } } } }").unwrap(),
        vec![Condition::Within {
            on: Some(vec![focus.clone()]),
            part: "track".to_owned(),
        }]
    );
    assert_eq!(
        read("{ holds: { control: 'focusVisible' } }").unwrap(),
        vec![focus]
    );
    assert_eq!(
        read("{ also: { 'mark-dash': false } }").unwrap(),
        vec![Condition::Also {
            name: "mark-dash".to_owned(),
            value: false,
        }]
    );
    assert_eq!(
        read("{ lacks: 'disabled' }").unwrap(),
        vec![Condition::Absent {
            name: "disabled".to_owned(),
        }]
    );
    assert!(read("{ within: { field: { focusWithin: true } } }").is_err());
}

#[test]
fn reads_several_places_that_all_hold_in_the_order_written() {
    assert_eq!(
        read("{ child: ['last', 'later'] }").unwrap(),
        vec![
            Condition::Place { place: Place::Last },
            Condition::Child { first: false },
        ]
    );
    assert!(read("{ child: ['last', 1] }").is_err());
}

#[test]
fn reads_the_device_and_the_entering_conditions() {
    let media = |query: &str| Condition::Media {
        query: query.to_owned(),
    };
    assert_eq!(
        read("{ canHover: false, coarsePointer: true, entering: true }").unwrap(),
        vec![
            media("(hover: none)"),
            media("(pointer: coarse)"),
            Condition::Entering,
        ]
    );
    let web = |when: &str| read(when).unwrap().iter().any(web_only);
    assert!(!web("{ canHover: false }"));
    assert!(!web("{ coarsePointer: true }"));
    assert!(web("{ coarsePointer: false }"));
    assert!(read("{ entering: false }").is_err());
}

#[test]
fn reads_even_and_odd_places_and_a_part_that_is_drawn() {
    assert_eq!(
        read("{ place: 'even', child: 'odd' }").unwrap(),
        vec![
            Condition::HostPlace { place: Place::Even },
            Condition::Place { place: Place::Odd },
        ]
    );
    let icon = Condition::Holds {
        names: Vec::new(),
        part: "icon".to_owned(),
    };
    assert_eq!(
        read("{ holds: { icon: true } }").unwrap(),
        vec![icon.clone()]
    );
    assert_eq!(read("{ holds: { icon: false } }").unwrap(), vec![not(icon)]);
}

#[test]
fn reads_the_regions_that_hold_something() {
    let filled = |region: &str| Condition::Filled {
        region: region.to_owned(),
    };
    assert_eq!(read("{ filled: 'label' }").unwrap(), vec![filled("label")]);
    assert_eq!(
        read("{ filled: { icon: false, label: true } }").unwrap(),
        vec![not(filled("icon")), filled("label")]
    );
    assert!(read("{ filled: 3 }").is_err());
}

#[test]
fn reads_a_place_counted_from_either_end_and_the_web_writes_it() {
    let nth = |at, from_end, onward| Condition::Place {
        place: Place::Nth {
            at,
            from_end,
            onward,
        },
    };
    assert_eq!(read("{ nth: 2 }").unwrap(), vec![nth(2, false, false)]);
    assert_eq!(
        read("{ nthLast: { from: 5 } }").unwrap(),
        vec![nth(5, true, true)]
    );
    assert_eq!(
        Place::Nth {
            at: 5,
            from_end: true,
            onward: true
        }
        .css(),
        ":nth-last-child(n + 5)"
    );
    assert_eq!(
        Place::Nth {
            at: 2,
            from_end: false,
            onward: false
        }
        .css(),
        ":nth-child(2)"
    );
    assert!(read("{ nth: 0 }").is_err());
    assert!(read("{ nthLast: { to: 2 } }").is_err());
}
