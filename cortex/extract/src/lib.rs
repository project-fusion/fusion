//! Typed extraction: a model's reply as a Rust value, or an error that says why
//! it is not one.
//!
//! **Ask for a schema, then check the reply against it anyway.** [`extract`]
//! sends the schema twice, in the prompt and as the request's
//! [`Format`](fusion_cortex_core::provider::Format) for an API that decodes under
//! one, and validates whatever comes back. A small local model writes broken
//! JSON often enough that the check is what makes its reply usable, and an API
//! that takes a schema may enforce only part of it.
//!
//! **One retry, quoting what failed.** A reply that fails goes back to the
//! model with each violation listed, once. A second failure is an
//! [`Error::Invalid`] that carries both lists, so a caller can tell a model
//! that misread the schema from one that cannot write JSON at all.
//!
//! **Every step is a Trace node.** The request is a context, each reply an
//! output, each check a validation, and the accepted value an extraction, so
//! `why()` on the value walks back to the input it came from. This crate
//! writes no store: it returns the nodes, parents first, for the caller to
//! append, and a failed extraction returns the nodes it wrote too.

use std::time::Instant;

use fusion_cortex_core::{
    provider::{Format, Message, Provider, Request, Response, Role, Stop},
    Id,
};
use fusion_cortex_trace::{Call, Detail, Node, Validation};
use serde::de::DeserializeOwned;
use serde_json::Value;

pub use fusion_cortex_trace::Violation;
pub use schemars::JsonSchema;

/// The name a context node records for this request.
pub const STRATEGY: &str = "extract/1";

/// The JSON a value is, as JSON Schema, by a name the APIs accept.
///
/// ```
/// use fusion_cortex_extract::{JsonSchema, Schema};
///
/// #[derive(JsonSchema, serde::Deserialize)]
/// struct Fact {
///     statement: String,
///     #[schemars(range(min = 0.0, max = 1.0))]
///     confidence: f64,
/// }
///
/// let schema = Schema::of::<Fact>("fact").unwrap();
///
/// assert_eq!(schema.json()["required"], serde_json::json!(["statement", "confidence"]));
/// let errors = schema.check(&serde_json::json!({ "statement": "0.11 shipped", "confidence": 2 }));
/// assert_eq!(errors[0].at, "/confidence");
/// ```
#[derive(Clone, Debug)]
pub struct Schema {
    json: Value,
    name: String,
    validator: jsonschema::Validator,
}

/// A schema that cannot be used.
#[derive(Debug, thiserror::Error)]
pub enum SchemaError {
    /// The name has a character some API refuses.
    #[error("{0:?} is not a schema name: use 1 to 64 letters, digits, `_` and `-`")]
    Name(String),

    /// The JSON is not a schema the validator can compile.
    #[error("the schema {name} is not JSON Schema: {message}")]
    Invalid { message: String, name: String },
}

impl Schema {
    /// The schema of `T`, derived from its type, with each subschema written
    /// in place. A small model follows a schema it can read top to bottom
    /// more reliably than one that refers to definitions elsewhere.
    ///
    /// # Errors
    ///
    /// [`SchemaError::Name`] if `name` has a character some API refuses.
    pub fn of<T: JsonSchema>(name: impl Into<String>) -> Result<Self, SchemaError> {
        let json = schemars::generate::SchemaSettings::draft2020_12()
            .with(|settings| {
                settings.inline_subschemas = true;
                // Models read the schema, and the URL of its draft tells them
                // nothing. The validator assumes this draft without it.
                settings.meta_schema = None;
            })
            .into_generator()
            .into_root_schema_for::<T>()
            .to_value();
        Self::new(name, json)
    }

    /// A schema written by hand.
    ///
    /// # Errors
    ///
    /// [`SchemaError::Name`] if `name` has a character some API refuses, and
    /// [`SchemaError::Invalid`] if `json` is not JSON Schema.
    pub fn new(name: impl Into<String>, json: Value) -> Result<Self, SchemaError> {
        let name = name.into();
        let accepted = (1..=64).contains(&name.len())
            && name
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
        if !accepted {
            return Err(SchemaError::Name(name));
        }
        let validator = jsonschema::validator_for(&json).map_err(|error| SchemaError::Invalid {
            message: error.to_string(),
            name: name.clone(),
        })?;
        Ok(Self {
            json,
            name,
            validator,
        })
    }

    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    #[must_use]
    pub fn json(&self) -> &Value {
        &self.json
    }

    /// The schema as a request asks for it.
    #[must_use]
    pub fn format(&self) -> Format {
        Format {
            name: self.name.clone(),
            schema: self.json.clone(),
        }
    }

    /// Every way `value` breaks the schema, in the order the validator finds
    /// them. Empty where it matches.
    #[must_use]
    pub fn check(&self, value: &Value) -> Vec<Violation> {
        self.validator
            .iter_errors(value)
            .map(|error| Violation {
                at: error.instance_path().as_str().to_owned(),
                message: error.to_string(),
            })
            .collect()
    }
}

/// What to ask the model for.
#[derive(Clone, Debug)]
pub struct Prompt {
    /// The instruction, such as `List each fact the note states.`
    pub text: String,
    /// The prompt's name and version, which each output records, such as
    /// `facts/v1`.
    pub version: String,
}

/// A value a model wrote and its schema accepted, and the record of how.
///
/// ```
/// # use fusion_cortex_core::provider::{Block, Response, Scripted, Stop, Usage};
/// # use fusion_cortex_extract::{extract, JsonSchema, Prompt, Schema};
/// # use fusion_cortex_trace::{Detail, Graph, Node, NodeKind};
/// # #[derive(JsonSchema, serde::Deserialize)]
/// # struct Release { version: String, day: u32 }
/// # #[tokio::main]
/// # async fn main() {
/// # let schema = Schema::of::<Release>("release").unwrap();
/// # let prompt = Prompt { text: "Which release does the note describe?".into(), version: "release/v1".into() };
/// # let reply = Response { content: vec![Block::text(r#"{"version": "0.11.0", "day": 8}"#)], id: None, model: "scripted/1".into(), stop: Stop::EndTurn, usage: Usage::default() };
/// # let provider = Scripted::new("scripted/1", vec![Ok(reply)]);
/// let mut graph = Graph::new();
/// let note = graph.insert(Node::new(
///     Detail::Source { content: "0.11.0 shipped on the 8th.".into(), uri: None },
///     vec![],
/// ));
///
/// let release = extract::<Release>(&provider, &prompt, &schema, "0.11.0 shipped on the 8th.", &[note])
///     .await
///     .unwrap();
/// for node in release.nodes {
///     graph.insert(node);
/// }
///
/// // The value, the check that passed it, the reply, the request, and the note.
/// let why: Vec<NodeKind> = graph.why(release.id).iter().map(|node| node.kind()).collect();
/// assert_eq!(why, [NodeKind::Extraction, NodeKind::Validation, NodeKind::Output, NodeKind::Context, NodeKind::Source]);
/// # }
/// ```
#[derive(Clone, Debug)]
pub struct Extraction<T> {
    /// How many replies it took: one, or two where the retry repaired the
    /// first.
    pub attempts: u32,
    /// The extraction node, which holds the accepted value. `why()` on it
    /// reaches the input.
    pub id: Id,
    /// Every node the extraction wrote, each after the nodes it derives from,
    /// for the caller to append to its trace.
    pub nodes: Vec<Node>,
    pub value: T,
}

/// Why an extraction produced no value.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The provider failed before a reply arrived. `nodes` holds what was
    /// written up to the failed call.
    #[error("provider: {error}")]
    Provider {
        error: fusion_cortex_core::Error,
        nodes: Vec<Node>,
    },

    /// The reply failed the schema, and so did the retry.
    #[error(
        "the reply did not match {schema} on either attempt. The first: {}. The second: {}.",
        listed(first),
        listed(second)
    )]
    Invalid {
        first: Vec<Violation>,
        /// Every node written, both failed validations included.
        nodes: Vec<Node>,
        schema: String,
        second: Vec<Violation>,
    },
}

impl Error {
    /// The nodes written before the extraction failed, for the caller to
    /// append: a trace of a failed attempt is still a trace of what was
    /// asked.
    #[must_use]
    pub fn nodes(&self) -> &[Node] {
        match self {
            Self::Provider { nodes, .. } | Self::Invalid { nodes, .. } => nodes,
        }
    }
}

fn listed(violations: &[Violation]) -> String {
    violations
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join("; ")
}

/// Asks `provider` for the value of `T` that `input` holds, by `schema`.
///
/// `sources` are the trace nodes `input` came from, such as an episode's, and
/// the request's context node derives from them.
///
/// ```
/// # use fusion_cortex_core::provider::{Block, Response, Scripted, Stop, Usage};
/// # use fusion_cortex_extract::{extract, JsonSchema, Prompt, Schema};
/// # fn reply(text: &str) -> Response {
/// #     Response { content: vec![Block::text(text)], id: None, model: "scripted/1".into(), stop: Stop::EndTurn, usage: Usage::default() }
/// # }
/// # #[tokio::main]
/// # async fn main() {
/// #[derive(Debug, JsonSchema, serde::Deserialize)]
/// struct Release {
///     version: String,
///     day: u32,
/// }
///
/// let schema = Schema::of::<Release>("release").unwrap();
/// let prompt = Prompt { text: "Which release does the note describe?".into(), version: "release/v1".into() };
/// // The first reply leaves out a field, and the retry puts it back.
/// let provider = Scripted::new("scripted/1", vec![
///     Ok(reply(r#"{"version": "0.11.0"}"#)),
///     Ok(reply(r#"{"version": "0.11.0", "day": 8}"#)),
/// ]);
///
/// let release = extract::<Release>(&provider, &prompt, &schema, "0.11.0 shipped on the 8th.", &[])
///     .await
///     .unwrap();
///
/// assert_eq!(release.value.day, 8);
/// assert_eq!(release.attempts, 2);
/// assert!(provider.requests()[1].messages[3].joined().contains("\"day\" is a required property"));
/// # }
/// ```
///
/// # Errors
///
/// [`Error::Provider`] if a call fails, and [`Error::Invalid`] if the reply
/// and its retry both fail the schema.
pub async fn extract<T: DeserializeOwned>(
    provider: &dyn Provider,
    prompt: &Prompt,
    schema: &Schema,
    input: &str,
    sources: &[Id],
) -> Result<Extraction<T>, Error> {
    let mut nodes = Vec::new();
    let mut messages = vec![
        Message::text(Role::System, instruction(prompt, schema)),
        Message::text(Role::User, input),
    ];
    let mut parents = sources.to_vec();
    let mut first = None;

    for attempt in 1..=2 {
        let context = push(
            &mut nodes,
            Detail::Context {
                dropped: Vec::new(),
                format: Some(schema.format()),
                messages: messages.clone(),
                placed: Vec::new(),
                strategy: STRATEGY.to_owned(),
                tools: Vec::new(),
            },
            parents,
        );
        let request = Request {
            format: Some(schema.format()),
            messages: messages.clone(),
            ..Request::default()
        };
        let started = Instant::now();
        let response = match provider.complete(&request).await {
            Ok(response) => response,
            Err(error) => return Err(Error::Provider { error, nodes }),
        };
        let output = push(
            &mut nodes,
            output(provider, prompt, &response, started),
            vec![context],
        );

        let (errors, value) = match judge::<T>(schema, &response) {
            Ok((json, value)) => (Vec::new(), Some((json, value))),
            Err(errors) => (errors, None),
        };
        let validation = push(
            &mut nodes,
            Detail::Validation(Validation {
                attempt,
                errors: errors.clone(),
                schema: schema.name().to_owned(),
            }),
            vec![output],
        );

        if let Some((json, value)) = value {
            let id = push(
                &mut nodes,
                Detail::Extraction {
                    schema: schema.name().to_owned(),
                    value: json,
                },
                vec![validation],
            );
            return Ok(Extraction {
                attempts: attempt,
                id,
                nodes,
                value,
            });
        }

        let Some(earlier) = first.take() else {
            messages.push(response.message());
            messages.push(Message::text(Role::User, feedback(&errors)));
            parents = vec![context, validation];
            first = Some(errors);
            continue;
        };
        return Err(Error::Invalid {
            first: earlier,
            nodes,
            schema: schema.name().to_owned(),
            second: errors,
        });
    }

    unreachable!("the second attempt returns either way")
}

fn push(nodes: &mut Vec<Node>, detail: Detail, parents: Vec<Id>) -> Id {
    let node = Node::new(detail, parents);
    let id = node.id;
    nodes.push(node);
    id
}

/// The system prompt: the caller's instruction, and the schema written out,
/// which a model reads whether or not its API also decodes under it.
fn instruction(prompt: &Prompt, schema: &Schema) -> String {
    let written = serde_json::to_string_pretty(schema.json()).unwrap_or_default();
    format!(
        "{}\n\nReply with one JSON value that matches this JSON Schema, and nothing else:\n\n{written}",
        prompt.text
    )
}

/// What the retry tells the model about its first reply.
fn feedback(errors: &[Violation]) -> String {
    let lines: Vec<String> = errors.iter().map(|error| format!("- {error}")).collect();
    format!(
        "That reply does not match the schema:\n\n{}\n\nReply again with only the corrected JSON.",
        lines.join("\n")
    )
}

fn output(
    provider: &dyn Provider,
    prompt: &Prompt,
    response: &Response,
    started: Instant,
) -> Detail {
    Detail::Output {
        call: Some(Call {
            blocks: response.content.clone(),
            cost: None,
            elapsed_ms: u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
            local: provider.is_local(),
            profile: None,
            provider: provider.id().to_owned(),
            stop: response.stop.clone(),
            usage: response.usage,
        }),
        content: response.joined(),
        input_tokens: response.usage.input,
        model: response.model.clone(),
        output_tokens: response.usage.output,
        prompt_version: prompt.version.clone(),
    }
}

/// The reply's JSON and the value it becomes, or every way it falls short.
///
/// The schema is checked first because it reports every violation at once,
/// with where each one is, and a retry repairs more from a full list. The
/// conversion to `T` runs after it, and catches what the schema did not say.
fn judge<T: DeserializeOwned>(
    schema: &Schema,
    response: &Response,
) -> Result<(Value, T), Vec<Violation>> {
    let whole = |message: String| Violation {
        at: String::new(),
        message,
    };
    let mut errors = Vec::new();
    match response.stop {
        Stop::MaxTokens => errors.push(whole(
            "the reply stopped at its token limit before it finished".into(),
        )),
        Stop::Refusal => errors.push(whole("the model declined to reply".into())),
        _ => {}
    }
    let json = match parse(&response.joined()) {
        Ok(json) => json,
        Err(error) => {
            errors.push(whole(format!("the reply is not JSON: {error}")));
            return Err(errors);
        }
    };
    let broken = schema.check(&json);
    if !broken.is_empty() {
        return Err(broken);
    }
    match serde_json::from_value::<T>(json.clone()) {
        Ok(value) => Ok((json, value)),
        Err(error) => Err(vec![whole(error.to_string())]),
    }
}

/// The JSON in a reply. A model asked for nothing but JSON still wraps it in a
/// code fence or a sentence often, so a reply that does not parse whole is
/// read from its first bracket to its last.
fn parse(reply: &str) -> serde_json::Result<Value> {
    let trimmed = reply.trim();
    let fenced = trimmed
        .strip_prefix("```")
        .and_then(|rest| rest.split_once('\n'))
        .and_then(|(_, body)| body.trim_end().strip_suffix("```"))
        .map_or(trimmed, str::trim);
    let error = match serde_json::from_str(fenced) {
        Ok(value) => return Ok(value),
        Err(error) => error,
    };
    let start = fenced.find(['{', '[']);
    let end = fenced.rfind(['}', ']']);
    match (start, end) {
        (Some(start), Some(end)) if start < end => {
            serde_json::from_str(&fenced[start..=end]).map_err(|_| error)
        }
        _ => Err(error),
    }
}

#[cfg(test)]
mod tests {
    use fusion_cortex_core::provider::{Block, Scripted, Usage};
    use fusion_cortex_trace::{Graph, NodeKind};
    use serde::Deserialize;

    use super::*;

    #[derive(Debug, Deserialize, JsonSchema, PartialEq)]
    struct Fact {
        statement: String,
        #[schemars(range(min = 0.0, max = 1.0))]
        confidence: f64,
    }

    #[derive(Debug, Deserialize, JsonSchema, PartialEq)]
    struct Facts {
        facts: Vec<Fact>,
    }

    const NOTE: &str = "We shipped 0.11.0 on the 8th. Dana owns the release notes.";
    const VALID: &str =
        r#"{"facts": [{"statement": "0.11.0 shipped on the 8th", "confidence": 0.9}]}"#;

    fn reply(text: &str) -> Response {
        Response {
            content: vec![Block::text(text)],
            id: None,
            model: "scripted/1".into(),
            stop: Stop::EndTurn,
            usage: Usage {
                input: 40,
                output: 12,
                ..Usage::default()
            },
        }
    }

    fn prompt() -> Prompt {
        Prompt {
            text: "List each fact the note states, with how sure the note is of it.".into(),
            version: "facts/v1".into(),
        }
    }

    fn schema() -> Schema {
        Schema::of::<Facts>("facts").unwrap()
    }

    async fn run(provider: &Scripted, sources: &[Id]) -> Result<Extraction<Facts>, Error> {
        extract::<Facts>(provider, &prompt(), &schema(), NOTE, sources).await
    }

    fn kinds(nodes: &[Node]) -> Vec<NodeKind> {
        nodes.iter().map(Node::kind).collect()
    }

    #[tokio::test]
    async fn a_valid_first_reply_is_the_value() {
        let provider = Scripted::new("scripted/1", vec![Ok(reply(VALID))]);

        let facts = run(&provider, &[]).await.unwrap();

        assert_eq!(facts.attempts, 1);
        assert_eq!(facts.value.facts[0].statement, "0.11.0 shipped on the 8th");
        let sent = &provider.requests()[0];
        assert_eq!(
            sent.format,
            Some(schema().format()),
            "the API is asked natively too"
        );
        assert!(
            sent.messages[0].joined().contains("\"confidence\""),
            "the prompt writes the schema out"
        );
        assert_eq!(sent.messages[1].joined(), NOTE);
        assert_eq!(
            kinds(&facts.nodes),
            vec![
                NodeKind::Context,
                NodeKind::Output,
                NodeKind::Validation,
                NodeKind::Extraction
            ]
        );
    }

    #[tokio::test]
    async fn a_reply_in_a_fence_or_a_sentence_still_reads() {
        for wrapped in [
            format!("```json\n{VALID}\n```"),
            format!("Here are the facts:\n{VALID}\nThat is all."),
        ] {
            let provider = Scripted::new("scripted/1", vec![Ok(reply(&wrapped))]);

            let facts = run(&provider, &[]).await.unwrap();

            assert_eq!(facts.attempts, 1, "{wrapped}");
        }
    }

    #[tokio::test]
    async fn an_invalid_reply_is_repaired_by_the_retry_that_quotes_its_errors() {
        let broken =
            r#"{"facts": [{"statement": "0.11.0 shipped on the 8th", "confidence": 1.5}]}"#;
        let provider = Scripted::new("scripted/1", vec![Ok(reply(broken)), Ok(reply(VALID))]);

        let facts = run(&provider, &[]).await.unwrap();

        assert_eq!(facts.attempts, 2);
        assert!((facts.value.facts[0].confidence - 0.9).abs() < f64::EPSILON);
        let retry = &provider.requests()[1];
        assert_eq!(
            retry.messages.len(),
            4,
            "the first reply and the errors follow the input"
        );
        assert_eq!(retry.messages[2].joined(), broken);
        let quoted = retry.messages[3].joined();
        assert!(
            quoted.contains("/facts/0/confidence: 1.5 is greater than the maximum of 1"),
            "{quoted}"
        );
    }

    #[tokio::test]
    async fn a_reply_that_is_not_json_says_so() {
        let provider = Scripted::new(
            "scripted/1",
            vec![Ok(reply("0.11.0 shipped on the 8th.")), Ok(reply(VALID))],
        );

        run(&provider, &[]).await.unwrap();

        let quoted = provider.requests()[1].messages[3].joined();
        assert!(quoted.contains("- the reply is not JSON"), "{quoted}");
    }

    #[tokio::test]
    async fn a_second_failure_reports_both_errors() {
        let provider = Scripted::new(
            "scripted/1",
            vec![
                Ok(reply(r#"{"facts": "none"}"#)),
                Ok(reply(r#"{"fact": []}"#)),
            ],
        );

        let error = run(&provider, &[]).await.unwrap_err();

        let Error::Invalid {
            first,
            second,
            nodes,
            schema,
        } = &error
        else {
            panic!("{error}")
        };
        assert_eq!(schema, "facts");
        assert_eq!(first[0].at, "/facts");
        assert!(
            second[0]
                .message
                .contains("\"facts\" is a required property"),
            "{second:?}"
        );
        let message = error.to_string();
        assert!(
            message.contains("The first: /facts: \"none\" is not of type \"array\"")
                && message.contains("The second: \"facts\" is a required property"),
            "{message}"
        );
        assert_eq!(
            kinds(nodes),
            vec![
                NodeKind::Context,
                NodeKind::Output,
                NodeKind::Validation,
                NodeKind::Context,
                NodeKind::Output,
                NodeKind::Validation
            ],
            "both attempts are recorded, and no value"
        );
    }

    #[tokio::test]
    async fn a_value_the_type_refuses_is_a_violation_too() {
        // The schema allows any confidence; the type does not, so the check
        // that catches it is the conversion.
        let loose = Schema::new(
            "facts",
            serde_json::json!({ "properties": { "facts": { "type": "array" } }, "type": "object" }),
        )
        .unwrap();
        let provider = Scripted::new(
            "scripted/1",
            vec![
                Ok(reply(r#"{"facts": [{"statement": 1}]}"#)),
                Ok(reply(VALID)),
            ],
        );

        let facts = extract::<Facts>(&provider, &prompt(), &loose, NOTE, &[])
            .await
            .unwrap();

        assert_eq!(facts.attempts, 2);
        let quoted = provider.requests()[1].messages[3].joined();
        assert!(
            quoted.contains("invalid type: integer `1`, expected a string"),
            "{quoted}"
        );
    }

    #[tokio::test]
    async fn a_failed_call_returns_the_nodes_written_before_it() {
        let provider = Scripted::new("scripted/1", vec![Ok(reply("not json"))]);

        let error = run(&provider, &[]).await.unwrap_err();

        assert!(matches!(error, Error::Provider { .. }), "{error}");
        assert_eq!(
            kinds(error.nodes()),
            vec![
                NodeKind::Context,
                NodeKind::Output,
                NodeKind::Validation,
                NodeKind::Context
            ]
        );
    }

    #[tokio::test]
    async fn why_reaches_the_input_from_the_value() {
        let mut graph = Graph::new();
        let note = graph.insert(Node::new(
            Detail::Source {
                content: NOTE.into(),
                uri: None,
            },
            vec![],
        ));
        let provider = Scripted::new(
            "scripted/1",
            vec![Ok(reply(r#"{"facts": 1}"#)), Ok(reply(VALID))],
        );

        let facts = run(&provider, &[note]).await.unwrap();
        for node in facts.nodes {
            graph.insert(node);
        }

        let why: Vec<&Node> = graph.why(facts.id);
        assert_eq!(
            why.iter().map(|node| node.kind()).collect::<Vec<_>>(),
            vec![
                NodeKind::Extraction,
                NodeKind::Validation,
                NodeKind::Output,
                NodeKind::Context,
                // The retry's context derives from the first request and the
                // check that failed it.
                NodeKind::Context,
                NodeKind::Validation,
                NodeKind::Source,
                NodeKind::Output,
            ]
        );
        assert_eq!(why[6].id, note, "the value traces to the note");
        let Detail::Extraction { schema, value } = &why[0].detail else {
            panic!("the value comes first")
        };
        assert_eq!(schema, "facts");
        assert_eq!(value["facts"][0]["confidence"], 0.9);
        let Detail::Validation(failed) = &why[5].detail else {
            panic!("the failed check is a cause of the retry")
        };
        assert_eq!((failed.attempt, failed.passed()), (1, false));
        let Detail::Output {
            call: Some(call),
            prompt_version,
            ..
        } = &why[2].detail
        else {
            panic!("an output records its call")
        };
        assert_eq!(prompt_version, "facts/v1");
        assert_eq!(call.provider, "scripted/1");
        assert_eq!(graph.plan(facts.id).last(), Some(&facts.id));
    }

    #[test]
    fn a_name_some_api_refuses_is_refused_here() {
        for name in ["", "two words", "café", &"x".repeat(65)] {
            assert!(
                matches!(Schema::of::<Facts>(name), Err(SchemaError::Name(_))),
                "{name:?}"
            );
        }
        assert!(matches!(
            Schema::new("facts", serde_json::json!({ "type": "nothing" })),
            Err(SchemaError::Invalid { .. })
        ));
    }
}
