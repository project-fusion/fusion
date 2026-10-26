//! Consolidation against a real Ollama model, opt in.
//!
//! Runs only when `CORTEX_OLLAMA_MODEL` names a model the server has pulled,
//! such as `qwen3:1.7b`, and passes without a request otherwise, so the suite
//! never needs a model to be green. `CORTEX_OLLAMA_BASE` points it at a server
//! other than `http://localhost:11434`.
//!
//! ```sh
//! CORTEX_OLLAMA_MODEL=qwen3:1.7b cargo test -p fusion-cortex-engram --test ollama
//! ```

use std::sync::Arc;

use fusion_cortex_core::Id;
use fusion_cortex_engram::{
    consolidate::{consolidate, Options},
    store::{InMemory, Store},
    Episode,
};
use fusion_cortex_provider::{http::Reqwest, ollama::Ollama};
use fusion_cortex_trace::{Detail, Graph, Node};

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
async fn a_local_model_consolidates_episodes_into_facts_that_trace_to_them() {
    let Some(provider) = provider() else {
        eprintln!("skipped: CORTEX_OLLAMA_MODEL names no model");
        return;
    };
    let store = InMemory::new();
    let session = Id::new();
    let mut shown = Vec::new();
    for said in [
        "We shipped 0.11.0 on October 8.",
        "Dana owns the release notes from now on.",
    ] {
        let node = Node::new(
            Detail::Source {
                content: said.into(),
                uri: None,
            },
            vec![],
        );
        store
            .record(&Episode::new(said, session).at(node.id))
            .await
            .unwrap();
        shown.push(node);
    }

    let pass = consolidate(&provider, &store, &Options::default())
        .await
        .unwrap();

    assert!(pass.failed.is_empty(), "{:?}", pass.failed);
    assert!(store.unconsolidated().await.unwrap().is_empty());
    let facts = store.current_facts().await.unwrap();
    assert!(!facts.is_empty(), "skipped: {:?}", pass.skipped);
    let mut graph = Graph::new();
    for node in shown.iter().cloned().chain(pass.nodes) {
        graph.insert(node);
    }
    for fact in &facts {
        assert!(!fact.derived_from.is_empty());
        let why = graph.why(fact.node.unwrap());
        assert!(
            shown
                .iter()
                .any(|node| why.iter().any(|reached| reached.id == node.id)),
            "{} traces to an episode",
            fact.content
        );
    }
    eprintln!(
        "{:?}",
        facts.iter().map(|fact| &fact.content).collect::<Vec<_>>()
    );
}
