//! A `headless.tsx` source's `render`, read into the nodes the builder form
//! writes, so the rest of the compiler reads one shape.
//!
//! ```tsx
//! render: ({ props, send }) => (
//!   <Pressable chooses disabled={props.disabled} onPress={send.beforeSelect} part="tab" role="tab">
//!     <Slot part="label" />
//!     {props.dismissible && <View ariaHidden icon="x" part="dismiss-mark" />}
//!   </Pressable>
//! )
//! ```
//!
//! is `[pressable('tab', { chooses: true, role: 'tab', disabled: bind('disabled'),
//! sends: 'before-select' }, [region('default', { part: 'label' }), when('dismissible',
//! box('dismiss-mark', { decorative: true, glyph: 'x' }))])]`.
//!
//! **A restricted grammar, read and never run.** A node is one of the tags
//! [`TAGS`] names. An attribute is a literal, a read (`props.x`, `derived.x`,
//! `state.x`, a feature's value as `stack.label`, `entry.x`, `index`), `!`
//! before one, `read ? 'a' : 'b'`, `read === 'v' ? 'a' : 'b'`, or a core
//! derivation, `derive('kbd-label')`. A child is a node, `read && <Node />`,
//! `!read && <Node />`, or `read ? <A /> : <B />`. Everything else is refused
//! with its line and the form to write it in, and nothing is dropped.
//!
//! **A feature's value is read by the feature and its field**, as
//! [`api::computed`](crate::family::api::computed) lists them: `stop.place`,
//! `tour.spot.height`, `copy.told`. **Whether a slot holds something** is
//! `slots.x`, which a `<Wrap when>` and a `<View hidden>` read, as the
//! builder form's `while` and `hidden` read a region's name, so
//! `hidden={!slots.logo}` is hidden while nothing is passed into `logo`. **A CSS custom property a node sets** is in its
//! `style`, `style={{ '--meter-fraction': derived.fraction }}`.
//!
//! **Each name is the API's in camelCase.** `props.dismissLabel` reads the
//! prop `dismiss-label`, and `send.beforeSelect` is the event `before-select`.
//! A name the keys before `render` do not declare is refused, as the editor
//! refuses it.

use oxc_ast::ast::{Expression, JSXChild, LogicalOperator, UnaryOperator};
use oxc_span::{GetSpan, Span};

use super::{line, Lit};

#[cfg(test)]
#[path = "jsx_tests.rs"]
mod tests;

/// Each tag a render may write: its builder helper, and the shape a box
/// draws inside a vector.
const TAGS: &[(&str, &str, Option<&str>)] = &[
    ("Announce", "live", None),
    ("Circle", "box", Some("circle")),
    ("Ellipse", "box", Some("ellipse")),
    ("Image", "image", None),
    ("Layer", "layer", None),
    ("Line", "box", Some("line")),
    ("Path", "box", Some("path")),
    ("Pressable", "pressable", None),
    ("Rect", "box", Some("rect")),
    ("Repeat", "repeat", None),
    ("Slot", "region", None),
    ("Svg", "box", None),
    ("Text", "text", None),
    ("View", "box", None),
    ("Wrap", "wrap", None),
];

/// The names a render's parameter gives, each one what it reads.
const GIVEN: &[&str] = &[
    "copy",
    "countdown",
    "delay",
    "derived",
    "entry",
    "index",
    "notice",
    "notices",
    "props",
    "queue",
    "sections",
    "send",
    "slots",
    "stack",
    "state",
    "stop",
    "total",
    "tour",
];

/// What reading a render needs: the source for lines, and what the keys
/// before `render` declare.
struct Render<'s> {
    source: &'s str,
    given: Vec<String>,
    props: Vec<String>,
    derived: Vec<String>,
    events: Vec<String>,
    states: Vec<String>,
    /// Each value a feature computes, by the path a render reads it at.
    computed: Vec<(String, String)>,
}

/// A value a render reads, as a name the builder form binds.
enum Read {
    /// A prop, a computed value, a state, or a value of a stack, by name.
    Named(String),
    /// A field of the entry a copy of a repeat over a list draws.
    Field(String),
    /// Where a copy stands among the copies a repeat draws.
    Index,
    /// Whether the slot of this name holds something.
    Slot(String),
}

/// `dismissLabel` as `dismiss-label`.
pub(crate) fn kebab(key: &str) -> String {
    let mut name = String::with_capacity(key.len() + 4);
    for character in key.chars() {
        if character.is_ascii_uppercase() {
            name.push('-');
            name.push(character.to_ascii_lowercase());
        } else {
            name.push(character);
        }
    }
    name
}

/// The keys of an object field the source has read before `render`.
fn keys(fields: &[(String, Lit)], key: &str) -> Vec<String> {
    match fields.iter().find(|(name, _)| name == key) {
        Some((_, Lit::Object(entries))) => entries.iter().map(|(name, _)| name.clone()).collect(),
        _ => Vec::new(),
    }
}

/// The nodes `render` draws, as the builder form's `tree`.
///
/// # Errors
///
/// A sentence naming the line of what the grammar does not hold.
pub(super) fn render(
    value: &Expression,
    fields: &[(String, Lit)],
    source: &str,
) -> Result<Lit, String> {
    let at = |span: Span, why: &str| format!("line {}: {why}", line(span, source));
    let Expression::ArrowFunctionExpression(arrow) = value else {
        return Err(at(
            value.span(),
            "`render` is `({ props, send, ... }) => <Node />`",
        ));
    };
    let mut given = Vec::new();
    for parameter in &arrow.params.items {
        let oxc_ast::ast::BindingPattern::ObjectPattern(pattern) = &parameter.pattern else {
            return Err(at(
                parameter.span,
                "`render` takes one object, as `({ props, send })`",
            ));
        };
        for property in &pattern.properties {
            let name = property.key.static_name().unwrap_or_default().to_string();
            if !property.shorthand || !GIVEN.contains(&name.as_str()) {
                return Err(at(
                    property.span,
                    &format!(
                        "`render` is given {}, each by its own name",
                        GIVEN.join(", ")
                    ),
                ));
            }
            given.push(name);
        }
    }
    if arrow.params.items.len() > 1 || arrow.params.rest.is_some() {
        return Err(at(
            arrow.span,
            "`render` takes one object, as `({ props, send })`",
        ));
    }
    let Some(body) = arrow.get_expression() else {
        return Err(at(
            arrow.span,
            "`render` returns its nodes, with no statements before them",
        ));
    };
    let computed = crate::family::api::computed::reads(fields)?;
    let states = match fields.iter().find(|(name, _)| name == "states") {
        Some((_, Lit::Array(names))) => names
            .iter()
            .filter_map(|name| match name {
                Lit::Text(name) => Some(name.clone()),
                _ => None,
            })
            .collect(),
        _ => Vec::new(),
    };
    let reader = Render {
        derived: keys(fields, "derived"),
        events: keys(fields, "events"),
        given,
        props: keys(fields, "props"),
        source,
        computed,
        states,
    };
    reader.root(body).map(Lit::Array)
}

impl Render<'_> {
    fn at(&self, span: Span, why: &str) -> String {
        format!("line {}: {why}", line(span, self.source))
    }

    /// What the render returns: one node, or a fragment of several.
    fn root(&self, body: &Expression) -> Result<Vec<Lit>, String> {
        match body {
            Expression::ParenthesizedExpression(inner) => self.root(&inner.expression),
            Expression::JSXElement(element) => Ok(vec![self.element(element)?]),
            Expression::JSXFragment(fragment) => self.children(&fragment.children),
            other => Err(self.at(
                other.span(),
                "`render` returns a node, `<View part=\"...\" />`, or several in `<>...</>`",
            )),
        }
    }

    /// A node's children, each a node or a node drawn while a value holds.
    fn children(&self, children: &[JSXChild]) -> Result<Vec<Lit>, String> {
        let mut nodes = Vec::new();
        for child in children {
            match child {
                JSXChild::Text(text) if text.value.trim().is_empty() => {}
                JSXChild::Text(text) => {
                    return Err(self.at(
                        text.span,
                        "words in a node: write them as `<Text part=\"...\">{props.x}</Text>`",
                    ))
                }
                JSXChild::Element(element) => nodes.push(self.element(element)?),
                JSXChild::Fragment(fragment) => nodes.extend(self.children(&fragment.children)?),
                JSXChild::ExpressionContainer(container) => {
                    if let Some(expression) = container.expression.as_expression() {
                        nodes.extend(self.conditional(expression)?);
                    }
                }
                JSXChild::Spread(spread) => {
                    return Err(self.at(spread.span, "a spread of children: write each node"))
                }
            }
        }
        Ok(nodes)
    }

    /// `read && <Node />`, `!read && <Node />`, nested for each read before
    /// the node, or `read ? <A /> : <B />`.
    fn conditional(&self, expression: &Expression) -> Result<Vec<Lit>, String> {
        match expression {
            Expression::ParenthesizedExpression(inner) => self.conditional(&inner.expression),
            Expression::JSXElement(element) => Ok(vec![self.element(element)?]),
            Expression::LogicalExpression(logical) if logical.operator == LogicalOperator::And => {
                let mut tests = Vec::new();
                self.tests(&logical.left, &mut tests)?;
                let mut node = self.one(&logical.right)?;
                for (name, unless) in tests.into_iter().rev() {
                    let helper = if unless { "unless" } else { "when" };
                    node = Lit::Call(helper.to_owned(), vec![Lit::Text(name), node]);
                }
                Ok(vec![node])
            }
            Expression::ConditionalExpression(choice) => {
                let (name, unless) = self.test(&choice.test)?;
                let (yes, no) = (self.one(&choice.consequent)?, self.one(&choice.alternate)?);
                let (first, second) = if unless { ("unless", "when") } else { ("when", "unless") };
                Ok(vec![
                    Lit::Call(first.to_owned(), vec![Lit::Text(name.clone()), yes]),
                    Lit::Call(second.to_owned(), vec![Lit::Text(name), no]),
                ])
            }
            other => Err(self.at(
                other.span(),
                "a child is a node, `props.x && <Node />`, `!props.x && <Node />`, or `props.x ? <A /> : <B />`",
            )),
        }
    }

    /// The node a condition draws: one element.
    fn one(&self, expression: &Expression) -> Result<Lit, String> {
        match expression {
            Expression::ParenthesizedExpression(inner) => self.one(&inner.expression),
            Expression::JSXElement(element) => self.element(element),
            other => Err(self.at(
                other.span(),
                "a condition draws one node: write `props.x && <Node />`, and a condition for each of several",
            )),
        }
    }

    /// The reads `a && b && ...` tests, outermost first.
    fn tests(&self, expression: &Expression, into: &mut Vec<(String, bool)>) -> Result<(), String> {
        match expression {
            Expression::LogicalExpression(logical) if logical.operator == LogicalOperator::And => {
                self.tests(&logical.left, into)?;
                self.tests(&logical.right, into)
            }
            Expression::ParenthesizedExpression(inner) => self.tests(&inner.expression, into),
            other => {
                into.push(self.test(other)?);
                Ok(())
            }
        }
    }

    /// A condition: a read, or `!` before one, as its name and whether it
    /// is negated.
    fn test(&self, expression: &Expression) -> Result<(String, bool), String> {
        let (inner, unless) = match expression {
            Expression::UnaryExpression(unary) if unary.operator == UnaryOperator::LogicalNot => {
                (&unary.argument, true)
            }
            other => (other, false),
        };
        match self.read(inner)? {
            Read::Named(name) => Ok((name, unless)),
            Read::Field(_) | Read::Index | Read::Slot(_) => Err(self.at(
                inner.span(),
                "a condition reads a prop, a computed value, or a state: write it as `props.x && <Node />`",
            )),
        }
    }
}

#[path = "jsx_element.rs"]
mod element;
#[path = "jsx_values.rs"]
mod values;
