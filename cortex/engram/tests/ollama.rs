//! Consolidation and embeddings against real Ollama models, opt in.
//!
//! The consolidation test runs only when `CORTEX_OLLAMA_MODEL` names a model
//! the server has pulled, such as `qwen3:1.7b`, and the embedding test only
//! when `CORTEX_OLLAMA_EMBED_MODEL` names an embedding model, such as
//! `all-minilm` or `nomic-embed-text`. Each passes without a request
//! otherwise, so the suite never needs a model to be green. The embedding test
//! runs on Postgres too where `CORTEX_POSTGRES_URL` names a database.
//! `CORTEX_OLLAMA_BASE` points both at a server other than
//! `http://localhost:11434`.
//!
//! ```sh
//! CORTEX_OLLAMA_MODEL=qwen3:1.7b cargo test -p fusion-cortex-engram --test ollama
//! CORTEX_OLLAMA_EMBED_MODEL=all-minilm cargo test -p fusion-cortex-engram --test ollama
//! ```

use std::sync::Arc;

use fusion_cortex_core::{
    embed::{Embedder, Purpose},
    Id,
};
use fusion_cortex_engram::{
    consolidate::{consolidate, Options},
    embed::backfill,
    store::{InMemory, Sqlite, Store},
    Episode, Fact, Scope,
};
use fusion_cortex_provider::{
    http::Reqwest,
    ollama::{Embeddings, Ollama},
};
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

/// The embedding client for the model the environment names, or `None` to
/// skip.
fn embedder() -> Option<Embeddings> {
    let model = std::env::var("CORTEX_OLLAMA_EMBED_MODEL")
        .ok()
        .filter(|model| !model.trim().is_empty())?;
    // `nomic-embed-text` was trained with a prefix for each side.
    let prefixed = model.starts_with("nomic-embed-text");
    let mut embedder = Embeddings::new(model, Arc::new(Reqwest::new().unwrap()));
    if prefixed {
        embedder = embedder.prefixes("search_query: ", "search_document: ");
    }
    if let Ok(base) = std::env::var("CORTEX_OLLAMA_BASE") {
        embedder = embedder.base(base);
    }
    Some(embedder)
}

/// Notes, and a question about the first that shares none of its words.
const NOTES: [&str; 4] = [
    "Dana is responsible for writing the changelog.",
    "The test suite runs with bun.",
    "Production deploys happen on Tuesday mornings.",
    "The office closes early on Fridays.",
];
const QUESTION: &str = "Who writes up what changed in each release?";

/// Backfills the notes with the local model, and asks the question.
async fn ask(name: &str, store: &dyn Store, embedder: &Embeddings) {
    let episode = Episode::new("notes", Id::new());
    store.record(&episode).await.unwrap();
    for note in NOTES {
        store
            .assert_fact(&Fact::new(note, vec![episode.id], 0.8), None)
            .await
            .unwrap();
    }

    assert_eq!(
        backfill(store, embedder, 8).await.unwrap().len(),
        NOTES.len(),
        "{name}"
    );
    let question = embedder.embed_one(QUESTION, Purpose::Query).await.unwrap();
    let near = store
        .nearest(&question, &[Scope::Personal], 4)
        .await
        .unwrap();

    let ranked: Vec<(&str, f32)> = near
        .iter()
        .map(|(fact, similarity)| (fact.content.as_str(), *similarity))
        .collect();
    eprintln!("{name}: {ranked:?}");
    assert_eq!(ranked[0].0, NOTES[0], "{name}: {ranked:?}");
}

#[tokio::test]
async fn a_local_embedding_model_finds_a_fact_asked_about_in_other_words() {
    let Some(embedder) = embedder() else {
        eprintln!("skipped: CORTEX_OLLAMA_EMBED_MODEL names no model");
        return;
    };
    assert!(embedder.is_local(), "nothing leaves the machine");

    ask("in memory", &InMemory::new(), &embedder).await;
    ask("sqlite", &Sqlite::in_memory().await.unwrap(), &embedder).await;
    let embedder = Arc::new(embedder);
    fusion_cortex_core::postgres::in_scratch_schema(|location| async move {
        let store = fusion_cortex_engram::store::Postgres::connect(&location)
            .await
            .unwrap();
        let name = format!("postgres, scoring with {:?}", store.vectors());
        ask(&name, &store, &embedder).await;
    })
    .await;
}
