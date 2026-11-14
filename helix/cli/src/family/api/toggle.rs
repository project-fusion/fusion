//! How an element that turns on and off says so: the prop that holds whether
//! it is checked, or the state the runtime holds for it, the props that seed
//! it, show it mixed, and keep it from changing, and the events a press
//! sends. A pressable that `toggles` is the part a press turns it with.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What an element that turns on and off holds. A checkbox is checked, a
/// switch is on, and a toggle button is pressed.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Toggle {
    /// The events sent once the element has turned, in order, as a checkbox
    /// sends `input` and then `change`.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<String>>")]
    #[schemars(default)]
    pub after: Vec<String>,
    /// The event sent before it turns, which a handler can cancel.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The event sent once it stands the other way, however it came to: a
    /// press, the page writing its prop, or its set, as an accordion
    /// section sends `toggle`, with `newState` and `oldState`, `open` or
    /// `closed`, as the platform's `ToggleEvent` carries them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changes: Option<String>,
    /// Whether Escape on its pressable that `toggles` closes it, as a press
    /// does, as a toast item's dismiss button closes its message.
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[ts(optional, as = "Option<bool>")]
    #[schemars(default)]
    pub escapes: bool,
    /// The prop that holds whether it is checked, on, or pressed. Absent
    /// where the runtime holds it, under `held`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked: Option<String>,
    /// The event sent once it has closed, however it came to, as a dialog
    /// sends `close` after its `toggle`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closed: Option<String>,
    /// The event sent before it closes, which a handler can cancel, as an
    /// accordion section's `before-close`. Named with `opens`, in place of
    /// `before`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closes: Option<String>,
    /// What the runtime holds whether it is checked in, where no prop holds
    /// it: `page-motion`, whether the page's motion is paused, which every
    /// Motion Toggle on a page shares.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub held: Option<String>,
    /// The prop that seeds it where nothing sets it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial: Option<String>,
    /// The prop that shows it as neither, which a press resolves.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mixed: Option<String>,
    /// The event sent before it opens, which a handler can cancel, as an
    /// accordion section's `before-open`. Named with `closes`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opens: Option<String>,
    /// The prop that keeps a press from changing it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readonly: Option<String>,
}

impl Toggle {
    /// Each name the toggle holds, where a source writes it, and what it
    /// names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        /* In the order the fields are written, `after` first. */
        let after = self
            .after
            .iter()
            .map(|event| ("after", event.as_str(), Names::Event));
        let rest = [
            ("before", self.before.as_ref(), Names::Event),
            ("changes", self.changes.as_ref(), Names::Event),
            ("checked", self.checked.as_ref(), Names::Prop),
            ("closed", self.closed.as_ref(), Names::Event),
            ("closes", self.closes.as_ref(), Names::Event),
            ("initial", self.initial.as_ref(), Names::Prop),
            ("mixed", self.mixed.as_ref(), Names::Prop),
            ("opens", self.opens.as_ref(), Names::Event),
            ("readonly", self.readonly.as_ref(), Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)));
        after.chain(rest).collect()
    }
}

/// What the runtime holds a toggle's state in, by name: whether the page's
/// motion is paused.
pub const HELD: &[&str] = &["page-motion"];

/// `toggle({ checked, ... })` or `toggle({ held, ... })`, each field a name,
/// and `after` a name or several in the order they are sent.
pub fn toggle(lit: &Lit) -> Result<Toggle, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`toggle` is a call to `toggle()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "toggle", arguments.as_slice()) else {
        return Err("`toggle` is a call to `toggle()` with an object".to_owned());
    };
    let mut toggle = Toggle::default();
    for (key, value) in fields {
        if let ("after", Lit::Array(events)) = (key.as_str(), value) {
            for event in events {
                let Lit::Text(event) = event else {
                    return Err("toggle: `after` names events".to_owned());
                };
                toggle.after.push(event.clone());
            }
            continue;
        }
        if key == "escapes" {
            let Lit::Bool(true) = value else {
                return Err("toggle: `escapes` is `true`".to_owned());
            };
            toggle.escapes = true;
            continue;
        }
        let Lit::Text(name) = value else {
            return Err(format!("toggle: `{key}` is not a field it has"));
        };
        if key == "after" {
            toggle.after.push(name.clone());
            continue;
        }
        let slot = match key.as_str() {
            "before" => &mut toggle.before,
            "changes" => &mut toggle.changes,
            "checked" => &mut toggle.checked,
            "closed" => &mut toggle.closed,
            "closes" => &mut toggle.closes,
            "held" => &mut toggle.held,
            "initial" => &mut toggle.initial,
            "mixed" => &mut toggle.mixed,
            "opens" => &mut toggle.opens,
            "readonly" => &mut toggle.readonly,
            _ => return Err(format!("toggle: `{key}` is not a field it has")),
        };
        *slot = Some(name.clone());
    }
    directions(&toggle)?;
    if toggle.escapes && toggle.closes.is_none() {
        return Err(
            "a toggle that says `closeOnEscape` names the event it closes with, `onBeforeClose`"
                .to_owned(),
        );
    }
    match (&toggle.checked, &toggle.held) {
        (None, None) => {
            return Err(
                "a toggle names the prop that holds whether it is checked, `prop`, or what the runtime holds it in, `shared`"
                    .to_owned(),
            )
        }
        (Some(_), Some(_)) => {
            return Err("a toggle names `prop` or `shared`, and not both".to_owned())
        }
        (None, Some(held)) if !HELD.contains(&held.as_str()) => {
            return Err(format!(
                "toggle: `shared` names `{held}`, and the runtime holds {}",
                HELD.iter()
                    .map(|name| format!("`{name}`"))
                    .collect::<Vec<_>>()
                    .join(", ")
            ))
        }
        _ => {}
    }
    Ok(toggle)
}

/// A toggle that opens names an event for each direction, and then no
/// `before`. **A toggle that only closes names `closes` alone**, as a
/// callout's dismissal: a press closes it, and only the page opens it again,
/// with nothing sent.
fn directions(toggle: &Toggle) -> Result<(), String> {
    match (&toggle.opens, &toggle.closes, &toggle.before) {
        (Some(_), None, _) => Err(
            "a toggle that opens names the event sent before each direction, `onBeforeOpen` and `onBeforeClose`"
                .to_owned(),
        ),
        (Some(_), Some(_), Some(_)) => {
            Err("a toggle names `onBeforeChange`, or `onBeforeOpen` and `onBeforeClose`, and not both".to_owned())
        }
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::{toggle, Toggle};
    use crate::family::read::Lit;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "toggle".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_each_name_it_holds() {
        let read = toggle(&call(&[
            ("after", "change"),
            ("before", "before-check"),
            ("checked", "checked"),
            ("initial", "default-checked"),
            ("mixed", "indeterminate"),
            ("readonly", "readonly"),
        ]))
        .unwrap();
        assert_eq!(
            read,
            Toggle {
                after: vec!["change".to_owned()],
                before: Some("before-check".to_owned()),
                changes: None,
                checked: Some("checked".to_owned()),
                closed: None,
                closes: None,
                escapes: false,
                held: None,
                initial: Some("default-checked".to_owned()),
                mixed: Some("indeterminate".to_owned()),
                opens: None,
                readonly: Some("readonly".to_owned()),
            }
        );
    }

    #[test]
    fn reads_the_event_sent_once_it_has_closed() {
        let read = toggle(&call(&[
            ("checked", "open"),
            ("closed", "close"),
            ("closes", "before-close"),
            ("opens", "before-open"),
        ]))
        .unwrap();
        assert_eq!(read.closed.as_deref(), Some("close"));
        assert!(read
            .references()
            .contains(&("closed", "close", super::Names::Event)));
    }

    #[test]
    fn refuses_a_toggle_with_no_checked_prop_or_a_field_it_lacks() {
        assert_eq!(
            toggle(&call(&[("after", "change")])).unwrap_err(),
            "a toggle names the prop that holds whether it is checked, `prop`, or what the runtime holds it in, `shared`"
        );
        assert_eq!(
            toggle(&call(&[("checked", "checked"), ("pressed", "pressed")])).unwrap_err(),
            "toggle: `pressed` is not a field it has"
        );
    }

    #[test]
    fn reads_a_state_the_runtime_holds_and_refuses_one_it_does_not() {
        let read = toggle(&call(&[("after", "change"), ("held", "page-motion")])).unwrap();
        assert_eq!(read.held.as_deref(), Some("page-motion"));
        assert_eq!(read.checked, None);
        assert_eq!(
            toggle(&call(&[("held", "page-color")])).unwrap_err(),
            "toggle: `shared` names `page-color`, and the runtime holds `page-motion`"
        );
        assert_eq!(
            toggle(&call(&[("checked", "checked"), ("held", "page-motion")])).unwrap_err(),
            "a toggle names `prop` or `shared`, and not both"
        );
    }

    #[test]
    fn reads_an_event_for_each_direction_and_refuses_one_alone_or_beside_before() {
        let read = toggle(&call(&[
            ("checked", "open"),
            ("closes", "before-close"),
            ("opens", "before-open"),
        ]))
        .unwrap();
        assert_eq!(read.opens.as_deref(), Some("before-open"));
        assert_eq!(read.closes.as_deref(), Some("before-close"));
        assert_eq!(
            toggle(&call(&[("checked", "open"), ("opens", "before-open")])).unwrap_err(),
            "a toggle that opens names the event sent before each direction, `onBeforeOpen` and `onBeforeClose`"
        );
        let closing = toggle(&call(&[("checked", "open"), ("closes", "dismiss")])).unwrap();
        assert_eq!(closing.closes.as_deref(), Some("dismiss"));
        assert_eq!(closing.opens, None);
        assert_eq!(
            toggle(&call(&[
                ("before", "before-check"),
                ("checked", "open"),
                ("closes", "before-close"),
                ("opens", "before-open"),
            ]))
            .unwrap_err(),
            "a toggle names `onBeforeChange`, or `onBeforeOpen` and `onBeforeClose`, and not both"
        );
    }

    #[test]
    fn reads_escape_on_a_toggle_that_closes() {
        let fields = vec![
            ("checked".to_owned(), Lit::Text("open".to_owned())),
            ("closes".to_owned(), Lit::Text("dismiss".to_owned())),
            ("escapes".to_owned(), Lit::Bool(true)),
        ];
        let read = toggle(&Lit::Call("toggle".to_owned(), vec![Lit::Object(fields)])).unwrap();
        assert!(read.escapes);
        let alone = vec![
            ("checked".to_owned(), Lit::Text("open".to_owned())),
            ("escapes".to_owned(), Lit::Bool(true)),
        ];
        assert_eq!(
            toggle(&Lit::Call("toggle".to_owned(), vec![Lit::Object(alone)])).unwrap_err(),
            "a toggle that says `closeOnEscape` names the event it closes with, `onBeforeClose`"
        );
    }
}
