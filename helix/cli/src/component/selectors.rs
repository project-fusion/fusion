//! Every selector a component writes matches something it renders.
//!
//! **Four rules, and each fails silently in its own way.**
//!
//! A `[part="x"]` for a part nothing renders is valid CSS that matches nothing,
//! so a component's own stylesheet has a dead rule and the only sign is that the
//! element looks unstyled.
//!
//! A `::slotted()` on the default slot setting an inherited property never
//! reaches a value written as bare text: a text node has no box to put a padding
//! on, and the inheriting properties have to go on the slot itself.
//!
//! A `:host([x])` for an attribute the class does not declare *works*, which is
//! the problem: it is an API in a stylesheet and nowhere else, so it reaches no
//! manifest, no framework type and no documentation page.
//!
//! A `:has()` inside the functional `:host()` is not allowed in any form, so the
//! rule is dropped when the sheet is parsed and has never matched. A region
//! cannot detect its own emptiness that way.
//!
//! **And the same question asked of TypeScript, where it is worse.** A stale
//! `querySelector('[part="x"]')` returns `null`, so what breaks is behavior
//! rather than appearance, and an optional chain swallows it. A component reads
//! its own scrollport, its own dialog, its own surface this way. Only a lookup
//! on the component's *own* root: one reaching into another element's root is
//! that element's business and is checked where that element is.
//!
//! **Comments are stripped for a sharper reason here than elsewhere.** These
//! components document themselves in prose that quotes markup, and a docblock
//! explaining which wrapper a component does *not* render names that part in
//! `part="…"` form. Read with comments in, the scan credits the component with
//! rendering the very part whose absence is being described.
//!
//! **A `[part="x"]` inside a selector string is not a render.** Harvesting
//! `part="x"` without excluding the leading bracket lets a lookup satisfy
//! itself: the selector being checked counts as evidence the part exists.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::component::compositions::forwards_in;
use crate::component::text::{blanked, flattened, line_of, uncommented};
use crate::component::{sources, stylesheets, Context, Finding, Report};

static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+)(?:\s+extends\s+([\w<>(),\s]+?))?\s*\{")
        .expect("a literal pattern compiles")
});

static EXPORTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export (?:class|const) (\w+)").expect("a literal pattern compiles")
});

static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"part="([a-z0-9 -]+)""#).expect("a literal pattern compiles"));

static SELECTS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\[part~?="([a-z-]+)"\]"#).expect("a literal pattern compiles"));

static HELPER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export const (draw[A-Z]\w*)").expect("a literal pattern compiles")
});

static CALLS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b(draw[A-Z]\w*)\s*\(").expect("a literal pattern compiles"));

static DEFAULT_SLOT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)slot:not\(\[name\]\)::slotted\(([^)]*)\)[^{]*\{([^}]*)\}")
        .expect("a literal pattern compiles")
});

/// Whether a `::slotted()` argument can match a bare text node.
///
/// **It cannot when the argument names an element**, and that is the whole of
/// this rule's premise: the complaint is that a consumer who writes a value as
/// text gets none of the inherited properties, because a text node has no box
/// for them to land on. A selector reading `::slotted(a)` was never aimed at
/// text. It is aimed at the one thing a consumer slots that arrives carrying
/// paint of its own, which is an anchor the user agent has already colored, and
/// putting the declaration on the slot instead is exactly the move that does not
/// work there: the slot's color is what the anchor is overriding.
///
/// `*` and a bare pseudo-class still match everything an element can be, so
/// those are the ones the rule keeps.
fn names_an_element(argument: &str) -> bool {
    let trimmed = argument.trim();
    !trimmed.is_empty()
        && trimmed
            .chars()
            .next()
            .is_some_and(|first| first.is_ascii_alphabetic())
}

static DECLARED_PROPERTY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@property\(([^)]*)\)\s*(?:override\s+)?(?:(?:get|set)\s+)?(\w+)")
        .expect("a literal pattern compiles")
});

static ON_HOST: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s):host\([^)]*?\[([a-z-]+)[\]=]").expect("a literal pattern compiles")
});

static WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\w+").expect("a literal pattern compiles"));

static EXPLICIT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"attribute:\s*'([^']+)'").expect("a literal pattern compiles"));

static PROPERTY_NAME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([a-z-]+)\s*:").expect("a literal pattern compiles"));

/// A `[part=]` lookup on the component's own root, and only that.
///
/// The receiver may sit on its own line, so the whitespace is not optional.
///
/// **`this.partNamed('x')` is the same lookup under one guard**, `HelixElement`'s,
/// and is read the same way: a component that moved its lookups there would
/// otherwise have moved them out of this check without anybody noticing, which
/// is the silent shape of failure the check exists for.
/// A mixin, which is a `const` returning a class.
static MIXIN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"export const (Mixin\w+)\s*=").expect("a literal pattern compiles")
});

static OWN_ROOT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?s)this\.(?:(?:renderRoot|shadowRoot)\??\s*\.\s*querySelector(?:All)?(?:<[^>(]*>)?\(\s*['"`]\[part~?=["']([a-z0-9-]+)["']\]|partNamed(?:<[^>(]*>)?\(\s*['"`]([a-z0-9-]+)['"`]\s*\))"#,
    )
    .expect("a literal pattern compiles")
});

/// Properties that reach a text node by inheriting.
const INHERITED: [&str; 15] = [
    "color",
    "font",
    "font-family",
    "font-size",
    "font-style",
    "font-variant",
    "font-weight",
    "letter-spacing",
    "line-height",
    "text-align",
    "text-indent",
    "text-transform",
    "white-space",
    "word-break",
    "word-spacing",
];

/// Written imperatively rather than declared, plus what the platform owns.
static NOT_A_PROPERTY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:data-|aria-)|^(?:dir|disabled|hidden|id|lang|slot|part|popover)$")
        .expect("a literal pattern compiles")
});

/// What every class in the source renders, extends, declares, and lives in.
#[derive(Default)]
struct Survey {
    attributes: BTreeMap<String, BTreeSet<String>>,
    bases: BTreeMap<String, Vec<String>>,
    /// Where each name was found, relative to the root.
    ///
    /// **Relative, and the root is here because of it.** Every path in this
    /// survey is stripped of the root so a finding names something a reader
    /// recognizes, and one place then read those paths back with no root joined
    /// on: correct from the workspace directory and wrong from anywhere else, so
    /// `--root` reported four shared stylesheets as owned by nothing.
    file_of: BTreeMap<String, String>,
    root: PathBuf,
    /// The family each class was found in, so a mixin's lookups can be read
    /// against what its hosts render.
    family_of: BTreeMap<String, String>,
    in_family: BTreeMap<String, BTreeSet<String>>,
    renders: BTreeMap<String, BTreeSet<String>>,
}

/// The parts a body writes out, a leading bracket excluded.
fn written(code: &str) -> Vec<String> {
    PART.captures_iter(code)
        .filter(|found| {
            let at = found.get(0).expect("group zero always matches").start();
            !code[..at].ends_with('[')
        })
        .flat_map(|found| {
            found[1]
                .split_whitespace()
                .map(str::to_owned)
                .collect::<Vec<String>>()
        })
        .collect()
}

/// Everything a class has, including what it inherits.
fn resolved(
    of: &BTreeMap<String, BTreeSet<String>>,
    bases: &BTreeMap<String, Vec<String>>,
    name: &str,
    seen: &mut BTreeSet<String>,
    found: &mut BTreeSet<String>,
) {
    if !seen.insert(name.to_owned()) {
        return;
    }
    found.extend(of.get(name).into_iter().flatten().cloned());
    for parent in bases.get(name).into_iter().flatten() {
        resolved(of, bases, parent, seen, found);
    }
}

fn survey(context: &Context) -> Survey {
    let tiers = context.settings.roots(&context.root);
    let mut survey = Survey {
        root: context.root.clone(),
        ..Survey::default()
    };

    /* What each shared `draw…` helper writes, read once. */
    let mut helpers: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let code = flattened(&uncommented(&raw));
            if let Some(name) = HELPER.captures(&code) {
                helpers.insert(name[1].to_owned(), written(&code));
            }
        }
    }

    for tier in &tiers {
        let mut files = Vec::new();
        sources(tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let text = flattened(&uncommented(&raw));
            let where_ = context.relative(&file);

            /* Every name in the clause, not just the innermost: a control
            extends a stack of mixins and each renders part of the markup, so
            reading only the base leaves everything a mixin renders looking
            dead. Newlines are allowed, because a chain long enough to wrap does
            not match a pattern excluding them and the scan then sees no bases at
            all. */
            let mut declared_here = Vec::new();
            for found in CLASS.captures_iter(&text) {
                let name = found[1].to_owned();
                declared_here.push(name.clone());
                for parent in WORD.find_iter(found.get(2).map_or("", |one| one.as_str())) {
                    if parent.as_str() != name {
                        survey
                            .bases
                            .entry(name.clone())
                            .or_default()
                            .push(parent.as_str().to_owned());
                    }
                }
                survey.renders.entry(name.clone()).or_default();
                survey.file_of.insert(name, where_.clone());
            }

            /* Parts belong to the last thing declared in the file, which is the
            only one in a component file. A mixin is a `const` rather than a
            class, and its markup is as real as any component's. */
            let last = EXPORTED
                .captures_iter(&text)
                .map(|one| one[1].to_owned())
                .last();
            if let Some(last) = last {
                survey.renders.entry(last.clone()).or_default();
                survey.file_of.entry(last.clone()).or_insert(where_.clone());
                survey.attributes.entry(last.clone()).or_default();
                let held = survey.renders.entry(last.clone()).or_default();
                held.extend(written(&text));
                for call in CALLS.captures_iter(&text) {
                    if let Some(parts) = helpers.get(&call[1]) {
                        held.extend(parts.iter().cloned());
                    }
                }
                /* The attributes Lit derives: the property name lowercased, and
                the explicit `attribute:` where one is given. `get` and `set` are
                skipped or the wrong name is recorded, an accessor pair filing
                every controlled property under one word. */
                let declared = survey.attributes.entry(last).or_default();
                for found in DECLARED_PROPERTY.captures_iter(&text) {
                    let options = found[1].to_owned();
                    if options.contains("attribute: false") {
                        continue;
                    }
                    let explicit = EXPLICIT.captures(&options).map(|one| one[1].to_owned());
                    declared.insert(explicit.unwrap_or_else(|| found[2].to_lowercase()));
                }
            }

            /* **A controller owns no parts**, so a family is only asked about
            where there is one: a lookup in a controller reads a part out of
            whatever host applies it. */
            let Some(family) = crate::component::family(&file, tier) else {
                continue;
            };
            for name in declared_here {
                survey.family_of.insert(name, family.to_owned());
            }
            let found = survey.in_family.entry(family.to_owned()).or_default();
            found.extend(written(&text));
            /* A forwarded name is reachable on the host too. */
            found.extend(forwards_in(&text).into_iter().map(|(_, exposed)| exposed));
        }
    }
    survey
}

/// What is inside each `:host(...)`, one string per occurrence.
///
/// Paren-counted rather than matched, and the regex is why: `[^{]*` runs past
/// the closing paren and on through the descendant selectors after it, so a
/// legal `:host([x]) [part="y"]:has(:focus-visible)` reads as dropped and the
/// rule it names works. `:host()` takes a compound selector that can hold parens
/// of its own, so counting them is the only way to know where it ends.
fn host_arguments(css: &str) -> Vec<String> {
    let bytes = css.as_bytes();
    let mut found = Vec::new();
    let mut at = 0;
    while let Some(start) = css[at..].find(":host(").map(|one| one + at) {
        let mut depth = 0;
        let mut scan = start + ":host".len();
        while scan < bytes.len() {
            match bytes[scan] {
                b'(' => depth += 1,
                b')' => {
                    depth -= 1;
                    if depth == 0 {
                        found.push(css[start + ":host(".len()..scan].to_owned());
                        break;
                    }
                }
                /* An unbalanced `:host(` cannot be a selector. */
                b'{' => break,
                _ => {}
            }
            scan += 1;
        }
        at = start + 1;
    }
    found
}

pub fn run(context: &Context) -> Report {
    let survey = survey(context);
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            /* `blanked`, a sheet's `//` being the middle of a URL rather than
               a comment: read as one, it hid every part after it on the line. */
            let css = blanked(&raw);
            let where_ = context.relative(&sheet);
            checked += judge_sheet(&survey, &css, &where_, &sheet, &mut findings);
        }
    }

    lookups(context, &survey, &mut findings);

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "stylesheets and every `[part=]` lookup",
    }
}

/// One stylesheet, against the three rules that read CSS.
fn judge_sheet(
    survey: &Survey,
    css: &str,
    where_: &str,
    sheet: &Path,
    findings: &mut Vec<Finding>,
) -> usize {
    /* The default slot's `::slotted()` reaching a value written as bare text. */
    for rule in DEFAULT_SLOT.captures_iter(css) {
        if names_an_element(&rule[1]) {
            continue;
        }
        let mut missed: Vec<String> = PROPERTY_NAME
            .captures_iter(&rule[2])
            .map(|one| one[1].to_owned())
            .filter(|one| INHERITED.contains(&one.as_str()))
            .collect();
        missed.sort();
        missed.dedup();
        if !missed.is_empty() {
            findings.push(Finding {
                detail: "A text node has no box, so those never arrive. Move them onto the slot \
                         itself."
                    .to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "the default slot's `::slotted()` sets {}",
                    missed.join(", ")
                ),
            });
        }
    }

    for inside in host_arguments(css) {
        if !inside.contains(":has(") {
            continue;
        }
        findings.push(Finding {
            detail: "`:has()` is not allowed inside the functional `:host()`, in any form, so \
                     this rule has never matched. A region cannot detect its own emptiness."
                .to_owned(),
            file: where_.to_owned(),
            message: format!(
                "`:host({})` is dropped when the sheet is parsed",
                inside.trim()
            ),
        });
    }

    /* A `:host([x])` for an attribute the sibling class does not declare. */
    let sibling = where_.replace(".css", ".ts");
    if let Some(owner) = survey
        .file_of
        .iter()
        .find(|(_, path)| **path == sibling)
        .map(|(name, _)| name.clone())
    {
        let mut available = BTreeSet::new();
        resolved(
            &survey.attributes,
            &survey.bases,
            &owner,
            &mut BTreeSet::new(),
            &mut available,
        );
        let used: BTreeSet<String> = ON_HOST
            .captures_iter(css)
            .map(|one| one[1].to_owned())
            .collect();
        for attribute in used {
            if NOT_A_PROPERTY.is_match(&attribute) || available.contains(&attribute) {
                continue;
            }
            findings.push(Finding {
                detail: "It works, which is the problem: it is an API in a stylesheet and \
                         nowhere else, so it reaches no manifest, no framework type and no \
                         documentation page."
                    .to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "`:host([{attribute}])` selects an attribute `{owner}` does not declare"
                ),
            });
        }
    }

    parts_of(survey, css, where_, sheet, findings)
}

/// Every `[part=]` the sheet selects on, against what its owners render.
fn parts_of(
    survey: &Survey,
    css: &str,
    where_: &str,
    sheet: &Path,
    findings: &mut Vec<Finding>,
) -> usize {
    let sibling = where_.replace(".css", ".ts");
    let selected: BTreeSet<String> = SELECTS
        .captures_iter(css)
        .map(|one| one[1].to_owned())
        .collect();
    if selected.is_empty() {
        return 0;
    }
    let mut owners: Vec<String> = survey
        .file_of
        .iter()
        .filter(|(_, path)| **path == sibling)
        .map(|(name, _)| name.clone())
        .collect();
    if owners.is_empty() {
        /* A shared sheet has no sibling and is composed instead, so its owners
        are whoever imports it. That is the stronger check: a part named there
        has to be rendered by every control that composes it. */
        let specifier = sheet
            .file_stem()
            .map(|one| one.to_string_lossy().to_string())
            .unwrap_or_default();
        let wanted = format!("/{specifier}.css.js'");
        owners = survey
            .file_of
            .iter()
            .filter(|(_, path)| {
                /* Joined, because these are root-relative: reading one bare is
                a question about the working directory rather than about the
                workspace. */
                fs::read_to_string(survey.root.join(path)).is_ok_and(|text| text.contains(&wanted))
            })
            .map(|(name, _)| name.clone())
            .collect();
    }
    if owners.is_empty() {
        findings.push(Finding {
            detail: "A stylesheet nothing composes is one whose parts cannot be checked."
                .to_owned(),
            file: where_.to_owned(),
            message: "nothing owns it, so its parts cannot be checked".to_owned(),
        });
        return 0;
    }
    for owner in owners {
        let mut available = BTreeSet::new();
        resolved(
            &survey.renders,
            &survey.bases,
            &owner,
            &mut BTreeSet::new(),
            &mut available,
        );
        for part in &selected {
            if available.contains(part) {
                continue;
            }
            let had: Vec<String> = available.iter().cloned().collect();
            findings.push(Finding {
                detail: format!(
                    "`{owner}` renders: {}.",
                    if had.is_empty() {
                        "none".to_owned()
                    } else {
                        had.join(", ")
                    }
                ),
                file: where_.to_owned(),
                message: format!("`[part=\"{part}\"]` matches nothing"),
            });
        }
    }
    1
}

/// Every `[part=]` lookup written in TypeScript rather than in CSS.
fn lookups(context: &Context, survey: &Survey, findings: &mut Vec<Finding>) {
    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let (Some(family), Ok(text)) = (
                crate::component::family(&file, &tier),
                fs::read_to_string(&file),
            ) else {
                continue;
            };
            /* Blanked to the same length, so the offset is a real line number. */
            let code = uncommented(&text);
            let where_ = context.relative(&file);
            /* **A mixin reads a part out of whatever host applies it**, the way
            `parts` credits what a mixin renders to every host in its chain. So
            its lookups are read against the union of what its hosts render, and
            reported only when no host renders the name. A family's own lookups
            are read against the family, as before.

            **And against what the mixin renders itself**, which the union left
            out: `MixinViewport` draws the controls from its own template, so a
            lookup of them there was reported as reading a part nothing renders,
            and the only way to measure the cluster was a lookup in the host
            that this rule then reported instead. */
            let mixins: Vec<String> = MIXIN
                .captures_iter(&text)
                .map(|one| one[1].to_owned())
                .collect();
            let (scope, rendered) = if mixins.is_empty() {
                (
                    format!("`{family}`"),
                    survey.in_family.get(family).cloned().unwrap_or_default(),
                )
            } else {
                let mut union: BTreeSet<String> =
                    written(&flattened(&code)).into_iter().collect();
                for (class, bases) in &survey.bases {
                    if bases.iter().any(|base| mixins.contains(base)) {
                        if let Some(host) = survey.family_of.get(class) {
                            union.extend(survey.in_family.get(host).cloned().unwrap_or_default());
                        }
                    }
                }
                (format!("any host of `{}`", mixins.join("`, `")), union)
            };
            for found in OWN_ROOT.captures_iter(&code) {
                let part = found
                    .get(1)
                    .or_else(|| found.get(2))
                    .expect("one of the two spellings captured the name")
                    .as_str()
                    .to_owned();
                if rendered.contains(&part) {
                    continue;
                }
                let at = found.get(0).expect("group zero always matches").start();
                findings.push(Finding {
                    detail: format!(
                        "Rendered there: {}.",
                        rendered.iter().cloned().collect::<Vec<String>>().join(", ")
                    ),
                    file: format!("{where_}:{}", line_of(&code, at)),
                    message: format!(
                        "looks up `[part=\"{part}\"]` and nothing in {scope} renders it, so \
                         this returns null and whatever it was going to do silently does not \
                         happen"
                    ),
                });
            }
        }
    }
}
