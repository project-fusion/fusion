//! A module under `shared/` is composed by more than one family, and no family
//! composes another's.
//!
//! **The bar is a file more than one family imports, and it is held from both
//! sides.** A folder under `shared/` is not a family: it holds what several
//! families compose, a stylesheet or the API half of one, and a file in there
//! with one reader belongs inside that reader, where the next edit will find it
//! beside the markup it styles. The other side is the one that had drifted: a
//! family-level sheet another family imports is a shared sheet that nobody
//! moved. `icon/glyph.css` was composed by nine families and lived beside the
//! icon, so `helix/styled/src/icon` was a family with a sheet eight other
//! families depended on and nothing said so.
//!
//! **Every folder under `shared/` is discovered rather than listed**, so the
//! rule follows a new one without being edited. And it reads imports rather
//! than `static styles`, because a family composes a sheet by importing its
//! generated module and nothing else: the import is the fact.
//!
//! **A family importing another family's element is composition and is not
//! this.** `import '../../date-picker/index.js'` registers a child a template
//! interpolates, which `composed` holds to its own rules; what is refused here
//! is one family adopting another's *stylesheet*, the coupling that stops
//! either being moved.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{family, sources, Context, Finding, Report};

/// A relative import, which is the only kind that reaches another family.
static IMPORT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"from\s+'(\.\.?/[^']+)'|import\s+'(\.\.?/[^']+)'")
        .expect("a literal pattern compiles")
});

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));

/// `a/b/../c` as `a/c`, without touching the disk: a `.js` import names a
/// module that exists only once the package is built.
fn normalized(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for part in path.components() {
        match part {
            std::path::Component::ParentDir => {
                out.pop();
            }
            std::path::Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    /* Every module under `shared/`, keyed by its path within the tier, and the
    families that import it. */
    let mut readers: BTreeMap<PathBuf, BTreeSet<String>> = BTreeMap::new();

    for tier in context.settings.roots(&context.root) {
        let shared = tier.join("shared");
        if shared.is_dir() {
            let mut modules = Vec::new();
            collect(&shared, &mut modules);
            for module in modules {
                if let Ok(within) = module.strip_prefix(&tier) {
                    readers.entry(within.to_path_buf()).or_default();
                }
            }
        }

        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let (Some(importer), Ok(raw)) = (family(&file, &tier), fs::read_to_string(&file))
            else {
                continue;
            };
            let code = COMMENT.replace_all(&raw, "");
            let Some(directory) = file.parent() else {
                continue;
            };
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");
            for found in IMPORT.captures_iter(&code) {
                let specifier = found
                    .get(1)
                    .or_else(|| found.get(2))
                    .map_or("", |one| one.as_str());
                let target = normalized(&directory.join(specifier));
                let Ok(within) = target.strip_prefix(&tier) else {
                    continue;
                };
                let Some(owner) = within.components().next() else {
                    continue;
                };
                if owner.as_os_str() == "shared" {
                    /* The generated module stands for the sheet beside it. */
                    let source = within.to_string_lossy().replace(".css.js", ".css");
                    let source = source.trim_end_matches(".js").to_owned();
                    let key = readers
                        .keys()
                        .find(|one| {
                            let name = one.to_string_lossy();
                            name == source || name.trim_end_matches(".ts") == source
                        })
                        .cloned();
                    if let Some(key) = key {
                        readers.entry(key).or_default().insert(importer.to_owned());
                    }
                    continue;
                }
                let owner = owner.as_os_str().to_string_lossy().to_string();
                if owner != importer && specifier.ends_with(".css.js") {
                    findings.push(Finding {
                        detail: "A sheet several families compose belongs under `shared/`, \
                                 where the bar is a file more than one family imports; kept \
                                 inside one family it couples the two, and neither can move."
                            .to_owned(),
                        file: where_.clone(),
                        message: format!(
                            "`{importer}` composes `{}`, which is `{owner}`'s own stylesheet",
                            within.to_string_lossy().replace('\\', "/")
                        ),
                    });
                }
            }
        }
    }

    let mut checked = 0;
    for (module, families) in &readers {
        let name = module.to_string_lossy().replace('\\', "/");
        if families.len() > 1 {
            checked += 1;
            continue;
        }
        findings.push(Finding {
            detail: "A folder under `shared/` holds what several families compose, and a file \
                     there with one reader belongs inside that reader."
                .to_owned(),
            file: name.clone(),
            message: match families.iter().next() {
                Some(only) => format!("is composed by `{only}` alone"),
                None => "is composed by no family".to_owned(),
            },
        });
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "shared modules composed by more than one family",
    }
}

/// Every stylesheet and module under `shared/`, generated sheets and specs
/// excluded, since each stands for a source beside it.
fn collect(directory: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        if path.is_dir() {
            collect(&path, found);
            continue;
        }
        let name = path.file_name().unwrap_or_default().to_string_lossy();
        let source = (name.ends_with(".css") && !name.ends_with(".css.ts"))
            || (name.ends_with(".ts") && !name.ends_with(".css.ts") && !name.contains(".spec."));
        if source {
            found.push(path);
        }
    }
}
