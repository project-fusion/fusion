//! Builder calls read into typed expressions, in the shape a reader asks for.
//!
//! **Each builder is read by its name and nothing else.** A call the shape does
//! not take, such as `ms()` where a length belongs or `rem2()` anywhere, is
//! refused with a sentence quoting it, so a value that type-checks in
//! `tokens.ts` and a value this reads are the same set.

use super::super::builder::print::DENSITY;
use super::super::builder::Built;
use super::super::expr::{
    Channel, Color, Easing, Expr, Families, Family, Filter, Filters, Layer, Math, Mix, Oklch, Op,
    Quantity, Shadow, Shape, Shaped, Spring, Time, Unit, Var, Weight,
};
use super::{component, is_hex, Reader};

/// A builder value's arguments, where it is a call to `name`.
fn arguments<'b>(built: &'b Built, name: &str) -> Option<&'b [Built]> {
    match built {
        Built::Call(called, arguments) if called == name => Some(arguments),
        _ => None,
    }
}

fn number(built: &Built) -> Result<f64, String> {
    match built {
        Built::Number(value) => Ok(*value),
        other => Err(format!("`{other}` is not a number")),
    }
}

fn numbers(values: &[Built]) -> Result<Vec<f64>, String> {
    values.iter().map(number).collect()
}

fn unit(name: &str) -> Option<Unit> {
    match name {
        "em" => Some(Unit::Em),
        "px" => Some(Unit::Px),
        "rem" => Some(Unit::Rem),
        _ => None,
    }
}

fn op(name: &str) -> Option<Op> {
    match name {
        "divide" => Some(Op::Divide),
        "minus" => Some(Op::Subtract),
        "plus" => Some(Op::Add),
        "times" => Some(Op::Multiply),
        _ => None,
    }
}

/// `rem(2.5)` and its kind, as a number and a unit.
fn length(built: &Built) -> Option<Result<(f64, Unit), String>> {
    let Built::Call(name, arguments) = built else {
        return None;
    };
    let unit = unit(name)?;
    Some(match arguments.as_slice() {
        [Built::Number(value)] => Ok((*value, unit)),
        _ => Err(format!("`{built}` does not hold one number")),
    })
}

impl Reader<'_> {
    /// Reads the builder value `built` as `shape`. A refused value leaves no
    /// references behind.
    ///
    /// # Errors
    ///
    /// A sentence saying what in `built` the shape does not admit.
    pub fn read_built(&mut self, built: &Built, shape: Shape) -> Result<Expr, String> {
        let mark = self.references.len();
        let read = match shape {
            Shape::Channels => Err(format!(
                "`{built}` is a token, and a token is not a list of components"
            )),
            Shape::Color => self.built_color(built).map(Expr::Color),
            Shape::Easing => self.built_easing(built).map(Expr::Easing),
            Shape::Families => self.built_families(built).map(Expr::Families),
            Shape::Filters => self.built_filters(built).map(Expr::Filters),
            Shape::Quantity => self.built_quantity(built).map(Expr::Quantity),
            Shape::Shadow => self.built_shadow(built).map(Expr::Shadow),
            Shape::Time => self.built_time(built).map(Expr::Time),
        };
        if read.is_err() {
            self.references.truncate(mark);
        }
        read
    }

    /// `ref('name')`, `primitive('name')` or `density`, each with a fallback
    /// read by `fallback` where one is given, or none where `built` is not a
    /// reference.
    fn named<T: Shaped>(
        &mut self,
        built: &Built,
        fallback: impl FnOnce(&mut Self, &Built) -> Result<T, String>,
    ) -> Option<Result<Var<T>, String>> {
        let (prefix, arguments) = match built {
            Built::Name(name) if name == "density" => {
                return Some(self.reference(DENSITY.to_owned(), None));
            }
            Built::Call(name, arguments) if name == "ref" => ("--helix-", arguments),
            Built::Call(name, arguments) if name == "primitive" => ("--_helix-", arguments),
            _ => return None,
        };
        Some(match arguments.as_slice() {
            [Built::Text(name)] => self.reference(format!("{prefix}{name}"), None),
            [Built::Text(name), other] => match fallback(self, other) {
                Ok(read) => self.reference(format!("{prefix}{name}"), Some(read)),
                Err(why) => Err(why),
            },
            _ => Err(format!(
                "`{built}` does not name a property and at most one fallback"
            )),
        })
    }

    pub(super) fn built_color(&mut self, built: &Built) -> Result<Color, String> {
        if let Some(var) = self.named(built, Self::built_color) {
            return var.map(Color::Var);
        }
        let not = || format!("`{built}` is not a color");
        let Built::Call(name, arguments) = built else {
            return match built {
                Built::Name(name) if name == "transparent" => Ok(Color::Transparent),
                _ => Err(not()),
            };
        };
        match (name.as_str(), arguments.as_slice()) {
            ("hex", [Built::Text(digits)]) if is_hex(digits) => Ok(Color::Hex(digits.clone())),
            ("lightDark", [light, dark]) => Ok(Color::LightDark(
                Box::new(self.built_color(light)?),
                Box::new(self.built_color(dark)?),
            )),
            ("alpha", [first, Built::Number(percent)]) => self.built_mix(
                first,
                &Built::Name("transparent".to_owned()),
                Weight::First(*percent),
            ),
            ("mix", [first, Built::Number(percent), second]) => {
                self.built_mix(first, second, Weight::First(*percent))
            }
            ("mix", [first, second, Built::Number(percent)]) => {
                self.built_mix(first, second, Weight::Second(*percent))
            }
            ("mix", [first, second]) => self.built_mix(first, second, Weight::Even),
            ("relative", [origin, channels @ ..]) if channels.len() == 3 => {
                let origin = Some(self.built_color(origin)?);
                self.built_oklch(origin, channels)
            }
            ("oklch", channels) if channels.len() == 3 => self.built_oklch(None, channels),
            _ => Err(not()),
        }
    }

    fn built_mix(
        &mut self,
        first: &Built,
        second: &Built,
        weight: Weight,
    ) -> Result<Color, String> {
        Ok(Color::Mix(Box::new(Mix {
            first: self.built_color(first)?,
            second: self.built_color(second)?,
            weight,
        })))
    }

    fn built_oklch(&mut self, origin: Option<Color>, channels: &[Built]) -> Result<Color, String> {
        let relative = origin.is_some();
        let channels = channels
            .iter()
            .map(|one| self.built_channel(one, relative))
            .collect::<Result<_, _>>()?;
        Ok(Color::Oklch(Box::new(Oklch { origin, channels })))
    }

    fn built_channel(&mut self, built: &Built, relative: bool) -> Result<Channel, String> {
        if let Some(var) = self.named(built, |reader, fallback| match fallback {
            Built::List(items) => items
                .iter()
                .map(|one| reader.built_channel(one, true))
                .collect(),
            other => Err(format!("`{other}` is not a list of components")),
        }) {
            return var.map(Channel::Var);
        }
        match built {
            Built::Number(value) => Ok(Channel::Number(*value)),
            Built::Name(name) if relative => built_component(name).map(Channel::Component),
            Built::Call(name, parts) if name == "clamp" => match parts.as_slice() {
                [low, value, high] => Ok(Channel::Clamp(Box::new([
                    self.built_math(low, relative)?,
                    self.built_math(value, relative)?,
                    self.built_math(high, relative)?,
                ]))),
                _ => Err(format!(
                    "`{built}` does not hold a minimum, a value and a maximum"
                )),
            },
            Built::Call(name, _) if op(name).is_some() => {
                self.built_math(built, relative).map(Channel::Calc)
            }
            other => Err(format!("`{other}` is not a component of a color")),
        }
    }

    fn built_math(&mut self, built: &Built, components: bool) -> Result<Math, String> {
        if let Some(var) = self.named(built, Self::built_quantity) {
            return var.map(Math::Var);
        }
        if let Some(read) = length(built) {
            return read.map(|(value, unit)| Math::Length(value, unit));
        }
        let not = || format!("`{built}` is not a number or a length");
        match built {
            Built::Number(value) => Ok(Math::Number(*value)),
            Built::Name(name) if components => built_component(name).map(Math::Component),
            Built::Call(name, arguments) => match (op(name), arguments.as_slice()) {
                (Some(op), [left, right]) => Ok(Math::Binary(
                    Box::new(self.built_math(left, components)?),
                    op,
                    Box::new(self.built_math(right, components)?),
                )),
                (Some(_), _) => Err(format!("`{built}` does not hold two operands")),
                (None, _) => Err(not()),
            },
            _ => Err(not()),
        }
    }

    pub(super) fn built_quantity(&mut self, built: &Built) -> Result<Quantity, String> {
        if let Some(var) = self.named(built, Self::built_quantity) {
            return var.map(Quantity::Var);
        }
        if let Some(read) = length(built) {
            return read.map(|(value, unit)| Quantity::Length(value, unit));
        }
        match built {
            Built::Number(value) => Ok(Quantity::Number(*value)),
            Built::Call(name, _) if op(name).is_some() => {
                self.built_math(built, false).map(Quantity::Calc)
            }
            Built::Call(name, arguments) if name == "round" => match arguments.as_slice() {
                [value, step] => Ok(Quantity::Round(
                    Box::new(self.built_quantity(value)?),
                    Box::new(self.built_quantity(step)?),
                )),
                _ => Err(format!("`{built}` does not hold a value and a step")),
            },
            other => Err(format!("`{other}` is not a number or a length")),
        }
    }

    pub(super) fn built_time(&mut self, built: &Built) -> Result<Time, String> {
        if let Some(var) = self.named(built, Self::built_time) {
            return var.map(Time::Var);
        }
        match built {
            Built::Call(name, arguments) if name == "ms" || name == "s" => {
                let [value] = arguments.as_slice() else {
                    return Err(format!("`{built}` does not hold one number"));
                };
                let value = number(value)?;
                Ok(if name == "ms" {
                    Time::Milliseconds(value)
                } else {
                    Time::Seconds(value)
                })
            }
            other => Err(format!("`{other}` is not a duration")),
        }
    }

    pub(super) fn built_easing(&mut self, built: &Built) -> Result<Easing, String> {
        if let Some(var) = self.named(built, Self::built_easing) {
            return var.map(Easing::Var);
        }
        if let Some(points) = arguments(built, "cubicBezier") {
            return numbers(points)?
                .try_into()
                .map(Easing::CubicBezier)
                .map_err(|_| format!("`{built}` does not hold four numbers"));
        }
        if let Some(stops) = arguments(built, "linear") {
            return numbers(stops).map(Easing::Linear);
        }
        match arguments(built, "spring") {
            Some([Built::Object(physics), curve]) => {
                let stops = arguments(curve, "linear").ok_or_else(|| {
                    format!("`{curve}` is not the `linear()` curve a spring draws")
                })?;
                let field = |key: &str| {
                    physics
                        .iter()
                        .find(|(name, _)| name == key)
                        .ok_or_else(|| format!("`{built}` gives no {key}"))
                        .and_then(|(_, value)| number(value))
                };
                Ok(Easing::Spring(Box::new(Spring {
                    damping: field("damping")?,
                    mass: field("mass")?,
                    stiffness: field("stiffness")?,
                    stops: numbers(stops)?,
                })))
            }
            _ => Err(format!("`{built}` is not a timing function")),
        }
    }

    pub(super) fn built_shadow(&mut self, built: &Built) -> Result<Shadow, String> {
        if let Some(var) = self.named(built, Self::built_shadow) {
            return var.map(Shadow::Var);
        }
        if let Some(layers) = arguments(built, "shadows") {
            return layers
                .iter()
                .map(|one| self.built_layer(one))
                .collect::<Result<_, _>>()
                .map(Shadow::Layers);
        }
        match built {
            Built::Name(name) if name == "none" => Ok(Shadow::None),
            _ => self.built_layer(built).map(|one| Shadow::Layers(vec![one])),
        }
    }

    fn built_layer(&mut self, built: &Built) -> Result<Layer, String> {
        let (lengths, color) = match arguments(built, "shadow") {
            Some([Built::List(lengths)]) => (lengths, None),
            Some([Built::List(lengths), color]) => (lengths, Some(self.built_color(color)?)),
            _ => return Err(format!("`{built}` is not a shadow")),
        };
        if !(2..=4).contains(&lengths.len()) {
            return Err(format!("`{built}` does not hold two to four lengths"));
        }
        let lengths = lengths
            .iter()
            .map(|one| self.built_quantity(one))
            .collect::<Result<_, _>>()?;
        Ok(Layer { lengths, color })
    }

    pub(super) fn built_filters(&mut self, built: &Built) -> Result<Filters, String> {
        if let Some(var) = self.named(built, Self::built_filters) {
            return var.map(Filters::Var);
        }
        match arguments(built, "filters") {
            Some(list) => list
                .iter()
                .map(|one| self.built_filter(one))
                .collect::<Result<_, _>>()
                .map(Filters::List),
            None => self.built_filter(built).map(|one| Filters::List(vec![one])),
        }
    }

    fn built_filter(&mut self, built: &Built) -> Result<Filter, String> {
        match built {
            Built::Call(name, arguments) if name == "blur" || name == "saturate" => {
                let [amount] = arguments.as_slice() else {
                    return Err(format!("`{built}` does not hold one value"));
                };
                let amount = self.built_quantity(amount)?;
                Ok(if name == "blur" {
                    Filter::Blur(amount)
                } else {
                    Filter::Saturate(amount)
                })
            }
            other => Err(format!("`{other}` is not a filter")),
        }
    }

    pub(super) fn built_families(&mut self, built: &Built) -> Result<Families, String> {
        if let Some(var) = self.named(built, Self::built_families) {
            return var.map(Families::Var);
        }
        let names = arguments(built, "families")
            .ok_or_else(|| format!("`{built}` is not a family list"))?;
        names
            .iter()
            .map(|one| match one {
                Built::Text(name) if !name.trim().is_empty() => Ok(Family::Named(
                    name.split_whitespace().map(str::to_owned).collect(),
                )),
                _ => match arguments(one, "quoted") {
                    Some([Built::Text(name)]) => Ok(Family::Quoted(name.clone())),
                    _ => Err(format!("`{one}` is not a family name")),
                },
            })
            .collect::<Result<_, _>>()
            .map(Families::List)
    }
}

fn built_component(name: &str) -> Result<super::super::expr::Component, String> {
    let letter = match name {
        "chroma" => "c",
        "hue" => "h",
        "lightness" => "l",
        _ => "",
    };
    component(letter).ok_or_else(|| format!("`{name}` is not a component of the origin"))
}
