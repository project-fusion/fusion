//! The machines a stack of messages and each of its messages run: `notices`
//! on the element that holds them, as a toast's region, bound to the value
//! it computes, the props that hold how many show and which way a swipe
//! goes, and the event it hears of its messages; and `notice` on each
//! message, as a toast item, bound to its part and the state it waits in. A
//! toggle that `escapes` binds Escape.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Api, Notice, Notices};

/// The stack an element holds and its place in one, each a machine where
/// its source declares it.
pub(super) fn noticing(api: &Api) -> impl Iterator<Item = MachineUse> + '_ {
    let notice = api.notice.as_ref().map(noticed);
    notice.into_iter().chain(api.notices.as_ref().map(stacked_notices))
}

/// The stack, bound to the value it computes, whether a message shows, the
/// props that hold how many show at once and which way a swipe goes, and
/// the event of its messages it hears.
pub(super) fn stacked_notices(notices: &Notices) -> MachineUse {
    let mut bind = BTreeMap::from([("showing".to_owned(), Bound::State(notices.showing.clone()))]);
    for (name, prop) in [("max", &notices.max), ("toward", &notices.toward)] {
        if let Some(prop) = prop {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    if let Some(event) = &notices.hears {
        bind.insert("hears".to_owned(), Bound::Event(event.clone()));
    }
    MachineUse {
        bind,
        machine: "notices".to_owned(),
    }
}

/// A message of the stack around it, bound to the part a touch swipes and
/// the state it waits in.
pub(super) fn noticed(notice: &Notice) -> MachineUse {
    MachineUse {
        bind: BTreeMap::from([
            ("part".to_owned(), Bound::Part(notice.part.clone())),
            ("waiting".to_owned(), Bound::State(notice.waiting.clone())),
        ]),
        machine: "notice".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binds_the_stacks_value_its_props_and_its_event() {
        let used = stacked_notices(&Notices {
            hears: Some("dismiss".to_owned()),
            max: Some("max-visible".to_owned()),
            showing: "showing".to_owned(),
            toward: None,
        });
        assert_eq!(used.machine, "notices");
        assert_eq!(
            used.bind.get("showing"),
            Some(&Bound::State("showing".to_owned()))
        );
        assert_eq!(
            used.bind.get("max"),
            Some(&Bound::Prop("max-visible".to_owned()))
        );
        assert_eq!(
            used.bind.get("hears"),
            Some(&Bound::Event("dismiss".to_owned()))
        );
        assert_eq!(used.bind.get("toward"), None);
    }

    #[test]
    fn binds_a_messages_part_and_its_state() {
        let used = noticed(&Notice {
            part: "item".to_owned(),
            waiting: "waiting".to_owned(),
        });
        assert_eq!(used.machine, "notice");
        assert_eq!(used.bind.get("part"), Some(&Bound::Part("item".to_owned())));
        assert_eq!(
            used.bind.get("waiting"),
            Some(&Bound::State("waiting".to_owned()))
        );
    }
}
