//! Memory in Postgres.
//!
//! **Vectors are scored by `pgvector` where the database has it, and in Rust
//! where it does not.** [`Postgres::connect`] decides when it opens a
//! database. Where the `vector` extension is installed, or the role may
//! create it, the store adds `embedding_vector`, a `vector` column generated
//! from `embedding`, and `nearest` orders by `<=>` under an HNSW index for
//! each model. Elsewhere the store keeps `real[]` alone and ranks in Rust, as
//! `SQLite` does. The column is the record of the choice: a schema that has it
//! scores with `pgvector` from then on, and a schema without it tries again at
//! the next open, so installing the extension later takes effect then.

use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use chrono::Utc;
use fusion_cortex_core::{embed::Embedding, postgres::Database, storage, Error, Id, Result};
use sqlx::{postgres::PgRow, PgConnection, Row};

use super::Store;
use crate::{Episode, Fact, Scope};

/// The episodes, the facts, and the rows between them, with everything scopes
/// and consolidation added.
///
/// **They match the `SQLite` tables column for column**, with three changes.
/// Ids are `uuid` and times `timestamptz`, which keeps them to the
/// microsecond. A row's place in the order it was written is `seq`, where
/// `SQLite` has its `rowid`. An embedding is a `real[]`, the floats as they
/// were, which `pgvector` casts to a `vector` when vectors arrive.
const MEMORY: &str = "
    CREATE TABLE IF NOT EXISTS episodes (
        seq BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
        id UUID PRIMARY KEY,
        trace UUID NOT NULL,
        node UUID,
        occurred_at TIMESTAMPTZ NOT NULL,
        content TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'personal',
        scope_name TEXT,
        consolidated_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS episodes_by_trace ON episodes (trace);
    CREATE TABLE IF NOT EXISTS facts (
        seq BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        confidence REAL NOT NULL,
        embedding REAL[],
        superseded_by UUID,
        updated_at TIMESTAMPTZ NOT NULL,
        scope TEXT NOT NULL DEFAULT 'personal',
        scope_name TEXT,
        node UUID
    );
    CREATE TABLE IF NOT EXISTS sources (
        fact UUID NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        episode UUID NOT NULL,
        PRIMARY KEY (fact, position)
    );
    CREATE INDEX IF NOT EXISTS sources_by_episode ON sources (episode);
    CREATE TABLE IF NOT EXISTS reinforcements (
        seq BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
        fact UUID NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
        episode UUID NOT NULL,
        PRIMARY KEY (fact, episode)
    );
    CREATE INDEX IF NOT EXISTS reinforcements_by_episode ON reinforcements (episode);
";

/// The model that made each fact's embedding, added on October 26, 2026. A
/// vector with no model is read as no embedding.
const MODEL: &str = "ALTER TABLE facts ADD COLUMN IF NOT EXISTS embedding_model TEXT;";

/// The schema, a step at a time. A released step is never edited, and a
/// change is a new step at the end.
///
/// The `pgvector` column is no step, because it exists only where the server
/// has the extension: [`Postgres::over`] adds it when it opens a database.
const STEPS: &[&str] = &[MEMORY, MODEL];

/// The columns a fact is read from. `SELECT *` would also read the generated
/// `vector` column, whose type a schema without `pgvector` does not have.
macro_rules! fact_columns {
    () => {
        "seq, id, content, confidence, embedding, embedding_model, superseded_by, updated_at,
         scope, scope_name, node"
    };
}

/// The most dimensions an HNSW index holds for a `vector`. A model with more
/// is scored by an exact scan of its rows.
const INDEXED: usize = 2000;

/// The name the schema's version is recorded under.
const COMPONENT: &str = "engram";

/// The advisory lock every write that reads first holds, as `SQLite`'s
/// `BEGIN IMMEDIATE` takes its write lock, so a lineage is read and changed
/// by one writer at a time.
const WRITE_LOCK: i64 = 0x656e_6772_616d;

/// How a Postgres store scores vectors, as it chose when it opened.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Vectors {
    /// With `pgvector`, installed in the schema this names.
    Pgvector(String),
    /// In Rust, over the `real[]` column, where the server lacks `pgvector`
    /// or the role may not create it.
    Rust,
}

/// Memory in a Postgres database.
///
/// [`Postgres::open`] takes a `postgres://` URL, and
/// [`fusion_cortex_core::storage`] says how it reads one, with the setting for
/// a transaction-mode pooler. [`Postgres::vectors`] says how it scores
/// vectors.
#[derive(Clone, Debug)]
pub struct Postgres {
    database: Database,
    /// The HNSW indexes this store has made or found, by name, so each is
    /// created once, shared by its clones.
    indexed: Arc<Mutex<HashSet<String>>>,
    /// Whether `pgvector` filters inside its index scan, which 0.8 added, so
    /// a search confined to some scopes still finds as many facts as asked.
    iterative: bool,
    vectors: Vectors,
}

fn storage_error(error: impl std::fmt::Display) -> Error {
    Error::Storage(error.to_string())
}

/// The scope a row's `scope` and `scope_name` columns hold.
fn scope(row: &PgRow) -> Result<Scope> {
    let kind: String = row.try_get("scope").map_err(storage_error)?;
    let name: Option<String> = row.try_get("scope_name").map_err(storage_error)?;
    Scope::parts(&kind, name.as_deref())
        .ok_or_else(|| Error::Storage(format!("{kind} {name:?} is not a scope")))
}

fn episode(row: &PgRow) -> Result<Episode> {
    let node: Option<uuid::Uuid> = row.try_get("node").map_err(storage_error)?;
    Ok(Episode {
        content: row.try_get("content").map_err(storage_error)?,
        id: Id(row.try_get("id").map_err(storage_error)?),
        node: node.map(Id),
        occurred_at: row.try_get("occurred_at").map_err(storage_error)?,
        scope: scope(row)?,
        trace_id: Id(row.try_get("trace").map_err(storage_error)?),
    })
}

fn uuids(ids: &[Id]) -> Vec<uuid::Uuid> {
    ids.iter().map(|id| id.0).collect()
}

/// `name` as a quoted SQL identifier.
fn identifier(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

/// `text` as a quoted SQL string. Postgres refuses the NUL character in text,
/// so a model named with one is refused here.
fn literal(text: &str) -> Result<String> {
    if text.contains('\0') {
        return Err(Error::Storage(
            "a model name holds the NUL character, which Postgres refuses".into(),
        ));
    }
    Ok(format!("'{}'", text.replace('\'', "''")))
}

/// The name of the HNSW index for one model at one length: a 64-bit FNV-1a
/// hash of the two, so any model name makes a short identifier.
fn index_name(model: &str, dimensions: usize) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in model.bytes().chain(dimensions.to_le_bytes()) {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0100_0000_01b3);
    }
    format!("facts_embedding_{hash:016x}")
}

/// Decides how the store at `database` scores vectors, under the write lock:
/// with `pgvector` where the schema has its column already, or where
/// `pgvector` is wanted and the extension is installed or can be created,
/// and in Rust otherwise. Also says whether the extension filters inside its
/// index scan.
async fn vectors(database: &Database, pgvector: bool) -> Result<(Vectors, bool)> {
    let mut transaction = database.begin().await?;
    database
        .query("SELECT pg_advisory_xact_lock($1)")
        .bind(WRITE_LOCK)
        .execute(&mut *transaction)
        .await
        .map_err(storage_error)?;
    let column: bool = database
        .scalar(
            "SELECT EXISTS (
                 SELECT 1 FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'facts' AND column_name = 'embedding_vector'
             )",
        )
        .fetch_one(&mut *transaction)
        .await
        .map_err(storage_error)?;
    let mut installed = extension(database, &mut transaction).await?;
    if !column && pgvector && installed.is_none() {
        let available: bool = database
            .scalar("SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')")
            .fetch_one(&mut *transaction)
            .await
            .map_err(storage_error)?;
        if available {
            // A role without the privilege to create it is refused, and the
            // savepoint keeps the refusal from ending the transaction.
            let mut attempt = sqlx::Connection::begin(&mut *transaction)
                .await
                .map_err(storage_error)?;
            match sqlx::raw_sql("CREATE EXTENSION IF NOT EXISTS vector")
                .execute(&mut *attempt)
                .await
            {
                Ok(_) => attempt.commit().await.map_err(storage_error)?,
                Err(_) => attempt.rollback().await.map_err(storage_error)?,
            }
            installed = extension(database, &mut transaction).await?;
        }
    }
    let chosen = match installed {
        Some((schema, version)) if column || pgvector => {
            if !column {
                let quoted = identifier(&schema);
                sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
                    "ALTER TABLE facts ADD COLUMN IF NOT EXISTS embedding_vector {quoted}.vector
                     GENERATED ALWAYS AS (
                         CASE WHEN cardinality(embedding) > 0 THEN embedding::{quoted}.vector END
                     ) STORED"
                )))
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
            }
            (Vectors::Pgvector(schema), iterative(&version))
        }
        _ => (Vectors::Rust, false),
    };
    transaction.commit().await.map_err(storage_error)?;
    Ok(chosen)
}

/// The schema `pgvector` is installed in, and its version, where it is.
async fn extension(
    database: &Database,
    connection: &mut PgConnection,
) -> Result<Option<(String, String)>> {
    let row = database
        .query(
            "SELECT namespace.nspname AS schema, extension.extversion AS version
             FROM pg_extension extension
             JOIN pg_namespace namespace ON namespace.oid = extension.extnamespace
             WHERE extension.extname = 'vector'",
        )
        .fetch_optional(&mut *connection)
        .await
        .map_err(storage_error)?;
    row.map(|row| {
        Ok((
            row.try_get("schema").map_err(storage_error)?,
            row.try_get("version").map_err(storage_error)?,
        ))
    })
    .transpose()
}

/// Whether `pgvector` at `version` filters inside its index scan, which 0.8.0
/// added.
fn iterative(version: &str) -> bool {
    let mut parts = version
        .split('.')
        .map(|part| part.parse::<u32>().unwrap_or(0));
    let major = parts.next().unwrap_or(0);
    let minor = parts.next().unwrap_or(0);
    (major, minor) >= (0, 8)
}

impl Postgres {
    /// Connects to the database `url` names, creating the tables or bringing
    /// them up to date.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if `url` is not a `postgres://` URL, or the database
    /// refuses the connection or the schema.
    pub async fn open(url: &str) -> Result<Self> {
        match storage::Location::parse(url)? {
            storage::Location::Postgres(location) => Self::connect(&location).await,
            _ => Err(Error::Storage(
                "a Postgres store needs a postgres:// URL".into(),
            )),
        }
    }

    /// Connects to the database `location` names, creating the tables or
    /// bringing them up to date.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the database refuses the connection or the
    /// schema.
    pub async fn connect(location: &storage::Postgres) -> Result<Self> {
        Self::over(Database::connect(location).await?).await
    }

    /// A store over `database`, whose tables it creates or brings up to date,
    /// scoring vectors with `pgvector` where it can.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the database refuses the schema.
    pub async fn over(database: Database) -> Result<Self> {
        Self::opened(database, true).await
    }

    /// A store that scores vectors in Rust on a server that has `pgvector`,
    /// so one database runs both paths.
    #[cfg(test)]
    pub(crate) async fn scoring_in_rust(location: &storage::Postgres) -> Result<Self> {
        Self::opened(Database::connect(location).await?, false).await
    }

    async fn opened(database: Database, pgvector: bool) -> Result<Self> {
        database.migrate(COMPONENT, STEPS).await?;
        let (vectors, iterative) = vectors(&database, pgvector).await?;
        Ok(Self {
            database,
            indexed: Arc::new(Mutex::new(HashSet::new())),
            iterative,
            vectors,
        })
    }

    /// How this store scores vectors.
    #[must_use]
    pub fn vectors(&self) -> &Vectors {
        &self.vectors
    }

    /// Creates the HNSW index for `embedding`'s model and length, where it
    /// is missing, so `nearest` for that model orders by the index. The
    /// index is partial, over that model's rows, and casts the column to the
    /// model's length, which an HNSW index needs.
    async fn index(
        &self,
        connection: &mut PgConnection,
        embedding: &Embedding,
    ) -> Result<Option<String>> {
        let Vectors::Pgvector(schema) = &self.vectors else {
            return Ok(None);
        };
        let dimensions = embedding.values.len();
        if dimensions > INDEXED {
            return Ok(None);
        }
        let name = index_name(&embedding.model, dimensions);
        if self.held(&name)? {
            return Ok(None);
        }
        let schema = identifier(schema);
        sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
            "CREATE INDEX IF NOT EXISTS {name} ON facts
             USING hnsw ((embedding_vector::{schema}.vector({dimensions})) {schema}.vector_cosine_ops)
             WHERE embedding_model = {model} AND {schema}.vector_dims(embedding_vector) = {dimensions}",
            model = literal(&embedding.model)?,
        )))
        .execute(&mut *connection)
        .await
        .map_err(storage_error)?;
        Ok(Some(name))
    }

    fn held(&self, index: &str) -> Result<bool> {
        Ok(self
            .indexed
            .lock()
            .map_err(|_| Error::Storage("a thread panicked while it held the index list".into()))?
            .contains(index))
    }

    /// Records an index once the transaction that made it has committed.
    fn made(&self, index: Option<String>) -> Result<()> {
        if let Some(index) = index {
            self.indexed
                .lock()
                .map_err(|_| {
                    Error::Storage("a thread panicked while it held the index list".into())
                })?
                .insert(index);
        }
        Ok(())
    }

    /// The facts embedded by `query`'s model, ordered by `<=>`.
    async fn nearest_by_pgvector(
        &self,
        schema: &str,
        query: &Embedding,
        scopes: &[Scope],
        most: usize,
    ) -> Result<Vec<(Fact, f32)>> {
        let schema = identifier(schema);
        let dimensions = query.values.len();
        // The model and length are written into the statement, so the
        // planner matches it with the partial index for them.
        let sql = format!(
            concat!(
                "SELECT ",
                fact_columns!(),
                ", (embedding_vector::{schema}.vector({dimensions}))
                     OPERATOR({schema}.<=>) $1::real[]::{schema}.vector({dimensions}) AS distance
                 FROM facts
                 WHERE superseded_by IS NULL
                   AND embedding_model = {model}
                   AND {schema}.vector_dims(embedding_vector) = {dimensions}
                   AND EXISTS (
                       SELECT 1 FROM unnest($2::text[], $3::text[]) AS readable (kind, name)
                       WHERE readable.kind = facts.scope
                         AND readable.name IS NOT DISTINCT FROM facts.scope_name
                   )
                 ORDER BY distance
                 LIMIT $4"
            ),
            dimensions = dimensions,
            model = literal(&query.model)?,
            schema = schema,
        );
        let mut transaction = self.database.begin().await?;
        if self.iterative {
            sqlx::raw_sql("SET LOCAL hnsw.iterative_scan = strict_order")
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
        }
        let rows = self
            .database
            .query(sqlx::AssertSqlSafe(sql))
            .bind(&query.values)
            .bind(scopes.iter().map(Scope::kind).collect::<Vec<_>>())
            .bind(scopes.iter().map(Scope::name).collect::<Vec<_>>())
            .bind(i64::try_from(most).unwrap_or(i64::MAX))
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let distances: Vec<f64> = rows
            .iter()
            .map(|row| row.try_get("distance").map_err(storage_error))
            .collect::<Result<_>>()?;
        let facts = self.read(&mut transaction, rows).await?;
        transaction.commit().await.map_err(storage_error)?;
        #[expect(
            clippy::cast_possible_truncation,
            reason = "a cosine, from -1 to 1, which an f32 holds"
        )]
        let ranked = facts
            .into_iter()
            .zip(distances)
            .map(|(fact, distance)| (fact, (1.0 - distance) as f32))
            .collect();
        Ok(ranked)
    }

    /// A transaction that holds the write lock.
    async fn write(&self) -> Result<sqlx::Transaction<'static, sqlx::Postgres>> {
        let mut transaction = self.database.begin().await?;
        self.database
            .query("SELECT pg_advisory_xact_lock($1)")
            .bind(WRITE_LOCK)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        Ok(transaction)
    }

    /// The narrowest scope of the episodes in `sources` the store holds.
    async fn scope_of(
        &self,
        connection: &mut PgConnection,
        sources: &[Id],
    ) -> Result<Option<Scope>> {
        let rows = self
            .database
            .query("SELECT scope, scope_name FROM episodes WHERE id = ANY($1::uuid[])")
            .bind(uuids(sources))
            .fetch_all(&mut *connection)
            .await
            .map_err(storage_error)?;
        let scopes = rows.iter().map(scope).collect::<Result<Vec<_>>>()?;
        Ok(Scope::narrowest(&scopes))
    }

    /// Marks the episodes `ids` as consolidated, where they are not already.
    async fn consolidate(&self, connection: &mut PgConnection, ids: &[uuid::Uuid]) -> Result<()> {
        self.database
            .query(
                "UPDATE episodes SET consolidated_at = $1
                 WHERE consolidated_at IS NULL AND id = ANY($2::uuid[])",
            )
            .bind(Utc::now())
            .bind(ids)
            .execute(&mut *connection)
            .await
            .map_err(storage_error)?;
        Ok(())
    }

    /// Every fact's supersession link, by id.
    async fn links(&self, connection: &mut PgConnection) -> Result<HashMap<Id, Option<Id>>> {
        let rows = self
            .database
            .query("SELECT id, superseded_by FROM facts")
            .fetch_all(&mut *connection)
            .await
            .map_err(storage_error)?;
        let mut links = HashMap::new();
        for row in rows {
            let next: Option<uuid::Uuid> = row.try_get("superseded_by").map_err(storage_error)?;
            links.insert(Id(row.try_get("id").map_err(storage_error)?), next.map(Id));
        }
        Ok(links)
    }

    /// Repoints every supersession link that leads to a fact in `doomed` past
    /// it, as [`crate::past`] does.
    async fn repoint(
        &self,
        connection: &mut PgConnection,
        doomed: &HashMap<Id, Option<Id>>,
    ) -> Result<()> {
        let links = self.links(&mut *connection).await?;
        for (id, next) in &links {
            if doomed.contains_key(id) {
                continue;
            }
            let after = crate::past(*next, doomed);
            if after != *next {
                self.database
                    .query("UPDATE facts SET superseded_by = $1 WHERE id = $2")
                    .bind(after.map(|id| id.0))
                    .bind(id.0)
                    .execute(&mut *connection)
                    .await
                    .map_err(storage_error)?;
            }
        }
        Ok(())
    }

    /// Forgets `episodes`, every fact that rests on them alone, and their
    /// edges, and returns the ids removed, episodes first.
    async fn forget_all(&self, episodes: Vec<uuid::Uuid>) -> Result<Vec<Id>> {
        let mut transaction = self.write().await?;
        let doomed: Vec<uuid::Uuid> = self
            .database
            .scalar(
                "SELECT id FROM facts
                 WHERE id IN (SELECT fact FROM sources WHERE episode = ANY($1::uuid[]))
                   AND id NOT IN (SELECT fact FROM sources WHERE NOT (episode = ANY($1::uuid[])))
                 ORDER BY seq",
            )
            .bind(&episodes)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let links = self.links(&mut transaction).await?;
        let doomed_links: HashMap<Id, Option<Id>> = doomed
            .iter()
            .map(|id| (Id(*id), links.get(&Id(*id)).copied().flatten()))
            .collect();
        self.repoint(&mut transaction, &doomed_links).await?;
        // The facts, the edges from what stays to what went, and the reverse
        // index over them with the rows.
        for sql in [
            "DELETE FROM facts WHERE id = ANY($1::uuid[])",
            "DELETE FROM sources WHERE episode = ANY($1::uuid[])",
            "DELETE FROM reinforcements WHERE episode = ANY($1::uuid[])",
            "DELETE FROM episodes WHERE id = ANY($1::uuid[])",
        ] {
            let ids = if sql.starts_with("DELETE FROM facts") {
                &doomed
            } else {
                &episodes
            };
            self.database
                .query(sql)
                .bind(ids)
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
        }
        transaction.commit().await.map_err(storage_error)?;
        Ok(episodes
            .iter()
            .chain(doomed.iter())
            .copied()
            .map(Id)
            .collect())
    }

    /// The facts `rows` hold, each with its sources and reinforcements.
    async fn read(&self, connection: &mut PgConnection, rows: Vec<PgRow>) -> Result<Vec<Fact>> {
        let ids: Vec<uuid::Uuid> = rows
            .iter()
            .map(|row| row.try_get("id").map_err(storage_error))
            .collect::<Result<_>>()?;
        let mut sources: HashMap<uuid::Uuid, Vec<Id>> = HashMap::new();
        for row in self
            .database
            .query(
                "SELECT fact, episode FROM sources WHERE fact = ANY($1::uuid[])
                 ORDER BY fact, position",
            )
            .bind(&ids)
            .fetch_all(&mut *connection)
            .await
            .map_err(storage_error)?
        {
            let fact: uuid::Uuid = row.try_get("fact").map_err(storage_error)?;
            let episode: uuid::Uuid = row.try_get("episode").map_err(storage_error)?;
            sources.entry(fact).or_default().push(Id(episode));
        }
        let mut reinforced: HashMap<uuid::Uuid, Vec<Id>> = HashMap::new();
        for row in self
            .database
            .query(
                "SELECT fact, episode FROM reinforcements WHERE fact = ANY($1::uuid[])
                 ORDER BY seq",
            )
            .bind(&ids)
            .fetch_all(&mut *connection)
            .await
            .map_err(storage_error)?
        {
            let fact: uuid::Uuid = row.try_get("fact").map_err(storage_error)?;
            let episode: uuid::Uuid = row.try_get("episode").map_err(storage_error)?;
            reinforced.entry(fact).or_default().push(Id(episode));
        }
        rows.iter()
            .map(|row| {
                let id: uuid::Uuid = row.try_get("id").map_err(storage_error)?;
                let superseded_by: Option<uuid::Uuid> =
                    row.try_get("superseded_by").map_err(storage_error)?;
                let node: Option<uuid::Uuid> = row.try_get("node").map_err(storage_error)?;
                let values: Option<Vec<f32>> = row.try_get("embedding").map_err(storage_error)?;
                let model: Option<String> =
                    row.try_get("embedding_model").map_err(storage_error)?;
                Ok(Fact {
                    confidence: row.try_get("confidence").map_err(storage_error)?,
                    content: row.try_get("content").map_err(storage_error)?,
                    derived_from: sources.remove(&id).unwrap_or_default(),
                    embedding: values
                        .zip(model)
                        .map(|(values, model)| Embedding::new(model, values)),
                    id: Id(id),
                    node: node.map(Id),
                    reinforced_by: reinforced.remove(&id).unwrap_or_default(),
                    scope: scope(row)?,
                    superseded_by: superseded_by.map(Id),
                    updated_at: row.try_get("updated_at").map_err(storage_error)?,
                })
            })
            .collect()
    }

    /// The facts `sql` selects, read in one transaction.
    async fn facts_where(&self, sql: &'static str) -> Result<Vec<Fact>> {
        let mut transaction = self.database.begin().await?;
        let rows = self
            .database
            .query(sql)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let facts = self.read(&mut transaction, rows).await?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(facts)
    }

    /// The episodes `sql` selects, read in one transaction.
    async fn episodes_where(&self, sql: &'static str) -> Result<Vec<Episode>> {
        let mut transaction = self.database.begin().await?;
        let rows = self
            .database
            .query(sql)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        rows.iter().map(episode).collect()
    }

    /// The ids of the episodes `sql` selects with `id` bound.
    async fn ids_where(&self, sql: &'static str, id: Id) -> Result<Vec<uuid::Uuid>> {
        let mut transaction = self.database.begin().await?;
        let ids = self
            .database
            .scalar(sql)
            .bind(id.0)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(ids)
    }
}

#[async_trait]
impl Store for Postgres {
    async fn record(&self, episode: &Episode) -> Result<()> {
        let mut transaction = self.database.begin().await?;
        self.database
            .query(
                "INSERT INTO episodes (id, trace, node, occurred_at, content, scope, scope_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)",
            )
            .bind(episode.id.0)
            .bind(episode.trace_id.0)
            .bind(episode.node.map(|node| node.0))
            .bind(episode.occurred_at)
            .bind(&episode.content)
            .bind(episode.scope.kind())
            .bind(episode.scope.name())
            .execute(&mut *transaction)
            .await
            .map_err(|error| match error {
                sqlx::Error::Database(database) if database.is_unique_violation() => {
                    Error::Storage(format!("episode {} is already held", episode.id))
                }
                other => storage_error(other),
            })?;
        transaction.commit().await.map_err(storage_error)
    }

    async fn assert_fact(&self, fact: &Fact, supersedes: Option<Id>) -> Result<()> {
        super::checked(fact)?;
        let mut transaction = self.write().await?;
        if let Some(old) = supersedes {
            let links = self.links(&mut transaction).await?;
            if let Some(head) = super::head(&links, old) {
                self.database
                    .query("UPDATE facts SET superseded_by = $1 WHERE id = $2")
                    .bind(fact.id.0)
                    .bind(head.0)
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage_error)?;
            }
        }
        let scope = self
            .scope_of(&mut transaction, &fact.derived_from)
            .await?
            .unwrap_or_else(|| fact.scope.clone());
        self.database
            .query(
                "INSERT INTO facts
                     (id, content, confidence, embedding, embedding_model, superseded_by,
                      updated_at, scope, scope_name, node)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            )
            .bind(fact.id.0)
            .bind(&fact.content)
            .bind(fact.confidence)
            .bind(fact.embedding.as_ref().map(|embedding| &embedding.values))
            .bind(fact.embedding.as_ref().map(|embedding| &embedding.model))
            .bind(fact.superseded_by.map(|id| id.0))
            .bind(fact.updated_at)
            .bind(scope.kind())
            .bind(scope.name())
            .bind(fact.node.map(|node| node.0))
            .execute(&mut *transaction)
            .await
            .map_err(|error| match error {
                sqlx::Error::Database(database) if database.is_unique_violation() => {
                    Error::Storage(format!("fact {} is already held", fact.id))
                }
                other => storage_error(other),
            })?;
        self.database
            .query(
                "INSERT INTO sources (fact, position, episode)
                 SELECT $1, (place - 1)::integer, episode
                 FROM unnest($2::uuid[]) WITH ORDINALITY AS listed (episode, place)",
            )
            .bind(fact.id.0)
            .bind(uuids(&fact.derived_from))
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        for episode in &fact.reinforced_by {
            self.database
                .query(
                    "INSERT INTO reinforcements (fact, episode) VALUES ($1, $2)
                     ON CONFLICT DO NOTHING",
                )
                .bind(fact.id.0)
                .bind(episode.0)
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
        }
        let index = match &fact.embedding {
            Some(embedding) => self.index(&mut transaction, embedding).await?,
            None => None,
        };
        transaction.commit().await.map_err(storage_error)?;
        self.made(index)
    }

    async fn set_embedding(&self, fact: Id, embedding: &Embedding) -> Result<bool> {
        embedding.check()?;
        // The write lock, so two stores never create one index at once.
        let mut transaction = self.write().await?;
        let set = self
            .database
            .query("UPDATE facts SET embedding = $1, embedding_model = $2 WHERE id = $3")
            .bind(&embedding.values)
            .bind(&embedding.model)
            .bind(fact.0)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let index = self.index(&mut transaction, embedding).await?;
        transaction.commit().await.map_err(storage_error)?;
        self.made(index)?;
        Ok(set.rows_affected() > 0)
    }

    async fn nearest(
        &self,
        query: &Embedding,
        scopes: &[Scope],
        most: usize,
    ) -> Result<Vec<(Fact, f32)>> {
        if query.check().is_err() || most == 0 || scopes.is_empty() {
            return Ok(Vec::new());
        }
        if let Vectors::Pgvector(schema) = &self.vectors {
            return self.nearest_by_pgvector(schema, query, scopes, most).await;
        }
        let mut transaction = self.database.begin().await?;
        let rows = self
            .database
            .query(concat!(
                "SELECT ",
                fact_columns!(),
                " FROM facts
                 WHERE superseded_by IS NULL AND embedding_model = $1 AND cardinality(embedding) = $2
                 ORDER BY seq"
            ))
            .bind(&query.model)
            .bind(i32::try_from(query.values.len()).map_err(storage_error)?)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let facts = self.read(&mut transaction, rows).await?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(crate::nearest(facts, query, scopes, most))
    }

    async fn supersede(&self, old: Id, new: Id) -> Result<bool> {
        let mut transaction = self.write().await?;
        let links = self.links(&mut transaction).await?;
        let (Some(head), Some(target)) = (super::head(&links, old), super::head(&links, new))
        else {
            return Ok(false);
        };
        if head == target {
            return Ok(false);
        }
        self.database
            .query("UPDATE facts SET superseded_by = $1 WHERE id = $2")
            .bind(target.0)
            .bind(head.0)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(true)
    }

    async fn facts(&self) -> Result<Vec<Fact>> {
        self.facts_where(concat!(
            "SELECT ",
            fact_columns!(),
            " FROM facts ORDER BY seq"
        ))
        .await
    }

    async fn reinforce(&self, fact: Id, episode: Id) -> Result<bool> {
        let mut transaction = self.write().await?;
        let links = self.links(&mut transaction).await?;
        let Some(head) = super::head(&links, fact) else {
            return Ok(false);
        };
        let sourced: bool = self
            .database
            .scalar("SELECT EXISTS (SELECT 1 FROM sources WHERE fact = $1 AND episode = $2)")
            .bind(head.0)
            .bind(episode.0)
            .fetch_one(&mut *transaction)
            .await
            .map_err(storage_error)?;
        if !sourced {
            self.database
                .query(
                    "INSERT INTO reinforcements (fact, episode) VALUES ($1, $2)
                     ON CONFLICT DO NOTHING",
                )
                .bind(head.0)
                .bind(episode.0)
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
        }
        self.database
            .query("UPDATE facts SET updated_at = $1 WHERE id = $2")
            .bind(Utc::now())
            .bind(head.0)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(true)
    }

    async fn add_source(&self, fact: Id, episode: Id, node: Option<Id>) -> Result<bool> {
        let mut transaction = self.write().await?;
        let links = self.links(&mut transaction).await?;
        let Some(head) = super::head(&links, fact) else {
            return Ok(false);
        };
        let sourced: bool = self
            .database
            .scalar("SELECT EXISTS (SELECT 1 FROM sources WHERE fact = $1 AND episode = $2)")
            .bind(head.0)
            .bind(episode.0)
            .fetch_one(&mut *transaction)
            .await
            .map_err(storage_error)?;
        if !sourced {
            self.database
                .query(
                    "INSERT INTO sources (fact, position, episode)
                     SELECT $1, COALESCE(MAX(position) + 1, 0), $2 FROM sources WHERE fact = $1",
                )
                .bind(head.0)
                .bind(episode.0)
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
        }
        self.database
            .query("DELETE FROM reinforcements WHERE fact = $1 AND episode = $2")
            .bind(head.0)
            .bind(episode.0)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let row = self
            .database
            .query("SELECT scope, scope_name FROM facts WHERE id = $1")
            .bind(head.0)
            .fetch_one(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let before = scope(&row)?;
        let added = self.scope_of(&mut transaction, &[episode]).await?;
        let narrowed = added
            .and_then(|added| Scope::narrowest([&before, &added]))
            .unwrap_or(before);
        self.database
            .query(
                "UPDATE facts SET scope = $1, scope_name = $2, node = COALESCE($3, node),
                     updated_at = $4
                 WHERE id = $5",
            )
            .bind(narrowed.kind())
            .bind(narrowed.name())
            .bind(node.map(|node| node.0))
            .bind(Utc::now())
            .bind(head.0)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(true)
    }

    async fn mark_consolidated(&self, episodes: &[Id]) -> Result<()> {
        let mut transaction = self.database.begin().await?;
        self.consolidate(&mut transaction, &uuids(episodes)).await?;
        transaction.commit().await.map_err(storage_error)
    }

    async fn current_facts(&self) -> Result<Vec<Fact>> {
        self.facts_where(concat!(
            "SELECT ",
            fact_columns!(),
            " FROM facts WHERE superseded_by IS NULL ORDER BY confidence DESC, seq"
        ))
        .await
    }

    async fn episodes(&self) -> Result<Vec<Episode>> {
        self.episodes_where("SELECT * FROM episodes ORDER BY seq")
            .await
    }

    async fn unconsolidated(&self) -> Result<Vec<Episode>> {
        self.episodes_where(
            "SELECT * FROM episodes
             WHERE consolidated_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM sources WHERE sources.episode = episodes.id)
               AND NOT EXISTS (
                   SELECT 1 FROM reinforcements WHERE reinforcements.episode = episodes.id
               )
             ORDER BY seq",
        )
        .await
    }

    async fn forget(&self, trace: Id) -> Result<Vec<Id>> {
        let episodes = self
            .ids_where(
                "SELECT id FROM episodes WHERE trace = $1 ORDER BY seq",
                trace,
            )
            .await?;
        self.forget_all(episodes).await
    }

    async fn forget_episode(&self, episode: Id) -> Result<Vec<Id>> {
        let episodes = self
            .ids_where("SELECT id FROM episodes WHERE id = $1", episode)
            .await?;
        self.forget_all(episodes).await
    }

    async fn delete_fact(&self, fact: Id) -> Result<bool> {
        let mut transaction = self.write().await?;
        let links = self.links(&mut transaction).await?;
        let Some(next) = links.get(&fact) else {
            return Ok(false);
        };
        let sources: Vec<uuid::Uuid> = self
            .database
            .scalar("SELECT episode FROM sources WHERE fact = $1")
            .bind(fact.0)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        self.repoint(&mut transaction, &HashMap::from([(fact, *next)]))
            .await?;
        self.database
            .query("DELETE FROM facts WHERE id = $1")
            .bind(fact.0)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        self.consolidate(&mut transaction, &sources).await?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(true)
    }
}
