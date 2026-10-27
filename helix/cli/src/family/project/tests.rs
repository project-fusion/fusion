use std::path::Path;

use super::{Names, Project, Tokens};

/// The names the compiler's own specs write their elements under, which are
/// Helix's.
pub fn testing() -> Names {
    Names {
        event: "helix".to_owned(),
        property: "helix".to_owned(),
        tag: "helix".to_owned(),
        theme: vec!["helix-mode".to_owned(), "helix-mode-inverted".to_owned()],
    }
}

/// A project read from `text`, written into a folder of its own as
/// `helix.family.json`.
fn project(name: &str, text: &str) -> Result<Project, String> {
    let folder = std::env::temp_dir().join(format!("family-project-{name}-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let file = folder.join("helix.family.json");
    std::fs::write(&file, text).unwrap();
    let read = Project::read(&file).map_err(|failure| failure.render("helix"));
    std::fs::remove_dir_all(&folder).unwrap();
    read
}

#[test]
fn one_prefix_names_the_tags_the_events_and_the_tokens() {
    let read = project(
        "one",
        r#"{ "name": "Acme", "prefix": "acme", "families": "src" }"#,
    )
    .unwrap();
    assert_eq!(read.names.tag("tabs"), "acme-tabs");
    assert_eq!(read.names.event("activate"), "acme-activate");
    assert_eq!(read.names.token("space-md"), "--acme-space-md");
    assert_eq!(read.names.token_of("--acme-space-md"), Some("space-md"));
    assert_eq!(read.names.token_of("--acmes-space-md"), None);
    assert_eq!(read.names.bare("acme-tab-panel"), Some("tab-panel"));
    assert!(read.outputs.build.ends_with("src/dist"));
    assert!(matches!(read.tokens, Tokens::None));
}

#[test]
fn an_event_prefix_and_a_property_prefix_each_name_their_own() {
    let read = project(
        "own",
        r#"{ "name": "Acme", "prefix": "acme", "eventPrefix": "ac", "propertyPrefix": "a", "families": "." }"#,
    )
    .unwrap();
    assert_eq!(read.names.tag("tabs"), "acme-tabs");
    assert_eq!(read.names.event("activate"), "ac-activate");
    assert_eq!(read.names.token("space-md"), "--a-space-md");
}

#[test]
fn a_key_the_file_does_not_know_is_refused_by_its_name() {
    let refused = project(
        "unknown",
        r#"{ "name": "Acme", "prefix": "acme", "families": ".", "prefixes": {} }"#,
    )
    .unwrap_err();
    assert!(refused.contains("prefixes"), "{refused}");
}

#[test]
fn both_token_sources_at_once_are_refused() {
    let refused = project(
        "both",
        r#"{ "name": "Acme", "prefix": "acme", "families": ".", "tokens": { "dtcg": "a.json", "styles": "styles" } }"#,
    )
    .unwrap_err();
    assert!(refused.contains("both `dtcg` and `styles`"), "{refused}");
}

#[test]
fn a_runtime_the_file_leaves_out_is_the_default_provider() {
    let read = project(
        "runtime",
        r#"{ "name": "Acme", "prefix": "acme", "families": "." }"#,
    )
    .unwrap();
    assert_eq!(read.runtime.native, super::defaults::NATIVE);
    let named = project(
        "named",
        r#"{ "name": "Acme", "prefix": "acme", "families": ".", "runtime": { "native": "@acme/native", "eventType": "AcmeEvent" } }"#,
    )
    .unwrap();
    assert_eq!(named.runtime.native, "@acme/native");
    assert_eq!(named.runtime.event_type, "AcmeEvent");
    assert_eq!(named.runtime.layer_host, super::defaults::LAYER_HOST);
}

#[test]
fn the_schema_names_every_key() {
    let schema = super::schema();
    for key in [
        "prefix",
        "eventPrefix",
        "propertyPrefix",
        "families",
        "tokens",
        "outputs",
        "runtime",
    ] {
        assert!(schema.contains(&format!("\"{key}\"")), "{key}");
    }
}

#[test]
fn a_generated_file_names_its_source_from_the_repository() {
    let file = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../helix.family.json");
    let read = Project::read(&file).unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    assert_eq!(read.named(&read.families), "helix/neutral");
}
