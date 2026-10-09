//! A component renders a tag it imports, and never names one literally.
//!
//! **A custom element registers on import**, so a component rendering a tag it
//! does not side-effect import gives a consumer who imported that family alone
//! an inert unknown element. It parses, it lays out as an empty inline box, and
//! nothing anywhere reports it.
//!
//! **A tag written out is a tag one layer owns**, and the base layer may own
//! neither: naming a styled tag is the dependency the layers exist to prevent,
//! and naming its own base tag pins the children of every subclass above to the
//! base layer. A component in the layer above is under the same obligation
//! wherever the template it inherits is the base's. A component that exists only
//! in the outer layer has no layer to be agnostic for and may name what it
//! renders.
//!
//! **A shared module has no layer at all**, which is the case every other rule
//! here is blind to. A free function has no class and no layer to read, so a
//! literal tag in one is a decision about a layer taken by a file that cannot
//! know one, and no test sees it either: a sandbox frame and a docs site both
//! import the whole library, so the tag is always registered by the time
//! anything looks. A free function takes the tag as an argument, which is what
//! every component already does one level up.
//!
//! **And a template that interpolates needs the prefix to interpolate with.** A
//! file inheriting such a template without overriding the layer prefix renders
//! base children inside a styled shadow root.
//!
//! **A project built on Helix has one layer and the same obligation.** A class
//! it builds on a Helix one renders that class's children under its own prefix,
//! and its templates may write its own tags. Each of those tags is registered
//! by some module of the project, and the module rendering it imports that
//! module, directly or through what it imports, or a page importing the one
//! component gets an inert element.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::project::specifier;
use crate::component::text::{line_of, uncommented};
use crate::component::{family, sources, Context, Finding, Layer, Report};

static DEFINED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@customElement\('([a-z0-9-]+)'\)").expect("a literal pattern compiles")
});

static SIDE_EFFECT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^import\s+'([^']+)'").expect("a literal pattern compiles"));

/* Any call, not only the one written inline in a template. `const picker =
this.tag('date-picker')` and then `<${picker}>` is the form CONVENTIONS itself
shows, and a tag handed to a drawing helper is rendered all the same; matching
only `<${this.tag(...)}` read neither, so Notifications rendered
`<helix-format-date>` without the styled tier importing it and the rule
passed. */
static RENDERS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"this\.tag\('([a-z-]+)'\)").expect("a literal pattern compiles"));

static OVERRIDE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static override tier = '([^']*)'").expect("a literal pattern compiles")
});

/// The families a file side-effect imports, and the parts it imports alone.
///
/// `../../tag/index.js` is the family `tag`, which registers every part of it.
/// `../../tag/root/index.js` is the part `tag/root`, which registers the tags
/// declared in that part's folder and no others, so a field that draws tags
/// and never a group carries no group code.
fn imports(code: &str) -> BTreeSet<String> {
    SIDE_EFFECT
        .captures_iter(code)
        .filter_map(|one| {
            let within: Vec<&str> = one[1]
                .trim_end_matches("/index.js")
                .split('/')
                .filter(|part| *part != "." && *part != "..")
                .collect();
            match within.as_slice() {
                [family, part] => Some(format!("{family}/{part}")),
                [.., last] => Some((*last).to_owned()),
                [] => None,
            }
        })
        .collect()
}

/// The families a file's templates open, by the name inside `this.tag()`.
fn renders(code: &str) -> BTreeSet<String> {
    RENDERS
        .captures_iter(code)
        .map(|one| one[1].to_owned())
        .collect()
}

/// The tags a file's templates open literally, which none may.
fn literals(code: &str, prefixes: &[&str]) -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    for prefix in prefixes {
        let Ok(pattern) = Regex::new(&format!(r"<({}[a-z0-9-]+)", regex::escape(prefix))) else {
            continue;
        };
        for one in pattern.captures_iter(code) {
            found.insert(one[1].to_owned());
        }
    }
    found
}

/// A tag with any configured layer prefix taken off.
fn bare(tag: &str, prefixes: &[&str]) -> String {
    let mut sorted: Vec<&&str> = prefixes.iter().collect();
    sorted.sort_by_key(|one| std::cmp::Reverse(one.len()));
    for prefix in sorted {
        if let Some(rest) = tag.strip_prefix(*prefix) {
            return rest.to_owned();
        }
    }
    tag.to_owned()
}

/// Every layered source file, and where each tag is declared: its family, and
/// its family and part, `tag/root`.
fn layered(
    roots: [&std::path::Path; 2],
    prefixes: &[&str],
) -> (
    BTreeMap<std::path::PathBuf, String>,
    BTreeMap<String, (String, String)>,
) {
    let mut read = BTreeMap::new();
    let mut declared_in = BTreeMap::new();
    for root in roots {
        let mut files = Vec::new();
        sources(root, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let code = uncommented(&text);
            for found in DEFINED.captures_iter(&code) {
                let name = bare(&found[1], prefixes);
                let part = file.parent();
                if let Some((owner, part)) = family(&file, root).and_then(|_| {
                    let owner = part
                        .and_then(|one| one.parent())
                        .and_then(|one| one.file_name())
                        .and_then(|one| one.to_str())?;
                    let part = part
                        .and_then(|one| one.file_name())
                        .and_then(|one| one.to_str())?;
                    Some((owner, part))
                }) {
                    declared_in.insert(name, (owner.to_owned(), format!("{owner}/{part}")));
                }
            }
            read.insert(file, code);
        }
    }
    (read, declared_in)
}

/// A literal tag in a module on no layer picks a layer for every caller.
fn unlayered(
    context: &Context,
    roots: [&std::path::Path; 2],
    prefixes: &[&str],
    findings: &mut Vec<Finding>,
) -> usize {
    let mut checked = 0;
    for tier in context.settings.roots(&context.root) {
        if roots.contains(&tier.as_path()) {
            continue;
        }
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            for tag in literals(&uncommented(&text), prefixes) {
                checked += 1;
                findings.push(Finding {
                    detail: format!(
                        "Take the tag as an argument and let the caller pass `this.tag('{}')`.",
                        bare(&tag, prefixes)
                    ),
                    file: context.relative(&file),
                    message: format!(
                        "writes `<{tag}>` into a template and is on no layer, so it picks one for \
                         every caller"
                    ),
                });
            }
        }
    }
    checked
}

/// A custom element opened in a template.
static OPENED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<([a-z][a-z0-9]*-[a-z0-9-]+)[\s>/]").expect("a literal pattern compiles")
});

/// A project with one layer: every tag a module renders, its Helix base's
/// children under its prefix and its own templates' tags alike, is one it
/// imports the registration of.
fn extended(context: &Context) -> Report {
    let project = context.project();
    let installed = context.installed();
    /* Each module and the tags it renders, with the line that renders each. */
    let mut rendered: BTreeMap<usize, BTreeMap<String, usize>> = BTreeMap::new();
    for extension in &project.extensions {
        let (base, tier) = project.grounded(extension, context.installed());
        let (Some(installed), Some(prefix)) = (&installed, tier) else {
            continue;
        };
        let line = line_of(&project.modules[extension.module].text, extension.at);
        for child in installed.renders(base) {
            rendered
                .entry(extension.module)
                .or_default()
                .entry(format!("{prefix}{child}"))
                .or_insert(line);
        }
    }
    for (at, module) in project.modules.iter().enumerate() {
        for found in OPENED.captures_iter(&module.code) {
            let start = found.get(1).map_or(0, |one| one.start());
            rendered
                .entry(at)
                .or_default()
                .entry(found[1].to_owned())
                .or_insert_with(|| line_of(&module.code, start));
        }
    }

    let mut findings = Vec::new();
    let mut checked = 0;
    for (at, tags) in &rendered {
        let module = &project.modules[*at];
        /* Walked once per module and not once per tag it renders. */
        let reached = project.reachable(*at);
        for (tag, line) in tags {
            /* A tag the project does not register is Helix's, or another
            package's, and `scan` judges whether it is imported. */
            let Some(&owner) = project.defined.get(tag) else {
                continue;
            };
            checked += 1;
            if reached.contains(&owner) {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "Import the module that registers it: `import '{}'`.",
                    specifier(&module.path, &project.modules[owner].path)
                ),
                file: format!("{}:{line}", context.relative(&module.path)),
                message: format!(
                    "renders `<{tag}>` and never imports the module that registers it, so a page \
                     importing this component alone gets an inert element"
                ),
            });
        }
    }
    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "rendered tags",
    }
}

pub fn run(context: &Context) -> Report {
    let [base, over, ..] = context.settings.layers.as_slice() else {
        return extended(context);
    };
    let prefixes: Vec<&str> = context
        .settings
        .layers
        .iter()
        .map(|one| one.prefix.as_str())
        .filter(|one| !one.is_empty())
        .collect();
    let base_root = context.root.join(&base.source);
    let over_root = context.root.join(&over.source);

    let (read, declared_in) = layered([&base_root, &over_root], &prefixes);

    let mut findings = Vec::new();
    let mut checked = judge(
        context,
        &Layers { base, over },
        &read,
        &declared_in,
        &prefixes,
        [&base_root, &over_root],
        &mut findings,
    );
    checked += unlayered(context, [&base_root, &over_root], &prefixes, &mut findings);

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "rendered tags",
    }
}

/// The two layers a judgment is made against.
struct Layers<'a> {
    base: &'a Layer,
    over: &'a Layer,
}

/// Every literal tag, missing import and missing prefix override.
fn judge(
    context: &Context,
    layers: &Layers,
    read: &BTreeMap<std::path::PathBuf, String>,
    declared_in: &BTreeMap<String, (String, String)>,
    prefixes: &[&str],
    roots: [&std::path::Path; 2],
    findings: &mut Vec<Finding>,
) -> usize {
    let (base, over) = (layers.base, layers.over);
    let [base_root, over_root] = roots;
    let mut checked = 0;
    for (path, code) in read {
        let own = path
            .parent()
            .and_then(|one| one.parent())
            .and_then(|one| one.file_name())
            .and_then(|one| one.to_str())
            .unwrap_or("");
        let where_ = context.relative(path);

        /* A component above inherits its base's template, so it inherits every
        tag in it. Matched by the path the two layers share. */
        let inherited = path
            .strip_prefix(over_root)
            .ok()
            .map(|within| base_root.join(within))
            .and_then(|twin| read.get(&twin));

        let mut tags = renders(code);
        if let Some(inherited) = inherited {
            tags.extend(renders(inherited));
        }

        let layered = path.starts_with(base_root) || inherited.is_some();
        for tag in literals(code, prefixes) {
            checked += 1;
            if layered {
                findings.push(Finding {
                    detail: format!(
                        "Interpolate it: `<${{this.tag('{}')}}>`.",
                        bare(&tag, prefixes)
                    ),
                    file: where_.clone(),
                    message: format!(
                        "writes `<{tag}>` into a template, and the base layer may not name a tag \
                         from the layer above, while naming its own pins every subclass to the base"
                    ),
                });
            } else if tag.starts_with(&base.prefix) {
                findings.push(Finding {
                    detail: format!("Drop the `{}` prefix.", base.prefix),
                    file: where_.clone(),
                    message: format!(
                        "writes `<{tag}>` into a template, and a component in the outer layer \
                         renders children from it"
                    ),
                });
            }
        }

        if inherited.is_some_and(|one| !renders(one).is_empty())
            && OVERRIDE
                .captures(code)
                .is_none_or(|found| found[1] != over.prefix)
        {
            findings.push(Finding {
                detail: format!("Add `static override tier = '{}'`.", over.prefix),
                file: where_.clone(),
                message: "inherits a template that interpolates its children's tags and never \
                          overrides the layer prefix, so it renders base children inside its own \
                          shadow root"
                    .to_owned(),
            });
        }

        let imported = imports(code);
        for name in &tags {
            checked += 1;
            let (owner, part) = declared_in
                .get(name)
                .map_or((name.as_str(), ""), |(owner, part)| {
                    (owner.as_str(), part.as_str())
                });
            if owner == own || imported.contains(owner) || imported.contains(part) {
                continue;
            }
            findings.push(Finding {
                detail: format!("Add `import '../../{owner}/index.js'`."),
                file: where_.clone(),
                message: format!(
                    "{} `<{name}>` and never imports it, so a consumer importing this family \
                     alone gets an inert unknown element",
                    if renders(code).contains(name) {
                        "renders"
                    } else {
                        "inherits"
                    }
                ),
            });
        }
    }

    checked
}
