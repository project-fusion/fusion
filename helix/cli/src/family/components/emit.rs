//! The text of one family's native module.

use std::collections::BTreeMap;
use std::fmt::Write as _;

use crate::family::components::members::{Member, Sends};
use crate::PRODUCT;

/// The widest a doc block written on one line may be.
const WIDTH: usize = 100;

/// One element of a family, ready to write.
pub struct Part {
    /// The web element's class name, which the component takes.
    pub component: String,
    /// The constant its form is written as, such as `rootForm`.
    pub constant: String,
    pub events: Vec<Sends>,
    /// The intermediate form, as JSON.
    pub form: String,
    /// The members of the `hooks` prop's type.
    pub hooks: Vec<Member>,
    pub members: Vec<Member>,
    /// What the element is, from the manifest's summary.
    pub summary: Option<String>,
    pub tag: String,
    /// Whether the element is the web's alone, which a phone draws nothing
    /// for.
    pub web_only: bool,
}

/// The widest a line of a doc block's text is wrapped to.
const MEASURE: usize = 80;

/// `line` broken between words so no piece is wider than [`MEASURE`], where
/// it can be. A word wider than that stands on a line of its own.
fn wrapped(line: &str) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();
    for word in line.split(' ') {
        match lines.last_mut() {
            Some(last) if last.len() + 1 + word.len() <= MEASURE => {
                last.push(' ');
                last.push_str(word);
            }
            _ => lines.push(word.to_owned()),
        }
    }
    lines
}

/// A doc block at `indent`, one paragraph after another: on one line where a
/// single short line is all it holds.
pub fn doc(indent: &str, paragraphs: &[String]) -> String {
    let paragraphs: Vec<String> = paragraphs
        .iter()
        .map(|one| one.replace("*/", "*\\/"))
        .collect();
    match paragraphs.as_slice() {
        [] => String::new(),
        [one] if !one.contains('\n') && indent.len() + one.len() + 7 <= WIDTH => {
            format!("{indent}/** {one} */\n")
        }
        _ => {
            let mut out = format!("{indent}/**\n");
            for (at, paragraph) in paragraphs.iter().enumerate() {
                if at > 0 {
                    let _ = writeln!(out, "{indent} *");
                }
                for line in paragraph.lines().flat_map(wrapped) {
                    let _ = writeln!(out, "{indent} * {line}");
                }
            }
            let _ = writeln!(out, "{indent} */");
            out
        }
    }
}

/// Where a family's module comes from and what it imports: the folder of the
/// family's sources and of the event classes, as its opening comment names
/// them, the runtime's module, and the type of the event a handler hears,
/// which the runtime exports.
pub struct Origin<'a> {
    pub families: &'a str,
    pub events: &'a str,
    pub runtime: &'a str,
    pub event_type: &'a str,
}

/// What an event's `target` carries where the element that sent it has a value.
const VALUE_TARGET: &str = "{ readonly value: string }";

/// The event one handler hears, with its detail's fields typed, and its
/// `target` where the element that sent it has a value.
fn event_type(sends: &Sends, origin: &Origin) -> String {
    let mut said = if sends.fields.is_empty() {
        format!(
            "What `{}` receives: the web's `{}`, which carries no detail.",
            sends.handler, sends.web
        )
    } else {
        format!(
            "What `{}` receives: the web's `{}`, with the fields of its detail that a phone sends.",
            sends.handler, sends.web
        )
    };
    if sends.target {
        said.push_str(
            " Its `target` carries the `value` of the element that sent it, which a web handler reads as `event.target.value`.",
        );
    }
    let mut out = doc("", &[said]);
    if sends.fields.is_empty() {
        let target = if sends.target {
            format!(", {VALUE_TARGET}")
        } else {
            String::new()
        };
        let _ = writeln!(
            out,
            "export type {} = {}<Record<never, never>{target}>",
            sends.type_name, origin.event_type
        );
        return out;
    }
    /* The detail as the first of two type arguments, on lines of its own,
    where a target follows it. */
    let (open, indent, close) = if sends.target {
        ("<\n  {", "    ", format!("  }},\n  {VALUE_TARGET}\n>\n"))
    } else {
        ("<{", "  ", "}>\n".to_owned())
    };
    /* The platform's own event carries its detail's fields on itself as
    well, as a `ToggleEvent` carries `newState`. */
    let class = if sends.bare {
        "PlatformEvent"
    } else {
        origin.event_type
    };
    let _ = writeln!(out, "export type {} = {class}{open}", sends.type_name);
    for field in &sends.fields {
        out.push_str(&doc(indent, &field.doc.iter().cloned().collect::<Vec<_>>()));
        let optional = if field.optional { "?" } else { "" };
        let _ = writeln!(
            out,
            "{indent}readonly {}{optional}: {}",
            field.name, field.ty
        );
    }
    out + &close
}

/// The hooks one component takes in its `hooks` prop.
fn hooks_type(part: &Part) -> String {
    let said = format!(
        "The hooks `{}` takes in `hooks`. Each public hook of `{}` that its rules read on a phone is a field named for the hook in camel case.",
        part.component, part.tag
    );
    let mut out = doc("", &[said]);
    let name = format!("{}Hooks", part.component);
    if part.hooks.is_empty() {
        let _ = writeln!(out, "export type {name} = Record<never, never>");
        return out;
    }
    let _ = writeln!(out, "export type {name} = {{");
    for member in &part.hooks {
        out.push_str(&doc("  ", &member.doc));
        let _ = writeln!(out, "  readonly {}?: {}", member.name, member.ty);
    }
    out + "}\n"
}

/// The props one component takes.
fn props_type(part: &Part) -> String {
    let said = format!(
        "What `{}` takes. Each property of `{}` is a prop of the same name in camel case, each slot is a prop, and each event is a handler.",
        part.component, part.tag
    );
    let mut out = doc("", &[said]);
    let _ = writeln!(out, "export type {}Props = {{", part.component);
    for member in &part.members {
        out.push_str(&doc("  ", &member.doc));
        let _ = writeln!(out, "  readonly {}?: {}", member.name, member.ty);
    }
    out + "}\n"
}

/// One component, drawn from its form with the machines its form binds, or
/// one that draws nothing where the element is the web's alone.
fn component(part: &Part) -> String {
    let mut paragraphs: Vec<String> = part.summary.iter().cloned().collect();
    if part.web_only {
        paragraphs.push(format!(
            "`{}` is the web's alone. On a phone the component draws nothing, so a universal app's shared code can still write it.",
            part.tag
        ));
        let mut out = doc("", &paragraphs);
        let _ = writeln!(
            out,
            "export const {0} = webOnly({1}) as ComponentType<{0}Props>",
            part.component, part.constant
        );
        return out;
    }
    paragraphs.push(format!(
        "`{}` drawn natively from its intermediate form.",
        part.tag
    ));
    let mut out = doc("", &paragraphs);
    let _ = writeln!(
        out,
        "export const {0} = element({1}, behaviorFor({1})) as ComponentType<{0}Props>",
        part.component, part.constant
    );
    out
}

/// The imports a module needs: only the types its parts name, since an unused
/// import fails the native typecheck.
///
/// **The runtime by its package name**, whose entry checks the peers before
/// anything else in it runs.
fn imports(parts: &[Part], folders: &BTreeMap<String, String>, origin: &Origin) -> String {
    let regions = parts
        .iter()
        .flat_map(|part| &part.members)
        .any(|member| member.ty.contains("ReactNode"));
    let events = parts.iter().any(|part| !part.events.is_empty());
    let platform_events = parts
        .iter()
        .flat_map(|part| &part.events)
        .any(|sends| sends.bare && !sends.fields.is_empty());
    let handles = parts
        .iter()
        .flat_map(|part| &part.members)
        .any(|member| member.ty.contains("FieldHandle"));
    let mut react = vec!["ComponentType"];
    if regions {
        react.push("ReactNode");
    }
    if handles {
        react.push("Ref");
    }
    let mut out = format!("import type {{ {} }} from 'react'\n", react.join(", "));
    let event_type = format!("type {}", origin.event_type);
    let mut names: Vec<&str> = Vec::new();
    if parts.iter().any(|part| !part.web_only) {
        names.extend(["behaviorFor", "element"]);
    }
    names.push("type Family");
    if handles {
        names.push("type FieldHandle");
    }
    if events {
        names.push(&event_type);
    }
    if platform_events {
        names.push("type PlatformEvent");
    }
    if parts.iter().any(|part| part.web_only) {
        names.push("webOnly");
    }
    let _ = writeln!(
        out,
        "import {{ {} }} from '{}'",
        names.join(", "),
        origin.runtime
    );
    /* **A box that draws another family's element imports its module**, whose
    `element` makes the component the box draws. A box only the web draws
    imports nothing. */
    let mut drawn: Vec<String> = Vec::new();
    for part in parts {
        if let Ok(form) = serde_json::from_str::<serde_json::Value>(&part.form) {
            drawn_by(&form["tree"], &mut drawn);
        }
    }
    drawn.sort_unstable();
    drawn.dedup();
    let mut modules: Vec<&str> = drawn
        .iter()
        .map(|tag| folders.get(tag).map_or(tag.as_str(), String::as_str))
        .collect();
    modules.sort_unstable();
    modules.dedup();
    for family in modules {
        let _ = writeln!(out, "import '../{family}/index.native'");
    }
    if events {
        let _ = write!(out, "\nexport type {{ {} }}\n", origin.event_type);
    }
    out
}

/// The elements the boxes of `tree` draw on a phone, by their tag without
/// the prefix: each box that `draws` one and is not the web's alone.
fn drawn_by(tree: &serde_json::Value, into: &mut Vec<String>) {
    for node in tree.as_array().into_iter().flatten() {
        let attributes = &node["attributes"];
        if attributes["platform"] == "web" {
            continue;
        }
        if let Some(draws) = attributes["draws"].as_str() {
            into.push(draws.to_owned());
        }
        drawn_by(&node["children"], into);
    }
}

/// One family's module: its forms, then each element's event types, props,
/// and component, the root first. `folders` names the folder of each family
/// an element is drawn from by its tag without the prefix, as `menu-item`
/// is drawn from `menu`.
pub fn module_in(
    family: &str,
    parts: &[Part],
    folders: &BTreeMap<String, String>,
    origin: &Origin,
) -> String {
    let mut out = format!(
        "/* Generated by `{PRODUCT} family components` from the intermediate forms in\n   {}/src/families/{family}, the styled manifest, and the event\n   details in {}. Do not edit: change those and run it\n   again. */\n",
        origin.families, origin.events
    );
    out.push_str(&imports(parts, folders, origin));
    for part in parts {
        out.push('\n');
        out.push_str(&doc(
            "",
            &[format!(
                "The intermediate form of `{}`, as `{PRODUCT} family build` writes it.",
                part.tag
            )],
        ));
        let _ = writeln!(out, "const {}: Family = {}", part.constant, part.form);
    }
    for part in parts {
        for sends in &part.events {
            out.push('\n');
            out.push_str(&event_type(sends, origin));
        }
        out.push('\n');
        out.push_str(&hooks_type(part));
        out.push('\n');
        out.push_str(&props_type(part));
        out.push('\n');
        out.push_str(&component(part));
    }
    out
}

#[cfg(test)]
#[path = "emit_tests.rs"]
mod tests;
