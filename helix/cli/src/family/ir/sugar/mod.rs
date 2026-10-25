//! The table syntax `styles()` writes, rewritten into the shape `family()`
//! writes, so everything after it reads one shape.
//!
//! ```ts
//! export default styles(button, {
//!   prefix: 'button',
//!   hooks: ['background-color'],
//!   own: ['button-fill'],
//!   stylesheet: 'button/root/button-root.generated.css',
//! }, ({ hook, on, own, rule }) => [
//!   on('button', [
//!     rule({ emphasis: 'solid' }, {
//!       backgroundColor: hook.backgroundColor(own.fill),
//!       own: { fill: token('color-primary') },
//!     }),
//!   ]),
//! ])
//! ```
//!
//! **A spelling of one shape.** The rewrite gives no rule a meaning the
//! `family()` shape could not say: `on(target, [rule(when, set)])` is the object
//! `{ on, when, set, values }` with the target's fields beside them, a
//! camelCase property is its hyphenated name, `own: { fill }` in a `set` is
//! the private value `button-fill`, `own.fill` reads it, `hook.size(fallback)`
//! is `hook('size', fallback)`, `platform` and `supports` in a `when` are the
//! rule's own fields, and `variants(prop, { value: set })` is one rule per
//! value. A source in any other shape is refused; the `family()` shape is
//! what the compiler and its tests read after this.
//!
//! **Every name is declared.** A hook and a private value are spelled from
//! the `hooks` and `own` the source declares, and one it uses without
//! declaring, or declares without using, is refused. The editor refuses the
//! same names from the same lists, through the types in `table.ts`.
//!
//! **Each rule keeps its line and its group**, as `at` and `group`, which the
//! intermediate form does not write: every refusal after this one names the
//! line, and [`super::checks`] holds rules in different groups to never
//! competing for one property.
//!
//! **A fragment is written the same way**, with `fragment(name, { parts },
//! rules)` for rules and `declarations(name, set)` for declarations, and is
//! rewritten into the `fragment()` shape [`super::fragments`] reads.

use std::collections::BTreeSet;

use crate::family::read::Lit;

mod declarations;
mod rules;
mod target;

#[cfg(test)]
mod tests;

/// The helpers a table's rules function may take from its parameter.
const GIVEN: &[&str] = &[
    "hook",
    "include",
    "keyframes",
    "on",
    "own",
    "rule",
    "variants",
];

/// What a style table's source exports.
const STYLES: &str = "a style table exports `styles(headless, { prefix, hooks, own, props, stylesheet }, ({ on, rule, ... }) => [...])`";

/// What a fragment's source exports.
const FRAGMENT: &str = "a fragment exports `fragment(name, { parts, hooks, own, props }, ({ on, rule, ... }) => [...])` or `declarations(name, set)`";

/// The helpers a fragment's rules function may take.
const FRAGMENT_GIVEN: &[&str] = &["hook", "keyframes", "on", "own", "rule"];

/// A style table, a call to `styles()`, rewritten into the shape `family()`
/// writes, which the compiler reads from there on. A source in any other
/// shape is refused.
///
/// # Errors
///
/// A sentence naming the line, when the source holds what the syntax does
/// not, or names a hook or a private value it does not declare.
pub fn desugar(export: &Lit) -> Result<Lit, String> {
    let Lit::Call(helper, arguments) = export else {
        return Err(STYLES.to_owned());
    };
    if helper == "styles()" {
        return Err(
            "`styles<typeof headless>()(prefix, ...)` is the older spelling: `styles(headless, { prefix, ... }, rules)`"
                .to_owned(),
        );
    }
    if helper != "styles" {
        return Err(STYLES.to_owned());
    }
    let [headless, Lit::Object(header), Lit::Arrow(given, body)] = arguments.as_slice() else {
        return Err(
            "`styles()` takes the headless source, an object of `prefix`, `hooks`, `own`, `props` and `stylesheet`, and `({ on, rule, ... }) => [...]`"
                .to_owned(),
        );
    };
    match headless {
        Lit::Call(import, path)
            if import == "import" && path == &[Lit::Text("./headless.js".to_owned())] => {}
        _ => return Err(
            "`styles()` takes the element's headless source first, imported from `./headless.js`"
                .to_owned(),
        ),
    }
    allowed(given, GIVEN)?;
    let mut prefix = None;
    let mut fields = Vec::new();
    let (mut hooks, mut own) = (None, None);
    for (key, value) in header {
        match (key.as_str(), value) {
            ("prefix", Lit::Text(name)) => prefix = Some(name.clone()),
            ("hooks", value) => hooks = Some(value),
            ("own", value) => own = Some(value),
            ("props", Lit::Array(props)) => {
                reserved(props)?;
                fields.push((key.clone(), value.clone()));
            }
            ("over" | "stylesheet", Lit::Text(_)) => fields.push((key.clone(), value.clone())),
            (other, _) => {
                return Err(format!(
                    "`{other}` is not a field `styles()` takes, or not in that shape"
                ))
            }
        }
    }
    let Some(prefix) = prefix else {
        return Err("`styles()` names the hook `prefix`".to_owned());
    };
    let mut names = Names::new(&prefix);
    names.hooks = hooks
        .map(|lit| declared(lit, "hooks", hook_key))
        .transpose()?
        .unwrap_or_default();
    names.own = own
        .map(|lit| declared(lit, "own", |name| own_key(&prefix, name)))
        .transpose()?
        .unwrap_or_default();
    let rules = names.items(body, "")?;
    names.unused()?;
    fields.push(("rules".to_owned(), Lit::Array(rules)));
    Ok(Lit::Call(
        "family".to_owned(),
        vec![Lit::Text(prefix), Lit::Object(fields)],
    ))
}

/// A fragment's module, `fragment(name, { parts }, rules)` or
/// `declarations(name, set)`, rewritten into the shape [`super::fragments`]
/// reads. A module in any other shape is refused.
///
/// # Errors
///
/// As [`desugar`] says, with the fragment's own lines.
pub fn fragment(export: &Lit) -> Result<Lit, String> {
    let Lit::Call(helper, arguments) = export else {
        return Err(FRAGMENT.to_owned());
    };
    match (helper.as_str(), arguments.as_slice()) {
        ("fragment", [Lit::Text(name), Lit::Object(header), Lit::Arrow(given, body)]) => {
            allowed(given, FRAGMENT_GIVEN)?;
            let mut names = Names::new("");
            for (key, value) in header {
                match key.as_str() {
                    "parts" => names.parts = Some(texts(value, "parts")?),
                    "hooks" => names.hooks = declared(value, "hooks", hook_key)?,
                    "own" => names.own = declared(value, "own", hook_key)?,
                    /* The includer's props, which the editor holds every
                    includer to; the includer's own reading checks them. */
                    "props" => {
                        texts(value, "props")?;
                    }
                    other => return Err(format!("`{other}` is not a field `fragment()` takes")),
                }
            }
            if names.parts.is_none() {
                return Err(format!("the fragment `{name}` names the `parts` it styles"));
            }
            let rules = names.items(body, &format!("fragments/{name}.ts "))?;
            names.unused()?;
            Ok(Lit::Call(
                "fragment".to_owned(),
                vec![
                    Lit::Text(name.clone()),
                    Lit::Object(vec![("rules".to_owned(), Lit::Array(rules))]),
                ],
            ))
        }
        ("declarations", [Lit::Text(name), set @ Lit::Object(_)]) => {
            let mut names = Names::new("");
            let (set, values) = names.set(set)?;
            if !values.is_empty() {
                return Err(format!("the fragment `{name}` sets no private value"));
            }
            Ok(Lit::Call(
                "fragment".to_owned(),
                vec![
                    Lit::Text(name.clone()),
                    Lit::Object(vec![("set".to_owned(), Lit::Array(set))]),
                ],
            ))
        }
        _ => Err(FRAGMENT.to_owned()),
    }
}

/// Refuses a name the rules function is given that it may not take.
fn allowed(given: &[String], may: &[&str]) -> Result<(), String> {
    match given.iter().find(|name| !may.contains(&name.as_str())) {
        Some(name) => Err(format!(
            "`{name}` is not one of what the rules function is given: {}",
            may.join(", ")
        )),
        None => Ok(()),
    }
}

/// Refuses a styled prop named `platform` or `supports`, which a `when`
/// reads as the rule's platform and feature query.
fn reserved(props: &[Lit]) -> Result<(), String> {
    for prop in props {
        if let Lit::Call(_, arguments) = prop {
            if let Some(Lit::Text(name)) = arguments.first() {
                if name == "platform" || name == "supports" {
                    return Err(format!(
                        "a prop may not be named `{name}`: a `when` reads it as the rule's own"
                    ));
                }
            }
        }
    }
    Ok(())
}

/// What a source declares, each with the key it is written with, and what
/// its rules have used.
struct Names {
    /// Each hook, `(camelCase, name)`.
    hooks: Vec<(String, String)>,
    /// Each private value, `(camelCase, name)`.
    own: Vec<(String, String)>,
    /// The parts a fragment styles, which every includer draws.
    parts: Option<Vec<String>>,
    used: BTreeSet<String>,
    /// How many groups have been read, which numbers the next.
    groups: usize,
    /// The hook prefix, for a message.
    prefix: String,
}

impl Names {
    fn new(prefix: &str) -> Self {
        Self {
            groups: 0,
            hooks: Vec::new(),
            own: Vec::new(),
            parts: None,
            prefix: prefix.to_owned(),
            used: BTreeSet::new(),
        }
    }

    fn hook_name(&mut self, key: &str) -> Result<String, String> {
        let found = self.hooks.iter().find(|(written, _)| written == key);
        let Some((_, name)) = found else {
            return Err(format!(
                "`hook.{key}` is not a hook `hooks` declares: {}",
                written(&self.hooks)
            ));
        };
        let name = name.clone();
        self.used.insert(format!("hook {name}"));
        Ok(name)
    }

    fn own_name(&mut self, key: &str) -> Result<String, String> {
        let found = self.own.iter().find(|(written, _)| written == key);
        let Some((_, name)) = found else {
            return Err(format!(
                "`own.{key}` is not a private value `own` declares: {}",
                written(&self.own)
            ));
        };
        let name = name.clone();
        self.used.insert(format!("own {name}"));
        Ok(name)
    }

    /// Refuses a hook or a private value declared and never used, so each
    /// list stays what the rules read.
    fn unused(&self) -> Result<(), String> {
        let unused: Vec<String> = self
            .hooks
            .iter()
            .filter(|(_, name)| !self.used.contains(&format!("hook {name}")))
            .map(|(_, name)| format!("the hook `{name}`"))
            .chain(
                self.own
                    .iter()
                    .filter(|(_, name)| !self.used.contains(&format!("own {name}")))
                    .map(|(_, name)| format!("the private value `{name}`")),
            )
            .collect();
        if unused.is_empty() {
            Ok(())
        } else {
            Err(format!("declared and never used: {}", unused.join(", ")))
        }
    }
}

/// An array of names, as a fragment's `parts`.
fn texts(lit: &Lit, field: &str) -> Result<Vec<String>, String> {
    let Lit::Array(names) = lit else {
        return Err(format!("`{field}` is an array of names"));
    };
    names
        .iter()
        .map(|name| match name {
            Lit::Text(name) => Ok(name.clone()),
            _ => Err(format!("`{field}` is an array of names")),
        })
        .collect()
}

/// The names a `hooks` or `own` list declares, each with its key.
fn declared(
    lit: &Lit,
    field: &str,
    key: impl Fn(&str) -> String,
) -> Result<Vec<(String, String)>, String> {
    let mut read: Vec<(String, String)> = Vec::new();
    for name in texts(lit, field)? {
        let written = key(&name);
        if let Some((_, held)) = read.iter().find(|(other, _)| *other == written) {
            return Err(format!(
                "`{field}` declares `{held}` and `{name}`, which are both written `{written}`"
            ));
        }
        read.push((written, name));
    }
    Ok(read)
}

/// How a private value is written: its name less the family's prefix, in
/// camelCase, so `button-tone-hover` in Button is `toneHover`. A value
/// another family names, as `field-control-inline-size`, keeps its whole
/// name.
fn own_key(prefix: &str, name: &str) -> String {
    let short = name
        .strip_prefix(prefix)
        .and_then(|rest| rest.strip_prefix('-'))
        .filter(|rest| !rest.is_empty())
        .unwrap_or(name);
    hook_key(short)
}

/// A hyphenated name in camelCase: `background-color` is `backgroundColor`.
fn hook_key(name: &str) -> String {
    let mut written = String::with_capacity(name.len());
    let mut upper = false;
    for character in name.chars() {
        if character == '-' {
            upper = true;
        } else if upper {
            written.extend(character.to_uppercase());
            upper = false;
        } else {
            written.push(character);
        }
    }
    written
}

/// The keys a list declares, for a message.
fn written(names: &[(String, String)]) -> String {
    if names.is_empty() {
        return "none".to_owned();
    }
    names
        .iter()
        .map(|(written, _)| written.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}
