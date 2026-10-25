use serde_json::json;

use super::{members, prop, read};
use crate::family::api::headless;
use crate::family::components::details::Details;
use crate::family::components::emit::{module, Part};
use crate::family::components::members::typed_members;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

fn button(rules: &str) -> Family {
    let styled_source = format!(
        "export default family('button', {{ stylesheet: 'button.css', rules: [{rules}] }})"
    );
    let headless_source =
        "export default headless('button', { tree: [pressable('button', {}, [region('default')])] })";
    Family::new(
        styled(&default_export(&styled_source).unwrap()).unwrap(),
        Some(headless(&default_export(headless_source).unwrap()).unwrap()),
        "button",
        "root",
    )
}

const RULES: &str = "
  { on: 'button', set: [
    ['background-color', hook('background-color', hook('fill', 'red'))],
    ['margin', hookOf('button-group', 'gap', 0)],
  ] },
  { on: 'button', platform: 'web', set: [['cursor', hook('cursor', 'pointer')]] },
";

#[test]
fn reads_each_hook_of_the_family_s_own_prefix_that_a_phone_draws() {
    let family = button(RULES);
    assert_eq!(
        read(&family).into_iter().collect::<Vec<_>>(),
        ["background-color", "fill"]
    );
}

#[test]
fn types_each_hook_in_camel_case_described_by_the_manifest() {
    let family = button(RULES);
    let declaration = json!({
        "cssProperties": [
            { "name": "--button-background-color", "description": "Fill behind the button.\n\nMore." },
        ],
    });
    let typed = members(&family, &declaration);
    let names: Vec<&str> = typed.iter().map(|one| one.name.as_str()).collect();
    assert_eq!(names, ["backgroundColor", "fill"]);
    assert_eq!(typed[0].ty, "number | string");
    assert_eq!(
        typed[0].doc,
        [
            "Fill behind the button.",
            "Sets `--button-background-color`."
        ]
    );
    assert_eq!(typed[1].doc, ["Sets `--button-fill`."]);
    let hooks = prop("HelixButton", &family);
    assert_eq!(
        (hooks.name.as_str(), hooks.ty.as_str()),
        ("hooks", "HelixButtonHooks")
    );
    assert!(hooks.doc[0].contains("`--button-*`"), "{:?}", hooks.doc);
}

#[test]
fn every_component_takes_hooks_and_its_module_writes_their_type() {
    let family = button(RULES);
    let typed =
        typed_members(&family, "HelixButton", &json!({}), &Details::default(), &[]).unwrap();
    assert!(typed.members.iter().any(|one| one.name == "hooks"));
    let part = Part {
        component: "HelixButton".to_owned(),
        constant: "rootForm".to_owned(),
        events: Vec::new(),
        form: "{}".to_owned(),
        hooks: typed.hooks,
        members: typed.members,
        summary: None,
        tag: "helix-button".to_owned(),
        web_only: false,
    };
    let written = module("button", &[part]);
    for line in [
        "export type HelixButtonHooks = {\n",
        "  /** Sets `--button-background-color`. */\n  readonly backgroundColor?: number | string\n",
        "  readonly fill?: number | string\n",
        "  readonly hooks?: HelixButtonHooks\n",
    ] {
        assert!(written.contains(line), "{line}\n---\n{written}");
    }
    let bare = button("");
    let none = members(&bare, &json!({}));
    assert!(none.is_empty());
    let part = Part {
        component: "HelixButton".to_owned(),
        constant: "rootForm".to_owned(),
        events: Vec::new(),
        form: "{}".to_owned(),
        hooks: none,
        members: Vec::new(),
        summary: None,
        tag: "helix-button".to_owned(),
        web_only: false,
    };
    assert!(
        module("button", &[part]).contains("export type HelixButtonHooks = Record<never, never>\n")
    );
}
