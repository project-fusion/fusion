//! Gemini `generateContent`, streamed from `:streamGenerateContent?alt=sse`,
//! and its embeddings, from `:batchEmbedContents`.
//!
//! **Google now calls this API legacy**, and recommends the Interactions API
//! for new work. This client is built on `generateContent` because it is the
//! documented and stable surface today; Interactions is its own client when it
//! is.
//!
//! **A thought signature rides on the part after it.** Gemini attaches its
//! opaque reasoning state to a part, such as the first function call of a
//! turn, and rejects a later request that leaves it off. The decoder turns each
//! signature into a [`Block::Thinking`] with no text, placed before the block
//! it came on, and the encoder puts it back on the part that follows.

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
    Api, Block, Delta, Effort, Event, Events, Message, Provider, Request, Role, Stop, Usage,
};
use fusion_cortex_core::{Error, Result};

/// Prefixes an id this client made up for a call that came without one, as
/// calls from models before Gemini 3 do. It is never sent back, because the API
/// did not issue it. A fresh UUID follows it, so a call made up on one turn
/// never shares an id with a call made up on another.
const GENERATED: &str = "generated-";

/// A client for one Gemini model.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::provider::Provider;
/// # use fusion_cortex_provider::{gemini::Gemini, http::Reqwest};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let provider = Gemini::new("AIza...", "gemini-3.5-pro", transport);
///
/// assert_eq!(provider.id(), "gemini/gemini-3.5-pro");
/// ```
pub struct Gemini {
    base: String,
    id: String,
    key: String,
    model: String,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Gemini {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Gemini")
            .field("base", &self.base)
            .field("model", &self.model)
            .finish_non_exhaustive()
    }
}

impl Gemini {
    #[must_use]
    pub fn new(
        key: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self {
            base: "https://generativelanguage.googleapis.com".into(),
            id: format!("gemini/{model}"),
            key: key.into(),
            model,
            transport,
        }
    }

    /// Sends requests to another host that speaks this API.
    #[must_use]
    pub fn base(mut self, base: impl Into<String>) -> Self {
        self.base = crate::trimmed(base);
        self
    }

    fn body(request: &Request) -> Value {
        let leading = request
            .messages
            .iter()
            .take_while(|message| message.role == Role::System)
            .count();
        let (system, rest) = request.messages.split_at(leading);

        let names: HashMap<&str, &str> = request
            .messages
            .iter()
            .flat_map(|message| &message.content)
            .filter_map(|block| match block {
                Block::ToolUse { id, name, .. } => Some((id.as_str(), name.as_str())),
                _ => None,
            })
            .collect();

        // The API takes two roles, and turns of one role in a row merge into
        // one, so a system message given mid-session joins the user's turn.
        let mut contents: Vec<Value> = Vec::new();
        for message in rest {
            let role = match message.role {
                Role::Assistant => "model",
                Role::System | Role::User => "user",
            };
            let parts = parts(message, &names);
            if parts.is_empty() {
                continue;
            }
            match contents.last_mut() {
                Some(last) if last["role"] == role => {
                    if let Some(existing) = last["parts"].as_array_mut() {
                        existing.extend(parts);
                    }
                }
                _ => contents.push(json!({ "parts": parts, "role": role })),
            }
        }

        let mut body = json!({ "contents": contents });
        if !system.is_empty() {
            let parts: Vec<Value> = system
                .iter()
                .map(|message| json!({ "text": crate::paragraphs(&message.content) }))
                .collect();
            body["systemInstruction"] = json!({ "parts": parts });
        }
        if !request.tools.is_empty() {
            let declarations: Vec<Value> = request
                .tools
                .iter()
                .map(|tool| {
                    // `parameters` takes a subset of OpenAPI, which rejects
                    // keywords such as `additionalProperties`, and
                    // `parametersJsonSchema` takes the schema as written.
                    json!({
                        "description": tool.description,
                        "name": tool.name,
                        "parametersJsonSchema": tool.schema,
                    })
                })
                .collect();
            body["tools"] = json!([{ "functionDeclarations": declarations }]);
        }
        let mut config = serde_json::Map::new();
        if let Some(max_tokens) = request.max_tokens {
            config.insert("maxOutputTokens".into(), json!(max_tokens));
        }
        if let Some(effort) = request.effort {
            let level = match effort {
                Effort::Low => "low",
                Effort::Medium => "medium",
                Effort::High | Effort::Xhigh | Effort::Max => "high",
            };
            config.insert(
                "thinkingConfig".into(),
                json!({ "includeThoughts": true, "thinkingLevel": level }),
            );
        }
        // `responseFormat` replaces `responseSchema`, which took the OpenAPI
        // subset, and takes JSON Schema. The server drops the keywords it does
        // not enforce rather than refusing the request.
        if let Some(format) = &request.format {
            config.insert(
                "responseFormat".into(),
                json!({ "text": { "mimeType": "APPLICATION_JSON", "schema": format.schema } }),
            );
        }
        if !config.is_empty() {
            body["generationConfig"] = Value::Object(config);
        }
        body
    }
}

fn parts(message: &Message, names: &HashMap<&str, &str>) -> Vec<Value> {
    let mut parts = Vec::new();
    let mut signature: Option<&str> = None;
    let mut push = |mut part: Value, signature: &mut Option<&str>| {
        if let Some(signature) = signature.take() {
            part["thoughtSignature"] = json!(signature);
        }
        parts.push(part);
    };

    for block in &message.content {
        match block {
            Block::Image { data, media_type } => push(
                json!({ "inlineData": { "data": data, "mimeType": media_type } }),
                &mut signature,
            ),
            Block::Text { text } if text.is_empty() && signature.is_none() => {}
            Block::Text { text } => push(json!({ "text": text }), &mut signature),
            Block::Thinking {
                api: Api::Gemini,
                signature: carried,
                text,
            } if text.is_empty() => signature = carried.as_deref(),
            Block::Thinking {
                api: Api::Gemini,
                signature: carried,
                text,
            } => {
                signature = carried.as_deref();
                push(json!({ "text": text, "thought": true }), &mut signature);
            }
            Block::Thinking { .. } => {}
            Block::ToolResult {
                content,
                is_error,
                tool_use_id,
            } => {
                let key = if *is_error { "error" } else { "result" };
                let mut response = json!({
                    "name": names.get(tool_use_id.as_str()).copied().unwrap_or(tool_use_id),
                    "response": { key: crate::paragraphs(content) },
                });
                if !tool_use_id.starts_with(GENERATED) {
                    response["id"] = json!(tool_use_id);
                }
                push(json!({ "functionResponse": response }), &mut signature);
                for image in content {
                    if let Block::Image { data, media_type } = image {
                        push(
                            json!({ "inlineData": { "data": data, "mimeType": media_type } }),
                            &mut signature,
                        );
                    }
                }
            }
            Block::ToolUse { id, input, name } => {
                let mut call = json!({ "args": input, "name": name });
                if !id.starts_with(GENERATED) {
                    call["id"] = json!(id);
                }
                push(json!({ "functionCall": call }), &mut signature);
            }
        }
    }
    // A signature the API sent on an empty part goes back on one.
    if signature.is_some() {
        push(json!({ "text": "" }), &mut signature);
    }
    parts
}

#[async_trait]
impl Provider for Gemini {
    fn id(&self) -> &str {
        &self.id
    }

    fn is_local(&self) -> bool {
        false
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        let post = Post {
            body: Self::body(request).to_string().into_bytes(),
            headers: vec![("x-goog-api-key".into(), self.key.clone())],
            url: format!(
                "{}/v1beta/models/{}:streamGenerateContent?alt=sse",
                self.base, self.model
            ),
        };
        let body = self.transport.post(post).await?;
        Ok(http::decode(http::sse(body), Decoder::default()))
    }
}

/// A Gemini embedding model, through `:batchEmbedContents`.
///
/// **Each text is sent with its task**, `RETRIEVAL_QUERY` for a query and
/// `RETRIEVAL_DOCUMENT` for a document, which the model is trained to embed
/// apart.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::embed::Embedder;
/// # use fusion_cortex_provider::{gemini::Embeddings, http::Reqwest};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let embedder = Embeddings::new("AIza...", "gemini-embedding-001", transport).output_dimensions(768);
///
/// assert_eq!(embedder.model(), "gemini/gemini-embedding-001@768");
/// assert!(!embedder.is_local());
/// ```
pub struct Embeddings {
    base: String,
    dimensions: Option<usize>,
    id: String,
    key: String,
    known: OnceLock<usize>,
    name: String,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Embeddings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Embeddings")
            .field("base", &self.base)
            .field("id", &self.id)
            .finish_non_exhaustive()
    }
}

impl Embeddings {
    #[must_use]
    pub fn new(
        key: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self {
            base: "https://generativelanguage.googleapis.com".into(),
            dimensions: None,
            id: crate::embedder_id("gemini", &model, None),
            key: key.into(),
            known: OnceLock::new(),
            name: model,
            transport,
        }
    }

    /// Sends requests to another host that speaks this API.
    #[must_use]
    pub fn base(mut self, base: impl Into<String>) -> Self {
        self.base = crate::trimmed(base);
        self
    }

    /// Asks for vectors of `dimensions` values, as `outputDimensionality`.
    #[must_use]
    pub fn output_dimensions(mut self, dimensions: usize) -> Self {
        self.dimensions = Some(dimensions);
        self.id = crate::embedder_id("gemini", &self.name, Some(dimensions));
        self.known = OnceLock::from(dimensions);
        self
    }

    fn body(&self, texts: &[&str], purpose: Purpose) -> Value {
        let task = match purpose {
            Purpose::Document => "RETRIEVAL_DOCUMENT",
            Purpose::Query => "RETRIEVAL_QUERY",
        };
        let requests: Vec<Value> = texts
            .iter()
            .map(|text| {
                let mut request = json!({
                    "content": { "parts": [{ "text": text }] },
                    "model": format!("models/{}", self.name),
                    "taskType": task,
                });
                if let Some(dimensions) = self.dimensions {
                    request["outputDimensionality"] = json!(dimensions);
                }
                request
            })
            .collect();
        json!({ "requests": requests })
    }
}

#[derive(Deserialize)]
struct Embedded {
    #[serde(default)]
    embeddings: Vec<Values>,
}

#[derive(Deserialize)]
struct Values {
    values: Vec<f32>,
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
        false
    }

    async fn embed(&self, texts: &[&str], purpose: Purpose) -> Result<Vec<Embedding>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }
        let post = Post {
            body: self.body(texts, purpose).to_string().into_bytes(),
            headers: vec![("x-goog-api-key".into(), self.key.clone())],
            url: format!(
                "{}/v1beta/models/{}:batchEmbedContents",
                self.base, self.name
            ),
        };
        let body = http::whole(self.transport.post(post).await?).await?;
        let reply: Embedded = http::parse("Gemini", &String::from_utf8_lossy(&body))?;
        let vectors = reply
            .embeddings
            .into_iter()
            .map(|each| each.values)
            .collect();
        crate::embedded(self, &self.known, texts.len(), vectors)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Chunk {
    #[serde(default)]
    candidates: Vec<Candidate>,
    error: Option<Value>,
    model_version: Option<String>,
    prompt_feedback: Option<Value>,
    response_id: Option<String>,
    usage_metadata: Option<WireUsage>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Candidate {
    content: Option<Content>,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct Content {
    #[serde(default)]
    parts: Vec<Value>,
}

#[derive(Deserialize)]
struct WireUsage {
    #[serde(rename = "cachedContentTokenCount")]
    cached: Option<u32>,
    #[serde(rename = "candidatesTokenCount")]
    candidates: Option<u32>,
    #[serde(rename = "promptTokenCount")]
    prompt: Option<u32>,
    #[serde(rename = "thoughtsTokenCount")]
    thoughts: Option<u32>,
    #[serde(rename = "toolUsePromptTokenCount")]
    tool_prompt: Option<u32>,
}

/// Which kind of block the last one opened was, so text streamed across
/// chunks appends to it.
#[derive(Clone, Copy, PartialEq)]
enum Open {
    Text,
    Thought,
}

#[derive(Default)]
struct Decoder {
    called: usize,
    finish: Option<String>,
    id: Option<String>,
    last: Option<(Open, usize)>,
    model: String,
    opened: usize,
    usage: Usage,
}

impl Decoder {
    fn open(&mut self, block: Block, events: &mut Vec<Event>) -> usize {
        let index = self.opened;
        self.opened += 1;
        self.last = None;
        events.push(Event::Start { block, index });
        index
    }

    fn signature(&mut self, signature: &str, events: &mut Vec<Event>) {
        let block = Block::Thinking {
            api: Api::Gemini,
            signature: Some(signature.to_owned()),
            text: String::new(),
        };
        self.open(block, events);
    }

    fn part(&mut self, part: &Value, events: &mut Vec<Event>) {
        let signature = part["thoughtSignature"].as_str();
        if let Some(call) = part.get("functionCall") {
            if let Some(signature) = signature {
                self.signature(signature, events);
            }
            let id = call["id"].as_str().map_or_else(
                || format!("{GENERATED}{}", fusion_cortex_core::Id::new()),
                str::to_owned,
            );
            self.called += 1;
            let block = Block::ToolUse {
                id,
                input: call.get("args").cloned().unwrap_or_else(|| json!({})),
                name: call["name"].as_str().unwrap_or_default().to_owned(),
            };
            self.open(block, events);
            return;
        }
        let Some(text) = part["text"].as_str() else {
            return;
        };
        if part["thought"].as_bool() == Some(true) {
            let index = if let Some((Open::Thought, index)) = self.last {
                index
            } else {
                let block = Block::Thinking {
                    api: Api::Gemini,
                    signature: None,
                    text: String::new(),
                };
                let index = self.open(block, events);
                self.last = Some((Open::Thought, index));
                index
            };
            events.push(Event::Delta {
                delta: Delta::Thinking(text.to_owned()),
                index,
            });
            if let Some(signature) = signature {
                events.push(Event::Delta {
                    delta: Delta::Signature(signature.to_owned()),
                    index,
                });
            }
            return;
        }
        if let Some(signature) = signature {
            self.signature(signature, events);
            // The signed text is a block of its own after its signature, so
            // the encoder gives the signature back to the part it came on.
            self.last = None;
        }
        // A part that carries only a signature opens no text block, and the
        // encoder puts the signature back on an empty part.
        if text.is_empty() {
            return;
        }
        let index = if let Some((Open::Text, index)) = self.last {
            index
        } else {
            let index = self.open(Block::text(""), events);
            self.last = Some((Open::Text, index));
            index
        };
        events.push(Event::Delta {
            delta: Delta::Text(text.to_owned()),
            index,
        });
    }
}

fn stop_of(reason: &str, called: bool) -> Stop {
    match reason {
        // The API has no reason of its own for a turn that called a tool.
        "STOP" if called => Stop::ToolUse,
        "STOP" => Stop::EndTurn,
        "MAX_TOKENS" => Stop::MaxTokens,
        "BLOCKLIST"
        | "IMAGE_PROHIBITED_CONTENT"
        | "IMAGE_SAFETY"
        | "PROHIBITED_CONTENT"
        | "RECITATION"
        | "SAFETY"
        | "SPII" => Stop::Refusal,
        other => Stop::Other(other.to_owned()),
    }
}

impl Decode for Decoder {
    type Frame = http::Sse;

    fn frame(&mut self, frame: http::Sse) -> Result<Vec<Event>> {
        let chunk: Chunk = http::parse("Gemini", &frame.data)?;
        if let Some(error) = chunk.error {
            return Err(Error::Status {
                message: error["message"].as_str().unwrap_or_default().to_owned(),
                retry_after: None,
                status: error["code"]
                    .as_u64()
                    .and_then(|code| u16::try_from(code).ok())
                    .unwrap_or(500),
            });
        }
        if let Some(id) = chunk.response_id {
            self.id = Some(id);
        }
        if let Some(model) = chunk.model_version {
            self.model = model;
        }
        if let Some(usage) = chunk.usage_metadata {
            // Cached tokens are counted inside the prompt's, and thoughts
            // apart from the candidates'.
            let thoughts = usage.thoughts.unwrap_or(0);
            self.usage = Usage {
                cache_read: usage.cached.unwrap_or(0),
                cache_write: 0,
                input: usage
                    .prompt
                    .unwrap_or(0)
                    .saturating_add(usage.tool_prompt.unwrap_or(0)),
                output: usage.candidates.unwrap_or(0).saturating_add(thoughts),
                reasoning: thoughts,
            };
        }
        if let Some(blocked) = chunk
            .prompt_feedback
            .and_then(|feedback| feedback["blockReason"].as_str().map(str::to_owned))
        {
            self.finish = Some(format!("PROMPT_{blocked}"));
        }

        let mut events = Vec::new();
        if let Some(candidate) = chunk.candidates.into_iter().next() {
            for part in candidate
                .content
                .map(|content| content.parts)
                .unwrap_or_default()
            {
                self.part(&part, &mut events);
            }
            if let Some(reason) = candidate.finish_reason.filter(|reason| !reason.is_empty()) {
                self.finish = Some(reason);
            }
        }
        Ok(events)
    }

    /// The API stops by closing the stream, and the finish reason it sent last
    /// says why. A stream that closes without one was cut off.
    fn finish(&mut self) -> Result<Vec<Event>> {
        let Some(reason) = self.finish.take() else {
            return Ok(vec![]);
        };
        let stop = if reason.starts_with("PROMPT_") {
            Stop::Refusal
        } else {
            stop_of(&reason, self.called > 0)
        };
        Ok(vec![Event::Stop {
            id: self.id.clone(),
            model: self.model.clone(),
            stop,
            usage: self.usage,
        }])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::canned::Canned;
    use fusion_cortex_core::provider::{Format, Response, Tool};

    const STREAM: &str = r#"data: {"candidates":[{"content":{"parts":[{"text":"Two cities, ","thought":true}],"role":"model"},"index":0}],"modelVersion":"gemini-3.5-pro","responseId":"r1"}

data: {"candidates":[{"content":{"parts":[{"text":"two calls.","thought":true}],"role":"model"},"index":0}],"modelVersion":"gemini-3.5-pro","responseId":"r1"}

data: {"candidates":[{"content":{"parts":[{"text":"Checking "}],"role":"model"},"index":0}],"modelVersion":"gemini-3.5-pro","responseId":"r1"}

data: {"candidates":[{"content":{"parts":[{"text":"both."}],"role":"model"},"index":0}],"modelVersion":"gemini-3.5-pro","responseId":"r1"}

data: {"candidates":[{"content":{"parts":[{"functionCall":{"id":"8f2b","name":"weather","args":{"city":"Paris"}},"thoughtSignature":"c2ln"},{"functionCall":{"id":"9c3d","name":"weather","args":{"city":"Tokyo"}}}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":500,"cachedContentTokenCount":400,"candidatesTokenCount":30,"thoughtsTokenCount":120,"totalTokenCount":650},"modelVersion":"gemini-3.5-pro","responseId":"r1"}

"#;

    fn provider(transport: &Arc<Canned>) -> Gemini {
        Gemini::new("AIza-test", "gemini-3.5-pro", transport.clone())
    }

    fn signature() -> Block {
        Block::Thinking {
            api: Api::Gemini,
            signature: Some("c2ln".into()),
            text: String::new(),
        }
    }

    #[tokio::test]
    async fn thoughts_text_and_a_signed_pair_of_calls_fold_into_one_response() {
        let transport = Arc::new(Canned::new(STREAM, 17));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(
            response.stop,
            Stop::ToolUse,
            "a turn with calls stops for them"
        );
        assert_eq!(response.model, "gemini-3.5-pro");
        assert_eq!(
            response.content,
            vec![
                Block::Thinking {
                    api: Api::Gemini,
                    signature: None,
                    text: "Two cities, two calls.".into(),
                },
                Block::text("Checking both."),
                signature(),
                Block::ToolUse {
                    id: "8f2b".into(),
                    input: json!({ "city": "Paris" }),
                    name: "weather".into(),
                },
                Block::ToolUse {
                    id: "9c3d".into(),
                    input: json!({ "city": "Tokyo" }),
                    name: "weather".into(),
                },
            ]
        );
        assert_eq!(
            response.usage,
            Usage {
                cache_read: 400,
                cache_write: 0,
                input: 500,
                output: 150,
                reasoning: 120,
            }
        );
    }

    #[tokio::test]
    async fn the_signature_goes_back_on_the_part_it_came_on() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();
        let request = Request {
            effort: Some(Effort::Xhigh),
            format: None,
            max_tokens: Some(1024),
            messages: vec![
                Message::text(Role::System, "Answer briefly."),
                Message::text(Role::User, "Weather in Paris and Tokyo?"),
                response.message(),
                Message {
                    content: vec![
                        Block::ToolResult {
                            content: vec![Block::text("18 C")],
                            is_error: false,
                            tool_use_id: "8f2b".into(),
                        },
                        Block::ToolResult {
                            content: vec![Block::text("no such city")],
                            is_error: true,
                            tool_use_id: "9c3d".into(),
                        },
                    ],
                    role: Role::User,
                },
                Message::text(Role::System, "Use Celsius."),
            ],
            tools: vec![Tool {
                description: "The weather in a city.".into(),
                name: "weather".into(),
                schema: json!({ "additionalProperties": false, "type": "object" }),
            }],
        };

        provider(&transport).complete(&request).await.unwrap();

        let post = transport.last();
        assert_eq!(
            post.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-pro:streamGenerateContent?alt=sse"
        );
        assert!(post
            .headers
            .contains(&("x-goog-api-key".into(), "AIza-test".into())));
        assert_eq!(
            transport.body(),
            json!({
                "contents": [
                    { "parts": [{ "text": "Weather in Paris and Tokyo?" }], "role": "user" },
                    {
                        "parts": [
                            { "text": "Two cities, two calls.", "thought": true },
                            { "text": "Checking both." },
                            {
                                "functionCall": { "args": { "city": "Paris" }, "id": "8f2b", "name": "weather" },
                                "thoughtSignature": "c2ln",
                            },
                            { "functionCall": { "args": { "city": "Tokyo" }, "id": "9c3d", "name": "weather" } },
                        ],
                        "role": "model",
                    },
                    {
                        "parts": [
                            {
                                "functionResponse": {
                                    "id": "8f2b",
                                    "name": "weather",
                                    "response": { "result": "18 C" },
                                },
                            },
                            {
                                "functionResponse": {
                                    "id": "9c3d",
                                    "name": "weather",
                                    "response": { "error": "no such city" },
                                },
                            },
                            { "text": "Use Celsius." },
                        ],
                        "role": "user",
                    },
                ],
                "generationConfig": {
                    "maxOutputTokens": 1024,
                    "thinkingConfig": { "includeThoughts": true, "thinkingLevel": "high" },
                },
                "systemInstruction": { "parts": [{ "text": "Answer briefly." }] },
                "tools": [{
                    "functionDeclarations": [{
                        "description": "The weather in a city.",
                        "name": "weather",
                        "parametersJsonSchema": { "additionalProperties": false, "type": "object" },
                    }],
                }],
            })
        );
    }

    #[tokio::test]
    async fn a_signature_on_a_final_empty_part_survives_the_round_trip() {
        let stream = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Done.\"}],\"role\":\"model\"}}]}\n\ndata: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"\",\"thoughtSignature\":\"c2ln\"}],\"role\":\"model\"},\"finishReason\":\"STOP\"}]}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();
        let names = HashMap::new();

        assert_eq!(response.stop, Stop::EndTurn);
        assert_eq!(response.joined(), "Done.");
        assert_eq!(
            parts(&response.message(), &names),
            vec![
                json!({ "text": "Done." }),
                json!({ "text": "", "thoughtSignature": "c2ln" })
            ]
        );
    }

    #[tokio::test]
    async fn a_part_that_carries_only_a_signature_opens_no_text_block() {
        let stream = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Done.\"}],\"role\":\"model\"}}]}\n\ndata: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"\",\"thoughtSignature\":\"c2ln\"}],\"role\":\"model\"},\"finishReason\":\"STOP\"}]}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.content, vec![Block::text("Done."), signature()]);
    }

    #[tokio::test]
    async fn signed_text_after_other_text_is_a_block_of_its_own() {
        let stream = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"First.\"}],\"role\":\"model\"}}]}\n\ndata: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Second.\",\"thoughtSignature\":\"c2ln\"}],\"role\":\"model\"},\"finishReason\":\"STOP\"}]}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(
            response.content,
            vec![Block::text("First."), signature(), Block::text("Second.")]
        );
    }

    #[tokio::test]
    async fn the_text_blocks_of_one_message_go_out_as_paragraphs() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            messages: vec![
                Message {
                    content: vec![
                        Block::text("Answer briefly."),
                        Block::text("The user is in Paris."),
                    ],
                    role: Role::System,
                },
                Message::text(Role::User, "Weather?"),
                Message {
                    content: vec![Block::ToolUse {
                        id: "8f2b".into(),
                        input: json!({}),
                        name: "weather".into(),
                    }],
                    role: Role::Assistant,
                },
                Message {
                    content: vec![Block::ToolResult {
                        content: vec![Block::text("18 C"), Block::text("Output truncated.")],
                        is_error: false,
                        tool_use_id: "8f2b".into(),
                    }],
                    role: Role::User,
                },
            ],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        let body = transport.body();
        assert_eq!(
            body["systemInstruction"]["parts"][0]["text"],
            "Answer briefly.\n\nThe user is in Paris."
        );
        assert_eq!(
            body["contents"][2]["parts"][0]["functionResponse"]["response"]["result"],
            "18 C\n\nOutput truncated."
        );
    }

    #[tokio::test]
    async fn made_up_ids_differ_from_turn_to_turn() {
        let call = |name: &str| {
            format!("data: {{\"candidates\":[{{\"content\":{{\"parts\":[{{\"functionCall\":{{\"name\":\"{name}\",\"args\":{{}}}}}}],\"role\":\"model\"}},\"finishReason\":\"STOP\"}}]}}\n\n")
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
                Message::text(Role::User, "Go."),
                first.message(),
                result(&first),
                second.message(),
                result(&second),
            ],
            ..Request::default()
        };

        let (one, _, _) = first.tool_uses().next().unwrap();
        let (two, _, _) = second.tool_uses().next().unwrap();
        assert!(one.starts_with(GENERATED) && two.starts_with(GENERATED));
        assert_ne!(one, two);
        let contents = &Gemini::body(&request)["contents"];
        assert_eq!(
            contents[2]["parts"][0]["functionResponse"]["name"],
            "read_file"
        );
        assert_eq!(
            contents[4]["parts"][0]["functionResponse"]["name"],
            "run_command"
        );
    }

    #[tokio::test]
    async fn a_call_without_an_id_gets_one_that_is_never_sent_back() {
        let stream = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"functionCall\":{\"name\":\"weather\",\"args\":{\"city\":\"Paris\"}}}],\"role\":\"model\"},\"finishReason\":\"STOP\"}]}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();
        let (id, _, _) = response.tool_uses().next().unwrap();
        let names = HashMap::from([(id, "weather")]);
        let result = Message {
            content: vec![Block::ToolResult {
                content: vec![Block::text("18 C")],
                is_error: false,
                tool_use_id: id.to_owned(),
            }],
            role: Role::User,
        };

        assert!(id.starts_with(GENERATED));
        assert_eq!(
            parts(&response.message(), &names),
            vec![json!({ "functionCall": { "args": { "city": "Paris" }, "name": "weather" } })]
        );
        assert_eq!(
            parts(&result, &names),
            vec![
                json!({ "functionResponse": { "name": "weather", "response": { "result": "18 C" } } })
            ]
        );
    }

    #[tokio::test]
    async fn a_blocked_prompt_is_a_refusal_and_a_cut_stream_is_an_error() {
        let blocked = "data: {\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}\n\n";
        let response = provider(&Arc::new(Canned::new(blocked, usize::MAX)))
            .complete(&Request::default())
            .await
            .unwrap();
        assert_eq!(response.stop, Stop::Refusal);

        let cut = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Par\"}]}}]}\n\n";
        let error = provider(&Arc::new(Canned::new(cut, usize::MAX)))
            .complete(&Request::default())
            .await
            .unwrap_err();
        assert!(matches!(error, Error::Provider(_)), "{error}");
    }

    #[tokio::test]
    async fn a_rejected_request_gives_the_status_the_message_and_whether_to_retry() {
        let limited = Arc::new(Canned::status(
            429,
            r#"{"error":{"code":429,"message":"Resource has been exhausted (e.g. check quota).","status":"RESOURCE_EXHAUSTED"}}"#,
        ));
        let error = provider(&limited)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 429, message, .. } if message == "Resource has been exhausted (e.g. check quota)."),
            "{error}"
        );
        assert!(error.is_retryable());

        let refused = Arc::new(Canned::status(
            400,
            r#"{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}"#,
        ));
        let error = provider(&refused)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 400, message, .. } if message == "API key not valid. Please pass a valid API key."),
            "{error}"
        );
        assert!(
            !error.is_retryable(),
            "a request rejected as written fails again unchanged"
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

        let format = &transport.body()["generationConfig"]["responseFormat"]["text"];
        assert_eq!(format["mimeType"], "APPLICATION_JSON");
        assert_eq!(format["schema"]["required"], json!(["city"]));
    }

    /// A reply from `:batchEmbedContents` with `gemini-embedding-001`, cut to
    /// three values.
    const EMBEDDED: &str = r#"{
  "embeddings": [
    { "values": [-0.022374554, -0.004560777, 0.013309286] },
    { "values": [0.0018738473, 0.0145103, -0.06309785] }
  ]
}"#;

    #[tokio::test]
    async fn each_text_is_sent_with_its_task_and_comes_back_in_order() {
        let transport = Arc::new(Canned::new(EMBEDDED, 5));
        let embedder = Embeddings::new("AIza-test", "gemini-embedding-001", transport.clone())
            .output_dimensions(3);

        let vectors = embedder
            .embed(&["who owns the notes?", "and the suite?"], Purpose::Query)
            .await
            .unwrap();

        let post = transport.last();
        assert_eq!(
            post.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents"
        );
        assert!(post
            .headers
            .contains(&("x-goog-api-key".into(), "AIza-test".into())));
        assert_eq!(
            transport.body()["requests"][1],
            json!({
                "content": { "parts": [{ "text": "and the suite?" }] },
                "model": "models/gemini-embedding-001",
                "outputDimensionality": 3,
                "taskType": "RETRIEVAL_QUERY",
            })
        );
        assert_eq!(
            vectors[1].values,
            [0.001_873_847_3, 0.014_510_3, -0.063_097_85]
        );
        assert_eq!(vectors[0].model, "gemini/gemini-embedding-001@3");

        // The canned reply holds two vectors, so one text is refused, and its
        // request still shows the task.
        let one = embedder
            .embed(&["Dana owns the notes"], Purpose::Document)
            .await;
        assert!(matches!(one, Err(Error::InvalidOutput(_))), "{one:?}");
        assert_eq!(
            transport.body()["requests"][0]["taskType"],
            "RETRIEVAL_DOCUMENT"
        );
    }

    #[tokio::test]
    async fn an_embedding_request_refused_gives_the_status_and_the_message() {
        let refused = Arc::new(Canned::status(
            400,
            r#"{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}"#,
        ));

        let error = Embeddings::new("AIza-test", "gemini-embedding-001", refused)
            .embed(&["a"], Purpose::Document)
            .await
            .unwrap_err();

        assert!(
            matches!(&error, Error::Status { status: 400, message, .. } if message.starts_with("API key not valid")),
            "{error}"
        );
    }
}
