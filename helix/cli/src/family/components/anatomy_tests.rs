use serde_json::{json, Value};

use super::anatomy;
use crate::family::api::headless;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

/// A button with a web-only prop, a state, a press, a region of each kind,
/// a part drawn while a prop holds, and a node only the web draws.
fn button() -> Family {
    Family::new(
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
                      events: [event('press', { detail: ['pointerType'] })],
                      props: [
                        prop('pending', 'boolean'),
                        prop('formaction', 'string', { default: '', platform: 'web' }),
                      ],
                      states: ['pending'],
                      tree: [
                        pressable('button', { busy: bind('pending'), role: 'button', sends: 'press' }, [
                          region('start'),
                          region('default'),
                          when('pending', box('spinner', { decorative: true })),
                        ]),
                        box('focus-ring', { platform: 'web' }),
                      ],
                    })",
                )
                .unwrap(),
            )
            .unwrap(),
        ),
        "button",
        "root",
    )
}

fn draws(side: &Value) -> Vec<String> {
    let mut out = Vec::new();
    let mut walk = vec![side["tree"].clone()];
    while let Some(nodes) = walk.pop() {
        for node in nodes.as_array().into_iter().flatten() {
            out.push(node["draws"].as_str().unwrap().to_owned());
            walk.push(node["children"].clone());
        }
    }
    out
}

#[test]
fn the_web_draws_parts_and_slots_and_a_phone_views_and_props() {
    let anatomy = json!(anatomy(&button(), "HelixRoot"));
    let web = &anatomy["web"];
    assert_eq!(
        web["takes"],
        json!([
            { "holds": "boolean", "name": "pending" },
            { "holds": "string", "name": "formaction" },
        ])
    );
    assert_eq!(web["states"], json!(["pending"]));
    assert_eq!(web["sends"], json!(["press"]));
    assert_eq!(
        web["tree"][0]["says"],
        json!(["busy={pending}", "role=\"button\"", "sends=\"press\""])
    );
    let mut on_web = draws(web);
    on_web.sort();
    assert_eq!(
        on_web,
        [
            "box part=\"focus-ring\"",
            "box part=\"spinner\"",
            "pressable part=\"button\"",
            "slot",
            "slot name=\"start\"",
            "while pending",
        ]
    );
    let native = &anatomy["native"];
    assert_eq!(
        native["takes"],
        json!([{ "holds": "boolean", "name": "pending" }])
    );
    assert_eq!(native["sends"], json!(["onPress"]));
    assert!(native["states"].is_null());
    let mut on_phone = draws(native);
    on_phone.sort();
    assert_eq!(
        on_phone,
        [
            "Pressable button",
            "View spinner",
            "while pending",
            "{children}",
            "{start}"
        ]
    );
}

#[test]
fn an_element_only_the_web_has_has_no_native_tree() {
    let mut family = button();
    family.api.platform = Some(crate::family::api::Platform::Web);
    assert!(json!(anatomy(&family, "HelixRoot"))["native"].is_null());
}
