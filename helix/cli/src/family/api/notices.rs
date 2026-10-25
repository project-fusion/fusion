//! How a stack of messages holds the messages passed into it, and how one
//! message stands in it, as a toast's region holds its toasts.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// The messages passed into the element, which it stacks and holds.
///
/// **Its messages are the elements drawn inside it whose source declares a
/// `notice`**, in the order they were first drawn. A touch on any of them
/// holds every one's clock, past `max` open ones a message waits, and a
/// swipe dismisses one toward the edge `toward` names.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Notices {
    /// An event of its messages the element hears after each message's own
    /// handler, which a handler on the element may refuse, as the web's
    /// event bubbles from a message to its region.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hears: Option<String>,
    /// The prop that says how many messages show at once.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<String>,
    /// The value the element computes, whether one of its messages shows,
    /// which its layer's `open` binds.
    pub showing: String,
    /// The prop that names the edge a swipe dismisses a message toward.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toward: Option<String>,
}

impl Notices {
    /// What an element's stack and its place in one compute: whether the
    /// stack holds a message, and the state a message waits in.
    pub fn computed(api: &super::Api) -> impl Iterator<Item = &str> {
        let showing = api.notices.iter().map(|one| one.showing.as_str());
        showing.chain(api.notice.iter().map(|one| one.waiting.as_str()))
    }

    /// Each name the stack holds, where a source writes it, and what it names.
    /// `showing` is a value it computes, so it names nothing of the source.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("hears", &self.hears, Names::Event),
            ("max", &self.max, Names::Prop),
            ("toward", &self.toward, Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.as_deref().map(|name| (at, name, names)))
        .collect()
    }
}

/// One message of the `notices` around it: the part a touch swipes, and the
/// state that holds while the element around holds it back.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Notice {
    /// The part a touch swipes toward the edge the element around names.
    pub part: String,
    /// The state that holds while the element around holds the message back.
    pub waiting: String,
}

impl Notice {
    /// Each name the message holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        vec![
            ("part", self.part.as_str(), Names::Part),
            ("waiting", self.waiting.as_str(), Names::State),
        ]
    }
}

/// `notices({ hears, max, showing, toward })`, each field a name.
pub fn notices(lit: &Lit) -> Result<Notices, String> {
    let mut notices = Notices::default();
    for (key, name) in fields(lit, "notices")? {
        let named = Some(name.to_owned());
        match key {
            "hears" => notices.hears = named,
            "max" => notices.max = named,
            "showing" => name.clone_into(&mut notices.showing),
            "toward" => notices.toward = named,
            key => return Err(format!("notices: `{key}` is not a field it has")),
        }
    }
    if notices.showing.is_empty() {
        return Err("notices: a stack names the value `showing` it computes".to_owned());
    }
    Ok(notices)
}

/// `notice({ part, waiting })`, each field a name.
pub fn notice(lit: &Lit) -> Result<Notice, String> {
    let mut notice = Notice::default();
    for (key, name) in fields(lit, "notice")? {
        match key {
            "part" => name.clone_into(&mut notice.part),
            "waiting" => name.clone_into(&mut notice.waiting),
            key => return Err(format!("notice: `{key}` is not a field it has")),
        }
    }
    if notice.part.is_empty() || notice.waiting.is_empty() {
        return Err("notice: a message names its `part` and its `waiting` state".to_owned());
    }
    Ok(notice)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(helper: &str, fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            helper.to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_a_stack_and_what_it_names() {
        let read = notices(&call(
            "notices",
            &[
                ("hears", "dismiss"),
                ("max", "max-visible"),
                ("showing", "showing"),
                ("toward", "swipe-direction"),
            ],
        ))
        .unwrap();
        assert_eq!(read.showing, "showing");
        assert_eq!(read.references().len(), 3);
    }

    #[test]
    fn refuses_a_stack_that_computes_nothing() {
        assert_eq!(
            notices(&call("notices", &[("max", "max-visible")])).unwrap_err(),
            "notices: a stack names the value `showing` it computes"
        );
        assert_eq!(
            notices(&call("notices", &[("holds", "x")])).unwrap_err(),
            "notices: `holds` is not a field it has"
        );
    }

    #[test]
    fn reads_a_message_and_refuses_one_with_no_state() {
        let read = notice(&call("notice", &[("part", "item"), ("waiting", "waiting")])).unwrap();
        assert_eq!(read.references().len(), 2);
        assert_eq!(
            notice(&call("notice", &[("part", "item")])).unwrap_err(),
            "notice: a message names its `part` and its `waiting` state"
        );
    }
}
