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

use std::collections::BTreeSet;

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Class, ClassElement, Declaration, Expression, Function, MethodDefinitionKind, PropertyKey,
    Statement, TSAccessibility,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType};

/// One thing a module declares, as far as this layer reads it.
#[derive(Debug, Default)]
pub struct Declared {
    /// `class`, `function` or `variable`, which is the manifest's vocabulary.
    pub kind: &'static str,
    pub name: String,
    /// The class this one extends, where it extends one by name.
    pub superclass: Option<String>,
    /// What the class body declares, in the order it is written.
    pub members: Vec<Member>,
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
}

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

/// What a class body declares, in the order it is written.
fn members_of(class: &Class<'_>, source: &str) -> Vec<Member> {
    let mut found = Vec::new();
    for element in &class.body.body {
        match element {
            ClassElement::PropertyDefinition(property) => {
                let Some(name) = key_of(&property.key, source) else {
                    continue;
                };
                found.push(Member {
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
fn named(declaration: &Declaration<'_>, source: &str) -> Vec<Declared> {
    match declaration {
        Declaration::ClassDeclaration(class) => class
            .id
            .as_ref()
            .map(|id| Declared {
                kind: "class",
                members: members_of(class, source),
                name: id.name.to_string(),
                superclass: class
                    .super_class
                    .as_ref()
                    .map(|one| slice(source, one.span().start, one.span().end)),
            })
            .into_iter()
            .collect(),
        Declaration::FunctionDeclaration(function) => function
            .id
            .as_ref()
            .map(|id| Declared {
                kind: "function",
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

    let mut found = Vec::new();
    for statement in &parsed.program.body {
        match statement {
            Statement::ExportNamedDeclaration(export) => {
                if let Some(declaration) = &export.declaration {
                    found.extend(named(declaration, source));
                }
            }
            /* A declaration standing on its own, kept only where something
            below exports it by name. */
            other => {
                if let Some(declaration) = other.as_declaration() {
                    found.extend(
                        named(declaration, source)
                            .into_iter()
                            .filter(|one| exported.contains(&one.name)),
                    );
                }
            }
        }
    }
    found
}
