//! What a gesture a source declares reads, held to what the element has.
//!
//! - **A layer that swipes and rests at snap points says where it rests.**
//!   Its `snap` reads a prop that holds words, `0.5 1`, and the element
//!   declares the state `snapped`, which holds while the layer rests short of
//!   the whole, as a drawer's does.

use super::{expect_prop, Names};
use crate::family::api::{Attribute, Binding, Primitive, PropType};
use crate::family::ir::Family;
use crate::family::vocabulary::layer::layers;

/// Where the family's gestures read what it lacks, one sentence each.
pub(super) fn gestures(family: &Family, names: &Names, found: &mut Vec<String>) {
    for layer in layers(&family.tree) {
        let Some(Attribute::Bound(Binding::Bind(snap))) = layer.attributes.get("snap") else {
            continue;
        };
        let at = format!("`layer('{}')`", layer.name);
        expect_prop(names, snap, &at, found);
        if names
            .prop(snap)
            .is_some_and(|prop| prop.kind != PropType::Primitive(Primitive::String))
        {
            found.push(format!(
                "{at} rests at the snap points `{snap}` holds, and `{snap}` holds no words"
            ));
        }
        if !names.states.contains("snapped") {
            found.push(format!(
                "{at} rests at snap points, and the element declares no state `snapped` for it to stand in short of the whole"
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::family::api::headless;
    use crate::family::ir::machines::Bound;
    use crate::family::ir::{styled, Family};
    use crate::family::read::default_export;
    use crate::family::resolve::unresolved as resolved;

    /// The family a headless source compiles to, with no rules.
    fn family(source: &str) -> Family {
        Family::new(
            styled(
                &default_export(
                    "export default family('dial', { stylesheet: 'dial/dial.css', rules: [] })",
                )
                .unwrap(),
            )
            .unwrap(),
            Some(headless(&default_export(source).unwrap()).unwrap()),
            "dial",
            "root",
        )
    }

    /// What `helix system build` says of a headless source, with no rules.
    fn unresolved(source: &str) -> Vec<String> {
        resolved(&family(source))
    }

    #[test]
    fn a_swiping_layer_binds_its_edge_points_and_swipe_to_its_machine() {
        let drawer = family(
            "export default headless('drawer', { props: [prop('open', 'boolean'), prop('placement', ['bottom', 'end', 'start', 'top']), prop('snap-points', 'string'), prop('swipe', 'boolean')], states: ['open', 'snapped'], toggle: { prop: 'open' }, tree: [layer('panel', { edge: bind('placement'), open: bind('open'), snap: bind('snap-points'), swipe: bind('swipe') }, [region('default')])] })",
        );
        assert_eq!(resolved(&drawer), Vec::<String>::new());
        let layer = drawer
            .machines
            .iter()
            .find(|one| one.machine == "layer")
            .expect("a layer machine");
        for (name, prop) in [
            ("edge", "placement"),
            ("snap", "snap-points"),
            ("swipe", "swipe"),
        ] {
            assert_eq!(
                layer.bind.get(name),
                Some(&Bound::Prop(prop.to_owned())),
                "{name}"
            );
        }
    }

    #[test]
    fn a_layer_that_snaps_reads_words_and_has_a_state_to_stand_in() {
        let found = unresolved(
            "export default headless('drawer', { props: [prop('open', 'boolean'), prop('snap-points', 'number')], states: ['open'], toggle: { prop: 'open' }, tree: [layer('panel', { edge: 'end', open: bind('open'), snap: bind('snap-points'), swipe: true }, [region('default')])] })",
        );
        assert!(
            found
                .iter()
                .any(|one| one.contains("`snap-points` holds no words")),
            "{found:?}"
        );
        assert!(
            found
                .iter()
                .any(|one| one.contains("declares no state `snapped`")),
            "{found:?}"
        );
    }
}
