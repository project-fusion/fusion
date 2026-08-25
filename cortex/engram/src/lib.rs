//! Memory.
//!
//! Storage is not memory. A table of everything that ever happened is the raw
//! material memory operates on, not memory itself. What makes this a memory
//! system is **consolidation**: episodic records accumulate, and a background
//! pass distills them into semantic facts that supersede and decay.
//!
//! v0 ships episodic and semantic. Procedural memory (distilling repeated
//! successful action sequences into reusable procedure) is deferred to v1
//! because it is a research problem and the first two already differentiate.

use chrono::{DateTime, Utc};
use cortex_core::Id;
use serde::{Deserialize, Serialize};

/// A raw, timestamped record of something that happened. Append-only.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Episode {
    pub content: String,
    pub id: Id,
    pub occurred_at: DateTime<Utc>,
    /// Provenance node for this episode, so anything derived can be traced.
    pub trace_id: Id,
}

impl Episode {
    #[must_use]
    pub fn new(content: impl Into<String>, trace_id: Id) -> Self {
        Self {
            content: content.into(),
            id: Id::new(),
            occurred_at: Utc::now(),
            trace_id,
        }
    }
}

/// A distilled claim, derived from one or more episodes.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Fact {
    /// 0.0 to 1.0. Decays with age unless reinforced by new episodes.
    pub confidence: f32,
    pub content: String,
    /// Episodes this was distilled from.
    pub derived_from: Vec<Id>,
    pub id: Id,
    /// Set when a newer fact contradicts or refines this one. Superseded facts
    /// are retained rather than deleted: provenance needs them to explain past
    /// outputs.
    pub superseded_by: Option<Id>,
    pub updated_at: DateTime<Utc>,
}

impl Fact {
    #[must_use]
    pub fn new(content: impl Into<String>, derived_from: Vec<Id>, confidence: f32) -> Self {
        Self {
            confidence: confidence.clamp(0.0, 1.0),
            content: content.into(),
            derived_from,
            id: Id::new(),
            superseded_by: None,
            updated_at: Utc::now(),
        }
    }

    /// Whether this fact is still the current view.
    #[must_use]
    pub fn is_current(&self) -> bool {
        self.superseded_by.is_none()
    }

    /// Confidence after exponential decay over `days` with the given half-life.
    ///
    /// Forgetting is an operation, not an omission. A memory system that never
    /// lowers its confidence in stale claims is a memory system that confidently
    /// tells you things that stopped being true.
    /// Elapsed time is clamped at zero: a negative age would *raise* confidence
    /// above what was recorded, which is not decay running backwards, it is a
    /// clock skew or an unset timestamp producing a fact the system believes
    /// more than anything it was ever told.
    #[must_use]
    pub fn decayed_confidence(&self, days: f32, half_life_days: f32) -> f32 {
        if half_life_days <= 0.0 || !days.is_finite() {
            return self.confidence;
        }
        let elapsed = days.max(0.0);
        (self.confidence * 0.5_f32.powf(elapsed / half_life_days)).clamp(0.0, self.confidence)
    }
}

/// The in-memory reference store. `SQLite` and `Postgres` implementations hold the
/// same shape behind a trait and are held in lockstep by a shared conformance
/// suite, which is what keeps the storage abstraction honest.
#[derive(Clone, Debug, Default)]
pub struct Memory {
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
    /// to.
    ///
    /// The id may point anywhere in a chain, not only at its head. Callers hold
    /// whichever id they happened to read, and pointing at an already-superseded
    /// fact would otherwise overwrite that link: the lineage forks, the earlier
    /// replacement stays current, and the store reports two current facts that
    /// were meant to be one.
    pub fn assert_fact(&mut self, fact: Fact, supersedes: Option<Id>) -> Id {
        let id = fact.id;
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

    /// Walks a supersession chain to the fact that is still current.
    ///
    /// Returns `None` if the id is unknown. Terminates on a cycle, which a
    /// corrupted store could contain.
    fn lineage_head(&self, from: Id) -> Option<Id> {
        let mut seen = std::collections::HashSet::new();
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

    /// Episodes not yet distilled into any fact. The input to consolidation.
    #[must_use]
    pub fn unconsolidated(&self) -> Vec<&Episode> {
        let consumed: std::collections::HashSet<Id> = self
            .facts
            .iter()
            .flat_map(|f| f.derived_from.iter().copied())
            .collect();
        self.episodes
            .iter()
            .filter(|e| !consumed.contains(&e.id))
            .collect()
    }
}

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
    fn confidence_is_clamped() {
        assert!((Fact::new("x", vec![], 5.0).confidence - 1.0).abs() < f32::EPSILON);
        assert!((Fact::new("x", vec![], -3.0).confidence).abs() < f32::EPSILON);
    }
}
