//! `cortex`, the Cortex command line: record notes as episodes, distill them
//! into facts, answer questions from the facts, and trace every answer to the
//! episodes it rests on.
//!
//! **It runs on your machine by default.** The store is a SQLite file in your
//! data directory, and the chat model and the embedder are Ollama's, so a
//! session needs no account and no key. Any other client is a flag, and a key
//! comes from the environment.
//!
//! **The shape is `helix`'s and `fusion`'s, because the three read it from one
//! crate.** Exit codes, the error format, and the output that survives a closed
//! pipe are `fusion-rules`'s, and `fusion cortex ...` routes here and returns
//! this binary's code untouched.

mod diff;
mod memory;
mod models;
mod render;
mod script;
mod settings;
mod source;

use std::{io::Read as _, path::PathBuf};

use chrono::{DateTime, Local, NaiveDate, NaiveTime, TimeZone as _, Utc};
use clap::{Args, Parser, Subcommand};
use fusion_rules::{
    error::{Failure, Outcome},
    exit::Code,
    style::Paint,
};
use serde::Serialize;

use crate::{
    memory::{Memory, Note},
    settings::{Given, Settings},
};

/// The word every printed failure opens with.
const PRODUCT: &str = "cortex";

/// The package this binary ships in, which is what tells it its version.
const PACKAGE: &str = "@fusion.dev/cortex-cli";

fn shipped() -> &'static str {
    fusion_rules::version::shipped(PACKAGE, env!("CARGO_PKG_VERSION"))
}

#[derive(Debug, Parser)]
#[command(
    name = "cortex",
    about = "The Cortex command line: record notes, distill them into facts, answer questions from the facts, and trace each answer to its sources.",
    version = shipped(),
    subcommand_required = true,
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    verb: Verb,

    #[command(flatten)]
    options: Options,
}

#[derive(Debug, Args)]
struct Options {
    /// Where memory is kept: a SQLite file, `sqlite:<path>`, or a
    /// `postgres://` URL.
    ///
    /// Defaults to cortex.db in a cortex folder in your data directory.
    #[arg(long, global = true, env = "CORTEX_STORE", value_name = "LOCATION")]
    store: Option<String>,

    /// The config file to read.
    ///
    /// Defaults to config.json in a cortex folder in your config directory. Flags and
    /// `CORTEX_` variables take precedence over it.
    #[arg(long, global = true, env = "CORTEX_CONFIG", value_name = "FILE")]
    config: Option<PathBuf>,

    /// The chat model's client: ollama, chat, responses, openai, anthropic,
    /// gemini, or scripted.
    ///
    /// Defaults to ollama. `chat` is any server with an OpenAI-compatible
    /// `/chat/completions`, such as LM Studio or llama.cpp.
    #[arg(long, global = true, env = "CORTEX_PROVIDER", value_name = "CLIENT")]
    provider: Option<String>,

    /// The chat model that answers and extracts facts.
    ///
    /// Defaults to qwen3:4b on Ollama. Every other client needs one named.
    #[arg(long, global = true, env = "CORTEX_MODEL")]
    model: Option<String>,

    /// The address of the chat model's server, up to its API version.
    #[arg(long, global = true, env = "CORTEX_BASE", value_name = "URL")]
    base: Option<String>,

    /// The environment variable that holds the chat model's key.
    ///
    /// Defaults to the one the API documents: `ANTHROPIC_API_KEY`,
    /// `GEMINI_API_KEY`, or `OPENAI_API_KEY`. A key with ollama sends to Ollama's
    /// hosted service.
    #[arg(long, global = true, env = "CORTEX_KEY_ENV", value_name = "VARIABLE")]
    key_env: Option<String>,

    /// Count a chat or responses server as running on this machine.
    #[arg(long, global = true)]
    local: bool,

    /// The embedding client: ollama, embeddings, gemini, scripted, or none.
    ///
    /// Defaults to ollama. With none, facts have no vectors, and `ask` ranks
    /// them by the words they share with the question.
    #[arg(long, global = true, env = "CORTEX_EMBEDDER", value_name = "CLIENT")]
    embedder: Option<String>,

    /// The embedding model.
    ///
    /// Defaults to nomic-embed-text on Ollama.
    #[arg(long, global = true, env = "CORTEX_EMBED_MODEL", value_name = "MODEL")]
    embed_model: Option<String>,

    /// The address of the embedding server, up to its API version.
    #[arg(long, global = true, env = "CORTEX_EMBED_BASE", value_name = "URL")]
    embed_base: Option<String>,

    /// The environment variable that holds the embedding model's key.
    #[arg(
        long,
        global = true,
        env = "CORTEX_EMBED_KEY_ENV",
        value_name = "VARIABLE"
    )]
    embed_key_env: Option<String>,

    /// The scope new episodes are recorded in: personal, organization,
    /// project:<name>, or team:<name>.
    ///
    /// Defaults to personal.
    #[arg(long, global = true, env = "CORTEX_SCOPE")]
    scope: Option<String>,

    /// A scope to read, once for each scope.
    ///
    /// Defaults to personal and the scope you write to. A fact in any other
    /// scope is never placed.
    #[arg(
        long,
        global = true,
        env = "CORTEX_READ",
        value_delimiter = ',',
        value_name = "SCOPE"
    )]
    read: Vec<String>,

    /// The script the scripted provider and embedder answer from.
    #[arg(long, global = true, env = "CORTEX_SCRIPT", value_name = "FILE")]
    script: Option<PathBuf>,

    /// Emit machine-readable JSON on stdout.
    ///
    /// An error is JSON on stderr.
    #[arg(long, global = true)]
    json: bool,

    /// Never color the output.
    #[arg(long, global = true)]
    no_color: bool,
}

#[derive(Debug, Subcommand)]
enum Verb {
    /// Record text as episodes, one for each paragraph.
    ///
    /// Reads each file, or stdin when no file is named or a file is `-`. A
    /// paragraph is a run of lines between blank lines, and a paragraph that
    /// is only a Markdown heading is left out. Each episode records the file
    /// it came from, which `forget` takes.
    Ingest {
        /// The files to read.
        files: Vec<PathBuf>,

        /// Record each file as one episode.
        #[arg(long)]
        whole: bool,

        /// The source recorded for text from stdin, such as `slack:releases`.
        #[arg(long, value_name = "NAME")]
        source: Option<String>,

        /// When the text was written, as 2026-10-19 or an RFC 3339 time.
        ///
        /// A date is the start of that day in the local time zone. Defaults to
        /// now.
        #[arg(long, value_name = "DATE")]
        at: Option<String>,
    },
    /// Distill the episodes no pass has read into facts.
    ///
    /// The chat model reads the episodes a scope at a time, beside the facts
    /// that scope already holds, and states the facts they add. Each fact is
    /// printed with the episodes it rests on. With an embedder, each new fact
    /// gets a vector.
    Consolidate,
    /// Answer a question from the facts in the scopes you read.
    ///
    /// Recall ranks the facts by the words they share with the question, and
    /// by meaning where the facts have vectors, and places the best of them in
    /// the context. The question, the context, and the answer are recorded in
    /// Trace.
    Ask {
        /// The question.
        #[arg(required = true, num_args = 1..)]
        question: Vec<String>,

        /// The most facts to place.
        #[arg(long, default_value_t = 8, value_name = "COUNT")]
        most: usize,

        /// The least score a fact needs to be placed, from 0 to 1.
        ///
        /// A fact that scores below it is left out, however few facts are
        /// placed. Defaults to 0.3 where the facts have vectors and 0.1 by
        /// words alone. Zero places the best facts up to `--most`, related to
        /// the question or not.
        #[arg(long, value_name = "SCORE")]
        floor: Option<f32>,
    },
    /// Print how an answer was derived, back to the episodes.
    ///
    /// Prints the answer, the question, each fact the context placed with why
    /// it was placed, and the episodes under each fact. A fact's id prints the
    /// episodes it rests on, and any other trace node's id prints every node it
    /// derives from, nearest first.
    Why {
        /// An answer's id, text from the answer or its question, or `last`.
        ///
        /// Defaults to the latest answer.
        target: Option<String>,
    },
    /// Forget an episode, or every episode from a source, and what was derived
    /// from it.
    ///
    /// A fact that rests only on what you forget is removed, and so is every
    /// answer that drew on it. A fact another episode supports stays, and a
    /// fact that the forgotten one superseded is current again.
    Forget {
        /// An episode's id, a file you ingested, or a source name.
        target: String,
    },
    /// Answer a recorded question again on another model, and print what
    /// changed.
    ///
    /// Name the other model with `--model`, and its client with `--provider`
    /// where it differs. The model is given the context the first answer was
    /// given, so a difference between the two answers is the model's.
    Replay {
        /// An answer's id, text from the answer or its question, or `last`.
        ///
        /// Defaults to the latest answer.
        target: Option<String>,
    },
}

/// What `cortex --version --json` prints: the version as one JSON object that
/// names the package. `--version` alone prints the line a release is checked
/// against. The npm launcher runs a `cortex` on `PATH` only when this names
/// its package, because another program can share the name.
fn version_json(args: &[String]) -> Option<String> {
    let mut asked: Vec<&str> = args.iter().map(String::as_str).collect();
    asked.sort_unstable();
    matches!(asked.as_slice(), ["--json", "--version" | "-V"]).then(|| {
        serde_json::json!({ "name": PRODUCT, "package": PACKAGE, "version": shipped() }).to_string()
    })
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if let Some(said) = version_json(&args) {
        fusion_rules::say!("{said}");
        return;
    }
    let cli: Cli = fusion_rules::args::parse(PRODUCT);
    let json = cli.options.json;
    let paint = if json {
        Paint::never()
    } else {
        Paint::decide(PRODUCT, cli.options.no_color)
    };
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(runtime) => runtime,
        Err(error) => {
            let failure = Failure::new(Code::Internal, "cannot start", error.to_string());
            std::process::exit(report_failure(&failure, json));
        }
    };
    std::process::exit(match runtime.block_on(run(cli, paint)) {
        Ok(code) => code.as_i32(),
        Err(failure) => report_failure(&failure, json),
    });
}

/// Errors go to stderr in both modes, so stdout under `--json` is an answer
/// or nothing.
fn report_failure(failure: &Failure, json: bool) -> i32 {
    if json {
        eprintln!("{}", failure.as_json());
    } else {
        eprintln!("{}", failure.render(PRODUCT));
    }
    failure.code.as_i32()
}

fn emit<T: Serialize>(report: &T, json: bool, human: impl FnOnce(&T) -> String) {
    if json {
        let text = serde_json::to_string_pretty(report).expect("a report serializes");
        fusion_rules::say!("{text}");
    } else {
        fusion_rules::say!("{}", human(report));
    }
}

/// Notes a person should see beside the result, on stderr.
fn warn(warnings: &[String], json: bool) {
    if !json {
        for warning in warnings {
            eprintln!("{PRODUCT}: {warning}");
        }
    }
}

/// `--at` as a time: a date is the start of that day where the writer is, so
/// it prints as the same date. Where a clock change skips midnight, the day
/// starts at the first time that exists, an hour later.
fn parse_at(text: &str) -> Outcome<DateTime<Utc>> {
    if let Ok(time) = DateTime::parse_from_rfc3339(text) {
        return Ok(time.with_timezone(&Utc));
    }
    NaiveDate::parse_from_str(text, "%Y-%m-%d")
        .ok()
        .and_then(|date| {
            [NaiveTime::MIN, NaiveTime::from_hms_opt(1, 0, 0)?]
                .into_iter()
                .find_map(|time| Local.from_local_datetime(&date.and_time(time)).earliest())
        })
        .map(|time| time.with_timezone(&Utc))
        .ok_or_else(|| {
            Failure::input(
                format!("`{text}` is not a date"),
                "write a date as 2026-10-19, or a time as 2026-10-19T09:30:00Z",
            )
        })
}

/// The notes in `files`, or on stdin.
fn notes(files: &[PathBuf], whole: bool, source: Option<&str>) -> Outcome<Vec<Note>> {
    let stdin = PathBuf::from("-");
    let files = if files.is_empty() {
        std::slice::from_ref(&stdin)
    } else {
        files
    };
    let mut notes = Vec::new();
    for file in files {
        let (text, address) = if file.as_os_str() == "-" {
            let mut text = String::new();
            std::io::stdin()
                .read_to_string(&mut text)
                .map_err(|error| {
                    Failure::input("cannot read stdin", error.to_string().to_lowercase())
                })?;
            (text, source.unwrap_or("stdin").to_owned())
        } else {
            let text = std::fs::read_to_string(file).map_err(|error| {
                Failure::input(
                    format!("cannot read {}", file.display()),
                    error.to_string().to_lowercase(),
                )
            })?;
            (text, source::file(file))
        };
        if whole {
            let text = text.trim();
            if !text.is_empty() {
                notes.push(Note {
                    source: address,
                    text: text.to_owned(),
                });
            }
        } else {
            for (number, paragraph) in source::paragraphs(&text).into_iter().enumerate() {
                notes.push(Note {
                    source: format!("{address}#{}", number + 1),
                    text: paragraph,
                });
            }
        }
    }
    Ok(notes)
}

async fn run(cli: Cli, paint: Paint) -> Outcome<Code> {
    let options = cli.options;
    let json = options.json;
    let settings = Settings::resolve(Given {
        base: options.base,
        config: options.config,
        embed_base: options.embed_base,
        embed_key_env: options.embed_key_env,
        embed_model: options.embed_model,
        embedder: options.embedder,
        key_env: options.key_env,
        local: options.local,
        model: options.model,
        provider: options.provider,
        read: options.read,
        scope: options.scope,
        script: options.script,
        store: options.store,
    })?;
    let memory = Memory::open(&settings.store).await?;
    match cli.verb {
        Verb::Ingest {
            files,
            whole,
            source,
            at,
        } => {
            let at = at.as_deref().map(parse_at).transpose()?;
            let notes = notes(&files, whole, source.as_deref())?;
            if notes.is_empty() {
                return Err(Failure::input(
                    "nothing to record",
                    "the text holds no paragraph",
                ));
            }
            let report = memory.ingest(notes, &settings.scope, at).await?;
            emit(&report, json, |report| {
                render::ingested(report, &settings, paint)
            });
            Ok(Code::Ok)
        }
        Verb::Consolidate => {
            let provider = models::provider(&settings.provider, &settings)?;
            let embedder = models::embedder(&settings)?;
            let report = memory
                .consolidate(provider.as_ref(), embedder.as_deref())
                .await?;
            warn(&report.warnings, json);
            emit(&report, json, |report| render::consolidated(report, paint));
            Ok(if report.failed.is_empty() {
                Code::Ok
            } else {
                Code::Failed
            })
        }
        Verb::Ask {
            question,
            most,
            floor,
        } => {
            let question = question.join(" ");
            let provider = models::provider(&settings.provider, &settings)?;
            let embedder = models::embedder(&settings)?;
            let report = memory
                .ask(
                    &question,
                    provider.as_ref(),
                    embedder.as_deref(),
                    &settings.read,
                    most,
                    floor,
                )
                .await?;
            warn(&report.warnings, json);
            emit(&report, json, |report| render::asked(report, paint));
            Ok(Code::Ok)
        }
        Verb::Why { target } => {
            let report = memory.why(target.as_deref()).await?;
            emit(&report, json, |report| render::why(report, paint));
            Ok(Code::Ok)
        }
        Verb::Forget { target } => {
            let report = memory.forget(&target).await?;
            emit(&report, json, |report| render::forgot(report, paint));
            Ok(Code::Ok)
        }
        Verb::Replay { target } => {
            let provider = models::provider(&settings.provider, &settings)?;
            let report = memory.replay(target.as_deref(), provider.as_ref()).await?;
            emit(&report, json, |report| render::replayed(report, paint));
            Ok(Code::Ok)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_date_prints_as_the_day_it_names() {
        for day in [
            "2026-01-01",
            "2026-03-08",
            "2026-10-19",
            "2026-11-01",
            "2026-12-31",
        ] {
            let printed = render::date(parse_at(day).unwrap());
            let named = NaiveDate::parse_from_str(day, "%Y-%m-%d").unwrap();
            assert_eq!(printed, named.format("%B %-d, %Y").to_string(), "{day}");
        }
    }

    #[test]
    fn a_time_keeps_its_offset() {
        assert_eq!(
            parse_at("2026-10-19T09:30:00-07:00").unwrap().to_rfc3339(),
            "2026-10-19T16:30:00+00:00"
        );
    }
}
