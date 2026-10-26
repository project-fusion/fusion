//! OpenAI's embeddings API, `POST /v1/embeddings`, and the servers that copy
//! it: LM Studio, vLLM, llama.cpp, and others, wherever they serve an
//! embedding model.
//!
//! **A server on `localhost` is local only where the caller says so**, as for
//! [`crate::chat::Chat`]: a gateway on this machine may forward the text to a
//! hosted model.

use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::http::{self, Post, Transport};
use fusion_cortex_core::embed::{Embedder, Embedding, Purpose};
use fusion_cortex_core::{Error, Result};

/// An embedding model behind an OpenAI-compatible `/embeddings` endpoint.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::embed::Embedder;
/// # use fusion_cortex_provider::{embeddings::Embeddings, http::Reqwest};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let embedder = Embeddings::new("http://localhost:1234/v1", "text-embedding-nomic-embed-text-v1.5", transport)
///     .named("lmstudio/nomic-embed-text-v1.5")
///     .local(true);
///
/// assert_eq!(embedder.model(), "lmstudio/nomic-embed-text-v1.5");
/// assert!(embedder.is_local());
/// ```
pub struct Embeddings {
    base: String,
    dimensions: Option<usize>,
    id: String,
    key: Option<String>,
    known: OnceLock<usize>,
    local: bool,
    name: String,
    named: bool,
    prefixes: Option<(String, String)>,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Embeddings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Embeddings")
            .field("base", &self.base)
            .field("id", &self.id)
            .field("local", &self.local)
            .finish_non_exhaustive()
    }
}

impl Embeddings {
    /// `base` is the URL up to and including the version, such as
    /// `https://api.openai.com/v1`, and requests go to its `/embeddings`.
    #[must_use]
    pub fn new(
        base: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self {
            base: crate::trimmed(base),
            dimensions: None,
            id: crate::embedder_id("embeddings", &model, None),
            key: None,
            known: OnceLock::new(),
            local: false,
            name: model,
            named: false,
            prefixes: None,
            transport,
        }
    }

    /// The identifier recorded with every vector. Defaults to
    /// `embeddings/<model>`, with `@<length>` where
    /// [`output_dimensions`](Self::output_dimensions) sets one.
    #[must_use]
    pub fn named(mut self, id: impl Into<String>) -> Self {
        self.id = id.into();
        self.named = true;
        self
    }

    /// Sent as a bearer token. A local server usually takes none.
    #[must_use]
    pub fn key(mut self, key: impl Into<String>) -> Self {
        self.key = Some(key.into());
        self
    }

    /// Whether the server runs on the user's own hardware. Nothing in the URL
    /// can say.
    #[must_use]
    pub fn local(mut self, local: bool) -> Self {
        self.local = local;
        self
    }

    /// Asks for vectors of `dimensions` values, which OpenAI's
    /// `text-embedding-3` models and some servers accept.
    #[must_use]
    pub fn output_dimensions(mut self, dimensions: usize) -> Self {
        self.dimensions = Some(dimensions);
        if !self.named {
            self.id = crate::embedder_id("embeddings", &self.name, Some(dimensions));
        }
        self.known = OnceLock::from(dimensions);
        self
    }

    /// The text put before a query and before a document, for a model
    /// trained with them.
    #[must_use]
    pub fn prefixes(mut self, query: impl Into<String>, document: impl Into<String>) -> Self {
        self.prefixes = Some((query.into(), document.into()));
        self
    }

    fn body(&self, texts: &[&str], purpose: Purpose) -> Value {
        let input: Vec<String> = texts
            .iter()
            .map(|text| crate::prefixed(self.prefixes.as_ref(), text, purpose))
            .collect();
        let mut body = json!({ "encoding_format": "float", "input": input, "model": self.name });
        if let Some(dimensions) = self.dimensions {
            body["dimensions"] = json!(dimensions);
        }
        body
    }
}

#[derive(Deserialize)]
struct Reply {
    data: Vec<Datum>,
}

#[derive(Deserialize)]
struct Datum {
    embedding: Vec<f32>,
    index: usize,
}

#[async_trait]
impl Embedder for Embeddings {
    fn model(&self) -> &str {
        &self.id
    }

    fn dimensions(&self) -> Option<usize> {
        self.known.get().copied()
    }

    fn is_local(&self) -> bool {
        self.local
    }

    async fn embed(&self, texts: &[&str], purpose: Purpose) -> Result<Vec<Embedding>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }
        let post = Post {
            body: self.body(texts, purpose).to_string().into_bytes(),
            headers: self
                .key
                .iter()
                .map(|key| ("authorization".to_owned(), format!("Bearer {key}")))
                .collect(),
            url: format!("{}/embeddings", self.base),
        };
        let body = http::whole(self.transport.post(post).await?).await?;
        let mut reply: Reply = http::parse("the embeddings API", &String::from_utf8_lossy(&body))?;
        // Each vector names the input it belongs to, and nothing promises
        // they arrive in order.
        reply.data.sort_by_key(|datum| datum.index);
        if reply
            .data
            .iter()
            .enumerate()
            .any(|(place, datum)| place != datum.index)
        {
            return Err(Error::InvalidOutput(format!(
                "{} returned vectors that do not match the inputs one to one",
                self.id
            )));
        }
        let vectors = reply
            .data
            .into_iter()
            .map(|datum| datum.embedding)
            .collect();
        crate::embedded(self, &self.known, texts.len(), vectors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::canned::Canned;

    /// A reply from OpenAI with `text-embedding-3-small` at three
    /// dimensions, its vectors out of order.
    const EMBEDDED: &str = r#"{
  "object": "list",
  "data": [
    { "object": "embedding", "index": 1, "embedding": [0.31613, -0.79542, 0.51707] },
    { "object": "embedding", "index": 0, "embedding": [-0.61244, 0.27735, 0.74024] }
  ],
  "model": "text-embedding-3-small",
  "usage": { "prompt_tokens": 9, "total_tokens": 9 }
}"#;

    fn embedder(transport: &Arc<Canned>) -> Embeddings {
        Embeddings::new(
            "https://api.openai.com/v1/",
            "text-embedding-3-small",
            transport.clone(),
        )
    }

    #[tokio::test]
    async fn vectors_are_placed_by_their_index() {
        let transport = Arc::new(Canned::new(EMBEDDED, 11));
        let embedder = embedder(&transport).key("sk-test").output_dimensions(3);

        let vectors = embedder
            .embed(
                &["Dana owns the release notes", "the suite runs nightly"],
                Purpose::Document,
            )
            .await
            .unwrap();

        let post = transport.last();
        assert_eq!(post.url, "https://api.openai.com/v1/embeddings");
        assert!(post
            .headers
            .contains(&("authorization".into(), "Bearer sk-test".into())));
        assert_eq!(
            transport.body(),
            json!({
                "dimensions": 3,
                "encoding_format": "float",
                "input": ["Dana owns the release notes", "the suite runs nightly"],
                "model": "text-embedding-3-small",
            })
        );
        assert_eq!(vectors[0].values, [-0.61244, 0.27735, 0.74024]);
        assert_eq!(vectors[1].values, [0.31613, -0.79542, 0.51707]);
        assert_eq!(vectors[0].model, "embeddings/text-embedding-3-small@3");
        assert!(!embedder.is_local(), "a hosted API is the default");
    }

    #[tokio::test]
    async fn a_local_server_takes_no_key_and_its_prefixes() {
        let transport = Arc::new(Canned::new(EMBEDDED, usize::MAX));
        let embedder = Embeddings::new(
            "http://localhost:1234/v1",
            "nomic-embed-text-v1.5",
            transport.clone(),
        )
        .named("lmstudio/nomic-embed-text-v1.5")
        .prefixes("search_query: ", "search_document: ")
        .local(true);

        let vectors = embedder
            .embed(&["who owns the notes?", "and the suite?"], Purpose::Query)
            .await
            .unwrap();

        assert!(transport.last().headers.is_empty());
        assert_eq!(
            transport.body()["input"],
            json!([
                "search_query: who owns the notes?",
                "search_query: and the suite?"
            ])
        );
        assert_eq!(vectors[0].model, "lmstudio/nomic-embed-text-v1.5");
        assert_eq!(embedder.dimensions(), Some(3));
    }

    #[tokio::test]
    async fn a_reply_that_skips_an_input_is_refused() {
        let skipped =
            r#"{"data":[{"index":0,"embedding":[1.0,0.0]},{"index":2,"embedding":[0.0,1.0]}]}"#;
        let transport = Arc::new(Canned::new(skipped, usize::MAX));

        let error = embedder(&transport)
            .embed(&["a", "b"], Purpose::Document)
            .await
            .unwrap_err();

        assert!(matches!(error, Error::InvalidOutput(_)), "{error}");
    }

    #[tokio::test]
    async fn a_rejected_request_gives_the_status_and_the_message() {
        let refused = Arc::new(Canned::status(
            401,
            r#"{"error":{"message":"Incorrect API key provided: sk-test.","type":"invalid_request_error","code":"invalid_api_key"}}"#,
        ));

        let error = embedder(&refused)
            .embed(&["a"], Purpose::Document)
            .await
            .unwrap_err();

        assert!(
            matches!(&error, Error::Status { status: 401, message, .. } if message.starts_with("Incorrect API key")),
            "{error}"
        );
        assert!(!error.is_retryable());
    }
}
