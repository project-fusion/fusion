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
    ArrowFunctionBody, Class, ClassElement, Declaration, Decorator, Expression, Function,
    MethodDefinitionKind, ObjectPropertyKind, PropertyKey, Statement, TSAccessibility,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType, Span};

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
    /// Events the class is seen to dispatch, as the type and, where the call
    /// says one, the name.
    pub dispatched: Vec<(String, Option<String>)>,
    /// Classes whose stylesheet this one took outright.
    ///
    /// **Borrowing a stylesheet is not inheritance, not a mixin and not a
    /// part, and no manifest field has a name for it.** `HelixCopyButton`
    /// writes `static override styles = [HelixIconButton.styles, styles]`, so
    /// the rules reading `--icon-button-size` really are in its shadow root,
    /// because it put them there. Nothing in the class relationship says so,
    /// and the three hooks would be missing from its page.
    ///
    /// Only a direct `X.styles` reads as one. Anything computed is left alone
    /// rather than guessed at: a hook wrongly attributed reads as API and is
    /// worse than one that is missing, because a consumer sets it and nothing
    /// happens.
    pub borrows: Vec<String>,
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
    /// The initializer written on it, which stands in a signature too:
    /// `markRead(next = true) => boolean`.
    pub default: Option<String>,
}

/// Whether a field may be assigned, and what said so.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Readonly {
    #[default]
    No,
    /// The `readonly` keyword, read before the description.
    Modifier,
    /// A getter with no setter, read after it.
    Accessor,
}

/// A field's default and type as the source wrote them.
///
/// **Kept because the attribute is generated from the field as written.** A
/// field initialized from a constant beside it publishes the constant's value,
/// and the attribute mirroring that field publishes the constant's name: the
/// analyzer says `'Not sent'` on `failedLabel` and `FAILED_LABEL` on
/// `failed-label`, and gives the attribute no type where the field's came from
/// the constant too.
#[derive(Clone, Debug, Default)]
pub struct Written {
    pub default: Option<String>,
    pub type_text: Option<String>,
}

/// One entry in a class body.
#[derive(Debug, Default)]
pub struct Member {
    /// `field` or `method`, which is the manifest's vocabulary for these.
    pub kind: &'static str,
    pub name: String,
    /// What the field wrote, where resolving a constant replaced it.
    pub written: Option<Written>,
    /// The annotation as written, which is what the manifest carries: the
    /// analyzer records the text rather than what it resolves to, and so does
    /// this. `resolved` is what keeps that text worth reading.
    pub type_text: Option<String>,
    /// The initializer as written, for a field that has one.
    pub default: Option<String>,
    pub privacy: Option<&'static str>,
    pub is_static: bool,
    /// Whether the default came from the constructor rather than the field.
    pub assigned: bool,
    /// Whether the field may be assigned, and what says so.
    ///
    /// **The two are not interchangeable, because they are read at different
    /// moments.** A `readonly` modifier is read with the other modifiers,
    /// before the field's description; a getter is called readonly by the pass
    /// over accessors, after it. Seventy fields in core say so and not one goes
    /// the other way.
    pub readonly: Readonly,
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

/// The expression a type assertion wraps, which is the value itself.
fn unwrapped<'a>(expression: &'a Expression<'a>) -> &'a Expression<'a> {
    match expression {
        Expression::TSAsExpression(said) => unwrapped(&said.expression),
        other => other,
    }
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
///
/// **A list is its own type, spelled the way it was written.** `INTERACTIONS`
/// is `['native', 'light', 'shadow', 'ripple', 'none']` and the analyzer gives
/// it that same text as its type, which reads oddly beside `string` and is what
/// it does. The text is the source's own, line breaks and all: `SHAPES` runs
/// down eleven lines and its type keeps them, while its default is the same
/// list on one. An object is `object`, its fields being a shape nobody wrote
/// down.
///
/// **A template literal is nothing at all**, which has to be said rather than
/// assumed: `FRAGMENT` is a shader in backticks, and the analyzer gives it a
/// default with no type beside it. Calling it `string`, which was the first
/// try, invented one.
fn inferred(value: &Expression<'_>, source: &str) -> Option<String> {
    /* **A negative number is a number.** `at = -1` is a unary minus over a
    literal rather than a literal, and reading only the literal left six
    fields in the library with no type at all. */
    if let Expression::UnaryExpression(unary) = value {
        return inferred(&unary.argument, source);
    }
    match value {
        Expression::StringLiteral(_) => Some("string".to_owned()),
        Expression::NumericLiteral(_) => Some("number".to_owned()),
        Expression::BooleanLiteral(_) => Some("boolean".to_owned()),
        Expression::ObjectExpression(_) => Some("object".to_owned()),
        Expression::ArrayExpression(_) => Some(slice(source, value.span().start, value.span().end)),
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
        .map(|one| parameter(one, source))
        .collect()
}

/// One formal parameter, read the same way wherever it is written.
///
/// **A pattern is named by its own text.** `arranged(…, { query, spec })`
/// destructures, and there is no identifier to report, so the manifest gives
/// the pattern as written, line breaks and all, where the source wrapped it.
/// Reading only identifiers dropped those parameters entirely.
///
/// **A default is the initializer's text**, whatever shape it is: `{}`,
/// `this.text`, `true`. Not the value-only rule a field's default follows,
/// which would have dropped `this.text`.
fn parameter(one: &oxc_ast::ast::FormalParameter<'_>, source: &str) -> Parameter {
    Parameter {
        name: one.pattern.get_binding_identifier().map_or_else(
            || slice(source, one.pattern.span().start, one.pattern.span().end),
            |id| id.name.to_string(),
        ),
        type_text: one.type_annotation.as_ref().map(|two| {
            slice(
                source,
                two.type_annotation.span().start,
                two.type_annotation.span().end,
            )
        }),
        optional: one.optional,
        default: one
            .initializer
            .as_ref()
            .map(|two| one_line(source, two.span().start, two.span().end)),
    }
}

/// A parameter as the manifest carries it: its name and the type written on it.
fn parameters_of(method: &Function<'_>, source: &str) -> Vec<Parameter> {
    method
        .params
        .items
        .iter()
        .map(|one| parameter(one, source))
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

/// A method's signature as the manifest writes it.
///
/// **One place, because it is written from two.** A signature is made where a
/// method is declared and again where an inherited one lands on an element, and
/// the two have to agree character for character: when the question mark for an
/// optional parameter went in, it had to go into both, and the next such change
/// would have to as well. The parameters arrive already rendered because the
/// two callers hold different things, a parsed member on one side and a value
/// read back out of a manifest on the other.
pub fn signature(name: &str, parameters: &[String], returns: &str) -> String {
    format!("{name}({}) => {returns}", parameters.join(", "))
}

/// Whether an initializer is a value to print rather than work to do.
///
/// **A literal, a list or an object.** Those are what a reader wants to see
/// beside a name, and the analyzer records them. A call is not: `styles =
/// createSheet(…)` printed its whole stylesheet into the manifest before this,
/// and `HighlightStyle.define([…])` printed eighty lines of theme.
///
/// Measured across the four tiers, and one variable in the library does not
/// fit: `ORB_STATES = Object.keys(ORDER)` carries its call as a default where
/// the other hundred and fifty-four call-initialized variables carry none.
/// What tells it apart is that `Object` is not something the module imported,
/// which is a rule with one case supporting it, so it stays unfitted rather
/// than have this bent to reach it. It is the last thing the four tiers
/// disagree about.
fn is_a_value(expression: &Expression<'_>) -> bool {
    /* **`as const` is a note to the type checker, not part of the value.**
    `['native', 'light', …] as const` is that list, and the manifest prints
    the list: reading the assertion as the expression left eleven shapes and
    five interactions with no default at all.
    *
    **And the assertion is where the analyzer stops looking.** It asks what
    kind the initializer is and takes the text from inside the assertion
    afterwards, so an assertion always passes whatever it wraps: `ORB_STATES =
    Object.keys(ORDER) as readonly OrbState[]` publishes the call that a bare
    `Object.keys(ORDER)` would not. One variable in the library is written that
    way, and it was the last thing the four manifests disagreed about. */
    if matches!(expression, Expression::TSAsExpression(_)) {
        return true;
    }
    matches!(
        expression,
        Expression::StringLiteral(_)
            | Expression::TemplateLiteral(_)
            | Expression::NumericLiteral(_)
            | Expression::BooleanLiteral(_)
            | Expression::NullLiteral(_)
            | Expression::ArrayExpression(_)
            | Expression::ObjectExpression(_)
            /* A thing constructed, a name, and a negative number. Measured on
               fields, where `new Controller(this)`, `= undefined` and `= -1`
               all reach the manifest, and applied to variables as well: the
               analyzer does not distinguish the two and no variable in this
               library is written with a bare name to say whether it would. One
               rule until something says otherwise, rather than two that differ
               where nothing tested them. */
            | Expression::NewExpression(_)
            | Expression::Identifier(_)
            | Expression::UnaryExpression(_)
    )
}

/// What a constructor assigns to each field it fills.
///
/// **A field declared without a value still has one.** `private readonly host:
/// …` with `this.host = host` in the constructor reads as having no default
/// until the constructor is read, and the analyzer records `host`: the
/// expression as written, which is what every other default here is.
/// The same text with every comment blanked, byte for byte.
///
/// Spaces rather than nothing, so every span still reaches the same place.
/// Blanking by character shortened the text wherever a comment held a byte
/// that was not ASCII, and the next span past it read off the end.
fn blanked(source: &str, comments: &[oxc_ast::Comment]) -> String {
    let mut plain: Vec<u8> = source.as_bytes().to_vec();
    for comment in comments {
        let (start, end) = (comment.span.start as usize, comment.span.end as usize);
        for one in plain.get_mut(start..end).unwrap_or_default() {
            if *one != b'\n' {
                *one = b' ';
            }
        }
    }
    String::from_utf8(plain).unwrap_or_else(|_| source.to_owned())
}

/// A tag registered by a call rather than by the decorator.
fn defined(text: &str) -> Vec<Exported> {
    const CALL: &str = "customElements.define(";
    let mut found = Vec::new();
    let mut rest = text;
    while let Some(start) = rest.find(CALL) {
        rest = &rest[start + CALL.len()..];
        let mut said = rest.splitn(3, ',');
        let (Some(tag), Some(target)) = (said.next(), said.next()) else {
            continue;
        };
        let target = target.split(')').next().unwrap_or(target);
        found.push(Exported {
            kind: "custom-element-definition",
            name: tag.trim().to_owned(),
            declaration: target.trim().to_owned(),
            origin: Origin::Own,
        });
    }
    found
}

/// The events a class is seen to dispatch, in the order the calls are written.
///
/// **What the analyzer infers, which is neither what a component declares nor
/// always something with a name.** `this.dispatchEvent(new Event('input', …))`
/// records an event called `input` of type `Event`, and
/// `this.dispatchEvent(new HelixActivateEvent({ value }))` records one of that
/// type with no name at all, the first argument being no help. Only `this` is
/// read: `this.host.dispatchEvent` in a controller records nothing, and the
/// analyzer agrees.
///
/// **Read from the text, with the comments taken out.** The library has no
/// visitor here and the alternative was a walk of every expression form in the
/// language for one pattern. The comments are blanked first, because
/// `helix-element.ts` writes the words inside one; a string holding the same
/// call would be read too, and the library has none.
fn dispatched(source: &str, at: Span) -> Vec<(String, Option<String>)> {
    const CALL: &str = "this.dispatchEvent(";
    let body = &source[at.start as usize..at.end as usize];
    let mut found = Vec::new();
    let mut rest = body;
    while let Some(start) = rest.find(CALL) {
        rest = &rest[start + CALL.len()..];
        let after = rest.trim_start();
        let Some(after) = after.strip_prefix("new") else {
            continue;
        };
        let after = after.trim_start();
        let taken: String = after
            .chars()
            .take_while(|one| one.is_alphanumeric() || *one == '_' || *one == '$')
            .collect();
        if taken.is_empty() {
            continue;
        }
        let after = after[taken.len()..].trim_start();
        let Some(after) = after.strip_prefix('(') else {
            continue;
        };
        let after = after.trim_start();
        let named = ['\'', '"'].into_iter().find_map(|quote| {
            let inside = after.strip_prefix(quote)?;
            let end = inside.find(quote)?;
            Some(inside[..end].to_owned())
        });
        found.push((taken, named));
    }
    found
}

/// The classes whose stylesheet a class took, by the name each is bound to.
fn borrowed(class: &Class<'_>, mine: &str) -> Vec<String> {
    fn walk(value: &Expression<'_>, mine: &str, into: &mut Vec<String>) {
        match value {
            Expression::StaticMemberExpression(access) => {
                match (access.property.name.as_str(), &access.object) {
                    ("styles", Expression::Identifier(named)) => {
                        let name = named.name.to_string();
                        /* A class naming itself is `super.styles` written the
                        long way, and real inheritance is resolved elsewhere. */
                        if name != mine && !into.contains(&name) {
                            into.push(name);
                        }
                    }
                    /* `[X.styles, styles].flat()` reaches here as the `.flat`,
                    whose object is the list the borrow is written in. */
                    _ => walk(&access.object, mine, into),
                }
            }
            Expression::ArrayExpression(items) => {
                for one in &items.elements {
                    if let Some(one) = one.as_expression() {
                        walk(one, mine, into);
                    }
                }
            }
            Expression::CallExpression(call) => walk(&call.callee, mine, into),
            Expression::TSAsExpression(said) => walk(&said.expression, mine, into),
            _ => {}
        }
    }
    let mut found = Vec::new();
    for element in &class.body.body {
        let ClassElement::PropertyDefinition(property) = element else {
            continue;
        };
        if !property.r#static || key_of(&property.key, "").as_deref() != Some("styles") {
            continue;
        }
        if let Some(value) = &property.value {
            walk(value, mine, &mut found);
        }
    }
    found
}

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
    let written = property
        .value
        .as_ref()
        .filter(|one| is_a_value(one))
        .map(|one| {
            let value = unwrapped(one);
            one_line(source, value.span().start, value.span().end)
        });
    Member {
        written: None,
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
        default: written.clone().or_else(|| assigned.get(&name).cloned()),
        /* **Where the value came from, which decides where it is written.** A
        default the field wrote is read before its description and one the
        constructor assigns after it, because the analyzer reads the body first
        and the constructor later. */
        assigned: written.is_none(),
        documented,
        is_static: property.r#static,
        kind: "field",
        name,
        parameters: Vec::new(),
        privacy: privacy_of(property.accessibility, &property.key),
        readonly: if property.readonly {
            Readonly::Modifier
        } else {
            Readonly::No
        },
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
                    .and_then(|two| inferred(unwrapped(two), source))
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
    let (attribute, reflects) = if accessor {
        attribute_of(&method.decorators, &name)
    } else {
        (None, false)
    };
    Member {
        written: None,
        assigned: false,
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
        readonly: if reading {
            Readonly::Accessor
        } else {
            Readonly::No
        },
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
        } else {
            /* **A public method carries its signature and a hidden one does
            not**, and it is written after everything else about the method,
            including after inheritance has stamped it. `sign` writes it, as
            the analyzer writes it in a plugin that runs last: a method taken
            from a class that already had a signature arrives with it, ahead of
            the stamp, and one taken from a mixin gains it afterwards. Written
            here instead, both came out the same way and four of headless's
            methods said so.

            Measured across the four tiers: 3,287 private and protected
            methods and not one with a type, against 445 public ones that have
            it. What a consumer can call is described; what they cannot is
            merely listed. */
            None
        },
    }
}

/// What a class body declares, in the order it is written.
fn members_of(class: &Class<'_>, source: &str, docs: &Attached) -> Vec<Member> {
    let filled = assigned(class, source);
    let mut found = Vec::new();
    for element in &class.body.body {
        /* A decorated member's block sits above the decorator, so the offset to
        ask about is the whole element's rather than the name's. */
        let at = element.span().start;
        let documented = docs.get(&at).cloned().unwrap_or_default();
        /* **`@internal` takes a member out**, which `declaration_of` does once
        the list it belongs to exists: seventeen members in the library carry
        the tag and none is published, `isDisabled` among them, which saying
        out loud would print a row on forty-eight reference pages. */
        match element {
            ClassElement::PropertyDefinition(property) => {
                let Some(name) = key_of(&property.key, source) else {
                    continue;
                };
                /* **A framework name is kept here and dropped later**, because
                the attribute it declares is published even though the member
                is not: Sandbox Preview writes `@property() styles: string`,
                which is its own field and not Lit's static one, and the
                analyzer lists the `styles` attribute with no `styles` member
                beside it. Dropping it at this point lost the attribute too. */
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
                /* A framework name is kept here and dropped later, for the
                same reason a field's is: the list it belongs to exists before
                the plugin that removes it runs, and a class whose body holds
                only `willUpdate` and `render` still has one. */
                if matches!(method.kind, MethodDefinitionKind::Constructor) {
                    continue;
                }
                let read = method_of(method, name, source, documented);
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
                        if read.readonly == Readonly::No {
                            already.readonly = Readonly::No;
                        }
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
    /* A block body, since a concise one returns an expression and declares
    nothing. */
    let ArrowFunctionBody::FunctionBody(body) = &arrow.body else {
        return None;
    };
    body.statements
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
    plain: &str,
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
                /* A mixin's class is where the two surviving inferred events in
                the library are dispatched, the plugin that drops them reaching
                only components. */
                dispatched: makes
                    .map_or_else(Vec::new, |class| dispatched(plain, class.body.span())),
                members: makes.map_or_else(Vec::new, |class| members_of(class, source, docs)),
                kind: match (arrow, makes) {
                    (_, Some(_)) => "mixin",
                    (Some(_), None) => "function",
                    (None, None) => "variable",
                },
                tag_name: None,
                borrows: Vec::new(),
                name: id.name.to_string(),
                parameters: arrow.map_or_else(Vec::new, |two| parameters_of_arrow(two, source)),
                /* A mixin has no return: what it hands back is the class whose
                members are listed above, and naming its type again would be
                saying the same thing twice. */
                /* **A function says what it returns only where it wrote it.**
                A method with no annotation still reads `=> void` in its
                signature, which is the signature's grammar; a plain function
                with none carries no `return` at all. `customElement` is the
                one in the library: its outer arrow hands back another arrow
                and annotates neither, and calling that `void` said the wrong
                thing about it. */
                returns: arrow.filter(|_| makes.is_none()).and_then(|two| {
                    two.return_type.as_ref().map(|three| {
                        slice(
                            source,
                            three.type_annotation.span().start,
                            three.type_annotation.span().end,
                        )
                    })
                }),
                /* A const's value is its default, and its type is the
                   annotation or, failing that, what the literal is. The
                   same reading a field gets, for the same reason: a value
                   written `0.05` has a type without anyone saying so. */
                /* **A value and not a call**, on the same terms a field's
                   default is held to. `MAX_FRAME_STEP = 0.05` is worth
                   printing; `styles = createSheet(\`…\`)` is a call, and
                   printing it put a whole stylesheet into a reference page for
                   four of sandbox's modules before this. */
                default: one.init.as_ref().filter(|two| is_a_value(two)).map(|two| {
                    let value = unwrapped(two);
                    one_line(source, value.span().start, value.span().end)
                }),
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
                            one.init
                                .as_ref()
                                .and_then(|two| inferred(unwrapped(two), source))
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
/// Whether a name is one the framework owns rather than the library.
pub fn framework(name: &str) -> bool {
    FRAMEWORK.contains(&name)
}

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
    plain: &str,
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
                    || class
                        .heritage
                        .as_ref()
                        .and_then(|one| base_name(&one.expression))
                        .as_deref()
                        == Some("LitElement"),
                kind: "class",
                parameters: Vec::new(),
                returns: None,
                type_text: None,
                tag_name: tag_of(class),
                borrows: borrowed(class, &id.name),
                dispatched: dispatched(plain, class.body.span()),
                members: members_of(class, source, docs),
                name: id.name.to_string(),
                heritage: class.heritage.as_ref().map_or_else(Vec::new, |one| {
                    let mut names = Vec::new();
                    chain_of(&one.expression, &mut names);
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
                borrows: Vec::new(),
                dispatched: Vec::new(),
                name: id.name.to_string(),
                ..Declared::default()
            })
            .into_iter()
            .collect(),
        /* One statement, several declarations: `export const a = 1, b = 2` is
        two entries in the manifest and one node here. */
        Declaration::VariableDeclaration(variable) => variables_of(variable, source, plain, docs),
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
        /* A clause naming this module's own, and not one re-exporting another
        module's: `export { hue } from './root.js'` publishes that module's
        `hue`, and a `hue` declared here is still this module's private one. */
        if let Statement::ExportNamedDeclaration(export) = statement {
            for specifier in &export.specifiers {
                exported.insert(specifier.local.name().to_string());
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

    /* The same text with every comment blanked, for the one reader that works
    on characters rather than on nodes. Spaces rather than nothing, so every
    span still lines up with the source it came from. */
    let plain = blanked(source, &parsed.program.comments);

    let imported = imports(&parsed.program);
    let mut found = Vec::new();
    /* Declarations this module keeps to itself, read for their values alone. */
    let mut beside: Vec<Declared> = Vec::new();
    for statement in &parsed.program.body {
        match statement {
            Statement::ExportDeclaration(export) => {
                let declaration = &export.declaration;
                found.extend(carrying(
                    named(declaration, source, &plain, &docs, &imported),
                    &docs,
                    &anchors(statement, Some(declaration)),
                ));
            }
            /* A declaration standing on its own, kept only where something
            below exports it by name. The ones nothing exports are still read,
            because a field may be initialized from one: `const STILL_PHASE =
            1.4` is nobody's API and is `phase`'s default all the same. */
            other => {
                if let Some(declaration) = other.as_declaration() {
                    for one in carrying(
                        named(declaration, source, &plain, &docs, &imported),
                        &docs,
                        &anchors(statement, Some(declaration)),
                    ) {
                        if exported.contains(&one.name) {
                            found.push(one);
                        } else {
                            beside.push(one);
                        }
                    }
                }
            }
        }
    }
    resolve(&mut found, &beside);
    found
}

/// A field initialized from a constant beside it, given the constant's value.
///
/// **A name is not what a default is.** `failedLabel = FAILED_LABEL` publishes
/// `'Not sent'` and a type of `string`, because a reader of the reference page
/// learns nothing from the name of a constant they cannot see. Six fields in
/// the library are written this way and all six are resolved; no default
/// naming a constant declared in the same module is left standing.
///
/// Only a constant in the same module, which is as far as a parser can see.
/// The type follows the value, and only where the field wrote none of its own.
fn resolve(found: &mut [Declared], beside: &[Declared]) {
    let known: BTreeMap<String, (Option<String>, Option<String>)> = found
        .iter()
        .chain(beside)
        .filter(|one| one.kind == "variable")
        .map(|one| {
            (
                one.name.clone(),
                (one.default.clone(), one.type_text.clone()),
            )
        })
        .collect();
    for declaration in found.iter_mut() {
        for member in &mut declaration.members {
            let Some(name) = member.default.as_deref() else {
                continue;
            };
            let Some((value, kind)) = known.get(name) else {
                continue;
            };
            member.written = Some(Written {
                default: member.default.clone(),
                type_text: member.type_text.clone(),
            });
            member.default.clone_from(value);
            if member.type_text.is_none() {
                member.type_text.clone_from(kind);
            }
        }
    }
}

/// Where an export's declaration lives, which is said three different ways.
#[derive(Clone, Debug)]
pub enum Origin {
    /// This module, for a name it declares itself.
    Own,
    /// The specifier as the source wrote it, for `export { one } from '…'`.
    ///
    /// **Not resolved, which is the odd half of the pair.** A named re-export
    /// keeps `./controllers/aria-forward-controller/aria-forward-controller.js`
    /// and a star re-export beside it in the same file becomes
    /// `src/accordion/item/accordion-item.js`. Two hundred and sixty-five of
    /// the one and four hundred and forty-two of the other, with no case going
    /// the other way, so the split is the analyzer's and is kept.
    Written(String),
    /// The specifier resolved against this module, for `export * from '…'`.
    Resolved(String),
}

/// One entry of a module's `exports`.
#[derive(Clone, Debug)]
pub struct Exported {
    /// `js`, or `custom-element-definition` for the tag a class registers.
    pub kind: &'static str,
    /// The name the module publishes, which is the tag for a definition.
    pub name: String,
    /// The name at the other end, which differs where an export renames.
    pub declaration: String,
    pub origin: Origin,
}

/// What a module publishes, in the order its statements are written.
///
/// **Statements rather than declarations**, which is the whole of the ordering
/// rule: `const EDGES` at the head of a file and `export { EDGES }` at its foot
/// put the export last, after the element declared between them, and reading
/// declarations instead would have put it first.
///
/// A type is not an export. `export interface Options` and `export type Side`
/// are absent from all four tiers, a hundred and seven of them, while
/// `export type { Side }` as a clause is present: what counts is the statement
/// being an export clause rather than the thing being a value.
///
/// A class that registers a tag publishes twice, the class and then the tag,
/// which holds for two hundred and sixty-nine of the two hundred and seventy
/// definitions in the library. The odd one is the decorator's own source, where
/// the analyzer reads the call inside `customElement` as a registration and
/// publishes `tagName`; that is its bug rather than its rule, and is left.
pub fn exports(source: &str, path: &str) -> Vec<Exported> {
    let allocator = Allocator::default();
    let kind = SourceType::from_path(path).unwrap_or_else(|_| SourceType::ts());
    let parsed = Parser::new(&allocator, source, kind).parse();
    let plain = blanked(source, &parsed.program.comments);

    let mut found = Vec::new();
    for statement in &parsed.program.body {
        match statement {
            Statement::ExportAllDeclaration(export) => found.push(Exported {
                kind: "js",
                name: "*".to_owned(),
                declaration: "*".to_owned(),
                origin: Origin::Resolved(export.source.value.to_string()),
            }),
            Statement::ExportDeclaration(export) => found.extend(published(&export.declaration)),
            Statement::ExportNamedDeclaration(export) => {
                for specifier in &export.specifiers {
                    found.push(Exported {
                        kind: "js",
                        name: specifier.exported.name().to_string(),
                        declaration: specifier.local.name().to_string(),
                        origin: Origin::Own,
                    });
                }
            }
            Statement::ExportFromDeclaration(export) => {
                for specifier in &export.specifiers {
                    found.push(Exported {
                        kind: "js",
                        name: specifier.exported.name().to_string(),
                        declaration: specifier.local.name().to_string(),
                        origin: Origin::Written(export.source.value.to_string()),
                    });
                }
            }
            _ => {}
        }
        /* **A tag registered by hand is a definition too**, and the analyzer
        reads the call wherever it sits, after whatever the statement itself
        publishes. There is one in the library and it is inside the decorator
        every other component registers through, so what it publishes is
        `tagName` defining `target`: the identifiers as written rather than
        anything they stand for at run time. Its own bug rather than its rule,
        reproduced because this is held to its output. The two other mentions
        of the call in that file are prose, which is why the text read here has
        its comments blanked. */
        let at = statement.span();
        found.extend(defined(&plain[at.start as usize..at.end as usize]));
    }
    found
}

/// The entries one `export <declaration>` statement makes.
fn published(declaration: &Declaration<'_>) -> Vec<Exported> {
    let one = |name: String| Exported {
        kind: "js",
        name: name.clone(),
        declaration: name,
        origin: Origin::Own,
    };
    match declaration {
        Declaration::ClassDeclaration(class) => {
            let Some(name) = class.id.as_ref().map(|id| id.name.to_string()) else {
                return Vec::new();
            };
            let mut found = vec![one(name.clone())];
            if let Some(tag) = tag_of(class) {
                found.push(Exported {
                    kind: "custom-element-definition",
                    name: tag,
                    declaration: name,
                    origin: Origin::Own,
                });
            }
            found
        }
        Declaration::FunctionDeclaration(function) => function
            .id
            .as_ref()
            .map(|id| vec![one(id.name.to_string())])
            .unwrap_or_default(),
        Declaration::VariableDeclaration(variables) => variables
            .declarations
            .iter()
            .filter_map(|two| two.id.get_binding_identifier())
            .map(|id| one(id.name.to_string()))
            .collect(),
        /* An interface and a type alias are not exports, which the tiers say
        without exception: a hundred and seven declared and none published. */
        _ => Vec::new(),
    }
}
