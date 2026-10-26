//! A declaration's value, read from the helpers a source writes it with.
//!
//! **A value is refused where CSS would drop the whole declaration.** An
//! `inherit()` inside a `calc()`, a `quote()` outside `content`, and a
//! `quotient()` by a length are invalid on the web, and a native view could
//! give each a meaning the web never has.

use crate::family::ir::{Declaration, Keyword, MixSpace, Op, QuoteMark, Value};
use crate::family::read::Lit;

#[path = "fit.rs"]
mod fit;
#[path = "lists.rs"]
mod lists;
#[cfg(test)]
#[path = "values_tests.rs"]
mod tests;

use fit::{fit, fits};
#[path = "derivations_table.rs"]
mod derivations_table;
pub use derivations_table::DERIVATIONS;
pub use lists::{is_list, LIST_DERIVATIONS};

/// Private values, `[name, value]` in order.
pub fn declarations(lit: &Lit) -> Result<Vec<Declaration>, String> {
    let Lit::Array(pairs) = lit else {
        return Err("declarations are an array of `[property, value]`".to_owned());
    };
    pairs
        .iter()
        .map(|pair| match pair {
            Lit::Array(pair) => match pair.as_slice() {
                [Lit::Text(property), value] => {
                    let value = self::value(value)?;
                    placed(&value, Place::Whole)
                        .map_err(|error| format!("`{property}`: {error}"))?;
                    Ok((property.clone(), value))
                }
                _ => Err("a declaration is `[property, value]`".to_owned()),
            },
            _ => Err("a declaration is `[property, value]`".to_owned()),
        })
        .collect()
}

/// CSS declarations, `[property, value]` in order. A quotation mark is the
/// generated content's alone.
pub fn set(lit: &Lit) -> Result<Vec<Declaration>, String> {
    let declarations = declarations(lit)?;
    for (property, value) in &declarations {
        if property != "content" && !property.starts_with("--") && quoted(value) {
            return Err(format!(
                "`{property}`: `quote()` is a value of `content` only"
            ));
        }
        if property != "grid-template-rows" && fits(value) {
            return Err(format!(
                "`{property}`: `fit()` is a value of `grid-template-rows` only"
            ));
        }
    }
    Ok(declarations)
}

/// Where a value stands in the declaration around it.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Place {
    /// The whole value, or the fallback of a variable that is.
    Whole,
    /// One of the words of a value joined with spaces.
    Word,
    /// Inside a function, arithmetic, or a list.
    Inner,
}

fn placed(value: &Value, at: Place) -> Result<(), String> {
    let all = |values: &[Value], at: Place| values.iter().try_for_each(|one| placed(one, at));
    match value {
        Value::Keyword(keyword) if at != Place::Whole => Err(format!(
            "`{}()` is a whole value, or the fallback of one",
            keyword.css()
        )),
        Value::Quote { .. } if at == Place::Inner => {
            Err("`quote()` is a whole value of `content`, or one of its words".to_owned())
        }
        Value::Quote { alt, .. } => alt
            .as_deref()
            .map_or(Ok(()), |alt| placed(alt, Place::Inner)),
        Value::Derived { fallback, .. }
        | Value::Hook { fallback, .. }
        | Value::Inherited { fallback, .. }
        | Value::Measured { fallback, .. }
        | Value::Own { fallback, .. } => fallback
            .as_deref()
            .map_or(Ok(()), |fallback| placed(fallback, at)),
        Value::Space(values) => all(
            values,
            if at == Place::Inner {
                Place::Inner
            } else {
                Place::Word
            },
        ),
        Value::Calc {
            operands: values, ..
        }
        | Value::Function {
            arguments: values, ..
        }
        | Value::List(values) => all(values, Place::Inner),
        Value::Mix { first, second, .. }
        | Value::Scheme {
            dark: first,
            light: second,
        } => {
            placed(first, Place::Inner)?;
            placed(second, Place::Inner)
        }
        Value::Web(inner) => placed(inner, at),
        Value::Fit(_) if at != Place::Whole => {
            Err("`fit()` is a whole value of `grid-template-rows`".to_owned())
        }
        Value::Fit(_) | Value::Keyword(_) | Value::Number(_) | Value::Text(_) | Value::Token(_) => {
            Ok(())
        }
    }
}

/// Whether a quotation mark is any part of the value.
/// Whether a value draws a quotation mark, `quote()`, itself or as a fallback.
pub fn quoted(value: &Value) -> bool {
    match value {
        Value::Quote { .. } => true,
        Value::Derived { fallback, .. }
        | Value::Hook { fallback, .. }
        | Value::Inherited { fallback, .. }
        | Value::Measured { fallback, .. }
        | Value::Own { fallback, .. } => fallback.as_deref().is_some_and(quoted),
        Value::Space(values) => values.iter().any(quoted),
        Value::Web(inner) => quoted(inner),
        _ => false,
    }
}

/// A string, refused where it reads a custom property: `var()` inside a
/// string hides a hook, a private value or a token from every check, and
/// `hook()`, `own()`, `token()` and the arithmetic helpers name it.
fn text_value(text: &str) -> Result<Value, String> {
    if text.contains("var(") {
        return Err(format!(
            "`{text}` reads a custom property inside a string: name it with `hook()`, `own()` or `token()`, and `sum()`, `difference()`, `product()` or `quotient()` for the arithmetic"
        ));
    }
    /* The safe area is the window's, which a layer's rules alone read, and
    the check finds it only where `safeArea()` writes it. */
    if text.contains("env(") {
        return Err(format!(
            "`{text}` reads the safe area inside a string: write `safeArea('bottom')` or another edge"
        ));
    }
    Ok(Value::Text(text.to_owned()))
}

fn value(lit: &Lit) -> Result<Value, String> {
    let named =
        |name: &str, fallback: Option<&Lit>| -> Result<(String, Option<Box<Value>>), String> {
            Ok((
                name.to_owned(),
                fallback.map(value).transpose()?.map(Box::new),
            ))
        };
    match lit {
        Lit::Text(text) => text_value(text),
        Lit::Number(number) => Ok(Value::Number(*number)),
        Lit::Array(values) => values
            .iter()
            .map(value)
            .collect::<Result<_, _>>()
            .map(Value::Space),
        Lit::Call(helper, arguments) => match (helper.as_str(), arguments.as_slice()) {
            ("token", [Lit::Text(name)]) => Ok(Value::Token(name.clone())),
            ("own", [Lit::Text(name), rest @ ..]) if rest.len() <= 1 => {
                let (name, fallback) = named(name, rest.first())?;
                Ok(Value::Own { fallback, name })
            }
            ("hook", [Lit::Text(name), rest @ ..]) if rest.len() <= 1 => {
                let (name, fallback) = named(name, rest.first())?;
                Ok(Value::Hook {
                    fallback,
                    name,
                    of: None,
                })
            }
            /* Another family's hook, which the element around sets on this one,
            as a button group sets each button's corners. */
            ("hookOf", [Lit::Text(of), Lit::Text(name), rest @ ..]) if rest.len() <= 1 => {
                let (name, fallback) = named(name, rest.first())?;
                Ok(Value::Hook {
                    fallback,
                    name,
                    of: Some(of.clone()),
                })
            }
            ("measured", [Lit::Text(name), rest @ ..]) if rest.len() <= 1 => {
                let (name, fallback) = named(name, rest.first())?;
                Ok(Value::Measured { fallback, name })
            }
            ("inherited", [Lit::Text(name), rest @ ..]) if rest.len() <= 1 => {
                let (name, fallback) = named(name, rest.first())?;
                Ok(Value::Inherited { fallback, name })
            }
            ("derived", [Lit::Text(name), rest @ ..]) if rest.len() <= 1 => {
                derived(name, rest.first())
            }
            ("fit", arguments) => fit(arguments),
            (name @ ("inherit" | "initial" | "unset"), []) => Ok(Value::Keyword(keyword(name))),
            ("quote", [Lit::Text(mark), rest @ ..]) if rest.len() <= 1 => quote(mark, rest.first()),
            ("scheme", [light, dark]) => Ok(Value::Scheme {
                dark: Box::new(value(dark)?),
                light: Box::new(value(light)?),
            }),
            ("mix", [first, Lit::Number(percent), second, space @ ..]) if space.len() <= 1 => {
                Ok(Value::Mix {
                    first: Box::new(value(first)?),
                    percent: *percent,
                    second: Box::new(value(second)?),
                    space: space.first().map(mix_space).transpose()?,
                })
            }
            ("quotient", [dividend, divisor]) => Ok(Value::Calc {
                op: Op::Divide,
                operands: vec![value(dividend)?, self::divisor(divisor)?],
            }),
            ("sum" | "difference" | "product", operands) if operands.len() >= 2 => {
                let op = match helper.as_str() {
                    "sum" => Op::Add,
                    "difference" => Op::Subtract,
                    _ => Op::Multiply,
                };
                Ok(Value::Calc {
                    op,
                    operands: operands.iter().map(value).collect::<Result<_, _>>()?,
                })
            }
            ("safeArea", [Lit::Text(edge)]) => safe_area(edge),
            ("fn", [Lit::Text(name), arguments @ ..]) => function(name, arguments),
            ("list", values) => values
                .iter()
                .map(value)
                .collect::<Result<_, _>>()
                .map(Value::List),
            ("web", [inner]) => Ok(Value::Web(Box::new(value(inner)?))),
            (helper, _) => Err(format!(
                "`{helper}()` is not in the vocabulary, or takes other arguments"
            )),
        },
        Lit::Arrow(..)
        | Lit::At(..)
        | Lit::Bool(_)
        | Lit::Member(..)
        | Lit::Name(_)
        | Lit::Null
        | Lit::Object(_) => Err("a value is a string, a number, an array or a helper".to_owned()),
    }
}

/// A CSS-wide keyword by its helper's name.
fn keyword(name: &str) -> Keyword {
    match name {
        "inherit" => Keyword::Inherit,
        "initial" => Keyword::Initial,
        _ => Keyword::Unset,
    }
}

/// A derived value, with the function in core that computes it.
fn derived(name: &str, fallback: Option<&Lit>) -> Result<Value, String> {
    let Some((_, function)) = DERIVATIONS.iter().find(|(known, _)| *known == name) else {
        let known: Vec<_> = DERIVATIONS.iter().map(|(name, _)| *name).collect();
        return Err(format!(
            "`derived('{name}')` names no function in core's derivations, which compute {}",
            known.join(", ")
        ));
    };
    Ok(Value::Derived {
        fallback: fallback.map(value).transpose()?.map(Box::new),
        function: (*function).to_owned(),
        name: name.to_owned(),
    })
}

/// A function the web has, `fn(name, ...)`. The safe area is `safeArea()`'s
/// alone, so a layer's rules are found to read it.
fn function(name: &str, arguments: &[Lit]) -> Result<Value, String> {
    if name == "env" {
        return Err(
            "`fn('env')` reads the safe area, which `safeArea('bottom')` and the other edges write"
                .to_owned(),
        );
    }
    Ok(Value::Function {
        arguments: arguments.iter().map(value).collect::<Result<_, _>>()?,
        name: name.to_owned(),
    })
}

/// How far the window's edge `edge` keeps content clear of the home
/// indicator, a notch or a rounded corner: `env(safe-area-inset-<edge>, 0px)`
/// on the web, and the safe area `HelixRoot` hears on a phone.
fn safe_area(edge: &str) -> Result<Value, String> {
    if !["bottom", "left", "right", "top"].contains(&edge) {
        return Err(format!(
            "`safeArea('{edge}')` names an edge of the window: `top`, `right`, `bottom` or `left`"
        ));
    }
    Ok(Value::Function {
        arguments: vec![
            Value::Text(format!("safe-area-inset-{edge}")),
            Value::Text("0px".to_owned()),
        ],
        name: "env".to_owned(),
    })
}

/// The color space `mix()`'s fourth argument names.
fn mix_space(space: &Lit) -> Result<MixSpace, String> {
    match space {
        Lit::Text(space) if space == "srgb" => Ok(MixSpace::Srgb),
        Lit::Text(space) => Err(format!(
            "`mix()` mixes in OKLab, or in the space its fourth argument names, `srgb`, and not `{space}`"
        )),
        _ => Err("`mix()` names its color space in words, `srgb`".to_owned()),
    }
}

fn quote(mark: &str, alt: Option<&Lit>) -> Result<Value, String> {
    let mark = match mark {
        "close" => QuoteMark::Close,
        "no-close" => QuoteMark::NoClose,
        "no-open" => QuoteMark::NoOpen,
        "open" => QuoteMark::Open,
        _ => {
            return Err(format!(
                "`quote('{mark}')` is `open`, `close`, `no-open` or `no-close`"
            ))
        }
    };
    Ok(Value::Quote {
        alt: alt.map(value).transpose()?.map(Box::new),
        mark,
    })
}

/// What `quotient()` divides by: a number, or a value a number may stand in
/// for, such as a token. A length or a zero written out is refused.
fn divisor(lit: &Lit) -> Result<Value, String> {
    let divisor = value(lit)?;
    let number =
        match &divisor {
            Value::Number(number) => Some(*number),
            Value::Text(text) => Some(text.trim().parse::<f64>().map_err(|_| {
                format!("`quotient()` divides by a number, and `{text}` is not one")
            })?),
            _ => None,
        };
    if number.is_some_and(|number| number == 0.0) {
        return Err("`quotient()` divides by zero".to_owned());
    }
    Ok(divisor)
}
