//! Anthropic Messages, `POST /v1/messages`.
//!
//! The reference shape for the others: [`Block`] is close to this API's own
//! content blocks, so this translation is the shortest.

use std::sync::Arc;

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::http::{self, Decode, Post, Transport};
use fusion_cortex_core::provider::{
    Api, Block, Delta, Event, Events, Message, Provider, Request, Role, Stop, Usage,
};
use fusion_cortex_core::{Error, Result};

/// Prefixes the signature of a `redacted_thinking` block, which has data in
/// place of text and a signature. A real signature is base64 and holds no
/// colon, so the two cannot collide.
const REDACTED: &str = "redacted:";

/// A client for one model behind the Messages API.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::provider::Provider;
/// # use fusion_cortex_provider::{anthropic::Anthropic, http::Reqwest};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let provider = Anthropic::new("sk-ant-...", "claude-opus-5-5", transport);
///
/// assert_eq!(provider.id(), "anthropic/claude-opus-5-5");
/// assert!(!provider.is_local());
/// ```
pub struct Anthropic {
    base: String,
    id: String,
    key: String,
    max_tokens: u32,
    model: String,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Anthropic {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Anthropic")
            .field("base", &self.base)
            .field("max_tokens", &self.max_tokens)
            .field("model", &self.model)
            .finish_non_exhaustive()
    }
}

impl Anthropic {
    #[must_use]
    pub fn new(
        key: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self {
            base: "https://api.anthropic.com".into(),
            id: format!("anthropic/{model}"),
            key: key.into(),
            max_tokens: 32_000,
            model,
            transport,
        }
    }

    /// Sends requests to another host that speaks this API, such as a gateway.
    #[must_use]
    pub fn base(mut self, base: impl Into<String>) -> Self {
        self.base = crate::trimmed(base);
        self
    }

    /// The output cap a request that names none takes. The API requires one.
    #[must_use]
    pub fn max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = max_tokens;
        self
    }

    fn body(&self, request: &Request) -> Value {
        let leading = request
            .messages
            .iter()
            .take_while(|message| message.role == Role::System)
            .count();
        let (system, rest) = request.messages.split_at(leading);

        let mut body = json!({
            // Caches the prompt through its last block, so each turn of a
            // session reads the turns before it from the cache.
            "cache_control": { "type": "ephemeral" },
            "max_tokens": request.max_tokens.unwrap_or(self.max_tokens),
            "messages": rest.iter().filter_map(message).collect::<Vec<_>>(),
            "model": self.model,
            "stream": true,
        });
        let system: Vec<Value> = system
            .iter()
            .flat_map(|message| message.content.iter().filter_map(text))
            .collect();
        if !system.is_empty() {
            body["system"] = json!(system);
        }
        if !request.tools.is_empty() {
            body["tools"] = request
                .tools
                .iter()
                .map(|tool| {
                    json!({
                        "description": tool.description,
                        "input_schema": tool.schema,
                        "name": tool.name,
                    })
                })
                .collect();
        }
        if let Some(effort) = request.effort {
            body["output_config"]["effort"] = json!(effort.name());
            body["thinking"] = json!({ "display": "summarized", "type": "adaptive" });
        }
        if let Some(format) = &request.format {
            body["output_config"]["format"] =
                json!({ "schema": decodable(&format.schema), "type": "json_schema" });
        }
        body
    }
}

/// Keywords the API refuses in an output schema. It decodes under the schema,
/// and a bound on a number or a length is not something it decodes to, so the
/// caller's validation holds them instead.
const UNDECODABLE: [&str; 8] = [
    "exclusiveMaximum",
    "exclusiveMinimum",
    "maxItems",
    "maxLength",
    "maximum",
    "minLength",
    "minimum",
    "multipleOf",
];

/// The formats the API decodes. A schema generated from a Rust type names
/// others, such as `uint32`.
const FORMATS: [&str; 10] = [
    "date",
    "date-time",
    "duration",
    "email",
    "hostname",
    "ipv4",
    "ipv6",
    "time",
    "uri",
    "uuid",
];

/// `schema` as the API takes it: every object closed to other properties,
/// which the API requires, and the keywords it cannot decode left out.
///
/// Walked by keyword, so a property named `minimum` keeps its name: only a
/// keyword's own value is a schema, and only a schema loses keywords.
fn decodable(schema: &Value) -> Value {
    let Value::Object(fields) = schema else {
        return schema.clone();
    };
    let mut out = serde_json::Map::new();
    for (key, value) in fields {
        let kept = match key.as_str() {
            "$defs" | "definitions" | "properties" => match value {
                Value::Object(named) => Value::Object(
                    named
                        .iter()
                        .map(|(name, schema)| (name.clone(), decodable(schema)))
                        .collect(),
                ),
                other => other.clone(),
            },
            "allOf" | "anyOf" | "oneOf" | "prefixItems" => match value {
                Value::Array(schemas) => schemas.iter().map(decodable).collect(),
                other => other.clone(),
            },
            "items" | "not" => decodable(value),
            "format" if !value.as_str().is_some_and(|name| FORMATS.contains(&name)) => continue,
            "minItems" if value.as_u64().is_none_or(|count| count > 1) => continue,
            key if UNDECODABLE.contains(&key) => continue,
            _ => value.clone(),
        };
        out.insert(key.clone(), kept);
    }
    let object = out.contains_key("properties")
        || out.get("type").is_some_and(|kind| {
            kind == "object"
                || kind
                    .as_array()
                    .is_some_and(|kinds| kinds.contains(&json!("object")))
        });
    if object {
        out.insert("additionalProperties".into(), json!(false));
    }
    Value::Object(out)
}

/// A text block that has text. The API rejects an empty one, and one of
/// spaces alone, which a Gemini turn or a tool with no output can leave in a
/// message.
fn text(block: &Block) -> Option<Value> {
    match block {
        Block::Text { text } if !text.trim().is_empty() => {
            Some(json!({ "text": text, "type": "text" }))
        }
        _ => None,
    }
}

/// A system message after the first turn stays where it was given, which the
/// API reads as an instruction arriving mid-session.
///
/// A message with no blocks left to send is left out. The API combines turns
/// of one role in a row, so the turns on either side of it stay valid.
fn message(message: &Message) -> Option<Value> {
    let role = match message.role {
        Role::Assistant => "assistant",
        Role::System => "system",
        Role::User => "user",
    };
    let content: Vec<Value> = message.content.iter().filter_map(block).collect();
    if content.is_empty() {
        return None;
    }
    Some(json!({ "content": content, "role": role }))
}

fn block(block: &Block) -> Option<Value> {
    Some(match block {
        Block::Image { data, media_type } => json!({
            "source": { "data": data, "media_type": media_type, "type": "base64" },
            "type": "image",
        }),
        Block::Text { .. } => return text(block),
        Block::Thinking {
            api: Api::Anthropic,
            signature: Some(signature),
            text,
        } => match signature.strip_prefix(REDACTED) {
            Some(data) => json!({ "data": data, "type": "redacted_thinking" }),
            None => json!({ "signature": signature, "thinking": text, "type": "thinking" }),
        },
        // Reasoning another API produced, or one with no signature to verify
        // it by, is not this API's to read.
        Block::Thinking { .. } => return None,
        Block::ToolResult {
            content,
            is_error,
            tool_use_id,
        } => {
            let content: Vec<Value> = content.iter().filter_map(self::block).collect();
            let mut result = json!({ "tool_use_id": tool_use_id, "type": "tool_result" });
            // The field is optional, and a result with no blocks left goes
            // without it.
            if !content.is_empty() {
                result["content"] = json!(content);
            }
            if *is_error {
                result["is_error"] = json!(true);
            }
            result
        }
        Block::ToolUse { id, input, name } => json!({
            "id": id,
            "input": input,
            "name": name,
            "type": "tool_use",
        }),
    })
}

#[async_trait]
impl Provider for Anthropic {
    fn id(&self) -> &str {
        &self.id
    }

    fn is_local(&self) -> bool {
        false
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        let post = Post {
            body: self.body(request).to_string().into_bytes(),
            headers: vec![
                ("anthropic-version".into(), "2023-06-01".into()),
                ("x-api-key".into(), self.key.clone()),
            ],
            url: format!("{}/v1/messages", self.base),
        };
        let body = self.transport.post(post).await?;
        Ok(http::decode(http::sse(body), Decoder::default()))
    }
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum Frame {
    ContentBlockDelta {
        delta: Value,
        index: usize,
    },
    ContentBlockStart {
        content_block: Value,
        index: usize,
    },
    Error {
        error: ApiError,
    },
    MessageDelta {
        #[serde(default)]
        delta: MessageDelta,
        #[serde(default)]
        usage: Option<WireUsage>,
    },
    MessageStart {
        message: MessageStart,
    },
    MessageStop {},
    /// `ping`, `content_block_stop`, and any frame added after this client.
    #[serde(other)]
    Other,
}

#[derive(Deserialize)]
struct ApiError {
    message: String,
    #[serde(rename = "type")]
    kind: String,
}

#[derive(Default, Deserialize)]
struct MessageDelta {
    stop_reason: Option<String>,
}

#[derive(Deserialize)]
struct MessageStart {
    id: String,
    model: String,
    usage: WireUsage,
}

/// Each field is a running total, and a frame may carry any of them.
#[derive(Clone, Copy, Default, Deserialize)]
struct WireUsage {
    #[serde(rename = "cache_read_input_tokens")]
    cache_read: Option<u32>,
    #[serde(rename = "cache_creation_input_tokens")]
    cache_write: Option<u32>,
    #[serde(rename = "input_tokens")]
    input: Option<u32>,
    #[serde(rename = "output_tokens")]
    output: Option<u32>,
}

#[derive(Default)]
struct Decoder {
    id: Option<String>,
    /// This API's block index to the event index. Blocks this client does not
    /// translate, such as a server tool's, take none, and neither do their
    /// deltas.
    indexes: Vec<Option<usize>>,
    model: String,
    opened: usize,
    stop: Option<Stop>,
    usage: WireUsage,
}

impl Decoder {
    fn total(&mut self, usage: WireUsage) {
        self.usage = WireUsage {
            cache_read: usage.cache_read.or(self.usage.cache_read),
            cache_write: usage.cache_write.or(self.usage.cache_write),
            input: usage.input.or(self.usage.input),
            output: usage.output.or(self.usage.output),
        };
    }

    /// The API counts cached input apart from `input_tokens`, and [`Usage`]
    /// counts it inside.
    fn usage(&self) -> Usage {
        let cache_read = self.usage.cache_read.unwrap_or(0);
        let cache_write = self.usage.cache_write.unwrap_or(0);
        Usage {
            cache_read,
            cache_write,
            input: self
                .usage
                .input
                .unwrap_or(0)
                .saturating_add(cache_read)
                .saturating_add(cache_write),
            output: self.usage.output.unwrap_or(0),
            reasoning: 0,
        }
    }
}

fn status_of(kind: &str) -> u16 {
    match kind {
        "authentication_error" => 401,
        "billing_error" => 402,
        "permission_error" => 403,
        "not_found_error" => 404,
        "request_too_large" => 413,
        "rate_limit_error" => 429,
        "overloaded_error" => 529,
        "invalid_request_error" => 400,
        _ => 500,
    }
}

fn stop_of(reason: &str) -> Stop {
    match reason {
        "end_turn" => Stop::EndTurn,
        "max_tokens" => Stop::MaxTokens,
        "pause_turn" => Stop::Pause,
        "refusal" => Stop::Refusal,
        "stop_sequence" => Stop::StopSequence,
        "tool_use" => Stop::ToolUse,
        other => Stop::Other(other.to_owned()),
    }
}

fn opened(block: &Value) -> Option<Block> {
    let string = |key: &str| block[key].as_str().unwrap_or_default().to_owned();
    match block["type"].as_str()? {
        "redacted_thinking" => Some(Block::Thinking {
            api: Api::Anthropic,
            signature: Some(format!("{REDACTED}{}", string("data"))),
            text: String::new(),
        }),
        "text" => Some(Block::text(string("text"))),
        "thinking" => Some(Block::Thinking {
            api: Api::Anthropic,
            signature: Some(string("signature")).filter(|signature| !signature.is_empty()),
            text: string("thinking"),
        }),
        // The input arrives in deltas. What the block opens with is an empty
        // object standing in for it.
        "tool_use" => Some(Block::ToolUse {
            id: string("id"),
            input: Value::Null,
            name: string("name"),
        }),
        _ => None,
    }
}

fn delta_of(delta: &Value) -> Option<Delta> {
    let string = |key: &str| delta[key].as_str().unwrap_or_default().to_owned();
    match delta["type"].as_str()? {
        "input_json_delta" => Some(Delta::Input(string("partial_json"))),
        "signature_delta" => Some(Delta::Signature(string("signature"))),
        "text_delta" => Some(Delta::Text(string("text"))),
        "thinking_delta" => Some(Delta::Thinking(string("thinking"))),
        _ => None,
    }
}

impl Decode for Decoder {
    type Frame = http::Sse;

    fn frame(&mut self, frame: http::Sse) -> Result<Vec<Event>> {
        let frame: Frame = http::parse("Anthropic", &frame.data)?;
        Ok(match frame {
            Frame::MessageStart { message } => {
                self.id = Some(message.id);
                self.model = message.model;
                self.total(message.usage);
                vec![]
            }
            Frame::ContentBlockStart {
                content_block,
                index,
            } => {
                if self.indexes.len() <= index {
                    self.indexes.resize(index + 1, None);
                }
                let Some(block) = opened(&content_block) else {
                    return Ok(vec![]);
                };
                let mapped = self.opened;
                self.opened += 1;
                self.indexes[index] = Some(mapped);
                vec![Event::Start {
                    block,
                    index: mapped,
                }]
            }
            Frame::ContentBlockDelta { delta, index } => {
                let mapped = self.indexes.get(index).copied().flatten();
                match (mapped, delta_of(&delta)) {
                    (Some(index), Some(delta)) => vec![Event::Delta { delta, index }],
                    _ => vec![],
                }
            }
            Frame::MessageDelta { delta, usage } => {
                if let Some(reason) = delta.stop_reason {
                    self.stop = Some(stop_of(&reason));
                }
                if let Some(usage) = usage {
                    self.total(usage);
                }
                vec![]
            }
            Frame::MessageStop {} => vec![Event::Stop {
                id: self.id.clone(),
                model: self.model.clone(),
                stop: self.stop.clone().unwrap_or(Stop::EndTurn),
                usage: self.usage(),
            }],
            Frame::Error { error } => {
                return Err(Error::Status {
                    message: error.message,
                    retry_after: None,
                    status: status_of(&error.kind),
                })
            }
            Frame::Other => vec![],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::canned::Canned;
    use fusion_cortex_core::provider::{collect, Effort, Format, Tool};

    const STREAM: &str = r#"event: message_start
data: {"type":"message_start","message":{"id":"msg_01","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"stop_reason":null,"usage":{"input_tokens":12,"cache_creation_input_tokens":300,"cache_read_input_tokens":2000,"output_tokens":1}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Two cities, "}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"two calls."}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"RXVz"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: ping
data: {"type":"ping"}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Checking both."}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: content_block_start
data: {"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"toolu_a","name":"weather","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"{\"city\": \"Pa"}}

event: content_block_delta
data: {"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"ris\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":2}

event: content_block_start
data: {"type":"content_block_start","index":3,"content_block":{"type":"tool_use","id":"toolu_b","name":"weather","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":3,"delta":{"type":"input_json_delta","partial_json":"{\"city\": \"Tokyo\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":3}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":87}}

event: message_stop
data: {"type":"message_stop"}

"#;

    fn provider(transport: &Arc<Canned>) -> Anthropic {
        Anthropic::new("sk-test", "claude-opus-5-5", transport.clone())
    }

    fn weather() -> Tool {
        Tool {
            description: "The weather in a city.".into(),
            name: "weather".into(),
            schema: json!({
                "properties": { "city": { "type": "string" } },
                "required": ["city"],
                "type": "object",
            }),
        }
    }

    #[tokio::test]
    async fn a_streamed_turn_with_thinking_and_parallel_calls_folds_into_one_response() {
        let transport = Arc::new(Canned::new(STREAM, 7));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.id.as_deref(), Some("msg_01"));
        assert_eq!(response.model, "claude-opus-5-5");
        assert_eq!(response.stop, Stop::ToolUse);
        assert_eq!(
            response.content[0],
            Block::Thinking {
                api: Api::Anthropic,
                signature: Some("RXVz".into()),
                text: "Two cities, two calls.".into(),
            }
        );
        assert_eq!(response.joined(), "Checking both.");
        let calls: Vec<_> = response.tool_uses().collect();
        assert_eq!(
            calls[0],
            ("toolu_a", "weather", &json!({ "city": "Paris" }))
        );
        assert_eq!(
            calls[1],
            ("toolu_b", "weather", &json!({ "city": "Tokyo" }))
        );
        assert_eq!(
            response.usage,
            Usage {
                cache_read: 2000,
                cache_write: 300,
                input: 2312,
                output: 87,
                reasoning: 0,
            }
        );
    }

    #[tokio::test]
    async fn a_request_names_the_model_the_key_and_the_version() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));

        provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        let post = transport.last();
        assert_eq!(post.url, "https://api.anthropic.com/v1/messages");
        assert!(post
            .headers
            .contains(&("x-api-key".into(), "sk-test".into())));
        assert!(post
            .headers
            .contains(&("anthropic-version".into(), "2023-06-01".into())));
        let body = transport.body();
        assert_eq!(body["model"], "claude-opus-5-5");
        assert_eq!(body["stream"], true);
        assert_eq!(body["max_tokens"], 32_000);
        assert!(
            body.get("thinking").is_none(),
            "no effort leaves the default"
        );
    }

    /// A conversation with every kind of block, and reasoning from another API.
    fn conversation() -> Request {
        Request {
            effort: Some(Effort::Xhigh),
            format: None,
            max_tokens: Some(4096),
            messages: vec![
                Message::text(Role::System, "Answer briefly."),
                Message {
                    content: vec![
                        Block::text("Weather in Paris?"),
                        Block::Image {
                            data: "iVBOR".into(),
                            media_type: "image/png".into(),
                        },
                    ],
                    role: Role::User,
                },
                Message {
                    content: vec![
                        Block::Thinking {
                            api: Api::Anthropic,
                            signature: Some("RXVz".into()),
                            text: "One call.".into(),
                        },
                        Block::Thinking {
                            api: Api::Anthropic,
                            signature: Some(format!("{REDACTED}ZW5j")),
                            text: String::new(),
                        },
                        Block::Thinking {
                            api: Api::Responses,
                            signature: Some("gAAAA".into()),
                            text: "Another API's.".into(),
                        },
                        Block::ToolUse {
                            id: "toolu_a".into(),
                            input: json!({ "city": "Paris" }),
                            name: "weather".into(),
                        },
                    ],
                    role: Role::Assistant,
                },
                Message {
                    content: vec![Block::ToolResult {
                        content: vec![Block::text("18 C")],
                        is_error: false,
                        tool_use_id: "toolu_a".into(),
                    }],
                    role: Role::User,
                },
                Message::text(Role::System, "Use Celsius."),
            ],
            tools: vec![weather()],
        }
    }

    #[tokio::test]
    async fn a_conversation_translates_block_for_block() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = conversation();

        provider(&transport).complete(&request).await.unwrap();

        assert_eq!(
            transport.body(),
            json!({
                "cache_control": { "type": "ephemeral" },
                "max_tokens": 4096,
                "messages": [
                    {
                        "content": [
                            { "text": "Weather in Paris?", "type": "text" },
                            {
                                "source": { "data": "iVBOR", "media_type": "image/png", "type": "base64" },
                                "type": "image",
                            },
                        ],
                        "role": "user",
                    },
                    {
                        "content": [
                            { "signature": "RXVz", "thinking": "One call.", "type": "thinking" },
                            { "data": "ZW5j", "type": "redacted_thinking" },
                            {
                                "id": "toolu_a",
                                "input": { "city": "Paris" },
                                "name": "weather",
                                "type": "tool_use",
                            },
                        ],
                        "role": "assistant",
                    },
                    {
                        "content": [{
                            "content": [{ "text": "18 C", "type": "text" }],
                            "tool_use_id": "toolu_a",
                            "type": "tool_result",
                        }],
                        "role": "user",
                    },
                    { "content": [{ "text": "Use Celsius.", "type": "text" }], "role": "system" },
                ],
                "model": "claude-opus-5-5",
                "output_config": { "effort": "xhigh" },
                "stream": true,
                "system": [{ "text": "Answer briefly.", "type": "text" }],
                "thinking": { "display": "summarized", "type": "adaptive" },
                "tools": [{
                    "description": "The weather in a city.",
                    "input_schema": {
                        "properties": { "city": { "type": "string" } },
                        "required": ["city"],
                        "type": "object",
                    },
                    "name": "weather",
                }],
            })
        );
    }

    #[tokio::test]
    async fn empty_text_is_left_out_and_an_empty_tool_result_goes_without_content() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            messages: vec![
                Message {
                    content: vec![Block::text(""), Block::text("Answer briefly.")],
                    role: Role::System,
                },
                Message::text(Role::User, "Clear the cache."),
                // A Gemini turn whose signature came on a final empty part.
                Message {
                    content: vec![
                        Block::text("Clearing."),
                        Block::ToolUse {
                            id: "toolu_a".into(),
                            input: json!({}),
                            name: "clear".into(),
                        },
                        Block::Thinking {
                            api: Api::Gemini,
                            signature: Some("c2ln".into()),
                            text: String::new(),
                        },
                        Block::text(""),
                    ],
                    role: Role::Assistant,
                },
                Message {
                    content: vec![Block::ToolResult {
                        content: vec![Block::text("")],
                        is_error: false,
                        tool_use_id: "toolu_a".into(),
                    }],
                    role: Role::User,
                },
            ],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        let body = transport.body();
        assert_eq!(
            body["system"],
            json!([{ "text": "Answer briefly.", "type": "text" }])
        );
        assert_eq!(
            body["messages"],
            json!([
                { "content": [{ "text": "Clear the cache.", "type": "text" }], "role": "user" },
                {
                    "content": [
                        { "text": "Clearing.", "type": "text" },
                        { "id": "toolu_a", "input": {}, "name": "clear", "type": "tool_use" },
                    ],
                    "role": "assistant",
                },
                {
                    "content": [{ "tool_use_id": "toolu_a", "type": "tool_result" }],
                    "role": "user",
                },
            ])
        );
    }

    #[tokio::test]
    async fn a_message_with_nothing_left_to_send_is_left_out() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            messages: vec![
                Message::text(Role::User, "Ready?"),
                Message {
                    content: vec![
                        Block::Thinking {
                            api: Api::Gemini,
                            signature: Some("c2ln".into()),
                            text: String::new(),
                        },
                        Block::text(""),
                    ],
                    role: Role::Assistant,
                },
                Message::text(Role::User, "Go on."),
            ],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        assert_eq!(
            transport.body()["messages"],
            json!([
                { "content": [{ "text": "Ready?", "type": "text" }], "role": "user" },
                { "content": [{ "text": "Go on.", "type": "text" }], "role": "user" },
            ])
        );
    }

    #[tokio::test]
    async fn an_error_mid_stream_keeps_its_status() {
        let stream = "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_01\",\"model\":\"claude-opus-5-5\",\"usage\":{\"input_tokens\":1}}}\n\nevent: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"Overloaded\"}}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let error = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap_err();

        assert!(
            matches!(&error, Error::Status { status: 529, message, .. } if message == "Overloaded"),
            "{error}"
        );
        assert!(error.is_retryable());
    }

    #[tokio::test]
    async fn a_stream_cut_off_before_message_stop_is_an_error() {
        let cut = &STREAM[..STREAM.find("event: message_delta").unwrap()];
        let transport = Arc::new(Canned::new(cut, 64));

        let error = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap_err();

        assert!(matches!(error, Error::Provider(_)), "{error}");
    }

    #[tokio::test]
    async fn a_rejected_request_gives_the_status_and_the_message() {
        let transport = Arc::new(Canned::status(
            401,
            r#"{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}"#,
        ));

        let error = provider(&transport)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();

        assert!(
            matches!(&error, Error::Status { status: 401, message, .. } if message == "invalid x-api-key"),
            "{error}"
        );
        assert!(!error.is_retryable(), "a bad key fails again unchanged");
    }

    #[tokio::test]
    async fn blocks_this_client_does_not_translate_are_skipped_with_their_deltas() {
        let stream = r#"event: message_start
data: {"type":"message_start","message":{"id":"msg_01","model":"claude-opus-5-5","usage":{"input_tokens":1}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{}"}}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":"Done."}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}

event: message_stop
data: {"type":"message_stop"}
"#;
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = collect(
            provider(&transport)
                .stream(&Request::default())
                .await
                .unwrap(),
        )
        .await
        .unwrap();

        assert_eq!(response.content, vec![Block::text("Done.")]);
    }

    #[tokio::test]
    async fn a_format_closes_each_object_and_leaves_out_what_the_api_cannot_decode() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            effort: Some(Effort::Low),
            format: Some(Format {
                name: "reading".into(),
                schema: json!({
                    "properties": {
                        "minimum": { "format": "uint32", "minimum": 0, "type": "integer" },
                        "taken": { "format": "date-time", "type": "string" },
                        "tags": { "items": { "type": "string" }, "maxItems": 3, "type": "array" },
                    },
                    "required": ["minimum"],
                    "type": "object",
                }),
            }),
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        let config = &transport.body()["output_config"];
        assert_eq!(
            config["effort"], "low",
            "the effort stays beside the format"
        );
        assert_eq!(
            config["format"],
            json!({
                "schema": {
                    "additionalProperties": false,
                    "properties": {
                        "minimum": { "type": "integer" },
                        "taken": { "format": "date-time", "type": "string" },
                        "tags": { "items": { "type": "string" }, "type": "array" },
                    },
                    "required": ["minimum"],
                    "type": "object",
                },
                "type": "json_schema",
            }),
            "a property named for a keyword keeps its name"
        );
    }
}
