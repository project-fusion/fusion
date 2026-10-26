//! A builder-form part tree, printed as the JSX a `render` returns.
//!
//! Each node is read with the compiler's reader for its values, and walked
//! as syntax for its comments, so a comment among the nodes is printed among
//! them as `{/* ... */}`, and one among a node's attributes before the
//! attribute it stood above.

use std::collections::{BTreeMap, BTreeSet};

use oxc_ast::ast::{ArrayExpressionElement, CallExpression, Expression};
use oxc_span::GetSpan;

use super::comments::{Comment, Comments};

/// Each builder helper's tag, where it is one tag.
pub(super) const TAGS: &[(&str, &str)] = &[
    ("image", "Image"),
    ("layer", "Layer"),
    ("live", "Announce"),
    ("pressable", "Pressable"),
    ("region", "Slot"),
    ("repeat", "Repeat"),
    ("text", "Text"),
    ("wrap", "Wrap"),
];

/// A box's shape inside a vector, and its tag.
pub(super) const SHAPES: &[(&str, &str)] = &[
    ("circle", "Circle"),
    ("ellipse", "Ellipse"),
    ("line", "Line"),
    ("path", "Path"),
    ("rect", "Rect"),
];

/// Each attribute the JSX form spells another way, as the reader maps it.
pub(super) use crate::family::read::RENAMED;

/// What a render reads, by the name the builder form binds.
pub struct Names {
    pub props: BTreeSet<String>,
    pub derived: BTreeSet<String>,
    pub states: BTreeSet<String>,
    /// Each value a feature computes, by its name, with the path it is read at.
    pub computed: BTreeMap<String, String>,
    /// The slots the tree holds.
    pub regions: BTreeSet<String>,
}

/// What printing a tree needs as it goes.
pub struct Printer<'s, 'c> {
    pub source: &'s str,
    pub comments: &'c mut Comments,
    pub names: Names,
    /// What the render takes from its parameter.
    pub given: BTreeSet<String>,
    /// The tags and helpers the render names, to import.
    pub used: BTreeSet<String>,
    /// Whether the value being printed may read a slot: a wrap's `while`
    /// and a box's `hidden`.
    pub slots: bool,
}

/// A child as printed: its lines, and what it is, for a choice of two.
struct Child {
    text: String,
    /// `(name, unless, node)` of a node drawn while a read holds, with the
    /// node's own text, so a `when` and an `unless` of one read side by
    /// side are written as one choice.
    choice: Option<(String, bool, String)>,
}

impl Printer<'_, '_> {
    /// The children of a node, or the top of a tree, one item apiece.
    pub fn children(
        &mut self,
        items: &[ArrayExpressionElement],
        from: u32,
        to: u32,
        indent: usize,
    ) -> Result<Vec<String>, String> {
        let mut printed: Vec<Child> = Vec::new();
        let mut at = from;
        for item in items {
            let Some(expression) = item.as_expression() else {
                return Err(self.at(item.span().start, "a spread among the nodes"));
            };
            for comment in self.comments.take(at, expression.span().start) {
                printed.push(Child {
                    choice: None,
                    text: child_comment(&comment, indent),
                });
            }
            let (before, child) = self.item(expression, indent)?;
            printed.extend(before.into_iter().map(|text| Child { choice: None, text }));
            printed.push(child);
            at = expression.span().end;
        }
        for comment in self.comments.take(at, to) {
            printed.push(Child {
                choice: None,
                text: child_comment(&comment, indent),
            });
        }
        /* A `when` and an `unless` of one read side by side are a choice. */
        let mut lines = Vec::new();
        let mut index = 0;
        while index < printed.len() {
            if let (Some((name, unless, yes)), Some(Some((other, other_unless, no)))) = (
                &printed[index].choice,
                printed.get(index + 1).map(|next| &next.choice),
            ) {
                if name == other && unless != other_unless {
                    let test = if *unless {
                        format!("!{name}")
                    } else {
                        name.clone()
                    };
                    let pad = " ".repeat(indent);
                    lines.push(format!(
                        "{pad}{{{test} ? (\n{yes}\n{pad}) : (\n{no}\n{pad})}}"
                    ));
                    index += 2;
                    continue;
                }
            }
            lines.push(printed[index].text.clone());
            index += 1;
        }
        Ok(lines)
    }

    pub(super) fn at(&self, offset: u32, why: &str) -> String {
        let line = self.source[..offset as usize].matches('\n').count() + 1;
        format!("line {line}: {why}")
    }

    /// One item of a children array: a node, or a node drawn while reads
    /// hold, with the comments that stood inside the condition before it.
    fn item(
        &mut self,
        expression: &Expression,
        indent: usize,
    ) -> Result<(Vec<String>, Child), String> {
        let mut tests = Vec::new();
        let mut before = Vec::new();
        let mut current = expression;
        loop {
            let call = call(current).ok_or_else(|| {
                self.at(
                    current.span().start,
                    "a node that is not a call to a helper",
                )
            })?;
            let helper = callee(call);
            if helper != "when" && helper != "unless" {
                break;
            }
            let [name, node] = call.arguments.as_slice() else {
                return Err(self.at(call.span.start, "`when()` takes a name and a node"));
            };
            let Some(Expression::StringLiteral(name)) = name.as_expression() else {
                return Err(self.at(call.span.start, "`when()` takes a name first"));
            };
            let node = node
                .as_expression()
                .ok_or_else(|| self.at(call.span.start, "a spread in `when()`"))?;
            for comment in self.comments.take(call.span.start, node.span().start) {
                before.push(child_comment(&comment, indent));
            }
            let read = self.read(&name.value, false)?;
            tests.push((read, helper == "unless"));
            current = node;
        }
        if tests.is_empty() {
            let (comments, text) = self.node(current, indent)?;
            before.extend(comments);
            return Ok((before, Child { choice: None, text }));
        }
        let pad = " ".repeat(indent);
        let (comments, node) = self.node(current, indent + 2)?;
        before.extend(comments);
        let test = tests
            .iter()
            .map(|(read, unless)| {
                if *unless {
                    format!("!{read}")
                } else {
                    read.clone()
                }
            })
            .collect::<Vec<_>>()
            .join(" && ");
        let choice = match tests.as_slice() {
            [(read, unless)] => Some((read.clone(), *unless, node.clone())),
            _ => None,
        };
        Ok((
            before,
            Child {
                choice,
                text: format!("{pad}{{{test} && (\n{node}\n{pad})}}"),
            },
        ))
    }
}

/// The call an expression is, through parentheses.
pub(super) fn call<'a, 'b>(expression: &'b Expression<'a>) -> Option<&'b CallExpression<'a>> {
    match expression {
        Expression::CallExpression(call) => Some(call),
        Expression::ParenthesizedExpression(inner) => call(&inner.expression),
        _ => None,
    }
}

/// A call's helper, by name.
pub(super) fn callee(call: &CallExpression) -> String {
    match &call.callee {
        Expression::Identifier(name) => name.name.to_string(),
        _ => String::new(),
    }
}

/// A comment among the nodes, as `{/* ... */}` at `indent`.
pub(super) fn child_comment(comment: &Comment, indent: usize) -> String {
    format!("{}{{{}}}", " ".repeat(indent), comment.block(indent + 1))
}
