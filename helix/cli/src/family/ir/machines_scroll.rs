//! The machines that read where a page scrolls: the scroll an element that
//! declares a `scroll` runs, the page one that declares a `page` runs, and
//! the sections one that declares `sections` runs.

use std::collections::BTreeMap;

use super::{Bound, MachineUse};
use crate::family::api::{Page, Scroll, Section, Sections};

/// Where a part that scrolls stands, bound to the part, the state for each
/// edge with more past it and for content longer than the part, and the
/// events sent as it moves and comes to rest.
pub(super) fn scrolled(scroll: &Scroll) -> MachineUse {
    let mut bind = BTreeMap::from([("part".to_owned(), Bound::Part(scroll.part.clone()))]);
    for (edge, state) in &scroll.more {
        bind.insert(edge.clone(), Bound::State(state.clone()));
    }
    if let Some(state) = &scroll.overflows {
        bind.insert("overflows".to_owned(), Bound::State(state.clone()));
    }
    if let Some(event) = &scroll.moves {
        bind.insert("moves".to_owned(), Bound::Event(event.clone()));
    }
    if let Some(event) = &scroll.settles {
        bind.insert("settles".to_owned(), Bound::Event(event.clone()));
    }
    MachineUse {
        bind,
        machine: "scroll".to_owned(),
    }
}

/// The page an element follows as it scrolls, bound to the states it is in
/// as the page stands, the props that name what scrolls, hide it, and keep
/// it in view, and the event sent as the page leaves its top.
pub(super) fn paged(page: &Page) -> MachineUse {
    let mut bind = BTreeMap::from([("scrolled".to_owned(), Bound::State(page.scrolled.clone()))]);
    if let Some(state) = &page.hidden {
        bind.insert("hidden".to_owned(), Bound::State(state.clone()));
    }
    for (name, prop) in [
        ("hides", &page.hides),
        ("scroller", &page.scroller),
        ("stays", &page.stays),
    ] {
        if let Some(prop) = prop {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    if let Some(event) = &page.sends {
        bind.insert("sends".to_owned(), Bound::Event(event.clone()));
    }
    MachineUse {
        bind,
        machine: "page".to_owned(),
    }
}

/// The sections a page registers, bound to the value that holds their list,
/// the props that say how they are followed, the event sent as the one
/// being read changes, and the parts drawn for each and moved to it.
pub(super) fn sectioned(sections: &Sections) -> MachineUse {
    let mut bind = BTreeMap::from([("list".to_owned(), Bound::State(sections.list.clone()))]);
    for (name, prop) in [
        ("behavior", &sections.behavior),
        ("follow", &sections.follow),
        ("marks", &sections.marks),
        ("offset", &sections.offset),
    ] {
        if let Some(prop) = prop {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    if let Some(event) = &sections.changes {
        bind.insert("changes".to_owned(), Bound::Event(event.clone()));
    }
    for (name, part) in [("link", &sections.link), ("mark", &sections.mark)] {
        if let Some(part) = part {
            bind.insert(name.to_owned(), Bound::Part(part.clone()));
        }
    }
    MachineUse {
        bind,
        machine: "sections".to_owned(),
    }
}

/// The section of the page the element is, bound to the props that hold its
/// id, its link's words, and its heading's level.
pub(super) fn section_of(section: &Section) -> MachineUse {
    let mut bind = BTreeMap::from([("id".to_owned(), Bound::Prop(section.id.clone()))]);
    for (name, prop) in [("label", &section.label), ("level", &section.level)] {
        if let Some(prop) = prop {
            bind.insert(name.to_owned(), Bound::Prop(prop.clone()));
        }
    }
    MachineUse {
        bind,
        machine: "section".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binds_the_part_each_edge_and_the_events() {
        let used = scrolled(&Scroll {
            more: BTreeMap::from([("block-end".to_owned(), "more-block-end".to_owned())]),
            moves: Some("scroll".to_owned()),
            overflows: Some("scrolls".to_owned()),
            part: "viewport".to_owned(),
            settles: None,
        });
        assert_eq!(used.machine, "scroll");
        assert_eq!(
            used.bind.get("block-end"),
            Some(&Bound::State("more-block-end".to_owned()))
        );
        assert_eq!(
            used.bind.get("moves"),
            Some(&Bound::Event("scroll".to_owned()))
        );
        assert_eq!(used.bind.get("settles"), None);
    }

    #[test]
    fn binds_the_pages_states_its_props_and_its_event() {
        let used = paged(&Page {
            hidden: Some("hidden".to_owned()),
            hides: Some("hide-on-scroll".to_owned()),
            scrolled: "scrolled".to_owned(),
            scroller: Some("scroller".to_owned()),
            sends: Some("scrolled".to_owned()),
            stays: None,
        });
        assert_eq!(used.machine, "page");
        assert_eq!(
            used.bind.get("scrolled"),
            Some(&Bound::State("scrolled".to_owned()))
        );
        assert_eq!(
            used.bind.get("hides"),
            Some(&Bound::Prop("hide-on-scroll".to_owned()))
        );
        assert_eq!(
            used.bind.get("sends"),
            Some(&Bound::Event("scrolled".to_owned()))
        );
        assert_eq!(used.bind.get("stays"), None);
    }

    #[test]
    fn binds_the_list_the_props_and_the_event() {
        let used = sectioned(&Sections {
            behavior: None,
            changes: Some("activate".to_owned()),
            follow: Some("follow".to_owned()),
            link: Some("link".to_owned()),
            list: "sections".to_owned(),
            mark: Some("indicator".to_owned()),
            marks: Some("marks".to_owned()),
            offset: None,
        });
        assert_eq!(used.machine, "sections");
        assert_eq!(
            used.bind.get("list"),
            Some(&Bound::State("sections".to_owned()))
        );
        assert_eq!(
            used.bind.get("marks"),
            Some(&Bound::Prop("marks".to_owned()))
        );
        assert_eq!(used.bind.get("link"), Some(&Bound::Part("link".to_owned())));
        assert_eq!(
            used.bind.get("mark"),
            Some(&Bound::Part("indicator".to_owned()))
        );
    }

    #[test]
    fn binds_a_sections_id_and_words() {
        let used = section_of(&Section {
            id: "anchor".to_owned(),
            label: Some("label".to_owned()),
            level: None,
        });
        assert_eq!(used.machine, "section");
        assert_eq!(used.bind.get("id"), Some(&Bound::Prop("anchor".to_owned())));
        assert_eq!(used.bind.len(), 2);
    }
}
