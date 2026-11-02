//! How an element shows only some of what is passed into it, as an avatar
//! group folds the people past its `max` into a count, and a trail folds
//! its middle crumbs into a menu.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// The prop that says how many of the elements passed in are drawn.
///
/// **A phone draws the first that many and leaves the rest out**, as the
/// web hides them. A count of zero or less, or none, draws them all. With
/// `middle`, it keeps the first and the last and folds those between.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Fold {
    /// The element's prop that holds the count.
    pub max: String,
    /// Where the fold takes the middle away, as a trail does.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub middle: Option<Middle>,
}

/// **A fold that takes the middle away keeps the first element and the last
/// `max` less one**, at least two, and hands the first what it folded: the
/// count in its `count` prop, the elements in its `items` prop, and the
/// element's own `words` prop in its `label` prop, as a trail's first crumb
/// draws the menu of the crumbs folded after it.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Middle {
    /// The first element's prop that takes how many were folded.
    pub count: String,
    /// The first element's prop that takes the elements folded.
    pub items: String,
    /// The first element's prop that takes the element's `words`.
    pub label: String,
    /// The element's prop whose value the first element takes as `label`.
    pub words: String,
}

impl Fold {
    /// Each name the fold holds, where a source writes it, and what it names.
    /// What the first element takes is that element's, which this element's
    /// names do not hold.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = vec![("max", self.max.as_str(), Names::Prop)];
        if let Some(middle) = &self.middle {
            names.push(("middle.words", middle.words.as_str(), Names::Prop));
        }
        names
    }
}

/// `fold({ max, middle })`, each field a name, and `middle` an object of names.
pub fn fold(lit: &Lit) -> Result<Fold, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`fold` is a call to `fold()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "fold", arguments.as_slice()) else {
        return Err("`fold` is a call to `fold()` with an object".to_owned());
    };
    let mut fold = Fold::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("max", Lit::Text(name)) => fold.max.clone_from(name),
            ("middle", Lit::Object(names)) => fold.middle = Some(middle(names)?),
            (key, _) => return Err(format!("fold: `{key}` is not a field it has")),
        }
    }
    if fold.max.is_empty() {
        return Err("maxVisible: names its `prop`".to_owned());
    }
    Ok(fold)
}

/// `middle: { count, items, label, words }`, each a name.
fn middle(fields: &[(String, Lit)]) -> Result<Middle, String> {
    let mut middle = Middle::default();
    for (key, value) in fields {
        let Lit::Text(name) = value else {
            return Err(format!("maxVisible: `middle.{key}` is a name"));
        };
        match key.as_str() {
            "count" => middle.count.clone_from(name),
            "items" => middle.items.clone_from(name),
            "label" => middle.label.clone_from(name),
            "words" => middle.words.clone_from(name),
            key => return Err(format!("maxVisible: `middle.{key}` is not a field it has")),
        }
    }
    for (name, value) in [
        ("count", &middle.count),
        ("items", &middle.items),
        ("label", &middle.label),
        ("words", &middle.words),
    ] {
        if value.is_empty() {
            return Err(format!("maxVisible: `middle` names `{name}`"));
        }
    }
    Ok(middle)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn object(fields: &[(&str, Lit)]) -> Lit {
        Lit::Object(
            fields
                .iter()
                .map(|(key, value)| ((*key).to_owned(), value.clone()))
                .collect(),
        )
    }

    fn text(name: &str) -> Lit {
        Lit::Text(name.to_owned())
    }

    #[test]
    fn reads_the_prop_that_holds_the_count() {
        let read = fold(&Lit::Call(
            "fold".to_owned(),
            vec![object(&[("max", text("max"))])],
        ))
        .unwrap();
        assert_eq!(read.max, "max");
        assert_eq!(read.middle, None);
    }

    #[test]
    fn refuses_a_fold_with_no_count() {
        let read = fold(&Lit::Call("fold".to_owned(), vec![object(&[])]));
        assert_eq!(read, Err("maxVisible: names its `prop`".to_owned()));
    }

    #[test]
    fn reads_what_a_fold_of_the_middle_hands_the_first_element() {
        let read = fold(&Lit::Call(
            "fold".to_owned(),
            vec![object(&[
                ("max", text("max-items")),
                (
                    "middle",
                    object(&[
                        ("count", text("fold")),
                        ("items", text("fold-crumbs")),
                        ("label", text("fold-label")),
                        ("words", text("expand-label")),
                    ]),
                ),
            ])],
        ))
        .unwrap();
        let middle = read.middle.unwrap();
        assert_eq!(middle.items, "fold-crumbs");
        assert_eq!(middle.words, "expand-label");
    }

    #[test]
    fn refuses_a_middle_that_names_too_little() {
        let read = fold(&Lit::Call(
            "fold".to_owned(),
            vec![object(&[
                ("max", text("max-items")),
                ("middle", object(&[("count", text("fold"))])),
            ])],
        ));
        assert_eq!(read, Err("maxVisible: `middle` names `items`".to_owned()));
    }
}
