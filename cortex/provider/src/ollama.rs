//! Ollama's own chat API, `POST /api/chat`, streamed as newline-delimited JSON,
//! and its embeddings API, `POST /api/embed`.
//!
//! **Each request sets its context window.** A request that names no
//! `num_ctx` runs at the server's default, which is shorter than an agent
//! session, and the prompt is truncated without an error.
//! [`Ollama::context`] sets it, and the caller chooses it from what the model
//! can take.
//!
//! **[`Embeddings`] is the local default for vectors.** A small embedding
//! model, such as `nomic-embed-text` or `all-minilm`, runs on the same server
//! as the chat model, so memory is embedded without the text leaving the
//! machine.

use std::{
    collections::HashMap,
    sync::{Arc, OnceLock},
};

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::http::{self, Decode, Post, Transport};
use fusion_cortex_core::embed::{Embedder, Embedding, Purpose};
use fusion_cortex_core::provider::{
    Api, Block, Delta, Event, Events, Message, Provider, Request, Role, Stop, Usage,
};
use fusion_cortex_core::{Error, Result};

/// Prefixes an id this client made up for a call that came without one. It is
/// never sent back, because the server did not issue it. A fresh UUID follows
/// it, so a call made up on one turn never shares an id with a call made up on
/// another.
const GENERATED: &str = "generated-";

/// A client for one model on an Ollama server.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::provider::Provider;
/// # use fusion_cortex_provider::{http::Reqwest, ollama::Ollama};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let provider = Ollama::new("qwen3-coder:30b", transport).context(65_536);
///
/// assert_eq!(provider.id(), "local/qwen3-coder:30b");
/// assert!(provider.is_local(), "a local server is the default");
/// ```
pub struct Ollama {
    base: String,
    context: Option<u32>,
    id: String,
    key: Option<String>,
    /// Whether the server runs on the user's own hardware, as the caller
    /// judged it from where `base` resolves.
    local: bool,
    model: String,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Ollama {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Ollama")
            .field("base", &self.base)
            .field("context", &self.context)
            .field("model", &self.model)
            .finish_non_exhaustive()
    }
}

impl Ollama {
    /// A model on the server at `http://localhost:11434`.
    #[must_use]
    pub fn new(model: impl Into<String>, transport: Arc<dyn Transport>) -> Self {
        let model = model.into();
        Self {
            base: "http://localhost:11434".into(),
            context: None,
            id: format!("local/{model}"),
            key: None,
            local: true,
            model,
            transport,
        }
    }

    /// A model on Ollama's hosted service, which runs it on Ollama's hardware.
    #[must_use]
    pub fn cloud(mut self, key: impl Into<String>) -> Self {
        self.base = "https://ollama.com".into();
        self.id = format!("ollama/{}", self.model);
        self.key = Some(key.into());
        self
    }

    /// Sends requests to a server on another host, such as a GPU machine on
    /// the local network.
    #[must_use]
    pub fn base(mut self, base: impl Into<String>) -> Self {
        self.base = crate::trimmed(base);
        self
    }

    /// Whether the server runs on the user's own hardware. Nothing in this
    /// type reads the base URL to say so, since a host name can resolve
    /// anywhere: the caller decides, and a server with a key is hosted.
    #[must_use]
    pub fn local(mut self, local: bool) -> Self {
        self.local = local;
        self
    }

    /// The context window, in tokens, each request sets.
    #[must_use]
    pub fn context(mut self, tokens: u32) -> Self {
        self.context = Some(tokens);
        self
    }

    fn body(&self, request: &Request) -> Value {
        let names: HashMap<&str, &str> = request
            .messages
            .iter()
            .flat_map(|message| &message.content)
            .filter_map(|block| match block {
                Block::ToolUse { id, name, .. } => Some((id.as_str(), name.as_str())),
                _ => None,
            })
            .collect();
        let mut messages = Vec::new();
        for message in &request.messages {
            translate(message, &names, &mut messages);
        }

        let mut body = json!({ "messages": messages, "model": self.model, "stream": true });
        if !request.tools.is_empty() {
            body["tools"] = request
                .tools
                .iter()
                .map(|tool| {
                    json!({
                        "function": {
                            "description": tool.description,
                            "name": tool.name,
                            "parameters": tool.schema,
                        },
                        "type": "function",
                    })
                })
                .collect();
        }
        // Each model names its own levels, which `/api/show` lists, so an
        // effort turns thinking on and the model chooses how much.
        if request.effort.is_some() {
            body["think"] = json!(true);
        }
        // The server turns the schema into a grammar the model decodes under.
        if let Some(format) = &request.format {
            body["format"] = format.schema.clone();
        }
        let mut options = serde_json::Map::new();
        if let Some(context) = self.context {
            options.insert("num_ctx".into(), json!(context));
        }
        if let Some(max_tokens) = request.max_tokens {
            options.insert("num_predict".into(), json!(max_tokens));
        }
        if !options.is_empty() {
            body["options"] = Value::Object(options);
        }
        body
    }
}

fn images(blocks: &[Block]) -> Vec<&str> {
    blocks
        .iter()
        .filter_map(|block| match block {
            Block::Image { data, .. } => Some(data.as_str()),
            _ => None,
        })
        .collect()
}

fn translate(message: &Message, names: &HashMap<&str, &str>, out: &mut Vec<Value>) {
    match message.role {
        Role::Assistant => {
            let mut assistant =
                json!({ "content": crate::paragraphs(&message.content), "role": "assistant" });
            let thinking: String = message
                .content
                .iter()
                .filter_map(|block| match block {
                    Block::Thinking {
                        api: Api::Ollama,
                        text,
                        ..
                    } => Some(text.as_str()),
                    _ => None,
                })
                .collect();
            if !thinking.is_empty() {
                assistant["thinking"] = json!(thinking);
            }
            let calls: Vec<Value> = message
                .content
                .iter()
                .filter_map(|block| match block {
                    Block::ToolUse { id, input, name } => {
                        let mut call = json!({
                            "function": { "arguments": input, "name": name },
                            "type": "function",
                        });
                        if !id.starts_with(GENERATED) {
                            call["id"] = json!(id);
                        }
                        Some(call)
                    }
                    _ => None,
                })
                .collect();
            if !calls.is_empty() {
                assistant["tool_calls"] = json!(calls);
            }
            out.push(assistant);
        }
        Role::System => {
            out.push(json!({ "content": crate::paragraphs(&message.content), "role": "system" }));
        }
        Role::User => {
            let mut returned: Vec<&str> = Vec::new();
            for block in &message.content {
                if let Block::ToolResult {
                    content,
                    tool_use_id,
                    ..
                } = block
                {
                    let mut tool = json!({
                        "content": crate::paragraphs(content),
                        "role": "tool",
                        "tool_name": names.get(tool_use_id.as_str()).copied().unwrap_or(tool_use_id),
                    });
                    if !tool_use_id.starts_with(GENERATED) {
                        tool["tool_call_id"] = json!(tool_use_id);
                    }
                    out.push(tool);
                    returned.extend(images(content));
                }
            }
            let text = crate::paragraphs(&message.content);
            let mut attached = images(&message.content);
            // The images a tool returned follow in the user turn, as they do
            // in Chat Completions.
            attached.extend(returned);
            if text.is_empty() && attached.is_empty() {
                return;
            }
            let mut user = json!({ "content": text, "role": "user" });
            if !attached.is_empty() {
                user["images"] = json!(attached);
            }
            out.push(user);
        }
    }
}

#[async_trait]
impl Provider for Ollama {
    fn id(&self) -> &str {
        &self.id
    }

    fn is_local(&self) -> bool {
        self.local && self.key.is_none()
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        let headers: Vec<(String, String)> = self
            .key
            .iter()
            .map(|key| ("authorization".to_owned(), format!("Bearer {key}")))
            .collect();
        let url = format!("{}/api/chat", self.base);
        let mut body = self.body(request);
        let post = |body: &Value| Post {
            body: body.to_string().into_bytes(),
            headers: headers.clone(),
            url: url.clone(),
        };
        let sent = match self.transport.post(post(&body)).await {
            // A model that cannot think refuses `think` outright, so an
            // effort chosen for another model asks the same of this one
            // without it: the effort is the model's to use, not a condition.
            Err(Error::Status {
                status: 400,
                message,
                ..
            }) if body.get("think").is_some() && message.contains("does not support thinking") => {
                if let Some(fields) = body.as_object_mut() {
                    fields.remove("think");
                }
                self.transport.post(post(&body)).await?
            }
            sent => sent?,
        };
        Ok(http::decode(http::ndjson(sent), Decoder::default()))
    }
}

/// An embedding model on an Ollama server, through `/api/embed`.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::embed::Embedder;
/// # use fusion_cortex_provider::{http::Reqwest, ollama::Embeddings};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let embedder = Embeddings::new("nomic-embed-text", transport)
///     .prefixes("search_query: ", "search_document: ");
///
/// assert_eq!(embedder.model(), "ollama/nomic-embed-text");
/// assert!(embedder.is_local(), "a local server is the default");
/// ```
pub struct Embeddings {
    base: String,
    dimensions: Option<usize>,
    id: String,
    known: OnceLock<usize>,
    local: bool,
    name: String,
    prefixes: Option<(String, String)>,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Embeddings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Embeddings")
            .field("base", &self.base)
            .field("id", &self.id)
            .field("local", &self.local)
            .finish_non_exhaustive()
    }
}

impl Embeddings {
    /// An embedding model on the server at `http://localhost:11434`.
    #[must_use]
    pub fn new(model: impl Into<String>, transport: Arc<dyn Transport>) -> Self {
        let model = model.into();
        Self {
            base: "http://localhost:11434".into(),
            dimensions: None,
            id: crate::embedder_id("ollama", &model, None),
            known: OnceLock::new(),
            local: true,
            name: model,
            prefixes: None,
            transport,
        }
    }

    /// Sends requests to a server on another host.
    #[must_use]
    pub fn base(mut self, base: impl Into<String>) -> Self {
        self.base = crate::trimmed(base);
        self
    }

    /// Whether the server runs on the user's own hardware, which the caller
    /// judges, as for [`Ollama::local`].
    #[must_use]
    pub fn local(mut self, local: bool) -> Self {
        self.local = local;
        self
    }

    /// Asks for vectors of `dimensions` values, for a model trained to
    /// shorten its vectors. The identifier takes the length, as in
    /// `ollama/qwen3-embedding@512`.
    #[must_use]
    pub fn output_dimensions(mut self, dimensions: usize) -> Self {
        self.dimensions = Some(dimensions);
        self.id = crate::embedder_id("ollama", &self.name, Some(dimensions));
        self.known = OnceLock::from(dimensions);
        self
    }

    /// The text put before a query and before a document, for a model
    /// trained with them, such as `search_query: ` and `search_document: `
    /// for `nomic-embed-text`.
    #[must_use]
    pub fn prefixes(mut self, query: impl Into<String>, document: impl Into<String>) -> Self {
        self.prefixes = Some((query.into(), document.into()));
        self
    }

    fn body(&self, texts: &[&str], purpose: Purpose) -> Value {
        let input: Vec<String> = texts
            .iter()
            .map(|text| crate::prefixed(self.prefixes.as_ref(), text, purpose))
            .collect();
        let mut body = json!({ "input": input, "model": self.name });
        if let Some(dimensions) = self.dimensions {
            body["dimensions"] = json!(dimensions);
        }
        body
    }
}

#[derive(Deserialize)]
struct Embedded {
    embeddings: Vec<Vec<f32>>,
}

#[async_trait]
impl Embedder for Embeddings {
    fn model(&self) -> &str {
        &self.id
    }

    fn dimensions(&self) -> Option<usize> {
        self.known.get().copied()
    }

    fn is_local(&self) -> bool {
        self.local
    }

    async fn embed(&self, texts: &[&str], purpose: Purpose) -> Result<Vec<Embedding>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }
        let post = Post {
            body: self.body(texts, purpose).to_string().into_bytes(),
            headers: Vec::new(),
            url: format!("{}/api/embed", self.base),
        };
        let body = http::whole(self.transport.post(post).await?).await?;
        let reply: Embedded = http::parse("Ollama", &String::from_utf8_lossy(&body))?;
        crate::embedded(self, &self.known, texts.len(), reply.embeddings)
    }
}

#[derive(Deserialize)]
struct Line {
    #[serde(default)]
    done: bool,
    done_reason: Option<String>,
    error: Option<String>,
    eval_count: Option<u32>,
    message: Option<LineMessage>,
    model: Option<String>,
    /// The part of `prompt_eval_count` the server read from its cache.
    prompt_eval_cached_count: Option<u32>,
    prompt_eval_count: Option<u32>,
}

#[derive(Deserialize)]
struct LineMessage {
    content: Option<String>,
    thinking: Option<String>,
    #[serde(default)]
    tool_calls: Vec<Value>,
}

#[derive(Default)]
struct Decoder {
    called: usize,
    opened: usize,
    text: Option<usize>,
    thinking: Option<usize>,
}

impl Decoder {
    fn open(&mut self, block: Block, events: &mut Vec<Event>) -> usize {
        let index = self.opened;
        self.opened += 1;
        events.push(Event::Start { block, index });
        index
    }

    /// Appends to the block in `slot`, opening it on first use.
    fn append(
        &mut self,
        slot: fn(&mut Self) -> &mut Option<usize>,
        block: Block,
        delta: Delta,
        events: &mut Vec<Event>,
    ) {
        let index = if let Some(index) = *slot(self) {
            index
        } else {
            let index = self.open(block, events);
            *slot(self) = Some(index);
            index
        };
        events.push(Event::Delta { delta, index });
    }
}

impl Decode for Decoder {
    type Frame = String;

    fn frame(&mut self, line: String) -> Result<Vec<Event>> {
        let line: Line = http::parse("Ollama", &line)?;
        if let Some(error) = line.error {
            return Err(Error::Status {
                message: error,
                retry_after: None,
                status: 500,
            });
        }
        let mut events = Vec::new();
        if let Some(message) = line.message {
            if let Some(thinking) = message.thinking.filter(|text| !text.is_empty()) {
                let block = Block::Thinking {
                    api: Api::Ollama,
                    signature: None,
                    text: String::new(),
                };
                self.append(
                    |d| &mut d.thinking,
                    block,
                    Delta::Thinking(thinking),
                    &mut events,
                );
            }
            if let Some(text) = message.content.filter(|text| !text.is_empty()) {
                self.append(
                    |d| &mut d.text,
                    Block::text(""),
                    Delta::Text(text),
                    &mut events,
                );
            }
            for call in message.tool_calls {
                let function = &call["function"];
                let id = call["id"].as_str().map_or_else(
                    || format!("{GENERATED}{}", fusion_cortex_core::Id::new()),
                    str::to_owned,
                );
                self.called += 1;
                let block = Block::ToolUse {
                    id,
                    input: function
                        .get("arguments")
                        .cloned()
                        .unwrap_or_else(|| json!({})),
                    name: function["name"].as_str().unwrap_or_default().to_owned(),
                };
                self.open(block, &mut events);
            }
        }
        if line.done {
            let stop = match line.done_reason.as_deref() {
                // The server reports `stop` for a turn that called a tool.
                Some("stop") | None if self.called > 0 => Stop::ToolUse,
                Some("stop") | None => Stop::EndTurn,
                Some("length") => Stop::MaxTokens,
                Some(other) => Stop::Other(other.to_owned()),
            };
            events.push(Event::Stop {
                id: None,
                model: line.model.unwrap_or_default(),
                stop,
                usage: Usage {
                    cache_read: line.prompt_eval_cached_count.unwrap_or(0),
                    input: line.prompt_eval_count.unwrap_or(0),
                    output: line.eval_count.unwrap_or(0),
                    ..Usage::default()
                },
            });
        }
        Ok(events)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::canned::Canned;
    use fusion_cortex_core::provider::{Effort, Format, Response, Tool};

    const STREAM: &str = r#"{"model":"qwen3-coder:30b","created_at":"2026-10-11T12:00:00Z","message":{"role":"assistant","content":"","thinking":"Two "},"done":false}
{"model":"qwen3-coder:30b","created_at":"2026-10-11T12:00:00Z","message":{"role":"assistant","content":"","thinking":"cities."},"done":false}
{"model":"qwen3-coder:30b","created_at":"2026-10-11T12:00:00Z","message":{"role":"assistant","content":"Checking."},"done":false}
{"model":"qwen3-coder:30b","created_at":"2026-10-11T12:00:00Z","message":{"role":"assistant","content":"","tool_calls":[{"type":"function","function":{"index":0,"name":"weather","arguments":{"city":"Paris"}}},{"id":"call_b","type":"function","function":{"index":1,"name":"weather","arguments":{"city":"Tokyo"}}}]},"done":false}
{"model":"qwen3-coder:30b","created_at":"2026-10-11T12:00:01Z","message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":320,"eval_count":45}
"#;

    fn provider(transport: &Arc<Canned>) -> Ollama {
        Ollama::new("qwen3-coder:30b", transport.clone())
    }

    #[tokio::test]
    async fn thinking_text_and_whole_calls_fold_into_one_response() {
        let transport = Arc::new(Canned::new(STREAM, 9));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.stop, Stop::ToolUse);
        assert_eq!(
            response.content[0],
            Block::Thinking {
                api: Api::Ollama,
                signature: None,
                text: "Two cities.".into(),
            }
        );
        assert_eq!(response.joined(), "Checking.");
        let calls: Vec<_> = response.tool_uses().collect();
        assert!(calls[0].0.starts_with(GENERATED));
        assert_eq!(calls[0].2, &json!({ "city": "Paris" }));
        assert_eq!(calls[1].0, "call_b");
        assert_eq!((response.usage.input, response.usage.output), (320, 45));
    }

    #[tokio::test]
    async fn the_text_blocks_of_one_message_go_out_as_paragraphs() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            messages: vec![Message {
                content: vec![
                    Block::text("fix it"),
                    Block::text("Part of this session was dropped."),
                ],
                role: Role::User,
            }],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        assert_eq!(
            transport.body()["messages"][0]["content"],
            "fix it\n\nPart of this session was dropped."
        );
    }

    #[tokio::test]
    async fn a_turn_goes_back_with_its_thinking_and_named_results() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();
        let generated = response.tool_uses().next().unwrap().0.to_owned();
        let request = Request {
            effort: Some(Effort::High),
            format: None,
            max_tokens: Some(512),
            messages: vec![
                Message::text(Role::System, "Answer briefly."),
                Message::text(Role::User, "Weather in Paris and Tokyo?"),
                response.message(),
                Message {
                    content: vec![
                        Block::ToolResult {
                            content: vec![Block::text("18 C")],
                            is_error: false,
                            tool_use_id: generated,
                        },
                        Block::ToolResult {
                            content: vec![
                                Block::text("22 C"),
                                Block::Image {
                                    data: "iVBOR".into(),
                                    media_type: "image/png".into(),
                                },
                            ],
                            is_error: false,
                            tool_use_id: "call_b".into(),
                        },
                    ],
                    role: Role::User,
                },
            ],
            tools: vec![Tool {
                description: "The weather in a city.".into(),
                name: "weather".into(),
                schema: json!({ "type": "object" }),
            }],
        };

        provider(&transport)
            .context(65_536)
            .complete(&request)
            .await
            .unwrap();

        assert_eq!(transport.last().url, "http://localhost:11434/api/chat");
        assert_eq!(
            transport.body(),
            json!({
                "messages": [
                    { "content": "Answer briefly.", "role": "system" },
                    { "content": "Weather in Paris and Tokyo?", "role": "user" },
                    {
                        "content": "Checking.",
                        "role": "assistant",
                        "thinking": "Two cities.",
                        "tool_calls": [
                            { "function": { "arguments": { "city": "Paris" }, "name": "weather" }, "type": "function" },
                            {
                                "function": { "arguments": { "city": "Tokyo" }, "name": "weather" },
                                "id": "call_b",
                                "type": "function",
                            },
                        ],
                    },
                    { "content": "18 C", "role": "tool", "tool_name": "weather" },
                    { "content": "22 C", "role": "tool", "tool_call_id": "call_b", "tool_name": "weather" },
                    { "content": "", "images": ["iVBOR"], "role": "user" },
                ],
                "model": "qwen3-coder:30b",
                "options": { "num_ctx": 65_536, "num_predict": 512 },
                "stream": true,
                "think": true,
                "tools": [{
                    "function": {
                        "description": "The weather in a city.",
                        "name": "weather",
                        "parameters": { "type": "object" },
                    },
                    "type": "function",
                }],
            })
        );
    }

    #[tokio::test]
    async fn made_up_ids_differ_from_turn_to_turn() {
        let call = |name: &str| {
            format!("{{\"model\":\"m\",\"message\":{{\"role\":\"assistant\",\"content\":\"\",\"tool_calls\":[{{\"function\":{{\"name\":\"{name}\",\"arguments\":{{}}}}}}]}},\"done\":true,\"done_reason\":\"stop\"}}\n")
        };
        let turn = |name: &str| {
            let transport = Arc::new(Canned::new(&call(name), usize::MAX));
            async move { provider(&transport).complete(&Request::default()).await }
        };
        let first = turn("read_file").await.unwrap();
        let second = turn("run_command").await.unwrap();
        let result = |response: &Response| Message {
            content: response
                .tool_uses()
                .map(|(id, _, _)| Block::ToolResult {
                    content: vec![Block::text("ok")],
                    is_error: false,
                    tool_use_id: id.to_owned(),
                })
                .collect(),
            role: Role::User,
        };
        let request = Request {
            messages: vec![
                first.message(),
                result(&first),
                second.message(),
                result(&second),
            ],
            ..Request::default()
        };
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));

        provider(&transport).complete(&request).await.unwrap();

        let (one, _, _) = first.tool_uses().next().unwrap();
        let (two, _, _) = second.tool_uses().next().unwrap();
        assert!(one.starts_with(GENERATED) && two.starts_with(GENERATED));
        assert_ne!(one, two);
        let messages = &transport.body()["messages"];
        assert_eq!(messages[1]["tool_name"], "read_file");
        assert_eq!(messages[3]["tool_name"], "run_command");
    }

    #[tokio::test]
    async fn cached_input_is_read_and_stays_inside_the_input() {
        let stream = "{\"model\":\"m\",\"message\":{\"role\":\"assistant\",\"content\":\"ready\"},\"done\":true,\"done_reason\":\"stop\",\"prompt_eval_count\":56,\"prompt_eval_cached_count\":55,\"eval_count\":2}\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(
            response.usage,
            Usage {
                cache_read: 55,
                cache_write: 0,
                input: 56,
                output: 2,
                reasoning: 0,
            }
        );
    }

    #[tokio::test]
    async fn the_hosted_service_takes_a_key_and_is_not_local() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let provider = provider(&transport).cloud("ollama-key");

        provider.complete(&Request::default()).await.unwrap();

        assert!(!provider.is_local());
        assert_eq!(provider.id(), "ollama/qwen3-coder:30b");
        let post = transport.last();
        assert_eq!(post.url, "https://ollama.com/api/chat");
        assert!(post
            .headers
            .contains(&("authorization".into(), "Bearer ollama-key".into())));
    }

    #[test]
    fn a_server_the_caller_judges_hosted_is_not_local_without_a_key() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));

        let provider = provider(&transport)
            .base("https://localhost.example.com")
            .local(false);

        assert!(!provider.is_local());
    }

    #[tokio::test]
    async fn an_error_line_ends_the_stream() {
        let stream = "{\"model\":\"m\",\"message\":{\"role\":\"assistant\",\"content\":\"Hi\"},\"done\":false}\n{\"error\":\"model runner has unexpectedly stopped\"}\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let error = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap_err();

        assert!(
            error.to_string().contains("unexpectedly stopped"),
            "{error}"
        );
        assert!(
            error.is_retryable(),
            "a runner that stopped may start again"
        );
    }

    /// Refuses the first request as Ollama refuses `think` for a model that
    /// cannot think, and answers the rest as `answers` does.
    struct Refusing {
        answers: Canned,
        refused: std::sync::atomic::AtomicBool,
    }

    #[async_trait]
    impl Transport for Refusing {
        async fn post(&self, post: Post) -> Result<http::Body> {
            if self.refused.swap(true, std::sync::atomic::Ordering::SeqCst) {
                return self.answers.post(post).await;
            }
            Err(Error::Status {
                message: r#""qwen3-coder:30b" does not support thinking"#.into(),
                retry_after: None,
                status: 400,
            })
        }
    }

    #[tokio::test]
    async fn a_model_that_cannot_think_is_asked_again_without_thinking() {
        let transport = Arc::new(Refusing {
            answers: Canned::new(STREAM, usize::MAX),
            refused: std::sync::atomic::AtomicBool::new(false),
        });
        let request = Request {
            effort: Some(Effort::High),
            ..Request::default()
        };

        let response = Ollama::new("qwen3-coder:30b", transport.clone())
            .complete(&request)
            .await;

        assert!(response.is_ok(), "{response:?}");
        assert!(transport.answers.body().get("think").is_none());
    }

    #[tokio::test]
    async fn a_rejected_request_gives_the_status_the_message_and_whether_to_retry() {
        let limited = Arc::new(Canned::status(
            429,
            r#"{"error":"server busy, please try again.  maximum pending requests exceeded"}"#,
        ));
        let error = provider(&limited)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 429, message, .. } if message == "server busy, please try again.  maximum pending requests exceeded"),
            "{error}"
        );
        assert!(error.is_retryable());

        let refused = Arc::new(Canned::status(
            404,
            r#"{"error":"model 'qwen3-coder:30b' not found"}"#,
        ));
        let error = provider(&refused)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 404, message, .. } if message == "model 'qwen3-coder:30b' not found"),
            "{error}"
        );
        assert!(
            !error.is_retryable(),
            "a request rejected as written fails again unchanged"
        );
    }

    /// A reply from `/api/embed` with `all-minilm`, cut to three values.
    const EMBEDDED: &str = r#"{"model":"all-minilm","embeddings":[[0.010071029,-0.0017594862,0.05007221],[-0.009854669,0.060322512,0.0010021433]],"total_duration":14143917,"load_duration":1019500,"prompt_eval_count":8}"#;

    #[tokio::test]
    async fn embeddings_come_back_in_order_with_the_model_that_made_them() {
        let transport = Arc::new(Canned::new(EMBEDDED, 7));
        let embedder = Embeddings::new("all-minilm", transport.clone());
        assert_eq!(embedder.dimensions(), None, "unknown until the first reply");

        let vectors = embedder
            .embed(
                &["Dana owns the release notes", "the suite runs nightly"],
                Purpose::Document,
            )
            .await
            .unwrap();

        assert_eq!(transport.last().url, "http://localhost:11434/api/embed");
        assert_eq!(
            transport.body(),
            json!({
                "input": ["Dana owns the release notes", "the suite runs nightly"],
                "model": "all-minilm",
            })
        );
        assert_eq!(vectors.len(), 2);
        assert_eq!(
            vectors[1].values,
            [-0.009_854_669, 0.060_322_512, 0.001_002_143_3]
        );
        assert_eq!(vectors[0].model, "ollama/all-minilm");
        assert_eq!(embedder.dimensions(), Some(3), "learned from the reply");
        assert!(embedder
            .embed(&[], Purpose::Query)
            .await
            .unwrap()
            .is_empty());
    }

    #[tokio::test]
    async fn a_query_and_a_document_take_their_own_prefixes() {
        let transport = Arc::new(Canned::new(EMBEDDED, usize::MAX));
        let embedder = Embeddings::new("nomic-embed-text", transport.clone())
            .prefixes("search_query: ", "search_document: ")
            .output_dimensions(3);

        embedder
            .embed(&["who owns the notes?", "Dana does"], Purpose::Query)
            .await
            .unwrap();

        assert_eq!(
            transport.body(),
            json!({
                "dimensions": 3,
                "input": ["search_query: who owns the notes?", "search_query: Dana does"],
                "model": "nomic-embed-text",
            })
        );
        assert_eq!(embedder.model(), "ollama/nomic-embed-text@3");
    }

    #[tokio::test]
    async fn a_reply_with_too_few_vectors_or_the_wrong_length_is_refused() {
        let transport = Arc::new(Canned::new(EMBEDDED, usize::MAX));

        let short = Embeddings::new("all-minilm", transport.clone())
            .embed(&["a", "b", "c"], Purpose::Document)
            .await
            .unwrap_err();
        assert!(matches!(short, Error::InvalidOutput(_)), "{short}");

        let longer = Embeddings::new("all-minilm", transport.clone())
            .output_dimensions(384)
            .embed(&["a", "b"], Purpose::Document)
            .await
            .unwrap_err();
        assert!(longer.to_string().contains("not 384"), "{longer}");

        let missing = Arc::new(Canned::status(
            404,
            r#"{"error":"model \"all-minilm\" not found, try pulling it first"}"#,
        ));
        let error = Embeddings::new("all-minilm", missing)
            .embed(&["a"], Purpose::Document)
            .await
            .unwrap_err();
        assert!(
            matches!(&error, Error::Status { status: 404, message, .. } if message.contains("try pulling it")),
            "{error}"
        );
    }

    #[tokio::test]
    async fn a_format_asks_for_json_that_matches_its_schema() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            format: Some(Format {
                name: "forecast".into(),
                schema: json!({
                    "properties": { "city": { "type": "string" } },
                    "required": ["city"],
                    "type": "object",
                }),
            }),
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        assert_eq!(transport.body()["format"]["required"], json!(["city"]));
    }
}
