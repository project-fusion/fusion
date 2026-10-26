//! Typed extraction against a real Ollama model, opt in.
//!
//! Runs only when `CORTEX_OLLAMA_MODEL` names a model the server has pulled,
//! such as `qwen3:1.7b`, and passes without a request otherwise, so the suite
//! never needs a model to be green. `CORTEX_OLLAMA_BASE` points it at a server
//! other than `http://localhost:11434`.
//!
//! ```sh
//! CORTEX_OLLAMA_MODEL=qwen3:1.7b cargo test -p fusion-cortex-extract --test ollama
//! ```

use std::sync::Arc;

use fusion_cortex_extract::{extract, JsonSchema, Prompt, Schema};
use fusion_cortex_provider::{http::Reqwest, ollama::Ollama};
use fusion_cortex_trace::{Detail, Graph, Node, NodeKind};
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
struct Fact {
    statement: String,
    #[schemars(range(min = 0.0, max = 1.0))]
    confidence: f64,
}

#[derive(Debug, Deserialize, JsonSchema)]
struct Facts {
    facts: Vec<Fact>,
}

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
async fn a_local_model_extracts_facts_that_trace_to_the_note() {
    let Some(provider) = provider() else {
        eprintln!("skipped: CORTEX_OLLAMA_MODEL names no model");
        return;
    };
    let note = "We shipped 0.11.0 on October 8. Dana owns the release notes.";
    let mut graph = Graph::new();
    let source = graph.insert(Node::new(
        Detail::Source {
            content: note.into(),
            uri: None,
        },
        vec![],
    ));
    let prompt = Prompt {
        text: "List each fact the note states, with how sure the note is of it from 0 to 1.".into(),
        version: "facts/v1".into(),
    };
    let schema = Schema::of::<Facts>("facts").unwrap();

    let facts = extract::<Facts>(&provider, &prompt, &schema, note, &[source])
        .await
        .unwrap();
    for node in facts.nodes {
        graph.insert(node);
    }

    assert!(!facts.value.facts.is_empty(), "{:?}", facts.value);
    assert!(facts
        .value
        .facts
        .iter()
        .all(|fact| !fact.statement.is_empty() && (0.0..=1.0).contains(&fact.confidence)));
    let why = graph.why(facts.id);
    assert_eq!(why[0].kind(), NodeKind::Extraction);
    assert!(
        why.iter().any(|node| node.id == source),
        "the value traces to the note"
    );
    eprintln!("{} attempt(s): {:?}", facts.attempts, facts.value.facts);
}
