//! What one source declares, read from its syntax.
//!
//! **A parser and not a type system, which is the whole feasibility argument.**
//! The analyzer this is measured against calls `ts.createSourceFile` and never
//! builds a `Program` or a `TypeChecker`, and neither do any of its plugins, so
//! what reaches the manifest is what somebody wrote rather than what it
//! resolves to. That is the difference between a project and a research
//! programme, and it is why a Rust parser is enough.
//!
//! **The policy that rests on it is now held by a rule.** `resolved` refuses an
//! attribute whose type is a name these sources do not define as a union of
//! literals, so the annotations this reads are ones a reader of the text can
//! resolve. Nothing was holding that true before, which is how three arrived
//! that a parser could not have followed.

use std::collections::{BTreeMap, BTreeSet};

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Class, ClassElement, Declaration, Expression, Function, MethodDefinitionKind, PropertyKey,
    Statement, TSAccessibility,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType};

use crate::manifest::jsdoc::{self, Documented};

/// One thing a module declares, as far as this layer reads it.
#[derive(Debug, Default)]
pub struct Declared {
    /// `class`, `function` or `variable`, which is the manifest's vocabulary.
    pub kind: &'static str,
    pub name: String,
    /// The class this one extends, and where that name was imported from.
    pub superclass: Option<Superclass>,
    /// What the class body declares, in the order it is written.
    pub members: Vec<Member>,
    /// The doc block above it, read the way the manifest reads one.
    pub documented: Documented,
    /// The tag it registers, where it registers one.
    ///
    /// **What makes a class a component.** Several of the library's plugins ask
    /// only about declarations that have one, so a controller and an element
    /// are told apart by this and not by being classes.
    pub tag_name: Option<String>,
}

/// A base class, and where the name binding it came from.
#[derive(Clone, Debug)]
pub struct Superclass {
    pub name: String,
    /// The specifier the name was imported by, absent where it was declared in
    /// the same file and so needs no saying.
    pub from: Option<String>,
}

/// One entry in a class body.
#[derive(Debug, Default)]
pub struct Member {
    /// `field` or `method`, which is the manifest's vocabulary for these.
    pub kind: &'static str,
    pub name: String,
    /// The annotation as written, which is what the manifest carries: the
    /// analyzer records the text rather than what it resolves to, and so does
    /// this. `resolved` is what keeps that text worth reading.
    pub type_text: Option<String>,
    /// The initializer as written, for a field that has one.
    pub default: Option<String>,
    pub privacy: Option<&'static str>,
    pub is_static: bool,
    pub readonly: bool,
    /// The return annotation of a method, which the manifest carries apart from
    /// any type of its own: a method has `return` and `parameters` where a field
    /// has `type`, and giving a method both would invent a field it never had.
    pub returns: Option<String>,
    pub parameters: Vec<(String, Option<String>)>,
    /// The doc block above it.
    pub documented: Documented,
}

/// Every doc block in a source, by the offset of what it is written above.
///
/// **oxc says what a comment attaches to**, which saves guessing from distance:
/// a block above a decorated property attaches to the property whatever sits
/// between them, and a block separated by a blank line attaches to nothing.
type Attached = BTreeMap<u32, Documented>;

/// The source a span covers, which is how the manifest's text fields are made.
fn slice(source: &str, start: u32, end: u32) -> String {
    source
        .get(start as usize..end as usize)
        .unwrap_or_default()
        .trim()
        .to_owned()
}

/// The name a class element is keyed by, where it is a plain one.
fn key_of(key: &PropertyKey<'_>, source: &str) -> Option<String> {
    match key {
        PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
        PropertyKey::PrivateIdentifier(id) => Some(format!("#{}", id.name)),
        PropertyKey::StringLiteral(one) => Some(one.value.to_string()),
        /* A computed key is an expression, and what it evaluates to is a
        runtime question. The analyzer takes the text; so does this. */
        other => other
            .as_expression()
            .map(|one| slice(source, one.span().start, one.span().end)),
    }
}

/// The type a literal initializer gives a field that carries no annotation.
///
/// **Inference a parser can do, which is the only kind involved here.** A field
/// written `value = ''` has a type and no annotation, and the analyzer records
/// `string`: that is the literal's own kind rather than anything resolved, so
/// reading it needs no checker. Anything whose type is a question about other
/// code, a call or an identifier, is left without one, which is what the
/// analyzer does too.
fn inferred(value: &Expression<'_>) -> Option<&'static str> {
    match value {
        Expression::StringLiteral(_) | Expression::TemplateLiteral(_) => Some("string"),
        Expression::NumericLiteral(_) => Some("number"),
        Expression::BooleanLiteral(_) => Some("boolean"),
        _ => None,
    }
}

/// A parameter as the manifest carries it: its name and the type written on it.
fn parameters_of(method: &Function<'_>, source: &str) -> Vec<(String, Option<String>)> {
    method
        .params
        .items
        .iter()
        .filter_map(|one| {
            let name = one.pattern.get_binding_identifier()?.name.to_string();
            let written = one.type_annotation.as_ref().map(|two| {
                slice(
                    source,
                    two.type_annotation.span().start,
                    two.type_annotation.span().end,
                )
            });
            Some((name, written))
        })
        .collect()
}

/// What a member says about who may reach it.
///
/// The keyword where there is one, and `#` where the platform says it instead:
/// a hard-private field is private by a stronger rule than a keyword, so
/// recording it as anything else would understate it.
fn privacy_of(
    accessibility: Option<TSAccessibility>,
    key: &PropertyKey<'_>,
) -> Option<&'static str> {
    if matches!(key, PropertyKey::PrivateIdentifier(_)) {
        return Some("private");
    }
    match accessibility {
        Some(TSAccessibility::Private) => Some("private"),
        Some(TSAccessibility::Protected) => Some("protected"),
        Some(TSAccessibility::Public) => Some("public"),
        None => None,
    }
}

/// The class a heritage clause names, with any mixins taken off.
///
/// **A mixin is a call and the class is its argument.** `extends
/// MixinDismissible(HelixElement)` extends `HelixElement`: what the mixin adds
/// is a shape rather than a base, and the analyzer records the innermost name.
/// Unwrapped rather than matched, so a second mixin around the first is read
/// the same way as the first.
fn base_of(expression: &Expression<'_>) -> Option<String> {
    match expression {
        Expression::Identifier(name) => Some(name.name.to_string()),
        Expression::CallExpression(call) => call
            .arguments
            .iter()
            .find_map(|one| one.as_expression().and_then(base_of)),
        _ => None,
    }
}

/// Where each imported name came from, by the specifier that brought it in.
fn imports(program: &oxc_ast::ast::Program<'_>) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for statement in &program.body {
        let Statement::ImportDeclaration(import) = statement else {
            continue;
        };
        let from = import.source.value.to_string();
        for specifier in import.specifiers.iter().flatten() {
            found.insert(specifier.local().name.to_string(), from.clone());
        }
    }
    found
}

/// The tag a class registers, read from its `@customElement` decorator.
///
/// The one string argument, as written. A decorator called with anything else
/// is left alone: what it registers would be a runtime question, and the
/// analyzer does not answer those either.
fn tag_of(class: &Class<'_>) -> Option<String> {
    for decorator in &class.decorators {
        let Expression::CallExpression(call) = &decorator.expression else {
            continue;
        };
        let Expression::Identifier(name) = &call.callee else {
            continue;
        };
        if name.name != "customElement" {
            continue;
        }
        if let [argument] = call.arguments.as_slice() {
            if let Some(Expression::StringLiteral(tag)) = argument.as_expression() {
                return Some(tag.value.to_string());
            }
        }
    }
    None
}

/// What a class body declares, in the order it is written.
fn members_of(class: &Class<'_>, source: &str, docs: &Attached) -> Vec<Member> {
    let mut found = Vec::new();
    for element in &class.body.body {
        /* A decorated member's block sits above the decorator, so the offset to
        ask about is the whole element's rather than the name's. */
        let at = element.span().start;
        match element {
            ClassElement::PropertyDefinition(property) => {
                let Some(name) = key_of(&property.key, source) else {
                    continue;
                };
                found.push(Member {
                    documented: docs.get(&at).cloned().unwrap_or_default(),
                    parameters: Vec::new(),
                    returns: None,
                    default: property
                        .value
                        .as_ref()
                        .map(|one| slice(source, one.span().start, one.span().end)),
                    is_static: property.r#static,
                    kind: "field",
                    name,
                    privacy: privacy_of(property.accessibility, &property.key),
                    readonly: property.readonly,
                    type_text: property
                        .type_annotation
                        .as_ref()
                        .map(|one| {
                            slice(
                                source,
                                one.type_annotation.span().start,
                                one.type_annotation.span().end,
                            )
                        })
                        .or_else(|| {
                            property
                                .value
                                .as_ref()
                                .and_then(inferred)
                                .map(ToOwned::to_owned)
                        }),
                });
            }
            ClassElement::MethodDefinition(method) => {
                let Some(name) = key_of(&method.key, source) else {
                    continue;
                };
                /* **A getter is a readonly field, not a method.** What a
                consumer reaches through `element.caret` is a value, and the
                manifest describes the surface rather than how it is
                implemented: the analyzer records `kind: field`, `readonly`,
                and the type from the return annotation. A setter is the same
                field from the other side, so it carries no `readonly` and
                takes its type from the parameter. */
                let accessor = matches!(
                    method.kind,
                    MethodDefinitionKind::Get | MethodDefinitionKind::Set
                );
                let reading = matches!(method.kind, MethodDefinitionKind::Get);
                found.push(Member {
                    documented: docs.get(&at).cloned().unwrap_or_default(),
                    is_static: method.r#static,
                    kind: if accessor { "field" } else { "method" },
                    name,
                    privacy: privacy_of(method.accessibility, &method.key),
                    parameters: if accessor {
                        Vec::new()
                    } else {
                        parameters_of(&method.value, source)
                    },
                    readonly: reading,
                    returns: if accessor {
                        None
                    } else {
                        Some(method.value.return_type.as_ref().map_or_else(
                            || "void".to_owned(),
                            |one| {
                                slice(
                                    source,
                                    one.type_annotation.span().start,
                                    one.type_annotation.span().end,
                                )
                            },
                        ))
                    },
                    type_text: if reading {
                        method.value.return_type.as_ref().map(|one| {
                            slice(
                                source,
                                one.type_annotation.span().start,
                                one.type_annotation.span().end,
                            )
                        })
                    } else {
                        None
                    },
                    ..Member::default()
                });
            }
            _ => {}
        }
    }
    found
}

/// The name and kind of a declaration, where it has a name to give.
fn named(
    declaration: &Declaration<'_>,
    source: &str,
    docs: &Attached,
    imported: &BTreeMap<String, String>,
) -> Vec<Declared> {
    match declaration {
        Declaration::ClassDeclaration(class) => {
            class
                .id
                .as_ref()
                .map(|id| Declared {
                    documented: Documented::default(),
                    kind: "class",
                    tag_name: tag_of(class),
                    members: members_of(class, source, docs),
                    name: id.name.to_string(),
                    superclass: class.super_class.as_ref().and_then(base_of).map(|name| {
                        Superclass {
                            from: imported.get(&name).cloned(),
                            name,
                        }
                    }),
                })
                .into_iter()
                .collect()
        }
        Declaration::FunctionDeclaration(function) => function
            .id
            .as_ref()
            .map(|id| Declared {
                kind: "function",
                tag_name: None,
                name: id.name.to_string(),
                ..Declared::default()
            })
            .into_iter()
            .collect(),
        /* One statement, several declarations: `export const a = 1, b = 2` is
        two entries in the manifest and one node here. */
        Declaration::VariableDeclaration(variable) => variable
            .declarations
            .iter()
            .filter_map(|one| {
                one.id.get_binding_identifier().map(|id| Declared {
                    kind: "variable",
                    tag_name: None,
                    name: id.name.to_string(),
                    ..Declared::default()
                })
            })
            .collect(),
        /* A type alias and an interface declare nothing at runtime, and the
        manifest is a description of what a consumer can reach through the
        platform. The analyzer emits neither, and neither does this. */
        _ => Vec::new(),
    }
}

/// The block above a statement, given to the one declaration it describes.
///
/// A statement declaring several names has one block above it and it belongs to
/// none of them in particular, so it is given only where there is one to give
/// it to.
///
/// **Two offsets are tried, because a decorator moves the anchor.** A block
/// above `@customElement(…)` attaches to the decorator rather than to the
/// `export` below it, so every component class in the library read as having no
/// description at all until the decorator's own offset was asked for too.
fn carrying(mut declared: Vec<Declared>, docs: &Attached, at: &[u32]) -> Vec<Declared> {
    let found = at.iter().find_map(|one| docs.get(one));
    if let ([one], Some(block)) = (declared.as_mut_slice(), found) {
        one.documented = block.clone();
    }
    declared
}

/// Where a declaration's doc block may be anchored, nearest first.
fn anchors(statement: &Statement<'_>, declaration: Option<&Declaration<'_>>) -> Vec<u32> {
    let mut at = Vec::new();
    if let Some(Declaration::ClassDeclaration(class)) = declaration {
        if let Some(first) = class.decorators.first() {
            at.push(first.span.start);
        }
        at.push(class.span.start);
    }
    at.push(statement.span().start);
    at
}

/// Everything a source exports, in the order it is written.
///
/// **Exported only.** A manifest speaks for a package's surface, so a helper a
/// module keeps to itself is not in it.
///
/// **And a declaration is exported by either route.** `export const EDGES` says
/// it inline; `const EDGES` at the top with `export { EDGES }` at the bottom
/// says it just as well, and `ScrollArea` is written the second way. Reading
/// only the first route dropped it, which the diff found and nothing else
/// would have: one declaration missing from a tier of two hundred and
/// twenty-nine modules.
///
/// **Source order, not export order.** `EDGES` is declared on line 6 and
/// exported on line 241, and the analyzer lists it first, where it is written.
pub fn declarations(source: &str, path: &str) -> Vec<Declared> {
    let allocator = Allocator::default();
    let kind = SourceType::from_path(path).unwrap_or_else(|_| SourceType::ts());
    let parsed = Parser::new(&allocator, source, kind).parse();

    /* The names a bare `export { … }` carries, gathered first because one at the
    foot of the file speaks for a declaration at its head. */
    let mut exported: BTreeSet<String> = BTreeSet::new();
    for statement in &parsed.program.body {
        if let Statement::ExportNamedDeclaration(export) = statement {
            if export.declaration.is_none() {
                for specifier in &export.specifiers {
                    exported.insert(specifier.local.name().to_string());
                }
            }
        }
    }

    /* Read once, keyed by what oxc says each block sits above. */
    let mut docs: Attached = BTreeMap::new();
    for comment in &parsed.program.comments {
        let text = slice(source, comment.span.start, comment.span.end);
        /* Only a doc block. A plain block comment is a note to a maintainer
        rather than API, and the analyzer publishes neither. */
        if text.starts_with("/**") {
            docs.insert(comment.attached_to, jsdoc::read(&text));
        }
    }

    let imported = imports(&parsed.program);
    let mut found = Vec::new();
    for statement in &parsed.program.body {
        match statement {
            Statement::ExportNamedDeclaration(export) => {
                if let Some(declaration) = &export.declaration {
                    found.extend(carrying(
                        named(declaration, source, &docs, &imported),
                        &docs,
                        &anchors(statement, Some(declaration)),
                    ));
                }
            }
            /* A declaration standing on its own, kept only where something
            below exports it by name. */
            other => {
                if let Some(declaration) = other.as_declaration() {
                    found.extend(
                        carrying(
                            named(declaration, source, &docs, &imported),
                            &docs,
                            &anchors(statement, Some(declaration)),
                        )
                        .into_iter()
                        .filter(|one| exported.contains(&one.name)),
                    );
                }
            }
        }
    }
    found
}
