//! How an element holds something back until a wait is over, as a loader
//! waits out its `delay` before it shows, so quick work never flashes one.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// A wait the element starts as it is drawn, and a state that holds while it
/// runs.
///
/// **It is core's `delay`**, on the timers capability, which the web's
/// `DelayController` and a phone's runtime both run, so a fake clock moves
/// both. A wait of zero or less, or none, starts nothing.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Delay {
    /// The prop that holds the wait, in milliseconds.
    pub after: String,
    /// A prop whose change starts the wait again, as an image's `src`: a new
    /// picture waits again before its placeholder shows.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub again: Option<String>,
    /// A prop that, while it holds, stops the state from holding, and that
    /// starts the wait again as it stops holding, as a loader's `idle`.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub restarts: Option<String>,
    /// The state that holds while the wait runs, which a `when()`, a
    /// `bind()` and a rule's `state` read by name, as a loader is `waiting`.
    pub waiting: String,
}

impl Delay {
    /// Each name the delay holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = vec![
            ("after", self.after.as_str(), Names::Prop),
            ("waiting", self.waiting.as_str(), Names::State),
        ];
        if let Some(restarts) = &self.restarts {
            names.push(("restarts", restarts.as_str(), Names::Prop));
        }
        if let Some(again) = &self.again {
            names.push(("again", again.as_str(), Names::Prop));
        }
        names
    }
}

/// `delay({ after, again, restarts, waiting })`, each field a name.
pub fn delay(lit: &Lit) -> Result<Delay, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`delay` is a call to `delay()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "delay", arguments.as_slice()) else {
        return Err("`delay` is a call to `delay()` with an object".to_owned());
    };
    let mut delay = Delay::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("after", Lit::Text(name)) => delay.after.clone_from(name),
            ("again", Lit::Text(name)) => delay.again = Some(name.clone()),
            ("restarts", Lit::Text(name)) => delay.restarts = Some(name.clone()),
            ("waiting", Lit::Text(name)) => delay.waiting.clone_from(name),
            (key, _) => return Err(format!("delay: `{key}` is not a field it has")),
        }
    }
    if delay.after.is_empty() || delay.waiting.is_empty() {
        return Err("delay: a delay names `after` and `waiting`".to_owned());
    }
    Ok(delay)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(value: &str) -> Lit {
        Lit::Text(value.to_owned())
    }

    fn call(fields: Vec<(&str, Lit)>) -> Lit {
        Lit::Call(
            "delay".to_owned(),
            vec![Lit::Object(
                fields
                    .into_iter()
                    .map(|(key, value)| (key.to_owned(), value))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_wait_the_state_and_what_restarts_it() {
        let read = delay(&call(vec![
            ("after", text("delay")),
            ("restarts", text("idle")),
            ("waiting", text("waiting")),
        ]))
        .unwrap();
        assert_eq!(
            read,
            Delay {
                after: "delay".to_owned(),
                again: None,
                restarts: Some("idle".to_owned()),
                waiting: "waiting".to_owned(),
            }
        );
        assert_eq!(read.references().len(), 3);
    }

    #[test]
    fn refuses_a_delay_with_no_state() {
        let read = delay(&call(vec![("after", text("delay"))]));
        assert_eq!(
            read,
            Err("delay: a delay names `after` and `waiting`".to_owned())
        );
    }

    #[test]
    fn refuses_a_field_it_does_not_have() {
        let read = delay(&call(vec![("for", text("x"))]));
        assert_eq!(read, Err("delay: `for` is not a field it has".to_owned()));
    }
}
