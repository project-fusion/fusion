use std::path::PathBuf;

use serde_json::json;

use super::platforms;
use crate::family::api::headless;
use crate::family::compile::Compiled;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

/// A button whose web element has a form's prop and a form's event,
/// compiled as `helix system` compiles one.
fn compiled_button() -> Compiled {
    let family = Family::new(
        styled(
            &default_export(
                "export default family('button', { stylesheet: 'button/button.css', rules: [] })",
            )
            .unwrap(),
        )
        .unwrap(),
        Some(
            headless(
                &default_export(
                    "export default headless('button', {
                      events: [event('press', { detail: ['pointerType'] }), event('change', { bare: true }), event('invalid', { bare: true, platform: 'web' })],
                      props: [
                        prop('pending-label', 'string'),
                        prop('formaction', 'string', { default: '', platform: 'web' }),
                      ],
                      tree: [pressable('button', { sends: 'press' }, [region('start'), region('default')])],
                    })",
                )
                .unwrap(),
            )
            .unwrap(),
        ),
        "button",
        "root",
    );
    Compiled {
        element: "button/root".to_owned(),
        family,
        notes: Vec::new(),
        over: None,
        source: PathBuf::new(),
        web: String::new(),
    }
}

#[test]
fn names_each_member_as_the_component_takes_it() {
    let manifest = json!({
        "modules": [{ "declarations": [{ "name": "HelixButton", "tagName": "helix-button" }] }],
    });
    assert_eq!(
        platforms(&[compiled_button()], &manifest).unwrap(),
        json!({
            "react-native": {
                "elements": {
                    "helix-button": {
                        "component": "HelixButton",
                        "events": [
                            { "name": "change", "prop": "onChange" },
                            { "name": "helix-press", "prop": "onPress" },
                        ],
                        "omitted": ["formaction"],
                        "properties": ["pendingLabel"],
                        "slots": [
                            { "name": "", "prop": "children" },
                            { "name": "start", "prop": "start" },
                        ],
                    },
                },
                "status": "experimental",
            },
        })
    );
}

#[test]
fn says_which_element_the_manifest_lacks() {
    let faults = platforms(&[compiled_button()], &json!({ "modules": [] })).unwrap_err();
    assert_eq!(
        faults,
        ["helix-button: the styled manifest has no element of that tag with a class name"]
    );
}
