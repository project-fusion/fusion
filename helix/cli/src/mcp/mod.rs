//! `helix mcp`: Helix, as tools an agent can call.
//!
//! **Lookups that answer for the installed version, and the derivation.** The
//! lookups read the `api.json`, `examples.json`, and `tokens.json` the
//! project's Helix packages ship, so each answer is one decision an agent makes
//! while writing a page, from the same catalog the site is written from, at
//! the version the project builds with. The derivation answers what no file
//! can hold: what a brand color derives to. `tools` has the list.
//!
//! **It runs on the reader's machine and Fusion operates nothing.** A server we
//! hosted would be one more thing to keep running and one more thing to trust,
//! and this is a subcommand of a binary they already installed, speaking over
//! stdio to a client they chose. There is no network in it.
//!
//! **JSON-RPC by hand rather than a framework.** The protocol surface used here
//! is a few methods and a handful of shapes, and the alternative is a
//! dependency whose version has to be kept in step with whatever a client
//! speaks. The versions it speaks are a constant with their dates in it.

pub mod init;
mod tools;

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use std::io::{BufRead, Write};
use std::path::PathBuf;

/// The handshake revisions this speaks, newest first.
///
/// A client that opens with `initialize` and asks for one of these is answered
/// in it, and any other is answered with the newest, which is the negotiation
/// the specification asks for.
const PROTOCOLS: [&str; 4] = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

/// The per-request revision this speaks.
///
/// **Both eras on one pipe**, which the specification allows a server: a
/// request carrying its version in `_meta` is served by this revision's rules,
/// with no handshake and no state, and `initialize` selects the old ones. A
/// client of both eras probes with `server/discover`, which this answers.
const MODERN: &str = "2026-07-28";

/// The `_meta` keys this revision reads and writes.
const VERSION_KEY: &str = "io.modelcontextprotocol/protocolVersion";
const CAPABILITIES_KEY: &str = "io.modelcontextprotocol/clientCapabilities";
const SERVER_KEY: &str = "io.modelcontextprotocol/serverInfo";

/// What the client is told once, at `initialize`: the rules an agent writing
/// Helix needs before its first call.
///
/// **Under 2,048 characters**, where one client cuts what it shows, and a test
/// holds it there. The rules are repeated in the tool descriptions, which no
/// client cuts.
pub const INSTRUCTIONS: &str = "Helix is a library of web components. These tools answer from the Helix packages installed in this project, and each answer names the package and version it read.\n\n\
- Look up a family with helix_family before writing its tags. Write only the tags, attributes, values, slots, parts, events, and custom properties it lists. If it is not listed, it does not exist, so do not use it.\n\
- Find a family by name or purpose with helix_find.\n\
- Import every family you write. Copy the lines from `usage` or from an example's `imports`, or call helix_imports with every tag the file writes. A family does not register another family's elements written inside it, such as Option inside Select.\n\
- In React, use each event's `reactProp` exactly, such as onhelix-before-change.\n\
- Style with the tokens helix_tokens lists, then a component's custom properties, then its parts. Never read a --_helix- primitive.\n\
- For a theme, call helix_audit_theme with the brand color, then helix_derive_theme.\n\
- After writing, call helix_check with the files you changed, or with a snippet before you write it, and fix every finding.";

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
    let meta = request.pointer("/params/_meta");
    if let Some(asked) = meta.and_then(|meta| meta.get(VERSION_KEY)) {
        return Some(modern(&request, method, id, asked, meta));
    }
    if method == "server/discover" {
        return Some(error(
            id,
            -32602,
            &format!("server/discover needs `{VERSION_KEY}` in `_meta`"),
        ));
    }
    Some(match answer(&request, method) {
        Ok(payload) => result(id, &payload),
        Err((code, message)) => error(id, code, &message),
    })
}

/// A request in the per-request revision: its version checked, its
/// capabilities required, and each result marked complete and signed.
fn modern(
    request: &serde_json::Value,
    method: &str,
    id: &serde_json::Value,
    asked: &serde_json::Value,
    meta: Option<&serde_json::Value>,
) -> String {
    if asked.as_str() != Some(MODERN) {
        let mut supported = vec![MODERN];
        supported.extend(PROTOCOLS);
        return serde_json::json!({
            "error": {
                "code": -32022,
                "data": { "requested": asked, "supported": supported },
                "message": "Unsupported protocol version",
            },
            "id": id,
            "jsonrpc": "2.0",
        })
        .to_string();
    }
    if meta.and_then(|meta| meta.get(CAPABILITIES_KEY)).is_none() {
        return error(id, -32602, &format!("`_meta` needs `{CAPABILITIES_KEY}`"));
    }
    let payload = if method == "server/discover" {
        let mut supported = vec![MODERN];
        supported.extend(PROTOCOLS);
        Ok(serde_json::json!({
            "capabilities": { "tools": {} },
            "instructions": INSTRUCTIONS,
            "supportedVersions": supported,
        }))
    } else if method == "initialize" {
        Err((
            -32601,
            "initialize is not part of 2026-07-28; send each request with its `_meta`".to_owned(),
        ))
    } else {
        answer(request, method)
    };
    match payload {
        Ok(mut payload) => {
            if let Some(object) = payload.as_object_mut() {
                object.insert("resultType".to_owned(), "complete".into());
                object.insert(
                    "_meta".to_owned(),
                    serde_json::json!({ SERVER_KEY: server_info() }),
                );
            }
            result(id, &payload)
        }
        Err((code, message)) => error(id, code, &message),
    }
}

/// The server's name and version, as both eras report them.
fn server_info() -> serde_json::Value {
    serde_json::json!({ "name": "helix", "title": "Helix", "version": crate::shipped() })
}

/// The result of one request in either era, or its error code and message.
fn answer(request: &serde_json::Value, method: &str) -> Result<serde_json::Value, (i64, String)> {
    match method {
        "initialize" => {
            let asked = request
                .get("params")
                .and_then(|params| params.get("protocolVersion"))
                .and_then(serde_json::Value::as_str);
            let spoken = asked
                .and_then(|asked| PROTOCOLS.iter().find(|known| **known == asked))
                .unwrap_or(&PROTOCOLS[0]);
            Ok(serde_json::json!({
                "capabilities": { "tools": {} },
                "instructions": INSTRUCTIONS,
                "protocolVersion": spoken,
                "serverInfo": server_info(),
            }))
        }
        /* Answered with an empty result, as the specification requires of
        every receiver, so a client checking the server is alive is told so. */
        "ping" => Ok(serde_json::json!({})),
        "tools/list" => Ok(serde_json::json!({ "tools": tools::catalog() })),
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
            /* The project is where the client started the server, which is
            where its `node_modules` is. */
            let from = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            Ok(match tools::call(name, &arguments, &from) {
                Ok(answer) => structured(&answer),
                /* **A tool failure is a result, not a protocol error.** The
                specification is explicit and the reason is practical: a model
                can read `isError` and try again, where a JSON-RPC error is the
                transport saying the call never happened. An unparseable intent
                is an answer. */
                Err(why) => content(&why, true),
            })
        }
        _ => Err((-32601, format!("no method named {method}"))),
    }
}

/// A result with its structured content and the same as text.
fn structured(answer: &tools::Answer) -> serde_json::Value {
    serde_json::json!({
        "content": [{ "text": answer.text, "type": "text" }],
        "isError": false,
        "structuredContent": answer.structured,
    })
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
