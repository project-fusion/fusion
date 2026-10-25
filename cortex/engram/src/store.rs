//! Where memory is kept: one trait, an in-memory reference, and `SQLite`.
//!
//! [`InMemory`] holds a [`Memory`], which is the reference, and every backend
//! passes the same conformance suite. Postgres joins it behind the same trait.

use std::sync::Mutex;

use async_trait::async_trait;
use fusion_cortex_core::{Error, Id, Result};

use crate::{Episode, Fact, Memory};

/// Keeps episodes and the facts distilled from them.
///
/// ```
/// # use fusion_cortex_core::Id;
/// # use fusion_cortex_engram::{store::{InMemory, Store}, Episode, Fact};
/// # #[tokio::main]
/// # async fn main() {
/// let store = InMemory::new(); // or store::Sqlite::open(path).await?
/// let session = Id::new();
/// let episode = Episode::new("tests run with bun", session);
///
/// store.record(&episode).await.unwrap();
/// store.assert_fact(&Fact::new("tests run with bun", vec![episode.id], 0.8), None).await.unwrap();
/// store.forget(session).await.unwrap();
///
/// assert!(store.current_facts().await.unwrap().is_empty());
/// # }
/// ```
#[async_trait]
pub trait Store: Send + Sync {
    /// Records an episode.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if an episode with this id is already held, or the
    /// backend fails.
    async fn record(&self, episode: &Episode) -> Result<()>;

    /// Adds a fact, superseding the lineage `supersedes` belongs to, as
    /// [`Memory::assert_fact`] does.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if a fact with this id is already held, or the
    /// backend fails.
    async fn assert_fact(&self, fact: &Fact, supersedes: Option<Id>) -> Result<()>;

    /// Marks `old`'s lineage as superseded by the held fact `new`, as
    /// [`Memory::supersede`] does, and returns whether it did.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn supersede(&self, old: Id, new: Id) -> Result<bool>;

    /// Every fact, superseded ones included, in the order they were asserted.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn facts(&self) -> Result<Vec<Fact>>;

    /// Adds `episode` to what reinforced `fact`'s lineage, as
    /// [`Memory::reinforce`] does, and returns whether a fact had the id.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn reinforce(&self, fact: Id, episode: Id) -> Result<bool>;

    /// Current facts, most confident first, and in the order they were
    /// asserted where two are as confident.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn current_facts(&self) -> Result<Vec<Fact>>;

    /// Every episode, in the order it was recorded.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn episodes(&self) -> Result<Vec<Episode>>;

    /// Episodes no fact is derived from, in the order they were recorded.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn unconsolidated(&self) -> Result<Vec<Episode>>;

    /// Forgets a trace's episodes and every fact derived from one, as
    /// [`Memory::forget`] does, and returns the ids removed, episodes first.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn forget(&self, trace: Id) -> Result<Vec<Id>>;
}

/// The reference store: a [`Memory`] behind a lock.
#[derive(Debug, Default)]
pub struct InMemory {
    memory: Mutex<Memory>,
}

impl InMemory {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, Memory>> {
        self.memory
            .lock()
            .map_err(|_| Error::Storage("a thread panicked while it held the store".into()))
    }
}

#[async_trait]
impl Store for InMemory {
    async fn record(&self, episode: &Episode) -> Result<()> {
        let mut memory = self.lock()?;
        if memory.episodes().iter().any(|held| held.id == episode.id) {
            return Err(Error::Storage(format!(
                "episode {} is already held",
                episode.id
            )));
        }
        memory.record(episode.clone());
        Ok(())
    }

    async fn assert_fact(&self, fact: &Fact, supersedes: Option<Id>) -> Result<()> {
        let mut memory = self.lock()?;
        if memory.facts().iter().any(|held| held.id == fact.id) {
            return Err(Error::Storage(format!("fact {} is already held", fact.id)));
        }
        memory.assert_fact(fact.clone(), supersedes);
        Ok(())
    }

    async fn supersede(&self, old: Id, new: Id) -> Result<bool> {
        Ok(self.lock()?.supersede(old, new))
    }

    async fn facts(&self) -> Result<Vec<Fact>> {
        Ok(self.lock()?.facts().to_vec())
    }

    async fn reinforce(&self, fact: Id, episode: Id) -> Result<bool> {
        Ok(self.lock()?.reinforce(fact, episode))
    }

    async fn current_facts(&self) -> Result<Vec<Fact>> {
        Ok(self.lock()?.current_facts().into_iter().cloned().collect())
    }

    async fn episodes(&self) -> Result<Vec<Episode>> {
        Ok(self.lock()?.episodes().to_vec())
    }

    async fn unconsolidated(&self) -> Result<Vec<Episode>> {
        Ok(self.lock()?.unconsolidated().into_iter().cloned().collect())
    }

    async fn forget(&self, trace: Id) -> Result<Vec<Id>> {
        Ok(self.lock()?.forget(trace))
    }
}

#[cfg(feature = "sqlite")]
pub use sqlite::Sqlite;

#[cfg(feature = "sqlite")]
mod sqlite {
    use std::{collections::HashMap, path::Path, str::FromStr};

    use async_trait::async_trait;
    use chrono::{DateTime, SecondsFormat, Utc};
    use fusion_cortex_core::{Error, Id, Result};
    use sqlx::{
        sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteRow},
        Row, SqlitePool,
    };

    use super::Store;
    use crate::{Episode, Fact};

    /// An episode and a fact are rows, and each source of a fact is a row of
    /// its own, so a cascade finds a trace's facts in SQL; an episode that
    /// reinforced a fact is a row of another table, which a cascade only
    /// removes. An embedding is the little-endian bytes of its floats, or
    /// null.
    ///
    /// **A write that reads first takes the write lock first**, with
    /// `BEGIN IMMEDIATE`, so a second session writing the same file waits for
    /// it and does not fail on a lock it could have waited for.
    const SCHEMA: &str = "
        CREATE TABLE IF NOT EXISTS episodes (
            id TEXT PRIMARY KEY,
            trace TEXT NOT NULL,
            node TEXT,
            occurred_at TEXT NOT NULL,
            content TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS episodes_by_trace ON episodes (trace);
        CREATE TABLE IF NOT EXISTS facts (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            confidence REAL NOT NULL,
            embedding BLOB,
            superseded_by TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sources (
            fact TEXT NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
            position INTEGER NOT NULL,
            episode TEXT NOT NULL,
            PRIMARY KEY (fact, position)
        );
        CREATE INDEX IF NOT EXISTS sources_by_episode ON sources (episode);
        CREATE TABLE IF NOT EXISTS reinforcements (
            fact TEXT NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
            episode TEXT NOT NULL,
            PRIMARY KEY (fact, episode)
        );
        CREATE INDEX IF NOT EXISTS reinforcements_by_episode ON reinforcements (episode);
    ";

    /// Memory in a `SQLite` database.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_engram::{store::{Sqlite, Store}, Episode, Fact};
    /// # #[tokio::main]
    /// # async fn main() {
    /// let store = Sqlite::in_memory().await.unwrap();
    /// let session = Id::new();
    /// let episode = Episode::new("tests run with bun", session);
    ///
    /// store.record(&episode).await.unwrap();
    /// store.assert_fact(&Fact::new("tests run with bun", vec![episode.id], 0.8), None).await.unwrap();
    /// store.forget(session).await.unwrap();
    ///
    /// assert!(store.current_facts().await.unwrap().is_empty());
    /// # }
    /// ```
    #[derive(Clone, Debug)]
    pub struct Sqlite {
        pool: SqlitePool,
    }

    fn storage(error: impl std::fmt::Display) -> Error {
        Error::Storage(error.to_string())
    }

    fn parse(id: &str) -> Result<Id> {
        uuid::Uuid::parse_str(id).map(Id).map_err(storage)
    }

    fn time(text: &str) -> Result<DateTime<Utc>> {
        DateTime::parse_from_rfc3339(text)
            .map(|time| time.with_timezone(&Utc))
            .map_err(storage)
    }

    /// A time as text that sorts and round-trips to the nanosecond.
    fn written(time: DateTime<Utc>) -> String {
        time.to_rfc3339_opts(SecondsFormat::Nanos, true)
    }

    fn bytes(embedding: Option<&Vec<f32>>) -> Option<Vec<u8>> {
        embedding.map(|values| {
            values
                .iter()
                .flat_map(|value| value.to_le_bytes())
                .collect()
        })
    }

    fn floats(bytes: &[u8]) -> Vec<f32> {
        bytes
            .chunks_exact(4)
            .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect()
    }

    fn episode(row: &SqliteRow) -> Result<Episode> {
        let node: Option<String> = row.try_get("node").map_err(storage)?;
        Ok(Episode {
            content: row.try_get("content").map_err(storage)?,
            id: parse(&row.try_get::<String, _>("id").map_err(storage)?)?,
            node: node.as_deref().map(parse).transpose()?,
            occurred_at: time(&row.try_get::<String, _>("occurred_at").map_err(storage)?)?,
            trace_id: parse(&row.try_get::<String, _>("trace").map_err(storage)?)?,
        })
    }

    impl Sqlite {
        /// Opens the database at `path`, creating it and its tables if they do
        /// not exist.
        ///
        /// # Errors
        ///
        /// [`Error::Storage`] if the file cannot be opened or written.
        pub async fn open(path: impl AsRef<Path>) -> Result<Self> {
            // Two stores creating one file at once contend for the lock that
            // turns write-ahead logging on, which SQLite's busy timeout does
            // not wait for, so the one that loses waits and tries again.
            let mut attempt = 0;
            loop {
                match Self::try_open(path.as_ref()).await {
                    Err(sqlx::Error::Database(database))
                        if database.code().as_deref() == Some("5") && attempt < 40 =>
                    {
                        attempt += 1;
                        tokio::time::sleep(std::time::Duration::from_millis(25)).await;
                    }
                    Err(error) => return Err(storage(error)),
                    Ok(store) => return Ok(store),
                }
            }
        }

        async fn try_open(path: &Path) -> std::result::Result<Self, sqlx::Error> {
            let options = SqliteConnectOptions::new()
                .filename(path)
                .create_if_missing(true)
                .foreign_keys(true)
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);
            let pool = SqlitePoolOptions::new().connect_with(options).await?;
            sqlx::raw_sql(SCHEMA).execute(&pool).await?;
            Ok(Self { pool })
        }

        /// A database that lives as long as the store, for tests.
        ///
        /// # Errors
        ///
        /// [`Error::Storage`] if `SQLite` cannot start.
        pub async fn in_memory() -> Result<Self> {
            let options = SqliteConnectOptions::from_str("sqlite::memory:")
                .map_err(storage)?
                .foreign_keys(true);
            // Each connection to `:memory:` is a database of its own, so the
            // pool holds one, and keeps it.
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .idle_timeout(None)
                .max_lifetime(None)
                .connect_with(options)
                .await
                .map_err(storage)?;
            Self::ready(pool).await
        }

        async fn ready(pool: SqlitePool) -> Result<Self> {
            sqlx::raw_sql(SCHEMA)
                .execute(&pool)
                .await
                .map_err(storage)?;
            Ok(Self { pool })
        }

        /// Every fact's supersession link, by id.
        async fn links(executor: impl sqlx::SqliteExecutor<'_>) -> Result<HashMap<Id, Option<Id>>> {
            let rows = sqlx::query("SELECT id, superseded_by FROM facts")
                .fetch_all(executor)
                .await
                .map_err(storage)?;
            let mut links = HashMap::new();
            for row in rows {
                let id = parse(&row.try_get::<String, _>("id").map_err(storage)?)?;
                let next: Option<String> = row.try_get("superseded_by").map_err(storage)?;
                links.insert(id, next.as_deref().map(parse).transpose()?);
            }
            Ok(links)
        }

        /// The head of the lineage `from` belongs to, walking `links`, or none
        /// for an unknown id. Stops on a cycle.
        fn head(links: &HashMap<Id, Option<Id>>, from: Id) -> Option<Id> {
            let mut current = from;
            let mut seen = std::collections::HashSet::new();
            links.get(&current)?;
            while let Some(Some(next)) = links.get(&current) {
                if !seen.insert(current) || !links.contains_key(next) {
                    break;
                }
                current = *next;
            }
            Some(current)
        }

        /// The facts `rows` hold, each with its sources.
        async fn read(&self, rows: Vec<SqliteRow>) -> Result<Vec<Fact>> {
            let mut facts = Vec::new();
            for row in rows {
                let id: String = row.try_get("id").map_err(storage)?;
                let sources =
                    sqlx::query("SELECT episode FROM sources WHERE fact = ? ORDER BY position")
                        .bind(&id)
                        .fetch_all(&self.pool)
                        .await
                        .map_err(storage)?;
                let reinforced: Vec<String> = sqlx::query_scalar(
                    "SELECT episode FROM reinforcements WHERE fact = ? ORDER BY rowid",
                )
                .bind(&id)
                .fetch_all(&self.pool)
                .await
                .map_err(storage)?;
                let embedding: Option<Vec<u8>> = row.try_get("embedding").map_err(storage)?;
                let superseded_by: Option<String> =
                    row.try_get("superseded_by").map_err(storage)?;
                #[expect(
                    clippy::cast_possible_truncation,
                    reason = "a confidence was an f32 when it was written"
                )]
                let confidence = row.try_get::<f64, _>("confidence").map_err(storage)? as f32;
                facts.push(Fact {
                    confidence,
                    content: row.try_get("content").map_err(storage)?,
                    derived_from: sources
                        .iter()
                        .map(|source| {
                            parse(&source.try_get::<String, _>("episode").map_err(storage)?)
                        })
                        .collect::<Result<_>>()?,
                    embedding: embedding.as_deref().map(floats),
                    id: parse(&id)?,
                    reinforced_by: reinforced
                        .iter()
                        .map(|episode| parse(episode))
                        .collect::<Result<_>>()?,
                    superseded_by: superseded_by.as_deref().map(parse).transpose()?,
                    updated_at: time(&row.try_get::<String, _>("updated_at").map_err(storage)?)?,
                });
            }
            Ok(facts)
        }
    }

    #[async_trait]
    impl Store for Sqlite {
        async fn record(&self, episode: &Episode) -> Result<()> {
            sqlx::query(
                "INSERT INTO episodes (id, trace, node, occurred_at, content) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(episode.id.to_string())
            .bind(episode.trace_id.to_string())
            .bind(episode.node.map(|node| node.to_string()))
            .bind(written(episode.occurred_at))
            .bind(&episode.content)
            .execute(&self.pool)
            .await
            .map_err(|error| match error {
                sqlx::Error::Database(database) if database.is_unique_violation() => {
                    Error::Storage(format!("episode {} is already held", episode.id))
                }
                other => storage(other),
            })?;
            Ok(())
        }

        async fn assert_fact(&self, fact: &Fact, supersedes: Option<Id>) -> Result<()> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            if let Some(old) = supersedes {
                let links = Self::links(&mut *transaction).await?;
                if let Some(head) = Self::head(&links, old) {
                    sqlx::query("UPDATE facts SET superseded_by = ? WHERE id = ?")
                        .bind(fact.id.to_string())
                        .bind(head.to_string())
                        .execute(&mut *transaction)
                        .await
                        .map_err(storage)?;
                }
            }
            sqlx::query(
                "INSERT INTO facts (id, content, confidence, embedding, superseded_by, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(fact.id.to_string())
            .bind(&fact.content)
            .bind(f64::from(fact.confidence))
            .bind(bytes(fact.embedding.as_ref()))
            .bind(fact.superseded_by.map(|id| id.to_string()))
            .bind(written(fact.updated_at))
            .execute(&mut *transaction)
            .await
            .map_err(|error| match error {
                sqlx::Error::Database(database) if database.is_unique_violation() => {
                    Error::Storage(format!("fact {} is already held", fact.id))
                }
                other => storage(other),
            })?;
            for (position, episode) in fact.derived_from.iter().enumerate() {
                sqlx::query("INSERT INTO sources (fact, position, episode) VALUES (?, ?, ?)")
                    .bind(fact.id.to_string())
                    .bind(i64::try_from(position).map_err(storage)?)
                    .bind(episode.to_string())
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            for episode in &fact.reinforced_by {
                sqlx::query("INSERT OR IGNORE INTO reinforcements (fact, episode) VALUES (?, ?)")
                    .bind(fact.id.to_string())
                    .bind(episode.to_string())
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            transaction.commit().await.map_err(storage)
        }

        async fn reinforce(&self, fact: Id, episode: Id) -> Result<bool> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let links = Self::links(&mut *transaction).await?;
            let Some(head) = Self::head(&links, fact) else {
                return Ok(false);
            };
            let sourced: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM sources WHERE fact = ? AND episode = ?")
                    .bind(head.to_string())
                    .bind(episode.to_string())
                    .fetch_one(&mut *transaction)
                    .await
                    .map_err(storage)?;
            if sourced == 0 {
                sqlx::query("INSERT OR IGNORE INTO reinforcements (fact, episode) VALUES (?, ?)")
                    .bind(head.to_string())
                    .bind(episode.to_string())
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            sqlx::query("UPDATE facts SET updated_at = ? WHERE id = ?")
                .bind(written(Utc::now()))
                .bind(head.to_string())
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            transaction.commit().await.map_err(storage)?;
            Ok(true)
        }

        async fn current_facts(&self) -> Result<Vec<Fact>> {
            let rows = sqlx::query(
                "SELECT * FROM facts WHERE superseded_by IS NULL ORDER BY confidence DESC, rowid",
            )
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?;
            self.read(rows).await
        }

        async fn facts(&self) -> Result<Vec<Fact>> {
            let rows = sqlx::query("SELECT * FROM facts ORDER BY rowid")
                .fetch_all(&self.pool)
                .await
                .map_err(storage)?;
            self.read(rows).await
        }

        async fn supersede(&self, old: Id, new: Id) -> Result<bool> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let links = Self::links(&mut *transaction).await?;
            let (Some(head), Some(target)) = (Self::head(&links, old), Self::head(&links, new))
            else {
                return Ok(false);
            };
            if head == target {
                return Ok(false);
            }
            sqlx::query("UPDATE facts SET superseded_by = ? WHERE id = ?")
                .bind(target.to_string())
                .bind(head.to_string())
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            transaction.commit().await.map_err(storage)?;
            Ok(true)
        }

        async fn episodes(&self) -> Result<Vec<Episode>> {
            sqlx::query("SELECT * FROM episodes ORDER BY rowid")
                .fetch_all(&self.pool)
                .await
                .map_err(storage)?
                .iter()
                .map(episode)
                .collect()
        }

        async fn unconsolidated(&self) -> Result<Vec<Episode>> {
            sqlx::query(
                "SELECT * FROM episodes
                 WHERE id NOT IN (SELECT episode FROM sources)
                   AND id NOT IN (SELECT episode FROM reinforcements)
                 ORDER BY rowid",
            )
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?
            .iter()
            .map(episode)
            .collect()
        }

        async fn forget(&self, trace: Id) -> Result<Vec<Id>> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let episodes: Vec<String> =
                sqlx::query_scalar("SELECT id FROM episodes WHERE trace = ? ORDER BY rowid")
                    .bind(trace.to_string())
                    .fetch_all(&mut *transaction)
                    .await
                    .map_err(storage)?;
            let doomed: Vec<String> = sqlx::query_scalar(
                "SELECT id FROM facts WHERE id IN (
                     SELECT fact FROM sources WHERE episode IN (
                         SELECT id FROM episodes WHERE trace = ?))
                 ORDER BY rowid",
            )
            .bind(trace.to_string())
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage)?;
            let links = Self::links(&mut *transaction).await?;
            let doomed_links: HashMap<Id, Option<Id>> = doomed
                .iter()
                .map(|id| {
                    let id = parse(id)?;
                    Ok((id, links.get(&id).copied().flatten()))
                })
                .collect::<Result<_>>()?;
            for (id, next) in &links {
                if doomed_links.contains_key(id) {
                    continue;
                }
                let after = crate::past(*next, &doomed_links);
                if after != *next {
                    sqlx::query("UPDATE facts SET superseded_by = ? WHERE id = ?")
                        .bind(after.map(|id| id.to_string()))
                        .bind(id.to_string())
                        .execute(&mut *transaction)
                        .await
                        .map_err(storage)?;
                }
            }
            for id in &doomed {
                sqlx::query("DELETE FROM facts WHERE id = ?")
                    .bind(id)
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            sqlx::query(
                "DELETE FROM reinforcements WHERE episode IN (SELECT id FROM episodes WHERE trace = ?)",
            )
            .bind(trace.to_string())
            .execute(&mut *transaction)
            .await
            .map_err(storage)?;
            sqlx::query("DELETE FROM episodes WHERE trace = ?")
                .bind(trace.to_string())
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            transaction.commit().await.map_err(storage)?;
            episodes
                .iter()
                .chain(doomed.iter())
                .map(|id| parse(id))
                .collect()
        }
    }
}

/// The behavior every store must have, run against each one.
#[cfg(test)]
pub(crate) mod conformance {
    use fusion_cortex_core::Id;

    use super::Store;
    use crate::{Episode, Fact};

    pub(crate) async fn run(store: &dyn Store) {
        an_episode_waits_for_consolidation_until_a_fact_derives_from_it(store).await;
        an_episode_is_recorded_once(store).await;
        superseding_mid_chain_leaves_one_current_fact(store).await;
        reinforcing_adds_a_source_to_the_lineage_head(store).await;
        current_facts_are_most_confident_first(store).await;
        forgetting_a_trace_removes_its_episodes_and_the_facts_they_taught(store).await;
        a_fact_round_trips_with_its_embedding(store).await;
        a_fact_is_asserted_once(store).await;
        a_lineage_can_be_superseded_by_a_held_fact(store).await;
        forgetting_a_trace_that_only_reinforced_a_fact_keeps_the_fact(store).await;
    }

    async fn a_fact_is_asserted_once(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "asserted once", trace).await;
        let fact = Fact::new("asserted once", vec![seen.id], 0.5);
        store.assert_fact(&fact, None).await.unwrap();

        assert!(store.assert_fact(&fact, None).await.is_err());
        store.forget(trace).await.unwrap();
    }

    async fn a_lineage_can_be_superseded_by_a_held_fact(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "linked", trace).await;
        let wrong = Fact::new("linked: jest", vec![seen.id], 0.6);
        let right = Fact::new("linked: bun", vec![seen.id], 0.8);
        store.assert_fact(&wrong, None).await.unwrap();
        store.assert_fact(&right, None).await.unwrap();

        assert!(store.supersede(wrong.id, right.id).await.unwrap());
        assert!(
            !store.supersede(right.id, wrong.id).await.unwrap(),
            "one lineage now"
        );
        assert!(!store.supersede(Id::new(), right.id).await.unwrap());

        let current: Vec<String> = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .map(|fact| fact.content)
            .filter(|content| content.starts_with("linked"))
            .collect();
        assert_eq!(current, ["linked: bun"]);
        let all = store.facts().await.unwrap();
        assert!(all
            .iter()
            .any(|fact| fact.id == wrong.id && fact.superseded_by == Some(right.id)));
        store.forget(trace).await.unwrap();
    }

    async fn forgetting_a_trace_that_only_reinforced_a_fact_keeps_the_fact(store: &dyn Store) {
        let (taught, repeated) = (Id::new(), Id::new());
        let first = record(store, "kept: bun", taught).await;
        let again = record(store, "kept: bun again", repeated).await;
        let fact = Fact::new("kept: tests run with bun", vec![first.id], 0.8);
        store.assert_fact(&fact, None).await.unwrap();
        store.reinforce(fact.id, again.id).await.unwrap();

        let removed = store.forget(repeated).await.unwrap();

        assert_eq!(removed, [again.id], "only the episode goes");
        let kept = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .find(|held| held.id == fact.id)
            .unwrap();
        assert!(kept.reinforced_by.is_empty());
        store.forget(taught).await.unwrap();
    }

    async fn record(store: &dyn Store, content: &str, trace: Id) -> Episode {
        let episode = Episode::new(content, trace).at(Id::new());
        store.record(&episode).await.unwrap();
        episode
    }

    async fn an_episode_waits_for_consolidation_until_a_fact_derives_from_it(store: &dyn Store) {
        let trace = Id::new();
        let first = record(store, "waits a", trace).await;
        let second = record(store, "waits b", trace).await;
        store
            .assert_fact(&Fact::new("waits a", vec![first.id], 0.8), None)
            .await
            .unwrap();

        let pending: Vec<Id> = store
            .unconsolidated()
            .await
            .unwrap()
            .into_iter()
            .map(|episode| episode.id)
            .collect();

        assert!(pending.contains(&second.id));
        assert!(!pending.contains(&first.id));
        let held = store.episodes().await.unwrap();
        let read = held.iter().find(|episode| episode.id == first.id).unwrap();
        assert_eq!(*read, first, "an episode reads back as it was recorded");
        store.forget(trace).await.unwrap();
    }

    async fn an_episode_is_recorded_once(store: &dyn Store) {
        let trace = Id::new();
        let episode = record(store, "once", trace).await;

        assert!(store.record(&episode).await.is_err());
        store.forget(trace).await.unwrap();
    }

    async fn superseding_mid_chain_leaves_one_current_fact(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "chain", trace).await;
        let first = Fact::new("chain a", vec![seen.id], 0.5);
        let second = Fact::new("chain b", vec![seen.id], 0.6);
        let third = Fact::new("chain c", vec![seen.id], 0.7);
        store.assert_fact(&first, None).await.unwrap();
        store.assert_fact(&second, Some(first.id)).await.unwrap();
        // A caller holding the first id supersedes again.
        store.assert_fact(&third, Some(first.id)).await.unwrap();

        let current: Vec<String> = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .map(|fact| fact.content)
            .filter(|content| content.starts_with("chain"))
            .collect();

        assert_eq!(current, ["chain c"]);
        store.forget(trace).await.unwrap();
    }

    async fn reinforcing_adds_a_source_to_the_lineage_head(store: &dyn Store) {
        let trace = Id::new();
        let first = record(store, "reinforce", trace).await;
        let again = record(store, "reinforce again", trace).await;
        let old = Fact::new("reinforce a", vec![first.id], 0.5);
        let new = Fact::new("reinforce b", vec![first.id], 0.6);
        store.assert_fact(&old, None).await.unwrap();
        store.assert_fact(&new, Some(old.id)).await.unwrap();

        assert!(store.reinforce(old.id, again.id).await.unwrap());
        assert!(!store.reinforce(Id::new(), again.id).await.unwrap());

        let head = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .find(|fact| fact.id == new.id)
            .unwrap();
        assert_eq!(head.derived_from, [first.id]);
        assert_eq!(head.reinforced_by, [again.id]);
        assert!(head.updated_at >= new.updated_at);
        store.forget(trace).await.unwrap();
    }

    async fn current_facts_are_most_confident_first(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "order", trace).await;
        for (content, confidence) in [
            ("order low", 0.2),
            ("order high", 0.9),
            ("order also low", 0.2),
        ] {
            store
                .assert_fact(&Fact::new(content, vec![seen.id], confidence), None)
                .await
                .unwrap();
        }

        let current: Vec<String> = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .map(|fact| fact.content)
            .filter(|content| content.starts_with("order"))
            .collect();

        assert_eq!(current, ["order high", "order low", "order also low"]);
        store.forget(trace).await.unwrap();
    }

    async fn forgetting_a_trace_removes_its_episodes_and_the_facts_they_taught(store: &dyn Store) {
        let (monday, tuesday) = (Id::new(), Id::new());
        let kept = record(store, "forget bun", monday).await;
        let doomed = record(store, "forget jest", tuesday).await;
        let both = record(store, "forget both", tuesday).await;
        let old = Fact::new("forget: tests run with bun", vec![kept.id], 0.8);
        let wrong = Fact::new("forget: tests run with jest", vec![doomed.id], 0.9);
        let mixed = Fact::new("forget: the suite is slow", vec![kept.id, both.id], 0.7);
        store.assert_fact(&old, None).await.unwrap();
        store.assert_fact(&wrong, Some(old.id)).await.unwrap();
        store.assert_fact(&mixed, None).await.unwrap();

        let removed = store.forget(tuesday).await.unwrap();

        assert_eq!(removed, [doomed.id, both.id, wrong.id, mixed.id]);
        let current: Vec<Id> = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .map(|fact| fact.id)
            .collect();
        assert!(
            current.contains(&old.id),
            "what the forgotten fact replaced is current again"
        );
        assert!(
            !current.contains(&mixed.id),
            "a fact with any forgotten source goes"
        );
        let episodes: Vec<Id> = store
            .episodes()
            .await
            .unwrap()
            .into_iter()
            .map(|episode| episode.id)
            .collect();
        assert!(episodes.contains(&kept.id) && !episodes.contains(&doomed.id));
        store.forget(monday).await.unwrap();
    }

    async fn a_fact_round_trips_with_its_embedding(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "embedded", trace).await;
        let mut fact = Fact::new("embedded", vec![seen.id], 0.4);
        fact.embedding = Some(vec![0.25, -1.5, 3.0]);
        store.assert_fact(&fact, None).await.unwrap();

        let read = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .find(|held| held.id == fact.id)
            .unwrap();

        assert_eq!(read.embedding, fact.embedding);
        assert_eq!(read.content, fact.content);
        assert!((read.confidence - fact.confidence).abs() < f32::EPSILON);
        store.forget(trace).await.unwrap();
    }
}

#[cfg(test)]
mod tests {
    use super::{conformance, InMemory};

    #[tokio::test]
    async fn the_in_memory_store_conforms() {
        conformance::run(&InMemory::new()).await;
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn the_sqlite_store_conforms() {
        conformance::run(&super::Sqlite::in_memory().await.unwrap()).await;
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn two_stores_writing_one_file_wait_for_each_other() {
        use super::{Sqlite, Store};
        use crate::{Episode, Fact};
        use fusion_cortex_core::Id;

        let folder = std::env::temp_dir().join(format!("cortex-engram-{}", Id::new()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("memory.db");
        let write = |path: std::path::PathBuf| async move {
            let store = Sqlite::open(&path).await.unwrap();
            let trace = Id::new();
            let mut last: Option<Id> = None;
            for round in 0..40 {
                let episode = Episode::new(format!("round {round}"), trace);
                store.record(&episode).await.unwrap();
                let fact = Fact::new(format!("round {round}"), vec![episode.id], 0.5);
                store.assert_fact(&fact, last).await.unwrap();
                store.reinforce(fact.id, episode.id).await.unwrap();
                last = Some(fact.id);
            }
        };

        let (first, second) = tokio::join!(
            tokio::spawn(write(path.clone())),
            tokio::spawn(write(path.clone()))
        );

        first.unwrap();
        second.unwrap();
        std::fs::remove_dir_all(&folder).unwrap();
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn a_sqlite_file_keeps_its_memory_across_opens() {
        use super::{Sqlite, Store};
        use crate::Episode;
        use fusion_cortex_core::Id;

        let folder = std::env::temp_dir().join(format!("cortex-engram-{}", Id::new()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("memory.db");
        let episode = Episode::new("kept", Id::new());

        Sqlite::open(&path)
            .await
            .unwrap()
            .record(&episode)
            .await
            .unwrap();
        let reopened = Sqlite::open(&path).await.unwrap();

        assert_eq!(reopened.episodes().await.unwrap(), [episode]);
        drop(reopened);
        std::fs::remove_dir_all(&folder).unwrap();
    }
}
