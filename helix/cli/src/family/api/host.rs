//! The values an element computes and what a screen reader hears of its
//! host, read from its headless source's `derived` and `host`.

use std::collections::BTreeMap;

use super::tree::{attribute, binding, derived, Attribute, Binding, NodeKind};
use crate::family::ir::is_list;
use crate::family::read::Lit;
use crate::family::vocabulary;

/// The values an element computes, its headless source's `derived`: each
/// name with `derive(name)`, a function in core's derivations that the
/// native runtime calls with the element's props, or `bind(name)`, a prop or
/// whether a region holds something.
///
/// # Errors
///
/// A sentence naming the value that is neither.
pub fn computed(lit: &Lit) -> Result<BTreeMap<String, Attribute>, String> {
    let Lit::Object(entries) = lit else {
        return Err("`derived` is an object of names, each `derive()` or `bind()`".to_owned());
    };
    entries
        .iter()
        .map(|(name, value)| {
            let value = &super::spelling::bound(&format!("derived.{name}"), value)?;
            let read = match (derived(value), binding(value)) {
                (Some(Ok(Attribute::Derived { derive })), _) if is_list(&derive) => {
                    Err("computes a list, which only a repeat's `each` reads".to_owned())
                }
                (Some(derived), _) => derived,
                (None, Some(bound @ Binding::Bind(_))) => Ok(Attribute::Bound(bound)),
                _ => Err("is `derive()` or `bind()`".to_owned()),
            };
            read.map(|value| (name.clone(), value))
                .map_err(|why| format!("`derived.{name}` {why}"))
        })
        .collect()
}

/// What a screen reader hears of the host, its headless source's `host`: a
/// `role` and a `label`, each as a box takes it.
///
/// # Errors
///
/// A sentence naming the attribute the host does not take, or its value.
pub fn host(lit: &Lit) -> Result<BTreeMap<String, Attribute>, String> {
    let Lit::Object(entries) = lit else {
        return Err("`host` is an object of attributes".to_owned());
    };
    entries
        .iter()
        .map(|(written, value)| {
            /* Out of a screen reader's reach is `ariaHidden`, as a node
            writes it, which the intermediate form calls `decorative`. */
            let key = match written.as_str() {
                "ariaHidden" => "decorative",
                "decorative" => return Err("`host.decorative` is written `ariaHidden`".to_owned()),
                other => other,
            };
            /* A range's reading, as a meter's and a progress bar's, and
            whether the host is busy or out of a screen reader's reach, as a
            skeleton's, are the host's too. */
            if !matches!(
                key,
                "busy"
                    | "decorative"
                    | "label"
                    | "role"
                    | "valuemax"
                    | "valuemin"
                    | "valuenow"
                    | "valuetext"
            ) {
                return Err(format!(
                    "`host` takes `ariaHidden`, `busy`, `label`, `role`, and a range's `valuemin`, `valuemax`, `valuenow` and `valuetext`, and `{key}` is none of them"
                ));
            }
            let value = super::spelling::bound(&format!("host.{key}"), value)?;
            let value = attribute(&value).map_err(|why| format!("`host`: `{key}` {why}"))?;
            vocabulary::attribute(NodeKind::Box, "host", key, &value)?;
            Ok((key.to_owned(), value))
        })
        .collect()
}
