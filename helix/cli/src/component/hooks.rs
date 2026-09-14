//! A documented CSS hook is read, named after its family, and owned by one.
//!
//! **Both directions are silent and they are different failures.** A hook
//! documented and never read is listed on the API page and does nothing when a
//! consumer sets it. A hook read and never documented is one a later edit
//! removes without knowing it was API.
//!
//! **A name a consumer cannot predict is one they never try**, and one they
//! mistype resolves to nothing with no error to go on, so a hook is named after
//! the family that owns it — the directory the component sits in, whichever of
//! its elements declares the hook.
//!
//! **One public name, one owner.** Two layers of one family is inheritance; two
//! families is two components answering to one declaration, and a consumer
//! setting it on a container holding both sets two different things with neither
//! component wrong.
//!
//! **A duplicate declaration pairs with a rule exactly as a single one does**,
//! so it passes every test here and is invisible to the two-way check. It is
//! only ever a mistake: the manifest keeps every one, so the reference page
//! lists the hook twice, and where the two descriptions differ it lists it twice
//! saying different things.
//!
//! **A private property is a component talking to itself**, so it is held to
//! having a reader inside its own package rather than anywhere. Comments are
//! stripped for that half and not for the public ones, because a property's own
//! explanation sits directly above it and routinely spells out the rule that was
//! supposed to read it.
//!
//! **A public hook written by one component and declared by none is the same
//! broken promise as a declared one with no reader.** `combobox-root.css` and
//! `command-root.css` each set `--listbox-background-color` in a rule whose
//! comment explains what it is for, `listbox-root.css` hardcoded the fill and
//! declared nothing, and the write did nothing at all: two writers, no
//! declaration, no reader, and every run green. The same shape deleted
//! `--floating-available-width` earlier. A write into a name nobody publishes
//! is a component talking to a component that is not listening.
//!
//! **And to having a writer, which is the direction this rule spent a year
//! missing.** A `var(--_x, fallback)` that nothing sets is not an error, is not
//! invalid CSS, and renders as the fallback every time, so the only sign is a
//! component permanently wearing its default while a comment above it describes
//! the configurability it lost. Both live cases arrived that way. It is the
//! same broken promise as a declaration with no reader, seen from the other end.
//!
//! **A private is written from a template as legitimately as from a
//! stylesheet**, a chart putting a computed count into CSS being the reason the
//! seam exists at all, so a template write counts. Three of the six unwritten
//! names are written exactly there, and a rule that read only stylesheets would
//! report all three.
//!
//! **A `style="--a: var(--b)"` in a template is a read**, and missing it
//! reported twenty-four live hooks as dead. A chart puts its series index into
//! CSS this way precisely because CSS cannot count it. An interpolated
//! `var(--foo-bar-${…})` reads the whole family, and the suffix is deliberately
//! not required to be a number: one component reads `--heatmap-tone-${tone}`
//! where a tone is a name, so a digit test publishes half a family and leaves
//! the rest API nothing names.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::COMMENT;
use crate::component::{walk_outside, Context, Finding, Report};

static DOCUMENTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@cssproperty\s+(--[a-z0-9-]+)").expect("a literal pattern compiles")
});

static READS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--[a-z0-9-]+)").expect("a literal pattern compiles"));

/// A public hook set by a stylesheet, which is a declaration at the start of a
/// line rather than a `var()` anywhere in one.
static WRITES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(--[a-z][a-z0-9-]*)\s*:").expect("a literal pattern compiles")
});

static PRIVATE_DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(--_[a-z0-9-]+)\s*:").expect("a literal pattern compiles")
});

static PRIVATE_READ: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--_[a-z0-9-]+)").expect("a literal pattern compiles"));

/// A write anywhere on a line rather than at the start of one.
///
/// `PRIVATE_DECLARED` is anchored because a stylesheet declares in column one,
/// and a template does not: the write sits inside a string beside the value it
/// interpolates. A `var(--_x, y)` cannot match this, carrying a comma where
/// this wants a colon.
static PRIVATE_WRITTEN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(--_[a-z0-9-]+)\s*:").expect("a literal pattern compiles"));

static STYLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"style="([^"]*)""#).expect("a literal pattern compiles"));

static INTERPOLATED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"var\(\s*(--[a-z0-9-]+)-\$\{").expect("a literal pattern compiles")
});

static WHOLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--[a-z0-9-]+)\)").expect("a literal pattern compiles"));

/// Whether a name is a component hook rather than a private or a design token.
fn ours(name: &str) -> bool {
    !name.starts_with("--_") && !name.starts_with("--helix-")
}

/// The package a file belongs to, which is how far a private property travels.
fn package_of(path: &str) -> String {
    path.split('/').take(2).collect::<Vec<&str>>().join("/")
}

/// The family a hook belongs to, which is the directory the component sits in.
///
/// A controller is its own owner, and a package grouping by kind first puts it
/// one level deeper than a tier does.
fn owner_of(path: &str) -> String {
    let parts: Vec<&str> = path.split('/').collect();
    if parts.first() == Some(&"helix") && parts.get(1) == Some(&"core") {
        return parts.get(4).map_or(String::new(), |one| {
            one.trim_end_matches("-controller").to_owned()
        });
    }
    parts.get(3).map_or(String::new(), |one| (*one).to_owned())
}

/// Everything read out of the source before anything is judged.
#[derive(Default)]
struct Survey {
    declared: BTreeMap<String, String>,
    declared_at: BTreeMap<(String, String), usize>,
    declared_by: BTreeMap<String, BTreeMap<String, String>>,
    families: BTreeSet<String>,
    private_declared: BTreeMap<String, BTreeMap<String, String>>,
    private_read: BTreeMap<String, BTreeSet<String>>,
    /// The first file to read each one, so a finding can name somewhere.
    private_read_at: BTreeMap<String, String>,
    private_written: BTreeSet<String>,
    read: BTreeMap<String, String>,
    /// Public hooks a stylesheet sets, and the first file to do it.
    written: BTreeMap<String, String>,
}

/// Generated stylesheets are the source beside them wrapped in a template, so
/// counting both would let a hook look read when its source was deleted.
fn is_source(path: &Path) -> bool {
    let name = path.to_string_lossy();
    !name.ends_with(".css.ts") && !name.contains(".spec.")
}

/// Everything the source says about hooks, gathered before anything is judged.
fn survey(context: &Context) -> Survey {
    let mut survey = Survey::default();
    /* The component source, and the package holding the token layer.
    **That package reads hooks without declaring any**, and that split is how one
    goes missing: the declaration stays in one place while the rule moves to
    another. It is derived from the sheets rather than named again, and an
    application's own stylesheets are deliberately not here — a hook in one is
    that application's, not a component's API. */
    let mut roots: Vec<std::path::PathBuf> = context.settings.roots(&context.root);
    for sheet in &context.settings.layer {
        let Some(directory) = context.root.join(sheet).parent().map(Path::to_path_buf) else {
            continue;
        };
        if directory.is_dir() && !roots.contains(&directory) {
            roots.push(directory);
        }
    }

    for root in &roots {
        let mut files = Vec::new();
        walk_outside(root, &mut files);
        for file in files.into_iter().filter(|one| is_source(one)) {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);
            let typescript = file.extension().is_some_and(|one| one == "ts");
            let stylesheet = file.extension().is_some_and(|one| one == "css");

            if typescript {
                for found in DOCUMENTED.captures_iter(&text) {
                    let name = found[1].to_owned();
                    survey.declared.insert(name.clone(), where_.clone());
                    *survey
                        .declared_at
                        .entry((where_.clone(), name.clone()))
                        .or_default() += 1;
                    let owner = owner_of(&where_);
                    if !owner.is_empty() {
                        survey
                            .declared_by
                            .entry(name)
                            .or_default()
                            .entry(owner)
                            .or_insert_with(|| where_.clone());
                    }
                }
                /* A read written into a template's `style=`, and only there, so
                an ordinary `var()` in prose still does not count as one. */
                for attribute in STYLE.captures_iter(&text) {
                    for found in INTERPOLATED.captures_iter(&attribute[1]) {
                        if ours(&found[1]) {
                            survey.families.insert(found[1].to_owned());
                        }
                    }
                    for found in WHOLE.captures_iter(&attribute[1]) {
                        if ours(&found[1]) {
                            survey
                                .read
                                .entry(found[1].to_owned())
                                .or_insert_with(|| where_.clone());
                        }
                    }
                }
            }
            if stylesheet {
                for found in WRITES.captures_iter(&text) {
                    if ours(&found[1]) {
                        survey
                            .written
                            .entry(found[1].to_owned())
                            .or_insert_with(|| where_.clone());
                    }
                }
                for found in READS.captures_iter(&text) {
                    if ours(&found[1]) {
                        survey
                            .read
                            .entry(found[1].to_owned())
                            .or_insert_with(|| where_.clone());
                    }
                }
            }

            privates(&mut survey, context, &text, &where_, stylesheet);
        }
    }

    survey
}

/// The private half of one file, which is three passes over the same text.
///
/// Its own function because the public half above is already the length clippy
/// allows, and because the three passes are one subject: what this file sets,
/// what it reads, and what it writes from a template.
fn privates(survey: &mut Survey, context: &Context, text: &str, where_: &str, stylesheet: bool) {
    /* Where the private rule applies: the component layers, and not the
    examples inside them. A layer that reads hooks without declaring any is how
    one goes missing, and it owns no privates. */
    let owns_private = !context.settings.layer.iter().any(|one| {
        Path::new(one)
            .parent()
            .is_some_and(|two| two.to_str().is_some_and(|three| where_.starts_with(three)))
    }) && !where_.contains(".examples/");
    if !owns_private {
        return;
    }
    let source = COMMENT.replace_all(text, "");
    if stylesheet {
        for found in PRIVATE_DECLARED.captures_iter(&source) {
            survey
                .private_declared
                .entry(found[1].to_owned())
                .or_default()
                .entry(package_of(where_))
                .or_insert_with(|| where_.to_owned());
        }
    }
    for found in PRIVATE_READ.captures_iter(&source) {
        survey
            .private_read
            .entry(found[1].to_owned())
            .or_default()
            .insert(package_of(where_));
        survey
            .private_read_at
            .entry(found[1].to_owned())
            .or_insert_with(|| where_.to_owned());
    }
    /* Kept apart from `private_declared` rather than folded into it, so the
    reader half judges exactly what it judged before. A template write answers
    "is this set at all" and not "does this package own a declaration". */
    for found in PRIVATE_WRITTEN.captures_iter(&source) {
        survey.private_written.insert(found[1].to_owned());
    }
}

pub fn run(context: &Context) -> Report {
    let survey = survey(context);
    Report {
        checked: survey.declared.len(),
        findings: judge(&survey, context),
        notes: Vec::new(),
        unit: "documented CSS properties",
    }
}

/// A member of a family something reads through an interpolation.
fn in_family(survey: &Survey, name: &str) -> bool {
    name.rfind('-')
        .filter(|at| *at > 0)
        .is_some_and(|at| survey.families.contains(&name[..at]))
}

fn judge(survey: &Survey, context: &Context) -> Vec<Finding> {
    let mut findings = Vec::new();

    for ((path, name), count) in &survey.declared_at {
        if *count == 1 {
            continue;
        }
        findings.push(Finding {
            detail: "The manifest keeps every one, so the reference page lists the hook twice, \
                     and where the two descriptions differ it lists it twice saying different \
                     things."
                .to_owned(),
            file: path.clone(),
            message: format!("`{name}` is declared {count} times in one doc block"),
        });
    }

    for (name, path) in &survey.declared {
        if survey.read.contains_key(name) || in_family(survey, name) {
            continue;
        }
        findings.push(Finding {
            detail: "A hook nothing reads is listed on the API page and does nothing when a \
                     consumer sets it."
                .to_owned(),
            file: path.clone(),
            message: format!("documents `{name}` and no rule reads it"),
        });
    }

    for (name, path) in &survey.read {
        if survey.declared.contains_key(name) {
            continue;
        }
        findings.push(Finding {
            detail: "A hook that works and is not published is one a later edit removes without \
                     knowing it was API."
                .to_owned(),
            file: path.clone(),
            message: format!("reads `{name}` and no component documents it with `@cssproperty`"),
        });
    }

    for (name, owners) in &survey.declared_by {
        let bare = name.trim_start_matches("--");
        for (owner, path) in owners {
            if bare.starts_with(&format!("{owner}-"))
                || context
                    .settings
                    .shared
                    .iter()
                    .any(|one| bare.starts_with(&format!("{one}-")))
            {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "A hook is named after its family, so this one reads as `--{owner}-…`, and \
                     the name a consumer guesses from the element resolves to nothing with no \
                     error. Rename it, or register a shared prefix if more than one family reads \
                     the rule."
                ),
                file: path.clone(),
                message: format!("documents `{name}`, which `{owner}` does not own"),
            });
        }
        if owners.len() > 1 {
            findings.push(Finding {
                detail: "A consumer setting it on a container holding both sets two different \
                         things, and neither component is wrong. A public name cannot be shared."
                    .to_owned(),
                file: owners.values().next().cloned().unwrap_or_default(),
                message: format!(
                    "`{name}` is documented by more than one family: {}",
                    owners
                        .keys()
                        .cloned()
                        .collect::<Vec<String>>()
                        .join(" and ")
                ),
            });
        }
    }

    findings.extend(unpaired(survey));

    findings
}

/// A private property missing its other half, in either direction.
fn unpaired(survey: &Survey) -> Vec<Finding> {
    let mut findings = Vec::new();

    for (name, where_) in &survey.private_declared {
        for (package, path) in where_ {
            if survey
                .private_read
                .get(name)
                .is_some_and(|one| one.contains(package))
            {
                continue;
            }
            findings.push(Finding {
                detail: "A private property is a component talking to itself, and this one is \
                         talking to nobody."
                    .to_owned(),
                file: path.clone(),
                message: format!("declares `{name}` and nothing in {package} reads it"),
            });
        }
    }

    /* The same pairing from the other end. A name read and never set resolves
    to its fallback forever, which is why nothing here has ever looked wrong
    enough to report itself. */
    /* A write into a name nobody publishes. Read against `declared` rather than
    against `read`, because the question is whether the hook is API at all. */
    for (name, path) in &survey.written {
        if survey.declared.contains_key(name) {
            continue;
        }
        findings.push(Finding {
            detail: "A hook written by one component and declared by none is a component \
                     talking to a component that is not listening: nothing publishes the name, \
                     so nothing has to read it and nothing says when it stops being read."
                .to_owned(),
            file: path.clone(),
            message: format!("writes `{name}`, which no component declares with `@cssproperty`"),
        });
    }

    for (name, path) in &survey.private_read_at {
        if survey.private_declared.contains_key(name) || survey.private_written.contains(name) {
            continue;
        }
        findings.push(Finding {
            detail: "A private property read with a fallback and written by nothing always \
                     resolves to the fallback, so the value is fixed and the comment above it \
                     describes configurability the component does not have."
                .to_owned(),
            file: path.clone(),
            message: format!("reads `{name}` and no stylesheet or template writes it"),
        });
    }

    findings
}
