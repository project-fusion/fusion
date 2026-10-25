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
//!
//! **A node carries typed detail rather than a JSON blob.** Replay is the
//! reason: a trace whose payloads are `serde_json::Value` is a record, not a
//! program, and nothing can reconstruct which provider ran against which
//! messages from a shape nothing guarantees. [`Detail`] is what makes a trace
//! executable, and [`Graph::plan`] is the order to execute it in.

pub mod replay;
pub mod search;
pub mod store;

use std::collections::{HashMap, HashSet, VecDeque};

use chrono::{DateTime, Utc};
use fusion_cortex_core::{
    provider::{Block, Message, Stop, Tool, Usage},
    Id,
};
use serde::{Deserialize, Serialize};

/// What a node represents.
///
/// Derived from [`Detail`] rather than stored beside it, so the two cannot
/// disagree. A node tagged `Output` carrying a tool call's payload is a state
/// this type makes unrepresentable rather than a case callers check for.
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
    /// A task given to an agent.
    Task,
    /// The plan an agent works to.
    Plan,
    /// A choice made for an agent, such as which model takes a role.
    Decision,
    /// A done-check run.
    Check,
    /// A file an agent changed.
    Edit,
    /// A request a tool made of a paid service, and what it cost.
    Billed,
}

/// Kind-specific detail, typed so a node can be *re-executed* rather than
/// merely read.
///
/// This is the difference between a log and a trace. A replay has to
/// reconstitute the call that produced a node: which messages went to which
/// model under which prompt. An untyped payload cannot promise those fields
/// exist, so a runner built on one fails at the first trace written by a
/// version that spelled a key differently.
///
/// ```
/// use fusion_cortex_trace::{Detail, Node, NodeKind};
///
/// let node = Node::new(
///     Detail::Output {
///         call: None,
///         content: "0.11.0 shipped on the 8th.".into(),
///         input_tokens: 412,
///         model: "local/llama-3.3-70b".into(),
///         output_tokens: 9,
///         prompt_version: "answer/v3".into(),
///     },
///     vec![],
/// );
///
/// // The kind is read off the detail, so it cannot contradict it.
/// assert_eq!(node.kind(), NodeKind::Output);
/// ```
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Detail {
    /// Raw input from outside the system. Held fixed by a replay: re-running an
    /// input would change the question rather than answer it again.
    Source {
        content: String,
        /// Where it came from, where that is knowable.
        uri: Option<String>,
    },
    /// A stored memory. Carries ids rather than content so the memory has one
    /// home, in Engram, and a trace cannot drift from the fact it cites.
    Memory { fact_ids: Vec<Id> },
    /// A context window assembled for a task. The messages are what a replay
    /// feeds the provider, and `strategy` names the assembly that chose them,
    /// so a diff can attribute a divergence to retrieval rather than to the
    /// model.
    Context {
        /// What the strategy left out to fit the model's window, each with
        /// the node it came from. Left out of the JSON when nothing was.
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        dropped: Vec<Dropped>,
        messages: Vec<Message>,
        /// Each part the strategy placed, and why. Left out of the JSON for
        /// a strategy that records none.
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        placed: Vec<Placed>,
        strategy: String,
        /// The tools the model was offered, which a replay offers again: an
        /// API that sees a tool call in the history may refuse a request that
        /// declares no tools.
        #[serde(default)]
        tools: Vec<Tool>,
    },
    /// A tool invocation and its result.
    ///
    /// `arguments` and `result` stay `serde_json::Value` on purpose, and this
    /// is the one payload where that is the right type: tool arguments are
    /// arbitrary JSON by the wire format's definition, so a stricter type here
    /// would be this crate inventing a schema it cannot enforce.
    ToolCall {
        arguments: serde_json::Value,
        /// The id the model gave the call, which its result names.
        #[serde(default)]
        call_id: Option<String>,
        /// Whether the result reports a failure.
        #[serde(default)]
        is_error: bool,
        name: String,
        /// `None` until the call returns, so a trace written by a run that
        /// failed mid-tool is still a valid trace of what was attempted.
        result: Option<serde_json::Value>,
        /// Where the tool came from when it is not built in, such as an
        /// extension at its digest: `helix@sha256:68b7…`. Left out of the
        /// JSON for a built-in tool.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        source: Option<String>,
        /// Whether the result came from outside the person's control, such
        /// as a web page or an MCP server's answer.
        #[serde(default)]
        untrusted: bool,
    },
    /// Model output, with enough to identify what produced it and what it cost.
    Output {
        /// The rest of what an agent loop records about the call. `None` for
        /// an output written outside a loop.
        #[serde(default)]
        call: Option<Call>,
        content: String,
        input_tokens: u32,
        model: String,
        output_tokens: u32,
        prompt_version: String,
    },
    /// A task given to an agent, and the commands that say it is done. Held
    /// fixed by a replay: it is the question.
    Task {
        checks: Vec<String>,
        goal: String,
        /// The project's folder, where there is one.
        project: Option<String>,
        /// The commit the project was at when the task began.
        revision: Option<String>,
    },
    /// The plan an agent works to. Each change to it is a new node, and says
    /// why it changed.
    Plan { reason: String, steps: Vec<Step> },
    /// A choice made for an agent, such as which model takes a role, with the
    /// reasons for it.
    Decision {
        choice: String,
        reasons: Vec<String>,
        role: String,
    },
    /// A done-check run and what it printed. Held fixed by a replay, because
    /// running it again runs a command again.
    Check {
        command: String,
        /// `None` when the command did not exit on its own, such as at a
        /// timeout.
        exit: Option<i32>,
        output: String,
        passed: bool,
    },
    /// A file an agent changed, and the checkpoint that holds the change.
    Edit { checkpoint: String, path: String },
    /// A request a tool made of a paid service, such as a model provider's
    /// own web search, and what it cost. Derived from the tool call that
    /// made it. Held fixed by a replay, which never runs a tool.
    Billed(Billed),
}

/// What one part of a context is.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Part {
    /// The rules the model works under, such as a system prompt.
    Rules,
    /// The task, as the person gave it.
    Task,
    /// Something the person said after the task.
    Instruction,
    /// Facts from memory.
    Facts,
    /// A model turn.
    Turn,
    /// The results of a turn's tool calls.
    Results,
    /// What the loop said back, such as a check that failed.
    Feedback,
    /// What a compaction kept of the turns it dropped.
    Summary,
}

/// One thing a part of a context is made of, such as the skills in the rules.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Piece {
    /// What it is, in the strategy's own words: `system`, `instructions`,
    /// `skills`, or `mcp`.
    pub kind: String,
    /// How many there are, such as the instruction files or the skills.
    #[serde(default)]
    pub count: u32,
    /// Its size, estimated in tokens.
    pub tokens: u32,
}

/// One part of a context, as the strategy that assembled it placed it.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Placed {
    /// How many of its message's blocks are its own, which come after those
    /// of the parts placed in the message before it. Zero where a strategy
    /// did not say, as one from before parts were counted.
    #[serde(default)]
    pub blocks: usize,
    /// The message it is in, counting from zero. Two parts share a message
    /// where the strategy merged them.
    pub message: usize,
    pub part: Part,
    /// What it is made of, where the strategy that placed it says: the rules as
    /// the system prompt, the instruction files, the skills, and what each
    /// server says to follow, each with its size. Left out of the JSON for a
    /// part that is one thing, and for a trace from before parts had pieces.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub pieces: Vec<Piece>,
    /// Whether no compaction may drop it.
    pub pinned: bool,
    /// Why it is in the context.
    pub reason: String,
    /// The nodes it came from, such as a turn's output, or the tool call of
    /// each result in order.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub sources: Vec<Id>,
    /// Its size, estimated in tokens.
    pub tokens: u32,
}

/// Something a strategy left out of a context to fit a model's window.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Dropped {
    /// Whether it was cleared to a line, where the rest of its message stayed,
    /// or dropped whole.
    pub cleared: bool,
    pub part: Part,
    /// The node it came from, such as the tool call whose result was cleared.
    pub source: Option<Id>,
    /// What it was, in a line, such as `read src/checkout.ts`.
    pub summary: String,
    /// The tokens it freed, estimated.
    pub tokens: u32,
}

/// What an agent loop records about one model call, beyond what a replay
/// compares.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Call {
    /// Every block of the response: text, reasoning, and tool calls. A loop
    /// resumes from these.
    pub blocks: Vec<Block>,
    /// In US dollars, where the model's price is known.
    pub cost: Option<f64>,
    pub elapsed_ms: u64,
    /// Whether the call stayed on the user's machine.
    pub local: bool,
    /// The model profile the loop used, by name and version.
    pub profile: Option<String>,
    /// The provider's id, such as `anthropic/claude-opus-5-5`.
    pub provider: String,
    pub stop: Stop,
    pub usage: Usage,
}

/// A request a tool made of a paid service on its own, such as a model
/// provider's web search, which a session's spend counts beside its model
/// calls.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Billed {
    /// In US dollars: the tokens at the model's price and the fee together.
    /// `None` where neither has a price.
    pub cost: Option<f64>,
    pub elapsed_ms: u64,
    /// The service's own charge, in US dollars, where it has a price, which
    /// `cost` counts too.
    #[serde(default)]
    pub fee: Option<f64>,
    /// Whether the request stayed on the user's machine.
    pub local: bool,
    /// The model that ran the request, as the API named it, or the service,
    /// such as `brave-search`.
    pub model: String,
    /// The provider's id, such as `anthropic/claude-opus-5-5`.
    pub provider: String,
    /// How many requests the service counted, such as searches.
    pub requests: u32,
    /// The tool that made the request, such as `web_search`.
    pub tool: String,
    pub usage: Usage,
}

/// One step of a [`Detail::Plan`].
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Step {
    pub state: StepState,
    pub text: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum StepState {
    Active,
    Done,
    /// Taken out of the plan, and kept so the plan's history reads whole.
    Dropped,
    Pending,
}

impl Detail {
    /// The kind this detail represents.
    #[must_use]
    pub fn kind(&self) -> NodeKind {
        match self {
            Self::Source { .. } => NodeKind::Source,
            Self::Memory { .. } => NodeKind::Memory,
            Self::Context { .. } => NodeKind::Context,
            Self::ToolCall { .. } => NodeKind::ToolCall,
            Self::Output { .. } => NodeKind::Output,
            Self::Task { .. } => NodeKind::Task,
            Self::Plan { .. } => NodeKind::Plan,
            Self::Decision { .. } => NodeKind::Decision,
            Self::Check { .. } => NodeKind::Check,
            Self::Edit { .. } => NodeKind::Edit,
            Self::Billed(_) => NodeKind::Billed,
        }
    }

    /// Whether this is an input to the system rather than something the system
    /// computed.
    ///
    /// A replay copies inputs forward: re-running one would change the question
    /// rather than answer it again. The partition is stated this way round, and
    /// not as "recomputable", because the inverse is not a promise: a
    /// computation a replay *may* touch is not one any given runner does.
    #[must_use]
    pub fn is_input(&self) -> bool {
        matches!(
            self,
            Self::Source { .. } | Self::Memory { .. } | Self::Task { .. }
        )
    }
}

/// A single node in the provenance graph.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Node {
    pub created_at: DateTime<Utc>,
    /// What this node carries, and what a replay needs to re-run it.
    pub detail: Detail,
    /// Nodes this one was derived from. Empty for a `Source`.
    pub derived_from: Vec<Id>,
    pub id: Id,
}

impl Node {
    #[must_use]
    pub fn new(detail: Detail, derived_from: Vec<Id>) -> Self {
        Self {
            created_at: Utc::now(),
            detail,
            derived_from,
            id: Id::new(),
        }
    }

    /// What this node represents, read off its detail.
    #[must_use]
    pub fn kind(&self) -> NodeKind {
        self.detail.kind()
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

    /// Every node, in no particular order.
    pub fn nodes(&self) -> impl Iterator<Item = &Node> {
        self.nodes.values()
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
    /// **This is a reading order, never an execution order.** For that, see
    /// [`Graph::plan`].
    ///
    /// ```
    /// use fusion_cortex_trace::{Detail, Graph, Node};
    /// # fn ctx() -> Detail { Detail::Context { dropped: vec![], messages: vec![], placed: vec![], strategy: "recency".into(), tools: vec![] } }
    /// # fn out() -> Detail {
    /// #     Detail::Output {
    /// #         call: None,
    /// #         content: "0.11.0 shipped on the 8th.".into(),
    /// #         input_tokens: 412,
    /// #         model: "local/llama-3.3-70b".into(),
    /// #         output_tokens: 9,
    /// #         prompt_version: "answer/v3".into(),
    /// #     }
    /// # }
    ///
    /// let mut graph = Graph::new();
    /// let source = graph.insert(Node::new(
    ///     Detail::Source { content: "when did we ship 0.11?".into(), uri: None },
    ///     vec![],
    /// ));
    /// let memory = graph.insert(Node::new(Detail::Memory { fact_ids: vec![] }, vec![source]));
    /// let context = graph.insert(Node::new(ctx(), vec![memory]));
    /// let output = graph.insert(Node::new(out(), vec![context]));
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

    /// Returns the derivation of a node in **execution order**: every node
    /// appears after all of its parents, and `target` appears last.
    ///
    /// This is what a replay runs. [`Graph::why`] returns the same set and is
    /// the wrong order to execute it in: breadth-first from the output is
    /// reachability, not dependency. Reversing it holds wherever every node is
    /// reachable by exactly one path length, which is why a chain and a plain
    /// diamond both survive the mistake and hide it. It breaks as soon as a
    /// node is reachable at two different depths: breadth-first pins that node
    /// at its *shallowest*, and execution needs it before the deepest thing
    /// that reads it. The result is a recomputation running against an input
    /// that does not exist yet, which still looks like an answer.
    ///
    /// Cycles terminate: an edge back into the path being walked is dropped,
    /// which is the only choice that yields an order at all.
    ///
    /// ```
    /// # use fusion_cortex_trace::{Detail, Graph, Node};
    /// # fn mem() -> Detail { Detail::Memory { fact_ids: vec![] } }
    /// # fn ctx() -> Detail { Detail::Context { dropped: vec![], messages: vec![], placed: vec![], strategy: "recency".into(), tools: vec![] } }
    /// let mut graph = Graph::new();
    /// let source = graph.insert(Node::new(
    ///     Detail::Source { content: "…".into(), uri: None },
    ///     vec![],
    /// ));
    /// // A diamond: one source, two memories, one context over both.
    /// let left = graph.insert(Node::new(mem(), vec![source]));
    /// let right = graph.insert(Node::new(mem(), vec![source]));
    /// let context = graph.insert(Node::new(ctx(), vec![left, right]));
    ///
    /// let plan = graph.plan(context);
    ///
    /// assert_eq!(plan[0], source, "the input comes first");
    /// assert_eq!(plan[3], context, "the target comes last");
    /// // Both memories come before the context that reads them.
    /// assert!(plan[1..3].contains(&left) && plan[1..3].contains(&right));
    /// ```
    #[must_use]
    pub fn plan(&self, target: Id) -> Vec<Id> {
        // Iterative post-order DFS. The bool marks a frame as expanded: a node
        // is emitted only when its own frame comes back around, by which point
        // every ancestor it pushed has been emitted. Recursion would be shorter
        // and would blow the stack on a long-running session's trace.
        let mut order = Vec::new();
        let mut done = HashSet::new();
        let mut visiting = HashSet::new();
        let mut stack = vec![(target, false)];

        while let Some((current, expanded)) = stack.pop() {
            if expanded {
                visiting.remove(&current);
                if done.insert(current) && self.nodes.contains_key(&current) {
                    order.push(current);
                }
                continue;
            }
            // Already emitted, or an edge back into the path being walked.
            if done.contains(&current) || !visiting.insert(current) {
                continue;
            }
            stack.push((current, true));
            if let Some(node) = self.nodes.get(&current) {
                for parent in &node.derived_from {
                    stack.push((*parent, false));
                }
            }
        }

        order
    }

    /// Deletes a node and everything transitively derived from it.
    ///
    /// Returns the ids removed. Deleting a memory must also remove the
    /// summaries, embeddings, and outputs computed from it, or "delete" is a
    /// promise the system cannot keep.
    ///
    /// ```
    /// # use fusion_cortex_trace::{Detail, Graph, Node};
    /// # fn ctx() -> Detail { Detail::Context { dropped: vec![], messages: vec![], placed: vec![], strategy: "recency".into(), tools: vec![] } }
    /// # fn out() -> Detail {
    /// #     Detail::Output {
    /// #         call: None,
    /// #         content: "0.11.0 shipped on the 8th.".into(),
    /// #         input_tokens: 412,
    /// #         model: "local/llama-3.3-70b".into(),
    /// #         output_tokens: 9,
    /// #         prompt_version: "answer/v3".into(),
    /// #     }
    /// # }
    /// # let mut graph = Graph::new();
    /// # let source = graph.insert(Node::new(
    /// #     Detail::Source { content: "…".into(), uri: None },
    /// #     vec![],
    /// # ));
    /// # let memory = graph.insert(Node::new(Detail::Memory { fact_ids: vec![] }, vec![source]));
    /// # let context = graph.insert(Node::new(ctx(), vec![memory]));
    /// # let output = graph.insert(Node::new(out(), vec![context]));
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

    fn context() -> Detail {
        Detail::Context {
            dropped: vec![],
            placed: vec![],
            messages: vec![],
            strategy: "recency".into(),
            tools: vec![],
        }
    }

    fn memory() -> Detail {
        Detail::Memory { fact_ids: vec![] }
    }

    fn output() -> Detail {
        Detail::Output {
            call: None,
            content: "0.11.0 shipped on the 8th.".into(),
            input_tokens: 412,
            model: "local/llama-3.3-70b".into(),
            output_tokens: 9,
            prompt_version: "answer/v3".into(),
        }
    }

    fn source() -> Detail {
        Detail::Source {
            content: "when did we ship 0.11?".into(),
            uri: None,
        }
    }

    /// source -> memory -> context -> output
    fn chain() -> (Graph, Id, Id, Id) {
        let mut graph = Graph::new();
        let source = graph.insert(Node::new(source(), vec![]));
        let memory = graph.insert(Node::new(memory(), vec![source]));
        let context = graph.insert(Node::new(context(), vec![memory]));
        let output = graph.insert(Node::new(output(), vec![context]));
        (graph, source, memory, output)
    }

    /// source -> {left, right} -> context
    fn diamond() -> (Graph, Id, Id, Id, Id) {
        let mut graph = Graph::new();
        let source = graph.insert(Node::new(source(), vec![]));
        let left = graph.insert(Node::new(memory(), vec![source]));
        let right = graph.insert(Node::new(memory(), vec![source]));
        let context = graph.insert(Node::new(context(), vec![left, right]));
        (graph, source, left, right, context)
    }

    /// `shared` is reachable from `target` at depth 1 and again at depth 3.
    /// The only shape in this file where breadth-first order, reversed, is not
    /// a valid execution order.
    fn depths() -> (Graph, Id, Id, Id, Id) {
        let mut graph = Graph::new();
        let shared = graph.insert(Node::new(source(), vec![]));
        let middle = graph.insert(Node::new(memory(), vec![shared]));
        let deep = graph.insert(Node::new(context(), vec![middle]));
        let target = graph.insert(Node::new(output(), vec![deep, shared]));
        (graph, shared, middle, deep, target)
    }

    fn task() -> Detail {
        Detail::Task {
            checks: vec!["bun test checkout".into()],
            goal: "fix the flaky checkout test".into(),
            project: None,
            revision: None,
        }
    }

    #[test]
    fn a_task_is_an_input_and_a_check_is_computed() {
        assert!(task().is_input());
        let check = Detail::Check {
            command: "bun test checkout".into(),
            exit: Some(1),
            output: "1 failed".into(),
            passed: false,
        };
        assert!(!check.is_input());
        assert_eq!(Node::new(check, vec![]).kind(), NodeKind::Check);
        assert_eq!(Node::new(task(), vec![]).kind(), NodeKind::Task);
    }

    #[test]
    fn a_loop_node_survives_a_round_trip_and_an_old_one_still_reads() {
        let plan = Detail::Plan {
            reason: "the failure points at the clock".into(),
            steps: vec![
                Step {
                    state: StepState::Done,
                    text: "reproduce the failure".into(),
                },
                Step {
                    state: StepState::Active,
                    text: "fix the clock helper".into(),
                },
            ],
        };
        let encoded = serde_json::to_string(&Node::new(plan.clone(), vec![])).unwrap();
        let decoded: Node = serde_json::from_str(&encoded).unwrap();
        assert_eq!(decoded.kind(), NodeKind::Plan);

        // An output and a context written before a loop recorded calls and
        // tools still read, with neither.
        let old = r#"{"kind":"output","content":"hi","input_tokens":1,"model":"m","output_tokens":1,"prompt_version":"v1"}"#;
        let Detail::Output { call, .. } = serde_json::from_str(old).unwrap() else {
            panic!("an output reads as an output")
        };
        assert!(call.is_none());
        let old = r#"{"kind":"context","messages":[],"strategy":"recency"}"#;
        let Detail::Context { tools, .. } = serde_json::from_str(old).unwrap() else {
            panic!("a context reads as a context")
        };
        assert!(tools.is_empty());
    }

    #[test]
    fn kind_is_read_off_the_detail() {
        assert_eq!(Node::new(source(), vec![]).kind(), NodeKind::Source);
        assert_eq!(Node::new(memory(), vec![]).kind(), NodeKind::Memory);
        assert_eq!(Node::new(context(), vec![]).kind(), NodeKind::Context);
        assert_eq!(Node::new(output(), vec![]).kind(), NodeKind::Output);
    }

    #[test]
    fn inputs_are_separated_from_computations() {
        assert!(
            source().is_input(),
            "replaying an input changes the question"
        );
        assert!(memory().is_input());
        assert!(!context().is_input());
        assert!(!output().is_input());
    }

    #[test]
    fn a_node_survives_a_round_trip_through_json() {
        let node = Node::new(output(), vec![]);

        let encoded = serde_json::to_string(&node).unwrap();
        let decoded: Node = serde_json::from_str(&encoded).unwrap();

        assert_eq!(decoded.kind(), NodeKind::Output);
        assert!(
            encoded.contains(r#""kind":"output""#),
            "the tag a stored trace is read back by"
        );
        let Detail::Output { model, .. } = decoded.detail else {
            panic!("variant changed across the round trip")
        };
        assert_eq!(model, "local/llama-3.3-70b");
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
        let root = graph.insert(Node::new(source(), vec![]));
        let left = graph.insert(Node::new(memory(), vec![root]));
        let right = graph.insert(Node::new(memory(), vec![root]));
        let output = graph.insert(Node::new(output(), vec![left, right]));

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
        let a = graph.insert(Node::new(source(), vec![]));
        let b = graph.insert(Node::new(memory(), vec![a]));
        // Force a cycle, which a buggy writer could produce.
        if let Some(node) = graph.nodes.get_mut(&a) {
            node.derived_from.push(b);
        }

        assert_eq!(graph.why(b).len(), 2);
    }

    #[test]
    fn plan_puts_every_parent_before_its_child() {
        // Over `depths()` rather than `diamond()`: the invariant holds on a
        // diamond even for a wrong implementation, so a diamond here would
        // assert nothing this file does not already get for free.
        let (graph, _, _, _, target) = depths();

        let plan = graph.plan(target);
        let position = |id: Id| plan.iter().position(|c| *c == id).unwrap();

        assert_eq!(plan.len(), 4);
        for id in &plan {
            for parent in &graph.get(*id).unwrap().derived_from {
                assert!(
                    position(*parent) < position(*id),
                    "parent {parent} scheduled after its child {id}"
                );
            }
        }
        assert_eq!(*plan.last().unwrap(), target, "the target runs last");
    }

    #[test]
    fn plan_covers_exactly_what_why_reaches() {
        let (graph, _, _, _, context) = diamond();

        let planned: HashSet<Id> = graph.plan(context).into_iter().collect();
        let reached: HashSet<Id> = graph.why(context).iter().map(|n| n.id).collect();

        assert_eq!(planned, reached, "same set, different order");
    }

    #[test]
    fn plan_beats_reversed_why_where_depths_disagree() {
        // The mistake this method exists to prevent, in the only shape that
        // exposes it: `shared` is reachable from `target` directly and again
        // three steps away. Breadth-first pins it at the shallower depth, so
        // reversing puts it after the node that reads it. A chain or a plain
        // diamond passes under either order, which is why neither is the test.
        let (graph, shared, middle, _, target) = depths();

        let plan = graph.plan(target);
        let mut reversed: Vec<Id> = graph.why(target).iter().map(|n| n.id).collect();
        reversed.reverse();

        let at = |order: &[Id], id: Id| order.iter().position(|c| *c == id).unwrap();

        assert!(
            at(&reversed, shared) > at(&reversed, middle),
            "reversed why schedules the shared input after its reader"
        );
        assert!(
            at(&plan, shared) < at(&plan, middle),
            "plan schedules it before"
        );
        assert_eq!(*plan.last().unwrap(), target);
    }

    #[test]
    fn plan_terminates_on_cycles() {
        let mut graph = Graph::new();
        let a = graph.insert(Node::new(source(), vec![]));
        let b = graph.insert(Node::new(memory(), vec![a]));
        if let Some(node) = graph.nodes.get_mut(&a) {
            node.derived_from.push(b);
        }

        let plan = graph.plan(b);

        assert_eq!(plan.len(), 2);
        assert_eq!(*plan.last().unwrap(), b, "the target still runs last");
    }

    #[test]
    fn plan_skips_ids_the_graph_does_not_hold() {
        let mut graph = Graph::new();
        let orphan = Id::new();
        let node = graph.insert(Node::new(memory(), vec![orphan]));

        assert_eq!(
            graph.plan(node),
            vec![node],
            "a dangling parent is not a step"
        );
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
        let source = graph.insert(Node::new(source(), vec![]));
        let duplicated = graph.insert(Node::new(memory(), vec![source, source]));

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
