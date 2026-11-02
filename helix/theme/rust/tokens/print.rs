//! Typed expressions written back as CSS.
//!
//! **One spelling per expression**: a space after each comma, none inside a
//! function's parentheses, a space either side of a `calc()` operator, and
//! each number as the shortest text that reads back as it. [`normalized`]
//! brings a written value to the same spelling, which is how a token's printed
//! form is held to what `tokens.ts` writes.

use super::expr::{
    Channel, Color, Component, Easing, Expr, Families, Family, Filter, Filters, Layer, Math, Oklch,
    Op, Quantity, Shadow, Time, Unit, Var, Weight,
};
use super::syntax::number_text;

/// `expr` as CSS.
pub fn expr(expr: &Expr) -> String {
    match expr {
        Expr::Channels(channels) => list(channels, channel, " "),
        Expr::Color(value) => color(value),
        Expr::Easing(value) => easing(value),
        Expr::Families(value) => families(value),
        Expr::Filters(value) => filters(value),
        Expr::Quantity(value) => quantity(value),
        Expr::Shadow(value) => shadow(value),
        Expr::Time(value) => time(value),
    }
}

/// `text` in the spelling the printer writes, as far as whitespace goes.
pub fn normalized(text: &str) -> String {
    let collapsed = text.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut out = String::with_capacity(collapsed.len());
    let characters: Vec<char> = collapsed.chars().collect();
    for (at, character) in characters.iter().enumerate() {
        let before = at.checked_sub(1).map(|one| characters[one]);
        let after = characters.get(at + 1).copied();
        let dropped =
            *character == ' ' && (matches!(before, Some('(')) || matches!(after, Some(')' | ',')));
        if !dropped {
            out.push(*character);
        }
        if *character == ',' && after != Some(' ') {
            out.push(' ');
        }
    }
    out
}

fn var<T>(var: &Var<T>, fallback: fn(&T) -> String) -> String {
    match &var.fallback {
        Some(value) => format!("var({}, {})", var.name, fallback(value)),
        None => format!("var({})", var.name),
    }
}

fn list<T>(items: &[T], each: fn(&T) -> String, separator: &str) -> String {
    items.iter().map(each).collect::<Vec<_>>().join(separator)
}

fn color(value: &Color) -> String {
    match value {
        Color::Hex(digits) => format!("#{digits}"),
        Color::LightDark(light, dark) => format!("light-dark({}, {})", color(light), color(dark)),
        Color::Mix(mix) => {
            let (first, second) = match mix.weight {
                Weight::Even => (color(&mix.first), color(&mix.second)),
                Weight::First(percent) => (
                    format!("{} {}%", color(&mix.first), number_text(percent)),
                    color(&mix.second),
                ),
                Weight::Second(percent) => (
                    color(&mix.first),
                    format!("{} {}%", color(&mix.second), number_text(percent)),
                ),
            };
            format!("color-mix(in oklab, {first}, {second})")
        }
        Color::Oklch(oklch) => relative(oklch),
        Color::Transparent => "transparent".to_owned(),
        Color::Var(reference) => var(reference, color),
    }
}

fn relative(oklch: &Oklch) -> String {
    let channels = list(&oklch.channels, channel, " ");
    match &oklch.origin {
        Some(origin) => format!("oklch(from {} {channels})", color(origin)),
        None => format!("oklch({channels})"),
    }
}

fn channel(value: &Channel) -> String {
    match value {
        Channel::Calc(math) => format!("calc({})", arithmetic(math)),
        Channel::Clamp(parts) => {
            let [low, value, high] = parts.as_ref();
            format!(
                "clamp({}, {}, {})",
                arithmetic(low),
                arithmetic(value),
                arithmetic(high)
            )
        }
        Channel::Component(name) => component(*name).to_owned(),
        Channel::Number(number) => number_text(*number),
        Channel::Var(reference) => var(reference, |channels| list(channels, channel, " ")),
    }
}

fn component(name: Component) -> &'static str {
    match name {
        Component::Chroma => "c",
        Component::Hue => "h",
        Component::Lightness => "l",
    }
}

fn unit(unit: Unit) -> &'static str {
    match unit {
        Unit::Em => "em",
        Unit::Px => "px",
        Unit::Rem => "rem",
    }
}

/// How tightly an operator binds: a sum, then a product.
fn binding(op: Op) -> u8 {
    match op {
        Op::Add | Op::Subtract => 1,
        Op::Divide | Op::Multiply => 2,
    }
}

/// An operand of `op`, in parentheses where it binds more loosely, or as
/// loosely on the right of a `-` or a `/`.
///
/// **A tree that needs them is the only kind that gets them.** The CSS reader
/// groups by precedence and reads a parenthesis as the group it is, and a
/// builder can nest a sum inside a product, and this is what keeps that sum
/// together in both. A parenthesis that groups nothing is refused for not
/// printing back as written.
fn operand(math: &Math, op: Op, right: bool) -> String {
    let text = arithmetic(math);
    let Math::Binary(_, inner, _) = math else {
        return text;
    };
    let looser = binding(*inner) < binding(op);
    let regrouped =
        right && binding(*inner) == binding(op) && matches!(op, Op::Divide | Op::Subtract);
    if looser || regrouped {
        format!("({text})")
    } else {
        text
    }
}

/// The inside of `calc()`.
fn arithmetic(math: &Math) -> String {
    match math {
        Math::Binary(left, op, right) => {
            let sign = match op {
                Op::Add => "+",
                Op::Divide => "/",
                Op::Multiply => "*",
                Op::Subtract => "-",
            };
            format!(
                "{} {sign} {}",
                operand(left, *op, false),
                operand(right, *op, true)
            )
        }
        Math::Component(name) => component(*name).to_owned(),
        Math::Length(value, length) => format!("{}{}", number_text(*value), unit(*length)),
        Math::Number(value) => number_text(*value),
        Math::Var(reference) => var(reference, quantity),
    }
}

fn quantity(value: &Quantity) -> String {
    match value {
        Quantity::Calc(math) => format!("calc({})", arithmetic(math)),
        Quantity::Length(number, length) => format!("{}{}", number_text(*number), unit(*length)),
        Quantity::Number(number) => number_text(*number),
        Quantity::Round(value, step) => {
            format!("round({}, {})", quantity(value), quantity(step))
        }
        Quantity::Var(reference) => var(reference, quantity),
    }
}

fn time(value: &Time) -> String {
    match value {
        Time::Milliseconds(number) => format!("{}ms", number_text(*number)),
        Time::Seconds(number) => format!("{}s", number_text(*number)),
        Time::Var(reference) => var(reference, time),
    }
}

fn easing(value: &Easing) -> String {
    let numbers = |values: &[f64]| list(values, |one| number_text(*one), ", ");
    match value {
        Easing::CubicBezier(points) => format!("cubic-bezier({})", numbers(points)),
        Easing::Linear(stops) => format!("linear({})", numbers(stops)),
        Easing::Spring(spring) => format!("linear({})", numbers(&spring.stops)),
        Easing::Var(reference) => var(reference, easing),
    }
}

fn shadow(value: &Shadow) -> String {
    match value {
        Shadow::Layers(layers) => list(layers, layer, ", "),
        Shadow::None => "none".to_owned(),
        Shadow::Var(reference) => var(reference, shadow),
    }
}

fn layer(value: &Layer) -> String {
    let lengths = list(&value.lengths, quantity, " ");
    match &value.color {
        Some(paint) => format!("{lengths} {}", color(paint)),
        None => lengths,
    }
}

fn filters(value: &Filters) -> String {
    match value {
        Filters::List(items) => list(items, filter, " "),
        Filters::Var(reference) => var(reference, filters),
    }
}

fn filter(value: &Filter) -> String {
    match value {
        Filter::Blur(radius) => format!("blur({})", quantity(radius)),
        Filter::Saturate(amount) => format!("saturate({})", quantity(amount)),
    }
}

fn families(value: &Families) -> String {
    match value {
        Families::List(items) => list(items, family, ", "),
        Families::Var(reference) => var(reference, families),
    }
}

fn family(value: &Family) -> String {
    match value {
        Family::Named(words) => words.join(" "),
        Family::Quoted(name) => format!("\"{name}\""),
    }
}
