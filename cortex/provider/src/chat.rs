//! OpenAI Chat Completions, `POST /v1/chat/completions`, and the servers that
//! copy it: vLLM, llama.cpp, LM Studio, OpenRouter, and xAI.
//!
//! **OpenAI's own newest models call tools only through Responses.** Its
//! reasoning guide says Chat Completions does not support function calling with
//! GPT-6 Astra or GPT-6.1 Sol, so this client is for everything else that
//! speaks this format, and [`crate::responses`] is for OpenAI.
//!
//! **Reasoning is not part of the format, and servers add it two ways.**
//! vLLM, llama.cpp and DeepSeek stream it as `reasoning_content`, and
//! OpenRouter as `reasoning`, so the decoder reads both. Sending it back is
//! off by default, because some servers reject a request with a field they
//! do not define.

use std::{collections::BTreeMap, sync::Arc};

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::http::{self, Decode, Post, Transport};
use fusion_cortex_core::provider::{
    Api, Block, Delta, Event, Events, Message, Provider, Request, Role, Stop, Usage,
};
use fusion_cortex_core::{Error, Result};

/// A client for one model behind a Chat Completions endpoint.
///
/// ```
/// # use std::sync::Arc;
/// # use fusion_cortex_core::provider::Provider;
/// # use fusion_cortex_provider::{chat::Chat, http::Reqwest};
/// let transport = Arc::new(Reqwest::new().unwrap());
/// let provider = Chat::new("http://localhost:8000/v1", "qwen3-coder", transport)
///     .named("vllm/qwen3-coder")
///     .local(true);
///
/// assert_eq!(provider.id(), "vllm/qwen3-coder");
/// assert!(provider.is_local());
/// ```
pub struct Chat {
    base: String,
    id: String,
    key: Option<String>,
    local: bool,
    max_tokens_field: String,
    model: String,
    send_reasoning: bool,
    transport: Arc<dyn Transport>,
}

impl std::fmt::Debug for Chat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Chat")
            .field("base", &self.base)
            .field("id", &self.id)
            .field("local", &self.local)
            .field("model", &self.model)
            .finish_non_exhaustive()
    }
}

impl Chat {
    /// `base` is the URL up to and including the version, such as
    /// `https://openrouter.ai/api/v1`, and requests go to its
    /// `/chat/completions`.
    #[must_use]
    pub fn new(
        base: impl Into<String>,
        model: impl Into<String>,
        transport: Arc<dyn Transport>,
    ) -> Self {
        let model = model.into();
        Self {
            base: crate::trimmed(base),
            id: format!("chat/{model}"),
            key: None,
            local: false,
            max_tokens_field: "max_completion_tokens".into(),
            model,
            send_reasoning: false,
            transport,
        }
    }

    /// The identifier recorded in provenance. Defaults to `chat/<model>`.
    #[must_use]
    pub fn named(mut self, id: impl Into<String>) -> Self {
        self.id = id.into();
        self
    }

    /// Sent as a bearer token. A local server usually takes none.
    #[must_use]
    pub fn key(mut self, key: impl Into<String>) -> Self {
        self.key = Some(key.into());
        self
    }

    /// Whether the server runs on the user's own hardware. Nothing in the URL
    /// can say: a server on localhost may be a gateway to a hosted model.
    #[must_use]
    pub fn local(mut self, local: bool) -> Self {
        self.local = local;
        self
    }

    /// The field the output cap goes in. OpenAI deprecated `max_tokens` for
    /// `max_completion_tokens`, which some servers do not read yet.
    #[must_use]
    pub fn max_tokens_field(mut self, field: impl Into<String>) -> Self {
        self.max_tokens_field = field.into();
        self
    }

    /// Sends reasoning back as `reasoning_content`, which DeepSeek requires
    /// on a turn that called a tool while thinking.
    #[must_use]
    pub fn send_reasoning(mut self, send: bool) -> Self {
        self.send_reasoning = send;
        self
    }

    fn body(&self, request: &Request) -> Value {
        let mut messages = Vec::new();
        for message in &request.messages {
            self.translate(message, &mut messages);
        }
        let mut body = json!({
            "messages": messages,
            "model": self.model,
            "stream": true,
            "stream_options": { "include_usage": true },
        });
        if let Some(max_tokens) = request.max_tokens {
            body[&self.max_tokens_field] = json!(max_tokens);
        }
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
        if let Some(effort) = request.effort {
            body["reasoning_effort"] = json!(effort.name());
        }
        body
    }

    /// One message can become several: each tool result is a message of its
    /// own, and must follow the assistant turn that called it.
    fn translate(&self, message: &Message, out: &mut Vec<Value>) {
        match message.role {
            Role::Assistant => {
                let mut assistant = json!({ "role": "assistant" });
                let text = crate::paragraphs(&message.content);
                assistant["content"] = if text.is_empty() {
                    Value::Null
                } else {
                    json!(text)
                };
                let calls: Vec<Value> = message
                    .content
                    .iter()
                    .filter_map(|block| match block {
                        Block::ToolUse { id, input, name } => Some(json!({
                            "function": { "arguments": input.to_string(), "name": name },
                            "id": id,
                            "type": "function",
                        })),
                        _ => None,
                    })
                    .collect();
                if !calls.is_empty() {
                    assistant["tool_calls"] = json!(calls);
                }
                let reasoning: String = message
                    .content
                    .iter()
                    .filter_map(|block| match block {
                        Block::Thinking {
                            api: Api::Chat,
                            text,
                            ..
                        } => Some(text.as_str()),
                        _ => None,
                    })
                    .collect();
                if self.send_reasoning && !reasoning.is_empty() {
                    assistant["reasoning_content"] = json!(reasoning);
                }
                out.push(assistant);
            }
            Role::System => out
                .push(json!({ "content": crate::paragraphs(&message.content), "role": "system" })),
            Role::User => {
                let mut parts = Vec::new();
                for block in &message.content {
                    match block {
                        Block::ToolResult {
                            content,
                            tool_use_id,
                            ..
                        } => {
                            out.push(json!({
                                "content": crate::paragraphs(content),
                                "role": "tool",
                                "tool_call_id": tool_use_id,
                            }));
                            // A tool message holds text only, so the images a
                            // tool returned follow in the user turn.
                            parts.extend(
                                content
                                    .iter()
                                    .filter(|block| matches!(block, Block::Image { .. }))
                                    .filter_map(part),
                            );
                        }
                        other => parts.extend(part(other)),
                    }
                }
                let only_text = parts.iter().all(|part| part["type"] == "text");
                match parts.as_slice() {
                    [] => {}
                    _ if only_text => out.push(json!({
                        "content": crate::paragraphs(&message.content),
                        "role": "user",
                    })),
                    _ => out.push(json!({ "content": parts, "role": "user" })),
                }
            }
        }
    }
}

fn part(block: &Block) -> Option<Value> {
    match block {
        Block::Image { data, media_type } => Some(json!({
            "image_url": { "url": format!("data:{media_type};base64,{data}") },
            "type": "image_url",
        })),
        Block::Text { text } => Some(json!({ "text": text, "type": "text" })),
        _ => None,
    }
}

#[async_trait]
impl Provider for Chat {
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
            url: format!("{}/chat/completions", self.base),
        };
        let body = self.transport.post(post).await?;
        Ok(http::decode(http::sse(body), Decoder::default()))
    }
}

#[derive(Deserialize)]
struct Chunk {
    #[serde(default)]
    choices: Vec<Choice>,
    #[serde(default)]
    error: Option<Value>,
    id: Option<String>,
    model: Option<String>,
    usage: Option<WireUsage>,
}

#[derive(Deserialize)]
struct Choice {
    #[serde(default)]
    delta: ChunkDelta,
    finish_reason: Option<String>,
}

#[derive(Default, Deserialize)]
struct ChunkDelta {
    content: Option<String>,
    reasoning: Option<String>,
    reasoning_content: Option<String>,
    refusal: Option<String>,
    #[serde(default)]
    tool_calls: Vec<CallDelta>,
}

#[derive(Deserialize)]
struct CallDelta {
    #[serde(default)]
    function: FunctionDelta,
    id: Option<String>,
    index: usize,
}

#[derive(Default, Deserialize)]
struct FunctionDelta {
    arguments: Option<String>,
    name: Option<String>,
}

#[derive(Deserialize)]
struct WireUsage {
    completion_tokens: Option<u32>,
    completion_tokens_details: Option<CompletionDetails>,
    prompt_tokens: Option<u32>,
    prompt_tokens_details: Option<PromptDetails>,
    total_tokens: Option<u32>,
}

#[derive(Deserialize)]
struct CompletionDetails {
    reasoning_tokens: Option<u32>,
}

#[derive(Deserialize)]
struct PromptDetails {
    cache_write_tokens: Option<u32>,
    cached_tokens: Option<u32>,
}

#[derive(Default)]
struct Decoder {
    /// Each tool call's index in the stream to its event index.
    calls: BTreeMap<usize, usize>,
    finish: Option<String>,
    id: Option<String>,
    model: String,
    opened: usize,
    refused: bool,
    stopped: bool,
    text: Option<usize>,
    thinking: Option<usize>,
    usage: Usage,
}

impl Decoder {
    fn open(&mut self, block: Block, events: &mut Vec<Event>) -> usize {
        let index = self.opened;
        self.opened += 1;
        events.push(Event::Start { block, index });
        index
    }

    fn text(&mut self, text: String, events: &mut Vec<Event>) {
        if text.is_empty() {
            return;
        }
        let index = if let Some(index) = self.text {
            index
        } else {
            let index = self.open(Block::text(""), events);
            self.text = Some(index);
            index
        };
        events.push(Event::Delta {
            delta: Delta::Text(text),
            index,
        });
    }

    fn stop(&mut self) -> Event {
        self.stopped = true;
        let stop = match self.finish.as_deref() {
            _ if self.refused => Stop::Refusal,
            Some("stop") | None => Stop::EndTurn,
            Some("length") => Stop::MaxTokens,
            Some("content_filter") => Stop::Refusal,
            Some("tool_calls" | "function_call") => Stop::ToolUse,
            Some(other) => Stop::Other(other.to_owned()),
        };
        Event::Stop {
            id: self.id.clone(),
            model: self.model.clone(),
            stop,
            usage: self.usage,
        }
    }
}

/// The status a mid-stream error carries, where it carries a number.
fn failure(error: &Value) -> Error {
    let message = error["message"]
        .as_str()
        .map_or_else(|| error.to_string(), str::to_owned);
    let status = error["code"]
        .as_u64()
        .and_then(|code| u16::try_from(code).ok())
        .unwrap_or(500);
    Error::Status {
        message,
        retry_after: None,
        status,
    }
}

impl Decode for Decoder {
    type Frame = http::Sse;

    fn frame(&mut self, frame: http::Sse) -> Result<Vec<Event>> {
        if frame.data.trim() == "[DONE]" {
            return Ok(if self.stopped {
                vec![]
            } else {
                vec![self.stop()]
            });
        }
        let chunk: Chunk = http::parse("Chat Completions", &frame.data)?;
        if let Some(error) = &chunk.error {
            return Err(failure(error));
        }
        if let Some(id) = chunk.id {
            self.id.get_or_insert(id);
        }
        if let Some(model) = chunk.model {
            self.model = model;
        }
        if let Some(usage) = chunk.usage {
            let prompt = usage.prompt_tokens_details;
            let input = usage.prompt_tokens.unwrap_or(0);
            self.usage = Usage {
                cache_read: prompt.as_ref().and_then(|p| p.cached_tokens).unwrap_or(0),
                cache_write: prompt.and_then(|p| p.cache_write_tokens).unwrap_or(0),
                input,
                output: crate::output_with_reasoning(
                    input,
                    usage.completion_tokens.unwrap_or(0),
                    usage.total_tokens,
                ),
                reasoning: usage
                    .completion_tokens_details
                    .and_then(|details| details.reasoning_tokens)
                    .unwrap_or(0),
            };
        }

        let mut events = Vec::new();
        for choice in chunk.choices {
            let delta = choice.delta;
            if let Some(reasoning) = delta.reasoning_content.or(delta.reasoning) {
                if !reasoning.is_empty() {
                    let index = if let Some(index) = self.thinking {
                        index
                    } else {
                        let block = Block::Thinking {
                            api: Api::Chat,
                            signature: None,
                            text: String::new(),
                        };
                        let index = self.open(block, &mut events);
                        self.thinking = Some(index);
                        index
                    };
                    events.push(Event::Delta {
                        delta: Delta::Thinking(reasoning),
                        index,
                    });
                }
            }
            if let Some(text) = delta.content {
                self.text(text, &mut events);
            }
            if let Some(refusal) = delta.refusal {
                self.refused = true;
                self.text(refusal, &mut events);
            }
            for call in delta.tool_calls {
                let index = if let Some(&index) = self.calls.get(&call.index) {
                    index
                } else {
                    // A server that leaves out the id gets one, so the
                    // result has something to name.
                    let block = Block::ToolUse {
                        id: call.id.unwrap_or_else(|| format!("call_{}", call.index)),
                        input: Value::Null,
                        name: call.function.name.unwrap_or_default(),
                    };
                    let index = self.open(block, &mut events);
                    self.calls.insert(call.index, index);
                    index
                };
                if let Some(arguments) = call.function.arguments.filter(|a| !a.is_empty()) {
                    events.push(Event::Delta {
                        delta: Delta::Input(arguments),
                        index,
                    });
                }
            }
            if choice.finish_reason.is_some() {
                self.finish = choice.finish_reason;
            }
        }
        Ok(events)
    }

    /// A server that closes the stream after the finish reason without
    /// `[DONE]` still finished.
    fn finish(&mut self) -> Result<Vec<Event>> {
        Ok(if self.stopped || self.finish.is_none() {
            vec![]
        } else {
            vec![self.stop()]
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::canned::Canned;
    use fusion_cortex_core::provider::{Effort, Tool};

    const STREAM: &str = r#"data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"Two "},"finish_reason":null}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"reasoning_content":"cities."},"finish_reason":null}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"content":"Checking."},"finish_reason":null}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_a","type":"function","function":{"name":"weather","arguments":""}}]},"finish_reason":null}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"city\":"}}]},"finish_reason":null}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"tool_calls":[{"index":1,"id":"call_b","type":"function","function":{"name":"weather","arguments":"{\"city\":\"Tokyo\"}"}}]},"finish_reason":null}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"Paris\"}"}}]},"finish_reason":"tool_calls"}],"usage":null}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","model":"qwen3-coder","choices":[],"usage":{"prompt_tokens":900,"completion_tokens":40,"total_tokens":940,"prompt_tokens_details":{"cached_tokens":800},"completion_tokens_details":{"reasoning_tokens":12}}}

data: [DONE]

"#;

    fn provider(transport: &Arc<Canned>) -> Chat {
        Chat::new(
            "http://localhost:8000/v1/",
            "qwen3-coder",
            transport.clone(),
        )
    }

    #[tokio::test]
    async fn interleaved_tool_call_fragments_join_by_their_index() {
        let transport = Arc::new(Canned::new(STREAM, 11));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.stop, Stop::ToolUse);
        assert_eq!(response.model, "qwen3-coder");
        assert_eq!(
            response.content[0],
            Block::Thinking {
                api: Api::Chat,
                signature: None,
                text: "Two cities.".into(),
            }
        );
        assert_eq!(response.joined(), "Checking.");
        let calls: Vec<_> = response.tool_uses().collect();
        assert_eq!(calls[0], ("call_a", "weather", &json!({ "city": "Paris" })));
        assert_eq!(calls[1], ("call_b", "weather", &json!({ "city": "Tokyo" })));
        assert_eq!(
            response.usage,
            Usage {
                cache_read: 800,
                cache_write: 0,
                input: 900,
                output: 40,
                reasoning: 12,
            }
        );
    }

    #[tokio::test]
    async fn xai_reasoning_is_counted_in_the_output() {
        // The usage xAI's documentation gives, where output excludes reasoning
        // and the total includes it.
        let stream = "data: {\"id\":\"1\",\"model\":\"grok\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"4\"},\"finish_reason\":\"stop\"}]}\n\ndata: {\"id\":\"1\",\"model\":\"grok\",\"choices\":[],\"usage\":{\"prompt_tokens\":32,\"completion_tokens\":9,\"total_tokens\":151,\"prompt_tokens_details\":{\"cached_tokens\":8},\"completion_tokens_details\":{\"reasoning_tokens\":110}}}\n\ndata: [DONE]\n\n";
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
    async fn tool_results_become_tool_messages_after_the_call() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            effort: Some(Effort::Low),
            max_tokens: Some(256),
            messages: vec![
                Message::text(Role::System, "Answer briefly."),
                Message::text(Role::User, "Weather in Paris?"),
                Message {
                    content: vec![
                        Block::Thinking {
                            api: Api::Chat,
                            signature: None,
                            text: "One call.".into(),
                        },
                        Block::ToolUse {
                            id: "call_a".into(),
                            input: json!({ "city": "Paris" }),
                            name: "weather".into(),
                        },
                    ],
                    role: Role::Assistant,
                },
                Message {
                    content: vec![
                        Block::ToolResult {
                            content: vec![
                                Block::text("18 C"),
                                Block::Image {
                                    data: "iVBOR".into(),
                                    media_type: "image/png".into(),
                                },
                            ],
                            is_error: false,
                            tool_use_id: "call_a".into(),
                        },
                        Block::text("And tomorrow?"),
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

        provider(&transport).complete(&request).await.unwrap();

        let post = transport.last();
        assert_eq!(post.url, "http://localhost:8000/v1/chat/completions");
        assert!(post.headers.is_empty(), "a local server takes no key");
        assert_eq!(
            transport.body(),
            json!({
                "max_completion_tokens": 256,
                "messages": [
                    { "content": "Answer briefly.", "role": "system" },
                    { "content": "Weather in Paris?", "role": "user" },
                    {
                        "content": null,
                        "role": "assistant",
                        "tool_calls": [{
                            "function": { "arguments": "{\"city\":\"Paris\"}", "name": "weather" },
                            "id": "call_a",
                            "type": "function",
                        }],
                    },
                    { "content": "18 C", "role": "tool", "tool_call_id": "call_a" },
                    {
                        "content": [
                            { "image_url": { "url": "data:image/png;base64,iVBOR" }, "type": "image_url" },
                            { "text": "And tomorrow?", "type": "text" },
                        ],
                        "role": "user",
                    },
                ],
                "model": "qwen3-coder",
                "reasoning_effort": "low",
                "stream": true,
                "stream_options": { "include_usage": true },
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
    async fn an_empty_text_block_adds_no_blank_line() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            messages: vec![
                Message {
                    content: vec![Block::text("fix it"), Block::text("")],
                    role: Role::User,
                },
                // A Gemini turn whose signature came on a final empty part.
                Message {
                    content: vec![
                        Block::text("Done."),
                        Block::Thinking {
                            api: Api::Gemini,
                            signature: Some("c2ln".into()),
                            text: String::new(),
                        },
                        Block::text(""),
                    ],
                    role: Role::Assistant,
                },
            ],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();

        let messages = &transport.body()["messages"];
        assert_eq!(messages[0]["content"], "fix it");
        assert_eq!(messages[1]["content"], "Done.");
    }

    #[tokio::test]
    async fn reasoning_goes_back_only_when_asked_for() {
        let transport = Arc::new(Canned::new(STREAM, usize::MAX));
        let request = Request {
            messages: vec![Message {
                content: vec![
                    Block::Thinking {
                        api: Api::Chat,
                        signature: None,
                        text: "One call.".into(),
                    },
                    Block::Thinking {
                        api: Api::Anthropic,
                        signature: Some("RXVz".into()),
                        text: "Not this one.".into(),
                    },
                    Block::text("Done."),
                ],
                role: Role::Assistant,
            }],
            ..Request::default()
        };

        provider(&transport).complete(&request).await.unwrap();
        assert!(transport.body()["messages"][0]
            .get("reasoning_content")
            .is_none());

        provider(&transport)
            .send_reasoning(true)
            .key("sk-or")
            .complete(&request)
            .await
            .unwrap();
        assert_eq!(
            transport.body()["messages"][0]["reasoning_content"],
            "One call."
        );
        assert!(transport
            .last()
            .headers
            .contains(&("authorization".into(), "Bearer sk-or".into())));
    }

    #[tokio::test]
    async fn a_stream_closed_after_the_finish_reason_without_done_still_finished() {
        let stream = "data: {\"id\":\"1\",\"model\":\"m\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"Hi\"},\"finish_reason\":\"length\"}]}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.stop, Stop::MaxTokens);
        assert_eq!(response.joined(), "Hi");
    }

    #[tokio::test]
    async fn an_error_mid_stream_keeps_its_code() {
        let stream = "data: {\"id\":\"1\",\"model\":\"m\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"Hi\"}}]}\n\ndata: {\"error\":{\"code\":502,\"message\":\"upstream failed\"}}\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let error = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap_err();

        assert!(
            matches!(&error, Error::Status { status: 502, message, .. } if message == "upstream failed"),
            "{error}"
        );
        assert!(error.is_retryable());
    }

    #[tokio::test]
    async fn a_refusal_is_text_and_a_refusal_stop() {
        let stream = "data: {\"id\":\"1\",\"model\":\"m\",\"choices\":[{\"index\":0,\"delta\":{\"refusal\":\"I cannot help with that.\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n";
        let transport = Arc::new(Canned::new(stream, usize::MAX));

        let response = provider(&transport)
            .complete(&Request::default())
            .await
            .unwrap();

        assert_eq!(response.stop, Stop::Refusal);
        assert_eq!(response.joined(), "I cannot help with that.");
    }

    #[tokio::test]
    async fn a_rejected_request_gives_the_status_the_message_and_whether_to_retry() {
        let limited = Arc::new(Canned::status(
            429,
            r#"{"error":{"message":"Rate limit reached for requests","type":"requests","code":"rate_limit_exceeded"}}"#,
        ));
        let error = provider(&limited)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 429, message, .. } if message == "Rate limit reached for requests"),
            "{error}"
        );
        assert!(error.is_retryable());

        let refused = Arc::new(Canned::status(
            400,
            r#"{"error":{"message":"Unsupported parameter: 'max_tokens'","type":"invalid_request_error","code":"unsupported_parameter"}}"#,
        ));
        let error = provider(&refused)
            .stream(&Request::default())
            .await
            .err()
            .unwrap();
        assert!(
            matches!(&error, Error::Status { status: 400, message, .. } if message == "Unsupported parameter: 'max_tokens'"),
            "{error}"
        );
        assert!(
            !error.is_retryable(),
            "a request rejected as written fails again unchanged"
        );
    }
}
