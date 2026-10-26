//! Embedding the facts a store holds.
//!
//! Consolidation embeds each fact it writes where an embedder is configured.
//! [`backfill`] embeds the rest: facts written before an embedder was
//! configured, facts whose embedding failed, and facts a previous model
//! embedded, so a change of model is one call.

use fusion_cortex_core::{
    embed::{Embedder, Purpose},
    Id, Result,
};

use crate::{store::Store, Fact};

/// Whether `embedder` should embed `fact`: it has no embedding, or one from
/// another model or of another length.
#[must_use]
pub fn needs(fact: &Fact, embedder: &dyn Embedder) -> bool {
    fact.embedding.as_ref().is_none_or(|embedding| {
        embedding.model != embedder.model()
            || embedder
                .dimensions()
                .is_some_and(|dimensions| embedding.values.len() != dimensions)
    })
}

/// Embeds every current fact that [`needs`] it, `batch` at a time, and
/// returns the ids of the facts it embedded, in the order the store lists
/// them. A superseded fact keeps what it has, since nothing recalls it.
///
/// ```
/// # use fusion_cortex_core::{embed::Scripted, Id};
/// # use fusion_cortex_engram::{embed::backfill, store::{InMemory, Store}, Episode, Fact};
/// # #[tokio::main]
/// # async fn main() {
/// let store = InMemory::new();
/// let episode = Episode::new("Dana owns the release notes now.", Id::new());
/// store.record(&episode).await.unwrap();
/// store.assert_fact(&Fact::new("Dana owns the release notes", vec![episode.id], 0.9), None).await.unwrap();
/// let embedder = Scripted::new("scripted/1", 2).with("Dana owns the release notes", vec![0.9, 0.1]);
///
/// let embedded = backfill(&store, &embedder, 32).await.unwrap();
///
/// assert_eq!(embedded.len(), 1);
/// let fact = &store.current_facts().await.unwrap()[0];
/// assert_eq!(fact.embedding.as_ref().unwrap().model, "scripted/1");
/// assert!(backfill(&store, &embedder, 32).await.unwrap().is_empty(), "nothing is left to embed");
/// # }
/// ```
///
/// # Errors
///
/// Whatever the store or the embedder returned. The batches before the one
/// that failed stay embedded, so calling it again carries on.
pub async fn backfill(store: &dyn Store, embedder: &dyn Embedder, batch: usize) -> Result<Vec<Id>> {
    let pending: Vec<Fact> = store
        .current_facts()
        .await?
        .into_iter()
        .filter(|fact| needs(fact, embedder))
        .collect();
    let mut done = Vec::new();
    for chunk in pending.chunks(batch.max(1)) {
        let texts: Vec<&str> = chunk.iter().map(|fact| fact.content.as_str()).collect();
        let vectors = embedder.embed(&texts, Purpose::Document).await?;
        for (fact, embedding) in chunk.iter().zip(vectors) {
            if store.set_embedding(fact.id, &embedding).await? {
                done.push(fact.id);
            }
        }
    }
    Ok(done)
}
