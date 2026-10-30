//! Traces in Postgres.

use std::collections::HashMap;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use fusion_cortex_core::{postgres::Database, storage, Error, Id, Result};
use sqlx::{postgres::PgRow, Row};

use super::{Store, Summary};
use crate::{
    search::{Page, Search},
    Detail, Graph, Node, NodeKind,
};

/// The nodes and their edges.
///
/// **They match the `SQLite` tables column for column**, with two changes.
/// Ids are `uuid` and times `timestamptz`, which keeps them to the
/// microsecond. A node's kind is a column, written from its typed [`Detail`]
/// by the statement that writes the node, where `SQLite` indexes the JSON: the
/// detail is the JSON as text, since `jsonb` refuses the `\u0000` a tool's
/// output can hold, and an index on text read as JSON would fail on it too.
const NODES: &str = "
    CREATE TABLE IF NOT EXISTS nodes (
        id UUID PRIMARY KEY,
        trace UUID NOT NULL,
        kind TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        detail TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS nodes_by_trace ON nodes (trace, id);
    CREATE INDEX IF NOT EXISTS nodes_by_kind ON nodes (kind, id);
    CREATE TABLE IF NOT EXISTS edges (
        child UUID NOT NULL REFERENCES nodes (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        parent UUID NOT NULL,
        PRIMARY KEY (child, position)
    );
    CREATE INDEX IF NOT EXISTS edges_by_parent ON edges (parent);
";

/// The schema, a step at a time. A released step is never edited, and a
/// change is a new step at the end.
const STEPS: &[&str] = &[NODES, crate::search::postgres::SCHEMA];

/// The name the schema's version is recorded under.
const COMPONENT: &str = "trace";

/// Traces in a Postgres database.
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

/// `kind`'s name, as a node's detail tags it.
fn named(kind: NodeKind) -> Result<String> {
    match serde_json::to_value(kind).map_err(storage_error)? {
        serde_json::Value::String(named) => Ok(named),
        other => Err(storage_error(format!("{other} is not a kind's name"))),
    }
}

fn node(row: &PgRow, parents: Vec<Id>) -> Result<Node> {
    let detail: String = row.try_get("detail").map_err(storage_error)?;
    Ok(Node {
        created_at: row.try_get("created_at").map_err(storage_error)?,
        detail: serde_json::from_str::<Detail>(&detail).map_err(storage_error)?,
        derived_from: parents,
        id: Id(row.try_get("id").map_err(storage_error)?),
    })
}

/// Each child's parents in `edges`, in their order.
fn parents(edges: &[PgRow]) -> Result<HashMap<uuid::Uuid, Vec<Id>>> {
    let mut parents: HashMap<uuid::Uuid, Vec<Id>> = HashMap::new();
    for edge in edges {
        let child: uuid::Uuid = edge.try_get("child").map_err(storage_error)?;
        let parent: uuid::Uuid = edge.try_get("parent").map_err(storage_error)?;
        parents.entry(child).or_default().push(Id(parent));
    }
    Ok(parents)
}

/// The advisory lock a trace's appends hold, so two writers of one trace do
/// not both index a message as its first saying.
fn lock(trace: Id) -> i64 {
    let (_, low) = trace.0.as_u64_pair();
    i64::from_ne_bytes(low.to_ne_bytes())
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
}

#[async_trait]
impl Store for Postgres {
    async fn append(&self, trace: Id, node: &Node) -> Result<()> {
        let detail = serde_json::to_string(&node.detail).map_err(storage_error)?;
        let database = &self.database;
        let mut transaction = database.begin().await?;
        database
            .query("SELECT pg_advisory_xact_lock($1)")
            .bind(lock(trace))
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        database
            .query(
                "INSERT INTO nodes (id, trace, kind, created_at, detail)
                 VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(node.id.0)
            .bind(trace.0)
            .bind(named(node.kind())?)
            .bind(node.created_at)
            .bind(detail)
            .execute(&mut *transaction)
            .await
            .map_err(|error| match error {
                sqlx::Error::Database(database) if database.is_unique_violation() => {
                    Error::Storage(format!("node {} is already held", node.id))
                }
                other => storage_error(other),
            })?;
        let parents: Vec<uuid::Uuid> = node.derived_from.iter().map(|parent| parent.0).collect();
        database
            .query(
                "INSERT INTO edges (child, position, parent)
                 SELECT $1, (place - 1)::integer, parent
                 FROM unnest($2::uuid[]) WITH ORDINALITY AS listed (parent, place)",
            )
            .bind(node.id.0)
            .bind(parents)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        crate::search::postgres::index(database, &mut transaction, trace, node).await?;
        transaction.commit().await.map_err(storage_error)
    }

    async fn load(&self, trace: Id) -> Result<Graph> {
        let database = &self.database;
        let mut transaction = database.begin().await?;
        let rows = database
            .query("SELECT id, created_at, detail FROM nodes WHERE trace = $1 ORDER BY id")
            .bind(trace.0)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let edges = database
            .query(
                "SELECT edges.child, edges.parent FROM edges
                 JOIN nodes ON nodes.id = edges.child
                 WHERE nodes.trace = $1 ORDER BY edges.child, edges.position",
            )
            .bind(trace.0)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        let mut parents = parents(&edges)?;
        let mut graph = Graph::new();
        for row in &rows {
            let id: uuid::Uuid = row.try_get("id").map_err(storage_error)?;
            graph.insert(node(row, parents.remove(&id).unwrap_or_default())?);
        }
        Ok(graph)
    }

    async fn traces(&self) -> Result<Vec<Summary>> {
        let database = &self.database;
        let mut transaction = database.begin().await?;
        let rows = database
            .query(
                "SELECT DISTINCT ON (trace) trace, id, created_at, detail,
                     count(*) OVER (PARTITION BY trace) AS count
                 FROM nodes ORDER BY trace DESC, id",
            )
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        rows.iter()
            .map(|row| {
                let first = node(row, Vec::new())?;
                let count: i64 = row.try_get("count").map_err(storage_error)?;
                Ok(Summary {
                    created_at: first.created_at,
                    first: Some(first),
                    id: Id(row.try_get("trace").map_err(storage_error)?),
                    nodes: usize::try_from(count).map_err(storage_error)?,
                })
            })
            .collect()
    }

    async fn nodes_of(
        &self,
        kinds: &[NodeKind],
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<(Id, Node)>> {
        if kinds.is_empty() {
            return Ok(Vec::new());
        }
        let named = kinds
            .iter()
            .map(|kind| named(*kind))
            .collect::<Result<Vec<String>>>()?;
        let filter = "nodes.kind = ANY($1::text[])
                      AND ($2::timestamptz IS NULL OR nodes.created_at >= $2)";
        let database = &self.database;
        let mut transaction = database.begin().await?;
        let rows = database
            .query(sqlx::AssertSqlSafe(format!(
                "SELECT nodes.trace, nodes.id, nodes.created_at, nodes.detail FROM nodes
                 WHERE {filter} ORDER BY nodes.id"
            )))
            .bind(&named)
            .bind(since)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let edges = database
            .query(sqlx::AssertSqlSafe(format!(
                "SELECT edges.child, edges.parent FROM edges
                 JOIN nodes ON nodes.id = edges.child
                 WHERE {filter} ORDER BY edges.child, edges.position"
            )))
            .bind(&named)
            .bind(since)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        let mut parents = parents(&edges)?;
        rows.iter()
            .map(|row| {
                let id: uuid::Uuid = row.try_get("id").map_err(storage_error)?;
                Ok((
                    Id(row.try_get("trace").map_err(storage_error)?),
                    node(row, parents.remove(&id).unwrap_or_default())?,
                ))
            })
            .collect()
    }

    async fn node(&self, id: Id) -> Result<Option<(Id, Node)>> {
        let database = &self.database;
        let mut transaction = database.begin().await?;
        let row = database
            .query("SELECT trace, id, created_at, detail FROM nodes WHERE id = $1")
            .bind(id.0)
            .fetch_optional(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let edges = database
            .query("SELECT child, parent FROM edges WHERE child = $1 ORDER BY position")
            .bind(id.0)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        let Some(row) = row else {
            return Ok(None);
        };
        let held = parents(&edges)?.remove(&id.0).unwrap_or_default();
        Ok(Some((
            Id(row.try_get("trace").map_err(storage_error)?),
            node(&row, held)?,
        )))
    }

    async fn nodes(&self, ids: &[Id]) -> Result<Vec<(Id, Node)>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let listed: Vec<uuid::Uuid> = ids.iter().map(|id| id.0).collect();
        let database = &self.database;
        let mut transaction = database.begin().await?;
        let rows = database
            .query(
                "SELECT trace, id, created_at, detail FROM nodes
                 WHERE id = ANY($1::uuid[]) ORDER BY id",
            )
            .bind(&listed)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let edges = database
            .query(
                "SELECT child, parent FROM edges
                 WHERE child = ANY($1::uuid[]) ORDER BY child, position",
            )
            .bind(&listed)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        let mut parents = parents(&edges)?;
        rows.iter()
            .map(|row| {
                let id: uuid::Uuid = row.try_get("id").map_err(storage_error)?;
                Ok((
                    Id(row.try_get("trace").map_err(storage_error)?),
                    node(row, parents.remove(&id).unwrap_or_default())?,
                ))
            })
            .collect()
    }

    async fn find(&self, search: &Search) -> Result<Page> {
        crate::search::postgres::find(&self.database, search).await
    }

    async fn title(&self, trace: Id, title: Option<&str>) -> Result<()> {
        crate::search::postgres::title(&self.database, trace, title).await
    }

    async fn delete_cascade(&self, id: Id) -> Result<Vec<Id>> {
        let database = &self.database;
        let mut transaction = database.begin().await?;
        // A node's entries go with it by their foreign key.
        let rows = database
            .query(
                "WITH RECURSIVE doomed (id) AS (
                     SELECT $1::uuid
                     UNION
                     SELECT edges.child FROM edges JOIN doomed ON edges.parent = doomed.id
                 )
                 DELETE FROM nodes USING doomed WHERE nodes.id = doomed.id
                 RETURNING nodes.id, nodes.trace",
            )
            .bind(id.0)
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let mut removed = Vec::with_capacity(rows.len());
        let mut traces = Vec::new();
        for row in &rows {
            removed.push(Id(row.try_get("id").map_err(storage_error)?));
            traces.push(
                row.try_get::<uuid::Uuid, _>("trace")
                    .map_err(storage_error)?,
            );
        }
        // Edges from survivors to what was removed go too, as they do in
        // `Graph::delete_cascade`, and a trace's title goes with its last
        // node.
        let gone: Vec<uuid::Uuid> = removed.iter().map(|id| id.0).collect();
        database
            .query("DELETE FROM edges WHERE parent = ANY($1::uuid[])")
            .bind(&gone)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        database
            .query(
                "DELETE FROM search_entries AS entry
                 WHERE entry.kind = 'title' AND entry.trace = ANY($1::uuid[])
                     AND NOT EXISTS (SELECT 1 FROM nodes WHERE nodes.trace = entry.trace)",
            )
            .bind(&traces)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)?;
        Ok(removed)
    }
}
