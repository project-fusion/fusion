//! Reads every element's sources under a package and compiles them.
//!
//! **An element compiles only once every name it uses resolves**, and the
//! names one element of a family shares with another resolve across the
//! family: an item joins a collection another element holds, and a private
//! value one element reads may be one its family's root declares.

use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;

use crate::family::ir::{self, Family};
use crate::family::{api, css, read, resolve, shared, tokens, underlay};

/// One element, read and compiled.
pub struct Compiled {
    /// `<family>/<element>`, such as `tabs/root`.
    pub element: String,
    pub family: Family,
    pub source: PathBuf,
    pub web: String,
    /// What the checks on a table written with `styles()` report without
    /// refusing it: a pair of rules they cannot judge, and a rule another
    /// always overrides.
    pub notes: Vec<String>,
    /// The element whose rules a phone lays under this one's, as its
    /// source's `over` names it, `icon-button/root`.
    pub over: Option<String>,
}

/// Every element under the package's `src/families`, in path order.
///
/// # Errors
///
/// [`Failure`] when a source cannot be read or compiled, or a name it uses
/// resolves to nothing.
pub fn all(package: &Path) -> Result<Vec<Compiled>, Failure> {
    let families = package.join("src").join("families");
    fragments(package)?;
    let mut compiled = Vec::new();
    for family in folders(&families)? {
        for element in folders(&family)? {
            compiled.push(one(&family, &element)?);
        }
    }
    underlay::lay(&mut compiled).map_err(|why| cannot_compile(&families, why))?;
    let every: Vec<&Family> = compiled.iter().map(|one| &one.family).collect();
    let mut unresolved = shared::collections(&every);
    /* The theme's tokens are the styles package's beside this one. */
    let theme = tokens::names(&package.parent().unwrap_or(package).join("styles"))?;
    unresolved.extend(shared::cross_family(&every, theme.as_ref()));
    for family in folders(&families)? {
        let elements: Vec<&Family> = compiled
            .iter()
            .filter(|one| one.source.starts_with(&family))
            .map(|one| &one.family)
            .collect();
        let name = family.file_name().unwrap_or_default().to_string_lossy();
        unresolved.extend(
            shared::private_values(&elements)
                .into_iter()
                .map(|why| format!("{name}: {why}")),
        );
    }
    if unresolved.is_empty() {
        Ok(compiled)
    } else {
        Err(cannot_compile(&families, unresolved.join("\n")))
    }
}

/// Reads a fragment's module from the package's `src/fragments`, by name.
fn loader(src: &Path) -> impl FnMut(&str) -> Result<read::Lit, String> + '_ {
    move |name| {
        let module = src.join(ir::FRAGMENTS).join(format!("{name}.ts"));
        let text = fs::read_to_string(&module)
            .map_err(|error| format!("{}: {error}", module.display()))?;
        read::default_export(&text)
            .and_then(|export| ir::sugar::fragment(&export))
            .map_err(|why| format!("{}: {why}", module.display()))
    }
}

/// Reads each fragment under the package's `src/fragments` on its own, so
/// one no family takes in yet is held to the vocabulary too.
fn fragments(package: &Path) -> Result<(), Failure> {
    let src = package.join("src");
    let Ok(entries) = fs::read_dir(src.join(ir::FRAGMENTS)) else {
        return Ok(());
    };
    let mut modules: Vec<PathBuf> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|extension| extension == "ts"))
        .collect();
    modules.sort();
    for module in modules {
        let name = module
            .file_stem()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        ir::fragment_alone(&name, &mut loader(&src))
            .and_then(|table| ir::styled(&table))
            .map_err(|why| cannot_compile(&module, why))?;
    }
    Ok(())
}

/// The folders directly inside `folder`, sorted.
fn folders(folder: &Path) -> Result<Vec<PathBuf>, Failure> {
    let entries = fs::read_dir(folder).map_err(|error| {
        Failure::input(
            "the package has no families",
            format!("{}: {error}", folder.display()),
        )
        .hint("pass the directory that holds `src/families`, such as helix/neutral")
    })?;
    let mut found: Vec<PathBuf> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();
    found.sort();
    Ok(found)
}

fn one(family: &Path, folder: &Path) -> Result<Compiled, Failure> {
    let name = |path: &Path| {
        path.file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default()
    };
    let source = folder.join("styled.ts");
    /* The package's fragments sit beside its families. */
    let src = family.parent().and_then(Path::parent).unwrap_or(family);
    let headless = headless_of(folder)?;
    /* A table reads its conditions in one namespace, resolved against its
    headless source. */
    let context = headless.as_ref().map(ir::sugar::Source::of);
    let mut over = None;
    let styled = export(&source).and_then(|export| {
        ir::sugar::desugar_with(&export, context.as_ref())
            .inspect(|export| over = underlay::over(export))
            .and_then(|export| ir::expand(&export, &mut loader(src)))
            .and_then(|export| ir::styled(&export))
            .map_err(|why| cannot_compile(&source, why))
    })?;
    let family_name = name(family);
    let element = name(folder);
    let compiled = Family::new(styled, headless, &family_name, &element);
    let unresolved = resolve::unresolved(&compiled);
    if !unresolved.is_empty() {
        return Err(cannot_compile(folder, unresolved.join("\n")));
    }
    let notes = ir::checks::check(&compiled).map_err(|why| cannot_compile(&source, why))?;
    let web = css::emit(&compiled);
    Ok(Compiled {
        notes,
        over,
        element: format!("{family_name}/{element}"),
        family: compiled,
        source: folder.to_path_buf(),
        web,
    })
}

/// An element's headless source, `headless.tsx`, written with `render`.
/// A `headless.ts`, the builder form the families were once written in, is
/// refused.
fn headless_of(folder: &Path) -> Result<Option<api::Headless>, Failure> {
    let builder = folder.join("headless.ts");
    let rendered = folder.join("headless.tsx");
    if builder.is_file() {
        return Err(cannot_compile(
            &builder,
            "a headless source is `headless.tsx`, its part tree written as JSX in `render`: write `headless.tsx`, as every family's is".to_owned(),
        ));
    }
    if !rendered.is_file() {
        return Ok(None);
    }
    {
        let text = fs::read_to_string(&rendered).map_err(|error| {
            Failure::input(
                "cannot read a source",
                format!("{}: {error}", rendered.display()),
            )
        })?;
        read::headless_tsx(&text)
            .and_then(|export| {
                if !api::rendered::is_rendered(&export) {
                    return Err("`headless.tsx` declares its parts in `render`".to_owned());
                }
                api::rendered::rewrite(&export)
            })
            .and_then(|export| api::headless(&export))
            .map(Some)
            .map_err(|why| cannot_compile(&rendered, why))
    }
}

/// A source module's default export.
fn export(source: &Path) -> Result<read::Lit, Failure> {
    let text = fs::read_to_string(source).map_err(|error| {
        Failure::input(
            "cannot read a source",
            format!("{}: {error}", source.display()),
        )
    })?;
    read::default_export(&text).map_err(|why| cannot_compile(source, why))
}

fn cannot_compile(source: &Path, why: String) -> Failure {
    Failure::input(format!("cannot compile {}", source.display()), why)
}

#[cfg(test)]
mod tests {
    use super::headless_of;

    #[test]
    fn a_headless_source_in_the_builder_form_is_refused_with_the_form_to_write() {
        let folder = std::env::temp_dir().join(format!("helix-builder-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        std::fs::write(
            folder.join("headless.ts"),
            "export default headless('x', {})",
        )
        .unwrap();
        let refused = headless_of(&folder).unwrap_err();
        std::fs::remove_dir_all(&folder).unwrap();
        assert!(
            format!("{refused:?}").contains("write `headless.tsx`"),
            "{refused:?}"
        );
    }
}
