//! A set whose items turn on their own, as a checkbox group's boxes do: the
//! set holds the values of the items that are on, and may draw a box that
//! turns every item at once.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use crate::family::read::Lit;

/// The box a set draws that turns every enabled item on, or every one off
/// once all of them are: the prop that draws it, the prop that holds its
/// words, and the part it is drawn as.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
pub struct All {
    pub enabled: String,
    pub label: String,
    pub part: String,
}

/// `all: { enabled, label, part }`, each a name.
pub fn all(fields: &[(String, Lit)]) -> Result<All, String> {
    let mut read = All::default();
    for (key, value) in fields {
        let slot = match key.as_str() {
            "enabled" => &mut read.enabled,
            "label" => &mut read.label,
            "part" => &mut read.part,
            _ => return Err(format!("collection: `all.{key}` is not a field it has")),
        };
        let Lit::Text(name) = value else {
            return Err(format!("collection: `all.{key}` is a name"));
        };
        name.clone_into(slot);
    }
    for (field, name) in [
        ("enabled", &read.enabled),
        ("label", &read.label),
        ("part", &read.part),
    ] {
        if name.is_empty() {
            return Err(format!("collection: `all` names its `{field}`"));
        }
    }
    Ok(read)
}

#[cfg(test)]
mod tests {
    use super::{all, All};
    use crate::family::read::Lit;

    fn fields(pairs: &[(&str, &str)]) -> Vec<(String, Lit)> {
        pairs
            .iter()
            .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
            .collect()
    }

    #[test]
    fn reads_the_box_that_turns_every_item() {
        let read = all(&fields(&[
            ("enabled", "select-all"),
            ("label", "select-all-label"),
            ("part", "select-all"),
        ]))
        .unwrap();
        assert_eq!(
            read,
            All {
                enabled: "select-all".to_owned(),
                label: "select-all-label".to_owned(),
                part: "select-all".to_owned(),
            }
        );
    }

    #[test]
    fn refuses_a_box_that_names_too_little_or_too_much() {
        assert_eq!(
            all(&fields(&[("enabled", "select-all"), ("label", "words")])).unwrap_err(),
            "collection: `all` names its `part`"
        );
        assert_eq!(
            all(&fields(&[("every", "select-all")])).unwrap_err(),
            "collection: `all.every` is not a field it has"
        );
    }
}
