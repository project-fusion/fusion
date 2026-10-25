//! A machine's module, read into a [`Machine`].
//!
//! The fields are the ones `helix/core/src/machines/statechart.ts` defines,
//! and nothing else is taken. States are read depth first, in the order the
//! module writes them, so a child follows its parent and a region's states
//! follow the state that holds them.

use crate::family::machine::{
    Ask, Choice, Deadline, Effect, Kind, Literal, Machine, Node, Start, Way,
};
use crate::family::read::{machine_module, Lit};

type Fields = [(String, Lit)];

/// The machine a module exports.
///
/// # Errors
///
/// A sentence saying what in the module is not a machine.
pub fn machine(source: &str) -> Result<Machine, String> {
    let module = machine_module(source)?;
    let [_, _, context, input, _] = module.types.as_slice() else {
        return Err(
            "a machine is annotated as `Statechart<State, Event, Context, Input, Effect>`"
                .to_owned(),
        );
    };
    let fields = object(&module.chart, "the machine")?;
    known(
        fields,
        &["cancel", "effects", "events", "initial", "states"],
        "the machine",
    )?;
    let mut nodes = Vec::new();
    for (name, lit) in object(field(fields, "states", "the machine")?, "`states`")? {
        node(name, lit, None, None, &mut nodes)?;
    }
    Ok(Machine {
        cancel: optional(fields, "cancel")
            .map(|lit| way(lit, "`cancel`", false))
            .transpose()?,
        context: context.clone(),
        effects: names(field(fields, "effects", "the machine")?, "`effects`")?,
        events: names(field(fields, "events", "the machine")?, "`events`")?,
        functions: module.functions,
        initial: array(field(fields, "initial", "the machine")?, "`initial`")?
            .iter()
            .map(start)
            .collect::<Result<_, _>>()?,
        input: input.clone(),
        name: module.name,
        nodes,
    })
}

/// One state and, after it, the states it holds.
fn node(
    name: &str,
    lit: &Lit,
    parent: Option<usize>,
    region: Option<&str>,
    nodes: &mut Vec<Node>,
) -> Result<(), String> {
    let at = format!("state `{name}`");
    let fields = object(lit, &at)?;
    known(
        fields,
        &[
            "after", "done", "entry", "exit", "final", "initial", "mark", "on", "regions", "states",
        ],
        &at,
    )?;
    let on = match optional(fields, "on") {
        None => Vec::new(),
        Some(on) => object(on, &at)?
            .iter()
            .map(|(event, answer)| {
                Ok((
                    event.clone(),
                    answers(answer, &format!("{at} on `{event}`"))?,
                ))
            })
            .collect::<Result<_, String>>()?,
    };
    let index = nodes.len();
    nodes.push(Node {
        after: optional(fields, "after")
            .map(|lit| deadline(lit, &format!("{at}'s `after`")))
            .transpose()?,
        entry: effects(optional(fields, "entry"), &at)?,
        exit: effects(optional(fields, "exit"), &at)?,
        final_: matches!(optional(fields, "final"), Some(Lit::Bool(true))),
        kind: Kind::Leaf,
        mark: matches!(optional(fields, "mark"), Some(Lit::Bool(true))),
        name: name.to_owned(),
        on: on.into_iter().collect(),
        parent,
        region: region.map(str::to_owned),
    });
    let kind = match (optional(fields, "states"), optional(fields, "regions")) {
        (Some(_), Some(_)) => return Err(format!("{at} holds either `states` or `regions`")),
        (Some(children), None) => {
            for (child, lit) in object(children, &at)? {
                node(child, lit, Some(index), None, nodes)?;
            }
            Kind::Compound {
                initial: text(field(fields, "initial", &at)?, &format!("{at}'s `initial`"))?,
            }
        }
        (None, Some(regions)) => Kind::Parallel {
            done: optional(fields, "done")
                .map(|lit| way(lit, &format!("{at}'s `done`"), false))
                .transpose()?,
            regions: regions_of(regions, index, &at, nodes)?,
        },
        (None, None) => {
            if let Some(key) = ["done", "initial"]
                .iter()
                .find(|key| optional(fields, key).is_some())
            {
                return Err(format!("{at}: only a state that holds others has `{key}`"));
            }
            Kind::Leaf
        }
    };
    nodes[index].kind = kind;
    Ok(())
}

/// A parallel state's regions, each with the state it starts in, reading
/// each region's states into `nodes`.
fn regions_of(
    lit: &Lit,
    parent: usize,
    at: &str,
    nodes: &mut Vec<Node>,
) -> Result<Vec<(String, String)>, String> {
    let mut regions = Vec::new();
    for (region, lit) in object(lit, at)? {
        let place = format!("{at}'s region `{region}`");
        let fields = object(lit, &place)?;
        known(fields, &["initial", "states"], &place)?;
        for (child, lit) in object(field(fields, "states", &place)?, &place)? {
            node(child, lit, Some(parent), Some(region), nodes)?;
        }
        let initial = text(
            field(fields, "initial", &place)?,
            &format!("{place}'s `initial`"),
        )?;
        regions.push((region.clone(), initial));
    }
    Ok(regions)
}

/// An answer: `'ignore'`, one way or request, or a list of them tried in
/// order, which may end in `'ignore'`.
fn answers(lit: &Lit, at: &str) -> Result<Vec<Choice>, String> {
    match lit {
        Lit::Array(choices) => choices.iter().map(|one| choice(one, at)).collect(),
        one => Ok(vec![choice(one, at)?]),
    }
}

fn choice(lit: &Lit, at: &str) -> Result<Choice, String> {
    match lit {
        Lit::Text(ignore) if ignore == "ignore" => Ok(Choice::Ignore),
        Lit::Object(fields) if fields.iter().any(|(key, _)| key == "ask") => {
            known(fields, &["accept", "ask", "guard", "refuse"], at)?;
            let asks = match field(fields, "ask", at)? {
                Lit::Text(one) => vec![one.clone()],
                many => names(many, &format!("{at}: `ask`"))?,
            };
            Ok(Choice::Ask(Ask {
                accept: way(
                    field(fields, "accept", at)?,
                    &format!("{at}: `accept`"),
                    false,
                )?,
                asks,
                guard: function(fields, "guard", at)?,
                refuse: way(
                    field(fields, "refuse", at)?,
                    &format!("{at}: `refuse`"),
                    false,
                )?,
            }))
        }
        one => Ok(Choice::Way(way(one, at, true)?)),
    }
}

/// A way: its effects, target and update, and its guard where `guarded`.
fn way(lit: &Lit, at: &str, guarded: bool) -> Result<Way, String> {
    let fields = object(lit, at)?;
    let allowed: &[&str] = if guarded {
        &["effects", "guard", "target", "update"]
    } else {
        &["effects", "target", "update"]
    };
    known(fields, allowed, at)?;
    Ok(Way {
        effects: effects(optional(fields, "effects"), at)?,
        guard: function(fields, "guard", at)?,
        target: optional(fields, "target")
            .map(|lit| text(lit, &format!("{at}: `target`")))
            .transpose()?,
        update: function(fields, "update", at)?,
    })
}

fn deadline(lit: &Lit, at: &str) -> Result<Deadline, String> {
    let fields = object(lit, at)?;
    known(fields, &["effects", "ms", "target", "update"], at)?;
    let Lit::Number(ms) = field(fields, "ms", at)? else {
        return Err(format!("{at}: `ms` is a number"));
    };
    let rest: Vec<(String, Lit)> = fields
        .iter()
        .filter(|(key, _)| key != "ms")
        .cloned()
        .collect();
    Ok(Deadline {
        ms: *ms,
        way: way(&Lit::Object(rest), at, false)?,
    })
}

fn effects(lit: Option<&Lit>, at: &str) -> Result<Vec<Effect>, String> {
    let Some(lit) = lit else {
        return Ok(Vec::new());
    };
    array(lit, at)?
        .iter()
        .map(|one| match one {
            Lit::Text(name) => Ok(Effect {
                name: name.clone(),
                with: Vec::new(),
            }),
            Lit::Object(fields) => {
                known(fields, &["effect", "with"], at)?;
                let with = object(field(fields, "with", at)?, at)?
                    .iter()
                    .map(|(key, value)| Ok((key.clone(), literal(value, at)?)))
                    .collect::<Result<_, String>>()?;
                Ok(Effect {
                    name: text(field(fields, "effect", at)?, at)?,
                    with,
                })
            }
            _ => Err(format!("{at}: an effect is a name or `{{ effect, with }}`")),
        })
        .collect()
}

fn literal(lit: &Lit, at: &str) -> Result<Literal, String> {
    match lit {
        Lit::Bool(flag) => Ok(Literal::Bool(*flag)),
        Lit::Number(number) if number.is_finite() => Ok(Literal::Number(*number)),
        Lit::Text(text) => Ok(Literal::Text(text.clone())),
        _ => Err(format!(
            "{at}: an effect's argument holds booleans, numbers and strings"
        )),
    }
}

fn start(lit: &Lit) -> Result<Start, String> {
    let fields = object(lit, "`initial`")?;
    known(fields, &["guard", "target"], "`initial`")?;
    Ok(Start {
        guard: function(fields, "guard", "`initial`")?,
        target: text(field(fields, "target", "`initial`")?, "`initial`: `target`")?,
    })
}

fn function(fields: &Fields, key: &str, at: &str) -> Result<Option<String>, String> {
    match optional(fields, key) {
        None => Ok(None),
        Some(Lit::Name(name)) => Ok(Some(name.clone())),
        Some(_) => Err(format!("{at}: `{key}` names a function the module exports")),
    }
}

fn object<'a>(lit: &'a Lit, at: &str) -> Result<&'a Fields, String> {
    match lit {
        Lit::Object(fields) => Ok(fields),
        _ => Err(format!("{at} is an object")),
    }
}

fn array<'a>(lit: &'a Lit, at: &str) -> Result<&'a [Lit], String> {
    match lit {
        Lit::Array(items) => Ok(items),
        _ => Err(format!("{at} is an array")),
    }
}

fn text(lit: &Lit, at: &str) -> Result<String, String> {
    match lit {
        Lit::Text(text) => Ok(text.clone()),
        _ => Err(format!("{at} is a name")),
    }
}

fn names(lit: &Lit, at: &str) -> Result<Vec<String>, String> {
    array(lit, at)?.iter().map(|item| text(item, at)).collect()
}

fn optional<'a>(fields: &'a Fields, key: &str) -> Option<&'a Lit> {
    fields
        .iter()
        .find(|(name, _)| name == key)
        .map(|(_, value)| value)
}

fn field<'a>(fields: &'a Fields, key: &str, at: &str) -> Result<&'a Lit, String> {
    optional(fields, key).ok_or_else(|| format!("{at} names its `{key}`"))
}

fn known(fields: &Fields, allowed: &[&str], at: &str) -> Result<(), String> {
    match fields
        .iter()
        .find(|(key, _)| !allowed.contains(&key.as_str()))
    {
        Some((key, _)) => Err(format!("{at}: `{key}` is not a field it has")),
        None => Ok(()),
    }
}
