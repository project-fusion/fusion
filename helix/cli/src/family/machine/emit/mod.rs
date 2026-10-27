//! The flat module a machine compiles to.
//!
//! **Nothing interprets a machine at runtime.** States, events, effects and
//! requests are numbers, in the order the machine writes them, and each state
//! the module can be in that answers anything is a function with one switch
//! over its events; states that answer alike share one. A guard is a
//! condition and an update a call, both to the pure functions the machine's
//! module exports.
//!
//! **Moves are data, and one shape serves every machine.** `start` reads the
//! state from a context; `step` returns a move, a request, or `undefined`; a
//! move holds the state it leaves the machine in, the context after it, and
//! the effects it runs in order, and a request holds the events to ask with
//! and the move for each outcome. `entering` gives the effects of starting in
//! a state, `expire` the move a deadline makes, `cancel` the move the
//! machine's cancel makes, and `mark` the marked states a state is in.

use std::fmt::Write as _;

mod moves;

use crate::family::machine::flat::{Flat, Planned};
use crate::family::machine::{Literal, Machine};
use crate::PRODUCT;
use moves::{answers, cancel, entering, expire, groups, mark, start, step};

/// The names every compiled module defines beside its numbered constants,
/// which a machine's own functions may not take.
pub const EXPORTS: &[&str] = &[
    "ASKS", "Argument", "Asking", "EFFECTS", "EVENTS", "Effect", "Move", "NAME", "NODES", "STATES",
    "cancel", "entering", "expire", "mark", "start", "step",
];

/// The effects the compiler adds for deadlines, which a machine may not list.
pub const RESERVED_EFFECTS: &[&str] = &["deadline", "deadline-end"];

/// The module for `machine`, which [`super::check`] has passed.
pub fn module(machine: &Machine) -> String {
    let flat = Flat::new(machine);
    let mut out = String::new();
    header(machine, &mut out);
    codes(machine, &flat, &mut out);
    types(machine, &mut out);
    start(machine, &flat, &mut out);
    entering(&flat, &mut out);
    let groups = groups(machine, &flat);
    for group in &groups {
        answers(machine, &flat, group, &mut out);
    }
    step(machine, &flat, &groups, &mut out);
    expire(machine, &flat, &mut out);
    cancel(machine, &flat, &mut out);
    mark(&flat, &mut out);
    out
}

/// `PREFIX_NAME` for an event, an effect, or a request.
pub(super) fn constant(prefix: &str, name: &str) -> String {
    format!("{prefix}_{}", name.to_uppercase().replace('-', "_"))
}

/// A type the module defines, which the compiled module imports, as opposed
/// to `undefined` or a literal written in place.
fn imported(kind: &str) -> bool {
    let mut characters = kind.chars();
    characters
        .next()
        .is_some_and(|first| first.is_ascii_uppercase())
        && characters.all(|character| character.is_ascii_alphanumeric() || character == '_')
}

/// A call to one of the module's functions, with as much of `context` and the
/// input as it takes.
pub(super) fn call(machine: &Machine, name: &str, context: &str) -> String {
    match machine.functions.get(name).copied().unwrap_or(0) {
        0 => format!("{name}()"),
        1 => format!("{name}({context})"),
        _ => format!("{name}({context}, input)"),
    }
}

pub(super) fn reads_input(machine: &Machine, name: &str) -> bool {
    machine.functions.get(name).is_some_and(|arity| *arity >= 2)
}

/// A number as TypeScript writes it: `500`, `0.5`.
fn number(value: f64) -> String {
    if value.fract() == 0.0 && value.abs() < 1e15 {
        #[allow(clippy::cast_possible_truncation)]
        let whole = value as i64;
        whole.to_string()
    } else {
        value.to_string()
    }
}

fn literal(value: &Literal) -> String {
    match value {
        Literal::Bool(flag) => flag.to_string(),
        Literal::Number(value) => number(*value),
        Literal::Text(text) => serde_json::to_string(text).unwrap_or_default(),
    }
}

pub(super) fn effect(planned: &Planned) -> String {
    match planned {
        Planned::Effect(effect) if effect.with.is_empty() => {
            format!("[{}]", constant("EFFECT", &effect.name))
        }
        Planned::Effect(effect) => {
            let with: Vec<String> = effect
                .with
                .iter()
                .map(|(key, value)| format!("{key}: {}", literal(value)))
                .collect();
            format!(
                "[{}, {{ {} }}]",
                constant("EFFECT", &effect.name),
                with.join(", ")
            )
        }
        Planned::Start { ms, owner } => {
            format!(
                "[EFFECT_DEADLINE, {{ ms: {}, owner: {owner} }}]",
                number(*ms)
            )
        }
        Planned::End { owner } => format!("[EFFECT_DEADLINE_END, {{ owner: {owner} }}]"),
    }
}

fn header(machine: &Machine, out: &mut String) {
    let mut imports: Vec<String> = machine.called().into_iter().map(str::to_owned).collect();
    let types: Vec<&String> = [&machine.context, &machine.input]
        .into_iter()
        .filter(|kind| imported(kind))
        .collect();
    imports.extend(types.iter().map(|kind| format!("type {kind}")));
    imports.sort_by_key(|name| name.trim_start_matches("type ").to_owned());
    imports.dedup();
    let _ = write!(out, "/* Generated by `{PRODUCT} family machines` from machine.ts beside it. Do not\n   edit: change the machine and run it again. */\n");
    if !imports.is_empty() {
        let _ = writeln!(
            out,
            "import {{ {} }} from './machine.js'",
            imports.join(", ")
        );
    }
    out.push('\n');
    if !types.is_empty() {
        let names: Vec<&str> = types.iter().map(|kind| kind.as_str()).collect();
        let _ = writeln!(
            out,
            "export type {{ {} }} from './machine.js'\n",
            names.join(", ")
        );
    }
    let _ = writeln!(
        out,
        "/** The name machine.ts exports the machine as. */\nexport const NAME = '{}'\n",
        machine.name
    );
}

/// A list of names as a TypeScript array of strings.
fn strings<'a>(names: impl Iterator<Item = &'a str>) -> String {
    let quoted: Vec<String> = names.map(|name| format!("'{name}'")).collect();
    format!("[{}]", quoted.join(", "))
}

/// Numbered constants, each with its doc, and the names they number.
fn numbered(out: &mut String, what: &str, prefix: &str, names: &[&str], list: &str) {
    for (code, name) in names.iter().enumerate() {
        let _ = writeln!(
            out,
            "/** The {what} `{name}`. */\nexport const {} = {code}",
            constant(prefix, name)
        );
    }
    let _ = writeln!(
        out,
        "/** Each {what}'s name, by its number. */\nexport const {list} = {} as const\n",
        strings(names.iter().copied())
    );
}

fn codes(machine: &Machine, flat: &Flat, out: &mut String) {
    for (code, config) in flat.configs.iter().enumerate() {
        let _ = writeln!(
            out,
            "/** The state `{}`. */\nexport const {} = {code}",
            config.name, config.constant
        );
    }
    let _ = writeln!(
        out,
        "/** Each state's name, by its number. */\nexport const STATES = {} as const\n",
        strings(flat.configs.iter().map(|config| config.name.as_str()))
    );
    let _ = writeln!(
        out,
        "/** Each state as the machine writes it, by the number a deadline names its owner by. */\nexport const NODES = {} as const\n",
        strings(machine.nodes.iter().map(|node| node.name.as_str()))
    );
    let events: Vec<&str> = machine.events.iter().map(String::as_str).collect();
    numbered(out, "event", "EVENT", &events, "EVENTS");
    let mut effects: Vec<&str> = machine.effects.iter().map(String::as_str).collect();
    if machine.deadlines() {
        effects.extend(RESERVED_EFFECTS);
    }
    numbered(out, "effect", "EFFECT", &effects, "EFFECTS");
    numbered(out, "request event", "ASK", &machine.asks(), "ASKS");
}

fn types(machine: &Machine, out: &mut String) {
    let _ = writeln!(
        out,
        "/** A literal an effect is given. */\nexport type Argument = Readonly<Record<string, boolean | number | string>>\n\n/** An effect the host performs: its number, and its argument where it has one. */\nexport type Effect = readonly [effect: number, argument?: Argument]\n\n/** A move: the state it leaves the machine in, the context after it, and the effects it runs, in order. */\nexport interface Move {{\n  readonly context: {}\n  readonly effects: readonly Effect[]\n  readonly state: number\n}}\n\n/** A request: the events the host asks with first, in order, and the move for each outcome. */\nexport interface Asking {{\n  readonly accept: Move\n  readonly ask: readonly number[]\n  readonly refuse: Move\n}}\n",
        machine.context
    );
}
