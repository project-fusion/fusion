//! A picture: the `image` node, held to its vocabulary, and the load
//! machine it runs.

use super::*;
use crate::family::api::headless;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;
use crate::family::resolve::unresolved;

const STYLED: &str = "export default family('image', { stylesheet: 'image/image.css', rules: [
  { on: 'image', set: [['object-fit', 'cover']] },
] })";

fn family(headless_source: &str) -> Family {
    Family::new(
        styled(&default_export(STYLED).unwrap()).unwrap(),
        Some(headless(&default_export(headless_source).unwrap()).unwrap()),
        "image",
        "root",
    )
}

fn read(headless_source: &str) -> Result<(), String> {
    headless(&default_export(headless_source).unwrap()).map(|_| ())
}

#[test]
fn an_image_runs_load_bound_to_its_part_its_source_and_its_events() {
    let image = family(
        "export default headless('image', {
          events: [event('load', { bare: true }), event('error', { bare: true })],
          props: [prop('alt', 'string'), prop('src', 'string')],
          states: ['loading', 'loaded', 'error'],
          tree: [image('image', { alt: bind('alt'), fails: 'error', loads: 'load', src: bind('src') })],
        })",
    );
    assert_eq!(
        image.machines,
        vec![MachineUse {
            bind: BTreeMap::from([
                ("error".to_owned(), Bound::Event("error".to_owned())),
                ("load".to_owned(), Bound::Event("load".to_owned())),
                ("part".to_owned(), Bound::Part("image".to_owned())),
                ("src".to_owned(), Bound::Prop("src".to_owned())),
            ]),
            machine: "load".to_owned(),
        }]
    );
    assert!(unresolved(&image).is_empty(), "{:?}", unresolved(&image));
}

#[test]
fn an_image_only_the_web_draws_runs_nothing() {
    let image = family(
        "export default headless('image', {
          props: [prop('src', 'string')],
          tree: [image('image', { platform: 'web', src: bind('src') })],
        })",
    );
    assert!(image.machines.is_empty());
}

#[test]
fn an_image_takes_its_src_and_only_an_image_takes_one() {
    let missing =
        read("export default headless('image', { tree: [image('image', { alt: 'A lake' })] })")
            .unwrap_err();
    assert!(missing.contains("an image takes its `src`"), "{missing}");
    let empty = read(
        "export default headless('image', { tree: [image('image', { empty: 'blank', src: 'a.png' })] })",
    )
    .unwrap_err();
    assert!(
        empty.contains("`empty` takes one of `error`, `loading`"),
        "{empty}"
    );
    let boxed =
        read("export default headless('image', { tree: [box('image', { src: 'a.png' })] })")
            .unwrap_err();
    assert!(boxed.contains("a box does not take `src`"), "{boxed}");
}

#[test]
fn says_an_event_an_image_sends_that_no_event_names() {
    let image = family(
        "export default headless('image', {
          events: [event('load', { bare: true })],
          props: [prop('src', 'string')],
          tree: [image('image', { fails: 'eror', loads: 'load', src: bind('source') })],
        })",
    );
    assert_eq!(
        unresolved(&image),
        vec![
            "`image('image')` reads `source`, and no prop has that name",
            "`image('image')` fails `eror`, and no event has that name",
        ]
    );
}
