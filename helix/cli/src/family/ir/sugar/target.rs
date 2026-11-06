//! What a group is on, and a rule's `when` with the platform and the
//! feature query taken out: the fields `family()` gives each rule.

use super::Names;
use crate::family::read::Lit;

/// What a target says of the nodes its rules are on.
#[derive(Default)]
pub(super) struct Target {
    /// `on`, as `family()` writes it.
    pub(super) on: Option<Lit>,
    pub(super) exact: bool,
    pub(super) inner: Option<String>,
    pub(super) selector: Option<String>,
    pub(super) slotted: Option<String>,
    /// Whether every rule on it is the web's alone, as one with `inner` or
    /// `selector` is, but for `inner: '> slot'`, the content a part holds.
    pub(super) web: bool,
}

/// A rule's `when`, with the platform and the feature query taken out.
pub(super) struct When {
    /// The conditions left, without the platform and the feature query.
    pub(super) conditions: Option<Lit>,
    pub(super) platform: Option<String>,
    pub(super) supports: Option<String>,
}

impl Names {
    /// What a group is on.
    pub(super) fn target(&self, target: &Lit) -> Result<Target, String> {
        let part = |lit: &Lit, host: bool| -> Result<String, String> {
            match lit {
                Lit::Text(name) if host || name != "host" => self.styled_part(name),
                _ => Err("a target names a part".to_owned()),
            }
        };
        let mut read = Target::default();
        match target {
            Lit::Text(name) => read.on = Some(Lit::Text(part(&Lit::Text(name.clone()), true)?)),
            Lit::Array(names) if !names.is_empty() => {
                let names = names
                    .iter()
                    .map(|name| part(name, false).map(Lit::Text))
                    .collect::<Result<_, _>>()?;
                read.on = Some(Lit::Array(names));
            }
            Lit::Object(fields) => {
                let field = |key: &str| {
                    fields
                        .iter()
                        .find(|(name, _)| name == key)
                        .map(|(_, value)| value)
                };
                let keys: Vec<&str> = fields.iter().map(|(key, _)| key.as_str()).collect();
                match keys.as_slice() {
                    ["region"] | ["region", "slotted"] => {
                        read.on = Some(Lit::Object(vec![(
                            "region".to_owned(),
                            field("region").cloned().unwrap_or(Lit::Bool(false)),
                        )]));
                        match field("slotted") {
                            None => {}
                            Some(Lit::Text(tag)) => read.slotted = Some(tag.clone()),
                            Some(_) => return Err("`slotted` on a region is the tag of the children passed in, or `'*'` for every one".to_owned()),
                        }
                    }
                    ["slotted"] => {
                        let Some(Lit::Text(tag)) = field("slotted") else {
                            return Err(
                                "`{ slotted }` names the tag of the children the host styles"
                                    .to_owned(),
                            );
                        };
                        read.on = Some(Lit::Text("host".to_owned()));
                        read.slotted = Some(tag.clone());
                    }
                    ["part", "slotted"] | ["slotted", "part"] => {
                        if field("slotted") != Some(&Lit::Text("*".to_owned())) {
                            return Err("`slotted` on a part that is a region's slot is `'*'`, the content passed in".to_owned());
                        }
                        read.on = Some(match field("part") {
                            Some(Lit::Array(names)) if !names.is_empty() => Lit::Array(
                                names
                                    .iter()
                                    .map(|name| part(name, false).map(Lit::Text))
                                    .collect::<Result<_, _>>()?,
                            ),
                            other => Lit::Text(part(other.unwrap_or(&Lit::Bool(false)), false)?),
                        });
                        read.slotted = Some("*".to_owned());
                    }
                    /* A `backdrop` is the scrim a layer draws behind itself,
                    which a phone draws under the layer, and never the host's.
                    A `placeholder` is the words a field shows while it is
                    empty, which a phone colors through its `TextInput`. */
                    [pseudo @ ("before" | "after" | "backdrop" | "placeholder")] => {
                        read.on = Some(Lit::Text(part(
                            field(pseudo).unwrap_or(&Lit::Bool(false)),
                            matches!(*pseudo, "before" | "after"),
                        )?));
                        read.inner = Some(format!("::{pseudo}"));
                    }
                    ["part", "exact"] | ["exact", "part"] => {
                        if field("exact") != Some(&Lit::Bool(true)) {
                            return Err("`exact` is `true`".to_owned());
                        }
                        read.on = Some(Lit::Text(part(
                            field("part").unwrap_or(&Lit::Bool(false)),
                            false,
                        )?));
                        read.exact = true;
                    }
                    ["part", other @ ("inner" | "selector")]
                    | [other @ ("inner" | "selector"), "part"] => {
                        let Some(Lit::Text(written)) = field(other) else {
                            return Err(format!("`{other}` is a string"));
                        };
                        read.on = Some(Lit::Text(part(
                            field("part").unwrap_or(&Lit::Bool(false)),
                            true,
                        )?));
                        if *other == "inner" {
                            read.inner = Some(written.clone());
                        } else {
                            read.selector = Some(written.clone());
                        }
                        /* `> slot` is the content a part holds, which a
                        native view styles as the region's. */
                        read.web = !(*other == "inner" && written.trim() == "> slot");
                    }
                    _ => return Err(TARGETS.to_owned()),
                }
            }
            _ => return Err(TARGETS.to_owned()),
        }
        Ok(read)
    }

    /// A part a fragment may style: one of its `parts`, or the host.
    fn styled_part(&self, name: &str) -> Result<String, String> {
        match &self.parts {
            Some(parts) if name != "host" && !parts.iter().any(|part| part == name) => {
                Err(format!(
                    "`{name}` is not one of the `parts` the fragment declares: {}",
                    parts.join(", ")
                ))
            }
            _ => Ok(name.to_owned()),
        }
    }
}

const TARGETS: &str = "a target is `'host'`, a part, an array of parts, `{ region }`, `{ region, slotted }`, `{ slotted: tag }`, `{ part, slotted: '*' }`, `{ before }`, `{ after }`, `{ backdrop }`, `{ placeholder }`, `{ part, exact: true }`, `{ part, inner }` or `{ part, selector }`";

/// A `when` with its platform and feature query taken out, which every
/// alternative must agree on.
pub(super) fn split(when: Option<&Lit>) -> Result<When, String> {
    let alternatives: Vec<&Vec<(String, Lit)>> = match when {
        None => Vec::new(),
        Some(Lit::Object(fields)) => vec![fields],
        Some(Lit::Array(each)) => each
            .iter()
            .map(|one| match one {
                Lit::Object(fields) => Ok(fields),
                _ => Err("`when` is an object, or an array of them".to_owned()),
            })
            .collect::<Result<_, _>>()?,
        Some(_) => return Err("`when` is an object, or an array of them".to_owned()),
    };
    let taken = |key: &str| -> Result<Option<String>, String> {
        let each: Vec<Option<&Lit>> = alternatives
            .iter()
            .map(|fields| {
                fields
                    .iter()
                    .find(|(name, _)| name == key)
                    .map(|(_, value)| value)
            })
            .collect();
        if each.windows(2).any(|pair| pair[0] != pair[1]) {
            return Err(format!(
                "every alternative of a `when` says the same `{key}`"
            ));
        }
        match each.first().copied().flatten() {
            None => Ok(None),
            Some(Lit::Text(value)) => Ok(Some(value.clone())),
            Some(_) => Err(format!("`{key}` is a string")),
        }
    };
    let platform = taken("platform")?;
    let supports = taken("supports")?;
    let kept: Vec<Lit> = alternatives
        .iter()
        .map(|fields| {
            Lit::Object(
                fields
                    .iter()
                    .filter(|(key, _)| key != "platform" && key != "supports")
                    .cloned()
                    .collect(),
            )
        })
        .collect();
    let when = match kept.as_slice() {
        [] => None,
        [Lit::Object(one)] if one.is_empty() => None,
        [one] if matches!(when, Some(Lit::Object(_))) => Some(one.clone()),
        _ => Some(Lit::Array(kept)),
    };
    Ok(When {
        conditions: when,
        platform,
        supports,
    })
}
