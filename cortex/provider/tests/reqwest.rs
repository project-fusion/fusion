//! The `reqwest` transport against a real socket: a server on localhost that
//! responds to one request the way a model API does.
//!
//! Every client's own tests run against a canned body. This is the one place
//! the bytes cross a connection, so it is where a status, a header, and a body
//! cut into TCP writes are read the way the clients assume.

#![cfg(all(feature = "anthropic", feature = "http"))]

use std::{sync::Arc, time::Duration};

use fusion_cortex_core::{
    provider::{Message, Provider, Request, Role, Stop},
    Error,
};
use fusion_cortex_provider::{
    anthropic::Anthropic,
    http::{Reqwest, Transport},
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::oneshot,
};

const STREAM: &str = "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_01\",\"model\":\"claude-opus-5-5\",\"usage\":{\"input_tokens\":9,\"output_tokens\":1}}}\n\nevent: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\nevent: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"ready\"}}\n\nevent: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":2}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n";

/// What the server was sent.
struct Received {
    body: String,
    head: String,
}

/// Serves one request with `head` and `body`, writing the body `chunk` bytes
/// at a time, and hands back what it was sent.
async fn serve(
    head: &'static str,
    body: &'static str,
    chunk: usize,
) -> (String, oneshot::Receiver<Received>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let (sent, received) = oneshot::channel();
    tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut request = Vec::new();
        let mut buffer = [0_u8; 4096];
        let split = loop {
            let read = socket.read(&mut buffer).await.unwrap();
            request.extend_from_slice(&buffer[..read]);
            if let Some(at) = request.windows(4).position(|window| window == b"\r\n\r\n") {
                break at + 4;
            }
        };
        let head_text = String::from_utf8_lossy(&request[..split]).to_lowercase();
        let length: usize = head_text
            .lines()
            .find_map(|line| line.strip_prefix("content-length:"))
            .map_or(0, |value| value.trim().parse().unwrap());
        while request.len() < split + length {
            let read = socket.read(&mut buffer).await.unwrap();
            request.extend_from_slice(&buffer[..read]);
        }
        let _ = sent.send(Received {
            body: String::from_utf8_lossy(&request[split..]).into_owned(),
            head: head_text,
        });

        socket.write_all(head.as_bytes()).await.unwrap();
        for piece in body.as_bytes().chunks(chunk) {
            socket.write_all(piece).await.unwrap();
            socket.flush().await.unwrap();
        }
        socket.shutdown().await.unwrap();
    });
    (base, received)
}

fn transport() -> Arc<dyn Transport> {
    Arc::new(Reqwest::new().unwrap())
}

#[tokio::test]
async fn a_streamed_answer_arrives_across_many_writes() {
    let (base, received) = serve(
        "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\nconnection: close\r\n\r\n",
        STREAM,
        13,
    )
    .await;
    let provider = Anthropic::new("sk-test", "claude-opus-5-5", transport()).base(base);
    let request = Request {
        messages: vec![Message::text(Role::User, "Reply with: ready")],
        ..Request::default()
    };

    let response = provider.complete(&request).await.unwrap();

    assert_eq!(response.joined(), "ready");
    assert_eq!(response.stop, Stop::EndTurn);
    assert_eq!(response.usage.output, 2);
    let received = received.await.unwrap();
    assert!(
        received.head.starts_with("post /v1/messages "),
        "{}",
        received.head
    );
    assert!(received.head.contains("x-api-key: sk-test"));
    assert!(received.head.contains("content-type: application/json"));
    let body: serde_json::Value = serde_json::from_str(&received.body).unwrap();
    assert_eq!(
        body["messages"][0]["content"][0]["text"],
        "Reply with: ready"
    );
}

#[tokio::test]
async fn a_rate_limit_gives_its_status_message_and_wait() {
    let (base, _received) = serve(
        "HTTP/1.1 429 Too Many Requests\r\ncontent-type: application/json\r\nretry-after: 7\r\nconnection: close\r\n\r\n",
        r#"{"type":"error","error":{"type":"rate_limit_error","message":"Rate limited."}}"#,
        usize::MAX,
    )
    .await;
    let provider = Anthropic::new("sk-test", "claude-opus-5-5", transport()).base(base);

    let error = provider.complete(&Request::default()).await.unwrap_err();

    match error {
        Error::Status {
            message,
            retry_after,
            status,
        } => {
            assert_eq!(status, 429);
            assert_eq!(message, "Rate limited.");
            assert_eq!(retry_after, Some(Duration::from_secs(7)));
        }
        other => panic!("expected a status, got {other}"),
    }
}

#[tokio::test]
async fn a_refused_connection_is_a_transport_error_worth_retrying() {
    // Bound and dropped, so nothing is listening on the port.
    let port = TcpListener::bind("127.0.0.1:0")
        .await
        .unwrap()
        .local_addr()
        .unwrap()
        .port();
    let provider = Anthropic::new("sk-test", "claude-opus-5-5", transport())
        .base(format!("http://127.0.0.1:{port}"));

    let error = provider.complete(&Request::default()).await.unwrap_err();

    assert!(matches!(error, Error::Transport(_)), "{error}");
    assert!(error.is_retryable());
}
