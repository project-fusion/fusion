//! Finding traces by what their nodes say.
//!
//! **What a search reads is an entry**: one thing a node says, of one
//! [`Kind`]. A task's goal and each later instruction a context placed are
//! messages, an output is a reply, a tool call is a tool line (its name and
//! every string in its arguments, which holds command lines, paths and
//! targets) and an output line (every string in its result), and a check is
//! the same pair. A trace's title, which [`crate::store::Store::title`] sets,
//! is an entry with no node. A source is not read: in an agent's trace it is a
//! file of instructions the session read, the same in every session, and it
//! would match everywhere. [`entries`] is the one statement of this, and the
//! `SQLite` store's view says it again in SQL, held to it by the conformance
//! suite.
//!
//! **A word matches as characters, anywhere**, in any case: `checkout` finds
//! `useCheckoutTotal`, `src/checkout.rs` and `Checkout`. That is how a person
//! looks for a string they remember, and how find in a page works, so a
//! session found here and the same words found in its transcript agree. The
//! `SQLite` store indexes trigrams for it; see `search::sqlite` for the
//! measurements that chose them.
//!
//! **Search by meaning joins at the entry.** An embedding index would read the
//! same entries, keyed by the same rows, and return its own [`Hit`]s with a
//! score of their own; a [`Page`] is assembled from scored hits, so fusing two
//! lists is a change to how they are ranked and to nothing a reader sees.

use std::ops::Range;

use chrono::{DateTime, Utc};
use fusion_cortex_core::{
    provider::{Block, Message},
    Id,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{Detail, Part, Placed};

#[cfg(feature = "postgres")]
pub(crate) mod postgres;
#[cfg(feature = "sqlite")]
pub(crate) mod sqlite;

/// The most of a message, a reply, a tool line or a title that is indexed,
/// in characters: more than any of them runs to, often enough.
pub const CAP: usize = 16_000;

/// The most of what a tool gave back that is indexed, in characters. An
/// output can run to megabytes, what a person looks for in one is near its
/// start often enough, and a client that shows only the start of one should
/// show at least this much, or a search finds words its transcript lacks.
/// Each character indexed costs about 2.9 bytes of trigrams: 1,000 seeded
/// sessions with outputs of up to 60,000 characters index 83 MB of text at
/// these caps, in 241 MB of trigrams beside the 104 MB the entries take,
/// against 523 MB for their nodes (measured October 16, 2026).
pub const OUTPUT_CAP: usize = 4_000;

/// How many characters a word needs for the trigram index to find it. A
/// shorter word still has to be in an entry, and is looked for in the
/// entries the longer words found, or in every entry when there are none.
pub const GRAM: usize = 3;

/// The matches a search answers for each trace, by default.
pub const PER_TRACE: usize = 3;

/// How long a snippet runs, in characters.
const WINDOW: usize = 120;

/// How much of the line before its first match a snippet keeps, in characters.
const BEFORE: usize = 32;

/// The age at which a match counts half as much as one made now, in days.
const HALF: f64 = 30.0;

/// What marks the start and the end of a match in highlighted text. Control
/// characters no entry keeps, as [`indexed`] replaces them, so a mark can
/// never be text.
pub(crate) const OPEN: char = '\u{2}';
pub(crate) const CLOSE: char = '\u{3}';

/// What an entry is.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    /// What the person said: the task, and each instruction after it.
    Message,
    /// What the model answered.
    Reply,
    /// A tool call or a check: its name, its command line, its paths.
    Tool,
    /// What a tool call or a check gave back.
    Output,
    /// The trace's title.
    Title,
}

impl Kind {
    /// Every kind, which a search reads when it names none.
    pub const ALL: [Self; 5] = [
        Self::Message,
        Self::Reply,
        Self::Tool,
        Self::Output,
        Self::Title,
    ];

    /// The kind's name, as the index stores it.
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Self::Message => "message",
            Self::Reply => "reply",
            Self::Tool => "tool",
            Self::Output => "output",
            Self::Title => "title",
        }
    }

    /// The kind called `name`.
    #[must_use]
    pub fn named(name: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.name() == name)
    }
}

/// One thing a node says.
#[derive(Clone, Debug, PartialEq)]
pub struct Entry {
    pub kind: Kind,
    /// As it is indexed: capped, and never empty.
    pub text: String,
}

/// What `detail` says, as a search reads it. A context's instructions are
/// every one it placed, including those an earlier context placed, which a
/// store reads once per trace.
#[must_use]
pub fn entries(detail: &Detail) -> Vec<Entry> {
    let said = |kind, text: &str| indexed(kind, text).map(|text| Entry { kind, text });
    match detail {
        Detail::Task { goal, .. } => said(Kind::Message, goal).into_iter().collect(),
        Detail::Output { content, .. } => said(Kind::Reply, content).into_iter().collect(),
        Detail::ToolCall {
            arguments,
            name,
            result,
            ..
        } => {
            let called = std::iter::once(name.clone())
                .chain(leaves(arguments).map(str::to_owned))
                .collect::<Vec<_>>()
                .join("\n");
            let gave = result
                .iter()
                .flat_map(leaves)
                .collect::<Vec<_>>()
                .join("\n");
            [said(Kind::Tool, &called), said(Kind::Output, &gave)]
                .into_iter()
                .flatten()
                .collect()
        }
        Detail::Check {
            command, output, ..
        } => [said(Kind::Tool, command), said(Kind::Output, output)]
            .into_iter()
            .flatten()
            .collect(),
        Detail::Context {
            messages, placed, ..
        } => instructions(messages, placed)
            .iter()
            .filter_map(|text| said(Kind::Message, text))
            .collect(),
        _ => Vec::new(),
    }
}

/// Every string in `value`, in its order, as `SQLite`'s `json_tree` walks it.
fn leaves(value: &Value) -> Box<dyn Iterator<Item = &str> + '_> {
    match value {
        Value::String(text) => Box::new(std::iter::once(text.as_str())),
        Value::Array(items) => Box::new(items.iter().flat_map(leaves)),
        Value::Object(fields) => Box::new(fields.values().flat_map(leaves)),
        _ => Box::new(std::iter::empty()),
    }
}

/// The text of each instruction a context placed: the blocks it counted in
/// its message, or the whole message where it counted none.
fn instructions(messages: &[Message], placed: &[Placed]) -> Vec<String> {
    placed
        .iter()
        .enumerate()
        .filter(|(_, part)| part.part == Part::Instruction)
        .filter_map(|(at, part)| {
            let message = messages.get(part.message)?;
            let before: usize = placed[..at]
                .iter()
                .filter(|earlier| earlier.message == part.message)
                .map(|earlier| earlier.blocks)
                .sum();
            let blocks: Vec<&Block> = if part.blocks == 0 {
                message.content.iter().collect()
            } else {
                message
                    .content
                    .iter()
                    .skip(before)
                    .take(part.blocks)
                    .collect()
            };
            Some(
                blocks
                    .into_iter()
                    .filter_map(|block| match block {
                        Block::Text { text } => Some(text.as_str()),
                        _ => None,
                    })
                    .collect(),
            )
        })
        .collect()
}

/// `text` as it is indexed as an entry of `kind`: the marks a highlight uses
/// made spaces, cut to [`OUTPUT_CAP`] characters for an output and [`CAP`]
/// for anything else, or nothing where it is only white space.
#[must_use]
pub fn indexed(kind: Kind, text: &str) -> Option<String> {
    if text.trim_matches(BLANK).is_empty() {
        return None;
    }
    let cap = if kind == Kind::Output {
        OUTPUT_CAP
    } else {
        CAP
    };
    Some(
        text.chars()
            .take(cap)
            .map(|one| {
                if one == OPEN || one == CLOSE {
                    ' '
                } else {
                    one
                }
            })
            .collect(),
    )
}

/// What counts as an empty entry's white space, as `SQLite`'s `trim` is told.
const BLANK: [char; 4] = [' ', '\t', '\n', '\r'];

/// What a person typed, as what an entry must hold.
///
/// Every word must be in the entry. A phrase in double quotes must be there
/// as it is written, its white space as one space. A `*` at a word's end is
/// taken off, since a word already matches the start of a longer one. Any
/// other character is a character to find, so no input is an error: a quote
/// left open runs to the end, and `AND`, `-` or `(` are words like any other.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Query {
    needles: Vec<String>,
}

impl Query {
    /// The query in `typed`.
    #[must_use]
    pub fn parse(typed: &str) -> Self {
        let mut needles = Vec::new();
        for (at, piece) in typed.split('"').enumerate() {
            // Between quotes on every odd piece; a quote left open leaves the
            // rest of the text as the last one.
            if at % 2 == 1 {
                needles.push(piece.split_whitespace().collect::<Vec<_>>().join(" "));
            } else {
                needles.extend(
                    piece
                        .split_whitespace()
                        .map(|word| word.trim_end_matches('*').to_owned()),
                );
            }
        }
        needles.retain(|needle| !needle.is_empty());
        needles.dedup();
        Self { needles }
    }

    /// Whether nothing was typed that could match.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.needles.is_empty()
    }

    /// Each word and phrase, as typed.
    #[must_use]
    pub fn needles(&self) -> &[String] {
        &self.needles
    }

    /// The words the trigram index can find.
    pub(crate) fn long(&self) -> impl Iterator<Item = &str> {
        self.needles
            .iter()
            .map(String::as_str)
            .filter(|needle| needle.chars().count() >= GRAM)
    }

    /// The words too short for the index, folded A to Z, as `SQLite`'s
    /// `lower` folds them.
    pub(crate) fn short(&self) -> Vec<String> {
        self.needles
            .iter()
            .filter(|needle| needle.chars().count() < GRAM)
            .map(|needle| needle.to_ascii_lowercase())
            .collect()
    }

    /// The query as an FTS5 expression of the long words, each a string in
    /// double quotes with its own quotes doubled, so nothing typed is read as
    /// an operator.
    #[cfg(any(feature = "sqlite", test))]
    pub(crate) fn expression(&self) -> Option<String> {
        let quoted: Vec<String> = self
            .long()
            .map(|needle| format!("\"{}\"", needle.replace('"', "\"\"")))
            .collect();
        (!quoted.is_empty()).then(|| quoted.join(" AND "))
    }
}

/// What to find, and how much of it.
#[derive(Clone, Debug)]
pub struct Search {
    pub query: Query,
    /// The kinds of entry read. Empty reads none.
    pub kinds: Vec<Kind>,
    /// The traces read, or every one.
    pub within: Option<Vec<Id>>,
    /// How many traces to pass over, for a later page.
    pub offset: usize,
    /// The most traces answered.
    pub limit: usize,
    /// The most matches answered for each trace.
    pub per_trace: usize,
    /// What a match's age is counted from.
    pub now: DateTime<Utc>,
}

impl Search {
    /// `query` in every kind of entry of every trace: the first 20 traces,
    /// each with its best [`PER_TRACE`] matches.
    #[must_use]
    pub fn new(query: Query) -> Self {
        Self {
            kinds: Kind::ALL.to_vec(),
            limit: 20,
            now: Utc::now(),
            offset: 0,
            per_trace: PER_TRACE,
            query,
            within: None,
        }
    }

    /// Whether nothing could match, so a store need not look.
    pub(crate) fn finds_nothing(&self) -> bool {
        self.query.is_empty() || self.kinds.is_empty() || self.limit == 0 || self.per_trace == 0
    }
}

/// A line of an entry, with where its matches are.
#[derive(Clone, Debug, PartialEq)]
pub struct Snippet {
    /// One line, cut to a window around the first match, with an ellipsis
    /// where it was cut.
    pub text: String,
    /// Each match, in characters of `text`, in order and never overlapping.
    pub marks: Vec<Range<usize>>,
}

/// One entry a search matched.
#[derive(Clone, Debug, PartialEq)]
pub struct Hit {
    pub at: DateTime<Utc>,
    pub kind: Kind,
    /// The node it is in, or none for a title.
    pub node: Option<Id>,
    /// How well it matched: lower is better, as FTS5's `bm25` counts.
    pub score: f64,
    pub snippet: Snippet,
}

/// One trace a search matched, with its best matches first.
#[derive(Clone, Debug, PartialEq)]
pub struct Found {
    /// How many of its entries matched.
    pub count: usize,
    pub hits: Vec<Hit>,
    pub trace: Id,
}

/// One page of what a search found, best trace first.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Page {
    pub found: Vec<Found>,
    /// How many traces matched, on every page.
    pub total: usize,
}

/// How much a match made at `at` counts, from one now to a half at [`HALF`]
/// days, so of two equal matches the newer leads and a much better old one
/// still beats a weak new one.
#[must_use]
pub fn weight(at: DateTime<Utc>, now: DateTime<Utc>) -> f64 {
    #[allow(clippy::cast_precision_loss)] // A day's seconds are far below 2^52.
    let days = (now - at).num_seconds().max(0) as f64 / 86_400.0;
    1.0 / (1.0 + days / HALF)
}

/// `highlighted` without its marks, and where they were, in characters.
#[cfg(any(feature = "sqlite", test))]
pub(crate) fn unmarked(highlighted: &str) -> (String, Vec<Range<usize>>) {
    let mut text = String::with_capacity(highlighted.len());
    let mut marks = Vec::new();
    let mut count = 0;
    let mut open = None;
    for one in highlighted.chars() {
        match one {
            OPEN => open = Some(count),
            CLOSE => marks.extend(open.take().map(|start| start..count)),
            _ => {
                text.push(one);
                count += 1;
            }
        }
    }
    (text, merged(marks))
}

/// A character as the trigram index folds it.
fn folded(one: char) -> char {
    one.to_lowercase().next().unwrap_or(one)
}

/// Where each of `needles` is in `text`, overlapping or not, in characters,
/// with each character folded by `fold`.
fn found(text: &str, needles: &[String], fold: fn(char) -> char) -> Vec<Range<usize>> {
    let held: Vec<char> = text.chars().map(fold).collect();
    let mut marks = Vec::new();
    for needle in needles {
        let wanted: Vec<char> = needle.chars().map(fold).collect();
        if wanted.is_empty() || wanted.len() > held.len() {
            continue;
        }
        for start in 0..=held.len() - wanted.len() {
            if held[start..start + wanted.len()] == wanted[..] {
                marks.push(start..start + wanted.len());
            }
        }
    }
    marks
}

/// `marks` in order, each overlapping pair made one.
fn merged(mut marks: Vec<Range<usize>>) -> Vec<Range<usize>> {
    marks.sort_by_key(|mark| (mark.start, mark.end));
    let mut joined: Vec<Range<usize>> = Vec::with_capacity(marks.len());
    for mark in marks {
        match joined.last_mut() {
            Some(last) if mark.start < last.end => last.end = last.end.max(mark.end),
            _ => joined.push(mark),
        }
    }
    joined
}

/// The marks of the short words, which a query with no long word shows,
/// since the index marks only what it found.
pub(crate) fn short_marks(text: &str, query: &Query) -> Vec<Range<usize>> {
    if query.long().next().is_some() {
        return Vec::new();
    }
    merged(found(text, &query.short(), |one: char| {
        one.to_ascii_lowercase()
    }))
}

/// Whether `text` holds every word of `query`, as the index finds them.
pub(crate) fn holds(text: &str, query: &Query) -> bool {
    let long: Vec<String> = query.long().map(str::to_owned).collect();
    let lowered = text.to_ascii_lowercase();
    long.iter()
        .all(|needle| !found(text, std::slice::from_ref(needle), folded).is_empty())
        && query
            .short()
            .iter()
            .all(|needle| lowered.contains(needle.as_str()))
}

/// The marks in `text` of `query`, as the index marks them: each long word
/// wherever it is, or the short ones where there is no long word.
pub(crate) fn marks(text: &str, query: &Query) -> Vec<Range<usize>> {
    let long: Vec<String> = query.long().map(str::to_owned).collect();
    if long.is_empty() {
        return short_marks(text, query);
    }
    merged(found(text, &long, folded))
}

/// How well `text` matches `query`, the reference store's stand-in for
/// `bm25`: minus how many times its long words occur, or minus one where
/// there are none.
pub(crate) fn relevance(text: &str, query: &Query) -> f64 {
    let long: Vec<String> = query.long().map(str::to_owned).collect();
    if long.is_empty() {
        return -1.0;
    }
    #[allow(clippy::cast_precision_loss)] // An entry is at most CAP characters.
    let times = found(text, &long, folded).len() as f64;
    -times
}

/// The line of `text` its first mark is on, cut to [`WINDOW`] characters
/// from the start of a word up to [`BEFORE`] before the mark, with the marks
/// in it.
#[must_use]
pub fn snippet(text: &str, marks: &[Range<usize>]) -> Snippet {
    let chars: Vec<char> = text.chars().collect();
    let first = marks.first().map_or(0, |mark| mark.start.min(chars.len()));
    let line_start = chars[..first]
        .iter()
        .rposition(|one| *one == '\n')
        .map_or(0, |at| at + 1);
    let line_end = chars[first..]
        .iter()
        .position(|one| *one == '\n')
        .map_or(chars.len(), |at| first + at);
    let blank = |one: &char| one.is_whitespace();
    let opens = (line_start..first)
        .find(|at| !blank(&chars[*at]))
        .unwrap_or(first);
    let closes = (first..line_end)
        .rev()
        .find(|at| !blank(&chars[*at]))
        .map_or(line_end, |at| at + 1)
        .max(first);
    let mut start = first.saturating_sub(BEFORE).max(opens);
    // From the start of a word, where the cut is inside one.
    while start > opens && start < first && !blank(&chars[start - 1]) {
        start += 1;
    }
    let end = (start + WINDOW).min(closes);
    let cut_before = start > opens;
    let shift = usize::from(cut_before);
    let mut shown: String = if cut_before {
        "…".into()
    } else {
        String::new()
    };
    shown.extend(
        chars[start..end]
            .iter()
            .map(|one| if blank(one) { ' ' } else { *one }),
    );
    if end < closes {
        shown.push('…');
    }
    let marks = marks
        .iter()
        .filter(|mark| mark.end > start && mark.start < end)
        .map(|mark| (mark.start.max(start) - start + shift)..(mark.end.min(end) - start + shift))
        .collect();
    Snippet { marks, text: shown }
}

/// An entry the reference store matched, before it is ranked.
pub(crate) struct Scored {
    pub(crate) at: DateTime<Utc>,
    pub(crate) kind: Kind,
    pub(crate) node: Option<Id>,
    /// Where it was written among every entry, which breaks a tie.
    pub(crate) order: usize,
    pub(crate) score: f64,
    pub(crate) text: String,
    pub(crate) trace: Id,
}

/// The page of `scored` that `search` asks for: each trace's matches best
/// first, newest first among equals, and the traces by their best match.
pub(crate) fn paged(mut scored: Vec<Scored>, search: &Search) -> Page {
    scored.sort_by(|one, other| {
        one.score
            .total_cmp(&other.score)
            .then(other.at.cmp(&one.at))
            .then(other.order.cmp(&one.order))
    });
    let mut traces: Vec<(Id, Vec<Scored>)> = Vec::new();
    for one in scored {
        match traces.iter_mut().find(|(trace, _)| *trace == one.trace) {
            Some((_, held)) => held.push(one),
            None => traces.push((one.trace, vec![one])),
        }
    }
    traces.sort_by(|(one, first), (other, second)| {
        first[0]
            .score
            .total_cmp(&second[0].score)
            .then(other.cmp(one))
    });
    let total = traces.len();
    let found = traces
        .into_iter()
        .skip(search.offset)
        .take(search.limit)
        .map(|(trace, held)| Found {
            count: held.len(),
            hits: held
                .into_iter()
                .take(search.per_trace)
                .map(|one| {
                    let marks = marks(&one.text, &search.query);
                    Hit {
                        at: one.at,
                        kind: one.kind,
                        node: one.node,
                        score: one.score,
                        snippet: snippet(&one.text, &marks),
                    }
                })
                .collect(),
            trace,
        })
        .collect();
    Page { found, total }
}

#[cfg(test)]
// A mark is a range, and one mark is still a list of them.
#[allow(clippy::single_range_in_vec_init)]
mod tests {
    use super::*;

    fn needles(typed: &str) -> Vec<String> {
        Query::parse(typed).needles().to_vec()
    }

    #[test]
    fn a_query_is_words_phrases_and_prefixes_and_never_an_error() {
        assert_eq!(needles("zebra  total"), vec!["zebra", "total"]);
        assert_eq!(
            needles("\"exact   phrase\" more"),
            vec!["exact phrase", "more"]
        );
        assert_eq!(needles("check*"), vec!["check"]);
        assert_eq!(needles("\"open quote"), vec!["open quote"]);
        assert_eq!(
            needles("a AND (b) -c NEAR"),
            vec!["a", "AND", "(b)", "-c", "NEAR"]
        );
        assert!(Query::parse("  \"\" * ").is_empty());
        assert_eq!(
            Query::parse("say \"he\"\"s\" ok").expression().as_deref(),
            Some("\"say\"")
        );
        assert_eq!(
            Query::parse("x\"y z").expression().as_deref(),
            Some("\"y z\"")
        );
        assert_eq!(Query::parse("It's \"Ab\" -1").short(), vec!["ab", "-1"]);
    }

    #[test]
    fn an_entry_is_capped_and_a_blank_one_is_none() {
        let long = "é".repeat(CAP + 5);
        assert_eq!(indexed(Kind::Reply, " \n\t"), None);
        assert_eq!(indexed(Kind::Reply, &long).unwrap().chars().count(), CAP);
        assert_eq!(
            indexed(Kind::Output, &long).unwrap().chars().count(),
            OUTPUT_CAP
        );
        assert_eq!(
            indexed(Kind::Message, "a\u{2}b\u{3}").as_deref(),
            Some("a b ")
        );
    }

    #[test]
    fn a_tool_call_is_its_name_and_strings_and_its_result() {
        let detail = Detail::ToolCall {
            arguments: serde_json::json!({"command": "cargo test -p trace", "timeout": 30, "paths": ["src/a.rs"]}),
            call_id: None,
            is_error: false,
            name: "shell".into(),
            result: Some(Value::String("ok: 3 passed".into())),
            source: None,
            untrusted: false,
        };

        let read = entries(&detail);

        assert_eq!(
            read,
            vec![
                Entry {
                    kind: Kind::Tool,
                    text: "shell\ncargo test -p trace\nsrc/a.rs".into()
                },
                Entry {
                    kind: Kind::Output,
                    text: "ok: 3 passed".into()
                },
            ]
        );
    }

    #[test]
    fn a_snippet_is_the_line_of_the_first_match_with_its_marks() {
        let text = format!(
            "first line\n{} needle {}\nlast",
            "hay ".repeat(30),
            "straw ".repeat(40)
        );
        let at = text.find("needle").unwrap();
        let marks = vec![at..at + 6];

        let cut = snippet(&text, &marks);

        assert!(cut.text.starts_with("…hay"), "{}", cut.text);
        assert!(cut.text.ends_with('…'), "{}", cut.text);
        assert!(!cut.text.contains("first") && !cut.text.contains("last"));
        let mark = &cut.marks[0];
        let marked: String = cut.text.chars().skip(mark.start).take(mark.len()).collect();
        assert_eq!(marked, "needle");
        assert_eq!(snippet("  short\n", &[2..7]).text, "short");
        assert_eq!(snippet("  short\n", &[2..7]).marks, vec![0..5]);
    }

    #[test]
    fn highlighted_text_gives_back_its_marks() {
        let (text, marks) = unmarked("a \u{2}zebra\u{3} and \u{2}é\u{3}");
        assert_eq!(text, "a zebra and é");
        assert_eq!(marks, vec![2..7, 12..13]);
    }

    #[test]
    fn marks_overlap_into_one_and_a_short_word_marks_alone() {
        let query = Query::parse("aaa");
        assert_eq!(marks("xaaaay", &query), vec![1..5]);
        assert_eq!(marks("go to it", &Query::parse("go")), vec![0..2]);
        assert_eq!(marks("go zebra", &Query::parse("go zebra")), vec![3..8]);
    }

    #[test]
    fn a_match_counts_less_as_it_ages() {
        let now = Utc::now();
        assert!((weight(now, now) - 1.0).abs() < f64::EPSILON);
        assert!((weight(now - chrono::TimeDelta::days(30), now) - 0.5).abs() < 1e-9);
    }
}

/// The search every backend must answer the same, run by the store's suite.
#[cfg(test)]
// A mark is a range, and one mark is still a list of them.
#[allow(clippy::single_range_in_vec_init)]
pub(crate) mod conformance {
    use fusion_cortex_core::{
        provider::{Block, Message, Role},
        Id,
    };
    use serde_json::json;

    use super::{Kind, Query, Search};
    use crate::{store::Store, Detail, Node, Part, Placed};

    fn task(goal: &str) -> Node {
        Node::new(
            Detail::Task {
                checks: Vec::new(),
                goal: goal.into(),
                project: None,
                revision: None,
            },
            Vec::new(),
        )
    }

    fn reply(content: &str) -> Node {
        Node::new(
            Detail::Output {
                call: None,
                content: content.into(),
                input_tokens: 1,
                model: "test".into(),
                output_tokens: 1,
                prompt_version: "test/v1".into(),
            },
            Vec::new(),
        )
    }

    fn called(arguments: serde_json::Value, result: &str) -> Node {
        Node::new(
            Detail::ToolCall {
                arguments,
                call_id: None,
                is_error: false,
                name: "shell".into(),
                result: Some(serde_json::Value::String(result.into())),
                source: None,
                untrusted: false,
            },
            Vec::new(),
        )
    }

    /// A context holding the task and each of `said` after it, the last
    /// joined to a tool's results in one message as a strategy merges them.
    fn context(said: &[&str]) -> Node {
        let part = |part, message, blocks| Placed {
            pieces: Vec::new(),
            blocks,
            message,
            part,
            pinned: true,
            reason: "test".into(),
            sources: Vec::new(),
            tokens: 1,
        };
        let mut messages = vec![Message::text(Role::User, "the task")];
        let mut placed = vec![part(Part::Task, 0, 1)];
        for text in said {
            messages.push(Message {
                content: vec![
                    Block::ToolResult {
                        content: vec![Block::text("a result that says readme")],
                        is_error: false,
                        tool_use_id: "a".into(),
                    },
                    Block::text(*text),
                ],
                role: Role::User,
            });
            let at = messages.len() - 1;
            placed.push(part(Part::Results, at, 1));
            placed.push(part(Part::Instruction, at, 1));
        }
        Node::new(
            Detail::Context {
                dropped: Vec::new(),
                format: None,
                messages,
                placed,
                strategy: "test".into(),
                tools: Vec::new(),
            },
            Vec::new(),
        )
    }

    fn within(typed: &str, traces: &[Id]) -> Search {
        Search {
            within: Some(traces.to_vec()),
            ..Search::new(Query::parse(typed))
        }
    }

    /// The traces found, by id, each with the kinds of its hits by name.
    /// Which trace and which of its hits leads is each backend's measure of a
    /// better match: `bm25` takes the length of an entry into account, and
    /// Postgres's `ts_rank` counts trigrams. The suite holds which entries
    /// match, and [`ranking`] holds an order a backend may keep.
    async fn kinds(store: &dyn Store, search: &Search) -> Vec<(Id, Vec<Kind>)> {
        let mut found: Vec<(Id, Vec<Kind>)> = store
            .find(search)
            .await
            .unwrap()
            .found
            .into_iter()
            .map(|found| {
                let mut kinds: Vec<Kind> = found.hits.iter().map(|hit| hit.kind).collect();
                kinds.sort_by_key(|kind| kind.name());
                (found.trace, kinds)
            })
            .collect();
        found.sort_by_key(|(trace, _)| *trace);
        found
    }

    /// The traces found, in the order the store ranks them.
    async fn ranked(store: &dyn Store, search: &Search) -> Vec<Id> {
        store
            .find(search)
            .await
            .unwrap()
            .found
            .into_iter()
            .map(|found| found.trace)
            .collect()
    }

    pub(crate) async fn run(store: &dyn Store) {
        every_word_is_found_in_every_kind_of_entry(store).await;
        a_message_is_found_once_where_it_was_first_said(store).await;
        phrases_prefixes_and_short_words_match_as_typed(store).await;
        nothing_typed_is_an_error(store).await;
        a_ranked_search_finds_every_match(store).await;
        a_snippet_marks_each_match_on_its_line(store).await;
        pages_count_every_trace(store).await;
        a_title_is_found_until_its_trace_is_gone(store).await;
        a_deleted_node_takes_its_entries(store).await;
        an_output_is_read_to_its_cap(store).await;
    }

    async fn an_output_is_read_to_its_cap(store: &dyn Store) {
        let session = Id::new();
        let past = |word: &str| format!("{} {word}", "x".repeat(super::OUTPUT_CAP));
        store
            .append(
                session,
                &called(json!({"command": "cat log"}), &past("gnu")),
            )
            .await
            .unwrap();
        store.append(session, &reply(&past("yak"))).await.unwrap();

        assert!(kinds(store, &within("gnu", &[session])).await.is_empty());
        assert_eq!(
            kinds(store, &within("yak", &[session])).await,
            vec![(session, vec![Kind::Reply])],
            "a reply is read further than an output"
        );
    }

    async fn every_word_is_found_in_every_kind_of_entry(store: &dyn Store) {
        let (cart, other) = (Id::new(), Id::new());
        store
            .append(cart, &task("Fix the Zebra checkout"))
            .await
            .unwrap();
        store
            .append(cart, &reply("The zebra total was off by one."))
            .await
            .unwrap();
        store
            .append(
                cart,
                &called(
                    json!({"command": "grep -rn useCheckoutTotal src/", "timeout": 30}),
                    "src/cart.ts:12: const total = useCheckoutTotal(items)",
                ),
            )
            .await
            .unwrap();
        store.append(other, &task("Nothing to see")).await.unwrap();
        // A source is read by no search: an agent's are the same instruction
        // files in every session.
        let noted = Node::new(
            Detail::Source {
                content: "A zebra note".into(),
                uri: None,
            },
            Vec::new(),
        );
        store.append(other, &noted).await.unwrap();
        let ours = [cart, other];

        assert_eq!(
            kinds(store, &within("zebra", &ours)).await,
            vec![(cart, vec![Kind::Message, Kind::Reply])]
        );
        assert_eq!(
            kinds(store, &within("CHECKOUTTOTAL", &ours)).await,
            vec![(cart, vec![Kind::Output, Kind::Tool])],
            "a word is found inside an identifier, in any case"
        );
        assert_eq!(
            kinds(store, &within("zebra total", &ours)).await,
            vec![(cart, vec![Kind::Reply])],
            "every word in one entry"
        );
        assert_eq!(
            kinds(
                store,
                &Search {
                    kinds: vec![Kind::Message],
                    ..within("zebra", &ours)
                }
            )
            .await,
            vec![(cart, vec![Kind::Message])]
        );
        assert!(kinds(store, &within("zebra", &[other])).await.is_empty());
        assert!(kinds(store, &within("timeout", &ours)).await.is_empty());
    }

    async fn a_message_is_found_once_where_it_was_first_said(store: &dyn Store) {
        let session = Id::new();
        store.append(session, &task("Tidy the docs")).await.unwrap();
        let first = context(&["also check the README"]);
        let second = context(&["also check the README", "and the Changelog"]);
        store.append(session, &first).await.unwrap();
        store.append(session, &second).await.unwrap();

        let readme = store.find(&within("readme", &[session])).await.unwrap();
        let changelog = store.find(&within("changelog", &[session])).await.unwrap();

        let hits = &readme.found[0].hits;
        assert_eq!(readme.found[0].count, 1, "said once, and not its results");
        assert_eq!(hits[0].node, Some(first.id));
        assert_eq!(hits[0].kind, Kind::Message);
        assert_eq!(hits[0].snippet.text, "also check the README");
        assert_eq!(changelog.found[0].hits[0].node, Some(second.id));
        assert_eq!(changelog.found[0].hits[0].snippet.text, "and the Changelog");
    }

    async fn phrases_prefixes_and_short_words_match_as_typed(store: &dyn Store) {
        let session = Id::new();
        store
            .append(session, &task("go build the quick brown fox"))
            .await
            .unwrap();
        let found = |typed: &'static str| async move {
            !kinds(store, &within(typed, &[session])).await.is_empty()
        };

        assert!(found("\"quick brown\"").await);
        assert!(found("\"QUICK   brown\"").await);
        assert!(!found("\"brown quick\"").await, "a phrase in its order");
        assert!(found("bro*").await);
        assert!(found("brown go").await);
        assert!(found("go").await);
        assert!(!found("go zz").await);
        let alone = store.find(&within("go", &[session])).await.unwrap();
        assert_eq!(
            alone.found[0].hits[0].snippet.marks,
            vec![0..2],
            "a short word is marked where no word is long"
        );
    }

    async fn nothing_typed_is_an_error(store: &dyn Store) {
        let session = Id::new();
        store
            .append(session, &task("say \"hi\" AND (exit) -1 col:x ^a NEAR(b)"))
            .await
            .unwrap();
        for typed in [
            "\"",
            "\"\"\"",
            "zebra\"",
            "AND",
            "OR NOT",
            "(exit)",
            "NEAR(b)",
            "col:x",
            "^a",
            "-1",
            "*",
            "**zz",
            "\"hi\" AND",
            "'; DROP TABLE nodes; --",
        ] {
            let page = store.find(&within(typed, &[session])).await;
            assert!(page.is_ok(), "{typed:?}: {page:?}");
        }
        assert_eq!(
            kinds(store, &within("(exit) NEAR(b) col:x", &[session])).await,
            vec![(session, vec![Kind::Message])],
            "an operator is a word to find"
        );
        assert!(store
            .find(&within("  ", &[session]))
            .await
            .unwrap()
            .found
            .is_empty());
    }

    /// Every match of a ranked search is found, whatever order a backend
    /// gives them.
    async fn a_ranked_search_finds_every_match(store: &dyn Store) {
        let (once, thrice, old, new) = seeded(store).await;

        let counted = kinds(store, &within("kiwi", &[once, thrice])).await;
        let dated = kinds(store, &within("mango", &[old, new])).await;

        let mut both = [once, thrice];
        both.sort();
        assert_eq!(
            counted
                .into_iter()
                .map(|(trace, _)| trace)
                .collect::<Vec<_>>(),
            both
        );
        let mut both = [old, new];
        both.sort();
        assert_eq!(
            dated
                .into_iter()
                .map(|(trace, _)| trace)
                .collect::<Vec<_>>(),
            both
        );
    }

    /// The order the reference ranks in: more of a word leads, and of two
    /// equal matches the newer leads. A backend whose measure keeps it runs
    /// this beside [`run`].
    pub(crate) async fn ranking(store: &dyn Store) {
        let (once, thrice, old, new) = seeded(store).await;

        let counted = ranked(store, &within("kiwi", &[once, thrice])).await;
        let dated = ranked(store, &within("mango", &[old, new])).await;

        assert_eq!(counted, vec![thrice, once], "more of the word leads");
        assert_eq!(
            dated,
            vec![new, old],
            "of two equal matches the newer leads"
        );
    }

    /// Two traces that say a word once and three times, and two that say
    /// the same thing now and 90 days ago.
    async fn seeded(store: &dyn Store) -> (Id, Id, Id, Id) {
        let (once, thrice) = (Id::new(), Id::new());
        store
            .append(thrice, &task("kiwi kiwi kiwi apple pear"))
            .await
            .unwrap();
        store
            .append(once, &task("kiwi apple pear plum figs"))
            .await
            .unwrap();
        let (old, new) = (Id::new(), Id::new());
        store
            .append(new, &task("mango smoothie recipe"))
            .await
            .unwrap();
        let aged = Node {
            created_at: chrono::Utc::now() - chrono::TimeDelta::days(90),
            ..task("mango smoothie recipe")
        };
        store.append(old, &aged).await.unwrap();
        (once, thrice, old, new)
    }

    async fn a_snippet_marks_each_match_on_its_line(store: &dyn Store) {
        let session = Id::new();
        let output = format!(
            "running 3 tests\n{}test cart::zebra_total ... FAILED, Zebra again\ndone",
            "    "
        );
        store
            .append(session, &called(json!({"command": "cargo test"}), &output))
            .await
            .unwrap();
        store
            .append(session, &reply("aaaa is the sound"))
            .await
            .unwrap();

        let page = store.find(&within("zebra", &[session])).await.unwrap();
        let overlapping = store.find(&within("aaa", &[session])).await.unwrap();

        let snippet = &page.found[0].hits[0].snippet;
        assert_eq!(
            snippet.text,
            "test cart::zebra_total ... FAILED, Zebra again"
        );
        assert_eq!(snippet.marks, vec![11..16, 35..40]);
        assert_eq!(overlapping.found[0].hits[0].snippet.marks, vec![0..4]);
    }

    async fn pages_count_every_trace(store: &dyn Store) {
        let mut traces = Vec::new();
        for at in 0..5 {
            let trace = Id::new();
            store
                .append(trace, &task(&format!("walrus number {at}")))
                .await
                .unwrap();
            store
                .append(trace, &reply("a walrus replied"))
                .await
                .unwrap();
            traces.push(trace);
        }
        let paged = |offset, limit| Search {
            limit,
            offset,
            per_trace: 1,
            ..within("walrus", &traces)
        };

        let first = store.find(&paged(0, 2)).await.unwrap();
        let last = store.find(&paged(4, 2)).await.unwrap();
        let past = store.find(&paged(9, 2)).await.unwrap();

        assert_eq!((first.found.len(), first.total), (2, 5));
        assert_eq!(first.found[0].hits.len(), 1);
        assert_eq!(first.found[0].count, 2, "the count is of every match");
        assert_eq!((last.found.len(), last.total), (1, 5));
        assert_eq!((past.found.len(), past.total), (0, 5));
        let seen: std::collections::HashSet<Id> =
            [&first, &store.find(&paged(2, 2)).await.unwrap(), &last]
                .iter()
                .flat_map(|page| page.found.iter().map(|found| found.trace))
                .collect();
        assert_eq!(seen.len(), 5, "each trace on one page");
    }

    async fn a_title_is_found_until_its_trace_is_gone(store: &dyn Store) {
        let (named, unheld) = (Id::new(), Id::new());
        store.append(named, &task("Tidy the README")).await.unwrap();

        store.title(named, Some("Basket docs")).await.unwrap();
        store.title(unheld, Some("Basket ghost")).await.unwrap();
        let titled = store
            .find(&within("basket", &[named, unheld]))
            .await
            .unwrap();
        store.title(named, Some("Shelf docs")).await.unwrap();
        let renamed = kinds(store, &within("basket", &[named])).await;
        let shelf = kinds(store, &within("shelf", &[named])).await;
        store.forget(named).await.unwrap();
        let forgotten = kinds(store, &within("shelf", &[named])).await;

        assert_eq!(titled.found.len(), 1, "a trace the store holds");
        let hit = &titled.found[0].hits[0];
        assert_eq!((hit.kind, hit.node), (Kind::Title, None));
        assert_eq!(hit.snippet.text, "Basket docs");
        assert!(renamed.is_empty());
        assert_eq!(shelf, vec![(named, vec![Kind::Title])]);
        assert!(forgotten.is_empty());
    }

    async fn a_deleted_node_takes_its_entries(store: &dyn Store) {
        let session = Id::new();
        let asked = task("Find the narwhal");
        let answered = Node {
            derived_from: vec![asked.id],
            ..reply("The narwhal is here")
        };
        let kept = task("narwhal again");
        store.append(session, &asked).await.unwrap();
        store.append(session, &answered).await.unwrap();
        store.append(session, &kept).await.unwrap();

        store.delete_cascade(asked.id).await.unwrap();
        let page = store.find(&within("narwhal", &[session])).await.unwrap();

        assert_eq!(page.found[0].count, 1);
        assert_eq!(page.found[0].hits[0].node, Some(kept.id));
    }
}
