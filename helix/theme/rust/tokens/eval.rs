//! Typed expressions evaluated in one mode to the values they hold there.
//!
//! **A reference is substituted the way CSS substitutes it.** A property that
//! is undeclared, or declared `initial`, is the guaranteed-invalid value; a
//! `var()` reading one takes its fallback, and with none the value holding it
//! is invalid too, up to the nearest fallback. Both arms of `light-dark()` are
//! read, because substitution happens before the mode picks one: an arm with an
//! invalid reference invalidates the whole value in either mode, as it does in
//! a browser and in `paint.mjs`.

use super::expr::{
    Channel, Color, Component, Easing, Expr, Families, Family, Filter, Filters, Kind, Math, Oklch,
    Op, Quantity, Shadow, Shaped, Time, Unit, Var, Weight,
};
use super::paint::{self, Lab, Polar};
use super::registry::{Declared, Registry};

/// The root font size a `rem` is, in points, at the default text size.
pub const REM: f64 = 16.0;

/// A color mode.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Mode {
    Dark,
    Light,
}

/// What a token holds in one mode.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Color(Lab),
    Curve(Curve),
    Families(Vec<Family>),
    Filters(Vec<Effect>),
    Length(Length),
    Number(f64),
    /// Each layer of a shadow, and none for `none`.
    Shadow(Vec<Drop>),
    /// A duration in milliseconds.
    Time(f64),
}

/// A length as ems, rems, and points, which only the element it lands on can
/// add.
///
/// **A rem stays a rem.** It is the root font size, which follows the reader's
/// text size on a phone as it follows the browser's font size on the web, so
/// only the theme drawing at that size can say how many points it is.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Length {
    pub em: f64,
    pub px: f64,
    pub rem: f64,
}

/// A timing function.
#[derive(Clone, Debug, PartialEq)]
pub enum Curve {
    CubicBezier([f64; 4]),
    Linear(Vec<f64>),
}

/// One filter function, evaluated.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Effect {
    /// A blur radius in points.
    Blur(f64),
    Saturate(f64),
}

/// One shadow layer: its lengths in points, and its color.
#[derive(Clone, Debug, PartialEq)]
pub struct Drop {
    pub lengths: Vec<f64>,
    pub color: Option<Lab>,
}

/// Why a value has no answer.
#[derive(Clone, Debug, PartialEq)]
pub enum Fault {
    /// The guaranteed-invalid value, which a fallback above may still catch.
    Invalid,
    /// A sentence saying what could not be evaluated.
    Refused(String),
}

/// A number, or a length, as `calc()` works with them.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Amount {
    Length(Length),
    Number(f64),
}

/// What a resolved reference is evaluated by: its value, and the names being
/// resolved around it.
type Each<'f, T, V> = &'f dyn Fn(&T, &[String]) -> Result<V, Fault>;

/// One mode's evaluation over a registry.
pub struct Evaluation<'r> {
    pub registry: &'r Registry,
    pub mode: Mode,
}

impl Evaluation<'_> {
    /// What `expr`, a token of `kind`, holds in this mode.
    ///
    /// # Errors
    ///
    /// [`Fault::Invalid`] where it is the guaranteed-invalid value, and
    /// [`Fault::Refused`] where a step of it cannot be evaluated.
    pub fn token(&self, expr: &Expr, kind: Kind) -> Result<Value, Fault> {
        let trail = Vec::new();
        Ok(match expr {
            Expr::Channels(_) => return Err(refused("a token is not a list of components")),
            Expr::Color(color) => Value::Color(self.color(color, &trail)?),
            Expr::Easing(easing) => Value::Curve(self.easing(easing, &trail)?),
            Expr::Families(families) => Value::Families(self.families(families, &trail)?),
            Expr::Filters(filters) => Value::Filters(self.filters(filters, &trail)?),
            Expr::Quantity(quantity) => match (self.quantity(quantity, &trail)?, kind) {
                (Amount::Length(length), _) => Value::Length(length),
                (Amount::Number(px), Kind::Length) => Value::Length(Length {
                    em: 0.0,
                    px,
                    rem: 0.0,
                }),
                (Amount::Number(number), _) => Value::Number(number),
            },
            Expr::Shadow(shadow) => Value::Shadow(self.shadow(shadow, &trail)?),
            Expr::Time(time) => Value::Time(self.time(time, &trail)?),
        })
    }

    /// A reference, resolved: the declaration it names where that is valid,
    /// and its fallback where it is not.
    fn through<T: Shaped, V>(
        &self,
        var: &Var<T>,
        trail: &[String],
        each: Each<'_, T, V>,
    ) -> Result<V, Fault> {
        let attempt = match self.registry.declared(&var.name, T::SHAPE) {
            Some(Declared::Typed(expr)) => {
                if trail.contains(&var.name) {
                    return Err(refused(format!("`{}` resolves through itself", var.name)));
                }
                let value = T::within(expr)
                    .ok_or_else(|| refused(format!("`{}` is read as another shape", var.name)))?;
                let mut deeper = trail.to_vec();
                deeper.push(var.name.clone());
                each(value, &deeper)
            }
            Some(Declared::Invalid) | None => Err(Fault::Invalid),
        };
        match (attempt, &var.fallback) {
            (Err(Fault::Invalid), Some(fallback)) => each(fallback, trail),
            (attempt, _) => attempt,
        }
    }

    fn color(&self, color: &Color, trail: &[String]) -> Result<Lab, Fault> {
        match color {
            Color::Hex(digits) => paint::from_hex(digits)
                .ok_or_else(|| refused(format!("`#{digits}` is not a hex color"))),
            Color::LightDark(light, dark) => {
                let light = self.color(light, trail)?;
                let dark = self.color(dark, trail)?;
                Ok(match self.mode {
                    Mode::Dark => dark,
                    Mode::Light => light,
                })
            }
            Color::Mix(mix) => {
                let first = self.color(&mix.first, trail)?;
                let second = self.color(&mix.second, trail)?;
                let weight = match mix.weight {
                    Weight::Even => 0.5,
                    Weight::First(percent) => percent / 100.0,
                    Weight::Second(percent) => 1.0 - percent / 100.0,
                };
                Ok(paint::mix(&first, weight, &second))
            }
            Color::Oklch(oklch) => self.oklch(oklch, trail),
            Color::Transparent => Ok(paint::TRANSPARENT),
            Color::Var(var) => self.through(var, trail, &|one, trail| self.color(one, trail)),
        }
    }

    fn oklch(&self, oklch: &Oklch, trail: &[String]) -> Result<Lab, Fault> {
        let origin = match &oklch.origin {
            Some(color) => Some(paint::origin(&self.color(color, trail)?)),
            None => None,
        };
        let mut values = Vec::new();
        for channel in &oklch.channels {
            values.extend(self.channel(channel, origin.as_ref(), trail)?);
        }
        let [l, c, h] = values[..] else {
            return Err(refused(format!(
                "an `oklch()` holds {} components once its references are read",
                values.len()
            )));
        };
        Ok(paint::to_lab(Polar {
            l,
            c,
            h,
            alpha: origin.map_or(1.0, |origin| origin.alpha),
        }))
    }

    fn channel(
        &self,
        channel: &Channel,
        origin: Option<&Polar>,
        trail: &[String],
    ) -> Result<Vec<f64>, Fault> {
        match channel {
            Channel::Calc(math) => match self.math(math, origin, trail)? {
                Amount::Number(number) => Ok(vec![number]),
                Amount::Length(_) => Err(refused("a component of `oklch()` is a length")),
            },
            Channel::Clamp(parts) => {
                let mut read = [0.0; 3];
                for (slot, part) in read.iter_mut().zip(parts.iter()) {
                    match self.math(part, origin, trail)? {
                        Amount::Number(number) => *slot = number,
                        Amount::Length(_) => {
                            return Err(refused("a component of `oklch()` is a length"));
                        }
                    }
                }
                let [low, value, high] = read;
                Ok(vec![value.min(high).max(low)])
            }
            Channel::Component(name) => Ok(vec![read(*name, origin)?]),
            Channel::Number(number) => Ok(vec![*number]),
            Channel::Var(var) => self.through(var, trail, &|channels, trail| {
                let mut values = Vec::new();
                for one in channels {
                    values.extend(self.channel(one, origin, trail)?);
                }
                Ok(values)
            }),
        }
    }

    fn math(&self, math: &Math, origin: Option<&Polar>, trail: &[String]) -> Result<Amount, Fault> {
        match math {
            Math::Binary(left, op, right) => combine(
                self.math(left, origin, trail)?,
                *op,
                self.math(right, origin, trail)?,
            ),
            Math::Component(name) => read(*name, origin).map(Amount::Number),
            Math::Length(value, unit) => Ok(Amount::Length(length(*value, *unit))),
            Math::Number(value) => Ok(Amount::Number(*value)),
            Math::Var(var) => self.through(var, trail, &|one, trail| self.quantity(one, trail)),
        }
    }

    fn quantity(&self, quantity: &Quantity, trail: &[String]) -> Result<Amount, Fault> {
        match quantity {
            Quantity::Calc(math) => self.math(math, None, trail),
            Quantity::Length(value, unit) => Ok(Amount::Length(length(*value, *unit))),
            Quantity::Number(value) => Ok(Amount::Number(*value)),
            Quantity::Round(value, step) => {
                rounded(self.quantity(value, trail)?, self.points(step, trail)?)
            }
            Quantity::Var(var) => self.through(var, trail, &|one, trail| self.quantity(one, trail)),
        }
    }

    /// A length with no ems in it, in points. A bare zero is one.
    ///
    /// **A rem here is 16 points.** A shadow and a blur are written as the CSS
    /// the renderer parses, so their lengths are points at the default text
    /// size, and none in the token layer is written in rems.
    fn points(&self, quantity: &Quantity, trail: &[String]) -> Result<f64, Fault> {
        match self.quantity(quantity, trail)? {
            Amount::Length(Length { em: 0.0, px, rem }) => Ok(px + rem * REM),
            Amount::Number(0.0) => Ok(0.0),
            _ => Err(refused("a shadow or a blur is a length in pixels")),
        }
    }

    fn time(&self, time: &Time, trail: &[String]) -> Result<f64, Fault> {
        match time {
            Time::Milliseconds(value) => Ok(*value),
            Time::Seconds(value) => Ok(value * 1000.0),
            Time::Var(var) => self.through(var, trail, &|one, trail| self.time(one, trail)),
        }
    }

    fn easing(&self, easing: &Easing, trail: &[String]) -> Result<Curve, Fault> {
        match easing {
            Easing::CubicBezier(points) => Ok(Curve::CubicBezier(*points)),
            Easing::Linear(stops) => Ok(Curve::Linear(stops.clone())),
            Easing::Spring(spring) => Ok(Curve::Linear(spring.stops.clone())),
            Easing::Var(var) => self.through(var, trail, &|one, trail| self.easing(one, trail)),
        }
    }

    fn shadow(&self, shadow: &Shadow, trail: &[String]) -> Result<Vec<Drop>, Fault> {
        match shadow {
            Shadow::Layers(layers) => layers
                .iter()
                .map(|layer| {
                    Ok(Drop {
                        lengths: layer
                            .lengths
                            .iter()
                            .map(|one| self.points(one, trail))
                            .collect::<Result<_, _>>()?,
                        color: match &layer.color {
                            Some(color) => Some(self.color(color, trail)?),
                            None => None,
                        },
                    })
                })
                .collect(),
            Shadow::None => Ok(Vec::new()),
            Shadow::Var(var) => self.through(var, trail, &|one, trail| self.shadow(one, trail)),
        }
    }

    fn filters(&self, filters: &Filters, trail: &[String]) -> Result<Vec<Effect>, Fault> {
        match filters {
            Filters::List(list) => list
                .iter()
                .map(|filter| match filter {
                    Filter::Blur(radius) => self.points(radius, trail).map(Effect::Blur),
                    Filter::Saturate(amount) => match self.quantity(amount, trail)? {
                        Amount::Number(number) => Ok(Effect::Saturate(number)),
                        Amount::Length(_) => Err(refused("`saturate()` takes a number")),
                    },
                })
                .collect(),
            Filters::Var(var) => self.through(var, trail, &|one, trail| self.filters(one, trail)),
        }
    }

    fn families(&self, families: &Families, trail: &[String]) -> Result<Vec<Family>, Fault> {
        match families {
            Families::List(list) => Ok(list.clone()),
            Families::Var(var) => self.through(var, trail, &|one, trail| self.families(one, trail)),
        }
    }
}

fn refused(why: impl Into<String>) -> Fault {
    Fault::Refused(why.into())
}

fn length(value: f64, unit: Unit) -> Length {
    let none = Length {
        em: 0.0,
        px: 0.0,
        rem: 0.0,
    };
    match unit {
        Unit::Em => Length { em: value, ..none },
        Unit::Px => Length { px: value, ..none },
        Unit::Rem => Length { rem: value, ..none },
    }
}

/// `value` rounded to the nearest multiple of `step` points.
///
/// **Rounded at the default text size, and a rem stays a rem.** Only the theme
/// drawing at the reader's text size knows how many points a rem is, so this
/// lands on a whole multiple at the default size and scales with the text from
/// there.
fn rounded(value: Amount, step: f64) -> Result<Amount, Fault> {
    let Amount::Length(Length { em: 0.0, px, rem }) = value else {
        return Err(refused("`round()` takes a length with no ems in it"));
    };
    if step <= 0.0 {
        return Err(refused("`round()` takes a step above zero"));
    }
    let points = ((px + rem * REM) / step).round() * step;
    Ok(Amount::Length(if rem == 0.0 {
        length(points, Unit::Px)
    } else {
        length(points / REM, Unit::Rem)
    }))
}

/// The origin's component a relative color names.
fn read(name: Component, origin: Option<&Polar>) -> Result<f64, Fault> {
    let origin = origin.ok_or_else(|| refused("a component is read outside a relative color"))?;
    Ok(match name {
        Component::Chroma => origin.c,
        Component::Hue => origin.h,
        Component::Lightness => origin.l,
    })
}

/// One `calc()` operation, refusing what mixes a number and a length.
fn combine(left: Amount, op: Op, right: Amount) -> Result<Amount, Fault> {
    let scaled = |by: f64, length: Length, op: Op| {
        Amount::Length(match op {
            Op::Divide => Length {
                em: length.em / by,
                px: length.px / by,
                rem: length.rem / by,
            },
            _ => Length {
                em: length.em * by,
                px: length.px * by,
                rem: length.rem * by,
            },
        })
    };
    Ok(match (left, op, right) {
        (Amount::Number(one), _, Amount::Number(other)) => Amount::Number(match op {
            Op::Add => one + other,
            Op::Divide => one / other,
            Op::Multiply => one * other,
            Op::Subtract => one - other,
        }),
        (Amount::Length(one), Op::Add | Op::Subtract, Amount::Length(other)) => {
            let sign = if op == Op::Add { 1.0 } else { -1.0 };
            Amount::Length(Length {
                em: one.em + sign * other.em,
                px: one.px + sign * other.px,
                rem: one.rem + sign * other.rem,
            })
        }
        (Amount::Length(length), Op::Multiply | Op::Divide, Amount::Number(by)) => {
            scaled(by, length, op)
        }
        (Amount::Number(by), Op::Multiply, Amount::Length(length)) => scaled(by, length, op),
        _ => return Err(refused("a `calc()` mixes a number and a length")),
    })
}
