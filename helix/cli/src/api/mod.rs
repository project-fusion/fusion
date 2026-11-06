//! What the installed Helix packages say about themselves, one question at a
//! time: `helix api` and the MCP server's lookups.
//!
//! **Read from the project's `node_modules`, so every answer is the installed
//! version's.** `analyze` writes `api.json` and `examples.json` beside each
//! package's manifest, from the same `catalog()` the site's family pages are
//! written from, and `@fusion.dev/helix-styles` publishes `tokens.json`. This
//! module finds those files the way Node finds a package and answers from
//! them. It computes nothing a catalog field already holds, so the site, the
//! command line and an agent read one answer, and every answer names the
//! packages and versions it came from.
//!
//! **Every documented package, and the same set the site documents.** A
//! package is documented when its `exports` names `./api.json` and it is not
//! `private`, so `@fusion.dev/helix-sandbox`'s editor is in the Sandbox family
//! here as it is on the Sandbox page. A family is merged across them by one
//! rule, the one `catalog()` follows: the package holding its root supplies its
//! facts, and every package adds its elements and examples.

mod anatomy;
mod print;

pub use anatomy::anatomy;
pub use print::print;

use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};

use fusion_rules::error::{Failure, Outcome};
use serde_json::{json, Map, Value};

use crate::scan::nearest;

/// The packages a question is answered from first, in this order: the styled
/// tier, which is the one almost everyone installs, then the headless tier.
/// Every other documented package follows by name.
const LEAD: [&str; 2] = ["@fusion.dev/helix", "@fusion.dev/helix-headless"];

/// The tiers an element is in, in the order a question is answered.
const TIERS: [&str; 2] = ["styled", "headless"];

/// The package that publishes the token set.
const STYLES: &str = "@fusion.dev/helix-styles";

/// One installed package that publishes a file a tool reads.
pub struct Documented {
    /// The package's directory in `node_modules`.
    pub dir: PathBuf,
    /// The file its `exports` names.
    pub file: PathBuf,
    pub name: String,
}

/// The installed `@fusion.dev` packages that publish `file`, such as
/// `api.json` or `lint.json`: the styled tier, the headless tier, then the
/// rest by name.
///
/// **A package says it is documented.** It is read where its `exports` names
/// `./{file}` and it is not `private`, which is the rule the site's reference
/// follows over the workspace. A package is found the way Node finds one, the
/// nearest `node_modules` first, so a package that does not qualify there
/// hides a copy further up, as it does from the running page.
pub fn documented(from: &Path, file: &str) -> Vec<Documented> {
    let key = format!("./{file}");
    let mut seen = HashSet::new();
    let mut found: BTreeMap<String, Documented> = BTreeMap::new();
    for dir in from.ancestors() {
        let Ok(entries) = std::fs::read_dir(dir.join("node_modules").join("@fusion.dev")) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = format!("@fusion.dev/{}", entry.file_name().to_string_lossy());
            if !seen.insert(name.clone()) {
                continue;
            }
            let dir = entry.path();
            let Some(manifest) = std::fs::read_to_string(dir.join("package.json"))
                .ok()
                .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            else {
                continue;
            };
            if manifest["private"] == true {
                continue;
            }
            let target = &manifest["exports"][&key];
            let Some(target) = target.as_str().or_else(|| target["default"].as_str()) else {
                continue;
            };
            let file = dir.join(target.trim_start_matches("./"));
            if file.is_file() {
                found.insert(name.clone(), Documented { dir, file, name });
            }
        }
    }
    let mut ordered: Vec<Documented> = LEAD.iter().filter_map(|one| found.remove(*one)).collect();
    ordered.extend(found.into_values());
    ordered
}

/// One installed package that documents its elements: its version, and the
/// families its `api.json` lists.
pub struct Package {
    pub dir: PathBuf,
    pub families: Vec<Value>,
    pub name: String,
    pub version: String,
}

/// The installed packages that document their elements, styled first.
pub struct Library {
    pub packages: Vec<Package>,
}

/// One family as the installed packages give it in one tier.
pub struct Merged {
    /// The family: its facts from the package holding its root, and the
    /// elements every package adds, sorted as `catalog()` sorts them.
    pub family: Value,
    /// Where the family's root is not installed, the sentence saying so.
    pub missing: Option<String>,
    /// The packages it was read from, the one holding its root first.
    pub from: Vec<usize>,
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

/// Where a package falls in the order a question is answered.
fn rank(name: &str) -> (usize, &str) {
    (
        LEAD.iter()
            .position(|one| *one == name)
            .unwrap_or(LEAD.len()),
        name,
    )
}

/// The tag of a family's root in a tier.
fn root_tag(slug: &str, tier: &str) -> String {
    if tier == "headless" {
        format!("helix-headless-{slug}")
    } else {
        format!("helix-{slug}")
    }
}

/// The lines a tier's usage opens with: the import of each entry that
/// registers an element of the family, the family's own first, as
/// `usageOf` in `@fusion.dev/helix-cem` writes them.
fn element_lines(elements: &[Value], slug: &str, tier: &str) -> Vec<String> {
    let shown: Vec<&Value> = elements
        .iter()
        .filter(|element| element["tier"] == tier)
        .collect();
    let own = |element: &&&Value| text(&element["entry"]) == slug;
    let mut lines: Vec<String> = Vec::new();
    let all = shown
        .iter()
        .filter(own)
        .map(|element| format!("import '{}'", text(&element["specifier"])))
        .chain(shown.iter().filter(|one| !own(one)).map(|element| {
            format!(
                "import '{}' // {}",
                text(&element["specifier"]),
                text(&element["label"])
            )
        }));
    for line in all {
        if !lines.contains(&line) {
            lines.push(line);
        }
    }
    lines
}

/// The families the packages describe in one tier, each merged across them.
///
/// **The same answer whatever order the packages come in.** The package holding
/// a family's root, the one whose entry is not marked `contributes`, supplies
/// the facts; the others add their elements, sorted with the root's styled
/// first and then by tag, as `catalog()` sorts them. Where one adds an element,
/// the tier's usage is written again from the merged elements, followed by the
/// other families the root's own usage imports.
pub fn merged(packages: &[Package], tier: &str) -> Vec<Merged> {
    let mut order: Vec<usize> = (0..packages.len()).collect();
    order.sort_by(|a, b| rank(&packages[*a].name).cmp(&rank(&packages[*b].name)));
    let mut by_slug: BTreeMap<String, Vec<(usize, &Value)>> = BTreeMap::new();
    for at in order {
        for family in &packages[at].families {
            let shown = family["elements"]
                .as_array()
                .is_some_and(|all| all.iter().any(|element| element["tier"] == tier));
            if shown {
                by_slug
                    .entry(text(&family["slug"]))
                    .or_default()
                    .push((at, family));
            }
        }
    }
    by_slug
        .into_iter()
        .map(|(slug, entries)| {
            let owner = entries
                .iter()
                .find(|(_, family)| family["contributes"] != true)
                .map(|(at, family)| (*at, *family));
            let mut from: Vec<usize> = owner.iter().map(|(at, _)| *at).collect();
            for (at, _) in &entries {
                if !from.contains(at) {
                    from.push(*at);
                }
            }
            let mut family = owner.map_or_else(
                || json!({ "label": entries[0].1["label"], "slug": slug }),
                |(_, family)| family.clone(),
            );
            let mut elements: Vec<Value> = entries
                .iter()
                .flat_map(|(_, one)| one["elements"].as_array().into_iter().flatten())
                .filter(|element| element["tier"] == tier)
                .cloned()
                .collect();
            elements.sort_by(|a, b| {
                (a["tier"] == "headless")
                    .cmp(&(b["tier"] == "headless"))
                    .then_with(|| text(&a["tagName"]).cmp(&text(&b["tagName"])))
            });
            let named = entries
                .iter()
                .find_map(|(_, one)| one["package"].as_str().filter(|name| !name.is_empty()));
            let holder = owner.map_or_else(
                || named.unwrap_or_default().to_owned(),
                |(at, _)| packages[at].name.clone(),
            );
            if let Some(object) = family.as_object_mut() {
                object.remove("contributes");
                if entries.len() > 1 || owner.is_none() {
                    let imports = owner.map_or(0, |(_, one)| {
                        one["imports"].as_array().map_or(0, Vec::len)
                    });
                    let written = object
                        .get("usage")
                        .map(|one| strings(&one[tier]))
                        .unwrap_or_default();
                    let mut usage = element_lines(&elements, &slug, tier);
                    usage.extend_from_slice(&written[written.len().saturating_sub(imports)..]);
                    if !object.get("usage").is_some_and(Value::is_object) {
                        object.insert(
                            "usage".to_owned(),
                            json!({ "headless": [], "styled": [] }),
                        );
                    }
                    object["usage"][tier] = json!(usage);
                }
                object.insert("elements".to_owned(), Value::Array(elements));
                object.insert("package".to_owned(), json!(holder));
            }
            let missing = owner.is_none().then(|| {
                let label = text(&family["label"]);
                let root = root_tag(&slug, tier);
                if holder.is_empty() {
                    format!("The {label} family's root, {root}, is in no installed package.")
                } else {
                    format!(
                        "The {label} family's root, {root}, is in {holder}, which is not installed. Install it for the family's summary, status, and examples."
                    )
                }
            });
            Merged {
                family,
                missing,
                from,
            }
        })
        .collect()
}

impl Library {
    /// Every installed package that documents its elements.
    ///
    /// # Errors
    ///
    /// [`Failure`] when no package is installed, naming the package to
    /// install, or when a tier is installed from before the release that
    /// shipped `api.json`, naming the package to update.
    pub fn load(from: &Path) -> Outcome<Self> {
        let mut packages = Vec::new();
        for one in documented(from, "api.json") {
            let read = read_json(&one.file)?;
            packages.push(Package {
                families: read["families"].as_array().cloned().unwrap_or_default(),
                name: one.name,
                version: version_of(&one.dir),
                dir: one.dir,
            });
        }
        if !packages.is_empty() {
            return Ok(Self { packages });
        }
        Err(
            match LEAD
                .iter()
                .find_map(|package| installed(from, package).map(|dir| (package, dir)))
            {
                Some((package, dir)) => Failure::input(
                    format!("{package} {} has no api.json", version_of(&dir)),
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
            },
        )
    }

    /// The tiers the installed packages have elements in, styled first.
    fn tiers(&self) -> Vec<&'static str> {
        TIERS
            .into_iter()
            .filter(|tier| {
                self.packages.iter().any(|package| {
                    package.families.iter().any(|family| {
                        family["elements"]
                            .as_array()
                            .is_some_and(|all| all.iter().any(|element| element["tier"] == *tier))
                    })
                })
            })
            .collect()
    }

    /// The tier asked for, or the first the installed packages have.
    fn tier(&self, wanted: Option<&str>) -> Outcome<&'static str> {
        let tiers = self.tiers();
        match wanted {
            None => Ok(tiers.first().copied().unwrap_or("styled")),
            Some(name) => tiers
                .iter()
                .find(|tier| **tier == name)
                .copied()
                .ok_or_else(|| {
                    Failure::input(
                        format!("no {name} tier"),
                        "its package is not installed in this project",
                    )
                    .choices(tiers.iter().map(|tier| (*tier).to_owned()).collect())
                }),
        }
    }

    /// Every family the installed packages describe, by slug, from the first
    /// tier that has it.
    fn families(&self) -> Vec<Merged> {
        let mut seen = HashSet::new();
        let mut all = Vec::new();
        for tier in self.tiers() {
            for one in merged(&self.packages, tier) {
                if seen.insert(text(&one.family["slug"])) {
                    all.push(one);
                }
            }
        }
        all
    }

    /// The packages `at` names, with their versions, as a sentence's subject.
    fn named(&self, at: &[usize]) -> String {
        let all: Vec<String> = at
            .iter()
            .map(|one| {
                let package = &self.packages[*one];
                format!("{} {}", package.name, package.version)
            })
            .collect();
        match all.as_slice() {
            [] => String::new(),
            [one] => one.clone(),
            [first, second] => format!("{first} and {second}"),
            [rest @ .., last] => format!("{}, and {last}", rest.join(", ")),
        }
    }

    /// Each package `at` names, with its version.
    fn versions_of(&self, at: &[usize]) -> Value {
        Value::Object(
            at.iter()
                .map(|one| {
                    let package = &self.packages[*one];
                    (package.name.clone(), json!(package.version))
                })
                .collect::<Map<String, Value>>(),
        )
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
    /* A native element's name finds the family that stands in for it:
    `button` is Button, and `h1` is Text. */
    names.extend(
        strings(&family["replaces"])
            .iter()
            .map(|one| one.split('[').next().unwrap_or(one).to_owned()),
    );
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
    let families = library.families();
    let mut scored: Vec<(usize, &Merged)> = families
        .iter()
        .map(|one| (score(&one.family, query), one))
        .filter(|(score, _)| *score > 0)
        .collect();
    scored.sort_by(|a, b| {
        b.0.cmp(&a.0)
            .then_with(|| text(&a.1.family["slug"]).cmp(&text(&b.1.family["slug"])))
    });
    let matches: Vec<Value> = scored
        .into_iter()
        .take(limit.max(1))
        .map(|(_, one)| {
            let family = &one.family;
            json!({
                "aliases": family["aliases"],
                "category": family["category"],
                "replaces": family["replaces"],
                "label": family["label"],
                "package": family["package"],
                "platforms": family["platforms"],
                "slug": family["slug"],
                "status": family["status"],
                "summary": family["summary"],
                "tags": tags(family),
            })
        })
        .collect();
    let every: Vec<usize> = (0..library.packages.len()).collect();
    Ok(json!({ "matches": matches, "query": query, "versions": library.versions_of(&every) }))
}

/// The family `name` names: its slug or one of its tags, which name one family
/// each, or else its label or an alias, which may name several.
///
/// **More than one is refused, never picked.** "Dropdown" is an alias of Menu
/// and of Select, and answering with the first would hand an agent a family
/// it did not ask for, with nothing to say so.
fn resolve<'m>(library: &Library, families: &'m [Merged], name: &str) -> Outcome<&'m Merged> {
    let wanted = name.trim().to_lowercase();
    let exact = families
        .iter()
        .find(|one| text(&one.family["slug"]) == wanted || tags(&one.family).contains(&wanted));
    if let Some(one) = exact {
        return Ok(one);
    }
    let named: Vec<&Merged> = families
        .iter()
        .filter(|one| score(&one.family, &wanted) == 100)
        .collect();
    match named.as_slice() {
        [one] => Ok(one),
        [] => Err(unknown_family(library, families, name)),
        several => Err(Failure::input(
            format!("`{name}` names more than one family"),
            "it is an alias or label of each of these",
        )
        .hint(format!(
            "helix api family {}",
            text(&several[0].family["slug"])
        ))
        .choices(
            several
                .iter()
                .map(|one| text(&one.family["slug"]))
                .collect(),
        )),
    }
}

fn unknown_family(library: &Library, families: &[Merged], name: &str) -> Failure {
    let slugs: Vec<String> = families
        .iter()
        .map(|one| text(&one.family["slug"]))
        .collect();
    let mut read: Vec<usize> = families
        .iter()
        .flat_map(|one| one.from.iter().copied())
        .collect();
    read.sort_unstable();
    read.dedup();
    let close = nearest(&name.to_lowercase(), slugs.iter().map(String::as_str), None);
    let verb = if read.len() == 1 { "has" } else { "have" };
    let mut failure = Failure::input(
        format!("no family called `{name}`"),
        format!(
            "{} {verb} no family, alias, or tag by that name",
            library.named(&read)
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

/// Where the styled tier's example pictures are published.
const SITE: &str = "https://fusion.dev";

/// A file a package publishes beside its `api.json`, where its `exports`
/// names it, and otherwise at its root.
fn beside(package: &Package, file: &str) -> PathBuf {
    std::fs::read_to_string(package.dir.join("package.json"))
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|manifest| {
            manifest["exports"][format!("./{file}")]
                .as_str()
                .map(|target| package.dir.join(target.trim_start_matches("./")))
        })
        .unwrap_or_else(|| package.dir.join(file))
}

/// The environment the package's baselines were taken in, as `examples.json`
/// records it, or null.
fn environment_of(package: &Package) -> Value {
    read_json(&beside(package, "examples.json"))
        .map_or(Value::Null, |read| read["environment"].clone())
}

/// The examples a package ships for one family.
fn examples_of(package: &Package, slug: &str) -> Outcome<Vec<Value>> {
    let path = beside(package, "examples.json");
    if !path.is_file() {
        return Ok(Vec::new());
    }
    Ok(read_json(&path)?["examples"][slug]
        .as_array()
        .cloned()
        .unwrap_or_default())
}

/// Every example of a family, from each package it was read from, the one
/// holding its root first, with the package that ships each.
fn every_example(library: &Library, one: &Merged) -> Outcome<Vec<(usize, Value)>> {
    let slug = text(&one.family["slug"]);
    let mut all = Vec::new();
    for at in &one.from {
        for example in examples_of(&library.packages[*at], &slug)? {
            all.push((*at, example));
        }
    }
    Ok(all)
}

/// One family's API, without its examples, and the names of those.
///
/// # Errors
///
/// [`Failure`] where no package is installed or nothing answers to `name`.
pub fn family(from: &Path, name: &str, tier: Option<&str>) -> Outcome<Value> {
    let library = Library::load(from)?;
    let tier = library.tier(tier)?;
    let families = merged(&library.packages, tier);
    let one = resolve(&library, &families, name)?;
    let examples: Vec<Value> = every_example(&library, one)?
        .iter()
        .map(|(_, example)| {
            let mut listed = json!({
                "description": example["description"],
                "label": example["label"],
                "slug": example["slug"],
            });
            /* What an example shows on another platform, where it differs, so
            an agent writing for React Native reads the words that hold there. */
            if !example["platforms"].is_null() {
                listed["platforms"] = example["platforms"].clone();
            }
            listed
        })
        .collect();
    let first = &library.packages[one.from[0]];
    let mut answer = json!({
        "examples": examples,
        "family": one.family,
        "package": first.name,
        "version": first.version,
        "versions": library.versions_of(&one.from),
    });
    if let Some(missing) = &one.missing {
        answer["missing"] = json!(missing);
    }
    Ok(answer)
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
    let families = merged(&library.packages, tier);
    let one = resolve(&library, &families, name)?;
    let family_slug = text(&one.family["slug"]);
    let examples = every_example(&library, one)?;
    let chosen = match slug {
        Some(slug) => examples.iter().find(|(_, example)| example["slug"] == slug),
        None => examples.first(),
    };
    let Some((at, chosen)) = chosen else {
        return Err(Failure::input(
            format!(
                "no example `{}` in {family_slug}",
                slug.unwrap_or("preview")
            ),
            format!(
                "{} {} these examples for it",
                library.named(&one.from),
                if one.from.len() == 1 { "ships" } else { "ship" }
            ),
        )
        .choices(
            examples
                .iter()
                .map(|(_, example)| text(&example["slug"]))
                .collect(),
        ));
    };
    let package = &library.packages[*at];
    /* **The pictures are the site's**, which publishes the styled tier's
    baselines beside each family's files: the latest release's, taken in the
    environment `examples.json` records. A render compared to one is fair only
    in that environment. */
    let renders: Vec<Value> = if tier == "styled" {
        chosen["renders"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|render| {
                json!({
                    "shot": render["shot"],
                    "url": format!("{SITE}/helix/components/{family_slug}/{}", text(&render["file"])),
                })
            })
            .collect()
    } else {
        Vec::new()
    };
    Ok(json!({
        "environment": environment_of(package),
        "example": chosen,
        "family": family_slug,
        "package": package.name,
        "renders": renders,
        "version": package.version,
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
    for package in &library.packages {
        for family in &package.families {
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
    let every: Vec<usize> = (0..library.packages.len()).collect();
    Ok(json!({ "lines": lines, "unknown": unknown, "versions": library.versions_of(&every) }))
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

/// Every semantic token name the installed token set lists, or `None` where
/// `@fusion.dev/helix-styles` is not installed.
pub fn token_names(from: &Path) -> Option<std::collections::HashSet<String>> {
    let dir = installed(from, STYLES)?;
    let set = read_json(&dir.join("dist").join("tokens.json")).ok()?;
    Some(
        set["tokens"]
            .as_array()?
            .iter()
            .filter_map(|token| token["name"].as_str().map(str::to_owned))
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::{merged, Package};

    fn package(name: &str, version: &str, families: &Value) -> Package {
        Package {
            dir: std::path::PathBuf::new(),
            families: families.as_array().cloned().unwrap_or_default(),
            name: name.to_owned(),
            version: version.to_owned(),
        }
    }

    fn element(tag: &str, package: &str, entry: &str, label: &str) -> Value {
        json!({
            "entry": entry,
            "label": label,
            "package": package,
            "specifier": format!("{package}/{entry}"),
            "status": "experimental",
            "tagName": tag,
            "tier": "styled",
        })
    }

    /// The styled tier's Sandbox, and the editor the sandbox package adds.
    fn installed() -> Vec<Package> {
        vec![
            package(
                "@fusion.dev/helix",
                "1.2.3",
                &json!([{
                    "aliases": ["Playground"],
                    "elements": [
                        element("helix-sandbox", "@fusion.dev/helix", "sandbox", "Sandbox"),
                        element("helix-sandbox-preview", "@fusion.dev/helix", "sandbox", "Sandbox Preview"),
                    ],
                    "imports": ["button"],
                    "label": "Sandbox",
                    "package": "@fusion.dev/helix",
                    "slug": "sandbox",
                    "status": "stable",
                    "summary": "A source pane and a preview.",
                    "usage": {
                        "headless": [],
                        "styled": ["import '@fusion.dev/helix/sandbox'", "import '@fusion.dev/helix/button' // Button"],
                    },
                }]),
            ),
            package(
                "@fusion.dev/helix-sandbox",
                "1.2.4",
                &json!([{
                    "contributes": true,
                    "elements": [element("helix-sandbox-editor", "@fusion.dev/helix-sandbox", "editor", "Sandbox Editor")],
                    "label": "Sandbox",
                    "package": "@fusion.dev/helix",
                    "slug": "sandbox",
                }]),
            ),
        ]
    }

    #[test]
    fn a_family_takes_its_facts_from_its_root_and_its_elements_from_every_package() {
        let all = merged(&installed(), "styled");
        let [one] = all.as_slice() else {
            panic!("one family")
        };
        assert_eq!(one.family["summary"], "A source pane and a preview.");
        assert_eq!(one.family["status"], "stable");
        assert_eq!(one.family["aliases"], json!(["Playground"]));
        assert_eq!(one.family["package"], "@fusion.dev/helix");
        assert!(one.family.get("contributes").is_none());
        assert!(one.missing.is_none());
        assert_eq!(one.from, [0, 1]);
        let tags: Vec<&str> = one.family["elements"]
            .as_array()
            .expect("elements")
            .iter()
            .filter_map(|element| element["tagName"].as_str())
            .collect();
        assert_eq!(
            tags,
            [
                "helix-sandbox",
                "helix-sandbox-editor",
                "helix-sandbox-preview"
            ]
        );
        assert_eq!(
            one.family["usage"]["styled"],
            json!([
                "import '@fusion.dev/helix/sandbox'",
                "import '@fusion.dev/helix-sandbox/editor' // Sandbox Editor",
                "import '@fusion.dev/helix/button' // Button",
            ])
        );
    }

    #[test]
    fn the_merge_is_the_same_in_any_order() {
        let forward = merged(&installed(), "styled");
        let mut backward = installed();
        backward.reverse();
        let reversed = merged(&backward, "styled");
        assert_eq!(forward[0].family, reversed[0].family);
        assert_eq!(forward[0].missing, reversed[0].missing);
    }

    #[test]
    fn a_family_whose_root_is_not_installed_says_where_the_root_is() {
        let mut only = installed();
        only.remove(0);
        let all = merged(&only, "styled");
        let [one] = all.as_slice() else {
            panic!("one family")
        };
        assert_eq!(
            one.missing.as_deref(),
            Some("The Sandbox family's root, helix-sandbox, is in @fusion.dev/helix, which is not installed. Install it for the family's summary, status, and examples.")
        );
        assert!(one.family.get("summary").is_none(), "{}", one.family);
        assert!(one.family.get("status").is_none(), "{}", one.family);
        assert_eq!(one.family["package"], "@fusion.dev/helix");
        assert_eq!(
            one.family["usage"]["styled"],
            json!(["import '@fusion.dev/helix-sandbox/editor' // Sandbox Editor"])
        );
    }

    #[test]
    fn a_family_with_no_other_package_is_left_as_its_package_wrote_it() {
        let mut only = installed();
        only.truncate(1);
        let all = merged(&only, "styled");
        assert_eq!(
            all[0].family["usage"]["styled"],
            only[0].families[0]["usage"]["styled"]
        );
        assert!(merged(&only, "headless").is_empty());
    }
}
