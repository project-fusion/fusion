//! The verbs, over one store that holds Engram and Trace together.
//!
//! **Every verb writes Trace as it writes Engram.** An episode is recorded
//! with a source node, a consolidation pass appends its extraction and memory
//! nodes, and an answer is a question, a context, and an output. `why` then
//! walks from an answer to the episodes it rests on, and `forget` removes an
//! episode from both, with everything derived from it.
//!
//! **Each command is a trace of its own.** An ingest, a pass, and a question
//! each get a trace id, and a node in one derives from nodes in another, which
//! is what Trace's deletion follows across traces.

use std::{
    collections::{HashMap, HashSet, VecDeque},
    time::Instant,
};

use chrono::{DateTime, Utc};
use fusion_cortex_core::{
    embed::Embedder,
    provider::{Message, Provider, Request, Role},
    Id,
};
use fusion_cortex_engram::{
    consolidate::{consolidate_with, Options},
    embed::backfill,
    store::Store as Engram,
    Episode, Fact, Scope,
};
use fusion_cortex_recall::{
    assemble, relevant, Item, Overlap, Part, Scorer, Vector, Weighted, Window, STRATEGY,
};
use fusion_cortex_trace::{
    replay::{Exact, Verdict},
    store::Store as Trace,
    Call, Detail, Graph, Node, NodeKind,
};
use fusion_rules::error::{Failure, Outcome};
use serde::Serialize;

use crate::diff::{self, Change};

/// The name and version every answer records.
pub const PROMPT_VERSION: &str = "answer/v1";

/// What an answer is asked to do.
const INSTRUCTION: &str = "Answer the question from the facts you are given. Use only those \
facts. Where the facts do not answer the question, say what is missing. Answer in one to three \
sentences.";

/// How fast a fact's confidence halves when it is ranked, in days.
const HALF_LIFE_DAYS: f32 = 30.0;

/// The shares of word overlap and meaning in a fact's score, where facts have
/// vectors.
const OVERLAP_WEIGHT: f32 = 0.3;
const VECTOR_WEIGHT: f32 = 0.7;

/// Every kind of node, which is what loading the whole graph reads.
const KINDS: [NodeKind; 13] = [
    NodeKind::Source,
    NodeKind::Memory,
    NodeKind::Context,
    NodeKind::ToolCall,
    NodeKind::Output,
    NodeKind::Task,
    NodeKind::Plan,
    NodeKind::Decision,
    NodeKind::Check,
    NodeKind::Edit,
    NodeKind::Billed,
    NodeKind::Validation,
    NodeKind::Extraction,
];

fn storage(what: &str, error: &fusion_cortex_core::Error) -> Failure {
    Failure::input(what.to_owned(), error.to_string())
}

/// A note to record: its text, and where it came from.
#[derive(Clone, Debug)]
pub struct Note {
    pub source: String,
    pub text: String,
}

/// An episode, as a person reads it.
#[derive(Clone, Debug, Serialize)]
pub struct EpisodeView {
    pub id: Id,
    pub node: Option<Id>,
    pub occurred_at: DateTime<Utc>,
    pub scope: String,
    /// Where it came from, such as `file:///notes/monday.md#2`.
    pub source: Option<String>,
    pub text: String,
}

/// A fact, as a person reads it.
#[derive(Clone, Debug, Serialize)]
pub struct FactView {
    pub confidence: f32,
    pub content: String,
    pub current: bool,
    /// The model of its vector, where it has one.
    pub embedding: Option<String>,
    pub id: Id,
    pub scope: String,
    pub sources: Vec<EpisodeView>,
}

/// Engram and Trace, at one location.
pub struct Memory {
    engram: Box<dyn Engram>,
    trace: Box<dyn Trace>,
}

/// What Engram and Trace hold, read once for a report.
struct Held {
    episodes: HashMap<Id, Episode>,
    facts: HashMap<Id, Fact>,
    /// Each source node's address, by the node.
    sources: HashMap<Id, Option<String>>,
}

impl Held {
    fn episode(&self, id: Id) -> Option<EpisodeView> {
        let episode = self.episodes.get(&id)?;
        Some(EpisodeView {
            id,
            node: episode.node,
            occurred_at: episode.occurred_at,
            scope: crate::settings::scope_text(&episode.scope),
            source: episode
                .node
                .and_then(|node| self.sources.get(&node).cloned().flatten()),
            text: episode.content.clone(),
        })
    }

    fn fact(&self, id: Id) -> Option<FactView> {
        let fact = self.facts.get(&id)?;
        Some(FactView {
            confidence: fact.confidence,
            content: fact.content.clone(),
            current: fact.is_current(),
            embedding: fact
                .embedding
                .as_ref()
                .map(|embedding| embedding.model.clone()),
            id,
            scope: crate::settings::scope_text(&fact.scope),
            sources: fact
                .derived_from
                .iter()
                .filter_map(|episode| self.episode(*episode))
                .collect(),
        })
    }
}

/// What `ingest` recorded.
#[derive(Debug, Serialize)]
pub struct Ingested {
    pub episodes: Vec<EpisodeView>,
    pub trace: Id,
}

/// What `consolidate` wrote.
#[derive(Debug, Default, Serialize)]
pub struct Consolidated {
    /// The facts the pass asserted.
    pub asserted: Vec<FactView>,
    /// Facts without a vector that the pass embedded afterward.
    pub backfilled: Vec<Id>,
    /// How many episodes the pass read.
    pub read: usize,
    /// The batches whose extraction failed, which the next pass reads again.
    pub failed: Vec<FailedBatch>,
    /// Statements the model gave that named no episode it read.
    pub skipped: Vec<String>,
    /// Each source added to a fact already held.
    pub sourced: Vec<Sourced>,
    /// Each fact a new one superseded.
    pub superseded: Vec<Superseded>,
    pub trace: Option<Id>,
    /// Facts written without a vector, because the embedder failed.
    pub unembedded: Vec<Id>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct FailedBatch {
    pub episodes: Vec<EpisodeView>,
    pub error: String,
}

#[derive(Debug, Serialize)]
pub struct Sourced {
    pub episode: Option<EpisodeView>,
    pub fact: Option<FactView>,
}

#[derive(Debug, Serialize)]
pub struct Superseded {
    pub new: Option<FactView>,
    pub old: Option<FactView>,
}

/// A fact an answer was given, and why.
#[derive(Debug, Serialize)]
pub struct Given {
    pub content: String,
    pub id: Id,
    pub node: Option<Id>,
    /// Why the fact was placed: the scorer and each part's score.
    pub reason: String,
    /// What it ranked by: its confidence, weighed by its score.
    pub rank: f32,
}

/// What `ask` answered.
#[derive(Debug, Serialize)]
pub struct Asked {
    pub answer: String,
    pub facts: Vec<Given>,
    /// The output node, which `why` and `replay` take.
    pub id: Id,
    pub local: bool,
    pub model: String,
    pub provider: String,
    pub scorer: String,
    pub trace: Id,
    pub warnings: Vec<String>,
}

/// An answer's context: the question, and each fact placed.
#[derive(Debug, Serialize)]
pub struct Derived {
    pub context: Option<Id>,
    pub facts: Vec<Placement>,
    pub question: Option<String>,
    pub strategy: Option<String>,
}

/// A fact a context placed, with why, and the episodes it rests on.
#[derive(Debug, Serialize)]
pub struct Placement {
    pub episodes: Vec<EpisodeView>,
    /// The fact as Engram holds it now, where it still does.
    pub fact: Option<FactView>,
    pub node: Option<Id>,
    pub reason: String,
}

/// An answer and the output node that holds it.
#[derive(Debug, Serialize)]
pub struct Answer {
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub id: Id,
    pub model: String,
    pub prompt_version: String,
    pub provider: Option<String>,
}

/// What `why` found.
#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Why {
    /// An answer, its context, the facts placed, and their episodes.
    Answer { answer: Answer, derivation: Derived },
    /// A fact and the episodes it rests on.
    Fact { fact: FactView },
    /// Any other node, and every node it derives from, nearest first.
    Node { nodes: Vec<NodeView> },
}

#[derive(Debug, Serialize)]
pub struct NodeView {
    pub derived_from: Vec<Id>,
    pub id: Id,
    pub kind: NodeKind,
    pub text: String,
}

/// What `forget` removed.
#[derive(Debug, Serialize)]
pub struct Forgot {
    /// The answers that drew on what was forgotten, which went with it.
    pub answers: Vec<Id>,
    pub episodes: Vec<EpisodeView>,
    pub facts: Vec<FactView>,
    /// Trace nodes removed, the episodes' own included.
    pub nodes: usize,
    /// Facts that rest on other episodes too, whose memory node went with a
    /// pass that read the forgotten one, and that were recorded again from the
    /// episodes they still rest on.
    pub reanchored: Vec<Id>,
    /// Facts current again, because the fact that superseded them was
    /// forgotten.
    pub restored: Vec<FactView>,
}

/// What `replay` found.
#[derive(Debug, Serialize)]
pub struct Replayed {
    pub after: Answer,
    pub before: Answer,
    pub changes: Vec<Change>,
    pub identical: bool,
    pub scorer: String,
}

impl Memory {
    /// The store at `location`, for Engram and Trace both.
    ///
    /// # Errors
    ///
    /// [`Failure`] if either store cannot open.
    pub async fn open(location: &str) -> Outcome<Self> {
        let engram = fusion_cortex_engram::store::open(location)
            .await
            .map_err(|error| storage("cannot open the store", &error))?;
        let trace = fusion_cortex_trace::store::open(location)
            .await
            .map_err(|error| storage("cannot open the store", &error))?;
        Ok(Self { engram, trace })
    }

    async fn graph(&self) -> Outcome<Graph> {
        let mut graph = Graph::new();
        /* **The whole graph, because a derivation crosses traces** and a store
        finds no node by its id alone: an answer's facts are in a pass's trace,
        and their episodes in an ingest's. */
        for (_, node) in self
            .trace
            .nodes_of(&KINDS, None)
            .await
            .map_err(|error| storage("cannot read the trace", &error))?
        {
            graph.insert(node);
        }
        Ok(graph)
    }

    async fn sources(&self) -> Outcome<HashMap<Id, Option<String>>> {
        Ok(self
            .trace
            .nodes_of(&[NodeKind::Source], None)
            .await
            .map_err(|error| storage("cannot read the trace", &error))?
            .into_iter()
            .filter_map(|(_, node)| match node.detail {
                Detail::Source { uri, .. } => Some((node.id, uri)),
                _ => None,
            })
            .collect())
    }

    async fn held(&self) -> Outcome<Held> {
        let read = |error: fusion_cortex_core::Error| storage("cannot read memory", &error);
        Ok(Held {
            episodes: self
                .engram
                .episodes()
                .await
                .map_err(read)?
                .into_iter()
                .map(|episode| (episode.id, episode))
                .collect(),
            facts: self
                .engram
                .facts()
                .await
                .map_err(read)?
                .into_iter()
                .map(|fact| (fact.id, fact))
                .collect(),
            sources: self.sources().await?,
        })
    }

    async fn append(&self, trace: Id, nodes: &[Node]) -> Outcome<()> {
        for node in nodes {
            self.trace
                .append(trace, node)
                .await
                .map_err(|error| storage("cannot write the trace", &error))?;
        }
        Ok(())
    }

    /// Records each note as an episode in `scope`, with a source node.
    ///
    /// # Errors
    ///
    /// [`Failure`] if a store fails.
    pub async fn ingest(
        &self,
        notes: Vec<Note>,
        scope: &Scope,
        at: Option<DateTime<Utc>>,
    ) -> Outcome<Ingested> {
        let trace = Id::new();
        let mut episodes = Vec::new();
        for note in notes {
            let node = Node::new(
                Detail::Source {
                    content: note.text.clone(),
                    uri: Some(note.source.clone()),
                },
                vec![],
            );
            self.append(trace, std::slice::from_ref(&node)).await?;
            let mut episode = Episode::new(note.text, trace)
                .within(scope.clone())
                .at(node.id);
            if let Some(at) = at {
                episode.occurred_at = at;
            }
            self.engram
                .record(&episode)
                .await
                .map_err(|error| storage("cannot record an episode", &error))?;
            episodes.push(EpisodeView {
                id: episode.id,
                node: episode.node,
                occurred_at: episode.occurred_at,
                scope: crate::settings::scope_text(scope),
                source: Some(note.source),
                text: episode.content,
            });
        }
        Ok(Ingested { episodes, trace })
    }

    /// Distills the pending episodes into facts, embeds them where an
    /// embedder is set, and appends the pass's nodes to a trace of its own.
    ///
    /// # Errors
    ///
    /// [`Failure`] if a store fails.
    pub async fn consolidate(
        &self,
        provider: &dyn Provider,
        embedder: Option<&dyn Embedder>,
    ) -> Outcome<Consolidated> {
        let pass = consolidate_with(
            provider,
            embedder,
            self.engram.as_ref(),
            &Options::default(),
        )
        .await
        .map_err(|error| storage("cannot consolidate", &error))?;
        let mut report = Consolidated::default();
        if !pass.nodes.is_empty() {
            let trace = Id::new();
            self.append(trace, &pass.nodes).await?;
            report.trace = Some(trace);
        }
        if let Some(embedder) = embedder {
            /* A fact from an earlier pass, or one whose embedding failed, gets
            its vector now, so a fact never stays without one for long. */
            match backfill(self.engram.as_ref(), embedder, 32).await {
                Ok(vectors) => report.backfilled = vectors,
                Err(error) => report
                    .warnings
                    .push(format!("{} embedded nothing: {error}", embedder.model())),
            }
        }
        let held = self.held().await?;
        report.read = pass.consolidated.len();
        report.asserted = pass
            .asserted
            .iter()
            .filter_map(|fact| held.fact(*fact))
            .collect();
        report.sourced = pass
            .sourced
            .iter()
            .map(|(fact, episode)| Sourced {
                episode: held.episode(*episode),
                fact: held.fact(*fact),
            })
            .collect();
        report.superseded = pass
            .superseded
            .iter()
            .map(|(old, new)| Superseded {
                new: held.fact(*new),
                old: held.fact(*old),
            })
            .collect();
        report.failed = pass
            .failed
            .iter()
            .map(|failed| FailedBatch {
                episodes: failed
                    .episodes
                    .iter()
                    .filter_map(|episode| held.episode(*episode))
                    .collect(),
                error: failed.error.to_string(),
            })
            .collect();
        report.skipped = pass
            .skipped
            .into_iter()
            .map(|claim| claim.statement)
            .collect();
        for unembedded in pass.unembedded {
            report.warnings.push(format!(
                "{} facts were written without a vector: {}",
                unembedded.facts.len(),
                unembedded.error
            ));
            report.unembedded.extend(unembedded.facts);
        }
        report
            .unembedded
            .retain(|fact| !report.backfilled.contains(fact));
        Ok(report)
    }

    /// Answers `question` from the facts in `read` that Recall places, and
    /// records the question, the context, and the answer in a trace.
    ///
    /// # Errors
    ///
    /// [`Failure`] if a store or the provider fails.
    pub async fn ask(
        &self,
        question: &str,
        provider: &dyn Provider,
        embedder: Option<&dyn Embedder>,
        read: &[Scope],
        most: usize,
    ) -> Outcome<Asked> {
        let facts = self
            .engram
            .current_facts()
            .await
            .map_err(|error| storage("cannot read memory", &error))?;
        let mut warnings = Vec::new();
        let vector = question_vector(&facts, read, question, embedder, &mut warnings).await;
        let weighted = vector.as_ref().map(|vector| {
            Weighted::new(vec![
                (&Overlap as &dyn Scorer, OVERLAP_WEIGHT),
                (vector as &dyn Scorer, VECTOR_WEIGHT),
            ])
        });
        let scorer: &dyn Scorer = match &weighted {
            Some(weighted) => weighted,
            None => &Overlap,
        };
        let now = Utc::now();
        let age = |fact: &Fact| {
            #[expect(
                clippy::cast_precision_loss,
                reason = "an age in seconds, far below where a float loses a day"
            )]
            let days = (now - fact.updated_at).num_seconds() as f32 / 86_400.0;
            days
        };
        let chosen = relevant(&facts, read, question, scorer, most, age, HALF_LIFE_DAYS);

        let (items, given) = placed(question, &chosen, scorer);
        let context = assemble(&items, Window::unbounded(), None);

        let asked = Node::new(
            Detail::Source {
                content: question.to_owned(),
                uri: None,
            },
            vec![],
        );
        let mut parents = vec![asked.id];
        parents.extend(given.iter().filter_map(|fact| fact.node));
        let shown = Node::new(
            Detail::Context {
                dropped: context.dropped,
                format: None,
                messages: context.messages.clone(),
                placed: context.placed,
                strategy: STRATEGY.to_owned(),
                tools: vec![],
            },
            parents,
        );
        let request = Request {
            messages: context.messages,
            ..Request::default()
        };
        let started = Instant::now();
        let response = provider
            .complete(&request)
            .await
            .map_err(|error| crate::models::failed(provider.id(), &error))?;
        let answer = response.joined().trim().to_owned();
        let output = Node::new(
            Detail::Output {
                call: Some(Call {
                    blocks: response.content.clone(),
                    cost: None,
                    elapsed_ms: u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
                    local: provider.is_local(),
                    profile: None,
                    provider: provider.id().to_owned(),
                    stop: response.stop.clone(),
                    usage: response.usage,
                }),
                content: answer.clone(),
                input_tokens: response.usage.input,
                model: response.model.clone(),
                output_tokens: response.usage.output,
                prompt_version: PROMPT_VERSION.to_owned(),
            },
            vec![shown.id],
        );
        let trace = Id::new();
        let id = output.id;
        self.append(trace, &[asked, shown, output]).await?;
        self.trace
            .title(trace, Some(question))
            .await
            .map_err(|error| storage("cannot write the trace", &error))?;
        Ok(Asked {
            answer,
            facts: given,
            id,
            local: provider.is_local(),
            model: response.model,
            provider: provider.id().to_owned(),
            scorer: scorer.id().to_owned(),
            trace,
            warnings,
        })
    }

    /// The answer `target` names: an output node's id, `last`, or text an
    /// answer or its question holds, the latest first. None is `last`.
    fn find_answer(graph: &Graph, target: Option<&str>) -> Outcome<Id> {
        let mut answers: Vec<&Node> = graph
            .nodes()
            .filter(|node| {
                matches!(&node.detail, Detail::Output { prompt_version, .. } if prompt_version == PROMPT_VERSION)
            })
            .collect();
        answers.sort_by_key(|node| node.id);
        let target = target.map(str::trim).filter(|target| !target.is_empty());
        let found = match target {
            None | Some("last") => answers.last().copied(),
            Some(text) => {
                if let Ok(id) = uuid::Uuid::parse_str(text) {
                    answers.iter().copied().find(|node| node.id == Id(id))
                } else {
                    let text = text.to_lowercase();
                    answers.iter().rev().copied().find(|node| {
                        let said = match &node.detail {
                            Detail::Output { content, .. } => content.to_lowercase(),
                            _ => String::new(),
                        };
                        said.contains(&text)
                            || question(graph, node)
                                .is_some_and(|question| question.to_lowercase().contains(&text))
                    })
                }
            }
        };
        found.map(|node| node.id).ok_or_else(|| {
            let why = if answers.is_empty() {
                "the store holds no answer yet".to_owned()
            } else {
                "no answer has that id, or holds that text".to_owned()
            };
            Failure::input(
                format!("no answer matches `{}`", target.unwrap_or("last")),
                why,
            )
            .hint("cortex ask <question>")
        })
    }

    /// The derivation of `target`: an answer, a fact, or any node.
    ///
    /// # Errors
    ///
    /// [`Failure`] if a store fails or nothing matches `target`.
    pub async fn why(&self, target: Option<&str>) -> Outcome<Why> {
        let graph = self.graph().await?;
        let held = self.held().await?;
        if let Some(id) = target.and_then(|text| uuid::Uuid::parse_str(text.trim()).ok()) {
            let id = Id(id);
            if let Some(fact) = held.fact(id) {
                return Ok(Why::Fact { fact });
            }
            if let Some(node) = graph.get(id) {
                if !matches!(&node.detail, Detail::Output { prompt_version, .. } if prompt_version == PROMPT_VERSION)
                {
                    return Ok(Why::Node {
                        nodes: graph.why(id).into_iter().map(view).collect(),
                    });
                }
            }
        }
        let id = Self::find_answer(&graph, target)?;
        let node = graph.get(id).expect("an answer the graph holds");
        Ok(Why::Answer {
            answer: answer(node),
            derivation: derivation(&graph, &held, node),
        })
    }

    /// Forgets an episode, or every episode from a source, with every fact
    /// that rests on them alone and every node derived from them.
    ///
    /// # Errors
    ///
    /// [`Failure`] if a store fails or nothing matches `target`.
    pub async fn forget(&self, target: &str) -> Outcome<Forgot> {
        let before = self.held().await?;
        let graph = self.graph().await?;
        let target = target.trim();
        let mut doomed: Vec<&Episode> = Vec::new();
        if let Ok(id) = uuid::Uuid::parse_str(target) {
            doomed.extend(before.episodes.get(&Id(id)));
        }
        if doomed.is_empty() {
            let named = crate::source::addresses(target);
            let nodes: HashSet<Id> = before
                .sources
                .iter()
                .filter(|(_, uri)| {
                    uri.as_deref()
                        .is_some_and(|uri| named.iter().any(|name| crate::source::names(uri, name)))
                })
                .map(|(node, _)| *node)
                .collect();
            doomed.extend(
                before
                    .episodes
                    .values()
                    .filter(|episode| episode.node.is_some_and(|node| nodes.contains(&node))),
            );
        }
        if doomed.is_empty() {
            return Err(Failure::input(
                format!("nothing to forget at `{target}`"),
                "no episode has that id, and no episode came from that source",
            ));
        }
        doomed.sort_by_key(|episode| episode.id);

        let answers: HashSet<Id> = graph
            .nodes()
            .filter(|node| matches!(&node.detail, Detail::Output { prompt_version, .. } if prompt_version == PROMPT_VERSION))
            .map(|node| node.id)
            .collect();
        let mut removed_facts = Vec::new();
        let mut removed_nodes: HashSet<Id> = HashSet::new();
        for episode in &doomed {
            let removed = self
                .engram
                .forget_episode(episode.id)
                .await
                .map_err(|error| storage("cannot forget an episode", &error))?;
            removed_facts.extend(
                removed
                    .into_iter()
                    .filter(|id| before.facts.contains_key(id)),
            );
            if let Some(node) = episode.node {
                removed_nodes.extend(
                    self.trace
                        .delete_cascade(node)
                        .await
                        .map_err(|error| storage("cannot forget an episode", &error))?,
                );
            }
        }

        let after = self.held().await?;
        /* **A fact that outlives an episode keeps its derivation.** A pass
        that read the forgotten episode goes with it in Trace, and so does the
        memory node of every fact that pass wrote. A fact that still rests on
        another episode is recorded again, from the episodes it rests on, so
        `why` still reaches them. */
        let reanchored = self.reanchor(&after, &removed_nodes).await?;

        let mut restored: Vec<FactView> = after
            .facts
            .values()
            .filter(|fact| {
                fact.is_current()
                    && before
                        .facts
                        .get(&fact.id)
                        .is_some_and(|old| !old.is_current())
            })
            .filter_map(|fact| after.fact(fact.id))
            .collect();
        restored.sort_by_key(|fact| fact.id);
        let mut answers: Vec<Id> = removed_nodes.intersection(&answers).copied().collect();
        answers.sort();
        removed_facts.sort();
        Ok(Forgot {
            answers,
            episodes: doomed
                .iter()
                .filter_map(|episode| before.episode(episode.id))
                .collect(),
            facts: removed_facts
                .iter()
                .filter_map(|fact| before.fact(*fact))
                .collect(),
            nodes: removed_nodes.len(),
            reanchored,
            restored,
        })
    }

    /// Records each current fact whose memory node was removed again, from
    /// the episodes it still rests on, and returns the facts.
    async fn reanchor(&self, after: &Held, removed: &HashSet<Id>) -> Outcome<Vec<Id>> {
        let trace = Id::new();
        let mut reanchored = Vec::new();
        for fact in after.facts.values() {
            if !fact.is_current() || !fact.node.is_some_and(|node| removed.contains(&node)) {
                continue;
            }
            let Some(first) = fact.derived_from.first() else {
                continue;
            };
            let parents: Vec<Id> = fact
                .derived_from
                .iter()
                .filter_map(|episode| after.episodes.get(episode)?.node)
                .collect();
            let node = Node::new(
                Detail::Memory {
                    fact_ids: vec![fact.id],
                },
                parents,
            );
            self.append(trace, std::slice::from_ref(&node)).await?;
            self.engram
                .add_source(fact.id, *first, Some(node.id))
                .await
                .map_err(|error| storage("cannot record a fact again", &error))?;
            reanchored.push(fact.id);
        }
        reanchored.sort();
        Ok(reanchored)
    }

    /// Re-runs an answer's context on `provider`, holding the context fixed,
    /// and compares the two answers word by word.
    ///
    /// # Errors
    ///
    /// [`Failure`] if a store or the provider fails, or nothing matches
    /// `target`.
    pub async fn replay(&self, target: Option<&str>, provider: &dyn Provider) -> Outcome<Replayed> {
        let graph = self.graph().await?;
        let id = Self::find_answer(&graph, target)?;
        let node = graph.get(id).expect("an answer the graph holds");
        /* **The answer and its context, and nothing before them.** A replay
        recomputes every output in its plan, and an answer's derivation holds
        the extractions that wrote its facts. Those are held fixed with the
        context, as Trace holds it, and only the answer runs again. */
        let mut asked = Graph::new();
        for parent in &node.derived_from {
            if let Some(context) = graph
                .get(*parent)
                .filter(|parent| parent.kind() == NodeKind::Context)
            {
                asked.insert(context.clone());
            }
        }
        asked.insert(node.clone());
        let replay = asked
            .replay(id, provider, &Exact)
            .await
            .map_err(|error| match error {
                fusion_cortex_trace::replay::Error::Provider(message) => crate::models::failed(
                    provider.id(),
                    &fusion_cortex_core::Error::Provider(message),
                ),
                other => Failure::input("cannot replay the answer", other.to_string()),
            })?;
        let divergence = replay
            .divergences
            .first()
            .ok_or_else(|| Failure::input("cannot replay the answer", "the replay ran nothing"))?;
        let after = replay
            .graph
            .get(replay.target)
            .map(answer)
            .expect("the replayed answer");
        let before = answer(node);
        Ok(Replayed {
            changes: diff::words(&before.content, &after.content),
            identical: divergence.verdict == Verdict::Identical,
            scorer: replay.scorer,
            after,
            before,
        })
    }
}

/// The question's vector, where the facts in `read` have vectors from
/// `embedder` to compare it with.
async fn question_vector(
    facts: &[Fact],
    read: &[Scope],
    question: &str,
    embedder: Option<&dyn Embedder>,
    warnings: &mut Vec<String>,
) -> Option<Vector> {
    /* **Meaning counts where the facts have vectors from this embedder.**
    A fact embedded by another model scores zero on the vector's share, so
    with none embedded by this one, overlap ranks alone. */
    let comparable = embedder.filter(|embedder| {
        facts.iter().any(|fact| {
            read.contains(&fact.scope)
                && fact
                    .embedding
                    .as_ref()
                    .is_some_and(|embedding| embedding.model == embedder.model())
        })
    });
    match comparable {
        Some(embedder) => match Vector::of(embedder, question).await {
            Ok(vector) => Some(vector),
            Err(error) => {
                warnings.push(format!(
                    "{} did not embed the question, so facts rank by overlap alone: {error}",
                    embedder.model()
                ));
                None
            }
        },
        None => None,
    }
}

/// The context's parts: the instruction, each fact with why it was placed,
/// and the question last.
fn placed(question: &str, chosen: &[(&Fact, f32)], scorer: &dyn Scorer) -> (Vec<Item>, Vec<Given>) {
    let mut items = vec![Item::new(
        Part::Rules,
        Message::text(Role::System, INSTRUCTION),
        "the instruction",
    )];
    let mut given = Vec::new();
    for (fact, rank) in chosen {
        let reason = scorer.explain(question, fact);
        items.push(
            Item::new(
                Part::Facts,
                Message::text(Role::User, format!("Fact: {}", fact.content)),
                reason.clone(),
            )
            .from(fact.node.into_iter().collect()),
        );
        given.push(Given {
            content: fact.content.clone(),
            id: fact.id,
            node: fact.node,
            reason,
            rank: *rank,
        });
    }
    items.push(Item::new(
        Part::Task,
        Message::text(Role::User, format!("Question: {question}")),
        "the question",
    ));
    (items, given)
}

/// The question an answer's context was asked, where it records one.
fn question(graph: &Graph, answer: &Node) -> Option<String> {
    let context = context(graph, answer)?;
    context
        .derived_from
        .iter()
        .find_map(|parent| match &graph.get(*parent)?.detail {
            Detail::Source { content, uri: None } => Some(content.clone()),
            _ => None,
        })
}

fn context<'a>(graph: &'a Graph, answer: &Node) -> Option<&'a Node> {
    answer
        .derived_from
        .iter()
        .filter_map(|parent| graph.get(*parent))
        .find(|node| node.kind() == NodeKind::Context)
}

fn answer(node: &Node) -> Answer {
    let (content, model, prompt_version, provider) = match &node.detail {
        Detail::Output {
            content,
            model,
            prompt_version,
            call,
            ..
        } => (
            content.clone(),
            model.clone(),
            prompt_version.clone(),
            call.as_ref().map(|call| call.provider.clone()),
        ),
        _ => Default::default(),
    };
    Answer {
        content,
        created_at: node.created_at,
        id: node.id,
        model,
        prompt_version,
        provider,
    }
}

/// An answer's context, the facts it placed and why, and the episodes under
/// each fact.
fn derivation(graph: &Graph, held: &Held, answer: &Node) -> Derived {
    let Some(context) = context(graph, answer) else {
        return Derived {
            context: None,
            facts: vec![],
            question: None,
            strategy: None,
        };
    };
    let Detail::Context {
        placed, strategy, ..
    } = &context.detail
    else {
        unreachable!("a context node holds a context");
    };
    let episodes: HashMap<Id, Id> = held
        .episodes
        .values()
        .filter_map(|episode| Some((episode.node?, episode.id)))
        .collect();
    let facts = placed
        .iter()
        .filter(|placed| placed.part == Part::Facts)
        .map(|placed| {
            let node = placed.sources.first().copied();
            let fact = node
                .and_then(|node| match &graph.get(node)?.detail {
                    Detail::Memory { fact_ids } => fact_ids.first().copied(),
                    _ => None,
                })
                .and_then(|fact| held.fact(fact));
            let rests_on: Vec<EpisodeView> = node
                .map(|node| sources_under(graph, node))
                .unwrap_or_default()
                .into_iter()
                .filter_map(|source| held.episode(*episodes.get(&source)?))
                .collect();
            Placement {
                episodes: rests_on,
                fact,
                node,
                reason: placed.reason.clone(),
            }
        })
        .collect();
    Derived {
        context: Some(context.id),
        facts,
        question: question(graph, answer),
        strategy: Some(strategy.clone()),
    }
}

/// The source nodes a memory node rests on, through earlier memory nodes and
/// never through an extraction, which read every episode of its batch.
fn sources_under(graph: &Graph, memory: Id) -> Vec<Id> {
    let mut seen = HashSet::new();
    let mut queue = VecDeque::from([memory]);
    let mut found = Vec::new();
    while let Some(current) = queue.pop_front() {
        if !seen.insert(current) {
            continue;
        }
        let Some(node) = graph.get(current) else {
            continue;
        };
        match node.kind() {
            NodeKind::Source => found.push(current),
            NodeKind::Memory => queue.extend(node.derived_from.iter().copied()),
            _ => {}
        }
    }
    found
}

fn view(node: &Node) -> NodeView {
    let text = match &node.detail {
        Detail::Source { content, .. } | Detail::Output { content, .. } => content.clone(),
        Detail::Memory { fact_ids } => format!("{} facts", fact_ids.len()),
        Detail::Context { strategy, .. } => strategy.clone(),
        Detail::Extraction { schema, .. } => schema.clone(),
        Detail::Validation(validation) => format!(
            "{} attempt {}: {}",
            validation.schema,
            validation.attempt,
            if validation.passed() {
                "passed"
            } else {
                "failed"
            }
        ),
        other => format!("{:?}", other.kind()),
    };
    NodeView {
        derived_from: node.derived_from.clone(),
        id: node.id,
        kind: node.kind(),
        text,
    }
}
