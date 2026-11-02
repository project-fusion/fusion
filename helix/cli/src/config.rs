//! Finding the configuration, and deciding which one wins.
//!
//! **One file configures every noun that reads one**: `helix.json`, or the
//! `helix` key of `fusion.json`, which holds the same shape. It has three
//! sections, each read by its own noun:
//!
//! - `theme`, the intent `helix theme` derives, written in place or as the
//!   path of a theme file;
//! - `components`, the tiers and settings `helix component` reads;
//! - `system`, the design system `helix system` compiles.
//!
//! **Precedence is stated rather than discovered**, because a reader debugging
//! "why did it use that file" needs an answer they can read rather than
//! reproduce. In one directory:
//!
//! 1. `fusion.json`, under a `helix` key. Helix is a plugin of that product,
//!    and a product's configuration is where its plugins are configured.
//! 2. `helix.json`, for a project that has this tool and not that product.
//!
//! A `fusion.json` with no `helix` key says nothing about Helix, and the
//! `helix.json` beside it is read.
//!
//! **The theme is found in this order**:
//!
//! 1. A path given as an argument. Explicit beats everything.
//! 2. `--config <path>`. Explicit at the session level.
//! 3. The `theme` of the nearest configuration that has one, searched from
//!    the working directory upward.
//! 4. `helix.theme.json`, searched the same way, which is read for one more
//!    release with a notice to move it into `helix.json`.
//! 5. Nothing, which is an error rather than a default.
//!
//! **The fifth rung is deliberate.** A tool that invents a default theme when
//! it cannot find one produces output that looks right and is about nothing the
//! reader wrote, and the mistake surfaces at the far end, in a browser, as a
//! palette nobody chose. Refusing costs one line of output and no confusion.
//!
//! **The search walks up and stops at a repository root.** A monorepo has one
//! configuration near the top and many packages under it, so walking up is
//! what lets a command run from anywhere in the tree; stopping at `.git` is
//! what keeps it from finding a colleague's file two directories above the
//! checkout. A configuration without the section a noun reads does not stop
//! the search for it.

use std::path::{Path, PathBuf};

use fusion_helix_theme::intent::ThemeIntent;
use fusion_rules::error::{Failure, Outcome};
use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Deserializer};
use serde_json::Value;

use crate::component::Settings;
use crate::family::project::Config as System;

/// The file that configures Helix where `fusion.json` does not.
pub const FILE: &str = "helix.json";

/// The product's file, whose `helix` key holds what [`FILE`] would.
pub const PRODUCT_FILE: &str = "fusion.json";

/// The theme's own file, before [`FILE`] held it: read for one more release.
pub const LEGACY_THEME: &str = "helix.theme.json";

/// The sections of `helix.json`, and of the `helix` key of `fusion.json`.
///
/// **Read whole, with every section typed**, so a mistake in any of them is
/// refused with serde's message, which names the key and its line, by the
/// first command that reads the file.
#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Sections {
    /// The JSON Schema an editor validates the file with. Ignored.
    #[serde(rename = "$schema", default)]
    pub _schema: Option<String>,
    /// The intent `helix theme` derives.
    #[serde(default)]
    pub theme: Option<Theme>,
    /// What `helix component` reads.
    #[serde(default)]
    pub components: Option<Settings>,
    /// The design system `helix system` compiles.
    #[serde(default)]
    pub system: Option<System>,
}

/// A theme as the configuration writes it: an intent in place, or the path
/// of a theme file, relative to the configuration.
#[derive(Debug)]
pub enum Theme {
    /// The path of a file holding the intent, such as one the site's theme
    /// builder hands out.
    Path(String),
    /// The intent itself.
    Intent(Box<ThemeIntent>),
}

/* **Written by hand, not `untagged`.** An untagged enum reports a mistake as
"did not match any variant", which loses the key the reader misspelled. This
hands an object to the intent's own reader, so its message names the key and
the line, as it does in a theme file. */
impl<'de> Deserialize<'de> for Theme {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct Either;
        impl<'de> Visitor<'de> for Either {
            type Value = Theme;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a theme intent, or the path of a theme file")
            }

            fn visit_str<E: de::Error>(self, path: &str) -> Result<Theme, E> {
                Ok(Theme::Path(path.to_owned()))
            }

            fn visit_map<A: MapAccess<'de>>(self, map: A) -> Result<Theme, A::Error> {
                ThemeIntent::deserialize(de::value::MapAccessDeserializer::new(map))
                    .map(|intent| Theme::Intent(Box::new(intent)))
            }
        }
        deserializer.deserialize_any(Either)
    }
}

/// A configuration that was found: the file, and its sections.
#[derive(Debug)]
pub struct Found {
    /// The file it was read from.
    pub file: PathBuf,
    /// What it holds.
    pub sections: Sections,
}

impl Found {
    /// The key a section is under, as a message names it: `helix.<section>`
    /// in `fusion.json`, and `<section>` in `helix.json`.
    #[must_use]
    pub fn key(&self, section: &str) -> String {
        if self.is_product() {
            format!("helix.{section}")
        } else {
            section.to_owned()
        }
    }

    /// The file's name, `fusion.json` or `helix.json`.
    #[must_use]
    pub fn name(&self) -> &'static str {
        if self.is_product() {
            PRODUCT_FILE
        } else {
            FILE
        }
    }

    fn is_product(&self) -> bool {
        self.file
            .file_name()
            .is_some_and(|name| name == PRODUCT_FILE)
    }
}

/// The product's file, read for its `helix` key alone.
#[derive(Deserialize)]
struct Product {
    helix: Sections,
}

/// Reads the configuration in `file`: the `helix` key where the file is
/// `fusion.json`, and the whole file otherwise. `None` for a `fusion.json`
/// with no `helix` key.
///
/// # Errors
///
/// [`Failure`] when the file cannot be read, is not JSON, or holds a section
/// that is not its shape.
pub fn open(file: &Path) -> Outcome<Option<Found>> {
    let text = std::fs::read_to_string(file).map_err(|failure| {
        Failure::input(
            format!("cannot read {}", file.display()),
            lowercase(&failure.to_string()),
        )
    })?;
    let refuse = |failure: serde_json::Error| {
        Failure::input(
            format!("cannot use {}", file.display()),
            failure.to_string(),
        )
    };
    let product = file.file_name().is_some_and(|name| name == PRODUCT_FILE);
    let value: Value = serde_json::from_str(&text).map_err(refuse)?;
    let held = if product {
        match value.get("helix") {
            Some(held) => held,
            None => return Ok(None),
        }
    } else {
        &value
    };
    let sections = if held.as_object().is_some_and(flat) {
        /* **The shape before the sections**, which `helix component` shipped
        with: its settings at the top. Read for one more release. */
        eprintln!(
            "helix: {} holds the component settings at the top. Move them under \"components\": the shape without it is read for one more release.",
            file.display()
        );
        Sections {
            components: Some(serde_json::from_value(held.clone()).map_err(refuse)?),
            ..Sections::default()
        }
    } else if product {
        serde_json::from_str::<Product>(&text)
            .map_err(refuse)?
            .helix
    } else {
        serde_json::from_str(&text).map_err(refuse)?
    };
    let file = std::fs::canonicalize(file).unwrap_or_else(|_| file.to_path_buf());
    Ok(Some(Found { file, sections }))
}

/// Whether `held` is the component settings written at the top: it names
/// none of the sections, and some key besides `$schema`.
#[must_use]
pub fn flat(held: &serde_json::Map<String, Value>) -> bool {
    !held.contains_key("theme")
        && !held.contains_key("components")
        && !held.contains_key("system")
        && held.keys().any(|key| key != "$schema")
}

/// The configuration in `directory` alone: `fusion.json`'s `helix` key in this
/// repository's builds, or else `helix.json`.
///
/// # Errors
///
/// [`Failure`] when the file that answers cannot be read or used.
pub fn here(directory: &Path) -> Outcome<Option<Found>> {
    /* A published binary neither reads nor names the product's file: a consumer
    never installed the product it is named for. */
    #[cfg(feature = "internal")]
    {
        let product = directory.join(PRODUCT_FILE);
        if product.is_file() {
            if let Some(found) = open(&product)? {
                return Ok(Some(found));
            }
        }
    }
    let own = directory.join(FILE);
    if own.is_file() {
        return open(&own);
    }
    Ok(None)
}

/// Walks up from `start` to the repository root, and answers the nearest
/// configuration whose sections `has` accepts.
///
/// # Errors
///
/// [`Failure`] when a file on the way cannot be read or used.
pub fn discover(start: &Path, has: impl Fn(&Sections) -> bool) -> Outcome<Option<Found>> {
    for directory in start.ancestors() {
        if let Some(found) = here(directory)? {
            if has(&found.sections) {
                return Ok(Some(found));
            }
        }
        /* Stopped *after* looking, so a file beside `.git` at the root is
        found rather than skipped by a check that ran first. */
        if directory.join(".git").exists() {
            return Ok(None);
        }
    }
    Ok(None)
}

/// Walks up from `start` looking for a file called `name`, and stops at the
/// repository root, as [`discover`] does.
#[must_use]
pub fn discover_named(start: &Path, name: &str) -> Option<PathBuf> {
    for directory in start.ancestors() {
        let candidate = directory.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        if directory.join(".git").exists() {
            return None;
        }
    }
    None
}

/// The intent the rungs above find, and the name a report gives its source.
///
/// # Errors
///
/// [`Failure`] when nothing is found, naming the file it looked for and the
/// command that writes one, or when what is found cannot be read.
pub fn theme(
    argument: Option<&Path>,
    flag: Option<&Path>,
    from: &Path,
) -> Outcome<(ThemeIntent, String)> {
    if let Some(path) = argument.or(flag) {
        return Ok((read(path)?, path.display().to_string()));
    }
    let found = discover(from, |sections| sections.theme.is_some())?;
    if let Some((file, theme)) = found.and_then(|found| Some((found.file, found.sections.theme?))) {
        return match theme {
            Theme::Intent(intent) => Ok((*intent, file.display().to_string())),
            Theme::Path(path) => {
                let path = file
                    .parent()
                    .map_or_else(|| PathBuf::from(&path), |directory| directory.join(&path));
                Ok((read(&path)?, path.display().to_string()))
            }
        };
    }
    if let Some(path) = discover_named(from, LEGACY_THEME) {
        eprintln!(
            "helix: read {}. Move the intent into helix.json as its \"theme\", or name the file there as \"theme\": a {LEGACY_THEME} alone is read for one more release.",
            path.display()
        );
        return Ok((read(&path)?, path.display().to_string()));
    }
    Err(Failure::input(
        format!("no theme in {FILE}"),
        format!(
            "searched {} and every directory above it up to the repository root for a {FILE}, or a {PRODUCT_FILE} with a `helix` key, that has a `theme`",
            from.display()
        ),
    )
    .hint("helix theme init"))
}

/// Reads and parses one theme file.
///
/// # Errors
///
/// [`Failure`] when the file cannot be read or is not an intent. **The parse
/// error carries serde's own message**, which names the offending key and its
/// line, rather than being flattened into "invalid theme": a config file is hand
/// written and the reader's next action is to open it at that line.
pub fn read(path: &Path) -> Outcome<ThemeIntent> {
    let source = std::fs::read_to_string(path).map_err(|failure| {
        Failure::input(
            format!("cannot read {}", path.display()),
            lowercase(&failure.to_string()),
        )
    })?;
    serde_json::from_str(&source).map_err(|failure| {
        Failure::input(
            format!("cannot use {}", path.display()),
            failure.to_string(),
        )
    })
}

/// `io::Error` renders capitalised and the error format continues a sentence.
fn lowercase(message: &str) -> String {
    let mut characters = message.chars();
    match characters.next() {
        None => String::new(),
        Some(first) => first.to_lowercase().collect::<String>() + characters.as_str(),
    }
}

#[cfg(test)]
mod tests {
    use super::{here, Found, Theme};

    /// `files` written into a folder of their own, and the configuration
    /// found there.
    fn found(name: &str, files: &[(&str, &str)]) -> Option<Found> {
        let folder =
            std::env::temp_dir().join(format!("helix-config-{name}-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        for (file, text) in files {
            std::fs::write(folder.join(file), text).unwrap();
        }
        let read = here(&folder).unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
        std::fs::remove_dir_all(&folder).unwrap();
        read
    }

    #[test]
    fn each_section_is_read_from_helix_json() {
        let read = found(
            "sections",
            &[(
                "helix.json",
                r#"{ "theme": "brand.json", "components": { "tiers": ["src"] } }"#,
            )],
        )
        .unwrap();
        assert!(matches!(&read.sections.theme, Some(Theme::Path(path)) if path == "brand.json"));
        assert_eq!(read.key("theme"), "theme");
        assert!(read.sections.system.is_none());
        assert_eq!(read.sections.components.unwrap().tiers, ["src"]);
    }

    #[test]
    fn the_helix_key_of_fusion_json_is_read_before_helix_json() {
        let read = found(
            "product",
            &[
                (
                    "fusion.json",
                    r#"{ "helix": { "components": { "tiers": ["lib"] } } }"#,
                ),
                ("helix.json", r#"{ "components": { "tiers": ["src"] } }"#),
            ],
        )
        .unwrap();
        assert_eq!(read.name(), "fusion.json");
        assert_eq!(read.key("components"), "helix.components");
        assert_eq!(read.sections.components.unwrap().tiers, ["lib"]);
    }

    #[test]
    fn a_fusion_json_with_no_helix_key_leaves_helix_json_to_answer() {
        let read = found(
            "no-key",
            &[
                ("fusion.json", r#"{ "domains": ["acme"] }"#),
                ("helix.json", r#"{ "components": { "tiers": ["src"] } }"#),
            ],
        )
        .unwrap();
        assert_eq!(read.name(), "helix.json");
    }

    #[test]
    fn the_settings_written_at_the_top_are_read_as_the_components() {
        let read = found("flat", &[("helix.json", r#"{ "tiers": ["src"] }"#)]).unwrap();
        assert_eq!(read.sections.components.unwrap().tiers, ["src"]);
    }

    #[test]
    fn a_key_beside_the_sections_is_refused_by_its_name() {
        let folder =
            std::env::temp_dir().join(format!("helix-config-unknown-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        std::fs::write(folder.join("helix.json"), r#"{ "theme": {}, "sytem": {} }"#).unwrap();
        let refused = here(&folder).unwrap_err().render("helix");
        std::fs::remove_dir_all(&folder).unwrap();
        assert!(refused.contains("sytem"), "{refused}");
    }
}
