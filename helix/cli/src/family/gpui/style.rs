//! A declaration as the GPUI style calls that draw it.
//!
//! **Each call is written after a receiver**, `.bg(..)`, so the same call
//! styles an element and the style refinement a `.hover()` closure builds,
//! since both are `Styled`.
//!
//! **A declaration GPUI cannot draw yet is dropped with why**, as a phone's
//! `dropped` list names one, and one the spike does not map is a fault.

use std::collections::BTreeMap;

use super::field;
use super::theme::{float, Kind, Tokens};
use crate::family::ir::Value;

/// What a declaration becomes.
pub enum Lowered {
    /// The calls, in order.
    Calls(Vec<String>),
    /// Nothing, with why.
    Dropped(String),
}

/// What a value is read as.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Wanted {
    Color,
    Length,
    Number,
}

/// What lowering reads: the theme's tokens, and the hooks the element takes,
/// which each lowering adds to.
pub struct Reads<'a> {
    pub tokens: &'a Tokens,
    pub hooks: &'a mut BTreeMap<String, &'static str>,
}

/// `property: value` as calls.
///
/// # Errors
///
/// Why the spike cannot write it.
pub fn lower(property: &str, value: &Value, reads: &mut Reads) -> Result<Lowered, String> {
    let calls = |calls: &[String]| Ok(Lowered::Calls(calls.to_vec()));
    match property {
        "display" => match keyword(value)? {
            /* GPUI has no inline layout, so an inline flex box is a flex box. */
            "flex" | "inline-flex" => calls(&[".flex()".to_owned()]),
            "block" | "inline-block" => calls(&[".block()".to_owned()]),
            "none" => calls(&[".hidden()".to_owned()]),
            other => Err(format!("`display: {other}` has no GPUI form in the spike")),
        },
        "align-items" => {
            let call = match keyword(value)? {
                "center" => ".items_center()",
                "start" | "flex-start" => ".items_start()",
                "end" | "flex-end" => ".items_end()",
                "baseline" => ".items_baseline()",
                other => return Err(format!("`align-items: {other}` has no GPUI form in the spike")),
            };
            calls(&[call.to_owned()])
        }
        "justify-content" => {
            let call = match keyword(value)? {
                "center" => ".justify_center()",
                "start" | "flex-start" => ".justify_start()",
                "end" | "flex-end" => ".justify_end()",
                "space-between" => ".justify_between()",
                "space-around" => ".justify_around()",
                other => {
                    return Err(format!(
                        "`justify-content: {other}` has no GPUI form in the spike"
                    ))
                }
            };
            calls(&[call.to_owned()])
        }
        "background-color" => calls(&[format!(".bg({})", read(Wanted::Color, value, reads)?)]),
        "color" => calls(&[format!(".text_color({})", read(Wanted::Color, value, reads)?)]),
        "border-color" => calls(&[format!(
            ".border_color({})",
            read(Wanted::Color, value, reads)?
        )]),
        "border-radius" => calls(&[format!(".rounded({})", read(Wanted::Length, value, reads)?)]),
        "font-size" => calls(&[format!(".text_size({})", read(Wanted::Length, value, reads)?)]),
        "font-weight" => calls(&[format!(
            ".font_weight(gpui::FontWeight({}))",
            read(Wanted::Number, value, reads)?
        )]),
        "font-family" => match value {
            Value::Token(name) if reads.tokens.kind(name) == Some(Kind::Family) => {
                calls(&[format!(".font_family(theme.{}.clone())", field(name))])
            }
            _ => Err("a font family is read from a token in the spike".to_owned()),
        },
        "gap" => calls(&[format!(".gap({})", read(Wanted::Length, value, reads)?)]),
        "padding-inline" => calls(&[format!(".px({})", read(Wanted::Length, value, reads)?)]),
        "padding-block" => calls(&[format!(".py({})", read(Wanted::Length, value, reads)?)]),
        "opacity" => calls(&[format!(".opacity({})", read(Wanted::Number, value, reads)?)]),
        "outline" => outline(value, reads),
        "transition" => Ok(Lowered::Dropped(
            "`transition`: the spike eases a color the element's rules set without a condition, and writes no other transition".to_owned(),
        )),
        "animation" => Ok(Lowered::Dropped(
            "`animation`: keyframes are a later phase".to_owned(),
        )),
        other => Err(format!("`{other}` has no GPUI form in the spike")),
    }
}

/// One property a transition moves, with its duration and its curve as Rust
/// expressions.
pub struct Transition {
    pub property: String,
    pub duration: String,
    pub curve: String,
}

/// The GPUI call that sets a color property the transition driver eases.
pub fn eased_setter(property: &str) -> Option<&'static str> {
    match property {
        "background-color" => Some("bg"),
        "color" => Some("text_color"),
        "border-color" => Some("border_color"),
        _ => None,
    }
}

/// A `transition` value: one move, or a list of them, each a property, a
/// duration token, and an easing token.
///
/// # Errors
///
/// Why the spike cannot read it: a delay, a value that is no token, or a
/// property the driver does not ease.
pub fn transitions(value: &Value, reads: &Reads) -> Result<Vec<Transition>, String> {
    let moves = match value {
        Value::List(moves) => moves.iter().collect(),
        one => vec![one],
    };
    moves
        .into_iter()
        .map(|one| {
            let Value::Space(parts) = one else {
                return Err("a transition is written as its property, its duration, and its curve".to_owned());
            };
            let [Value::Text(property), Value::Token(duration), Value::Token(curve)] = parts.as_slice() else {
                return Err("the spike eases a transition written as a property, a duration token, and an easing token".to_owned());
            };
            if eased_setter(property).is_none() {
                return Err(format!("the spike eases colors, and `{property}` is none"));
            }
            if reads.tokens.kind(duration) != Some(Kind::Time) {
                return Err(format!("`{duration}` is no duration token"));
            }
            if reads.tokens.kind(curve) != Some(Kind::Easing) {
                return Err(format!("`{curve}` is no easing token"));
            }
            Ok(Transition {
                property: property.clone(),
                duration: format!("theme.{}", field(duration)),
                curve: format!("theme.{}", field(curve)),
            })
        })
        .collect()
}

/// `value` as a color.
///
/// # Errors
///
/// Why the spike cannot read it as one.
pub fn color(value: &Value, reads: &mut Reads) -> Result<String, String> {
    read(Wanted::Color, value, reads)
}

/// An outline, as a ring: GPUI draws no outline.
fn outline(value: &Value, reads: &mut Reads) -> Result<Lowered, String> {
    let Value::Space(parts) = value else {
        return Err("an outline is written as its width, its style, and its color".to_owned());
    };
    let [width, Value::Text(style), color] = parts.as_slice() else {
        return Err("an outline is written as its width, its style, and its color".to_owned());
    };
    if style != "solid" {
        return Err(format!("an outline drawn `{style}` has no GPUI form"));
    }
    let width = match width {
        Value::Text(text) => text
            .strip_suffix("px")
            .and_then(|number| number.parse::<f64>().ok())
            .map(|number| format!("gpui::px({})", float(number)))
            .ok_or_else(|| format!("an outline `{text}` wide is written in pixels in the spike"))?,
        _ => return Err("an outline's width is written in pixels in the spike".to_owned()),
    };
    let color = read(Wanted::Color, color, reads)?;
    Ok(Lowered::Calls(vec![format!(
        ".shadow(vec![super::theme::ring({width}, {color})])"
    )]))
}

/// A keyword value.
fn keyword(value: &Value) -> Result<&str, String> {
    match value {
        Value::Text(text) => Ok(text),
        _ => Err("the value is no keyword".to_owned()),
    }
}

/// `value` read as `wanted`, as a Rust expression.
fn read(wanted: Wanted, value: &Value, reads: &mut Reads) -> Result<String, String> {
    match value {
        Value::Token(name) => {
            let kind = reads
                .tokens
                .kind(name)
                .ok_or_else(|| format!("the theme holds no `{name}`"))?;
            let fits = matches!(
                (wanted, kind),
                (Wanted::Color, Kind::Color)
                    | (Wanted::Length, Kind::Length)
                    | (Wanted::Number, Kind::Number)
            );
            if fits {
                Ok(format!("theme.{}", field(name)))
            } else {
                Err(format!(
                    "`{name}` is a {kind:?} token, read here as a {wanted:?}"
                ))
            }
        }
        Value::Hook {
            fallback: Some(fallback),
            name,
            of: None,
        } => {
            let fallback = read(wanted, fallback, reads)?;
            reads.hooks.insert(
                name.clone(),
                match wanted {
                    Wanted::Color => "gpui::Hsla",
                    Wanted::Length => "gpui::AbsoluteLength",
                    Wanted::Number => "f32",
                },
            );
            Ok(format!("hooks.{}.unwrap_or({fallback})", field(name)))
        }
        Value::Hook { .. } => {
            Err("a hook with no default, or another family's, is a later phase".to_owned())
        }
        Value::Number(number) => match wanted {
            Wanted::Number => Ok(format!("{}_f32", float(*number))),
            Wanted::Length if *number == 0.0 => Ok("gpui::px(0.)".to_owned()),
            _ => Err(format!("`{number}` is no {wanted:?}")),
        },
        Value::Text(text) => literal(wanted, text),
        _ => {
            Err("the value is a later phase's: arithmetic, a mix, or a measured length".to_owned())
        }
    }
}

/// Words written in the source, read as `wanted`.
fn literal(wanted: Wanted, text: &str) -> Result<String, String> {
    match wanted {
        Wanted::Color if text == "transparent" => Ok("gpui::transparent_black()".to_owned()),
        Wanted::Color => {
            let hex = super::theme::color(text)?;
            Ok(format!(
                "gpui::Hsla::from({})",
                hex.trim_end_matches(".into()")
            ))
        }
        Wanted::Length => {
            let length = super::theme::length(text)?;
            Ok(length.replace("AbsoluteLength::", "gpui::AbsoluteLength::"))
        }
        Wanted::Number => text
            .parse::<f64>()
            .map(|number| format!("{}_f32", float(number)))
            .map_err(|_| format!("`{text}` is no number")),
    }
}
