use super::cross_family;
use crate::family::api::headless;
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

fn family(name: &str, rules: &str) -> Family {
    let styled_source = format!(
        "export default family('{name}', {{ stylesheet: '{name}.css', rules: [{rules}] }})"
    );
    let headless_source = format!("export default headless('{name}', {{ tree: [box('part')] }})");
    Family::new(
        styled(&default_export(&styled_source).unwrap()).unwrap(),
        Some(headless(&default_export(&headless_source).unwrap()).unwrap()),
        name,
        "root",
    )
}

#[test]
fn another_familys_hook_is_one_it_reads() {
    let button = family(
        "button",
        "{ on: 'host', set: [['border-radius', hook('radius', 0)]] }",
    );
    let group = family(
        "button-group",
        "{ on: 'host', set: [['--button-radius', 0], ['margin', hookOf('button', 'radius', 0)]] }",
    );
    assert!(cross_family(&[&button, &group], None).is_empty());
    let typo = family(
        "button-group",
        "{ on: 'host', set: [['--button-raduis', 0], ['margin', hookOf('button', 'raduis', 0)]] }",
    );
    let refused = cross_family(&[&button, &typo], None);
    assert_eq!(refused.len(), 2, "{refused:?}");
    assert!(refused.iter().all(|why| why.contains("no hook `raduis`")));
}

#[test]
fn an_inherited_private_value_is_one_a_family_sets() {
    let card = family("card", "{ on: 'host', values: [['heading-ink', 'red']] }");
    let text = family(
        "text",
        "{ on: 'host', set: [['color', inherited('_heading-ink')]] }",
    );
    assert!(cross_family(&[&card, &text], None).is_empty());
    let refused = cross_family(&[&text], None);
    assert_eq!(refused.len(), 1);
    assert!(refused[0].contains("no family sets the private value `heading-ink`"));
}

#[test]
fn a_token_and_a_measured_length_pass_and_an_unknown_name_does_not() {
    let meter = family(
        "meter",
        "{ on: 'host', set: [['inline-size', measured('meter-at')]] }",
    );
    let other = family(
        "other",
        "{ on: 'host', set: [['--helix-size-control', 0], ['--meter-at', 0], ['--nothing-here', 0]] }",
    );
    let refused = cross_family(&[&meter, &other], None);
    assert_eq!(refused.len(), 1, "{refused:?}");
    assert!(refused[0].contains("`--nothing-here`"));
}

#[test]
fn a_token_read_or_set_is_one_the_theme_holds() {
    let tokens: std::collections::BTreeSet<String> = ["color-foreground", "size-control"]
        .map(str::to_owned)
        .into();
    let known = family(
        "known",
        "{ on: 'host', set: [['--helix-size-control', 0], ['color', token('color-foreground')]] }",
    );
    assert!(cross_family(&[&known], Some(&tokens)).is_empty());
    let typo = family(
        "typo",
        "{ on: 'host', set: [['--helix-size-contrl', 0], ['color', hook('ink', token('color-foregrond'))]] }",
    );
    let refused = cross_family(&[&typo], Some(&tokens));
    assert_eq!(refused.len(), 2, "{refused:?}");
    assert!(refused[0].contains("reads `token('color-foregrond')`, which is no token in the theme"));
    assert!(refused[1].contains("sets `--helix-size-contrl`, which is no token in the theme"));
    assert!(cross_family(&[&typo], None).is_empty());
}
