//! Memory.
//!
//! Storage is not memory: a table of everything that ever happened is the raw
//! material it operates on. What makes this a memory system is
//! **consolidation**: episodic records accumulate and are distilled into
//! semantic facts that supersede and decay. `unconsolidated()` identifies the
//! episodes waiting for that, and a consolidation pass consumes them.
//!
//! **Deletion cascades.** [`Memory::forget`] removes a trace's episodes and
//! every fact that rests on them alone, so deleting a session deletes what it
//! taught. A fact another episode still supports stays, without the forgotten
//! source. A fact the removed one had superseded is current again.
//!
//! **Every episode and fact carries a [`Scope`].** An episode takes its scope
//! when it is recorded, and a fact takes the narrowest scope of its sources,
//! by the rule [`Scope::narrowest`] states.
//!
//! [`Memory`] is the reference, and [`store`] holds the same behavior behind a
//! trait, in memory and in `SQLite`, held to one conformance suite.
//!
//! With the `consolidate` feature, [`consolidate`] is the pass that distills
//! episodes into facts with a model.
//!
//! v0 ships episodic and semantic. Procedural memory (distilling repeated
//! successful action sequences into reusable procedure) is deferred to v1
//! because it is a research problem.
//!
//! ```
//! use fusion_cortex_core::Id;
//! use fusion_cortex_engram::{Episode, Fact, Memory};
//!
//! let mut memory = Memory::new();
//! let trace = Id::new();
//!
//! let episode = memory.record(Episode::new("bills on a time-of-use plan", trace));
//! memory.assert_fact(Fact::new("on a time-of-use plan", vec![episode], 0.9), None);
//! ```

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Utc};
use fusion_cortex_core::Id;
use serde::{Deserialize, Serialize};

/// A raw, timestamped record of something that happened. Append-only.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Episode {
    pub content: String,
    pub id: Id,
    /// The node in the trace that showed it, such as the tool call a session
    /// made to remember it.
    #[serde(default)]
    pub node: Option<Id>,
    pub occurred_at: DateTime<Utc>,
    /// Who may read it, set when it is recorded. Personal where an earlier
    /// release recorded it without one.
    #[serde(default)]
    pub scope: Scope,
    /// The trace it came from, such as an agent session's. Forgetting the
    /// trace forgets the episode and what was derived from it.
    pub trace_id: Id,
}

impl Episode {
    #[must_use]
    pub fn new(content: impl Into<String>, trace_id: Id) -> Self {
        Self {
            content: content.into(),
            id: Id::new(),
            node: None,
            occurred_at: Utc::now(),
            scope: Scope::Personal,
            trace_id,
        }
    }

    /// The episode, readable within `scope`.
    #[must_use]
    pub fn within(mut self, scope: Scope) -> Self {
        self.scope = scope;
        self
    }

    /// The episode, naming the node in its trace that showed it.
    #[must_use]
    pub fn at(mut self, node: Id) -> Self {
        self.node = Some(node);
        self
    }
}

/// A distilled claim, derived from one or more episodes.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Fact {
    /// 0.0 to 1.0. Decays with age unless reinforced by new episodes.
    pub confidence: f32,
    pub content: String,
    /// The episodes it rests on. Forgetting one removes it from the list, and
    /// forgetting the last one forgets the fact.
    pub derived_from: Vec<Id>,
    /// A vector for relevance scoring, which nothing computes yet. The field
    /// is here so enabling vectors is a new scorer and never a migration.
    #[serde(default)]
    pub embedding: Option<Vec<f32>>,
    pub id: Id,
    /// The node in a trace that records it, such as the memory node a
    /// consolidation pass wrote. `why()` on the node reaches the episodes it
    /// rests on.
    #[serde(default)]
    pub node: Option<Id>,
    /// Episodes that said it again after it was distilled. They refresh its
    /// age and nothing else, so forgetting one leaves the fact to the
    /// episodes it came from.
    #[serde(default)]
    pub reinforced_by: Vec<Id>,
    /// Who may read it: the narrowest scope of its sources, or the one it was
    /// given where a store holds none of them.
    #[serde(default)]
    pub scope: Scope,
    /// Set when a newer fact contradicts or refines this one. Superseded facts
    /// are retained rather than deleted: provenance needs them to explain past
    /// outputs.
    pub superseded_by: Option<Id>,
    pub updated_at: DateTime<Utc>,
}

impl Fact {
    #[must_use]
    pub fn new(content: impl Into<String>, derived_from: Vec<Id>, confidence: f32) -> Self {
        // Not a number is no confidence, and a negative zero is zero, so a
        // store's order agrees with a comparison of the values.
        let confidence = if confidence.is_nan() || confidence <= 0.0 {
            0.0
        } else {
            confidence.min(1.0)
        };
        Self {
            confidence,
            content: content.into(),
            derived_from,
            embedding: None,
            id: Id::new(),
            node: None,
            reinforced_by: Vec::new(),
            scope: Scope::Personal,
            superseded_by: None,
            updated_at: Utc::now(),
        }
    }

    /// The fact, readable within `scope` where a store holds none of its
    /// sources. A store gives a fact with held sources the narrowest of
    /// theirs.
    #[must_use]
    pub fn within(mut self, scope: Scope) -> Self {
        self.scope = scope;
        self
    }

    /// Whether this fact is still the current view.
    #[must_use]
    pub fn is_current(&self) -> bool {
        self.superseded_by.is_none()
    }

    /// Confidence after exponential decay over `days` with the given half-life.
    ///
    /// Elapsed time is clamped at zero: a negative age would *raise* confidence
    /// above what was recorded, which is clock skew or an unset timestamp
    /// manufacturing belief rather than decay running backwards.
    ///
    /// ```
    /// # use fusion_cortex_engram::Fact;
    /// let fact = Fact::new("x", vec![], 1.0);
    ///
    /// assert_eq!(fact.decayed_confidence(30.0, 30.0), 0.5);  // one half-life
    /// assert!(fact.decayed_confidence(300.0, 30.0) < 0.01);  // ten half-lives
    /// ```
    #[must_use]
    pub fn decayed_confidence(&self, days: f32, half_life_days: f32) -> f32 {
        if half_life_days <= 0.0 || !days.is_finite() {
            return self.confidence;
        }
        let elapsed = days.max(0.0);
        (self.confidence * 0.5_f32.powf(elapsed / half_life_days)).clamp(0.0, self.confidence)
    }
}

/// The in-memory reference store, and the shape the `SQLite` and `Postgres`
/// backends must match behind a trait. Both are required from the start: an
/// abstraction with one implementation is a guess, and `SQLite` assumptions
/// otherwise leak into the domain model.
#[derive(Clone, Debug, Default)]
pub struct Memory {
    /// Episodes a consolidation pass has read, whether or not it found a fact
    /// in them.
    consolidated: HashSet<Id>,
    episodes: Vec<Episode>,
    facts: Vec<Fact>,
}

impl Memory {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record(&mut self, episode: Episode) -> Id {
        let id = episode.id;
        self.episodes.push(episode);
        id
    }

    /// Adds a distilled fact, superseding the lineage that `supersedes` belongs
    /// to. The fact takes the narrowest scope of the sources this memory
    /// holds, and keeps its own where it holds none.
    ///
    /// The id may point anywhere in a chain, not only at its head. Callers hold
    /// whichever id they happened to read, and pointing at an already-superseded
    /// fact would otherwise overwrite that link: the lineage forks, the earlier
    /// replacement stays current, and the store reports two current facts that
    /// were meant to be one.
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// # let episode = memory.record(Episode::new("bills", Id::new()));
    /// let old = memory.assert_fact(Fact::new("on a flat rate plan", vec![episode], 0.6), None);
    /// let new = memory.assert_fact(Fact::new("on a time-of-use plan", vec![episode], 0.9), Some(old));
    ///
    /// assert_eq!(memory.current_facts().len(), 1); // only the newer one is current
    /// # assert_eq!(memory.current_facts()[0].id, new);
    /// ```
    pub fn assert_fact(&mut self, mut fact: Fact, supersedes: Option<Id>) -> Id {
        let id = fact.id;
        if let Some(scope) = self.scope_of(&fact.derived_from) {
            fact.scope = scope;
        }
        if let Some(old) = supersedes {
            if let Some(head) = self.lineage_head(old) {
                if let Some(previous) = self.facts.iter_mut().find(|f| f.id == head) {
                    previous.superseded_by = Some(id);
                }
            }
        }
        self.facts.push(fact);
        id
    }

    /// The narrowest scope of the episodes in `sources` this memory holds.
    fn scope_of(&self, sources: &[Id]) -> Option<Scope> {
        Scope::narrowest(
            self.episodes
                .iter()
                .filter(|episode| sources.contains(&episode.id))
                .map(|episode| &episode.scope),
        )
    }

    /// Adds `episode` to the sources of the lineage `fact` belongs to, so the
    /// fact rests on it too, and makes its age count from now. The fact's
    /// scope narrows to take the episode's in, and never widens. `node`, where
    /// given, becomes the fact's node: the trace node that records the new
    /// source.
    ///
    /// Returns `false` where no fact has the id.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// let monday = memory.record(Episode::new("tests run with bun", Id::new()));
    /// let fact = memory.assert_fact(Fact::new("tests run with bun", vec![monday], 0.8), None);
    /// let tuesday = memory.record(Episode::new("bun runs the tests", Id::new()));
    ///
    /// assert!(memory.add_source(fact, tuesday, None));
    /// assert_eq!(memory.current_facts()[0].derived_from, [monday, tuesday]);
    /// ```
    pub fn add_source(&mut self, fact: Id, episode: Id, node: Option<Id>) -> bool {
        let Some(head) = self.lineage_head(fact) else {
            return false;
        };
        let scope = self
            .episodes
            .iter()
            .find(|held| held.id == episode)
            .map(|held| held.scope.clone());
        let Some(current) = self.facts.iter_mut().find(|f| f.id == head) else {
            return false;
        };
        if !current.derived_from.contains(&episode) {
            current.derived_from.push(episode);
        }
        current.reinforced_by.retain(|id| *id != episode);
        if let Some(narrower) = scope.and_then(|scope| Scope::narrowest([&current.scope, &scope])) {
            current.scope = narrower;
        }
        if node.is_some() {
            current.node = node;
        }
        current.updated_at = Utc::now();
        true
    }

    /// Adds `episode` to what reinforced the lineage `fact` belongs to, which
    /// makes its age count from now: a fact seen again is not decaying. A
    /// reinforcement is no source, so forgetting it leaves the fact to its
    /// sources; [`Memory::add_source`] makes the fact rest on the episode.
    ///
    /// Returns `false` where no fact has the id.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// let first = memory.record(Episode::new("the clock helper fixes the flaky test", Id::new()));
    /// let fact = memory.assert_fact(Fact::new("the clock helper fixes the flaky test", vec![first], 0.8), None);
    /// let again = memory.record(Episode::new("the clock helper fixed it again", Id::new()));
    ///
    /// assert!(memory.reinforce(fact, again));
    /// assert!(memory.unconsolidated().is_empty());
    /// ```
    pub fn reinforce(&mut self, fact: Id, episode: Id) -> bool {
        let Some(head) = self.lineage_head(fact) else {
            return false;
        };
        let Some(current) = self.facts.iter_mut().find(|f| f.id == head) else {
            return false;
        };
        if !current.derived_from.contains(&episode) && !current.reinforced_by.contains(&episode) {
            current.reinforced_by.push(episode);
        }
        current.updated_at = Utc::now();
        true
    }

    /// Marks the lineage `old` belongs to as superseded by the fact `new`,
    /// which is already held, such as when a correction says what another
    /// current fact says. Returns `false` where either id is unknown, or
    /// where both are in one lineage.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// # let seen = memory.record(Episode::new("x", Id::new()));
    /// let wrong = memory.assert_fact(Fact::new("tests run with jest", vec![seen], 0.6), None);
    /// let right = memory.assert_fact(Fact::new("tests run with bun", vec![seen], 0.8), None);
    ///
    /// assert!(memory.supersede(wrong, right));
    /// assert_eq!(memory.current_facts().len(), 1);
    /// ```
    pub fn supersede(&mut self, old: Id, new: Id) -> bool {
        let (Some(head), Some(target)) = (self.lineage_head(old), self.lineage_head(new)) else {
            return false;
        };
        if head == target {
            return false;
        }
        match self.facts.iter_mut().find(|f| f.id == head) {
            Some(previous) => {
                previous.superseded_by = Some(target);
                true
            }
            None => false,
        }
    }

    /// Marks `episodes` as read by a consolidation pass, so
    /// [`Memory::unconsolidated`] leaves them out whether or not the pass
    /// found a fact in them. Ids this memory does not hold are ignored.
    pub fn mark_consolidated(&mut self, episodes: &[Id]) {
        for id in episodes {
            if self.episodes.iter().any(|episode| episode.id == *id) {
                self.consolidated.insert(*id);
            }
        }
    }

    /// Forgets every episode from `trace`, and every fact that rests on them
    /// alone, and returns the ids removed, episodes first.
    ///
    /// A fact another episode still supports stays, without the forgotten
    /// sources. A fact the removed one had superseded is current again: what
    /// replaced it came from the forgotten trace, and what it says came from
    /// elsewhere. A fact the trace only reinforced stays, without that
    /// reinforcement.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// let (monday, tuesday) = (Id::new(), Id::new());
    /// let seen = memory.record(Episode::new("tests run with bun", monday));
    /// let old = memory.assert_fact(Fact::new("tests run with bun", vec![seen], 0.8), None);
    /// let wrong = memory.record(Episode::new("tests run with jest", tuesday));
    /// memory.assert_fact(Fact::new("tests run with jest", vec![wrong], 0.9), Some(old));
    ///
    /// memory.forget(tuesday);
    ///
    /// assert_eq!(memory.current_facts()[0].content, "tests run with bun");
    /// ```
    pub fn forget(&mut self, trace: Id) -> Vec<Id> {
        let episodes: HashSet<Id> = self
            .episodes
            .iter()
            .filter(|episode| episode.trace_id == trace)
            .map(|episode| episode.id)
            .collect();
        self.forget_episodes(&episodes)
    }

    /// Forgets one episode, and every fact that rests on it alone, as
    /// [`Memory::forget`] does for a trace, and returns the ids removed, the
    /// episode first. An episode this memory does not hold removes nothing.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// let monday = memory.record(Episode::new("tests run with bun", Id::new()));
    /// let tuesday = memory.record(Episode::new("bun runs the tests", Id::new()));
    /// let fact = memory.assert_fact(Fact::new("tests run with bun", vec![monday, tuesday], 0.8), None);
    ///
    /// assert_eq!(memory.forget_episode(monday), [monday]);  // tuesday still supports it
    /// assert_eq!(memory.forget_episode(tuesday), [tuesday, fact]);
    /// ```
    pub fn forget_episode(&mut self, episode: Id) -> Vec<Id> {
        if !self.episodes.iter().any(|held| held.id == episode) {
            return Vec::new();
        }
        self.forget_episodes(&HashSet::from([episode]))
    }

    fn forget_episodes(&mut self, episodes: &HashSet<Id>) -> Vec<Id> {
        let doomed: HashMap<Id, Option<Id>> = self
            .facts
            .iter()
            .filter(|fact| {
                !fact.derived_from.is_empty()
                    && fact.derived_from.iter().all(|id| episodes.contains(id))
            })
            .map(|fact| (fact.id, fact.superseded_by))
            .collect();
        for fact in &mut self.facts {
            fact.superseded_by = past(fact.superseded_by, &doomed);
            fact.derived_from.retain(|id| !episodes.contains(id));
            fact.reinforced_by.retain(|id| !episodes.contains(id));
        }
        let mut removed: Vec<Id> = self
            .episodes
            .iter()
            .filter(|episode| episodes.contains(&episode.id))
            .map(|episode| episode.id)
            .collect();
        removed.extend(
            self.facts
                .iter()
                .filter(|fact| doomed.contains_key(&fact.id))
                .map(|fact| fact.id),
        );
        self.episodes
            .retain(|episode| !episodes.contains(&episode.id));
        self.consolidated.retain(|id| !episodes.contains(id));
        self.facts.retain(|fact| !doomed.contains_key(&fact.id));
        removed
    }

    /// Deletes one fact and returns whether this memory held it. A fact it
    /// superseded is current again, and the episodes it rested on stay, marked
    /// as consolidated, so the next pass does not distill it again.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Fact, Memory};
    /// # let mut memory = Memory::new();
    /// let seen = memory.record(Episode::new("tests run with jest", Id::new()));
    /// let wrong = memory.assert_fact(Fact::new("tests run with jest", vec![seen], 0.8), None);
    ///
    /// assert!(memory.delete_fact(wrong));
    /// assert!(memory.current_facts().is_empty());
    /// assert!(memory.unconsolidated().is_empty());
    /// ```
    pub fn delete_fact(&mut self, fact: Id) -> bool {
        let Some(held) = self.facts.iter().find(|held| held.id == fact) else {
            return false;
        };
        let sources = held.derived_from.clone();
        let doomed = HashMap::from([(fact, held.superseded_by)]);
        for other in &mut self.facts {
            other.superseded_by = past(other.superseded_by, &doomed);
        }
        self.facts.retain(|held| held.id != fact);
        self.mark_consolidated(&sources);
        true
    }

    /// Every fact, superseded ones included, in the order they were asserted.
    #[must_use]
    pub fn facts(&self) -> &[Fact] {
        &self.facts
    }

    /// Walks a supersession chain to the fact that is still current.
    ///
    /// Returns `None` if the id is unknown. Terminates on a cycle, which a
    /// corrupted store could contain.
    fn lineage_head(&self, from: Id) -> Option<Id> {
        let mut seen = HashSet::new();
        let mut current = self.facts.iter().find(|f| f.id == from)?;

        while let Some(next) = current.superseded_by {
            if !seen.insert(current.id) {
                break;
            }
            match self.facts.iter().find(|f| f.id == next) {
                Some(fact) => current = fact,
                None => break,
            }
        }

        Some(current.id)
    }

    /// Current facts only, most confident first.
    #[must_use]
    pub fn current_facts(&self) -> Vec<&Fact> {
        let mut out: Vec<&Fact> = self.facts.iter().filter(|f| f.is_current()).collect();
        out.sort_by(|a, b| b.confidence.total_cmp(&a.confidence));
        out
    }

    #[must_use]
    pub fn episodes(&self) -> &[Episode] {
        &self.episodes
    }

    /// Episodes no consolidation pass has read and no fact rests on or was
    /// reinforced by. The input to consolidation.
    #[must_use]
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{Episode, Memory};
    /// # let mut memory = Memory::new();
    /// # memory.record(Episode::new("bills on a time-of-use plan", Id::new()));
    /// let pending = memory.unconsolidated();
    /// # assert_eq!(pending.len(), 1);
    /// ```
    pub fn unconsolidated(&self) -> Vec<&Episode> {
        let consumed: HashSet<Id> = self
            .facts
            .iter()
            .flat_map(|f| f.derived_from.iter().chain(&f.reinforced_by).copied())
            .collect();
        self.episodes
            .iter()
            .filter(|e| !consumed.contains(&e.id) && !self.consolidated.contains(&e.id))
            .collect()
    }
}

/// The fact a supersession link leads to once the facts in `doomed` are gone:
/// the first one along the chain that stays, or none. Stops on a cycle.
pub(crate) fn past(mut next: Option<Id>, doomed: &HashMap<Id, Option<Id>>) -> Option<Id> {
    let mut seen = HashSet::new();
    while let Some(id) = next {
        match doomed.get(&id) {
            Some(after) if seen.insert(id) => next = *after,
            Some(_) => return None,
            None => return Some(id),
        }
    }
    None
}

#[cfg(feature = "consolidate")]
pub mod consolidate;
mod scope;
pub mod store;

pub use scope::Scope;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn superseded_facts_are_retained_but_not_current() {
        let mut memory = Memory::new();
        let trace = Id::new();
        let episode = memory.record(Episode::new("bills on a time-of-use plan", trace));

        let old = memory.assert_fact(Fact::new("on a flat rate plan", vec![episode], 0.6), None);
        let new = memory.assert_fact(
            Fact::new("on a time-of-use plan", vec![episode], 0.9),
            Some(old),
        );

        let current = memory.current_facts();
        assert_eq!(current.len(), 1);
        assert_eq!(current[0].id, new);
        // The old fact survives so provenance can still explain past outputs.
        assert_eq!(memory.facts.len(), 2);
    }

    #[test]
    fn superseding_mid_chain_does_not_fork_the_lineage() {
        let mut memory = Memory::new();
        let trace = Id::new();
        let episode = memory.record(Episode::new("x", trace));

        let first = memory.assert_fact(Fact::new("a", vec![episode], 0.5), None);
        memory.assert_fact(Fact::new("b", vec![episode], 0.6), Some(first));
        // A caller holding the original id supersedes again.
        let third = memory.assert_fact(Fact::new("c", vec![episode], 0.7), Some(first));

        let current = memory.current_facts();
        assert_eq!(current.len(), 1, "a lineage has exactly one current fact");
        assert_eq!(current[0].id, third);
    }

    #[test]
    fn decay_never_exceeds_the_recorded_confidence() {
        let fact = Fact::new("x", vec![], 0.8);
        // Clock skew or an unset timestamp must not manufacture confidence.
        assert!(fact.decayed_confidence(-30.0, 30.0) <= 0.8);
        assert!(fact.decayed_confidence(f32::NAN, 30.0) <= 0.8);
        assert!(fact.decayed_confidence(f32::INFINITY, 30.0) <= 0.8);
    }

    #[test]
    fn confidence_decays_toward_zero() {
        let fact = Fact::new("x", vec![], 1.0);
        assert!((fact.decayed_confidence(0.0, 30.0) - 1.0).abs() < f32::EPSILON);
        assert!((fact.decayed_confidence(30.0, 30.0) - 0.5).abs() < 1e-6);
        assert!(fact.decayed_confidence(300.0, 30.0) < 0.01);
    }

    #[test]
    fn unconsolidated_excludes_distilled_episodes() {
        let mut memory = Memory::new();
        let trace = Id::new();
        let first = memory.record(Episode::new("a", trace));
        memory.record(Episode::new("b", trace));
        memory.assert_fact(Fact::new("distilled", vec![first], 0.8), None);

        let pending = memory.unconsolidated();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].content, "b");
    }

    #[test]
    fn forgetting_a_trace_that_only_reinforced_a_fact_keeps_the_fact() {
        let mut memory = Memory::new();
        let (taught, repeated) = (Id::new(), Id::new());
        let first = memory.record(Episode::new("tests run with bun", taught));
        let again = memory.record(Episode::new("tests run with bun", repeated));
        let fact = memory.assert_fact(Fact::new("tests run with bun", vec![first], 0.8), None);
        memory.reinforce(fact, again);

        let removed = memory.forget(repeated);

        assert_eq!(removed, [again]);
        assert_eq!(memory.current_facts()[0].reinforced_by, Vec::<Id>::new());
    }

    #[test]
    fn confidence_is_clamped() {
        assert!((Fact::new("x", vec![], 5.0).confidence - 1.0).abs() < f32::EPSILON);
        assert!((Fact::new("x", vec![], -3.0).confidence).abs() < f32::EPSILON);
        assert_eq!(Fact::new("x", vec![], f32::NAN).confidence.to_bits(), 0);
        assert!(
            Fact::new("x", vec![], -0.0).confidence.to_bits() == 0,
            "no negative zero"
        );
    }
}
