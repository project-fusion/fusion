//! The machines of a control and of a row of them: a picture's load, the
//! verdict on a form control's answer, a toolbar's roving focus, and a copy
//! to the clipboard.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Api, Attribute, Binding, Copy, Node, Toolbar, Validation};
use crate::family::resolve::toolbar_part;

/// A toolbar's roving focus, bound to the part that holds its controls and
/// to the props that turn it and stop its keys at the ends.
pub(super) fn roving_toolbar(toolbar: &Toolbar, tree: &[Node]) -> MachineUse {
    let mut bind = BTreeMap::from([(
        "orientation".to_owned(),
        Bound::Prop(toolbar.orientation.clone()),
    )]);
    if let Some(ends) = &toolbar.ends {
        bind.insert("ends".to_owned(), Bound::Prop(ends.clone()));
    }
    if let Some(part) = toolbar_part(tree) {
        bind.insert("part".to_owned(), Bound::Part(part.name.clone()));
    }
    MachineUse {
        bind,
        machine: "roving-focus".to_owned(),
    }
}

/// The verdict on a form control's answer: the props it reads, and where
/// the answer is held, the toggle's checked prop, the entry's text, or the
/// collection's chosen one, with the props that bar it from validation, being read-only or
/// disabled.
pub(super) fn validated(validation: &Validation, api: &Api) -> MachineUse {
    let mut bind = BTreeMap::from([(
        "required".to_owned(),
        Bound::Prop(validation.required.clone()),
    )]);
    if let Some(message) = &validation.message {
        bind.insert("message".to_owned(), Bound::State(message.clone()));
    }
    for (name, value) in [
        ("bad", &validation.bad),
        ("feedback", &validation.feedback),
        ("maxlength", &validation.maxlength),
        ("minlength", &validation.minlength),
        ("missing", &validation.missing),
        ("off", &validation.off),
        ("over", &validation.over),
        ("pattern", &validation.pattern),
        ("short", &validation.short),
        ("type", &validation.kind),
        ("under", &validation.under),
    ] {
        if let Some(prop) = value {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    if let Some(toggle) = &api.toggle {
        if let Some(checked) = &toggle.checked {
            bind.insert("checked".to_owned(), Bound::Prop(checked.clone()));
        }
        if let Some(readonly) = &toggle.readonly {
            bind.insert("readonly".to_owned(), Bound::Prop(readonly.clone()));
        }
    } else if let Some(entry) = &api.entry {
        bind.insert("value".to_owned(), Bound::Prop(entry.value.clone()));
        if let Some(readonly) = &entry.readonly {
            bind.insert("readonly".to_owned(), Bound::Prop(readonly.clone()));
        }
    } else if let Some(range) = &api.range {
        /* A range always holds a value, so its answer is never missing. */
        bind.insert("ranged".to_owned(), Bound::Prop(range.value.clone()));
        if let Some(readonly) = &range.readonly {
            bind.insert("readonly".to_owned(), Bound::Prop(readonly.clone()));
        }
    } else if let Some(chosen) = api.collection.as_ref().and_then(|set| set.chosen.as_ref()) {
        bind.insert("chosen".to_owned(), Bound::Prop(chosen.clone()));
    }
    for barred in ["disabled", "readonly"] {
        if !bind.contains_key(barred) && api.props.iter().any(|prop| prop.name == barred) {
            bind.insert(barred.to_owned(), Bound::Prop(barred.to_owned()));
        }
    }
    MachineUse {
        bind,
        machine: "validation".to_owned(),
    }
}

/// A picture's load machine, bound to its part, the prop behind its `src`,
/// and the events it sends as it loads and as it fails. **No machine of
/// core's holds it**: the web's element asks its `<img>`, and the native
/// runtime hosts it as `load`, `idle`, `loading`, `loaded`, or `failed`.
pub(super) fn load(node: &Node) -> MachineUse {
    let mut bind = BTreeMap::from([("part".to_owned(), Bound::Part(node.name.clone()))]);
    if let Some(Attribute::Bound(Binding::Bind(prop))) = node.attributes.get("src") {
        bind.insert("src".to_owned(), Bound::Prop(prop.clone()));
    }
    for (attribute, name) in [("loads", "load"), ("fails", "error")] {
        if let Some(Attribute::Text(event)) = node.attributes.get(attribute) {
            bind.insert(name.to_owned(), Bound::Event(event.clone()));
        }
    }
    MachineUse {
        bind,
        machine: "load".to_owned(),
    }
}

/// A copy to the clipboard, bound to the pressable that `copies`, the prop
/// that holds the text and the one that holds how long the result stands,
/// the states the result holds, the events it sends, the values it names
/// the element by, and the words for each result. **No machine of core's
/// holds it**: the web's `CopyController` copies, and the native runtime
/// hosts it as `copy`.
pub(super) fn copied(copy: &Copy, tree: &[Node]) -> MachineUse {
    let mut bind = BTreeMap::from([
        ("after".to_owned(), Bound::Prop(copy.after.clone())),
        ("copied".to_owned(), Bound::State(copy.copied.clone())),
        ("failed".to_owned(), Bound::State(copy.failed.clone())),
        ("fails".to_owned(), Bound::Event(copy.fails.clone())),
        ("says".to_owned(), Bound::State(copy.says.clone())),
        ("sends".to_owned(), Bound::Event(copy.sends.clone())),
        ("text".to_owned(), Bound::Prop(copy.text.clone())),
        ("told".to_owned(), Bound::State(copy.told.clone())),
        (
            "words-copied".to_owned(),
            Bound::Prop(copy.words.copied.clone()),
        ),
        (
            "words-failed".to_owned(),
            Bound::Prop(copy.words.failed.clone()),
        ),
        (
            "words-resting".to_owned(),
            Bound::Prop(copy.words.resting.clone()),
        ),
    ]);
    let mut copying = Vec::new();
    crate::family::resolve::pressables_that_copy(tree, &mut copying);
    if let Some(part) = copying.first() {
        bind.insert("part".to_owned(), Bound::Part((*part).to_owned()));
    }
    MachineUse {
        bind,
        machine: "copy".to_owned(),
    }
}
