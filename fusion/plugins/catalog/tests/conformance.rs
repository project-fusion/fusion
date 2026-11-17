//! The reference catalog passes the suite, and the suite catches what it is
//! for.

use fusion_plugin_catalog::conformance::{editor, run, Fixture};
use fusion_plugin_catalog::{Catalog, Delivery, Memory, State};

const KEY: &str = "reference-key";

fn delivery(key: &str) -> Delivery {
    Delivery {
        headers: vec![("x-memory-key".into(), key.into())],
        body: br#"["tee"]"#.to_vec(),
    }
}

fn fixture() -> Fixture {
    Fixture {
        known: vec!["tee".into(), "mug".into(), "cap".into()],
        missing: "nothing".into(),
        signed: delivery(KEY),
        forged: delivery("guessed"),
    }
}

fn stocked() -> Memory {
    let memory = Memory::new(KEY);
    for (id, title) in [("tee", "Camp tee"), ("mug", "Mug"), ("cap", "Cap")] {
        memory.put(Memory::record(id, title));
    }
    memory
}

#[test]
fn the_reference_catalog_passes() {
    editor(&stocked(), &fixture()).assert_passed();
}

#[test]
fn a_forged_delivery_taken_fails_the_suite() {
    let mut lax = fixture();
    lax.forged = delivery(KEY);
    let report = run(&stocked(), &lax);
    assert!(report.failed.iter().any(|f| f.check == "receive.forged"));
}

#[test]
fn a_cursor_brings_back_only_what_changed_and_what_was_removed() {
    let memory = stocked();
    let mut since = None;
    loop {
        let page = memory.list(since.as_deref()).unwrap();
        since = Some(page.next);
        if !page.more {
            break;
        }
    }
    memory.put(Memory::record("tee", "Camp tee, blue"));
    memory.remove("mug");
    let page = memory.list(since.as_deref()).unwrap();
    let ids: Vec<&str> = page.records.iter().map(|r| r.id.as_str()).collect();
    assert_eq!(ids, ["tee"]);
    assert_eq!(page.removed, ["mug"]);
    assert_eq!(page.records[0].state, State::Active);
}
