//! The `scripted` provider and embedder: answers and vectors from a file.
//!
//! **A session that runs with no model.** The tests, the demo, and the
//! walkthrough in the docs run `cortex` on a script, so they run anywhere and
//! give the same answer every time. A script is JSON:
//!
//! ```json
//! {
//!   "replies": [
//!     { "when": ["Who reviews", "Sam covers"], "reply": "Sam reviews it." },
//!     { "model": "other", "when": ["Who reviews"], "reply": "Sam does." }
//!   ],
//!   "vectors": {
//!     "model": "week",
//!     "dimensions": 2,
//!     "values": { "Sam covers Priya's reviews.": [0.8, 0.6] }
//!   }
//! }
//! ```
//!
//! **A reply is chosen by what the request says, never by its order.** Each
//! `cortex` command is a process of its own, so a script read in order would
//! start again at every command. The provider answers with the first reply
//! whose `when` texts all appear in the request, and whose `model`, where it
//! names one, is the model asked for. A `reply` that is JSON is sent as its
//! text, which is how an extraction's answer is written.
//!
//! The embedder is Core's `embed::Scripted`, holding the vectors the script
//! lists, so a text with no vector fails as it does there.

use std::{collections::BTreeMap, path::Path};

use async_trait::async_trait;
use fusion_cortex_core::{
    embed,
    provider::{Block, Events, Provider, Request, Response, Stop, Usage},
    Error, Result,
};
use fusion_rules::error::{Failure, Outcome};
use futures_util::stream;
use serde::Deserialize;

/// A script, as the file holds it.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Script {
    #[serde(default)]
    replies: Vec<Reply>,
    #[serde(default)]
    vectors: Option<Vectors>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Reply {
    #[serde(default)]
    model: Option<String>,
    #[serde(rename = "reply")]
    text: serde_json::Value,
    when: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Vectors {
    dimensions: usize,
    model: String,
    values: BTreeMap<String, Vec<f32>>,
}

impl Script {
    /// The script at `path`.
    ///
    /// # Errors
    ///
    /// [`Failure`] if the file cannot be read or is not a script.
    pub fn read(path: &Path) -> Outcome<Self> {
        let text = std::fs::read_to_string(path).map_err(|error| {
            Failure::input(
                format!("cannot read {}", path.display()),
                error.to_string().to_lowercase(),
            )
        })?;
        serde_json::from_str(&text).map_err(|error| {
            Failure::input(
                format!("{} is not a script", path.display()),
                error.to_string(),
            )
        })
    }

    /// The provider that answers from the script as `model`.
    pub fn provider(&self, model: &str) -> Scripted {
        Scripted {
            id: format!("scripted/{model}"),
            model: model.to_owned(),
            replies: self.replies.clone(),
        }
    }

    /// The embedder that returns the script's vectors.
    ///
    /// # Errors
    ///
    /// [`Failure`] if the script lists no vectors.
    pub fn embedder(&self) -> Outcome<embed::Scripted> {
        let Some(vectors) = &self.vectors else {
            return Err(Failure::input(
                "the script has no vectors",
                "the scripted embedder returns the vectors a script lists under `vectors`",
            )
            .hint("cortex --embedder none ..."));
        };
        Ok(vectors.values.iter().fold(
            embed::Scripted::new(format!("scripted/{}", vectors.model), vectors.dimensions),
            |embedder, (text, values)| embedder.with(text.clone(), values.clone()),
        ))
    }
}

/// A provider that answers each request with the first reply it matches.
#[derive(Debug)]
pub struct Scripted {
    id: String,
    model: String,
    replies: Vec<Reply>,
}

#[async_trait]
impl Provider for Scripted {
    fn id(&self) -> &str {
        &self.id
    }

    fn is_local(&self) -> bool {
        true
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        let asked: String = request
            .messages
            .iter()
            .map(fusion_cortex_core::provider::Message::joined)
            .collect::<Vec<_>>()
            .join("\n");
        let reply = self
            .replies
            .iter()
            .filter(|reply| {
                reply
                    .model
                    .as_ref()
                    .is_none_or(|model| *model == self.model)
            })
            .find(|reply| reply.when.iter().all(|text| asked.contains(text.as_str())))
            .ok_or_else(|| {
                Error::Provider(format!("{} has no reply that matches the request", self.id))
            })?;
        let text = match &reply.text {
            serde_json::Value::String(text) => text.clone(),
            other => other.to_string(),
        };
        let response = Response {
            content: vec![Block::text(text)],
            id: None,
            model: self.id.clone(),
            stop: Stop::EndTurn,
            usage: Usage::default(),
        };
        Ok(Box::pin(stream::iter(
            response.events().into_iter().map(Ok),
        )))
    }
}

#[cfg(test)]
mod tests {
    use fusion_cortex_core::provider::{Message, Role};

    use super::*;

    #[tokio::test]
    async fn the_first_reply_whose_texts_all_appear_answers() {
        let script: Script = serde_json::from_value(serde_json::json!({
            "replies": [
                { "when": ["review", "Sam"], "reply": "Sam reviews it." },
                { "model": "other", "when": ["review"], "reply": "Sam does." },
                { "when": ["review"], "reply": { "facts": [] } },
            ],
        }))
        .unwrap();
        let ask = |text: &str| Request {
            messages: vec![Message::text(Role::User, text)],
            ..Request::default()
        };

        let first = script.provider("week");
        assert_eq!(
            first
                .complete(&ask("who will review? Sam covers"))
                .await
                .unwrap()
                .joined(),
            "Sam reviews it."
        );
        assert_eq!(
            first
                .complete(&ask("who will review?"))
                .await
                .unwrap()
                .joined(),
            r#"{"facts":[]}"#
        );
        assert_eq!(
            script
                .provider("other")
                .complete(&ask("who will review?"))
                .await
                .unwrap()
                .joined(),
            "Sam does."
        );
        assert!(first.complete(&ask("anything else")).await.is_err());
    }
}
