//! A rules function's items rewritten one by one: each `on()` group into the
//! rules it holds, each target into the fields `family()` gives a rule, and
//! each value with its hooks and private values spelled out.

use super::declarations::fragment_of;
use super::target::{split, Target};
use super::Names;
use crate::family::read::Lit;

impl Names {
    /// The rules function's body: each `on()`, `keyframes()` and
    /// `include()`, as `family()`'s rules. `file` names a fragment's module
    /// before each line, and is empty for a table's own.
    pub(super) fn items(&mut self, body: &Lit, file: &str) -> Result<Vec<Lit>, String> {
        let Lit::Array(items) = body else {
            return Err(
                "the rules function returns an array of `on()`, `keyframes()` and `include()`"
                    .to_owned(),
            );
        };
        let mut rules = Vec::new();
        for item in items {
            let Lit::At(line, call) = item else {
                return Err("an item is `on(...)`, `keyframes(...)` or `include(...)`".to_owned());
            };
            let at = format!("{file}line {line}");
            /* A rule's own refusal names its own line already. */
            let fail = |why: String| {
                if why.starts_with(&format!("{file}line ")) {
                    why
                } else {
                    format!("{at}: {why}")
                }
            };
            match &**call {
                Lit::Call(helper, arguments) if helper == "on" => {
                    self.groups += 1;
                    /* The target is part of the group's name, so the checks can
                    tell two groups on one target, whose rules keep the order
                    written, from groups on different ones. */
                    let target = arguments.first().map(|target| format!("{target:?}")).unwrap_or_default();
                    let group = format!("{file}group {} on {target}", self.groups);
                    rules.extend(self.group(arguments, &group, file).map_err(fail)?);
                }
                Lit::Call(helper, arguments) if helper == "keyframes" => {
                    rules.push(self.keyframes(arguments).map_err(fail)?);
                }
                Lit::Call(helper, arguments) if helper == "include" && self.parts.is_none() => {
                    rules.push(included(arguments).map_err(fail)?);
                }
                _ => return Err(fail("an item is `on(...)`, `keyframes(...)` or `include(...)`, and a fragment takes in no fragment of rules".to_owned())),
            }
        }
        Ok(rules)
    }

    /// `on(target, [rule(...), variants(...)])`.
    fn group(&mut self, arguments: &[Lit], group: &str, file: &str) -> Result<Vec<Lit>, String> {
        let [target, Lit::Array(items)] = arguments else {
            return Err(
                "`on()` takes a target and an array of `rule()`s and `variants()`".to_owned(),
            );
        };
        let target = self.target(target)?;
        let mut rules = Vec::new();
        for item in items {
            let Lit::At(line, call) = item else {
                return Err("a group holds `rule(...)` and `variants(...)`".to_owned());
            };
            let at = format!("{file}line {line}");
            let read = match &**call {
                Lit::Call(helper, arguments) if helper == "rule" => {
                    let (when, set) = match arguments.as_slice() {
                        [set] => (None, set),
                        [when, set] => (Some(when), set),
                        _ => {
                            return Err(format!("{at}: `rule()` takes `set`, or `when` and `set`"))
                        }
                    };
                    self.rule(&target, when, set, &at, group)
                        .map(|rule| vec![rule])
                }
                Lit::Call(helper, arguments) if helper == "variants" => {
                    self.variants(&target, arguments, &at, group)
                }
                _ => {
                    return Err(format!(
                        "{at}: a group holds `rule(...)` and `variants(...)`"
                    ))
                }
            };
            rules.extend(read.map_err(|why| {
                if why.starts_with(&at) {
                    why
                } else {
                    format!("{at}: {why}")
                }
            })?);
        }
        Ok(rules)
    }

    /// One rule, as `family()` writes it.
    fn rule(
        &mut self,
        target: &Target,
        when: Option<&Lit>,
        set: &Lit,
        at: &str,
        group: &str,
    ) -> Result<Lit, String> {
        let when = split(when)?;
        if target.web && when.platform.as_deref() != Some("web") {
            return Err("a rule on `{ part, inner }` or `{ part, selector }` is the web's alone, but for `inner: '> slot'`, and its `when` says `platform: 'web'`".to_owned());
        }
        let mut fields = vec![(
            "on".to_owned(),
            target.on.clone().unwrap_or(Lit::Bool(false)),
        )];
        let (set, values) = self.set(set)?;
        if !set.is_empty() {
            fields.push(("set".to_owned(), Lit::Array(set)));
        }
        if !values.is_empty() {
            fields.push(("values".to_owned(), Lit::Array(values)));
        }
        let text = |value: &Option<String>| value.clone().map(Lit::Text);
        for (key, value) in [
            ("when", when.conditions),
            ("platform", text(&when.platform)),
            ("supports", text(&when.supports)),
            ("slotted", text(&target.slotted)),
            ("inner", text(&target.inner)),
            ("selector", text(&target.selector)),
            ("exact", target.exact.then_some(Lit::Bool(true))),
            ("at", Some(Lit::Text(at.to_owned()))),
            ("group", Some(Lit::Text(group.to_owned()))),
        ] {
            if let Some(value) = value {
                fields.push((key.to_owned(), value));
            }
        }
        Ok(Lit::Object(fields))
    }

    /// `variants(prop, { value: set })`: one rule per value, in the order
    /// written, each under `{ prop: value }`.
    fn variants(
        &mut self,
        target: &Target,
        arguments: &[Lit],
        at: &str,
        group: &str,
    ) -> Result<Vec<Lit>, String> {
        let [Lit::Text(prop), Lit::Object(entries)] = arguments else {
            return Err(
                "`variants()` takes a prop's name and an object of its values' declarations"
                    .to_owned(),
            );
        };
        if target.web {
            return Err("`variants()` is not taken on a web-only target".to_owned());
        }
        entries
            .iter()
            .map(|(value, set)| {
                if !matches!(set, Lit::Object(_)) {
                    return Err(format!(
                        "`variants('{prop}')` gives `{value}` an object of declarations"
                    ));
                }
                let when = Lit::Object(vec![(prop.clone(), Lit::Text(value.clone()))]);
                self.rule(target, Some(&when), set, at, group)
            })
            .collect()
    }

    /// `keyframes(name, { to: { rotate: '1turn' } })`.
    fn keyframes(&mut self, arguments: &[Lit]) -> Result<Lit, String> {
        let [name, Lit::Object(frames)] = arguments else {
            return Err("`keyframes()` takes a name and an object of frames".to_owned());
        };
        let frames = frames
            .iter()
            .map(|(at, declarations)| {
                let (set, values) = self.set(declarations)?;
                if !values.is_empty() {
                    return Err("a frame sets no private value".to_owned());
                }
                Ok(Lit::Array(vec![Lit::Text(at.clone()), Lit::Array(set)]))
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok(Lit::Object(vec![
            ("frames".to_owned(), Lit::Array(frames)),
            ("keyframes".to_owned(), name.clone()),
        ]))
    }
}

/// `include(fragment)` at the top: the imported fragment's rules, by its
/// module's name.
fn included(arguments: &[Lit]) -> Result<Lit, String> {
    match arguments {
        [Lit::Call(helper, path)] if helper == "import" => fragment_of(path),
        _ => Err("`include()` takes a fragment imported from `src/fragments`".to_owned()),
    }
}
