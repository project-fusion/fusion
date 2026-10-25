//! The colors a token writes: hex, `transparent`, `light-dark()`,
//! `color-mix()` in oklab, and absolute or relative `oklch()`, with the
//! `calc()` their components take.

use std::slice::from_ref;

use super::super::expr::{Channel, Color, Math, Mix, Oklch, Op, Weight};
use super::super::syntax::{self, commas, words, Node};
use super::{component, is_hex, length_unit, single, Reader};

impl Reader<'_> {
    pub(super) fn color(&mut self, nodes: &[Node]) -> Result<Color, String> {
        let not = || format!("`{}` is not a color", syntax::source(nodes));
        match single(nodes).map_err(|()| not())? {
            Node::Hash(digits) if is_hex(&digits) => Ok(Color::Hex(digits)),
            Node::Ident(name) if name == "transparent" => Ok(Color::Transparent),
            Node::Function(name, arguments) => match name.as_str() {
                "color-mix" => self.mix(&arguments).map(|mix| Color::Mix(Box::new(mix))),
                "light-dark" => match commas(&arguments).as_slice() {
                    [light, dark] => Ok(Color::LightDark(
                        Box::new(self.color(light)?),
                        Box::new(self.color(dark)?),
                    )),
                    _ => Err(format!(
                        "`{}` does not hold two colors",
                        syntax::source(nodes)
                    )),
                },
                "oklch" => self
                    .oklch(&arguments)
                    .map(|oklch| Color::Oklch(Box::new(oklch))),
                "var" => self.var(&arguments, Self::color).map(Color::Var),
                _ => Err(not()),
            },
            _ => Err(not()),
        }
    }

    fn mix(&mut self, arguments: &[Node]) -> Result<Mix, String> {
        let source = || syntax::source(arguments);
        let parts = commas(arguments);
        let [space, first, second] = parts.as_slice() else {
            return Err(format!("`color-mix({})` does not mix two colors", source()));
        };
        if words(space) != [Node::Ident("in".into()), Node::Ident("oklab".into())] {
            return Err(format!(
                "`color-mix({})` mixes in a space other than oklab, which is not typed",
                source()
            ));
        }
        let (first, one) = self.operand(first)?;
        let (second, other) = self.operand(second)?;
        let weight = match (one, other) {
            (None, None) => Weight::Even,
            (Some(percent), None) => Weight::First(percent),
            (None, Some(percent)) => Weight::Second(percent),
            (Some(_), Some(_)) => {
                return Err(format!(
                    "`color-mix({})` states both percentages, which is not typed",
                    source()
                ));
            }
        };
        Ok(Mix {
            first,
            second,
            weight,
        })
    }

    /// One side of a mix: a color, and the percentage written after it.
    fn operand(&mut self, nodes: &[Node]) -> Result<(Color, Option<f64>), String> {
        match words(nodes).as_slice() {
            [color, Node::Percentage(percent)] => {
                Ok((self.color(from_ref(color))?, Some(*percent)))
            }
            [color] => Ok((self.color(from_ref(color))?, None)),
            _ => Err(format!(
                "`{}` is not a color and a percentage",
                syntax::source(nodes)
            )),
        }
    }

    fn oklch(&mut self, arguments: &[Node]) -> Result<Oklch, String> {
        let source = || syntax::source(arguments);
        if arguments
            .iter()
            .any(|node| matches!(node, Node::Operator('/') | Node::Comma))
        {
            return Err(format!(
                "`oklch({})` states an alpha or separates with commas, which is not typed",
                source()
            ));
        }
        let list = words(arguments);
        let (origin, rest) = match list.as_slice() {
            [Node::Ident(from), origin, rest @ ..] if from == "from" => {
                (Some(self.color(from_ref(origin))?), rest)
            }
            rest => (None, rest),
        };
        let relative = origin.is_some();
        let channels = rest
            .iter()
            .map(|node| self.channel(node, relative))
            .collect::<Result<Vec<_>, _>>()?;
        let spread = channels.iter().any(|one| matches!(one, Channel::Var(_)));
        if !spread && channels.len() != 3 {
            return Err(format!(
                "`oklch({})` does not have three components",
                source()
            ));
        }
        Ok(Oklch { origin, channels })
    }

    fn channel(&mut self, node: &Node, relative: bool) -> Result<Channel, String> {
        match node {
            Node::Number(value) => Ok(Channel::Number(*value)),
            Node::Ident(name) if relative => component(name)
                .map(Channel::Component)
                .ok_or_else(|| format!("`{name}` is not a component of the origin")),
            Node::Function(name, arguments) if name == "calc" => {
                self.calc(arguments, relative).map(Channel::Calc)
            }
            Node::Function(name, arguments) if name == "clamp" => {
                let parts = commas(arguments);
                let [low, value, high] = parts.as_slice() else {
                    return Err(format!(
                        "`{}` does not hold a minimum, a value and a maximum",
                        syntax::source(from_ref(node))
                    ));
                };
                Ok(Channel::Clamp(Box::new([
                    self.calc(low, relative)?,
                    self.calc(value, relative)?,
                    self.calc(high, relative)?,
                ])))
            }
            Node::Function(name, arguments) if name == "var" => {
                self.var(arguments, Self::channels).map(Channel::Var)
            }
            other => Err(format!(
                "`{}` is not a component of `oklch()` this reads",
                syntax::source(from_ref(other))
            )),
        }
    }

    /// Components spread into `oklch()` through a reference. The origin's own
    /// are admitted, and evaluation refuses one that lands outside a relative
    /// color.
    pub(super) fn channels(&mut self, nodes: &[Node]) -> Result<Vec<Channel>, String> {
        words(nodes)
            .iter()
            .map(|node| self.channel(node, true))
            .collect()
    }

    pub(super) fn calc(&mut self, arguments: &[Node], components: bool) -> Result<Math, String> {
        let list = words(arguments);
        let mut at = 0;
        let math = self.sum(&list, &mut at, components)?;
        if at == list.len() {
            Ok(math)
        } else {
            Err(format!(
                "`calc({})` is not arithmetic this reads",
                syntax::source(arguments)
            ))
        }
    }

    fn sum(&mut self, list: &[Node], at: &mut usize, components: bool) -> Result<Math, String> {
        let mut left = self.product(list, at, components)?;
        while let Some(Node::Operator(operator @ ('+' | '-'))) = list.get(*at) {
            *at += 1;
            let op = if *operator == '+' {
                Op::Add
            } else {
                Op::Subtract
            };
            let right = self.product(list, at, components)?;
            left = Math::Binary(Box::new(left), op, Box::new(right));
        }
        Ok(left)
    }

    fn product(&mut self, list: &[Node], at: &mut usize, components: bool) -> Result<Math, String> {
        let mut left = self.leaf(list, at, components)?;
        while let Some(Node::Operator(operator @ ('*' | '/'))) = list.get(*at) {
            *at += 1;
            let op = if *operator == '*' {
                Op::Multiply
            } else {
                Op::Divide
            };
            let right = self.leaf(list, at, components)?;
            left = Math::Binary(Box::new(left), op, Box::new(right));
        }
        Ok(left)
    }

    fn leaf(&mut self, list: &[Node], at: &mut usize, components: bool) -> Result<Math, String> {
        let node = list
            .get(*at)
            .ok_or_else(|| "`calc()` ends where it expects a value".to_owned())?;
        *at += 1;
        match node {
            Node::Number(value) => Ok(Math::Number(*value)),
            Node::Dimension(value, unit) => length_unit(unit)
                .map(|unit| Math::Length(*value, unit))
                .ok_or_else(|| format!("`{unit}` is not a length unit `calc()` reads")),
            Node::Ident(name) if components => component(name)
                .map(Math::Component)
                .ok_or_else(|| format!("`{name}` is not a component of the origin")),
            Node::Function(name, arguments) if name == "var" => {
                self.var(arguments, Self::quantity).map(Math::Var)
            }
            Node::Function(name, arguments) if name.is_empty() => self.calc(arguments, components),
            other => Err(format!(
                "`{}` is not a value `calc()` reads",
                syntax::source(from_ref(other))
            )),
        }
    }
}
