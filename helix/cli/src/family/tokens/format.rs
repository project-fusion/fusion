//! One token as the Design Tokens Format Module 2025.10 writes it.
//!
//! **A token the format has a type for is written as that type**, with its
//! value in the mode at hand: a color as an sRGB color object, a length in
//! pixels or rems as a dimension, a duration in milliseconds, a cubic Bézier,
//! a number, a font weight, a font family list, and a shadow. A token that is
//! another token, `ref('color-primary')`, is written as an alias of it, so the
//! alias follows the other token into every mode.
//!
//! **A token the format has no type for is kept beside the others**, in its
//! group's `$extensions`: a length in ems, a length in rems and pixels at once,
//! a filter, a `linear()` curve, and a spring, whose physics go there too. The
//! format's dimension takes only pixels and rems, it has no filter, and its one
//! timing function is a cubic Bézier.
//!
//! **Every token carries its CSS** in `$extensions`, which is the typed
//! expression its value was evaluated from.

use fusion_helix_theme::tokens::{
    to_hex, to_srgb, Color, Curve, Drop, Easing, Expr, Families, Family, Filters, Lab, Length,
    Mode, Quantity, Registry, Shadow, Time, Token, Value,
};
use serde_json::{json, Map, Value as Json};

use super::System;
use crate::family::project::Names;

/// A token as the format writes it, or what is kept for one it cannot type.
#[derive(Clone, Debug, PartialEq)]
pub enum Entry {
    /// `$type`, `$value` and the rest, as the token's object.
    Typed(Json),
    /// The record kept in its group's `$extensions`.
    Untyped(Json),
}

/// The group a token is written in and its name there: `color-primary` is
/// `primary` in `color`.
pub fn path(name: &str) -> (&str, &str) {
    name.split_once('-').unwrap_or((name, name))
}

/// `{color.primary}`, the format's reference to a token.
pub fn alias(name: &str) -> String {
    let (group, rest) = path(name);
    format!("{{{group}.{rest}}}")
}

/// The token another is, where its whole value is a reference to it with no
/// fallback.
pub fn aliased<'a>(token: &'a Token, names: &Names) -> Option<&'a str> {
    let name = match &token.expr {
        Expr::Color(Color::Var(var)) if var.fallback.is_none() => &var.name,
        Expr::Easing(Easing::Var(var)) if var.fallback.is_none() => &var.name,
        Expr::Families(Families::Var(var)) if var.fallback.is_none() => &var.name,
        Expr::Filters(Filters::Var(var)) if var.fallback.is_none() => &var.name,
        Expr::Quantity(Quantity::Var(var)) if var.fallback.is_none() => &var.name,
        Expr::Shadow(Shadow::Var(var)) if var.fallback.is_none() => &var.name,
        Expr::Time(Time::Var(var)) if var.fallback.is_none() => &var.name,
        _ => return None,
    };
    names.token_of(name)
}

fn round(value: f64, places: i32) -> f64 {
    let scale = 10f64.powi(places);
    let rounded = (value * scale).round() / scale;
    if rounded == 0.0 {
        0.0
    } else {
        rounded
    }
}

/// A number as JSON, whole where it is whole: `400`, never `400.0`.
fn number(value: f64) -> Json {
    match value.to_string().parse::<i64>() {
        Ok(whole) => json!(whole),
        Err(_) => json!(value),
    }
}

fn numbers(values: &[f64]) -> Json {
    Json::Array(values.iter().map(|one| number(*one)).collect())
}

fn dimension(value: f64, unit: &str) -> Json {
    json!({ "value": number(value), "unit": unit })
}

/// A color as an sRGB color object, with the six-digit hex the format takes
/// as its fallback.
fn color(lab: &Lab) -> Json {
    let components = to_srgb(lab).map(|one| round(one, 4));
    let hex: String = to_hex(lab).chars().take(7).collect();
    let mut out = Map::new();
    out.insert("colorSpace".to_owned(), json!("srgb"));
    out.insert("components".to_owned(), numbers(&components));
    if lab.alpha < 1.0 {
        out.insert("alpha".to_owned(), number(round(lab.alpha, 4)));
    }
    out.insert("hex".to_owned(), json!(hex));
    Json::Object(out)
}

/// A length as a dimension, where it is all pixels or all rems.
fn length(value: &Length) -> Option<Json> {
    match (value.em, round(value.rem, 4), round(value.px, 2)) {
        (em, _, _) if em != 0.0 => None,
        (_, rem, 0.0) if rem != 0.0 => Some(dimension(rem, "rem")),
        (_, 0.0, px) => Some(dimension(px, "px")),
        _ => None,
    }
}

/// One shadow layer: its offsets, blur and spread in pixels, and its color.
fn drop(drop: &Drop) -> Option<Json> {
    let at = |index: usize| {
        dimension(
            round(drop.lengths.get(index).copied().unwrap_or(0.0), 2),
            "px",
        )
    };
    Some(json!({
        "color": color(drop.color.as_ref()?),
        "offsetX": at(0),
        "offsetY": at(1),
        "blur": at(2),
        "spread": at(3),
    }))
}

/// The format's type for `value` and its value, where it has one.
fn typed(token: &Token, value: &Value) -> Option<(&'static str, Json)> {
    Some(match value {
        Value::Color(lab) => ("color", color(lab)),
        Value::Curve(Curve::CubicBezier(points)) => ("cubicBezier", numbers(points)),
        Value::Families(families) => (
            "fontFamily",
            json!(families
                .iter()
                .map(|one| match one {
                    Family::Named(words) => words.join(" "),
                    Family::Quoted(name) => name.clone(),
                })
                .collect::<Vec<_>>()),
        ),
        Value::Length(value) => ("dimension", length(value)?),
        Value::Number(value) if token.name.starts_with("weight-") => ("fontWeight", number(*value)),
        Value::Number(value) => ("number", number(*value)),
        Value::Shadow(drops) => match drops.as_slice() {
            [] => (
                "shadow",
                json!({
                    "color": { "colorSpace": "srgb", "components": [0, 0, 0], "alpha": 0, "hex": "#000000" },
                    "offsetX": dimension(0.0, "px"),
                    "offsetY": dimension(0.0, "px"),
                    "blur": dimension(0.0, "px"),
                    "spread": dimension(0.0, "px"),
                }),
            ),
            [one] => ("shadow", drop(one)?),
            many => (
                "shadow",
                Json::Array(many.iter().map(drop).collect::<Option<_>>()?),
            ),
        },
        Value::Time(milliseconds) => ("duration", dimension(*milliseconds, "ms")),
        Value::Curve(Curve::Linear(_)) | Value::Filters(_) => return None,
    })
}

/// The token's own record in `$extensions`: its CSS, and a spring's physics.
fn extension(token: &Token) -> Json {
    let mut record = Map::new();
    record.insert("css".to_owned(), json!(token.css));
    if let Expr::Easing(Easing::Spring(spring)) = &token.expr {
        record.insert(
            "spring".to_owned(),
            json!({
                "damping": number(spring.damping),
                "mass": number(spring.mass),
                "stiffness": number(spring.stiffness),
            }),
        );
    }
    Json::Object(record)
}

/// `token` in `mode`, where `typed_alias` says whether the token another is
/// an alias of has a type the format writes.
///
/// # Errors
///
/// A sentence where the token cannot be evaluated in `mode`.
pub fn entry(
    registry: &Registry,
    token: &Token,
    mode: Mode,
    typed_alias: &dyn Fn(&str) -> Option<&'static str>,
    system: &System,
) -> Result<Entry, String> {
    let mut extensions = Map::new();
    extensions.insert(system.vendor.clone(), extension(token));
    let extensions = Json::Object(extensions);
    if let Some(target) = aliased(token, &system.names) {
        if let Some(kind) = typed_alias(target) {
            return Ok(Entry::Typed(json!({
                "$type": kind,
                "$value": alias(target),
                "$extensions": extensions,
            })));
        }
    }
    let value = registry.evaluate(token, mode)?;
    Ok(match typed(token, &value) {
        Some((kind, value)) => Entry::Typed(json!({
            "$type": kind,
            "$value": value,
            "$extensions": extensions,
        })),
        None => Entry::Untyped(extension(token)),
    })
}

/// The format's type for `token` in `mode`, following an alias to the token
/// it names, or none where the format has no type for it.
pub fn type_of(
    registry: &Registry,
    token: &Token,
    mode: Mode,
    names: &Names,
) -> Option<&'static str> {
    if let Some(target) = aliased(token, names) {
        let target = registry.tokens().iter().find(|one| one.name == target)?;
        return type_of(registry, target, mode, names);
    }
    let value = registry.evaluate(token, mode).ok()?;
    typed(token, &value).map(|(kind, _)| kind)
}
