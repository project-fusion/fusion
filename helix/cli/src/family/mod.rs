//! `helix family`: compiles each family's platform-neutral source.
//!
//! **Named for the unit it compiles.** `source` was the first name, and it is
//! a shell builtin: tooling that vets a command line read `helix source check`
//! as a request to run a file.
//!
//! **Each folder under the package's `src/families/<family>/<element>` is one
//! element**: `headless.ts` holds its API and part tree, or `headless.tsx`
//! the same written as JSX, and `styled.ts` its own props, its style table,
//! and the stylesheet the web build reads it as.
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
mod capability;
mod compile;
mod components;
mod css;
mod ir;
mod machine;
mod output;
mod print;
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

use crate::args::{
    FamilyArgs, FamilyBuild, FamilyCapabilities, FamilyComponents, FamilyMachines,
    FamilyStylesheets, FamilyTypes,
};
use crate::family::compile::Compiled;
pub use components::print as platforms;

/// Prints each builder-form headless source as `headless.tsx`, to stdout or,
/// with `--write`, in its place, and its notes to stderr.
///
/// # Errors
///
/// [`Failure`] when a source cannot be read, printed, or written.
pub fn print_sources(args: &crate::args::FamilyPrint, from: &Path) -> Result<Code, Failure> {
    for source in &args.sources {
        let source = locate(source, from);
        let path = if source.is_dir() {
            source.join("headless.ts")
        } else {
            source
        };
        let text = fs::read_to_string(&path).map_err(|error| {
            Failure::input(
                "cannot read a source",
                format!("{}: {error}", path.display()),
            )
        })?;
        let printed = print::headless(&text).map_err(|why| {
            Failure::input(
                "cannot print a source",
                format!("{}: {why}", path.display()),
            )
        })?;
        for note in &printed.notes {
            eprintln!("{}: {note}", path.display());
        }
        if args.write {
            let written = path.with_extension("tsx");
            fs::write(&written, &printed.text).map_err(|error| {
                Failure::input(
                    "cannot write a source",
                    format!("{}: {error}", written.display()),
                )
            })?;
            fs::remove_file(&path).map_err(|error| {
                Failure::input(
                    "cannot remove a source",
                    format!("{}: {error}", path.display()),
                )
            })?;
            eprintln!("wrote {}", written.display());
        } else {
            print!("{}", printed.text);
        }
    }
    Ok(Code::Ok)
}
pub use tokens::{design_files as design_tokens, native_modules as tokens};

/// Writes each element's intermediate form and web stylesheet to `dist`, or
/// with `--check` says which written ones differ from a fresh compile.
///
/// # Errors
///
/// [`Failure`] when a source cannot be read or compiled, or an output cannot
/// be written.
pub fn build(args: &FamilyBuild, from: &Path, json: bool) -> Result<Code, Failure> {
    let package = locate(&args.package, from);
    let compiled = compile::all(&package)?;
    let out = package.join("dist");
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
        return output::settle(&outputs, true, "helix family build", json);
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
pub fn check(args: &FamilyArgs, from: &Path, json: bool) -> Result<Code, Failure> {
    let package = locate(&args.package, from);
    let compiled = compile::all(&package)?;
    let mut differences = Vec::new();
    let mut manifest = None;
    for one in &compiled {
        if !one.family.tree.is_empty() {
            if manifest.is_none() {
                manifest = Some(read_manifest(&package)?);
            }
            let manifest = manifest.as_ref().unwrap_or(&serde_json::Value::Null);
            differences.extend(
                api::parity(&one.family.tag, &one.family.api, &one.family.tree, manifest)
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
pub fn stylesheets(args: &FamilyStylesheets, from: &Path, json: bool) -> Result<Code, Failure> {
    let package = locate(&args.package, from);
    let out = args
        .out
        .as_ref()
        .map_or_else(|| styled(&package).join("src"), |dir| locate(dir, from));
    let outputs: Vec<(PathBuf, String)> = compile::all(&package)?
        .iter()
        .filter(|one| !one.family.stylesheet.is_empty())
        .map(|one| (out.join(&one.family.stylesheet), generated(one, &package)))
        .collect();
    output::settle(&outputs, args.check, "helix family stylesheets", json)
}

/// Compiles each machine under the package's `src/machines` to the module
/// beside it, or with `--check` says which written ones are behind.
///
/// # Errors
///
/// [`Failure`] when a machine cannot be read or breaks a rule a machine
/// keeps, or a module cannot be written or read.
pub fn machines(args: &FamilyMachines, from: &Path, json: bool) -> Result<Code, Failure> {
    let package = locate(&args.package, from);
    let root = package.join("src").join("machines");
    if !root.is_dir() {
        return Err(Failure::input(
            "the package has no machines",
            format!("{} is not a directory", root.display()),
        )
        .hint("pass the directory that holds `src/machines`, such as helix/core"));
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
    let code = output::settle(&outputs, args.check, "helix family machines", json)?;
    if broken.is_empty() {
        Ok(code)
    } else {
        Err(Failure::input(
            format!("cannot compile {} of the machines", broken.len()),
            broken.join("\n\n"),
        ))
    }
}

/// Writes each capability's contract, and the types they share, under the
/// package's `src/capabilities`, or with `--check` says which are behind.
///
/// # Errors
///
/// [`Failure`] when a contract cannot be written or read.
pub fn capabilities(args: &FamilyCapabilities, from: &Path, json: bool) -> Result<Code, Failure> {
    let root = locate(&args.package, from).join("src").join("capabilities");
    let mut outputs = vec![(root.join("types.generated.ts"), capability::types_module())];
    outputs.extend(capability::CAPABILITIES.iter().map(|one| {
        (
            root.join(one.name).join("contract.generated.ts"),
            capability::contract(one),
        )
    }));
    output::settle(&outputs, args.check, "helix family capabilities", json)
}

/// Writes each family's native components, with their props typed, as
/// `<family>/index.native.ts` under `--out`, the styled package's `native`
/// folder unless given, or with `--check` says which are behind.
///
/// # Errors
///
/// [`Failure`] when a source cannot be compiled, the styled manifest or core's
/// event classes cannot be read, or an event's detail cannot be typed.
pub fn components(args: &FamilyComponents, from: &Path, json: bool) -> Result<Code, Failure> {
    let package = locate(&args.package, from);
    let compiled = compile::all(&package)?;
    let events = package.parent().unwrap_or(&package).join("core/src/events");
    let details = components::Details::read(&events)?;
    let root = args
        .out
        .as_ref()
        .map_or_else(|| styled(&package).join("native"), |dir| locate(dir, from));
    let outputs: Vec<(PathBuf, String)> =
        components::modules(&compiled, &read_manifest(&package)?, &details)
            .map_err(|faults| {
                Failure::input("cannot type the native components", faults.join("\n"))
            })?
            .into_iter()
            .map(|(family, text)| (root.join(family).join("index.native.ts"), text))
            .collect();
    output::settle(&outputs, args.check, "helix family components", json)
}

/// Writes the intermediate form's TypeScript types into the package's
/// `src`, or with `--check` says whether the written ones are behind.
///
/// # Errors
///
/// [`Failure`] when the types cannot be written or read.
pub fn types(args: &FamilyTypes, from: &Path, json: bool) -> Result<Code, Failure> {
    let package = locate(&args.package, from);
    let path = package.join("src").join("ir.generated.ts");
    output::settle(
        &[(path, types::typescript())],
        args.check,
        "helix family types",
        json,
    )
}

/// A generated stylesheet: what the table compiles to, under a line naming
/// its source.
fn generated(one: &Compiled, package: &Path) -> String {
    let source = one
        .source
        .strip_prefix(package.parent().and_then(Path::parent).unwrap_or(package))
        .unwrap_or(&one.source)
        .display()
        .to_string();
    format!(
        "/* Generated by `helix family stylesheets` from {source}. Do not edit: the\n   reasoning for each rule is beside it there. */\n\n{}",
        one.web
    )
}

/// A path from the command line, made absolute and canonical where it exists,
/// so a generated file names its source the same from any directory.
///
/// **A relative path is found from `from` or the nearest directory above it
/// that holds it**, so the styled package's script names the neutral package by
/// its place in the repository, `helix/neutral`, without naming a path inside
/// a sibling.
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

/// The styled package, beside the neutral one.
fn styled(package: &Path) -> PathBuf {
    package.parent().unwrap_or(package).join("styled")
}

/// The styled tier's manifest, which `analyze` writes and the API is held to.
fn read_manifest(package: &Path) -> Result<serde_json::Value, Failure> {
    let path = styled(package).join("custom-elements.json");
    let text = fs::read_to_string(&path).map_err(|error| {
        Failure::input(
            "cannot read the styled manifest",
            format!("{}: {error}", path.display()),
        )
        .hint("run `turbo run analyze --filter=@fusion.dev/helix`, which writes it")
    })?;
    serde_json::from_str(&text).map_err(|error| {
        Failure::input(
            "the styled manifest is not JSON",
            format!("{}: {error}", path.display()),
        )
    })
}
