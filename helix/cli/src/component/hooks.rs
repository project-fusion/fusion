//! A documented CSS hook is read, named after its family, and owned by one.
//!
//! **Both directions are silent and they are different failures.** A hook
//! documented and never read is listed on the API page and does nothing when a
//! consumer sets it. A hook read and never documented is one a later edit
//! removes without knowing it was API.
//!
//! **And the pairing is held to one package, not to the workspace.** A
//! declaration paired with a reader anywhere passes while the two sit in
//! different packages, which is a hook on one tier's reference page that only
//! another tier's sheet has ever read: a consumer taking the package that
//! published the name sets it and nothing moves. Five heatmap cell and gap
//! hooks were exactly that, all five declared verbatim on the styled twin that
//! does read them, and `--table-columns` was the same shape and went. A package
//! shipping no stylesheet still passes, because the write counts: `headless`
//! and `core` publish what they write out of a template or a `setProperty`, and
//! the examples beside a component read it back.
//!
//! **A name a consumer cannot predict is one they never try**, and one they
//! mistype resolves to nothing with no error to go on, so a hook is named after
//! the family that owns it: the directory the component sits in, whichever of
//! its elements declares the hook.
//!
//! **One public name, one owner, except where the vocabulary is registered.**
//! Two layers of one family is inheritance; two families is two components
//! answering to one declaration, and a consumer setting it on a container
//! holding both sets two different things with neither component wrong. A
//! prefix in `shared` is the decision that they mean one thing: the families
//! reading it read one rule out of one sheet, so the container case sets one
//! thing and every page that lists it is right. The naming half of this rule
//! already took that exemption and the ownership half did not, which made a
//! family unable to publish a hook its own element reads.
//!
//! **And a shared sheet's hooks are API of every family that composes it.**
//! `terminus.css` is read by `Sparkline` and `LineChart`, and all four
//! `--chart-terminus-*` names were on `Sparkline`'s page alone: a reader of the
//! other family's reference page found the property that draws the mark and
//! nothing that sizes or fills it. A sheet reached through a private is
//! followed rather than assumed, because a shared sheet publishes different
//! hooks to different composers: `series.css` resolves `--chart-stroke` into
//! `--_chart-stroke`, which three of its six composers read and three do not,
//! and asking a donut to publish a line's thickness would be the same fault in
//! the other direction.
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

use crate::component::text::{blanked, uncommented, COMMENT};
use crate::component::{walk_outside, Context, Finding, Report};

static DOCUMENTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@cssproperty\s+(--[a-z0-9-]+)").expect("a literal pattern compiles")
});

static READS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--[a-z0-9-]+)").expect("a literal pattern compiles"));

/// Where a family's class block ends, which is the decorator under it.
///
/// One per source file across both tiers, so the first match is the boundary
/// and nothing after it is read by the analyzer as the element's own.
static DECLARED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@customElement\s*\(").expect("a literal pattern compiles"));

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

/// A shared stylesheet composed into a family, by the path the import names.
static COMPOSES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"shared/([a-z0-9-]+)/([a-z0-9-]+)\.css\.js").expect("a literal pattern compiles")
});

/// A private a shared sheet resolves from a public one, with its value.
static ALIASES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(--_[a-z0-9-]+)\s*:([^;]*)").expect("a literal pattern compiles")
});

static INTERPOLATED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"var\(\s*(--[a-z0-9-]+)-\$\{").expect("a literal pattern compiles")
});

static WHOLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"var\(\s*(--[a-z0-9-]+)\)").expect("a literal pattern compiles"));

/// A public hook set anywhere on a line rather than in column one.
///
/// Anchored nowhere, because a template writes one inside a string beside the
/// value it interpolates: a chart's `--bar-chart-secondary: var(--chart-series-3)`
/// is a whole declaration in one expression. A `var(--x, y)` cannot match it,
/// carrying a comma where this wants a colon.
static TOUCH_WRITTEN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(--[a-z][a-z0-9-]*)\s*:").expect("a literal pattern compiles"));

/// A hook written onto an element from a module, by name or by family.
static TOUCH_SET: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new("setProperty\\(\\s*['\"`](--[a-z][a-z0-9-]*)").expect("a literal pattern compiles")
});

/// A family reached by interpolating its suffix, in a template or a `setProperty`.
static TOUCH_FAMILY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(--[a-z][a-z0-9-]*)-\$\{").expect("a literal pattern compiles"));

/// Whether a name is a component hook rather than a private or a design token.
fn ours(name: &str) -> bool {
    !name.starts_with("--_") && !name.starts_with("--helix-")
}

/// The package a file belongs to, which is how far a private property travels.
fn package_of(path: &str) -> String {
    path.split('/').take(2).collect::<Vec<&str>>().join("/")
}

/// Everything read out of the source before anything is judged.
#[derive(Default)]
struct Survey {
    /// The tiers, relative to the root, which is where an owner is read from.
    tiers: Vec<String>,
    /// The tiers every family draws on and none owns, grouped by kind: this
    /// repository's `helix/core/src`.
    foundations: Vec<String>,
    /// Which families compose each shared stylesheet, by `group/name`.
    composes: BTreeMap<String, BTreeMap<String, String>>,
    declared: BTreeMap<String, String>,
    declared_at: BTreeMap<(String, String), usize>,
    declared_by: BTreeMap<String, BTreeMap<String, String>>,
    families: BTreeSet<String>,
    /// Which families read each private, so a shared sheet's aliases can be
    /// followed to the composers that actually take them.
    private_read_by: BTreeMap<String, BTreeMap<String, String>>,
    /// A shared sheet's privates, each with the public hooks it resolves.
    shared_alias: BTreeMap<String, BTreeSet<String>>,
    /// The public hooks a shared sheet reads outside a private's declaration.
    shared_direct: BTreeMap<String, BTreeSet<String>>,
    private_declared: BTreeMap<String, BTreeMap<String, String>>,
    private_read: BTreeMap<String, BTreeSet<String>>,
    /// The first file to read each one, so a finding can name somewhere.
    private_read_at: BTreeMap<String, String>,
    private_written: BTreeSet<String>,
    read: BTreeMap<String, String>,
    /// Which packages interpolate each family's suffix.
    touched_family: BTreeMap<String, BTreeSet<String>>,
    /// Which packages read or write each public hook, whatever the file kind.
    ///
    /// The two-way check above pairs a declaration with a reader anywhere in
    /// the workspace, which is what let five hooks live on one tier's page and
    /// be read only from another's sheet. This is the same pairing held to one
    /// package.
    touched_in: BTreeMap<String, BTreeSet<String>>,
    /// The packages holding the token layer, whose reads answer for every
    /// package: the layer is the page's stylesheet, loaded with the
    /// components, and a rule there styling a component's slotted content is
    /// that component's hook.
    layer_packages: BTreeSet<String>,
    /// Hooks documented below the class block, each with the file saying it.
    ///
    /// The analyzer collects `@cssproperty` from the block the element is
    /// declared on, so one written on a member reaches no reader while this
    /// rule, which reads the source text, counts it as documented.
    misplaced: BTreeMap<String, String>,
    /// Public hooks a stylesheet sets, and the first file to do it.
    written: BTreeMap<String, String>,
}

/// Generated stylesheets are the source beside them wrapped in a template, so
/// counting both would let a hook look read when its source was deleted.
fn is_source(path: &Path) -> bool {
    let name = path.to_string_lossy();
    !name.ends_with(".css.ts") && !name.contains(".spec.")
}

impl Survey {
    /// The family a hook belongs to, read from the tier the file is in.
    ///
    /// **From the configured tier, not from a segment count.** This read the
    /// fourth segment of the path, which is the family only where a tier is
    /// three deep: under `src/components` it named every hook's owner after its
    /// file, and under `src` it named nobody and the check skipped in silence.
    /// A family's tier puts the family first. A foundation groups by kind
    /// first, `controllers/<name>-controller`, so its owner is one down, and a
    /// controller owns under its own name.
    fn owner_of(&self, path: &str) -> String {
        let Some((tier, rest)) = self.tiers.iter().find_map(|tier| {
            path.strip_prefix(&format!("{tier}/"))
                .map(|rest| (tier, rest))
        }) else {
            return String::new();
        };
        let parts: Vec<&str> = rest.split('/').collect();
        if self.foundations.contains(tier) {
            let owner = if parts.len() >= 3 { parts[1] } else { parts[0] };
            return owner.trim_end_matches("-controller").to_owned();
        }
        if parts.len() >= 2 {
            parts[0].to_owned()
        } else {
            String::new()
        }
    }
}

/// Everything the source says about hooks, gathered before anything is judged.
fn survey(context: &Context) -> Survey {
    let mut survey = Survey {
        tiers: context.settings.tiers.clone(),
        foundations: context.settings.foundations(&context.root),
        ..Survey::default()
    };
    /* The component source, and the package holding the token layer.
    **That package reads hooks without declaring any**, and that split is how one
    goes missing: the declaration stays in one place while the rule moves to
    another. It is derived from the sheets rather than named again, and an
    application's own stylesheets are deliberately not here: a hook in one is
    that application's, not a component's API. */
    let mut roots: Vec<std::path::PathBuf> = context.settings.roots(&context.root);
    for sheet in &context.settings.layer {
        let Some(directory) = context.root.join(sheet).parent().map(Path::to_path_buf) else {
            continue;
        };
        if directory.is_dir() && !roots.contains(&directory) {
            roots.push(directory);
        }
        survey.layer_packages.insert(package_of(sheet));
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
                let boundary = DECLARED.find(&text).map(|one| one.start());
                for found in DOCUMENTED.captures_iter(&text) {
                    let name = found[1].to_owned();
                    let whole = found.get(0).expect("group zero always matches");
                    if boundary.is_some_and(|at| whole.start() > at) {
                        survey.misplaced.insert(name.clone(), where_.clone());
                    }
                    survey.declared.insert(name.clone(), where_.clone());
                    *survey
                        .declared_at
                        .entry((where_.clone(), name.clone()))
                        .or_default() += 1;
                    let owner = survey.owner_of(&where_);
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
                /* Comments blanked, or a `var()` in a sentence explaining a
                hook answered for it as a read, and the hook no rule reads was
                never reported. */
                let text = blanked(&text);
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

            touches(&mut survey, &text, &where_, stylesheet);
            privates(&mut survey, context, &text, &where_, stylesheet);
            borrowed(&mut survey, &text, &where_, stylesheet);
        }
    }

    survey
}

/// Every public hook one file touches, and the package it touched it from.
///
/// Wider than the two maps above on purpose. Those answer "is this hook read by
/// a rule" and "is it set by a sheet", which are questions about the mechanism;
/// this one answers "does the package that published the name have anything to
/// do with it", which is what a declaration on a reference page promises. So a
/// module's `var()` counts wherever it sits and not only inside a `style=`, and
/// a `setProperty` counts as the write it is.
///
/// Comments are stripped, or the `@cssproperty` line directly above a hook and
/// the paragraph explaining it would both answer for it.
fn touches(survey: &mut Survey, text: &str, where_: &str, stylesheet: bool) {
    let source = if stylesheet {
        blanked(text)
    } else {
        uncommented(text)
    };
    let package = package_of(where_);
    let mut touched = |name: &str| {
        if ours(name) {
            survey
                .touched_in
                .entry(name.to_owned())
                .or_default()
                .insert(package.clone());
        }
    };
    for found in READS.captures_iter(&source) {
        touched(&found[1]);
    }
    for found in TOUCH_WRITTEN.captures_iter(&source) {
        touched(&found[1]);
    }
    for found in TOUCH_SET.captures_iter(&source) {
        touched(&found[1]);
    }
    for found in TOUCH_FAMILY.captures_iter(&source) {
        if ours(&found[1]) {
            survey
                .touched_family
                .entry(found[1].to_owned())
                .or_default()
                .insert(package.clone());
        }
    }
}

/// What a shared stylesheet publishes, and who takes it.
///
/// Three questions over the same text, and which one a file answers is decided
/// by where it sits: a sheet under `shared/` publishes, anything else composes
/// and reads. Comments are stripped, because `series.css` writes
/// `var(--chart-series-3)` in its own explanation of why the count belongs to
/// the tier that can count it.
fn borrowed(survey: &mut Survey, text: &str, where_: &str, stylesheet: bool) {
    let source = COMMENT.replace_all(text, "");
    let Some(rest) = where_.split_once("/shared/").map(|(_, one)| one) else {
        /* A composer, and a reader of whatever privates a sheet gave it. */
        let owner = survey.owner_of(where_);
        if owner.is_empty() {
            return;
        }
        for found in COMPOSES.captures_iter(&source) {
            survey
                .composes
                .entry(format!("{}/{}", &found[1], &found[2]))
                .or_default()
                .entry(owner.clone())
                .or_insert_with(|| where_.to_owned());
        }
        for found in PRIVATE_READ.captures_iter(&source) {
            survey
                .private_read_by
                .entry(found[1].to_owned())
                .or_default()
                .entry(owner.clone())
                .or_insert_with(|| where_.to_owned());
        }
        return;
    };
    if !stylesheet {
        return;
    }
    let key = rest.trim_end_matches(".css").to_owned();
    for found in ALIASES.captures_iter(&source) {
        for read in READS.captures_iter(&found[2]) {
            if ours(&read[1]) {
                survey
                    .shared_alias
                    .entry(found[1].to_owned())
                    .or_default()
                    .insert(read[1].to_owned());
            }
        }
    }
    /* A hook this sheet reads for every composer rather than through a private,
    which is the difference between what the sheet does and what it offers. */
    let aliased = ALIASES.replace_all(&source, "");
    for found in READS.captures_iter(&aliased) {
        if ours(&found[1]) {
            survey
                .shared_direct
                .entry(key.clone())
                .or_default()
                .insert(found[1].to_owned());
        }
    }
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

    for (name, path) in &survey.misplaced {
        findings.push(Finding {
            detail: "The analyzer reads the block the element is declared on, so a hook \
                     documented on a property is API the reference page never lists, while \
                     this rule reads the source and pairs it happily."
                .to_owned(),
            file: path.clone(),
            message: format!("documents `{name}` below the class block, where nothing collects it"),
        });
    }

    findings.extend(elsewhere(survey));

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
        /* A registered prefix is the decision that the families mean one thing
        by the name, so several pages listing it is several right pages rather
        than a collision. Without this a family could not publish a hook its own
        element reads, which is the fault below. */
        if owners.len() > 1 && !registered(context, name) {
            findings.push(Finding {
                detail: "A consumer setting it on a container holding both sets two different \
                         things, and neither component is wrong. A public name cannot be shared \
                         unless its prefix is registered in `shared`."
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

    findings.extend(unpublished(survey, context));
    findings.extend(unpaired(survey));

    findings
}

/// A hook declared by a package that has nothing to do with it.
///
/// The two-way check pairs a declaration with a reader anywhere in the
/// workspace, so a hook published on one tier's page and read only from
/// another tier's sheet passes it while a consumer of the publishing package
/// sets it and nothing moves. Held to one package it fails, and a package that
/// ships no stylesheet still passes on the write: a template or a
/// `setProperty` is what `headless` and `core` publish, and the examples beside
/// a component read it back.
fn elsewhere(survey: &Survey) -> Vec<Finding> {
    let mut findings = Vec::new();
    for (path, name) in survey.declared_at.keys() {
        let package = package_of(path);
        /* The layer's own reads count for every package. A slotted link is
        styled by the page's rules ahead of anything the shadow root says, so
        a hook on it is read in the layer and published by the component. */
        let touched = survey.touched_in.get(name).is_some_and(|packages| {
            packages.contains(&package)
                || packages
                    .iter()
                    .any(|one| survey.layer_packages.contains(one))
        });
        let family = name.rfind('-').filter(|at| *at > 0).is_some_and(|at| {
            survey
                .touched_family
                .get(&name[..at])
                .is_some_and(|packages| packages.contains(&package))
        });
        if touched || family {
            continue;
        }
        findings.push(Finding {
            detail: "A hook published by a package that neither writes it nor reads it back \
                     offers a consumer of that package a name it does nothing with, and the \
                     pairing above cannot see it, being satisfied by a reader anywhere in the \
                     workspace. Declare it where it is read, or write it here."
                .to_owned(),
            file: path.clone(),
            message: format!("documents `{name}`, which nothing in {package} reads or writes"),
        });
    }
    findings
}

/// Whether a hook's prefix is a registered shared vocabulary.
fn registered(context: &Context, name: &str) -> bool {
    let bare = name.trim_start_matches("--");
    context
        .settings
        .shared
        .iter()
        .any(|one| bare.starts_with(&format!("{one}-")))
}

/// Whether anything in the base package declares a hook.
///
/// A hook declared there arrives through a mixin or a controller the family
/// takes, so the manifest already resolves it onto that family's page and a
/// restatement would be the duplicate the check above refuses.
fn from_core(survey: &Survey, name: &str) -> bool {
    survey.declared.get(name).is_some_and(|path| {
        survey
            .foundations
            .iter()
            .any(|tier| path.starts_with(&format!("{tier}/")))
    })
}

/// A shared sheet's hook that a family reads and does not publish.
fn unpublished(survey: &Survey, context: &Context) -> Vec<Finding> {
    let mut findings = Vec::new();
    let mut say = |name: &str, owner: &String, path: &String, how: String| {
        if !registered(context, name) || from_core(survey, name) {
            return;
        }
        if survey
            .declared_by
            .get(name)
            .is_some_and(|owners| owners.contains_key(owner))
        {
            return;
        }
        findings.push(Finding {
            detail: "A reference page is built per family, so a hook left on the other family's \
                     page is API this one's reader never finds. A registered shared prefix means \
                     one name with one meaning, which is what makes both pages right."
                .to_owned(),
            file: path.clone(),
            message: format!("{how} and does not document `{name}` with `@cssproperty`"),
        });
    };

    for (sheet, owners) in &survey.composes {
        for name in survey.shared_direct.get(sheet).into_iter().flatten() {
            for (owner, path) in owners {
                say(
                    name,
                    owner,
                    path,
                    format!("composes `shared/{sheet}`, which reads `{name}`"),
                );
            }
        }
    }

    /* Followed rather than assumed, a shared sheet offering different hooks to
    different composers: three of `series.css`'s six read `--_chart-stroke` and
    three draw no line at all. */
    for (private, names) in &survey.shared_alias {
        for name in names {
            for (owner, path) in survey.private_read_by.get(private).into_iter().flatten() {
                say(
                    name,
                    owner,
                    path,
                    format!("reads `{private}`, which resolves `{name}`"),
                );
            }
        }
    }

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
