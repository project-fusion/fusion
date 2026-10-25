//! A machine, read from its module in core and held to the rules a machine
//! keeps, and the flat module [`emit`] writes from it.
//!
//! **The format is Layer 2 of the intermediate layer spec, as revised on
//! October 11, 2026.** A machine has states, which may hold child states one
//! level deep or parallel regions of states; events every state answers;
//! moves that carry effects; requests that are two moves, one for acceptance
//! and one for refusal; deadlines; and a cancel from any state. The rules a
//! machine must keep before it compiles are in [`check`], and how nesting and
//! regions flatten into the states the compiled module switches on is in
//! [`flat`].

mod check;
pub mod emit;
mod flat;
mod read;
#[cfg(test)]
mod tests;

use std::collections::BTreeMap;

pub use read::machine;

/// A machine, read.
#[derive(Debug)]
pub struct Machine {
    /// The way every state leaves by on a cancel, where the machine has one.
    pub cancel: Option<Way>,
    /// The type of its context, as its module writes it.
    pub context: String,
    pub effects: Vec<String>,
    pub events: Vec<String>,
    /// Each function its module exports, and how many parameters it takes.
    pub functions: BTreeMap<String, usize>,
    /// Where it starts: the first way whose guard passes.
    pub initial: Vec<Start>,
    /// The type of what an event carries, as its module writes it.
    pub input: String,
    /// The name its module exports it as.
    pub name: String,
    /// Every state, depth first in the order the module writes them.
    pub nodes: Vec<Node>,
}

/// A way the machine starts.
#[derive(Debug)]
pub struct Start {
    pub guard: Option<String>,
    pub target: String,
}

/// One state as the module writes it: a leaf, a state with children, or a
/// state with regions.
#[derive(Debug)]
pub struct Node {
    /// A deadline: the way taken when the state has lasted `ms`.
    pub after: Option<Deadline>,
    pub entry: Vec<Effect>,
    pub exit: Vec<Effect>,
    /// A region's state where its region is done.
    pub final_: bool,
    pub kind: Kind,
    pub mark: bool,
    pub name: String,
    /// Its answer to each event it answers, by the event's name.
    pub on: BTreeMap<String, Vec<Choice>>,
    /// The state that holds it, by index into [`Machine::nodes`].
    pub parent: Option<usize>,
    /// The region that holds it, where its parent has regions.
    pub region: Option<String>,
}

/// What a state holds.
#[derive(Debug)]
pub enum Kind {
    Leaf,
    /// Child states, and the one entered with the state.
    Compound {
        initial: String,
    },
    /// Regions, each with the state it starts in, and the way taken once
    /// every region is in a final state.
    Parallel {
        done: Option<Way>,
        regions: Vec<(String, String)>,
    },
}

/// One entry of an answer: a way, a request, or `'ignore'`.
#[derive(Debug)]
pub enum Choice {
    Ask(Ask),
    Ignore,
    Way(Way),
}

/// One way an event moves the machine.
#[derive(Debug, Default)]
pub struct Way {
    pub effects: Vec<Effect>,
    pub guard: Option<String>,
    pub target: Option<String>,
    pub update: Option<String>,
}

/// A request: the cancelable events `asks` names go first, in order, and the
/// machine takes `accept` where none is refused and `refuse` where one is.
#[derive(Debug)]
pub struct Ask {
    pub accept: Way,
    pub asks: Vec<String>,
    pub guard: Option<String>,
    pub refuse: Way,
}

/// A deadline on a state.
#[derive(Debug)]
pub struct Deadline {
    pub ms: f64,
    pub way: Way,
}

/// An effect asked for, by name, with its literal argument where it has one.
#[derive(Clone, Debug, PartialEq)]
pub struct Effect {
    pub name: String,
    pub with: Vec<(String, Literal)>,
}

/// A literal an effect is given.
#[derive(Clone, Debug, PartialEq)]
pub enum Literal {
    Bool(bool),
    Number(f64),
    Text(String),
}

impl Choice {
    fn guard(&self) -> Option<&String> {
        match self {
            Self::Ask(ask) => ask.guard.as_ref(),
            Self::Way(way) => way.guard.as_ref(),
            Self::Ignore => None,
        }
    }
}

impl Machine {
    /// The index of the state with this name.
    fn find(&self, name: &str) -> Option<usize> {
        self.nodes.iter().position(|node| node.name == name)
    }

    /// Every way the machine has, wherever it is written: answers, both
    /// sides of a request, deadlines, `done`, and the cancel.
    fn ways(&self) -> Vec<&Way> {
        let mut ways: Vec<&Way> = self.cancel.iter().collect();
        for node in &self.nodes {
            ways.extend(node.after.iter().map(|deadline| &deadline.way));
            if let Kind::Parallel { done, .. } = &node.kind {
                ways.extend(done.iter());
            }
            for choice in node.on.values().flatten() {
                match choice {
                    Choice::Ask(ask) => ways.extend([&ask.accept, &ask.refuse]),
                    Choice::Way(way) => ways.push(way),
                    Choice::Ignore => {}
                }
            }
        }
        ways
    }

    /// The requests its answers make, by the events each asks with, sorted
    /// and without repeats.
    pub fn asks(&self) -> Vec<&str> {
        let mut asks: Vec<&str> = self
            .nodes
            .iter()
            .flat_map(|node| node.on.values().flatten())
            .filter_map(|choice| match choice {
                Choice::Ask(ask) => Some(ask.asks.iter().map(String::as_str)),
                _ => None,
            })
            .flatten()
            .collect();
        asks.sort_unstable();
        asks.dedup();
        asks
    }

    /// The functions its guards and updates call, sorted and without repeats.
    pub fn called(&self) -> Vec<&str> {
        let mut called: Vec<&str> = self
            .initial
            .iter()
            .filter_map(|start| start.guard.as_deref())
            .chain(
                self.nodes
                    .iter()
                    .flat_map(|node| node.on.values().flatten())
                    .filter_map(|choice| choice.guard().map(String::as_str)),
            )
            .chain(
                self.ways()
                    .into_iter()
                    .flat_map(|way| way.guard.iter().chain(way.update.iter()))
                    .map(String::as_str),
            )
            .collect();
        called.sort_unstable();
        called.dedup();
        called
    }

    /// Whether any state has a deadline, which adds the deadline's effects.
    pub fn deadlines(&self) -> bool {
        self.nodes.iter().any(|node| node.after.is_some())
    }

    /// Where the machine breaks a rule it must keep, one sentence each.
    pub fn faults(&self) -> Vec<String> {
        check::faults(self)
    }
}
