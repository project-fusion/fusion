//! A composed child's parts are forwarded, prefixed, and reachable.
//!
//! **A shadow root is opaque one level down.** A part rendered by a child inside
//! a parent's shadow root is not reachable from outside unless the parent
//! forwards it, and a consumer writing `::part(something)` at it gets no error
//! and no effect: valid CSS, matching nothing.
//!
//! **Prefixed with the role the parent gave the child**, so two levels agreeing
//! on a word cannot collide. One component forwarded a listbox's `search-field`
//! under a name it also rendered itself, and `::part(search-field)` matched two
//! elements. The exception is where the part already is the role, which is the
//! stutter the rule would otherwise produce.
//!
//! **The collision rule runs from the other side too.** Forwarding a child's
//! part under the role while the parent also renders `part="<role>"` makes one
//! selector match two boxes, which is the failure the prefix exists to prevent,
//! arrived at from the opposite direction.
//!
//! **A part may be forwarded twice, the second time under a state.** Nothing
//! follows `::part()` with an attribute, so a composition drawing a child's
//! state for a document stylesheet forwards the part again as
//! `<role>-<part>-<state>` while the state holds, the name a state drawn on a
//! part takes. A second name is the first one and one word more, beside it and
//! never instead of it, and two parts under one name is a collision however it
//! was arrived at.
//!
//! **And every `::part()` written from outside is held to naming one that
//! exists.** Sheets, examples, documentation and a site alike: a selector naming
//! a part nothing publishes is dead in all four and silent in all four. Nothing
//! else looks there: the rules about parts read a component's own sheet and
//! stop.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::compositions::{
    compositions, exposed_as, part_docs_by_tag, second_name_of, Site,
};
use crate::component::text::{flattened, line_of, uncommented};
use crate::component::{sources, walk_outside, Context, Finding, Report};

/// Every tag's parts and their descriptions, keyed by tag suffix.
type PartDocs = BTreeMap<String, BTreeMap<String, String>>;

static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"part="([a-z0-9 -]+)""#).expect("a literal pattern compiles"));

/// A `::part()` written at a tag from outside it.
static REACHES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([a-z][a-z0-9]*(?:-[a-z0-9]+)+)::part\(\s*([a-z0-9-]+)\s*\)")
        .expect("a literal pattern compiles")
});

/// What each file renders in its own right, for the collision rule.
fn renders_own(context: &Context) -> BTreeMap<std::path::PathBuf, BTreeSet<String>> {
    let mut renders_own: BTreeMap<std::path::PathBuf, BTreeSet<String>> = BTreeMap::new();
    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let code = flattened(&uncommented(&text));
            let mut own = BTreeSet::new();
            for found in PART.captures_iter(&code) {
                let whole = found.get(0).expect("group zero always matches");
                if code[..whole.start()].ends_with('[') {
                    continue;
                }
                for word in found[1].split_whitespace() {
                    own.insert(word.to_owned());
                }
            }
            renders_own.insert(file, own);
        }
    }
    renders_own
}

/// What each composition forwards, and whether it forwards enough.
fn composed(context: &Context, docs: &PartDocs, findings: &mut Vec<Finding>) -> usize {
    let sites = compositions(context);
    let renders_own = renders_own(context);
    let mut forwarded = 0;

    for site in &sites {
        forwarded += site.forwarded.len();
        let Some(published) = docs.get(&site.child).filter(|one| !one.is_empty()) else {
            continue;
        };
        let Ok(text) = fs::read_to_string(&site.path) else {
            continue;
        };
        let where_ = format!(
            "{}:{}",
            context.relative(&site.path),
            line_of(&text, site.at)
        );

        /* Something has to name the child, or a forward has no prefix to take. */
        let roles: BTreeSet<&str> = site
            .forwarded
            .iter()
            .filter_map(|(_, one)| one.split('-').next())
            .collect();
        let role = site.role.clone().or_else(|| {
            (roles.len() == 1).then(|| (*roles.iter().next().expect("one role")).to_owned())
        });
        let Some(role) = role else {
            findings.push(Finding {
                detail: "Put a `part` on it, or forward under one name, so a forwarded part has \
                         a prefix."
                    .to_owned(),
                file: where_,
                message: format!(
                    "renders <{}>, which publishes {} parts, and gives it no role",
                    site.child,
                    published.len()
                ),
            });
            continue;
        };

        prefixed(site, published, &role, &where_, findings);
        collisions(site, &role, renders_own.get(&site.path), &where_, findings);
    }

    forwarded
}

/// Every part the child publishes, forwarded under the role, and any second
/// name it takes being that name and a word more.
fn prefixed(
    site: &Site,
    published: &BTreeMap<String, String>,
    role: &str,
    where_: &str,
    findings: &mut Vec<Finding>,
) {
    for part in published.keys() {
        let exposed = exposed_as(role, part);
        let names: Vec<&String> = site
            .forwarded
            .iter()
            .filter(|(inner, _)| inner == part)
            .map(|(_, outer)| outer)
            .collect();
        /* A second name alone is not a forward: it holds only while the state
        does, and the plain name is the one a consumer can always reach. */
        if !names.contains(&&exposed) && names.iter().all(|one| second_name_of(one, &exposed)) {
            findings.push(Finding {
                detail: format!(
                    "A consumer writing `::part({exposed})` reaches nothing, and gets no error \
                     for it. Add `{part}: {exposed}` to this element's `exportparts`."
                ),
                file: where_.to_owned(),
                message: format!(
                    "renders <{}> and does not forward its `{part}` part",
                    site.child
                ),
            });
            continue;
        }
        for actual in names {
            if actual == &exposed || second_name_of(actual, &exposed) {
                continue;
            }
            findings.push(Finding {
                detail: "One prefix per site, or two levels agreeing on a word collide under one \
                         name. A second name is the first and one word more."
                    .to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "forwards <{}>'s `{part}` as `{actual}`, and the role here is `{role}`, so it \
                     reads as `{exposed}`",
                    site.child
                ),
            });
        }
    }
}

/// One selector matching two boxes, which is what the prefix exists to prevent.
fn collisions(
    site: &Site,
    role: &str,
    own: Option<&BTreeSet<String>>,
    where_: &str,
    findings: &mut Vec<Finding>,
) {
    let renders = |name: &str| own.is_some_and(|one| one.contains(name));
    let mut named: BTreeMap<&str, &str> = BTreeMap::new();
    for (part, exposed) in &site.forwarded {
        /* Two of the child's parts under one name, however it was arrived at:
        a second name that is also a plain one, or one second name given twice. */
        if let Some(other) = named
            .insert(exposed.as_str(), part.as_str())
            .filter(|other| *other != part.as_str())
        {
            findings.push(Finding {
                detail: "Rename one of them.".to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "forwards <{}>'s `{other}` and `{part}` both as `{exposed}`, so \
                     `::part({exposed})` matches both",
                    site.child
                ),
            });
        }
        let second = second_name_of(exposed, &exposed_as(role, part));
        if (second && renders(exposed))
            || (exposed == role
                && renders(role)
                && (Some(exposed) != site.role.as_ref() || part == role))
        {
            findings.push(Finding {
                detail: if second {
                    "Rename the second name."
                } else {
                    "Rename the role."
                }
                .to_owned(),
                file: where_.to_owned(),
                message: format!(
                    "forwards <{}>'s `{part}` as `{exposed}`, and this component also renders \
                     `part=\"{exposed}\"`, so `::part({exposed})` matches both",
                    site.child
                ),
            });
        }
    }
}

/// Every `::part()` written from outside a component, wherever it is written.
fn outside(context: &Context, docs: &PartDocs, findings: &mut Vec<Finding>) -> usize {
    let mut checked = 0;
    for root in &context.settings.outside {
        let mut files = Vec::new();
        walk_outside(&context.root.join(root), &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let where_ = context.relative(&file);
            for found in REACHES.captures_iter(&text) {
                let tag = &found[1];
                let part = &found[2];
                let suffix = context
                    .settings
                    .layers
                    .iter()
                    .filter_map(|one| tag.strip_prefix(&one.prefix))
                    .min_by_key(|one| one.len())
                    .unwrap_or(tag);
                /* A tag this library does not declare is not ours to judge. */
                let Some(publishes) = docs.get(suffix) else {
                    continue;
                };
                checked += 1;
                if publishes.contains_key(part) {
                    continue;
                }
                let at = found.get(0).expect("group zero always matches").start();
                findings.push(Finding {
                    detail: format!(
                        "It publishes: {}. A `::part()` matching nothing is valid CSS with no \
                         error and no effect.",
                        publishes
                            .keys()
                            .cloned()
                            .collect::<Vec<String>>()
                            .join(", ")
                    ),
                    file: format!("{where_}:{}", line_of(&text, at)),
                    message: format!(
                        "`{tag}::part({part})` names a part that element does not publish"
                    ),
                });
            }
        }
    }

    checked
}

pub fn run(context: &Context) -> Report {
    let docs = part_docs_by_tag(context);
    let mut findings = Vec::new();
    let forwarded = composed(context, &docs, &mut findings);
    let checked = outside(context, &docs, &mut findings);
    Report {
        checked: forwarded + checked,
        findings,
        notes: Vec::new(),
        unit: "forwarded parts and outside selectors",
    }
}
