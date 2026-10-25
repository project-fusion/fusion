//! Builder calls read, typed, evaluated and printed back.

use super::{parse, Built};
use crate::tokens::{
    native, print, Easing, Expr, Kind, Mode, Native, Registry, Spring, Token, Written,
};

const PRIMITIVES: &str = ":root {\n  --_helix-neutral-0: #ffffff;\n  --_helix-neutral-1000: #000000;\n  --_helix-seed-density: 1;\n}";

/// The tokens `(name, builder calls)`, typed over three primitives.
fn typed(tokens: &[(&str, &str)]) -> Result<Registry, Vec<String>> {
    let written: Vec<(String, Written)> = tokens
        .iter()
        .map(|(name, value)| ((*name).to_owned(), Written::Builder((*value).to_owned())))
        .collect();
    Registry::written(&crate::tokens::declarations(PRIMITIVES), &written)
}

fn one(name: &str, value: &str) -> Token {
    let registry = typed(&[(name, value)]).unwrap_or_else(|why| panic!("{}", why.join("\n")));
    registry.tokens()[0].clone()
}

fn refused(name: &str, value: &str) -> String {
    typed(&[(name, value)])
        .expect_err("the value is refused")
        .join("\n")
}

#[test]
fn builder_syntax_is_numbers_strings_names_calls_objects_and_lists() {
    assert_eq!(
        parse("spring({ damping: 14.2, mass: 1 }, linear(0, -0.5, 1,),)").unwrap(),
        Built::Call(
            "spring".into(),
            vec![
                Built::Object(vec![
                    ("damping".into(), Built::Number(14.2)),
                    ("mass".into(), Built::Number(1.0)),
                ]),
                Built::Call(
                    "linear".into(),
                    vec![Built::Number(0.0), Built::Number(-0.5), Built::Number(1.0)]
                ),
            ]
        )
    );
    assert_eq!(
        parse("shadow(/* lengths */ [0, px(1)], primitive('it\\'s'))").unwrap(),
        Built::Call(
            "shadow".into(),
            vec![
                Built::List(vec![
                    Built::Number(0.0),
                    Built::Call("px".into(), vec![Built::Number(1.0)])
                ]),
                Built::Call("primitive".into(), vec![Built::Text("it's".into())]),
            ]
        )
    );
    assert_eq!(parse("density").unwrap(), Built::Name("density".into()));
    assert!(parse("rem(1) + rem(2)")
        .unwrap_err()
        .contains("continues past its value"));
    assert!(parse("`1rem`")
        .unwrap_err()
        .contains("no builder value is written with"));
    assert!(parse("rem(1").unwrap_err().contains("unclosed"));
}

#[test]
fn a_token_of_each_kind_is_typed_and_written_as_css() {
    for (name, value, kind, css) in [
        (
            "color-a",
            "lightDark(primitive('neutral-0'), primitive('neutral-1000'))",
            Kind::Color,
            "light-dark(var(--_helix-neutral-0), var(--_helix-neutral-1000))",
        ),
        (
            "color-b",
            "alpha(hex('000000'), 40)",
            Kind::Color,
            "color-mix(in oklab, #000000 40%, transparent)",
        ),
        (
            "color-c",
            "mix(hex('000000'), hex('ffffff'), 30)",
            Kind::Color,
            "color-mix(in oklab, #000000, #ffffff 30%)",
        ),
        (
            "color-d",
            "relative(hex('ff0000'), lightness, times(chroma, 0.5), hue)",
            Kind::Color,
            "oklch(from #ff0000 l calc(c * 0.5) h)",
        ),
        (
            "size-a",
            "times(rem(2.5), density)",
            Kind::Length,
            "calc(2.5rem * var(--_helix-seed-density))",
        ),
        ("tracking-a", "em(-0.01)", Kind::Length, "-0.01em"),
        ("layer-a", "-1", Kind::Number, "-1"),
        ("duration-a", "ms(120)", Kind::Time, "120ms"),
        (
            "easing-a",
            "cubicBezier(0.3, 0, 1, 1)",
            Kind::Easing,
            "cubic-bezier(0.3, 0, 1, 1)",
        ),
        (
            "shadow-a",
            "shadow([0, px(1), px(2)], hex('000000'))",
            Kind::Shadow,
            "0 1px 2px #000000",
        ),
        ("shadow-b", "none", Kind::Shadow, "none"),
        (
            "material-a",
            "filters(blur(px(16)), saturate(1.5))",
            Kind::Filter,
            "blur(16px) saturate(1.5)",
        ),
        (
            "font-a",
            "families('ui-sans-serif', quoted('Segoe UI'))",
            Kind::Family,
            "ui-sans-serif, \"Segoe UI\"",
        ),
    ] {
        let token = one(name, value);
        assert_eq!((token.kind, token.css.as_str()), (kind, css), "{name}");
    }
}

#[test]
fn a_reference_names_a_token_or_a_primitive_and_reads_as_its_slot() {
    let registry = typed(&[
        (
            "color-ink",
            "lightDark(primitive('neutral-1000'), primitive('neutral-0'))",
        ),
        ("color-focus", "ref('color-ink')"),
        ("color-on", "primitive('brand-on', ref('color-ink'))"),
    ])
    .unwrap_or_else(|why| panic!("{}", why.join("\n")));
    let [_, focus, on] = registry.tokens() else {
        panic!("three tokens");
    };
    assert_eq!(focus.css, "var(--helix-color-ink)");
    assert_eq!(on.css, "var(--_helix-brand-on, var(--helix-color-ink))");
    let hex = |token, mode| native(&registry.evaluate(token, mode).expect("evaluates"));
    assert_eq!(hex(focus, Mode::Light), Native::Text("#000000".into()));
    assert_eq!(hex(focus, Mode::Dark), Native::Text("#ffffff".into()));
    assert_eq!(hex(on, Mode::Dark), Native::Text("#ffffff".into()));
}

#[test]
fn a_spring_keeps_its_physics_and_draws_its_curve() {
    let token = one(
        "easing-spring",
        "spring({ damping: 14.2, mass: 1, stiffness: 100 }, linear(0, 1.04, 1))",
    );
    assert_eq!(
        token.expr,
        Expr::Easing(Easing::Spring(Box::new(Spring {
            damping: 14.2,
            mass: 1.0,
            stiffness: 100.0,
            stops: vec![0.0, 1.04, 1.0],
        })))
    );
    assert_eq!(token.css, "linear(0, 1.04, 1)");
    assert!(refused(
        "easing-x",
        "spring({ mass: 1, stiffness: 100 }, linear(0, 1))"
    )
    .contains("gives no damping"));
}

#[test]
fn a_misspelled_builder_or_a_wrong_unit_is_refused() {
    assert!(refused("size-x", "rem2(1)").contains("is not a number or a length"));
    assert!(refused("size-x", "ms(120)").contains("is not a number or a length"));
    assert!(refused("duration-x", "rem(1)").contains("is not a duration"));
    assert!(refused("size-x", "times(rem(1), rem(2))").contains("mixes a number and a length"));
    assert!(refused("color-x", "ref('color-nothing')").contains("declared nowhere"));
    assert!(refused("weight-x", "rem(1)").contains("its category holds Number tokens"));
}

#[test]
fn a_value_is_held_to_one_spelling() {
    let why = refused("color-x", "mix(hex('000000'), 5, transparent)");
    assert!(why.contains("prints `alpha(hex('000000'), 5)`"), "{why}");
    let why = refused("size-x", "primitive('seed-density')");
    assert!(why.contains("prints `density`"), "{why}");
}

#[test]
fn a_rounded_length_lands_on_a_whole_step_and_a_rem_stays_a_rem() {
    let written = "round(times(rem(1.33), 0.8), px(1))";
    let token = one("size-x", written);
    assert_eq!(token.kind, Kind::Length);
    assert_eq!(token.css, "round(calc(1.33rem * 0.8), 1px)");
    let registry = typed(&[("size-x", written), ("size-y", "round(px(25.6), px(1))")])
        .unwrap_or_else(|why| panic!("{}", why.join("\n")));
    let value = |at: usize| {
        native(
            &registry
                .evaluate(&registry.tokens()[at], Mode::Light)
                .expect("the token evaluates"),
        )
    };
    assert_eq!(value(0), Native::Text("1.0625rem".into()));
    assert_eq!(value(1), Native::Number(26.0));
    assert!(refused("size-x", "round(rem(1))").contains("a value and a step"));
}

#[test]
fn a_clamped_component_prints_its_group_and_holds_its_bounds() {
    let written = "relative(hex('ffffff'), clamp(0, times(minus(0.68, lightness), 1000), 1), 0, 0)";
    let token = one("color-x", written);
    assert_eq!(
        token.css,
        "oklch(from #ffffff clamp(0, (0.68 - l) * 1000, 1) 0 0)"
    );
    let registry = Registry::new(&[], &[("color-y".to_owned(), token.css.clone())])
        .unwrap_or_else(|why| panic!("{}", why.join("\n")));
    assert_eq!(registry.tokens()[0].css, token.css);
    assert_eq!(
        native(
            &registry
                .evaluate(&registry.tokens()[0], Mode::Light)
                .expect("the token evaluates")
        ),
        Native::Text("#000000".into()),
    );
}

#[test]
fn a_nested_sum_keeps_its_parentheses() {
    assert_eq!(
        one("size-a", "times(plus(rem(1), px(2)), 2)").css,
        "calc((1rem + 2px) * 2)"
    );
    assert_eq!(
        one("size-b", "minus(rem(1), minus(px(2), px(1)))").css,
        "calc(1rem - (2px - 1px))"
    );
    assert_eq!(
        one("size-c", "plus(rem(1), times(px(2), 3))").css,
        "calc(1rem + 2px * 3)"
    );
    let registry = typed(&[("size-a", "times(plus(rem(1), px(2)), 2)")]).expect("typed");
    let length = native(
        &registry
            .evaluate(&registry.tokens()[0], Mode::Light)
            .expect("evaluates"),
    );
    assert_eq!(length, Native::Text("calc(2rem + 4px)".into()));
    assert_eq!(print(&registry.tokens()[0].expr), "calc((1rem + 2px) * 2)");
}
