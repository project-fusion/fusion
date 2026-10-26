//! The wire under every client: a transport, and the framing a streamed body
//! arrives in.
//!
//! **A client never touches a socket.** It builds a [`Post`] and hands it to a
//! [`Transport`], which is what lets every client's tests run against a canned
//! body, and lets a caller route requests through its own HTTP stack.

use std::pin::Pin;

use async_trait::async_trait;
use futures_util::Stream;

use fusion_cortex_core::Result;

// **The framing compiles only for the clients that read it.** A crate that
// takes no client takes only the transport, and nothing here goes unread.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
use std::collections::VecDeque;

#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
use futures_util::StreamExt;

#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "http",
    feature = "ollama",
    feature = "responses"
))]
use futures_util::stream;

#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
use fusion_cortex_core::provider::{Event, Events};

#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "http",
    feature = "ollama",
    feature = "responses"
))]
use fusion_cortex_core::Error;

/// A body as it arrives, one chunk at a time.
pub type Body = Pin<Box<dyn Stream<Item = Result<Vec<u8>>> + Send>>;

/// A POST with a JSON body.
#[derive(Clone, PartialEq)]
pub struct Post {
    pub body: Vec<u8>,
    pub headers: Vec<(String, String)>,
    pub url: String,
}

/// Headers carry credentials, so a request prints with their values hidden.
impl std::fmt::Debug for Post {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let headers: Vec<&str> = self.headers.iter().map(|(name, _)| name.as_str()).collect();
        f.debug_struct("Post")
            .field("body", &String::from_utf8_lossy(&self.body))
            .field("headers", &headers)
            .field("url", &self.url)
            .finish()
    }
}

/// Sends a request and streams back the response body.
#[async_trait]
pub trait Transport: Send + Sync {
    /// Sends `post`, and returns its body as it arrives.
    ///
    /// # Errors
    ///
    /// [`Error::Status`] when the response status is outside 2xx, with the
    /// message its body gave, and [`Error::Transport`] when the connection fails.
    async fn post(&self, post: Post) -> Result<Body>;
}

/// The message an error body carries.
///
/// Anthropic, OpenAI and Gemini put it at `error.message`, Ollama at `error`,
/// and a proxy in front of any of them may send plain text.
#[cfg(any(feature = "http", test))]
pub(crate) fn message(body: &[u8]) -> String {
    let parsed: Option<serde_json::Value> = serde_json::from_slice(body).ok();
    let found = parsed.as_ref().and_then(|value| {
        value["error"]["message"]
            .as_str()
            .or_else(|| value["error"].as_str())
            .or_else(|| value["message"].as_str())
            .or_else(|| value["detail"].as_str())
            .map(str::to_owned)
    });
    found.unwrap_or_else(|| {
        let text = String::from_utf8_lossy(body);
        let text = text.trim();
        if text.chars().count() > 500 {
            format!("{}…", text.chars().take(500).collect::<String>())
        } else {
            text.to_owned()
        }
    })
}

/// One server-sent event.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Sse {
    pub data: String,
    pub event: Option<String>,
}

/// Splits a body into lines, however its chunks fall.
///
/// A chunk can end inside a line, and inside a character, so bytes wait in a
/// buffer until their line is complete and decode only then.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
fn lines(body: Body) -> impl Stream<Item = Result<String>> + Send {
    struct State {
        body: Body,
        buffer: Vec<u8>,
        done: bool,
        ready: VecDeque<String>,
    }

    fn decode(bytes: &[u8]) -> Result<String> {
        let line = bytes.strip_suffix(b"\r").unwrap_or(bytes);
        String::from_utf8(line.to_vec())
            .map_err(|error| Error::Provider(format!("the stream is not UTF-8: {error}")))
    }

    let state = State {
        body,
        buffer: Vec::new(),
        done: false,
        ready: VecDeque::new(),
    };
    stream::unfold(state, |mut state| async move {
        loop {
            if let Some(line) = state.ready.pop_front() {
                return Some((Ok(line), state));
            }
            if state.done {
                return None;
            }
            match state.body.next().await {
                Some(Ok(chunk)) => {
                    state.buffer.extend_from_slice(&chunk);
                    while let Some(end) = state.buffer.iter().position(|&byte| byte == b'\n') {
                        let rest = state.buffer.split_off(end + 1);
                        let line = std::mem::replace(&mut state.buffer, rest);
                        match decode(&line[..end]) {
                            Ok(line) => state.ready.push_back(line),
                            Err(error) => {
                                state.done = true;
                                return Some((Err(error), state));
                            }
                        }
                    }
                }
                Some(Err(error)) => {
                    state.done = true;
                    return Some((Err(error), state));
                }
                None => {
                    state.done = true;
                    if !state.buffer.is_empty() {
                        let last = std::mem::take(&mut state.buffer);
                        return Some((decode(&last), state));
                    }
                }
            }
        }
    })
}

/// Newline-delimited JSON, one value per line, as Ollama streams it.
#[cfg(feature = "ollama")]
pub(crate) fn ndjson(body: Body) -> impl Stream<Item = Result<String>> + Send {
    lines(body).filter(|line| {
        let keep = !matches!(line, Ok(text) if text.trim().is_empty());
        async move { keep }
    })
}

/// Server-sent events, as the hosted APIs stream them.
///
/// Comments and fields other than `event` and `data` are dropped, and a
/// `data` field split across lines is joined with newlines, as the format
/// specifies. An event whose data is blank, such as a bare `data:` line a
/// server sends to keep the connection open, carries nothing and is dropped.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "responses"
))]
pub(crate) fn sse(body: Body) -> impl Stream<Item = Result<Sse>> + Send {
    let lines: Pin<Box<dyn Stream<Item = Result<String>> + Send>> = Box::pin(lines(body));
    stream::unfold(Some(lines), |lines| async move {
        let mut lines = lines?;
        let mut event = None;
        let mut data: Vec<String> = Vec::new();
        loop {
            match lines.next().await {
                Some(Err(error)) => return Some((Err(error), None)),
                Some(Ok(line)) if line.is_empty() => {
                    let joined = data.join("\n");
                    let kind = event.take();
                    data.clear();
                    if !joined.trim().is_empty() {
                        let sse = Sse {
                            data: joined,
                            event: kind,
                        };
                        return Some((Ok(sse), Some(lines)));
                    }
                }
                Some(Ok(line)) => {
                    // A comment is a line that starts with a colon, which
                    // splits into an empty field name and is dropped below.
                    let (field, value) = line.split_once(':').unwrap_or((line.as_str(), ""));
                    let value = value.strip_prefix(' ').unwrap_or(value);
                    match field {
                        "data" => data.push(value.to_owned()),
                        "event" => event = Some(value.to_owned()),
                        _ => {}
                    }
                }
                // The end of the body dispatches too, for a server that omits
                // the final blank line.
                None => {
                    let data = data.join("\n");
                    return (!data.trim().is_empty()).then(|| (Ok(Sse { data, event }), None));
                }
            }
        }
    })
}

/// Turns one API's frames into events.
///
/// The state an API spreads across frames, such as usage reported at the start
/// and the stop reason at the end, lives in the decoder.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
pub(crate) trait Decode: Send + 'static {
    type Frame: Send;

    /// The events one frame carries, which may be none.
    fn frame(&mut self, frame: Self::Frame) -> Result<Vec<Event>>;

    /// The events owed when the body ends, such as a stop an API implies by
    /// closing the stream.
    fn finish(&mut self) -> Result<Vec<Event>> {
        Ok(Vec::new())
    }
}

/// Runs `decoder` over `frames`. The first error ends the stream.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
pub(crate) fn decode<F, D>(frames: F, decoder: D) -> Events
where
    F: Stream<Item = Result<D::Frame>> + Send + 'static,
    D: Decode,
{
    struct State<F, D> {
        decoder: D,
        done: bool,
        frames: Pin<Box<F>>,
        ready: VecDeque<Event>,
    }

    let state = State {
        decoder,
        done: false,
        frames: Box::pin(frames),
        ready: VecDeque::new(),
    };
    Box::pin(stream::unfold(state, |mut state| async move {
        loop {
            if let Some(event) = state.ready.pop_front() {
                return Some((Ok(event), state));
            }
            if state.done {
                return None;
            }
            let next = match state.frames.next().await {
                Some(Ok(frame)) => state.decoder.frame(frame),
                Some(Err(error)) => Err(error),
                None => {
                    state.done = true;
                    state.decoder.finish()
                }
            };
            match next {
                Ok(events) => state.ready.extend(events),
                Err(error) => {
                    state.done = true;
                    state.ready.clear();
                    return Some((Err(error), state));
                }
            }
        }
    }))
}

/// Parses one frame's JSON, naming the API that sent it when it fails.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
pub(crate) fn parse<T: serde::de::DeserializeOwned>(api: &str, text: &str) -> Result<T> {
    serde_json::from_str(text).map_err(|error| {
        Error::Provider(format!(
            "{api} sent a frame this client cannot read ({error}): {text}"
        ))
    })
}

/// A transport built on `reqwest`.
#[cfg(feature = "http")]
#[derive(Clone, Debug)]
pub struct Reqwest {
    client: reqwest::Client,
}

#[cfg(feature = "http")]
impl Reqwest {
    /// A client with a 30 second connect timeout and a 10 minute read timeout.
    ///
    /// The read timeout applies to each read, so it limits a pause in the
    /// stream. A long response that streams steadily runs as long as it needs,
    /// and a server that stops sending is given up on. Ten minutes is the default
    /// the Anthropic and OpenAI SDKs give a whole request.
    ///
    /// # Errors
    ///
    /// [`Error::Transport`] if the TLS backend cannot start.
    pub fn new() -> Result<Self> {
        let client = reqwest::Client::builder()
            .connect_timeout(std::time::Duration::from_secs(30))
            .read_timeout(std::time::Duration::from_mins(10))
            .build()
            .map_err(|error| Error::Transport(chain(&error)))?;
        Ok(Self { client })
    }

    /// Wraps a client configured elsewhere, with its own proxy, timeouts or
    /// certificates.
    #[must_use]
    pub fn with_client(client: reqwest::Client) -> Self {
        Self { client }
    }
}

/// An error and every cause under it. `reqwest` puts the reason a connection
/// failed in the source chain, and its own message alone reads "error sending
/// request".
#[cfg(feature = "http")]
fn chain(error: &dyn std::error::Error) -> String {
    let mut text = error.to_string();
    let mut source = error.source();
    while let Some(cause) = source {
        text.push_str(": ");
        text.push_str(&cause.to_string());
        source = cause.source();
    }
    text
}

#[cfg(feature = "http")]
#[async_trait]
impl Transport for Reqwest {
    async fn post(&self, post: Post) -> Result<Body> {
        let mut builder = self
            .client
            .post(&post.url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(post.body);
        for (name, value) in &post.headers {
            builder = builder.header(name, value);
        }
        let response = builder
            .send()
            .await
            .map_err(|error| Error::Transport(chain(&error)))?;

        let status = response.status();
        if !status.is_success() {
            let retry_after = response
                .headers()
                .get(reqwest::header::RETRY_AFTER)
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.trim().parse::<u64>().ok())
                .map(std::time::Duration::from_secs);
            let body = response
                .bytes()
                .await
                .map_err(|error| Error::Transport(chain(&error)))?;
            return Err(Error::Status {
                message: message(&body),
                retry_after,
                status: status.as_u16(),
            });
        }

        let chunks = stream::unfold(Some(response), |response| async move {
            let mut response = response?;
            match response.chunk().await {
                Ok(Some(chunk)) => Some((Ok(chunk.to_vec()), Some(response))),
                Ok(None) => None,
                Err(error) => Some((Err(Error::Transport(chain(&error))), None)),
            }
        });
        Ok(Box::pin(chunks))
    }
}

/// A transport that returns one canned body for every request.
#[cfg(all(
    test,
    any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "ollama",
        feature = "responses"
    )
))]
pub(crate) mod canned {
    use std::sync::Mutex;

    use super::*;

    pub(crate) struct Canned {
        body: Vec<u8>,
        /// The size each chunk is cut to, so a test can split a frame, a
        /// line, or a character across chunks.
        chunk: usize,
        pub(crate) sent: Mutex<Vec<Post>>,
        status: u16,
    }

    impl Canned {
        pub(crate) fn new(body: &str, chunk: usize) -> Self {
            Self {
                body: body.as_bytes().to_vec(),
                chunk,
                sent: Mutex::new(Vec::new()),
                status: 200,
            }
        }

        pub(crate) fn status(status: u16, body: &str) -> Self {
            Self {
                status,
                ..Self::new(body, usize::MAX)
            }
        }

        pub(crate) fn body(&self) -> serde_json::Value {
            let sent = self.sent.lock().unwrap();
            serde_json::from_slice(&sent.last().expect("a request was sent").body).unwrap()
        }

        pub(crate) fn last(&self) -> Post {
            self.sent
                .lock()
                .unwrap()
                .last()
                .cloned()
                .expect("a request was sent")
        }
    }

    #[async_trait]
    impl Transport for Canned {
        async fn post(&self, post: Post) -> Result<Body> {
            self.sent.lock().unwrap().push(post);
            if self.status != 200 {
                return Err(Error::Status {
                    message: message(&self.body),
                    retry_after: None,
                    status: self.status,
                });
            }
            let chunks: Vec<Result<Vec<u8>>> = self
                .body
                .chunks(self.chunk.max(1))
                .map(|chunk| Ok(chunk.to_vec()))
                .collect();
            Ok(Box::pin(stream::iter(chunks)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "ollama",
        feature = "responses"
    ))]
    fn body(text: &str, chunk: usize) -> Body {
        let chunks: Vec<Result<Vec<u8>>> = text
            .as_bytes()
            .chunks(chunk)
            .map(|chunk| Ok(chunk.to_vec()))
            .collect();
        Box::pin(stream::iter(chunks))
    }

    #[cfg(any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "responses"
    ))]
    async fn events(text: &str, chunk: usize) -> Vec<Sse> {
        sse(body(text, chunk))
            .map(Result::unwrap)
            .collect::<Vec<_>>()
            .await
    }

    #[cfg(any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "responses"
    ))]
    #[tokio::test]
    async fn events_survive_any_chunking() {
        let text = "event: a\ndata: {\"x\": \"é\"}\n\n: a comment\nevent: b\r\ndata: 2\r\n\r\n";
        let whole = events(text, usize::MAX).await;

        assert_eq!(
            whole,
            vec![
                Sse {
                    data: "{\"x\": \"é\"}".into(),
                    event: Some("a".into()),
                },
                Sse {
                    data: "2".into(),
                    event: Some("b".into()),
                },
            ]
        );
        for chunk in 1..text.len() {
            assert_eq!(
                events(text, chunk).await,
                whole,
                "split every {chunk} bytes"
            );
        }
    }

    #[cfg(any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "responses"
    ))]
    #[tokio::test]
    async fn the_last_event_dispatches_without_a_blank_line() {
        assert_eq!(
            events("data: [DONE]", 4).await,
            vec![Sse {
                data: "[DONE]".into(),
                event: None,
            }]
        );
    }

    #[cfg(any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "responses"
    ))]
    #[tokio::test]
    async fn a_data_heartbeat_in_the_middle_of_a_stream_is_ignored() {
        let text = "data: 1\n\ndata:\n\nevent: ping\ndata: \n\ndata: 2\n\ndata:";

        assert_eq!(
            events(text, 3).await,
            vec![
                Sse {
                    data: "1".into(),
                    event: None,
                },
                Sse {
                    data: "2".into(),
                    event: None,
                },
            ]
        );
    }

    #[cfg(any(
        feature = "anthropic",
        feature = "chat",
        feature = "gemini",
        feature = "responses"
    ))]
    #[tokio::test]
    async fn data_split_across_lines_is_joined() {
        assert_eq!(events("data: a\ndata: b\n\n", 3).await[0].data, "a\nb");
    }

    #[cfg(feature = "ollama")]
    #[tokio::test]
    async fn ndjson_skips_blank_lines() {
        let lines: Vec<String> = ndjson(body("{\"a\":1}\n\n{\"b\":2}", 5))
            .map(Result::unwrap)
            .collect()
            .await;
        assert_eq!(lines, vec!["{\"a\":1}", "{\"b\":2}"]);
    }

    #[test]
    fn an_error_body_gives_its_message() {
        assert_eq!(
            message(
                br#"{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}"#
            ),
            "Overloaded"
        );
        assert_eq!(
            message(br#"{"error":"model 'x' not found"}"#),
            "model 'x' not found"
        );
        assert_eq!(message(b"Bad Gateway\n"), "Bad Gateway");
    }

    #[test]
    fn a_request_prints_without_its_credentials() {
        let post = Post {
            body: b"{}".to_vec(),
            headers: vec![("x-api-key".into(), "sk-secret".into())],
            url: "https://example.com".into(),
        };
        let printed = format!("{post:?}");
        assert!(printed.contains("x-api-key"));
        assert!(!printed.contains("sk-secret"));
    }
}
