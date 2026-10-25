//! How an element follows the page it stands over as the page scrolls, as an
//! app header lifts off the page once it has scrolled and moves out of the
//! way on a scroll down.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// The page an element follows as it scrolls, the states it is in as the
/// page stands, and the event it sends as the page leaves its top.
///
/// **The web element follows the window, or the element its `scroller`
/// names by id.** A phone follows the view registered under that id with
/// `useTarget`, or else the scroll view the element is drawn in, through the
/// scroll capability's `observe`.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Page {
    /// The state that holds while a scroll down has moved the element out of
    /// the way.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hidden: Option<String>,
    /// The prop that moves the element out of the way on a scroll down past
    /// its own height, and back on a scroll up.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hides: Option<String>,
    /// The state that holds while the page stands scrolled from its top.
    pub scrolled: String,
    /// The prop that holds the id of what scrolls, where the page is not
    /// the window or the scroll view the element is drawn in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scroller: Option<String>,
    /// The event sent as `scrolled` turns, its detail `scrolled`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sends: Option<String>,
    /// The prop that keeps the element in view while it holds, as an open
    /// folded region does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stays: Option<String>,
}

impl Page {
    /// Each name the page holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = vec![("scrolled", self.scrolled.as_str(), Names::State)];
        for (at, name, kind) in [
            ("hidden", &self.hidden, Names::State),
            ("hides", &self.hides, Names::Prop),
            ("scroller", &self.scroller, Names::Prop),
            ("sends", &self.sends, Names::Event),
            ("stays", &self.stays, Names::Prop),
        ] {
            if let Some(name) = name {
                names.push((at, name.as_str(), kind));
            }
        }
        names
    }
}

/// `page({ hidden, hides, scrolled, scroller, sends, stays })`, each field a
/// name.
pub fn page(lit: &Lit) -> Result<Page, String> {
    let mut page = Page::default();
    for (key, name) in fields(lit, "page")? {
        let named = Some(name.to_owned());
        match key {
            "hidden" => page.hidden = named,
            "hides" => page.hides = named,
            "scrolled" => name.clone_into(&mut page.scrolled),
            "scroller" => page.scroller = named,
            "sends" => page.sends = named,
            "stays" => page.stays = named,
            key => return Err(format!("page: `{key}` is not a field it has")),
        }
    }
    if page.scrolled.is_empty() {
        return Err("page: a page names its `scrolled` state".to_owned());
    }
    if page.hides.is_some() != page.hidden.is_some() {
        return Err("page: `hides` and `hidden` name the prop and the state together".to_owned());
    }
    Ok(page)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "page".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_states_the_props_and_the_event() {
        let read = page(&call(&[
            ("hidden", "hidden"),
            ("hides", "hide-on-scroll"),
            ("scrolled", "scrolled"),
            ("scroller", "scroller"),
            ("sends", "scrolled"),
            ("stays", "open"),
        ]))
        .unwrap();
        assert_eq!(read.hides.as_deref(), Some("hide-on-scroll"));
        assert_eq!(read.references().len(), 6);
        assert!(read
            .references()
            .contains(&("sends", "scrolled", Names::Event)));
    }

    #[test]
    fn refuses_a_page_with_no_scrolled_state() {
        assert_eq!(
            page(&call(&[("sends", "scrolled")])),
            Err("page: a page names its `scrolled` state".to_owned())
        );
    }

    #[test]
    fn refuses_a_prop_that_hides_with_no_state() {
        assert_eq!(
            page(&call(&[
                ("hides", "hide-on-scroll"),
                ("scrolled", "scrolled")
            ])),
            Err("page: `hides` and `hidden` name the prop and the state together".to_owned())
        );
    }

    #[test]
    fn refuses_a_field_it_does_not_have() {
        assert_eq!(
            page(&call(&[("scrolled", "scrolled"), ("window", "x")])),
            Err("page: `window` is not a field it has".to_owned())
        );
    }
}
