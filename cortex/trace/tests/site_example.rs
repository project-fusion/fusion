//! The example trace the Cortex page draws, built with Trace and Engram.
//!
//! **The page draws what these crates produce.** Each node is a Trace node
//! made with [`Graph::insert`], each fact an Engram fact made with
//! [`Memory::assert_fact`], and the deletion the page shows is
//! [`Graph::delete_cascade`]'s own answer. A drawing typed by hand had already
//! drifted from the model three ways: a memory drawn per fact where Trace cites
//! facts by id, a superseded fact that nothing had used, and a cascade worked
//! out in TypeScript.
//!
//! The page reads `fusion/site/content/cortex/trace-example.json`, compared
//! here as JSON, so formatting the file changes nothing. After changing the
//! example, rewrite it deliberately:
//!
//! ```text
//! CORTEX_WRITE_SITE_EXAMPLE=1 cargo test -p fusion-cortex-trace --test site_example -- --ignored write
//! ```

use fusion_cortex_core::provider::{Message, Role};
use fusion_cortex_core::Id;
use fusion_cortex_engram::{Episode, Fact, Memory};
use fusion_cortex_trace::{Detail, Graph, Node};
use serde_json::{json, Value};

/// Where the page reads the example.
const SITE_FILE: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../fusion/site/content/cortex/trace-example.json"
);

/// The model and prompt every answer in the example was produced by.
const MODEL: &str = "local/llama-3.3-70b";
const PROMPT: &str = "answer/v3";

/// The memory the page's button deletes.
const DELETED: &str = "m-price";

/// One thing the page draws: a Trace node, or an Engram fact.
struct Drawn {
    id: Id,
    kind: &'static str,
    label: &'static str,
    name: &'static str,
}

/// A trace and the memory it cites, with a name for everything in them.
#[derive(Default)]
struct Example {
    drawn: Vec<Drawn>,
    graph: Graph,
    memory: Memory,
    /// Each episode recorded, and the fact distilled from it.
    recorded: Vec<(Id, &'static str)>,
}

impl Example {
    fn id(&self, name: &str) -> Id {
        self.drawn
            .iter()
            .find(|one| one.name == name)
            .unwrap_or_else(|| panic!("{name} is not in the example"))
            .id
    }

    fn name(&self, id: Id) -> &'static str {
        self.drawn
            .iter()
            .find(|one| one.id == id)
            .expect("every id in the example is named")
            .name
    }

    /// A Trace node, derived from the nodes named in `from`.
    fn node(&mut self, name: &'static str, label: &'static str, detail: Detail, from: &[&str]) {
        let kind = match &detail {
            Detail::Source { .. } => "source",
            Detail::Memory { .. } => "memory",
            Detail::Context { .. } => "context",
            Detail::ToolCall { .. } => "tool_call",
            Detail::Output { .. } => "output",
        };
        let derived_from = from.iter().map(|one| self.id(one)).collect();
        let id = self.graph.insert(Node::new(detail, derived_from));
        self.drawn.push(Drawn {
            id,
            kind,
            label,
            name,
        });
    }

    /// A question asked, or a document taken in: a source.
    fn source(&mut self, name: &'static str, label: &'static str, uri: Option<&str>) {
        let detail = Detail::Source {
            content: label.to_owned(),
            uri: uri.map(str::to_owned),
        };
        self.node(name, label, detail, &[]);
    }

    /// An Engram fact distilled from one episode of a source, superseding the
    /// fact named in `supersedes`.
    fn fact(
        &mut self,
        name: &'static str,
        label: &'static str,
        source: &str,
        supersedes: Option<&str>,
    ) {
        let episode = self.memory.record(Episode::new(label, self.id(source)));
        self.recorded.push((episode, name));
        let replaced = supersedes.map(|one| self.id(one));
        let id = self
            .memory
            .assert_fact(Fact::new(label, vec![episode], 0.9), replaced);
        self.drawn.push(Drawn {
            id,
            kind: "fact",
            label,
            name,
        });
    }

    /// A retrieval for a question, citing facts by id, as Trace's memory nodes do.
    fn retrieval(
        &mut self,
        name: &'static str,
        label: &'static str,
        question: &str,
        facts: &[&str],
    ) {
        let fact_ids = facts.iter().map(|one| self.id(one)).collect();
        self.node(name, label, Detail::Memory { fact_ids }, &[question]);
    }

    /// The messages assembled for a question from what was retrieved for it.
    fn context(&mut self, name: &'static str, label: &'static str, question: &str, from: &[&str]) {
        let messages = vec![
            Message {
                content: "Answer from the facts given.".to_owned(),
                role: Role::System,
            },
            Message {
                content: question.to_owned(),
                role: Role::User,
            },
        ];
        let detail = Detail::Context {
            messages,
            strategy: "recency".to_owned(),
        };
        self.node(name, label, detail, from);
    }

    fn output(&mut self, name: &'static str, label: &'static str, context: &str) {
        let detail = Detail::Output {
            content: label.trim_matches(['“', '”']).to_owned(),
            input_tokens: 412,
            model: MODEL.to_owned(),
            output_tokens: 9,
            prompt_version: PROMPT.to_owned(),
        };
        self.node(name, label, detail, &[context]);
    }

    /// A tool called for a question, drawn by the tool's name.
    fn tool(
        &mut self,
        name: &'static str,
        tool: &'static str,
        arguments: Value,
        result: Value,
        question: &str,
    ) {
        let detail = Detail::ToolCall {
            arguments,
            name: tool.to_owned(),
            result: Some(result),
        };
        self.node(name, tool, detail, &[question]);
    }
}

/// Four answers a support assistant gave, and everything each was derived from.
fn example() -> Example {
    let mut example = Example::default();
    take_in(&mut example);
    answer(&mut example);
    example
}

/// What came in: the questions, the documents, and the facts Engram kept from them.
fn take_in(example: &mut Example) {
    /* In the order the page draws them down their column, each question beside
    the documents its answer drew on, so the links cross as little as they can. */
    example.source("q-release", "When did 0.11 ship?", None);
    example.source("s-release", "Release notes", Some("docs/releases/0.11"));
    example.source("q-price-september", "What does Pro cost?", None);
    example.source(
        "s-pricing-september",
        "September pricing",
        Some("docs/pricing"),
    );
    example.source("q-price", "What will my plan cost?", None);
    example.source("s-pricing", "October pricing", Some("docs/pricing"));
    example.source("s-chat", "Support chat", Some("chat/4182"));
    example.source("q-refund", "Can I get a refund?", None);
    example.source("s-refunds", "Refund policy", Some("docs/refunds"));

    example.fact("f-shipped", "Shipped October 8", "s-release", None);
    example.fact("f-export", "Fixes the export bug", "s-release", None);
    example.fact(
        "f-price-september",
        "Pro is $15 a seat",
        "s-pricing-september",
        None,
    );
    /* **Superseded and kept.** The October price replaces the September one,
    which Engram retains: the September answer is explained by it. */
    example.fact(
        "f-price",
        "Pro is $20 a seat",
        "s-pricing",
        Some("f-price-september"),
    );
    example.fact("f-plan", "On the Pro plan", "s-chat", None);
    example.fact("f-email", "Prefers email", "s-chat", None);
    example.fact("f-refunds", "Refunds in 30 days", "s-refunds", None);
}

/// What was done with it: a retrieval for each question, the tools called, the
/// context assembled, and the answer.
fn answer(example: &mut Example) {
    example.retrieval(
        "m-release",
        "Release retrieval",
        "q-release",
        &["f-shipped", "f-export"],
    );
    example.retrieval(
        "m-price-september",
        "September price retrieval",
        "q-price-september",
        &["f-price-september", "f-plan"],
    );
    example.retrieval(
        "m-price",
        "October price retrieval",
        "q-price",
        &["f-price", "f-plan"],
    );
    example.retrieval(
        "m-refund",
        "Refund retrieval",
        "q-refund",
        &["f-refunds", "f-email"],
    );

    example.tool(
        "t-search-docs",
        "search_docs",
        json!({ "query": "Pro plan price" }),
        json!({ "uri": "docs/pricing" }),
        "q-price",
    );
    example.tool(
        "t-lookup-account",
        "lookup_account",
        json!({ "account": "4182" }),
        json!({ "plan": "pro", "seats": 1 }),
        "q-price",
    );

    example.context(
        "c-release",
        "Release context",
        "When did 0.11 ship?",
        &["q-release", "m-release"],
    );
    example.context(
        "c-price-september",
        "September pricing context",
        "What does Pro cost?",
        &["q-price-september", "m-price-september"],
    );
    example.context(
        "c-price",
        "October pricing context",
        "What will my plan cost?",
        &["q-price", "m-price", "t-search-docs", "t-lookup-account"],
    );
    example.context(
        "c-refund",
        "Refund context",
        "Can I get a refund?",
        &["q-refund", "m-refund"],
    );

    example.output("o-release", "“Shipped on the 8th.”", "c-release");
    example.output(
        "o-price-september",
        "“Pro is $15 a seat.”",
        "c-price-september",
    );
    example.output("o-price", "“Pro is $20 a seat.”", "c-price");
    example.output("o-refund", "“Within 30 days.”", "c-refund");
}

/// The example as the page reads it: what is drawn, the links between, and
/// what deleting one memory removes.
fn site_json(example: &Example) -> Value {
    let current: Vec<Id> = example
        .memory
        .current_facts()
        .iter()
        .map(|fact| fact.id)
        .collect();
    let nodes: Vec<Value> = example
        .drawn
        .iter()
        .map(|one| {
            let mut node = json!({ "id": one.name, "kind": one.kind, "label": one.label });
            if one.kind == "fact" && !current.contains(&one.id) {
                node["superseded"] = json!(true);
            }
            node
        })
        .collect();

    let mut links = Vec::new();
    /* An Engram fact is linked from the source its episode was recorded from,
    by the episode's `trace_id`. */
    for episode in example.memory.episodes() {
        let (_, fact) = example
            .recorded
            .iter()
            .find(|(id, _)| *id == episode.id)
            .expect("each episode was recorded for one fact");
        links.push(json!({ "source": example.name(episode.trace_id), "target": fact }));
    }
    for one in &example.drawn {
        let Some(node) = example.graph.get(one.id) else {
            continue;
        };
        /* A memory node cites its facts by id, which is the link into Engram. */
        if let Detail::Memory { fact_ids } = &node.detail {
            for fact in fact_ids {
                links.push(json!({ "source": example.name(*fact), "target": one.name }));
            }
        }
        for parent in &node.derived_from {
            links.push(json!({ "source": example.name(*parent), "target": one.name }));
        }
    }

    let mut graph = example.graph.clone();
    let removed = graph.delete_cascade(example.id(DELETED));
    let mut removed: Vec<&str> = removed.into_iter().map(|id| example.name(id)).collect();
    removed.sort_by_key(|name| example.drawn.iter().position(|one| one.name == *name));

    json!({ "deleted": DELETED, "links": links, "nodes": nodes, "removed": removed })
}

#[test]
fn the_site_example_is_current() {
    let committed: Value = serde_json::from_str(
        &std::fs::read_to_string(SITE_FILE).expect("the page's example is readable"),
    )
    .expect("the page's example is JSON");
    assert!(
        committed == site_json(&example()),
        "the Cortex page draws an example these crates no longer produce. Rewrite \
         it with CORTEX_WRITE_SITE_EXAMPLE=1 cargo test -p fusion-cortex-trace \
         --test site_example -- --ignored write"
    );
}

#[test]
fn the_superseded_price_explains_the_answer_given_while_it_was_current() {
    let example = example();
    let september = example.id("f-price-september");
    assert!(
        !example
            .memory
            .current_facts()
            .iter()
            .any(|fact| fact.id == september),
        "the October price superseded it"
    );
    let cited = example
        .graph
        .why(example.id("o-price-september"))
        .into_iter()
        .any(|node| matches!(&node.detail, Detail::Memory { fact_ids } if fact_ids.contains(&september)));
    assert!(
        cited,
        "the September answer's why() reaches the retrieval citing it"
    );
}

#[test]
fn deleting_a_retrieval_takes_its_context_and_answer_and_nothing_it_came_from() {
    let example = example();
    let mut graph = example.graph.clone();
    let mut removed: Vec<&str> = graph
        .delete_cascade(example.id(DELETED))
        .into_iter()
        .map(|id| example.name(id))
        .collect();
    removed.sort_unstable();
    assert_eq!(removed, ["c-price", "m-price", "o-price"]);
    for kept in [
        "q-price",
        "t-search-docs",
        "t-lookup-account",
        "o-price-september",
    ] {
        assert!(graph.get(example.id(kept)).is_some(), "{kept} remains");
    }
}

/// Rewrites the page's example, when explicitly asked to.
#[test]
#[ignore = "rewrites the Cortex page's example; run it deliberately"]
fn write() {
    assert!(
        std::env::var_os("CORTEX_WRITE_SITE_EXAMPLE").is_some(),
        "set CORTEX_WRITE_SITE_EXAMPLE=1 to rewrite the Cortex page's example"
    );
    let written = format!(
        "{}\n",
        serde_json::to_string_pretty(&site_json(&example())).expect("the example serializes")
    );
    std::fs::write(SITE_FILE, written).expect("the page's example is writable");
}
