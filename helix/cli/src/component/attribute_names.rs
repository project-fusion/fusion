//! A property mirroring a platform attribute answers to the platform's spelling.
//!
//! **Lit lowercases a property name to derive its attribute rather than
//! dash-casing it**, so `readOnly` is reachable as `readonly` by accident and
//! `fetchPriority` as `fetchpriority` the same way. Correct by luck is still
//! correct, so only a name the derivation gets wrong is reported.
//!
//! **What is not correct by luck is a name declared differently.** A consumer
//! who knows the platform writes the platform's spelling, and a wrong one parses
//! to no property at all and warns about nothing: `<x-input read-only>` is
//! indistinguishable from a consumer who wrote nothing, and the control stays
//! editable with no error anywhere.
//!
//! **The table is the platform's, not this library's**, which is why it lives
//! here rather than in configuration. HTML spells `crossorigin` and `maxlength`
//! the same way for everyone, so a consumer with their own components inherits
//! the table rather than supplying one.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{decorator, sources, Context, Finding, Report};

/// Properties that mirror a platform attribute, and how HTML spells each.
const PLATFORM: [(&str, &str); 18] = [
    ("autoComplete", "autocomplete"),
    ("crossOrigin", "crossorigin"),
    ("dirName", "dirname"),
    ("disablePictureInPicture", "disablepictureinpicture"),
    ("disableRemotePlayback", "disableremoteplayback"),
    ("fetchPriority", "fetchpriority"),
    ("formAction", "formaction"),
    ("formEnctype", "formenctype"),
    ("formMethod", "formmethod"),
    ("formNoValidate", "formnovalidate"),
    ("formTarget", "formtarget"),
    ("maxLength", "maxlength"),
    ("minLength", "minlength"),
    ("noValidate", "novalidate"),
    ("playsInline", "playsinline"),
    ("readOnly", "readonly"),
    ("referrerPolicy", "referrerpolicy"),
    ("useMap", "usemap"),
];

/// A member whose declared attribute is deliberately not its own name.
///
/// `defaultMuted` mirrors the `muted` content attribute, the platform having
/// split the attribute from the live property, so answering to `muted` is the
/// correct answer rather than a departure from it.
const EXCUSED: [(&str, &str); 1] = [("defaultMuted", "muted")];

/// The decorator and the member it sits on.
///
/// Options may hold nested parens, so the inner group tolerates one level of
/// them, which is what a `converter` object and a `type` between them need.
static DECLARATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@property\(((?:[^()]|\([^()]*\))*)\)\s*\n\s*(?:override\s+)?(?:get\s+)?(\w+)")
        .expect("the declaration pattern is a literal and compiles")
});

pub fn run(context: &Context) -> Report {
    let platform: BTreeMap<&str, &str> = PLATFORM.into_iter().collect();
    let excused: BTreeMap<&str, &str> = EXCUSED.into_iter().collect();
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(source) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);

            for capture in DECLARATION.captures_iter(&source) {
                let member = capture.get(2).map_or("", |one| one.as_str());
                let Some(expected) = platform.get(member) else {
                    continue;
                };
                checked += 1;
                let options = capture.get(1).map_or("", |one| one.as_str());
                let declared = decorator::attribute(options);

                if excused.get(member).copied() == declared.as_deref() {
                    continue;
                }

                match declared {
                    None => {
                        let derived = member.to_lowercase();
                        if derived == *expected {
                            continue;
                        }
                        findings.push(Finding {
                            detail: format!("HTML spells this `{expected}`. Declare it."),
                            file: where_.clone(),
                            message: format!(
                                "`{member}` declares no `attribute`, so it is lowercased to \
                                 `{derived}`"
                            ),
                        });
                    }
                    Some(declared) if declared != **expected => findings.push(Finding {
                        detail: "A consumer who knows the platform writes the platform's name, \
                                 and a wrong one parses to no property and warns about nothing."
                            .to_owned(),
                        file: where_.clone(),
                        message: format!(
                            "`{member}` answers to `{declared}` and HTML spells it `{expected}`"
                        ),
                    }),
                    Some(_) => {}
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "platform-mirroring properties",
    }
}
