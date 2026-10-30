//! What each web event carries, read from core's event classes and the
//! detail types they are written with.
//!
//! **The web's own types are the record.** An event class names its detail,
//! as `HelixActivateEvent` extends `CustomEvent<ActivateDetail>`, and
//! `events/details.ts` types and describes each field. A native event carries
//! the fields its form names, so each is typed and described as the web's
//! field of the same name.
//!
//! **An alias a field names is written out**, as `PressPointerType` becomes
//! the words a press comes from, so a native module carries its types whole and
//! imports nothing of the web's. A field typed by an interface is refused by
//! name: inlining one is a change to make on purpose.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;
use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Class, Declaration, Expression, Statement, TSInterfaceDeclaration, TSSignature,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType, Span};

use crate::manifest::jsdoc;

/// The generic types a field may name, which TypeScript itself declares.
const BUILTINS: [&str; 5] = ["Array", "Partial", "Readonly", "ReadonlyArray", "Record"];

/// How deep an alias may name another before the reading stops.
const DEPTH: usize = 8;

/// One field of a detail.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Field {
    /// The first paragraph of its description.
    pub doc: Option<String>,
    pub name: String,
    /// Whether the detail may leave it out.
    pub optional: bool,
    /// Its type, as TypeScript writes it.
    pub ty: String,
}

/// An interface's own fields and the interfaces it extends.
#[derive(Debug, Default)]
struct Interface {
    extends: Vec<String>,
    fields: Vec<Field>,
}

/// Every event class's detail type, and every detail type's fields.
#[derive(Debug, Default)]
pub struct Details {
    aliases: BTreeMap<String, String>,
    classes: BTreeMap<String, String>,
    interfaces: BTreeMap<String, Interface>,
}

/// The source text a span covers, trimmed.
fn text(source: &str, span: Span) -> String {
    source
        .get(span.start as usize..span.end as usize)
        .unwrap_or_default()
        .trim()
        .to_owned()
}

/// A type written on one line, its members separated by semicolons, since a
/// field's type stands on a line of its own in what a native module writes.
fn one_line(written: &str) -> String {
    let mut out = String::new();
    for line in written
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        if !out.is_empty() {
            let flows = out.ends_with('{') || line.starts_with('}') || line.starts_with('|');
            out.push_str(if flows { " " } else { "; " });
        }
        out.push_str(line);
    }
    out
}

/// The modules under `events`, sorted, leaving out specs.
fn modules(events: &Path) -> Result<Vec<PathBuf>, Failure> {
    let entries = fs::read_dir(events).map_err(|error| {
        Failure::input(
            "cannot read the web event classes",
            format!("{}: {error}", events.display()),
        )
        .hint("name the folder of the web event classes in the project's `events`")
    })?;
    let mut found: Vec<PathBuf> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            let name = path.to_string_lossy();
            name.ends_with(".ts") && !name.ends_with(".spec.ts")
        })
        .collect();
    found.sort();
    Ok(found)
}

impl Details {
    /// Reads every event class and detail type under `events`, core's
    /// `src/events`, and under the `events` folder of each family in
    /// `families`, which holds the classes only that family sends.
    ///
    /// # Errors
    ///
    /// [`Failure`] when a folder or a module cannot be read or parsed.
    pub fn read(events: &Path, families: Option<&Path>) -> Result<Self, Failure> {
        let mut details = Self::default();
        let mut paths = modules(events)?;
        if let Some(families) = families {
            let entries = fs::read_dir(families).map_err(|error| {
                Failure::input(
                    "cannot read the families' event classes",
                    format!("{}: {error}", families.display()),
                )
            })?;
            let mut folders: Vec<PathBuf> = entries
                .filter_map(Result::ok)
                .map(|entry| entry.path().join("events"))
                .filter(|folder| folder.is_dir())
                .collect();
            folders.sort();
            for folder in folders {
                paths.extend(modules(&folder)?);
            }
        }
        for path in paths {
            let source = fs::read_to_string(&path).map_err(|error| {
                Failure::input(
                    "cannot read an event module",
                    format!("{}: {error}", path.display()),
                )
            })?;
            details
                .add(&source)
                .map_err(|why| Failure::input(format!("cannot read {}", path.display()), why))?;
        }
        Ok(details)
    }

    /// Adds what one module exports: its event classes, interfaces, and type
    /// aliases.
    ///
    /// # Errors
    ///
    /// A sentence when the module does not parse.
    pub fn add(&mut self, source: &str) -> Result<(), String> {
        let allocator = Allocator::default();
        let parsed = Parser::new(&allocator, source, SourceType::ts()).parse();
        if let Some(error) = parsed.diagnostics.first() {
            return Err(format!("it does not parse: {error}"));
        }
        /* Each doc block by the start of what it sits above, as the manifest
        reads them. */
        let docs: BTreeMap<u32, String> = parsed
            .program
            .comments
            .iter()
            .filter_map(|comment| {
                let block = text(source, comment.span);
                if !block.starts_with("/**") {
                    return None;
                }
                let description = jsdoc::read(&block).description?;
                let first = description.split("\n\n").next().unwrap_or_default();
                Some((comment.attached_to, first.to_owned()))
            })
            .collect();
        for statement in &parsed.program.body {
            let Statement::ExportDeclaration(export) = statement else {
                continue;
            };
            match &export.declaration {
                Declaration::ClassDeclaration(class) => self.class(class, source),
                Declaration::TSInterfaceDeclaration(interface) => {
                    self.interface(interface, source, &docs);
                }
                Declaration::TSTypeAliasDeclaration(alias) => {
                    self.aliases.insert(
                        alias.id.name.to_string(),
                        one_line(&text(source, alias.type_annotation.span())),
                    );
                }
                _ => {}
            }
        }
        Ok(())
    }

    /// Records the detail type of a class that extends `CustomEvent`.
    fn class(&mut self, class: &Class, source: &str) {
        let (Some(id), Some(heritage)) = (&class.id, &class.heritage) else {
            return;
        };
        let Expression::Identifier(parent) = &heritage.expression else {
            return;
        };
        let detail = heritage
            .type_arguments
            .as_ref()
            .and_then(|arguments| arguments.params.first());
        if let (true, Some(detail)) = (parent.name == "CustomEvent", detail) {
            self.classes
                .insert(id.name.to_string(), text(source, detail.span()));
        }
    }

    /// Records an interface's own fields and the interfaces it extends.
    fn interface(
        &mut self,
        interface: &TSInterfaceDeclaration,
        source: &str,
        docs: &BTreeMap<u32, String>,
    ) {
        let extends = interface
            .extends
            .iter()
            .map(|heritage| {
                let written = text(source, heritage.span);
                written
                    .split('<')
                    .next()
                    .unwrap_or_default()
                    .trim()
                    .to_owned()
            })
            .collect();
        let fields = interface
            .body
            .body
            .iter()
            .filter_map(|signature| match signature {
                TSSignature::TSPropertySignature(field) => Some(Field {
                    doc: docs.get(&field.span.start).cloned(),
                    name: field.key.static_name()?.to_string(),
                    optional: field.optional,
                    ty: text(
                        source,
                        field.type_annotation.as_ref()?.type_annotation.span(),
                    ),
                }),
                _ => None,
            })
            .collect();
        self.interfaces
            .insert(interface.id.name.to_string(), Interface { extends, fields });
    }

    /// The fields `names` of what `class` carries, typed and described as the
    /// web's detail has them.
    ///
    /// # Errors
    ///
    /// A sentence when the class carries no detail, the detail has no field of
    /// a name, or a field's type names something other than an alias or a
    /// builtin.
    pub fn fields(&self, class: &str, names: &[String]) -> Result<Vec<Field>, String> {
        /* The platform's `ToggleEvent` is no class of core's, and carries
        its two fields itself, as a phone's detail does. */
        if class == "ToggleEvent" {
            return names
                .iter()
                .map(|name| match name.as_str() {
                    "newState" | "oldState" => Ok(Field {
                        doc: Some(if name == "newState" {
                            "Where it stands now, `open` or `closed`.".to_owned()
                        } else {
                            "Where it stood before, `open` or `closed`.".to_owned()
                        }),
                        name: name.clone(),
                        optional: false,
                        ty: "'closed' | 'open'".to_owned(),
                    }),
                    _ => Err(format!("`ToggleEvent` has no field `{name}`")),
                })
                .collect();
        }
        let detail = self
            .classes
            .get(class)
            .ok_or_else(|| format!("`{class}` carries no detail in the event classes"))?;
        /* **A detail a phone carries in a shape of its own is declared
        beside the web's**, as `Native` and its name: a file field's
        refusal names a `File` on the web, and a phone holds the records its
        files capability gives. */
        let native = format!("Native{detail}");
        let detail = if self.interfaces.contains_key(&native) {
            &native
        } else {
            detail
        };
        let all = self.flattened(detail, 0)?;
        names
            .iter()
            .map(|name| {
                let field = all
                    .get(name)
                    .ok_or_else(|| format!("`{detail}` has no field `{name}`"))?;
                let ty = self.written(&field.ty, 0).map_err(|named| {
                    format!(
                        "`{detail}.{name}` is typed by `{named}`, which is not an alias in details.ts"
                    )
                })?;
                Ok(Field { ty, ..field.clone() })
            })
            .collect()
    }

    /// Every field of the interface `name`, its parents' first, each
    /// redeclared one replacing the parent's.
    fn flattened(&self, name: &str, depth: usize) -> Result<BTreeMap<String, Field>, String> {
        let interface = self
            .interfaces
            .get(name)
            .filter(|_| depth < DEPTH)
            .ok_or_else(|| format!("`{name}` is not an interface in details.ts"))?;
        let mut all = BTreeMap::new();
        for parent in &interface.extends {
            all.extend(self.flattened(parent, depth + 1)?);
        }
        for field in &interface.fields {
            all.insert(field.name.clone(), field.clone());
        }
        Ok(all)
    }

    /// `ty` with each alias it names written out.
    ///
    /// # Errors
    ///
    /// The first capitalized name that is neither an alias nor a builtin.
    pub fn written(&self, ty: &str, depth: usize) -> Result<String, String> {
        let mut out = String::new();
        let mut rest = ty;
        while let Some(first) = rest.chars().next() {
            let end = if first == '\'' || first == '"' {
                /* A quoted word is a value, whatever it spells. */
                rest[1..].find(first).map_or(rest.len(), |at| at + 2)
            } else if first.is_ascii_alphabetic() || first == '_' {
                rest.find(|one: char| !(one.is_ascii_alphanumeric() || one == '_'))
                    .unwrap_or(rest.len())
            } else {
                first.len_utf8()
            };
            let word = &rest[..end];
            out.push_str(&self.word(word, ty, depth)?);
            rest = &rest[end..];
        }
        Ok(out)
    }

    /// One word of a type: an alias written out, bracketed where it is a
    /// union inside something larger, or the word as it stands.
    fn word(&self, word: &str, ty: &str, depth: usize) -> Result<String, String> {
        let Some(alias) = self.aliases.get(word) else {
            let named =
                word.starts_with(|one: char| one.is_ascii_uppercase()) && !BUILTINS.contains(&word);
            return if named {
                Err(word.to_owned())
            } else {
                Ok(word.to_owned())
            };
        };
        if depth >= DEPTH {
            return Err(word.to_owned());
        }
        let inner = self.written(alias, depth + 1)?;
        Ok(if inner.contains('|') && ty.trim() != word {
            format!("({inner})")
        } else {
            inner
        })
    }
}
