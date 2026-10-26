//! Cortex primitives.
//!
//! The substrate every Cortex module builds on: identifiers, the provider
//! abstraction, and the errors they share. Deliberately small. Anything that
//! belongs to memory lives in `fusion-cortex-engram`; anything that belongs to
//! provenance lives in `fusion-cortex-trace`.

use std::time::Duration;

use serde::{Deserialize, Serialize};

#[cfg(feature = "postgres")]
pub mod postgres;
pub mod provider;
pub mod storage;

/// A stable identifier for anything Cortex stores.
///
/// `UUIDv7` rather than v4: the timestamp prefix makes identifiers sort in
/// creation order, which turns index locality and time-range scans over
/// episodic memory into a property of the key rather than a separate column.
///
/// ```
/// use fusion_cortex_core::Id;
///
/// let first = Id::new();
/// let second = Id::new();
/// assert!(first <= second);
/// ```
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

    /// A model provider failed, or returned a response its client cannot read.
    #[error("provider: {0}")]
    Provider(String),

    /// A model provider returned an error status.
    #[error("provider returned {status}: {message}")]
    Status {
        message: String,
        /// The wait the provider set in `retry-after`, where it set one.
        retry_after: Option<Duration>,
        status: u16,
    },

    /// The connection to a model provider failed before a response arrived.
    #[error("transport: {0}")]
    Transport(String),

    /// Output did not conform to the requested schema.
    #[error("invalid output: {0}")]
    InvalidOutput(String),

    /// The requested record does not exist.
    #[error("not found: {0}")]
    NotFound(Id),
}

impl Error {
    /// Whether the same request may succeed if sent again.
    ///
    /// Rate limits, overload, server faults and dropped connections pass; a
    /// request the provider rejected as written fails again unchanged.
    #[must_use]
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::Status { status, .. } => matches!(status, 408 | 409 | 429) || *status >= 500,
            Self::Transport(_) => true,
            Self::InvalidOutput(_) | Self::NotFound(_) | Self::Provider(_) | Self::Storage(_) => {
                false
            }
        }
    }
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
    fn overload_and_rate_limits_are_retryable_and_a_bad_request_is_not() {
        let status = |status| Error::Status {
            message: String::new(),
            retry_after: None,
            status,
        };
        assert!(status(429).is_retryable());
        assert!(status(529).is_retryable());
        assert!(Error::Transport("reset".into()).is_retryable());
        assert!(!status(400).is_retryable());
        assert!(!status(401).is_retryable());
    }

    #[test]
    fn ids_are_unique() {
        let ids: std::collections::HashSet<_> = (0..1_000).map(|_| Id::new()).collect();
        assert_eq!(ids.len(), 1_000);
    }
}
