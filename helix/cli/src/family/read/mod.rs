//! A source module's default export, read as syntax.
//!
//! **Read and never run.** A table is literals, arrays, objects and calls to
//! the vocabulary's helpers, and everything else is refused with its line. A
//! compiler that executed the module to find the table would make its output a
//! function of whatever the module imported, and the point of the source is
//! that its output is a function of the source.
//!
//! **A machine may name what its module defines.** A machine's transitions
//! call the pure functions its module exports, by name, and its states share
//! answers the module declares once as constants. So a machine is read with
//! its module's scope: a constant is read in place of its name, and a
//! function's name is kept as a [`Lit::Name`].
//!
//! **A style table written with `styles()` may name constants too**, inside
//! its rules function and nowhere else: a constant the module declares at its
//! top level, one the rules function declares before its `return`, and a
//! module it imports, which is read as `import(path)`. Inside that function a
//! call to `rule`, `on`, `variants`, `include` or `keyframes` is read with its
//! line, as [`Lit::At`], so a refusal from the compiler names the line, and a
//! key written twice, by a spread or otherwise, is refused. The `family()`
//! shape the compiler rewrites a table into, which its tests write, names
//! nothing, and any name in it is refused.
//!
//! **A headless source written with `render` is `headless.tsx`**, read with
//! JSX, and its part tree is read by [`jsx`] into the builder form's nodes,
//! so everything after reading sees one shape.

use std::collections::BTreeMap;

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Declaration, Expression, ImportDeclarationSpecifier, Program, Statement, VariableDeclaration,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType, Span};

/// What a table may hold.
#[derive(Clone, Debug, PartialEq)]
pub enum Lit {
    Array(Vec<Lit>),
    Bool(bool),
    /// A call to one of the vocabulary's helpers, by name.
    Call(String, Vec<Lit>),
    /// A function the module defines, by name. Only a machine holds one.
    Name(String),
    /// `object.property`, a name read off a helper, as a style table reads
    /// `own.fill`. Only the table syntax in `ir::sugar` gives it a meaning.
    Member(String, String),
    /// `({ a, b }) => body`: the names the one parameter destructures, and
    /// the body. Only the table syntax in `ir::sugar` holds one.
    Arrow(Vec<String>, Box<Lit>),
    /// A call inside a rules function, with the line it is written on,
    /// counted from one. Only the table syntax in `ir::sugar` holds one,
    /// and it takes the line off before anything else reads the call.
    At(usize, Box<Lit>),
    Number(f64),
    /// `null`, which only a style table's header gives a meaning: a hook or
    /// a private value with no default.
    Null,
    /// An object's properties, in the order they are written.
    Object(Vec<(String, Lit)>),
    Text(String),
}

/// What a module defines at its top level, which a machine may name.
#[derive(Clone, Default)]
pub(super) struct Scope<'a> {
    /// Each constant that is not a function, by name.
    constants: BTreeMap<String, &'a Expression<'a>>,
    /// Each function, by name, and how many parameters it takes.
    functions: BTreeMap<String, usize>,
    /// Each name a module imports, with the path it imports it from.
    imports: BTreeMap<String, String>,
}

/// The calls a rules function writes that are read with their line.
pub(super) const LINED: &[&str] = &["include", "keyframes", "on", "rule", "variants"];

/// What reading needs as it goes.
pub(super) struct Reader<'a, 's> {
    source: &'s str,
    /// The names a constant is being read for, so one that names itself is
    /// refused rather than read forever.
    reading: Vec<String>,
    scope: Scope<'a>,
    /// Whether a name is read from the scope everywhere, as in a machine, or
    /// only inside a rules function, as in a style table.
    names_everywhere: bool,
    /// Whether the reader is inside a rules function.
    styles: bool,
    /// Whether the module is a `headless.tsx`, whose `render` is JSX.
    jsx: bool,
}

/// The module's default export.
///
/// # Errors
///
/// A sentence naming the line, when the module does not parse, has no default
/// export, or holds anything a table may not.
pub fn default_export(source: &str) -> Result<Lit, String> {
    export_of(source, false)
}

/// A `headless.tsx` module's default export, with its `render` read into
/// the builder form's nodes, as [`jsx`] says.
///
/// # Errors
///
/// As [`default_export`] says, and a sentence naming the line of anything
/// in the render that is not in the JSX form's grammar.
pub fn headless_tsx(source: &str) -> Result<Lit, String> {
    export_of(source, true)
}

fn export_of(source: &str, jsx: bool) -> Result<Lit, String> {
    let allocator = Allocator::default();
    let kind = if jsx {
        SourceType::tsx()
    } else {
        SourceType::ts()
    };
    let parsed = Parser::new(&allocator, source, kind).parse();
    if let Some(error) = parsed.diagnostics.first() {
        return Err(format!("the module does not parse: {error}"));
    }
    let scope = module_scope(&parsed.program, source);
    for statement in &parsed.program.body {
        if let Statement::ExportDefaultDeclaration(export) = statement {
            let Some(expression) = export.declaration.as_expression() else {
                return Err("the default export is a declaration, not a table".to_owned());
            };
            let mut reader = Reader {
                jsx,
                names_everywhere: false,
                reading: Vec::new(),
                scope,
                source,
                styles: false,
            };
            return reader.read(expression);
        }
    }
    Err("the module has no default export".to_owned())
}

/// One expression of a builder-form source, read as [`default_export`]
/// reads it, for the printer, which walks the source's syntax for its
/// comments and reads each value it prints.
///
/// # Errors
///
/// A sentence naming the line of what a table may not hold.
pub(crate) fn expression<'a>(source: &str, expression: &'a Expression<'a>) -> Result<Lit, String> {
    let mut reader = Reader {
        jsx: false,
        names_everywhere: false,
        reading: Vec::new(),
        scope: Scope::default(),
        source,
        styles: false,
    };
    reader.read(expression)
}

/// The constants a module declares at its top level and the names it
/// imports, which a rules function may name.
fn module_scope<'a>(program: &'a Program<'a>, source: &str) -> Scope<'a> {
    let mut scope = Scope::default();
    let mut charts = Vec::new();
    for statement in &program.body {
        match statement {
            Statement::VariableDeclaration(declaration) => {
                collect(declaration, false, source, &mut scope, &mut charts);
            }
            Statement::ImportDeclaration(import) if !import.import_kind.is_type() => {
                for specifier in import.specifiers.iter().flatten() {
                    let local = match specifier {
                        ImportDeclarationSpecifier::ImportSpecifier(one)
                            if !one.import_kind.is_type() =>
                        {
                            &one.local.name
                        }
                        ImportDeclarationSpecifier::ImportDefaultSpecifier(one) => &one.local.name,
                        _ => continue,
                    };
                    scope
                        .imports
                        .insert(local.to_string(), import.source.value.to_string());
                }
            }
            _ => {}
        }
    }
    scope
}

/// A machine's module, read.
#[derive(Debug)]
pub struct MachineModule {
    /// The machine, with every constant it names read in place.
    pub chart: Lit,
    /// The type arguments of its `Statechart<...>` annotation, as written.
    pub types: Vec<String>,
    /// The name it is exported as.
    pub name: String,
    /// Each function the module defines, and how many parameters it takes.
    pub functions: BTreeMap<String, usize>,
}

/// The one constant a machine's module exports annotated as a `Statechart`.
///
/// # Errors
///
/// A sentence naming the line, when the module does not parse, exports no
/// machine or more than one, or the machine holds anything it may not.
pub fn machine_module(source: &str) -> Result<MachineModule, String> {
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, source, SourceType::ts()).parse();
    if let Some(error) = parsed.diagnostics.first() {
        return Err(format!("the module does not parse: {error}"));
    }
    let mut scope = Scope::default();
    let mut charts = Vec::new();
    for statement in &parsed.program.body {
        let (declaration, exported) = match statement {
            Statement::VariableDeclaration(declaration) => (&**declaration, false),
            Statement::ExportDeclaration(export) => match &export.declaration {
                Declaration::VariableDeclaration(declaration) => (&**declaration, true),
                _ => continue,
            },
            _ => continue,
        };
        collect(declaration, exported, source, &mut scope, &mut charts);
    }
    let [(name, types, expression)] = charts.as_slice() else {
        return Err(format!(
            "a machine's module exports one constant annotated as a `Statechart`, and this one exports {}",
            charts.len()
        ));
    };
    let functions = scope.functions.clone();
    let mut reader = Reader {
        jsx: false,
        names_everywhere: true,
        reading: Vec::new(),
        scope,
        source,
        styles: false,
    };
    Ok(MachineModule {
        chart: reader.read(expression)?,
        functions,
        name: name.clone(),
        types: types.clone(),
    })
}

/// The constants and functions one declaration defines, and the machine it
/// exports, if it is one.
fn collect<'a>(
    declaration: &'a VariableDeclaration<'a>,
    exported: bool,
    source: &str,
    scope: &mut Scope<'a>,
    charts: &mut Vec<(String, Vec<String>, &'a Expression<'a>)>,
) {
    for declarator in &declaration.declarations {
        let (Some(name), Some(init)) = (declarator.id.get_identifier_name(), &declarator.init)
        else {
            continue;
        };
        /* Only an exported function can be called from the module the
        machine compiles to. */
        if let Expression::ArrowFunctionExpression(function) = init {
            if exported {
                scope
                    .functions
                    .insert(name.to_string(), function.params.items.len());
            }
            continue;
        }
        scope.constants.insert(name.to_string(), init);
        let annotation = declarator
            .type_annotation
            .as_ref()
            .map(|annotation| {
                &source[annotation.type_annotation.span().start as usize
                    ..annotation.type_annotation.span().end as usize]
            })
            .unwrap_or_default();
        if exported && annotation.starts_with("Statechart<") {
            charts.push((name.to_string(), type_arguments(annotation), init));
        }
    }
}

/// The arguments of `Statechart<A, B, C>`, as written, split at the commas
/// outside any brackets.
fn type_arguments(annotation: &str) -> Vec<String> {
    let inner = annotation
        .trim_start_matches("Statechart<")
        .trim_end()
        .trim_end_matches('>');
    let mut arguments = Vec::new();
    let mut depth = 0_i32;
    let mut current = String::new();
    for character in inner.chars() {
        match character {
            '<' | '(' | '[' | '{' => depth += 1,
            '>' | ')' | ']' | '}' => depth -= 1,
            ',' if depth == 0 => {
                arguments.push(current.trim().to_owned());
                current.clear();
                continue;
            }
            _ => {}
        }
        current.push(character);
    }
    if !current.trim().is_empty() {
        arguments.push(current.trim().to_owned());
    }
    arguments
}

/// A helper's name as a call writes it: `rule`, `hook.backgroundColor`, or
/// `styles()` for a helper called with no arguments and then called again.
pub(super) fn callee(expression: &Expression) -> Option<String> {
    match expression {
        Expression::Identifier(name) => Some(name.name.to_string()),
        Expression::StaticMemberExpression(member) if !member.optional => match &member.object {
            Expression::Identifier(object) => {
                Some(format!("{}.{}", object.name, member.property.name))
            }
            _ => None,
        },
        Expression::CallExpression(call) if call.arguments.is_empty() => match &call.callee {
            Expression::Identifier(name) => Some(format!("{}()", name.name)),
            _ => None,
        },
        _ => None,
    }
}

/// The line a span starts on, counted from one.
pub(super) fn line(span: Span, source: &str) -> usize {
    let start = usize::try_from(span.start)
        .unwrap_or(usize::MAX)
        .min(source.len());
    source[..start].matches('\n').count() + 1
}

/// Names the line a refused expression is on, counted from one.
pub(super) fn refused(span: Span, source: &str, what: &str) -> String {
    format!(
        "line {}: {what}, which a table may not hold",
        line(span, source)
    )
}

mod jsx;
mod reader;

pub(crate) use jsx::kebab;

#[cfg(test)]
mod tests;
