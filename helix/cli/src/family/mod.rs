//! `helix system`: compiles each family of a design system from its
//! platform-neutral source.
//!
//! **The command is named for what it builds, and this folder for the unit it
//! compiles.** `source` was the command's first name, and it is a shell
//! builtin: tooling that vets a command line read `helix source check` as a
//! request to run a file. `family` was its second, and a family is one
//! component and its parts, where the command builds a whole design system.
//!
//! **Each folder under the package's `src/families/<family>/<element>` is one
//! element**: `headless.tsx` holds its API and part tree, written as JSX, and
//! `styled.ts` its own props, its style table, and the stylesheet the web
//! build reads it as.
//!
//! **A design system's own names come from the `system` of its
//! `helix.json`**, which [`project`] reads: its prefixes, its token source,
//! where its families are, and where each output is written. Helix's is the
//! `helix` key of `fusion.json` at the repository root, and the compiler names
//! no design system of its own.
//!
//! **The verbs that write into Helix's own runtime are this repository's
//! alone**: `machines`, `capabilities`, and `types` write into the runtime's
//! sources, and `design-tokens` writes the token file of a styles package laid
//! out as Helix's. A published build leaves them out, as it leaves out
//! `manifest build`; a design system that draws with Helix's runtime installs
//! what they write.
//!
//! **Every element's web stylesheet is generated.** `stylesheets` writes it
//! into the styled package, which runs it before compiling its sheets, and the
//! element's own specs and visual baselines judge what it draws.
//!
//! **No function here is long.** The compiler is the contract every platform
//! reads, so its modules stay small enough to review whole: Clippy's
//! `too_many_lines` may not be allowed anywhere below.

#![forbid(clippy::too_many_lines)]

mod api;
#[cfg(feature = "internal")]
mod capability;
mod compile;
mod components;
mod css;
mod ir;
#[cfg(feature = "internal")]
mod machine;
mod output;
pub mod project;
mod read;
mod resolve;
mod shared;
mod tokens;
mod types;
mod underlay;
mod vocabulary;

use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;

use crate::args::{SystemArgs, SystemBuild, SystemComponents, SystemConfig, SystemStylesheets};
#[cfg(feature = "internal")]
use crate::args::{SystemCapabilities, SystemMachines, SystemTypes};
use crate::family::compile::Compiled;
use crate::family::project::Project;
use crate::PRODUCT;
pub use components::anatomy::print as anatomy;
pub use components::print as platforms;

#[cfg(feature = "internal")]
pub use tokens::design_files as design_tokens;
pub use tokens::native_modules as tokens;

/// `helix system <verb>`, as an output names the command that writes it.
fn command(verb: &str) -> String {
    format!("{PRODUCT} system {verb}")
}

/// The project `config` or the working directory names, with its families
/// package replaced by `package` where the command line gives one.
///
/// # Errors
///
/// [`Failure`] when there is no project, or it cannot be read.
fn open(config: Option<&Path>, package: Option<&PathBuf>, from: &Path) -> Result<Project, Failure> {
    let mut project = Project::required(config, from)?;
    if let Some(package) = package {
        project.families = locate(package, from);
    }
    Ok(project)
}

/// Writes each element's intermediate form and web stylesheet to the
/// project's `outputs.build`, or with `--check` says which written ones
/// differ from a fresh compile.
///
/// # Errors
///
/// [`Failure`] when a source cannot be read or compiled, or an output cannot
/// be written.
pub fn build(
    args: &SystemBuild,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let project = open(config, args.package.as_ref(), from)?;
    let compiled = compile::all(&project)?;
    let out = match &args.package {
        Some(_) => project.families.join(project::BUILD),
        None => project.outputs.build.clone(),
    };
    /* The schema every element's form is held to, published beside them. */
    let mut outputs = vec![(out.join("ir").join("schema.json"), types::schema())];
    for one in &compiled {
        let ir = serde_json::to_string_pretty(&one.family).map_err(|error| {
            Failure::new(
                Code::Internal,
                "the intermediate form does not serialize",
                error.to_string(),
            )
        })?;
        outputs.push((
            out.join("ir").join(format!("{}.json", one.element)),
            format!("{ir}\n"),
        ));
        outputs.push((
            out.join("web").join(format!("{}.css", one.element)),
            one.web.clone(),
        ));
    }
    if args.check {
        return output::settle(&outputs, true, &command("build"), json);
    }
    for (path, text) in &outputs {
        output::write(path, text)?;
    }
    output::report(&compiled, json, None);
    if !json {
        println!(
            "wrote the intermediate form and the web stylesheet of {} elements",
            compiled.len()
        );
    }
    Ok(Code::Ok)
}

/// Holds each element's API and parts to the manifest.
///
/// # Errors
///
/// [`Failure`] when a source cannot be read or compiled, or the manifest
/// cannot be read.
pub fn check(
    args: &SystemArgs,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let project = open(config, args.package.as_ref(), from)?;
    let compiled = compile::all(&project)?;
    let mut differences = Vec::new();
    let mut manifest = None;
    for one in &compiled {
        if !one.family.tree.is_empty() {
            if manifest.is_none() {
                manifest = Some(read_manifest(&project)?);
            }
            let manifest = manifest.as_ref().unwrap_or(&serde_json::Value::Null);
            differences.extend(
                api::parity(
                    &one.family.tag,
                    &one.family.api,
                    &one.family.tree,
                    manifest,
                    &project.names,
                )
                .into_iter()
                .map(|why| format!("{}: {why}", one.element)),
            );
        }
    }
    output::report(&compiled, json, Some(&differences));
    Ok(if differences.is_empty() {
        Code::Ok
    } else {
        Code::Failed
    })
}

/// Writes each element's stylesheet under `--out`, or with `--check` says
/// which written ones are missing or out of date. A table that names no
/// stylesheet, as a compiler test's, has none to write.
///
/// # Errors
///
/// [`Failure`] when a source cannot be compiled, or a stylesheet cannot be
/// written or read.
pub fn stylesheets(
    args: &SystemStylesheets,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let project = open(config, args.package.as_ref(), from)?;
    let out = match &args.out {
        Some(dir) => locate(dir, from),
        None => project
            .needs(project.outputs.stylesheets.as_ref(), "outputs.stylesheets")?
            .to_path_buf(),
    };
    let outputs: Vec<(PathBuf, String)> = compile::all(&project)?
        .iter()
        .filter(|one| !one.family.stylesheet.is_empty())
        .map(|one| (out.join(&one.family.stylesheet), generated(one, &project)))
        .collect();
    output::settle(&outputs, args.check, &command("stylesheets"), json)
}

#[cfg(feature = "internal")]
/// The runtime package a runtime command reads or writes: the one the
/// command line gives, or the one the project's `runtime.sources` names
/// under `key`.
///
/// # Errors
///
/// [`Failure`] when neither names one, or the project cannot be read.
fn runtime_package(
    package: Option<&PathBuf>,
    config: Option<&Path>,
    from: &Path,
    key: &str,
) -> Result<PathBuf, Failure> {
    if let Some(package) = package {
        return Ok(locate(package, from));
    }
    let project = Project::required(config, from)?;
    let named = if key == "core" {
        project.runtime.core.as_ref()
    } else {
        project.runtime.native_package.as_ref()
    };
    Ok(project
        .needs(named, &format!("runtime.sources.{key}"))?
        .to_path_buf())
}

#[cfg(feature = "internal")]
/// Compiles each machine under the package's `src/machines` to the module
/// beside it, or with `--check` says which written ones are behind.
///
/// # Errors
///
/// [`Failure`] when a machine cannot be read or breaks a rule a machine
/// keeps, or a module cannot be written or read.
pub fn machines(
    args: &SystemMachines,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let package = runtime_package(args.package.as_ref(), config, from, "core")?;
    let root = package.join("src").join("machines");
    if !root.is_dir() {
        return Err(Failure::input(
            "the package has no machines",
            format!("{} is not a directory", root.display()),
        )
        .hint("pass the runtime package that holds `src/machines`"));
    }
    /* Every folder under it holding a `machine.ts`, at any depth, so the
    format's own fixtures compile beside the machines they test. */
    let mut folders = Vec::new();
    let mut pending = vec![root];
    while let Some(folder) = pending.pop() {
        if folder.join("machine.ts").is_file() {
            folders.push(folder.clone());
        }
        let entries = fs::read_dir(&folder).map_err(|error| {
            Failure::input(
                "cannot read a folder of machines",
                format!("{}: {error}", folder.display()),
            )
        })?;
        pending.extend(
            entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .filter(|path| path.is_dir()),
        );
    }
    folders.sort();
    let mut outputs = Vec::new();
    let mut broken = Vec::new();
    for folder in folders {
        let source = folder.join("machine.ts");
        let text = fs::read_to_string(&source).map_err(|error| {
            Failure::input(
                "cannot read a machine",
                format!("{}: {error}", source.display()),
            )
        })?;
        let compiled = machine::machine(&text).and_then(|read| {
            let faults = read.faults();
            if faults.is_empty() {
                Ok(read)
            } else {
                Err(faults.join("\n"))
            }
        });
        /* A machine that does not compile is said, and the others are still
        written, so one broken machine does not hold the rest back. */
        let read = match compiled {
            Ok(read) => read,
            Err(why) => {
                broken.push(format!("{}:\n{why}", source.display()));
                continue;
            }
        };
        let name = folder
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        outputs.push((
            folder.join(format!("{name}.generated.ts")),
            machine::emit::module(&read),
        ));
    }
    let code = output::settle(&outputs, args.check, &command("machines"), json)?;
    if broken.is_empty() {
        Ok(code)
    } else {
        Err(Failure::input(
            format!("cannot compile {} of the machines", broken.len()),
            broken.join("\n\n"),
        ))
    }
}

#[cfg(feature = "internal")]
/// Writes each capability's contract, and the types they share, under the
/// package's `src/capabilities`, or with `--check` says which are behind.
///
/// # Errors
///
/// [`Failure`] when a contract cannot be written or read.
pub fn capabilities(
    args: &SystemCapabilities,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let root = runtime_package(args.package.as_ref(), config, from, "core")?
        .join("src")
        .join("capabilities");
    let mut outputs = vec![(root.join("types.generated.ts"), capability::types_module())];
    outputs.extend(capability::CAPABILITIES.iter().map(|one| {
        (
            root.join(one.name).join("contract.generated.ts"),
            capability::contract(one),
        )
    }));
    output::settle(&outputs, args.check, &command("capabilities"), json)
}

/// Writes each family's native components, with their props typed, as
/// `<family>/index.native.ts` under `--out`, the project's
/// `outputs.components` unless given, or with `--check` says which are
/// behind.
///
/// # Errors
///
/// [`Failure`] when a source cannot be compiled, the styled manifest or the
/// event classes cannot be read, or an event's detail cannot be typed.
pub fn components(
    args: &SystemComponents,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let project = open(config, args.package.as_ref(), from)?;
    let compiled = compile::all(&project)?;
    let events = project.needs(project.events.as_ref(), "events")?;
    let details = components::Details::read(events)?;
    let root = match &args.out {
        Some(dir) => locate(dir, from),
        None => project
            .needs(project.outputs.components.as_ref(), "outputs.components")?
            .to_path_buf(),
    };
    let outputs: Vec<(PathBuf, String)> =
        components::modules(&compiled, &read_manifest(&project)?, &details, &project)
            .map_err(|faults| {
                Failure::input("cannot type the native components", faults.join("\n"))
            })?
            .into_iter()
            .map(|(family, text)| (root.join(family).join("index.native.ts"), text))
            .collect();
    output::settle(&outputs, args.check, &command("components"), json)
}

#[cfg(feature = "internal")]
/// Writes the intermediate form's TypeScript types into the package's
/// `src`, or with `--check` says whether the written ones are behind.
///
/// # Errors
///
/// [`Failure`] when the types cannot be written or read.
pub fn types(
    args: &SystemTypes,
    config: Option<&Path>,
    from: &Path,
    json: bool,
) -> Result<Code, Failure> {
    let package = runtime_package(args.package.as_ref(), config, from, "native")?;
    let path = package.join("src").join("ir.generated.ts");
    output::settle(
        &[(path, types::typescript())],
        args.check,
        &command("types"),
        json,
    )
}

/// Prints the design system the configuration describes, every path made
/// absolute and every default filled in, or with `--schema` the JSON Schema
/// of `helix.json`.
///
/// # Errors
///
/// [`Failure`] when there is no project, or it cannot be read.
pub fn config(args: &SystemConfig, config: Option<&Path>, from: &Path) -> Result<Code, Failure> {
    if args.schema {
        print!("{}", project::schema());
        return Ok(Code::Ok);
    }
    let project = Project::required(config, from)?;
    let text = serde_json::to_string_pretty(&project).map_err(|error| {
        Failure::new(
            Code::Internal,
            "the project does not serialize",
            error.to_string(),
        )
    })?;
    println!("{text}");
    Ok(Code::Ok)
}

/// A generated stylesheet: what the table compiles to, under a line naming
/// its source.
fn generated(one: &Compiled, project: &Project) -> String {
    format!(
        "/* Generated by `{}` from {}. Do not edit: the\n   reasoning for each rule is beside it there. */\n\n{}",
        command("stylesheets"),
        project.named(&one.source),
        one.web
    )
}

/// A path from the command line, made absolute and canonical where it exists,
/// so a generated file names its source the same from any directory.
///
/// **A relative path is found from `from` or the nearest directory above it
/// that holds it**, so a package's script names another package by its place
/// in the repository without naming a path inside a sibling.
fn locate(path: &Path, from: &Path) -> PathBuf {
    let joined = if path.is_absolute() {
        path.to_path_buf()
    } else {
        from.ancestors()
            .map(|dir| dir.join(path))
            .find(|candidate| candidate.exists())
            .unwrap_or_else(|| from.join(path))
    };
    fs::canonicalize(&joined).unwrap_or(joined)
}

/// The styled elements' manifest, which the project's `manifest` names, and
/// which the API is held to.
fn read_manifest(project: &Project) -> Result<serde_json::Value, Failure> {
    let path = project.needs(project.manifest.as_ref(), "manifest")?;
    let text = fs::read_to_string(path).map_err(|error| {
        Failure::input(
            "cannot read the styled manifest",
            format!("{}: {error}", path.display()),
        )
        .hint("write the styled elements' custom elements manifest first: their analyzer writes it")
    })?;
    serde_json::from_str(&text).map_err(|error| {
        Failure::input(
            "the styled manifest is not JSON",
            format!("{}: {error}", path.display()),
        )
    })
}
