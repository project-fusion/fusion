use super::*;

fn call(helper: &str, fields: &[(&str, &str)]) -> Lit {
    Lit::Call(
        helper.to_owned(),
        vec![Lit::Object(
            fields
                .iter()
                .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                .collect(),
        )],
    )
}

const TOUR: &[(&str, &str)] = &[
    ("asks", "tour-ask"),
    ("before", "before-activate"),
    ("completes", "complete"),
    ("index", "index"),
    ("initial", "default-index"),
    ("lit", "lit"),
    ("moves", "activate"),
    ("preparing", "preparing"),
    ("spot", "spot"),
    ("veiled", "veiled"),
    ("waiting", "waiting"),
];

#[test]
fn reads_a_tour_what_it_names_and_what_it_computes() {
    let read = tour(&call("tour", TOUR)).unwrap();
    assert_eq!(read.initial.as_deref(), Some("default-index"));
    assert_eq!(read.references().len(), 8);
    assert_eq!(
        read.computed().collect::<Vec<_>>(),
        [
            "lit",
            "veiled",
            "spot-x",
            "spot-y",
            "spot-width",
            "spot-height"
        ]
    );
}

#[test]
fn refuses_a_tour_that_names_too_little_or_too_much() {
    assert_eq!(
        tour(&call("tour", &TOUR[1..])).unwrap_err(),
        "tour: a tour names its `asks`"
    );
    assert_eq!(
        tour(&call("tour", &[("holds", "x")])).unwrap_err(),
        "tour: `holds` is not a field it has"
    );
}

const STOP: &[(&str, &str)] = &[
    ("asks", "tour-ask"),
    ("back", "back"),
    ("counted", "counted"),
    ("current", "current"),
    ("first", "first"),
    ("last", "last"),
    ("name", "name"),
    ("next", "next"),
    ("place", "place"),
    ("reach", "reach"),
    ("said", "said"),
    ("shown", "shown"),
    ("skip", "skip"),
    ("target", "for"),
    ("type", "type"),
    ("words", "words"),
];

#[test]
fn reads_a_stop_what_it_names_and_what_it_computes() {
    let read = stop(&call("stop", STOP)).unwrap();
    assert_eq!(read.kind.as_deref(), Some("type"));
    assert_eq!(read.references().len(), 9);
    assert!(read.computed().any(|name| name == "next-words"));
}

#[test]
fn refuses_a_stop_with_no_target() {
    let without: Vec<_> = STOP
        .iter()
        .copied()
        .filter(|(key, _)| *key != "target")
        .collect();
    assert_eq!(
        stop(&call("stop", &without)).unwrap_err(),
        "stop: a stop names its `target`"
    );
}
