//! A repeat over a list, the fields and the place of each copy, the
//! derivations that compute a list, and a part named by a region's words.

use std::path::Path;

use crate::family::api::{headless, Attribute};
use crate::family::ir::{styled, Family, LIST_DERIVATIONS};
use crate::family::read::default_export;
use crate::family::resolve::unresolved;

fn read(source: &str) -> Result<crate::family::api::Headless, String> {
    headless(&default_export(source).unwrap())
}

fn family(source: &str) -> Family {
    Family::new(
        styled(
            &default_export(
                "export default family('kbd', { stylesheet: 'kbd/kbd.css', rules: [] })",
            )
            .unwrap(),
        )
        .unwrap(),
        Some(read(source).unwrap()),
        "kbd",
        "root",
    )
}

#[test]
fn a_repeat_draws_a_copy_for_each_entry_of_a_list_a_derivation_computes() {
    let kbd = read(
        "export default headless('kbd', {
          props: [prop('keys', 'string')],
          tree: [repeat('keys', { each: derive('kbd-key-list'), key: 'at' }, [
            text('separator', { says: field('separator') }),
            box('key', { '--place': index(), label: field('key') }),
          ])],
        })",
    )
    .unwrap();
    let repeat = &kbd.tree[0];
    assert_eq!(
        repeat.attributes["each"],
        Attribute::Derived {
            derive: "kbdKeyList".to_owned()
        }
    );
    assert_eq!(
        repeat.children[0].attributes["says"],
        Attribute::Field {
            field: "separator".to_owned()
        }
    );
    assert_eq!(
        repeat.children[1].attributes["--place"],
        Attribute::Index { index: true }
    );
}

#[test]
fn a_repeat_over_a_prop_reads_it_as_a_prop() {
    let listed = family(
        "export default headless('kbd', {
          props: [prop('entries', 'object')],
          tree: [repeat('entry', { each: bind('entries'), key: 'id' }, [text('words', { says: field('words') })])],
        })",
    );
    assert!(unresolved(&listed).is_empty(), "{:?}", unresolved(&listed));
    let missing = family(
        "export default headless('kbd', {
          tree: [repeat('entry', { each: bind('entries'), key: 'id' }, [text('words', { says: field('words') })])],
        })",
    );
    assert_eq!(
        unresolved(&missing),
        vec!["`repeat('entry')` reads `entries`, and no prop has that name"]
    );
}

#[test]
fn a_repeat_counts_or_reads_a_list_and_a_list_is_keyed() {
    let both = read(
        "export default headless('kbd', { tree: [repeat('key', { count: 2, each: derive('kbd-key-list'), key: 'at' }, [box('key')])] })",
    )
    .unwrap_err();
    assert!(
        both.contains("its `count` or its `each`, not both"),
        "{both}"
    );
    let unkeyed = read(
        "export default headless('kbd', { tree: [repeat('key', { each: derive('kbd-key-list') }, [box('key')])] })",
    )
    .unwrap_err();
    assert!(
        unkeyed.contains("takes the `key` of each entry"),
        "{unkeyed}"
    );
    let counted = read(
        "export default headless('kbd', { tree: [repeat('key', { count: 2, key: 'at' }, [box('key')])] })",
    )
    .unwrap_err();
    assert!(
        counted.contains("`key` is a repeat's over its `each`"),
        "{counted}"
    );
}

#[test]
fn a_list_is_read_by_each_alone_and_words_are_not_a_list() {
    let words = read(
        "export default headless('kbd', { tree: [text('chord', { says: derive('kbd-key-list') })] })",
    )
    .unwrap_err();
    assert!(words.contains("`says` takes"), "{words}");
    let each = read(
        "export default headless('kbd', { tree: [repeat('key', { each: derive('kbd-keys'), key: 'at' }, [box('key')])] })",
    )
    .unwrap_err();
    assert!(each.contains("`each` takes"), "{each}");
    let derived = read(
        "export default headless('kbd', { derived: { keys: derive('kbd-key-list') }, tree: [] })",
    )
    .unwrap_err();
    assert!(derived.contains("computes a list"), "{derived}");
}

#[test]
fn a_field_is_read_in_a_copy_of_a_list_and_an_index_in_a_copy_of_any_repeat() {
    let field = read(
        "export default headless('kbd', { tree: [repeat('key', { count: 2 }, [text('key', { says: field('key') })])] })",
    )
    .unwrap_err();
    assert!(field.contains("not in a repeat over its `each`"), "{field}");
    let index =
        read("export default headless('kbd', { tree: [box('key', { '--place': index() })] })")
            .unwrap_err();
    assert!(index.contains("not in a repeat"), "{index}");
    assert!(read(
        "export default headless('kbd', { tree: [repeat('key', { count: 2 }, [box('key', { '--place': index() })])] })",
    )
    .is_ok());
}

#[test]
fn a_part_is_named_by_the_words_of_a_region_the_tree_holds() {
    let named = family(
        "export default headless('kbd', {
          tree: [region('summary'), box('content', { labelledby: 'summary', role: 'region' })],
        })",
    );
    assert!(unresolved(&named).is_empty(), "{:?}", unresolved(&named));
    let unnamed = family(
        "export default headless('kbd', { tree: [box('content', { labelledby: 'sumary', role: 'region' })] })",
    );
    assert_eq!(
        unresolved(&unnamed),
        vec!["`box('content')` is labeled by `sumary`, and no region has that name"]
    );
}

#[test]
fn every_list_derivation_names_a_function_core_exports() {
    let source = std::fs::read_to_string(
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../core/src/utils/derivations/derivations.ts"),
    )
    .unwrap();
    for (name, function) in LIST_DERIVATIONS {
        assert!(
            source.contains(&format!("export const {function}: ListDerivation =")),
            "`{name}` names `{function}`, which core's derivations do not export"
        );
    }
}
