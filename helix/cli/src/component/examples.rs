//! Every example is checked against the manifest it documents.
//!
//! **Examples are HTML, so nothing typechecks them.** An attribute renamed on a
//! component leaves its examples rendering an element that silently ignores
//! them, and a sandbox shows a component that does not do what it says.
//!
//! **A family is a directory with an entry point**, because that is what the
//! barrel exports and what a consumer imports as a subpath. A directory holding
//! shared stylesheets exports nothing, has no element and owes no example, and
//! asking for the file that makes a directory a family is the same question the
//! package's `exports` map asks.
//!
//! **A stylesheet and its markup have to agree about each other, in both
//! directions, because both are silent.** A stylesheet with no link is applied
//! in the preview and missing from the file a reader takes away; a link with no
//! stylesheet is a promise to a file that is not there. And the link names the
//! file a reader is shown rather than the one on disk: the pair is keyed by
//! slug and displayed as `index.html` and `styles.css`, so linking the slug
//! names a file the reader cannot see.
//!
//! **A missing `@summary` renders as an empty cell and an empty cell looks like
//! a layout**, which is how 279 of 344 examples came to have none.
//!
//! **A `@layout` typo does not throw.** The value reaches the frame as an
//! attribute, no rule matches, and the example renders unstyled by any mode and
//! looks merely wrong. The modes are configuration, since they belong to
//! whatever frame is showing the example.
//!
//! **An inline style is refused everywhere, including in documentation.** It
//! cannot express a hover, a media query, a pseudo-element or a custom property
//! block, and it outranks every rule a reader then writes, so the first thing
//! they learn from copying one is that their own stylesheet does not work. A
//! reader copies what is in front of them, so a fenced HTML sample teaches the
//! habit exactly as well as an example does.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::{walk_outside, Context, Finding, Report};

/// Attributes any element may carry, so no component declares them.
///
/// `style` is here so the attribute check passes over it quietly and the
/// dedicated rule is the one that speaks: reported from here it would read "has
/// no attribute style", which is both wrong and unhelpful.
const GLOBAL: [&str; 11] = [
    "class",
    "dir",
    "exportparts",
    "hidden",
    "id",
    "lang",
    "part",
    "role",
    "slot",
    "style",
    "tabindex",
];

static SUMMARY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<!--\s*@summary\s+\S").expect("a literal pattern compiles"));

static LAYOUT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<!--\s*@layout\s+([^\s>-]+)\s*-->").expect("a literal pattern compiles")
});

static LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?is)<link\b[^>]*\brel=("|')stylesheet("|')[^>]*>"#)
        .expect("a literal pattern compiles")
});

static HREF: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)\bhref=("|')([^"']+)("|')"#).expect("a literal pattern compiles")
});

static INLINE_STYLE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<([a-z][a-z0-9-]*)[^>]*\sstyle=").expect("a literal pattern compiles")
});

static ELEMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)([^>]*)>").expect("a literal pattern compiles")
});

static SLOTTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"slot="([a-z-]+)""#).expect("a literal pattern compiles"));

static VALUE: LazyLock<[Regex; 2]> = LazyLock::new(|| {
    [
        Regex::new(r#"=\s*"[^"]*""#).expect("a literal pattern compiles"),
        Regex::new(r"=\s*'[^']*'").expect("a literal pattern compiles"),
    ]
});

static BARE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:^|\s)([a-z][a-z0-9-]*)").expect("a literal pattern compiles"));

static FENCE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)```html\n(.*?)```").expect("a literal pattern compiles"));

/// What a tag declares, read from the manifests beside the source.
struct Declared {
    attributes: BTreeSet<String>,
    slots: BTreeSet<String>,
}

fn manifests(context: &Context) -> std::collections::BTreeMap<String, Declared> {
    let mut found = std::collections::BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let Some(manifest) = tier.parent().map(|one| one.join("custom-elements.json")) else {
            continue;
        };
        let Ok(value) = fs::read_to_string(&manifest)
            .ok()
            .ok_or(())
            .and_then(|raw| serde_json::from_str::<Value>(&raw).map_err(|_| ()))
        else {
            continue;
        };
        for declaration in value
            .get("modules")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|one| one.get("declarations")?.as_array())
            .flatten()
        {
            let Some(tag) = declaration.get("tagName").and_then(Value::as_str) else {
                continue;
            };
            let named = |key: &str| -> BTreeSet<String> {
                declaration
                    .get(key)
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(|one| one.get("name")?.as_str())
                    .filter(|one| !one.is_empty())
                    .map(str::to_owned)
                    .collect()
            };
            found.insert(
                tag.to_owned(),
                Declared {
                    attributes: named("attributes"),
                    slots: named("slots"),
                },
            );
        }
    }
    found
}

/// Whether a file name ends in an extension, however it is cased.
fn has_extension(name: &str, extension: &str) -> bool {
    Path::new(name)
        .extension()
        .is_some_and(|one| one.eq_ignore_ascii_case(extension))
}

/// The directory names directly inside a layer that hold an entry point.
fn families(layer: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(layer) else {
        return Vec::new();
    };
    let mut found: Vec<String> = entries
        .flatten()
        .filter(|entry| entry.path().is_dir() && entry.path().join("index.ts").is_file())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    found.sort();
    found
}

pub fn run(context: &Context) -> Report {
    let Some(over) = context.settings.layers.last() else {
        return Report {
            checked: 0,
            findings: Vec::new(),
            notes: Vec::new(),
            unit: "families with examples",
        };
    };
    let root = context.root.join(&over.source);
    let tags = manifests(context);

    let mut findings = Vec::new();
    let mut checked = 0;

    for family in families(&root) {
        let directory = root.join(&family).join(".examples");
        let Ok(entries) = fs::read_dir(&directory) else {
            findings.push(Finding {
                detail: "Every family a consumer can import shows at least one usage.".to_owned(),
                file: family.clone(),
                message: "no `.examples` directory".to_owned(),
            });
            continue;
        };
        let held: BTreeSet<String> = entries
            .flatten()
            .map(|one| one.file_name().to_string_lossy().to_string())
            .collect();
        let markup: Vec<&String> = held
            .iter()
            .filter(|one| has_extension(one, "html"))
            .collect();
        if markup.is_empty() {
            findings.push(Finding {
                detail: "A directory with no example is a family nobody has shown.".to_owned(),
                file: family.clone(),
                message: "`.examples` holds no example".to_owned(),
            });
        }
        checked += 1;

        /* A stylesheet with no markup is a file nothing will ever load: it is
        read only when its example is asked for, and there is no such example. */
        for sheet in held.iter().filter(|one| has_extension(one, "css")) {
            let wanted = sheet.replace(".css", ".html");
            if !held.contains(&wanted) {
                findings.push(Finding {
                    detail: "The markup is what makes it an example.".to_owned(),
                    file: format!("{family}/{sheet}"),
                    message: format!("no {wanted} to style"),
                });
            }
        }

        for file in markup {
            let Ok(html) = fs::read_to_string(directory.join(file)) else {
                continue;
            };
            judge(&html, &family, file, &held, context, &tags, &mut findings);
        }
    }

    fenced(context, &mut findings);

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "families with examples",
    }
}

/// One example: its annotations, its stylesheet, and what it asks of a component.
#[allow(clippy::too_many_arguments)]
fn judge(
    html: &str,
    family: &str,
    file: &str,
    held: &BTreeSet<String>,
    context: &Context,
    tags: &std::collections::BTreeMap<String, Declared>,
    findings: &mut Vec<Finding>,
) {
    {
        {
            let where_ = format!("{family}/{file}");

            if !SUMMARY.is_match(html) {
                findings.push(Finding {
                    detail: "The Examples table will print its slug against a blank.".to_owned(),
                    file: where_.clone(),
                    message: "has no `<!-- @summary … -->`".to_owned(),
                });
            }
            if let Some(found) = LAYOUT.captures(html) {
                let asked = found[1].to_owned();
                if !context.settings.layouts.contains(&asked) {
                    findings.push(Finding {
                        detail: format!("Use one of {}.", context.settings.layouts.join(", ")),
                        file: where_.clone(),
                        message: format!("`@layout {asked}` is not a frame layout"),
                    });
                }
            }

            let link = LINK.find(html);
            let sheet = held.contains(&file.replace(".html", ".css"));
            if sheet && link.is_none() {
                findings.push(Finding {
                    detail: "A stylesheet with no link is applied in the preview and missing \
                             from the file a reader takes away."
                        .to_owned(),
                    file: where_.clone(),
                    message: format!("ships {} without linking it", file.replace(".html", ".css")),
                });
            }
            if let Some(link) = link {
                if !sheet {
                    findings.push(Finding {
                        detail: "A link with no stylesheet is a promise to a file that is not \
                                 there."
                            .to_owned(),
                        file: where_.clone(),
                        message: "links a stylesheet that is not beside it".to_owned(),
                    });
                }
                if let Some(href) = HREF.captures(link.as_str()).map(|one| one[2].to_owned()) {
                    if href != "styles.css" {
                        findings.push(Finding {
                            detail: "The name a reader is shown is the name the markup should \
                                     say."
                                .to_owned(),
                            file: where_.clone(),
                            message: format!(
                                "links `{href}`, which is not the `styles.css` a reader sees"
                            ),
                        });
                    }
                }
            }

            for found in INLINE_STYLE.captures_iter(html) {
                findings.push(Finding {
                    detail: format!("Use {}.", file.replace(".html", ".css")),
                    file: where_.clone(),
                    message: format!("`<{}>` carries a style attribute", &found[1]),
                });
            }

            asks(html, tags, &where_, findings);
        }
    }
}

/// What an example asks of the components it renders.
fn asks(
    html: &str,
    tags: &std::collections::BTreeMap<String, Declared>,
    where_: &str,
    findings: &mut Vec<Finding>,
) {
    {
        {
            for found in ELEMENT.captures_iter(html) {
                let tag = found[1].to_owned();
                let Some(known) = tags.get(&tag) else {
                    continue;
                };
                /* Values stripped first: a word inside one is not an attribute. */
                let mut bare = found[2].to_owned();
                for pattern in VALUE.iter() {
                    bare = pattern.replace_all(&bare, "=").into_owned();
                }
                for name in BARE.captures_iter(&bare) {
                    let name = name[1].to_owned();
                    if GLOBAL.contains(&name.as_str())
                        || name.starts_with("aria-")
                        || name.starts_with("data-")
                        || known.attributes.contains(&name)
                    {
                        continue;
                    }
                    findings.push(Finding {
                        detail: "An attribute a component does not declare is one it silently \
                                 ignores."
                            .to_owned(),
                        file: where_.to_owned(),
                        message: format!("`<{tag}>` has no attribute `{name}`"),
                    });
                }
            }

            for found in SLOTTED.captures_iter(html) {
                let name = found[1].to_owned();
                let declared = ELEMENT.captures_iter(html).any(|one| {
                    tags.get(&one[1])
                        .is_some_and(|known| known.slots.contains(&name))
                });
                if !declared {
                    findings.push(Finding {
                        detail: "Content in a slot nothing declares falls into the default slot \
                                 or nowhere."
                            .to_owned(),
                        file: where_.to_owned(),
                        message: format!("no element here declares a `{name}` slot"),
                    });
                }
            }
        }
    }
}

/// The documentation's HTML samples, held to the same rule.
///
/// Fenced HTML only: prose may name the attribute, and a CSS fence may set
/// properties without any of this applying to it.
fn fenced(context: &Context, findings: &mut Vec<Finding>) {
    for outside in &context.settings.outside {
        let mut files = Vec::new();
        walk_outside(&context.root.join(outside), &mut files);
        for file in files {
            if file.extension().is_none_or(|one| one != "mdx") {
                continue;
            }
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);
            for fence in FENCE.captures_iter(&text) {
                for found in INLINE_STYLE.captures_iter(&fence[1]) {
                    findings.push(Finding {
                        detail: "A reader copies what is in front of them.".to_owned(),
                        file: where_.clone(),
                        message: format!(
                            "`<{}>` carries a style attribute in an HTML sample",
                            &found[1]
                        ),
                    });
                }
            }
        }
    }
}
