//! What a render reads, and the values its attributes and words take.

use oxc_ast::ast::{
    Expression, JSXAttribute, JSXAttributeValue, JSXChild, ObjectPropertyKind, UnaryOperator,
};
use oxc_span::{GetSpan, Span};

use super::{kebab, Read, Render};
use crate::family::read::Lit;

/// What an attribute may hold, for a refusal.
const VALUES: &str =
    "a literal, `props.x`, `derived.x`, `state.x`, `!props.x`, or `props.x ? 'a' : 'b'`";

impl Render<'_> {
    /// A read: `props.x`, `derived.x`, `state.x`, `stack.x`, `entry.x`, or
    /// `index`, each by a name the source declares.
    pub(super) fn read(&self, expression: &Expression) -> Result<Read, String> {
        let refuse = |span: Span| {
            self.at(
                span,
                "a value is read as `props.x`, `derived.x`, `state.x`, `stack.x`, `entry.x`, or `index`",
            )
        };
        let (object, key, span) = match expression {
            Expression::ParenthesizedExpression(inner) => return self.read(&inner.expression),
            Expression::Identifier(name) if name.name == "index" && self.has("index") => {
                return Ok(Read::Index)
            }
            Expression::StaticMemberExpression(member) if !member.optional => {
                match &member.object {
                    Expression::Identifier(object) => (
                        object.name.to_string(),
                        member.property.name.to_string(),
                        member.span,
                    ),
                    _ => return Err(refuse(member.span)),
                }
            }
            other => return Err(refuse(other.span())),
        };
        if !self.has(&object) {
            return Err(self.at(
                span,
                &format!("`{object}` is not something `render` is given: write `({{ {object} }}) =>` to read it"),
            ));
        }
        let declared = |names: &[String], what: &str| -> Result<Read, String> {
            if names.contains(&key) {
                Ok(Read::Named(kebab(&key)))
            } else {
                Err(self.at(
                    span,
                    &format!(
                        "`{object}.{key}` names no {what} the source declares: {}",
                        names.join(", ")
                    ),
                ))
            }
        };
        match object.as_str() {
            "props" => declared(&self.props, "prop"),
            "derived" => declared(&self.derived, "computed value"),
            "state" => {
                let states: Vec<String> = self.states.iter().map(|state| camel(state)).collect();
                declared(&states, "state")
            }
            "stack" => self
                .stack
                .iter()
                .find(|(field, _)| *field == key)
                .map(|(_, name)| Read::Named(name.clone()))
                .ok_or_else(|| {
                    self.at(
                        span,
                        &format!("`stack.{key}` names no value the source's `stack` names"),
                    )
                }),
            "entry" => Ok(Read::Field(key)),
            _ => Err(self.at(
                span,
                "`send.x` is what a press sends: write it as `onPress={send.x}`",
            )),
        }
    }

    fn has(&self, given: &str) -> bool {
        self.given.iter().any(|name| name == given)
    }

    /// `onPress={send.x}`: the event `x`, by its name.
    pub(super) fn send(&self, attribute: &JSXAttribute) -> Result<Lit, String> {
        let expression = match &attribute.value {
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                container.expression.as_expression()
            }
            _ => None,
        };
        let refuse = || {
            self.at(
                attribute.span,
                "`onPress` sends an event: write it as `onPress={send.x}`",
            )
        };
        let Some(Expression::StaticMemberExpression(member)) = expression else {
            return Err(refuse());
        };
        let (Expression::Identifier(object), false) = (&member.object, member.optional) else {
            return Err(refuse());
        };
        if object.name != "send" || !self.has("send") {
            return Err(refuse());
        }
        let key = member.property.name.to_string();
        if !self.events.contains(&key) {
            return Err(self.at(
                member.span,
                &format!(
                    "`send.{key}` names no event the source declares: {}",
                    self.events.join(", ")
                ),
            ));
        }
        Ok(Lit::Text(kebab(&key)))
    }

    /// An attribute's value, as the builder form writes it.
    pub(super) fn value(
        &self,
        value: Option<&JSXAttributeValue>,
        span: Span,
    ) -> Result<Lit, String> {
        match value {
            None => Ok(Lit::Bool(true)),
            Some(JSXAttributeValue::StringLiteral(text)) => Ok(Lit::Text(text.value.to_string())),
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                match container.expression.as_expression() {
                    Some(expression) => self.expression(expression),
                    None => Err(self.at(span, &format!("an empty attribute: write {VALUES}"))),
                }
            }
            Some(_) => Err(self.at(
                span,
                &format!("a node as an attribute's value: write {VALUES}"),
            )),
        }
    }

    fn expression(&self, expression: &Expression) -> Result<Lit, String> {
        match expression {
            Expression::ParenthesizedExpression(inner) => self.expression(&inner.expression),
            Expression::StringLiteral(text) => Ok(Lit::Text(text.value.to_string())),
            Expression::NumericLiteral(number) => Ok(Lit::Number(number.value)),
            Expression::BooleanLiteral(flag) => Ok(Lit::Bool(flag.value)),
            Expression::UnaryExpression(unary)
                if unary.operator == UnaryOperator::UnaryNegation =>
            {
                match &unary.argument {
                    Expression::NumericLiteral(number) => Ok(Lit::Number(-number.value)),
                    other => Err(self.at(other.span(), &format!("arithmetic: write {VALUES}"))),
                }
            }
            Expression::UnaryExpression(unary) if unary.operator == UnaryOperator::LogicalNot => {
                match self.read(&unary.argument)? {
                    Read::Named(name) => Ok(Lit::Call("not".to_owned(), vec![Lit::Text(name)])),
                    _ => Err(self.at(unary.span, "`!` reads a prop, a computed value, or a state")),
                }
            }
            Expression::ConditionalExpression(choice) => {
                let (name, unless) = self.test(&choice.test)?;
                let words = |branch: &Expression| match branch {
                    Expression::StringLiteral(text) => Ok(Lit::Text(text.value.to_string())),
                    other => Err(self.at(
                        other.span(),
                        "a choice of values picks between strings: write `props.x ? 'a' : 'b'`",
                    )),
                };
                let (yes, no) = (words(&choice.consequent)?, words(&choice.alternate)?);
                let (picked, otherwise) = if unless { (no, yes) } else { (yes, no) };
                Ok(Lit::Call(
                    "pick".to_owned(),
                    vec![
                        Lit::Text(name),
                        Lit::Object(vec![("true".to_owned(), picked)]),
                        otherwise,
                    ],
                ))
            }
            Expression::ObjectExpression(object) => {
                let mut entries = Vec::new();
                for property in &object.properties {
                    let ObjectPropertyKind::ObjectProperty(property) = property else {
                        return Err(self.at(
                            object.span,
                            "a spread in an object of parts: write each one",
                        ));
                    };
                    let Some(key) = property.key.static_name().filter(|_| !property.computed)
                    else {
                        return Err(
                            self.at(property.span, "a computed key: write each part's name")
                        );
                    };
                    entries.push((key.to_string(), self.expression(&property.value)?));
                }
                Ok(Lit::Object(entries))
            }
            Expression::StaticMemberExpression(_) | Expression::Identifier(_) => {
                self.read(expression).map(bound)
            }
            other => Err(self.at(
                other.span(),
                &format!("an expression the compiler would have to run: write {VALUES}"),
            )),
        }
    }

    /// The words a `<Text>` or an `<Announce>` says: its one child, a read or
    /// literal words.
    pub(super) fn words(&self, children: &[JSXChild]) -> Result<Option<Lit>, String> {
        let mut said = None;
        for child in children {
            let words = match child {
                JSXChild::Text(text) if text.value.trim().is_empty() => continue,
                JSXChild::Text(text) => Lit::Text(text.value.trim().to_owned()),
                JSXChild::ExpressionContainer(container) => {
                    match container.expression.as_expression() {
                        None => continue,
                        Some(Expression::StringLiteral(text)) => Lit::Text(text.value.to_string()),
                        Some(expression) => bound(self.read(expression)?),
                    }
                }
                other => {
                    return Err(self.at(
                        other.span(),
                        "words hold no node: write `<Text part=\"...\">{props.x}</Text>`",
                    ))
                }
            };
            if said.is_some() {
                return Err(self.at(child.span(), "words are one read or one string"));
            }
            said = Some(words);
        }
        Ok(said)
    }
}

/// A read as the attribute the builder form writes for it.
fn bound(read: Read) -> Lit {
    match read {
        Read::Named(name) => Lit::Call("bind".to_owned(), vec![Lit::Text(name)]),
        Read::Field(name) => Lit::Call("field".to_owned(), vec![Lit::Text(name)]),
        Read::Index => Lit::Call("index".to_owned(), Vec::new()),
    }
}

/// `placed-top` as `placedTop`, the key a render reads a state by.
fn camel(name: &str) -> String {
    let mut written = String::with_capacity(name.len());
    let mut upper = false;
    for character in name.chars() {
        if character == '-' {
            upper = true;
        } else if upper {
            written.extend(character.to_uppercase());
            upper = false;
        } else {
            written.push(character);
        }
    }
    written
}
