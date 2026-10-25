//! The machines a guided tour and each of its stops run: `tour` on the
//! element that holds the stops, bound to the prop that holds the index, the
//! events a move and an ending send, the props that label each stop's
//! controls, the states it holds, and the values it computes; and
//! `tour-stop` on each stop, bound to its target, its kind, its controls,
//! the props the tour writes on it, and the values it computes from its
//! place.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Api, Names, Stop, Tour};

/// The tour an element holds and its place in one, each a machine where its
/// source declares it.
pub(super) fn touring(api: &Api) -> impl Iterator<Item = MachineUse> + '_ {
    let stop = api.stop.as_ref().map(stopped);
    stop.into_iter().chain(api.tour.as_ref().map(toured))
}

/// A binding for each name a source holds, by the field that holds it.
fn bound(references: Vec<(&'static str, &str, Names)>) -> BTreeMap<String, Bound> {
    references
        .into_iter()
        .map(|(at, name, names)| {
            let name = name.to_owned();
            let bound = match names {
                Names::Event => Bound::Event(name),
                Names::Part => Bound::Part(name),
                Names::Prop => Bound::Prop(name),
                Names::State => Bound::State(name),
            };
            (at.to_owned(), bound)
        })
        .collect()
}

/// The tour, bound to what its source names and to the values it computes:
/// whether it lights a target, whether it veils the page, and the start of
/// the names of the lit box's lengths.
fn toured(tour: &Tour) -> MachineUse {
    let mut bind = bound(tour.references());
    for (at, name) in [
        ("lit", &tour.lit),
        ("spot", &tour.spot),
        ("veiled", &tour.veiled),
    ] {
        bind.insert(at.to_owned(), Bound::State(name.clone()));
    }
    MachineUse {
        bind,
        machine: "tour".to_owned(),
    }
}

/// A stop, bound to what its source names and to the values it computes.
fn stopped(stop: &Stop) -> MachineUse {
    let mut bind = bound(stop.references());
    for (at, name) in [
        ("counted", &stop.counted),
        ("name", &stop.name),
        ("place", &stop.place),
        ("reach", &stop.reach),
        ("said", &stop.said),
        ("shown", &stop.shown),
        ("words", &stop.words),
    ] {
        bind.insert(at.to_owned(), Bound::State(name.clone()));
    }
    MachineUse {
        bind,
        machine: "tour-stop".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binds_a_tours_props_events_states_and_values() {
        let used = toured(&Tour {
            asks: "tour-ask".to_owned(),
            before: "before-activate".to_owned(),
            index: "index".to_owned(),
            lit: "lit".to_owned(),
            padding: Some("spotlight-padding".to_owned()),
            preparing: "preparing".to_owned(),
            ..Tour::default()
        });
        assert_eq!(used.machine, "tour");
        assert_eq!(
            used.bind.get("before"),
            Some(&Bound::Event("before-activate".to_owned()))
        );
        assert_eq!(
            used.bind.get("padding"),
            Some(&Bound::Prop("spotlight-padding".to_owned()))
        );
        assert_eq!(
            used.bind.get("preparing"),
            Some(&Bound::State("preparing".to_owned()))
        );
        assert_eq!(used.bind.get("lit"), Some(&Bound::State("lit".to_owned())));
        assert_eq!(used.bind.get("outside"), None);
    }

    #[test]
    fn binds_a_stops_parts_props_and_values() {
        let used = stopped(&Stop {
            next: "next".to_owned(),
            shown: "shown".to_owned(),
            target: "for".to_owned(),
            kind: Some("type".to_owned()),
            ..Stop::default()
        });
        assert_eq!(used.machine, "tour-stop");
        assert_eq!(used.bind.get("next"), Some(&Bound::Part("next".to_owned())));
        assert_eq!(
            used.bind.get("target"),
            Some(&Bound::Prop("for".to_owned()))
        );
        assert_eq!(used.bind.get("type"), Some(&Bound::Prop("type".to_owned())));
        assert_eq!(
            used.bind.get("shown"),
            Some(&Bound::State("shown".to_owned()))
        );
    }
}
