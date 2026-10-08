//! What the installed Helix packages say about themselves, one question at a
//! time: `helix api` and the MCP server's lookups.
//!
//! **Read from the project's `node_modules`, so every answer is the installed
//! version's.** `analyze` writes `api.json` and `examples.json` beside each
//! tier's manifest, from the same `catalog()` the site's family pages are
//! written from, and `@fusion.dev/helix-styles` publishes `tokens.json`. This
//! module finds those files the way Node finds a package and answers from
//! them. It computes nothing a catalog field already holds, so the site, the
//! command line and an agent read one answer, and every answer names the
//! package and version it came from.

mod print;

pub use print::print;

use std::path::{Path, PathBuf};

use fusion_rules::error::{Failure, Outcome};
use serde_json::{json, Map, Value};

use crate::scan::nearest;

/// The tiers, in the order a question is answered: the styled tier first,
/// which is the one almost everyone installs.
const TIERS: [(&str, &str); 2] = [
    ("styled", "@fusion.dev/helix"),
    ("headless", "@fusion.dev/helix-headless"),
];

/// The package that publishes the token set.
const STYLES: &str = "@fusion.dev/helix-styles";

/// One installed tier: its package, version, and families.
pub struct Tier {
    pub dir: PathBuf,
    pub families: Vec<Value>,
    /// `styled` or `headless`.
    pub name: &'static str,
    pub package: String,
    pub version: String,
}

/// The installed tiers, styled first.
pub struct Library {
    pub tiers: Vec<Tier>,
}

/// The directory npm installed `package` into, the nearest from `from` up.
fn installed(from: &Path, package: &str) -> Option<PathBuf> {
    from.ancestors()
        .map(|dir| dir.join("node_modules").join(package))
        .find(|dir| dir.join("package.json").is_file())
}

/// The `version` in a package's `package.json`.
fn version_of(dir: &Path) -> String {
    std::fs::read_to_string(dir.join("package.json"))
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|manifest| manifest["version"].as_str().map(str::to_owned))
        .unwrap_or_default()
}

fn read_json(path: &Path) -> Outcome<Value> {
    let text = std::fs::read_to_string(path).map_err(|failure| {
        Failure::input(
            format!("cannot read {}", path.display()),
            failure.to_string(),
        )
    })?;
    serde_json::from_str(&text).map_err(|failure| {
        Failure::input(
            format!("cannot read {}", path.display()),
            failure.to_string(),
        )
    })
}

impl Library {
    /// Every installed tier that ships `api.json`.
    ///
    /// # Errors
    ///
    /// [`Failure`] when no tier is installed, naming the package to install,
    /// or when one is installed from before the release that shipped
    /// `api.json`, naming the package to update.
    pub fn load(from: &Path) -> Outcome<Self> {
        let mut tiers = Vec::new();
        let mut old = Vec::new();
        for (tier, package) in TIERS {
            let Some(dir) = installed(from, package) else {
                continue;
            };
            let api = dir.join("api.json");
            if !api.is_file() {
                old.push(format!("{package} {}", version_of(&dir)));
                continue;
            }
            let read = read_json(&api)?;
            let families = read["families"].as_array().cloned().unwrap_or_default();
            tiers.push(Tier {
                version: version_of(&dir),
                dir,
                families,
                name: tier,
                package: package.to_owned(),
            });
        }
        if tiers.is_empty() {
            return Err(match old.first() {
                Some(first) => Failure::input(
                    format!("{first} has no api.json"),
                    "it was published before the packages shipped their catalog",
                )
                .hint("npm install @fusion.dev/helix@latest"),
                None => Failure::input(
                    "no Helix package",
                    format!(
                        "nothing in node_modules from {} up is @fusion.dev/helix or @fusion.dev/helix-headless",
                        from.display()
                    ),
                )
                .hint("npm install @fusion.dev/helix"),
            });
        }
        Ok(Self { tiers })
    }

    /// The tier asked for, or the first installed.
    fn tier(&self, wanted: Option<&str>) -> Outcome<&Tier> {
        match wanted {
            None => Ok(&self.tiers[0]),
            Some(name) => self
                .tiers
                .iter()
                .find(|tier| tier.name == name)
                .ok_or_else(|| {
                    Failure::input(
                        format!("no {name} tier"),
                        "its package is not installed in this project",
                    )
                    .choices(self.tiers.iter().map(|tier| tier.name.to_owned()).collect())
                }),
        }
    }

    /// Every family the installed tiers describe, by slug, from the first
    /// tier that has it.
    fn families(&self) -> Vec<(&Tier, &Value)> {
        let mut seen = std::collections::HashSet::new();
        let mut all = Vec::new();
        for tier in &self.tiers {
            for family in &tier.families {
                if seen.insert(text(&family["slug"])) {
                    all.push((tier, family));
                }
            }
        }
        all
    }
}

fn text(value: &Value) -> String {
    value.as_str().unwrap_or_default().to_owned()
}

fn strings(value: &Value) -> Vec<String> {
    value
        .as_array()
        .map(|all| {
            all.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

fn tags(family: &Value) -> Vec<String> {
    family["elements"]
        .as_array()
        .map(|all| {
            all.iter()
                .map(|element| text(&element["tagName"]))
                .collect()
        })
        .unwrap_or_default()
}

/// How well a family answers a query: an exact name, then a name holding it,
/// then the words of its summary and category. Zero is no match.
fn score(family: &Value, query: &str) -> usize {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return 0;
    }
    let mut names = vec![text(&family["slug"]), text(&family["label"]).to_lowercase()];
    names.extend(
        strings(&family["aliases"])
            .iter()
            .map(|alias| alias.to_lowercase()),
    );
    names.extend(tags(family));
    if names
        .iter()
        .any(|name| *name == query || name.replace(' ', "-") == query)
    {
        return 100;
    }
    if names.iter().any(|name| name.contains(&query)) {
        return 60;
    }
    let prose = format!(
        "{} {} {}",
        text(&family["summary"]),
        text(&family["category"]),
        strings(&family["aliases"]).join(" ")
    )
    .to_lowercase();
    query
        .split_whitespace()
        .filter(|word| word.len() > 2 && prose.contains(word))
        .count()
        * 20
}

/// The families that answer `query`, best first.
///
/// # Errors
///
/// [`Failure`] where no package is installed.
pub fn find(from: &Path, query: &str, limit: usize) -> Outcome<Value> {
    let library = Library::load(from)?;
    let mut scored: Vec<(usize, &Tier, &Value)> = library
        .families()
        .into_iter()
        .map(|(tier, family)| (score(family, query), tier, family))
        .filter(|(score, _, _)| *score > 0)
        .collect();
    scored.sort_by(|a, b| {
        b.0.cmp(&a.0)
            .then_with(|| text(&a.2["slug"]).cmp(&text(&b.2["slug"])))
    });
    let matches: Vec<Value> = scored
        .into_iter()
        .take(limit.max(1))
        .map(|(_, tier, family)| {
            json!({
                "aliases": family["aliases"],
                "category": family["category"],
                "label": family["label"],
                "package": tier.package,
                "slug": family["slug"],
                "status": family["status"],
                "summary": family["summary"],
                "tags": tags(family),
            })
        })
        .collect();
    Ok(json!({ "matches": matches, "query": query, "versions": versions(&library) }))
}

fn versions(library: &Library) -> Value {
    Value::Object(
        library
            .tiers
            .iter()
            .map(|tier| (tier.package.clone(), Value::String(tier.version.clone())))
            .collect::<Map<String, Value>>(),
    )
}

/// The family `name` names: its slug or one of its tags, which name one family
/// each, or else its label or an alias, which may name several.
///
/// **More than one is refused, never picked.** "Dropdown" is an alias of Menu
/// and of Select, and answering with the first would hand an agent a family
/// it did not ask for, with nothing to say so.
fn resolve<'t>(tier: &'t Tier, name: &str) -> Outcome<&'t Value> {
    let wanted = name.trim().to_lowercase();
    let exact = tier
        .families
        .iter()
        .find(|family| text(&family["slug"]) == wanted || tags(family).contains(&wanted));
    if let Some(family) = exact {
        return Ok(family);
    }
    let named: Vec<&Value> = tier
        .families
        .iter()
        .filter(|family| score(family, &wanted) == 100)
        .collect();
    match named.as_slice() {
        [one] => Ok(one),
        [] => Err(unknown_family(tier, name)),
        several => Err(Failure::input(
            format!("`{name}` names more than one family"),
            "it is an alias or label of each of these",
        )
        .hint(format!("helix api family {}", text(&several[0]["slug"])))
        .choices(several.iter().map(|family| text(&family["slug"])).collect())),
    }
}

fn unknown_family(tier: &Tier, name: &str) -> Failure {
    let slugs: Vec<String> = tier
        .families
        .iter()
        .map(|family| text(&family["slug"]))
        .collect();
    let close = nearest(&name.to_lowercase(), slugs.iter().map(String::as_str), None);
    let mut failure = Failure::input(
        format!("no family called `{name}`"),
        format!(
            "{} {} has no family, alias, or tag by that name",
            tier.package, tier.version
        ),
    )
    .choices(slugs.clone());
    if let Some(close) = close {
        failure = failure.hint(format!("helix api family {close}"));
    } else {
        failure = failure.hint(format!("helix api find {name}"));
    }
    failure
}

/// The examples a tier ships for one family.
fn examples_of(tier: &Tier, slug: &str) -> Outcome<Vec<Value>> {
    let path = tier.dir.join("examples.json");
    if !path.is_file() {
        return Ok(Vec::new());
    }
    Ok(read_json(&path)?["examples"][slug]
        .as_array()
        .cloned()
        .unwrap_or_default())
}

/// One family's API, without its examples, and the names of those.
///
/// # Errors
///
/// [`Failure`] where no package is installed or nothing answers to `name`.
pub fn family(from: &Path, name: &str, tier: Option<&str>) -> Outcome<Value> {
    let library = Library::load(from)?;
    let tier = library.tier(tier)?;
    let family = resolve(tier, name)?;
    let examples: Vec<Value> = examples_of(tier, &text(&family["slug"]))?
        .iter()
        .map(|example| {
            json!({
                "description": example["description"],
                "label": example["label"],
                "slug": example["slug"],
            })
        })
        .collect();
    Ok(json!({
        "examples": examples,
        "family": family,
        "package": tier.package,
        "version": tier.version,
    }))
}

/// One example, with the import lines it needs.
///
/// # Errors
///
/// [`Failure`] where no package is installed, nothing answers to `name`, or
/// the family has no example by that slug.
pub fn example(from: &Path, name: &str, slug: Option<&str>, tier: Option<&str>) -> Outcome<Value> {
    let library = Library::load(from)?;
    let tier = library.tier(tier)?;
    let family = resolve(tier, name)?;
    let family_slug = text(&family["slug"]);
    let examples = examples_of(tier, &family_slug)?;
    let chosen = match slug {
        Some(slug) => examples.iter().find(|example| example["slug"] == slug),
        None => examples.first(),
    };
    let Some(chosen) = chosen else {
        return Err(Failure::input(
            format!(
                "no example `{}` in {family_slug}",
                slug.unwrap_or("preview")
            ),
            format!(
                "{} {} ships these examples for it",
                tier.package, tier.version
            ),
        )
        .choices(
            examples
                .iter()
                .map(|example| text(&example["slug"]))
                .collect(),
        ));
    };
    Ok(json!({
        "example": chosen,
        "family": family_slug,
        "package": tier.package,
        "version": tier.version,
    }))
}

/// The import lines that register `tags`, and the tags no package publishes.
///
/// # Errors
///
/// [`Failure`] where no package is installed.
pub fn imports(from: &Path, wanted: &[String]) -> Outcome<Value> {
    let library = Library::load(from)?;
    let mut specifiers: Vec<(String, String)> = Vec::new();
    for tier in &library.tiers {
        for family in &tier.families {
            for element in family["elements"].as_array().into_iter().flatten() {
                specifiers.push((text(&element["tagName"]), text(&element["specifier"])));
            }
        }
    }
    let mut lines: Vec<String> = Vec::new();
    let mut unknown = Vec::new();
    for tag in wanted {
        let tag = tag
            .trim()
            .trim_start_matches('<')
            .trim_end_matches('>')
            .to_lowercase();
        if let Some((_, specifier)) = specifiers.iter().find(|(name, _)| *name == tag) {
            let line = format!("import '{specifier}'");
            if !lines.contains(&line) {
                lines.push(line);
            }
        } else {
            let bare = tag.strip_prefix("helix-").unwrap_or(&tag);
            let closest = nearest(
                bare,
                specifiers
                    .iter()
                    .filter_map(|(name, _)| name.strip_prefix("helix-")),
                None,
            )
            .map(|close| format!("helix-{close}"));
            unknown.push(json!({ "closest": closest, "tag": tag }));
        }
    }
    Ok(json!({ "lines": lines, "unknown": unknown, "versions": versions(&library) }))
}

/// The semantic tokens, filtered by a word in the name or description and by
/// category.
///
/// # Errors
///
/// [`Failure`] where `@fusion.dev/helix-styles` is not installed.
pub fn tokens(from: &Path, query: Option<&str>, category: Option<&str>) -> Outcome<Value> {
    let dir = installed(from, STYLES).ok_or_else(|| {
        Failure::input(
            format!("no {STYLES}"),
            format!(
                "nothing in node_modules from {} up is {STYLES}",
                from.display()
            ),
        )
        .hint(format!("npm install {STYLES}"))
    })?;
    let set = read_json(&dir.join("dist").join("tokens.json"))?;
    let query = query.map(str::to_lowercase);
    let matching: Vec<Value> = set["tokens"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|token| category.is_none_or(|wanted| token["category"] == wanted))
        .filter(|token| {
            query.as_ref().is_none_or(|query| {
                text(&token["name"]).to_lowercase().contains(query)
                    || text(&token["description"]).to_lowercase().contains(query)
            })
        })
        .cloned()
        .collect();
    Ok(json!({
        "categories": set["categories"],
        "package": STYLES,
        "tokens": matching,
        "version": version_of(&dir),
    }))
}
