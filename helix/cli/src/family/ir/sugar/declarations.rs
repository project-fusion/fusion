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
                        /* Declarations a phone does not have, each where it stands. */
                        if key == "web" {
                            self.alone("a `web` block")?;
                            let Lit::Object(web) = value else {
                                return Err(
                                    "`web` in a `set` is an object of declarations".to_owned()
                                );
                            };
                            for (key, value) in web {
                                let name = property(key);
                                ordered(&written, &name)?;
                                written.push(name.clone());
                                let value = Lit::Call("web".to_owned(), vec![self.value(value)?]);
                                declarations.push(Lit::Array(vec![Lit::Text(name), value]));
                            }
                            continue;
                        }
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
            Lit::Member(object, key) if object == "own" => {
                let name = self.own_name(key)?;
                self.defaulted_read("own", &name)
            }
            Lit::Member(object, key) if object == "hook" => {
                let name = self.hook_name(key)?;
                self.defaulted_read("hook", &name)
            }
            Lit::Member(object, key) => Err(format!(
                "`{object}.{key}` is not a value: a private value is `own.{key}`"
            )),
            Lit::Call(helper, arguments) if helper == "first" => self.first(arguments),
            Lit::Call(helper, _) if helper == "ownOf" => Err(
                "`ownOf()` is written as a private value of the table's own: declare it in `own` by its whole name in camelCase, `own: { tabsDismissRest: null }`, and read `own.tabsDismissRest`".to_owned(),
            ),
            Lit::Null => Err("`null` is a default in the header alone: a hook or a private value with none".to_owned()),
            /* A derivation in core, as a headless source's `derive()` names
            one, which the intermediate form calls `derived`. */
            Lit::Call(helper, _) if helper == "derived" => {
                Err("`derived()` is written `derive()`, as a headless source names a derivation".to_owned())
            }
            Lit::Call(helper, arguments) if helper == "derive" => {
                let arguments = arguments
                    .iter()
                    .map(|argument| self.value(argument))
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(Lit::Call("derived".to_owned(), arguments))
            }
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
                    Some(("hook", key)) => {
                        let name = self.hook_name(key)?;
                        self.repeats("hook", key, &name, arguments.first())?;
                        Ok(Lit::Call("hook".to_owned(), spelled(name, arguments)))
                    }
                    Some(("own", key)) => {
                        let name = self.own_name(key)?;
                        self.repeats("own", key, &name, arguments.first())?;
                        Ok(Lit::Call("own".to_owned(), spelled(name, arguments)))
                    }
                    Some(_) => Err(format!("`{helper}()` is not in the vocabulary")),
                    None if helper == "hook" || helper == "own" => Err(format!(
                        "`{helper}('…')` is the older spelling: `{helper}.name` reads one the source declares"
                    )),
                    None if helper == "import" => Err("an imported module is not a value".to_owned()),
                    None if helper == "web" => {
                        self.alone("a `web()` value")?;
                        Ok(Lit::Call(helper.clone(), arguments))
                    }
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

/// What `first()` takes, for a refusal.
const FIRST: &str = "`first()` takes reads and then a fallback: each but the last is a hook, a private value, `hookOf()`, `inherited()`, `measured()` or `derive()`, written with no fallback of its own";

impl Names {
    /// `hook.name` or `own.name` alone: the read with the header's default,
    /// where it gives one.
    fn defaulted_read(&mut self, kind: &str, name: &str) -> Result<Lit, String> {
        let key = format!("{kind} {name}");
        let Some(default) = self.defaults.get(&key).cloned() else {
            return Ok(Lit::Call(kind.to_owned(), vec![Lit::Text(name.to_owned())]));
        };
        if self.resolving.contains(&key) {
            return Err(format!("the default of `{name}` reads itself"));
        }
        self.resolving.push(key);
        let fallback = self.value(&default);
        self.resolving.pop();
        let fallback = fallback?;
        Ok(Lit::Call(
            kind.to_owned(),
            vec![Lit::Text(name.to_owned()), fallback],
        ))
    }

    /// Refuses `what`, a `web` block or a `web()` value, in a rule that is
    /// the web's alone, where it says nothing. A phone's own rule may still
    /// spread a set both platforms read, whose web values it leaves out.
    fn alone(&self, what: &str) -> Result<(), String> {
        if self.platform.as_deref() == Some("web") {
            return Err(format!(
                "{what} inside a rule that is the web's alone says nothing: write what it holds in the rule's set"
            ));
        }
        Ok(())
    }

    /// Refuses a site's fallback that is the header's default for the same
    /// read, which `hook.x` alone already reads.
    fn repeats(
        &mut self,
        kind: &str,
        key: &str,
        name: &str,
        fallback: Option<&Lit>,
    ) -> Result<(), String> {
        let Some(fallback) = fallback else {
            return Ok(());
        };
        let held = format!("{kind} {name}");
        let Some(default) = self.defaults.get(&held).cloned() else {
            return Ok(());
        };
        if self.resolving.contains(&held) {
            return Ok(());
        }
        self.resolving.push(held);
        let default = self.value(&default);
        self.resolving.pop();
        if default? == *fallback {
            let header = if kind == "hook" { "hooks" } else { "own" };
            return Err(format!(
                "`{kind}.{key}(…)` repeats the default `{header}` gives it: write `{kind}.{key}`"
            ));
        }
        Ok(())
    }

    /// `first(a, b, fallback)`: `a` with `b` as its fallback, and `b` with
    /// `fallback`.
    fn first(&mut self, arguments: &[Lit]) -> Result<Lit, String> {
        let Some((last, reads)) = arguments
            .split_last()
            .filter(|(_, reads)| !reads.is_empty())
        else {
            return Err(FIRST.to_owned());
        };
        let mut fallback = self.value(last)?;
        for read in reads.iter().rev() {
            fallback = self.chained(read, fallback)?;
        }
        Ok(fallback)
    }

    /// One read of `first()`, with the fallback the reads after it give.
    fn chained(&mut self, read: &Lit, fallback: Lit) -> Result<Lit, String> {
        let call = |helper: &str, mut spelled: Vec<Lit>, fallback: Lit| {
            spelled.push(fallback);
            Lit::Call(helper.to_owned(), spelled)
        };
        match read {
            Lit::Member(object, key) if object == "hook" => {
                let name = self.hook_name(key)?;
                self.repeats("hook", key, &name, Some(&fallback))?;
                Ok(call("hook", vec![Lit::Text(name)], fallback))
            }
            Lit::Member(object, key) if object == "own" => {
                let name = self.own_name(key)?;
                self.repeats("own", key, &name, Some(&fallback))?;
                Ok(call("own", vec![Lit::Text(name)], fallback))
            }
            Lit::Call(helper, arguments) => match (helper.as_str(), arguments.as_slice()) {
                ("hookOf", [of @ Lit::Text(_), name @ Lit::Text(_)]) => {
                    Ok(call("hookOf", vec![of.clone(), name.clone()], fallback))
                }

                ("inherited" | "measured", [name @ Lit::Text(_)]) => {
                    Ok(call(helper, vec![name.clone()], fallback))
                }
                ("derive", [name @ Lit::Text(_)]) => {
                    Ok(call("derived", vec![name.clone()], fallback))
                }
                _ => Err(FIRST.to_owned()),
            },
            _ => Err(FIRST.to_owned()),
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
