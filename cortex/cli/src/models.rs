//! The model clients a command runs, built by name.
//!
//! **Ollama on your machine is the default, for answers and for vectors.**
//! Every other client is named with `--provider` or `--embedder`, and a client
//! that takes a key reads it from the variable `--key-env` names, or from the
//! one its API documents: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or
//! `OPENAI_API_KEY`.

use std::sync::Arc;

use fusion_cortex_core::{embed::Embedder, provider::Provider};
use fusion_cortex_provider::{
    anthropic::Anthropic, chat::Chat, embeddings, gemini, http::Reqwest, ollama,
    responses::Responses,
};
use fusion_rules::error::{Failure, Outcome};

use crate::{
    script::Script,
    settings::{Client, Settings, DEFAULT_EMBED_MODEL, DEFAULT_MODEL},
};

/// The provider names `--provider` takes.
pub const PROVIDERS: [&str; 7] = [
    "ollama",
    "chat",
    "responses",
    "openai",
    "anthropic",
    "gemini",
    "scripted",
];

/// The embedder names `--embedder` takes.
pub const EMBEDDERS: [&str; 5] = ["ollama", "embeddings", "gemini", "scripted", "none"];

/// The address Ollama serves on when nothing names another.
const OLLAMA: &str = "http://localhost:11434";

/// Whether `base` names this machine, which is how a server is judged local
/// where nothing else says.
fn loopback(base: &str) -> bool {
    let host = base
        .split_once("://")
        .map_or(base, |(_, rest)| rest)
        .split(['/', '?'])
        .next()
        .unwrap_or_default();
    let host = host.rsplit_once('@').map_or(host, |(_, host)| host);
    let host = match host.strip_prefix('[') {
        Some(bracketed) => bracketed.split(']').next().unwrap_or_default(),
        None => host.split(':').next().unwrap_or_default(),
    };
    matches!(host, "localhost" | "127.0.0.1" | "::1")
}

fn transport() -> Outcome<Arc<Reqwest>> {
    Reqwest::new()
        .map(Arc::new)
        .map_err(|error| Failure::input("cannot start the HTTP client", error.to_string()))
}

/// The key in the variable `client` names, or in `fallback`.
fn key(client: &Client, fallback: Option<&str>) -> Outcome<Option<String>> {
    let Some(variable) = client.key_env.as_deref().or(fallback) else {
        return Ok(None);
    };
    match std::env::var(variable) {
        Ok(key) if !key.trim().is_empty() => Ok(Some(key)),
        _ => Err(Failure::input(
            format!("${variable} is not set"),
            format!("the {} client reads its key from ${variable}", client.name),
        )
        .hint(format!("export {variable}=..."))),
    }
}

fn needed(key: Option<String>, client: &Client) -> Outcome<String> {
    key.ok_or_else(|| {
        Failure::input(
            format!("no key for {}", client.name),
            "name the variable that holds it with --key-env",
        )
    })
}

fn model<'a>(client: &'a Client, flag: &str) -> Outcome<&'a str> {
    client.model.as_deref().ok_or_else(|| {
        Failure::input(
            format!("no model for {}", client.name),
            format!("the {} client has no default model", client.name),
        )
        .hint(format!("cortex {flag} <model> ..."))
    })
}

fn script(settings: &Settings) -> Outcome<Script> {
    let path = settings.script.as_deref().ok_or_else(|| {
        Failure::input(
            "no script",
            "the scripted provider and embedder answer from the file --script names",
        )
        .hint("cortex --provider scripted --script week.json ...")
    })?;
    Script::read(path)
}

fn unknown(kind: &str, name: &str, choices: &[&str]) -> Failure {
    Failure::input(
        format!("`{name}` is not a {kind}"),
        format!("a {kind} is one of {}", choices.join(", ")),
    )
    .choices(choices.iter().map(|&choice| choice.to_owned()).collect())
}

/// The chat provider `client` names.
///
/// # Errors
///
/// [`Failure`] if the name is not a provider, it needs a model, base, or key
/// that is not set, or the script cannot be read.
pub fn provider(client: &Client, settings: &Settings) -> Outcome<Box<dyn Provider>> {
    Ok(match client.name.as_str() {
        "ollama" => {
            let base = client.base.clone().unwrap_or_else(|| OLLAMA.to_owned());
            let model = client.model.as_deref().unwrap_or(DEFAULT_MODEL);
            let mut ollama = ollama::Ollama::new(model, transport()?).context(8_192);
            match key(client, None)? {
                Some(key) => ollama = ollama.cloud(key),
                None => ollama = ollama.base(&base).local(loopback(&base)),
            }
            Box::new(ollama)
        }
        "chat" => {
            let base = client.base.as_deref().ok_or_else(|| {
                Failure::input(
                    "no address for chat",
                    "the chat client sends to the server --base names, up to its version",
                )
                .hint("cortex --provider chat --base http://localhost:1234/v1 ...")
            })?;
            let mut chat =
                Chat::new(base, model(client, "--model")?, transport()?).local(client.local);
            if let Some(key) = key(client, None)? {
                chat = chat.key(key);
            }
            Box::new(chat)
        }
        "responses" => {
            let base = client
                .base
                .as_deref()
                .unwrap_or("https://api.openai.com/v1");
            let mut responses =
                Responses::new(base, model(client, "--model")?, transport()?).local(client.local);
            if let Some(key) = key(client, None)? {
                responses = responses.key(key);
            }
            Box::new(responses)
        }
        "openai" => Box::new(Responses::openai(
            needed(key(client, Some("OPENAI_API_KEY"))?, client)?,
            model(client, "--model")?,
            transport()?,
        )),
        "anthropic" => {
            let mut anthropic = Anthropic::new(
                needed(key(client, Some("ANTHROPIC_API_KEY"))?, client)?,
                model(client, "--model")?,
                transport()?,
            );
            if let Some(base) = &client.base {
                anthropic = anthropic.base(base);
            }
            Box::new(anthropic)
        }
        "gemini" => {
            let mut gemini = gemini::Gemini::new(
                needed(key(client, Some("GEMINI_API_KEY"))?, client)?,
                model(client, "--model")?,
                transport()?,
            );
            if let Some(base) = &client.base {
                gemini = gemini.base(base);
            }
            Box::new(gemini)
        }
        "scripted" => {
            Box::new(script(settings)?.provider(client.model.as_deref().unwrap_or("scripted")))
        }
        other => return Err(unknown("provider", other, &PROVIDERS)),
    })
}

/// The embedder the settings name, or none.
///
/// # Errors
///
/// [`Failure`] as [`provider`] fails.
pub fn embedder(settings: &Settings) -> Outcome<Option<Box<dyn Embedder>>> {
    let Some(client) = &settings.embedder else {
        return Ok(None);
    };
    Ok(Some(match client.name.as_str() {
        "ollama" => {
            let base = client.base.clone().unwrap_or_else(|| OLLAMA.to_owned());
            let model = client.model.as_deref().unwrap_or(DEFAULT_EMBED_MODEL);
            let mut embedder = ollama::Embeddings::new(model, transport()?)
                .base(&base)
                .local(loopback(&base));
            /* `nomic-embed-text` was trained with a prefix for each side of a
            search, and ranks a paraphrase first only with them. */
            if model.starts_with("nomic-embed-text") {
                embedder = embedder.prefixes("search_query: ", "search_document: ");
            }
            Box::new(embedder)
        }
        "embeddings" => {
            let base = client
                .base
                .as_deref()
                .unwrap_or("https://api.openai.com/v1");
            let fallback = (!loopback(base)).then_some("OPENAI_API_KEY");
            let mut embedder =
                embeddings::Embeddings::new(base, model(client, "--embed-model")?, transport()?)
                    .local(client.local || loopback(base));
            if let Some(key) = key(client, fallback)? {
                embedder = embedder.key(key);
            }
            Box::new(embedder)
        }
        "gemini" => {
            let mut embedder = gemini::Embeddings::new(
                needed(key(client, Some("GEMINI_API_KEY"))?, client)?,
                model(client, "--embed-model")?,
                transport()?,
            );
            if let Some(base) = &client.base {
                embedder = embedder.base(base);
            }
            Box::new(embedder)
        }
        "scripted" => Box::new(script(settings)?.embedder()?),
        other => return Err(unknown("embedder", other, &EMBEDDERS)),
    }))
}

/// A provider's failure, with the next command where there is one.
pub fn failed(provider: &str, error: &fusion_cortex_core::Error) -> Failure {
    use fusion_cortex_core::Error;
    let failure = Failure::input(format!("{provider} did not answer"), error.to_string());
    let Some(model) = provider.strip_prefix("local/") else {
        return failure;
    };
    match error {
        Error::Transport(_) => failure.hint("ollama serve"),
        Error::Status { status: 404, .. } => failure.hint(format!("ollama pull {model}")),
        _ => failure,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_this_machine_is_local() {
        assert!(loopback("http://localhost:11434"));
        assert!(loopback("http://127.0.0.1:1234/v1"));
        assert!(loopback("http://[::1]:11434"));
        assert!(!loopback("http://gpu.lan:11434"));
        assert!(!loopback("https://api.openai.com/v1"));
        assert!(!loopback("http://localhost.example.com"));
    }
}
