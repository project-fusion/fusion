//! The consolidation pass, on a scripted model, against both stores.

use fusion_cortex_core::{
    provider::{Block, Response, Scripted, Stop, Usage},
    Id,
};
use fusion_cortex_engram::{
    consolidate::{consolidate, Consolidation, Options},
    store::{InMemory, Sqlite, Store},
    Episode, Fact, Scope,
};
use fusion_cortex_trace::{Detail, Graph, Node, NodeKind};

fn reply(text: &str) -> Response {
    Response {
        content: vec![Block::text(text)],
        id: None,
        model: "scripted/1".into(),
        stop: Stop::EndTurn,
        usage: Usage::default(),
    }
}

fn scripted(replies: &[&str]) -> Scripted {
    Scripted::new(
        "scripted/1",
        replies.iter().map(|text| Ok(reply(text))).collect(),
    )
}

async fn stores() -> Vec<(&'static str, Box<dyn Store>)> {
    vec![
        ("in memory", Box::new(InMemory::new())),
        ("sqlite", Box::new(Sqlite::in_memory().await.unwrap())),
    ]
}

/// A trace holding every node the passes wrote, and a session's own nodes.
fn graph(passes: &[&Consolidation], session: &[Node]) -> Graph {
    let mut graph = Graph::new();
    for node in session
        .iter()
        .chain(passes.iter().flat_map(|pass| &pass.nodes))
    {
        graph.insert(node.clone());
    }
    graph
}

/// A session node that showed an episode, such as a message.
fn shown(content: &str) -> Node {
    Node::new(
        Detail::Source {
            content: content.into(),
            uri: None,
        },
        vec![],
    )
}

async fn current(store: &dyn Store) -> Vec<Fact> {
    store.current_facts().await.unwrap()
}

#[tokio::test]
async fn consolidation_creates_facts_with_an_edge_to_every_source() {
    for (name, store) in stores().await {
        let session = Id::new();
        let (said, again) = (
            shown("We moved the tests to bun."),
            shown("bun runs them now"),
        );
        let first = Episode::new("We moved the tests to bun.", session).at(said.id);
        let second = Episode::new("bun runs them now", session).at(again.id);
        // No node: the pass shows it by a source node of its own.
        let third = Episode::new("Hello!", session);
        for episode in [&first, &second, &third] {
            store.record(episode).await.unwrap();
        }
        let provider = scripted(&[
            r#"{"facts": [{"statement": "The tests run with bun.", "confidence": 0.9, "episodes": [1, 2, 2]}]}"#,
        ]);

        let pass = consolidate(&provider, store.as_ref(), &Options::default())
            .await
            .unwrap();

        let facts = current(store.as_ref()).await;
        assert_eq!(facts.len(), 1, "{name}");
        let fact = &facts[0];
        assert_eq!(fact.content, "The tests run with bun.");
        assert_eq!(fact.derived_from, [first.id, second.id], "{name}");
        assert_eq!(pass.asserted, [fact.id]);
        assert_eq!(pass.consolidated, [first.id, second.id, third.id]);
        assert!(
            store.unconsolidated().await.unwrap().is_empty(),
            "{name}: the pass marks every episode it read, the one with no fact too"
        );

        // `why()` on the fact reaches each episode's node, its own sources
        // first, as the immediate causes.
        let graph = graph(&[&pass], &[said.clone(), again.clone()]);
        let why: Vec<Id> = graph
            .why(fact.node.unwrap())
            .iter()
            .map(|node| node.id)
            .collect();
        assert_eq!(graph.get(why[0]).unwrap().kind(), NodeKind::Memory);
        assert!(
            why[1..4].contains(&said.id) && why[1..4].contains(&again.id),
            "{name}"
        );
        let kinds: Vec<NodeKind> = graph
            .why(fact.node.unwrap())
            .iter()
            .map(|node| node.kind())
            .collect();
        assert!(kinds.contains(&NodeKind::Extraction));
        let greeting = graph
            .nodes()
            .find(|node| {
                matches!(&node.detail, Detail::Source { uri: Some(uri), .. }
                    if *uri == format!("engram:episode/{}", third.id))
            })
            .expect("a source node for the episode without one");
        assert!(
            graph
                .why(fact.node.unwrap())
                .iter()
                .any(|node| node.id == greeting.id),
            "{name}: the extraction read every episode of the batch"
        );
    }
}

#[tokio::test]
async fn a_second_episode_supporting_a_fact_adds_a_source() {
    for (name, store) in stores().await {
        let monday = Episode::new("We moved the tests to bun.", Id::new());
        store.record(&monday).await.unwrap();
        let first = consolidate(
            &scripted(&[
                r#"{"facts": [{"statement": "The tests run with bun.", "confidence": 0.8, "episodes": [1]}]}"#,
            ]),
            store.as_ref(),
            &Options::default(),
        )
        .await
        .unwrap();
        let tuesday = Episode::new("bun runs the tests.", Id::new());
        let wednesday = Episode::new("Remember: tests run with BUN", Id::new());
        store.record(&tuesday).await.unwrap();
        store.record(&wednesday).await.unwrap();
        // The model names the known fact for one episode, and only repeats
        // its words for the other.
        let provider = scripted(&[r#"{"facts": [
                {"statement": "Bun runs the tests.", "confidence": 0.9, "episodes": [1], "restates": 1},
                {"statement": "the tests run with  bun", "confidence": 0.7, "episodes": [2]}
            ]}"#]);

        let second = consolidate(&provider, store.as_ref(), &Options::default())
            .await
            .unwrap();

        let request = &provider.requests()[0];
        assert!(
            request.messages[1]
                .joined()
                .contains("1. The tests run with bun."),
            "{name}: the model is shown the known fact"
        );
        let facts = store.facts().await.unwrap();
        assert_eq!(facts.len(), 1, "{name}: no second fact is made");
        let fact = &facts[0];
        assert_eq!(
            fact.derived_from,
            [monday.id, tuesday.id, wednesday.id],
            "{name}"
        );
        assert_eq!(
            second.sourced,
            [(fact.id, tuesday.id), (fact.id, wednesday.id)]
        );
        assert!(second.asserted.is_empty());
        let graph = graph(&[&first, &second], &[]);
        let reached: Vec<String> = graph
            .why(fact.node.unwrap())
            .iter()
            .filter_map(|node| match &node.detail {
                Detail::Source { content, .. } => Some(content.clone()),
                _ => None,
            })
            .collect();
        for episode in [&monday, &tuesday, &wednesday] {
            assert!(reached.contains(&episode.content), "{name}: {reached:?}");
        }
    }
}

#[tokio::test]
async fn a_contradiction_supersedes_and_keeps_the_old_fact() {
    for (name, store) in stores().await {
        let monday = Episode::new("Tests run with jest.", Id::new());
        store.record(&monday).await.unwrap();
        let first = consolidate(
            &scripted(&[
                r#"{"facts": [{"statement": "The tests run with jest.", "confidence": 0.8, "episodes": [1]}]}"#,
            ]),
            store.as_ref(),
            &Options::default(),
        )
        .await
        .unwrap();
        let old = current(store.as_ref()).await.remove(0);
        let tuesday = Episode::new("We dropped jest; bun runs the tests.", Id::new());
        store.record(&tuesday).await.unwrap();

        let second = consolidate(
            &scripted(&[
                r#"{"facts": [{"statement": "The tests run with bun.", "confidence": 0.9, "episodes": [1], "contradicts": 1, "restates": 1}]}"#,
            ]),
            store.as_ref(),
            &Options::default(),
        )
        .await
        .unwrap();

        let facts = current(store.as_ref()).await;
        assert_eq!(facts.len(), 1, "{name}");
        let new = &facts[0];
        assert_eq!(new.content, "The tests run with bun.");
        assert_eq!(second.superseded, [(old.id, new.id)]);
        let kept = store
            .facts()
            .await
            .unwrap()
            .into_iter()
            .find(|fact| fact.id == old.id)
            .expect("the superseded fact is kept");
        assert_eq!(kept.superseded_by, Some(new.id), "{name}");
        let graph = graph(&[&first, &second], &[]);
        assert!(
            graph
                .why(kept.node.unwrap())
                .iter()
                .any(|node| matches!(&node.detail, Detail::Source { content, .. } if *content == monday.content)),
            "{name}: why() still explains the old fact"
        );
    }
}

#[tokio::test]
async fn forgetting_cascades_only_where_nothing_else_supports_a_fact() {
    for (name, store) in stores().await {
        let (monday, tuesday) = (Id::new(), Id::new());
        let bun = Episode::new("bun runs the tests", monday);
        let slow = Episode::new("the suite takes ten minutes", tuesday);
        let again = Episode::new("bun again", tuesday);
        for episode in [&bun, &slow, &again] {
            store.record(episode).await.unwrap();
        }
        consolidate(
            &scripted(&[
                r#"{"facts": [
                    {"statement": "The tests run with bun.", "confidence": 0.8, "episodes": [1, 3]},
                    {"statement": "The suite takes ten minutes.", "confidence": 0.6, "episodes": [2]}
                ]}"#,
            ]),
            store.as_ref(),
            &Options::default(),
        )
        .await
        .unwrap();
        let facts = current(store.as_ref()).await;
        let supported = facts
            .iter()
            .find(|fact| fact.content.contains("bun"))
            .unwrap();
        let alone = facts
            .iter()
            .find(|fact| fact.content.contains("ten"))
            .unwrap();

        let removed = store.forget(tuesday).await.unwrap();

        assert_eq!(removed, [slow.id, again.id, alone.id], "{name}");
        let facts = current(store.as_ref()).await;
        assert_eq!(facts.len(), 1, "{name}");
        assert_eq!(facts[0].id, supported.id);
        assert_eq!(facts[0].derived_from, [bun.id], "{name}: the edge is gone");
    }
}

#[tokio::test]
async fn each_scope_is_consolidated_apart_and_a_fact_keeps_its_scope() {
    for (name, store) in stores().await {
        let core = Scope::Team("core".into());
        let team =
            Episode::new("The core team ships on Thursdays.", Id::new()).within(core.clone());
        let mine = Episode::new("I prefer tabs.", Id::new());
        store.record(&team).await.unwrap();
        store.record(&mine).await.unwrap();
        let provider = scripted(&[
            r#"{"facts": [{"statement": "The core team ships on Thursdays.", "confidence": 0.9, "episodes": [1]}]}"#,
            r#"{"facts": [{"statement": "They prefer tabs.", "confidence": 0.9, "episodes": [1]}]}"#,
        ]);

        consolidate(&provider, store.as_ref(), &Options::default())
            .await
            .unwrap();

        let requests = provider.requests();
        assert_eq!(requests.len(), 2, "{name}: one extraction per scope");
        assert!(!requests[0].messages[1].joined().contains("tabs"));
        let facts = current(store.as_ref()).await;
        let scope = |content: &str| {
            facts
                .iter()
                .find(|fact| fact.content.contains(content))
                .unwrap()
                .scope
                .clone()
        };
        assert_eq!(scope("Thursdays"), core, "{name}");
        assert_eq!(scope("tabs"), Scope::Personal, "{name}");
    }
}

#[tokio::test]
async fn a_failed_batch_waits_for_the_next_pass_and_a_claim_without_an_episode_is_dropped() {
    for (name, store) in stores().await {
        let options = Options {
            batch: 1,
            known: 50,
        };
        let first = Episode::new("bun runs the tests", Id::new());
        let second = Episode::new("the docs build with bun", Id::new());
        store.record(&first).await.unwrap();
        store.record(&second).await.unwrap();
        let provider = scripted(&[
            r#"{"facts": [{"statement": "Nothing supports this.", "confidence": 0.9, "episodes": [7]}]}"#,
            "not json",
            "still not json",
        ]);

        let pass = consolidate(&provider, store.as_ref(), &options)
            .await
            .unwrap();

        assert_eq!(pass.skipped.len(), 1, "{name}");
        assert!(pass.asserted.is_empty());
        assert_eq!(pass.failed.len(), 1);
        assert_eq!(pass.failed[0].episodes, [second.id]);
        assert!(
            pass.nodes
                .iter()
                .any(|node| node.kind() == NodeKind::Validation),
            "{name}: the failed attempt is traced"
        );
        let pending: Vec<Id> = store
            .unconsolidated()
            .await
            .unwrap()
            .into_iter()
            .map(|episode| episode.id)
            .collect();
        assert_eq!(pending, [second.id], "{name}");
    }
}
