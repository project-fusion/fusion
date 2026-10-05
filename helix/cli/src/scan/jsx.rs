//! Modules, read for the templates in them: JSX elements, Lit's `html` and
//! `css` templates, and an Angular component's inline `template`.
//!
//! **Parsed, with the parser the manifest generator already uses.** JSX is
//! JavaScript, and a tag reader stepping over `{a < b}` would read a tag that
//! is not there. oxc reads the module as the bundler will.
//!
//! **A JSX attribute is checked only where it is written as a string.**
//! React and Solid set an expression on a custom element as a property where
//! the element has one, and the manifest lists attributes, so `items={rows}`
//! on a table is correct and would read as an attribute the table does not
//! take. A string is an attribute in every framework.
//!
//! **A module that defines a Helix element is that element's own code.** The
//! elements its templates write render inside the element's shadow root,
//! which the page counts apart as `composed` and does not judge, so the module
//! says which tags it defines.

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, CallExpression, Expression, JSXAttributeItem, JSXAttributeName, JSXAttributeValue,
    JSXElement, JSXElementName, ObjectProperty, PropertyKey, TaggedTemplateExpression,
    TemplateLiteral,
};
use oxc_ast_visit::{walk, Visit};
use oxc_parser::Parser;
use oxc_span::SourceType;

use super::markup::{self, Attribute, Element, Style, Template, Value};

/// The longest opening tag kept as evidence, in characters.
const EVIDENCE: usize = 200;

/// Reads a module's templates, parsed as `kind` says.
///
/// `None` where the module does not parse: a scan says so and reads on.
pub fn read(text: &str, kind: SourceType) -> Option<Template> {
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, text, kind).parse();
    if parsed.fatal_error {
        return None;
    }
    let mut reader = Reader {
        lines: text
            .bytes()
            .enumerate()
            .filter(|(_, byte)| *byte == b'\n')
            .map(|(at, _)| at)
            .collect(),
        open: Vec::new(),
        template: Template::default(),
        text,
    };
    reader.visit_program(&parsed.program);
    Some(reader.template)
}

struct Reader<'t> {
    /// Where each newline is, for a line from an offset.
    lines: Vec<usize>,
    /// The elements open around the one being read.
    open: Vec<usize>,
    template: Template,
    text: &'t str,
}

impl Reader<'_> {
    fn line(&self, at: u32) -> usize {
        1 + self.lines.partition_point(|newline| *newline < at as usize)
    }

    /// A template written as a string: read as markup, at its own line, and
    /// added to what this module holds.
    fn markup(&mut self, text: &str, at: u32) {
        let read = markup::read(text, self.line(at));
        let offset = self.template.elements.len();
        for mut element in read.elements {
            element.parent = element.parent.map(|parent| parent + offset);
            self.template.elements.push(element);
        }
        self.template.styles.extend(read.styles);
    }

    /// A template literal's text, with each expression as `between`.
    fn joined(literal: &TemplateLiteral<'_>, between: &str) -> String {
        literal
            .quasis
            .iter()
            .map(|quasi| quasi.value.raw.as_str())
            .collect::<Vec<_>>()
            .join(between)
    }
}

/// An attribute written in JSX, as the element receives it.
///
/// A name with a capital is a property, `className` and `rowKey` among them.
/// Solid's `attr:` and `bool:` write an attribute, and its other namespaces,
/// `prop:` and `on:` among them, write none.
fn attribute(name: &JSXAttributeName<'_>, value: Option<&JSXAttributeValue<'_>>) -> Attribute {
    let literal = || match value {
        None => Value::Literal(String::new()),
        Some(JSXAttributeValue::StringLiteral(text)) => Value::Literal(text.value.to_string()),
        Some(JSXAttributeValue::ExpressionContainer(container)) => {
            match container.expression.as_expression() {
                Some(Expression::StringLiteral(text)) => Value::Literal(text.value.to_string()),
                Some(Expression::TemplateLiteral(literal)) if literal.expressions.is_empty() => {
                    Value::Literal(Reader::joined(literal, ""))
                }
                _ => Value::Skip,
            }
        }
        Some(_) => Value::Skip,
    };
    match name {
        JSXAttributeName::Identifier(identifier) => {
            let name = identifier.name.to_string();
            let value = if name.chars().any(|one| one.is_ascii_uppercase()) {
                Value::Skip
            } else {
                literal()
            };
            Attribute { name, value }
        }
        JSXAttributeName::NamespacedName(name) => {
            let (space, local) = (name.namespace.name.as_str(), name.name.name.to_string());
            match space {
                "attr" => Attribute {
                    name: local,
                    value: match literal() {
                        Value::Skip => Value::Bound,
                        known => known,
                    },
                },
                "bool" => Attribute {
                    name: local,
                    value: Value::Bound,
                },
                _ => Attribute {
                    name: format!("{space}:{local}"),
                    value: Value::Skip,
                },
            }
        }
    }
}

/// The `helix-*` tag a call defines: `@customElement('helix-x')`, or
/// `customElements.define('helix-x', ...)`.
fn defined(call: &CallExpression<'_>) -> Option<String> {
    let names_define = call.callee.is_specific_id("customElement")
        || call.callee.get_member_expr().is_some_and(|member| {
            member.static_property_name() == Some("define")
                && (member.object().is_specific_id("customElements")
                    || member.object().get_member_expr().is_some_and(|object| {
                        object.static_property_name() == Some("customElements")
                    }))
        });
    if !names_define {
        return None;
    }
    match call.arguments.first() {
        Some(Argument::StringLiteral(tag)) if tag.value.starts_with("helix-") => {
            Some(tag.value.to_string())
        }
        _ => None,
    }
}

impl<'a> Visit<'a> for Reader<'_> {
    fn visit_jsx_element(&mut self, it: &JSXElement<'a>) {
        let opening = &it.opening_element;
        /* **Only an element the browser makes.** A component's tag names a
        function, and what reaches the page is whatever it renders, so it is
        kept as a parent with no tag: a `slot` under it is the component's
        business. */
        let tag = match &opening.name {
            JSXElementName::Identifier(identifier) => identifier.name.to_string(),
            JSXElementName::NamespacedName(name) => {
                format!("{}:{}", name.namespace.name, name.name.name)
            }
            _ => String::new(),
        };
        let attributes = opening
            .attributes
            .iter()
            .filter_map(|item| match item {
                JSXAttributeItem::Attribute(one) => Some(attribute(&one.name, one.value.as_ref())),
                JSXAttributeItem::SpreadAttribute(_) => None,
            })
            .collect();
        let span = opening.span;
        let text: String = self.text[span.start as usize..span.end as usize]
            .chars()
            .take(EVIDENCE)
            .collect();
        let index = self.template.elements.len();
        self.template.elements.push(Element {
            attributes,
            line: self.line(span.start),
            parent: self.open.last().copied(),
            tag: tag.to_ascii_lowercase(),
            text,
        });
        self.open.push(index);
        walk::walk_jsx_element(self, it);
        self.open.pop();
    }

    fn visit_tagged_template_expression(&mut self, it: &TaggedTemplateExpression<'a>) {
        let at = it.quasi.span.start + 1;
        if it.tag.is_specific_id("html") || it.tag.is_specific_id("svg") {
            let text = Self::joined(&it.quasi, "${}");
            self.markup(&text, at);
        } else if it.tag.is_specific_id("css") {
            /* An expression in a sheet is a value or a whole rule, and the
            sheet reads the same with it taken out. */
            self.template.styles.push(Style {
                line: self.line(at),
                lang: None,
                text: Self::joined(&it.quasi, ""),
            });
        }
        walk::walk_tagged_template_expression(self, it);
    }

    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        if let Some(tag) = defined(it) {
            self.template.defines.push(tag);
        }
        walk::walk_call_expression(self, it);
    }

    fn visit_object_property(&mut self, it: &ObjectProperty<'a>) {
        /* An Angular component's inline template. */
        if let PropertyKey::StaticIdentifier(key) = &it.key {
            if key.name == "template" {
                match &it.value {
                    Expression::TemplateLiteral(literal) => {
                        let text = Self::joined(literal, "${}");
                        self.markup(&text, literal.span.start + 1);
                    }
                    Expression::StringLiteral(literal) => {
                        let text = literal.value.to_string();
                        self.markup(&text, literal.span.start + 1);
                    }
                    _ => {}
                }
            }
        }
        walk::walk_object_property(self, it);
    }
}

#[cfg(test)]
mod tests {
    use oxc_span::SourceType;

    use super::read;
    use crate::scan::markup::Value;

    #[test]
    fn jsx_elements_keep_strings_and_skip_expressions() {
        let template = read(
            "export const Card = () => (\n  <helix-card tone=\"primary\" items={rows} rowKey=\"id\" className=\"x\" attr:emphasis={kind} prop:open={true}>\n    {open && <span slot=\"header\">A</span>}\n  </helix-card>\n)\n",
            SourceType::tsx(),
        )
        .expect("parses");
        let card = &template.elements[0];
        assert_eq!(card.tag, "helix-card");
        assert_eq!(card.line, 2);
        let values: Vec<(&str, &Value)> = card
            .attributes
            .iter()
            .map(|one| (one.name.as_str(), &one.value))
            .collect();
        assert_eq!(
            values,
            [
                ("tone", &Value::Literal("primary".to_owned())),
                ("items", &Value::Skip),
                ("rowKey", &Value::Skip),
                ("className", &Value::Skip),
                ("emphasis", &Value::Bound),
                ("prop:open", &Value::Skip),
            ]
        );
        assert_eq!(template.elements[1].tag, "span");
        assert_eq!(template.elements[1].parent, Some(0));
    }

    #[test]
    fn lit_and_angular_templates_are_read_as_markup() {
        let template = read(
            "import { html, css } from 'lit'\nconst view = (tone) => html`\n<helix-tag tone=${tone} emphasis=\"ghost\"></helix-tag>`\nconst styles = css`helix-tag::part(label) { color: ${red}; }`\n@Component({ selector: 'app-x', template: `<helix-button emphasis=\"solid\"></helix-button>` })\nclass X {}\n",
            SourceType::ts(),
        )
        .expect("parses");
        let tags: Vec<(&str, usize)> = template
            .elements
            .iter()
            .map(|one| (one.tag.as_str(), one.line))
            .collect();
        assert_eq!(tags, [("helix-tag", 3), ("helix-button", 5)]);
        assert_eq!(template.elements[0].attributes[0].value, Value::Bound);
        assert_eq!(template.styles[0].line, 4);
        assert_eq!(
            template.styles[0].text,
            "helix-tag::part(label) { color: ; }"
        );
    }

    #[test]
    fn a_module_says_which_helix_tags_it_defines() {
        let template = read(
            "@customElement('helix-card-root')\nclass A {}\ncustomElements.define('helix-tag', B)\nwindow.customElements.define('my-tag', C)\n",
            SourceType::ts(),
        )
        .expect("parses");
        assert_eq!(template.defines, ["helix-card-root", "helix-tag"]);
    }
}
