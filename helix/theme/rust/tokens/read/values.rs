//! The shapes other than color: numbers and lengths, durations, timing
//! functions, shadows, filters and font families.

use std::slice::from_ref;

use super::super::expr::{
    Easing, Families, Family, Filter, Filters, Layer, Quantity, Shadow, Time,
};
use super::super::syntax::{self, commas, words, Node};
use super::{colorful, length_unit, numbers, single, Reader};

impl Reader<'_> {
    pub(super) fn quantity(&mut self, nodes: &[Node]) -> Result<Quantity, String> {
        let not = || format!("`{}` is not a number or a length", syntax::source(nodes));
        match single(nodes).map_err(|()| not())? {
            Node::Number(value) => Ok(Quantity::Number(value)),
            Node::Dimension(value, unit) => length_unit(&unit)
                .map(|unit| Quantity::Length(value, unit))
                .ok_or_else(not),
            Node::Function(name, arguments) if name == "calc" => {
                self.calc(&arguments, false).map(Quantity::Calc)
            }
            Node::Function(name, arguments) if name == "round" => match commas(&arguments)[..] {
                [ref value, ref step] => Ok(Quantity::Round(
                    Box::new(self.quantity(value)?),
                    Box::new(self.quantity(step)?),
                )),
                _ => Err(not()),
            },
            Node::Function(name, arguments) if name == "var" => {
                self.var(&arguments, Self::quantity).map(Quantity::Var)
            }
            _ => Err(not()),
        }
    }

    pub(super) fn time(&mut self, nodes: &[Node]) -> Result<Time, String> {
        let not = || format!("`{}` is not a duration", syntax::source(nodes));
        match single(nodes).map_err(|()| not())? {
            Node::Dimension(value, unit) if unit == "ms" => Ok(Time::Milliseconds(value)),
            Node::Dimension(value, unit) if unit == "s" => Ok(Time::Seconds(value)),
            Node::Function(name, arguments) if name == "var" => {
                self.var(&arguments, Self::time).map(Time::Var)
            }
            _ => Err(not()),
        }
    }

    pub(super) fn easing(&mut self, nodes: &[Node]) -> Result<Easing, String> {
        let not = || format!("`{}` is not a timing function", syntax::source(nodes));
        match single(nodes).map_err(|()| not())? {
            Node::Function(name, arguments) => match name.as_str() {
                "cubic-bezier" => numbers(&arguments)?
                    .try_into()
                    .map(Easing::CubicBezier)
                    .map_err(|_| format!("`{}` does not have four numbers", syntax::source(nodes))),
                "linear" => numbers(&arguments).map(Easing::Linear),
                "var" => self.var(&arguments, Self::easing).map(Easing::Var),
                _ => Err(not()),
            },
            _ => Err(not()),
        }
    }

    /// A shadow's list of layers. **A layer ends in its color**, which is how
    /// every shadow here is written, so a `var()` closing a layer of three or
    /// more words is read as the color: a blur or a spread written through one
    /// is refused where its declaration fails to read as a color.
    pub(super) fn shadow(&mut self, nodes: &[Node]) -> Result<Shadow, String> {
        match nodes {
            [Node::Ident(none)] if none == "none" => Ok(Shadow::None),
            [Node::Function(name, arguments)] if name == "var" => {
                self.var(arguments, Self::shadow).map(Shadow::Var)
            }
            _ => commas(nodes)
                .iter()
                .map(|layer| self.layer(layer))
                .collect::<Result<_, _>>()
                .map(Shadow::Layers),
        }
    }

    fn layer(&mut self, nodes: &[Node]) -> Result<Layer, String> {
        let written = words(nodes);
        let (lengths, color) = match written.split_last() {
            Some((tail, rest)) if rest.len() >= 2 && colorful(tail) => {
                (rest, Some(self.color(from_ref(tail))?))
            }
            _ => (written.as_slice(), None),
        };
        if !(2..=4).contains(&lengths.len()) {
            return Err(format!(
                "`{}` is not two to four lengths and a color",
                syntax::source(nodes)
            ));
        }
        let lengths = lengths
            .iter()
            .map(|node| self.quantity(from_ref(node)))
            .collect::<Result<_, _>>()?;
        Ok(Layer { lengths, color })
    }

    pub(super) fn filters(&mut self, nodes: &[Node]) -> Result<Filters, String> {
        if let [Node::Function(name, arguments)] = nodes {
            if name == "var" {
                return self.var(arguments, Self::filters).map(Filters::Var);
            }
        }
        words(nodes)
            .iter()
            .map(|node| match node {
                Node::Function(name, arguments) if name == "blur" => {
                    self.quantity(arguments).map(Filter::Blur)
                }
                Node::Function(name, arguments) if name == "saturate" => {
                    self.quantity(arguments).map(Filter::Saturate)
                }
                other => Err(format!(
                    "`{}` is not a filter this reads",
                    syntax::source(from_ref(other))
                )),
            })
            .collect::<Result<_, _>>()
            .map(Filters::List)
    }

    pub(super) fn families(&mut self, nodes: &[Node]) -> Result<Families, String> {
        if let [Node::Function(name, arguments)] = nodes {
            if name == "var" {
                return self.var(arguments, Self::families).map(Families::Var);
            }
        }
        commas(nodes)
            .iter()
            .map(|family| match words(family).as_slice() {
                [Node::Quoted(name)] => Ok(Family::Quoted(name.clone())),
                names if !names.is_empty() => names
                    .iter()
                    .map(|name| match name {
                        Node::Ident(name) => Ok(name.clone()),
                        _ => Err(format!("`{}` is not a family name", syntax::source(family))),
                    })
                    .collect::<Result<_, _>>()
                    .map(Family::Named),
                _ => Err("a family list holds an empty entry".to_owned()),
            })
            .collect::<Result<_, _>>()
            .map(Families::List)
    }
}
