//! A name a `headless.tsx` imports from a module beside it, read in its
//! place: the constant that module exports under that name, as a table that
//! names nothing, so a long API splits across files.

use std::fs;

use oxc_allocator::Allocator;
use oxc_ast::ast::{Declaration, Statement};
use oxc_parser::Parser;
use oxc_span::{SourceType, Span};

use super::{Lit, Reader, Scope};

impl Reader<'_, '_> {
    /// A name a `headless.tsx` imports from a module in its own folder: the
    /// constant that module exports under it, read in its place.
    pub(super) fn beside(&self, name: &str, span: Span) -> Result<Lit, String> {
        let file = self
            .scope
            .imports
            .get(name)
            .and_then(|path| path.strip_prefix("./"))
            .and_then(|path| path.strip_suffix(".js"))
            .filter(|file| !file.contains('/'));
        let (Some(folder), Some(file)) = (self.folder, file) else {
            return Err(super::refused(
                span,
                self.source,
                "a name but one imported from a module beside the source",
            ));
        };
        let module = folder.join(format!("{file}.ts"));
        let at = |why: String| {
            let line = super::line(span, self.source);
            format!("line {line}: {}: {why}", module.display())
        };
        let text = fs::read_to_string(&module).map_err(|error| at(error.to_string()))?;
        exported(&text, name).map_err(at)
    }
}

/// The table a module exports as `export const <name> = ...`, which names
/// nothing.
fn exported(source: &str, name: &str) -> Result<Lit, String> {
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, source, SourceType::ts()).parse();
    if let Some(error) = parsed.diagnostics.first() {
        return Err(format!("the module does not parse: {error}"));
    }
    for statement in &parsed.program.body {
        let Statement::ExportDeclaration(export) = statement else {
            continue;
        };
        let Declaration::VariableDeclaration(declaration) = &export.declaration else {
            continue;
        };
        for declarator in &declaration.declarations {
            if let (Some(held), Some(init)) =
                (declarator.id.get_identifier_name(), &declarator.init)
            {
                if held == name {
                    let mut reader = Reader {
                        folder: None,
                        jsx: false,
                        names_everywhere: false,
                        reading: Vec::new(),
                        scope: Scope::default(),
                        source,
                        styles: false,
                    };
                    return reader.read(init);
                }
            }
        }
    }
    Err(format!("the module exports no constant `{name}`"))
}
