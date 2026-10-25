//! A rule's declarations and values, with every hook and private value
//! spelled out, and the order of declarations in one rule held to.

use super::Names;
use crate::family::ir::checks::shorthands;
use crate::family::read::Lit;

impl Names {
    /// A rule's `set`, split into its CSS declarations and its private
    /// values, each in the order written: an object, or an array of objects
    /// and imported fragments of declarations, whose declarations are taken
    /// in where they stand.
    pub(super) fn set(&mut self, set: &Lit) -> Result<(Vec<Lit>, Vec<Lit>), String> {
        let mut declarations = Vec::new();
        let mut values = Vec::new();
        let parts = match set {
            Lit::Array(parts) => parts.as_slice(),
            one => std::slice::from_ref(one),
        };
        for part in parts {
            match part {
                Lit::Object(pairs) => {
                    let mut written: Vec<String> = Vec::new();
                    for (key, value) in pairs {
                        if key == "own" {
                            let Lit::Object(own) = value else {
                                return Err(
                                    "`own` in a `set` is an object of private values".to_owned()
                                );
                            };
                            for (key, value) in own {
                                let value = self.value(value)?;
                                values
                                    .push(Lit::Array(vec![Lit::Text(self.own_name(key)?), value]));
                            }
                            continue;
                        }
                        let name = property(key);
                        ordered(&written, &name)?;
                        written.push(name.clone());
                        declarations.push(Lit::Array(vec![Lit::Text(name), self.value(value)?]));
                    }
                }
                Lit::Call(helper, arguments) if helper == "import" => {
                    declarations.push(fragment_of(arguments)?);
                }
                _ => {
                    return Err("`set` is an object of declarations, or an array of them and imported fragments of declarations".to_owned());
                }
            }
        }
        Ok((declarations, values))
    }

    /// A value, with every `hook.name(...)` and `own.name` spelled out.
    pub(super) fn value(&mut self, value: &Lit) -> Result<Lit, String> {
        match value {
            Lit::Member(object, key) if object == "own" => Ok(Lit::Call(
                "own".to_owned(),
                vec![Lit::Text(self.own_name(key)?)],
            )),
            Lit::Member(object, key) => Err(format!(
                "`{object}.{key}` is not a value: a private value is `own.{key}`"
            )),
            Lit::Call(helper, arguments) => {
                let arguments = arguments
                    .iter()
                    .map(|argument| self.value(argument))
                    .collect::<Result<Vec<_>, _>>()?;
                let spelled = |name: String, arguments: Vec<Lit>| {
                    let mut spelled = vec![Lit::Text(name)];
                    spelled.extend(arguments);
                    spelled
                };
                match helper.split_once('.') {
                    Some(("hook", key)) => Ok(Lit::Call("hook".to_owned(), spelled(self.hook_name(key)?, arguments))),
                    Some(("own", key)) => Ok(Lit::Call("own".to_owned(), spelled(self.own_name(key)?, arguments))),
                    Some(_) => Err(format!("`{helper}()` is not in the vocabulary")),
                    None if helper == "hook" || helper == "own" => Err(format!(
                        "`{helper}('…')` is the older spelling: `{helper}.name` reads one the source declares"
                    )),
                    None if helper == "import" => Err("an imported module is not a value".to_owned()),
                    None => Ok(Lit::Call(helper.clone(), arguments)),
                }
            }
            Lit::Array(values) => values
                .iter()
                .map(|value| self.value(value))
                .collect::<Result<Vec<_>, _>>()
                .map(Lit::Array),
            Lit::At(..) => Err(format!("a call to `{}` is not a value", self.prefix)),
            other => Ok(other.clone()),
        }
    }
}

/// `include('name')` for a fragment imported from its module.
pub(super) fn fragment_of(path: &[Lit]) -> Result<Lit, String> {
    let [Lit::Text(path)] = path else {
        return Err("a fragment is imported from its module".to_owned());
    };
    let (folder, file) = path.rsplit_once('/').unwrap_or(("", path));
    let name = file.strip_suffix(".js").unwrap_or(file);
    if !(folder.ends_with("fragments") || folder == ".") {
        return Err(format!(
            "`{path}` is not a fragment's module, which sits in `src/fragments`"
        ));
    }
    Ok(Lit::Call(
        "include".to_owned(),
        vec![Lit::Text(name.to_owned())],
    ))
}

/// Refuses a declaration a rule's earlier one makes wrong: `all` after any,
/// a shorthand after its own longhand, which it would reset, and a physical
/// box property, which a table names logically.
fn ordered(written: &[String], name: &str) -> Result<(), String> {
    if shorthands::physical(name) {
        return Err(format!("`{name}` is a physical property: a table names it logically, as `inline-size` for `width` and `margin-block-start` for `margin-top`"));
    }
    if name == "all" && !written.is_empty() {
        return Err(
            "`all` comes first in a rule, or it resets what is written before it".to_owned(),
        );
    }
    match written
        .iter()
        .find(|earlier| shorthands::resets(name, earlier))
    {
        Some(earlier) => Err(format!(
            "`{name}` after `{earlier}` resets it: write the shorthand first"
        )),
        None => Ok(()),
    }
}

/// A CSS property from its camelCase key: `backgroundColor` is
/// `background-color`, and `WebkitAppearance` is `-webkit-appearance`. A
/// custom property, `--icon-size`, is written as it is.
fn property(key: &str) -> String {
    if key.starts_with("--") {
        return key.to_owned();
    }
    let mut name = String::with_capacity(key.len() + 4);
    for character in key.chars() {
        if character.is_ascii_uppercase() {
            name.push('-');
            name.push(character.to_ascii_lowercase());
        } else {
            name.push(character);
        }
    }
    name
}
