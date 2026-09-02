//! `helix mcp`: the derivation, as a tool an agent can call.
//!
//! **The one question a static file cannot answer.** Everything else an agent
//! needs about Helix is a closed set published as a document: the manifest is
//! every tag and property, `tokens.json` is every token, and each family's `.md`
//! carries its examples. All three are URLs now. What none of them can hold is
//! what *your* brand color derives to, because the input is a color and the
//! domain is infinite, so the answer has to be computed at the moment it is
//! asked.
//!
//! That is the whole scope, and it is deliberately smaller than the row that
//! asked for this imagined. A server that also answered "does this token exist"
//! would be a second copy of a file, and a second copy is the thing this
//! repository spends its checks preventing.
//!
//! **It runs on the reader's machine and Fusion operates nothing.** A server we
//! hosted would be one more thing to keep running and one more thing to trust,
//! and this is a subcommand of a binary they already installed, speaking over
//! stdio to a client they chose. There is no network in it.
//!
//! **JSON-RPC by hand rather than a framework.** The protocol surface used here
//! is three methods and a handful of shapes, and the alternative is a dependency
//! whose version has to be kept in step with whatever a client speaks. The wire
//! format is stable and small enough to read; the risk of writing it out is that
//! it drifts from the specification, which is why the version is a constant with
//! its date beside it rather than a string in three places.

mod tools;

use std::io::{BufRead, Write};

use crate::error::{Failure, Outcome};
use crate::exit::Code;

/// The protocol revision this speaks.
///
/// Sent back verbatim in the initialize result. A client that wants a newer one
/// is told what this is rather than being guessed at, which is the negotiation
/// the specification asks for and the one thing a hand-written server most often
/// gets wrong.
const PROTOCOL: &str = "2024-11-05";

/// Serves until the client closes the pipe.
///
/// # Errors
///
/// [`Failure`] on a genuine write failure. **A closed pipe is not one**: a client
/// that has finished and gone is the normal end of a session, and it is also what
/// `helix mcp | head` looks like, so treating it as an error would make the tool
/// fail on a shell idiom.
///
/// A malformed *request* is never an error here. It is answered with a JSON-RPC
/// error object and the loop continues, because a client that sends one bad
/// message is still a client and a server that exits takes every later call with
/// it.
pub fn run() -> Outcome<Code> {
    let input = std::io::stdin().lock();
    let mut output = std::io::stdout().lock();

    for line in input.lines() {
        let Ok(line) = line else {
            break;
        };
        if line.trim().is_empty() {
            continue;
        }
        let Some(reply) = handle(&line) else {
            /* A notification, which by specification gets no response at all.
            `notifications/initialized` is the one every client sends, and a
            server that answered it would be sending a response to a message
            with no id for a client to match it against. */
            continue;
        };
        /* Newline-delimited, and flushed every time. A client is blocked reading
        a line, so a buffered reply is a hang rather than a slow answer, and it
        is the failure that looks like the tool having nothing to say. */
        if let Err(failure) = writeln!(output, "{reply}").and_then(|()| output.flush()) {
            if failure.kind() == std::io::ErrorKind::BrokenPipe {
                return Ok(Code::Ok);
            }
            return Err(Failure::new(
                Code::Internal,
                "cannot write to stdout".to_owned(),
                failure.to_string(),
            ));
        }
    }
    Ok(Code::Ok)
}

/// Answers one message, or nothing where the message was a notification.
fn handle(line: &str) -> Option<String> {
    let request: serde_json::Value = match serde_json::from_str(line) {
        Ok(request) => request,
        Err(failure) => {
            return Some(error(
                &serde_json::Value::Null,
                -32700,
                &failure.to_string(),
            ));
        }
    };
    let method = request.get("method").and_then(serde_json::Value::as_str)?;
    /* No id means a notification, which by specification gets no response at all:
    a reply to one is a message a client cannot match to anything. */
    let id = request.get("id")?;

    match method {
        "initialize" => Some(result(
            id,
            &serde_json::json!({
                "capabilities": { "tools": {} },
                "protocolVersion": PROTOCOL,
                "serverInfo": { "name": "helix", "version": env!("CARGO_PKG_VERSION") },
            }),
        )),
        "tools/list" => Some(result(
            id,
            &serde_json::json!({ "tools": tools::catalog() }),
        )),
        "tools/call" => {
            let name = request
                .get("params")
                .and_then(|params| params.get("name"))
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default();
            let arguments = request
                .get("params")
                .and_then(|params| params.get("arguments"))
                .cloned()
                .unwrap_or_else(|| serde_json::json!({}));
            Some(match tools::call(name, &arguments) {
                Ok(text) => result(id, &content(&text, false)),
                /* **A tool failure is a result, not a protocol error.** The
                specification is explicit and the reason is practical: a model
                can read `isError` and try again, where a JSON-RPC error is the
                transport saying the call never happened. An unparseable intent
                is an answer. */
                Err(why) => result(id, &content(&why, true)),
            })
        }
        _ => Some(error(id, -32601, &format!("no method named {method}"))),
    }
}

fn content(text: &str, failed: bool) -> serde_json::Value {
    serde_json::json!({
        "content": [{ "text": text, "type": "text" }],
        "isError": failed,
    })
}

fn result(id: &serde_json::Value, payload: &serde_json::Value) -> String {
    serde_json::json!({ "id": id, "jsonrpc": "2.0", "result": payload }).to_string()
}

fn error(id: &serde_json::Value, code: i64, message: &str) -> String {
    serde_json::json!({
        "error": { "code": code, "message": message },
        "id": id,
        "jsonrpc": "2.0",
    })
    .to_string()
}
