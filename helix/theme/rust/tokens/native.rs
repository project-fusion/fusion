//! A token's value as the React Native renderer takes it: a number, or a
//! string it reads the way it reads a stylesheet's.

use super::eval::{Curve, Drop, Effect, Length, Value};
use super::expr::{Expr, Families};
use super::paint;
use super::print;
use super::syntax::number_text;

/// What the renderer's `Context.tokens` holds for one token.
#[derive(Clone, Debug, PartialEq)]
pub enum Native {
    Number(f64),
    Text(String),
}

/// `value` as the renderer takes it.
///
/// - **A color is sRGB hex**, eight digits where it is translucent.
/// - **A length in pixels is points**, rounded to hundredths as the renderer
///   rounds every length it resolves.
/// - **A length in rems or ems is a string**, such as `2.5rem`, `-0.01em`, or
///   `calc(0.99em + 0.5rem)`. The theme resolves a rem against the reader's
///   text size, so it grows with the text as it does under a browser's font
///   size on the web, and the renderer resolves an em against the font size
///   where it lands.
/// - **A duration is milliseconds**, and a weight, a multiple, an opacity or a
///   layer is the number itself.
/// - **A timing function, a shadow, a filter and a font family are the CSS the
///   renderer parses**, with every reference and length already resolved.
pub fn native(value: &Value) -> Native {
    match value {
        Value::Color(color) => Native::Text(paint::to_hex(color)),
        Value::Curve(curve) => Native::Text(curve_text(curve)),
        Value::Families(families) => Native::Text(print::expr(&Expr::Families(Families::List(
            families.clone(),
        )))),
        Value::Filters(effects) => Native::Text(
            effects
                .iter()
                .map(|effect| match effect {
                    Effect::Blur(radius) => format!("blur({}px)", number_text(hundredths(*radius))),
                    Effect::Saturate(amount) => format!("saturate({})", number_text(*amount)),
                })
                .collect::<Vec<_>>()
                .join(" "),
        ),
        Value::Length(length) => length_native(*length),
        Value::Number(number) | Value::Time(number) => Native::Number(*number),
        Value::Shadow(drops) => Native::Text(shadow_text(drops)),
    }
}

/// Points rounded to hundredths, as the renderer's `length()` rounds.
fn hundredths(points: f64) -> f64 {
    (points * 100.0).round() / 100.0
}

/// Rems rounded to ten-thousandths, which keeps `0.8125rem` whole and is finer
/// than the hundredth of a point the renderer rounds to at any text size.
fn ten_thousandths(rems: f64) -> f64 {
    (rems * 10_000.0).round() / 10_000.0
}

fn length_native(length: Length) -> Native {
    let points = hundredths(length.px);
    let rems = ten_thousandths(length.rem);
    if length.em == 0.0 && rems == 0.0 {
        return Native::Number(points);
    }
    let terms: Vec<String> = [(length.em, "em"), (rems, "rem"), (points, "px")]
        .into_iter()
        .filter(|(amount, _)| *amount != 0.0)
        .map(|(amount, unit)| format!("{}{unit}", number_text(amount)))
        .collect();
    match terms.as_slice() {
        [one] => Native::Text(one.clone()),
        _ => Native::Text(format!("calc({})", terms.join(" + "))),
    }
}

fn curve_text(curve: &Curve) -> String {
    let (name, numbers) = match curve {
        Curve::CubicBezier(points) => ("cubic-bezier", points.as_slice()),
        Curve::Linear(stops) => ("linear", stops.as_slice()),
    };
    let numbers: Vec<String> = numbers.iter().map(|one| number_text(*one)).collect();
    format!("{name}({})", numbers.join(", "))
}

fn shadow_text(drops: &[Drop]) -> String {
    if drops.is_empty() {
        return "none".to_owned();
    }
    drops
        .iter()
        .map(|drop| {
            let mut words: Vec<String> = drop
                .lengths
                .iter()
                .map(|one| format!("{}px", number_text(hundredths(*one))))
                .collect();
            if let Some(color) = &drop.color {
                words.push(paint::to_hex(color));
            }
            words.join(" ")
        })
        .collect::<Vec<_>>()
        .join(", ")
}
