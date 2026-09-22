//! Running a rule somebody wrote outside this repository.
//!
//! **A host, and nothing about what a rule reads.** What a plugin is handed is
//! a string and what it hands back is a string, so this crate knows what a
//! module is, what version of the world it speaks and what a finding looks like,
//! and never what a component or a workspace is. `helix component check` is the
//! first verb to take plugins and `fusion prose check` is the same shape over
//! different input: a type here that named a manifest would have to be widened
//! or copied on the day the second one arrives.
//!
//! **WASM rather than a linked crate or a binary on the path.** A plugin system
//! a user cannot extend without our build is a chokepoint, which eliminates
//! linking; a binary on the path is a release pipeline per platform and hands a
//! third party the whole machine, where reading a workspace is all the work
//! needs. A module is one artifact that runs everywhere, and it is sandboxed by
//! default, which is the property that matters when the thing being loaded is
//! somebody else's code pointed at somebody's own source.
//!
//! **The sandbox is a boundary rather than a claim, because the linker is
//! empty.** Nothing is imported into a plugin: no filesystem, no clock, no
//! network. A module that asks for one fails to instantiate and is refused by
//! name. What it may read is what the host passes in the payload, which is a
//! request to widen the world rather than an escape hatch nobody can audit.

use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::Finding;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use wasmtime::component::{Component, Linker};
use wasmtime::{Config, Engine, Store};

wasmtime::component::bindgen!({ path: "wit", world: "plugin" });

/// The world this host speaks, which a module declares back.
///
/// **A mismatch is a message rather than a crash.** A plugin built against a
/// world the host does not speak is the first thing that happens once anybody
/// upgrades either side, and a legible refusal is decided now or not at all.
///
/// **World 2 widened `rule` and nothing published spoke world 1.** A rule now
/// names the parts of the payload it reads, so a host composes what was asked
/// for rather than everything it has. One version was spent proving that the
/// refusal works, which is cheaper than the first real plugin discovering it.
pub const WORLD: u32 = 2;

/// What a plugin says one of its rules is.
#[derive(Clone, Debug)]
pub struct Provided {
    pub name: String,
    pub summary: String,
    pub unit: String,
    /// The parts of the payload it reads, which is what the host composes.
    pub reads: Vec<String>,
}

/// One module the host loaded, as the register prints it.
#[derive(Clone, Debug)]
pub struct Loaded {
    /// Its file name without the extension, which is what a person calls it.
    pub name: String,
    /// `sha256:` and the first sixteen characters, which is what a person
    /// compares. The whole digest is in the JSON.
    pub digest: String,
    pub provides: Vec<Provided>,
    /// Where it was read from, for a refusal that names a file.
    pub file: PathBuf,
}

/// What a plugin answered, in the shape a report is built from.
///
/// **`edits` is read and never applied here.** Every rule in this workspace has
/// a judging half and some have a writing one, so a reply with no shape for an
/// edit would have to grow one, and a world that grows a capability after
/// plugins exist breaks all of them. What a plugin asked to write is carried
/// back and left to the caller: the host has no workspace root and no verb, and
/// the split between judging and writing is the caller's to enforce.
#[derive(Debug, Deserialize)]
pub struct Judged {
    pub checked: usize,
    #[serde(default)]
    pub findings: Vec<Told>,
    #[serde(default)]
    pub notes: Vec<String>,
    /// Files the plugin would rewrite, which nothing applies unless asked.
    #[serde(default)]
    pub edits: Vec<Edit>,
}

/// One file a plugin would rewrite, whole.
///
/// **The whole text rather than a patch.** A patch is a second format to agree
/// on and to get wrong, and a rule that can repair a file can print it: the
/// rules compiled in here rewrite whole files for the same reason.
#[derive(Debug, Deserialize)]
pub struct Edit {
    /// Relative to the workspace root, the way a finding names a file.
    pub file: String,
    pub text: String,
}

/// One finding as a plugin words it, which is a finding as anything else does.
#[derive(Debug, Deserialize)]
pub struct Told {
    pub detail: String,
    pub file: String,
    pub message: String,
}

impl From<Told> for Finding {
    fn from(told: Told) -> Self {
        Self {
            detail: told.detail,
            file: told.file,
            message: told.message,
        }
    }
}

/// Why a module was not loaded, or why a call did not answer.
#[derive(Debug)]
pub struct Refused {
    /// The file it happened to, as a person would name it.
    pub file: PathBuf,
    pub why: String,
}

impl std::fmt::Display for Refused {
    fn fmt(&self, into: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(into, "{}: {}", self.file.display(), self.why)
    }
}

/// The sha256 of a module, as the register prints it.
///
/// **A hash from a crate rather than by hand.** What the register is for is a
/// reader comparing two digests, and thirty lines of round constants in this
/// file would be a primitive nobody reviews sitting next to the sandbox.
fn digest_of(bytes: &[u8]) -> String {
    let mut said = String::from("sha256:");
    for one in Sha256::digest(bytes) {
        let _ = write!(said, "{one:02x}");
    }
    said
}

/// The plugins found in a directory, each ready to be asked.
pub struct Host {
    engine: Engine,
    modules: Vec<(Loaded, Component)>,
}

impl Host {
    /// Every `.wasm` in a directory, in name order, refusing what it cannot run.
    ///
    /// **A directory the host walks, rather than a list a workspace declares.**
    /// A rule is a file, and a rule that also needs an entry in a second file is
    /// two steps where one will do, which is the friction that stops the third
    /// rule being written. What that trades away is a reader seeing the list
    /// without running anything, and the register buys it back: every run prints
    /// what it loaded, by name and by hash.
    ///
    /// A directory that is not there is no plugins rather than a failure: not
    /// having written one is the normal state of a workspace.
    ///
    /// # Errors
    ///
    /// [`Refused`] for the first module that will not load: one that is not a
    /// component, one that asks for an import this host does not provide, or one
    /// built against a world this host does not speak.
    pub fn read(at: &Path) -> Result<Self, Refused> {
        let mut config = Config::new();
        config.wasm_component_model(true);
        let engine = Engine::new(&config).map_err(|why| Refused {
            file: at.to_path_buf(),
            why: format!("the runtime would not start: {why}"),
        })?;

        let mut found: Vec<PathBuf> = match fs::read_dir(at) {
            Ok(entries) => entries
                .flatten()
                .map(|one| one.path())
                .filter(|one| one.extension().is_some_and(|kind| kind == "wasm"))
                .collect(),
            Err(_) => Vec::new(),
        };
        found.sort();

        let mut modules = Vec::new();
        for file in found {
            let bytes = fs::read(&file).map_err(|why| Refused {
                file: file.clone(),
                why: format!("it could not be read: {why}"),
            })?;
            let component = Component::from_binary(&engine, &bytes).map_err(|why| Refused {
                file: file.clone(),
                why: format!(
                    "it is not a component this host can run: {why}. A plugin is a WebAssembly \
                     component built against the `fusion:rules` world"
                ),
            })?;
            let loaded = Self::introduce(&engine, &component, &file, &bytes)?;
            /* **Two modules claiming one rule name is a refusal, not a
            winner.** Last one wins makes which rule ran depend on how a
            directory sorts, and a run whose meaning turns on a file name is the
            thing the register exists to stop. Both modules are named, because
            the person reading has to decide which of them to remove. */
            for provided in &loaded.provides {
                let taken = modules.iter().find(|(one, _): &&(Loaded, Component)| {
                    one.provides.iter().any(|two| two.name == provided.name)
                });
                if let Some((first, _)) = taken {
                    return Err(Refused {
                        file: loaded.file.clone(),
                        why: format!(
                            "it provides `{}`, which `{}` already provides. Two plugins claiming \
                             one rule name would make the run depend on how the directory sorts, \
                             so remove one of them or rename the rule",
                            provided.name,
                            first.file.display()
                        ),
                    });
                }
            }
            modules.push((loaded, component));
        }
        Ok(Self { engine, modules })
    }

    /// What a module says it is, which is the only thing asked of it at load.
    fn introduce(
        engine: &Engine,
        component: &Component,
        file: &Path,
        bytes: &[u8],
    ) -> Result<Loaded, Refused> {
        let mut store = Store::new(engine, ());
        /* **Nothing is added to the linker, and that is the sandbox.** A module
        importing a filesystem or a clock fails here, by name, rather than being
        given one. */
        let linker = Linker::new(engine);
        let plugin =
            Plugin::instantiate(&mut store, component, &linker).map_err(|why| Refused {
                file: file.to_path_buf(),
                why: format!(
                "it could not be started: {why}. A plugin is given a payload and nothing else, so \
                 a module importing a filesystem, a clock or a network is refused here"
            ),
            })?;

        let spoken = plugin
            .call_world_version(&mut store)
            .map_err(|why| Refused {
                file: file.to_path_buf(),
                why: format!("it would not say which world it speaks: {why}"),
            })?;
        if spoken != WORLD {
            return Err(Refused {
                file: file.to_path_buf(),
                why: format!(
                    "it was built against world {spoken} and this host speaks world {WORLD}. \
                     Rebuild it against `fusion:rules` world {WORLD}, or run a version of this \
                     command line that speaks world {spoken}"
                ),
            });
        }

        let provides = plugin
            .call_rules(&mut store)
            .map_err(|why| Refused {
                file: file.to_path_buf(),
                why: format!("it would not say what rules it provides: {why}"),
            })?
            .into_iter()
            .map(|one| Provided {
                name: one.name,
                summary: one.summary,
                unit: one.unit,
                reads: one.reads,
            })
            .collect();

        let digest = digest_of(bytes);
        Ok(Loaded {
            name: file
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
            digest,
            provides,
            file: file.to_path_buf(),
        })
    }

    /// The register: what was loaded, in the order it was loaded.
    #[must_use]
    pub fn loaded(&self) -> Vec<&Loaded> {
        self.modules.iter().map(|(one, _)| one).collect()
    }

    /// Ask the module providing a rule to judge one payload.
    ///
    /// **A store per call, so one rule cannot leave anything behind for the
    /// next.** Instantiating costs microseconds against a rule that reads a
    /// manifest, and the alternative is a plugin that can keep state between
    /// two runs of a check, which nothing in a rule's contract allows.
    ///
    /// # Errors
    ///
    /// [`Refused`] where no module provides the rule, where the call traps, or
    /// where what came back is not a judgment.
    pub fn check(&self, rule: &str, payload: &str) -> Result<Judged, Refused> {
        let Some((loaded, component)) = self
            .modules
            .iter()
            .find(|(one, _)| one.provides.iter().any(|two| two.name == rule))
        else {
            return Err(Refused {
                file: PathBuf::new(),
                why: format!("no plugin provides a rule called `{rule}`"),
            });
        };

        let mut store = Store::new(&self.engine, ());
        let linker = Linker::new(&self.engine);
        let plugin =
            Plugin::instantiate(&mut store, component, &linker).map_err(|why| Refused {
                file: loaded.file.clone(),
                why: format!("it could not be started: {why}"),
            })?;
        let said = plugin
            .call_check(&mut store, rule, payload)
            .map_err(|why| Refused {
                file: loaded.file.clone(),
                why: format!("`{rule}` did not finish: {why}"),
            })?
            .map_err(|why| Refused {
                file: loaded.file.clone(),
                why: format!("`{rule}` refused the payload: {why}"),
            })?;
        serde_json::from_str(&said).map_err(|why| Refused {
            file: loaded.file.clone(),
            why: format!("`{rule}` answered with something that is not a judgment: {why}"),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::digest_of;

    /// The empty digest, which is the one value every implementation prints.
    #[test]
    fn a_digest_is_the_one_everybody_else_computes() {
        assert_eq!(
            digest_of(b""),
            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            digest_of(b"abc"),
            "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    /// A block boundary, which is where a hand-written round loop goes wrong.
    #[test]
    fn a_digest_crosses_the_blocks_a_message_is_split_into() {
        let long = "a".repeat(1000);
        assert_eq!(
            digest_of(long.as_bytes()),
            "sha256:41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3"
        );
    }
}
