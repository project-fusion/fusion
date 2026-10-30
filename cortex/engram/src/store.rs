//! Where memory is kept: one trait, an in-memory reference, `SQLite`, and
//! Postgres.
//!
//! [`InMemory`] holds a [`Memory`], which is the reference, and every backend
//! passes the same conformance suite. [`open`] picks a backend by its
//! connection string.

use std::sync::Mutex;

use async_trait::async_trait;
use fusion_cortex_core::{embed::Embedding, Error, Id, Result};

use crate::{Episode, Fact, Memory, Scope};

/// Keeps episodes and the facts distilled from them.
///
/// ```
/// # use fusion_cortex_core::Id;
/// # use fusion_cortex_engram::{store::{InMemory, Store}, Episode, Fact};
/// # #[tokio::main]
/// # async fn main() {
/// let store = InMemory::new(); // or store::open(location).await?
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
    /// [`Memory::assert_fact`] does. The fact takes the narrowest scope of the
    /// sources the store holds, and keeps its own where it holds none.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if a fact with this id is already held, or the
    /// backend fails, and [`Error::InvalidOutput`] if its embedding fails
    /// [`Embedding::check`].
    async fn assert_fact(&self, fact: &Fact, supersedes: Option<Id>) -> Result<()>;

    /// Sets the embedding of the fact `fact`, replacing any it had, as
    /// [`Memory::set_embedding`] does, and returns whether the store held the
    /// fact.
    ///
    /// # Errors
    ///
    /// [`Error::InvalidOutput`] if the embedding fails [`Embedding::check`],
    /// and [`Error::Storage`] if the backend fails.
    async fn set_embedding(&self, fact: Id, embedding: &Embedding) -> Result<bool>;

    /// The current facts in `scopes` nearest `query`, most similar first and
    /// at most `most`, each with its cosine similarity, as
    /// [`Memory::nearest`] ranks them. Only a fact embedded by the query's
    /// model, at its length, is compared.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn nearest(
        &self,
        query: &Embedding,
        scopes: &[Scope],
        most: usize,
    ) -> Result<Vec<(Fact, f32)>>;

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

    /// The fact with this id, superseded or not, or `None` where none has it.
    /// The default reads every fact and keeps the one that matches; a store
    /// overrides it to read one.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn fact(&self, id: Id) -> Result<Option<Fact>> {
        Ok(self.facts().await?.into_iter().find(|fact| fact.id == id))
    }

    /// Adds `episode` to what reinforced `fact`'s lineage, as
    /// [`Memory::reinforce`] does, and returns whether a fact had the id.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn reinforce(&self, fact: Id, episode: Id) -> Result<bool>;

    /// Adds `episode` to the sources of `fact`'s lineage, narrows its scope to
    /// take the episode's in, and makes `node`, where given, its node, as
    /// [`Memory::add_source`] does. Returns whether a fact had the id.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn add_source(&self, fact: Id, episode: Id, node: Option<Id>) -> Result<bool>;

    /// Marks `episodes` as read by a consolidation pass, as
    /// [`Memory::mark_consolidated`] does.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn mark_consolidated(&self, episodes: &[Id]) -> Result<()>;

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

    /// The episode with this id, or `None` where none has it. The default
    /// reads every episode and keeps the one that matches; a store overrides
    /// it to read one.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn episode(&self, id: Id) -> Result<Option<Episode>> {
        Ok(self
            .episodes()
            .await?
            .into_iter()
            .find(|episode| episode.id == id))
    }

    /// Episodes no consolidation pass has read and no fact rests on or was
    /// reinforced by, in the order they were recorded.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn unconsolidated(&self) -> Result<Vec<Episode>>;

    /// Forgets a trace's episodes and every fact that rests on them alone, as
    /// [`Memory::forget`] does, and returns the ids removed, episodes first.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn forget(&self, trace: Id) -> Result<Vec<Id>>;

    /// Forgets one episode and every fact that rests on it alone, as
    /// [`Memory::forget_episode`] does, and returns the ids removed, the
    /// episode first.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn forget_episode(&self, episode: Id) -> Result<Vec<Id>>;

    /// Deletes one fact, as [`Memory::delete_fact`] does, and returns whether
    /// the store held it.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn delete_fact(&self, fact: Id) -> Result<bool>;
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
        checked(fact)?;
        let mut memory = self.lock()?;
        if memory.facts().iter().any(|held| held.id == fact.id) {
            return Err(Error::Storage(format!("fact {} is already held", fact.id)));
        }
        memory.assert_fact(fact.clone(), supersedes);
        Ok(())
    }

    async fn set_embedding(&self, fact: Id, embedding: &Embedding) -> Result<bool> {
        embedding.check()?;
        Ok(self.lock()?.set_embedding(fact, embedding.clone()))
    }

    async fn nearest(
        &self,
        query: &Embedding,
        scopes: &[Scope],
        most: usize,
    ) -> Result<Vec<(Fact, f32)>> {
        Ok(self
            .lock()?
            .nearest(query, scopes, most)
            .into_iter()
            .map(|(fact, similarity)| (fact.clone(), similarity))
            .collect())
    }

    async fn supersede(&self, old: Id, new: Id) -> Result<bool> {
        Ok(self.lock()?.supersede(old, new))
    }

    async fn facts(&self) -> Result<Vec<Fact>> {
        Ok(self.lock()?.facts().to_vec())
    }

    async fn fact(&self, id: Id) -> Result<Option<Fact>> {
        Ok(self
            .lock()?
            .facts()
            .iter()
            .find(|fact| fact.id == id)
            .cloned())
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

    async fn episode(&self, id: Id) -> Result<Option<Episode>> {
        Ok(self
            .lock()?
            .episodes()
            .iter()
            .find(|episode| episode.id == id)
            .cloned())
    }

    async fn unconsolidated(&self) -> Result<Vec<Episode>> {
        Ok(self.lock()?.unconsolidated().into_iter().cloned().collect())
    }

    async fn forget(&self, trace: Id) -> Result<Vec<Id>> {
        Ok(self.lock()?.forget(trace))
    }

    async fn add_source(&self, fact: Id, episode: Id, node: Option<Id>) -> Result<bool> {
        Ok(self.lock()?.add_source(fact, episode, node))
    }

    async fn mark_consolidated(&self, episodes: &[Id]) -> Result<()> {
        self.lock()?.mark_consolidated(episodes);
        Ok(())
    }

    async fn forget_episode(&self, episode: Id) -> Result<Vec<Id>> {
        Ok(self.lock()?.forget_episode(episode))
    }

    async fn delete_fact(&self, fact: Id) -> Result<bool> {
        Ok(self.lock()?.delete_fact(fact))
    }
}

// A build with no backend opens nothing, and waits for nothing.
#[cfg_attr(
    not(any(feature = "postgres", feature = "sqlite")),
    allow(clippy::unused_async)
)]
/// Opens the store `location` names: a `SQLite` file for `sqlite:` or a
/// path, a `SQLite` database in memory for `sqlite::memory:`, and Postgres for
/// `postgres://`. [`fusion_cortex_core::storage`] says how a location is read,
/// with the setting for a transaction-mode pooler.
///
/// ```
/// # #[tokio::main]
/// # async fn main() {
/// // A path, `sqlite:memory.db`, or `postgres://…` opens the same way.
/// let store = fusion_cortex_engram::store::open("sqlite::memory:").await.unwrap();
///
/// assert!(store.episodes().await.unwrap().is_empty());
/// # }
/// ```
///
/// # Errors
///
/// [`Error::Storage`] if `location` names no store, this build lacks the
/// feature for its backend, or the backend fails to open.
pub async fn open(location: &str) -> Result<Box<dyn Store>> {
    use fusion_cortex_core::storage::Location;
    match Location::parse(location)? {
        #[cfg(feature = "sqlite")]
        Location::Sqlite(path) => Ok(Box::new(Sqlite::open(path).await?)),
        #[cfg(feature = "sqlite")]
        Location::Memory => Ok(Box::new(Sqlite::in_memory().await?)),
        #[cfg(feature = "postgres")]
        Location::Postgres(postgres) => Ok(Box::new(Postgres::connect(&postgres).await?)),
        #[allow(unreachable_patterns)]
        Location::Postgres(_) => Err(Error::Storage(
            "this build has no Postgres store: turn on the postgres feature".into(),
        )),
        #[allow(unreachable_patterns)]
        _ => Err(Error::Storage(
            "this build has no SQLite store: turn on the sqlite feature".into(),
        )),
    }
}

/// Checks the embedding a fact carries, where it carries one.
fn checked(fact: &Fact) -> Result<()> {
    fact.embedding.as_ref().map_or(Ok(()), Embedding::check)
}

/// The head of the lineage `from` belongs to, walking `links`, or none for an
/// unknown id. Stops on a cycle.
#[cfg(any(feature = "postgres", feature = "sqlite"))]
fn head(links: &std::collections::HashMap<Id, Option<Id>>, from: Id) -> Option<Id> {
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

#[cfg(feature = "postgres")]
mod postgres;
#[cfg(feature = "postgres")]
pub use postgres::{Postgres, Vectors};

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
    use crate::{Episode, Fact, Scope};
    use fusion_cortex_core::embed::Embedding;

    /// An episode and a fact are rows, and each source of a fact is a row of
    /// its own, so a cascade finds a trace's facts in SQL; an episode that
    /// reinforced a fact is a row of another table, which a cascade only
    /// removes. An embedding is the little-endian bytes of its floats, or
    /// null, and the model that made it is a column beside it, which
    /// [`VECTORS`] adds. A vector with no model is read as no embedding,
    /// since nothing can say which vectors it may be compared with. `SQLite`
    /// needs no extension for vectors: `nearest` reads the facts embedded by
    /// the query's model and ranks them in Rust.
    ///
    /// **Postgres matches it column for column.** Ids and times are text here
    /// and `uuid` and `timestamptz` there. A scope is two columns, its kind
    /// and the name of its project or team, and [`SCOPES`] adds them. A list
    /// is bound as a JSON array read with `json_each`, which Postgres writes
    /// as `= ANY($1)`.
    ///
    /// **A write that reads first takes the write lock first**, with
    /// `BEGIN IMMEDIATE`, so a second session writing the same file waits for
    /// it and does not fail on a lock it could have waited for.
    pub(super) const SCHEMA: &str = "
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

    /// The columns scopes and consolidation added on October 25, 2026, which a
    /// file from before gains when it is opened. Its episodes and facts are
    /// personal, the narrowest scope, and an episode a fact rests on is
    /// consolidated already, so none needs a value written.
    const SCOPES: &str = "
        ALTER TABLE episodes ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal';
        ALTER TABLE episodes ADD COLUMN scope_name TEXT;
        ALTER TABLE episodes ADD COLUMN consolidated_at TEXT;
        ALTER TABLE facts ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal';
        ALTER TABLE facts ADD COLUMN scope_name TEXT;
        ALTER TABLE facts ADD COLUMN node TEXT;
    ";

    /// The column vectors added on October 26, 2026: the model that made a
    /// fact's embedding.
    const VECTORS: &str = "ALTER TABLE facts ADD COLUMN embedding_model TEXT;";

    /// Creates the tables, and adds what a file from an earlier release lacks,
    /// once, under the write lock, so two stores opening one old file add the
    /// columns once between them.
    ///
    /// **It runs on one connection, before the pool opens any other.** A
    /// connection opened before a column was added prepares `SELECT *` with
    /// the columns it last saw, `SQLite` prepares it again with the new ones
    /// when it runs, and `sqlx` reads past the list it kept, which panics.
    async fn migrate(
        connection: &mut sqlx::SqliteConnection,
    ) -> std::result::Result<(), sqlx::Error> {
        use sqlx::Connection as _;
        sqlx::raw_sql(SCHEMA).execute(&mut *connection).await?;
        let mut transaction = connection.begin_with("BEGIN IMMEDIATE").await?;
        for (table, column, sql) in [
            ("episodes", "scope", SCOPES),
            ("facts", "embedding_model", VECTORS),
        ] {
            let held: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?")
                    .bind(table)
                    .bind(column)
                    .fetch_one(&mut *transaction)
                    .await?;
            if held == 0 {
                sqlx::raw_sql(sql).execute(&mut *transaction).await?;
            }
        }
        transaction.commit().await
    }

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
        pub(super) pool: SqlitePool,
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

    fn bytes(values: &[f32]) -> Vec<u8> {
        values
            .iter()
            .flat_map(|value| value.to_le_bytes())
            .collect()
    }

    fn floats(bytes: &[u8]) -> Vec<f32> {
        bytes
            .chunks_exact(4)
            .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect()
    }

    /// A list of ids as the JSON array `json_each` reads.
    fn listed<'a>(ids: impl IntoIterator<Item = &'a Id>) -> String {
        let ids: Vec<String> = ids.into_iter().map(ToString::to_string).collect();
        serde_json::to_string(&ids).unwrap_or_else(|_| "[]".to_owned())
    }

    /// The scope a row's `scope` and `scope_name` columns hold.
    fn scope(row: &SqliteRow) -> Result<Scope> {
        let kind: String = row.try_get("scope").map_err(storage)?;
        let name: Option<String> = row.try_get("scope_name").map_err(storage)?;
        Scope::parts(&kind, name.as_deref())
            .ok_or_else(|| Error::Storage(format!("{kind} {name:?} is not a scope")))
    }

    fn episode(row: &SqliteRow) -> Result<Episode> {
        let node: Option<String> = row.try_get("node").map_err(storage)?;
        Ok(Episode {
            content: row.try_get("content").map_err(storage)?,
            id: parse(&row.try_get::<String, _>("id").map_err(storage)?)?,
            node: node.as_deref().map(parse).transpose()?,
            occurred_at: time(&row.try_get::<String, _>("occurred_at").map_err(storage)?)?,
            scope: scope(row)?,
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
            let mut connection = sqlx::ConnectOptions::connect(&options).await?;
            migrate(&mut connection).await?;
            sqlx::Connection::close(connection).await?;
            let pool = SqlitePoolOptions::new().connect_with(options).await?;
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
            migrate(&mut *pool.acquire().await.map_err(storage)?)
                .await
                .map_err(storage)?;
            Ok(Self { pool })
        }

        /// The narrowest scope of the episodes in `sources` the store holds.
        async fn scope_of(
            executor: impl sqlx::SqliteExecutor<'_>,
            sources: &[Id],
        ) -> Result<Option<Scope>> {
            let rows = sqlx::query(
                "SELECT scope, scope_name FROM episodes WHERE id IN (SELECT value FROM json_each(?))",
            )
            .bind(listed(sources))
            .fetch_all(executor)
            .await
            .map_err(storage)?;
            let scopes = rows.iter().map(scope).collect::<Result<Vec<_>>>()?;
            Ok(Scope::narrowest(&scopes))
        }

        /// Marks the episodes `ids` names as consolidated, where they are not
        /// already.
        async fn consolidate(executor: impl sqlx::SqliteExecutor<'_>, ids: &str) -> Result<()> {
            sqlx::query(
                "UPDATE episodes SET consolidated_at = ?
                 WHERE consolidated_at IS NULL AND id IN (SELECT value FROM json_each(?))",
            )
            .bind(written(Utc::now()))
            .bind(ids)
            .execute(executor)
            .await
            .map_err(storage)?;
            Ok(())
        }

        /// Repoints every supersession link that leads to a fact in `doomed`
        /// past it, as [`crate::past`] does.
        async fn repoint(
            transaction: &mut sqlx::SqliteConnection,
            doomed: &HashMap<Id, Option<Id>>,
        ) -> Result<()> {
            let links = Self::links(&mut *transaction).await?;
            for (id, next) in &links {
                if doomed.contains_key(id) {
                    continue;
                }
                let after = crate::past(*next, doomed);
                if after != *next {
                    sqlx::query("UPDATE facts SET superseded_by = ? WHERE id = ?")
                        .bind(after.map(|id| id.to_string()))
                        .bind(id.to_string())
                        .execute(&mut *transaction)
                        .await
                        .map_err(storage)?;
                }
            }
            Ok(())
        }

        /// Forgets the episodes `episodes` names, every fact that rests on
        /// them alone, and their edges, and returns the ids removed, episodes
        /// first.
        async fn forget_all(&self, episodes: Vec<String>) -> Result<Vec<Id>> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let set = serde_json::to_string(&episodes).map_err(storage)?;
            let doomed: Vec<String> = sqlx::query_scalar(
                "SELECT id FROM facts
                 WHERE id IN (SELECT fact FROM sources
                              WHERE episode IN (SELECT value FROM json_each(?)))
                   AND id NOT IN (SELECT fact FROM sources
                                  WHERE episode NOT IN (SELECT value FROM json_each(?)))
                 ORDER BY rowid",
            )
            .bind(&set)
            .bind(&set)
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
            Self::repoint(&mut transaction, &doomed_links).await?;
            for id in &doomed {
                sqlx::query("DELETE FROM facts WHERE id = ?")
                    .bind(id)
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            // The edges from what stays to what went, and the reverse index
            // over them with the rows.
            sqlx::query("DELETE FROM sources WHERE episode IN (SELECT value FROM json_each(?))")
                .bind(&set)
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            sqlx::query(
                "DELETE FROM reinforcements WHERE episode IN (SELECT value FROM json_each(?))",
            )
            .bind(&set)
            .execute(&mut *transaction)
            .await
            .map_err(storage)?;
            sqlx::query("DELETE FROM episodes WHERE id IN (SELECT value FROM json_each(?))")
                .bind(&set)
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
                let model: Option<String> = row.try_get("embedding_model").map_err(storage)?;
                let superseded_by: Option<String> =
                    row.try_get("superseded_by").map_err(storage)?;
                let node: Option<String> = row.try_get("node").map_err(storage)?;
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
                    embedding: embedding
                        .zip(model)
                        .map(|(values, model)| Embedding::new(model, floats(&values))),
                    id: parse(&id)?,
                    node: node.as_deref().map(parse).transpose()?,
                    reinforced_by: reinforced
                        .iter()
                        .map(|episode| parse(episode))
                        .collect::<Result<_>>()?,
                    scope: scope(&row)?,
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
                "INSERT INTO episodes (id, trace, node, occurred_at, content, scope, scope_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(episode.id.to_string())
            .bind(episode.trace_id.to_string())
            .bind(episode.node.map(|node| node.to_string()))
            .bind(written(episode.occurred_at))
            .bind(&episode.content)
            .bind(episode.scope.kind())
            .bind(episode.scope.name())
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
            super::checked(fact)?;
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            if let Some(old) = supersedes {
                let links = Self::links(&mut *transaction).await?;
                if let Some(head) = super::head(&links, old) {
                    sqlx::query("UPDATE facts SET superseded_by = ? WHERE id = ?")
                        .bind(fact.id.to_string())
                        .bind(head.to_string())
                        .execute(&mut *transaction)
                        .await
                        .map_err(storage)?;
                }
            }
            let scope = Self::scope_of(&mut *transaction, &fact.derived_from)
                .await?
                .unwrap_or_else(|| fact.scope.clone());
            sqlx::query(
                "INSERT INTO facts
                     (id, content, confidence, embedding, embedding_model, superseded_by,
                      updated_at, scope, scope_name, node)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(fact.id.to_string())
            .bind(&fact.content)
            .bind(f64::from(fact.confidence))
            .bind(
                fact.embedding
                    .as_ref()
                    .map(|embedding| bytes(&embedding.values)),
            )
            .bind(fact.embedding.as_ref().map(|embedding| &embedding.model))
            .bind(fact.superseded_by.map(|id| id.to_string()))
            .bind(written(fact.updated_at))
            .bind(scope.kind())
            .bind(scope.name())
            .bind(fact.node.map(|node| node.to_string()))
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
            let Some(head) = super::head(&links, fact) else {
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

        async fn set_embedding(&self, fact: Id, embedding: &Embedding) -> Result<bool> {
            embedding.check()?;
            let set =
                sqlx::query("UPDATE facts SET embedding = ?, embedding_model = ? WHERE id = ?")
                    .bind(bytes(&embedding.values))
                    .bind(&embedding.model)
                    .bind(fact.to_string())
                    .execute(&self.pool)
                    .await
                    .map_err(storage)?;
            Ok(set.rows_affected() > 0)
        }

        async fn nearest(
            &self,
            query: &Embedding,
            scopes: &[Scope],
            most: usize,
        ) -> Result<Vec<(Fact, f32)>> {
            let rows = sqlx::query(
                "SELECT * FROM facts
                 WHERE superseded_by IS NULL AND embedding_model = ? AND length(embedding) = ?
                 ORDER BY rowid",
            )
            .bind(&query.model)
            .bind(i64::try_from(query.values.len() * 4).map_err(storage)?)
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?;
            Ok(crate::nearest(self.read(rows).await?, query, scopes, most))
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

        async fn fact(&self, id: Id) -> Result<Option<Fact>> {
            let rows = sqlx::query("SELECT * FROM facts WHERE id = ?")
                .bind(id.to_string())
                .fetch_all(&self.pool)
                .await
                .map_err(storage)?;
            Ok(self.read(rows).await?.pop())
        }

        async fn supersede(&self, old: Id, new: Id) -> Result<bool> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let links = Self::links(&mut *transaction).await?;
            let (Some(head), Some(target)) = (super::head(&links, old), super::head(&links, new))
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

        async fn episode(&self, id: Id) -> Result<Option<Episode>> {
            sqlx::query("SELECT * FROM episodes WHERE id = ?")
                .bind(id.to_string())
                .fetch_optional(&self.pool)
                .await
                .map_err(storage)?
                .as_ref()
                .map(episode)
                .transpose()
        }

        async fn unconsolidated(&self) -> Result<Vec<Episode>> {
            sqlx::query(
                "SELECT * FROM episodes
                 WHERE consolidated_at IS NULL
                   AND id NOT IN (SELECT episode FROM sources)
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
            let episodes: Vec<String> =
                sqlx::query_scalar("SELECT id FROM episodes WHERE trace = ? ORDER BY rowid")
                    .bind(trace.to_string())
                    .fetch_all(&self.pool)
                    .await
                    .map_err(storage)?;
            self.forget_all(episodes).await
        }

        async fn forget_episode(&self, episode: Id) -> Result<Vec<Id>> {
            let episodes: Vec<String> = sqlx::query_scalar("SELECT id FROM episodes WHERE id = ?")
                .bind(episode.to_string())
                .fetch_all(&self.pool)
                .await
                .map_err(storage)?;
            self.forget_all(episodes).await
        }

        async fn add_source(&self, fact: Id, episode: Id, node: Option<Id>) -> Result<bool> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let links = Self::links(&mut *transaction).await?;
            let Some(head) = super::head(&links, fact) else {
                return Ok(false);
            };
            let (head, episode) = (head.to_string(), episode.to_string());
            let sourced: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM sources WHERE fact = ? AND episode = ?")
                    .bind(&head)
                    .bind(&episode)
                    .fetch_one(&mut *transaction)
                    .await
                    .map_err(storage)?;
            if sourced == 0 {
                sqlx::query(
                    "INSERT INTO sources (fact, position, episode)
                     SELECT ?, COALESCE(MAX(position) + 1, 0), ? FROM sources WHERE fact = ?",
                )
                .bind(&head)
                .bind(&episode)
                .bind(&head)
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            }
            sqlx::query("DELETE FROM reinforcements WHERE fact = ? AND episode = ?")
                .bind(&head)
                .bind(&episode)
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            let row = sqlx::query("SELECT scope, scope_name FROM facts WHERE id = ?")
                .bind(&head)
                .fetch_one(&mut *transaction)
                .await
                .map_err(storage)?;
            let before = scope(&row)?;
            let added = Self::scope_of(&mut *transaction, &[parse(&episode)?]).await?;
            let narrowed = added
                .and_then(|added| Scope::narrowest([&before, &added]))
                .unwrap_or(before);
            sqlx::query(
                "UPDATE facts SET scope = ?, scope_name = ?, node = COALESCE(?, node), updated_at = ?
                 WHERE id = ?",
            )
            .bind(narrowed.kind())
            .bind(narrowed.name())
            .bind(node.map(|node| node.to_string()))
            .bind(written(Utc::now()))
            .bind(&head)
            .execute(&mut *transaction)
            .await
            .map_err(storage)?;
            transaction.commit().await.map_err(storage)?;
            Ok(true)
        }

        async fn mark_consolidated(&self, episodes: &[Id]) -> Result<()> {
            Self::consolidate(&self.pool, &listed(episodes)).await
        }

        async fn delete_fact(&self, fact: Id) -> Result<bool> {
            let mut transaction = self
                .pool
                .begin_with("BEGIN IMMEDIATE")
                .await
                .map_err(storage)?;
            let links = Self::links(&mut *transaction).await?;
            let Some(next) = links.get(&fact) else {
                return Ok(false);
            };
            let sources: Vec<String> =
                sqlx::query_scalar("SELECT episode FROM sources WHERE fact = ?")
                    .bind(fact.to_string())
                    .fetch_all(&mut *transaction)
                    .await
                    .map_err(storage)?;
            Self::repoint(&mut transaction, &HashMap::from([(fact, *next)])).await?;
            sqlx::query("DELETE FROM facts WHERE id = ?")
                .bind(fact.to_string())
                .execute(&mut *transaction)
                .await
                .map_err(storage)?;
            Self::consolidate(
                &mut *transaction,
                &serde_json::to_string(&sources).map_err(storage)?,
            )
            .await?;
            transaction.commit().await.map_err(storage)?;
            Ok(true)
        }
    }
}

/// The behavior every store must have, run against each one.
#[cfg(test)]
pub(crate) mod conformance {
    use fusion_cortex_core::{embed::Embedding, Id};

    use super::Store;
    use crate::{Episode, Fact, Scope};

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
        a_fact_another_episode_supports_outlives_forgetting_one(store).await;
        a_fact_takes_the_narrowest_scope_of_its_sources(store).await;
        adding_a_source_narrows_the_scope_and_moves_the_node(store).await;
        an_episode_a_pass_read_is_no_longer_pending(store).await;
        deleting_a_fact_restores_what_it_superseded(store).await;
        a_paraphrase_finds_its_fact_over_one_that_shares_its_words(store).await;
        nearest_reads_only_current_facts_in_the_callers_scopes(store).await;
        another_models_vectors_are_never_compared(store).await;
        a_new_embedding_replaces_another_models(store).await;
        a_vector_that_cannot_be_compared_is_refused(store).await;
        a_fact_and_an_episode_read_by_their_id(store).await;
    }

    /// The vectors a scripted model gives the facts and questions below. The
    /// question about release notes shares no word with the fact that answers
    /// it, and shares four with the distractor.
    fn scripted() -> fusion_cortex_core::embed::Scripted {
        fusion_cortex_core::embed::Scripted::new("scripted/1", 4)
            .with("Dana owns the release notes", vec![0.9, 0.1, 0.0, 0.1])
            .with(
                "each version changed what the docs site looks like",
                vec![0.1, 0.9, 0.3, 0.0],
            )
            .with("the suite runs nightly", vec![0.0, 0.2, 0.9, 0.1])
            .with(
                "who writes up what changed in each version?",
                vec![0.8, 0.3, 0.1, 0.0],
            )
    }

    async fn embedded(text: &str) -> Embedding {
        use fusion_cortex_core::embed::{Embedder, Purpose};
        scripted().embed_one(text, Purpose::Document).await.unwrap()
    }

    async fn assert_embedded(store: &dyn Store, fact: &mut Fact) {
        fact.embedding = Some(embedded(&fact.content).await);
        store.assert_fact(fact, None).await.unwrap();
    }

    async fn a_paraphrase_finds_its_fact_over_one_that_shares_its_words(store: &dyn Store) {
        use fusion_cortex_core::embed::{Embedder, Purpose};
        let trace = Id::new();
        let seen = record(store, "paraphrase", trace).await;
        let mut owner = Fact::new("Dana owns the release notes", vec![seen.id], 0.8);
        let mut distractor = Fact::new(
            "each version changed what the docs site looks like",
            vec![seen.id],
            0.8,
        );
        let mut nightly = Fact::new("the suite runs nightly", vec![seen.id], 0.8);
        for fact in [&mut owner, &mut distractor, &mut nightly] {
            assert_embedded(store, fact).await;
        }
        let question = scripted()
            .embed_one(
                "who writes up what changed in each version?",
                Purpose::Query,
            )
            .await
            .unwrap();

        let near = store
            .nearest(&question, &[Scope::Personal], 2)
            .await
            .unwrap();

        let found: Vec<Id> = near.iter().map(|(fact, _)| fact.id).collect();
        assert_eq!(found, [owner.id, distractor.id], "{near:?}");
        let expected = question.cosine(owner.embedding.as_ref().unwrap()).unwrap();
        assert!((near[0].1 - expected).abs() < 1e-4, "{near:?}");
        assert!(near[0].1 > near[1].1);
        assert_eq!(
            near[0].0,
            held(store, owner.id).await.unwrap(),
            "the whole fact"
        );
        store.forget(trace).await.unwrap();
    }

    async fn nearest_reads_only_current_facts_in_the_callers_scopes(store: &dyn Store) {
        let trace = Id::new();
        let core = Scope::Team("core".into());
        let personal = record(store, "scoped: mine", trace).await;
        let team = record_within(store, "scoped: core", trace, core.clone()).await;
        let mut old = Fact::new("Dana owns the release notes", vec![personal.id], 0.8);
        assert_embedded(store, &mut old).await;
        let mut new = Fact::new("the suite runs nightly", vec![personal.id], 0.8);
        new.embedding = Some(embedded("the suite runs nightly").await);
        store.assert_fact(&new, Some(old.id)).await.unwrap();
        let mut theirs = Fact::new(
            "each version changed what the docs site looks like",
            vec![team.id],
            0.8,
        );
        assert_embedded(store, &mut theirs).await;
        let question = embedded("Dana owns the release notes").await;

        let mine: Vec<Id> = store
            .nearest(&question, &[Scope::Personal], 10)
            .await
            .unwrap()
            .into_iter()
            .map(|(fact, _)| fact.id)
            .collect();
        assert_eq!(mine, [new.id], "neither a superseded fact nor a team's");
        let both = store
            .nearest(&question, &[Scope::Personal, core.clone()], 10)
            .await
            .unwrap();
        assert_eq!(both.len(), 2);
        assert!(store.nearest(&question, &[], 10).await.unwrap().is_empty());
        assert!(store
            .nearest(&question, &[Scope::Personal], 0)
            .await
            .unwrap()
            .is_empty());
        store.forget(trace).await.unwrap();
    }

    async fn another_models_vectors_are_never_compared(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "models", trace).await;
        let values = vec![0.9, 0.1, 0.0, 0.1];
        let mut ours = Fact::new("models: ours", vec![seen.id], 0.8);
        ours.embedding = Some(Embedding::new("scripted/1", values.clone()));
        let mut theirs = Fact::new("models: theirs", vec![seen.id], 0.8);
        theirs.embedding = Some(Embedding::new("scripted/2", values.clone()));
        let mut longer = Fact::new("models: longer", vec![seen.id], 0.8);
        longer.embedding = Some(Embedding::new("scripted/1", vec![0.9, 0.1, 0.0, 0.1, 0.0]));
        let plain = Fact::new("models: none", vec![seen.id], 0.8);
        for fact in [&ours, &theirs, &longer, &plain] {
            store.assert_fact(fact, None).await.unwrap();
        }

        let near = store
            .nearest(
                &Embedding::new("scripted/1", values),
                &[Scope::Personal],
                10,
            )
            .await
            .unwrap();

        let found: Vec<&str> = near
            .iter()
            .map(|(fact, _)| fact.content.as_str())
            .filter(|content| content.starts_with("models"))
            .collect();
        assert_eq!(found, ["models: ours"], "{near:?}");
        let read = held(store, theirs.id).await.unwrap();
        assert_eq!(
            read.embedding.unwrap().model,
            "scripted/2",
            "the model is kept"
        );
        store.forget(trace).await.unwrap();
    }

    async fn a_new_embedding_replaces_another_models(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "replaced", trace).await;
        let mut fact = Fact::new("Dana owns the release notes", vec![seen.id], 0.8);
        fact.embedding = Some(Embedding::new("retired/1", vec![1.0, 0.0]));
        store.assert_fact(&fact, None).await.unwrap();
        let fresh = embedded("Dana owns the release notes").await;

        assert!(store.set_embedding(fact.id, &fresh).await.unwrap());
        assert!(!store.set_embedding(Id::new(), &fresh).await.unwrap());

        assert_eq!(
            held(store, fact.id).await.unwrap().embedding,
            Some(fresh.clone())
        );
        let retired = Embedding::new("retired/1", vec![1.0, 0.0]);
        assert!(store
            .nearest(&retired, &[Scope::Personal], 10)
            .await
            .unwrap()
            .is_empty());
        assert_eq!(
            store.nearest(&fresh, &[Scope::Personal], 10).await.unwrap()[0]
                .0
                .id,
            fact.id
        );
        store.forget(trace).await.unwrap();
    }

    async fn a_vector_that_cannot_be_compared_is_refused(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "refused", trace).await;
        let held_fact = Fact::new("refused: held", vec![seen.id], 0.8);
        store.assert_fact(&held_fact, None).await.unwrap();
        for values in [
            vec![],
            vec![0.0, 0.0],
            vec![f32::NAN, 1.0],
            vec![f32::INFINITY],
        ] {
            let bad = Embedding::new("scripted/1", values);
            let mut fact = Fact::new("refused: bad", vec![seen.id], 0.8);
            fact.embedding = Some(bad.clone());

            assert!(store.assert_fact(&fact, None).await.is_err(), "{bad:?}");
            assert!(store.set_embedding(held_fact.id, &bad).await.is_err());
        }
        assert!(held(store, held_fact.id).await.unwrap().embedding.is_none());
        store.forget(trace).await.unwrap();
    }

    async fn a_fact_another_episode_supports_outlives_forgetting_one(store: &dyn Store) {
        let trace = Id::new();
        let monday = record(store, "outlives: bun", trace).await;
        let tuesday = record(store, "outlives: bun again", trace).await;
        let fact = Fact::new("outlives: tests run with bun", vec![monday.id], 0.8);
        store.assert_fact(&fact, None).await.unwrap();
        assert!(store.add_source(fact.id, tuesday.id, None).await.unwrap());
        assert!(
            store.add_source(fact.id, tuesday.id, None).await.unwrap(),
            "a source added twice is held once"
        );
        assert!(!store.add_source(Id::new(), tuesday.id, None).await.unwrap());

        assert_eq!(store.forget_episode(monday.id).await.unwrap(), [monday.id]);
        let kept = held(store, fact.id).await.unwrap();
        assert_eq!(
            kept.derived_from,
            [tuesday.id],
            "the edge goes with the episode"
        );

        assert_eq!(
            store.forget_episode(Id::new()).await.unwrap(),
            Vec::<Id>::new()
        );
        assert_eq!(
            store.forget_episode(tuesday.id).await.unwrap(),
            [tuesday.id, fact.id],
            "the last source takes the fact with it"
        );
        assert!(held(store, fact.id).await.is_none());
        store.forget(trace).await.unwrap();
    }

    async fn a_fact_takes_the_narrowest_scope_of_its_sources(store: &dyn Store) {
        let trace = Id::new();
        let core = Scope::Team("core".into());
        let team = record_within(store, "narrowest: team", trace, core.clone()).await;
        let everyone = record_within(store, "narrowest: all", trace, Scope::Organization).await;
        let web = record_within(store, "narrowest: web", trace, Scope::Team("web".into())).await;
        assert_eq!(
            store
                .episodes()
                .await
                .unwrap()
                .into_iter()
                .find(|episode| episode.id == team.id)
                .unwrap()
                .scope,
            core,
            "an episode keeps the scope it was recorded with"
        );

        let shared = Fact::new("narrowest: shared", vec![team.id, everyone.id], 0.5)
            .within(Scope::Organization);
        let mixed = Fact::new("narrowest: mixed", vec![team.id, web.id], 0.5);
        let unsourced =
            Fact::new("narrowest: given", vec![Id::new()], 0.5).within(Scope::Organization);
        for fact in [&shared, &mixed, &unsourced] {
            store.assert_fact(fact, None).await.unwrap();
        }

        assert_eq!(held(store, shared.id).await.unwrap().scope, core);
        assert_eq!(
            held(store, mixed.id).await.unwrap().scope,
            Scope::Personal,
            "two teams make a fact personal"
        );
        assert_eq!(
            held(store, unsourced.id).await.unwrap().scope,
            Scope::Organization,
            "a fact with no held source keeps its own"
        );
        store.forget(trace).await.unwrap();
        store.delete_fact(unsourced.id).await.unwrap();
    }

    async fn adding_a_source_narrows_the_scope_and_moves_the_node(store: &dyn Store) {
        let trace = Id::new();
        let everyone = record_within(store, "narrows: all", trace, Scope::Organization).await;
        let checkout = Scope::Project("checkout".into());
        let project = record_within(store, "narrows: project", trace, checkout.clone()).await;
        let mut fact = Fact::new("narrows: the suite is slow", vec![everyone.id], 0.5);
        let first = Id::new();
        fact.node = Some(first);
        store.assert_fact(&fact, None).await.unwrap();
        assert_eq!(
            held(store, fact.id).await.unwrap().scope,
            Scope::Organization
        );

        let second = Id::new();
        store
            .add_source(fact.id, project.id, Some(second))
            .await
            .unwrap();

        let read = held(store, fact.id).await.unwrap();
        assert_eq!(read.scope, checkout);
        assert_eq!(read.node, Some(second));
        assert_eq!(read.derived_from, [everyone.id, project.id]);
        store.forget_episode(project.id).await.unwrap();
        assert_eq!(
            held(store, fact.id).await.unwrap().scope,
            checkout,
            "forgetting a source never widens a fact"
        );
        store.forget(trace).await.unwrap();
    }

    async fn an_episode_a_pass_read_is_no_longer_pending(store: &dyn Store) {
        let trace = Id::new();
        let read = record(store, "pending: read", trace).await;
        let unread = record(store, "pending: unread", trace).await;

        store
            .mark_consolidated(&[read.id, Id::new()])
            .await
            .unwrap();

        let pending: Vec<Id> = store
            .unconsolidated()
            .await
            .unwrap()
            .into_iter()
            .map(|episode| episode.id)
            .collect();
        assert!(pending.contains(&unread.id));
        assert!(!pending.contains(&read.id));
        store.forget(trace).await.unwrap();
    }

    async fn deleting_a_fact_restores_what_it_superseded(store: &dyn Store) {
        let trace = Id::new();
        let seen = record(store, "deleted: bun", trace).await;
        let wrong = record(store, "deleted: jest", trace).await;
        let old = Fact::new("deleted: tests run with bun", vec![seen.id], 0.8);
        let new = Fact::new("deleted: tests run with jest", vec![wrong.id], 0.9);
        store.assert_fact(&old, None).await.unwrap();
        store.assert_fact(&new, Some(old.id)).await.unwrap();

        assert!(store.delete_fact(new.id).await.unwrap());
        assert!(!store.delete_fact(new.id).await.unwrap());

        let current: Vec<Id> = store
            .current_facts()
            .await
            .unwrap()
            .into_iter()
            .map(|fact| fact.id)
            .collect();
        assert!(current.contains(&old.id) && !current.contains(&new.id));
        let pending: Vec<Id> = store
            .unconsolidated()
            .await
            .unwrap()
            .into_iter()
            .map(|episode| episode.id)
            .collect();
        assert!(
            !pending.contains(&wrong.id),
            "a pass does not distill a deleted fact again"
        );
        store.forget(trace).await.unwrap();
    }

    async fn held(store: &dyn Store, fact: Id) -> Option<Fact> {
        store
            .facts()
            .await
            .unwrap()
            .into_iter()
            .find(|held| held.id == fact)
    }

    async fn a_fact_and_an_episode_read_by_their_id(store: &dyn Store) {
        let trace = Id::new();
        let first = record(store, "read by id a", trace).await;
        let second = record(store, "read by id b", trace).await;
        let mut fact = Fact::new("read by id", vec![first.id], 0.7);
        fact.embedding = Some(Embedding::new("model", vec![1.0, 0.0]));
        store.assert_fact(&fact, None).await.unwrap();
        store.reinforce(fact.id, second.id).await.unwrap();
        let newer = Fact::new("read by id, newer", vec![second.id], 0.9);
        store.assert_fact(&newer, Some(fact.id)).await.unwrap();

        let current = store.fact(newer.id).await.unwrap();
        assert!(current.is_some());
        assert_eq!(current, held(store, newer.id).await);
        let old = store.fact(fact.id).await.unwrap().unwrap();
        assert_eq!(Some(&old), held(store, fact.id).await.as_ref());
        assert_eq!(old.superseded_by, Some(newer.id));
        assert!(old.embedding.is_some());
        assert_eq!(old.reinforced_by, vec![second.id]);
        assert_eq!(store.episode(first.id).await.unwrap(), Some(first.clone()));
        assert_eq!(store.episode(second.id).await.unwrap(), Some(second));
        assert_eq!(store.fact(Id::new()).await.unwrap(), None);
        assert_eq!(store.episode(Id::new()).await.unwrap(), None);

        store.forget(trace).await.unwrap();
        assert_eq!(store.fact(fact.id).await.unwrap(), None);
        assert_eq!(store.fact(newer.id).await.unwrap(), None);
        assert_eq!(store.episode(first.id).await.unwrap(), None);
    }

    async fn record_within(store: &dyn Store, content: &str, trace: Id, scope: Scope) -> Episode {
        let episode = Episode::new(content, trace).within(scope);
        store.record(&episode).await.unwrap();
        episode
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

        assert_eq!(removed, [doomed.id, both.id, wrong.id]);
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
            current.contains(&mixed.id),
            "a fact another episode supports stays"
        );
        assert_eq!(held(store, mixed.id).await.unwrap().derived_from, [kept.id]);
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
        fact.embedding = Some(Embedding::new("scripted/1", vec![0.25, -1.5, 3.0]));
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
    use async_trait::async_trait;
    use fusion_cortex_core::{embed::Embedding, Id, Result};

    use super::{conformance, InMemory, Store};
    use crate::{Episode, Fact, Scope};

    /// An in-memory store that keeps the trait's default `fact` and
    /// `episode`, so the conformance suite covers them.
    struct Scanning(InMemory);

    #[async_trait]
    impl Store for Scanning {
        async fn record(&self, episode: &Episode) -> Result<()> {
            self.0.record(episode).await
        }

        async fn assert_fact(&self, fact: &Fact, supersedes: Option<Id>) -> Result<()> {
            self.0.assert_fact(fact, supersedes).await
        }

        async fn set_embedding(&self, fact: Id, embedding: &Embedding) -> Result<bool> {
            self.0.set_embedding(fact, embedding).await
        }

        async fn nearest(
            &self,
            query: &Embedding,
            scopes: &[Scope],
            most: usize,
        ) -> Result<Vec<(Fact, f32)>> {
            self.0.nearest(query, scopes, most).await
        }

        async fn supersede(&self, old: Id, new: Id) -> Result<bool> {
            self.0.supersede(old, new).await
        }

        async fn facts(&self) -> Result<Vec<Fact>> {
            self.0.facts().await
        }

        async fn reinforce(&self, fact: Id, episode: Id) -> Result<bool> {
            self.0.reinforce(fact, episode).await
        }

        async fn add_source(&self, fact: Id, episode: Id, node: Option<Id>) -> Result<bool> {
            self.0.add_source(fact, episode, node).await
        }

        async fn mark_consolidated(&self, episodes: &[Id]) -> Result<()> {
            self.0.mark_consolidated(episodes).await
        }

        async fn current_facts(&self) -> Result<Vec<Fact>> {
            self.0.current_facts().await
        }

        async fn episodes(&self) -> Result<Vec<Episode>> {
            self.0.episodes().await
        }

        async fn unconsolidated(&self) -> Result<Vec<Episode>> {
            self.0.unconsolidated().await
        }

        async fn forget(&self, trace: Id) -> Result<Vec<Id>> {
            self.0.forget(trace).await
        }

        async fn forget_episode(&self, episode: Id) -> Result<Vec<Id>> {
            self.0.forget_episode(episode).await
        }

        async fn delete_fact(&self, fact: Id) -> Result<bool> {
            self.0.delete_fact(fact).await
        }
    }

    #[tokio::test]
    async fn the_default_lookups_conform() {
        conformance::run(&Scanning(InMemory::new())).await;
    }

    #[tokio::test]
    async fn the_in_memory_store_conforms() {
        conformance::run(&InMemory::new()).await;
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn the_sqlite_store_conforms() {
        conformance::run(&super::Sqlite::in_memory().await.unwrap()).await;
    }

    /// Installs `pgvector` in the database's default schema, where the server
    /// has it, before a suite makes a scratch schema. A store would otherwise
    /// create it in the first scratch schema to open, and dropping that
    /// schema would take the extension, and every other schema's vector
    /// column, with it. Returns whether `pgvector` is installed, which a
    /// role without the privilege to create it may leave it not.
    #[cfg(feature = "postgres")]
    async fn with_pgvector() -> bool {
        let Ok(url) = std::env::var(fusion_cortex_core::postgres::TEST_DATABASE) else {
            return false;
        };
        let pool = sqlx::PgPool::connect(&url).await.unwrap();
        let available: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        if available {
            // Two suites may race to create it, and the one that loses finds
            // it made.
            let _ = sqlx::raw_sql("CREATE EXTENSION IF NOT EXISTS vector")
                .execute(&pool)
                .await;
        }
        let installed: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        pool.close().await;
        installed
    }

    /// Runs `run` in a scratch schema, once `pgvector` is installed outside
    /// it where the server has it.
    #[cfg(feature = "postgres")]
    async fn scratch<F, Run>(run: F) -> bool
    where
        F: FnOnce(fusion_cortex_core::storage::Postgres) -> Run,
        Run: std::future::Future<Output = ()> + Send + 'static,
    {
        with_pgvector().await;
        fusion_cortex_core::postgres::in_scratch_schema(run).await
    }

    #[cfg(feature = "postgres")]
    #[tokio::test]
    async fn the_postgres_store_conforms() {
        let pgvector = with_pgvector().await;
        scratch(|location| async move {
            let store = super::Postgres::connect(&location).await.unwrap();
            assert_eq!(
                matches!(store.vectors(), super::postgres::Vectors::Pgvector(_)),
                pgvector,
                "pgvector scores where it is installed"
            );
            conformance::run(&store).await;
        })
        .await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test]
    async fn the_postgres_store_conforms_scoring_in_rust() {
        scratch(|location| async move {
            let store = super::Postgres::scoring_in_rust(&location).await.unwrap();
            assert_eq!(store.vectors(), &super::postgres::Vectors::Rust);
            conformance::run(&store).await;
        })
        .await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test]
    async fn a_pgvector_store_orders_by_an_index_for_each_model() {
        use super::{postgres::Vectors, Postgres, Store};
        use crate::{Episode, Fact, Scope};
        use fusion_cortex_core::{embed::Embedding, Id};

        if !with_pgvector().await {
            eprintln!("skipped: pgvector is not installed");
            return;
        }
        scratch(|location| async move {
            let store = Postgres::connect(&location).await.unwrap();
            let Vectors::Pgvector(schema) = store.vectors().clone() else {
                panic!("pgvector is installed");
            };
            let episode = Episode::new("indexed", Id::new());
            store.record(&episode).await.unwrap();
            for values in [[0.9, 0.1, 0.0], [0.1, 0.9, 0.0], [0.0, 0.1, 0.9]] {
                let mut fact = Fact::new("indexed", vec![episode.id], 0.5);
                fact.embedding = Some(Embedding::new("it's/1", values.to_vec()));
                store.assert_fact(&fact, None).await.unwrap();
            }
            let reopened = Postgres::connect(&location).await.unwrap();
            assert_eq!(
                reopened.vectors(),
                store.vectors(),
                "the column records the choice"
            );

            let pool = sqlx::PgPool::connect(&location.url).await.unwrap();
            let indexes: Vec<String> = sqlx::query_scalar(
                "SELECT indexdef FROM pg_indexes
                 WHERE schemaname = current_schema() AND tablename = 'facts'
                   AND indexdef LIKE '%hnsw%'",
            )
            .fetch_all(&pool)
            .await
            .unwrap();
            assert_eq!(indexes.len(), 1, "{indexes:?}");
            assert!(indexes[0].contains("'it''s/1'"), "{indexes:?}");
            let mut connection = pool.acquire().await.unwrap();
            sqlx::raw_sql("SET enable_seqscan = off")
                .execute(&mut *connection)
                .await
                .unwrap();
            let schema = format!("\"{schema}\"");
            let plan: Vec<String> = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
                "EXPLAIN SELECT id FROM facts
                 WHERE superseded_by IS NULL AND embedding_model = 'it''s/1'
                   AND {schema}.vector_dims(embedding_vector) = 3
                 ORDER BY (embedding_vector::{schema}.vector(3))
                     OPERATOR({schema}.<=>) '[1,0,0]'::{schema}.vector(3)
                 LIMIT 2"
            )))
            .fetch_all(&mut *connection)
            .await
            .unwrap();
            assert!(
                plan.iter().any(|line| line.contains("facts_embedding_")),
                "{plan:?}"
            );
            drop(connection);
            pool.close().await;

            let near = store
                .nearest(
                    &Embedding::new("it's/1", vec![1.0, 0.0, 0.0]),
                    &[Scope::Personal],
                    2,
                )
                .await
                .unwrap();
            assert_eq!(near.len(), 2);
            assert!(near[0].1 > near[1].1);
        })
        .await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test]
    async fn two_postgres_stores_writing_one_schema_wait_for_each_other() {
        use super::{Postgres, Store};
        use crate::{Episode, Fact};
        use fusion_cortex_core::Id;

        scratch(|location| async move {
            let write = |location: fusion_cortex_core::storage::Postgres| async move {
                let store = Postgres::connect(&location).await.unwrap();
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
                tokio::spawn(write(location.clone())),
                tokio::spawn(write(location.clone()))
            );

            first.unwrap();
            second.unwrap();
            let store = super::open(&location.url).await.unwrap();
            assert_eq!(store.current_facts().await.unwrap().len(), 2);
        })
        .await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test]
    async fn forgetting_a_source_prunes_its_postgres_rows() {
        use super::{Postgres, Store};
        use crate::{Episode, Fact};
        use fusion_cortex_core::Id;

        scratch(|location| async move {
            let store = Postgres::connect(&location).await.unwrap();
            let (monday, tuesday) = (
                Episode::new("bun", Id::new()),
                Episode::new("bun", Id::new()),
            );
            store.record(&monday).await.unwrap();
            store.record(&tuesday).await.unwrap();
            let fact = Fact::new("tests run with bun", vec![monday.id, tuesday.id], 0.8);
            store.assert_fact(&fact, None).await.unwrap();
            store.reinforce(fact.id, monday.id).await.unwrap();

            store.forget_episode(monday.id).await.unwrap();

            let pool = sqlx::PgPool::connect(&location.url).await.unwrap();
            let rows: i64 = sqlx::query_scalar(
                "SELECT (SELECT COUNT(*) FROM sources WHERE episode = $1)
                      + (SELECT COUNT(*) FROM reinforcements WHERE episode = $1)",
            )
            .bind(monday.id.0)
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(rows, 0, "no row names the forgotten episode");
            pool.close().await;
        })
        .await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test]
    async fn a_postgres_store_refuses_a_nul_in_text() {
        use super::{Postgres, Store};
        use crate::Episode;
        use fusion_cortex_core::Id;

        scratch(|location| async move {
            let store = Postgres::connect(&location).await.unwrap();

            let refused = store.record(&Episode::new("a\0b", Id::new())).await;

            assert!(refused.is_err(), "{refused:?}");
            assert!(store.episodes().await.unwrap().is_empty());
        })
        .await;
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn a_location_picks_the_backend() {
        use crate::Episode;
        use fusion_cortex_core::Id;

        let folder = std::env::temp_dir().join(format!("cortex-engram-{}", Id::new()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("memory.db");
        let episode = Episode::new("kept", Id::new());

        super::open(&format!("sqlite://{}", path.display()))
            .await
            .unwrap()
            .record(&episode)
            .await
            .unwrap();
        let reopened = super::open(path.to_str().unwrap()).await.unwrap();

        assert_eq!(reopened.episodes().await.unwrap(), [episode]);
        assert!(super::open("redis://localhost").await.is_err());
        drop(reopened);
        std::fs::remove_dir_all(&folder).unwrap();
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

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn forgetting_a_source_prunes_its_rows() {
        use super::{Sqlite, Store};
        use crate::{Episode, Fact};
        use fusion_cortex_core::Id;

        let store = Sqlite::in_memory().await.unwrap();
        let (monday, tuesday) = (
            Episode::new("bun", Id::new()),
            Episode::new("bun", Id::new()),
        );
        store.record(&monday).await.unwrap();
        store.record(&tuesday).await.unwrap();
        let fact = Fact::new("tests run with bun", vec![monday.id, tuesday.id], 0.8);
        store.assert_fact(&fact, None).await.unwrap();
        store.reinforce(fact.id, monday.id).await.unwrap();

        store.forget_episode(monday.id).await.unwrap();

        let rows: i64 = sqlx::query_scalar(
            "SELECT (SELECT COUNT(*) FROM sources WHERE episode = ?1)
                  + (SELECT COUNT(*) FROM reinforcements WHERE episode = ?1)",
        )
        .bind(monday.id.to_string())
        .fetch_one(&store.pool)
        .await
        .unwrap();
        assert_eq!(rows, 0, "no row names the forgotten episode");
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn a_file_from_before_scopes_opens_with_its_memory_personal() {
        use super::{Sqlite, Store};
        use crate::Scope;
        use fusion_cortex_core::Id;

        let folder = std::env::temp_dir().join(format!("cortex-engram-{}", Id::new()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("memory.db");
        // The file as the release before scopes left it.
        let (episode, fact, pending) = (Id::new(), Id::new(), Id::new());
        let pool = sqlx::SqlitePool::connect(&format!("sqlite://{}?mode=rwc", path.display()))
            .await
            .unwrap();
        sqlx::raw_sql(super::sqlite::SCHEMA)
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO episodes (id, trace, node, occurred_at, content)
             VALUES (?, ?, NULL, '2026-10-01T09:00:00.000000000Z', 'bun'),
                    (?, ?, NULL, '2026-10-02T09:00:00.000000000Z', 'pending')",
        )
        .bind(episode.to_string())
        .bind(Id::new().to_string())
        .bind(pending.to_string())
        .bind(Id::new().to_string())
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(
            "INSERT INTO facts (id, content, confidence, embedding, superseded_by, updated_at)
             VALUES (?, 'tests run with bun', 0.8, NULL, NULL, '2026-10-01T09:00:00.000000000Z')",
        )
        .bind(fact.to_string())
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query("INSERT INTO sources (fact, position, episode) VALUES (?, 0, ?)")
            .bind(fact.to_string())
            .bind(episode.to_string())
            .execute(&pool)
            .await
            .unwrap();
        pool.close().await;

        let store = Sqlite::open(&path).await.unwrap();

        let episodes = store.episodes().await.unwrap();
        assert!(episodes
            .iter()
            .all(|episode| episode.scope == Scope::Personal));
        let facts = store.facts().await.unwrap();
        assert_eq!(facts[0].scope, Scope::Personal);
        assert_eq!(facts[0].node, None);
        let unread: Vec<Id> = store
            .unconsolidated()
            .await
            .unwrap()
            .into_iter()
            .map(|episode| episode.id)
            .collect();
        assert_eq!(unread, [pending], "an episode a fact rests on was read");
        drop(store);
        assert!(
            Sqlite::open(&path).await.is_ok(),
            "and opens again without adding the columns twice"
        );
        std::fs::remove_dir_all(&folder).unwrap();
    }
}
