//! Rules and declarations several families share, written once as a fragment
//! and taken in by name.
//!
//! **A fragment is read where it is taken in, as if it were written there.**
//! `include('print-economy')` in a table's `rules` stands for the fragment's
//! rules, in its order, and `include('visually-hidden')` in a rule's `set`
//! stands for its declarations. So each output, the web stylesheet and the
//! intermediate form, sees one table, and a family reads the same compiled as
//! it would with the rules copied in.
//!
//! **A fragment of rules may take in declarations, and nothing else nests.**
//! A field's hidden label takes in the visually hidden declarations, and no
//! fragment takes in rules or is taken into a fragment of declarations, which
//! keeps where a rule came from at most two files away and no fragment can
//! take itself in.

use crate::family::read::Lit;

#[cfg(test)]
#[path = "fragments_tests.rs"]
mod tests;

/// The folder under a package's `src` that holds the fragments, one module
/// each, named for the fragment.
pub const FRAGMENTS: &str = "fragments";

/// A fragment's module, by its name.
pub type Load<'a> = dyn FnMut(&str) -> Result<Lit, String> + 'a;

/// A fragment's body: its rules, or its declarations.
enum Body {
    Rules(Vec<Lit>),
    Set(Vec<Lit>),
}

/// `export`, a styled source, with each fragment it takes in read in place.
///
/// # Errors
///
/// A sentence naming the fragment, when it does not exist, is not a fragment
/// of that name, holds what it is taken in as the wrong kind, or takes in
/// another.
pub fn expand(export: &Lit, load: &mut Load) -> Result<Lit, String> {
    let Lit::Call(helper, arguments) = export else {
        return Ok(export.clone());
    };
    let [name, Lit::Object(body)] = arguments.as_slice() else {
        return Ok(export.clone());
    };
    let mut fields = Vec::with_capacity(body.len());
    for (key, value) in body {
        let value = match (key.as_str(), value) {
            ("rules", Lit::Array(items)) => Lit::Array(rules(items, load)?),
            _ => value.clone(),
        };
        fields.push((key.clone(), value));
    }
    Ok(Lit::Call(
        helper.clone(),
        vec![name.clone(), Lit::Object(fields)],
    ))
}

/// A table that takes in the fragment `name` and nothing else, so a fragment
/// no family takes in yet is still read and held to the vocabulary.
///
/// # Errors
///
/// As [`expand`] says.
pub fn alone(name: &str, load: &mut Load) -> Result<Lit, String> {
    let include = Lit::Call("include".to_owned(), vec![Lit::Text(name.to_owned())]);
    let item = match fragment(name, load)? {
        Body::Rules(_) => include,
        Body::Set(_) => Lit::Object(vec![
            ("on".to_owned(), Lit::Text("host".to_owned())),
            ("set".to_owned(), Lit::Array(vec![include])),
        ]),
    };
    expand(
        &Lit::Call(
            "family".to_owned(),
            vec![
                Lit::Text(name.to_owned()),
                Lit::Object(vec![("rules".to_owned(), Lit::Array(vec![item]))]),
            ],
        ),
        load,
    )
}

/// A table's items, each `include()` read as the fragment's rules.
fn rules(items: &[Lit], load: &mut Load) -> Result<Vec<Lit>, String> {
    let mut out = Vec::with_capacity(items.len());
    for item in items {
        match included(item) {
            Some(name) => match fragment(name, load)? {
                Body::Rules(rules) => {
                    for rule in &rules {
                        if included(rule).is_some() {
                            return Err(format!(
                                "the fragment `{name}` takes in rules, and a fragment takes in declarations alone"
                            ));
                        }
                        out.push(declarations(rule, load)?);
                    }
                }
                Body::Set(_) => {
                    return Err(format!(
                        "the fragment `{name}` is declarations, which a rule's `set` takes in"
                    ))
                }
            },
            None => out.push(declarations(item, load)?),
        }
    }
    Ok(out)
}

/// A rule, each `include()` in its `set` read as the fragment's declarations.
fn declarations(rule: &Lit, load: &mut Load) -> Result<Lit, String> {
    let Lit::Object(fields) = rule else {
        return Ok(rule.clone());
    };
    let mut out = Vec::with_capacity(fields.len());
    for (key, value) in fields {
        let Lit::Array(set) = value else {
            out.push((key.clone(), value.clone()));
            continue;
        };
        if key != "set" {
            out.push((key.clone(), value.clone()));
            continue;
        }
        let mut declared = Vec::with_capacity(set.len());
        for declaration in set {
            let Some(name) = included(declaration) else {
                declared.push(declaration.clone());
                continue;
            };
            match fragment(name, load)? {
                Body::Set(each) if each.iter().any(|one| included(one).is_some()) => {
                    return Err(format!(
                        "the fragment `{name}` takes in another, and a fragment of declarations takes in none"
                    ))
                }
                Body::Set(each) => declared.extend(each),
                Body::Rules(_) => {
                    return Err(format!(
                        "the fragment `{name}` is rules, which a table's `rules` takes in"
                    ))
                }
            }
        }
        out.push((key.clone(), Lit::Array(declared)));
    }
    Ok(Lit::Object(out))
}

/// The fragment `include(name)` names, where `lit` is one.
fn included(lit: &Lit) -> Option<&str> {
    match lit {
        Lit::Call(helper, arguments) if helper == "include" => match arguments.as_slice() {
            [Lit::Text(name)] => Some(name.as_str()),
            _ => None,
        },
        _ => None,
    }
}

/// The fragment named `name`, read from its module.
fn fragment(name: &str, load: &mut Load) -> Result<Body, String> {
    if name.is_empty()
        || !name.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
        })
    {
        return Err(format!(
            "`include('{name}')` names a fragment in lowercase words joined by hyphens"
        ));
    }
    let export = load(name).map_err(|why| format!("`include('{name}')`: {why}"))?;
    let Lit::Call(helper, arguments) = &export else {
        return Err(format!(
            "the module of `{name}` does not export a `fragment()`"
        ));
    };
    let [Lit::Text(named), Lit::Object(body)] = arguments.as_slice() else {
        return Err(format!(
            "`{helper}()` in the module of `{name}` takes a name and `{{ rules }}` or `{{ set }}`"
        ));
    };
    if helper != "fragment" {
        return Err(format!(
            "the module of `{name}` does not export a `fragment()`"
        ));
    }
    if named != name {
        return Err(format!(
            "the module of `{name}` exports the fragment `{named}`, where a fragment's module is named for it"
        ));
    }
    match body.as_slice() {
        [(key, Lit::Array(rules))] if key == "rules" => Ok(Body::Rules(rules.clone())),
        [(key, Lit::Array(set))] if key == "set" => Ok(Body::Set(set.clone())),
        _ => Err(format!(
            "the fragment `{name}` holds `rules` or a `set`, and only one of them"
        )),
    }
}
