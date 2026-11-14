//! The events an element sends as a value it computes changes, and the
//! fields any event's detail gives, held to the computed values and props
//! they name.

use super::Names;
use crate::family::api::Api;

/// The events a computed value sends: each follows a computed value. Each
/// field any event gives, as a callout's `dismiss` gives its `label`, reads
/// a computed value or a prop the detail has.
pub(super) fn followed(api: &Api, names: &Names, found: &mut Vec<String>) {
    for event in &api.events {
        if let Some(follows) = &event.follows {
            if !names.derived.contains(follows.as_str()) {
                found.push(format!(
                    "event `{}` follows `{follows}`, and no computed value has that name",
                    event.name
                ));
            }
        } else if event.arrives {
            found.push(format!(
                "event `{}` arrives with the first render, and follows no computed value",
                event.name
            ));
        }
        for (field, from) in &event.gives {
            if !event.detail.contains(field) {
                found.push(format!(
                    "event `{}` gives `{field}`, and its detail has no such field",
                    event.name
                ));
            }
            if !names.derived.contains(from.as_str()) && names.prop(from).is_none() {
                found.push(format!(
                    "event `{}` gives `{field}` from `{from}`, and no computed value or prop has that name",
                    event.name
                ));
            }
        }
    }
}
