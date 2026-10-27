//! Vectors from end to end, on a scripted model and a scripted embedder:
//! consolidation embeds the facts it writes, a change of model is backfilled,
//! and a question in other words finds the fact it asks about, on every
//! backend. The Postgres store runs where `CORTEX_POSTGRES_URL` names a
//! database, with `pgvector` where the server has it.

use fusion_cortex_core::{
    embed::{Embedder, Purpose, Scripted as Embeddings},
    provider::{Block, Response, Scripted, Stop, Usage},
    Id,
};
use fusion_cortex_engram::{
    consolidate::{consolidate_with, Options},
    embed::{backfill, needs},
    store::{InMemory, Sqlite, Store},
    Episode, Fact, Scope,
};
use fusion_cortex_recall::{relevant, Overlap, Scorer, Selection, Vector, Weighted};

const OWNER: &str = "Dana owns the release notes.";
const DISTRACTOR: &str = "Each version changed what the docs site looks like.";
const QUESTION: &str = "who writes up what changed in each version?";

fn reply(text: &str) -> Response {
    Response {
        content: vec![Block::text(text)],
        id: None,
        model: "scripted/1".into(),
        stop: Stop::EndTurn,
        usage: Usage::default(),
    }
}

/// A model that states two facts about the episodes it is shown.
fn model() -> Scripted {
    Scripted::new(
        "scripted/1",
        vec![Ok(reply(&format!(
            r#"{{"facts": [
                {{"statement": "{OWNER}", "confidence": 0.9, "episodes": [1]}},
                {{"statement": "{DISTRACTOR}", "confidence": 0.9, "episodes": [2]}}
            ]}}"#
        )))],
    )
}

/// An embedder that places the question near the fact it asks about, which
/// shares none of its words, and far from the distractor, which shares four.
fn embedder(model: &str) -> Embeddings {
    Embeddings::new(model, 4)
        .with(OWNER, vec![0.9, 0.1, 0.0, 0.1])
        .with(DISTRACTOR, vec![0.1, 0.9, 0.3, 0.0])
        .with(QUESTION, vec![0.8, 0.3, 0.1, 0.0])
}

async fn record(store: &dyn Store) {
    let session = Id::new();
    for said in [
        "Dana writes the release notes from now on.",
        "The docs site looks different in each version.",
    ] {
        store.record(&Episode::new(said, session)).await.unwrap();
    }
}

/// The fact a context would place first for the question: the nearest the
/// store finds, ranked by words and vector together.
async fn answer(store: &dyn Store, embedder: &dyn Embedder) -> Option<String> {
    let vector = Vector::of(embedder, QUESTION).await.unwrap();
    let near: Vec<Fact> = store
        .nearest(vector.query(), &[Scope::Personal], 10)
        .await
        .unwrap()
        .into_iter()
        .map(|(fact, _)| fact)
        .collect();
    let both = Weighted::new(vec![(&Overlap, 0.3), (&vector, 0.7)]);
    let placed = relevant(
        &near,
        &[Scope::Personal],
        QUESTION,
        &both,
        Selection::top(1),
        |_| 0.0,
    );
    placed.first().map(|(fact, _)| fact.content.clone())
}

/// Consolidates two episodes with an embedder, and checks that the question
/// finds its fact where the words alone would find the other one.
async fn a_paraphrase_finds_its_fact(name: &str, store: &dyn Store) {
    record(store).await;
    let embedder = embedder("scripted/embed");

    let pass = consolidate_with(&model(), Some(&embedder), store, &Options::default())
        .await
        .unwrap();

    assert_eq!(pass.asserted.len(), 2, "{name}");
    assert!(pass.unembedded.is_empty(), "{name}: {:?}", pass.unembedded);
    let facts = store.current_facts().await.unwrap();
    assert!(
        facts
            .iter()
            .all(|fact| fact.embedding.as_ref().unwrap().model == "scripted/embed"),
        "{name}: each fact names the model that embedded it"
    );
    assert_eq!(
        embedder.requests()[0],
        (
            vec![OWNER.to_owned(), DISTRACTOR.to_owned()],
            Purpose::Document
        ),
        "{name}: one call for the batch"
    );
    assert_eq!(
        answer(store, &embedder).await.as_deref(),
        Some(OWNER),
        "{name}"
    );
    let by_words = relevant(
        &facts,
        &[Scope::Personal],
        QUESTION,
        &Overlap,
        Selection::top(1),
        |_| 0.0,
    );
    assert_eq!(
        by_words[0].0.content, DISTRACTOR,
        "{name}: words alone miss it"
    );
}

/// Embeds with one model, then asks with another: no old vector is compared,
/// and a backfill brings every fact to the new model.
async fn a_model_change_is_backfilled(name: &str, store: &dyn Store) {
    record(store).await;
    let old = embedder("scripted/old");
    consolidate_with(&model(), Some(&old), store, &Options::default())
        .await
        .unwrap();
    let new = embedder("scripted/new");

    assert_eq!(
        answer(store, &new).await,
        None,
        "{name}: no fact is in the new space"
    );
    let vector = Vector::of(&new, QUESTION).await.unwrap();
    for fact in store.current_facts().await.unwrap() {
        assert!(needs(&fact, &new), "{name}");
        assert!(vector.score(QUESTION, &fact).abs() < f32::EPSILON, "{name}");
    }

    let embedded = backfill(store, &new, 1).await.unwrap();

    assert_eq!(embedded.len(), 2, "{name}");
    assert_eq!(answer(store, &new).await.as_deref(), Some(OWNER), "{name}");
    assert_eq!(
        answer(store, &old).await,
        None,
        "{name}: the old vectors are gone"
    );
    assert!(backfill(store, &new, 1).await.unwrap().is_empty(), "{name}");
}

/// The embedder fails: the facts are kept without a vector, the pass says
/// which, and a backfill embeds them once the embedder answers.
async fn a_failed_embedding_keeps_its_facts(name: &str, store: &dyn Store) {
    record(store).await;
    let silent = Embeddings::new("scripted/embed", 4);

    let pass = consolidate_with(&model(), Some(&silent), store, &Options::default())
        .await
        .unwrap();

    assert_eq!(pass.asserted.len(), 2, "{name}");
    assert_eq!(pass.unembedded.len(), 1, "{name}");
    assert_eq!(pass.unembedded[0].facts, pass.asserted, "{name}");
    assert!(
        store
            .current_facts()
            .await
            .unwrap()
            .iter()
            .all(|fact| fact.embedding.is_none()),
        "{name}"
    );
    assert_eq!(
        backfill(store, &embedder("scripted/embed"), 8)
            .await
            .unwrap()
            .len(),
        2
    );
}

async fn every_case(name: &str, open: impl AsyncFn() -> Box<dyn Store>) {
    a_paraphrase_finds_its_fact(name, &*open().await).await;
    a_model_change_is_backfilled(name, &*open().await).await;
    a_failed_embedding_keeps_its_facts(name, &*open().await).await;
}

#[tokio::test]
async fn vectors_in_memory() {
    every_case("in memory", async || {
        Box::new(InMemory::new()) as Box<dyn Store>
    })
    .await;
}

#[tokio::test]
async fn vectors_in_sqlite() {
    every_case("sqlite", async || {
        Box::new(Sqlite::in_memory().await.unwrap()) as Box<dyn Store>
    })
    .await;
}

#[tokio::test]
async fn vectors_in_postgres() {
    use fusion_cortex_core::postgres::{in_scratch_schema, TEST_DATABASE};
    use fusion_cortex_engram::store::Postgres;

    // `pgvector` goes in the default schema before any scratch schema opens,
    // so dropping a scratch schema never takes it.
    if let Ok(url) = std::env::var(TEST_DATABASE) {
        let pool = sqlx::PgPool::connect(&url).await.unwrap();
        let _ = sqlx::raw_sql(
            "DO $$ BEGIN
                 IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
                     CREATE EXTENSION IF NOT EXISTS vector;
                 END IF;
             END $$",
        )
        .execute(&pool)
        .await;
        pool.close().await;
    }
    for case in 0..3 {
        in_scratch_schema(move |location| async move {
            let store = Postgres::connect(&location).await.unwrap();
            let name = format!("postgres, scoring with {:?}", store.vectors());
            match case {
                0 => a_paraphrase_finds_its_fact(&name, &store).await,
                1 => a_model_change_is_backfilled(&name, &store).await,
                _ => a_failed_embedding_keeps_its_facts(&name, &store).await,
            }
        })
        .await;
    }
}
