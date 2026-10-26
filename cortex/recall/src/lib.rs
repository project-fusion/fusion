//! Context assembly: what a model call is shown.
//!
//! **A context is assembled, never accumulated.** A loop keeps its whole
//! history as [`Item`]s, and [`assemble`] builds each call's context from them
//! to fit the model's window. Trace records what was placed and why, and what
//! was dropped, on the context node, so a reader can tell what the model saw
//! and a replay sends it the same.
//!
//! **Pinned parts are never dropped.** The rules, the task, and what the
//! person said after it stay whole however full the window is, because those
//! are what a harness that summarizes its history loses first.
//!
//! **Compaction clears before it drops, and records both.** Over the window,
//! the oldest tool results are cleared to a line that names the call, then the
//! oldest whole turns go, then the facts from memory. The latest turns stay
//! whole. Each step is a [`Dropped`], and the context gains one summary that
//! names what the dropped turns did, beside the loop's own account of where
//! the task stands.
//!
//! **Retrieval is a strategy.** A [`Scorer`] ranks Engram's facts against a
//! query. [`Overlap`] counts shared words, [`Vector`] compares the question's
//! embedding with each fact's, and [`Weighted`] combines scorers, so a
//! paraphrase and an exact term both count. Each reports a pinned id, and
//! [`Scorer::explain`] records why a fact was placed.
//!
//! **A caller names the scopes it may read.** [`relevant`] places no fact
//! whose scope is outside them, however well it scores.

use std::{collections::HashMap, fmt::Write as _};

use fusion_cortex_core::{
    embed::{Embedder, Embedding, Purpose},
    provider::{Block, Message, Role},
    Id, Result,
};
use fusion_cortex_engram::{Fact, Scope};
pub use fusion_cortex_trace::{Dropped, Part, Piece, Placed};

/// The name a context node records for this assembly.
pub const STRATEGY: &str = "recall/1";

/// How a compaction's summary begins, which is how a later assembly finds an
/// old one to replace.
pub const SUMMARY: &str =
    "Part of this session was dropped to fit the context window. The session's trace holds all of it.";

/// One message of a session's history, with what Recall needs to place it.
#[derive(Clone, Debug, PartialEq)]
pub struct Item {
    /// The blocks of a results message no compaction may clear, such as a
    /// skill the model read, by their place in the message. A turn whose
    /// results keep a block is never dropped.
    pub kept: Vec<usize>,
    pub message: Message,
    pub part: Part,
    /// Whether no compaction may drop or clear it.
    pub pinned: bool,
    /// Why it is in the context, as the context node records it.
    pub reason: String,
    /// What it is made of, where the loop that built it says: the rules as the
    /// system prompt, the instruction files, the skills, and the servers'
    /// instructions, each with its size estimated by [`text_tokens`].
    pub pieces: Vec<Piece>,
    /// The trace nodes it came from: a turn's output, or each tool call whose
    /// result a results message holds, in order.
    pub sources: Vec<Id>,
}

impl Item {
    /// A part of a context. The rules, the task, and the person's own words
    /// are pinned, and the rest is not.
    #[must_use]
    pub fn new(part: Part, message: Message, reason: impl Into<String>) -> Self {
        Self {
            kept: Vec::new(),
            message,
            part,
            pinned: matches!(
                part,
                Part::Rules | Part::Task | Part::Instruction | Part::Summary
            ),
            reason: reason.into(),
            pieces: Vec::new(),
            sources: Vec::new(),
        }
    }

    /// The item, with what it is made of, so the context node can say.
    #[must_use]
    pub fn with_pieces(mut self, pieces: Vec<Piece>) -> Self {
        self.pieces = pieces;
        self
    }

    /// The item, keeping the results at `blocks` from any compaction.
    #[must_use]
    pub fn keeping(mut self, blocks: Vec<usize>) -> Self {
        self.kept = blocks;
        self
    }

    /// The item, pinned or not.
    #[must_use]
    pub fn pinned(mut self, pinned: bool) -> Self {
        self.pinned = pinned;
        self
    }

    /// The item, naming the trace nodes it came from.
    #[must_use]
    pub fn from(mut self, sources: Vec<Id>) -> Self {
        self.sources = sources;
        self
    }
}

/// How much a context may hold.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Window {
    /// The most tokens a context may hold.
    pub tokens: u32,
    /// The latest turns kept whole however full the window is, each with what
    /// came back from it.
    pub recent: usize,
    /// What Recall's estimate is multiplied by: the provider's count over
    /// Recall's, for the last context sent, so the estimate follows the
    /// model's own tokenizer. One where nothing has been sent.
    pub scale: f32,
}

impl Window {
    /// A window that never compacts, for a model whose size is not known.
    #[must_use]
    pub fn unbounded() -> Self {
        Self {
            tokens: u32::MAX,
            recent: 0,
            scale: 1.0,
        }
    }
}

/// A context, ready to send, and its record.
#[derive(Clone, Debug, PartialEq)]
pub struct Assembled {
    /// What was left out.
    pub dropped: Vec<Dropped>,
    /// Recall's own estimate of the context's size, before the scale, which a
    /// loop compares with the provider's count to set the next scale.
    pub estimated: u32,
    pub messages: Vec<Message>,
    /// Each part placed, and why.
    pub placed: Vec<Placed>,
    /// The context's size in tokens, estimated and scaled.
    pub tokens: u32,
}

/// A block's size, estimated: about four characters to a token.
fn block_tokens(block: &Block) -> u32 {
    let characters = match block {
        Block::Text { text } | Block::Thinking { text, .. } => text.len(),
        Block::ToolUse { input, name, .. } => name.len() + input.to_string().len(),
        Block::ToolResult { content, .. } => {
            return content.iter().map(block_tokens).sum::<u32>() + 4;
        }
        // An image costs about what a megapixel does at most APIs.
        Block::Image { .. } => return 1600,
    };
    u32::try_from(characters.div_ceil(4)).unwrap_or(u32::MAX) + 4
}

/// A text's size, estimated: about four characters to a token, the rule a
/// block is sized by, without the few tokens a message adds to its own.
#[must_use]
pub fn text_tokens(text: &str) -> u32 {
    u32::try_from(text.chars().count().div_ceil(4)).unwrap_or(u32::MAX)
}

/// A message's size, estimated in tokens.
///
/// ```
/// use fusion_cortex_core::provider::{Message, Role};
///
/// let message = Message::text(Role::User, "a".repeat(400));
///
/// assert_eq!(fusion_cortex_recall::estimate(&message), 108);
/// ```
#[must_use]
pub fn estimate(message: &Message) -> u32 {
    message.content.iter().map(block_tokens).sum::<u32>() + 4
}

/// The longest target a call's description shows, in characters.
const TARGET: usize = 120;

/// A tool call in a line: its name, and the path, pattern, command, or URL it
/// was given, where it was given one, cut to 120 characters.
#[must_use]
pub fn describe(name: &str, input: &serde_json::Value) -> String {
    ["path", "pattern", "command", "url"]
        .iter()
        .find_map(|key| input[key].as_str())
        .map_or_else(
            || name.to_owned(),
            |target| {
                let line = target.split_whitespace().collect::<Vec<_>>().join(" ");
                if line.chars().count() > TARGET {
                    let cut: String = line.chars().take(TARGET).collect();
                    format!("{name} {cut}…")
                } else {
                    format!("{name} {line}")
                }
            },
        )
}

/// The room the summary keeps for the calls the dropped turns made, in tokens.
const CALLED: u32 = 150;

/// The dropped turns' calls, as many as fit the room kept for them, and a
/// count of the rest.
fn listed(calls: &[String]) -> String {
    let room = usize::try_from(CALLED * 4).unwrap_or(usize::MAX) - 40;
    let mut said = String::new();
    for (index, call) in calls.iter().enumerate() {
        if said.len() + call.len() + 2 > room {
            let _ = write!(said, "; and {} more", calls.len() - index);
            break;
        }
        if index > 0 {
            said.push_str("; ");
        }
        said.push_str(call);
    }
    said
}

fn scaled(tokens: u32, scale: f32) -> u32 {
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        clippy::cast_precision_loss,
        reason = "an estimate, clamped to the range of a token count"
    )]
    let scaled = (tokens as f32 * scale.max(0.0)).min(u32::MAX as f32) as u32;
    scaled
}

/// One item while it is assembled.
struct Working {
    item: Item,
    kept: bool,
    tokens: u32,
}

/// A context while it is assembled: its items, and what has gone.
struct Assembly {
    /// The budget each stage works to: the window, less the room the summary
    /// keeps once anything must go.
    budget: u32,
    /// A summary an earlier assembly wrote, which this one keeps where it
    /// drops nothing and extends where it does, and its size.
    earlier: Option<(String, u32)>,
    /// The calls the dropped turns made.
    called: Vec<String>,
    dropped: Vec<Dropped>,
    /// Where the latest turns begin, which no stage touches.
    tail: usize,
    window: Window,
    working: Vec<Working>,
}

impl Assembly {
    fn new(items: &[Item], window: Window, state: Option<&str>) -> Self {
        // A summary from an earlier assembly, as its own item or inside the
        // task, is held apart, to be kept or extended.
        let mut earlier = None;
        let mut working: Vec<Working> = Vec::new();
        for item in items {
            let mut item = item.clone();
            item.message.content.retain(|block| match block {
                Block::Text { text } if text.starts_with(SUMMARY) => {
                    earlier = Some(text.clone());
                    false
                }
                _ => true,
            });
            if item.message.content.is_empty() {
                continue;
            }
            working.push(Working {
                tokens: estimate(&item.message),
                item,
                kept: true,
            });
        }
        let earlier = earlier.map(|text| {
            let tokens = block_tokens(&Block::text(text.clone()));
            (text, tokens)
        });
        let turns: Vec<usize> = working
            .iter()
            .enumerate()
            .filter(|(_, one)| one.item.part == Part::Turn)
            .map(|(index, _)| index)
            .collect();
        let tail = if window.recent == 0 {
            working.len()
        } else {
            turns
                .len()
                .checked_sub(window.recent)
                .map_or(0, |first| turns[first])
        };
        let mut assembly = Self {
            budget: window.tokens,
            earlier,
            called: Vec::new(),
            dropped: Vec::new(),
            tail,
            window,
            working,
        };
        if assembly.total() > window.tokens {
            let state = state.map_or(0, |state| block_tokens(&Block::text(state)));
            assembly.budget = window.tokens.saturating_sub(scaled(
                block_tokens(&Block::text(SUMMARY)) + state + CALLED,
                window.scale,
            ));
        }
        assembly
    }

    /// The kept items' size, scaled, with an earlier summary while nothing
    /// has been dropped to replace it.
    fn total(&self) -> u32 {
        let earlier = match &self.earlier {
            Some((_, tokens)) if self.dropped.is_empty() => *tokens,
            _ => 0,
        };
        scaled(
            self.working
                .iter()
                .filter(|one| one.kept)
                .map(|one| one.tokens)
                .sum::<u32>()
                + earlier,
            self.window.scale,
        )
    }

    fn over(&self) -> bool {
        self.total() > self.budget
    }

    /// Clears the oldest tool results to a line each, until the context fits.
    fn clear(&mut self) {
        for index in 0..self.tail {
            if !self.over() {
                return;
            }
            if self.working[index].item.pinned || self.working[index].item.part != Part::Results {
                continue;
            }
            let calls = self.calls_before(index);
            let one = &mut self.working[index];
            let sources = one.item.sources.clone();
            let kept = one.item.kept.clone();
            for (position, block) in one.item.message.content.iter_mut().enumerate() {
                if kept.contains(&position) {
                    continue;
                }
                let Block::ToolResult {
                    content,
                    tool_use_id,
                    ..
                } = block
                else {
                    continue;
                };
                let summary = calls
                    .get(tool_use_id)
                    .cloned()
                    .unwrap_or_else(|| "a tool call".to_owned());
                let before = content.iter().map(block_tokens).sum::<u32>();
                let stub = vec![Block::text(format!(
                    "[Cleared to fit the context window: {summary}. Call it again to see its result.]"
                ))];
                let after = stub.iter().map(block_tokens).sum::<u32>();
                if after >= before {
                    continue;
                }
                *content = stub;
                self.dropped.push(Dropped {
                    cleared: true,
                    part: Part::Results,
                    source: sources.get(position).copied(),
                    summary,
                    tokens: scaled(before - after, self.window.scale),
                });
            }
            one.tokens = estimate(&one.item.message);
        }
    }

    /// The calls the turn before `index` made, each by its id, in a line.
    /// Ids are looked up in that turn alone: some clients give every turn's
    /// first call the same id.
    fn calls_before(&self, index: usize) -> HashMap<String, String> {
        self.working[..index]
            .iter()
            .rev()
            .find(|one| one.item.part == Part::Turn)
            .map(|turn| {
                turn.item
                    .message
                    .content
                    .iter()
                    .filter_map(|block| match block {
                        Block::ToolUse { id, input, name } => {
                            Some((id.clone(), describe(name, input)))
                        }
                        _ => None,
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    /// How many items the turn at `index` goes with: itself, and what came
    /// back from it. None where it must stay.
    fn unit(&self, index: usize) -> Option<usize> {
        let one = &self.working[index];
        if !one.kept || one.item.part != Part::Turn || one.item.pinned {
            return None;
        }
        let follows = self
            .working
            .get(index + 1)
            .filter(|next| next.item.message.role == Role::User && next.item.part != Part::Turn);
        match follows {
            // A turn whose results are pinned, or keep a block, stays with
            // them.
            Some(next) if next.item.pinned || !next.item.kept.is_empty() => None,
            Some(_) if index + 1 >= self.tail => None,
            Some(_) => Some(2),
            None => Some(1),
        }
    }

    /// Drops the oldest whole turns, each with what came back from it, until
    /// the context fits.
    fn drop_turns(&mut self) {
        let mut index = 0;
        while index < self.tail && self.over() {
            let Some(size) = self.unit(index) else {
                index += 1;
                continue;
            };
            let called: Vec<String> = self.working[index]
                .item
                .message
                .content
                .iter()
                .filter_map(|block| match block {
                    Block::ToolUse { input, name, .. } => Some(describe(name, input)),
                    _ => None,
                })
                .collect();
            let summary = if called.is_empty() {
                "a turn that called no tool".to_owned()
            } else {
                format!("a turn that called {}", called.join(", "))
            };
            self.called.extend(called);
            let freed: u32 = self.working[index..index + size]
                .iter()
                .map(|one| one.tokens)
                .sum();
            for one in &mut self.working[index..index + size] {
                one.kept = false;
            }
            self.dropped.push(Dropped {
                cleared: false,
                part: Part::Turn,
                source: self.working[index].item.sources.first().copied(),
                summary,
                tokens: scaled(freed, self.window.scale),
            });
            index += size;
        }
    }

    /// Drops the facts from memory, until the context fits.
    fn drop_facts(&mut self) {
        for position in 0..self.working.len() {
            if !self.over() {
                return;
            }
            let one = &mut self.working[position];
            if one.item.part == Part::Facts && !one.item.pinned && one.kept {
                one.kept = false;
                self.dropped.push(Dropped {
                    cleared: false,
                    part: Part::Facts,
                    source: one.item.sources.first().copied(),
                    summary: "the facts from memory".to_owned(),
                    tokens: scaled(one.tokens, self.window.scale),
                });
            }
        }
    }

    /// The summary of what went: an earlier one kept where nothing more
    /// went, and otherwise a new one that carries the calls the earlier one
    /// named, and its account of the task where `state` gives none.
    fn summary(&self, state: Option<&str>) -> Option<String> {
        const CALLED_BEFORE: &str = "The dropped turns called: ";
        let earlier = self.earlier.as_ref().map(|(text, _)| text.as_str());
        if self.dropped.is_empty() {
            return earlier.map(str::to_owned);
        }
        let mut called = Vec::new();
        let mut account = None;
        for paragraph in earlier
            .map(|text| text.split("\n\n").skip(1))
            .into_iter()
            .flatten()
        {
            match paragraph.strip_prefix(CALLED_BEFORE) {
                Some(list) => called.push(list.trim_end_matches('.').to_owned()),
                None if account.is_none() => account = Some(paragraph.to_owned()),
                None => {}
            }
        }
        called.extend(self.called.iter().cloned());
        let mut text = SUMMARY.to_owned();
        if !called.is_empty() {
            let _ = write!(text, "\n\n{CALLED_BEFORE}{}.", listed(&called));
        }
        let state = state
            .map(str::trim)
            .filter(|state| !state.is_empty())
            .map(str::to_owned)
            .or(account);
        if let Some(state) = state {
            text.push_str("\n\n");
            text.push_str(&state);
        }
        Some(text)
    }

    /// The messages to send, merging two in a row from the person, and the
    /// summary joined to the task, where the model reads what it is doing.
    fn finish(self, summary: Option<&str>) -> Assembled {
        let scale = self.window.scale;
        let mut messages: Vec<Message> = Vec::new();
        let mut placed = Vec::new();
        let mut estimated = 0;
        // The summary joins the task, or the first message from the person
        // where no part is the task.
        let host = self
            .working
            .iter()
            .position(|one| one.kept && one.item.part == Part::Task)
            .or_else(|| {
                self.working
                    .iter()
                    .position(|one| one.kept && one.item.message.role == Role::User)
            });
        for (index, one) in self.working.iter().enumerate().filter(|(_, one)| one.kept) {
            let merges = messages.last().is_some_and(|last| {
                last.role == one.item.message.role
                    && last.role != Role::System
                    && !one
                        .item
                        .message
                        .content
                        .iter()
                        .any(|block| matches!(block, Block::ToolResult { .. }))
            });
            match messages.last_mut() {
                Some(last) if merges => last
                    .content
                    .extend(one.item.message.content.iter().cloned()),
                _ => messages.push(one.item.message.clone()),
            }
            let at = messages.len() - 1;
            placed.push(Placed {
                pieces: one
                    .item
                    .pieces
                    .iter()
                    .map(|piece| Piece {
                        tokens: scaled(piece.tokens, scale),
                        ..piece.clone()
                    })
                    .collect(),
                blocks: one.item.message.content.len(),
                message: at,
                part: one.item.part,
                pinned: one.item.pinned,
                reason: one.item.reason.clone(),
                sources: one.item.sources.clone(),
                tokens: scaled(one.tokens, scale),
            });
            estimated += one.tokens;
            if let (true, Some(text)) = (host == Some(index), summary) {
                let block = Block::text(text);
                let tokens = block_tokens(&block);
                messages[at].content.push(block);
                placed.push(Placed {
                    pieces: Vec::new(),
                    blocks: 1,
                    message: at,
                    sources: Vec::new(),
                    part: Part::Summary,
                    pinned: true,
                    reason: "what the dropped turns did, and where the task stands".to_owned(),
                    tokens: scaled(tokens, scale),
                });
                estimated += tokens;
            }
        }
        Assembled {
            dropped: self.dropped,
            estimated,
            messages,
            placed,
            tokens: scaled(estimated, scale),
        }
    }
}

/// Builds a context from `items` that fits `window`, and records what it
/// placed and what it left out.
///
/// `state` is the loop's own account of where the task stands, such as its
/// plan, which the summary carries when anything was dropped.
///
/// ```
/// use fusion_cortex_core::provider::{Message, Role};
/// use fusion_cortex_recall::{assemble, Item, Part, Window};
///
/// let mut items = vec![
///     Item::new(Part::Rules, Message::text(Role::System, "Never edit generated files."), "the rules"),
///     Item::new(Part::Task, Message::text(Role::User, "fix the build"), "the task"),
/// ];
/// for turn in 0..20 {
///     items.push(Item::new(Part::Turn, Message::text(Role::Assistant, "x".repeat(400)), "a turn"));
///     items.push(Item::new(Part::Feedback, Message::text(Role::User, "the build still fails"), "a check"));
/// }
/// let window = Window { tokens: 1_000, recent: 2, scale: 1.0 };
///
/// let context = assemble(&items, window, Some("Plan: 1 of 3 steps done."));
///
/// assert!(context.tokens <= 1_000);
/// assert_eq!(context.messages[0].joined(), "Never edit generated files.");
/// assert!(context.messages[1].joined().contains("Plan: 1 of 3 steps done."));
/// assert!(!context.dropped.is_empty());
/// ```
#[must_use]
pub fn assemble(items: &[Item], window: Window, state: Option<&str>) -> Assembled {
    let mut assembly = Assembly::new(items, window, state);
    assembly.clear();
    assembly.drop_turns();
    assembly.drop_facts();
    let summary = assembly.summary(state);
    assembly.finish(summary.as_deref())
}

/// Ranks facts by how well each answers a query.
pub trait Scorer: Send + Sync {
    /// The scorer's pinned, versioned name, which a context records. A
    /// scorer that reads vectors names their model in it.
    fn id(&self) -> &str;

    /// How well `fact` answers `query`, from 0 to 1.
    fn score(&self, query: &str, fact: &Fact) -> f32;

    /// Why `fact` scored as it did, for the reason a context records: the
    /// scorer's id and the score, and for a combination, each part.
    fn explain(&self, query: &str, fact: &Fact) -> String {
        format!("{} {:.2}", self.id(), self.score(query, fact))
    }
}

/// Scores a fact by the share of its words the query holds, ignoring case
/// and words of fewer than three letters.
#[derive(Clone, Copy, Debug, Default)]
pub struct Overlap;

fn words(text: &str) -> std::collections::HashSet<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|word| word.chars().count() >= 3)
        .map(str::to_lowercase)
        .collect()
}

impl Scorer for Overlap {
    // A literal satisfies the trait's `&str`, which a scorer naming its
    // model needs, and that trips the lint.
    #[allow(clippy::unnecessary_literal_bound)]
    fn id(&self) -> &str {
        "overlap/1"
    }

    fn score(&self, query: &str, fact: &Fact) -> f32 {
        let asked = words(query);
        let said = words(&fact.content);
        if said.is_empty() {
            return 0.0;
        }
        #[expect(
            clippy::cast_precision_loss,
            reason = "two word counts, far below where a float loses a unit"
        )]
        let share = said.intersection(&asked).count() as f32 / said.len() as f32;
        share
    }
}

/// Scores a fact by the cosine similarity of its embedding to the question's,
/// below zero counted as zero.
///
/// **Only a fact embedded by the question's model, at its length, scores.**
/// One with no embedding, or another model's, scores zero, so a change of
/// model loses the vector's share until Engram's backfill embeds the facts
/// again, and never compares two spaces. Its id names the model, as in
/// `vector/1 ollama/nomic-embed-text`.
///
/// ```
/// # use fusion_cortex_core::embed::{Embedder, Purpose, Scripted};
/// # use fusion_cortex_engram::{Fact, Scope};
/// # use fusion_cortex_recall::{relevant, Overlap, Scorer, Vector, Weighted};
/// # #[tokio::main]
/// # async fn main() {
/// let embedder = Scripted::new("scripted/1", 2)
///     .with("Dana owns the release notes", vec![0.9, 0.1])
///     .with("each version changed what the docs site looks like", vec![0.1, 0.9])
///     .with("who writes up what changed in each version?", vec![0.8, 0.3]);
/// let mut facts = vec![
///     Fact::new("Dana owns the release notes", vec![], 0.8),
///     Fact::new("each version changed what the docs site looks like", vec![], 0.8),
/// ];
/// for fact in &mut facts {
///     fact.embedding = Some(embedder.embed_one(&fact.content, Purpose::Document).await.unwrap());
/// }
/// let question = "who writes up what changed in each version?";
///
/// let vector = Vector::of(&embedder, question).await.unwrap();
/// let both = Weighted::new(vec![(&Overlap, 0.3), (&vector, 0.7)]);
/// let placed = relevant(&facts, &[Scope::Personal], question, &both, 1, |_| 0.0, 30.0);
///
/// assert_eq!(placed[0].0.content, "Dana owns the release notes");
/// let by_words = relevant(&facts, &[Scope::Personal], question, &Overlap, 1, |_| 0.0, 30.0);
/// assert_eq!(by_words[0].0.content, "each version changed what the docs site looks like");
/// # }
/// ```
#[derive(Clone, Debug, PartialEq)]
pub struct Vector {
    id: String,
    query: Embedding,
}

impl Vector {
    /// The scorer for a question already embedded.
    #[must_use]
    pub fn new(query: Embedding) -> Self {
        Self {
            id: format!("vector/1 {}", query.model),
            query,
        }
    }

    /// Embeds `question` as a query and returns its scorer.
    ///
    /// # Errors
    ///
    /// Anything [`Embedder::embed`] returns.
    pub async fn of(embedder: &dyn Embedder, question: &str) -> Result<Self> {
        Ok(Self::new(
            embedder.embed_one(question, Purpose::Query).await?,
        ))
    }

    /// The question's embedding, which a store's `nearest` takes to find the
    /// candidates in a large memory.
    #[must_use]
    pub fn query(&self) -> &Embedding {
        &self.query
    }
}

impl Scorer for Vector {
    fn id(&self) -> &str {
        &self.id
    }

    fn score(&self, _query: &str, fact: &Fact) -> f32 {
        fact.embedding
            .as_ref()
            .and_then(|embedding| self.query.cosine(embedding))
            .map_or(0.0, |cosine| cosine.max(0.0))
    }
}

/// Scores a fact by several scorers, each by its weight: the weighted mean of
/// their scores. A weight below zero, or not a number, counts as zero.
#[derive(Clone)]
pub struct Weighted<'a> {
    id: String,
    parts: Vec<(&'a dyn Scorer, f32)>,
}

impl std::fmt::Debug for Weighted<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Weighted")
            .field("id", &self.id)
            .finish_non_exhaustive()
    }
}

impl<'a> Weighted<'a> {
    /// The scorers and their weights. The id names each, as in
    /// `weighted/1 (overlap/1 0.30, vector/1 ollama/nomic-embed-text 0.70)`.
    #[must_use]
    pub fn new(parts: Vec<(&'a dyn Scorer, f32)>) -> Self {
        let parts: Vec<(&dyn Scorer, f32)> = parts
            .into_iter()
            .map(|(scorer, weight)| (scorer, if weight > 0.0 { weight } else { 0.0 }))
            .collect();
        let named: Vec<String> = parts
            .iter()
            .map(|(scorer, weight)| format!("{} {weight:.2}", scorer.id()))
            .collect();
        Self {
            id: format!("weighted/1 ({})", named.join(", ")),
            parts,
        }
    }
}

impl Scorer for Weighted<'_> {
    fn id(&self) -> &str {
        &self.id
    }

    fn score(&self, query: &str, fact: &Fact) -> f32 {
        let total: f32 = self.parts.iter().map(|(_, weight)| weight).sum();
        if total <= 0.0 {
            return 0.0;
        }
        self.parts
            .iter()
            .map(|(scorer, weight)| scorer.score(query, fact) * weight)
            .sum::<f32>()
            / total
    }

    fn explain(&self, query: &str, fact: &Fact) -> String {
        let parts: Vec<String> = self
            .parts
            .iter()
            .map(|(scorer, weight)| format!("{} weighed {weight:.2}", scorer.explain(query, fact)))
            .collect();
        format!(
            "weighted/1 {:.2}: {}",
            self.score(query, fact),
            parts.join(", ")
        )
    }
}

/// The facts worth placing for `query`, most worth first, and at most `most`,
/// from the current facts in `scopes`, the scopes the caller may read. A fact
/// in any other scope is never placed.
///
/// Each is ranked by its confidence after decay, weighed by its score: a fact
/// that shares no word with the query still ranks, at half its confidence,
/// because what a project's sessions learned is often about the project and
/// not the task. A fact whose decayed confidence is below a tenth is left out.
///
/// ```
/// use fusion_cortex_engram::{Fact, Scope};
/// use fusion_cortex_recall::{relevant, Overlap};
///
/// let core = Scope::Team("core".into());
/// let facts = vec![
///     Fact::new("the clock helper fixes the flaky checkout test", vec![], 0.8),
///     Fact::new("the docs build with bun", vec![], 0.8),
///     Fact::new("the core team fixes flaky tests on Fridays", vec![], 0.9).within(core),
/// ];
///
/// let placed = relevant(&facts, &[Scope::Personal], "fix the flaky checkout test", &Overlap, 2, |_| 0.0, 30.0);
///
/// assert_eq!(placed[0].0.content, "the clock helper fixes the flaky checkout test");
/// assert!(placed.iter().all(|(fact, _)| fact.scope == Scope::Personal));
/// ```
#[must_use]
pub fn relevant<'a>(
    facts: &'a [Fact],
    scopes: &[Scope],
    query: &str,
    scorer: &dyn Scorer,
    most: usize,
    age_days: impl Fn(&Fact) -> f32,
    half_life_days: f32,
) -> Vec<(&'a Fact, f32)> {
    let mut ranked: Vec<(&Fact, f32)> = facts
        .iter()
        .filter(|fact| fact.is_current() && scopes.contains(&fact.scope))
        .filter_map(|fact| {
            let confidence = fact.decayed_confidence(age_days(fact), half_life_days);
            (confidence >= 0.1)
                .then(|| (fact, confidence * (0.5 + 0.5 * scorer.score(query, fact))))
        })
        .collect();
    ranked.sort_by(|a, b| b.1.total_cmp(&a.1));
    ranked.truncate(most);
    ranked
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn turn(id: &str, path: &str) -> Message {
        Message {
            content: vec![Block::ToolUse {
                id: id.to_owned(),
                input: json!({ "path": path }),
                name: "read".to_owned(),
            }],
            role: Role::Assistant,
        }
    }

    fn result(id: &str, size: usize) -> Message {
        Message {
            content: vec![Block::ToolResult {
                content: vec![Block::text("x".repeat(size))],
                is_error: false,
                tool_use_id: id.to_owned(),
            }],
            role: Role::User,
        }
    }

    /// The rules and the task, then `reads` turns that each read a large file.
    fn session(reads: usize) -> Vec<Item> {
        let mut items = vec![
            Item::new(
                Part::Rules,
                Message::text(Role::System, "Use bun."),
                "the rules",
            ),
            Item::new(Part::Task, Message::text(Role::User, "fix it"), "the task"),
        ];
        for read in 0..reads {
            let id = format!("call_{read}");
            items.push(
                Item::new(Part::Turn, turn(&id, &format!("src/{read}.ts")), "a turn")
                    .from(vec![Id::new()]),
            );
            items.push(
                Item::new(Part::Results, result(&id, 4000), "its results").from(vec![Id::new()]),
            );
        }
        items
    }

    #[test]
    fn a_context_that_fits_is_sent_whole() {
        let items = session(3);

        let context = assemble(&items, Window::unbounded(), Some("Plan: none."));

        assert_eq!(context.messages.len(), items.len());
        assert!(context.dropped.is_empty());
        assert!(!context.messages[1].joined().contains(SUMMARY));
        assert_eq!(context.placed.len(), items.len());
    }

    #[test]
    fn old_results_are_cleared_before_any_turn_is_dropped() {
        let items = session(6);
        let window = Window {
            tokens: 4_000,
            recent: 2,
            scale: 1.0,
        };

        let context = assemble(&items, window, None);

        assert!(context.tokens <= 4_000, "{}", context.tokens);
        assert!(
            context.dropped.iter().all(|drop| drop.cleared),
            "{:?}",
            context.dropped
        );
        assert_eq!(context.dropped[0].summary, "read src/0.ts");
        assert_eq!(context.dropped[0].source, items[3].sources.first().copied());
        let Block::ToolResult { content, .. } = &context.messages[3].content[0] else {
            panic!("a result stays a result, so its call keeps its pair");
        };
        assert_eq!(
            content[0],
            Block::text(
                "[Cleared to fit the context window: read src/0.ts. Call it again to see its result.]"
            )
        );
        let last = context.messages.last().unwrap();
        let Block::ToolResult { content, .. } = &last.content[0] else {
            panic!("the latest result is a result");
        };
        assert_eq!(
            content[0],
            Block::text("x".repeat(4000)),
            "the latest turns stay whole"
        );
    }

    #[test]
    fn the_rules_and_the_task_survive_and_a_summary_says_what_went() {
        let mut items = session(30);
        items.insert(
            2,
            Item::new(
                Part::Instruction,
                Message::text(Role::User, "Never touch the generated folder."),
                "said by the person",
            ),
        );
        let window = Window {
            tokens: 2_000,
            recent: 1,
            scale: 1.0,
        };

        let context = assemble(&items, window, Some("Plan: 2 of 4 steps done."));

        assert!(context.tokens <= 2_000, "{}", context.tokens);
        assert_eq!(context.messages[0].joined(), "Use bun.");
        let task = context.messages[1].joined();
        assert!(task.starts_with("fix it"), "{task}");
        assert!(
            task.contains("Never touch the generated folder."),
            "the person's words merge into the task's message: {task}"
        );
        assert!(
            task.contains(SUMMARY) && task.contains("Plan: 2 of 4 steps done."),
            "{task}"
        );
        assert!(
            task.contains("read src/0.ts"),
            "the summary names what the dropped turns did: {task}"
        );
        assert!(context
            .dropped
            .iter()
            .any(|drop| drop.part == Part::Turn && !drop.cleared));
        assert!(context
            .placed
            .iter()
            .any(|placed| placed.part == Part::Summary && placed.pinned));
        // The roles still alternate after the task.
        for pair in context.messages[1..].windows(2) {
            assert_ne!(pair[0].role, pair[1].role, "{:?}", context.messages);
        }
    }

    #[test]
    fn a_later_compaction_replaces_the_summary() {
        let items = session(30);
        let window = Window {
            tokens: 2_000,
            recent: 1,
            scale: 1.0,
        };
        let first = assemble(&items, window, Some("Plan: first."));
        let mut again: Vec<Item> = items.clone();
        again[1].message = first.messages[1].clone();

        let second = assemble(&again, window, Some("Plan: second."));

        let task = second.messages[1].joined();
        assert_eq!(task.matches(SUMMARY).count(), 1, "{task}");
        assert!(
            task.contains("Plan: second.") && !task.contains("Plan: first."),
            "{task}"
        );
    }

    #[test]
    fn a_turn_whose_results_are_pinned_is_kept_with_them() {
        let mut items = session(8);
        items[3].pinned = true;
        let window = Window {
            tokens: 1_000,
            recent: 1,
            scale: 1.0,
        };

        let context = assemble(&items, window, None);

        assert!(context
            .messages
            .iter()
            .any(|message| message == &items[2].message));
        assert!(context
            .messages
            .iter()
            .any(|message| message == &items[3].message));
    }

    #[test]
    fn a_cleared_result_names_its_own_turns_call_when_ids_repeat() {
        let mut items = session(0);
        for read in 0..6 {
            items.push(Item::new(
                Part::Turn,
                turn("call_0", &format!("src/{read}.ts")),
                "a turn",
            ));
            items.push(Item::new(
                Part::Results,
                result("call_0", 4000),
                "its results",
            ));
        }
        let window = Window {
            tokens: 4_000,
            recent: 2,
            scale: 1.0,
        };

        let context = assemble(&items, window, None);

        let named: Vec<&str> = context
            .dropped
            .iter()
            .map(|drop| drop.summary.as_str())
            .collect();
        assert_eq!(named[..2], ["read src/0.ts", "read src/1.ts"], "{named:?}");
    }

    #[test]
    fn an_earlier_summary_is_kept_where_nothing_more_is_dropped() {
        let items = session(30);
        let small = Window {
            tokens: 2_000,
            recent: 1,
            scale: 1.0,
        };
        let first = assemble(&items, small, Some("Plan: first."));
        // A resumed session's history is what its last context sent.
        let resumed: Vec<Item> = first
            .messages
            .iter()
            .enumerate()
            .map(|(index, message)| {
                let part = match (index, message.role) {
                    (0, _) => Part::Rules,
                    (1, _) => Part::Task,
                    (_, Role::Assistant) => Part::Turn,
                    _ => Part::Results,
                };
                Item::new(part, message.clone(), "read back")
            })
            .collect();

        let again = assemble(&resumed, Window::unbounded(), None);

        let all: String = again.messages.iter().map(Message::joined).collect();
        assert_eq!(all.matches(SUMMARY).count(), 1, "{all}");
        assert!(
            all.contains("Plan: first.") && all.contains("read src/0.ts"),
            "{all}"
        );
    }

    #[test]
    fn a_kept_result_stays_while_the_one_beside_it_is_cleared() {
        let mut items = session(0);
        items.push(Item::new(
            Part::Turn,
            Message {
                content: vec![
                    Block::ToolUse {
                        id: "skill".into(),
                        input: json!({ "path": "SKILL.md" }),
                        name: "read".into(),
                    },
                    Block::ToolUse {
                        id: "log".into(),
                        input: json!({ "path": "big.log" }),
                        name: "read".into(),
                    },
                ],
                role: Role::Assistant,
            },
            "a turn",
        ));
        let mut both = result("skill", 400);
        both.content.extend(result("log", 40_000).content);
        items.push(Item::new(Part::Results, both, "its results").keeping(vec![0]));
        for read in 0..3 {
            let id = format!("later_{read}");
            items.push(Item::new(Part::Turn, turn(&id, "src/a.ts"), "a turn"));
            items.push(Item::new(Part::Results, result(&id, 100), "its results"));
        }
        let window = Window {
            tokens: 4_000,
            recent: 1,
            scale: 1.0,
        };

        let context = assemble(&items, window, None);

        assert!(context.tokens <= 4_000, "{}", context.tokens);
        let Block::ToolResult { content, .. } = &context.messages[3].content[0] else {
            panic!("the skill's result is first");
        };
        assert_eq!(content[0], Block::text("x".repeat(400)), "the skill stays");
        assert_eq!(context.dropped[0].summary, "read big.log");
    }

    #[test]
    fn a_long_call_is_named_cut_short() {
        let command = "echo ".repeat(300);

        let named = describe("shell", &json!({ "command": command }));

        assert!(named.chars().count() <= 6 + 120 + 1, "{named}");
        assert!(named.ends_with('…'));
        assert!(
            !listed(&[named]).starts_with(';'),
            "the summary still names it"
        );
    }

    #[test]
    fn the_scale_follows_the_providers_count() {
        let items = session(2);
        let half = Window {
            tokens: u32::MAX,
            recent: 0,
            scale: 0.5,
        };

        let context = assemble(&items, half, None);

        assert_eq!(context.tokens, scaled(context.estimated, 0.5));
        assert!(context.tokens < context.estimated);
    }

    #[test]
    fn facts_go_last_and_the_overlap_scorer_prefers_shared_words() {
        let mut items = session(1);
        items.insert(
            2,
            Item::new(
                Part::Facts,
                Message::text(Role::User, "y".repeat(8000)),
                "from memory",
            ),
        );
        let window = Window {
            tokens: 1_500,
            recent: 1,
            scale: 1.0,
        };

        let context = assemble(&items, window, None);

        assert!(context.dropped.iter().any(|drop| drop.part == Part::Facts));
        let fact = Fact::new("the checkout test needs the clock helper", vec![], 0.9);
        assert!(
            Overlap.score("fix the checkout test", &fact) > Overlap.score("update the docs", &fact)
        );
    }

    #[test]
    fn a_fact_outside_the_callers_scopes_is_never_placed() {
        let core = Scope::Team("core".into());
        let checkout = Scope::Project("checkout".into());
        let facts = vec![
            Fact::new("the release checklist lives in the wiki", vec![], 0.9).within(core.clone()),
            Fact::new("the release checklist needs a signoff", vec![], 0.9)
                .within(Scope::Organization),
            Fact::new("the release checklist runs in checkout", vec![], 0.9)
                .within(checkout.clone()),
            Fact::new("I keep the release checklist open", vec![], 0.2),
        ];
        let placed = |scopes: &[Scope]| -> Vec<Scope> {
            relevant(
                &facts,
                scopes,
                "the release checklist",
                &Overlap,
                10,
                |_| 0.0,
                30.0,
            )
            .into_iter()
            .map(|(fact, _)| fact.scope.clone())
            .collect()
        };

        assert_eq!(
            placed(&[Scope::Personal]),
            [Scope::Personal],
            "a team fact never reaches a personal-only caller, however well it scores"
        );
        let mut scopes = placed(&[Scope::Personal, core.clone()]);
        scopes.sort_by_key(ToString::to_string);
        assert_eq!(scopes, [Scope::Personal, core.clone()]);
        assert_eq!(
            placed(&[Scope::Organization]),
            [Scope::Organization],
            "the organization's scope holds no team's facts"
        );
        assert_eq!(placed(&[Scope::Team("web".into())]), Vec::<Scope>::new());
        assert!(placed(&[]).is_empty());
    }

    fn embedded(content: &str, model: &str, values: Vec<f32>) -> Fact {
        let mut fact = Fact::new(content, vec![], 0.8);
        fact.embedding = Some(Embedding::new(model, values));
        fact
    }

    #[test]
    fn a_vector_scores_only_facts_from_its_own_model() {
        let vector = Vector::new(Embedding::new("scripted/1", vec![1.0, 0.0]));
        let same = embedded("a", "scripted/1", vec![0.6, 0.8]);
        let opposite = embedded("b", "scripted/1", vec![-1.0, 0.0]);
        let other = embedded("c", "scripted/2", vec![1.0, 0.0]);
        let plain = Fact::new("d", vec![], 0.8);

        assert!((vector.score("", &same) - 0.6).abs() < 1e-6);
        assert!(
            vector.score("", &opposite).abs() < f32::EPSILON,
            "below zero is zero"
        );
        assert!(
            vector.score("", &other).abs() < f32::EPSILON,
            "another model's space"
        );
        assert!(vector.score("", &plain).abs() < f32::EPSILON);
        assert_eq!(vector.id(), "vector/1 scripted/1");
    }

    #[test]
    fn a_weighted_scorer_is_the_weighted_mean_and_says_why() {
        let vector = Vector::new(Embedding::new("scripted/1", vec![1.0, 0.0]));
        let fact = embedded("the release notes", "scripted/1", vec![1.0, 0.0]);
        let both = Weighted::new(vec![(&Overlap, 1.0), (&vector, 3.0), (&Overlap, -2.0)]);

        let score = both.score("notes about something else", &fact);

        // The query holds one of the fact's three words, and the vector
        // matches whole.
        assert!((score - (1.0 / 3.0 + 3.0) / 4.0).abs() < 1e-6, "{score}");
        assert_eq!(
            both.id(),
            "weighted/1 (overlap/1 1.00, vector/1 scripted/1 3.00, overlap/1 0.00)"
        );
        let why = both.explain("notes about something else", &fact);
        assert!(
            why.starts_with("weighted/1 0.83: overlap/1 0.33 weighed 1.00, vector/1 scripted/1 1.00 weighed 3.00"),
            "{why}"
        );
        assert!(Weighted::new(vec![]).score("x", &fact).abs() < f32::EPSILON);
    }

    #[test]
    fn a_combined_scorer_still_places_nothing_outside_the_callers_scopes() {
        let vector = Vector::new(Embedding::new("scripted/1", vec![1.0, 0.0]));
        let both = Weighted::new(vec![(&Overlap, 0.5), (&vector, 0.5)]);
        let facts = vec![
            embedded("the team's answer", "scripted/1", vec![1.0, 0.0])
                .within(Scope::Team("core".into())),
            embedded("my answer", "scripted/1", vec![0.0, 1.0]),
        ];

        let placed = relevant(
            &facts,
            &[Scope::Personal],
            "answer",
            &both,
            10,
            |_| 0.0,
            30.0,
        );

        assert_eq!(placed.len(), 1);
        assert_eq!(placed[0].0.content, "my answer");
    }

    #[test]
    fn a_deleted_fact_is_never_placed() {
        use fusion_cortex_engram::{Episode, Memory};

        let mut memory = Memory::new();
        let seen = memory.record(Episode::new("tests run with jest", Id::new()));
        let wrong = memory.assert_fact(Fact::new("tests run with jest", vec![seen], 0.9), None);
        let placed = |memory: &Memory| -> usize {
            relevant(
                memory.facts(),
                &[Scope::Personal],
                "how do tests run",
                &Overlap,
                10,
                |_| 0.0,
                30.0,
            )
            .len()
        };
        assert_eq!(placed(&memory), 1);

        memory.delete_fact(wrong);

        assert_eq!(placed(&memory), 0);
    }
}
