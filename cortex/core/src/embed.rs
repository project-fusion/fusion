//! Embeddings: text as vectors, so memory can be scored by what it means.
//!
//! An [`Embedder`] turns text into vectors, and each client in
//! `fusion-cortex-provider` implements it for one API. A local embedder is the
//! default, as a local [`Provider`](crate::provider::Provider) is, and
//! [`Embedder::is_local`] tells a product whether the text left the machine.
//!
//! **A vector is comparable only with one from the same model.** Two models
//! place the same text in different spaces, and their cosine is a number that
//! means nothing. An [`Embedding`] carries the model that made it beside its
//! values, and [`Embedding::cosine`] compares two only when the model and the
//! length agree. A change of model is then a backfill, and never a silent
//! comparison of old vectors with new ones.
//!
//! **A query and a document may embed differently.** Some models are trained
//! with a task for each side, so [`Purpose`] says which side a text is on, and
//! a client whose API takes a task sends it.

use std::{collections::HashMap, sync::Mutex};

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::{Error, Result};

/// Which side of a search a text is on.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Purpose {
    /// Something to be found, such as a fact in memory.
    Document,
    /// What is being looked for, such as a question.
    Query,
}

/// A vector, and the model that made it.
///
/// ```
/// use fusion_cortex_core::embed::Embedding;
///
/// let fact = Embedding::new("ollama/nomic-embed-text", vec![0.6, 0.8]);
/// let question = Embedding::new("ollama/nomic-embed-text", vec![0.8, 0.6]);
/// let other = Embedding::new("gemini/gemini-embedding-001", vec![0.8, 0.6]);
///
/// assert!((question.cosine(&fact).unwrap() - 0.96).abs() < 1e-6);
/// assert_eq!(question.cosine(&other), None, "another model's space");
/// ```
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Embedding {
    /// The embedder's [`Embedder::model`], such as `ollama/nomic-embed-text`.
    pub model: String,
    pub values: Vec<f32>,
}

impl Embedding {
    #[must_use]
    pub fn new(model: impl Into<String>, values: Vec<f32>) -> Self {
        Self {
            model: model.into(),
            values,
        }
    }

    /// Whether `other` is in the same space: the same model, and as many
    /// values.
    #[must_use]
    pub fn comparable(&self, other: &Self) -> bool {
        self.model == other.model && self.values.len() == other.values.len()
    }

    /// The cosine of the angle between the two vectors, from -1 to 1, or
    /// `None` where they are not [`comparable`](Self::comparable) or either
    /// has no length.
    #[must_use]
    pub fn cosine(&self, other: &Self) -> Option<f32> {
        if !self.comparable(other) {
            return None;
        }
        cosine(&self.values, &other.values)
    }

    /// Checks that the vector can be compared with anything: it has values,
    /// every value is finite, and it is not all zeros.
    ///
    /// # Errors
    ///
    /// [`Error::InvalidOutput`] naming what is wrong.
    pub fn check(&self) -> Result<()> {
        if self.model.is_empty() {
            return Err(Error::InvalidOutput("an embedding names no model".into()));
        }
        if self.values.is_empty() {
            return Err(Error::InvalidOutput(format!(
                "an embedding from {} has no values",
                self.model
            )));
        }
        if self.values.iter().any(|value| !value.is_finite()) {
            return Err(Error::InvalidOutput(format!(
                "an embedding from {} holds a value that is not finite",
                self.model
            )));
        }
        if self.values.iter().all(|value| *value == 0.0) {
            return Err(Error::InvalidOutput(format!(
                "an embedding from {} is all zeros, which has no direction",
                self.model
            )));
        }
        Ok(())
    }
}

/// The cosine of the angle between `a` and `b`, or `None` where their lengths
/// differ or either has no length. Summed in `f64`, so the order of a ranking
/// does not turn on rounding.
#[must_use]
pub fn cosine(a: &[f32], b: &[f32]) -> Option<f32> {
    if a.len() != b.len() || a.is_empty() {
        return None;
    }
    let (mut dot, mut left, mut right) = (0.0_f64, 0.0_f64, 0.0_f64);
    for (x, y) in a.iter().zip(b) {
        let (x, y) = (f64::from(*x), f64::from(*y));
        dot += x * y;
        left += x * x;
        right += y * y;
    }
    let norms = (left * right).sqrt();
    if norms == 0.0 || !norms.is_finite() {
        return None;
    }
    #[expect(
        clippy::cast_possible_truncation,
        reason = "a cosine, from -1 to 1, which an f32 holds"
    )]
    let cosine = (dot / norms).clamp(-1.0, 1.0) as f32;
    Some(cosine)
}

/// Implemented by every embedding backend, local or remote.
#[async_trait]
pub trait Embedder: Send + Sync {
    /// The identifier recorded with every vector, such as
    /// `ollama/nomic-embed-text`. Two embedders with one identifier must
    /// place text in one space, so a client that sets the vector's length
    /// adds it, as in `gemini/gemini-embedding-001@768`.
    fn model(&self) -> &str;

    /// How many values each vector has, where that is known: set by the
    /// caller, or learned from the first response.
    fn dimensions(&self) -> Option<usize>;

    /// Whether the model runs on the user's own hardware. Surfaced so a
    /// product can tell the user whether their text left the machine.
    fn is_local(&self) -> bool;

    /// Embeds each of `texts`, in order.
    ///
    /// # Errors
    ///
    /// Whatever the API returned, and [`Error::InvalidOutput`] where it
    /// returned a vector for each text that is missing, of another length,
    /// or not [`check`](Embedding::check)ed.
    async fn embed(&self, texts: &[&str], purpose: Purpose) -> Result<Vec<Embedding>>;

    /// Embeds one text.
    ///
    /// # Errors
    ///
    /// Anything [`Embedder::embed`] returns.
    async fn embed_one(&self, text: &str, purpose: Purpose) -> Result<Embedding> {
        self.embed(&[text], purpose)
            .await?
            .pop()
            .ok_or_else(|| Error::InvalidOutput(format!("{} returned no vector", self.model())))
    }
}

/// An embedder that returns the vector scripted for each text, and records
/// each request.
///
/// For tests that need a paraphrase to land near what it paraphrases without
/// a model.
///
/// ```
/// # use fusion_cortex_core::embed::{Embedder, Purpose, Scripted};
/// # #[tokio::main]
/// # async fn main() {
/// let embedder = Scripted::new("scripted/1", 2)
///     .with("Dana owns the release notes", vec![0.9, 0.1])
///     .with("who writes up each release?", vec![0.8, 0.2]);
///
/// let fact = embedder.embed_one("Dana owns the release notes", Purpose::Document).await.unwrap();
/// let question = embedder.embed_one("who writes up each release?", Purpose::Query).await.unwrap();
///
/// assert!(question.cosine(&fact).unwrap() > 0.99);
/// assert!(embedder.embed_one("anything else", Purpose::Query).await.is_err());
/// # }
/// ```
#[derive(Debug)]
pub struct Scripted {
    dimensions: usize,
    model: String,
    requests: Mutex<Vec<(Vec<String>, Purpose)>>,
    vectors: HashMap<String, Vec<f32>>,
}

impl Scripted {
    /// An embedder for `model` whose vectors have `dimensions` values.
    #[must_use]
    pub fn new(model: impl Into<String>, dimensions: usize) -> Self {
        Self {
            dimensions,
            model: model.into(),
            requests: Mutex::new(Vec::new()),
            vectors: HashMap::new(),
        }
    }

    /// The embedder, returning `values` for `text`.
    #[must_use]
    pub fn with(mut self, text: impl Into<String>, values: Vec<f32>) -> Self {
        self.vectors.insert(text.into(), values);
        self
    }

    /// Every request, as its texts and purpose, in order.
    ///
    /// # Panics
    ///
    /// If a thread panicked while recording a request.
    #[must_use]
    pub fn requests(&self) -> Vec<(Vec<String>, Purpose)> {
        self.requests.lock().expect("the request log").clone()
    }
}

#[async_trait]
impl Embedder for Scripted {
    fn model(&self) -> &str {
        &self.model
    }

    fn dimensions(&self) -> Option<usize> {
        Some(self.dimensions)
    }

    fn is_local(&self) -> bool {
        true
    }

    async fn embed(&self, texts: &[&str], purpose: Purpose) -> Result<Vec<Embedding>> {
        self.requests.lock().expect("the request log").push((
            texts.iter().map(|text| (*text).to_owned()).collect(),
            purpose,
        ));
        texts
            .iter()
            .map(|text| {
                let values = self.vectors.get(*text).ok_or_else(|| {
                    Error::Provider(format!("{} has no vector for {text:?}", self.model))
                })?;
                if values.len() != self.dimensions {
                    return Err(Error::InvalidOutput(format!(
                        "{} scripted {} values for {text:?}, not {}",
                        self.model,
                        values.len(),
                        self.dimensions
                    )));
                }
                let embedding = Embedding::new(self.model.clone(), values.clone());
                embedding.check()?;
                Ok(embedding)
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_cosine_needs_two_vectors_of_one_length_with_a_direction() {
        assert_eq!(cosine(&[1.0, 0.0], &[0.0, 1.0]), Some(0.0));
        assert_eq!(cosine(&[1.0, 2.0], &[2.0, 4.0]), Some(1.0));
        assert_eq!(cosine(&[1.0, 0.0], &[-1.0, 0.0]), Some(-1.0));
        assert_eq!(cosine(&[1.0], &[1.0, 0.0]), None);
        assert_eq!(cosine(&[], &[]), None);
        assert_eq!(cosine(&[0.0, 0.0], &[1.0, 0.0]), None);
    }

    #[test]
    fn a_vector_that_cannot_be_compared_fails_its_check() {
        let check = |values: Vec<f32>| Embedding::new("m", values).check();

        assert!(check(vec![0.5, -0.5]).is_ok());
        assert!(check(vec![]).is_err());
        assert!(check(vec![f32::NAN, 1.0]).is_err());
        assert!(check(vec![f32::INFINITY]).is_err());
        assert!(check(vec![0.0, 0.0]).is_err());
        assert!(Embedding::new("", vec![1.0]).check().is_err());
    }

    #[test]
    fn two_models_are_never_compared_even_at_one_length() {
        let one = Embedding::new("a", vec![1.0, 0.0]);
        let other = Embedding::new("b", vec![1.0, 0.0]);
        let longer = Embedding::new("a", vec![1.0, 0.0, 0.0]);

        assert_eq!(one.cosine(&other), None);
        assert_eq!(one.cosine(&longer), None);
        assert_eq!(one.cosine(&one.clone()), Some(1.0));
    }

    #[tokio::test]
    async fn a_scripted_embedder_records_each_request_and_its_purpose() {
        let embedder = Scripted::new("scripted/1", 2)
            .with("a", vec![1.0, 0.0])
            .with("b", vec![0.0, 1.0]);

        let vectors = embedder
            .embed(&["a", "b"], Purpose::Document)
            .await
            .unwrap();

        assert_eq!(vectors[1].values, [0.0, 1.0]);
        assert_eq!(vectors[0].model, "scripted/1");
        assert_eq!(
            embedder.requests(),
            [(vec!["a".to_owned(), "b".to_owned()], Purpose::Document)]
        );
        let wrong = Scripted::new("scripted/1", 3).with("a", vec![1.0, 0.0]);
        assert!(wrong.embed(&["a"], Purpose::Query).await.is_err());
    }
}
