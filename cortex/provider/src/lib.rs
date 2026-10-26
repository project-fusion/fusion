//! Cortex's model clients, one per API.
//!
//! Each client turns Cortex's provider types, from `fusion-cortex-core`, into
//! one API's requests, and reads that API's stream back into the same typed
//! events. The types stay in Core, where Recall and Trace read them, and the
//! clients that call each API live here.
//!
//! **One decoder per API.** A host application that checks an endpoint and
//! an agent that runs a long task through it read the same stream with the
//! same code, so a server whose streamed tool calls are broken fails the check
//! before it can fail the task.
//!
//! **Each client is a feature.** `anthropic`, `chat`, `gemini`, `ollama` and
//! `responses` each add one module, so a crate that takes one client compiles
//! only that one.
//!
//! **The one transport that opens a socket is the `http` feature's.** Every
//! client builds its requests and reads its streams without it, so a crate
//! that takes a client without `http` compiles no HTTP stack and no TLS, and
//! sends its requests through its own [`http::Transport`].

#[cfg(any(
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
use fusion_cortex_core::provider::Block;

#[cfg(feature = "anthropic")]
pub mod anthropic;
#[cfg(feature = "chat")]
pub mod chat;
#[cfg(feature = "gemini")]
pub mod gemini;
pub mod http;
#[cfg(feature = "ollama")]
pub mod ollama;
#[cfg(feature = "responses")]
pub mod responses;

/// A base URL without the trailing slash a path is joined after.
#[cfg(any(
    feature = "anthropic",
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
pub(crate) fn trimmed(base: impl Into<String>) -> String {
    let mut base = base.into();
    while base.ends_with('/') {
        base.pop();
    }
    base
}

/// The text blocks, with a blank line between each, for an API that takes one
/// string where a message holds several blocks. Joined with nothing between,
/// a task and the note a context strategy joined to it would run together.
/// An empty block is left out, so it adds no blank line.
#[cfg(any(
    feature = "chat",
    feature = "gemini",
    feature = "ollama",
    feature = "responses"
))]
pub(crate) fn paragraphs(blocks: &[Block]) -> String {
    blocks
        .iter()
        .filter_map(|block| match block {
            Block::Text { text } if !text.is_empty() => Some(text.as_str()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

/// The output count, reasoning included, from an API that also reports a
/// total. xAI counts reasoning apart from its output count and inside its
/// total, so the total less the input is the larger of the two there. OpenAI
/// counts reasoning inside output, and the two agree.
#[cfg(any(feature = "chat", feature = "responses"))]
pub(crate) fn output_with_reasoning(input: u32, output: u32, total: Option<u32>) -> u32 {
    total.map_or(output, |total| output.max(total.saturating_sub(input)))
}

#[cfg(all(
    test,
    any(
        feature = "chat",
        feature = "gemini",
        feature = "ollama",
        feature = "responses"
    )
))]
mod tests {
    use fusion_cortex_core::provider::Api;

    use super::*;

    #[test]
    fn paragraphs_leave_out_empty_text() {
        let blocks = [
            Block::text("Done."),
            Block::Thinking {
                api: Api::Gemini,
                signature: Some("c2ln".into()),
                text: String::new(),
            },
            Block::text(""),
        ];

        assert_eq!(paragraphs(&blocks), "Done.");
        assert_eq!(
            paragraphs(&[Block::text("fix it"), Block::text(""), Block::text("now")]),
            "fix it\n\nnow"
        );
    }

    #[cfg(any(feature = "chat", feature = "responses"))]
    #[test]
    fn output_counts_reasoning_once_however_an_api_reports_it() {
        // xAI: 9 output tokens, 110 reasoning tokens outside them, 151 in all.
        assert_eq!(output_with_reasoning(32, 9, Some(151)), 119);
        // OpenAI: 300 output tokens with the 250 reasoning tokens inside them.
        assert_eq!(output_with_reasoning(1200, 300, Some(1500)), 300);
        assert_eq!(output_with_reasoning(10, 4, None), 4);
    }
}
