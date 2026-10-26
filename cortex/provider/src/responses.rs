//! OpenAI Responses, `POST /v1/responses`, which OpenAI, xAI, LM Studio and
//! OpenRouter serve.
//!
//! **Stateless on purpose.** Every request sends the whole conversation with
//! `store: false`, and nothing names a `previous_response_id`. The session
//! lives in Trace, where a replay can read it, and OpenRouter rejects stored
//! responses outright.
//!
//! **Reasoning goes back whole.** OpenAI requires the reasoning items a turn
//! returned to be sent back with that turn's tool outputs. Each one becomes a
//! [`Block::Thinking`] whose signature holds the item's id and encrypted
//! content, as JSON only this client reads.

use std::{collections::HashMap, sync::Arc};

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::http::{self, Decode, Post, Transport};
use fusion_cortex_core::provider::{
    Api, Block, Delta, Event, Events, Message, Provider, Request, Role, Stop, Usage,
};
use fusion_cortex_core::{Error, Result};

/// A client for one model behind a Responses endpoint.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::provider::Provider;
/// # use fusion_cortex_provider::{http::Reqwest, responses::Responses};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let provider = Responses::new("https://api.x.ai/v1", "grok-5", transport)
///     .named("xai/grok-5")
///     .key("xai-...");
///
/// assert_eq!(provider.id(), "xai/grok-5");
/// ```
pub struct Responses {
    base: String,
    id: String,
    key: Option<String>,
    local: bool,
    model: String,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Responses {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Responses")
            .field("base", &self.base)
            .field("id", &self.id)
            .field("local", &self.local)
            .field("model", &self.model)
            .finish_non_exhaustive()
    }
}

/// What a reasoning item's signature holds.
#[derive(Deserialize, serde::Serialize)]
struct Reasoning {
    encrypted_content: Option<String>,
    id: String,
}

impl Responses {
    /// `base` is the URL up to and including the version, such as
    /// `https://api.openai.com/v1`, and requests go to its `/responses`.
    #[must_use]
    pub fn new(
        base: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self {
            base: crate::trimmed(base),
            id: format!("responses/{model}"),
            key: None,
            local: false,
            model,
            transport,
        }
    }

    /// OpenAI itself.
    #[must_use]
    pub fn openai(
        key: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self::new("https://api.openai.com/v1", model.clone(), transport)
            .named(format!("openai/{model}"))
            .key(key)
    }

    /// The identifier recorded in provenance. Defaults to `responses/<model>`.
    #[must_use]
    pub fn named(mut self, id: impl Into<String>) -> Self {
        self.id = id.into();
        self
    }

    /// Sent as a bearer token.
    #[must_use]
    pub fn key(mut self, key: impl Into<String>) -> Self {
        self.key = Some(key.into());
        self
    }

    /// Whether the server runs on the user's own hardware, as LM Studio does.
    #[must_use]
    pub fn local(mut self, local: bool) -> Self {
        self.local = local;
        self
    }

    fn body(&self, request: &Request) -> Value {
        let leading = request
            .messages
            .iter()
            .take_while(|message| message.role == Role::System)
            .count();
        let (system, rest) = request.messages.split_at(leading);

        let mut input = Vec::new();
        for message in rest {
            translate(message, &mut input);
        }
        let mut body = json!({
            "include": ["reasoning.encrypted_content"],
            "input": input,
            "model": self.model,
            "store": false,
            "stream": true,
        });
        if !system.is_empty() {
            let instructions: Vec<String> = system
                .iter()
                .map(|message| crate::paragraphs(&message.content))
                .filter(|text| !text.is_empty())
                .collect();
            body["instructions"] = json!(instructions.join("\n\n"));
        }
        if let Some(max_tokens) = request.max_tokens {
            body["max_output_tokens"] = json!(max_tokens);
        }
        if !request.tools.is_empty() {
            body["tools"] = request
                .tools
                .iter()
                .map(|tool| {
                    json!({
                        "description": tool.description,
                        "name": tool.name,
                        "parameters": tool.schema,
                        // Strict mode requires every property in `required`
                        // and no others allowed, which a schema written for
                        // the other APIs rarely says.
                        "strict": false,
                        "type": "function",
                    })
                })
                .collect();
        }
        if let Some(effort) = request.effort {
            body["reasoning"] = json!({ "effort": effort.name(), "summary": "auto" });
        }
        body
    }
}

fn content(block: &Block) -> Option<Value> {
    match block {
        Block::Image { data, media_type } => Some(json!({
            "image_url": format!("data:{media_type};base64,{data}"),
            "type": "input_image",
        })),
        Block::Text { text } => Some(json!({ "text": text, "type": "input_text" })),
        _ => None,
    }
}

/// Each message becomes the items it holds: text as a message item, and each
/// call, output, and piece of reasoning as an item of its own, in order.
fn translate(message: &Message, out: &mut Vec<Value>) {
    let role = match message.role {
        Role::Assistant => "assistant",
        Role::System => "system",
        Role::User => "user",
    };
    let mut parts: Vec<Value> = Vec::new();
    let flush = |parts: &mut Vec<Value>, out: &mut Vec<Value>| {
        if parts.is_empty() {
            return;
        }
        let content = if message.role == Role::Assistant {
            // An assistant's earlier turn goes back as the text it was, a
            // paragraph to each block.
            json!(parts
                .iter()
                .filter_map(|part| part["text"].as_str())
                .filter(|text| !text.is_empty())
                .collect::<Vec<_>>()
                .join("\n\n"))
        } else {
            json!(std::mem::take(parts))
        };
        parts.clear();
        out.push(json!({ "content": content, "role": role, "type": "message" }));
    };

    for block in &message.content {
        match block {
            Block::Image { .. } | Block::Text { .. } => parts.extend(content(block)),
            Block::Thinking {
                api: Api::Responses,
                signature: Some(signature),
                text,
            } => {
                let Ok(reasoning) = serde_json::from_str::<Reasoning>(signature) else {
                    continue;
                };
                flush(&mut parts, out);
                let summary: Vec<Value> = if text.is_empty() {
                    vec![]
                } else {
                    vec![json!({ "text": text, "type": "summary_text" })]
                };
                let mut item =
                    json!({ "id": reasoning.id, "summary": summary, "type": "reasoning" });
                if let Some(encrypted) = reasoning.encrypted_content {
                    item["encrypted_content"] = json!(encrypted);
                }
                out.push(item);
            }
            Block::Thinking { .. } => {}
            Block::ToolResult {
                content: result,
                tool_use_id,
                ..
            } => {
                flush(&mut parts, out);
                let images = result
                    .iter()
                    .any(|block| matches!(block, Block::Image { .. }));
                let output = if images {
                    json!(result.iter().filter_map(self::content).collect::<Vec<_>>())
                } else {
                    json!(crate::paragraphs(result))
                };
                out.push(json!({
                    "call_id": tool_use_id,
                    "output": output,
                    "type": "function_call_output",
                }));
            }
            Block::ToolUse { id, input, name } => {
                flush(&mut parts, out);
                out.push(json!({
                    "arguments": input.to_string(),
                    "call_id": id,
                    "name": name,
                    "type": "function_call",
                }));
            }
        }
    }
    flush(&mut parts, out);
}

#[async_trait]
impl Provider for Responses {
    fn id(&self) -> &str {
        &self.id
    }

    fn is_local(&self) -> bool {
        self.local
    }

    async fn stream(&self, request: &Request) -> Result<Events> {
        let headers = self
            .key
            .iter()
            .map(|key| ("authorization".to_owned(), format!("Bearer {key}")))
            .collect();
        let post = Post {
            body: self.body(request).to_string().into_bytes(),
            headers,
            url: format!("{}/responses", self.base),
        };
        let body = self.transport.post(post).await?;
        Ok(http::decode(http::sse(body), Decoder::default()))
    }
}

#[derive(Deserialize)]
struct WireUsage {
    input_tokens: Option<u32>,
    input_tokens_details: Option<InputDetails>,
    output_tokens: Option<u32>,
    output_tokens_details: Option<OutputDetails>,
    total_tokens: Option<u32>,
}

#[derive(Deserialize)]
struct InputDetails {
    cache_write_tokens: Option<u32>,
    cached_tokens: Option<u32>,
}

#[derive(Deserialize)]
struct OutputDetails {
    reasoning_tokens: Option<u32>,
}

/// What an item has received, so one whose deltas never came can be filled in
/// from the copy `response.output_item.done` carries.
#[derive(Default)]
struct Item {
    /// The event index of a reasoning item or a call.
    index: Option<usize>,
    received: bool,
    /// The event index of each content part's text, by `content_index`.
    texts: HashMap<u64, usize>,
}

#[derive(Default)]
struct Decoder {
    called: bool,
    id: Option<String>,
    items: HashMap<String, Item>,
    model: String,
    opened: usize,
    refused: bool,
}

impl Decoder {
    fn open(&mut self, block: Block, events: &mut Vec<Event>) -> usize {
        let index = self.opened;
        self.opened += 1;
        events.push(Event::Start { block, index });
        index
    }

    fn text(&mut self, item: &str, part: u64, text: String, events: &mut Vec<Event>) {
        let known = self
            .items
            .get(item)
            .and_then(|entry| entry.texts.get(&part).copied());
        let index = if let Some(index) = known {
            index
        } else {
            let index = self.open(Block::text(""), events);
            self.items
                .entry(item.to_owned())
                .or_default()
                .texts
                .insert(part, index);
            index
        };
        if !text.is_empty() {
            events.push(Event::Delta {
                delta: Delta::Text(text),
                index,
            });
        }
    }

    fn delta(&mut self, item: &str, delta: Delta) -> Vec<Event> {
        let Some(entry) = self.items.get_mut(item) else {
            return vec![];
        };
        entry.received = true;
        entry
            .index
            .map(|index| vec![Event::Delta { delta, index }])
            .unwrap_or_default()
    }

    fn added(&mut self, item: &Value) -> Vec<Event> {
        let mut events = Vec::new();
        let id = item["id"].as_str().unwrap_or_default().to_owned();
        let block = match item["type"].as_str() {
            Some("function_call") => {
                self.called = true;
                Block::ToolUse {
                    id: item["call_id"].as_str().unwrap_or(&id).to_owned(),
                    input: Value::Null,
                    name: item["name"].as_str().unwrap_or_default().to_owned(),
                }
            }
            Some("reasoning") => Block::Thinking {
                api: Api::Responses,
                signature: None,
                text: String::new(),
            },
            _ => {
                self.items.entry(id).or_default();
                return events;
            }
        };
        let index = self.open(block, &mut events);
        self.items.insert(
            id,
            Item {
                index: Some(index),
                ..Item::default()
            },
        );
        events
    }

    fn done(&mut self, item: &Value) -> Vec<Event> {
        let id = item["id"].as_str().unwrap_or_default();
        let (index, received) = self
            .items
            .get(id)
            .map_or((None, false), |entry| (entry.index, entry.received));
        match (item["type"].as_str(), index) {
            (Some("function_call"), Some(index)) if !received => {
                let arguments = item["arguments"].as_str().unwrap_or_default();
                vec![Event::Delta {
                    delta: Delta::Input(arguments.to_owned()),
                    index,
                }]
            }
            // The encrypted content is complete only here, and a summary that
            // never streamed is copied from the finished item.
            (Some("reasoning"), Some(index)) => {
                let mut events = Vec::new();
                if !received {
                    let summary: Vec<&str> = item["summary"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(|part| part["text"].as_str())
                        .collect();
                    if !summary.is_empty() {
                        events.push(Event::Delta {
                            delta: Delta::Thinking(summary.join("\n\n")),
                            index,
                        });
                    }
                }
                let reasoning = Reasoning {
                    encrypted_content: item["encrypted_content"].as_str().map(str::to_owned),
                    id: id.to_owned(),
                };
                events.push(Event::Delta {
                    delta: Delta::Signature(json!(reasoning).to_string()),
                    index,
                });
                events
            }
            (Some("message"), _) => {
                let streamed = self
                    .items
                    .get(id)
                    .is_some_and(|entry| !entry.texts.is_empty());
                let mut events = Vec::new();
                if !streamed {
                    for (part, content) in
                        item["content"].as_array().into_iter().flatten().enumerate()
                    {
                        let text = content["text"]
                            .as_str()
                            .or_else(|| content["refusal"].as_str());
                        if content["type"] == "refusal" {
                            self.refused = true;
                        }
                        if let Some(text) = text {
                            self.text(id, part as u64, text.to_owned(), &mut events);
                        }
                    }
                }
                events
            }
            _ => vec![],
        }
    }

    fn stop(&self, response: &Value, stop: Stop) -> Event {
        let usage: Option<WireUsage> = serde_json::from_value(response["usage"].clone()).ok();
        let usage = usage.map_or_else(Usage::default, |usage| {
            let details = usage.input_tokens_details;
            let input = usage.input_tokens.unwrap_or(0);
            Usage {
                cache_read: details.as_ref().and_then(|d| d.cached_tokens).unwrap_or(0),
                cache_write: details.and_then(|d| d.cache_write_tokens).unwrap_or(0),
                input,
                output: crate::output_with_reasoning(
                    input,
                    usage.output_tokens.unwrap_or(0),
                    usage.total_tokens,
                ),
                reasoning: usage
                    .output_tokens_details
                    .and_then(|details| details.reasoning_tokens)
                    .unwrap_or(0),
            }
        });
        Event::Stop {
            id: self.id.clone(),
            model: response["model"]
                .as_str()
                .map_or_else(|| self.model.clone(), str::to_owned),
            stop,
            usage,
        }
    }
}

fn failure(code: Option<&str>, message: &str) -> Error {
    let status = match code.unwrap_or_default() {
        code if code.contains("rate_limit") || code == "slow_down" => 429,
        code if code.contains("overloaded") || code.contains("unavailable") => 503,
        code if code.contains("invalid") || code.contains("unsupported") => 400,
        _ => 500,
    };
    Error::Status {
        message: message.to_owned(),
        retry_after: None,
        status,
    }
}

impl Decode for Decoder {
    type Frame = http::Sse;

    fn frame(&mut self, frame: http::Sse) -> Result<Vec<Event>> {
        let event: Value = http::parse("Responses", &frame.data)?;
        let string = |key: &str| event[key].as_str().unwrap_or_default().to_owned();
        Ok(match event["type"].as_str().unwrap_or_default() {
            "response.created" | "response.in_progress" => {
                let response = &event["response"];
                if let Some(id) = response["id"].as_str() {
                    self.id = Some(id.to_owned());
                }
                if let Some(model) = response["model"].as_str() {
                    model.clone_into(&mut self.model);
                }
                vec![]
            }
            "response.output_item.added" => self.added(&event["item"]),
            "response.output_item.done" => self.done(&event["item"]),
            "response.output_text.delta" => {
                let mut events = Vec::new();
                let part = event["content_index"].as_u64().unwrap_or(0);
                self.text(&string("item_id"), part, string("delta"), &mut events);
                events
            }
            "response.refusal.delta" => {
                self.refused = true;
                let mut events = Vec::new();
                let part = event["content_index"].as_u64().unwrap_or(0);
                self.text(&string("item_id"), part, string("delta"), &mut events);
                events
            }
            "response.function_call_arguments.delta" => {
                self.delta(&string("item_id"), Delta::Input(string("delta")))
            }
            "response.reasoning_summary_part.added"
                if event["summary_index"].as_u64().unwrap_or(0) > 0 =>
            {
                self.delta(&string("item_id"), Delta::Thinking("\n\n".into()))
            }
            "response.reasoning_summary_text.delta" | "response.reasoning_text.delta" => {
                self.delta(&string("item_id"), Delta::Thinking(string("delta")))
            }
            "response.completed" => {
                let stop = if self.refused {
                    Stop::Refusal
                } else if self.called {
                    Stop::ToolUse
                } else {
                    Stop::EndTurn
                };
                vec![self.stop(&event["response"], stop)]
            }
            "response.incomplete" => {
                let response = &event["response"];
                let stop = match response["incomplete_details"]["reason"].as_str() {
                    Some("max_output_tokens") => Stop::MaxTokens,
                    Some("content_filter") => Stop::Refusal,
                    Some(other) => Stop::Other(other.to_owned()),
                    None => Stop::Other("incomplete".into()),
                };
                vec![self.stop(response, stop)]
            }
            "response.failed" => {
                let error = &event["response"]["error"];
                return Err(failure(
                    error["code"].as_str(),
                    error["message"].as_str().unwrap_or("the response failed"),
                ));
            }
            "error" => {
                return Err(failure(
                    event["code"].as_str(),
                    event["message"].as_str().unwrap_or("the stream failed"),
                ))
            }
            _ => vec![],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::canned::Canned;
    use fusion_cortex_core::provider::{Effort, Tool};

    /// A reasoning item, a message, and two calls, the second sending its
    /// arguments only in the finished item.
    const STREAM: &str = r#"event: response.created
data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_1","model":"gpt-6.1-sol","status":"in_progress"}}

event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":1,"output_index":0,"item":{"type":"reasoning","id":"rs_1","summary":[]}}

event: response.reasoning_summary_text.delta
data: {"type":"response.reasoning_summary_text.delta","sequence_number":2,"item_id":"rs_1","summary_index":0,"delta":"Two cities."}

event: response.reasoning_summary_part.added
data: {"type":"response.reasoning_summary_part.added","sequence_number":3,"item_id":"rs_1","summary_index":1}

event: response.reasoning_summary_text.delta
data: {"type":"response.reasoning_summary_text.delta","sequence_number":4,"item_id":"rs_1","summary_index":1,"delta":"Two calls."}

event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":5,"output_index":0,"item":{"type":"reasoning","id":"rs_1","encrypted_content":"gAAAA","summary":[{"type":"summary_text","text":"Two cities."},{"type":"summary_text","text":"Two calls."}]}}

event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":6,"output_index":1,"item":{"type":"message","id":"msg_1","role":"assistant","content":[]}}

event: response.output_text.delta
data: {"type":"response.output_text.delta","sequence_number":7,"item_id":"msg_1","output_index":1,"content_index":0,"delta":"Checking "}

event: response.output_text.delta
data: {"type":"response.output_text.delta","sequence_number":8,"item_id":"msg_1","output_index":1,"content_index":0,"delta":"both."}

event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":9,"output_index":1,"item":{"type":"message","id":"msg_1","role":"assistant","content":[{"type":"output_text","text":"Checking both."}]}}

event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":10,"output_index":2,"item":{"type":"function_call","id":"fc_1","call_id":"call_a","name":"weather","arguments":""}}

event: response.function_call_arguments.delta
data: {"type":"response.function_call_arguments.delta","sequence_number":11,"item_id":"fc_1","output_index":2,"delta":"{\"city\":"}

event: response.function_call_arguments.delta
data: {"type":"response.function_call_arguments.delta","sequence_number":12,"item_id":"fc_1","output_index":2,"delta":"\"Paris\"}"}

event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":13,"output_index":2,"item":{"type":"function_call","id":"fc_1","call_id":"call_a","name":"weather","arguments":"{\"city\":\"Paris\"}"}}

event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":14,"output_index":3,"item":{"type":"function_call","id":"fc_2","call_id":"call_b","name":"weather","arguments":""}}

event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":15,"output_index":3,"item":{"type":"function_call","id":"fc_2","call_id":"call_b","name":"weather","arguments":"{\"city\":\"Tokyo\"}"}}

event: response.completed
data: {"type":"response.completed","sequence_number":16,"response":{"id":"resp_1","model":"gpt-6.1-sol","status":"completed","usage":{"input_tokens":1200,"input_tokens_details":{"cached_tokens":1024,"cache_write_tokens":0},"output_tokens":300,"output_tokens_details":{"reasoning_tokens":250},"total_tokens":1500}}}

"#;

    fn provider(transport: &Arc<Canned>) -> Responses {
        Responses::openai("sk-test", "gpt-6.1-sol", transport.clone())
    }

    fn signature() -> String {
        json!({ "encrypted_content": "gAAAA", "id": "rs_1" }).to_string()
    }

    #[tokio::test]
    async fn reasoning_text_and_calls_fold_into_one_response() {
        let transport = Arc::new(Canned::new(STREAM, 13));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.id.as_deref(), Some("resp_1"));
        assert_eq!(response.stop, Stop::ToolUse);
        assert_eq!(
            response.content[0],
            Block::Thinking {
                api: Api::Responses,
                signature: Some(signature()),
                text: "Two cities.\n\nTwo calls.".into(),
            }
        );
        assert_eq!(response.joined(), "Checking both.");
        let calls: Vec<_> = response.tool_uses().collect();
        assert_eq!(calls[0], ("call_a", "weather", &json!({ "city": "Paris" })));
        assert_eq!(
            calls[1],
            ("call_b", "weather", &json!({ "city": "Tokyo" })),
            "arguments sent only in the finished item are kept"
        );
        assert_eq!(
            response.usage,
            Usage {
                cache_read: 1024,
                cache_write: 0,
                input: 1200,
                output: 300,
                reasoning: 250,
            }
        );
    }

    #[tokio::test]
    async fn a_turn_goes_back_as_its_items_in_order() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            effort: Some(Effort::High),
            max_tokens: Some(2048),
            messages: vec![
                Message::text(Role::System, "Answer briefly."),
                Message::text(Role::User, "Weather in Paris?"),
                Message {
                    content: vec![
                        Block::Thinking {
                            api: Api::Responses,
                            signature: Some(signature()),
                            text: "One call.".into(),
                        },
                        Block::Thinking {
                            api: Api::Anthropic,
                            signature: Some("RXVz".into()),
                            text: "Another API's.".into(),
                        },
                        Block::text("Checking."),
                        Block::ToolUse {
                            id: "call_a".into(),
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
                        tool_use_id: "call_a".into(),
                    }],
                    role: Role::User,
                },
            ],
            tools: vec![Tool {
                description: "The weather in a city.".into(),
                name: "weather".into(),
                schema: json!({ "type": "object" }),
            }],
        };

        provider(&transport).complete(&request).await.unwrap();

        let post = transport.last();
        assert_eq!(post.url, "https://api.openai.com/v1/responses");
        assert!(post
            .headers
            .contains(&("authorization".into(), "Bearer sk-test".into())));
        assert_eq!(
            transport.body(),
            json!({
                "include": ["reasoning.encrypted_content"],
                "input": [
                    {
                        "content": [{ "text": "Weather in Paris?", "type": "input_text" }],
                        "role": "user",
                        "type": "message",
                    },
                    {
                        "encrypted_content": "gAAAA",
                        "id": "rs_1",
                        "summary": [{ "text": "One call.", "type": "summary_text" }],
                        "type": "reasoning",
                    },
                    { "content": "Checking.", "role": "assistant", "type": "message" },
                    {
                        "arguments": "{\"city\":\"Paris\"}",
                        "call_id": "call_a",
                        "name": "weather",
                        "type": "function_call",
                    },
                    { "call_id": "call_a", "output": "18 C", "type": "function_call_output" },
                ],
                "instructions": "Answer briefly.",
                "max_output_tokens": 2048,
                "model": "gpt-6.1-sol",
                "reasoning": { "effort": "high", "summary": "auto" },
                "store": false,
                "stream": true,
                "tools": [{
                    "description": "The weather in a city.",
                    "name": "weather",
                    "parameters": { "type": "object" },
                    "strict": false,
                    "type": "function",
                }],
            })
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
                    content: vec![
                        Block::text("Checking."),
                        Block::text("One call."),
                        Block::text(""),
                        Block::ToolUse {
                            id: "call_a".into(),
                            input: json!({}),
                            name: "weather".into(),
                        },
                    ],
                    role: Role::Assistant,
                },
                Message {
                    content: vec![Block::ToolResult {
                        content: vec![Block::text("18 C"), Block::text("Output truncated.")],
                        is_error: false,
                        tool_use_id: "call_a".into(),
                    }],
                    role: Role::User,
                },
            ],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        let body = transport.body();
        assert_eq!(
            body["instructions"],
            "Answer briefly.\n\nThe user is in Paris."
        );
        assert_eq!(body["input"][1]["content"], "Checking.\n\nOne call.");
        assert_eq!(body["input"][3]["output"], "18 C\n\nOutput truncated.");
    }

    #[tokio::test]
    async fn xai_reasoning_is_counted_in_the_output() {
        // The usage xAI's documentation gives, where output excludes reasoning
        // and the total includes it.
        let stream = "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"r\",\"model\":\"grok\",\"usage\":{\"input_tokens\":32,\"input_tokens_details\":{\"cached_tokens\":8},\"output_tokens\":9,\"output_tokens_details\":{\"reasoning_tokens\":110},\"total_tokens\":151}}}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(
            response.usage,
            Usage {
                cache_read: 8,
                cache_write: 0,
                input: 32,
                output: 119,
                reasoning: 110,
            }
        );
    }

    #[tokio::test]
    async fn an_answer_cut_off_at_the_cap_stops_at_max_tokens() {
        let stream = r#"data: {"type":"response.created","response":{"id":"resp_2","model":"gpt-6.1-sol"}}

data: {"type":"response.output_text.delta","item_id":"msg_1","content_index":0,"delta":"Once upon"}

data: {"type":"response.incomplete","response":{"id":"resp_2","model":"gpt-6.1-sol","status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"usage":{"input_tokens":20,"output_tokens":16}}}
"#;
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.stop, Stop::MaxTokens);
        assert_eq!(response.joined(), "Once upon");
        assert_eq!(response.usage.output, 16);
    }

    #[tokio::test]
    async fn an_error_event_ends_the_stream_with_its_status() {
        let stream = "data: {\"type\":\"error\",\"code\":\"rate_limit_exceeded\",\"message\":\"Slow down.\",\"sequence_number\":1}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let error = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap_err();

        assert!(
            matches!(&error, Error::Status { status: 429, message, .. } if message == "Slow down."),
            "{error}"
        );
        assert!(error.is_retryable());
    }

    #[tokio::test]
    async fn a_rejected_request_gives_the_status_the_message_and_whether_to_retry() {
        let limited = Arc::new(Canned::status(
            429,
            r#"{"error":{"message":"Rate limit reached for gpt-6.1-sol.","type":"tokens","code":"rate_limit_exceeded"}}"#,
        ));
        let error = provider(&limited)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 429, message, .. } if message == "Rate limit reached for gpt-6.1-sol."),
            "{error}"
        );
        assert!(error.is_retryable());

        let refused = Arc::new(Canned::status(
            401,
            r#"{"error":{"message":"Incorrect API key provided.","type":"invalid_request_error","code":"invalid_api_key"}}"#,
        ));
        let error = provider(&refused)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 401, message, .. } if message == "Incorrect API key provided."),
            "{error}"
        );
        assert!(
            !error.is_retryable(),
            "a request rejected as written fails again unchanged"
        );
    }
}
