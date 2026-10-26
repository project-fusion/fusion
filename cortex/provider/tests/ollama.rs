//! The Ollama client against a real Ollama server, opt in.
//!
//! Runs only when `CORTEX_OLLAMA_MODEL` names a model the server has pulled,
//! such as `qwen3-coder:30b`, and passes without a request otherwise, so the
//! suite never needs a model to be green. `CORTEX_OLLAMA_BASE` points it at a
//! server other than `http://localhost:11434`.
//!
//! ```sh
//! CORTEX_OLLAMA_MODEL=qwen3-coder:30b cargo test -p fusion-cortex-provider --test ollama
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
