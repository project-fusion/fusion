//! Typed expressions written back as builder calls.
//!
//! **One spelling per expression.** A mix toward `transparent` that states the
//! first color's share is `alpha()`, a one-filter list is the filter itself,
//! and a one-layer shadow is `shadow()`, so a token written another way is
//! refused for not printing back as written, which keeps `tokens.ts` in the
//! spelling a reader of the builders expects.

use super::super::expr::{
    Channel, Color, Component, Easing, Expr, Families, Family, Filter, Filters, Layer, Math, Oklch,
    Op, Quantity, Shadow, Time, Unit, Var, Weight,
};
use super::Built;

/// The private property `density` names.
pub const DENSITY: &str = "--_helix-seed-density";

/// `expr` as the builder calls that write it.
pub fn built(expr: &Expr) -> Built {
    match expr {
        Expr::Channels(channels) => Built::List(channels.iter().map(channel).collect()),
        Expr::Color(value) => color(value),
        Expr::Easing(value) => easing(value),
        Expr::Families(value) => families(value),
        Expr::Filters(value) => filters(value),
        Expr::Quantity(value) => quantity(value),
        Expr::Shadow(value) => shadow(value),
        Expr::Time(value) => time(value),
    }
}

fn call(name: &str, arguments: Vec<Built>) -> Built {
    Built::Call(name.to_owned(), arguments)
}

/// `ref()` for a token, `primitive()` for a private property, and `density`
/// for the density seed.
///
/// **A property under neither prefix has no builder**, and a builder never
/// reads one, so it is written as `custom()` with its whole name: a call no
/// builder answers to, which the reader refuses.
fn var<T>(var: &Var<T>, fallback: fn(&T) -> Built) -> Built {
    let fallback = var.fallback.as_deref().map(fallback);
    if var.name == DENSITY && fallback.is_none() {
        return Built::Name("density".to_owned());
    }
    let (builder, name) = if let Some(token) = var.name.strip_prefix("--helix-") {
        ("ref", token)
    } else if let Some(private) = var.name.strip_prefix("--_helix-") {
        ("primitive", private)
    } else {
        ("custom", var.name.as_str())
    };
    let mut arguments = vec![Built::Text(name.to_owned())];
    arguments.extend(fallback);
    call(builder, arguments)
}

fn color(value: &Color) -> Built {
    match value {
        Color::Hex(digits) => call("hex", vec![Built::Text(digits.clone())]),
        Color::LightDark(light, dark) => call("lightDark", vec![color(light), color(dark)]),
        Color::Mix(mix) => match (mix.weight, &mix.second) {
            (Weight::First(percent), Color::Transparent) => {
                call("alpha", vec![color(&mix.first), Built::Number(percent)])
            }
            (Weight::First(percent), second) => call(
                "mix",
                vec![color(&mix.first), Built::Number(percent), color(second)],
            ),
            (Weight::Second(percent), second) => call(
                "mix",
                vec![color(&mix.first), color(second), Built::Number(percent)],
            ),
            (Weight::Even, second) => call("mix", vec![color(&mix.first), color(second)]),
        },
        Color::Oklch(oklch) => relative(oklch),
        Color::Transparent => Built::Name("transparent".to_owned()),
        Color::Var(reference) => var(reference, color),
    }
}

fn relative(oklch: &Oklch) -> Built {
    let channels = oklch.channels.iter().map(channel);
    match &oklch.origin {
        Some(origin) => call(
            "relative",
            std::iter::once(color(origin)).chain(channels).collect(),
        ),
        None => call("oklch", channels.collect()),
    }
}

fn channel(value: &Channel) -> Built {
    match value {
        Channel::Calc(math) => arithmetic(math),
        Channel::Clamp(parts) => call("clamp", parts.iter().map(arithmetic).collect()),
        Channel::Component(name) => component(*name),
        Channel::Number(number) => Built::Number(*number),
        Channel::Var(reference) => var(reference, |channels| {
            Built::List(channels.iter().map(channel).collect())
        }),
    }
}

fn component(name: Component) -> Built {
    Built::Name(
        match name {
            Component::Chroma => "chroma",
            Component::Hue => "hue",
            Component::Lightness => "lightness",
        }
        .to_owned(),
    )
}

fn length(value: f64, unit: Unit) -> Built {
    let name = match unit {
        Unit::Em => "em",
        Unit::Px => "px",
        Unit::Rem => "rem",
    };
    call(name, vec![Built::Number(value)])
}

fn arithmetic(math: &Math) -> Built {
    match math {
        Math::Binary(left, op, right) => {
            let name = match op {
                Op::Add => "plus",
                Op::Divide => "divide",
                Op::Multiply => "times",
                Op::Subtract => "minus",
            };
            call(name, vec![arithmetic(left), arithmetic(right)])
        }
        Math::Component(name) => component(*name),
        Math::Length(value, unit) => length(*value, *unit),
        Math::Number(value) => Built::Number(*value),
        Math::Var(reference) => var(reference, quantity),
    }
}

fn quantity(value: &Quantity) -> Built {
    match value {
        Quantity::Calc(math) => arithmetic(math),
        Quantity::Length(number, unit) => length(*number, *unit),
        Quantity::Number(number) => Built::Number(*number),
        Quantity::Round(value, step) => call("round", vec![quantity(value), quantity(step)]),
        Quantity::Var(reference) => var(reference, quantity),
    }
}

fn time(value: &Time) -> Built {
    match value {
        Time::Milliseconds(number) => call("ms", vec![Built::Number(*number)]),
        Time::Seconds(number) => call("s", vec![Built::Number(*number)]),
        Time::Var(reference) => var(reference, time),
    }
}

fn numbers(values: &[f64]) -> Vec<Built> {
    values.iter().map(|one| Built::Number(*one)).collect()
}

fn easing(value: &Easing) -> Built {
    match value {
        Easing::CubicBezier(points) => call("cubicBezier", numbers(points)),
        Easing::Linear(stops) => call("linear", numbers(stops)),
        Easing::Spring(spring) => call(
            "spring",
            vec![
                Built::Object(vec![
                    ("damping".to_owned(), Built::Number(spring.damping)),
                    ("mass".to_owned(), Built::Number(spring.mass)),
                    ("stiffness".to_owned(), Built::Number(spring.stiffness)),
                ]),
                call("linear", numbers(&spring.stops)),
            ],
        ),
        Easing::Var(reference) => var(reference, easing),
    }
}

fn shadow(value: &Shadow) -> Built {
    match value {
        Shadow::Layers(layers) => match layers.as_slice() {
            [one] => layer(one),
            many => call("shadows", many.iter().map(layer).collect()),
        },
        Shadow::None => Built::Name("none".to_owned()),
        Shadow::Var(reference) => var(reference, shadow),
    }
}

fn layer(value: &Layer) -> Built {
    let mut arguments = vec![Built::List(value.lengths.iter().map(quantity).collect())];
    arguments.extend(value.color.as_ref().map(color));
    call("shadow", arguments)
}

fn filters(value: &Filters) -> Built {
    match value {
        Filters::List(items) => match items.as_slice() {
            [one] => filter(one),
            many => call("filters", many.iter().map(filter).collect()),
        },
        Filters::Var(reference) => var(reference, filters),
    }
}

fn filter(value: &Filter) -> Built {
    match value {
        Filter::Blur(radius) => call("blur", vec![quantity(radius)]),
        Filter::Saturate(amount) => call("saturate", vec![quantity(amount)]),
    }
}

fn families(value: &Families) -> Built {
    match value {
        Families::List(items) => call(
            "families",
            items
                .iter()
                .map(|family| match family {
                    Family::Named(words) => Built::Text(words.join(" ")),
                    Family::Quoted(name) => call("quoted", vec![Built::Text(name.clone())]),
                })
                .collect(),
        ),
        Families::Var(reference) => var(reference, families),
    }
}
