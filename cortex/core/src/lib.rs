//! Cortex primitives.
//!
//! The substrate every Cortex module builds on: identifiers, the provider
//! abstraction, and the errors they share. Deliberately small. Anything that
//! belongs to memory lives in `fusion-cortex-engram`; anything that belongs to
//! provenance lives in `fusion-cortex-trace`.

use serde::{Deserialize, Serialize};

pub mod provider;

/// A stable identifier for anything Cortex stores.
///
/// `UUIDv7` rather than v4: the timestamp prefix makes identifiers sort in
/// creation order, which turns index locality and time-range scans over
/// episodic memory into a property of the key rather than a separate column.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct Id(pub uuid::Uuid);

impl Id {
    /// Generates a new time-ordered identifier.
    #[must_use]
    pub fn new() -> Self {
        Self(uuid::Uuid::now_v7())
    }
}

impl Default for Id {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for Id {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Errors shared across Cortex modules.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The backing store rejected or could not complete the operation.
    #[error("storage: {0}")]
    Storage(String),

    /// A model provider failed.
    #[error("provider: {0}")]
    Provider(String),

    /// Output did not conform to the requested schema.
    #[error("invalid output: {0}")]
    InvalidOutput(String),

    /// The requested record does not exist.
    #[error("not found: {0}")]
    NotFound(Id),
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_sort_in_creation_order() {
        let first = Id::new();
        let second = Id::new();
        assert!(first <= second, "uuidv7 must be time-ordered");
    }

    #[test]
    fn ids_are_unique() {
        let ids: std::collections::HashSet<_> = (0..1_000).map(|_| Id::new()).collect();
        assert_eq!(ids.len(), 1_000);
    }
}
