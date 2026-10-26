//! The Ollama client against a real Ollama server, opt in.
//!
//! Runs only when `CORTEX_OLLAMA_MODEL` names a model the server has pulled,
//! such as `qwen3-coder:30b`, and passes without a request otherwise, so the
//! suite never needs a model to be green. `CORTEX_OLLAMA_EMBED_MODEL` names an
//! embedding model, such as `all-minilm` or `nomic-embed-text`, for the
//! embedding test. `CORTEX_OLLAMA_BASE` points both at a server other than
//! `http://localhost:11434`.
//!
//! ```sh
//! CORTEX_OLLAMA_MODEL=qwen3-coder:30b cargo test -p fusion-cortex-provider --test ollama
//! CORTEX_OLLAMA_EMBED_MODEL=all-minilm cargo test -p fusion-cortex-provider --test ollama
//! ```

#![cfg(all(feature = "http", feature = "ollama"))]

use std::sync::Arc;

use fusion_cortex_core::provider::{Message, Provider, Request, Role, Stop, Tool};
use fusion_cortex_provider::{http::Reqwest, ollama::Ollama};

/// The client for the model the environment names, or `None` to skip.
fn provider() -> Option<Ollama> {
    let model = std::env::var("CORTEX_OLLAMA_MODEL")
        .ok()
        .filter(|model| !model.trim().is_empty())?;
    let mut provider = Ollama::new(model, Arc::new(Reqwest::new().unwrap())).context(8_192);
    if let Ok(base) = std::env::var("CORTEX_OLLAMA_BASE") {
        provider = provider.base(base);
    }
    Some(provider)
}

#[tokio::test]
async fn a_local_model_answers_a_short_request() {
    let Some(provider) = provider() else {
        eprintln!("skipped: CORTEX_OLLAMA_MODEL names no model");
        return;
    };
    let request = Request {
        max_tokens: Some(64),
        messages: vec![Message::text(Role::User, "Reply with the one word: ready")],
        ..Request::default()
    };

    let response = provider.complete(&request).await.unwrap();

    assert!(provider.is_local(), "a server on this machine is local");
    assert!(
        response.joined().to_lowercase().contains("ready"),
        "{}",
        response.joined()
    );
    assert!(response.usage.input > 0 && response.usage.output > 0);
}

#[tokio::test]
async fn a_local_model_calls_a_tool() {
    let Some(provider) = provider() else {
        eprintln!("skipped: CORTEX_OLLAMA_MODEL names no model");
        return;
    };
    let request = Request {
        max_tokens: Some(256),
        messages: vec![Message::text(
            Role::User,
            "What is the weather in Paris? Use the weather tool.",
        )],
        tools: vec![Tool {
            description: "The current weather in a city.".into(),
            name: "weather".into(),
            schema: serde_json::json!({
                "properties": { "city": { "type": "string" } },
                "required": ["city"],
                "type": "object",
            }),
        }],
        ..Request::default()
    };

    let response = provider.complete(&request).await.unwrap();

    assert_eq!(response.stop, Stop::ToolUse, "{response:?}");
    let calls: Vec<_> = response.tool_uses().collect();
    assert_eq!(calls.len(), 1, "{response:?}");
    let (_, name, input) = calls[0];
    assert_eq!(name, "weather");
    assert!(
        input["city"]
            .as_str()
            .is_some_and(|city| city.contains("Paris")),
        "{input}"
    );
}

/// The embedding client for the model `CORTEX_OLLAMA_EMBED_MODEL` names, or
/// `None` to skip.
fn embedder() -> Option<fusion_cortex_provider::ollama::Embeddings> {
    let model = std::env::var("CORTEX_OLLAMA_EMBED_MODEL")
        .ok()
        .filter(|model| !model.trim().is_empty())?;
    let mut embedder =
        fusion_cortex_provider::ollama::Embeddings::new(model, Arc::new(Reqwest::new().unwrap()));
    if let Ok(base) = std::env::var("CORTEX_OLLAMA_BASE") {
        embedder = embedder.base(base);
    }
    Some(embedder)
}

#[tokio::test]
async fn a_local_embedding_model_places_a_question_nearest_its_answer() {
    use fusion_cortex_core::embed::{Embedder, Purpose};

    let Some(embedder) = embedder() else {
        eprintln!("skipped: CORTEX_OLLAMA_EMBED_MODEL names no model");
        return;
    };
    let notes = [
        "Dana is responsible for writing the changelog.",
        "The test suite runs with bun.",
        "Production deploys happen on Tuesday mornings.",
    ];

    let documents = embedder.embed(&notes, Purpose::Document).await.unwrap();
    let question = embedder
        .embed_one(
            "Who writes up what changed in each release?",
            Purpose::Query,
        )
        .await
        .unwrap();

    assert!(embedder.is_local());
    assert_eq!(embedder.dimensions(), Some(question.values.len()));
    let scores: Vec<f32> = documents
        .iter()
        .map(|document| question.cosine(document).unwrap())
        .collect();
    let best = scores
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.total_cmp(b.1))
        .unwrap()
        .0;
    assert_eq!(best, 0, "{scores:?}");
}
