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
    Class, ClassElement, Declaration, Decorator, Expression, Function, MethodDefinitionKind,
    ObjectPropertyKind, PropertyKey, Statement, TSAccessibility,
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
    /// What this class extends, nearest first: each mixin wrapping it, then the
    /// base class at the end.
    pub heritage: Vec<Superclass>,
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
    /// The attribute this field is backed by, where `@property` gives it one.
    pub attribute: Option<String>,
    /// Whether the property writes itself back onto the host.
    pub reflects: bool,
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

/// The heritage clause read as a chain, nearest link first.
///
/// **A mixin is a link rather than a wrapper to see past.** `extends
/// MixinControllerChecked(MixinField(HelixFormElement))` gives Checkbox members
/// from all three, and the manifest lists them in that order: the outermost
/// mixin is the nearest thing to the class, the base class is the furthest, and
/// that is the prototype chain written down.
///
/// Read from the outside in, so the call's callee comes before its argument.
fn chain_of(expression: &Expression<'_>, into: &mut Vec<String>) {
    match expression {
        Expression::Identifier(name) => into.push(name.name.to_string()),
        Expression::CallExpression(call) => {
            if let Expression::Identifier(name) = &call.callee {
                into.push(name.name.to_string());
            }
            for argument in &call.arguments {
                if let Some(inner) = argument.as_expression() {
                    chain_of(inner, into);
                }
            }
        }
        _ => {}
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

/// One field, as far as its own syntax says.
fn field_of(
    property: &oxc_ast::ast::PropertyDefinition<'_>,
    name: String,
    source: &str,
    documented: Documented,
) -> Member {
    let (attribute, reflects) = attribute_of(&property.decorators, &name);
    Member {
        attribute,
        default: property
            .value
            .as_ref()
            .map(|one| slice(source, one.span().start, one.span().end)),
        documented,
        is_static: property.r#static,
        kind: "field",
        name,
        parameters: Vec::new(),
        privacy: privacy_of(property.accessibility, &property.key),
        readonly: property.readonly,
        reflects,
        returns: None,
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
    }
}

/// One method or accessor, as far as its own syntax says.
fn method_of(
    method: &oxc_ast::ast::MethodDefinition<'_>,
    name: String,
    source: &str,
    documented: Documented,
) -> Member {
    /* **A getter is a readonly field, not a method.** What a consumer reaches
    through `element.caret` is a value, and the manifest describes the
    surface rather than how it is implemented. A setter is the same field
    from the other side, so it carries no `readonly`. */
    let accessor = matches!(
        method.kind,
        MethodDefinitionKind::Get | MethodDefinitionKind::Set
    );
    let reading = matches!(method.kind, MethodDefinitionKind::Get);
    let annotation = |one: &oxc_ast::ast::TSTypeAnnotation<'_>| {
        slice(
            source,
            one.type_annotation.span().start,
            one.type_annotation.span().end,
        )
    };
    Member {
        attribute: None,
        default: None,
        documented,
        is_static: method.r#static,
        kind: if accessor { "field" } else { "method" },
        name,
        parameters: if accessor {
            Vec::new()
        } else {
            parameters_of(&method.value, source)
        },
        privacy: privacy_of(method.accessibility, &method.key),
        readonly: reading,
        reflects: false,
        returns: if accessor {
            None
        } else {
            Some(
                method
                    .value
                    .return_type
                    .as_ref()
                    .map_or_else(|| "void".to_owned(), |one| annotation(one)),
            )
        },
        type_text: if reading {
            method.value.return_type.as_ref().map(|one| annotation(one))
        } else {
            None
        },
    }
}

/// What a class body declares, in the order it is written.
fn members_of(class: &Class<'_>, source: &str, docs: &Attached) -> Vec<Member> {
    let mut found = Vec::new();
    for element in &class.body.body {
        /* A decorated member's block sits above the decorator, so the offset to
        ask about is the whole element's rather than the name's. */
        let at = element.span().start;
        let documented = docs.get(&at).cloned().unwrap_or_default();
        match element {
            ClassElement::PropertyDefinition(property) => {
                let Some(name) = key_of(&property.key, source) else {
                    continue;
                };
                if reimplements(property.r#override, property.r#static)
                    || FRAMEWORK.contains(&name.as_str())
                {
                    continue;
                }
                found.push(field_of(property, name, source, documented));
            }
            ClassElement::MethodDefinition(method) => {
                let Some(name) = key_of(&method.key, source) else {
                    continue;
                };
                /* **A constructor is not a member.** It is how an instance comes
                to exist rather than something on one, and a consumer of a
                custom element never calls it: the platform does, from
                markup. The analyzer publishes none. */
                if matches!(method.kind, MethodDefinitionKind::Constructor)
                    || reimplements(method.r#override, method.r#static)
                    || FRAMEWORK.contains(&name.as_str())
                {
                    continue;
                }
                found.push(method_of(method, name, source, documented));
            }
            _ => {}
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

/// What a `@property` decorator says about the attribute behind a field.
///
/// **The field's own name unless the decorator says otherwise.** `@property()`
/// on `label` is the `label` attribute; a camel-cased field is given its
/// kebab-cased attribute explicitly here rather than left to the framework's
/// lowercasing, so this reads what was written and invents nothing.
///
/// `attribute: false` is a field that is not an attribute at all: a property a
/// consumer sets in JavaScript and cannot write in markup.
fn attribute_of(
    decorators: &oxc_allocator::Vec<'_, Decorator<'_>>,
    field: &str,
) -> (Option<String>, bool) {
    for decorator in decorators {
        let Expression::CallExpression(call) = &decorator.expression else {
            continue;
        };
        let Expression::Identifier(name) = &call.callee else {
            continue;
        };
        if name.name != "property" {
            continue;
        }
        let mut attribute = Some(field.to_owned());
        let mut reflects = false;
        if let Some(Expression::ObjectExpression(options)) =
            call.arguments.first().and_then(|one| one.as_expression())
        {
            for property in &options.properties {
                let ObjectPropertyKind::ObjectProperty(property) = property else {
                    continue;
                };
                let key = property.key.static_name().unwrap_or_default().to_string();
                match (key.as_str(), &property.value) {
                    ("attribute", Expression::StringLiteral(written)) => {
                        attribute = Some(written.value.to_string());
                    }
                    ("attribute", Expression::BooleanLiteral(said)) if !said.value => {
                        attribute = None;
                    }
                    ("reflect", Expression::BooleanLiteral(said)) => reflects = said.value,
                    _ => {}
                }
            }
        }
        return (attribute, reflects);
    }
    (None, false)
}

/// Whether a member is a reimplementation rather than an addition.
///
/// **An instance member written `override` is not API and the analyzer drops
/// it.** `protected override willUpdate` reimplements what the class was given;
/// it adds nothing a consumer can reach that was not reachable already, and
/// `willUpdate` appears nowhere in a tier of two hundred and twenty-nine
/// modules that declare it constantly.
///
/// **A static one is kept**, because it is not a reimplementation of anything
/// an instance has: `static override shadowRootOptions` is configuration on the
/// class, and all twenty-six in the headless tier are in the manifest.
fn reimplements(is_override: bool, is_static: bool) -> bool {
    is_override && !is_static
}

/// Members that belong to Lit rather than to the component.
///
/// **`styles` is the framework's static, not published API.** A consumer
/// reaches a component's appearance through its parts and custom properties,
/// never by reading `HelixBadge.styles`, and the analyzer runs in `LitElement`
/// mode and drops it: 139 classes declare `static override styles` and not one
/// of them has it in the manifest. `shadowRootOptions` and `tier` are static
/// and overridden too and are both kept, so this is about the name rather than
/// about being static.
const FRAMEWORK: [&str; 1] = ["styles"];

/// The name and kind of a declaration, where it has a name to give.
fn named(
    declaration: &Declaration<'_>,
    source: &str,
    docs: &Attached,
    imported: &BTreeMap<String, String>,
) -> Vec<Declared> {
    match declaration {
        Declaration::ClassDeclaration(class) => class
            .id
            .as_ref()
            .map(|id| Declared {
                documented: Documented::default(),
                kind: "class",
                tag_name: tag_of(class),
                members: members_of(class, source, docs),
                name: id.name.to_string(),
                heritage: class.super_class.as_ref().map_or_else(Vec::new, |one| {
                    let mut names = Vec::new();
                    chain_of(one, &mut names);
                    names
                        .into_iter()
                        .map(|name| Superclass {
                            from: imported.get(&name).cloned(),
                            name,
                        })
                        .collect()
                }),
            })
            .into_iter()
            .collect(),
        Declaration::FunctionDeclaration(function) => function
            .id
            .as_ref()
            .map(|id| Declared {
                heritage: Vec::new(),
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
                    heritage: Vec::new(),
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
