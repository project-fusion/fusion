//! How an element tells where a part of it that scrolls stands, as a scroll
//! area is in a state for each edge with more past it.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// The edges a scroll names a state for, in the logical terms the web's
/// states are written in.
pub const EDGES: &[&str] = &["block-end", "block-start", "inline-end", "inline-start"];

/// A part that scrolls, the states the element is in as it stands, and the
/// events it sends as it moves and comes to rest.
///
/// **It reads the scroll capability's `observe`**, which tells where the part
/// stands at each end of each axis on both platforms. The web element works
/// its states out itself, and a phone's runtime sets them from what the
/// capability tells.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Scroll {
    /// The state for each edge that has more past it, by the edge's name:
    /// `block-start`, `block-end`, `inline-start` or `inline-end`.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(optional, as = "Option<BTreeMap<String, String>>")]
    #[schemars(default)]
    pub more: BTreeMap<String, String>,
    /// The event sent each time the part moves, as the web's `scroll`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moves: Option<String>,
    /// The state that holds while what the part holds is longer than the
    /// part along an axis it scrolls.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overflows: Option<String>,
    /// The part that scrolls.
    pub part: String,
    /// The event sent once the part comes to rest, as the web's `scrollend`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settles: Option<String>,
}

impl Scroll {
    /// Each name the scroll holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut names = vec![("part", self.part.as_str(), Names::Part)];
        for (edge, state) in &self.more {
            let at = EDGES
                .iter()
                .find(|known| *known == edge)
                .copied()
                .unwrap_or("more");
            names.push((at, state.as_str(), Names::State));
        }
        if let Some(state) = &self.overflows {
            names.push(("overflows", state.as_str(), Names::State));
        }
        if let Some(event) = &self.moves {
            names.push(("moves", event.as_str(), Names::Event));
        }
        if let Some(event) = &self.settles {
            names.push(("settles", event.as_str(), Names::Event));
        }
        names
    }
}

/// `scroll({ part, 'block-start', 'block-end', 'inline-start', 'inline-end',
/// overflows, moves, settles })`, each field a name.
pub fn scroll(lit: &Lit) -> Result<Scroll, String> {
    let mut scroll = Scroll::default();
    for (key, name) in fields(lit, "scroll")? {
        let name = name.to_owned();
        match key {
            "part" => scroll.part = name,
            "overflows" => scroll.overflows = Some(name),
            "moves" => scroll.moves = Some(name),
            "settles" => scroll.settles = Some(name),
            edge if EDGES.contains(&edge) => {
                scroll.more.insert(edge.to_owned(), name);
            }
            key => return Err(format!("scroll: `{key}` is not a field it has")),
        }
    }
    if scroll.part.is_empty() {
        return Err("scroll: a scroll names its `part`".to_owned());
    }
    Ok(scroll)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "scroll".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_the_part_its_edges_and_its_events() {
        let read = scroll(&call(&[
            ("part", "viewport"),
            ("block-end", "more-block-end"),
            ("overflows", "scrolls"),
            ("moves", "scroll"),
            ("settles", "scrollend"),
        ]))
        .unwrap();
        assert_eq!(
            read.more.get("block-end").map(String::as_str),
            Some("more-block-end")
        );
        assert_eq!(read.references().len(), 5);
    }

    #[test]
    fn refuses_a_scroll_with_no_part_or_an_edge_it_lacks() {
        assert_eq!(
            scroll(&call(&[("block-end", "x")])).unwrap_err(),
            "scroll: a scroll names its `part`"
        );
        assert_eq!(
            scroll(&call(&[("part", "viewport"), ("top", "x")])).unwrap_err(),
            "scroll: `top` is not a field it has"
        );
    }
}
