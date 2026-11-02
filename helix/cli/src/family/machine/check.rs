//! The rules a machine keeps before it compiles, each broken one a sentence.
//!
//! - **Shaped:** names are unique, a state holds others one level deep, a
//!   parallel state sits at the top, a region holds leaves, and `initial`,
//!   `final` and `done` stand where they mean something.
//! - **Closed:** every target is a state, every effect is one the machine
//!   lists, and every guard and update is a function the module exports by a
//!   name the compiled module leaves free. A move within a parallel state
//!   stays in its region.
//! - **Total:** every state the module can be in answers every event, if
//!   only with `'ignore'`, and at most one region answers any event.
//! - **Ordered:** every list of answers ends in a way with no guard or in
//!   `'ignore'`, and nothing follows one with no guard. The machine always
//!   has somewhere to start.
//! - **Reachable:** every state can be entered from where the machine starts.

use std::collections::BTreeSet;

use crate::family::machine::emit::{EXPORTS, RESERVED_EFFECTS};
use crate::family::machine::flat::Flat;
use crate::family::machine::{Choice, Kind, Machine, Way};

pub fn faults(machine: &Machine) -> Vec<String> {
    let mut found = Vec::new();
    shaped(machine, &mut found);
    closed(machine, &mut found);
    ordered(machine, &mut found);
    if found.is_empty() {
        let flat = Flat::new(machine);
        total(machine, &flat, &mut found);
        reachable(machine, &flat, &mut found);
    }
    found
}

fn shaped(machine: &Machine, found: &mut Vec<String>) {
    let mut seen = BTreeSet::new();
    for node in &machine.nodes {
        if !seen.insert(node.name.as_str()) {
            found.push(format!("two states are named `{}`", node.name));
        }
        let parent = node.parent.map(|parent| &machine.nodes[parent]);
        let deep = parent.is_some_and(|parent| parent.parent.is_some());
        match &node.kind {
            Kind::Leaf => {}
            _ if node.parent.is_some() => found.push(format!(
                "`{}` holds states and is held by another; states nest one level deep",
                node.name
            )),
            Kind::Compound { initial } => {
                let child = machine.find(initial);
                if child.is_none_or(|child| machine.nodes[child].parent != machine.find(&node.name))
                {
                    found.push(format!(
                        "`{}` starts in `{initial}`, which is not a state it holds",
                        node.name
                    ));
                }
            }
            Kind::Parallel { done, regions } => {
                if regions.is_empty() {
                    found.push(format!("`{}` has no regions", node.name));
                }
                let here = machine.find(&node.name);
                for (region, initial) in regions {
                    let child = machine.find(initial);
                    let held = child.is_some_and(|child| {
                        machine.nodes[child].parent == here
                            && machine.nodes[child].region.as_deref() == Some(region.as_str())
                    });
                    if !held {
                        found.push(format!("`{}`'s region `{region}` starts in `{initial}`, which is not a state it holds", node.name));
                    }
                }
                if done.as_ref().is_some_and(|way| way.target.is_none()) {
                    found.push(format!("`{}`'s `done` names its target", node.name));
                }
                /* A region's state answers every event, if only with
                'ignore', so nothing would ever reach an answer here. */
                if let Some(event) = node.on.keys().next() {
                    found.push(format!(
                        "`{}` holds regions and answers `{event}` itself, which no event reaches; write it in the region that answers it",
                        node.name
                    ));
                }
            }
        }
        if deep {
            found.push(format!(
                "`{}` is held two levels deep; states nest one level deep",
                node.name
            ));
        }
        if node.final_ && node.region.is_none() {
            found.push(format!("`{}` is final and in no region", node.name));
        }
        if node
            .after
            .as_ref()
            .is_some_and(|deadline| deadline.ms <= 0.0)
        {
            found.push(format!("`{}`'s deadline is no time at all", node.name));
        }
    }
    if machine
        .cancel
        .as_ref()
        .is_some_and(|way| way.target.is_none())
    {
        found.push("`cancel` names its target".to_owned());
    }
}

fn closed(machine: &Machine, found: &mut Vec<String>) {
    for effect in &machine.effects {
        if RESERVED_EFFECTS.contains(&effect.as_str()) {
            found.push(format!("`{effect}` is an effect the compiler adds for deadlines, so the machine's needs another name"));
        }
    }
    for name in machine.called() {
        if !machine.functions.contains_key(name) {
            found.push(format!("`{name}` is not a function the module exports"));
        } else if EXPORTS.contains(&name) {
            found.push(format!("`{name}` is a name the compiled module exports itself, so the function needs another"));
        }
    }
    let takes_no_input = |way: &Way, what: &str, found: &mut Vec<String>| {
        if let Some(update) = &way.update {
            if machine
                .functions
                .get(update)
                .is_some_and(|arity| *arity > 1)
            {
                found.push(format!(
                    "{what} updates with `{update}`, which reads an input it does not have"
                ));
            }
        }
    };
    if let Some(cancel) = &machine.cancel {
        takes_no_input(cancel, "`cancel`", found);
    }
    for start in &machine.initial {
        if start
            .guard
            .as_ref()
            .is_some_and(|guard| machine.functions.get(guard).is_some_and(|arity| *arity > 1))
        {
            found.push(
                "`initial` reads only the context, and a guard there reads an input".to_owned(),
            );
        }
        if machine.find(&start.target).is_none() {
            found.push(format!(
                "`initial` starts in `{}`, which is not a state",
                start.target
            ));
        }
    }
    for node in &machine.nodes {
        if let Some(deadline) = &node.after {
            takes_no_input(&deadline.way, &format!("`{}`'s deadline", node.name), found);
        }
        if let Kind::Parallel {
            done: Some(done), ..
        } = &node.kind
        {
            takes_no_input(done, &format!("`{}`'s `done`", node.name), found);
        }
        for effect in node.entry.iter().chain(&node.exit) {
            if !machine.effects.contains(&effect.name) {
                found.push(format!(
                    "`{}` asks for `{}`, which is not an effect the machine lists",
                    node.name, effect.name
                ));
            }
        }
        for event in node.on.keys() {
            if !machine.events.contains(event) {
                found.push(format!(
                    "`{}` answers `{event}`, which the machine does not list",
                    node.name
                ));
            }
        }
    }
    for way in machine.ways() {
        targets(machine, way, found);
        for effect in &way.effects {
            if !machine.effects.contains(&effect.name) {
                found.push(format!(
                    "a move asks for `{}`, which is not an effect the machine lists",
                    effect.name
                ));
            }
        }
    }
    for node in &machine.nodes {
        regional(
            machine,
            node.name.as_str(),
            node.region.as_deref(),
            node.parent,
            node.on.values().flatten(),
            found,
        );
    }
}

fn targets(machine: &Machine, way: &Way, found: &mut Vec<String>) {
    if let Some(target) = &way.target {
        if machine.find(target).is_none() {
            found.push(format!("a move goes to `{target}`, which is not a state"));
        }
    }
}

/// A move from a region's state that goes to another region of the same
/// parallel state, which no configuration can say.
fn regional<'a>(
    machine: &Machine,
    name: &str,
    region: Option<&str>,
    parent: Option<usize>,
    choices: impl Iterator<Item = &'a Choice>,
    found: &mut Vec<String>,
) {
    let Some(region) = region else {
        return;
    };
    for choice in choices {
        let ways: Vec<&Way> = match choice {
            Choice::Ask(ask) => vec![&ask.accept, &ask.refuse],
            Choice::Way(way) => vec![way],
            Choice::Ignore => Vec::new(),
        };
        for target in ways.iter().filter_map(|way| way.target.as_ref()) {
            let other = machine.find(target).map(|node| &machine.nodes[node]);
            if other.is_some_and(|other| {
                other.parent == parent && other.region.as_deref() != Some(region)
            }) {
                found.push(format!(
                    "`{name}` moves to `{target}`, in another region of the same parallel state"
                ));
            }
        }
    }
}

fn ordered(machine: &Machine, found: &mut Vec<String>) {
    if machine
        .initial
        .last()
        .is_none_or(|start| start.guard.is_some())
    {
        found.push(
            "the last way in `initial` has a guard, so the machine may start nowhere".to_owned(),
        );
    }
    for node in &machine.nodes {
        for (event, choices) in &node.on {
            let open = choices.iter().position(|choice| choice.guard().is_none());
            match open {
                None => found.push(format!(
                    "`{}` on `{event}` ends in a guarded way; end it with a way with no guard or with 'ignore'",
                    node.name
                )),
                Some(at) if at + 1 < choices.len() => found.push(format!(
                    "`{}` on `{event}` has a way after one with no guard, which is never taken",
                    node.name
                )),
                Some(_) => {}
            }
        }
    }
}

fn total(machine: &Machine, flat: &Flat, found: &mut Vec<String>) {
    for (index, config) in flat.configs.iter().enumerate() {
        for event in &machine.events {
            if flat.answer(index, event).is_none() {
                found.push(format!("`{}` does not answer `{event}`", config.name));
            }
        }
    }
    for (index, node) in machine.nodes.iter().enumerate() {
        let Kind::Parallel { regions, .. } = &node.kind else {
            continue;
        };
        for event in &machine.events {
            let answering: Vec<&str> = regions
                .iter()
                .filter(|(region, _)| {
                    machine.nodes.iter().any(|leaf| {
                        leaf.parent == Some(index)
                            && leaf.region.as_deref() == Some(region.as_str())
                            && leaf.on.get(event).is_some_and(|choices| {
                                choices
                                    .iter()
                                    .any(|choice| !matches!(choice, Choice::Ignore))
                            })
                    })
                })
                .map(|(region, _)| region.as_str())
                .collect();
            if answering.len() > 1 {
                found.push(format!(
                    "`{}` answers `{event}` in regions {}; at most one region answers an event",
                    node.name,
                    answering
                        .iter()
                        .map(|region| format!("`{region}`"))
                        .collect::<Vec<_>>()
                        .join(" and ")
                ));
            }
        }
    }
}

fn reachable(machine: &Machine, flat: &Flat, found: &mut Vec<String>) {
    let mut reached: Vec<usize> = machine
        .initial
        .iter()
        .filter_map(|start| flat.start_at(&start.target))
        .collect();
    let mut frontier = reached.clone();
    while let Some(config) = frontier.pop() {
        let mut next = Vec::new();
        for event in &machine.events {
            let Some((by, choices)) = flat.answer(config, event) else {
                continue;
            };
            for choice in choices {
                let ways: Vec<&Way> = match choice {
                    Choice::Ask(ask) => vec![&ask.accept, &ask.refuse],
                    Choice::Way(way) => vec![way],
                    Choice::Ignore => Vec::new(),
                };
                next.extend(
                    ways.into_iter()
                        .filter_map(|way| flat.plan(config, Some(by), way))
                        .map(|plan| plan.state),
                );
            }
        }
        for owner in flat.deadlines(config) {
            if let Some(deadline) = &machine.nodes[owner].after {
                next.extend(
                    flat.plan(config, Some(owner), &deadline.way)
                        .map(|plan| plan.state),
                );
            }
        }
        if let Some(cancel) = &machine.cancel {
            next.extend(flat.plan(config, None, cancel).map(|plan| plan.state));
        }
        for state in next {
            if !reached.contains(&state) {
                reached.push(state);
                frontier.push(state);
            }
        }
    }
    /* A state is reached where a configuration it is active in is. Not every
    pairing of a parallel state's regions need occur. */
    let entered: BTreeSet<usize> = reached
        .iter()
        .flat_map(|config| flat.states_of(*config))
        .collect();
    for (index, node) in machine.nodes.iter().enumerate() {
        if !entered.contains(&index) {
            found.push(format!("`{}` can never be entered", node.name));
        }
    }
}
