//! How an element keeps the time of day, as a relative time ticks from "4
//! minutes ago" to "5 minutes ago" when its words go stale.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// A tick on the time of day, and the derivation that says when what is
/// drawn from it goes stale.
///
/// **It is core's `wallClock`**, on the timers capability, which the web's
/// `RelativeClockController` and a phone's runtime both run, so a fake clock
/// moves both. Every derivation of the element is given the time of the last
/// tick as `now`, in milliseconds. It stops while the page or the app is
/// away, and catches up as it comes back.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Clock {
    /// The derivation in core that says, from the props and `now`, how many
    /// milliseconds what is drawn holds: `undefined` keeps no clock, and a
    /// wait that is not finite draws once and never ticks again.
    pub expires: String,
    /// The props whose change starts the clock again, as a date's `date`
    /// and `relative`: a change of any other prop draws again from the last
    /// tick. None names every prop.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[ts(optional, as = "Option<Vec<String>>")]
    #[schemars(default)]
    pub restarts: Vec<String>,
}

impl Clock {
    /// Each prop the clock names, where a source writes it.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        self.restarts
            .iter()
            .map(|name| ("restarts", name.as_str(), Names::Prop))
            .collect()
    }
}

/// `clock({ expires, restarts })`, the name of a derivation and the props
/// that start it again.
pub fn clock(lit: &Lit) -> Result<Clock, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`clock` is a call to `clock()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "clock", arguments.as_slice()) else {
        return Err("`clock` is a call to `clock()` with an object".to_owned());
    };
    let mut clock = Clock::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("expires", Lit::Text(name)) => clock.expires.clone_from(name),
            ("restarts", Lit::Array(names)) => {
                for name in names {
                    let Lit::Text(name) = name else {
                        return Err("clock: `restartOn` is a list of prop names".to_owned());
                    };
                    clock.restarts.push(name.clone());
                }
            }
            (key, _) => return Err(format!("clock: `{key}` is not a field it has")),
        }
    }
    if clock.expires.is_empty() {
        return Err("clock: a clock names the derivation it `expires` by".to_owned());
    }
    Ok(clock)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(fields: Vec<(&str, Lit)>) -> Lit {
        Lit::Call(
            "clock".to_owned(),
            vec![Lit::Object(
                fields
                    .into_iter()
                    .map(|(key, value)| (key.to_owned(), value))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_derivation_it_expires_by() {
        let read = clock(&call(vec![(
            "expires",
            Lit::Text("format-date-expires".to_owned()),
        )]));
        assert_eq!(
            read,
            Ok(Clock {
                expires: "format-date-expires".to_owned(),
                restarts: Vec::new(),
            })
        );
    }

    #[test]
    fn reads_the_props_that_start_it_again() {
        let read = clock(&call(vec![
            ("expires", Lit::Text("format-date-expires".to_owned())),
            (
                "restarts",
                Lit::Array(vec![
                    Lit::Text("date".to_owned()),
                    Lit::Text("frozen".to_owned()),
                ]),
            ),
        ]))
        .unwrap();
        assert_eq!(read.restarts, vec!["date".to_owned(), "frozen".to_owned()]);
        assert_eq!(read.references().len(), 2);
    }

    #[test]
    fn refuses_restarts_that_are_not_names() {
        let read = clock(&call(vec![
            ("expires", Lit::Text("format-date-expires".to_owned())),
            ("restarts", Lit::Array(vec![Lit::Number(1.0)])),
        ]));
        assert_eq!(
            read,
            Err("clock: `restartOn` is a list of prop names".to_owned())
        );
    }

    #[test]
    fn refuses_a_clock_with_nothing_to_expire_by() {
        assert_eq!(
            clock(&call(vec![])),
            Err("clock: a clock names the derivation it `expires` by".to_owned())
        );
    }

    #[test]
    fn refuses_a_field_it_does_not_have() {
        let read = clock(&call(vec![("every", Lit::Text("1s".to_owned()))]));
        assert_eq!(read, Err("clock: `every` is not a field it has".to_owned()));
    }
}
