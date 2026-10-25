//! How an element follows the sections of a page as it scrolls, as an
//! outline marks the link of the section being read.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// The sections the page registers, the list the element draws from them,
/// and the props and the event that say how it follows them.
///
/// **A phone has no document to find a section in by its id**, so each
/// section registers its view under its id, its words and its level, and
/// the runtime gives the element the list as the value `list` names: each
/// entry's `id`, `href`, `label`, `level`, `depth`, and `current`, which is
/// `location` while the section is marked. The web element reads its links
/// and finds each section by the fragment its link names.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Sections {
    /// The prop that says how a press on a link scrolls to its section:
    /// `smooth`, `instant`, or `auto`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub behavior: Option<String>,
    /// The event sent as the section being read changes, with its id as
    /// `value`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changes: Option<String>,
    /// The prop that says whether the element keeps the marked link in view
    /// in a box of its own that scrolls.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow: Option<String>,
    /// The part the element draws for each section, which `follow` keeps in
    /// view.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub link: Option<String>,
    /// The part that travels to the link of the section being read, as the
    /// web's moving mark does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mark: Option<String>,
    /// The value the element computes that holds the sections, which a
    /// repeat's `each` binds.
    pub list: String,
    /// The prop that says which sections are marked: `reading` or `visible`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub marks: Option<String>,
    /// The prop that holds how far below the top of what the sections scroll
    /// in a heading counts as reached.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<String>,
}

impl Sections {
    /// Each name the sections hold, where a source writes it, and what it
    /// names. `list` is the element's own, and names nothing.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = Vec::new();
        if let Some(prop) = &self.behavior {
            names.push(("behavior", prop.as_str(), Names::Prop));
        }
        if let Some(event) = &self.changes {
            names.push(("changes", event.as_str(), Names::Event));
        }
        if let Some(prop) = &self.follow {
            names.push(("follow", prop.as_str(), Names::Prop));
        }
        if let Some(part) = &self.link {
            names.push(("link", part.as_str(), Names::Part));
        }
        if let Some(part) = &self.mark {
            names.push(("mark", part.as_str(), Names::Part));
        }
        if let Some(prop) = &self.marks {
            names.push(("marks", prop.as_str(), Names::Prop));
        }
        if let Some(prop) = &self.offset {
            names.push(("offset", prop.as_str(), Names::Prop));
        }
        names
    }
}

/// A section of the page the element is, which an outline draws a link
/// for: the props that hold its id, its link's words, and its heading's
/// level.
///
/// **The web finds the element by its id**, as it finds any anchor, and a
/// phone registers the element's view under the id, as `useSection` does.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Section {
    /// The prop that holds the section's id, which a link's fragment names.
    pub id: String,
    /// The prop that holds the words its link says.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    /// The prop that holds its heading's level, from 1.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<String>,
}

impl Section {
    /// Each name the section holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = vec![("id", self.id.as_str(), Names::Prop)];
        if let Some(prop) = &self.label {
            names.push(("label", prop.as_str(), Names::Prop));
        }
        if let Some(prop) = &self.level {
            names.push(("level", prop.as_str(), Names::Prop));
        }
        names
    }
}

/// `section({ id, label, level })`, each field a prop's name.
pub fn section(lit: &Lit) -> Result<Section, String> {
    let mut section = Section::default();
    for (key, name) in fields(lit, "section")? {
        let name = name.to_owned();
        match key {
            "id" => section.id = name,
            "label" => section.label = Some(name),
            "level" => section.level = Some(name),
            key => return Err(format!("section: `{key}` is not a field it has")),
        }
    }
    if section.id.is_empty() {
        return Err("section: a section names its `id`".to_owned());
    }
    Ok(section)
}

/// `sections({ list, behavior, changes, follow, link, mark, marks, offset })`, each
/// field a name.
pub fn sections(lit: &Lit) -> Result<Sections, String> {
    let mut sections = Sections::default();
    for (key, name) in fields(lit, "sections")? {
        let name = name.to_owned();
        match key {
            "behavior" => sections.behavior = Some(name),
            "changes" => sections.changes = Some(name),
            "follow" => sections.follow = Some(name),
            "link" => sections.link = Some(name),
            "list" => sections.list = name,
            "mark" => sections.mark = Some(name),
            "marks" => sections.marks = Some(name),
            "offset" => sections.offset = Some(name),
            key => return Err(format!("sections: `{key}` is not a field it has")),
        }
    }
    if sections.list.is_empty() {
        return Err("sections: sections name their `list`".to_owned());
    }
    Ok(sections)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "sections".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_list_the_props_and_the_event() {
        let read = sections(&call(&[
            ("list", "sections"),
            ("changes", "activate"),
            ("offset", "offset"),
            ("mark", "indicator"),
        ]))
        .unwrap();
        assert_eq!(read.list, "sections");
        assert_eq!(read.mark.as_deref(), Some("indicator"));
        assert_eq!(read.references().len(), 3);
    }

    #[test]
    fn reads_a_section_and_refuses_one_with_no_id() {
        let call = |fields: &[(&str, &str)]| {
            Lit::Call(
                "section".to_owned(),
                vec![Lit::Object(
                    fields
                        .iter()
                        .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                        .collect(),
                )],
            )
        };
        let read = section(&call(&[("id", "anchor"), ("level", "level")])).unwrap();
        assert_eq!(read.references().len(), 2);
        assert_eq!(
            section(&call(&[("label", "label")])).unwrap_err(),
            "section: a section names its `id`"
        );
    }

    #[test]
    fn refuses_sections_with_no_list_or_a_field_they_lack() {
        assert_eq!(
            sections(&call(&[("changes", "activate")])).unwrap_err(),
            "sections: sections name their `list`"
        );
        assert_eq!(
            sections(&call(&[("list", "sections"), ("ids", "x")])).unwrap_err(),
            "sections: `ids` is not a field it has"
        );
    }
}
