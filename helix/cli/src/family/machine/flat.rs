//! How nesting and regions flatten into the states a compiled module is in,
//! and what each move leaves, enters and runs.
//!
//! **A configuration is what the module switches on.** It is one leaf, or one
//! leaf in each region of a parallel state. A state that holds others is
//! never the module's state by itself: it is active while one of its leaves
//! is.
//!
//! **A move is external, from the leaf that answered.** It leaves every
//! active state below the nearest state that holds both that leaf and the
//! target, and enters the target's states below it. A target that is the
//! leaf itself, or a state around it, is left and entered again, as a target
//! given has always meant. A move within one region leaves the other regions
//! as they are.
//!
//! **Effects run in one order:** the exit effects of the states left, deepest
//! first, then the way's own, then the entry effects of the states entered,
//! outermost first. A state with a deadline ends it as it is left and starts
//! it as it is entered.

use crate::family::machine::{Choice, Effect, Kind, Machine, Way};

/// One state the compiled module can be in.
#[derive(Debug)]
pub struct Config {
    /// Its constant, `STATE_` and its name.
    pub constant: String,
    /// Its leaves, one, or one for each region in region order.
    pub leaves: Vec<usize>,
    pub name: String,
}

/// A move, worked out: where it leaves the machine, the updates it applies
/// in order, and the effects it runs in order.
#[derive(Debug)]
pub struct Plan {
    pub effects: Vec<Planned>,
    pub state: usize,
    pub updates: Vec<String>,
}

/// One effect of a move.
#[derive(Clone, Debug)]
pub enum Planned {
    Effect(Effect),
    /// The deadline of the state `owner` starts.
    Start {
        ms: f64,
        owner: usize,
    },
    /// The deadline of the state `owner` ends.
    End {
        owner: usize,
    },
}

/// A step along the way from the top of the machine to a state: a state, or
/// a region of a parallel state.
#[derive(Clone, Debug, PartialEq, Eq)]
enum Step {
    Node(usize),
    Region(usize, String),
}

/// A machine, flattened.
pub struct Flat<'a> {
    pub configs: Vec<Config>,
    pub machine: &'a Machine,
}

impl<'a> Flat<'a> {
    pub fn new(machine: &'a Machine) -> Self {
        let mut configs = Vec::new();
        for (index, node) in machine.nodes.iter().enumerate() {
            match &node.kind {
                Kind::Leaf if node.region.is_none() => configs.push(Config {
                    constant: constant(&[&node.name]),
                    leaves: vec![index],
                    name: node.name.clone(),
                }),
                Kind::Parallel { regions, .. } => {
                    let mut products: Vec<Vec<usize>> = vec![Vec::new()];
                    for (region, _) in regions {
                        let leaves = Self::region_leaves(machine, index, region);
                        products = products
                            .into_iter()
                            .flat_map(|so_far| {
                                leaves
                                    .iter()
                                    .map(move |leaf| [so_far.clone(), vec![*leaf]].concat())
                            })
                            .collect();
                    }
                    for leaves in products {
                        let names: Vec<&str> = leaves
                            .iter()
                            .map(|leaf| machine.nodes[*leaf].name.as_str())
                            .collect();
                        configs.push(Config {
                            constant: constant(&[&[node.name.as_str()][..], &names].concat()),
                            name: format!("{}({})", node.name, names.join(", ")),
                            leaves,
                        });
                    }
                }
                _ => {}
            }
        }
        Self { configs, machine }
    }

    fn region_leaves(machine: &Machine, parallel: usize, region: &str) -> Vec<usize> {
        machine
            .nodes
            .iter()
            .enumerate()
            .filter(|(_, node)| {
                node.parent == Some(parallel) && node.region.as_deref() == Some(region)
            })
            .map(|(index, _)| index)
            .collect()
    }

    /// The steps from the top of the machine to a state, that state last.
    fn chain(&self, node: usize) -> Vec<Step> {
        let mut steps = vec![Step::Node(node)];
        let mut at = node;
        while let Some(parent) = self.machine.nodes[at].parent {
            if let Some(region) = &self.machine.nodes[at].region {
                steps.push(Step::Region(parent, region.clone()));
            }
            steps.push(Step::Node(parent));
            at = parent;
        }
        steps.reverse();
        steps
    }

    /// Every active state of a configuration, with how deep it is.
    fn active(&self, config: usize) -> Vec<(usize, usize)> {
        let mut active: Vec<(usize, usize)> = Vec::new();
        for leaf in &self.configs[config].leaves {
            for (depth, step) in self.chain(*leaf).iter().enumerate() {
                if let Step::Node(node) = step {
                    if !active.iter().any(|(seen, _)| seen == node) {
                        active.push((*node, depth));
                    }
                }
            }
        }
        active
    }

    /// Every state active in a configuration.
    pub fn states_of(&self, config: usize) -> Vec<usize> {
        self.active(config)
            .into_iter()
            .map(|(node, _)| node)
            .collect()
    }

    /// The leaves a target enters, from the configuration the machine is in.
    fn resolve(&self, target: usize, current: Option<usize>) -> Vec<usize> {
        let nodes = &self.machine.nodes;
        match &nodes[target].kind {
            Kind::Compound { initial } => self
                .machine
                .find(initial)
                .map_or_else(Vec::new, |child| self.resolve(child, current)),
            Kind::Parallel { regions, .. } => regions
                .iter()
                .filter_map(|(_, initial)| self.machine.find(initial))
                .collect(),
            Kind::Leaf => match (&nodes[target].region, nodes[target].parent) {
                (Some(region), Some(parallel)) => {
                    let Kind::Parallel { regions, .. } = &nodes[parallel].kind else {
                        return vec![target];
                    };
                    regions
                        .iter()
                        .filter_map(|(name, initial)| {
                            if name == region {
                                return Some(target);
                            }
                            let kept = current.and_then(|config| {
                                self.configs[config].leaves.iter().copied().find(|leaf| {
                                    nodes[*leaf].parent == Some(parallel)
                                        && nodes[*leaf].region.as_deref() == Some(name.as_str())
                                })
                            });
                            kept.or_else(|| self.machine.find(initial))
                        })
                        .collect()
                }
                _ => vec![target],
            },
        }
    }

    /// The configuration a set of leaves makes, if it is one.
    pub fn config_of(&self, leaves: &[usize]) -> Option<usize> {
        self.configs
            .iter()
            .position(|config| config.leaves == leaves)
    }

    /// The configuration a machine starts in for a target.
    pub fn start_at(&self, target: &str) -> Option<usize> {
        let node = self.machine.find(target)?;
        self.config_of(&self.resolve(node, None))
    }

    /// The effects of entering a configuration from nothing, as a host that
    /// mounts the machine runs them.
    pub fn entering(&self, config: usize) -> Vec<Planned> {
        let mut entered = self.active(config);
        entered.sort_by_key(|(node, depth)| (*depth, *node));
        entered
            .into_iter()
            .flat_map(|(node, _)| self.enter_effects(node))
            .collect()
    }

    fn enter_effects(&self, node: usize) -> Vec<Planned> {
        let state = &self.machine.nodes[node];
        let mut effects: Vec<Planned> = state.entry.iter().cloned().map(Planned::Effect).collect();
        if let Some(deadline) = &state.after {
            effects.push(Planned::Start {
                ms: deadline.ms,
                owner: node,
            });
        }
        effects
    }

    fn exit_effects(&self, node: usize) -> Vec<Planned> {
        let state = &self.machine.nodes[node];
        let mut effects: Vec<Planned> = state
            .after
            .iter()
            .map(|_| Planned::End { owner: node })
            .collect();
        effects.extend(state.exit.iter().cloned().map(Planned::Effect));
        effects
    }

    /// The move from configuration `from` by `way`, answered by the state
    /// `by`: a leaf, the state whose deadline ended, or none for a cancel.
    pub fn plan(&self, from: usize, by: Option<usize>, way: &Way) -> Option<Plan> {
        let updates: Vec<String> = way.update.iter().cloned().collect();
        let own = way.effects.iter().cloned().map(Planned::Effect);
        let Some(target) = &way.target else {
            return Some(Plan {
                effects: own.collect(),
                state: from,
                updates,
            });
        };
        let target = self.machine.find(target)?;
        let to = self.config_of(&self.resolve(target, Some(from)))?;
        let towards = self.chain(target);
        let domain: Vec<Step> = match by.map(|node| self.chain(node)) {
            Some(around) if around.contains(&Step::Node(target)) => {
                towards[..towards.len() - 1].to_vec()
            }
            Some(around) => around
                .iter()
                .zip(&towards)
                .take_while(|(a, b)| a == b)
                .map(|(a, _)| a.clone())
                .collect(),
            None => Vec::new(),
        };
        let below = |node: usize| {
            let steps = self.chain(node);
            steps.len() > domain.len() && steps[..domain.len()] == domain[..]
        };
        let mut left: Vec<(usize, usize)> = self
            .active(from)
            .into_iter()
            .filter(|(node, _)| below(*node))
            .collect();
        left.sort_by_key(|(node, depth)| (std::cmp::Reverse(*depth), *node));
        let mut entered: Vec<(usize, usize)> = self
            .active(to)
            .into_iter()
            .filter(|(node, _)| below(*node))
            .collect();
        entered.sort_by_key(|(node, depth)| (*depth, *node));
        let mut effects: Vec<Planned> = left
            .iter()
            .flat_map(|(node, _)| self.exit_effects(*node))
            .collect();
        effects.extend(own);
        effects.extend(
            entered
                .iter()
                .flat_map(|(node, _)| self.enter_effects(*node)),
        );
        let moved = Plan {
            effects,
            state: to,
            updates,
        };
        Some(self.finish(moved))
    }

    /// A move that leaves every region of a parallel state in a final state
    /// takes the parallel state's `done` way after it.
    fn finish(&self, moved: Plan) -> Plan {
        let leaves = &self.configs[moved.state].leaves;
        let nodes = &self.machine.nodes;
        let parallel = leaves
            .first()
            .and_then(|leaf| nodes[*leaf].region.as_ref().and(nodes[*leaf].parent));
        let Some(parallel) = parallel else {
            return moved;
        };
        let Kind::Parallel {
            done: Some(done), ..
        } = &nodes[parallel].kind
        else {
            return moved;
        };
        if !leaves.iter().all(|leaf| nodes[*leaf].final_) || done.target.is_none() {
            return moved;
        }
        match self.plan(moved.state, Some(parallel), done) {
            Some(after) => Plan {
                effects: [moved.effects, after.effects].concat(),
                state: after.state,
                updates: [moved.updates, after.updates].concat(),
            },
            None => moved,
        }
    }

    /// What a configuration answers an event with, and the leaf that answers:
    /// a leaf's own answer or its parent's, or in a parallel state the one
    /// region's leaf that answers it.
    pub fn answer(&self, config: usize, event: &str) -> Option<(usize, &'a [Choice])> {
        let nodes = &self.machine.nodes;
        let leaves = &self.configs[config].leaves;
        if let [leaf] = leaves.as_slice() {
            if nodes[*leaf].region.is_none() {
                let own = nodes[*leaf].on.get(event);
                let parent = nodes[*leaf]
                    .parent
                    .and_then(|parent| nodes[parent].on.get(event));
                return own.or(parent).map(|choices| (*leaf, choices.as_slice()));
            }
        }
        let answering = leaves.iter().find(|leaf| {
            nodes[**leaf].on.get(event).is_some_and(|choices| {
                choices
                    .iter()
                    .any(|choice| !matches!(choice, Choice::Ignore))
            })
        });
        let leaf = answering.or(leaves.first())?;
        nodes[*leaf]
            .on
            .get(event)
            .map(|choices| (*leaf, choices.as_slice()))
    }

    /// The marked states active in a configuration.
    pub fn marks(&self, config: usize) -> Vec<&str> {
        let mut active = self.active(config);
        active.sort_by_key(|(node, depth)| (*depth, *node));
        active
            .into_iter()
            .filter(|(node, _)| self.machine.nodes[*node].mark)
            .map(|(node, _)| self.machine.nodes[node].name.as_str())
            .collect()
    }

    /// The states with a deadline active in a configuration.
    pub fn deadlines(&self, config: usize) -> Vec<usize> {
        let mut active = self.active(config);
        active.sort_by_key(|(node, depth)| (*depth, *node));
        active
            .into_iter()
            .filter(|(node, _)| self.machine.nodes[*node].after.is_some())
            .map(|(node, _)| node)
            .collect()
    }
}

/// `STATE_` and the names, upper case, joined by two underscores.
fn constant(names: &[&str]) -> String {
    let parts: Vec<String> = names
        .iter()
        .map(|name| name.to_uppercase().replace('-', "_"))
        .collect();
    format!("STATE_{}", parts.join("__"))
}
