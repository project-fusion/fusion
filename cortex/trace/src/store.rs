//! Where traces are kept: one trait, an in-memory reference, and `SQLite`.
//!
//! **A store holds many traces, each named by an id**, such as an agent
//! session's. A node is appended once and never changed, which is what lets a
//! trace serve as an event log: a loop that restarts loads its trace and
//! continues from the last node.
//!
//! **Deletion crosses traces.** A session that read a node from another
//! session's trace derives from it, so deleting that node removes what it fed
//! in both.
//!
//! [`InMemory`] is the reference, and every backend passes the same
//! conformance suite. Postgres joins it behind the same trait.

use std::{
    collections::{HashMap, HashSet},
    sync::Mutex,
};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use fusion_cortex_core::{Error, Id, Result};

use crate::{
    search::{Entry, Kind, Page, Scored, Search},
    Graph, Node, NodeKind,
};

/// One trace a store holds.
#[derive(Clone, Debug)]
pub struct Summary {
    pub created_at: DateTime<Utc>,
    /// The trace's first node, such as a session's task.
    pub first: Option<Node>,
    pub id: Id,
    pub nodes: usize,
}

/// Keeps traces.
#[async_trait]
pub trait Store: Send + Sync {
    /// Appends `node` to the trace named `trace`, creating the trace with its
    /// first node.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if a node with this id is already held, or the
    /// backend fails.
    async fn append(&self, trace: Id, node: &Node) -> Result<()>;

    /// Every node of a trace, as a graph. A trace the store does not hold is
    /// an empty graph.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn load(&self, trace: Id) -> Result<Graph>;

    /// Every trace held, newest first.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn traces(&self) -> Result<Vec<Summary>>;

    /// Every node of the kinds in `kinds`, in every trace, each with the
    /// trace it is in, in the order the nodes were written. With `since`, only
    /// the nodes made at or after it. A reader that sums across traces, such
    /// as what every session spent, reads them in one pass.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn nodes_of(
        &self,
        kinds: &[NodeKind],
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<(Id, Node)>>;

    /// The page of traces `search` finds, best first, each with its best
    /// matching entries and how many matched, and how many traces matched in
    /// all. [`crate::search`] says what an entry is and how a query matches
    /// one. A search that could match nothing finds nothing.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn find(&self, search: &Search) -> Result<Page>;

    /// Sets the title a search finds `trace` by, or takes it away. A trace
    /// the store does not hold is given none, and a trace's title goes when
    /// its last node does.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn title(&self, trace: Id, title: Option<&str>) -> Result<()>;

    /// Deletes `id` and every node derived from it, in any trace, and returns
    /// the ids removed.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn delete_cascade(&self, id: Id) -> Result<Vec<Id>>;

    /// Deletes a whole trace, and every node in other traces derived from
    /// it, and returns the ids removed.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the backend fails.
    async fn forget(&self, trace: Id) -> Result<Vec<Id>> {
        let ids: Vec<Id> = self
            .load(trace)
            .await?
            .nodes()
            .map(|node| node.id)
            .collect();
        let mut removed = Vec::new();
        for id in ids {
            removed.extend(self.delete_cascade(id).await?);
        }
        Ok(removed)
    }
}

/// Each trace's title, and when it was set.
type Titles = HashMap<Id, (DateTime<Utc>, String)>;

/// The reference store, held in memory.
#[derive(Debug, Default)]
pub struct InMemory {
    traces: Mutex<HashMap<Id, Vec<Node>>>,
    titles: Mutex<Titles>,
}

impl InMemory {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, HashMap<Id, Vec<Node>>>> {
        self.traces
            .lock()
            .map_err(|_| Error::Storage("a thread panicked while it held the store".into()))
    }

    fn titles(&self) -> Result<std::sync::MutexGuard<'_, Titles>> {
        self.titles
            .lock()
            .map_err(|_| Error::Storage("a thread panicked while it held the store".into()))
    }

    /// Every entry a search can find, as the index holds them: each node's,
    /// each message where it was first said in its trace, and each title.
    fn indexed(&self, search: &Search) -> Result<Vec<Scored>> {
        let traces = self.lock()?;
        let titles = self.titles()?;
        let mut held = Vec::new();
        for (trace, nodes) in traces.iter() {
            let mut said = HashSet::new();
            let entries = nodes.iter().flat_map(|node| {
                crate::search::entries(&node.detail)
                    .into_iter()
                    .map(move |entry| (Some(node.id), node.created_at, entry))
            });
            let named = titles.get(trace).map(|(at, text)| {
                let entry = Entry {
                    kind: Kind::Title,
                    text: text.clone(),
                };
                (None, *at, entry)
            });
            for (order, (node, at, entry)) in entries.chain(named).enumerate() {
                if entry.kind == Kind::Message && !said.insert(entry.text.clone()) {
                    continue;
                }
                held.push(Scored {
                    at,
                    kind: entry.kind,
                    node,
                    order,
                    score: crate::search::relevance(&entry.text, &search.query)
                        * crate::search::weight(at, search.now),
                    text: entry.text,
                    trace: *trace,
                });
            }
        }
        Ok(held)
    }
}

#[async_trait]
impl Store for InMemory {
    async fn append(&self, trace: Id, node: &Node) -> Result<()> {
        let mut traces = self.lock()?;
        if traces.values().flatten().any(|held| held.id == node.id) {
            return Err(Error::Storage(format!("node {} is already held", node.id)));
        }
        traces.entry(trace).or_default().push(node.clone());
        Ok(())
    }

    async fn load(&self, trace: Id) -> Result<Graph> {
        let traces = self.lock()?;
        let mut graph = Graph::new();
        for node in traces.get(&trace).into_iter().flatten() {
            graph.insert(node.clone());
        }
        Ok(graph)
    }

    async fn traces(&self) -> Result<Vec<Summary>> {
        let traces = self.lock()?;
        let mut summaries: Vec<Summary> = traces
            .iter()
            .filter(|(_, nodes)| !nodes.is_empty())
            .map(|(id, nodes)| Summary {
                created_at: nodes[0].created_at,
                first: nodes.first().cloned(),
                id: *id,
                nodes: nodes.len(),
            })
            .collect();
        summaries.sort_by_key(|summary| std::cmp::Reverse(summary.id));
        Ok(summaries)
    }

    async fn nodes_of(
        &self,
        kinds: &[NodeKind],
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<(Id, Node)>> {
        let traces = self.lock()?;
        let mut found: Vec<(Id, Node)> = traces
            .iter()
            .flat_map(|(trace, nodes)| nodes.iter().map(move |node| (*trace, node)))
            .filter(|(_, node)| kinds.contains(&node.kind()))
            .filter(|(_, node)| since.is_none_or(|since| node.created_at >= since))
            .map(|(trace, node)| (trace, node.clone()))
            .collect();
        found.sort_by_key(|(_, node)| node.id);
        Ok(found)
    }

    async fn find(&self, search: &Search) -> Result<Page> {
        if search.finds_nothing() {
            return Ok(Page::default());
        }
        let matched = self
            .indexed(search)?
            .into_iter()
            .filter(|one| search.kinds.contains(&one.kind))
            .filter(|one| {
                search
                    .within
                    .as_ref()
                    .is_none_or(|within| within.contains(&one.trace))
            })
            .filter(|one| crate::search::holds(&one.text, &search.query))
            .collect();
        Ok(crate::search::paged(matched, search))
    }

    async fn title(&self, trace: Id, title: Option<&str>) -> Result<()> {
        let held = self
            .lock()?
            .get(&trace)
            .is_some_and(|nodes| !nodes.is_empty());
        let mut titles = self.titles()?;
        match title.and_then(|title| crate::search::indexed(Kind::Title, title)) {
            Some(text) if held => {
                titles.insert(trace, (Utc::now(), text));
            }
            _ => {
                titles.remove(&trace);
            }
        }
        Ok(())
    }

    async fn delete_cascade(&self, id: Id) -> Result<Vec<Id>> {
        let mut traces = self.lock()?;
        // The graph across every trace, so a cascade follows edges between
        // them.
        let mut all = Graph::new();
        for node in traces.values().flatten() {
            all.insert(node.clone());
        }
        let removed = all.delete_cascade(id);
        let gone: HashSet<Id> = removed.iter().copied().collect();
        for nodes in traces.values_mut() {
            nodes.retain(|node| !gone.contains(&node.id));
            for node in nodes.iter_mut() {
                node.derived_from.retain(|parent| !gone.contains(parent));
            }
        }
        traces.retain(|_, nodes| !nodes.is_empty());
        self.titles()?.retain(|trace, _| traces.contains_key(trace));
        Ok(removed)
    }
}

#[cfg(feature = "sqlite")]
pub use sqlite::Sqlite;

#[cfg(feature = "sqlite")]
mod sqlite {
    use std::{collections::HashSet, path::Path, str::FromStr};

    use async_trait::async_trait;
    use chrono::{DateTime, Utc};
    use fusion_cortex_core::{Error, Id, Result};
    use sqlx::{
        sqlite::{SqliteConnectOptions, SqlitePoolOptions},
        Row, SqlitePool,
    };

    use super::{Store, Summary};
    use crate::{
        search::{Page, Search},
        Detail, Graph, Node, NodeKind,
    };

    /// A node is a row, its detail is the JSON of its typed [`Detail`], and
    /// each edge is a row of its own so a cascade can follow edges in SQL.
    const SCHEMA: &str = "
        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            trace TEXT NOT NULL,
            created_at TEXT NOT NULL,
            detail TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS nodes_by_trace ON nodes (trace, id);
        -- A reader of one kind across every trace, such as every session's
        -- task, reads only those nodes: without it, the 1,003 tasks of a
        -- seeded 530 MB store took 270 ms to find, every node read.
        CREATE INDEX IF NOT EXISTS nodes_by_kind ON nodes (json_extract(detail, '$.kind'));
        CREATE TABLE IF NOT EXISTS edges (
            child TEXT NOT NULL REFERENCES nodes (id) ON DELETE CASCADE,
            position INTEGER NOT NULL,
            parent TEXT NOT NULL,
            PRIMARY KEY (child, position)
        );
        CREATE INDEX IF NOT EXISTS edges_by_parent ON edges (parent);
    ";

    /// Traces in a `SQLite` database.
    ///
    /// ```
    /// # use fusion_cortex_core::Id;
    /// # use fusion_cortex_trace::{store::{Sqlite, Store}, Detail, Node};
    /// # #[tokio::main]
    /// # async fn main() {
    /// let store = Sqlite::in_memory().await.unwrap();
    /// let session = Id::new();
    /// let task = Node::new(
    ///     Detail::Task {
    ///         checks: vec!["bun test checkout".into()],
    ///         goal: "fix the flaky checkout test".into(),
    ///         project: None,
    ///         revision: None,
    ///     },
    ///     vec![],
    /// );
    ///
    /// store.append(session, &task).await.unwrap();
    ///
    /// assert_eq!(store.load(session).await.unwrap().len(), 1);
    /// # }
    /// ```
    #[derive(Clone, Debug)]
    pub struct Sqlite {
        pool: SqlitePool,
    }

    fn storage(error: impl std::fmt::Display) -> Error {
        Error::Storage(error.to_string())
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
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
                // A store from before the search index builds it once, while
                // it holds the write lock, and another store opening the file
                // waits for it rather than failing. The build took 17 seconds
                // for 1,000 seeded sessions, a 530 MB store (October 16, 2026).
                .busy_timeout(std::time::Duration::from_mins(1));
            let pool = SqlitePoolOptions::new().connect_with(options).await?;
            sqlx::raw_sql(SCHEMA).execute(&pool).await?;
            crate::search::sqlite::migrate(&pool).await?;
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
            crate::search::sqlite::migrate(&pool)
                .await
                .map_err(storage)?;
            Ok(Self { pool })
        }
    }

    fn node(row: &sqlx::sqlite::SqliteRow, parents: Vec<Id>) -> Result<Node> {
        let id: String = row.try_get("id").map_err(storage)?;
        let created_at: String = row.try_get("created_at").map_err(storage)?;
        let detail: String = row.try_get("detail").map_err(storage)?;
        Ok(Node {
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .map_err(storage)?
                .with_timezone(&Utc),
            detail: serde_json::from_str::<Detail>(&detail).map_err(storage)?,
            derived_from: parents,
            id: parse(&id)?,
        })
    }

    fn parse(id: &str) -> Result<Id> {
        uuid::Uuid::parse_str(id).map(Id).map_err(storage)
    }

    #[async_trait]
    impl Store for Sqlite {
        async fn append(&self, trace: Id, node: &Node) -> Result<()> {
            let detail = serde_json::to_string(&node.detail).map_err(storage)?;
            let mut transaction = self.pool.begin().await.map_err(storage)?;
            sqlx::query("INSERT INTO nodes (id, trace, created_at, detail) VALUES (?, ?, ?, ?)")
                .bind(node.id.to_string())
                .bind(trace.to_string())
                .bind(node.created_at.to_rfc3339())
                .bind(detail)
                .execute(&mut *transaction)
                .await
                .map_err(|error| match error {
                    sqlx::Error::Database(database) if database.is_unique_violation() => {
                        Error::Storage(format!("node {} is already held", node.id))
                    }
                    other => storage(other),
                })?;
            for (position, parent) in node.derived_from.iter().enumerate() {
                sqlx::query("INSERT INTO edges (child, position, parent) VALUES (?, ?, ?)")
                    .bind(node.id.to_string())
                    .bind(i64::try_from(position).map_err(storage)?)
                    .bind(parent.to_string())
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            transaction.commit().await.map_err(storage)
        }

        async fn load(&self, trace: Id) -> Result<Graph> {
            let rows =
                sqlx::query("SELECT id, created_at, detail FROM nodes WHERE trace = ? ORDER BY id")
                    .bind(trace.to_string())
                    .fetch_all(&self.pool)
                    .await
                    .map_err(storage)?;
            let edges = sqlx::query(
                "SELECT edges.child, edges.parent FROM edges
                 JOIN nodes ON nodes.id = edges.child
                 WHERE nodes.trace = ? ORDER BY edges.child, edges.position",
            )
            .bind(trace.to_string())
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?;

            let mut parents: std::collections::HashMap<String, Vec<Id>> =
                std::collections::HashMap::new();
            for edge in &edges {
                let child: String = edge.try_get("child").map_err(storage)?;
                let parent: String = edge.try_get("parent").map_err(storage)?;
                parents.entry(child).or_default().push(parse(&parent)?);
            }
            let mut graph = Graph::new();
            for row in &rows {
                let id: String = row.try_get("id").map_err(storage)?;
                graph.insert(node(row, parents.remove(&id).unwrap_or_default())?);
            }
            Ok(graph)
        }

        async fn traces(&self) -> Result<Vec<Summary>> {
            let rows = sqlx::query(
                "SELECT trace, COUNT(*) AS count, MIN(id) AS first FROM nodes
                 GROUP BY trace ORDER BY trace DESC",
            )
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?;
            let mut summaries = Vec::with_capacity(rows.len());
            for row in rows {
                let trace: String = row.try_get("trace").map_err(storage)?;
                let count: i64 = row.try_get("count").map_err(storage)?;
                let first: String = row.try_get("first").map_err(storage)?;
                let first_row =
                    sqlx::query("SELECT id, created_at, detail FROM nodes WHERE id = ?")
                        .bind(&first)
                        .fetch_one(&self.pool)
                        .await
                        .map_err(storage)?;
                let first = node(&first_row, Vec::new())?;
                summaries.push(Summary {
                    created_at: first.created_at,
                    first: Some(first),
                    id: parse(&trace)?,
                    nodes: usize::try_from(count).map_err(storage)?,
                });
            }
            Ok(summaries)
        }

        async fn nodes_of(
            &self,
            kinds: &[NodeKind],
            since: Option<DateTime<Utc>>,
        ) -> Result<Vec<(Id, Node)>> {
            if kinds.is_empty() {
                return Ok(Vec::new());
            }
            // The kind is the detail's tag, read in SQL so only the nodes
            // asked for leave the database. Every time is written as RFC 3339
            // in UTC, so the text's order is the time's.
            let named = kinds
                .iter()
                .map(|kind| match serde_json::to_value(kind).map_err(storage)? {
                    serde_json::Value::String(named) => Ok(named),
                    other => Err(storage(format!("{other} is not a kind's name"))),
                })
                .collect::<Result<Vec<String>>>()?;
            // Only placeholders are written into the statement; the kinds and
            // the time are bound.
            let marks = vec!["?"; named.len()].join(", ");
            let filter = format!(
                "json_extract(nodes.detail, '$.kind') IN ({marks}) AND nodes.created_at >= ?"
            );
            let floor = since.map_or_else(String::new, |since| since.to_rfc3339());
            let bound = |sql: String| {
                let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
                for kind in &named {
                    query = query.bind(kind.clone());
                }
                query.bind(floor.clone())
            };
            let rows = bound(format!(
                "SELECT nodes.trace, nodes.id, nodes.created_at, nodes.detail FROM nodes
                 WHERE {filter} ORDER BY nodes.id"
            ))
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?;
            let edges = bound(format!(
                "SELECT edges.child, edges.parent FROM edges
                 JOIN nodes ON nodes.id = edges.child
                 WHERE {filter} ORDER BY edges.child, edges.position"
            ))
            .fetch_all(&self.pool)
            .await
            .map_err(storage)?;
            let mut parents: std::collections::HashMap<String, Vec<Id>> =
                std::collections::HashMap::new();
            for edge in &edges {
                let child: String = edge.try_get("child").map_err(storage)?;
                let parent: String = edge.try_get("parent").map_err(storage)?;
                parents.entry(child).or_default().push(parse(&parent)?);
            }
            let mut found = Vec::with_capacity(rows.len());
            for row in &rows {
                let trace: String = row.try_get("trace").map_err(storage)?;
                let id: String = row.try_get("id").map_err(storage)?;
                found.push((
                    parse(&trace)?,
                    node(row, parents.remove(&id).unwrap_or_default())?,
                ));
            }
            Ok(found)
        }

        async fn find(&self, search: &Search) -> Result<Page> {
            crate::search::sqlite::find(&self.pool, search).await
        }

        async fn title(&self, trace: Id, title: Option<&str>) -> Result<()> {
            crate::search::sqlite::title(&self.pool, trace, title).await
        }

        async fn delete_cascade(&self, id: Id) -> Result<Vec<Id>> {
            let mut transaction = self.pool.begin().await.map_err(storage)?;
            let rows = sqlx::query(
                "WITH RECURSIVE doomed (id) AS (
                     SELECT ?
                     UNION
                     SELECT edges.child FROM edges JOIN doomed ON edges.parent = doomed.id
                 )
                 SELECT nodes.id FROM nodes JOIN doomed ON nodes.id = doomed.id",
            )
            .bind(id.to_string())
            .fetch_all(&mut *transaction)
            .await
            .map_err(storage)?;
            let mut removed = Vec::with_capacity(rows.len());
            for row in &rows {
                let doomed: String = row.try_get("id").map_err(storage)?;
                sqlx::query("DELETE FROM nodes WHERE id = ?")
                    .bind(&doomed)
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
                removed.push(parse(&doomed)?);
            }
            // Edges from survivors to what was removed go too, as they do in
            // `Graph::delete_cascade`. A survivor cannot derive from a removed
            // node, so this only clears edges to ids never held.
            let gone: HashSet<String> = removed.iter().map(ToString::to_string).collect();
            for parent in &gone {
                sqlx::query("DELETE FROM edges WHERE parent = ?")
                    .bind(parent)
                    .execute(&mut *transaction)
                    .await
                    .map_err(storage)?;
            }
            transaction.commit().await.map_err(storage)?;
            Ok(removed)
        }
    }
}

/// The behavior every backend must match, run against each one.
#[cfg(test)]
pub(crate) mod conformance {
    use fusion_cortex_core::{provider::Message, Id};

    use super::Store;
    use crate::{Detail, Node, NodeKind};

    fn task(goal: &str) -> Node {
        Node::new(
            Detail::Task {
                checks: vec!["bun test".into()],
                goal: goal.into(),
                project: None,
                revision: None,
            },
            vec![],
        )
    }

    fn context(parents: Vec<Id>) -> Node {
        Node::new(
            Detail::Context {
                dropped: vec![],
                format: None,
                placed: vec![],
                messages: vec![Message::text(
                    fusion_cortex_core::provider::Role::User,
                    "fix it",
                )],
                strategy: "session".into(),
                tools: vec![],
            },
            parents,
        )
    }

    fn sorted(mut ids: Vec<Id>) -> Vec<Id> {
        ids.sort();
        ids
    }

    pub(crate) async fn run(store: &dyn Store) {
        a_trace_loads_as_it_was_appended(store).await;
        a_node_is_appended_once(store).await;
        traces_list_newest_first_with_their_first_node(store).await;
        a_cascade_removes_what_derives_from_a_node_and_nothing_else(store).await;
        a_cascade_crosses_traces(store).await;
        forgetting_a_trace_removes_it_and_what_it_fed(store).await;
        nodes_of_a_kind_come_from_every_trace_from_a_time(store).await;
        crate::search::conformance::run(store).await;
    }

    async fn nodes_of_a_kind_come_from_every_trace_from_a_time(store: &dyn Store) {
        let first = Id::new();
        let second = Id::new();
        let early = Node {
            created_at: chrono::Utc::now() - chrono::TimeDelta::days(3),
            ..task("early")
        };
        let read = context(vec![early.id]);
        let late = task("late");
        store.append(first, &early).await.unwrap();
        store.append(first, &read).await.unwrap();
        store.append(second, &late).await.unwrap();
        let ours = |found: Vec<(Id, crate::Node)>| -> Vec<(Id, Id)> {
            found
                .into_iter()
                .filter(|(trace, _)| [first, second].contains(trace))
                .map(|(trace, node)| (trace, node.id))
                .collect()
        };

        let tasks = store.nodes_of(&[NodeKind::Task], None).await.unwrap();
        let recent = store
            .nodes_of(
                &[NodeKind::Task, NodeKind::Context],
                Some(chrono::Utc::now() - chrono::TimeDelta::days(1)),
            )
            .await
            .unwrap();
        let contexts = store.nodes_of(&[NodeKind::Context], None).await.unwrap();

        assert_eq!(ours(tasks), vec![(first, early.id), (second, late.id)]);
        assert_eq!(ours(recent), vec![(first, read.id), (second, late.id)]);
        let held = contexts
            .iter()
            .find(|(_, node)| node.id == read.id)
            .unwrap();
        assert_eq!(
            held.1.derived_from,
            vec![early.id],
            "a node keeps its parents"
        );
        assert!(store.nodes_of(&[], None).await.unwrap().is_empty());
    }

    async fn a_trace_loads_as_it_was_appended(store: &dyn Store) {
        let trace = Id::new();
        let first = task("load");
        let second = context(vec![first.id]);
        let third = context(vec![second.id, first.id]);
        for node in [&first, &second, &third] {
            store.append(trace, node).await.unwrap();
        }

        let graph = store.load(trace).await.unwrap();

        assert_eq!(graph.len(), 3);
        let loaded = graph.get(third.id).unwrap();
        assert_eq!(
            loaded.derived_from,
            vec![second.id, first.id],
            "parents keep their order"
        );
        assert_eq!(loaded.kind(), third.kind());
        assert_eq!(
            loaded.created_at.timestamp_micros(),
            third.created_at.timestamp_micros()
        );
        assert_eq!(graph.why(third.id).len(), 3);
        assert!(store.load(Id::new()).await.unwrap().is_empty());
    }

    async fn a_node_is_appended_once(store: &dyn Store) {
        let trace = Id::new();
        let node = task("once");
        store.append(trace, &node).await.unwrap();

        let error = store.append(trace, &node).await.unwrap_err();

        assert!(error.to_string().contains("already held"), "{error}");
        assert_eq!(store.load(trace).await.unwrap().len(), 1);
    }

    async fn traces_list_newest_first_with_their_first_node(store: &dyn Store) {
        let older = Id::new();
        let newer = Id::new();
        store.append(older, &task("older")).await.unwrap();
        let newest_task = task("newer");
        store.append(newer, &newest_task).await.unwrap();
        store
            .append(newer, &context(vec![newest_task.id]))
            .await
            .unwrap();

        let traces = store.traces().await.unwrap();
        let position = |id| traces.iter().position(|one| one.id == id).unwrap();

        assert!(position(newer) < position(older));
        let summary = &traces[position(newer)];
        assert_eq!(summary.nodes, 2);
        assert!(matches!(
            &summary.first.as_ref().unwrap().detail,
            Detail::Task { goal, .. } if goal == "newer"
        ));
    }

    async fn a_cascade_removes_what_derives_from_a_node_and_nothing_else(store: &dyn Store) {
        let trace = Id::new();
        let root = task("cascade");
        let kept = context(vec![root.id]);
        let doomed = context(vec![root.id]);
        let below = context(vec![doomed.id, kept.id]);
        for node in [&root, &kept, &doomed, &below] {
            store.append(trace, node).await.unwrap();
        }

        let removed = store.delete_cascade(doomed.id).await.unwrap();

        assert_eq!(sorted(removed), sorted(vec![doomed.id, below.id]));
        let graph = store.load(trace).await.unwrap();
        assert_eq!(graph.len(), 2);
        assert!(graph.get(kept.id).is_some());
        assert!(store.delete_cascade(Id::new()).await.unwrap().is_empty());
    }

    async fn a_cascade_crosses_traces(store: &dyn Store) {
        let first = Id::new();
        let second = Id::new();
        let source = task("shared");
        let reader = context(vec![source.id]);
        store.append(first, &source).await.unwrap();
        store.append(second, &reader).await.unwrap();

        let removed = store.delete_cascade(source.id).await.unwrap();

        assert_eq!(sorted(removed), sorted(vec![source.id, reader.id]));
        assert!(store.load(second).await.unwrap().is_empty());
    }

    async fn forgetting_a_trace_removes_it_and_what_it_fed(store: &dyn Store) {
        let forgotten = Id::new();
        let other = Id::new();
        let root = task("forget");
        let step = context(vec![root.id]);
        let unrelated = task("unrelated");
        let reader = context(vec![step.id, unrelated.id]);
        store.append(forgotten, &root).await.unwrap();
        store.append(forgotten, &step).await.unwrap();
        store.append(other, &unrelated).await.unwrap();
        store.append(other, &reader).await.unwrap();

        let removed = store.forget(forgotten).await.unwrap();

        assert_eq!(sorted(removed), sorted(vec![root.id, step.id, reader.id]));
        assert!(store.load(forgotten).await.unwrap().is_empty());
        let survivors = store.load(other).await.unwrap();
        assert_eq!(survivors.len(), 1);
        assert!(survivors.get(unrelated.id).is_some());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn the_in_memory_store_conforms() {
        conformance::run(&InMemory::new()).await;
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn the_sqlite_store_conforms() {
        conformance::run(&Sqlite::in_memory().await.unwrap()).await;
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn two_stores_opening_one_new_file_both_open() {
        for _ in 0..5 {
            let folder = std::env::temp_dir().join(format!("cortex-trace-{}", Id::new()));
            std::fs::create_dir_all(&folder).unwrap();
            let path = folder.join("trace.db");

            let (first, second) = tokio::join!(Sqlite::open(&path), Sqlite::open(&path));

            assert!(first.is_ok() && second.is_ok(), "{first:?} {second:?}");
            drop((first, second));
            std::fs::remove_dir_all(&folder).unwrap();
        }
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn a_sqlite_file_keeps_its_traces_across_opens() {
        let folder = std::env::temp_dir().join(format!("cortex-trace-{}", Id::new()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("trace.db");
        let trace = Id::new();
        let node = Node::new(
            crate::Detail::Source {
                content: "kept".into(),
                uri: None,
            },
            vec![],
        );

        Sqlite::open(&path)
            .await
            .unwrap()
            .append(trace, &node)
            .await
            .unwrap();
        let reopened = Sqlite::open(&path).await.unwrap();

        assert!(reopened.load(trace).await.unwrap().get(node.id).is_some());
        drop(reopened);
        std::fs::remove_dir_all(&folder).unwrap();
    }

    #[cfg(feature = "sqlite")]
    #[tokio::test]
    async fn a_store_from_before_the_index_builds_it_once_on_open() {
        use crate::search::{Query, Search};
        let folder = std::env::temp_dir().join(format!("cortex-trace-{}", Id::new()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("trace.db");
        let store = Sqlite::open(&path).await.unwrap();
        let (one, two) = (Id::new(), Id::new());
        for (trace, goal) in [(one, "Find the okapi"), (two, "okapi okapi")] {
            let asked = Node::new(
                crate::Detail::Task {
                    checks: vec![],
                    goal: goal.into(),
                    project: None,
                    revision: None,
                },
                vec![],
            );
            store.append(trace, &asked).await.unwrap();
            let called = Node::new(
                crate::Detail::ToolCall {
                    arguments: serde_json::json!({"path": "src/okapi.rs"}),
                    call_id: None,
                    is_error: false,
                    name: "read".into(),
                    result: Some(serde_json::json!({"text": "fn okapi() {}"})),
                    source: None,
                    untrusted: false,
                },
                vec![asked.id],
            );
            store.append(trace, &called).await.unwrap();
        }
        store.title(one, Some("Okapi hunt")).await.unwrap();
        // The titles are the host's to give again, since it keeps them.
        let search = Search {
            kinds: vec![Kind::Message, Kind::Tool, Kind::Output],
            within: Some(vec![one, two]),
            ..Search::new(Query::parse("okapi"))
        };
        let indexed = store.find(&search).await.unwrap();
        drop(store);
        // The store as a release before the index left it.
        let pool = sqlx::SqlitePool::connect(&format!("sqlite://{}", path.display()))
            .await
            .unwrap();
        sqlx::raw_sql(
            "DROP TRIGGER search_node_added; DROP TRIGGER search_node_removed;
             DROP VIEW search_source; DROP TABLE search_text; DROP TABLE search_entries;
             PRAGMA user_version = 0;",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool.close().await;

        let reopened = Sqlite::open(&path).await.unwrap();
        let rebuilt = reopened.find(&search).await.unwrap();

        let read = |page: crate::search::Page| -> Vec<(Id, usize, Vec<Option<Id>>)> {
            page.found
                .into_iter()
                .map(|found| {
                    let nodes = found.hits.iter().map(|hit| hit.node).collect();
                    (found.trace, found.count, nodes)
                })
                .collect()
        };
        assert_eq!(read(rebuilt.clone()), read(indexed));
        assert_eq!(rebuilt.total, 2);
        assert!(
            Sqlite::open(&path).await.is_ok(),
            "and opens again without building"
        );
        drop(reopened);
        std::fs::remove_dir_all(&folder).unwrap();
    }
}
