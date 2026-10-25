use oxc_span::SourceType;
use serde_json::json;

use super::check::{check, shared};
use super::platforms::Platforms;

/// Three families as `api.json` describes them: Tabs, which a phone draws
/// without a tab's `rel`; Dialog, the web's alone; and Skip Link, which a
/// phone imports and draws as nothing.
fn platforms() -> Platforms {
    let api = json!({ "families": [
        { "label": "Tabs", "elements": [{
            "entry": "tabs", "tagName": "helix-tab",
            "events": [{ "name": "helix-select" }, { "name": "helix-dismiss" }],
            "cssProperties": [{ "name": "--tabs-tab-color" }],
            "platforms": { "react-native": {
                "events": [{ "name": "helix-select", "prop": "onSelect" }],
                "omitted": ["rel", "maxItems"]
            } }
        }] },
        { "label": "Dialog", "elements": [{ "entry": "dialog", "tagName": "helix-dialog", "events": [] }] },
        { "label": "Skip Link", "elements": [{ "entry": "skip-link", "tagName": "helix-skip-link", "events": [] }] }
    ] });
    let exports =
        json!({ "./skip-link": { "react-native": "./native.js", "default": "./web.js" } });
    let mut platforms = Platforms::default();
    platforms.add(&api, &exports);
    platforms
}

fn kinds(source: &str) -> Vec<(usize, &'static str)> {
    check(source, SourceType::tsx(), &platforms())
        .expect("the module parses")
        .into_iter()
        .map(|finding| (finding.line, finding.kind))
        .collect()
}

#[test]
fn a_platform_file_is_not_shared() {
    assert!(shared("projects.tsx"));
    assert!(!shared("projects.web.tsx"));
    assert!(!shared("projects.native.tsx"));
    assert!(!shared("projects.ios.tsx"));
}

#[test]
fn the_browser_globals_are_reported() {
    let source = "const width = window.innerWidth\nconst body = document.body as HTMLElement\nconst id = 3\n";
    assert_eq!(
        kinds(source),
        [(1, "dom-global"), (2, "dom-global"), (2, "dom-global")]
    );
}

#[test]
fn dom_elements_and_css_are_reported() {
    let source = "import './page.css'\nimport styles from './card.module.scss'\nexport const Page = () => (\n  <div className=\"page\">\n    <helix-flex style={{ gap: 8, gridArea: 'main', '--flex-gap': '1rem' }}>Hi</helix-flex>\n    <helix-text style=\"color: red\">Hi</helix-text>\n  </div>\n)\n";
    assert_eq!(
        kinds(source),
        [
            (1, "css-import"),
            (2, "css-import"),
            (4, "dom-element"),
            (4, "class-name"),
            (5, "web-style"),
            (5, "web-style"),
            (6, "web-style"),
        ]
    );
}

#[test]
fn web_only_families_props_and_events_are_reported() {
    let source = "export const Page = () => (\n  <helix-flex>\n    <helix-skip-link></helix-skip-link>\n    <helix-dialog></helix-dialog>\n    <helix-tab rel=\"next\" max-items={2} value=\"one\" onhelix-select={go} onhelix-dismiss={go}>One</helix-tab>\n  </helix-flex>\n)\n";
    assert_eq!(
        kinds(source),
        [
            (4, "web-only-family"),
            (5, "web-only-prop"),
            (5, "web-only-prop"),
            (5, "web-only-event"),
        ]
    );
}

#[test]
fn a_page_built_from_families_a_phone_draws_passes() {
    let source = "import { useState } from 'react'\nimport '@fusion.dev/helix/tabs'\nexport function Page() {\n  const [open, setOpen] = useState(false)\n  return <Shell style=\"auto\"><helix-tab value=\"one\" onhelix-select={() => setOpen(!open)}>One</helix-tab></Shell>\n}\n";
    assert_eq!(kinds(source), []);
}

#[test]
fn a_finding_names_its_column() {
    let found = check(
        "const a = (\n  <span></span>\n)\n",
        SourceType::tsx(),
        &platforms(),
    )
    .expect("the module parses");
    assert_eq!((found[0].line, found[0].column), (2, 3));
}

#[test]
fn a_hook_in_a_style_passes_and_any_other_custom_property_is_reported() {
    let source = "export const Page = () => (<>\n  <helix-tab style={{ '--tabs-tab-color': 'red', color: 'red' }} value=\"one\">One</helix-tab>\n  <helix-tab style={{ '--button-color': 'red' }} value=\"two\">Two</helix-tab>\n  <helix-dialog style={{ '--dialog-width': '20rem' }}></helix-dialog>\n</>)\n";
    assert_eq!(
        kinds(source),
        [(3, "web-style"), (4, "web-only-family"), (4, "web-style")]
    );
}
