use serde_json::json;

use super::details::{Details, Field};
use super::emit::{module_in, Origin, Part};
use super::members::{camel, pascal, typed_members, Member, Sends};
use crate::family::api::headless;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

/// One family's module as Helix's project writes it.
pub fn module(family: &str, parts: &[Part]) -> String {
    module_in(
        family,
        parts,
        &std::collections::BTreeMap::new(),
        &Origin {
            families: "helix/neutral",
            events: "helix/core/src/events",
            runtime: "@fusion.dev/helix-native",
            event_type: "HelixEvent",
        },
    )
}

/// A miniature of core's events: a detail that extends another, an alias, a
/// class with a detail, and one with none.
const EVENTS: &str = r"
export type Pointer = 'mouse' | 'touch'

export interface ChangeDetail {
  /** Why the change was asked for. */
  cause?: string
  /**
   * The value after the change.
   *
   * A second paragraph, which a native doc leaves out.
   */
  value: string
}

export interface ActivateDetail extends ChangeDetail {
  /** The value before the move. */
  previous?: string
}

export interface PressDetail {
  /** What the press came from. */
  pointerType: Pointer
  /** Where it landed. */
  at: Point
}

export class HelixActivateEvent extends CustomEvent<ActivateDetail> {
  static readonly eventName = 'helix-activate'
}

export class HelixPressEvent extends CustomEvent<PressDetail> {
  static readonly eventName = 'helix-press'
}

export class HelixActionEvent extends Event {
  static readonly eventName = 'helix-action'
}
";

fn details() -> Details {
    let mut details = Details::default();
    details.add(EVENTS).unwrap();
    details
}

fn names(list: &[&str]) -> Vec<String> {
    list.iter().map(|one| (*one).to_owned()).collect()
}

#[test]
fn types_a_field_from_the_detail_and_the_detail_it_extends() {
    let fields = details()
        .fields("HelixActivateEvent", &names(&["previous", "value"]))
        .unwrap();
    assert_eq!(
        fields,
        vec![
            Field {
                doc: Some("The value before the move.".to_owned()),
                name: "previous".to_owned(),
                optional: true,
                ty: "string".to_owned(),
            },
            Field {
                doc: Some("The value after the change.".to_owned()),
                name: "value".to_owned(),
                optional: false,
                ty: "string".to_owned(),
            },
        ]
    );
}

#[test]
fn writes_out_an_alias_a_field_names() {
    let fields = details()
        .fields("HelixPressEvent", &names(&["pointerType"]))
        .unwrap();
    assert_eq!(fields[0].ty, "'mouse' | 'touch'");
    assert_eq!(
        details().written("readonly Pointer[]", 0).unwrap(),
        "readonly ('mouse' | 'touch')[]"
    );
}

#[test]
fn refuses_a_field_typed_by_an_interface_and_a_class_with_no_detail() {
    let refused = details()
        .fields("HelixPressEvent", &names(&["at"]))
        .unwrap_err();
    assert!(refused.contains("`Point`"), "{refused}");
    let none = details()
        .fields("HelixActionEvent", &names(&["value"]))
        .unwrap_err();
    assert!(none.contains("carries no detail"), "{none}");
    let missing = details()
        .fields("HelixActivateEvent", &names(&["key"]))
        .unwrap_err();
    assert!(missing.contains("has no field `key`"), "{missing}");
}

#[test]
fn leaves_a_quoted_word_and_a_builtin_alone() {
    assert_eq!(
        details().written("Record<string, 'Pointer'>", 0).unwrap(),
        "Record<string, 'Pointer'>"
    );
}

#[test]
fn names_a_member_as_react_does() {
    assert_eq!(camel("default-active"), "defaultActive");
    assert_eq!(camel("label"), "label");
    assert_eq!(pascal("before-activate"), "BeforeActivate");
    assert_eq!(pascal("change"), "Change");
}

#[test]
fn writes_a_module_with_its_form_props_events_and_component() {
    let part = Part {
        component: "HelixTabs".to_owned(),
        constant: "rootForm".to_owned(),
        events: vec![Sends {
            bare: false,
            fields: details()
                .fields("HelixActivateEvent", &names(&["value"]))
                .unwrap(),
            handler: "onActivate".to_owned(),
            target: false,
            type_name: "HelixTabsActivateEvent".to_owned(),
            web: "helix-activate".to_owned(),
        }],
        form: "{\"name\":\"tabs\"}".to_owned(),
        hooks: Vec::new(),
        members: vec![
            Member {
                doc: names(&["The tabs."]),
                name: "children".to_owned(),
                ty: "ReactNode".to_owned(),
            },
            Member {
                doc: names(&["Fired after the active tab changes."]),
                name: "onActivate".to_owned(),
                ty: "(event: HelixTabsActivateEvent) => void".to_owned(),
            },
        ],
        summary: Some("A row of tabs.".to_owned()),
        tag: "helix-tabs".to_owned(),
        web_only: false,
    };
    let written = module("tabs", &[part]);
    for line in [
        "import type { ComponentType, ReactNode } from 'react'\nimport { behaviorFor, element, type Family, type HelixEvent } from '@fusion.dev/helix-native'\n",
        "const rootForm: Family = {\"name\":\"tabs\"}\n",
        "export type HelixTabsActivateEvent = HelixEvent<{\n  /** The value after the change. */\n  readonly value: string\n}>\n",
        "  /** The tabs. */\n  readonly children?: ReactNode\n",
        "  readonly onActivate?: (event: HelixTabsActivateEvent) => void\n",
        "/**\n * A row of tabs.\n *\n * `helix-tabs` drawn natively from its intermediate form.\n */\nexport const HelixTabs = element(rootForm, behaviorFor(rootForm)) as ComponentType<HelixTabsProps>\n",
        "export type { HelixEvent }\n",
    ] {
        assert!(written.contains(line), "{line}\n---\n{written}");
    }
    assert!(
        !written.contains("'../"),
        "the runtime is imported by its package name, whose entry checks the peers:\n{written}"
    );
}

#[test]
fn imports_the_module_of_each_element_a_box_draws() {
    let part = Part {
        component: "HelixCheckboxGroup".to_owned(),
        constant: "rootForm".to_owned(),
        events: Vec::new(),
        form: r#"{"tree":[{"attributes":{"draws":"helix-checkbox"},"name":"select-all"}]}"#
            .to_owned(),
        hooks: Vec::new(),
        members: Vec::new(),
        summary: None,
        tag: "helix-checkbox-group".to_owned(),
        web_only: false,
    };
    /* The form names the element by its tag, and the folder its module is
    in is the family's. */
    let folders =
        std::collections::BTreeMap::from([("helix-checkbox".to_owned(), "checkbox".to_owned())]);
    let written = module_in(
        "checkbox-group",
        &[part],
        &folders,
        &Origin {
            families: "helix/neutral",
            events: "helix/core/src/events",
            runtime: "@fusion.dev/helix-native",
            event_type: "HelixEvent",
        },
    );
    assert!(
        written.contains("import '../checkbox/index.native'\n"),
        "{written}"
    );
}

#[test]
fn imports_nothing_for_a_box_only_the_web_draws() {
    let part = Part {
        component: "HelixStep".to_owned(),
        constant: "stepForm".to_owned(),
        events: Vec::new(),
        form: r#"{"tree":[{"children":[{"attributes":{"draws":"helix-button","platform":"web"},"name":"label"}],"name":"body"}]}"#
            .to_owned(),
        hooks: Vec::new(),
        members: Vec::new(),
        summary: None,
        tag: "helix-step".to_owned(),
        web_only: false,
    };
    let written = module("steps", &[part]);
    assert!(!written.contains("button/index.native'"), "{written}");
}

#[test]
fn writes_a_component_that_draws_nothing_for_an_element_only_the_web_has() {
    let part = Part {
        component: "HelixSkipLink".to_owned(),
        constant: "rootForm".to_owned(),
        events: Vec::new(),
        form: "{}".to_owned(),
        hooks: Vec::new(),
        members: Vec::new(),
        summary: None,
        tag: "helix-skip-link".to_owned(),
        web_only: true,
    };
    let written = module("skip-link", &[part]);
    for line in [
        "import { type Family, webOnly } from '@fusion.dev/helix-native'\n",
        "export const HelixSkipLink = webOnly(rootForm) as ComponentType<HelixSkipLinkProps>\n",
    ] {
        assert!(written.contains(line), "{line}\n---\n{written}");
    }
}

#[test]
fn types_an_event_with_no_detail_as_an_empty_one() {
    let part = Part {
        component: "HelixTabPanel".to_owned(),
        constant: "panelForm".to_owned(),
        events: vec![Sends {
            bare: false,
            fields: Vec::new(),
            handler: "onLoad".to_owned(),
            target: false,
            type_name: "HelixTabPanelLoadEvent".to_owned(),
            web: "helix-load".to_owned(),
        }],
        form: "{}".to_owned(),
        hooks: Vec::new(),
        members: Vec::new(),
        summary: None,
        tag: "helix-tab-panel".to_owned(),
        web_only: false,
    };
    let written = module("tabs", &[part]);
    assert!(
        written.contains("export type HelixTabPanelLoadEvent = HelixEvent<Record<never, never>>\n"),
        "{written}"
    );
    assert!(
        written.contains("import type { ComponentType } from 'react'\n"),
        "{written}"
    );
}

#[test]
fn types_the_value_a_target_carries_beside_the_detail() {
    let sends = |fields: Vec<Field>, handler: &str, type_name: &str| Sends {
        bare: false,
        fields,
        handler: handler.to_owned(),
        target: true,
        type_name: type_name.to_owned(),
        web: String::new(),
    };
    let part = Part {
        component: "HelixList".to_owned(),
        constant: "rootForm".to_owned(),
        events: vec![
            sends(
                details()
                    .fields("HelixActivateEvent", &names(&["value"]))
                    .unwrap(),
                "onBeforeChange",
                "HelixListBeforeChangeEvent",
            ),
            sends(Vec::new(), "onChange", "HelixListChangeEvent"),
        ],
        form: "{}".to_owned(),
        hooks: Vec::new(),
        members: Vec::new(),
        summary: None,
        tag: "helix-list".to_owned(),
        web_only: false,
    };
    let written = module("list", &[part]);
    for line in [
        "export type HelixListBeforeChangeEvent = HelixEvent<\n  {\n    /** The value after the change. */\n    readonly value: string\n  },\n  { readonly value: string }\n>\n",
        "export type HelixListChangeEvent = HelixEvent<Record<never, never>, { readonly value: string }>\n",
        "which a web handler reads as `event.target.value`.",
    ] {
        assert!(written.contains(line), "{line}\n---\n{written}");
    }
}

/// An element `helix system` compiles from `headless`, with no styles of its own.
fn headless_family(name: &str, source: &str) -> Family {
    let styles =
        format!("export default family('{name}', {{ stylesheet: '{name}.css', rules: [] }})");
    Family::new(
        styled(&default_export(&styles).unwrap()).unwrap(),
        Some(headless(&default_export(source).unwrap()).unwrap()),
        name,
        "root",
    )
}

#[test]
fn carries_a_value_in_the_target_where_the_element_that_sends_the_event_has_one() {
    let set = headless_family(
        "tabs",
        "export default headless('tabs', {
          events: [event('activate'), event('before-select', { cancelable: true })],
          props: [prop('active', 'string')],
          tree: [region('default')],
        })",
    );
    let tab = headless_family(
        "tab",
        "export default headless('tab', {
          events: [event('before-select', { cancelable: true })],
          item: item('tabs'),
          props: [prop('value', 'string', { default: '' })],
          tree: [pressable('tab', { sends: 'before-select' }, [region('default')])],
        })",
    );
    /* Each handler, and whether its target carries a value. */
    let targets = |family: &Family, items: &[&Family]| -> Vec<String> {
        let typed = typed_members(family, "Helix", &json!({}), &details(), items).unwrap();
        let events = typed.events.into_iter();
        events
            .map(|one| format!("{} {}", one.handler, one.target))
            .collect()
    };
    /* A tab's before-select bubbles to the set on the web, so its target is the tab. */
    assert_eq!(
        targets(&set, &[&tab]),
        ["onActivate false", "onBeforeSelect true"]
    );
    assert_eq!(targets(&tab, &[]), ["onBeforeSelect true"]);
    /* A button's value and its form's `invalid` are the web's own. */
    let button = headless_family(
        "button",
        "export default headless('button', {
          events: [event('press'), event('invalid', { bare: true, platform: 'web' })],
          props: [prop('value', 'string', { default: '', platform: 'web' })],
          tree: [pressable('button', { sends: 'press' }, [region('default')])],
        })",
    );
    assert_eq!(targets(&button, &[]), ["onPress false"]);
}

#[test]
fn types_a_switch_with_one_named_value_as_a_boolean_or_that_value() {
    let flex = headless_family(
        "flex",
        "export default headless('flex', {
          props: [prop('wrap', [true, 'reverse'], { default: false })],
          tree: [region('default')],
        })",
    );
    let typed = typed_members(&flex, "Helix", &json!({}), &details(), &[]).unwrap();
    let wrap = typed.members.iter().find(|one| one.name == "wrap").unwrap();
    assert_eq!(wrap.ty, "boolean | 'reverse'");
}
