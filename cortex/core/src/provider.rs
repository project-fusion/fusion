//! Model provider abstraction.
//!
//! A **local** provider is a design requirement rather than a feature: memory
//! delivered solely through a remote API relocates the dependency instead of
//! removing it.
//!
//! **One shape for every API.** A [`Request`] is messages made of typed
//! [`Block`]s, the tools on offer, and how hard to think. A [`Response`] is the
//! blocks that came back, why the model stopped, and what it cost. Each client
//! translates that shape to its API and back, which is what lets a session
//! written against one model replay against another. The clients live with
//! the products that call each API; this module is the shape they share.
//!
//! **Streaming is the only path.** [`Provider::stream`] is what a client
//! implements, and [`Provider::complete`] folds the stream into a response. One
//! decoder per API means a check of an endpoint and a long task run the same
//! code, so a server whose streamed tool calls are broken fails the check
//! before it can fail the task.

use std::{
    collections::{BTreeMap, VecDeque},
    pin::Pin,
    sync::Mutex,
};

use async_trait::async_trait;
use futures_util::{stream, Stream, StreamExt};
use serde::{Deserialize, Serialize};

use crate::{Error, Result};

/// The wire format a block came from.
///
/// Thinking carries state only the API that produced it can read, so a client
/// sends a [`Block::Thinking`] back only when it names that client's API, and
/// drops it otherwise. A session replayed on another model sends that model the
/// conversation, without reasoning it cannot verify.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Api {
    /// Anthropic Messages.
    Anthropic,
    /// OpenAI Chat Completions, and the servers that copy it.
    Chat,
    /// Gemini `generateContent`.
    Gemini,
    /// Ollama's own `/api/chat`.
    Ollama,
    /// OpenAI Responses.
    Responses,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Assistant,
    System,
    User,
}

/// One piece of a message.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Block {
    /// An image, base64 encoded.
    Image {
        data: String,
        media_type: String,
    },
    Text {
        text: String,
    },
    /// The model's reasoning.
    ///
    /// `text` is what the API shows, which may be a summary or nothing at all.
    /// `signature` is opaque state the API requires on a later turn, in a
    /// format only the client for `api` reads.
    Thinking {
        api: Api,
        signature: Option<String>,
        text: String,
    },
    /// What a tool returned. Its content is text and images.
    ToolResult {
        content: Vec<Block>,
        is_error: bool,
        tool_use_id: String,
    },
    /// A call the model made. `input` is arbitrary JSON by the wire
    /// format's definition.
    ToolUse {
        id: String,
        input: serde_json::Value,
        name: String,
    },
}

impl Block {
    #[must_use]
    pub fn text(text: impl Into<String>) -> Self {
        Self::Text { text: text.into() }
    }
}

/// A single turn in a conversation.
///
/// A system message at the start of a conversation is the system prompt. One
/// later in it is an instruction given mid-session, which each client places
/// where its API reads one.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Message {
    pub content: Vec<Block>,
    pub role: Role,
}

impl Message {
    /// A message holding one text block.
    ///
    /// ```
    /// use fusion_cortex_core::provider::{Message, Role};
    ///
    /// let question = Message::text(Role::User, "when did we ship 0.11?");
    /// assert_eq!(question.joined(), "when did we ship 0.11?");
    /// ```
    #[must_use]
    pub fn text(role: Role, text: impl Into<String>) -> Self {
        Self {
            content: vec![Block::text(text)],
            role,
        }
    }

    /// The text blocks, joined. Thinking and tool blocks are left out.
    #[must_use]
    pub fn joined(&self) -> String {
        joined(&self.content)
    }
}

/// A tool the model may call.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Tool {
    pub description: String,
    pub name: String,
    /// The JSON Schema the input must match.
    pub schema: serde_json::Value,
}

/// How much reasoning a request sets a model to do.
///
/// Each client maps a level to the nearest setting its API has, and an API with
/// fewer levels takes the closest one below.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Effort {
    Low,
    Medium,
    High,
    Xhigh,
    Max,
}

impl Effort {
    /// The level as OpenAI and Anthropic spell it.
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Xhigh => "xhigh",
            Self::Max => "max",
        }
    }
}

/// A request to a provider.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Request {
    /// How much to reason. `None` leaves the model's default, and a level
    /// also requests visible reasoning where the API offers it.
    pub effort: Option<Effort>,
    /// The cap on output tokens, thinking included. `None` takes the client's
    /// default.
    pub max_tokens: Option<u32>,
    pub messages: Vec<Message>,
    pub tools: Vec<Tool>,
}

/// Why the model stopped.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Stop {
    EndTurn,
    MaxTokens,
    /// A reason outside this list, kept as the API spelled it.
    Other(String),
    /// The API paused a long turn and expects it sent back to continue.
    Pause,
    /// The model or the API's safety system declined.
    Refusal,
    StopSequence,
    ToolUse,
}

/// What a response cost, in tokens.
///
/// **Every API counts these differently, and this is the one way they are
/// read.** `input` is every input token, cached or not, and `cache_read` and
/// `cache_write` are parts of it. `output` is every output token, reasoning
/// included, and `reasoning` is part of it. A count an API does not report is
/// zero.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct Usage {
    pub cache_read: u32,
    pub cache_write: u32,
    pub input: u32,
    pub output: u32,
    pub reasoning: u32,
}

/// What a provider returned.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Response {
    pub content: Vec<Block>,
    /// The API's id for this response, where it gives one.
    pub id: Option<String>,
    /// The model that produced this, as the API named it, so provenance can
    /// record it.
    pub model: String,
    pub stop: Stop,
    pub usage: Usage,
}

impl Response {
    /// The text blocks, joined.
    #[must_use]
    pub fn joined(&self) -> String {
        joined(&self.content)
    }

    /// This response as the assistant turn of a conversation.
    #[must_use]
    pub fn message(&self) -> Message {
        Message {
            content: self.content.clone(),
            role: Role::Assistant,
        }
    }

    /// The tool calls, in the order the model made them.
    pub fn tool_uses(&self) -> impl Iterator<Item = (&str, &str, &serde_json::Value)> {
        self.content.iter().filter_map(|block| match block {
            Block::ToolUse { id, input, name } => Some((id.as_str(), name.as_str(), input)),
            _ => None,
        })
    }

    /// The events a stream of this response carries.
    ///
    /// Each block opens whole, with no deltas after it, which is the shape an
    /// API that sends a tool call in one piece produces.
    #[must_use]
    pub fn events(&self) -> Vec<Event> {
        let mut events: Vec<Event> = self
            .content
            .iter()
            .enumerate()
            .map(|(index, block)| Event::Start {
                block: block.clone(),
                index,
            })
            .collect();
        events.push(Event::Stop {
            id: self.id.clone(),
            model: self.model.clone(),
            stop: self.stop.clone(),
            usage: self.usage,
        });
        events
    }
}

pub(crate) fn joined(blocks: &[Block]) -> String {
    blocks
        .iter()
        .filter_map(|block| match block {
            Block::Text { text } => Some(text.as_str()),
            _ => None,
        })
        .collect()
}

/// A piece of a block, as a stream delivers it.
#[derive(Clone, Debug, PartialEq)]
pub enum Delta {
    /// A fragment of a tool call's input, as JSON text. The fragments of one
    /// call parse only once all of them have arrived.
    Input(String),
    /// A fragment of a thinking block's signature.
    Signature(String),
    Text(String),
    Thinking(String),
}

/// One step of a streamed response.
#[derive(Clone, Debug, PartialEq)]
pub enum Event {
    /// A block opens at `index`. What follows for that index appends to it.
    Start {
        block: Block,
        index: usize,
    },
    Delta {
        delta: Delta,
        index: usize,
    },
    /// The response is complete. A stream that ends without one was cut off.
    Stop {
        id: Option<String>,
        model: String,
        stop: Stop,
        usage: Usage,
    },
}

/// A streamed response.
pub type Events = Pin<Box<dyn Stream<Item = Result<Event>> + Send>>;

/// Folds a stream into the response it describes.
///
/// # Errors
///
/// The stream's own error, [`Error::Provider`] if it ends before it stops or
/// sends a delta for a block it never opened, and [`Error::InvalidOutput`] if a
/// tool call's input is not JSON.
pub async fn collect(mut events: Events) -> Result<Response> {
    // The text of each tool call's input as it arrives. A call that arrived
    // whole has none, and keeps the input it opened with.
    let mut blocks: BTreeMap<usize, (Block, Option<String>)> = BTreeMap::new();

    while let Some(event) = events.next().await {
        match event? {
            Event::Start { block, index } => {
                blocks.insert(index, (block, None));
            }
            Event::Delta { delta, index } => {
                let (block, input) = blocks.get_mut(&index).ok_or_else(|| {
                    Error::Provider(format!(
                        "a delta arrived for block {index}, which never opened"
                    ))
                })?;
                apply(block, input, delta, index)?;
            }
            Event::Stop {
                id,
                model,
                stop,
                usage,
            } => {
                let content = blocks
                    .into_values()
                    .map(|(block, input)| finish(block, input.as_deref()))
                    .collect::<Result<_>>()?;
                return Ok(Response {
                    content,
                    id,
                    model,
                    stop,
                    usage,
                });
            }
        }
    }

    Err(Error::Provider(
        "the stream ended before the response finished".into(),
    ))
}

fn apply(block: &mut Block, input: &mut Option<String>, delta: Delta, index: usize) -> Result<()> {
    match (block, delta) {
        (Block::Text { text }, Delta::Text(more))
        | (Block::Thinking { text, .. }, Delta::Thinking(more)) => text.push_str(&more),
        (Block::Thinking { signature, .. }, Delta::Signature(more)) => {
            signature.get_or_insert_with(String::new).push_str(&more);
        }
        (Block::ToolUse { .. }, Delta::Input(more)) => {
            input.get_or_insert_with(String::new).push_str(&more);
        }
        (_, delta) => {
            return Err(Error::Provider(format!(
                "block {index} cannot take {delta:?}"
            )))
        }
    }
    Ok(())
}

fn finish(block: Block, input: Option<&str>) -> Result<Block> {
    let Block::ToolUse {
        id,
        input: opened,
        name,
    } = block
    else {
        return Ok(block);
    };
    let input = match input.map(str::trim) {
        // Some APIs send a call that takes no arguments as no input at all.
        None | Some("") if opened.is_null() => serde_json::json!({}),
        None | Some("") => opened,
        Some(text) => serde_json::from_str(text).map_err(|error| {
            Error::InvalidOutput(format!("the input to {name} is not JSON ({error}): {text}"))
        })?,
    };
    Ok(Block::ToolUse { id, input, name })
}

/// Implemented by every model backend, local or remote.
#[async_trait]
pub trait Provider: Send + Sync {
    /// Stable identifier recorded in provenance, e.g. `local/llama-3.3-70b`.
    fn id(&self) -> &str;

    /// Whether inference runs on the user's own hardware. Surfaced so a product
    /// can tell the user whether their data left the machine.
    fn is_local(&self) -> bool;

    /// Sends `request` and returns the response as it streams.
    ///
    /// # Errors
    ///
    /// Whatever stopped the request before its stream began: an error status
    /// from the provider, or a connection that failed.
    async fn stream(&self, request: &Request) -> Result<Events>;

    /// Sends `request` and waits for the whole response.
    ///
    /// # Errors
    ///
    /// Anything [`Provider::stream`] or [`collect`] returns.
    async fn complete(&self, request: &Request) -> Result<Response> {
        collect(self.stream(request).await?).await
    }
}

/// A deterministic provider for tests and offline development.
///
/// ```
/// use fusion_cortex_core::provider::{MockProvider, Provider};
///
/// let provider = MockProvider { reply: "hello".into() };
/// assert!(provider.is_local());
/// ```
#[derive(Clone, Debug, Default)]
pub struct MockProvider {
    pub reply: String,
}

/// Rough token estimate. Saturating rather than truncating: a count that wraps
/// is worse than one that clamps, and these are estimates either way.
fn estimate_tokens(text: &str) -> u32 {
    u32::try_from(text.len() / 4).unwrap_or(u32::MAX)
}

#[async_trait]
impl Provider for MockProvider {
    // The trait returns `&str` rather than `&'static str` so a provider can
    // report a runtime-composed id such as `local/{model}`. This impl happens
    // to return a literal, which is what trips the lint.
    #[allow(clippy::unnecessary_literal_bound)]
    fn id(&self) -> &str {
        "mock/deterministic"
    }

    fn is_local(&self) -> bool {
        true
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        let input = request
            .messages
            .iter()
            .map(|message| estimate_tokens(&message.joined()))
            .fold(0_u32, u32::saturating_add);
        let events = vec![
            Event::Start {
                block: Block::text(""),
                index: 0,
            },
            Event::Delta {
                delta: Delta::Text(self.reply.clone()),
                index: 0,
            },
            Event::Stop {
                id: None,
                model: self.id().to_owned(),
                stop: Stop::EndTurn,
                usage: Usage {
                    input,
                    output: estimate_tokens(&self.reply),
                    ..Usage::default()
                },
            },
        ];
        Ok(Box::pin(stream::iter(events.into_iter().map(Ok))))
    }
}

/// A provider that returns scripted responses, and records each request.
///
/// For tests of anything that drives a provider through more than one turn,
/// such as an endpoint check or an agent loop.
///
/// ```
/// # use fusion_cortex_core::provider::{Block, Message, Provider, Request, Response, Role, Scripted, Stop, Usage};
/// # #[tokio::main]
/// # async fn main() {
/// let answer = Response {
///     content: vec![Block::text("Paris")],
///     id: None,
///     model: "scripted/1".into(),
///     stop: Stop::EndTurn,
///     usage: Usage::default(),
/// };
/// let provider = Scripted::new("scripted/1", vec![Ok(answer)]);
/// let request = Request {
///     messages: vec![Message::text(Role::User, "the capital of France?")],
///     ..Request::default()
/// };
///
/// let response = provider.complete(&request).await.unwrap();
///
/// assert_eq!(response.joined(), "Paris");
/// assert_eq!(provider.requests().len(), 1);
/// # }
/// ```
#[derive(Debug)]
pub struct Scripted {
    id: String,
    requests: Mutex<Vec<Request>>,
    script: Mutex<VecDeque<Result<Response>>>,
}

impl Scripted {
    #[must_use]
    pub fn new(id: impl Into<String>, script: Vec<Result<Response>>) -> Self {
        Self {
            id: id.into(),
            requests: Mutex::new(Vec::new()),
            script: Mutex::new(script.into()),
        }
    }

    /// Every request this provider was sent, in order.
    ///
    /// # Panics
    ///
    /// If a thread panicked while recording a request.
    #[must_use]
    pub fn requests(&self) -> Vec<Request> {
        self.requests.lock().expect("the request log").clone()
    }
}

#[async_trait]
impl Provider for Scripted {
    fn id(&self) -> &str {
        &self.id
    }

    fn is_local(&self) -> bool {
        true
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        self.requests
            .lock()
            .expect("the request log")
            .push(request.clone());
        let next = self.script.lock().expect("the script").pop_front();
        let response = next.unwrap_or_else(|| {
            Err(Error::Provider(format!(
                "{} has no answer left for request {}",
                self.id,
                self.requests().len()
            )))
        })?;
        Ok(Box::pin(stream::iter(
            response.events().into_iter().map(Ok),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn user(text: &str) -> Request {
        Request {
            messages: vec![Message::text(Role::User, text)],
            ..Request::default()
        }
    }

    fn streamed(events: Vec<Result<Event>>) -> Events {
        Box::pin(stream::iter(events))
    }

    fn stop() -> Event {
        Event::Stop {
            id: Some("msg_1".into()),
            model: "m".into(),
            stop: Stop::ToolUse,
            usage: Usage::default(),
        }
    }

    #[tokio::test]
    async fn mock_provider_is_deterministic() {
        let provider = MockProvider {
            reply: "hello".into(),
        };

        let first = provider.complete(&user("hi")).await.unwrap();
        let second = provider.complete(&user("hi")).await.unwrap();

        assert_eq!(first.joined(), second.joined());
        assert_eq!(first.joined(), "hello");
        assert!(provider.is_local());
    }

    #[tokio::test]
    async fn deltas_append_to_the_block_they_name() {
        let events = streamed(vec![
            Ok(Event::Start {
                block: Block::Thinking {
                    api: Api::Anthropic,
                    signature: None,
                    text: String::new(),
                },
                index: 0,
            }),
            Ok(Event::Start {
                block: Block::text(""),
                index: 1,
            }),
            Ok(Event::Delta {
                delta: Delta::Thinking("Check the ".into()),
                index: 0,
            }),
            Ok(Event::Delta {
                delta: Delta::Text("Par".into()),
                index: 1,
            }),
            Ok(Event::Delta {
                delta: Delta::Thinking("map.".into()),
                index: 0,
            }),
            Ok(Event::Delta {
                delta: Delta::Signature("c2ln".into()),
                index: 0,
            }),
            Ok(Event::Delta {
                delta: Delta::Text("is".into()),
                index: 1,
            }),
            Ok(stop()),
        ]);

        let response = collect(events).await.unwrap();

        assert_eq!(
            response.content,
            vec![
                Block::Thinking {
                    api: Api::Anthropic,
                    signature: Some("c2ln".into()),
                    text: "Check the map.".into(),
                },
                Block::text("Paris"),
            ]
        );
        assert_eq!(response.id.as_deref(), Some("msg_1"));
    }

    #[tokio::test]
    async fn a_tool_input_parses_once_every_fragment_has_arrived() {
        let opened = |index, id: &str| Event::Start {
            block: Block::ToolUse {
                id: id.into(),
                input: serde_json::Value::Null,
                name: "weather".into(),
            },
            index,
        };
        let input = |index, text: &str| Event::Delta {
            delta: Delta::Input(text.into()),
            index,
        };
        let events = streamed(vec![
            Ok(opened(0, "a")),
            Ok(input(0, r#"{"ci"#)),
            Ok(opened(1, "b")),
            Ok(input(0, r#"ty": "Paris"}"#)),
            Ok(input(1, r#"{"city": "Tokyo"}"#)),
            Ok(opened(2, "c")),
            Ok(stop()),
        ]);

        let response = collect(events).await.unwrap();
        let calls: Vec<_> = response.tool_uses().collect();

        assert_eq!(calls.len(), 3);
        assert_eq!(calls[0].2["city"], "Paris");
        assert_eq!(calls[1].2["city"], "Tokyo");
        assert_eq!(
            calls[2].2,
            &serde_json::json!({}),
            "a call with no input takes none"
        );
    }

    #[tokio::test]
    async fn a_tool_input_that_is_not_json_names_the_tool() {
        let events = streamed(vec![
            Ok(Event::Start {
                block: Block::ToolUse {
                    id: "a".into(),
                    input: serde_json::Value::Null,
                    name: "weather".into(),
                },
                index: 0,
            }),
            Ok(Event::Delta {
                delta: Delta::Input(r#"{"city": "Par"#.into()),
                index: 0,
            }),
            Ok(stop()),
        ]);

        let error = collect(events).await.unwrap_err();

        assert!(
            matches!(&error, Error::InvalidOutput(message) if message.contains("weather")),
            "{error}"
        );
    }

    #[tokio::test]
    async fn a_stream_that_ends_without_stopping_was_cut_off() {
        let events = streamed(vec![Ok(Event::Start {
            block: Block::text("Par"),
            index: 0,
        })]);

        let error = collect(events).await.unwrap_err();

        assert!(matches!(error, Error::Provider(_)));
    }

    #[tokio::test]
    async fn a_response_survives_its_own_events() {
        let response = Response {
            content: vec![
                Block::text("Checking."),
                Block::ToolUse {
                    id: "a".into(),
                    input: serde_json::json!({ "city": "Paris" }),
                    name: "weather".into(),
                },
            ],
            id: None,
            model: "m".into(),
            stop: Stop::ToolUse,
            usage: Usage {
                input: 10,
                output: 4,
                ..Usage::default()
            },
        };

        let events = streamed(response.events().into_iter().map(Ok).collect());

        assert_eq!(collect(events).await.unwrap(), response);
    }

    #[tokio::test]
    async fn a_script_that_runs_out_says_so() {
        let provider = Scripted::new("scripted/1", vec![]);

        let error = provider.complete(&user("hi")).await.unwrap_err();

        assert!(error.to_string().contains("no answer left"), "{error}");
        assert_eq!(
            provider.requests().len(),
            1,
            "the request is still recorded"
        );
    }
}
