//! The MCP server's contract, driven the way a client drives it.
//!
//! **Over stdio and through the real binary**, because that is the whole
//! interface: a client spawns the process, writes newline-delimited JSON-RPC and
//! reads the same back. A test that called `handle` directly would prove the
//! dispatch and none of the framing, and the framing is where a hand-written
//! server goes wrong.

use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Output, Stdio};

fn binary() -> PathBuf {
    let mut path = std::env::current_exe().expect("a test knows where it is");
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("helix")
}

/// Sends these messages and returns every response, in order.
fn talk(messages: &[&str]) -> Vec<serde_json::Value> {
    let mut child = Command::new(binary())
        .arg("mcp")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("the server starts");
    {
        let stdin = child.stdin.as_mut().expect("a pipe");
        for message in messages {
            writeln!(stdin, "{message}").expect("the server is reading");
        }
    }
    let Output { stdout, .. } = child.wait_with_output().expect("the server exits");
    String::from_utf8(stdout)
        .expect("utf8")
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| serde_json::from_str(line).expect("every line is a JSON-RPC message"))
        .collect()
}

const HELLO: &str = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}"#;

/// The result body of a `tools/call`, which is where a tool's answer lives.
fn answer(reply: &serde_json::Value) -> (bool, String) {
    let result = &reply["result"];
    (
        result["isError"].as_bool().expect("isError is a bool"),
        result["content"][0]["text"]
            .as_str()
            .expect("text")
            .to_owned(),
    )
}

#[test]
fn it_negotiates_and_lists_its_tools() {
    let replies = talk(&[HELLO, r#"{"jsonrpc":"2.0","id":2,"method":"tools/list"}"#]);
    assert_eq!(replies.len(), 2);
    assert_eq!(replies[0]["result"]["protocolVersion"], "2024-11-05");
    assert_eq!(replies[0]["result"]["serverInfo"]["name"], "helix");

    let tools = replies[1]["result"]["tools"].as_array().expect("a list");
    let names: Vec<&str> = tools
        .iter()
        .map(|tool| tool["name"].as_str().unwrap())
        .collect();
    assert_eq!(names, ["helix_derive_theme", "helix_audit_theme"]);
    /* Every tool has a description and a schema, because a client shows the first
    to a model and validates against the second, and a tool missing either is
    one a model will not call correctly. */
    for tool in tools {
        assert!(tool["description"]
            .as_str()
            .is_some_and(|text| text.len() > 40));
        assert_eq!(tool["inputSchema"]["type"], "object");
    }
}

/// **A notification gets no reply**, which is the rule most easily broken: it has
/// no id, so a response to it is one a client cannot match to anything and some
/// clients treat as a protocol violation. Every client sends this one.
#[test]
fn a_notification_is_answered_with_silence() {
    let replies = talk(&[
        HELLO,
        r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#,
        r#"{"jsonrpc":"2.0","id":2,"method":"tools/list"}"#,
    ]);
    assert_eq!(replies.len(), 2, "the notification was answered");
    assert_eq!(replies[1]["id"], 2);
}

#[test]
fn auditing_a_brand_measures_every_pair() {
    let replies = talk(&[
        HELLO,
        r##"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"helix_audit_theme","arguments":{"intent":{"brand":"#3b82f6"}}}}"##,
    ]);
    let (failed, text) = answer(&replies[1]);
    assert!(!failed);
    let report: serde_json::Value = serde_json::from_str(&text).expect("the report is JSON");
    assert_eq!(report["failed"], 0);
    assert!(report["pairings"]
        .as_array()
        .is_some_and(|pairs| pairs.len() > 50));
}

#[test]
fn deriving_returns_css_a_stylesheet_can_take() {
    let replies = talk(&[
        HELLO,
        r##"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"helix_derive_theme","arguments":{"intent":{"brand":"#3b82f6","scheme":"dark"}}}}"##,
    ]);
    let (failed, css) = answer(&replies[1]);
    assert!(!failed);
    assert!(css.starts_with(":root {"), "{css}");
    assert!(css.contains("--helix-color-background:"), "{css}");
}

/// **No brand is a theme, and with no `scheme` it comes back in both modes**, as
/// one block of `light-dark()` pairs a stylesheet can take whole.
#[test]
fn deriving_no_brand_returns_ink_in_both_modes() {
    let replies = talk(&[
        HELLO,
        r##"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"helix_derive_theme","arguments":{"intent":{}}}}"##,
    ]);
    let (failed, css) = answer(&replies[1]);
    assert!(!failed, "{css}");
    assert!(
        css.contains("--helix-color-primary: light-dark(#181818, #e1e1e1);"),
        "{css}"
    );
    assert!(!css.contains("--helix-seed-brand"), "{css}");
}

/// **A palette that fails its own contract is refused rather than returned**, the
/// way `helix theme build` refuses it. Handing one to a model that will paste it
/// into a stylesheet is worse than handing it to a person who might read a
/// warning above it.
#[test]
fn a_failing_palette_is_not_handed_back() {
    let replies = talk(&[
        HELLO,
        r##"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"helix_derive_theme","arguments":{"intent":{"brand":"#3b82f6","tokens":{"color-foreground":"#eeeeee"}}}}}"##,
    ]);
    let (failed, why) = answer(&replies[1]);
    assert!(failed);
    assert!(
        !why.contains(":root {"),
        "it returned the palette anyway: {why}"
    );
    assert!(
        why.contains("helix_audit_theme"),
        "it did not say what to call instead: {why}"
    );
}

/// A tool failure is a result with `isError`, never a JSON-RPC error: the
/// transport did its job and the answer is no, which a model can act on.
#[test]
fn a_bad_intent_is_an_answer_and_not_a_transport_failure() {
    let replies = talk(&[
        HELLO,
        r#"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"helix_audit_theme","arguments":{"intent":{"brand":"not-a-color"}}}}"#,
    ]);
    assert!(
        replies[1].get("error").is_none(),
        "a bad hex became a protocol error"
    );
    let (failed, why) = answer(&replies[1]);
    assert!(failed);
    assert!(why.contains("not-a-color"), "{why}");
}

/// The name is checked before the arguments are read, so a misspelled tool is
/// told it is misspelled rather than told its intent is malformed.
#[test]
fn an_unknown_tool_says_so_rather_than_blaming_the_arguments() {
    let replies = talk(&[
        HELLO,
        r#"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"helix_invent","arguments":{}}}"#,
    ]);
    let (failed, why) = answer(&replies[1]);
    assert!(failed);
    assert!(why.contains("no tool named helix_invent"), "{why}");
    assert!(
        why.contains("helix_audit_theme"),
        "it did not name the real ones: {why}"
    );
}

/// **One bad message does not end the session.** A client that sends garbage is
/// still a client, and a server that exits takes every later call with it.
#[test]
fn a_malformed_message_is_answered_and_the_server_stays_up() {
    let replies = talk(&[
        HELLO,
        "not json at all",
        r#"{"jsonrpc":"2.0","id":3,"method":"tools/list"}"#,
    ]);
    assert_eq!(replies.len(), 3);
    assert_eq!(replies[1]["error"]["code"], -32700);
    assert!(
        replies[2]["result"]["tools"].is_array(),
        "the server stopped serving"
    );
}

#[test]
fn an_unknown_method_is_a_protocol_error_with_the_right_code() {
    let replies = talk(&[
        HELLO,
        r#"{"jsonrpc":"2.0","id":2,"method":"resources/list"}"#,
    ]);
    assert_eq!(replies[1]["error"]["code"], -32601);
}
