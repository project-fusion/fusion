//! One node of a builder-form tree, printed as its JSX element.

use std::fmt::Write as _;

use oxc_ast::ast::{CallExpression, Expression, ObjectExpression, ObjectPropertyKind};
use oxc_span::GetSpan;

use super::js::{camel, identifier, key, number, quoted};
use super::tree::{call, callee, child_comment, Printer, RENAMED, SHAPES, TAGS};
use crate::family::api::rendered::natural;
use crate::family::read::{self, Lit};

/// An attribute as printed: its name as written, its value, and the
/// comments that stood above it.
struct Attribute {
    name: String,
    /// `None` for a bare flag, `disabled`.
    value: Option<String>,
    comments: Vec<String>,
}

/// What an element is printed from: its attributes, the CSS custom
/// properties it sets, and the words it says.
#[derive(Default)]
struct Element {
    attributes: Vec<Attribute>,
    style: Vec<(String, String, Vec<String>)>,
    says: Option<String>,
}

/// The helpers whose node holds children of its own, or a fallback.
const HOLDS: &[&str] = &["box", "layer", "pressable", "region", "repeat", "wrap"];

impl Printer<'_, '_> {
    /// One node, with the comments that stood before its attributes, which
    /// are printed among the nodes before it.
    pub(super) fn node(
        &mut self,
        expression: &Expression,
        indent: usize,
    ) -> Result<(Vec<String>, String), String> {
        let call = call(expression).ok_or_else(|| {
            self.at(
                expression.span().start,
                "a node that is not a call to a helper",
            )
        })?;
        let helper = callee(call);
        let lit = read::expression(self.source, expression)?;
        let (name, fields) = match &lit {
            Lit::Call(_, arguments) => match arguments.as_slice() {
                [Lit::Text(name)] => (name.clone(), Vec::new()),
                [Lit::Text(name), Lit::Object(fields), ..] => (name.clone(), fields.clone()),
                _ => return Err(self.at(call.span.start, "a node names its part first")),
            },
            _ => return Err(self.at(call.span.start, "a node that is not a call to a helper")),
        };
        let tag = self.tag(&helper, &fields, call.span.start)?;
        self.used.insert(tag.clone());
        let object = call
            .arguments
            .get(1)
            .and_then(|one| one.as_expression())
            .map(strip);
        let mut before = Vec::new();
        let first_end = call
            .arguments
            .first()
            .map_or(call.span.start, |one| one.span().end);
        let attributes_start = object.map_or(first_end, |one| one.span().start);
        for comment in self.comments.take(call.span.start, attributes_start) {
            before.push(child_comment(&comment, indent));
        }
        let mut element = Element::default();
        let named = if helper == "region" { "name" } else { "part" };
        if helper != "region" || name != "default" {
            element.attributes.push(Attribute {
                comments: Vec::new(),
                name: named.to_owned(),
                value: Some(attribute_text(&name)),
            });
        }
        if let Some(Expression::ObjectExpression(written)) = object {
            before.extend(self.attributes(&helper, written, &fields, indent, &mut element)?);
        }
        let inner = self.held(&helper, call, indent)?;
        if let Some(line) = self
            .comments
            .left(call.span.start, call.span.end, self.source)
        {
            return Err(format!(
                "line {line}: a comment inside a node the printer has no place for"
            ));
        }
        Ok((before, written(&tag, element, &inner, indent)))
    }

    /// The tag a helper's node is.
    fn tag(&self, helper: &str, fields: &[(String, Lit)], at: u32) -> Result<String, String> {
        let field = |key: &str| {
            fields
                .iter()
                .find(|(name, _)| name == key)
                .map(|(_, value)| value)
        };
        match helper {
            "box" => match field("shape") {
                Some(Lit::Text(shape)) => SHAPES
                    .iter()
                    .find(|(written, _)| written == shape)
                    .map(|(_, tag)| (*tag).to_owned())
                    .ok_or_else(|| self.at(at, &format!("the shape `{shape}`"))),
                _ if field("viewBox").is_some() => Ok("Svg".to_owned()),
                _ => Ok("View".to_owned()),
            },
            other => TAGS
                .iter()
                .find(|(written, _)| *written == other)
                .map(|(_, tag)| (*tag).to_owned())
                .ok_or_else(|| self.at(at, &format!("the helper `{other}()`"))),
        }
    }

    /// Each attribute of a node's object, with the comments above it, and
    /// the comments after the last, which stand before the node.
    fn attributes(
        &mut self,
        helper: &str,
        written: &ObjectExpression,
        fields: &[(String, Lit)],
        indent: usize,
        element: &mut Element,
    ) -> Result<Vec<String>, String> {
        let mut at = written.span.start;
        for property in &written.properties {
            let ObjectPropertyKind::ObjectProperty(property) = property else {
                return Err(self.at(written.span.start, "a spread among a node's attributes"));
            };
            let Some(name) = property.key.static_name() else {
                return Err(self.at(property.span.start, "a computed attribute"));
            };
            let comments: Vec<String> = self
                .comments
                .take(at, property.span.end)
                .iter()
                .map(|comment| format!("{}{}", " ".repeat(indent + 2), comment.block(indent + 2)))
                .collect();
            at = property.span.end;
            let value = fields
                .iter()
                .find(|(held, _)| *held == name)
                .map(|(_, value)| value.clone())
                .ok_or_else(|| {
                    self.at(property.span.start, "an attribute the reader did not keep")
                })?;
            let has_href = fields.iter().any(|(held, _)| held == "href");
            self.attribute(helper, &name, &value, comments, has_href, element)
                .map_err(|why| self.at(property.span.start, &why))?;
        }
        Ok(self
            .comments
            .take(at, written.span.end)
            .iter()
            .map(|comment| child_comment(comment, indent))
            .collect())
    }

    /// One attribute, in the JSX form's spelling.
    fn attribute(
        &mut self,
        helper: &str,
        name: &str,
        value: &Lit,
        comments: Vec<String>,
        has_href: bool,
        element: &mut Element,
    ) -> Result<(), String> {
        let silent = |comments: &[String], what: &str| {
            if comments.is_empty() {
                Ok(())
            } else {
                Err(format!(
                    "a comment on {what}, which the JSX form writes no attribute for"
                ))
            }
        };
        let (written, printed) = match (helper, name, value) {
            ("box", "shape", _) => return silent(&comments, "a shape"),
            ("text" | "live", "says", _) => {
                silent(&comments, "the words a node says")?;
                element.says = Some(format!("{{{}}}", self.inner(value)?));
                return Ok(());
            }
            ("region", "name", _) => {
                return Err(
                    "a slot's attribute named `name`, which the JSX form names the slot by"
                        .to_owned(),
                )
            }
            (other, "part", _) if other != "region" => {
                return Err(
                    "an attribute named `part`, which the JSX form names the node by".to_owned(),
                )
            }
            (_, "sends", Lit::Text(event)) => {
                self.given.insert("send".to_owned());
                ("onPress", Some(format!("{{send.{}}}", camel(event))))
            }
            ("wrap", "while", Lit::Bool(true)) if !has_href => {
                return silent(&comments, "a wrap's `while`")
            }
            ("wrap" | "live" | "box", "while" | "hidden", value) => {
                self.slots = matches!((helper, name), ("wrap", "while") | ("box", "hidden"));
                let printed = self.value(value);
                self.slots = false;
                (if name == "while" { "when" } else { "hidden" }, printed?)
            }
            (_, custom, value) if custom.starts_with("--") => {
                let printed = self.inner(value)?;
                element.style.push((custom.to_owned(), printed, comments));
                return Ok(());
            }
            (_, written, value) => {
                let renamed = RENAMED
                    .iter()
                    .find(|(builder, _)| *builder == written)
                    .map_or(written, |(_, jsx)| *jsx);
                if !(identifier(renamed) || renamed.split('-').all(identifier)) {
                    return Err(format!(
                        "an attribute named `{renamed}`, which JSX cannot name"
                    ));
                }
                (renamed, self.value(value)?)
            }
        };
        element.attributes.push(Attribute {
            comments,
            name: written.to_owned(),
            value: printed,
        });
        Ok(())
    }

    /// What a node holds: its children, or a slot's fallback.
    fn held(
        &mut self,
        helper: &str,
        call: &CallExpression,
        indent: usize,
    ) -> Result<Vec<String>, String> {
        let Some(children) = call.arguments.get(2) else {
            return Ok(Vec::new());
        };
        if !HOLDS.contains(&helper) {
            return Err(self.at(call.span.start, "a node that holds nothing given children"));
        }
        let Some(Expression::ArrayExpression(array)) = children.as_expression().map(strip) else {
            return Err(self.at(children.span().start, "a node's children are an array"));
        };
        self.children(
            &array.elements,
            array.span.start,
            array.span.end,
            indent + 2,
        )
    }

    /// A name the builder form binds, as the read a render writes for it:
    /// `props.x`, `derived.x`, `state.x`, a feature's value, or, where a
    /// slot may be read, `slots.x`.
    pub(super) fn read(&mut self, name: &str, slot: bool) -> Result<String, String> {
        let (given, path) = if self.names.props.contains(name) {
            ("props".to_owned(), format!("props.{}", camel(name)))
        } else if self.names.derived.contains(name) {
            ("derived".to_owned(), format!("derived.{}", camel(name)))
        } else if self.names.states.contains(name) {
            ("state".to_owned(), format!("state.{}", camel(name)))
        } else if let Some(path) = self.names.computed.get(name) {
            (
                path.split('.').next().unwrap_or_default().to_owned(),
                path.clone(),
            )
        } else if (slot || self.slots) && self.names.regions.contains(name) {
            ("slots".to_owned(), format!("slots.{}", camel(name)))
        } else {
            return Err(format!(
                "the tree reads `{name}`, which is no prop, computed value, state, or value of a feature"
            ));
        };
        if read::kebab(&camel(name)) != name && !self.names.computed.contains_key(name) {
            return Err(format!(
                "`{name}` does not come back from its camelCase name"
            ));
        }
        self.given.insert(given);
        Ok(path)
    }

    /// An attribute's value, `None` for a bare flag.
    fn value(&mut self, value: &Lit) -> Result<Option<String>, String> {
        Ok(match value {
            Lit::Bool(true) => None,
            Lit::Text(text) => Some(attribute_text(text)),
            other => Some(format!("{{{}}}", self.inner(other)?)),
        })
    }

    /// A value inside braces: an attribute's, an object's, or the words a
    /// node says.
    fn inner(&mut self, value: &Lit) -> Result<String, String> {
        Ok(match value {
            Lit::Bool(flag) => flag.to_string(),
            Lit::Text(text) => quoted(text),
            Lit::Number(value) => number(*value),
            Lit::Call(helper, arguments) => self.helper(helper, arguments)?,
            Lit::Object(fields) => {
                let mut entries = Vec::new();
                for (name, value) in fields {
                    entries.push(format!("{}: {}", key(name), self.inner(value)?));
                }
                format!("{{ {} }}", entries.join(", "))
            }
            other => {
                return Err(format!(
                    "a value the JSX form has no spelling for: {other:?}"
                ))
            }
        })
    }

    /// A builder helper's value: a read, a negated read, a field of a
    /// repeat's entry, its index, a derivation, or a pick.
    fn helper(&mut self, helper: &str, arguments: &[Lit]) -> Result<String, String> {
        Ok(match (helper, arguments) {
            ("bind", [Lit::Text(name)]) => self.read(name, false)?,
            ("not", [Lit::Text(name)]) => format!("!{}", self.read(name, false)?),
            ("field", [Lit::Text(name)]) => {
                self.given.insert("entry".to_owned());
                if identifier(name) {
                    format!("entry.{name}")
                } else {
                    format!("entry[{}]", quoted(name))
                }
            }
            ("index", []) => {
                self.given.insert("index".to_owned());
                "index".to_owned()
            }
            ("derive", [Lit::Text(name)]) => {
                self.used.insert("derive".to_owned());
                format!("derive({})", quoted(name))
            }
            ("pick", [Lit::Text(name), Lit::Object(values), Lit::Text(otherwise)]) => {
                self.pick(name, values, otherwise)?
            }
            _ => {
                return Err(format!(
                    "a value the JSX form has no spelling for: `{helper}()`"
                ))
            }
        })
    }

    /// `pick(name, { value: words }, otherwise)` as `read ? 'a' : 'b'`, or as
    /// a test of each value in turn.
    fn pick(
        &mut self,
        name: &str,
        values: &[(String, Lit)],
        otherwise: &str,
    ) -> Result<String, String> {
        let read = self.read(name, false)?;
        if let [(only, Lit::Text(picked))] = values {
            if only == "true" {
                return Ok(format!(
                    "{read} ? {} : {}",
                    quoted(picked),
                    quoted(otherwise)
                ));
            }
        }
        let mut written = String::new();
        for (value, picked) in values {
            let Lit::Text(picked) = picked else {
                return Err(format!(
                    "a pick of `{name}` gives a value that is not a string"
                ));
            };
            let literal = match value.as_str() {
                "true" | "false" => value.clone(),
                other => quoted(other),
            };
            let _ = write!(written, "{read} === {literal} ? {} : ", quoted(picked));
        }
        written.push_str(&quoted(otherwise));
        Ok(written)
    }
}

/// An element as written: its open tag with each attribute, one a line
/// where it has two or more, and what it says or holds.
fn written(tag: &str, mut element: Element, inner: &[String], indent: usize) -> String {
    if !element.style.is_empty() {
        let pad = " ".repeat(indent + 4);
        let mut comments = Vec::new();
        let mut entries = Vec::new();
        for (name, value, above) in std::mem::take(&mut element.style) {
            comments.extend(above);
            entries.push(format!("{pad}{}: {value},", quoted(&name)));
        }
        element.attributes.push(Attribute {
            comments,
            name: "style".to_owned(),
            value: Some(format!(
                "{{{{\n{}\n{}}}}}",
                entries.join("\n"),
                " ".repeat(indent + 2)
            )),
        });
    }
    element.attributes.sort_by(|a, b| natural(&a.name, &b.name));
    let pad = " ".repeat(indent);
    let flat = element.attributes.len() <= 1
        && element.attributes.iter().all(|one| {
            one.comments.is_empty() && !one.value.as_deref().unwrap_or_default().contains('\n')
        });
    let mut open = format!("{pad}<{tag}");
    for attribute in &element.attributes {
        if flat {
            open.push(' ');
        } else {
            for comment in &attribute.comments {
                open.push('\n');
                open.push_str(comment);
            }
            open.push('\n');
            open.push_str(&" ".repeat(indent + 2));
        }
        open.push_str(&attribute.name);
        if let Some(value) = &attribute.value {
            open.push('=');
            open.push_str(value);
        }
    }
    if !flat {
        open.push('\n');
        open.push_str(&pad);
    }
    match (element.says, inner.is_empty(), flat) {
        (Some(words), _, true) => format!("{open}>{words}</{tag}>"),
        (Some(words), _, false) => format!("{open}>\n{pad}  {words}\n{pad}</{tag}>"),
        (None, true, true) => format!("{open} />"),
        (None, true, false) => format!("{open}/>"),
        (None, false, _) => format!("{open}>\n{}\n{pad}</{tag}>", inner.join("\n")),
    }
}

/// An attribute's string: in quotes where JSX reads it as written, and as
/// a string in braces otherwise.
fn attribute_text(text: &str) -> String {
    let plain = text.chars().all(|one| {
        !matches!(
            one,
            '"' | '\\' | '{' | '}' | '<' | '>' | '&' | '\n' | '\r' | '\t'
        )
    });
    if plain {
        format!("\"{text}\"")
    } else {
        format!("{{{}}}", quoted(text))
    }
}

/// An expression without the parentheses around it.
fn strip<'a, 'b>(expression: &'b Expression<'a>) -> &'b Expression<'a> {
    match expression {
        Expression::ParenthesizedExpression(inner) => strip(&inner.expression),
        other => other,
    }
}
