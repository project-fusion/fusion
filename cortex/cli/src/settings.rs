//! What a command runs against: the store, the models, and the scopes.
//!
//! **A flag, then its `CORTEX_` variable, then the config file, then the
//! default.** The config file is JSON, `config.json` in a `cortex` folder in your
//! config directory or wherever `--config` points, and every field in it is
//! optional:
//!
//! ```json
//! {
//!   "store": "postgres://cortex@db.example.com/cortex",
//!   "provider": "ollama",
//!   "model": "qwen3:4b",
//!   "embedder": "ollama",
//!   "embed_model": "nomic-embed-text",
//!   "scope": "project:checkout",
//!   "read": ["personal", "project:checkout"]
//! }
//! ```
//!
//! **A key comes from the environment, by the variable's name.** The config
//! file names the variable, `key_env`, and never holds the key, so the file
//! can be shared and committed. Nothing here has a key of its own.

use std::path::{Path, PathBuf};

use fusion_cortex_engram::Scope;
use fusion_rules::error::{Failure, Outcome};
use serde::Deserialize;

/// The chat model the `ollama` provider runs when none is named.
pub const DEFAULT_MODEL: &str = "qwen3:4b";

/// The embedding model the `ollama` embedder runs when none is named.
pub const DEFAULT_EMBED_MODEL: &str = "nomic-embed-text";

/// The config file's fields, each optional.
#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct File {
    pub base: Option<String>,
    pub embed_base: Option<String>,
    pub embed_key_env: Option<String>,
    pub embed_model: Option<String>,
    pub embedder: Option<String>,
    pub key_env: Option<String>,
    pub local: Option<bool>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub read: Option<Vec<String>>,
    pub scope: Option<String>,
    pub script: Option<PathBuf>,
    pub store: Option<String>,
}

/// The flags and variables, before the config file fills what they leave out.
#[derive(Debug, Default)]
pub struct Given {
    pub base: Option<String>,
    pub config: Option<PathBuf>,
    pub embed_base: Option<String>,
    pub embed_key_env: Option<String>,
    pub embed_model: Option<String>,
    pub embedder: Option<String>,
    pub key_env: Option<String>,
    pub local: bool,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub read: Vec<String>,
    pub scope: Option<String>,
    pub script: Option<PathBuf>,
    pub store: Option<String>,
}

/// A model client, by the name of its API.
#[derive(Clone, Debug, PartialEq)]
pub struct Client {
    pub base: Option<String>,
    /// The variable the key is read from, where the client takes one.
    pub key_env: Option<String>,
    pub local: bool,
    pub model: Option<String>,
    pub name: String,
}

/// Everything a command runs against.
#[derive(Clone, Debug)]
pub struct Settings {
    pub embedder: Option<Client>,
    pub provider: Client,
    /// The scopes a command may read.
    pub read: Vec<Scope>,
    /// The scope new episodes are recorded in.
    pub scope: Scope,
    /// The script the `scripted` provider and embedder answer from.
    pub script: Option<PathBuf>,
    pub store: String,
}

impl Settings {
    /// The settings `given` names, with the config file and the defaults
    /// filling the rest.
    ///
    /// # Errors
    ///
    /// [`Failure`] if the config file does not parse, or a scope is not one.
    pub fn resolve(given: Given) -> Outcome<Self> {
        let file = read_config(given.config.as_deref())?;
        let store = given.store.or(file.store).map_or_else(default_store, Ok)?;
        let provider = Client {
            base: given.base.or(file.base),
            key_env: given.key_env.or(file.key_env),
            local: given.local || file.local.unwrap_or(false),
            model: given.model.or(file.model),
            name: given
                .provider
                .or(file.provider)
                .unwrap_or_else(|| "ollama".to_owned()),
        };
        let embedder = given
            .embedder
            .or(file.embedder)
            .unwrap_or_else(|| "ollama".to_owned());
        let embedder = (embedder != "none").then(|| Client {
            base: given.embed_base.or(file.embed_base),
            key_env: given.embed_key_env.or(file.embed_key_env),
            local: provider.local,
            model: given.embed_model.or(file.embed_model),
            name: embedder,
        });
        let scope = given
            .scope
            .or(file.scope)
            .map_or(Ok(Scope::Personal), |text| parse_scope(&text))?;
        let read = if given.read.is_empty() {
            file.read.unwrap_or_default()
        } else {
            given.read
        };
        let mut read: Vec<Scope> = read
            .iter()
            .map(|text| parse_scope(text))
            .collect::<Outcome<_>>()?;
        /* **What you write, you read.** With no scopes named, a command reads
        personal memory and the scope it writes to, so a project's facts answer
        the questions asked in that project. */
        if read.is_empty() {
            read.push(Scope::Personal);
            if scope != Scope::Personal {
                read.push(scope.clone());
            }
        }
        Ok(Self {
            embedder,
            provider,
            read,
            scope,
            script: given.script.or(file.script),
            store,
        })
    }
}

/// A scope as the command line writes it: `personal`, `organization`,
/// `project:<name>`, or `team:<name>`.
///
/// # Errors
///
/// [`Failure`] if `text` is none of those.
pub fn parse_scope(text: &str) -> Outcome<Scope> {
    let (kind, name) = match text.split_once(':') {
        Some((kind, name)) => (kind, Some(name.trim()).filter(|name| !name.is_empty())),
        None => (text, None),
    };
    Scope::parts(kind.trim(), name).ok_or_else(|| {
        Failure::input(
            format!("`{text}` is not a scope"),
            "a scope is personal, organization, project:<name>, or team:<name>",
        )
        .choices(
            ["personal", "organization", "project:<name>", "team:<name>"]
                .map(str::to_owned)
                .to_vec(),
        )
    })
}

/// A scope as [`parse_scope`] reads it.
pub fn scope_text(scope: &Scope) -> String {
    match scope.name() {
        Some(name) => format!("{}:{name}", scope.kind()),
        None => scope.kind().to_owned(),
    }
}

/// The config file `path` names, or the one in your config directory, or
/// none.
fn read_config(path: Option<&Path>) -> Outcome<File> {
    let (path, named) = match path {
        Some(path) => (path.to_path_buf(), true),
        None => match config_dir() {
            Some(dir) => (dir.join("cortex").join("config.json"), false),
            None => return Ok(File::default()),
        },
    };
    let text = match std::fs::read_to_string(&path) {
        Ok(text) => text,
        Err(error) if !named && error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(File::default())
        }
        Err(error) => {
            return Err(Failure::input(
                format!("cannot read {}", path.display()),
                error.to_string().to_lowercase(),
            ))
        }
    };
    serde_json::from_str(&text).map_err(|error| {
        Failure::input(
            format!("{} is not a Cortex config", path.display()),
            error.to_string(),
        )
    })
}

/// `cortex.db` in a `cortex` folder in your data directory, created where it does not
/// exist.
fn default_store() -> Outcome<String> {
    let Some(dir) = data_dir() else {
        return Err(
            Failure::input("no store", "there is no home directory to keep one in")
                .hint("cortex --store memory.db ..."),
        );
    };
    let dir = dir.join("cortex");
    std::fs::create_dir_all(&dir).map_err(|error| {
        Failure::input(
            format!("cannot create {}", dir.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    Ok(dir.join("cortex.db").to_string_lossy().into_owned())
}

fn home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .filter(|home| !home.is_empty())
        .map(PathBuf::from)
}

/// Where your data goes: `$XDG_DATA_HOME`, then each platform's own place.
fn data_dir() -> Option<PathBuf> {
    platform_dir("XDG_DATA_HOME", ".local/share")
}

/// Where your config goes: `$XDG_CONFIG_HOME`, then each platform's own place.
fn config_dir() -> Option<PathBuf> {
    platform_dir("XDG_CONFIG_HOME", ".config")
}

fn platform_dir(variable: &str, unix: &str) -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os(variable).filter(|dir| !dir.is_empty()) {
        return Some(PathBuf::from(dir));
    }
    if cfg!(windows) {
        return std::env::var_os("APPDATA").map(PathBuf::from);
    }
    let home = home()?;
    if cfg!(target_os = "macos") {
        return Some(home.join("Library").join("Application Support"));
    }
    Some(home.join(unix))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_scope_reads_back_from_its_text() {
        for text in ["personal", "organization", "project:checkout", "team:core"] {
            assert_eq!(scope_text(&parse_scope(text).unwrap()), text);
        }
        assert!(parse_scope("project").is_err(), "a project names itself");
        assert!(parse_scope("personal:dana").is_err());
        assert!(parse_scope("everyone").is_err());
    }

    #[test]
    fn a_command_reads_the_scope_it_writes_to() {
        let settings = Settings::resolve(Given {
            config: Some(PathBuf::from("/dev/null/none.json")),
            scope: Some("project:checkout".into()),
            store: Some("memory.db".into()),
            ..Given::default()
        });
        // A config file named and missing is an error, unlike the default one.
        assert!(settings.is_err());

        let settings = Settings::resolve(Given {
            scope: Some("project:checkout".into()),
            store: Some("memory.db".into()),
            ..Given::default()
        })
        .unwrap();
        assert_eq!(
            settings.read,
            [Scope::Personal, Scope::Project("checkout".into())]
        );
        assert_eq!(settings.provider.name, "ollama");
        assert_eq!(settings.embedder.unwrap().name, "ollama");
    }
}
