//! One element's native props: its props, its regions, and its events, each
//! typed from the form and described from the styled manifest.

use serde_json::Value as Json;

use crate::family::api::{Event, Literal, Node, NodeKind, Primitive, Prop, PropType};
use crate::family::components::details::{Details, Field};
use crate::family::components::hooks;
use crate::family::ir::{self, Family, Item};
use crate::family::project::Names;

/// One member of a component's props: a prop, a region, or a handler.
#[derive(Debug, PartialEq, Eq)]
pub struct Member {
    /// What it is, in paragraphs.
    pub doc: Vec<String>,
    pub name: String,
    /// Its type, as TypeScript writes it.
    pub ty: String,
}

/// One event a component sends, with its detail typed.
#[derive(Debug, PartialEq, Eq)]
pub struct Sends {
    /// Whether it is the platform's own event, which carries its fields on itself.
    pub bare: bool,
    pub fields: Vec<Field>,
    /// The handler that hears it, such as `onActivate`.
    pub handler: String,
    /// Whether its `target` carries the `value` of the element that sent it.
    pub target: bool,
    /// The type of the event the handler hears, such as `HelixTabsActivateEvent`.
    pub type_name: String,
    /// The name the web sends it under, such as `helix-activate`.
    pub web: String,
}

/// What an element takes and sends on a phone.
#[derive(Debug, Default)]
pub struct Typed {
    pub events: Vec<Sends>,
    /// The members of the `hooks` prop's type, one per hook.
    pub hooks: Vec<Member>,
    pub members: Vec<Member>,
}

/// `name` in camel case: `default-active` is `defaultActive`.
pub fn camel(name: &str) -> String {
    let mut out = String::new();
    let mut upper = false;
    for one in name.chars() {
        if one == '-' {
            upper = true;
        } else if upper {
            out.extend(one.to_uppercase());
            upper = false;
        } else {
            out.push(one);
        }
    }
    out
}

/// `name` in Pascal case: `before-activate` is `BeforeActivate`.
pub fn pascal(name: &str) -> String {
    let camel = camel(name);
    let mut chars = camel.chars();
    chars.next().map_or_else(String::new, |first| {
        first.to_uppercase().chain(chars).collect()
    })
}

/// The first paragraph of a description, where it has one.
fn first(description: Option<&str>) -> Option<String> {
    let text = description?.trim();
    let paragraph = text.split("\n\n").next().unwrap_or_default().trim();
    (!paragraph.is_empty()).then(|| paragraph.to_owned())
}

/// The description of the entry named `name` in a declaration's list `key`.
fn described(declaration: &Json, key: &str, name: &str) -> Option<String> {
    declaration[key]
        .as_array()?
        .iter()
        .find(|entry| entry["name"] == name)
        .and_then(|entry| first(entry["description"].as_str()))
}

/// `text` as a single-quoted TypeScript string.
fn quoted(text: &str) -> String {
    format!("'{}'", text.replace('\\', "\\\\").replace('\'', "\\'"))
}

/// What a prop holds, as TypeScript writes it.
fn typed(kind: &PropType) -> String {
    match kind {
        PropType::Primitive(Primitive::Boolean) => "boolean".to_owned(),
        PropType::Primitive(Primitive::Number) => "number".to_owned(),
        PropType::Primitive(Primitive::NumberOrString) => "number | string".to_owned(),
        /* Any object, as `Intl.NumberFormatOptions` is one, which an
        interface would not be to a record of strings. */
        PropType::Primitive(Primitive::Object) => "object".to_owned(),
        PropType::Primitive(Primitive::String) => "string".to_owned(),
        /* A moment as a phone's code holds one, or as the web writes it. */
        PropType::Primitive(Primitive::Time) => "Date | number | string".to_owned(),
        /* The empty string is the attribute present with no value, which a
        phone takes as `true`, and `false` beside it is the attribute absent. */
        /* A function, by the signature its source writes out. */
        PropType::Function { function } => function.clone(),
        PropType::Values(values) => values
            .iter()
            .map(|value| {
                if value.is_empty() {
                    "boolean".to_owned()
                } else {
                    quoted(value)
                }
            })
            .collect::<Vec<_>>()
            .join(" | "),
    }
}

/// A default as a `@default` tag writes it.
fn written(default: &Literal) -> String {
    match default {
        Literal::Flag(flag) => flag.to_string(),
        Literal::Number(number) => number.to_string(),
        Literal::Text(text) => quoted(text),
    }
}

/// A prop the web element and a phone both have.
fn prop(prop: &Prop, declaration: &Json) -> Member {
    let name = camel(&prop.name);
    let mut doc: Vec<String> = described(declaration, "members", &name)
        .into_iter()
        .collect();
    if let Some(default) = &prop.default {
        doc.push(format!("@default {}", written(default)));
    }
    Member {
        doc,
        name,
        ty: typed(&prop.kind),
    }
}

/// The regions a tree draws, by name, in the order they are drawn, once each.
pub fn regions<'a>(tree: &'a [Node], into: &mut Vec<&'a str>) {
    for node in tree {
        if node.kind == NodeKind::Region && !into.contains(&node.name.as_str()) {
            into.push(&node.name);
        }
        regions(&node.children, into);
    }
}

/// The web's slot a region fills: its name, or the empty name for the default.
pub fn slot_of(region: &str) -> &str {
    if region == "default" {
        ""
    } else {
        region
    }
}

/// The prop that fills a region: `children` for the default, and the region's
/// name in camel case for any other.
pub fn region_prop(region: &str) -> String {
    if region == "default" {
        "children".to_owned()
    } else {
        camel(region)
    }
}

/// The name the web sends an event under: the event prefix and its name, or
/// its name alone for one the web sends bare.
pub fn web_event(event: &Event, names: &Names) -> String {
    if event.bare {
        event.name.clone()
    } else {
        names.event(&event.name)
    }
}

/// The handler that hears an event: `on` and its name in Pascal case.
///
/// A platform event whose name is two words run together is spelled as React
/// spells it, `onScrollEnd` for `scrollend`, which is what the web's typings
/// and `REACT_CASING` in `helix/core/src/helix-element/react-bridge.ts` name.
pub fn handler_of(event: &Event) -> String {
    format!("on{}", spelled(event))
}

/// An event's name in Pascal case, with a joined platform name in two words.
pub fn spelled(event: &Event) -> String {
    JOINED
        .iter()
        .find(|(name, _)| event.bare && *name == event.name)
        .map_or_else(|| pascal(&event.name), |(_, two)| (*two).to_owned())
}

/// Platform events named as two words run together, and their Pascal case.
/// The same list as `REACT_CASING` on the web.
pub const JOINED: &[(&str, &str)] = &[
    ("canplay", "CanPlay"),
    ("canplaythrough", "CanPlayThrough"),
    ("durationchange", "DurationChange"),
    ("loadeddata", "LoadedData"),
    ("loadedmetadata", "LoadedMetadata"),
    ("loadstart", "LoadStart"),
    ("ratechange", "RateChange"),
    ("scrollend", "ScrollEnd"),
    ("timeupdate", "TimeUpdate"),
    ("volumechange", "VolumeChange"),
];

/// A region as the prop that fills it, or as more of a prop of the same name,
/// as a list's `loading` is a flag and the words drawn while it holds.
fn region(name: &str, declaration: &Json, members: &mut Vec<Member>) {
    let doc = described(declaration, "slots", slot_of(name));
    let named = region_prop(name);
    if let Some(same) = members.iter_mut().find(|member| member.name == named) {
        same.ty = format!("{} | ReactNode", same.ty);
        /* The region's sentence after the prop's, and before its tags. */
        let at = same
            .doc
            .iter()
            .position(|one| one.starts_with('@'))
            .unwrap_or(same.doc.len());
        same.doc.splice(at..at, doc);
        return;
    }
    members.push(Member {
        doc: doc.into_iter().collect(),
        name: named,
        ty: "ReactNode".to_owned(),
    });
}

/// Whether an element has a `value` prop that a phone has.
fn valued(family: &Family) -> bool {
    family
        .api
        .props
        .iter()
        .any(|prop| prop.name == "value" && prop.platform.is_none())
}

/// Whether the `target` of `family`'s `event` carries a value: the element
/// that sends it has one. An event that `items`, the elements that join
/// `family`, send too is theirs, as the web's bubbles from the item to the
/// set.
fn targets_value(family: &Family, items: &[&Family], event: &Event) -> bool {
    let senders: Vec<&Family> = items
        .iter()
        .copied()
        .filter(|item| item.api.events.iter().any(|one| one.name == event.name))
        .collect();
    if senders.is_empty() {
        valued(family)
    } else {
        senders.into_iter().all(valued)
    }
}

/// An event the element sends, with its detail typed from the web's class,
/// and whether its `target` carries a value.
fn event(
    event: &Event,
    component: &str,
    declaration: &Json,
    details: &Details,
    target: bool,
    names: &Names,
) -> Result<(Member, Sends), String> {
    let web = web_event(event, names);
    let handler = handler_of(event);
    let type_name = format!("{component}{}Event", spelled(event));
    let mut detail = event.detail.clone();
    detail.sort();
    let fields = if detail.is_empty() {
        Vec::new()
    } else {
        let class = declaration["events"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|entry| entry["name"] == web.as_str())
            .and_then(|entry| entry["type"]["text"].as_str())
            .ok_or_else(|| format!("the manifest gives `{web}` no class"))?;
        details
            .fields(class, &detail)
            .map_err(|why| format!("`{web}`: {why}"))?
    };
    let member = Member {
        doc: described(declaration, "events", &web).into_iter().collect(),
        name: handler.clone(),
        ty: format!("(event: {type_name}) => void"),
    };
    Ok((
        member,
        Sends {
            bare: event.bare,
            fields,
            handler,
            target,
            type_name,
            web,
        },
    ))
}

/// Whether `family` draws quotation marks, which follow its language.
fn quotes(family: &Family) -> bool {
    family.rules.iter().any(|item| match item {
        Item::Rule(rule) => rule.set.iter().any(|(_, value)| ir::quoted(value)),
        Item::Keyframes(_) => false,
    })
}

/// `lang`, which a component that draws quotation marks takes, as every web
/// element takes the HTML attribute.
fn language() -> Member {
    Member {
        doc: vec![
            "The language of the words, such as `de`, whose quotation marks the component draws. Absent, the language of the component it is in, and then the reader's."
                .to_owned(),
        ],
        name: "lang".to_owned(),
        ty: "string".to_owned(),
    }
}

/// What `family`'s component, `component`, takes and sends on a phone: each
/// prop and each event but the web's own, and each region, sorted by name.
/// `items` are the elements that join it, whose events bubble to it.
///
/// # Errors
///
/// A sentence for each event whose detail cannot be typed.
pub fn typed_members(
    family: &Family,
    component: &str,
    declaration: &Json,
    details: &Details,
    items: &[&Family],
) -> Result<Typed, Vec<String>> {
    let mut members: Vec<Member> = family
        .api
        .props
        .iter()
        .filter(|one| one.platform.is_none())
        .map(|one| prop(one, declaration))
        .collect();
    let mut drawn = Vec::new();
    regions(&family.tree, &mut drawn);
    for name in drawn {
        region(name, declaration, &mut members);
    }
    if quotes(family) {
        members.push(language());
    }
    members.extend(
        [hooks::prop(component, family)]
            .into_iter()
            .chain(hooks::id(family)),
    );
    /* A form control's ref is its handle, as a field's is on the web. */
    if family.api.validation.is_some() {
        /* A control that holds files offers them on its handle too, as the
        web element's methods do. */
        let (ty, doc) = if family.api.files.is_some() {
            (
                "Ref<FilesHandle>",
                "The control's handle. `validate()` shows what is wrong with the answer, as the web's `reportValidity()` does, and returns whether it is acceptable. `files()`, `removeAt()`, `clear()` and `setFileStatus()` read and change the files it holds, as the web element's methods do.",
            )
        } else {
            (
                "Ref<FieldHandle>",
                "The control's handle. `validate()` shows what is wrong with the answer, as the web's `reportValidity()` does, and returns whether it is acceptable.",
            )
        };
        members.push(Member {
            doc: vec![doc.to_owned()],
            name: "ref".to_owned(),
            ty: ty.to_owned(),
        });
    }
    let mut typed = Typed::default();
    let mut faults = Vec::new();
    for one in family
        .api
        .events
        .iter()
        .filter(|one| one.platform.is_none())
    {
        let target = targets_value(family, items, one);
        match event(one, component, declaration, details, target, &family.names) {
            Ok((member, sends)) => {
                members.push(member);
                typed.events.push(sends);
            }
            Err(why) => faults.push(format!("{}: {why}", family.tag)),
        }
    }
    if !faults.is_empty() {
        return Err(faults);
    }
    members.sort_by_key(|member| member.name.to_lowercase());
    typed
        .events
        .sort_by_key(|sends| sends.type_name.to_lowercase());
    typed.members = members;
    typed.hooks = hooks::members(family, declaration);
    Ok(typed)
}
