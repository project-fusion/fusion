//! One element of a render, read into the builder helper its tag names.

use oxc_ast::ast::{
    JSXAttribute, JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXElement, JSXElementName,
};

use super::{Render, TAGS};
use crate::family::read::Lit;

/// Each attribute the JSX form spells another way than the builder form.
const RENAMED: &[(&str, &str)] = &[("ariaHidden", "decorative"), ("icon", "glyph")];

/// The helpers whose node holds children of its own, or a fallback.
const HOLDS: &[&str] = &["box", "layer", "pressable", "region", "repeat", "wrap"];

/// The helpers whose node says words, passed as its one child.
const SAYS: &[&str] = &["live", "text"];

impl Render<'_> {
    /// An element, as the builder helper its tag names.
    pub(super) fn element(&self, element: &JSXElement) -> Result<Lit, String> {
        let opening = &element.opening_element;
        let tag = match &opening.name {
            JSXElementName::IdentifierReference(name) => name.name.to_string(),
            JSXElementName::Identifier(name) => {
                return Err(self.at(
                    opening.span,
                    &format!(
                        "`<{}>` is an element of the page, which a render does not draw: write a node, as `<View part=\"...\">`",
                        name.name
                    ),
                ))
            }
            _ => return Err(self.at(opening.span, "a node's tag is one name, as `<View>`")),
        };
        let Some((_, helper, shape)) = TAGS.iter().find(|(name, ..)| *name == tag) else {
            let known: Vec<&str> = TAGS.iter().map(|(name, ..)| *name).collect();
            return Err(self.at(
                opening.span,
                &format!(
                    "`<{tag}>` is not a node: a render draws {}",
                    known.join(", ")
                ),
            ));
        };
        let (name, mut attributes) = self.attributes(&tag, &opening.attributes)?;
        if let Some(shape) = shape {
            attributes.push(("shape".to_owned(), Lit::Text((*shape).to_owned())));
        }
        /* A wrap with no condition always wraps, and a link wraps what it
        links. */
        if tag == "Wrap"
            && !attributes
                .iter()
                .any(|(key, _)| key == "while" || key == "href")
        {
            attributes.push(("while".to_owned(), Lit::Bool(true)));
        }
        if tag == "Svg" && !attributes.iter().any(|(key, _)| key == "viewBox") {
            return Err(self.at(opening.span, "`<Svg>` takes the `viewBox` it draws in"));
        }
        let mut arguments = vec![Lit::Text(name)];
        if SAYS.contains(helper) {
            if let Some(says) = self.words(&element.children)? {
                attributes.push(("says".to_owned(), says));
            }
            arguments.push(Lit::Object(attributes));
        } else if HOLDS.contains(helper) {
            arguments.push(Lit::Object(attributes));
            arguments.push(Lit::Array(self.children(&element.children)?));
        } else {
            if !self.children(&element.children)?.is_empty() {
                return Err(self.at(element.span, &format!("`<{tag}>` holds no nodes")));
            }
            arguments.push(Lit::Object(attributes));
        }
        Ok(Lit::Call((*helper).to_owned(), arguments))
    }

    /// The node's name and its attributes, each spelled as the builder form
    /// spells it.
    fn attributes(
        &self,
        tag: &str,
        items: &[JSXAttributeItem],
    ) -> Result<(String, Vec<(String, Lit)>), String> {
        /* A region's name is the slot's, and the default region has none. */
        let slot = tag == "Slot";
        let mut name = slot.then(|| "default".to_owned());
        let mut attributes: Vec<(String, Lit)> = Vec::new();
        for item in items {
            let attribute = match item {
                JSXAttributeItem::Attribute(attribute) => attribute,
                JSXAttributeItem::SpreadAttribute(spread) => {
                    return Err(self.at(spread.span, "a spread of attributes: write each one"))
                }
            };
            let JSXAttributeName::Identifier(key) = &attribute.name else {
                return Err(self.at(attribute.span, "an attribute's name is one name, as `role`"));
            };
            let key = key.name.to_string();
            let named = if slot { "name" } else { "part" };
            if key == named {
                name = Some(self.literal(attribute, &key)?);
                continue;
            }
            let read = if key == "style" {
                self.style(attribute)?
            } else {
                vec![self.attribute(tag, &key, attribute)?]
            };
            for (key, value) in read {
                if attributes.iter().any(|(held, _)| *held == key) {
                    return Err(self.at(attribute.span, &format!("`{key}` a second time")));
                }
                attributes.push((key, value));
            }
        }
        let Some(name) = name else {
            return Err(self.at(
                items
                    .first()
                    .map_or(oxc_span::Span::default(), |item| match item {
                        JSXAttributeItem::Attribute(one) => one.span,
                        JSXAttributeItem::SpreadAttribute(one) => one.span,
                    }),
                &format!("`<{tag}>` names the part it is with `part=\"...\"`"),
            ));
        };
        Ok((name, attributes))
    }

    /// One attribute, renamed where the JSX form spells it another way.
    fn attribute(
        &self,
        tag: &str,
        key: &str,
        attribute: &JSXAttribute,
    ) -> Result<(String, Lit), String> {
        let value = attribute.value.as_ref();
        match (tag, key) {
            (_, "onPress") => Ok(("sends".to_owned(), self.send(attribute)?)),
            ("Wrap", "when") | ("View", "hidden") if self.slot(value).is_some() => Ok((
                if key == "when" { "while" } else { "hidden" }.to_owned(),
                self.slot(value).unwrap_or(Lit::Null),
            )),
            ("Wrap", "when") => match self.value(value, attribute.span)? {
                Lit::Bool(true) => Err(self.at(
                    attribute.span,
                    "a wrap that always wraps writes no `when`: `<Wrap part=\"...\">`",
                )),
                read => Ok(("while".to_owned(), read)),
            },
            ("Announce", "when") => Ok(("while".to_owned(), self.value(value, attribute.span)?)),
            ("View", "viewBox") => Err(self.at(
                attribute.span,
                "a box that draws a vector is `<Svg viewBox=\"...\">`",
            )),
            ("View", "shape") => Err(self.at(
                attribute.span,
                "a shape inside a vector is `<Path>`, `<Circle>`, `<Ellipse>`, `<Line>` or `<Rect>`",
            )),
            (_, "decorative" | "glyph" | "sends" | "while" | "says") => Err(self.at(
                attribute.span,
                &format!(
                    "`{key}` is the builder form's: write it as {}",
                    match key {
                        "decorative" => "`ariaHidden`",
                        "glyph" => "`icon`",
                        "sends" => "`onPress={send.x}`",
                        "while" => "`when`",
                        _ => "the node's child, `<Text part=\"...\">{props.x}</Text>`",
                    }
                ),
            )),
            _ => {
                let renamed = RENAMED
                    .iter()
                    .find(|(written, _)| *written == key)
                    .map_or(key, |(_, builder)| *builder);
                Ok((renamed.to_owned(), self.value(value, attribute.span)?))
            }
        }
    }

    /// `slots.x`, whether the slot holds something, as a bind of its name,
    /// and `!slots.x` as a `not()` of it, which a `<Wrap when>` and a
    /// `<View hidden>` read.
    fn slot(&self, value: Option<&JSXAttributeValue>) -> Option<Lit> {
        let expression = match value? {
            JSXAttributeValue::ExpressionContainer(container) => {
                container.expression.as_expression()?
            }
            _ => return None,
        };
        let (read, negated) = match expression {
            oxc_ast::ast::Expression::UnaryExpression(unary)
                if unary.operator == oxc_ast::ast::UnaryOperator::LogicalNot =>
            {
                (&unary.argument, true)
            }
            other => (other, false),
        };
        match self.read(read).ok()? {
            super::Read::Slot(name) if negated => {
                Some(Lit::Call("not".to_owned(), vec![Lit::Text(name)]))
            }
            super::Read::Slot(name) => Some(super::values::bound(super::Read::Slot(name))),
            _ => None,
        }
    }

    /// `style={{ '--meter-fraction': derived.fraction }}`: each CSS custom
    /// property the node sets, as an attribute of its own name.
    fn style(&self, attribute: &JSXAttribute) -> Result<Vec<(String, Lit)>, String> {
        let refuse = || {
            self.at(
                attribute.span,
                "`style` sets CSS custom properties: `style={{ '--name': props.x }}`",
            )
        };
        let Some(JSXAttributeValue::ExpressionContainer(container)) = &attribute.value else {
            return Err(refuse());
        };
        let Some(oxc_ast::ast::Expression::ObjectExpression(object)) =
            container.expression.as_expression()
        else {
            return Err(refuse());
        };
        let mut read = Vec::new();
        for property in &object.properties {
            let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) = property else {
                return Err(refuse());
            };
            let Some(name) = property.key.static_name().filter(|_| !property.computed) else {
                return Err(refuse());
            };
            if !name.starts_with("--") {
                return Err(self.at(
                    property.span,
                    &format!("`{name}` in `style` is not a CSS custom property: a style table sets the rest"),
                ));
            }
            read.push((name.to_string(), self.expression(&property.value)?));
        }
        Ok(read)
    }

    /// A name written as a literal string, as `part="tab"`.
    fn literal(&self, attribute: &JSXAttribute, key: &str) -> Result<String, String> {
        match &attribute.value {
            Some(JSXAttributeValue::StringLiteral(text)) => Ok(text.value.to_string()),
            _ => Err(self.at(
                attribute.span,
                &format!("`{key}` is a name written as a string, as `{key}=\"label\"`"),
            )),
        }
    }
}
