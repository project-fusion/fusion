//! The Postgres store's index of entries: a `tsvector` of trigrams, under a
//! GIN index.
//!
//! **A word matches as characters, anywhere, here too.** Postgres's text
//! search splits text into words and stems them, so `checkouttotal` would not
//! find `useCheckoutTotal(items)` and `ausive` would find nothing, which
//! breaks what [`super`] promises. The index holds each entry's trigrams as
//! the lexemes of a `tsvector` instead: every run of three characters, folded
//! as [`super::folded`] folds them, at the places it starts. A long word is
//! the conjunction of its trigrams as a `tsquery`, which the GIN index
//! answers, and then a substring of the folded text, which settles it. The
//! trigrams are made in Rust, so the index needs no extension and no
//! particular collation, and folds a character the way the reference does.
//!
//! **`ts_rank` ranks a match**, divided by one plus the log of the entry's
//! length, as `bm25` takes length into account. The order it gives is this
//! store's own. The conformance suite holds which entries match, and the
//! order of traces is each backend's.
//!
//! **Entries are written in Rust**, by the statement that writes their node,
//! from [`super::entries`], so this store has no second statement of what an
//! entry is to keep in step. A node's entries go with it by a foreign key, and
//! a trace's title goes when its last node does, in
//! [`crate::store::Postgres`]'s cascade.

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Utc};
use fusion_cortex_core::{postgres::Database, Error, Id, Result};
use sqlx::{postgres::PgRow, Row};

use super::{Found, Hit, Kind, Page, Search, GRAM, HALF};

/// The highest position a `tsvector` keeps.
const LAST_POSITION: usize = 16_383;

/// The most positions a `tsvector` keeps for one lexeme.
const POSITIONS: usize = 255;

/// The entries, and the indexes over them.
pub(crate) const SCHEMA: &str = "
    CREATE TABLE IF NOT EXISTS search_entries (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        trace UUID NOT NULL,
        node UUID REFERENCES nodes (id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL,
        text TEXT NOT NULL,
        folded TEXT NOT NULL,
        grams TSVECTOR NOT NULL
    );
    CREATE INDEX IF NOT EXISTS search_entries_by_trace ON search_entries (trace, kind);
    CREATE INDEX IF NOT EXISTS search_entries_by_node ON search_entries (node);
    CREATE INDEX IF NOT EXISTS search_entries_by_gram ON search_entries USING GIN (grams);
";

/// What folds ASCII letters, as `SQLite`'s `lower` does, for the short words.
const ASCII_LOWER: &str =
    "translate(entry.text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')";

fn storage(error: impl std::fmt::Display) -> Error {
    Error::Storage(error.to_string())
}

/// `text` folded as the index folds it.
fn fold(text: &str) -> String {
    text.chars().map(super::folded).collect()
}

/// `text` as Postgres keeps it: a NUL is the one character a text column
/// refuses, and it is a space here, as a highlight's marks are.
pub(crate) fn kept(text: &str) -> String {
    text.replace('\0', " ")
}

/// A lexeme in the quotes `tsvector` and `tsquery` read verbatim.
fn quoted(lexeme: &str) -> String {
    format!("'{}'", lexeme.replace('\\', "\\\\").replace('\'', "''"))
}

/// The trigrams of `folded`, each with the places it starts, counted from
/// one, in the order they first occur.
fn trigrams(folded: &str) -> Vec<(String, Vec<usize>)> {
    let chars: Vec<char> = folded.chars().collect();
    let mut order: Vec<String> = Vec::new();
    let mut places: HashMap<String, Vec<usize>> = HashMap::new();
    for (at, window) in chars.windows(GRAM).enumerate() {
        let gram: String = window.iter().collect();
        let held = places.entry(gram.clone()).or_insert_with(|| {
            order.push(gram);
            Vec::new()
        });
        if at < LAST_POSITION && held.len() < POSITIONS {
            held.push(at + 1);
        }
    }
    order
        .into_iter()
        .map(|gram| {
            let at = places.remove(&gram).unwrap_or_default();
            (gram, at)
        })
        .collect()
}

/// The `tsvector` of `folded`'s trigrams, as text.
fn grams(folded: &str) -> String {
    trigrams(folded)
        .iter()
        .map(|(gram, at)| {
            let places: Vec<String> = at.iter().map(ToString::to_string).collect();
            if places.is_empty() {
                quoted(gram)
            } else {
                format!("{}:{}", quoted(gram), places.join(","))
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// The `tsquery` every long word's trigrams make, as text, or none where no
/// word is long.
fn expression(search: &Search) -> Option<String> {
    let mut seen = HashSet::new();
    let wanted: Vec<String> = search
        .query
        .long()
        .flat_map(|needle| trigrams(&fold(needle)))
        .map(|(gram, _)| gram)
        .filter(|gram| seen.insert(gram.clone()))
        .map(|gram| quoted(&gram))
        .collect();
    (!wanted.is_empty()).then(|| wanted.join(" & "))
}

/// Writes one entry, unless it is a message its trace already holds.
async fn write(
    database: &Database,
    transaction: &mut sqlx::PgConnection,
    trace: Id,
    node: Option<Id>,
    at: DateTime<Utc>,
    kind: Kind,
    text: &str,
) -> Result<()> {
    let text = kept(text);
    let folded = fold(&text);
    database
        .query(
            "INSERT INTO search_entries (trace, node, kind, at, text, folded, grams)
             SELECT $1, $2, $3, $4, $5, $6, $7::tsvector
             WHERE $3 <> 'message' OR NOT EXISTS (
                 SELECT 1 FROM search_entries
                 WHERE trace = $1 AND kind = 'message' AND text = $5
             )",
        )
        .bind(trace.0)
        .bind(node.map(|node| node.0))
        .bind(kind.name())
        .bind(at)
        .bind(&text)
        .bind(&folded)
        .bind(grams(&folded))
        .execute(&mut *transaction)
        .await
        .map_err(storage)?;
    Ok(())
}

/// Writes the entries of `node`, in the transaction that writes it: each once,
/// and a message only where its trace has not said it before.
pub(crate) async fn index(
    database: &Database,
    transaction: &mut sqlx::PgConnection,
    trace: Id,
    node: &crate::Node,
) -> Result<()> {
    let mut written = HashSet::new();
    for entry in super::entries(&node.detail) {
        if !written.insert((entry.kind, entry.text.clone())) {
            continue;
        }
        write(
            database,
            transaction,
            trace,
            Some(node.id),
            node.created_at,
            entry.kind,
            &entry.text,
        )
        .await?;
    }
    Ok(())
}

/// Sets the title `trace` is found by, or takes it away. A trace the store
/// does not hold gets none, so a title never outlives its trace.
pub(crate) async fn title(database: &Database, trace: Id, title: Option<&str>) -> Result<()> {
    let mut transaction = database.begin().await?;
    database
        .query("DELETE FROM search_entries WHERE trace = $1 AND kind = 'title'")
        .bind(trace.0)
        .execute(&mut *transaction)
        .await
        .map_err(storage)?;
    let held: bool = database
        .scalar("SELECT EXISTS (SELECT 1 FROM nodes WHERE trace = $1)")
        .bind(trace.0)
        .fetch_one(&mut *transaction)
        .await
        .map_err(storage)?;
    if let Some(text) = title.and_then(|title| super::indexed(Kind::Title, title)) {
        if held {
            write(
                database,
                &mut transaction,
                trace,
                None,
                Utc::now(),
                Kind::Title,
                &text,
            )
            .await?;
        }
    }
    transaction.commit().await.map_err(storage)
}

/// The values a search binds, in the order its statement numbers them.
struct Bound {
    expression: Option<String>,
    kinds: Vec<String>,
    long: Vec<String>,
    now: DateTime<Utc>,
    short: Vec<String>,
    within: Option<Vec<uuid::Uuid>>,
}

impl Bound {
    fn of(search: &Search) -> Self {
        Self {
            expression: expression(search),
            kinds: search
                .kinds
                .iter()
                .map(|kind| kind.name().to_owned())
                .collect(),
            long: search.query.long().map(fold).collect(),
            now: search.now,
            short: search.query.short(),
            within: search
                .within
                .as_ref()
                .map(|traces| traces.iter().map(|trace| trace.0).collect()),
        }
    }

    /// How many values [`scored`] binds.
    fn count(&self) -> usize {
        if self.expression.is_some() {
            6
        } else {
            5
        }
    }

    fn bind<'q>(
        &self,
        query: sqlx::query::Query<'q, sqlx::Postgres, sqlx::postgres::PgArguments>,
    ) -> sqlx::query::Query<'q, sqlx::Postgres, sqlx::postgres::PgArguments> {
        let query = query
            .bind(self.now)
            .bind(self.kinds.clone())
            .bind(self.within.clone())
            .bind(self.long.clone())
            .bind(self.short.clone());
        match &self.expression {
            Some(expression) => query.bind(expression.clone()),
            None => query,
        }
    }
}

/// The entries `bound` matches, each with its score, as a common table
/// expression named `scored`. Only placeholders are written in: the time, the
/// kinds, the traces, the long words folded, the short words, and the
/// trigrams' `tsquery` where a word is long.
fn scored(bound: &Bound) -> String {
    let (relevance, indexed) = if bound.expression.is_some() {
        (
            "-ts_rank(entry.grams, $6::tsquery, 1)::float8",
            "AND entry.grams @@ $6::tsquery",
        )
    } else {
        ("-1.0::float8", "")
    };
    format!(
        "WITH scored AS (
             SELECT entry.id, entry.trace, entry.at,
                 {relevance}
                     / (1.0 + greatest(0.0, extract(epoch FROM $1::timestamptz - entry.at)::float8
                                           / 86400.0) / {HALF:.1})
                     AS score
             FROM search_entries AS entry
             WHERE entry.kind = ANY($2::text[])
                 AND ($3::uuid[] IS NULL OR entry.trace = ANY($3::uuid[]))
                 {indexed}
                 AND NOT EXISTS (
                     SELECT 1 FROM unnest($4::text[]) AS needle
                     WHERE strpos(entry.folded, needle) = 0
                 )
                 AND NOT EXISTS (
                     SELECT 1 FROM unnest($5::text[]) AS needle
                     WHERE strpos({ASCII_LOWER}, needle) = 0
                 )
         )"
    )
}

/// A count past the store's range, as the most a page can hold.
fn count(value: i64) -> usize {
    usize::try_from(value).unwrap_or(usize::MAX)
}

fn wide(value: usize) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

/// One row of a page: an entry, its trace, its score, and the trace's count
/// of matches and the total of traces.
struct Ranked {
    held: usize,
    id: i64,
    score: f64,
    total: usize,
    trace: Id,
}

/// The entries of the page `search` asks for, best trace first and each
/// trace's best matches first.
async fn ranked(
    database: &Database,
    transaction: &mut sqlx::PgConnection,
    search: &Search,
    bound: &Bound,
) -> Result<Vec<Ranked>> {
    let next = bound.count();
    let (limit, offset, per_trace) = (next + 1, next + 2, next + 3);
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
             ORDER BY score, trace DESC LIMIT ${limit} OFFSET ${offset}
         )
         SELECT ranked.id, ranked.trace, ranked.score, best.held, best.total
         FROM ranked JOIN best ON best.trace = ranked.trace
         WHERE ranked.place <= ${per_trace}
         ORDER BY best.score, best.trace DESC, ranked.place",
        scored(bound)
    );
    let rows = bound
        .bind(database.query(sqlx::AssertSqlSafe(sql)))
        .bind(wide(search.limit))
        .bind(wide(search.offset))
        .bind(wide(search.per_trace))
        .fetch_all(&mut *transaction)
        .await
        .map_err(storage)?;
    rows.iter()
        .map(|row| {
            Ok(Ranked {
                held: count(row.try_get("held").map_err(storage)?),
                id: row.try_get("id").map_err(storage)?,
                score: row.try_get("score").map_err(storage)?,
                total: count(row.try_get("total").map_err(storage)?),
                trace: Id(row.try_get("trace").map_err(storage)?),
            })
        })
        .collect()
}

/// How many traces `search` matches, for a page past the last.
async fn total(
    database: &Database,
    transaction: &mut sqlx::PgConnection,
    bound: &Bound,
) -> Result<usize> {
    let sql = format!("{} SELECT count(DISTINCT trace) FROM scored", scored(bound));
    let row = bound
        .bind(database.query(sqlx::AssertSqlSafe(sql)))
        .fetch_one(&mut *transaction)
        .await
        .map_err(storage)?;
    Ok(count(row.try_get(0).map_err(storage)?))
}

/// The entry `row` holds as a hit with `score`, marked as the reference marks
/// it.
fn hit(row: &PgRow, score: f64, search: &Search) -> Result<Hit> {
    let text: String = row.try_get("text").map_err(storage)?;
    let kind: String = row.try_get("kind").map_err(storage)?;
    let node: Option<uuid::Uuid> = row.try_get("node").map_err(storage)?;
    let marks = super::marks(&text, &search.query);
    Ok(Hit {
        at: row.try_get("at").map_err(storage)?,
        kind: Kind::named(&kind)
            .ok_or_else(|| storage(format!("{kind} is not a kind of entry")))?,
        node: node.map(Id),
        score,
        snippet: super::snippet(&text, &marks),
    })
}

/// The page of traces `search` finds.
pub(crate) async fn find(database: &Database, search: &Search) -> Result<Page> {
    if search.finds_nothing() {
        return Ok(Page::default());
    }
    let bound = Bound::of(search);
    let mut transaction = database.begin().await?;
    let rows = ranked(database, &mut transaction, search, &bound).await?;
    if rows.is_empty() {
        let total = if search.offset > 0 {
            total(database, &mut transaction, &bound).await?
        } else {
            0
        };
        transaction.commit().await.map_err(storage)?;
        return Ok(Page {
            found: Vec::new(),
            total,
        });
    }
    let ids: Vec<i64> = rows.iter().map(|row| row.id).collect();
    let mut shown: HashMap<i64, PgRow> = HashMap::new();
    for row in database
        .query("SELECT id, node, kind, at, text FROM search_entries WHERE id = ANY($1::bigint[])")
        .bind(&ids)
        .fetch_all(&mut *transaction)
        .await
        .map_err(storage)?
    {
        shown.insert(row.try_get("id").map_err(storage)?, row);
    }
    transaction.commit().await.map_err(storage)?;
    let mut found: Vec<Found> = Vec::new();
    for row in &rows {
        let entry = shown
            .get(&row.id)
            .ok_or_else(|| storage(format!("entry {} left the index", row.id)))?;
        let one = hit(entry, row.score, search)?;
        match found.last_mut() {
            Some(last) if last.trace == row.trace => last.hits.push(one),
            _ => found.push(Found {
                count: row.held,
                hits: vec![one],
                trace: row.trace,
            }),
        }
    }
    Ok(Page {
        found,
        total: rows[0].total,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_text_is_its_trigrams_at_the_places_they_start() {
        assert_eq!(grams("abab"), "'aba':1 'bab':2");
        assert_eq!(grams("aaaa"), "'aaa':1,2");
        assert_eq!(grams("it's"), "'it''':1 't''s':2");
        assert_eq!(grams(r"a\b"), r"'a\\b':1");
        assert_eq!(grams("go"), "");
    }

    #[test]
    fn a_long_word_is_its_trigrams_and_a_short_one_is_none() {
        let search = Search::new(super::super::Query::parse("Zebra go"));
        assert_eq!(
            expression(&search).as_deref(),
            Some("'zeb' & 'ebr' & 'bra'")
        );
        assert_eq!(
            expression(&Search::new(super::super::Query::parse("go"))),
            None
        );
    }
}
