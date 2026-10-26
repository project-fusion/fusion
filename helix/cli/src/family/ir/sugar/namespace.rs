//! A rule's conditions in one namespace: over a headless source written
//! with `render`, a name alone in a `when` is a prop, a custom state, or an
//! attribute of the part the rule is on, resolved from the source.
//!
//! **Each name resolves to one thing, or the rule is refused.** `{ hover:
//! true, disabled: false }` on a tab is `part: { disabled: false }`, since the
//! tab's press carries `disabled` bound to the prop of that name, and
//! `{ selected: true }` is `state: { selected: true }`.
//!
//! - **A part's attribute** is one a part condition reads, `disabled`,
//!   `hidden`, `href`, or a `data-` attribute, carried by every part the rule
//!   is on. Bound to the prop of its own name, it is that prop as the part
//!   has it, and the part's is read.
//! - **A state** is a custom state or a value the element computes. **A
//!   state is read over the prop of its own name**, as `selected`, `open`,
//!   `pressed`, and `pending` are: the element sets the state from the prop,
//!   and from what its set says, and every style table that has both reads
//!   the state.
//! - **A prop** is one the headless source or the table declares.
//! - A part's attribute that is a state as well, or bound to another value
//!   than the prop of its name, is ambiguous, and is refused with the two
//!   spellings that say which.
//!
//! **The older spellings keep their meaning**: `part: { ... }`, `state: ...`,
//! and every condition the vocabulary names, such as `hover`. On a part,
//! `within: { host: { disabled: false } }` is the host's own `:disabled`,
//! beside any other part the rule is within, and
//! `within: { host: ['hover', 'focusWithin'] }` is any one of several, as a
//! `when` of several alternatives is; both hold in every table.

use std::collections::{BTreeMap, BTreeSet};

use super::target::Target;
use super::Names;
use crate::family::api::{self, Attribute, Binding, Node};
use crate::family::read::Lit;

/// The keys a `when` reads as the vocabulary's own conditions.
pub(super) const RESERVED: &[&str] = &[
    "active",
    "also",
    "canHover",
    "child",
    "coarsePointer",
    "defined",
    "dir",
    "entering",
    "filled",
    "focusVisible",
    "focusWithin",
    "forcedColors",
    "has",
    "holds",
    "hover",
    "inlineSize",
    "interaction",
    "lacks",
    "nth",
    "nthLast",
    "ofType",
    "part",
    "place",
    "platform",
    "print",
    "reducedMotion",
    "state",
    "supports",
    "window",
    "within",
];

/// What a part condition reads of a part.
fn readable(name: &str) -> bool {
    ["disabled", "hidden", "href"].contains(&name) || name.starts_with("data-")
}

/// What a headless source written with `render` declares, which a style
/// table's conditions resolve against.
#[derive(Clone, Debug, Default)]
pub struct Source {
    /// The custom states and the values the element computes.
    states: BTreeSet<String>,
    /// The props, the headless source's and the table's.
    props: BTreeSet<String>,
    /// The attributes each part carries, by the part's name.
    parts: BTreeMap<String, BTreeMap<String, Attribute>>,
}

impl Source {
    /// What a headless source declares.
    pub fn of(headless: &api::Headless) -> Self {
        let mut parts = BTreeMap::new();
        carried(&headless.tree, &mut parts);
        Self {
            parts,
            props: headless
                .api
                .props
                .iter()
                .map(|prop| prop.name.clone())
                .collect(),
            states: headless
                .api
                .states
                .iter()
                .chain(headless.api.derived.keys())
                .cloned()
                .collect(),
        }
    }

    /// With the table's own props as well.
    pub(super) fn with_props(&self, styled: &[String]) -> Self {
        let mut with = self.clone();
        with.props.extend(styled.iter().cloned());
        with
    }
}

/// The attributes each part in a tree carries.
fn carried(nodes: &[Node], into: &mut BTreeMap<String, BTreeMap<String, Attribute>>) {
    for node in nodes {
        if node.kind.is_part() {
            into.entry(node.name.clone())
                .or_default()
                .extend(node.attributes.clone());
        }
        carried(&node.children, into);
    }
}

/// One alternative of a `when`, as its fields.
type Fields = Vec<(String, Lit)>;

impl Names {
    /// A rule's `when` with each name resolved, or `None` where nothing in it
    /// changes.
    pub(super) fn namespace(
        &self,
        when: Option<&Lit>,
        target: &Target,
    ) -> Result<Option<Lit>, String> {
        let (alternatives, several) = match when {
            Some(Lit::Object(fields)) => (vec![fields], false),
            Some(Lit::Array(each)) => {
                let mut fields = Vec::new();
                for one in each {
                    let Lit::Object(one) = one else {
                        return Ok(None);
                    };
                    fields.push(one);
                }
                (fields, true)
            }
            _ => return Ok(None),
        };
        let mut changed = false;
        let mut read = Vec::new();
        for fields in alternatives {
            let resolved = self.alternative(fields, target)?;
            changed |= resolved.len() != 1 || resolved.first() != Some(fields);
            read.extend(resolved);
        }
        if !changed {
            return Ok(None);
        }
        Ok(Some(if read.len() == 1 && !several {
            Lit::Object(read.remove(0))
        } else {
            Lit::Array(read.into_iter().map(Lit::Object).collect())
        }))
    }

    /// One alternative, as one or several, each name resolved.
    fn alternative(&self, fields: &Fields, target: &Target) -> Result<Vec<Fields>, String> {
        let mut read: Vec<Fields> = vec![Vec::new()];
        let push = |read: &mut Vec<Fields>, key: &str, value: Lit| {
            for one in read.iter_mut() {
                one.push((key.to_owned(), value.clone()));
            }
        };
        for (key, value) in fields {
            if key == "within" {
                read = host(read, value)?;
            } else if self.source.is_none()
                || RESERVED.contains(&key.as_str())
                || target.slotted.is_some()
            {
                push(&mut read, key, value.clone());
            } else {
                let (key, value) = self.resolved(key, value, target)?;
                push(&mut read, &key, value);
            }
        }
        Ok(read)
    }

    /// A name alone, as the condition it is in the source.
    fn resolved(&self, name: &str, value: &Lit, target: &Target) -> Result<(String, Lit), String> {
        let Some(source) = &self.source else {
            return Ok((name.to_owned(), value.clone()));
        };
        let parts: Vec<&str> = match &target.on {
            Some(Lit::Text(part)) if part != "host" => vec![part.as_str()],
            Some(Lit::Array(parts)) => parts
                .iter()
                .filter_map(|part| match part {
                    Lit::Text(part) => Some(part.as_str()),
                    _ => None,
                })
                .collect(),
            _ => Vec::new(),
        };
        let carried: Vec<Option<&Attribute>> = parts
            .iter()
            .map(|part| {
                source
                    .parts
                    .get(*part)
                    .and_then(|attributes| attributes.get(name))
            })
            .collect();
        let part = readable(name) && !parts.is_empty() && carried.iter().all(Option::is_some);
        let state = source.states.contains(name);
        let prop = source.props.contains(name);
        let bound = carried.iter().all(
            |one| matches!(one, Some(Attribute::Bound(Binding::Bind(bound))) if bound == name),
        );
        let on = parts.join("`, `");
        let one = |key: &str| {
            (
                key.to_owned(),
                Lit::Object(vec![(name.to_owned(), value.clone())]),
            )
        };
        match (part, state, prop) {
            (true, true, _) => Err(format!(
                "`{name}` is an attribute of `{on}` and a state: write `part: {{ {name}: ... }}` or `state: {{ {name}: ... }}`"
            )),
            (true, false, true) if !bound => Err(format!(
                "`{name}` is an attribute of `{on}` and a prop it is not bound to: write `part: {{ {name}: ... }}`, or the prop's name with `has`"
            )),
            (true, ..) => Ok(one("part")),
            (false, true, _) => match value {
                Lit::Bool(_) => Ok(one("state")),
                _ => Err(format!("`{name}` is a state, which is `true` or `false`")),
            },
            /* `disabled` alone is the host's `:disabled` in the older
            spelling, so the prop is read as the attribute it is. */
            (false, false, true) if name == "disabled" => match value {
                Lit::Bool(true) => Ok(("has".to_owned(), Lit::Text(name.to_owned()))),
                Lit::Bool(false) => Ok(("lacks".to_owned(), Lit::Text(name.to_owned()))),
                _ => Err("the prop `disabled` is `true` or `false`".to_owned()),
            },
            (false, false, true) => Ok((name.to_owned(), value.clone())),
            (false, false, false) => Err(format!(
                "`{name}` in `when` names no prop, state, or attribute of the part the rule is on"
            )),
        }
    }
}

/// `within`, with the host's `disabled` taken out as the host's own
/// condition, and an array of the host's interactions as one alternative
/// each.
fn host(read: Vec<Fields>, value: &Lit) -> Result<Vec<Fields>, String> {
    let with = |read: &[Fields], key: &str, value: Lit| -> Vec<Fields> {
        read.iter()
            .map(|one| {
                let mut one = one.clone();
                one.push((key.to_owned(), value.clone()));
                one
            })
            .collect()
    };
    let within = |inner: Lit| Lit::Object(vec![("host".to_owned(), inner)]);
    match value {
        Lit::Object(parts) => match parts.as_slice() {
            [(part, Lit::Array(names))] if part == "host" => {
                let mut each = Vec::new();
                for name in names {
                    let Lit::Text(name) = name else {
                        return Err(
                            "`within: { host: [...] }` lists interactions by name".to_owned()
                        );
                    };
                    let one = Lit::Object(vec![(name.clone(), Lit::Bool(true))]);
                    each.extend(with(&read, "within", within(one)));
                }
                Ok(each)
            }
            /* The host's `disabled`, taken out first, beside whatever else
            the rule is within, as `{ host: { disabled: false }, field: {
            hover: true } }`. */
            entries
                if entries.iter().any(|(part, inner)| {
                    part == "host"
                        && matches!(inner, Lit::Object(inner) if inner.iter().any(|(key, _)| key == "disabled"))
                }) =>
            {
                let mut read = read;
                let mut rest: Fields = Vec::new();
                for (part, inner) in entries {
                    match inner {
                        Lit::Object(inner) if part == "host" => {
                            for (_, disabled) in inner.iter().filter(|(key, _)| key == "disabled") {
                                read = with(&read, "disabled", disabled.clone());
                            }
                            let host: Fields = inner
                                .iter()
                                .filter(|(key, _)| key != "disabled")
                                .cloned()
                                .collect();
                            if !host.is_empty() {
                                rest.push((part.clone(), Lit::Object(host)));
                            }
                        }
                        _ => rest.push((part.clone(), inner.clone())),
                    }
                }
                if !rest.is_empty() {
                    read = with(&read, "within", Lit::Object(rest));
                }
                Ok(read)
            }
            _ => Ok(with(&read, "within", value.clone())),
        },
        _ => Ok(with(&read, "within", value.clone())),
    }
}
