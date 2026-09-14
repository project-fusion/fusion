//! Every visual value a component declares is drawn from a registered axis.
//!
//! **One word for one question, and nobody invents a value.** A vocabulary that
//! drifts is one a consumer cannot predict: they learn `outlined` on a button
//! and guess wrong at a card, and a wrong guess is not an error — the element
//! keeps its default and the page looks deliberate.
//!
//! **`appearance` is refused outright.** It held four axes at once: where a
//! surface ends, how much ink a control claims, what a thing is made of, and
//! what it means. A component reintroducing it fails rather than being asked to
//! explain itself.
//!
//! **A visual axis belongs to the layer that paints.** `tone` and `shape` are
//! the two exceptions and both are principled: `tone` says what a thing *means*,
//! and meaning survives having no stylesheet, while `shape` says what gets
//! *rendered* — a meter at `ring` emits an arc rather than a bar, so the markup
//! differs before any rule is written. `emphasis`, `material` and `separation`
//! say how a thing is painted, so on a base layer they are a promise nobody
//! keeps.
//!
//! **`outlined` is in two vocabularies and no component may be asked both.** It
//! is in `emphasis` and in `separation` verbatim, which looks like a collision
//! and is not, because the two axes partition the library: emphasis is asked of
//! controls, how loud this one is, and separation is asked of containers, where
//! the surface ends. Nothing but the guard here stops a family declaring both,
//! and the day one does, `outlined` becomes two answers to one question with
//! nothing to say which wins.
//!
//! **Disagreement inside a group is reported and not failed on.** Whether a
//! component *should* have an axis needs a reading of what it is for, and a rule
//! that guessed would file work that is wrong more often than right. What a
//! pattern can see is families that owe each other an answer and give different
//! ones — a legend whose swatches are solid while the bars they key are outlined
//! is a legend that does not match its own chart, and nothing else could see
//! that. Failing would pressure someone into declaring an axis to silence it.

use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use crate::component::{Context, Finding, Report};

/// The vocabulary. A component takes a subset; nobody invents a value.
const AXES: [(&str, &[&str]); 6] = [
    (
        "emphasis",
        &["ghost", "muted", "outlined", "solid", "subtle"],
    ),
    ("material", &["frosted", "glass", "transparent"]),
    ("separation", &["elevated", "filled", "outlined", "plain"]),
    (
        "shape",
        &["arc", "circle", "dots", "ring", "rounded", "square", "text"],
    ),
    (
        "tone",
        &[
            "accent", "danger", "info", "neutral", "primary", "success", "surface", "warning",
        ],
    ),
    ("width", &["auto", "full", "standard"]),
];

/// The axes a base layer may carry, because neither is about paint.
const UNPAINTED: [&str; 2] = ["shape", "tone"];

/// What every family declares, gathered before anything is judged.
///
/// A group is only comparable once every member has been seen, so nothing is
/// reported until the whole set is in hand.
struct Survey {
    checked: usize,
    declares: BTreeMap<String, BTreeSet<String>>,
    groups: BTreeMap<String, BTreeSet<String>>,
    seen_lengths: BTreeSet<String>,
}

fn survey(context: &Context, findings: &mut Vec<Finding>) -> Survey {
    let axes: BTreeMap<&str, &[&str]> = AXES.into_iter().collect();
    let mut checked = 0;
    let mut declares: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut groups: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut seen_lengths: BTreeSet<String> = BTreeSet::new();

    for layer in &context.settings.layers {
        let source = context.root.join(&layer.source);
        let Some(value) = context.manifest(&source) else {
            continue;
        };
        /* The base layer paints nothing, so only what it may carry is allowed. */
        let paints = context
            .settings
            .layers
            .first()
            .is_none_or(|base| base.source != layer.source);

        for module in value
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let path = module.get("path").and_then(Value::as_str).unwrap_or("");
            let Some(family) = path.split('/').nth(1) else {
                continue;
            };
            for declaration in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                    continue;
                };
                for group in declaration
                    .get("helix")
                    .and_then(|one| one.get("groups"))
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                {
                    groups
                        .entry(group.to_owned())
                        .or_default()
                        .insert(family.to_owned());
                }

                checked += attribute_of(
                    declaration,
                    Where {
                        family,
                        paints,
                        tag,
                    },
                    &axes,
                    context,
                    &mut declares,
                    &mut seen_lengths,
                    findings,
                );
            }
        }
    }

    Survey {
        checked,
        declares,
        groups,
        seen_lengths,
    }
}

/// The family an attribute belongs to and the layer it is declared on.
#[derive(Clone, Copy)]
struct Where<'a> {
    family: &'a str,
    paints: bool,
    tag: &'a str,
}

/// Every axis one declaration names, judged against the registry.
#[allow(clippy::too_many_arguments)]
fn attribute_of(
    declaration: &Value,
    at: Where,
    axes: &BTreeMap<&str, &[&str]>,
    context: &Context,
    declares: &mut BTreeMap<String, BTreeSet<String>>,
    seen_lengths: &mut BTreeSet<String>,
    findings: &mut Vec<Finding>,
) -> usize {
    let Where {
        family,
        paints,
        tag,
    } = at;
    let mut checked = 0;
    {
        {
            {
                for attribute in declaration
                    .get("attributes")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    let Some(name) = attribute.get("name").and_then(Value::as_str) else {
                        continue;
                    };
                    if name == "appearance" {
                        findings.push(Finding {
                            detail: "It held four axes at once: `separation` is where a surface \
                                     ends, `emphasis` is how much ink a control claims, \
                                     `material` is what it is made of, `tone` is what it means, \
                                     and a component-specific choice that is none of those is \
                                     `variant`."
                                .to_owned(),
                            file: family.to_owned(),
                            message: format!(
                                "`{tag}` declares `appearance`, which is not a word this library \
                                 uses"
                            ),
                        });
                        continue;
                    }
                    let Some(values) = axes.get(name) else {
                        continue;
                    };
                    declares
                        .entry(family.to_owned())
                        .or_default()
                        .insert(name.to_owned());
                    checked += 1;

                    /* One axis, two value kinds, named rather than assumed: a
                    table column answers `width` with a grid track rather than
                    with one of three behaviors, and the value space is a
                    continuum the registry cannot hold. */
                    if name == "width" && context.settings.lengths.contains_key(family) {
                        seen_lengths.insert(family.to_owned());
                        continue;
                    }
                    if !paints && !UNPAINTED.contains(&name) {
                        findings.push(Finding {
                            detail: "A visual axis belongs to the layer that paints; a structural \
                                     choice is `variant`."
                                .to_owned(),
                            file: family.to_owned(),
                            message: format!(
                                "`{tag}` declares `{name}` on a layer with no styling to vary"
                            ),
                        });
                        continue;
                    }

                    let text = attribute
                        .get("type")
                        .and_then(|one| one.get("text"))
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    let invented: Vec<String> = text
                        .split('\'')
                        .skip(1)
                        .step_by(2)
                        .filter(|one| !values.contains(one))
                        .map(str::to_owned)
                        .collect();
                    if invented.is_empty() {
                        continue;
                    }
                    findings.push(Finding {
                        detail: format!(
                            "`{name}` is {}: take a subset of it, or the value belongs to a \
                             different axis.",
                            values
                                .iter()
                                .map(|one| format!("`{one}`"))
                                .collect::<Vec<String>>()
                                .join(", ")
                        ),
                        file: family.to_owned(),
                        message: format!(
                            "`{tag}` gives `{name}` the value{} {}, which the axis does not have",
                            if invented.len() > 1 { "s" } else { "" },
                            invented
                                .iter()
                                .map(|one| format!("`{one}`"))
                                .collect::<Vec<String>>()
                                .join(", ")
                        ),
                    });
                }
            }
        }
    }
    checked
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let Survey {
        checked,
        declares,
        groups,
        seen_lengths,
    } = survey(context, &mut findings);

    for (family, why) in &context.settings.lengths {
        if seen_lengths.contains(family) {
            continue;
        }
        findings.push(Finding {
            detail: why.clone(),
            file: context.settings.source.clone(),
            message: format!("`{family}` is listed as a length and no longer takes a `width`"),
        });
    }

    /* **`outlined` is in two vocabularies and no family may be asked both.** */
    for (family, axes) in &declares {
        if axes.contains("emphasis") && axes.contains("separation") {
            findings.push(Finding {
                detail: "One of the two has to lose it here, or the family has to pick the axis \
                         it is really on: emphasis is how loud a control is, separation is where \
                         a container ends."
                    .to_owned(),
                file: family.clone(),
                message: "declares `emphasis` and `separation` together, and they share the \
                          value `outlined`"
                    .to_owned(),
            });
        }
    }

    /* Disagreement inside a group is work rather than a fault, so it is named
    where the findings are read and not among them. */
    let mut notes = Vec::new();
    for (group, families) in &groups {
        let mut counted: BTreeMap<&String, usize> = BTreeMap::new();
        for family in families {
            for axis in declares.get(family).into_iter().flatten() {
                *counted.entry(axis).or_default() += 1;
            }
        }
        for (axis, count) in counted {
            if count == families.len() {
                continue;
            }
            let missing: Vec<&str> = families
                .iter()
                .filter(|family| declares.get(*family).is_none_or(|one| !one.contains(axis)))
                .map(String::as_str)
                .collect();
            notes.push(format!(
                "{group}: {count} of {} declare `{axis}`, and {} do not",
                families.len(),
                missing.join(", ")
            ));
        }
    }
    notes.sort();

    Report {
        checked,
        findings,
        notes,
        unit: "declared axis values",
    }
}
