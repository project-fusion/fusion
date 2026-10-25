//! The machines that keep time: the delay an element that declares a
//! `delay` runs, and the clock one that declares a `clock` runs.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Clock, Countdown, Delay, Queue};
use crate::family::ir::DERIVATIONS;

/// A wait, core's `delay`, bound to the prop that holds it, the prop that
/// starts it again, and the state that holds while it runs.
pub(super) fn delayed(delay: &Delay) -> MachineUse {
    let mut bind = BTreeMap::from([
        ("after".to_owned(), Bound::Prop(delay.after.clone())),
        ("waiting".to_owned(), Bound::State(delay.waiting.clone())),
    ]);
    if let Some(restarts) = &delay.restarts {
        bind.insert("restarts".to_owned(), Bound::Prop(restarts.clone()));
    }
    if let Some(again) = &delay.again {
        bind.insert("again".to_owned(), Bound::Prop(again.clone()));
    }
    MachineUse {
        bind,
        machine: "delay".to_owned(),
    }
}

/// A time spent, core's `countdown`, bound to the prop that holds it, the
/// event sent once it is spent, the state that holds while it is stopped,
/// and the state that keeps it from starting.
pub(super) fn counted(countdown: &Countdown) -> MachineUse {
    let mut bind = BTreeMap::from([
        ("after".to_owned(), Bound::Prop(countdown.after.clone())),
        ("done".to_owned(), Bound::Event(countdown.done.clone())),
        ("paused".to_owned(), Bound::State(countdown.paused.clone())),
    ]);
    if let Some(waits) = &countdown.waits {
        bind.insert("waits".to_owned(), Bound::State(waits.clone()));
    }
    MachineUse {
        bind,
        machine: "countdown".to_owned(),
    }
}

/// A turn waited for, bound to the prop that queues the element and the
/// state that holds while it waits.
pub(super) fn queued(queue: &Queue) -> MachineUse {
    MachineUse {
        bind: BTreeMap::from([
            ("queued".to_owned(), Bound::Prop(queue.queued.clone())),
            ("waiting".to_owned(), Bound::State(queue.waiting.clone())),
        ]),
        machine: "queue".to_owned(),
    }
}

/// A tick on the time of day, core's `wallClock`, bound to the function in
/// core's derivations that says when what is drawn goes stale. **Nothing
/// where the derivation names no function**, which `resolve` reports.
pub(super) fn clocked(clock: &Clock) -> Option<MachineUse> {
    let (_, function) = DERIVATIONS
        .iter()
        .find(|(name, _)| *name == clock.expires)?;
    let mut bind = BTreeMap::from([("expires".to_owned(), Bound::Derive((*function).to_owned()))]);
    if !clock.restarts.is_empty() {
        bind.insert("restarts".to_owned(), Bound::Props(clock.restarts.clone()));
    }
    Some(MachineUse {
        bind,
        machine: "clock".to_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binds_the_function_a_clock_expires_by() {
        let used = clocked(&Clock {
            expires: "format-date-expires".to_owned(),
            restarts: vec!["date".to_owned()],
        })
        .unwrap();
        assert_eq!(used.machine, "clock");
        assert_eq!(
            used.bind.get("restarts"),
            Some(&Bound::Props(vec!["date".to_owned()]))
        );
        assert_eq!(
            used.bind.get("expires"),
            Some(&Bound::Derive("formatDateExpires".to_owned()))
        );
    }

    #[test]
    fn binds_nothing_for_a_derivation_core_does_not_have() {
        let used = clocked(&Clock {
            expires: "never-stale".to_owned(),
            restarts: Vec::new(),
        });
        assert_eq!(used, None);
    }

    #[test]
    fn binds_the_wait_the_state_and_what_restarts_it() {
        let used = delayed(&Delay {
            after: "delay".to_owned(),
            again: None,
            restarts: Some("idle".to_owned()),
            waiting: "waiting".to_owned(),
        });
        assert_eq!(used.machine, "delay");
        assert_eq!(
            used.bind.get("waiting"),
            Some(&Bound::State("waiting".to_owned()))
        );
        assert_eq!(
            used.bind.get("restarts"),
            Some(&Bound::Prop("idle".to_owned()))
        );
    }
}
