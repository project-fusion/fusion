//! Provenance. The spine of Cortex.
//!
//! Every memory, context assembly, tool call, and output is a node with edges
//! to whatever produced it. That single property is what makes three things
//! possible, none of which can be retrofitted:
//!
//! - **`why()`** answers "what produced this output", which is what most AI
//!   stacks cannot do at all.
//! - **Replay** re-runs a trace against a different model or prompt and diffs
//!   the result, which is how you regression-test a non-deterministic system.
//! - **Cascading deletion** removes a memory *and everything derived from it*,
//!   which is what makes a user's right to delete real rather than nominal.

use std::collections::{HashMap, HashSet, VecDeque};

use chrono::{DateTime, Utc};
use fusion_cortex_core::Id;
use serde::{Deserialize, Serialize};

/// What a node represents.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    /// Raw input from outside the system.
    Source,
    /// A stored memory, episodic or semantic.
    Memory,
    /// A context window assembled for a specific task.
    Context,
    /// A tool invocation and its result.
    ToolCall,
    /// Model output.
    Output,
}

/// A single node in the provenance graph.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Node {
    pub created_at: DateTime<Utc>,
    /// Nodes this one was derived from. Empty for a `Source`.
    pub derived_from: Vec<Id>,
    pub id: Id,
    pub kind: NodeKind,
    /// Kind-specific detail: model id, prompt version, tool name, scores.
    pub metadata: serde_json::Value,
}

impl Node {
    #[must_use]
    pub fn new(kind: NodeKind, derived_from: Vec<Id>) -> Self {
        Self {
            created_at: Utc::now(),
            derived_from,
            id: Id::new(),
            kind,
            metadata: serde_json::Value::Null,
        }
    }
}

/// An in-memory provenance graph.
///
/// The only implementation today, and the reference for the storage-backed ones
/// to come. `SQLite` and `Postgres` must both match it behind a trait: an
/// abstraction with one implementation is a guess, and `SQLite` assumptions
/// otherwise leak into the domain model.
#[derive(Clone, Debug, Default)]
pub struct Graph {
    /// Reverse index: node -> nodes that derive from it. Maintained on insert
    /// so cascading deletion does not require a full scan.
    dependents: HashMap<Id, Vec<Id>>,
    nodes: HashMap<Id, Node>,
}

impl Graph {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Inserts a node and indexes it under each of its parents.
    ///
    /// Parents are deduplicated: a node listing the same parent twice would
    /// otherwise be queued twice by every cascade that reaches it.
    pub fn insert(&mut self, node: Node) -> Id {
        let id = node.id;
        for parent in &node.derived_from {
            let children = self.dependents.entry(*parent).or_default();
            if !children.contains(&id) {
                children.push(id);
            }
        }
        self.nodes.insert(id, node);
        id
    }

    #[must_use]
    pub fn get(&self, id: Id) -> Option<&Node> {
        self.nodes.get(&id)
    }

    #[must_use]
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Returns the full derivation of a node: everything it came from,
    /// transitively, in breadth-first order from the node itself.
    ///
    /// This is the query the product rests on. "Why did the system say that?"
    ///
    /// Breadth-first is load-bearing: the first entries must be the immediate
    /// causes. A depth-first walk surfaces one arbitrary ancestor chain to its
    /// root before mentioning the sibling that mattered.
    ///
    /// ```
    /// use fusion_cortex_trace::{Graph, Node, NodeKind};
    ///
    /// let mut graph = Graph::new();
    /// let source = graph.insert(Node::new(NodeKind::Source, vec![]));
    /// let memory = graph.insert(Node::new(NodeKind::Memory, vec![source]));
    /// let context = graph.insert(Node::new(NodeKind::Context, vec![memory]));
    /// let output = graph.insert(Node::new(NodeKind::Output, vec![context]));
    ///
    /// // The full derivation: which memories, which context decisions, which model.
    /// let trace = graph.why(output);
    /// assert_eq!(trace.len(), 4);
    /// ```
    #[must_use]
    pub fn why(&self, id: Id) -> Vec<&Node> {
        let mut seen = HashSet::new();
        let mut queue = VecDeque::from([id]);
        let mut out = Vec::new();

        while let Some(current) = queue.pop_front() {
            if !seen.insert(current) {
                continue;
            }
            if let Some(node) = self.nodes.get(&current) {
                out.push(node);
                queue.extend(node.derived_from.iter().copied());
            }
        }

        out
    }

    /// Deletes a node and everything transitively derived from it.
    ///
    /// Returns the ids removed. Deleting a memory must also remove the
    /// summaries, embeddings, and outputs computed from it, or "delete" is a
    /// promise the system cannot keep.
    ///
    /// ```
    /// # use fusion_cortex_trace::{Graph, Node, NodeKind};
    /// # let mut graph = Graph::new();
    /// # let source = graph.insert(Node::new(NodeKind::Source, vec![]));
    /// # let memory = graph.insert(Node::new(NodeKind::Memory, vec![source]));
    /// # let context = graph.insert(Node::new(NodeKind::Context, vec![memory]));
    /// # let output = graph.insert(Node::new(NodeKind::Output, vec![context]));
    /// let removed = graph.delete_cascade(memory);
    ///
    /// assert_eq!(removed.len(), 3);          // memory, context, and output
    /// assert!(graph.get(output).is_none());  // derived output does not survive
    /// assert!(graph.get(source).is_some());  // ancestors are untouched
    /// ```
    pub fn delete_cascade(&mut self, id: Id) -> Vec<Id> {
        let mut removed = Vec::new();
        let mut queue = vec![id];
        let mut seen = HashSet::new();

        while let Some(current) = queue.pop() {
            if !seen.insert(current) {
                continue;
            }
            if self.nodes.remove(&current).is_some() {
                removed.push(current);
            }
            if let Some(children) = self.dependents.remove(&current) {
                queue.extend(children);
            }
        }

        // Drop dangling parent references so the graph stays consistent.
        for node in self.nodes.values_mut() {
            node.derived_from.retain(|parent| !seen.contains(parent));
        }

        // Prune the reverse index too. Surviving nodes still list deleted
        // children otherwise, so the index grows monotonically across a
        // long-lived session and every later cascade re-walks ids that are
        // already gone.
        self.dependents
            .retain(|parent, _| self.nodes.contains_key(parent));
        for children in self.dependents.values_mut() {
            children.retain(|child| !seen.contains(child));
        }
        self.dependents.retain(|_, children| !children.is_empty());

        removed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// source -> memory -> context -> output
    fn chain() -> (Graph, Id, Id, Id) {
        let mut graph = Graph::new();
        let source = graph.insert(Node::new(NodeKind::Source, vec![]));
        let memory = graph.insert(Node::new(NodeKind::Memory, vec![source]));
        let context = graph.insert(Node::new(NodeKind::Context, vec![memory]));
        let output = graph.insert(Node::new(NodeKind::Output, vec![context]));
        (graph, source, memory, output)
    }

    #[test]
    fn why_walks_the_full_derivation() {
        let (graph, source, _, output) = chain();
        let trace = graph.why(output);

        assert_eq!(trace.len(), 4, "output plus three ancestors");
        assert!(trace.iter().any(|n| n.id == source));
        assert!(trace.iter().any(|n| n.id == output));
    }

    #[test]
    fn why_returns_immediate_causes_before_distant_ones() {
        let mut graph = Graph::new();
        let root = graph.insert(Node::new(NodeKind::Source, vec![]));
        let left = graph.insert(Node::new(NodeKind::Memory, vec![root]));
        let right = graph.insert(Node::new(NodeKind::Memory, vec![root]));
        let output = graph.insert(Node::new(NodeKind::Output, vec![left, right]));

        let order: Vec<Id> = graph.why(output).iter().map(|n| n.id).collect();

        assert_eq!(order[0], output, "the node itself comes first");
        assert!(
            order[1..3].contains(&left) && order[1..3].contains(&right),
            "both immediate causes precede their shared ancestor"
        );
        assert_eq!(order[3], root, "the distant ancestor comes last");
    }

    #[test]
    fn why_terminates_on_cycles() {
        let mut graph = Graph::new();
        let a = graph.insert(Node::new(NodeKind::Source, vec![]));
        let b = graph.insert(Node::new(NodeKind::Memory, vec![a]));
        // Force a cycle, which a buggy writer could produce.
        if let Some(node) = graph.nodes.get_mut(&a) {
            node.derived_from.push(b);
        }

        assert_eq!(graph.why(b).len(), 2);
    }

    #[test]
    fn deleting_a_memory_removes_everything_derived_from_it() {
        let (mut graph, source, memory, output) = chain();

        let removed = graph.delete_cascade(memory);

        assert_eq!(removed.len(), 3, "memory, context, and output");
        assert!(
            graph.get(output).is_none(),
            "derived output must not survive"
        );
        assert!(graph.get(source).is_some(), "ancestors are not touched");
        assert_eq!(graph.len(), 1);
    }

    #[test]
    fn cascade_prunes_the_reverse_index() {
        let (mut graph, source, memory, _) = chain();

        graph.delete_cascade(memory);

        for (parent, children) in &graph.dependents {
            assert!(
                graph.nodes.contains_key(parent),
                "index keyed on deleted {parent}"
            );
            for child in children {
                assert!(
                    graph.nodes.contains_key(child),
                    "index points at deleted {child}"
                );
            }
        }
        assert!(graph.get(source).is_some());
    }

    #[test]
    fn repeated_parents_are_indexed_once() {
        let mut graph = Graph::new();
        let source = graph.insert(Node::new(NodeKind::Source, vec![]));
        let duplicated = graph.insert(Node::new(NodeKind::Memory, vec![source, source]));

        assert_eq!(graph.dependents[&source], vec![duplicated]);
    }

    #[test]
    fn cascade_leaves_no_dangling_references() {
        let (mut graph, source, memory, _) = chain();
        graph.delete_cascade(memory);

        for node in graph.nodes.values() {
            for parent in &node.derived_from {
                assert!(graph.nodes.contains_key(parent), "dangling parent {parent}");
            }
        }
        assert!(graph.get(source).is_some());
    }
}
