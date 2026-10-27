//! The design system a `helix system` command compiles, read from the
//! `system` of `helix.json`.
//!
//! **One section names everything the compiler takes from a design system**:
//!
//! - its prefixes: the tag's, the event's, and the custom property's;
//! - its token source, a Design Tokens Format Module file or a styles package;
//! - where its families are, and where each output is written.
//!
//! **Found by [`crate::config`]'s rules**: `--config <path>` first, then the
//! nearest configuration with a `system`, from the working directory up to
//! the repository root, where the `helix` key of `fusion.json` is read before
//! `helix.json` in each directory. Every path in the section is relative to
//! the directory the file is in.
//!
//! **A key the section does not know is refused**, with serde's message
//! naming it and its line, so a misspelled key is a failure at the command
//! that reads it. `$schema` is the one key at the top of the file that is read
//! and ignored, so an editor can validate the file against
//! `helix system config --schema`.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::config::{self, Found, FILE, PRODUCT_FILE};
use crate::PRODUCT;

mod defaults;
#[cfg(test)]
#[path = "literals_tests.rs"]
mod literals;
#[cfg(test)]
mod tests;

#[cfg(test)]
pub use tests::testing;

/// The folder under the families package `build` writes into when
/// `outputs.build` names none: beside the package's `dist`, never in it, so
/// the files a package publishes are its own.
pub const BUILD: &str = "build";

/// The `system` of `helix.json`, as it is written.
#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Config {
    /// The design system's name as a sentence writes it, such as `Acme`.
    pub name: String,
    /// The prefix of every element's tag, `<prefix>-tabs`. It is also the
    /// prefix of every event and every token unless `eventPrefix` or
    /// `propertyPrefix` says otherwise.
    pub prefix: String,
    /// The prefix the web sends each event under, `<eventPrefix>-activate`.
    #[serde(default)]
    pub event_prefix: Option<String>,
    /// The prefix of each token's custom property, `--<propertyPrefix>-space-md`.
    #[serde(default)]
    pub property_prefix: Option<String>,
    /// The package that holds `src/families` and `src/fragments`.
    pub families: String,
    /// Where the token names and values come from. Without it, no `token()`
    /// a family reads is checked.
    #[serde(default)]
    pub tokens: Option<TokenConfig>,
    /// The private values the page sets that a family may read with
    /// `inherited()`, such as the mode the page draws in. Each is written
    /// without its leading `_`.
    #[serde(default)]
    pub inherited: Vec<String>,
    /// The custom elements manifest of the styled elements, which `check`
    /// holds each element's API to and `components` describes each prop from.
    #[serde(default)]
    pub manifest: Option<String>,
    /// The folder of the web event classes, whose detail types `components`
    /// types each native event from.
    #[serde(default)]
    pub events: Option<String>,
    /// Where each command writes.
    #[serde(default)]
    pub outputs: OutputConfig,
    /// The runtime the outputs draw with. Helix's, unless it names another.
    #[serde(default)]
    pub runtime: RuntimeConfig,
}

/// The runtime the outputs draw with, and where its own sources are for a
/// project that builds its runtime too. Each name it leaves out is Helix's
/// runtime's.
#[derive(Debug, Default, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RuntimeConfig {
    /// The module each native component imports the runtime from.
    #[serde(default)]
    pub native: Option<String>,
    /// The type of the event a native handler hears, which the native
    /// runtime exports.
    #[serde(default)]
    pub event_type: Option<String>,
    /// The component an app wraps itself in, which draws each layer on a
    /// phone, as the anatomy names it.
    #[serde(default)]
    pub layer_host: Option<String>,
    /// The runtime's own sources, for a project that builds its runtime.
    #[serde(default)]
    pub sources: SourceConfig,
}

/// The runtime's own packages, which `machines`, `capabilities`, and `types`
/// write into.
#[derive(Debug, Default, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SourceConfig {
    /// The web runtime, which holds `src/machines` and `src/capabilities`.
    #[serde(default)]
    pub core: Option<String>,
    /// The native runtime, which `types` writes `src/ir.generated.ts` into.
    #[serde(default)]
    pub native: Option<String>,
}

/// The token source: a Design Tokens Format Module file, or a styles package
/// laid out as Helix's is. Exactly one of `dtcg` and `styles`.
#[derive(Debug, Default, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct TokenConfig {
    /// A Design Tokens Format Module file: every token in it, by its path
    /// joined with `-`, such as `color-primary` for `color.primary`.
    #[serde(default)]
    pub dtcg: Option<String>,
    /// Files that each set some tokens to another value in one mode, by the
    /// mode's name, such as `{ "dark": "tokens/dark.tokens.json" }`. A mode
    /// the map does not name draws the `dtcg` file's values.
    #[serde(default)]
    pub modes: BTreeMap<String, String>,
    /// A styles package that holds `src/tokens.ts`, `src/primitives.css`,
    /// `src/_modes.css`, and `src/base.css`.
    #[serde(default)]
    pub styles: Option<String>,
    /// The key `design-tokens` writes the design system's own data under in
    /// each `$extensions`, such as `com.example.acme`.
    #[serde(default)]
    pub vendor: Option<String>,
}

/// Where each command writes. A command whose output the section does not
/// name refuses to run, except `build`, which writes into the families
/// package's `build`.
#[derive(Debug, Default, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct OutputConfig {
    /// The folder `build` writes `ir/` and `web/` into. The families
    /// package's `build` unless it names another.
    #[serde(default)]
    pub build: Option<String>,
    /// The folder `components` writes `<family>/index.native.ts` into.
    #[serde(default)]
    pub components: Option<String>,
    /// The folder `design-tokens` writes the token file and its resolver into.
    #[serde(default)]
    pub design_tokens: Option<String>,
    /// The folder each element's `stylesheet` path is under.
    #[serde(default)]
    pub stylesheets: Option<String>,
    /// The folder `tokens` writes each mode's native token module into.
    #[serde(default)]
    pub tokens: Option<String>,
}

/// The names a design system gives what the compiler writes.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Names {
    /// The prefix of every tag.
    pub tag: String,
    /// The prefix of every event the web sends under the design system's name.
    pub event: String,
    /// The prefix of every token's custom property.
    pub property: String,
    /// The private values the page sets, which a family may read.
    pub inherited: Vec<String>,
}

impl Names {
    /// The tag of the element named `name`, `<prefix>-<name>`.
    pub fn tag(&self, name: &str) -> String {
        format!("{}-{name}", self.tag)
    }

    /// `tag` without the prefix, where it has it.
    pub fn bare<'a>(&self, tag: &'a str) -> Option<&'a str> {
        tag.strip_prefix(self.tag.as_str())?.strip_prefix('-')
    }

    /// The name the web sends the event `name` under, `<prefix>-<name>`.
    pub fn event(&self, name: &str) -> String {
        format!("{}-{name}", self.event)
    }

    /// The custom property of the token `name`, `--<prefix>-<name>`.
    pub fn token(&self, name: &str) -> String {
        format!("--{}-{name}", self.property)
    }

    /// The token a custom property names, where it is one: `--<prefix>-` and
    /// the token's name.
    pub fn token_of<'a>(&self, property: &'a str) -> Option<&'a str> {
        property
            .strip_prefix("--")?
            .strip_prefix(self.property.as_str())?
            .strip_prefix('-')
    }
}

/// Where the token names and values come from, resolved.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Tokens {
    /// No token source: no `token()` is checked.
    None,
    /// A Design Tokens Format Module file, and a file per mode it lays over it.
    Dtcg {
        file: PathBuf,
        modes: BTreeMap<String, PathBuf>,
    },
    /// A styles package, and the key its design tokens' own data is under.
    Styles {
        package: PathBuf,
        vendor: Option<String>,
    },
}

/// What each command writes into, resolved.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outputs {
    pub build: PathBuf,
    pub components: Option<PathBuf>,
    pub design_tokens: Option<PathBuf>,
    pub stylesheets: Option<PathBuf>,
    pub tokens: Option<PathBuf>,
}

/// The runtime the outputs draw with, resolved.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Runtime {
    pub native: String,
    pub event_type: String,
    pub layer_host: String,
    pub core: Option<PathBuf>,
    pub native_package: Option<PathBuf>,
}

/// A design system: its configuration, with every path made absolute.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    /// The file it was read from.
    pub file: PathBuf,
    /// The key of its section in that file, `system` or `helix.system`, as a
    /// message names it.
    #[serde(skip)]
    pub section: String,
    /// The directory a generated file names its sources from: the
    /// repository root above the file, or the file's own directory outside a
    /// repository.
    pub repository: PathBuf,
    pub name: String,
    pub names: Names,
    pub families: PathBuf,
    pub tokens: Tokens,
    pub manifest: Option<PathBuf>,
    pub events: Option<PathBuf>,
    pub outputs: Outputs,
    pub runtime: Runtime,
}

impl Project {
    /// The design system the file `flag` names, or the nearest configuration
    /// above `from` with a `system`, or none where neither is there.
    ///
    /// # Errors
    ///
    /// [`Failure`] when the file cannot be read, or its `system` is not a
    /// design system.
    pub fn find(flag: Option<&Path>, from: &Path) -> Result<Option<Self>, Failure> {
        match flag {
            Some(path) => {
                let file = if path.is_absolute() {
                    path.to_path_buf()
                } else {
                    from.join(path)
                };
                Self::read(&file).map(Some)
            }
            None => config::discover(from, |sections| sections.system.is_some())?
                .map(Self::of)
                .transpose(),
        }
    }

    /// The design system, where there must be one.
    ///
    /// # Errors
    ///
    /// [`Failure`] when there is none, or it cannot be read.
    pub fn required(flag: Option<&Path>, from: &Path) -> Result<Self, Failure> {
        Self::find(flag, from)?.ok_or_else(|| {
            Failure::input(
                format!("no `system` in {FILE}"),
                format!(
                    "searched {} and every directory above it up to the repository root for a {FILE}, or a {PRODUCT_FILE} with a `{PRODUCT}` key, that has a `system`",
                    from.display()
                ),
            )
            .hint(format!(
                "add a `system` to {FILE} that names the design system's prefix and its families, or pass --config"
            ))
        })
    }

    /// Reads and resolves the `system` of the configuration at `file`.
    ///
    /// # Errors
    ///
    /// [`Failure`] when the file cannot be read, has no `system`, or its
    /// `system` is not this shape or names both token sources.
    pub fn read(file: &Path) -> Result<Self, Failure> {
        let found = config::open(file)?.ok_or_else(|| {
            Failure::input(
                format!("cannot use {}", file.display()),
                format!("it has no `{PRODUCT}` key"),
            )
        })?;
        Self::of(found)
    }

    /// The design system the `system` of `found` describes.
    fn of(found: Found) -> Result<Self, Failure> {
        let section = found.key("system");
        let Some(system) = found.sections.system else {
            return Err(Failure::input(
                format!("{} has no `{section}`", found.file.display()),
                format!("`{PRODUCT} system` compiles the design system its `system` describes"),
            )
            .hint(format!(
                "add a `{section}` that names the design system's prefix and its families"
            )));
        };
        let root = found
            .file
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_default();
        Self::resolve(system, found.file, section, &root)
    }

    /// `config`, read from `file`, with each path made absolute against
    /// `root`.
    fn resolve(
        config: Config,
        file: PathBuf,
        section: String,
        root: &Path,
    ) -> Result<Self, Failure> {
        let at = |path: &str| {
            let joined = root.join(path);
            fs::canonicalize(&joined).unwrap_or(joined)
        };
        let refuse = |why: &str| {
            Failure::input(
                format!("cannot use the `{section}` of {}", file.display()),
                why.to_owned(),
            )
        };
        if config.prefix.is_empty() {
            return Err(refuse("`prefix` is empty"));
        }
        let tokens = match config.tokens {
            None => Tokens::None,
            Some(given) => token_source(given, &at).map_err(refuse)?,
        };
        let families = at(&config.families);
        let outputs = Outputs {
            build: config
                .outputs
                .build
                .as_deref()
                .map_or_else(|| families.join(BUILD), at),
            components: config.outputs.components.as_deref().map(at),
            design_tokens: config.outputs.design_tokens.as_deref().map(at),
            stylesheets: config.outputs.stylesheets.as_deref().map(at),
            tokens: config.outputs.tokens.as_deref().map(at),
        };
        let runtime = runtime(config.runtime, &at);
        let repository = root
            .ancestors()
            .find(|directory| directory.join(".git").exists())
            .unwrap_or(root)
            .to_path_buf();
        Ok(Self {
            names: Names {
                event: config.event_prefix.unwrap_or_else(|| config.prefix.clone()),
                property: config
                    .property_prefix
                    .unwrap_or_else(|| config.prefix.clone()),
                tag: config.prefix,
                inherited: config.inherited,
            },
            name: config.name,
            families,
            tokens,
            manifest: config.manifest.as_deref().map(at),
            events: config.events.as_deref().map(at),
            outputs,
            runtime,
            repository,
            file,
            section,
        })
    }

    /// `path` as a generated file names it: from the repository root, with
    /// forward slashes.
    pub fn named(&self, path: &Path) -> String {
        path.strip_prefix(&self.repository)
            .unwrap_or(path)
            .components()
            .map(|part| part.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/")
    }

    /// The path the file names under `key`, where a command needs it.
    ///
    /// # Errors
    ///
    /// [`Failure`] naming the key when the file leaves it out.
    pub fn needs<'a>(&self, path: Option<&'a PathBuf>, key: &str) -> Result<&'a Path, Failure> {
        path.map(PathBuf::as_path).ok_or_else(|| {
            let key = format!("{}.{key}", self.section);
            Failure::input(
                format!("{} names no `{key}`", self.file.display()),
                format!("the command reads or writes what `{key}` names"),
            )
            .hint(format!("add `{key}` to {}", self.file.display()))
        })
    }
}

/// The token source `given` names, each path made absolute with `at`.
///
/// # Errors
///
/// A sentence when it names both sources or neither, or a key the source it
/// names does not take.
fn token_source(given: TokenConfig, at: &dyn Fn(&str) -> PathBuf) -> Result<Tokens, &'static str> {
    match given {
        TokenConfig {
            dtcg: Some(_),
            styles: Some(_),
            ..
        } => Err("`tokens` names both `dtcg` and `styles`: name one"),
        TokenConfig {
            dtcg: Some(_),
            vendor: Some(_),
            ..
        } => Err("`tokens.vendor` is a styles package's: a `dtcg` file is written by hand"),
        TokenConfig {
            dtcg: Some(dtcg),
            modes,
            ..
        } => Ok(Tokens::Dtcg {
            file: at(&dtcg),
            modes: modes
                .iter()
                .map(|(mode, path)| (mode.clone(), at(path)))
                .collect(),
        }),
        TokenConfig {
            styles: Some(_),
            modes,
            ..
        } if !modes.is_empty() => {
            Err("`tokens.modes` is a `dtcg` file's: a styles package declares its own modes")
        }
        TokenConfig {
            styles: Some(styles),
            vendor,
            ..
        } => Ok(Tokens::Styles {
            package: at(&styles),
            vendor,
        }),
        TokenConfig { .. } => Err("`tokens` names neither `dtcg` nor `styles`"),
    }
}

/// The runtime `given` names, with Helix's runtime's names where it names
/// none, and its sources' paths made absolute with `at`.
fn runtime(given: RuntimeConfig, at: &dyn Fn(&str) -> PathBuf) -> Runtime {
    Runtime {
        native: given.native.unwrap_or_else(|| defaults::NATIVE.to_owned()),
        event_type: given
            .event_type
            .unwrap_or_else(|| defaults::EVENT_TYPE.to_owned()),
        layer_host: given
            .layer_host
            .unwrap_or_else(|| defaults::LAYER_HOST.to_owned()),
        core: given.sources.core.as_deref().map(at),
        native_package: given.sources.native.as_deref().map(at),
    }
}

/// `helix.json` as an editor validates it: the `system` in full, and the
/// other two sections by their shape. The intent and the component settings
/// are each refused by their own reader, which names the key it does not
/// know.
#[derive(JsonSchema)]
#[serde(deny_unknown_fields)]
#[allow(dead_code, reason = "a shape the schema is derived from, never built")]
struct File {
    /// The JSON Schema an editor validates the file with. Ignored.
    #[serde(rename = "$schema")]
    schema: Option<String>,
    /// The intent `helix theme` derives, written here, or the path of a theme
    /// file, relative to this one.
    theme: Option<ThemeSection>,
    /// What `helix component` reads: `tiers`, the directories holding
    /// component source, and the settings its rules read.
    components: Option<BTreeMap<String, serde_json::Value>>,
    /// The design system `helix system` compiles.
    system: Option<Config>,
}

/// A theme as `helix.json` writes it.
#[derive(JsonSchema)]
#[serde(untagged)]
#[allow(dead_code, reason = "a shape the schema is derived from, never built")]
enum ThemeSection {
    /// The path of a theme file.
    Path(String),
    /// The intent.
    Intent(BTreeMap<String, serde_json::Value>),
}

/// The JSON Schema of `helix.json`.
pub fn schema() -> String {
    let schema = schemars::schema_for!(File);
    let mut text = serde_json::to_string_pretty(&schema).unwrap_or_default();
    text.push('\n');
    text
}
