//! How an element reads one of its props as a sum: of a prop of each element
//! of another family passed into it, as a meter measures the sum of its
//! segments.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// A prop the element reads as the sum of a prop of the elements passed in.
///
/// **The sum stands in for the prop while the element holds any of them**,
/// so the two cannot disagree, and the prop is read as it is otherwise.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Total {
    /// The value the element computes that holds while it holds any of the
    /// elements it sums, which a `when()`, a `bind()` and a rule's `state`
    /// read by name, as a meter is `segmented` while it holds a segment. Text
    /// or another element passed in beside them does not count.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub holds: Option<String>,
    /// The element's prop the sum stands in for.
    pub into: String,
    /// The family whose elements are summed, by its tag without `helix-`.
    pub of: String,
    /// The prop of each of them that is summed. A value that is not a number,
    /// or is below zero, adds nothing.
    pub prop: String,
}

impl Total {
    /// Each name the total holds that the element itself has, where a source
    /// writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        vec![("into", self.into.as_str(), Names::Prop)]
    }
}

/// `total({ into, of, prop })`, each field a name.
pub fn total(lit: &Lit) -> Result<Total, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`total` is a call to `total()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "total", arguments.as_slice()) else {
        return Err("`total` is a call to `total()` with an object".to_owned());
    };
    let mut total = Total::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("holds", Lit::Text(name)) => total.holds = Some(name.clone()),
            ("into", Lit::Text(name)) => total.into.clone_from(name),
            ("of", Lit::Text(name)) => total.of.clone_from(name),
            ("prop", Lit::Text(name)) => total.prop.clone_from(name),
            (key, _) => return Err(format!("total: `{key}` is not a field it has")),
        }
    }
    if total.into.is_empty() || total.of.is_empty() || total.prop.is_empty() {
        return Err("total: a total names `itemProp`, `of` and `prop`".to_owned());
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(value: &str) -> Lit {
        Lit::Text(value.to_owned())
    }

    #[test]
    fn reads_the_prop_it_stands_in_for_and_what_it_sums() {
        let read = total(&Lit::Call(
            "total".to_owned(),
            vec![Lit::Object(vec![
                ("into".to_owned(), text("value")),
                ("of".to_owned(), text("meter-segment")),
                ("prop".to_owned(), text("value")),
            ])],
        ))
        .unwrap();
        assert_eq!(
            read,
            Total {
                holds: None,
                into: "value".to_owned(),
                of: "meter-segment".to_owned(),
                prop: "value".to_owned(),
            }
        );
    }

    #[test]
    fn reads_the_value_that_holds_while_it_holds_any() {
        let read = total(&Lit::Call(
            "total".to_owned(),
            vec![Lit::Object(vec![
                ("holds".to_owned(), text("segmented")),
                ("into".to_owned(), text("value")),
                ("of".to_owned(), text("meter-segment")),
                ("prop".to_owned(), text("value")),
            ])],
        ))
        .unwrap();
        assert_eq!(read.holds.as_deref(), Some("segmented"));
    }

    #[test]
    fn refuses_a_total_that_leaves_a_name_out() {
        let read = total(&Lit::Call(
            "total".to_owned(),
            vec![Lit::Object(vec![("into".to_owned(), text("value"))])],
        ));
        assert_eq!(
            read,
            Err("total: a total names `itemProp`, `of` and `prop`".to_owned())
        );
    }
}
