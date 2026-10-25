//! The `SQLite` store's index of entries, in FTS5.
//!
//! **Triggers keep the index, so it cannot drift.** Each node written adds
//! its entries in the statement that writes it, and each node deleted takes
//! its entries with it, whichever program wrote it. The view `search_source`
//! says in SQL what [`super::entries`] says in Rust, and the conformance
//! suite holds the two to each other. A trace's title is the one entry with
//! no node, kept by [`title`], and goes when the trace's last node does.
//!
//! **The text is indexed as trigrams**, every run of three characters,
//! folded to one case. Measured October 16, 2026, on 1,000 seeded sessions
//! of 69,000 entries and 134 MB of text, each cut to 8,000 characters:
//! `unicode61` builds a 200 MB database and answers a word in 1 to 15 ms, but
//! finds `ausive` in no session, since an identifier such as
//! `coversineApplausivelyAmino` is one word to it, and `tokenchars` for `_`
//! and `-` only makes more of them one word. Trigrams build 518 MB and answer
//! in 10 to 40 ms, a phrase common to every session in 280 ms, and find
//! `ausive` in 642 sessions. A search of a conversation is for a string a
//! person remembers, from inside an identifier, a path or an error as often
//! as a word, so it is trigrams, in one table. A second table, of words,
//! would rank a whole word above part of one, for another 66 MB.
//!
//! **A version in `user_version` says the index is built.** A store from
//! before it builds it once, in one transaction, from the view.

use fusion_cortex_core::{Error, Id, Result};
use sqlx::{Row, SqlitePool};

use super::{Found, Hit, Kind, Page, Search, CAP, CLOSE, HALF, OPEN, OUTPUT_CAP};

/// The index's version, in `PRAGMA user_version`.
const VERSION: i64 = 1;

/// The entries, the trigram index over them, the view that reads each node's
/// entries, and the triggers that keep the index in step with the nodes.
/// `{cap}` is the cap of the row's kind, [`OUTPUT_CAP`] or [`CAP`].
const SCHEMA: &str = "
    CREATE TABLE IF NOT EXISTS search_entries (
        id INTEGER PRIMARY KEY,
        trace TEXT NOT NULL,
        node TEXT,
        kind TEXT NOT NULL,
        at TEXT NOT NULL,
        text TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS search_entries_by_trace ON search_entries (trace, kind);
    CREATE INDEX IF NOT EXISTS search_entries_by_node ON search_entries (node);
    CREATE VIRTUAL TABLE IF NOT EXISTS search_text USING fts5 (
        text,
        content = 'search_entries',
        content_rowid = 'id',
        tokenize = 'trigram case_sensitive 0'
    );
    CREATE TRIGGER IF NOT EXISTS search_entry_added AFTER INSERT ON search_entries BEGIN
        INSERT INTO search_text (rowid, text) VALUES (new.id, new.text);
    END;
    CREATE TRIGGER IF NOT EXISTS search_entry_removed AFTER DELETE ON search_entries BEGIN
        INSERT INTO search_text (search_text, rowid, text) VALUES ('delete', old.id, old.text);
    END;
    CREATE VIEW IF NOT EXISTS search_source (node, trace, kind, at, place, text) AS
        SELECT id, trace, 'message', created_at, 0, json_extract(detail, '$.goal')
        FROM nodes WHERE json_extract(detail, '$.kind') = 'task'
        UNION ALL
        SELECT id, trace, 'reply', created_at, 0, json_extract(detail, '$.content')
        FROM nodes WHERE json_extract(detail, '$.kind') = 'output'
        UNION ALL
        SELECT id, trace, 'tool', created_at, 0,
            json_extract(detail, '$.name') || coalesce(char(10) || (
                SELECT group_concat(value, char(10)) FROM json_tree(nodes.detail, '$.arguments')
                WHERE type = 'text'
            ), '')
        FROM nodes WHERE json_extract(detail, '$.kind') = 'tool_call'
        UNION ALL
        SELECT id, trace, 'output', created_at, 1, (
            SELECT group_concat(value, char(10)) FROM json_tree(nodes.detail, '$.result')
            WHERE type = 'text'
        )
        FROM nodes WHERE json_extract(detail, '$.kind') = 'tool_call'
        UNION ALL
        SELECT id, trace, 'tool', created_at, 0, json_extract(detail, '$.command')
        FROM nodes WHERE json_extract(detail, '$.kind') = 'check'
        UNION ALL
        SELECT id, trace, 'output', created_at, 1, json_extract(detail, '$.output')
        FROM nodes WHERE json_extract(detail, '$.kind') = 'check'
        UNION ALL
        -- Each instruction a context placed: the blocks it counted, after
        -- those the parts before it in its message counted, or the whole
        -- message where it counted none.
        SELECT nodes.id, nodes.trace, 'message', nodes.created_at, part.key, (
            SELECT group_concat(json_extract(block.value, '$.text'), '')
            FROM json_each(
                nodes.detail, '$.messages[' || json_extract(part.value, '$.message') || '].content'
            ) AS block
            WHERE json_extract(block.value, '$.type') = 'text'
                AND (
                    coalesce(json_extract(part.value, '$.blocks'), 0) = 0
                    OR block.key - (
                        SELECT coalesce(sum(json_extract(earlier.value, '$.blocks')), 0)
                        FROM json_each(nodes.detail, '$.placed') AS earlier
                        WHERE json_extract(earlier.value, '$.message')
                                = json_extract(part.value, '$.message')
                            AND earlier.key < part.key
                    ) BETWEEN 0 AND json_extract(part.value, '$.blocks') - 1
                )
        )
        FROM nodes, json_each(nodes.detail, '$.placed') AS part
        WHERE json_extract(nodes.detail, '$.kind') = 'context'
            AND json_extract(part.value, '$.part') = 'instruction';
    -- A message is read once in a trace, where it was first said, as a
    -- context repeats every instruction placed before it.
    CREATE TRIGGER IF NOT EXISTS search_node_added AFTER INSERT ON nodes BEGIN
        INSERT INTO search_entries (trace, node, kind, at, text)
        SELECT trace, node, kind, at, text FROM (
            SELECT trace, node, kind, at, place,
                substr(replace(replace(text, char(2), ' '), char(3), ' '), 1, {cap}) AS text
            FROM search_source
            WHERE node = new.id AND trim(text, ' ' || char(9) || char(10) || char(13)) <> ''
        ) AS said
        WHERE kind <> 'message' OR NOT EXISTS (
            SELECT 1 FROM search_entries AS held
            WHERE held.trace = said.trace AND held.kind = 'message' AND held.text = said.text
        )
        GROUP BY kind, text
        ORDER BY min(place);
    END;
    CREATE TRIGGER IF NOT EXISTS search_node_removed AFTER DELETE ON nodes BEGIN
        DELETE FROM search_entries WHERE node = old.id;
        DELETE FROM search_entries
        WHERE trace = old.trace AND kind = 'title'
            AND NOT EXISTS (SELECT 1 FROM nodes WHERE trace = old.trace);
    END;
";

/// Every node's entries, written once into a store from before the index,
/// in the order the nodes were written, each message where it was first said.
const BACKFILL: &str = "
    INSERT INTO search_entries (trace, node, kind, at, text)
    SELECT trace, node, kind, at, text FROM (
        SELECT trace, node, kind, at, place, text,
            row_number() OVER (PARTITION BY trace, kind, text ORDER BY node, place) AS seen
        FROM (
            SELECT trace, node, kind, at, place,
                substr(replace(replace(text, char(2), ' '), char(3), ' '), 1, {cap}) AS text
            FROM search_source
            WHERE trim(text, ' ' || char(9) || char(10) || char(13)) <> ''
        )
    )
    WHERE kind <> 'message' OR seen = 1
    ORDER BY node, place;
";

fn storage(error: impl std::fmt::Display) -> Error {
    Error::Storage(error.to_string())
}

/// `sql` with each row's cap written in, the one value that is not bound.
fn capped(sql: &str) -> String {
    sql.replace(
        "{cap}",
        &format!("CASE kind WHEN 'output' THEN {OUTPUT_CAP} ELSE {CAP} END"),
    )
}

/// Builds the index where the store has none, once, in a transaction that
/// holds the write lock, so two stores opening one file build it once.
///
/// # Errors
///
/// The database's, for a caller that retries a busy one.
pub(crate) async fn migrate(pool: &SqlitePool) -> std::result::Result<(), sqlx::Error> {
    let version = || sqlx::query_scalar::<_, i64>("PRAGMA user_version");
    if version().fetch_one(pool).await? >= VERSION {
        return Ok(());
    }
    let mut transaction = pool.begin_with("BEGIN IMMEDIATE").await?;
    if version().fetch_one(&mut *transaction).await? >= VERSION {
        return Ok(());
    }
    sqlx::raw_sql(sqlx::AssertSqlSafe(capped(SCHEMA)))
        .execute(&mut *transaction)
        .await?;
    sqlx::raw_sql(sqlx::AssertSqlSafe(capped(BACKFILL)))
        .execute(&mut *transaction)
        .await?;
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
        "PRAGMA user_version = {VERSION}"
    )))
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await
}

/// Sets the title `trace` is found by, or takes it away. A trace the store
/// does not hold gets none, so a title never outlives its trace.
pub(crate) async fn title(pool: &SqlitePool, trace: Id, title: Option<&str>) -> Result<()> {
    let mut transaction = pool.begin().await.map_err(storage)?;
    sqlx::query("DELETE FROM search_entries WHERE trace = ? AND kind = 'title'")
        .bind(trace.to_string())
        .execute(&mut *transaction)
        .await
        .map_err(storage)?;
    if let Some(text) = title.and_then(|title| super::indexed(Kind::Title, title)) {
        sqlx::query(
            "INSERT INTO search_entries (trace, node, kind, at, text)
             SELECT ?1, NULL, 'title', ?2, ?3 WHERE EXISTS (SELECT 1 FROM nodes WHERE trace = ?1)",
        )
        .bind(trace.to_string())
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(text)
        .execute(&mut *transaction)
        .await
        .map_err(storage)?;
    }
    transaction.commit().await.map_err(storage)
}

/// The entries `search` matches, each with its score, as a common table
/// expression named `scored`. The long words are matched in the index, and
/// the short ones in the text of what it found, or of every entry where no
/// word is long; only placeholders are written in, and every value is bound
/// by [`bind`] in the order they appear.
fn scored(search: &Search) -> String {
    let matched = if search.query.expression().is_some() {
        "SELECT rowid AS id, bm25(search_text) AS relevance
         FROM search_text WHERE search_text MATCH ?"
    } else {
        "SELECT id, -1.0 AS relevance FROM search_entries"
    };
    let short = " AND instr(lower(entry.text), ?) > 0".repeat(search.query.short().len());
    format!(
        "WITH matched AS MATERIALIZED ({matched}),
         scored AS (
             SELECT entry.id, entry.trace, entry.at,
                 matched.relevance
                     / (1.0 + max(0.0, julianday(?) - julianday(entry.at)) / {HALF:.1})
                     AS score
             FROM matched JOIN search_entries AS entry ON entry.id = matched.id
             WHERE entry.kind IN (SELECT value FROM json_each(?))
                 AND (? IS NULL OR entry.trace IN (SELECT value FROM json_each(?))){short}
         )"
    )
}

/// The values [`scored`] names, in its order.
fn bind<'q>(
    mut query: sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments>,
    search: &Search,
) -> Result<sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments>> {
    if let Some(expression) = search.query.expression() {
        query = query.bind(expression);
    }
    let kinds: Vec<&str> = search.kinds.iter().map(|kind| kind.name()).collect();
    let within = search
        .within
        .as_ref()
        .map(|traces| {
            serde_json::to_string(&traces.iter().map(ToString::to_string).collect::<Vec<_>>())
        })
        .transpose()
        .map_err(storage)?;
    query = query
        .bind(search.now.to_rfc3339())
        .bind(serde_json::to_string(&kinds).map_err(storage)?)
        .bind(within.clone())
        .bind(within);
    for word in search.query.short() {
        query = query.bind(word);
    }
    Ok(query)
}

/// A count past the store's range, as the most a page can hold.
fn count(value: i64) -> usize {
    usize::try_from(value).unwrap_or(usize::MAX)
}

/// One row of a page: an entry, its trace, its score, and the trace's count
/// of matches and the total of traces.
struct Ranked {
    held: usize,
    id: i64,
    score: f64,
    total: usize,
    trace: String,
}

/// The entries of the page `search` asks for, best trace first and each
/// trace's best matches first.
async fn ranked(pool: &SqlitePool, search: &Search) -> Result<Vec<Ranked>> {
    let sql = format!(
        "{},
         ranked AS (
             SELECT id, trace, score,
                 row_number() OVER (PARTITION BY trace ORDER BY score, at DESC, id DESC) AS place,
                 count(*) OVER (PARTITION BY trace) AS held
             FROM scored
         ),
         best AS (
             SELECT trace, score, held, count(*) OVER () AS total
             FROM ranked WHERE place = 1
             ORDER BY score, trace DESC LIMIT ? OFFSET ?
         )
         SELECT ranked.id, ranked.trace, ranked.score, best.held, best.total
         FROM ranked JOIN best ON best.trace = ranked.trace
         WHERE ranked.place <= ?
         ORDER BY best.score, best.trace DESC, ranked.place",
        scored(search)
    );
    let wide = |value: usize| i64::try_from(value).unwrap_or(i64::MAX);
    let rows = bind(sqlx::query(sqlx::AssertSqlSafe(sql)), search)?
        .bind(wide(search.limit))
        .bind(wide(search.offset))
        .bind(wide(search.per_trace))
        .fetch_all(pool)
        .await
        .map_err(storage)?;
    rows.iter()
        .map(|row| {
            Ok(Ranked {
                held: count(row.try_get("held").map_err(storage)?),
                id: row.try_get("id").map_err(storage)?,
                score: row.try_get("score").map_err(storage)?,
                total: count(row.try_get("total").map_err(storage)?),
                trace: row.try_get("trace").map_err(storage)?,
            })
        })
        .collect()
}

/// How many traces `search` matches, for a page past the last.
async fn total(pool: &SqlitePool, search: &Search) -> Result<usize> {
    let sql = format!(
        "{} SELECT count(DISTINCT trace) FROM scored",
        scored(search)
    );
    let row = bind(sqlx::query(sqlx::AssertSqlSafe(sql)), search)?
        .fetch_one(pool)
        .await
        .map_err(storage)?;
    Ok(count(row.try_get(0).map_err(storage)?))
}

/// An entry of a page as it is shown: its node, kind and time, and its text
/// with the index's marks, or without them where no word is long.
struct Shown {
    at: String,
    kind: String,
    marked: String,
    node: Option<String>,
}

/// The entries `ids` as [`Shown`], by id.
async fn shown(
    pool: &SqlitePool,
    search: &Search,
    ids: &[i64],
) -> Result<std::collections::HashMap<i64, Shown>> {
    let listed = serde_json::to_string(ids).map_err(storage)?;
    let expression = search.query.expression();
    let query = match &expression {
        Some(expression) => sqlx::query(
            "SELECT entry.id, entry.node, entry.kind, entry.at,
                 highlight(search_text, 0, char(2), char(3)) AS marked
             FROM search_text CROSS JOIN search_entries AS entry ON entry.id = search_text.rowid
             WHERE search_text MATCH ? AND search_text.rowid IN (SELECT value FROM json_each(?))",
        )
        .bind(expression.clone())
        .bind(listed),
        None => sqlx::query(
            "SELECT id, node, kind, at, text AS marked FROM search_entries
             WHERE id IN (SELECT value FROM json_each(?))",
        )
        .bind(listed),
    };
    let rows = query.fetch_all(pool).await.map_err(storage)?;
    rows.iter()
        .map(|row| {
            Ok((
                row.try_get("id").map_err(storage)?,
                Shown {
                    at: row.try_get("at").map_err(storage)?,
                    kind: row.try_get("kind").map_err(storage)?,
                    marked: row.try_get("marked").map_err(storage)?,
                    node: row.try_get("node").map_err(storage)?,
                },
            ))
        })
        .collect()
}

/// `shown` as a hit with `score`, its marks read back out of its text.
fn hit(shown: &Shown, score: f64, search: &Search) -> Result<Hit> {
    let (text, mut marks) = super::unmarked(&shown.marked);
    if search.query.expression().is_none() {
        marks = super::short_marks(&text, &search.query);
    }
    debug_assert!(!text.contains([OPEN, CLOSE]));
    Ok(Hit {
        at: chrono::DateTime::parse_from_rfc3339(&shown.at)
            .map_err(storage)?
            .with_timezone(&chrono::Utc),
        kind: Kind::named(&shown.kind)
            .ok_or_else(|| storage(format!("{} is not a kind of entry", shown.kind)))?,
        node: shown.node.as_deref().map(parse).transpose()?,
        score,
        snippet: super::snippet(&text, &marks),
    })
}

fn parse(id: &str) -> Result<Id> {
    uuid::Uuid::parse_str(id).map(Id).map_err(storage)
}

/// The page of traces `search` finds.
pub(crate) async fn find(pool: &SqlitePool, search: &Search) -> Result<Page> {
    if search.finds_nothing() {
        return Ok(Page::default());
    }
    let rows = ranked(pool, search).await?;
    if rows.is_empty() {
        let total = if search.offset > 0 {
            total(pool, search).await?
        } else {
            0
        };
        return Ok(Page {
            found: Vec::new(),
            total,
        });
    }
    let ids: Vec<i64> = rows.iter().map(|row| row.id).collect();
    let mut shown = shown(pool, search, &ids).await?;
    let mut found: Vec<Found> = Vec::new();
    for row in &rows {
        let entry = shown
            .remove(&row.id)
            .ok_or_else(|| storage(format!("entry {} left the index", row.id)))?;
        let one = hit(&entry, row.score, search)?;
        let trace = parse(&row.trace)?;
        match found.last_mut() {
            Some(last) if last.trace == trace => last.hits.push(one),
            _ => found.push(Found {
                count: row.held,
                hits: vec![one],
                trace,
            }),
        }
    }
    Ok(Page {
        found,
        total: rows[0].total,
    })
}
