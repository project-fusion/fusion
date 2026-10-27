use std::path::Path;

use super::{Names, Project, Tokens};

/// The names the compiler's own specs write their elements under, which are
/// Helix's.
pub fn testing() -> Names {
    Names {
        event: "helix".to_owned(),
        property: "helix".to_owned(),
        tag: "helix".to_owned(),
        inherited: vec!["helix-mode".to_owned(), "helix-mode-inverted".to_owned()],
    }
}

/// A design system read from `file`, written as `text` into a folder of its
/// own.
fn written(name: &str, file: &str, text: &str) -> Result<Project, String> {
    let folder = std::env::temp_dir().join(format!("family-project-{name}-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let file = folder.join(file);
    std::fs::write(&file, text).unwrap();
    let read = Project::read(&file).map_err(|failure| failure.render("helix"));
    std::fs::remove_dir_all(&folder).unwrap();
    read
}

/// A design system whose `system` is `text`, read from `helix.json`.
fn project(name: &str, text: &str) -> Result<Project, String> {
    written(name, "helix.json", &format!(r#"{{ "system": {text} }}"#))
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
    assert!(read.outputs.build.ends_with("src/build"));
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
fn inherited_names_the_private_values_a_family_may_read() {
    let read = project(
        "inherited",
        r#"{ "name": "Acme", "prefix": "acme", "families": ".", "inherited": ["acme-mode"] }"#,
    )
    .unwrap();
    assert_eq!(read.names.inherited, ["acme-mode"]);
    let refused = project(
        "inherited-theme",
        r#"{ "name": "Acme", "prefix": "acme", "families": ".", "theme": ["acme-mode"] }"#,
    )
    .unwrap_err();
    assert!(refused.contains("theme"), "{refused}");
}

#[test]
fn the_helix_key_of_fusion_json_holds_the_same_shape() {
    let read = written(
        "product",
        "fusion.json",
        r#"{ "domains": ["acme"], "helix": { "system": { "name": "Acme", "prefix": "acme", "families": "." } } }"#,
    )
    .unwrap();
    assert_eq!(read.names.tag("tabs"), "acme-tabs");
    assert_eq!(read.section, "helix.system");
}

#[test]
fn a_file_with_no_system_is_refused_by_the_key_it_lacks() {
    let refused = written("none", "helix.json", r#"{ "theme": {} }"#).unwrap_err();
    assert!(refused.contains("has no `system`"), "{refused}");
    let refused = written(
        "none-product",
        "fusion.json",
        r#"{ "helix": { "components": { "tiers": ["src"] } } }"#,
    )
    .unwrap_err();
    assert!(refused.contains("has no `helix.system`"), "{refused}");
}

#[test]
fn a_schema_at_the_top_of_the_file_is_ignored() {
    let read = written(
        "schema",
        "helix.json",
        r#"{ "$schema": "./helix.schema.json", "system": { "name": "Acme", "prefix": "acme", "families": "." } }"#,
    )
    .unwrap();
    assert_eq!(read.name, "Acme");
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
        "theme",
        "components",
        "system",
        "prefix",
        "eventPrefix",
        "propertyPrefix",
        "families",
        "inherited",
        "tokens",
        "outputs",
        "runtime",
    ] {
        assert!(schema.contains(&format!("\"{key}\"")), "{key}");
    }
}

#[test]
fn a_generated_file_names_its_source_from_the_repository() {
    let file = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fusion.json");
    let read = Project::read(&file).unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    assert_eq!(read.named(&read.families), "helix/neutral");
}
