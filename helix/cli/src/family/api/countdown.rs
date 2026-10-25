//! How an element spends a time it is given and waits its turn, as an
//! announcement dismisses itself after its `duration` and a queued one waits
//! behind the one before it.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// A time the element spends once it is drawn, and the event it sends once
/// the time is spent.
///
/// **It is core's `countdown`**, on the timers capability, which the web's
/// `CountdownController` and a phone's runtime both run, so a fake clock
/// moves both. A touch, focus, and a page or an app away from the front each
/// hold the clock, and it runs on from what was left once none does.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Countdown {
    /// The prop that holds the time, in milliseconds, or as a CSS time such
    /// as `8s`. None, zero, or less starts nothing.
    pub after: String,
    /// The event sent once the time is spent, as a press on the element's
    /// dismiss button sends it.
    pub done: String,
    /// The state that holds while the clock is stopped partway.
    pub paused: String,
    /// A state that keeps the clock from starting while it holds, and starts
    /// it as it stops holding, as a queued announcement's `waiting`.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub waits: Option<String>,
}

impl Countdown {
    /// Each name the countdown holds, where a source writes it, and what it
    /// names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = vec![
            ("after", self.after.as_str(), Names::Prop),
            ("done", self.done.as_str(), Names::Event),
            ("paused", self.paused.as_str(), Names::State),
        ];
        if let Some(waits) = &self.waits {
            names.push(("waits", waits.as_str(), Names::State));
        }
        names
    }
}

/// A turn the element waits for behind the elements of its kind before it,
/// while the prop `queued` holds on it and on them, with the state that
/// holds while it waits.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Queue {
    /// The prop that puts the element in the queue.
    pub queued: String,
    /// The state that holds while a queued element before it is still there.
    pub waiting: String,
}

impl Queue {
    /// Each name the queue holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        vec![
            ("queued", self.queued.as_str(), Names::Prop),
            ("waiting", self.waiting.as_str(), Names::State),
        ]
    }
}

/// The text fields of a call to `helper()` with an object, by name.
pub(super) fn fields<'a>(lit: &'a Lit, helper: &str) -> Result<Vec<(&'a str, &'a str)>, String> {
    let Lit::Call(called, arguments) = lit else {
        return Err(format!("`{helper}` is a call to `{helper}()`"));
    };
    let (true, [Lit::Object(fields)]) = (called == helper, arguments.as_slice()) else {
        return Err(format!(
            "`{helper}` is a call to `{helper}()` with an object"
        ));
    };
    fields
        .iter()
        .map(|(key, value)| match value {
            Lit::Text(name) => Ok((key.as_str(), name.as_str())),
            _ => Err(format!("{helper}: `{key}` is a name")),
        })
        .collect()
}

/// `countdown({ after, done, paused, waits })`, each field a name.
pub fn countdown(lit: &Lit) -> Result<Countdown, String> {
    let mut countdown = Countdown::default();
    for (key, name) in fields(lit, "countdown")? {
        let name = name.to_owned();
        match key {
            "after" => countdown.after = name,
            "done" => countdown.done = name,
            "paused" => countdown.paused = name,
            "waits" => countdown.waits = Some(name),
            key => return Err(format!("countdown: `{key}` is not a field it has")),
        }
    }
    if countdown.after.is_empty() || countdown.done.is_empty() || countdown.paused.is_empty() {
        return Err("countdown: a countdown names `after`, `done`, and `paused`".to_owned());
    }
    Ok(countdown)
}

/// `queue({ queued, waiting })`, each field a name.
pub fn queue(lit: &Lit) -> Result<Queue, String> {
    let mut queue = Queue::default();
    for (key, name) in fields(lit, "queue")? {
        let name = name.to_owned();
        match key {
            "queued" => queue.queued = name,
            "waiting" => queue.waiting = name,
            key => return Err(format!("queue: `{key}` is not a field it has")),
        }
    }
    if queue.queued.is_empty() || queue.waiting.is_empty() {
        return Err("queue: a queue names `queued` and `waiting`".to_owned());
    }
    Ok(queue)
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
    fn reads_the_time_the_event_the_states() {
        let read = countdown(&call(
            "countdown",
            &[
                ("after", "duration"),
                ("done", "dismiss"),
                ("paused", "paused"),
                ("waits", "waiting"),
            ],
        ))
        .unwrap();
        assert_eq!(read.waits.as_deref(), Some("waiting"));
        assert_eq!(read.references().len(), 4);
    }

    #[test]
    fn refuses_a_countdown_with_no_event_or_a_field_it_lacks() {
        assert_eq!(
            countdown(&call("countdown", &[("after", "duration")])).unwrap_err(),
            "countdown: a countdown names `after`, `done`, and `paused`"
        );
        assert_eq!(
            countdown(&call("countdown", &[("holds", "x")])).unwrap_err(),
            "countdown: `holds` is not a field it has"
        );
    }

    #[test]
    fn reads_a_queue_and_refuses_one_with_no_state() {
        let read = queue(&call(
            "queue",
            &[("queued", "queued"), ("waiting", "waiting")],
        ))
        .unwrap();
        assert_eq!(read.references().len(), 2);
        assert_eq!(
            queue(&call("queue", &[("queued", "queued")])).unwrap_err(),
            "queue: a queue names `queued` and `waiting`"
        );
    }
}
