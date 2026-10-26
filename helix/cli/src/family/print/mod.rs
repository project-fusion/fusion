//! A headless source in the builder form, printed as the `headless.tsx` the
//! JSX form writes.
//!
//! **Read through the compiler, and held to what it compiles to.** The
//! source is read with the compiler's reader, each value printed from what
//! the reader makes of it, and the printed source compiled again: the two
//! intermediate forms are the same but for the order of the props and the
//! events, which the JSX form writes in alphabetical order, or nothing is
//! printed.
//!
//! **Every comment is kept where it stood**: the doc comment, a comment on a
//! prop, an event, or a key, and a comment in the tree, as `{/* ... */}`
//! among the nodes or before the attribute it stood above. A comment the
//! printer has no place for refuses the source, with its line.
//!
//! **A comment above a run of props** is kept above the first of them, and
//! where alphabetical order takes the run apart, a note names it, for its
//! words to be read again.

use std::collections::{BTreeMap, BTreeSet};
use std::fmt::Write as _;

use oxc_allocator::Allocator;
use oxc_ast::ast::{Expression, ObjectPropertyKind, Statement};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType};
use serde_json::Value;

use crate::family::api::{self, rendered::natural};
use crate::family::read::{self, Lit};

mod comments;
mod js;
mod node;
mod tree;

#[cfg(test)]
mod tests;

use comments::Comments;
use js::{camel, key, lit, quoted};

/// A printed source, and what its comments need read again.
#[derive(Debug)]
pub struct Printed {
    pub notes: Vec<String>,
    pub text: String,
}

/// The helpers `render.js` exports, which the printed source imports from it.
const RENDER: &[&str] = &[
    "Announce",
    "bare",
    "boolean",
    "cancelable",
    "Circle",
    "Ellipse",
    "headless",
    "Image",
    "Layer",
    "Line",
    "number",
    "numberOrString",
    "object",
    "oneOf",
    "Path",
    "Pressable",
    "property",
    "Rect",
    "Repeat",
    "set",
    "Slot",
    "string",
    "Svg",
    "Text",
    "time",
    "View",
    "web",
    "Wrap",
];

/// The prop types a spec names with no default, as `prop()` spells them.
const TYPES: &[(&str, &str)] = &[
    ("boolean", "boolean"),
    ("number", "number"),
    ("number | string", "numberOrString"),
    ("object", "object"),
    ("string", "string"),
    ("time", "time"),
];

/// One key of an object the printer writes, with the comments above it.
struct Entry {
    comments: Vec<comments::Comment>,
    key: String,
    value: String,
}

/// A key of the printed source: its name, the comments above it, and its
/// value as written.
type Key = (String, Vec<comments::Comment>, String);

/// The reading order of the keys before `render`: what the element joins,
/// its props and events, its states and computed values, and every other
/// key as the source had it.
const FIRST: &[&str] = &["memberOf", "props", "events", "states", "derived"];

/// The module around a source's default export.
struct Module<'a> {
    /// Each name it imports, with the module it imports it from.
    imported: BTreeMap<String, String>,
    /// The doc comment and anything else between the imports and the export.
    preamble: String,
    name: String,
    body: &'a oxc_ast::ast::ObjectExpression<'a>,
}

/// A builder-form `headless.ts` printed as `headless.tsx`.
///
/// # Errors
///
/// A sentence naming the line of what the JSX form cannot say, or where the
/// printed source compiles to anything else.
pub fn headless(source: &str) -> Result<Printed, String> {
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, source, SourceType::ts()).parse();
    if let Some(error) = parsed.diagnostics.first() {
        return Err(format!("the module does not parse: {error}"));
    }
    let mut comments = Comments::of(source, &parsed.program.comments);
    let module = module(&parsed.program, source, &mut comments)?;
    let old = read::default_export(source)?;
    let compiled = api::headless(&old)?;
    let fields = match &old {
        Lit::Call(_, arguments) => match arguments.get(1) {
            Some(Lit::Object(fields)) => fields.clone(),
            _ => Vec::new(),
        },
        _ => Vec::new(),
    };
    let mut printer = tree::Printer {
        comments: &mut comments,
        given: BTreeSet::new(),
        names: names(&compiled, &fields)?,
        slots: false,
        source,
        used: BTreeSet::new(),
    };
    let mut notes = Vec::new();
    let (mut keys, render) = read_keys(&mut printer, &module, &fields, &mut notes)?;
    let Some((render_above, array)) = render else {
        return Err("the source has no `tree`".to_owned());
    };
    let drawn = drawn(&mut printer, array)?;
    if let Some(line) = printer.comments.left(0, u32::MAX, source) {
        return Err(format!(
            "line {line}: a comment the printer has no place for"
        ));
    }
    keys.sort_by_key(|(key, ..)| {
        FIRST
            .iter()
            .position(|first| first == key)
            .unwrap_or(FIRST.len())
    });
    let mut text = imports(&module, &keys, &printer.used);
    let mut given: Vec<String> = printer.given.iter().cloned().collect();
    given.sort_by(|a, b| natural(a, b));
    let parameter = if given.is_empty() {
        String::new()
    } else {
        format!("{{ {} }}", given.join(", "))
    };
    text.push('\n');
    if !module.preamble.is_empty() {
        text.push_str(&module.preamble);
        text.push('\n');
    }
    let _ = writeln!(text, "export default headless({}, {{", quoted(&module.name));
    for (key, above, value) in &keys {
        for comment in above {
            let _ = writeln!(text, "  {}", comment.block(2));
        }
        let _ = writeln!(text, "  {}: {value},", js::key(key));
    }
    for comment in &render_above {
        let _ = writeln!(text, "  {}", comment.block(2));
    }
    let _ = writeln!(text, "  render: ({parameter}) => (\n{drawn}\n  ),\n}})");
    verify(&compiled, &text)?;
    Ok(Printed { notes, text })
}

/// The imports, the doc comment, and the object a module's default export
/// passes to `headless()`.
fn module<'a>(
    program: &'a oxc_ast::ast::Program<'a>,
    source: &str,
    comments: &mut Comments,
) -> Result<Module<'a>, String> {
    let mut imported: BTreeMap<String, String> = BTreeMap::new();
    let mut imports_end = 0;
    let mut export = None;
    for statement in &program.body {
        match statement {
            Statement::ImportDeclaration(import) => {
                for specifier in import.specifiers.iter().flatten() {
                    imported.insert(
                        specifier.local().name.to_string(),
                        import.source.value.to_string(),
                    );
                }
                imports_end = import.span.end;
            }
            Statement::ExportDefaultDeclaration(declaration) => export = Some(declaration),
            other => {
                return Err(format!(
                    "line {}: a statement other than an import and the default export",
                    line(source, other.span().start)
                ))
            }
        }
    }
    let Some(export) = export else {
        return Err("the module has no default export".to_owned());
    };
    let first = program.body.first().map_or(0, |one| one.span().start);
    if let Some(line) = comments.left(0, first, source) {
        return Err(format!("line {line}: a comment before the imports"));
    }
    let preamble = source[imports_end as usize..export.span.start as usize]
        .trim()
        .to_owned();
    comments.take(imports_end, export.span.start);
    let Some(Expression::CallExpression(call)) = export.declaration.as_expression() else {
        return Err("the default export is not a call to `headless()`".to_owned());
    };
    let (Some(Expression::StringLiteral(name)), Some(Expression::ObjectExpression(body))) = (
        call.arguments.first().and_then(|one| one.as_expression()),
        call.arguments.get(1).and_then(|one| one.as_expression()),
    ) else {
        return Err("`headless()` takes the family's name and an object".to_owned());
    };
    Ok(Module {
        body,
        imported,
        name: name.value.to_string(),
        preamble,
    })
}

/// What a render reads, by the name the builder form binds.
fn names(compiled: &api::Headless, fields: &[(String, Lit)]) -> Result<tree::Names, String> {
    let mut regions = BTreeSet::new();
    regions_of(&compiled.tree, &mut regions);
    Ok(tree::Names {
        computed: api::computed::reads(fields)?
            .into_iter()
            .map(|(path, name)| (name, path))
            .collect(),
        derived: compiled.api.derived.keys().cloned().collect(),
        props: compiled
            .api
            .props
            .iter()
            .map(|prop| prop.name.clone())
            .collect(),
        regions,
        states: compiled.api.states.iter().cloned().collect(),
    })
}

/// The tree a source's `tree` holds, and the comments above it.
type Render<'a> = (
    Vec<comments::Comment>,
    &'a oxc_ast::ast::ArrayExpression<'a>,
);

/// Each key before `render`, printed, and the tree.
fn read_keys<'a>(
    printer: &mut tree::Printer,
    module: &Module<'a>,
    fields: &[(String, Lit)],
    notes: &mut Vec<String>,
) -> Result<(Vec<Key>, Option<Render<'a>>), String> {
    let source = printer.source;
    let mut keys: Vec<Key> = Vec::new();
    let mut render = None;
    let mut at = module.body.span.start;
    for property in &module.body.properties {
        let ObjectPropertyKind::ObjectProperty(property) = property else {
            return Err(format!(
                "line {}: a spread in the source",
                line(source, module.body.span.start)
            ));
        };
        let Some(written) = property.key.static_name() else {
            return Err(format!(
                "line {}: a computed key",
                line(source, property.span.start)
            ));
        };
        let above = printer.comments.take(at, property.span.start);
        at = property.span.end;
        let value = &property.value;
        let field = fields
            .iter()
            .find(|(name, _)| *name == written)
            .map(|(_, value)| value);
        match (written.as_ref(), value) {
            ("item", _) => {
                if let Some(line) =
                    printer
                        .comments
                        .left(value.span().start, value.span().end, source)
                {
                    return Err(format!("line {line}: a comment inside `item`"));
                }
                keys.push(("memberOf".to_owned(), above, member(field)?));
            }
            ("props" | "events", Expression::ArrayExpression(array)) => {
                let mut entries = listed(printer, &written, array, field)?;
                notes.extend(runs(&entries, &written, &module.name));
                entries.sort_by(|a, b| natural(&a.key, &b.key));
                keys.push((written.to_string(), above, object(&entries, 4)));
            }
            ("derived", Expression::ObjectExpression(computed)) => {
                let mut entries = derived(printer, computed)?;
                notes.extend(runs(&entries, "derived", &module.name));
                entries.sort_by(|a, b| natural(&a.key, &b.key));
                keys.push(("derived".to_owned(), above, object(&entries, 4)));
            }
            ("states", Expression::ArrayExpression(_)) => {
                printer.comments.take(value.span().start, value.span().end);
                let Some(Lit::Array(states)) = field else {
                    return Err("`states` is an array of names".to_owned());
                };
                let names: Vec<String> = states
                    .iter()
                    .filter_map(|state| match state {
                        Lit::Text(state) => {
                            Some(format!("'{}'", crate::family::api::spelling::camel(state)))
                        }
                        _ => None,
                    })
                    .collect();
                keys.push((
                    "states".to_owned(),
                    above,
                    format!("[{}]", names.join(", ")),
                ));
            }
            ("tree", Expression::ArrayExpression(array)) => render = Some((above, &**array)),
            ("props" | "events" | "derived" | "tree", _) => {
                return Err(format!(
                    "line {}: `{written}` is not in the builder form's shape",
                    line(source, value.span().start)
                ))
            }
            (other, _) => {
                printer.comments.take(value.span().start, value.span().end);
                let slice = &source[value.span().start as usize..value.span().end as usize];
                keys.push((other.to_owned(), above, slice.to_owned()));
            }
        }
    }
    if let Some(line) = printer.comments.left(at, module.body.span.end, source) {
        return Err(format!("line {line}: a comment after the last key"));
    }
    Ok((keys, render))
}

/// `props` or `events`, each with the comments above it.
fn listed(
    printer: &mut tree::Printer,
    written: &str,
    array: &oxc_ast::ast::ArrayExpression,
    field: Option<&Lit>,
) -> Result<Vec<Entry>, String> {
    let source = printer.source;
    let Some(Lit::Array(lits)) = field else {
        return Err(format!("`{written}` is an array"));
    };
    let mut entries = Vec::new();
    let mut inside = array.span.start;
    for (element, read) in array.elements.iter().zip(lits) {
        let above = printer.comments.take(inside, element.span().start);
        if let Some(line) = printer
            .comments
            .left(element.span().start, element.span().end, source)
        {
            return Err(format!("line {line}: a comment inside one of `{written}`"));
        }
        inside = element.span().end;
        let (key, value) = if written == "props" {
            prop(read)?
        } else {
            event(read)?
        };
        entries.push(Entry {
            comments: above,
            key,
            value,
        });
    }
    if let Some(line) = printer.comments.left(inside, array.span.end, source) {
        return Err(format!(
            "line {line}: a comment after the last of `{written}`"
        ));
    }
    Ok(entries)
}

/// `derived`, each key in camelCase and each value as written.
fn derived(
    printer: &mut tree::Printer,
    computed: &oxc_ast::ast::ObjectExpression,
) -> Result<Vec<Entry>, String> {
    let source = printer.source;
    let mut entries = Vec::new();
    let mut inside = computed.span.start;
    for one in &computed.properties {
        let ObjectPropertyKind::ObjectProperty(one) = one else {
            return Err("a spread in `derived`".to_owned());
        };
        let above = printer.comments.take(inside, one.span.start);
        /* The value is printed as written, its comments with it. */
        printer.comments.take(one.span.start, one.span.end);
        inside = one.span.end;
        let name = one.key.static_name().unwrap_or_default().to_string();
        entries.push(Entry {
            comments: above,
            key: camel(&name),
            value: source[one.value.span().start as usize..one.value.span().end as usize]
                .to_owned(),
        });
    }
    if let Some(line) = printer.comments.left(inside, computed.span.end, source) {
        return Err(format!(
            "line {line}: a comment after the last of `derived`"
        ));
    }
    Ok(entries)
}

/// What the render returns: its one node, or a fragment of several, or of
/// a node drawn while a read holds.
fn drawn(
    printer: &mut tree::Printer,
    array: &oxc_ast::ast::ArrayExpression,
) -> Result<String, String> {
    let source = printer.source;
    let alone = match array.elements.as_slice() {
        [one] => one.as_expression().filter(|expression| {
            tree::call(expression).is_some_and(|call| {
                let helper = tree::callee(call);
                helper != "when" && helper != "unless"
            }) && printer
                .comments
                .left(array.span.start, expression.span().start, source)
                .is_none()
                && printer
                    .comments
                    .left(expression.span().end, array.span.end, source)
                    .is_none()
        }),
        _ => None,
    };
    if let Some(expression) = alone {
        let (before, node) = printer.node(expression, 4)?;
        if !before.is_empty() {
            return Err(format!(
                "line {}: a comment before the only node",
                line(source, array.span.start)
            ));
        }
        return Ok(node);
    }
    let children = printer.children(&array.elements, array.span.start, array.span.end, 6)?;
    Ok(format!("    <>\n{}\n    </>", children.join("\n")))
}

/// The imports the printed source needs: the nodes and helpers from
/// `render.js`, and each helper a key written as the source had it calls,
/// from where the source imported it.
fn imports(module: &Module, keys: &[Key], used: &BTreeSet<String>) -> String {
    let mut used = used.clone();
    used.insert("headless".to_owned());
    for (key, _, value) in keys {
        if key == "memberOf" {
            used.insert("set".to_owned());
        }
        used.extend(called(value));
    }
    let tree_path = module
        .imported
        .get("headless")
        .cloned()
        .unwrap_or_else(|| "../../../tree.js".to_owned());
    let render_path = tree_path.replace("tree.js", "render.js");
    let mut from: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for name in used {
        let module = if RENDER.contains(&name.as_str()) {
            render_path.clone()
        } else if let Some(module) = module.imported.get(&name) {
            module.clone()
        } else if name == "derive" {
            tree_path.clone()
        } else {
            continue;
        };
        from.entry(module).or_default().push(name);
    }
    let mut text = String::new();
    for (module, mut names) in from {
        names.sort_by(|a, b| natural(a, b));
        let _ = writeln!(
            text,
            "import {{ {} }} from {}",
            names.join(", "),
            quoted(&module)
        );
    }
    text
}

/// Holds the printed source to compile to what the builder form does, but
/// for the order of the props and the events.
fn verify(compiled: &api::Headless, text: &str) -> Result<(), String> {
    let printed = read::headless_tsx(text)
        .and_then(|export| api::rendered::rewrite(&export))
        .and_then(|export| api::headless(&export))
        .map_err(|why| format!("the printed source does not compile: {why}\n{text}"))?;
    let (before, after) = (canonical(compiled), canonical(&printed));
    if before != after {
        return Err(format!(
            "the printed source compiles to something else:\nbefore: {before}\nafter:  {after}\n{text}"
        ));
    }
    Ok(())
}

/// A headless source's API and tree as JSON, its props and events by name.
fn canonical(read: &api::Headless) -> String {
    let mut api = serde_json::to_value(&read.api).unwrap_or(Value::Null);
    for key in ["props", "events"] {
        if let Some(Value::Array(items)) = api.get_mut(key) {
            items.sort_by_key(|one| {
                one.get("name")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned()
            });
        }
    }
    format!(
        "{api}\n{}",
        serde_json::to_string(&read.tree).unwrap_or_default()
    )
}

/// The names of every region in a tree.
fn regions_of(nodes: &[api::Node], into: &mut BTreeSet<String>) {
    for node in nodes {
        if node.kind == api::NodeKind::Region {
            into.insert(node.name.clone());
        }
        regions_of(&node.children, into);
    }
}

/// Notes for each comment above a run of entries that alphabetical order
/// takes apart, so its words are read again.
fn runs(entries: &[Entry], field: &str, family: &str) -> Vec<String> {
    let mut sorted: Vec<&str> = entries.iter().map(|one| one.key.as_str()).collect();
    sorted.sort_by(|a, b| natural(a, b));
    let mut notes = Vec::new();
    for (index, entry) in entries.iter().enumerate() {
        if entry.comments.is_empty() {
            continue;
        }
        let run: Vec<&str> = entries[index..]
            .iter()
            .enumerate()
            .take_while(|(at, one)| *at == 0 || one.comments.is_empty())
            .map(|(_, one)| one.key.as_str())
            .collect();
        if run.len() < 2 {
            continue;
        }
        let start = sorted.iter().position(|one| *one == run[0]).unwrap_or(0);
        if sorted.get(start..start + run.len()) != Some(run.as_slice()) {
            notes.push(format!(
                "{family}: the comment above `{}` in `{field}` stood above {}, which no longer stand together",
                run[0],
                run.iter().map(|one| format!("`{one}`")).collect::<Vec<_>>().join(", ")
            ));
        }
    }
    notes
}

/// An object of entries, one a line, at `indent`.
fn object(entries: &[Entry], indent: usize) -> String {
    let pad = " ".repeat(indent);
    let mut written = String::from("{\n");
    for entry in entries {
        for comment in &entry.comments {
            let _ = writeln!(written, "{pad}{}", comment.block(indent));
        }
        let _ = writeln!(written, "{pad}{}: {},", key(&entry.key), entry.value);
    }
    written.push_str(&" ".repeat(indent - 2));
    written.push('}');
    written
}

/// `item(of, { ... })` as `set(of, { ... })`, without the `chooses` a
/// press in the render says.
fn member(item: Option<&Lit>) -> Result<String, String> {
    let Some(Lit::Call(_, arguments)) = item else {
        return Err("`item` is a call to `item()`".to_owned());
    };
    let Some(Lit::Text(of)) = arguments.first() else {
        return Err("`item()` names its family first".to_owned());
    };
    let rest: Vec<(String, Lit)> = match arguments.get(1) {
        Some(Lit::Object(fields)) => fields
            .iter()
            .filter(|(key, _)| key != "chooses")
            .cloned()
            .collect(),
        _ => Vec::new(),
    };
    if rest.is_empty() {
        Ok(format!("set({})", quoted(of)))
    } else {
        Ok(format!("set({}, {})", quoted(of), lit(&Lit::Object(rest))?))
    }
}

/// `prop(name, type, { ... })` as its key and its default or spec.
fn prop(read: &Lit) -> Result<(String, String), String> {
    let Lit::Call(helper, arguments) = read else {
        return Err("a prop is a call to `prop()`".to_owned());
    };
    let (true, [Lit::Text(name), kind, rest @ ..]) = (helper == "prop", arguments.as_slice())
    else {
        return Err("a prop is `prop(name, type, { ... })`".to_owned());
    };
    let extra: Vec<(String, Lit)> = match rest {
        [] => Vec::new(),
        [Lit::Object(fields)] => fields.clone(),
        _ => return Err(format!("prop `{name}` takes an object after its type")),
    };
    let mut default = None;
    let (mut web, mut property) = (false, false);
    for (key, value) in &extra {
        match (key.as_str(), value) {
            ("default", value) => default = Some(value.clone()),
            ("platform", Lit::Text(platform)) if platform == "web" => web = true,
            ("attribute", Lit::Bool(false)) => property = true,
            (other, _) => {
                return Err(format!(
                    "prop `{name}`: `{other}` has no spelling in the JSX form"
                ))
            }
        }
    }
    let spec = match (kind, &default) {
        (Lit::Text(kind), Some(value)) => match (kind.as_str(), value) {
            ("boolean", Lit::Bool(_)) | ("number", Lit::Number(_)) | ("string", Lit::Text(_)) => {
                lit(value)?
            }
            /* A type a default does not say, given with its default. */
            ("number | string", Lit::Number(_) | Lit::Text(_)) => {
                format!("numberOrString({})", lit(value)?)
            }
            ("time", Lit::Text(_)) => format!("time({})", lit(value)?),
            _ => {
                return Err(format!(
                    "prop `{name}` of type `{kind}` with the default {value:?}"
                ))
            }
        },
        (Lit::Text(kind), None) => {
            let Some((_, helper)) = TYPES.iter().find(|(written, _)| written == kind) else {
                return Err(format!("prop `{name}` of type `{kind}`"));
            };
            format!("{helper}()")
        }
        (Lit::Array(values), default) => {
            let values = lit(&Lit::Array(values.clone()))?;
            match default {
                Some(default) => format!("oneOf({values}, {})", lit(default)?),
                None => format!("oneOf({values})"),
            }
        }
        (kind, _) => return Err(format!("prop `{name}` of type {kind:?}")),
    };
    let spec = if property {
        format!("property({spec})")
    } else {
        spec
    };
    let spec = if web { format!("web({spec})") } else { spec };
    Ok((camel(name), spec))
}

/// `event(name, { ... })` as its key and its detail or spec.
fn event(read: &Lit) -> Result<(String, String), String> {
    let Lit::Call(helper, arguments) = read else {
        return Err("an event is a call to `event()`".to_owned());
    };
    let (true, [Lit::Text(name), rest @ ..]) = (helper == "event", arguments.as_slice()) else {
        return Err("an event is `event(name, { ... })`".to_owned());
    };
    let extra: Vec<(String, Lit)> = match rest {
        [] => Vec::new(),
        [Lit::Object(fields)] => fields.clone(),
        _ => return Err(format!("event `{name}` takes an object after its name")),
    };
    let web = extra
        .iter()
        .any(|(key, value)| key == "platform" && *value == Lit::Text("web".to_owned()));
    let rest: Vec<(String, Lit)> = extra
        .iter()
        .filter(|(key, _)| key != "platform")
        .cloned()
        .collect();
    let keys: Vec<&str> = rest.iter().map(|(key, _)| key.as_str()).collect();
    let detail = rest
        .iter()
        .find(|(key, _)| key == "detail")
        .map(|(_, value)| value);
    let detail_text = |helper: &str| -> Result<String, String> {
        Ok(match detail {
            Some(detail) => format!("{helper}({})", lit(detail)?),
            None => format!("{helper}()"),
        })
    };
    let spec = match keys.as_slice() {
        [] => "[]".to_owned(),
        ["detail"] => lit(detail.unwrap_or(&Lit::Array(Vec::new())))?,
        ["cancelable"] | ["cancelable", "detail"] | ["detail", "cancelable"]
            if rest
                .iter()
                .any(|(key, value)| key == "cancelable" && *value == Lit::Bool(true)) =>
        {
            detail_text("cancelable")?
        }
        ["bare"] | ["bare", "detail"] | ["detail", "bare"]
            if rest
                .iter()
                .any(|(key, value)| key == "bare" && *value == Lit::Bool(true)) =>
        {
            detail_text("bare")?
        }
        _ => {
            let mut fields = rest.clone();
            if web {
                fields.push(("platform".to_owned(), Lit::Text("web".to_owned())));
            }
            return Ok((camel(name), lit(&Lit::Object(fields))?));
        }
    };
    let spec = if web { format!("web({spec})") } else { spec };
    Ok((camel(name), spec))
}

/// The helpers a value calls, by name.
fn called(text: &str) -> Vec<String> {
    let mut names = Vec::new();
    let bytes: Vec<char> = text.chars().collect();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index].is_ascii_alphabetic()
            && (index == 0
                || !(bytes[index - 1].is_ascii_alphanumeric()
                    || bytes[index - 1] == '.'
                    || bytes[index - 1] == '\''))
        {
            let start = index;
            while index < bytes.len()
                && (bytes[index].is_ascii_alphanumeric() || bytes[index] == '_')
            {
                index += 1;
            }
            if bytes.get(index) == Some(&'(') {
                names.push(bytes[start..index].iter().collect());
            }
        } else {
            index += 1;
        }
    }
    names
}

/// The line an offset is on, counted from one.
fn line(source: &str, offset: u32) -> usize {
    source[..offset as usize].matches('\n').count() + 1
}
