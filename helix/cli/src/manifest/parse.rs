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
    /// A function's parameters, for a declaration that is one.
    pub parameters: Vec<Parameter>,
    /// Its return annotation.
    pub returns: Option<String>,
    /// The annotation on a variable, which the manifest carries as written.
    pub type_text: Option<String>,
    /// A variable's value, which is its default.
    pub default: Option<String>,
    /// Whether the analyzer counts this class as a custom element.
    ///
    /// **A tag is the usual answer and not the only one.** `HelixElement
    /// extends LitElement` registers nothing and is still an element to the
    /// analyzer, which reads Lit's own base as the mark of one. It is the
    /// single case in the library, and the rule is kept as narrow as the
    /// evidence: extending that class by name, and nothing further down.
    pub is_element: bool,
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

/// One parameter, as the manifest carries it.
#[derive(Clone, Debug)]
pub struct Parameter {
    pub name: String,
    /// The annotation written on it.
    pub type_text: Option<String>,
    /// **Whether it may be left out**, which the manifest says out loud for the
    /// same reason an optional property does: it describes what a caller may
    /// pass rather than how the signature is punctuated.
    pub optional: bool,
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
    pub parameters: Vec<Parameter>,
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

/// The same, on one line whatever the source did.
///
/// **For a default and for nothing else.** A default spanning six lines of an
/// options object is one value and the manifest writes it as one: the breaks
/// and the indentation are the file's formatting rather than anything about the
/// value. Applying it to every sliced field instead, which was the first try,
/// took sandbox from exact to thirty-eight differences in one run: a wrapped
/// union's type text keeps its shape, and so does a description.
fn one_line(source: &str, start: u32, end: u32) -> String {
    let text = slice(source, start, end);
    let mut said = String::with_capacity(text.len());
    let mut spaced = false;
    for one in text.chars() {
        if one.is_whitespace() {
            spaced = true;
            continue;
        }
        if spaced && !said.is_empty() {
            said.push(' ');
        }
        spaced = false;
        said.push(one);
    }
    said
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
    /* **A negative number is a number.** `at = -1` is a unary minus over a
    literal rather than a literal, and reading only the literal left six
    fields in the library with no type at all. */
    if let Expression::UnaryExpression(unary) = value {
        return inferred(&unary.argument);
    }
    match value {
        Expression::StringLiteral(_) | Expression::TemplateLiteral(_) => Some("string"),
        Expression::NumericLiteral(_) => Some("number"),
        Expression::BooleanLiteral(_) => Some("boolean"),
        _ => None,
    }
}

/// An arrow's parameters, which read the same way a method's do.
fn parameters_of_arrow(
    arrow: &oxc_ast::ast::ArrowFunctionExpression<'_>,
    source: &str,
) -> Vec<Parameter> {
    arrow
        .params
        .items
        .iter()
        .filter_map(|one| {
            let name = one.pattern.get_binding_identifier()?.name.to_string();
            Some(Parameter {
                name,
                optional: one.optional,
                type_text: one.type_annotation.as_ref().map(|two| {
                    slice(
                        source,
                        two.type_annotation.span().start,
                        two.type_annotation.span().end,
                    )
                }),
            })
        })
        .collect()
}

/// A parameter as the manifest carries it: its name and the type written on it.
fn parameters_of(method: &Function<'_>, source: &str) -> Vec<Parameter> {
    method
        .params
        .items
        .iter()
        .filter_map(|one| {
            let name = one.pattern.get_binding_identifier()?.name.to_string();
            Some(Parameter {
                name,
                optional: one.optional,
                type_text: one.type_annotation.as_ref().map(|two| {
                    slice(
                        source,
                        two.type_annotation.span().start,
                        two.type_annotation.span().end,
                    )
                }),
            })
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

/// The name a heritage clause ends at, which is the base class.
fn base_name(expression: &Expression<'_>) -> Option<String> {
    let mut chain = Vec::new();
    chain_of(expression, &mut chain);
    chain.pop()
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

/// Whether an initializer is a value to print rather than work to do.
///
/// **A literal, a list or an object.** Those are what a reader wants to see
/// beside a name, and the analyzer records them. A call is not: `styles =
/// createSheet(…)` printed its whole stylesheet into the manifest before this,
/// and `HighlightStyle.define([…])` printed eighty lines of theme.
///
/// Measured across the four tiers: 11 literals, 4 arrays and 3 objects carry a
/// default, against 155 variables that carry none. Two do not fit, one call and
/// one `new`, and they stay unfitted rather than have the rule bent to reach
/// them.
fn is_a_value(expression: &Expression<'_>) -> bool {
    matches!(
        expression,
        Expression::StringLiteral(_)
            | Expression::TemplateLiteral(_)
            | Expression::NumericLiteral(_)
            | Expression::BooleanLiteral(_)
            | Expression::NullLiteral(_)
            | Expression::ArrayExpression(_)
            | Expression::ObjectExpression(_)
    )
}

/// What a constructor assigns to each field it fills.
///
/// **A field declared without a value still has one.** `private readonly host:
/// …` with `this.host = host` in the constructor reads as having no default
/// until the constructor is read, and the analyzer records `host`: the
/// expression as written, which is what every other default here is.
fn assigned(class: &Class<'_>, source: &str) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for element in &class.body.body {
        let ClassElement::MethodDefinition(method) = element else {
            continue;
        };
        if !matches!(method.kind, MethodDefinitionKind::Constructor) {
            continue;
        }
        let Some(body) = &method.value.body else {
            continue;
        };
        for statement in &body.statements {
            let Statement::ExpressionStatement(said) = statement else {
                continue;
            };
            let Expression::AssignmentExpression(assignment) = &said.expression else {
                continue;
            };
            let Some(target) = assignment.left.as_member_expression() else {
                continue;
            };
            if !matches!(target.object(), Expression::ThisExpression(_)) {
                continue;
            }
            let Some(field) = target.static_property_name() else {
                continue;
            };
            /* **A name or a thing constructed, and nothing else.** `this.host
            = host` records `host`, the parameter a reader sees in the
            signature above, and `this.dismisser = new DismissController(…)`
            records what was built. `this.target = options.target` and
            `this.internals = this.attachInternals()` are work rather than
            values, and the analyzer records neither: reaching into an
            argument and calling a method are steps, not defaults. */
            if !matches!(
                assignment.right,
                Expression::Identifier(_) | Expression::NewExpression(_)
            ) {
                continue;
            }
            found.insert(
                field.to_string(),
                one_line(
                    source,
                    assignment.right.span().start,
                    assignment.right.span().end,
                ),
            );
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
    assigned: &BTreeMap<String, String>,
) -> Member {
    let (attribute, reflects) = attribute_of(&property.decorators, &name);
    Member {
        attribute,
        /* **A function is not a default.** A field holding an arrow is a
        handler bound to the instance, and printing its body as the field's
        default value puts thirty lines of implementation into a reference
        page where a reader expected `''` or `0`. The analyzer prints none,
        and neither does this. */
        /* **A field's default is a value, on the same terms a variable's is.**
           A literal, a list, an object, a thing constructed, or a name: `=
           undefined` and `= FAILED_LABEL` are both values a reader can follow,
           and a negative number is a number however it is spelled.
           `1 / 30` is arithmetic and `new Float32Array(27).fill(1)` is a call
           over a construction, and the analyzer prints neither: what a reader
           wants beside a name is what it starts as, not the sum that reaches
           it. */
        default: property
            .value
            .as_ref()
            .filter(|one| {
                is_a_value(one)
                    || matches!(
                        one,
                        Expression::NewExpression(_)
                            | Expression::Identifier(_)
                            | Expression::UnaryExpression(_)
                    )
            })
            .map(|one| one_line(source, one.span().start, one.span().end))
            .or_else(|| assigned.get(&name).cloned()),
        documented,
        is_static: property.r#static,
        kind: "field",
        name,
        parameters: Vec::new(),
        privacy: privacy_of(property.accessibility, &property.key),
        readonly: property.readonly,
        reflects,
        returns: None,
        /* **An optional property says `| undefined` out loud.** `name?: string`
        can hold one, and the manifest describes what a reader may find there
        rather than what the declaration looks like, so the `?` is written
        into the type it stands for. */
        type_text: property
            .type_annotation
            .as_ref()
            .map(|one| {
                let written = slice(
                    source,
                    one.type_annotation.span().start,
                    one.type_annotation.span().end,
                );
                if property.optional {
                    format!("{written} | undefined")
                } else {
                    written
                }
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
    is_element: bool,
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
    let name_for_type = name.clone();
    let (attribute, reflects) = if accessor {
        attribute_of(&method.decorators, &name)
    } else {
        (None, false)
    };
    Member {
        attribute,
        reflects,
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
        } else if accessor {
            /* **A setter's type is what it takes**, which is the same value the
            getter beside it returns: `set index(next: number)` makes `index`
            a `number`, and what a consumer assigns is the whole of what the
            field is. Falling through to the signature branch instead
            published `index(next: number) => void` as the type of a field,
            which is the method a consumer never calls. */
            method
                .value
                .params
                .items
                .first()
                .and_then(|one| one.type_annotation.as_ref())
                .map(|one| annotation(one))
        } else if is_element && privacy_of(method.accessibility, &method.key).is_none() {
            /* **A public method carries its signature and a hidden one does
            not.** Measured across the four tiers: 3,287 private and
            protected methods and not one with a type, against 445 public
            ones that have it. What a consumer can call is described; what
            they cannot is merely listed. */
            let taken: Vec<String> = parameters_of(&method.value, source)
                .into_iter()
                .map(|one| match one.type_text {
                    Some(text) => format!("{}: {text}", one.name),
                    None => one.name,
                })
                .collect();
            let returns = method
                .value
                .return_type
                .as_ref()
                .map_or_else(|| "void".to_owned(), |one| annotation(one));
            Some(format!(
                "{}({}) => {returns}",
                name_for_type,
                taken.join(", ")
            ))
        } else {
            None
        },
    }
}

/// What a class body declares, in the order it is written.
fn members_of(class: &Class<'_>, source: &str, docs: &Attached, is_element: bool) -> Vec<Member> {
    let filled = assigned(class, source);
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
                if FRAMEWORK.contains(&name.as_str()) {
                    continue;
                }
                found.push(field_of(property, name, source, documented, &filled));
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
                    || FRAMEWORK.contains(&name.as_str())
                {
                    continue;
                }
                let read = method_of(method, name, source, documented, is_element);
                /* **A getter and its setter are one field.** What a consumer
                reaches is a value they can read and write, not two members
                with one name, and the manifest carries one: the pair is
                merged into whichever arrived first, each half contributing
                what it alone knows. A setter is also the only half that can
                be assigned, so the field stops being readonly the moment one
                exists. */
                if read.kind == "field" {
                    if let Some(already) = found
                        .iter_mut()
                        .find(|one| one.name == read.name && one.kind == "field")
                    {
                        already.readonly = already.readonly && read.readonly;
                        if already.type_text.is_none() {
                            already.type_text = read.type_text;
                        }
                        if already.documented.description.is_none() {
                            already.documented = read.documented;
                        }
                        if already.attribute.is_none() {
                            already.attribute = read.attribute;
                            already.reflects = read.reflects;
                        }
                        continue;
                    }
                }
                found.push(read);
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

/// The class a mixin's body declares, where the arrow given is one.
///
/// **A mixin is a function that makes a class.** `export const MixinChartSource
/// = <T>(Base: T) => { class ChartSourceElement extends Base { … } return … }`
/// publishes what that inner class has, and the manifest calls the whole thing
/// a `mixin` rather than a function: what a consumer gets is the members, not
/// the call.
fn mixin_class<'a>(arrow: &'a oxc_ast::ast::ArrowFunctionExpression<'a>) -> Option<&'a Class<'a>> {
    arrow
        .body
        .statements
        .iter()
        .find_map(|statement| match statement {
            Statement::ClassDeclaration(class) => Some(&**class),
            _ => None,
        })
}

/// The declarations one `const`, `let` or `var` statement makes.
///
/// One statement, several names: `export const a = 1, b = 2` is two entries in
/// the manifest and one node here.
fn variables_of(
    variable: &oxc_ast::ast::VariableDeclaration<'_>,
    source: &str,
    docs: &Attached,
) -> Vec<Declared> {
    variable
        .declarations
        .iter()
        .filter_map(|one| {
            let id = one.id.get_binding_identifier()?;
            /* **A const holding an arrow is a function.** `export const
            highlight = (code: string) => …` is called like one and the
            manifest says so, with its parameters and its return: how it
            was bound is the author's business rather than the
            consumer's. */
            let arrow = match one.init.as_ref() {
                Some(Expression::ArrowFunctionExpression(arrow)) => Some(arrow),
                _ => None,
            };
            /* **A mixin is a function that makes a class**, and what a
            consumer gets from it is that class's members rather than the call.
            The manifest names the whole thing a `mixin` for that reason. */
            let makes = arrow.and_then(|two| mixin_class(two));
            Some(Declared {
                heritage: Vec::new(),
                members: makes
                    .map_or_else(Vec::new, |class| members_of(class, source, docs, false)),
                kind: match (arrow, makes) {
                    (_, Some(_)) => "mixin",
                    (Some(_), None) => "function",
                    (None, None) => "variable",
                },
                tag_name: None,
                name: id.name.to_string(),
                parameters: arrow.map_or_else(Vec::new, |two| parameters_of_arrow(two, source)),
                /* A mixin has no return: what it hands back is the class whose
                members are listed above, and naming its type again would be
                saying the same thing twice. */
                returns: arrow.filter(|_| makes.is_none()).map(|two| {
                    two.return_type.as_ref().map_or_else(
                        || "void".to_owned(),
                        |three| {
                            slice(
                                source,
                                three.type_annotation.span().start,
                                three.type_annotation.span().end,
                            )
                        },
                    )
                }),
                /* A const's value is its default, and its type is the
                   annotation or, failing that, what the literal is. The
                   same reading a field gets, for the same reason: a value
                   written `0.05` has a type without anyone saying so. */
                /* **Only a literal is a default here.** `MAX_FRAME_STEP =
                   0.05` has a value worth printing; `styles =
                   createSheet(\`…\`)` has a call, and printing it puts a
                   whole stylesheet into a reference page, which is what it
                   did for four of sandbox's modules before this. */
                default: one
                    .init
                    .as_ref()
                    .filter(|two| is_a_value(two))
                    .map(|two| one_line(source, two.span().start, two.span().end)),
                type_text: one
                    .type_annotation
                    .as_ref()
                    .map(|two| {
                        slice(
                            source,
                            two.type_annotation.span().start,
                            two.type_annotation.span().end,
                        )
                    })
                    .or_else(|| {
                        if arrow.is_some() {
                            None
                        } else {
                            one.init.as_ref().and_then(inferred).map(ToOwned::to_owned)
                        }
                    }),
                ..Declared::default()
            })
        })
        .collect()
}

/// Members the framework owns, which the analyzer drops and this drops with it.
///
/// **Measured by name, because the rule is by name.** An earlier reading of
/// this had it as "an instance member written `override` is not API", which
/// fitted the evidence to hand and was wrong twice over: `override focus` is
/// kept twelve times and `static override styles` is dropped a hundred and
/// forty-one, so neither `override` nor `static` decides anything. Reading
/// every override in the four tiers against the manifests separates them
/// cleanly by name and by nothing else.
///
/// Dropped: the Lit lifecycle and the platform callbacks a component
/// reimplements to do its work. Kept, and deliberately not here: `focus`, which
/// is a thing a consumer calls; `tier` and `shadowRootOptions`, which say
/// something about the element rather than run it.
///
/// **Only names measured as dropped are listed.** Lit has more lifecycle than
/// this and no component here overrides it, so adding those would be a guess,
/// and the diff is what will say if one ever does.
const FRAMEWORK: [&str; 10] = [
    "connectedCallback",
    "createRenderRoot",
    "disconnectedCallback",
    "dispatchEvent",
    "firstUpdated",
    "render",
    "styles",
    "update",
    "updated",
    "willUpdate",
];

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
                default: None,
                documented: Documented::default(),
                /* **A tag is the usual mark of an element and not the only
                one.** `HelixElement extends LitElement` registers nothing and
                the analyzer counts it as one anyway, reading Lit's own base as
                the mark. One case in the library, so the rule is as narrow as
                the evidence: that class by name and nothing further down. */
                is_element: tag_of(class).is_some()
                    || class.super_class.as_ref().and_then(base_name).as_deref()
                        == Some("LitElement"),
                kind: "class",
                parameters: Vec::new(),
                returns: None,
                type_text: None,
                tag_name: tag_of(class),
                members: members_of(class, source, docs, tag_of(class).is_some()),
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
                default: None,
                heritage: Vec::new(),
                is_element: false,
                kind: "function",
                parameters: parameters_of(function, source),
                returns: Some(function.return_type.as_ref().map_or_else(
                    || "void".to_owned(),
                    |one| {
                        slice(
                            source,
                            one.type_annotation.span().start,
                            one.type_annotation.span().end,
                        )
                    },
                )),
                type_text: None,
                tag_name: None,
                name: id.name.to_string(),
                ..Declared::default()
            })
            .into_iter()
            .collect(),
        /* One statement, several declarations: `export const a = 1, b = 2` is
        two entries in the manifest and one node here. */
        Declaration::VariableDeclaration(variable) => variables_of(variable, source, docs),
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
