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
use oxc_ast::ast::{Declaration, Statement};
use oxc_parser::Parser;
use oxc_span::SourceType;

/// One thing a module declares, as far as this layer reads it.
#[derive(Debug)]
pub struct Declared {
    /// `class`, `function` or `variable`, which is the manifest's vocabulary.
    pub kind: &'static str,
    pub name: String,
}

/// The name and kind of a declaration, where it has a name to give.
fn named(declaration: &Declaration<'_>) -> Vec<Declared> {
    match declaration {
        Declaration::ClassDeclaration(class) => class
            .id
            .as_ref()
            .map(|id| Declared {
                kind: "class",
                name: id.name.to_string(),
            })
            .into_iter()
            .collect(),
        Declaration::FunctionDeclaration(function) => function
            .id
            .as_ref()
            .map(|id| Declared {
                kind: "function",
                name: id.name.to_string(),
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
                    found.extend(named(declaration));
                }
            }
            /* A declaration standing on its own, kept only where something
            below exports it by name. */
            other => {
                if let Some(declaration) = other.as_declaration() {
                    found.extend(
                        named(declaration)
                            .into_iter()
                            .filter(|one| exported.contains(&one.name)),
                    );
                }
            }
        }
    }
    found
}
