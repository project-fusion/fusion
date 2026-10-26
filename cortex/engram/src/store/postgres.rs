//! Memory in Postgres.

use std::collections::HashMap;

use async_trait::async_trait;
use chrono::Utc;
use fusion_cortex_core::{postgres::Database, storage, Error, Id, Result};
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

/// The schema, a step at a time. A released step is never edited, and a
/// change is a new step at the end.
const STEPS: &[&str] = &[MEMORY];

/// The name the schema's version is recorded under.
const COMPONENT: &str = "engram";

/// The advisory lock every write that reads first holds, as `SQLite`'s
/// `BEGIN IMMEDIATE` takes its write lock, so a lineage is read and changed
/// by one writer at a time.
const WRITE_LOCK: i64 = 0x656e_6772_616d;

/// Memory in a Postgres database.
///
/// [`Postgres::open`] takes a `postgres://` URL, and
/// [`fusion_cortex_core::storage`] says how it reads one, with the setting for
/// a transaction-mode pooler.
#[derive(Clone, Debug)]
pub struct Postgres {
    database: Database,
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

    /// A store over `database`, whose tables it creates or brings up to date.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the database refuses the schema.
    pub async fn over(database: Database) -> Result<Self> {
        database.migrate(COMPONENT, STEPS).await?;
        Ok(Self { database })
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
                Ok(Fact {
                    confidence: row.try_get("confidence").map_err(storage_error)?,
                    content: row.try_get("content").map_err(storage_error)?,
                    derived_from: sources.remove(&id).unwrap_or_default(),
                    embedding: row.try_get("embedding").map_err(storage_error)?,
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
                     (id, content, confidence, embedding, superseded_by, updated_at, scope, scope_name, node)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            )
            .bind(fact.id.0)
            .bind(&fact.content)
            .bind(fact.confidence)
            .bind(fact.embedding.as_ref())
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
        transaction.commit().await.map_err(storage_error)
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
        self.facts_where("SELECT * FROM facts ORDER BY seq").await
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
        self.facts_where(
            "SELECT * FROM facts WHERE superseded_by IS NULL ORDER BY confidence DESC, seq",
        )
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
