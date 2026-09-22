//! An attribute's values are in its type, not behind a name.
//!
//! **The generator writes out every name it can follow, and this holds the
//! rest.** `manifest::unions` substitutes an alias declared as a union of
//! literals, in the file that uses it, a file beside it, or the package the
//! import names, so `type: InputType` reaches the manifest as the seven words a
//! consumer may write. What survives as a bare name is what no reader of these
//! sources could substitute either, and that is what this reports: the
//! reference page would print the name and list nothing, and the `axes` rule
//! would go looking for words that are not there.
//!
//! **It is the attributes that matter, and only those.** An attribute is the
//! HTML surface, a string a consumer types into markup with nothing to complete
//! it, so the values have to be somewhere a reader can reach. A property taking
//! an object is a different thing: `Color` is the name of a shape with fields,
//! and printing it is the honest answer rather than a failure to resolve. This
//! reads the members the manifest marks as attributes and leaves the rest alone.
//!
//! **A name is fine as long as it resolves, and a resolved one is not a name by
//! the time it is read here.** The point is not to inline every union at its
//! declaration, which would put twelve placements in five files and let them
//! drift. It is that the alias is one this repository's own sources define, as a
//! union of literals, so any reader of those sources can substitute it and so
//! can the generator. What fails is a name that leads somewhere a parser cannot
//! follow.
//!
//! **Three shapes led nowhere and each was converted rather than excused.**
//! `(typeof ORB_STATES)[number]` and `keyof typeof LANGUAGES` are derivations a
//! type system performs and a parser cannot; `Placement` was a re-export of
//! Floating UI's, which is `Prettify<Side | AlignedPlacement>` over a template
//! literal, and no amount of reading our sources reaches those twelve words.
//! Each is now a union written out, with the record or the spec that used to
//! derive it holding it equal instead.
//!
//! **This is the policy the manifest generator is allowed to assume.** Writing
//! one against a parser rather than a type checker is the difference between a
//! project and a research programme, and that difference rests on there being no
//! annotation that needs a checker. Nothing was holding that true, which is how
//! these three arrived.

use serde_json::Value;

use crate::component::{Context, Finding, Report};

/// Types whose name is the honest answer, because they are the platform's.
///
/// A parser cannot resolve `ScrollBehavior` either, and it should not try: the
/// values are the browser's and a reader looking them up finds a specification
/// rather than a gap. Only the platform's own, so a local name cannot hide here.
const PLATFORM: [&str; 6] = [
    "ElementInternals",
    "ScrollBehavior",
    "SelectionDirection",
    "ShadowRootInit",
    "ValidityState",
    "WebGLContextAttributes",
];

/// Whether a type's text is a bare name rather than something with values in it.
fn is_a_name(text: &str) -> bool {
    let text = text.trim();
    !text.is_empty()
        && text
            .chars()
            .next()
            .is_some_and(|one| one.is_ascii_uppercase())
        && text
            .chars()
            .all(|one| one.is_ascii_alphanumeric() || one == '_')
}

/// Every attribute-backed member and the type it declares, by tag.
fn named(context: &Context) -> Vec<(String, String, String, String)> {
    let mut found = Vec::new();
    for tier in context.settings.roots(&context.root) {
        let Some(value) = context.manifest(&tier) else {
            continue;
        };
        for module in value
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            /* The module's path, so a finding points at the file that declares
            the property rather than at the tag, which is not a place to go
            and edit. */
            let path = module
                .get("path")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_owned();
            for declaration in module
                .get("declarations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                    continue;
                };
                for member in declaration
                    .get("members")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    if member.get("attribute").and_then(Value::as_str).is_none() {
                        continue;
                    }
                    let Some(name) = member.get("name").and_then(Value::as_str) else {
                        continue;
                    };
                    let text = member
                        .get("type")
                        .and_then(|one| one.get("text"))
                        .and_then(Value::as_str)
                        .unwrap_or_default();
                    found.push((
                        tag.to_owned(),
                        name.to_owned(),
                        text.to_owned(),
                        path.clone(),
                    ));
                }
            }
        }
    }
    found
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for (tag, member, text, where_) in named(context) {
        checked += 1;
        if !is_a_name(&text) || PLATFORM.contains(&text.as_str()) {
            continue;
        }
        findings.push(Finding {
            detail: format!(
                "An attribute is the HTML surface, so its values have to be somewhere a reader \
                 can reach. The generator writes out any alias these sources declare as a union \
                 of literals, wherever it is declared, so `{text}` surviving as a name means \
                 nothing short of a type checker reaches its values: it is a derivation, a shape \
                 with fields, or somebody else's. Write the union out where the type is declared, \
                 and hold whatever derived it to the union instead."
            ),
            file: where_,
            message: format!("`{tag}` publishes `{member}` as the bare name `{text}`"),
        });
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "attribute types",
    }
}
