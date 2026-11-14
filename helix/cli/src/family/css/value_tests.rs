use super::{render, Scope};
use crate::family::ir::{family, Item, Value};
use crate::family::read::default_export;

/// The first declaration's value in a table, as CSS.
fn written(value: &str) -> String {
    written_as("color", value)
}

fn written_as(property: &str, value: &str) -> String {
    let table = format!(
        "export default family('b', {{ rules: [{{ on: 'host', set: [['{property}', {value}]] }}] }})"
    );
    let read = family(&default_export(&table).unwrap()).unwrap();
    let Some(Item::Rule(rule)) = read.rules.first() else {
        panic!("a rule");
    };
    render(&rule.set[0].1, Scope::of(&read))
}

#[test]
fn writes_another_familys_hook_and_each_keyword() {
    assert_eq!(
        written("hookOf('button', 'radius-end-end', token('radii-sm'))"),
        "var(--button-radius-end-end, var(--helix-radii-sm))"
    );
    assert_eq!(
        written("hook('color', inherit())"),
        "var(--b-color, inherit)"
    );
    assert_eq!(written("inherit()"), "inherit");
}

#[test]
fn writes_parentheses_only_where_precedence_needs_them() {
    let cases = [
        (
            "difference(own('h'), product(own('i'), 2))",
            "calc(var(--_h) - var(--_i) * 2)",
        ),
        (
            "product(difference(own('h'), own('i')), 2)",
            "calc((var(--_h) - var(--_i)) * 2)",
        ),
        (
            "product(quotient(token('a'), token('b')), '1em')",
            "calc(var(--helix-a) / var(--helix-b) * 1em)",
        ),
        (
            "quotient(difference('1lh', own('s')), 2)",
            "calc((1lh - var(--_s)) / 2)",
        ),
        (
            "difference(own('a'), difference(own('b'), own('c')))",
            "calc(var(--_a) - (var(--_b) - var(--_c)))",
        ),
        (
            "sum(own('a'), difference(own('b'), own('c')))",
            "calc(var(--_a) + var(--_b) - var(--_c))",
        ),
        (
            "quotient(own('a'), product(own('b'), 2))",
            "calc(var(--_a) / (var(--_b) * 2))",
        ),
        (
            "product(own('a'), quotient(own('b'), 2))",
            "calc(var(--_a) * var(--_b) / 2)",
        ),
        (
            "difference(sum('50%', own('a')), quotient(own('b'), 2))",
            "calc(50% + var(--_a) - var(--_b) / 2)",
        ),
    ];
    for (source, css) in cases {
        assert_eq!(written(source), css, "{source}");
    }
}

#[test]
fn writes_a_keyword_a_quotation_mark_a_scheme_and_a_derived_value() {
    assert_eq!(written("hook('font', inherit())"), "var(--b-font, inherit)");
    assert_eq!(written("inherit()"), "inherit");
    assert_eq!(
        written_as("content", "quote('open', '\"\"')"),
        "open-quote / \"\""
    );
    assert_eq!(written_as("content", "quote('no-close')"), "no-close-quote");
    assert_eq!(
        written("scheme('transparent', token('color-border'))"),
        "light-dark(transparent, var(--helix-color-border))"
    );
    assert_eq!(
        written_as(
            "grid-template-columns",
            "derived('grid-template', 'minmax(0, 1fr)')"
        ),
        "var(--_grid-template, minmax(0, 1fr))"
    );
}

#[test]
fn writes_a_length_in_characters_and_lines_as_it_is() {
    assert_eq!(written("'46ch'"), "46ch");
    assert_eq!(
        render(
            &Value::Text("1lh".to_owned()),
            Scope {
                hooks: "b",
                tokens: "helix"
            }
        ),
        "1lh"
    );
}

#[test]
fn writes_a_mix_in_the_space_it_names() {
    assert_eq!(
        written("mix(own('t'), 14, token('color-background'), 'srgb')"),
        "color-mix(in srgb, var(--_t) 14%, var(--helix-color-background))"
    );
    assert_eq!(
        written("mix(own('t'), 55, token('color-foreground'))"),
        "color-mix(in oklab, var(--_t) 55%, var(--helix-color-foreground))"
    );
}

#[test]
fn writes_a_backdrop_blur_and_an_inset_clip_as_a_phone_reads_them() {
    assert_eq!(
        written_as("backdrop-filter", "fn('blur', token('material-blur-lg'))"),
        "blur(var(--helix-material-blur-lg))"
    );
    assert_eq!(
        written_as("clip-path", "fn('inset', ['0', '0', '100%', '0'])"),
        "inset(0 0 100% 0)"
    );
}

#[test]
fn writes_a_fit_as_a_fraction_of_the_row() {
    assert_eq!(written_as("grid-template-rows", "fit(0)"), "0fr");
    assert_eq!(written_as("grid-template-rows", "fit(1)"), "1fr");
}
