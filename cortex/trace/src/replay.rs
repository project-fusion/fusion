//! Re-running a trace against a different model, and diffing what comes back.
//!
//! This is how you regression-test a system whose outputs are not
//! deterministic. Asserting on text does not work; holding the inputs fixed and
//! comparing does.
//!
//! **What varies is the model, and nothing else yet.** A replay recomputes the
//! [`Detail::Output`] nodes in a trace and copies everything else forward, which
//! is deliberate on three counts:
//!
//! - **Inputs** ([`Detail::is_input`]) are the question. Re-running one would
//!   change it rather than answer it again.
//! - **Context is held fixed by design.** The point of a model-drift replay is
//!   to isolate the model as the variable; recomputing retrieval in the same
//!   run confounds the two, and you could no longer say whether the answer moved
//!   because the model changed or because it was handed different memories.
//!   Varying retrieval instead is a different experiment, and it needs Recall.
//! - **Tool calls are held fixed out of necessity.** Re-executing a tool
//!   re-performs its side effects: a trace that sent an email would send it
//!   again. A replay that can run tools needs a sandbox and an explicit opt-in,
//!   and until it has both, not running them is the only safe default.
//!
//! Prompt substitution is absent rather than stubbed, because resolving a
//! version to the prompt it names needs a registry that does not exist. A field
//! that only relabelled the output would be a lie about what ran.

use std::collections::HashMap;

use fusion_cortex_core::{
    provider::{Message, Provider},
    Id,
};

use crate::{Detail, Graph, Node};

/// What went wrong, in terms of the trace rather than the transport.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The plan named a node the graph does not hold.
    #[error("node {0} is not in the graph")]
    Missing(Id),

    /// The model backend failed.
    #[error("provider: {0}")]
    Provider(String),

    /// An output with no context anywhere in its derivation. Nothing can be
    /// replayed against it, because the messages that produced it are not
    /// recorded anywhere the graph can reach.
    #[error("output {0} has no context in its derivation to replay against")]
    Unanchored(Id),
}

pub type Result<T> = std::result::Result<T, Error>;

/// How two outputs are judged to be the same answer.
///
/// **A scorer must be pinned, and it must say what it is.** This is the whole
/// methodological problem of drift measurement: judging model output with a
/// model is circular, and if the judge moves between runs you cannot tell which
/// of the two things moved. [`Scorer::id`] is recorded in every [`Replay`] so a
/// result names its instrument, and a judge that cannot be pinned to a version
/// has no business implementing this trait.
pub trait Scorer: Send + Sync {
    /// Stable, versioned identity of this judge, e.g. `exact/1` or
    /// `local/llama-3.3-70b@judge-v2`.
    fn id(&self) -> &str;

    /// How alike two outputs are, in `0.0..=1.0`.
    fn score(&self, before: &str, after: &str) -> f32;

    /// At or above this score, a difference is not a regression.
    fn threshold(&self) -> f32;
}

/// The strictest judge: byte equality or nothing.
///
/// Useless for prose and exactly right as a floor, because it is the only
/// scorer that introduces no instrument of its own. A registry publishes its
/// numbers with full confidence and layers weaker, model-judged claims on top.
#[derive(Clone, Copy, Debug, Default)]
pub struct Exact;

impl Scorer for Exact {
    #[expect(
        clippy::unnecessary_literal_bound,
        reason = "the trait returns `&str` so an id can be composed at runtime, and this one is a literal"
    )]
    fn id(&self) -> &str {
        "exact/1"
    }

    fn score(&self, before: &str, after: &str) -> f32 {
        f32::from(u8::from(before == after))
    }

    fn threshold(&self) -> f32 {
        1.0
    }
}

/// What the scorer made of one recomputed node.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Verdict {
    /// Byte-identical. No judgment was involved, so no score is reported.
    Identical,
    /// Different text the scorer accepted.
    Equivalent { score: f32 },
    /// Different text the scorer rejected.
    Differed { score: f32 },
}

impl Verdict {
    /// Whether this is a difference worth a human's attention.
    #[must_use]
    pub fn is_regression(&self) -> bool {
        matches!(self, Self::Differed { .. })
    }
}

/// One node's before and after.
#[derive(Clone, Debug)]
pub struct Divergence {
    pub after: Detail,
    pub before: Detail,
    /// The node in the original graph, so a divergence can be traced back with
    /// [`Graph::why`].
    pub original: Id,
    pub verdict: Verdict,
}

/// A replay, which is itself a trace.
///
/// The new graph is a real provenance graph: `why()` works on it, and so does
/// cascading deletion. A replay of a memory the user later deletes goes with it.
#[derive(Debug)]
pub struct Replay {
    pub divergences: Vec<Divergence>,
    pub graph: Graph,
    /// The model this ran against. A result that does not name its instrument
    /// cannot be compared with another one.
    pub provider: String,
    /// The pinned judge, recorded for the same reason.
    pub scorer: String,
    /// The target's id *in the replayed graph*, which is not the id it had in
    /// the original.
    pub target: Id,
}

impl Replay {
    /// The divergences the scorer rejected.
    pub fn regressions(&self) -> impl Iterator<Item = &Divergence> {
        self.divergences
            .iter()
            .filter(|d| d.verdict.is_regression())
    }
}

impl Graph {
    /// Re-runs everything that produced `target` against `provider`, and diffs
    /// it against what actually happened.
    ///
    /// Executes in [`Graph::plan`] order, so a recomputed node always runs
    /// after the nodes it derives from.
    ///
    /// ```
    /// # use fusion_cortex_core::provider::MockProvider;
    /// # use fusion_cortex_trace::{replay::Exact, Detail, Graph, Node};
    /// # #[tokio::main]
    /// # async fn main() {
    /// # let mut graph = Graph::new();
    /// # let source = graph.insert(Node::new(
    /// #     Detail::Source { content: "when did we ship 0.11?".into(), uri: None },
    /// #     vec![],
    /// # ));
    /// # let context = graph.insert(Node::new(
    /// #     Detail::Context { messages: vec![], strategy: "recency".into() },
    /// #     vec![source],
    /// # ));
    /// # let output = graph.insert(Node::new(
    /// #     Detail::Output {
    /// #         content: "0.11.0 shipped on the 8th.".into(),
    /// #         input_tokens: 412,
    /// #         model: "local/llama-3.3-70b".into(),
    /// #         output_tokens: 9,
    /// #         prompt_version: "answer/v3".into(),
    /// #     },
    /// #     vec![context],
    /// # ));
    /// // The candidate model answers differently.
    /// let candidate = MockProvider { reply: "It shipped in September.".into() };
    ///
    /// let replay = graph.replay(output, &candidate, &Exact).await.unwrap();
    ///
    /// assert_eq!(replay.regressions().count(), 1);
    /// assert_eq!(replay.scorer, "exact/1");   // the result names its judge
    /// assert_eq!(replay.graph.len(), 3);      // a replay is itself a trace
    /// # }
    /// ```
    ///
    /// # Errors
    ///
    /// [`Error::Unanchored`] if an output has no context in its derivation, and
    /// [`Error::Provider`] if the model backend fails.
    pub async fn replay(
        &self,
        target: Id,
        provider: &dyn Provider,
        scorer: &dyn Scorer,
    ) -> Result<Replay> {
        // Without this, a target the graph does not hold produces an empty plan,
        // an empty divergence list, and a `target` id naming nothing in the
        // graph returned — a clean-looking report of no drift, from a replay
        // that ran nothing.
        if self.get(target).is_none() {
            return Err(Error::Missing(target));
        }

        let mut divergences = Vec::new();
        let mut graph = Graph::new();
        // Original id -> the id the copy took. Every id in the replayed graph
        // is new, so parents have to be translated as the plan is walked.
        let mut remapped: HashMap<Id, Id> = HashMap::new();
        let mut last = target;

        for id in self.plan(target) {
            let node = self.get(id).ok_or(Error::Missing(id))?;
            let parents = node
                .derived_from
                .iter()
                .filter_map(|parent| remapped.get(parent).copied())
                .collect();

            let detail = match &node.detail {
                Detail::Output {
                    content,
                    prompt_version,
                    ..
                } => {
                    let messages = self.messages_for(id)?;
                    let completion = provider
                        .complete(messages)
                        .await
                        .map_err(|error| Error::Provider(error.to_string()))?;
                    let after = Detail::Output {
                        content: completion.content,
                        input_tokens: completion.input_tokens,
                        model: completion.model,
                        output_tokens: completion.output_tokens,
                        prompt_version: prompt_version.clone(),
                    };
                    divergences.push(Divergence {
                        verdict: judge(content, &after, scorer),
                        after: after.clone(),
                        before: node.detail.clone(),
                        original: id,
                    });
                    after
                }
                held => held.clone(),
            };

            last = graph.insert(Node::new(detail, parents));
            remapped.insert(id, last);
        }

        Ok(Replay {
            divergences,
            graph,
            provider: provider.id().to_owned(),
            scorer: scorer.id().to_owned(),
            target: last,
        })
    }

    /// The messages that produced an output, found by walking its derivation.
    ///
    /// [`Graph::why`] is breadth-first, so the first context it reaches is the
    /// nearest one. The property that makes it the right shape for an
    /// explanation makes it the right search here: an output assembled from a
    /// context that was itself summarized from an older one must replay against
    /// what actually went to the model, not against its ancestor.
    fn messages_for(&self, id: Id) -> Result<&[Message]> {
        self.why(id)
            .into_iter()
            .find_map(|node| match &node.detail {
                Detail::Context { messages, .. } => Some(messages.as_slice()),
                _ => None,
            })
            .ok_or(Error::Unanchored(id))
    }
}

/// Compares an output's content with what the replay produced.
fn judge(before: &str, after: &Detail, scorer: &dyn Scorer) -> Verdict {
    let Detail::Output { content, .. } = after else {
        unreachable!("a replayed output is an output")
    };
    if before == content {
        return Verdict::Identical;
    }
    let score = scorer.score(before, content);
    if score >= scorer.threshold() {
        Verdict::Equivalent { score }
    } else {
        Verdict::Differed { score }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use async_trait::async_trait;
    use fusion_cortex_core::provider::{Completion, MockProvider, Role};

    use super::*;

    /// Counts what it was asked to run, so "held fixed" can be asserted as a
    /// call that did not happen rather than inferred from the diff.
    #[derive(Default)]
    struct Counting {
        calls: AtomicUsize,
        reply: String,
    }

    #[async_trait]
    impl Provider for Counting {
        #[expect(
            clippy::unnecessary_literal_bound,
            reason = "the trait returns `&str` so an id can be composed at runtime, and this one is a literal"
        )]
        fn id(&self) -> &str {
            "counting/1"
        }

        fn is_local(&self) -> bool {
            true
        }

        async fn complete(&self, _: &[Message]) -> fusion_cortex_core::Result<Completion> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            Ok(Completion {
                content: self.reply.clone(),
                input_tokens: 1,
                model: self.id().to_owned(),
                output_tokens: 1,
            })
        }
    }

    /// Accepts anything, so `Equivalent` is reachable without a model.
    struct Lenient;

    impl Scorer for Lenient {
        #[expect(
            clippy::unnecessary_literal_bound,
            reason = "the trait returns `&str` so an id can be composed at runtime, and this one is a literal"
        )]
        fn id(&self) -> &str {
            "lenient/1"
        }

        fn score(&self, _: &str, _: &str) -> f32 {
            1.0
        }

        fn threshold(&self) -> f32 {
            1.0
        }
    }

    const ANSWER: &str = "0.11.0 shipped on the 8th.";

    fn output() -> Detail {
        Detail::Output {
            content: ANSWER.into(),
            input_tokens: 412,
            model: "local/llama-3.3-70b".into(),
            output_tokens: 9,
            prompt_version: "answer/v3".into(),
        }
    }

    /// source -> context -> output
    fn trace() -> (Graph, Id, Id) {
        let mut graph = Graph::new();
        let source = graph.insert(Node::new(
            Detail::Source {
                content: "when did we ship 0.11?".into(),
                uri: None,
            },
            vec![],
        ));
        let context = graph.insert(Node::new(
            Detail::Context {
                messages: vec![Message {
                    content: "when did we ship 0.11?".into(),
                    role: Role::User,
                }],
                strategy: "recency".into(),
            },
            vec![source],
        ));
        let output = graph.insert(Node::new(output(), vec![context]));
        (graph, source, output)
    }

    #[tokio::test]
    async fn an_unchanged_answer_is_identical_and_not_a_regression() {
        let (graph, _, output) = trace();
        let same = MockProvider {
            reply: ANSWER.into(),
        };

        let replay = graph.replay(output, &same, &Exact).await.unwrap();

        assert_eq!(replay.divergences.len(), 1, "one output was recomputed");
        assert_eq!(replay.divergences[0].verdict, Verdict::Identical);
        assert_eq!(replay.regressions().count(), 0);
    }

    #[tokio::test]
    async fn a_changed_answer_the_scorer_rejects_is_a_regression() {
        let (graph, _, output) = trace();
        let drifted = MockProvider {
            reply: "It shipped sometime in the autumn.".into(),
        };

        let replay = graph.replay(output, &drifted, &Exact).await.unwrap();

        assert_eq!(replay.regressions().count(), 1);
        assert!(matches!(
            replay.divergences[0].verdict,
            Verdict::Differed { .. }
        ));
    }

    #[tokio::test]
    async fn a_changed_answer_the_scorer_accepts_is_not_a_regression() {
        let (graph, _, output) = trace();
        let drifted = MockProvider {
            reply: "It shipped on the 8th of September.".into(),
        };

        let replay = graph.replay(output, &drifted, &Lenient).await.unwrap();

        assert!(matches!(
            replay.divergences[0].verdict,
            Verdict::Equivalent { .. }
        ));
        assert_eq!(replay.regressions().count(), 0);
        assert_eq!(replay.scorer, "lenient/1", "the judge is on the result");
    }

    #[tokio::test]
    async fn a_result_names_the_model_and_the_judge_that_produced_it() {
        let (graph, _, output) = trace();

        let replay = graph
            .replay(
                output,
                &MockProvider {
                    reply: ANSWER.into(),
                },
                &Exact,
            )
            .await
            .unwrap();

        assert_eq!(replay.provider, "mock/deterministic");
        assert_eq!(replay.scorer, "exact/1");
    }

    #[tokio::test]
    async fn inputs_are_copied_rather_than_re_run() {
        let (graph, source, output) = trace();
        let provider = Counting {
            calls: AtomicUsize::new(0),
            reply: ANSWER.into(),
        };

        let replay = graph.replay(output, &provider, &Exact).await.unwrap();

        assert_eq!(
            provider.calls.load(Ordering::SeqCst),
            1,
            "only the output goes to the model"
        );
        let copied = replay
            .graph
            .why(replay.target)
            .into_iter()
            .find(|node| node.detail.is_input())
            .expect("the source is carried into the replay");
        let (
            Detail::Source { content, .. },
            Detail::Source {
                content: before, ..
            },
        ) = (&copied.detail, &graph.get(source).unwrap().detail)
        else {
            panic!("the source did not survive as a source")
        };
        assert_eq!(content, before);
    }

    #[tokio::test]
    async fn a_tool_call_is_carried_forward_rather_than_executed() {
        // Re-running a tool re-performs its side effects. This is the test that
        // says a replay of a trace that sent an email does not send it again.
        let mut graph = Graph::new();
        let context = graph.insert(Node::new(
            Detail::Context {
                messages: vec![],
                strategy: "recency".into(),
            },
            vec![],
        ));
        let tool = graph.insert(Node::new(
            Detail::ToolCall {
                arguments: serde_json::json!({ "to": "board@example.com" }),
                name: "send_email".into(),
                result: Some(serde_json::json!({ "delivered": true })),
            },
            vec![context],
        ));
        let output = graph.insert(Node::new(output(), vec![tool]));
        let provider = Counting {
            calls: AtomicUsize::new(0),
            reply: ANSWER.into(),
        };

        let replay = graph.replay(output, &provider, &Exact).await.unwrap();

        assert_eq!(
            provider.calls.load(Ordering::SeqCst),
            1,
            "the tool was not among the calls"
        );
        let carried = replay
            .graph
            .why(replay.target)
            .into_iter()
            .find(|node| matches!(node.detail, Detail::ToolCall { .. }))
            .expect("the tool call is in the replayed trace");
        let Detail::ToolCall { name, result, .. } = &carried.detail else {
            unreachable!()
        };
        assert_eq!(name, "send_email");
        assert_eq!(result.as_ref().unwrap()["delivered"], true);
    }

    #[tokio::test]
    async fn a_replay_is_itself_a_trace() {
        let (graph, _, output) = trace();

        let mut replay = graph
            .replay(
                output,
                &MockProvider {
                    reply: ANSWER.into(),
                },
                &Exact,
            )
            .await
            .unwrap();

        assert_eq!(
            replay.graph.len(),
            3,
            "every node was carried or recomputed"
        );
        assert_eq!(
            replay.graph.why(replay.target).len(),
            3,
            "why() works on it"
        );
        for node in replay.graph.why(replay.target) {
            for parent in &node.derived_from {
                assert!(
                    replay.graph.get(*parent).is_some(),
                    "parents were remapped into the replayed graph"
                );
            }
        }
        // The ids are new, so a replay cannot be mistaken for the original.
        assert!(graph.get(replay.target).is_none());

        let root = replay.graph.why(replay.target).last().unwrap().id;
        assert_eq!(
            replay.graph.delete_cascade(root).len(),
            3,
            "and so does cascading deletion"
        );
    }

    #[tokio::test]
    async fn an_output_with_no_context_cannot_be_replayed() {
        let mut graph = Graph::new();
        let orphan = graph.insert(Node::new(output(), vec![]));

        let error = graph
            .replay(
                orphan,
                &MockProvider {
                    reply: ANSWER.into(),
                },
                &Exact,
            )
            .await
            .unwrap_err();

        assert!(matches!(error, Error::Unanchored(id) if id == orphan));
    }

    #[tokio::test]
    async fn a_target_the_graph_does_not_hold_is_an_error_not_an_empty_report() {
        let (graph, _, _) = trace();

        let error = graph
            .replay(
                Id::new(),
                &MockProvider {
                    reply: ANSWER.into(),
                },
                &Exact,
            )
            .await
            .unwrap_err();

        assert!(
            matches!(error, Error::Missing(_)),
            "an empty plan must not read as a clean replay"
        );
    }
}
