//! Consolidation: the pass that distills episodes into facts with a model.
//!
//! [`consolidate`] reads the episodes no pass has read, a scope at a time, and
//! asks a [`Provider`] for the facts they state, through typed extraction. Each
//! fact names the episodes it rests on, and the pass gives it an edge to every
//! one of them, in Engram and in Trace, so `why()` on the fact's node reaches
//! its episodes. It takes any [`Provider`], so a local model runs it.
//!
//! **The model is shown the current facts of the same scope**, numbered, and
//! says which one a new fact says again and which one it contradicts. The
//! pass then applies three rules:
//!
//! - **A contradiction supersedes.** A fact that contradicts a known one is
//!   asserted as its successor, and the known fact is kept for `why()`.
//! - **A repeated fact gains a source.** A fact that says a known one again,
//!   by the model's word or because its statement matches once case, spacing,
//!   and a final period are set aside, adds its episodes to the known fact's
//!   sources, and no second fact is made. Two facts in one reply that match
//!   are one fact.
//! - **A fact without an episode is dropped.** A fact naming no episode of the
//!   batch rests on nothing the pass can point to, so it is reported in
//!   [`Consolidation::skipped`] and never stored.
//!
//! Every episode the pass read is marked consolidated, including one that held
//! no fact. A batch whose extraction failed is left unmarked for the next pass,
//! and its trace nodes are returned with the rest.
//!
//! **Each scope is consolidated apart.** Episodes of one scope are batched
//! together and matched only against facts of that scope, so a fact never
//! rests on episodes some of its readers may not read.
//!
//! Like extraction, the pass writes no trace: it returns the nodes, parents
//! first, for the caller to append.

use std::{collections::HashMap, fmt::Write as _};

use fusion_cortex_core::{provider::Provider, Error, Id, Result};
use fusion_cortex_extract::{extract, JsonSchema, Prompt, Schema};
use fusion_cortex_trace::{Detail, Node};
use serde::Deserialize;

use crate::{store::Store, Episode, Fact, Scope};

/// The name and version every output of the pass records.
pub const PROMPT_VERSION: &str = "consolidate/v1";

/// The instruction the pass gives the model.
const INSTRUCTION: &str = "You keep a memory of durable facts. Read the numbered \
episodes and list each fact they state that is worth remembering later, such as a \
preference, a decision, how something works, or who owns what. Write each fact as one \
sentence that reads on its own, say how sure the episodes are of it from 0 to 1, and \
give the numbers of the episodes it rests on. The known facts are numbered too. Where a \
fact says what a known fact says, set `restates` to that fact's number. Where a fact \
contradicts a known fact, set `contradicts` to that fact's number. Leave out greetings \
and anything else that is not a fact. Reply with an empty list where the episodes state \
no fact.";

/// What the model replies with: the facts a batch of episodes states.
#[derive(Clone, Debug, Deserialize, JsonSchema, PartialEq)]
pub struct Claims {
    pub facts: Vec<Claim>,
}

/// One fact, as the model states it.
#[derive(Clone, Debug, Deserialize, JsonSchema, PartialEq)]
pub struct Claim {
    /// The fact, as one sentence that reads on its own.
    pub statement: String,
    /// How sure the episodes are of it, from 0 to 1.
    #[schemars(range(min = 0.0, max = 1.0))]
    pub confidence: f64,
    /// The numbers of the episodes it rests on.
    #[schemars(length(min = 1))]
    pub episodes: Vec<u32>,
    /// The number of the known fact it says again, where it says one again.
    #[serde(default)]
    pub restates: Option<u32>,
    /// The number of the known fact it contradicts, where it contradicts one.
    #[serde(default)]
    pub contradicts: Option<u32>,
}

/// How much one call asks of the model.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Options {
    /// The most episodes one extraction reads.
    pub batch: usize,
    /// The most known facts one extraction is shown, most confident first.
    pub known: usize,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            batch: 20,
            known: 50,
        }
    }
}

/// A batch whose extraction failed, which the next pass reads again.
#[derive(Debug)]
pub struct Failed {
    pub episodes: Vec<Id>,
    pub error: fusion_cortex_extract::Error,
}

/// What a pass did.
#[derive(Debug, Default)]
pub struct Consolidation {
    /// The facts it asserted, in order.
    pub asserted: Vec<Id>,
    /// The episodes it marked consolidated.
    pub consolidated: Vec<Id>,
    /// The batches whose extraction failed.
    pub failed: Vec<Failed>,
    /// Every trace node it wrote, each after the nodes it derives from, for the
    /// caller to append. The nodes of a failed extraction are here too.
    pub nodes: Vec<Node>,
    /// The claims it dropped because they named no episode of their batch.
    pub skipped: Vec<Claim>,
    /// Each source it added to a fact already held, as the fact and the
    /// episode.
    pub sourced: Vec<(Id, Id)>,
    /// Each fact it superseded, as the old fact and the new one.
    pub superseded: Vec<(Id, Id)>,
}

/// The prompt the pass sends.
#[must_use]
pub fn prompt() -> Prompt {
    Prompt {
        text: INSTRUCTION.to_owned(),
        version: PROMPT_VERSION.to_owned(),
    }
}

/// Distills the episodes no pass has read into facts, and marks them read.
///
/// ```
/// # use fusion_cortex_core::{provider::{Block, Response, Scripted, Stop, Usage}, Id};
/// # use fusion_cortex_engram::{consolidate::{consolidate, Options}, store::{InMemory, Store}, Episode};
/// # use fusion_cortex_trace::{Graph, NodeKind};
/// # fn reply(text: &str) -> Response {
/// #     Response { content: vec![Block::text(text)], id: None, model: "scripted/1".into(), stop: Stop::EndTurn, usage: Usage::default() }
/// # }
/// # #[tokio::main]
/// # async fn main() {
/// let store = InMemory::new();
/// let session = Id::new();
/// store.record(&Episode::new("We run the tests with bun now.", session)).await.unwrap();
/// let provider = Scripted::new("scripted/1", vec![Ok(reply(
///     r#"{"facts": [{"statement": "The tests run with bun.", "confidence": 0.9, "episodes": [1]}]}"#,
/// ))]);
///
/// let pass = consolidate(&provider, &store, &Options::default()).await.unwrap();
///
/// let fact = &store.current_facts().await.unwrap()[0];
/// assert_eq!(fact.content, "The tests run with bun.");
/// assert!(store.unconsolidated().await.unwrap().is_empty());
/// // The fact's node reaches the episode it rests on.
/// let mut graph = Graph::new();
/// pass.nodes.into_iter().for_each(|node| { graph.insert(node); });
/// let why: Vec<NodeKind> = graph.why(fact.node.unwrap()).iter().map(|node| node.kind()).collect();
/// assert_eq!(why[..3], [NodeKind::Memory, NodeKind::Extraction, NodeKind::Source]);
/// # }
/// ```
///
/// # Errors
///
/// [`Error::Storage`] if the store fails. A failed extraction is no error: its
/// batch is in [`Consolidation::failed`].
pub async fn consolidate(
    provider: &dyn Provider,
    store: &dyn Store,
    options: &Options,
) -> Result<Consolidation> {
    let schema =
        Schema::of::<Claims>("facts").map_err(|error| Error::InvalidOutput(error.to_string()))?;
    let prompt = prompt();
    let mut pass = Consolidation::default();
    let mut scopes: Vec<(Scope, Vec<Episode>)> = Vec::new();
    for episode in store.unconsolidated().await? {
        match scopes.iter_mut().find(|(scope, _)| *scope == episode.scope) {
            Some((_, episodes)) => episodes.push(episode),
            None => scopes.push((episode.scope.clone(), vec![episode])),
        }
    }
    for (scope, episodes) in scopes {
        for batch in episodes.chunks(options.batch.max(1)) {
            let known: Vec<Fact> = store
                .current_facts()
                .await?
                .into_iter()
                .filter(|fact| fact.scope == scope)
                .take(options.known)
                .collect();
            Batch {
                episodes: batch,
                known: &known,
                scope: &scope,
                store,
            }
            .run(provider, &prompt, &schema, &mut pass)
            .await?;
        }
    }
    Ok(pass)
}

/// The episodes one extraction reads, and what it matches them against.
struct Batch<'a> {
    episodes: &'a [Episode],
    known: &'a [Fact],
    scope: &'a Scope,
    store: &'a dyn Store,
}

/// Each fact a batch touched, by its normalized statement, with its sources
/// and its latest node.
type Held = HashMap<String, (Id, Vec<Id>, Option<Id>)>;

/// A statement as two that say the same thing compare: lowercase, single
/// spaces, and no final period.
fn normalized(statement: &str) -> String {
    statement
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim_end_matches('.')
        .to_lowercase()
}

impl Batch<'_> {
    async fn run(
        &self,
        provider: &dyn Provider,
        prompt: &Prompt,
        schema: &Schema,
        pass: &mut Consolidation,
    ) -> Result<()> {
        // An episode without a node of its own is shown by a source node that
        // names it, so `why()` reaches it either way.
        let shown: Vec<Id> = self
            .episodes
            .iter()
            .map(|episode| {
                episode.node.unwrap_or_else(|| {
                    let node = Node::new(
                        Detail::Source {
                            content: episode.content.clone(),
                            uri: Some(format!("engram:episode/{}", episode.id)),
                        },
                        vec![],
                    );
                    let id = node.id;
                    pass.nodes.push(node);
                    id
                })
            })
            .collect();
        let ids: Vec<Id> = self.episodes.iter().map(|episode| episode.id).collect();
        let extraction =
            match extract::<Claims>(provider, prompt, schema, &self.input(), &shown).await {
                Ok(extraction) => extraction,
                Err(error) => {
                    pass.nodes.extend(error.nodes().iter().cloned());
                    pass.failed.push(Failed {
                        episodes: ids,
                        error,
                    });
                    return Ok(());
                }
            };
        pass.nodes.extend(extraction.nodes);

        let mut held: Held = self
            .known
            .iter()
            .map(|fact| {
                (
                    normalized(&fact.content),
                    (fact.id, fact.derived_from.clone(), fact.node),
                )
            })
            .collect();
        for claim in extraction.value.facts {
            self.apply(claim, extraction.id, &shown, &mut held, pass)
                .await?;
        }

        self.store.mark_consolidated(&ids).await?;
        pass.consolidated.extend(ids);
        Ok(())
    }

    /// Stores one claim: a source added to the fact it says again, or a new
    /// fact, superseding the one it contradicts.
    async fn apply(
        &self,
        claim: Claim,
        extraction: Id,
        shown: &[Id],
        held: &mut Held,
        pass: &mut Consolidation,
    ) -> Result<()> {
        let mut rests_on: Vec<(Id, Id)> = Vec::new();
        for number in &claim.episodes {
            let found = usize::try_from(*number)
                .ok()
                .and_then(|number| number.checked_sub(1))
                .and_then(|index| Some((self.episodes.get(index)?.id, shown[index])));
            if let Some(pair) = found.filter(|pair| !rests_on.contains(pair)) {
                rests_on.push(pair);
            }
        }
        let statement = claim.statement.trim();
        if rests_on.is_empty() || statement.is_empty() {
            pass.skipped.push(claim);
            return Ok(());
        }
        let key = normalized(statement);
        let known = |number: Option<u32>| {
            let index = usize::try_from(number?).ok()?.checked_sub(1)?;
            self.known.get(index)
        };
        let contradicted = known(claim.contradicts);
        let restated = match contradicted {
            Some(_) => None,
            None => known(claim.restates)
                .map(|fact| normalized(&fact.content))
                .or_else(|| held.contains_key(&key).then(|| key.clone())),
        };

        if let Some((fact, sources, node)) = restated.and_then(|key| held.get_mut(&key)) {
            let added: Vec<(Id, Id)> = rests_on
                .into_iter()
                .filter(|(episode, _)| !sources.contains(episode))
                .collect();
            if added.is_empty() {
                return Ok(());
            }
            let mut parents = vec![extraction];
            parents.extend(added.iter().map(|(_, shown)| *shown));
            parents.extend(*node);
            let recorded = memory_node(*fact, parents, pass);
            for (episode, _) in added {
                self.store
                    .add_source(*fact, episode, Some(recorded))
                    .await?;
                sources.push(episode);
                pass.sourced.push((*fact, episode));
            }
            *node = Some(recorded);
            return Ok(());
        }

        #[expect(
            clippy::cast_possible_truncation,
            reason = "a confidence from 0 to 1, which an f32 holds"
        )]
        let confidence = claim.confidence as f32;
        let episodes: Vec<Id> = rests_on.iter().map(|(episode, _)| *episode).collect();
        let mut fact =
            Fact::new(statement, episodes.clone(), confidence).within(self.scope.clone());
        let mut parents = vec![extraction];
        parents.extend(rests_on.iter().map(|(_, shown)| *shown));
        fact.node = Some(memory_node(fact.id, parents, pass));
        self.store
            .assert_fact(&fact, contradicted.map(|old| old.id))
            .await?;
        pass.asserted.push(fact.id);
        if let Some(old) = contradicted {
            pass.superseded.push((old.id, fact.id));
        }
        held.insert(key, (fact.id, episodes, fact.node));
        Ok(())
    }

    /// The known facts and the episodes, each numbered from one.
    fn input(&self) -> String {
        let mut input = String::from("Known facts:\n");
        if self.known.is_empty() {
            input.push_str("(none)\n");
        }
        for (number, fact) in self.known.iter().enumerate() {
            let _ = writeln!(input, "{}. {}", number + 1, fact.content);
        }
        input.push_str("\nEpisodes:\n");
        for (number, episode) in self.episodes.iter().enumerate() {
            let _ = writeln!(
                input,
                "{}. ({}) {}",
                number + 1,
                episode.occurred_at.format("%B %-d, %Y"),
                episode.content
            );
        }
        input
    }
}

/// Writes the memory node that records `fact`, derived from `parents`.
fn memory_node(fact: Id, parents: Vec<Id>, pass: &mut Consolidation) -> Id {
    let node = Node::new(
        Detail::Memory {
            fact_ids: vec![fact],
        },
        parents,
    );
    let id = node.id;
    pass.nodes.push(node);
    id
}
