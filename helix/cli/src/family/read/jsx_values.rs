//! What a render reads, and the values its attributes and words take.

use oxc_ast::ast::{
    Expression, JSXAttribute, JSXAttributeValue, JSXChild, ObjectPropertyKind, UnaryOperator,
};
use oxc_span::{GetSpan, Span};

use super::{kebab, Read, Render};
use crate::family::read::Lit;

/// What an attribute may hold, for a refusal.
const VALUES: &str =
    "a literal, `props.x`, `derived.x`, `state.x`, `!props.x`, `props.x ? 'a' : 'b'`, `props.x === 'v' ? 'a' : 'b'`, or `derive('...')`";

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
            /* A field whose name is no identifier, as `entry['depth-2']`. */
            Expression::ComputedMemberExpression(member) if !member.optional => {
                match (&member.object, &member.expression) {
                    (Expression::Identifier(object), Expression::StringLiteral(name))
                        if object.name == "entry" && self.has("entry") =>
                    {
                        return Ok(Read::Field(name.value.display().to_string()))
                    }
                    _ => return Err(refuse(member.span)),
                }
            }
            Expression::StaticMemberExpression(member) if !member.optional => {
                path(member).ok_or_else(|| refuse(member.span))?
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
            "entry" => Ok(Read::Field(key)),
            "slots" => Ok(Read::Slot(kebab(&key))),
            feature if crate::family::api::computed::FEATURES.contains(&feature) => {
                let path = format!("{feature}.{key}");
                self.computed
                    .iter()
                    .find(|(read, _)| *read == path)
                    .map(|(_, name)| Read::Named(name.clone()))
                    .ok_or_else(|| {
                        let given: Vec<&str> = self
                            .computed
                            .iter()
                            .filter(|(read, _)| read.starts_with(&format!("{feature}.")))
                            .map(|(read, _)| read.as_str())
                            .collect();
                        self.at(
                            span,
                            &format!(
                                "`{path}` names no value the source's `{feature}` computes{}",
                                if given.is_empty() {
                                    String::new()
                                } else {
                                    format!(": {}", given.join(", "))
                                }
                            ),
                        )
                    })
            }
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

    /// An attribute's value, in the compiler's own shape.
    pub(super) fn value(
        &self,
        value: Option<&JSXAttributeValue>,
        span: Span,
    ) -> Result<Lit, String> {
        match value {
            None => Ok(Lit::Bool(true)),
            Some(JSXAttributeValue::StringLiteral(text)) => {
                Ok(Lit::Text(text.value.display().to_string()))
            }
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

    pub(super) fn expression(&self, expression: &Expression) -> Result<Lit, String> {
        match expression {
            Expression::ParenthesizedExpression(inner) => self.expression(&inner.expression),
            Expression::StringLiteral(text) => Ok(Lit::Text(text.value.display().to_string())),
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
            Expression::ConditionalExpression(_) => self.pick(expression),
            Expression::CallExpression(call) => self.derive(call),
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
                    entries.push((key.display().to_string(), self.expression(&property.value)?));
                }
                Ok(Lit::Object(entries))
            }
            Expression::StaticMemberExpression(_)
            | Expression::ComputedMemberExpression(_)
            | Expression::Identifier(_) => match self.read(expression)? {
                Read::Slot(_) => Err(self.at(
                    expression.span(),
                    "`slots.x` is read by a `<Wrap when>` and a `<View hidden>`",
                )),
                read => Ok(bound(read)),
            },
            other => Err(self.at(
                other.span(),
                &format!("an expression the compiler would have to run: write {VALUES}"),
            )),
        }
    }

    /// `derive('kbd-label')`: a derivation in core, computed where the node
    /// is drawn, as the compiler's own `derive()`.
    pub(super) fn derive(&self, call: &oxc_ast::ast::CallExpression) -> Result<Lit, String> {
        let refuse = || {
            self.at(
                call.span,
                &format!("a call the compiler would have to run: write {VALUES}"),
            )
        };
        let Expression::Identifier(callee) = &call.callee else {
            return Err(refuse());
        };
        let [argument] = call.arguments.as_slice() else {
            return Err(refuse());
        };
        match (callee.name.as_str(), argument.as_expression()) {
            ("derive", Some(Expression::StringLiteral(name))) => Ok(Lit::Call(
                "derive".to_owned(),
                vec![Lit::Text(name.value.display().to_string())],
            )),
            _ => Err(refuse()),
        }
    }

    /// `read ? 'a' : 'b'`, `!read ? 'a' : 'b'`, and `read === 'v' ? 'a' :
    /// read === 'w' ? 'b' : 'c'`, each a `pick()` of the strings by the
    /// read's value.
    fn pick(&self, expression: &Expression) -> Result<Lit, String> {
        let words = |branch: &Expression| match branch {
            Expression::StringLiteral(text) => Ok(Lit::Text(text.value.display().to_string())),
            other => Err(self.at(
                other.span(),
                "a choice of values picks between strings: write `props.x ? 'a' : 'b'`",
            )),
        };
        let Expression::ConditionalExpression(choice) = expression else {
            return Err(self.at(
                expression.span(),
                "a choice of values is `props.x ? 'a' : 'b'`",
            ));
        };
        let Some((name, value)) = self.equals(&choice.test)? else {
            let (name, unless) = self.test(&choice.test)?;
            let (yes, no) = (words(&choice.consequent)?, words(&choice.alternate)?);
            let (picked, otherwise) = if unless { (no, yes) } else { (yes, no) };
            return Ok(Lit::Call(
                "pick".to_owned(),
                vec![
                    Lit::Text(name),
                    Lit::Object(vec![("true".to_owned(), picked)]),
                    otherwise,
                ],
            ));
        };
        let mut values = vec![(value, words(&choice.consequent)?)];
        let mut rest = &choice.alternate;
        loop {
            let inner = match rest {
                Expression::ParenthesizedExpression(inner) => &inner.expression,
                other => other,
            };
            let Expression::ConditionalExpression(next) = inner else {
                break;
            };
            match self.equals(&next.test)? {
                Some((other, value)) if other == name => {
                    if values.iter().any(|(held, _)| *held == value) {
                        return Err(self.at(next.test.span(), &format!("`{value}` a second time")));
                    }
                    values.push((value, words(&next.consequent)?));
                    rest = &next.alternate;
                }
                _ => {
                    return Err(self.at(
                        next.test.span(),
                        "a choice of several values tests one read: `props.x === 'a' ? ... : props.x === 'b' ? ... : ...`",
                    ))
                }
            }
        }
        Ok(Lit::Call(
            "pick".to_owned(),
            vec![Lit::Text(name), Lit::Object(values), words(rest)?],
        ))
    }

    /// `read === literal`, as the read's name and the literal as a pick's
    /// key names it, or `None` for any other test.
    fn equals(&self, test: &Expression) -> Result<Option<(String, String)>, String> {
        let test = match test {
            Expression::ParenthesizedExpression(inner) => &inner.expression,
            other => other,
        };
        let Expression::BinaryExpression(binary) = test else {
            return Ok(None);
        };
        if binary.operator != oxc_ast::ast::BinaryOperator::StrictEquality {
            return Err(self.at(binary.span, "a test of a value is `props.x === 'v'`"));
        }
        let value = match &binary.right {
            Expression::StringLiteral(literal) => literal.value.display().to_string(),
            Expression::BooleanLiteral(flag) => flag.value.to_string(),
            Expression::NumericLiteral(number) => number.value.to_string(),
            other => {
                return Err(self.at(
                    other.span(),
                    "a read is tested against a literal: `props.x === 'v'`",
                ))
            }
        };
        match self.read(&binary.left)? {
            Read::Named(name) => Ok(Some((name, value))),
            _ => Err(self.at(
                binary.left.span(),
                "a test reads a prop, a computed value, or a state",
            )),
        }
    }

    /// The words a `<Text>` or an `<Announce>` says: its one child, a read or
    /// literal words.
    pub(super) fn words(&self, children: &[JSXChild]) -> Result<Option<Lit>, String> {
        let mut said = None;
        for child in children {
            let words =
                match child {
                    JSXChild::Text(text) if text.value.trim().is_empty() => continue,
                    JSXChild::Text(text) => Lit::Text(text.value.trim().to_owned()),
                    JSXChild::ExpressionContainer(container) => {
                        match container.expression.as_expression() {
                            None => continue,
                            Some(Expression::StringLiteral(text)) => {
                                Lit::Text(text.value.display().to_string())
                            }
                            Some(Expression::CallExpression(call)) => self.derive(call)?,
                            Some(expression) => match self.read(expression)? {
                                Read::Slot(_) => return Err(self.at(
                                    expression.span(),
                                    "words are a read or a string: `slots.x` is a `<Wrap when>`'s",
                                )),
                                read => bound(read),
                            },
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

/// A read as the attribute the compiler's own shape holds for it.
pub(super) fn bound(read: Read) -> Lit {
    match read {
        Read::Named(name) | Read::Slot(name) => Lit::Call("bind".to_owned(), vec![Lit::Text(name)]),
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

/// `object.key`, or `object.field.key` for a value a feature names by a
/// word, as `stop.words.back`: the object's name, the path after it, and
/// the span.
fn path(member: &oxc_ast::ast::StaticMemberExpression) -> Option<(String, String, Span)> {
    match &member.object {
        Expression::Identifier(object) => Some((
            object.name.to_string(),
            member.property.name.to_string(),
            member.span,
        )),
        Expression::StaticMemberExpression(inner) if !inner.optional => match &inner.object {
            Expression::Identifier(object) => Some((
                object.name.to_string(),
                format!("{}.{}", inner.property.name, member.property.name),
                member.span,
            )),
            _ => None,
        },
        _ => None,
    }
}
