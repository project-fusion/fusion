//! A declaration's value, written as CSS.

use crate::family::ir::{MixSpace, Op, QuoteMark, Value};

#[cfg(test)]
#[path = "value_tests.rs"]
mod tests;

/// What a value is written within: the prefix of the element's own hooks,
/// and the prefix of the design system's tokens.
#[derive(Clone, Copy, Debug)]
pub struct Scope<'a> {
    pub hooks: &'a str,
    pub tokens: &'a str,
}

impl<'a> Scope<'a> {
    /// The scope of `family`'s rules.
    pub fn of(family: &'a crate::family::ir::Family) -> Self {
        Self {
            hooks: &family.name,
            tokens: &family.names.property,
        }
    }
}

/// A value as CSS.
pub fn render(value: &Value, scope: Scope<'_>) -> String {
    match value {
        Value::Text(text) => text.clone(),
        Value::Number(number) => number_css(*number),
        Value::Fit(share) => format!("{}fr", number_css(*share)),
        Value::Token(name) => format!("var(--{}-{name})", scope.tokens),
        Value::Derived { fallback, name, .. } | Value::Own { fallback, name } => {
            variable(&format!("--_{name}"), fallback.as_deref(), scope)
        }
        Value::Inherited { fallback, name } | Value::Measured { fallback, name } => {
            variable(&format!("--{name}"), fallback.as_deref(), scope)
        }
        Value::Hook { fallback, name, of } => variable(
            &format!("--{}-{name}", of.as_deref().unwrap_or(scope.hooks)),
            fallback.as_deref(),
            scope,
        ),
        Value::Keyword(keyword) => keyword.css().to_owned(),
        Value::Calc { .. } => format!("calc({})", arithmetic(value, scope)),
        Value::Function { arguments, name } => format!("{name}({})", join(arguments, ", ", scope)),
        Value::Mix {
            first,
            percent,
            second,
            space,
        } => format!(
            "color-mix(in {}, {} {}%, {})",
            match space {
                Some(MixSpace::Srgb) => "srgb",
                None => "oklab",
            },
            render(first, scope),
            number_css(*percent),
            render(second, scope)
        ),
        Value::Quote { alt, mark } => {
            let mark = match mark {
                QuoteMark::Close => "close-quote",
                QuoteMark::NoClose => "no-close-quote",
                QuoteMark::NoOpen => "no-open-quote",
                QuoteMark::Open => "open-quote",
            };
            match alt {
                Some(alt) => format!("{mark} / {}", render(alt, scope)),
                None => mark.to_owned(),
            }
        }
        Value::Scheme { dark, light } => format!(
            "light-dark({}, {})",
            render(light, scope),
            render(dark, scope)
        ),
        Value::Web(inner) => render(inner, scope),
        Value::Space(values) => join(values, " ", scope),
        Value::List(values) => join(values, ", ", scope),
    }
}

/// `var(--name)`, or `var(--name, fallback)`.
pub fn variable(name: &str, fallback: Option<&Value>, scope: Scope<'_>) -> String {
    match fallback {
        Some(fallback) => format!("var({name}, {})", render(fallback, scope)),
        None => format!("var({name})"),
    }
}

/// The inside of a `calc()`, with parentheses only where precedence needs
/// them, so `a - b * 2` and `(a - b) * 2` are both one `calc()`.
pub fn arithmetic(value: &Value, scope: Scope<'_>) -> String {
    match value {
        Value::Calc { op, operands } => operands
            .iter()
            .enumerate()
            .map(|(at, operand)| match operand {
                Value::Calc { op: inner, .. } if grouped(*op, *inner, at) => {
                    format!("({})", arithmetic(operand, scope))
                }
                operand @ Value::Calc { .. } => arithmetic(operand, scope),
                operand => render(operand, scope),
            })
            .collect::<Vec<_>>()
            .join(&format!(" {op} ")),
        value => render(value, scope),
    }
}

/// Whether arithmetic inside `outer`, at operand `at`, needs parentheses.
///
/// **CSS reads `*` and `/` before `+` and `-`, and left to right within
/// each.** An operand binding more loosely than the operator around it needs
/// them, as `(a + b) * 2` does. One binding as tightly needs them after a `-`
/// or a `/`, where regrouping changes the result: `a - (b - c)` is not
/// `a - b - c`. After a `+` or a `*` it reads the same without them.
fn grouped(outer: Op, inner: Op, at: usize) -> bool {
    let rank = |op: Op| match op {
        Op::Add | Op::Subtract => 1,
        Op::Divide | Op::Multiply => 2,
    };
    rank(inner) < rank(outer)
        || (rank(inner) == rank(outer) && at > 0 && matches!(outer, Op::Divide | Op::Subtract))
}

pub fn join(values: &[Value], separator: &str, scope: Scope<'_>) -> String {
    values
        .iter()
        .map(|value| render(value, scope))
        .collect::<Vec<_>>()
        .join(separator)
}

/// A number as CSS writes it: `0`, `0.5`, `86`.
pub fn number_css(number: f64) -> String {
    if number.fract() == 0.0 && number.abs() < 1e15 {
        format!("{number:.0}")
    } else {
        number.to_string()
    }
}
