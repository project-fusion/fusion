//! How an element a reader picks files into says so, as its source's
//! `files`: the props that say which files it takes and how many, the words
//! its rows and its announcements take, the events a change sends, and the
//! list of chosen files a repeat draws. A pressable that `picks` opens the
//! picker, and one that `removes` takes its row's file out.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// What an element a reader picks files into holds, as a file input's
/// chosen files.
///
/// **The web element holds `File`s in its `<input type="file">`, and a phone
/// holds the records the files capability gives**, each a name, a size, a
/// media type, and the URI its content is read from. The runtime gives the
/// element the chosen files as the value `list` names: each entry's `key`,
/// `name`, `size` and `kind` as its row writes them, and `removeLabel`, the
/// words its press that removes is named by.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct FileChoice {
    /// The prop that holds which files the picker offers and a pick takes,
    /// as a native `accept` list.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accept: Option<String>,
    /// The event sent before the chosen files change, which a handler can
    /// cancel, with their names as `value`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The prop that holds how a size under a kilobyte is written, with
    /// `{count}`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<String>,
    /// The event sent once the chosen files changed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change: Option<String>,
    /// The state the element is in while it holds a file.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filled: Option<String>,
    /// The event sent once the chosen files changed, before `change`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,
    /// The prop that holds the most bytes one file may have.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub largest: Option<String>,
    /// The value the element computes that holds the chosen files, which a
    /// repeat's `each` binds.
    pub list: String,
    /// The prop that holds the locale sizes and names are written in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    /// The prop that holds the most files the element holds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub most: Option<String>,
    /// The prop that says whether the element holds more than one file.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiple: Option<String>,
    /// The prop that holds the words a press that removes is named by, with
    /// `{name}`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub naming: Option<String>,
    /// The prop that holds what a screen reader hears of the files a pick
    /// leaves out, with `{count}` and `{names}`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refused: Option<String>,
    /// The event sent once a pick leaves files out, with each one and why.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reject: Option<String>,
    /// The prop that holds what a screen reader hears once a file is
    /// removed, with `{name}`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed: Option<String>,
}

impl FileChoice {
    /// Each name the files hold, where a source writes it, and what it
    /// names. `list` is the element's own, and names nothing.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("accept", self.accept.as_ref(), Names::Prop),
            ("before", self.before.as_ref(), Names::Event),
            ("bytes", self.bytes.as_ref(), Names::Prop),
            ("change", self.change.as_ref(), Names::Event),
            ("filled", self.filled.as_ref(), Names::State),
            ("input", self.input.as_ref(), Names::Event),
            ("largest", self.largest.as_ref(), Names::Prop),
            ("locale", self.locale.as_ref(), Names::Prop),
            ("most", self.most.as_ref(), Names::Prop),
            ("multiple", self.multiple.as_ref(), Names::Prop),
            ("naming", self.naming.as_ref(), Names::Prop),
            ("refused", self.refused.as_ref(), Names::Prop),
            ("reject", self.reject.as_ref(), Names::Event),
            ("removed", self.removed.as_ref(), Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)))
        .collect()
    }
}

/// `files({ list, accept, before, ... })`, each field a name.
pub fn files(lit: &Lit) -> Result<FileChoice, String> {
    let mut read = FileChoice::default();
    for (key, name) in fields(lit, "files")? {
        let slot = match key {
            "accept" => &mut read.accept,
            "before" => &mut read.before,
            "bytes" => &mut read.bytes,
            "change" => &mut read.change,
            "filled" => &mut read.filled,
            "input" => &mut read.input,
            "largest" => &mut read.largest,
            "list" => {
                name.clone_into(&mut read.list);
                continue;
            }
            "locale" => &mut read.locale,
            "most" => &mut read.most,
            "multiple" => &mut read.multiple,
            "naming" => &mut read.naming,
            "refused" => &mut read.refused,
            "reject" => &mut read.reject,
            "removed" => &mut read.removed,
            key => return Err(format!("files: `{key}` is not a field it has")),
        };
        *slot = Some(name.to_owned());
    }
    if read.list.is_empty() {
        return Err("files: the files name their `list`".to_owned());
    }
    Ok(read)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "files".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_list_the_props_and_the_events() {
        let read = files(&call(&[
            ("list", "chosen"),
            ("accept", "accept"),
            ("before", "before-change"),
            ("filled", "has-files"),
            ("reject", "reject"),
        ]))
        .unwrap();
        assert_eq!(read.list, "chosen");
        assert_eq!(read.accept.as_deref(), Some("accept"));
        assert_eq!(read.references().len(), 4);
    }

    #[test]
    fn refuses_files_with_no_list_or_a_field_they_lack() {
        assert_eq!(
            files(&call(&[("accept", "accept")])).unwrap_err(),
            "files: the files name their `list`"
        );
        assert_eq!(
            files(&call(&[("list", "chosen"), ("checked", "checked")])).unwrap_err(),
            "files: `checked` is not a field it has"
        );
    }
}
