//! `helix new`: a project from a template.
//!
//! **The templates are a package and this reads it**, rather than carrying
//! copies. `helix new` and `npm create @fusion.dev/helix-app` are one capability
//! behind two doors, and both are this: the second resolves
//! `@fusion.dev/helix-templates` and runs `helix new` on it. What is read is the
//! `templates.json` that package generates from its TypeScript register, which a
//! compiled binary cannot read.
//!
//! **It resolves from `node_modules` and does not fetch.** npm installs the
//! templates with the command: `@fusion.dev/helix-cli` depends on
//! `@fusion.dev/helix-templates` at its own version, and its shim names that copy
//! in `HELIX_TEMPLATES`, as `npm create @fusion.dev/helix-app` does. Fetching
//! them here would put an HTTP client, a gzip reader, and a tar reader in this
//! binary, and npm's registry login, proxy, and cache settings with them,
//! to save an install of 0.27 MB unpacked (measured October 10, 2026). The walk
//! is for a binary run without the shim, such as one cargo installed.

use std::fs;
use std::io::{BufRead, IsTerminal, Write};
use std::path::{Path, PathBuf};

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use serde::Deserialize;

use crate::args::New;

const PACKAGE: &str = "@fusion.dev/helix-templates";
const REGISTER: &str = "templates.json";
/// The name offered when a person is asked for one and presses Return.
const SUGGESTED: &str = "my-app";

/// Files a template carries under another name, and the name each is written
/// under.
///
/// **npm and bun leave a `.gitignore` out of a tarball**, so the templates
/// package carries it as `gitignore` and this puts the dot back. Without it the
/// first `git add .` in a new project took `node_modules` and the build with it.
const RENAMED: &[(&str, &str)] = &[("gitignore", ".gitignore")];

/// Where a template's file lands in the project, relative to it.
fn written_as(relative: &Path) -> PathBuf {
    relative
        .file_name()
        .and_then(|name| RENAMED.iter().find(|(from, _)| name == *from))
        .map_or_else(
            || relative.to_path_buf(),
            |(_, to)| relative.with_file_name(to),
        )
}

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
/// tests need a package that is not installed anywhere. It is also how the shim
/// hands over the copy `@fusion.dev/helix-cli` depends on, so that copy
/// outranks another version a project installed.
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
    .hint("npm create @fusion.dev/helix-app@latest"))
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

/// Refuses a target that holds anything.
///
/// **An empty directory or none at all.** Writing into a directory that holds
/// something is how a scaffolder overwrites work somebody wanted, and there is
/// no undo. Merging into an existing project is a real feature and is a
/// different one: it has to decide what to do with a manifest that already
/// exists, and this release does not.
fn vacant(target: &Path) -> Result<(), Failure> {
    if target.exists() {
        let empty = fs::read_dir(target).is_ok_and(|mut entries| entries.next().is_none());
        if !empty {
            return Err(Failure::input(
                format!("{} is not empty", target.display()),
                "a new project is written into an empty directory, so nothing here is overwritten",
            ));
        }
    }
    Ok(())
}

/// One line from a person, trimmed. Input that ends leaves no way to go on.
fn answer<R: BufRead, W: Write>(
    input: &mut R,
    output: &mut W,
    question: &str,
) -> Result<String, Failure> {
    let broken = |failure: std::io::Error| {
        Failure::new(
            Code::Internal,
            "cannot read an answer from the terminal",
            failure.to_string(),
        )
    };
    write!(output, "{question}").map_err(broken)?;
    output.flush().map_err(broken)?;
    let mut line = String::new();
    if input.read_line(&mut line).map_err(broken)? == 0 {
        return Err(Failure::input(
            "no answer was given",
            "the input ended before the question was answered",
        )
        .hint("helix new my-app --template react-vite"));
    }
    Ok(line.trim().to_owned())
}

/// Asks for a project name until one can be written, and returns it.
fn ask_name<R: BufRead, W: Write>(
    input: &mut R,
    output: &mut W,
    into: Option<&Path>,
    from: &Path,
) -> Result<String, Failure> {
    loop {
        let given = answer(input, output, &format!("Project name ({SUGGESTED}): "))?;
        let name = if given.is_empty() {
            SUGGESTED.to_owned()
        } else {
            given
        };
        let target = into.map_or_else(|| from.join(&name), Path::to_path_buf);
        match usable(&name).and_then(|()| vacant(&target)) {
            Ok(()) => return Ok(name),
            Err(failure) => {
                /* The first line says what is wrong. The hint under it is a
                command to type, and the person is being asked for a name. */
                let said = failure.render("helix");
                let _ = writeln!(output, "{}", said.lines().next().unwrap_or_default());
            }
        }
    }
}

/// Asks which template to write, by its number or its id.
///
/// **No default.** A scaffolder that picks for you writes a project the person
/// did not choose, so Return asks again.
fn ask_template<'a, R: BufRead, W: Write>(
    input: &mut R,
    output: &mut W,
    templates: &'a [Template],
    paint: Paint,
) -> Result<&'a Template, Failure> {
    let _ = writeln!(output, "\nTemplates:");
    for (index, one) in templates.iter().enumerate() {
        let _ = writeln!(
            output,
            "  {}  {:<14} {}",
            index + 1,
            paint.pass(&one.id),
            one.description
        );
    }
    loop {
        let given = answer(
            input,
            output,
            &format!("Choose a template (1-{}): ", templates.len()),
        )?;
        let picked = given
            .parse::<usize>()
            .ok()
            .and_then(|number| templates.get(number.checked_sub(1)?))
            .or_else(|| templates.iter().find(|one| one.id == given));
        if let Some(template) = picked {
            return Ok(template);
        }
    }
}

/// The commands that start a project, for the package manager that ran this.
///
/// Package managers name themselves in `npm_config_user_agent`, as
/// `pnpm/9.0.0 npm/? node/v22.0.0 darwin arm64`. Anything else gets npm, which
/// comes with Node.
fn start_commands(agent: Option<&str>) -> [&'static str; 2] {
    match agent
        .and_then(|said| said.split('/').next())
        .unwrap_or_default()
    {
        "bun" => ["bun install", "bun run dev"],
        "pnpm" => ["pnpm install", "pnpm dev"],
        "yarn" => ["yarn install", "yarn dev"],
        _ => ["npm install", "npm run dev"],
    }
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
/// [`Failure`] when no name was given and none can be asked for, when the
/// templates package is not resolvable, when the template is unknown, or when
/// the target directory exists and holds anything.
pub fn run(args: &New, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    /* **A person is asked and a script is told.** A prompt with nobody at it
    waits forever, so one runs only with a terminal at both ends. */
    let interactive = !json && std::io::stdin().is_terminal() && std::io::stdout().is_terminal();
    match args.name.as_deref() {
        Some(name) => usable(name)?,
        None if interactive => {}
        None => {
            return Err(Failure::new(
                Code::Usage,
                "`helix new` needs a project name",
                "it asks for one only in a terminal, and this is not one",
            )
            .hint("helix new my-app --template react-vite"));
        }
    }
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

    /* **Listing is what a wrong `--template` gets, and an absent one with nobody
    to ask**, rather than a default. A scaffolder that picks for you writes a
    project the reader did not choose, and the choice is two words. */
    let named = match args.template.as_deref() {
        Some(wanted) => match register.templates.iter().find(|one| one.id == wanted) {
            Some(template) => Some(template),
            None => return Ok(offer(&register, json, paint, Some(wanted))),
        },
        None if interactive => None,
        None => return Ok(offer(&register, json, paint, None)),
    };

    let mut input = std::io::stdin().lock();
    let mut output = std::io::stdout();
    let name = match args.name.clone() {
        Some(name) => name,
        None => ask_name(&mut input, &mut output, args.into.as_deref(), from)?,
    };
    let target = args.into.clone().unwrap_or_else(|| from.join(&name));
    vacant(&target)?;
    let template = match named {
        Some(template) => template,
        None => ask_template(&mut input, &mut output, &register.templates, paint)?,
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
            (register.placeholder.as_str(), name.as_str()),
            (register.version.as_str(), helix.version.as_str()),
        ],
    )?;

    report(
        &Written {
            count: files.len(),
            helix: &helix.version,
            name: &name,
            target: &target,
            template,
        },
        from,
        json,
        paint,
    );
    Ok(Code::Ok)
}

/// What was written, for [`report`].
struct Written<'a> {
    count: usize,
    helix: &'a str,
    name: &'a str,
    target: &'a Path,
    template: &'a Template,
}

/// Says what was written and how to start it.
fn report(written: &Written, from: &Path, json: bool, paint: Paint) {
    if json {
        fusion_rules::say!(
            "{}",
            serde_json::json!({
                "files": written.count,
                "helix": written.helix,
                "into": written.target.display().to_string(),
                "name": written.name,
                "template": written.template.id,
            })
        );
    } else {
        /* **The Helix it asks for is said**, since nothing here asks the registry
        whether it is the newest: a reader who expected another version sees it
        before installing, and `npm create` is the door that checks. */
        fusion_rules::say!(
            "{} {} files from {}, Helix {}, into {}",
            paint.pass("wrote"),
            written.count,
            written.template.title,
            written.helix,
            written.target.display()
        );
        /* **The target rather than the name, and relative where it can be.**
        With `--into` the two are different directories, and printing the name
        handed a reader a `cd` into one this had just not created. Printing the
        absolute path instead is correct and unreadable for the ordinary case, so
        it is shortened back against where they are standing. */
        let where_ = written.target.strip_prefix(from).unwrap_or(written.target);
        let [install, dev] = start_commands(std::env::var("npm_config_user_agent").ok().as_deref());
        fusion_rules::say!("\n  cd {}\n  {install}\n  {dev}", where_.display());
    }
}

/// What there is, printed when no template was chosen or the choice was unknown.
///
/// **`Failed` rather than `Input` for an unknown id**, and `Ok` for none at all:
/// asking what there is, is a question this answers, and naming one that does not
/// exist is a no rather than a broken command line.
fn offer(register: &Register, json: bool, paint: Paint, unknown: Option<&str>) -> Code {
    if json {
        fusion_rules::say!(
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
            fusion_rules::say!(
                "{} is not a template. There are {}:",
                paint.fail(named),
                register.templates.len()
            );
        } else {
            fusion_rules::say!("Choose a template with --template:");
        }
        for one in &register.templates {
            fusion_rules::say!("  {:<14} {}", paint.pass(&one.id), one.description);
        }
    }
    if unknown.is_some() {
        Code::Failed
    } else {
        Code::Ok
    }
}

/// Copies one template into `target`, substituting each placeholder with its
/// value only where the register says, and writing each file [`RENAMED`] lists
/// under the name it gives.
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
        let to = target.join(written_as(relative));
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

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use super::*;

    fn templates() -> Vec<Template> {
        ["react-vite", "vue-vite"]
            .map(|id| Template {
                description: format!("{id} described"),
                id: id.to_owned(),
                named: Vec::new(),
                title: id.to_owned(),
            })
            .into()
    }

    fn name_from(typed: &str, from: &Path) -> (Result<String, Failure>, String) {
        let mut said = Vec::new();
        let name = ask_name(&mut Cursor::new(typed), &mut said, None, from);
        (name, String::from_utf8_lossy(&said).into_owned())
    }

    fn scratch(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("helix-ask-{name}"));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).expect("a scratch directory");
        path
    }

    #[test]
    fn return_takes_the_suggested_name() {
        let (name, said) = name_from("\n", &scratch("suggested"));
        assert_eq!(name.expect("a name"), SUGGESTED);
        assert!(said.contains(SUGGESTED), "{said}");
    }

    #[test]
    fn a_name_that_cannot_be_used_is_asked_for_again() {
        let (name, said) = name_from("My App\ngood-name\n", &scratch("unusable"));
        assert_eq!(name.expect("a name"), "good-name");
        assert!(said.contains("cannot be a project name"), "{said}");
    }

    #[test]
    fn a_name_whose_directory_holds_anything_is_asked_for_again() {
        let at = scratch("occupied");
        fs::create_dir_all(at.join("taken")).expect("a directory");
        fs::write(at.join("taken").join("README.md"), "mine").expect("a file");
        let (name, said) = name_from("taken\nfree\n", &at);
        assert_eq!(name.expect("a name"), "free");
        assert!(said.contains("is not empty"), "{said}");
    }

    #[test]
    fn input_that_ends_is_a_failure_and_does_not_ask_forever() {
        let (name, _) = name_from("", &scratch("ended"));
        assert!(name.is_err());
    }

    #[test]
    fn a_template_is_chosen_by_number_or_id_and_return_picks_none() {
        let templates = templates();
        for (typed, id) in [("2\n", "vue-vite"), ("\n9\n0\nreact-vite\n", "react-vite")] {
            let mut said = Vec::new();
            let picked = ask_template(
                &mut Cursor::new(typed),
                &mut said,
                &templates,
                Paint::decide("helix", true),
            );
            assert_eq!(picked.expect("a template").id, id);
        }
    }

    #[test]
    fn the_next_steps_name_the_package_manager_that_ran_it() {
        for (agent, install) in [
            (
                Some("bun/1.4.3 npm/? node/v22.0.0 darwin arm64"),
                "bun install",
            ),
            (
                Some("pnpm/9.0.0 npm/? node/v22.0.0 darwin arm64"),
                "pnpm install",
            ),
            (
                Some("yarn/1.22.0 npm/? node/v22.0.0 darwin arm64"),
                "yarn install",
            ),
            (Some("npm/11.0.0 node/v22.0.0 darwin arm64"), "npm install"),
            (None, "npm install"),
        ] {
            assert_eq!(start_commands(agent)[0], install);
        }
    }
}
