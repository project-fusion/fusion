//! The functions of a compiled module that say what a machine does: where it
//! starts, what each state does with each event, and what a deadline, the
//! cancel, and a mark give.

use std::fmt::Write as _;

use crate::family::machine::emit::{call, constant, effect, reads_input, strings};
use crate::family::machine::flat::{Flat, Plan};
use crate::family::machine::{Choice, Machine};

/// A group of states that answer every event alike, with their switch cases.
pub struct Group {
    pub cases: String,
    pub input: bool,
    pub members: Vec<usize>,
}

pub fn start(machine: &Machine, flat: &Flat, out: &mut String) {
    let mut expression = String::new();
    let mut reads = false;
    for way in &machine.initial {
        let target = flat
            .start_at(&way.target)
            .map(|config| flat.configs[config].constant.clone())
            .unwrap_or_default();
        let Some(guard) = &way.guard else {
            expression.push_str(&target);
            break;
        };
        reads |= machine
            .functions
            .get(guard)
            .is_some_and(|arity| *arity >= 1);
        let _ = write!(
            expression,
            "{} ? {target} : ",
            call(machine, guard, "context")
        );
    }
    let context = if reads { "context" } else { "_context" };
    let _ = writeln!(
        out,
        "/** The state the machine is in, read from its context. */\nexport const start = ({context}: {}): number =>\n  {expression}\n",
        machine.context
    );
}

pub fn entering(flat: &Flat, out: &mut String) {
    out.push_str(
        "/** The effects of starting in a state, as a host that mounts the machine runs them. */\n",
    );
    let cases: Vec<String> = (0..flat.configs.len())
        .filter_map(|config| {
            let effects: Vec<String> = flat.entering(config).iter().map(effect).collect();
            (!effects.is_empty()).then(|| {
                format!(
                    "    case {}:\n      return [{}]\n",
                    flat.configs[config].constant,
                    effects.join(", ")
                )
            })
        })
        .collect();
    if cases.is_empty() {
        out.push_str("export const entering = (_state: number): readonly Effect[] => []\n\n");
        return;
    }
    let _ = writeln!(
        out,
        "export const entering = (state: number): readonly Effect[] => {{\n  switch (state) {{\n{}  }}\n  return []\n}}\n",
        cases.concat()
    );
}

/// The move a plan makes, as an object literal.
fn movement(machine: &Machine, flat: &Flat, plan: &Plan) -> String {
    let context = plan
        .updates
        .iter()
        .fold("context".to_owned(), |inner, update| {
            call(machine, update, &inner)
        });
    let effects: Vec<String> = plan.effects.iter().map(effect).collect();
    format!(
        "{{ context: {context}, effects: [{}], state: {} }}",
        effects.join(", "),
        flat.configs[plan.state].constant
    )
}

/// What one answer does, as one expression: the first choice whose guard
/// passes, and `undefined` for `'ignore'`.
fn answer(machine: &Machine, flat: &Flat, config: usize, by: usize, choices: &[Choice]) -> String {
    let made = |way| {
        flat.plan(config, Some(by), way).map_or_else(
            || "undefined".to_owned(),
            |plan| movement(machine, flat, &plan),
        )
    };
    choices
        .iter()
        .rev()
        .fold("undefined".to_owned(), |otherwise, choice| {
            let (guard, taken) = match choice {
                Choice::Ignore => return "undefined".to_owned(),
                Choice::Way(way) => (way.guard.as_ref(), made(way)),
                Choice::Ask(ask) => {
                    let asks: Vec<String> =
                        ask.asks.iter().map(|one| constant("ASK", one)).collect();
                    let taken = format!(
                        "{{ accept: {}, ask: [{}], refuse: {} }}",
                        made(&ask.accept),
                        asks.join(", "),
                        made(&ask.refuse)
                    );
                    (ask.guard.as_ref(), taken)
                }
            };
            match guard {
                Some(guard) => format!(
                    "{} ? {taken} : {otherwise}",
                    call(machine, guard, "context")
                ),
                None => taken,
            }
        })
}

/// Whether a choice reads what an event carries, in its guards or updates.
fn choice_reads(machine: &Machine, choice: &Choice) -> bool {
    let ways = match choice {
        Choice::Ask(ask) => vec![&ask.accept, &ask.refuse],
        Choice::Way(way) => vec![way],
        Choice::Ignore => Vec::new(),
    };
    choice
        .guard()
        .is_some_and(|guard| reads_input(machine, guard))
        || ways
            .iter()
            .flat_map(|way| way.guard.iter().chain(way.update.iter()))
            .any(|name| reads_input(machine, name))
}

/// The states that answer anything, grouped where every answer is the same.
pub fn groups(machine: &Machine, flat: &Flat) -> Vec<Group> {
    let mut groups: Vec<Group> = Vec::new();
    for config in 0..flat.configs.len() {
        let mut cases = String::new();
        let mut input = false;
        for event in &machine.events {
            let Some((by, choices)) = flat.answer(config, event) else {
                continue;
            };
            if choices
                .iter()
                .all(|choice| matches!(choice, Choice::Ignore))
            {
                continue;
            }
            input |= choices.iter().any(|choice| choice_reads(machine, choice));
            let _ = writeln!(
                cases,
                "    case {}:\n      return {}",
                constant("EVENT", event),
                answer(machine, flat, config, by, choices)
            );
        }
        if cases.is_empty() {
            continue;
        }
        match groups.iter_mut().find(|group| group.cases == cases) {
            Some(group) => group.members.push(config),
            None => groups.push(Group {
                cases,
                input,
                members: vec![config],
            }),
        }
    }
    groups
}

/// `inChosen` for the state `chosen`, `inLandingGlidingDrawn` for a pairing.
fn function(flat: &Flat, config: usize) -> String {
    let mut name = String::from("in");
    let constant = &flat.configs[config].constant;
    for part in constant
        .trim_start_matches("STATE_")
        .split('_')
        .filter(|part| !part.is_empty())
    {
        let mut characters = part.chars();
        if let Some(first) = characters.next() {
            name.push(first);
            name.extend(characters.flat_map(char::to_lowercase));
        }
    }
    name
}

/// States named as a sentence lists them.
fn named(flat: &Flat, members: &[usize]) -> String {
    let names: Vec<String> = members
        .iter()
        .map(|config| format!("`{}`", flat.configs[*config].name))
        .collect();
    match names.as_slice() {
        [one] => one.clone(),
        [first, second] => format!("{first} and {second}"),
        [rest @ .., last] => format!("{}, and {last}", rest.join(", ")),
        [] => String::new(),
    }
}

pub fn answers(machine: &Machine, flat: &Flat, group: &Group, out: &mut String) {
    let Some(first) = group.members.first() else {
        return;
    };
    let input = if group.input { "input" } else { "_input" };
    let verb = if group.members.len() == 1 {
        "does"
    } else {
        "do"
    };
    let _ = writeln!(
        out,
        "/** What {} {verb} with each event. */\nconst {} = (context: {}, event: number, {input}: {}): Move | Asking | undefined => {{\n  switch (event) {{\n{}  }}\n  return undefined\n}}\n",
        named(flat, &group.members),
        function(flat, *first),
        machine.context,
        machine.input,
        group.cases
    );
}

pub fn step(machine: &Machine, flat: &Flat, groups: &[Group], out: &mut String) {
    let _ = writeln!(
        out,
        "/**\n * What an event does in a state: a move, a request, or `undefined` where the\n * state ignores it.\n */\nexport const step = (state: number, context: {}, event: number, input: {}): Move | Asking | undefined => {{\n  switch (state) {{",
        machine.context, machine.input
    );
    for group in groups {
        for config in &group.members {
            let _ = writeln!(out, "    case {}:", flat.configs[*config].constant);
        }
        if let Some(first) = group.members.first() {
            let _ = writeln!(
                out,
                "      return {}(context, event, input)",
                function(flat, *first)
            );
        }
    }
    out.push_str("  }\n  return undefined\n}\n\n");
}

pub fn expire(machine: &Machine, flat: &Flat, out: &mut String) {
    out.push_str("/**\n * The move a state's deadline makes when it ends, or `undefined` where the\n * state `owner` names is not active in `state`.\n */\n");
    let mut cases = String::new();
    for config in 0..flat.configs.len() {
        let owners: Vec<String> = flat
            .deadlines(config)
            .into_iter()
            .filter_map(|owner| {
                let deadline = machine.nodes[owner].after.as_ref()?;
                let plan = flat.plan(config, Some(owner), &deadline.way)?;
                Some(format!(
                    "owner === {owner} ? {} : ",
                    movement(machine, flat, &plan)
                ))
            })
            .collect();
        if !owners.is_empty() {
            let _ = writeln!(
                cases,
                "    case {}:\n      return {}undefined",
                flat.configs[config].constant,
                owners.concat()
            );
        }
    }
    if cases.is_empty() {
        let _ = writeln!(
            out,
            "export const expire = (_state: number, _context: {}, _owner: number): Move | undefined =>\n  undefined\n",
            machine.context
        );
        return;
    }
    let _ = writeln!(
        out,
        "export const expire = (state: number, context: {}, owner: number): Move | undefined => {{\n  switch (state) {{\n{cases}  }}\n  return undefined\n}}\n",
        machine.context
    );
}

pub fn cancel(machine: &Machine, flat: &Flat, out: &mut String) {
    out.push_str("/** The move the machine's cancel makes from a state, where it has one. */\n");
    let Some(way) = &machine.cancel else {
        let _ = writeln!(
            out,
            "export const cancel = (_state: number, _context: {}): Move | undefined => undefined\n",
            machine.context
        );
        return;
    };
    let mut cases = String::new();
    for config in 0..flat.configs.len() {
        if let Some(plan) = flat.plan(config, None, way) {
            let _ = writeln!(
                cases,
                "    case {}:\n      return {}",
                flat.configs[config].constant,
                movement(machine, flat, &plan)
            );
        }
    }
    let _ = writeln!(
        out,
        "export const cancel = (state: number, context: {}): Move | undefined => {{\n  switch (state) {{\n{cases}  }}\n  return undefined\n}}\n",
        machine.context
    );
}

pub fn mark(flat: &Flat, out: &mut String) {
    out.push_str("/** The custom states a host records while the machine is in `state`. */\n");
    let cases: Vec<String> = (0..flat.configs.len())
        .filter_map(|config| {
            let marks = flat.marks(config);
            (!marks.is_empty()).then(|| {
                format!(
                    "    case {}:\n      return {}\n",
                    flat.configs[config].constant,
                    strings(marks.into_iter())
                )
            })
        })
        .collect();
    if cases.is_empty() {
        out.push_str("export const mark = (_state: number): readonly string[] => []\n");
        return;
    }
    let _ = writeln!(
        out,
        "export const mark = (state: number): readonly string[] => {{\n  switch (state) {{\n{}  }}\n  return []\n}}",
        cases.concat()
    );
}
