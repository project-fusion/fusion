//! How an element that shows a stack of pages one at a time says so: the
//! press that goes back, the event a move asks first, the values it computes
//! as it moves, and the prop that holds the page showing.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What a stack of pages holds, whose rows hold pages of their own, as a
/// drilldown's rows and a menu's that drill do.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Stack {
    /// The pressable that goes back one page.
    pub back: String,
    /// The cancelable event sent before a move into a page or back out of
    /// one, its detail the `value` of the row whose page would show.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The name of the value the element computes while a page below the
    /// top is showing.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drilled: Option<String>,
    /// The state that holds once a move has gone into a page, until the
    /// next move, as a drilldown is `forward`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entered: Option<String>,
    /// The name of the value the element computes as the words of the page
    /// showing, empty on the top page.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    /// The state that holds once a move has gone back out of a page, until
    /// the next move, as a drilldown is `back`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub left: Option<String>,
    /// The prop that holds the `value` of the row whose page is showing.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<String>,
    /// The prop or the computed value whose words the `label` value holds on
    /// the top page, where the top page has a name of its own, as a
    /// drilldown's top page is named by its `label`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top: Option<String>,
    /// The props the stack writes on each row it draws as a row, by the
    /// row's prop, from the element's prop that holds each, as a drilldown
    /// under `navigation` writes its rows `listed`. A row whose page is
    /// showing, or holds the page showing, is written none.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(optional, as = "Option<BTreeMap<String, String>>")]
    pub writes: BTreeMap<String, String>,
}

impl Stack {
    /// Each name the stack holds that names a part, an event, or a prop,
    /// where a source writes it. Its computed values name themselves.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut found = vec![("back", self.back.as_str(), Names::Part)];
        if let Some(before) = &self.before {
            found.push(("before", before.as_str(), Names::Event));
        }
        if let Some(page) = &self.page {
            found.push(("page", page.as_str(), Names::Prop));
        }
        for (at, state) in [("entered", &self.entered), ("left", &self.left)] {
            if let Some(state) = state {
                found.push((at, state.as_str(), Names::State));
            }
        }
        for prop in self.writes.values() {
            found.push(("writes", prop.as_str(), Names::Prop));
        }
        found
    }

    /// The values the element computes as it moves, by name.
    pub fn computed(&self) -> impl Iterator<Item = &str> {
        self.drilled.iter().chain(&self.label).map(String::as_str)
    }
}

/// `stack({ back, before?, drilled?, entered?, label?, left?, page?, top?,
/// writes? })`, each field a name, and `writes` an object of names.
pub fn stack(lit: &Lit) -> Result<Stack, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`stack` is a call to `stack()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "stack", arguments.as_slice()) else {
        return Err("`stack` is a call to `stack()` with an object".to_owned());
    };
    let mut back = None;
    let mut stack = Stack::default();
    for (key, value) in fields {
        if key == "writes" {
            stack.writes = writes(value)?;
            continue;
        }
        let Lit::Text(name) = value else {
            return Err(format!("stack: `{key}` is a name"));
        };
        let slot = match key.as_str() {
            "back" => &mut back,
            "before" => &mut stack.before,
            "drilled" => &mut stack.drilled,
            "entered" => &mut stack.entered,
            "label" => &mut stack.label,
            "left" => &mut stack.left,
            "page" => &mut stack.page,
            "top" => &mut stack.top,
            _ => return Err(format!("stack: `{key}` is not a field it has")),
        };
        *slot = Some(name.clone());
    }
    stack.back = back.ok_or("stack: a stack names the pressable that goes back one page")?;
    Ok(stack)
}

/// `writes: { row: prop }`, each a row's prop and the element's prop it takes.
fn writes(value: &Lit) -> Result<BTreeMap<String, String>, String> {
    let Lit::Object(fields) = value else {
        return Err(
            "stack: `writes` is an object of a row's props and the props they take".to_owned(),
        );
    };
    fields
        .iter()
        .map(|(row, prop)| match prop {
            Lit::Text(prop) => Ok((row.clone(), prop.clone())),
            _ => Err(format!("stack: `writes.{row}` names a prop")),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(fields: Vec<(&str, &str)>) -> Lit {
        Lit::Call(
            "stack".to_owned(),
            vec![Lit::Object(
                fields
                    .into_iter()
                    .map(|(key, value)| (key.to_owned(), Lit::Text(value.to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_press_that_goes_back_the_event_it_asks_and_what_it_computes() {
        let read = stack(&call(vec![
            ("back", "back"),
            ("before", "navigate"),
            ("drilled", "drilled"),
            ("label", "page-label"),
            ("page", "page"),
        ]))
        .unwrap();
        assert_eq!(
            read.references(),
            vec![
                ("back", "back", Names::Part),
                ("before", "navigate", Names::Event),
                ("page", "page", Names::Prop),
            ]
        );
        assert_eq!(
            read.computed().collect::<Vec<_>>(),
            vec!["drilled", "page-label"]
        );
    }

    #[test]
    fn reads_the_props_it_writes_on_its_rows() {
        let Lit::Call(helper, mut arguments) = call(vec![("back", "back")]) else {
            unreachable!()
        };
        let Some(Lit::Object(fields)) = arguments.first_mut() else {
            unreachable!()
        };
        fields.push((
            "writes".to_owned(),
            Lit::Object(vec![(
                "listed".to_owned(),
                Lit::Text("navigation".to_owned()),
            )]),
        ));
        let read = stack(&Lit::Call(helper, arguments)).unwrap();
        assert_eq!(
            read.writes,
            BTreeMap::from([("listed".to_owned(), "navigation".to_owned())])
        );
        assert!(read
            .references()
            .contains(&("writes", "navigation", Names::Prop)));
    }

    #[test]
    fn refuses_a_stack_with_no_way_back() {
        assert_eq!(
            stack(&call(vec![("page", "page")])).unwrap_err(),
            "stack: a stack names the pressable that goes back one page"
        );
    }
}
