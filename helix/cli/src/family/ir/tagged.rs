//! The elements a form names by their tag, under the design system's prefix.
//!
//! **A source names another element by its name alone**, `draws="checkbox"`
//! and `total({ of: 'meter-segment' })`, and the form holds its tag,
//! `helix-checkbox` and `helix-meter-segment` under Helix's prefix. A runtime
//! finds the element by the tag it is given, whatever the prefix.

use crate::family::api::{Api, Attribute, Node};
use crate::family::project::Names;

/// `api` and `tree` with each element they name given its tag.
pub fn tag(api: &mut Api, tree: &mut [Node], names: &Names) {
    if let Some(total) = api.total.as_mut() {
        total.of = names.tag(&total.of);
    }
    drawn(tree, names);
}

/// Each box or wrap in `tree` that draws another element, given its tag.
fn drawn(tree: &mut [Node], names: &Names) {
    for node in tree {
        if let Some(Attribute::Text(name)) = node.attributes.get_mut("draws") {
            *name = names.tag(name);
        }
        drawn(&mut node.children, names);
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::family::api::{NodeKind, Total};

    fn names(prefix: &str) -> Names {
        Names {
            tag: prefix.to_owned(),
            ..crate::family::project::testing()
        }
    }

    fn drawing(name: &str, children: Vec<Node>) -> Node {
        Node {
            attributes: BTreeMap::from([("draws".to_owned(), Attribute::Text(name.to_owned()))]),
            children,
            kind: NodeKind::Box,
            name: "box".to_owned(),
        }
    }

    #[test]
    fn names_each_drawn_element_by_its_tag_under_the_prefix() {
        let mut tree = vec![Node {
            attributes: BTreeMap::new(),
            children: vec![drawing("checkbox", vec![drawing("tooltip", Vec::new())])],
            kind: NodeKind::Wrap,
            name: "wrap".to_owned(),
        }];
        tag(&mut Api::default(), &mut tree, &names("acme"));
        let inner = &tree[0].children[0];
        assert_eq!(
            inner.attributes["draws"],
            Attribute::Text("acme-checkbox".to_owned())
        );
        assert_eq!(
            inner.children[0].attributes["draws"],
            Attribute::Text("acme-tooltip".to_owned())
        );
    }

    #[test]
    fn names_what_a_total_sums_by_its_tag_under_the_prefix() {
        let mut api = Api {
            total: Some(Total {
                holds: None,
                into: "value".to_owned(),
                of: "meter-segment".to_owned(),
                prop: "value".to_owned(),
            }),
            ..Api::default()
        };
        tag(&mut api, &mut [], &names("acme"));
        assert_eq!(
            api.total.map(|total| total.of).as_deref(),
            Some("acme-meter-segment")
        );
    }
}
