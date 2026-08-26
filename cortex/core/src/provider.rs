//! Model provider abstraction.
//!
//! An abstraction with one implementation is a guess, so this trait ships with
//! more than one from the start. More importantly, a **local** provider is a
//! thesis requirement rather than a feature: cognitive sovereignty delivered
//! solely through a remote API relocates the dependency instead of removing it.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::Result;

/// A single turn in a conversation.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Message {
    pub content: String,
    pub role: Role,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Assistant,
    System,
    User,
}

/// What a provider returns, plus what it cost.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Completion {
    pub content: String,
    /// Identifies which model produced this, so provenance can record it.
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// Implemented by every model backend, local or remote.
#[async_trait]
pub trait Provider: Send + Sync {
    /// Stable identifier recorded in provenance, e.g. `local/llama-3.3-70b`.
    fn id(&self) -> &str;

    /// Whether inference runs on the user's own hardware. Surfaced so a product
    /// can tell the user whether their data left the machine.
    fn is_local(&self) -> bool;

    async fn complete(&self, messages: &[Message]) -> Result<Completion>;
}

/// A deterministic provider for tests and offline development.
///
/// ```
/// use fusion_cortex_core::provider::{MockProvider, Provider};
///
/// let provider = MockProvider { reply: "hello".into() };
/// assert!(provider.is_local());
/// ```
#[derive(Clone, Debug, Default)]
pub struct MockProvider {
    pub reply: String,
}

/// Rough token estimate. Saturating rather than truncating: a count that wraps
/// is worse than one that clamps, and these are estimates either way.
fn estimate_tokens(text: &str) -> u32 {
    u32::try_from(text.len() / 4).unwrap_or(u32::MAX)
}

#[async_trait]
impl Provider for MockProvider {
    // The trait returns `&str` rather than `&'static str` so a provider can
    // report a runtime-composed id such as `local/{model}`. This impl happens
    // to return a literal, which is what trips the lint.
    #[allow(clippy::unnecessary_literal_bound)]
    fn id(&self) -> &str {
        "mock/deterministic"
    }

    fn is_local(&self) -> bool {
        true
    }

    async fn complete(&self, messages: &[Message]) -> Result<Completion> {
        Ok(Completion {
            content: self.reply.clone(),
            input_tokens: messages
                .iter()
                .map(|m| estimate_tokens(&m.content))
                .fold(0_u32, u32::saturating_add),
            model: self.id().to_owned(),
            output_tokens: estimate_tokens(&self.reply),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn mock_provider_is_deterministic() {
        let provider = MockProvider {
            reply: "hello".into(),
        };
        let messages = vec![Message {
            content: "hi".into(),
            role: Role::User,
        }];

        let first = provider.complete(&messages).await.unwrap();
        let second = provider.complete(&messages).await.unwrap();

        assert_eq!(first.content, second.content);
        assert!(provider.is_local());
    }
}
