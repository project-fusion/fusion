//! `helix new`: a project from a template.
//!
//! **The templates are a package and this reads it**, rather than carrying
//! copies. `helix new` and `npm create @fusion.dev/helix-app` are one capability
//! behind two doors, and both are this: the second resolves
//! `@fusion.dev/helix-templates` and runs `helix new` on it. What is read is the
//! `templates.json` that package generates from its TypeScript register, which a
//! compiled binary cannot read.
//!
//! **It resolves from `node_modules` and does not fetch.** Adding an HTTP client,
//! a gzip reader and a tar reader to this binary to do what npm already does is
//! the wrong half of the pair to put it in: `npm create @fusion.dev/helix-app` is
//! the door for somebody with no workspace yet, and npm downloads the package for
//! them on the way in, then names it in `HELIX_TEMPLATES`. What is left for the
//! walk is the case where the package is already resolvable, which is every
//! workspace that has Helix in it.

use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use serde::Deserialize;

use crate::args::New;

const PACKAGE: &str = "@fusion.dev/helix-templates";
const REGISTER: &str = "templates.json";

/// The register as that package generates it.
#[derive(Debug, Deserialize)]
struct Register {
    placeholder: String,
    templates: Vec<Template>,
    /// Replaced with the templates package's own version, which is the Helix
    /// every package in it was published at.
    version: String,
}

/// The one field of the templates package's manifest this reads.
#[derive(Debug, Deserialize)]
struct Manifest {
    version: String,
}

#[derive(Debug, Deserialize)]
struct Template {
    description: String,
    id: String,
    named: Vec<String>,
    title: String,
}

/// Walks up for `node_modules/@fusion.dev/helix-templates`.
///
/// **`HELIX_TEMPLATES` first**, for the same reason `HELIX_BIN` comes first in
/// the npm shim: a caller who knows better should not have to argue, and the
/// tests need a package that is not installed anywhere.
fn locate(from: &Path) -> Result<PathBuf, Failure> {
    if let Ok(named) = std::env::var("HELIX_TEMPLATES") {
        let path = PathBuf::from(named);
        if path.join(REGISTER).is_file() {
            return Ok(path);
        }
        /* **Named separately, because the walk below never ran.** Falling through
        to the node_modules message sends a reader to look in a place this code
        did not consult, which costs them the time it takes to rule out the thing
        that was never wrong. */
        return Err(Failure::input(
            format!("cannot find {REGISTER} under {}", path.display()),
            "HELIX_TEMPLATES is set, so that is where this looked and node_modules was not consulted",
        ));
    }
    for directory in from.ancestors() {
        let candidate = directory.join("node_modules").join(PACKAGE);
        if candidate.join(REGISTER).is_file() {
            return Ok(candidate);
        }
    }
    Err(Failure::input(
        format!("cannot find {PACKAGE}"),
        "it is resolved from node_modules, and nothing above this directory has it",
    )
    .hint("npm create @fusion.dev/helix-app@latest <name>"))
}

/// Holds `name` to being usable as both of the things it is.
///
/// **It is a directory and a package name at once**, which the argument's own
/// help says, and nothing held it to either: an absolute one replaced the base in
/// `Path::join` and wrote outside the working directory entirely, and any name
/// npm forbids reached the manifest and failed the reader's first `npm install`.
///
/// The rule is npm's for an unscoped name, which is the stricter of the two and
/// rules out every separator on the way.
fn usable(name: &str) -> Result<(), Failure> {
    let why = if name.is_empty() {
        "it is empty"
    } else if name.len() > 214 {
        "npm allows at most 214 characters"
    } else if name.starts_with('.') || name.starts_with('_') {
        "npm refuses a name starting with a dot or an underscore"
    } else if name.chars().any(char::is_uppercase) {
        "npm refuses an uppercase letter in a new package name"
    } else if !name
        .chars()
        .all(|one| one.is_ascii_lowercase() || one.is_ascii_digit() || "-._~".contains(one))
    {
        "a name is lowercase letters, digits, and `-._~`, so it is also a directory name"
    } else {
        return Ok(());
    };
    Err(
        Failure::input(format!("`{name}` cannot be a project name"), why)
            .hint("helix new my-app --template react-vite"),
    )
}

/// Every file under `directory`, as paths relative to it, in a stable order.
fn walk(directory: &Path, base: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    /* Sorted, because `read_dir` is filesystem order and a report that changes
    between runs on an unchanged tree is a report nobody trusts. */
    paths.sort();
    for path in paths {
        if path.is_dir() {
            /* **`node_modules` is not part of a template**, and a contributor
            who has ever run one locally has one inside it. Nothing here
            reads an ignore file, so without this the walk copies an install
            into every new project: measured on `react-vite` with a local
            install present, 4,774 files written where the template is 7. */
            if path.file_name().is_some_and(|name| name == "node_modules") {
                continue;
            }
            walk(&path, base, found);
        } else if let Ok(relative) = path.strip_prefix(base) {
            found.push(relative.to_path_buf());
        }
    }
}

/// # Errors
///
/// [`Failure`] when the templates package is not resolvable, when the template
/// is unknown, or when the target directory exists and holds anything.
pub fn run(args: &New, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    usable(&args.name)?;
    let package = locate(from)?;

    let raw = fs::read_to_string(package.join(REGISTER)).map_err(|failure| {
        Failure::new(
            Code::Input,
            format!("cannot read {}", package.join(REGISTER).display()),
            failure.to_string(),
        )
    })?;
    let register: Register = serde_json::from_str(&raw).map_err(|failure| {
        Failure::new(
            Code::Input,
            format!("cannot read {}", package.join(REGISTER).display()),
            failure.to_string(),
        )
    })?;

    /* **Listing is what an absent or wrong `--template` gets**, rather than a
    default. A scaffolder that picks for you writes a project the reader did not
    choose, and the choice is two words. */
    let Some(wanted) = args.template.as_deref() else {
        return Ok(offer(&register, json, paint, None));
    };
    let Some(template) = register.templates.iter().find(|one| one.id == wanted) else {
        return Ok(offer(&register, json, paint, Some(wanted)));
    };

    /* **The Helix a project asks for is the one these templates shipped with.**
    Lockstep makes this package's version every Helix package's, so a template
    carries a placeholder rather than a range somebody has to keep current: two
    kept by hand said `^0.0.9` while `0.25.0` was out. */
    let manifest = package.join("package.json");
    let helix: Manifest = fs::read_to_string(&manifest)
        .map_err(|failure| failure.to_string())
        .and_then(|raw| serde_json::from_str(&raw).map_err(|failure| failure.to_string()))
        .map_err(|failure| {
            Failure::new(
                Code::Input,
                format!("cannot read the version in {}", manifest.display()),
                failure,
            )
        })?;

    let target = args.into.clone().unwrap_or_else(|| from.join(&args.name));

    /* **An empty directory or none at all.** Writing into a directory that holds
    something is how a scaffolder overwrites work somebody wanted, and there is
    no undo. Merging into an existing project is a real feature and is a
    different one: it has to decide what to do with a manifest that already
    exists, and this release does not. */
    if target.exists() {
        let empty = fs::read_dir(&target).is_ok_and(|mut entries| entries.next().is_none());
        if !empty {
            return Err(Failure::input(
                format!("{} is not empty", target.display()),
                "a new project is written into an empty directory, so nothing here is overwritten",
            ));
        }
    }

    /* `templates/<id>`, so the directory is the id rather than a decoration of
    it. Flat at the package root, a tenth template is a tenth entry beside
    `dist` and `templates.json`, and the prefix that kept them apart there is
    the folder's job now. */
    let source = package.join("templates").join(&template.id);
    let mut files = Vec::new();
    walk(&source, &source, &mut files);
    if files.is_empty() {
        return Err(Failure::new(
            Code::Input,
            format!("{} has no files", source.display()),
            "the register names it and the package does not carry it",
        ));
    }

    lay_down(
        &source,
        &target,
        &files,
        template,
        &[
            (register.placeholder.as_str(), args.name.as_str()),
            (register.version.as_str(), helix.version.as_str()),
        ],
    )?;

    if json {
        println!(
            "{}",
            serde_json::json!({
                "files": files.len(),
                "helix": helix.version,
                "into": target.display().to_string(),
                "name": args.name,
                "template": template.id,
            })
        );
    } else {
        /* **The Helix it asks for is said**, since nothing here asks the registry
        whether it is the newest: a reader who expected another version sees it
        before installing, and `npm create` is the door that checks. */
        println!(
            "{} {} files from {}, Helix {}, into {}",
            paint.pass("wrote"),
            files.len(),
            template.title,
            helix.version,
            target.display()
        );
        /* **The target rather than the name, and relative where it can be.**
        With `--into` the two are different directories, and printing the name
        handed a reader a `cd` into one this had just not created. Printing the
        absolute path instead is correct and unreadable for the ordinary case, so
        it is shortened back against where they are standing. */
        let where_ = target.strip_prefix(from).unwrap_or(&target);
        println!("\n  cd {}\n  npm install\n  npm run dev", where_.display());
    }
    Ok(Code::Ok)
}

/// What there is, printed when no template was chosen or the choice was unknown.
///
/// **`Failed` rather than `Input` for an unknown id**, and `Ok` for none at all:
/// asking what there is, is a question this answers, and naming one that does not
/// exist is a no rather than a broken command line.
fn offer(register: &Register, json: bool, paint: Paint, unknown: Option<&str>) -> Code {
    if json {
        println!(
            "{}",
            serde_json::json!({
                "templates": register
                    .templates
                    .iter()
                    .map(|one| serde_json::json!({
                        "description": one.description,
                        "id": one.id,
                        "title": one.title,
                    }))
                    .collect::<Vec<_>>(),
                "unknown": unknown,
            })
        );
    } else {
        if let Some(named) = unknown {
            println!(
                "{} is not a template. There are {}:",
                paint.fail(named),
                register.templates.len()
            );
        } else {
            println!("Choose a template with --template:");
        }
        for one in &register.templates {
            println!("  {:<14} {}", paint.pass(&one.id), one.description);
        }
    }
    if unknown.is_some() {
        Code::Failed
    } else {
        Code::Ok
    }
}

/// Copies one template into `target`, substituting each placeholder with its
/// value only where the register says.
///
/// # Errors
///
/// [`Failure`] when a file cannot be read or written. Both are `Internal`: the
/// register and the directory have already been checked by the time this runs,
/// so a failure here is the filesystem rather than the reader.
fn lay_down(
    source: &Path,
    target: &Path,
    files: &[PathBuf],
    template: &Template,
    substitutions: &[(&str, &str)],
) -> Outcome<()> {
    for relative in files {
        let to = target.join(relative);
        if let Some(parent) = to.parent() {
            fs::create_dir_all(parent).map_err(|failure| {
                Failure::new(
                    Code::Internal,
                    format!("cannot create {}", parent.display()),
                    failure.to_string(),
                )
            })?;
        }
        let read = fs::read(source.join(relative)).map_err(|failure| {
            Failure::new(
                Code::Internal,
                format!("cannot read {}", source.join(relative).display()),
                failure.to_string(),
            )
        })?;
        /* **Substituted only in the files the register names.** Rewriting every
        file that happens to contain the placeholder rewrites prose that merely
        mentions it, and the package's own spec holds that list to the files
        which actually carry it, in both directions. */
        let named = template
            .named
            .iter()
            .any(|one| Path::new(one) == relative.as_path());
        let written = if named {
            substitutions
                .iter()
                .fold(
                    String::from_utf8_lossy(&read).into_owned(),
                    |text, (from, to)| text.replace(from, to),
                )
                .into_bytes()
        } else {
            read
        };
        fs::write(&to, written).map_err(|failure| {
            Failure::new(
                Code::Internal,
                format!("cannot write {}", to.display()),
                failure.to_string(),
            )
        })?;
    }
    Ok(())
}
