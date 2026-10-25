//! Component values read into typed expressions, in the shape a reader asks
//! for, refusing with a sentence anything that shape does not admit.

mod built;
mod color;
mod values;

use super::expr::{Component, Expr, Shape, Shaped, Unit, Var};
use super::syntax::{self, commas, words, Node};

/// Reads values, and keeps each reference it met with the shape it read it
/// as, so the declaration it names can be read as that shape in turn.
pub struct Reader<'a> {
    declared: &'a dyn Fn(&str) -> bool,
    /// Each reference read, by name and shape.
    pub references: Vec<(String, Shape)>,
}

impl<'a> Reader<'a> {
    /// A reader that knows which custom properties are declared, so a
    /// reference to one that is not, with no fallback, is refused.
    pub fn new(declared: &'a dyn Fn(&str) -> bool) -> Self {
        Self {
            declared,
            references: Vec::new(),
        }
    }

    /// Reads `text` as `shape`. A refused value leaves no references behind.
    ///
    /// # Errors
    ///
    /// A sentence saying what in `text` the shape does not admit.
    pub fn read(&mut self, text: &str, shape: Shape) -> Result<Expr, String> {
        let nodes = syntax::parse(text)?;
        let mark = self.references.len();
        let read = self.shape(&nodes, shape);
        if read.is_err() {
            self.references.truncate(mark);
        }
        read
    }

    fn shape(&mut self, nodes: &[Node], shape: Shape) -> Result<Expr, String> {
        match shape {
            Shape::Channels => self.channels(nodes).map(Expr::Channels),
            Shape::Color => self.color(nodes).map(Expr::Color),
            Shape::Easing => self.easing(nodes).map(Expr::Easing),
            Shape::Families => self.families(nodes).map(Expr::Families),
            Shape::Filters => self.filters(nodes).map(Expr::Filters),
            Shape::Quantity => self.quantity(nodes).map(Expr::Quantity),
            Shape::Shadow => self.shadow(nodes).map(Expr::Shadow),
            Shape::Time => self.time(nodes).map(Expr::Time),
        }
    }

    /// `var(--name)` or `var(--name, <fallback>)`, the fallback read by
    /// `fallback` as the same shape.
    fn var<T: Shaped>(
        &mut self,
        arguments: &[Node],
        fallback: impl FnOnce(&mut Self, &[Node]) -> Result<T, String>,
    ) -> Result<Var<T>, String> {
        let comma = arguments.iter().position(|node| *node == Node::Comma);
        let head = comma.map_or(arguments, |at| &arguments[..at]);
        let Ok(Node::Ident(name)) = single(&words(head)) else {
            return Err(format!(
                "`var({})` does not name a custom property",
                syntax::source(arguments)
            ));
        };
        if !name.starts_with("--") {
            return Err(format!("`var({name})` does not name a custom property"));
        }
        let fallback = match comma {
            Some(at) => Some(fallback(self, trim(&arguments[at + 1..]))?),
            None => None,
        };
        self.reference(name, fallback)
    }

    /// A reference to `name`, kept so its declaration is read as `T` in turn.
    /// One with no fallback has to name a property that is declared.
    fn reference<T: Shaped>(
        &mut self,
        name: String,
        fallback: Option<T>,
    ) -> Result<Var<T>, String> {
        if fallback.is_none() && !(self.declared)(&name) {
            return Err(format!("`{name}` is declared nowhere and has no fallback"));
        }
        self.references.push((name.clone(), T::SHAPE));
        Ok(Var {
            name,
            fallback: fallback.map(Box::new),
        })
    }
}

/// The one component value in `nodes`.
fn single(nodes: &[Node]) -> Result<Node, ()> {
    match nodes {
        [node] => Ok(node.clone()),
        _ => Err(()),
    }
}

/// `nodes` without whitespace at either end.
fn trim(nodes: &[Node]) -> &[Node] {
    let start = nodes.iter().position(|node| *node != Node::Space);
    let end = nodes.iter().rposition(|node| *node != Node::Space);
    match (start, end) {
        (Some(start), Some(end)) => &nodes[start..=end],
        _ => &[],
    }
}

/// Comma-separated numbers, as `cubic-bezier()` and `linear()` take them.
fn numbers(arguments: &[Node]) -> Result<Vec<f64>, String> {
    commas(arguments)
        .iter()
        .map(|part| match part.as_slice() {
            [Node::Number(value)] => Ok(*value),
            _ => Err(format!(
                "`{}` is not a number this reads",
                syntax::source(part)
            )),
        })
        .collect()
}

fn component(name: &str) -> Option<Component> {
    match name {
        "c" => Some(Component::Chroma),
        "h" => Some(Component::Hue),
        "l" => Some(Component::Lightness),
        _ => None,
    }
}

fn length_unit(unit: &str) -> Option<Unit> {
    match unit {
        "em" => Some(Unit::Em),
        "px" => Some(Unit::Px),
        "rem" => Some(Unit::Rem),
        _ => None,
    }
}

/// Whether a word is written as a color, or as a reference that may be one.
fn colorful(node: &Node) -> bool {
    match node {
        Node::Hash(_) => true,
        Node::Ident(name) => name == "transparent",
        Node::Function(name, _) => {
            matches!(name.as_str(), "color-mix" | "light-dark" | "oklch" | "var")
        }
        _ => false,
    }
}

fn is_hex(digits: &str) -> bool {
    matches!(digits.len(), 3 | 4 | 6 | 8) && digits.chars().all(|one| one.is_ascii_hexdigit())
}
