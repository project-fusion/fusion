//! What the installed packages say beyond their lint data: the token set, the
//! import that registers each tag, the events each element dispatches, and
//! which elements are form controls.
//!
//! **Read from `api.json` and `tokens.json`, and absent where they are.** A
//! project on a release from before the packages shipped their catalog still
//! scans, and the checks that need it say nothing rather than guess.

use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::api::Library;

/// A native element an installed family stands in for.
pub struct Replacement {
    /// The native tag, such as `input`.
    pub native: String,
    /// The `type` it has, for an `input`: `checkbox`. `None` is any `input`
    /// without one.
    pub kind: Option<String>,
    /// The Helix tag that stands in for it, such as `helix-checkbox`.
    pub helix: String,
    /// The entry that registers that tag.
    pub specifier: String,
}

/// What the checks beyond the lint data read.
#[derive(Default)]
pub struct Installed {
    /// Every event name any element dispatches.
    pub dispatched: HashSet<String>,
    /// The events that stop at the element that sends them, so a listener on
    /// an ancestor never hears one: `helix-before-open` among them.
    pub still: HashSet<String>,
    /// Each tag's events, as `(name, reactProp)`.
    pub events: HashMap<String, Vec<(String, String)>>,
    /// The tags that are form controls, which `:disabled` matches.
    pub forms: HashSet<String>,
    /// Each tag's import specifier, such as `@fusion.dev/helix/option`.
    pub specifiers: HashMap<String, String>,
    /// Every semantic token name, or `None` where the token set is not installed.
    pub tokens: Option<HashSet<String>>,
    /// The native elements the installed families stand in for, the styled
    /// tier's tag first where both tiers publish one.
    pub replaces: Vec<Replacement>,
}

impl Installed {
    /// What the packages installed from `root` up publish.
    pub fn read(root: &Path) -> Self {
        let mut installed = Self {
            tokens: crate::api::token_names(root),
            ..Self::default()
        };
        let Ok(library) = Library::load(root) else {
            return installed;
        };
        for package in &library.packages {
            for family in &package.families {
                installed.replace(family);
                for element in family["elements"].as_array().into_iter().flatten() {
                    let tag = element["tagName"].as_str().unwrap_or_default().to_owned();
                    if let Some(specifier) = element["specifier"].as_str() {
                        installed
                            .specifiers
                            .insert(tag.clone(), specifier.to_owned());
                    }
                    for event in element["events"].as_array().into_iter().flatten() {
                        if event["bubbles"] == false {
                            if let Some(name) = event["name"].as_str() {
                                installed.still.insert(name.to_owned());
                            }
                        }
                    }
                    let events: Vec<(String, String)> = element["events"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .map(|event| {
                            (
                                event["name"].as_str().unwrap_or_default().to_owned(),
                                event["reactProp"].as_str().unwrap_or_default().to_owned(),
                            )
                        })
                        .collect();
                    installed
                        .dispatched
                        .extend(events.iter().map(|(name, _)| name.clone()));
                    installed.events.insert(tag.clone(), events);
                    /* `formAssociated` is static, and the catalog lists
                    instance properties, so a form control is told by the
                    `form` every one of them carries. */
                    let form = element["properties"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .any(|property| property["name"] == "form");
                    if form {
                        installed.forms.insert(tag);
                    }
                }
            }
        }
        installed
    }

    /// The family's `replaces`, each pointing at its root tag, where no tier
    /// read before named the same native element: the styled tier's.
    fn replace(&mut self, family: &serde_json::Value) {
        let slug = family["slug"].as_str().unwrap_or_default();
        let Some(root) = family["elements"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|element| {
                element["tagName"].as_str().is_some_and(|tag| {
                    tag == format!("helix-{slug}") || tag == format!("helix-headless-{slug}")
                })
            })
        else {
            return;
        };
        let helix = root["tagName"].as_str().unwrap_or_default().to_owned();
        let specifier = root["specifier"].as_str().unwrap_or_default().to_owned();
        for selector in family["replaces"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|one| one.as_str())
        {
            let (native, kind) = match selector.split_once("[type=") {
                Some((tag, rest)) => (tag.to_owned(), Some(rest.trim_end_matches(']').to_owned())),
                None => (selector.to_owned(), None),
            };
            let taken = self
                .replaces
                .iter()
                .any(|one| one.native == native && one.kind == kind);
            /* The styled tier's tag wins over the headless one's. */
            if taken && helix.starts_with("helix-headless-") {
                continue;
            }
            self.replaces
                .retain(|one| !(one.native == native && one.kind == kind));
            self.replaces.push(Replacement {
                native,
                kind,
                helix: helix.clone(),
                specifier: specifier.clone(),
            });
        }
    }

    /// The family that stands in for a native element, by its tag and, for
    /// an `input`, its `type`: none written is `text`, and a `type` the page
    /// binds at run time is not judged.
    pub fn replacement(&self, tag: &str, kind: Option<&str>) -> Option<&Replacement> {
        self.replaces.iter().find(|one| {
            one.native == tag
                && match (&one.kind, kind) {
                    (None, None) => true,
                    (Some(wanted), Some(written)) => wanted == written,
                    _ => false,
                }
        })
    }

    /// Whether `tag` is registered by something the project imports: its own
    /// entry, an entry beneath it, or its package's barrel.
    pub fn imported(&self, tag: &str, imports: &HashSet<String>) -> Option<bool> {
        let specifier = self.specifiers.get(tag)?;
        /* The package is the specifier's scope and name, whichever package
        publishes the tag: `@fusion.dev/helix-sandbox` for its editor. */
        let package = specifier
            .splitn(3, '/')
            .take(2)
            .collect::<Vec<_>>()
            .join("/");
        Some(imports.contains(specifier) || imports.contains(&package))
    }
}

/// A Helix import in a module or a page: a quoted specifier, or a CDN URL
/// holding one, in any Helix package. The path after the package, if any, is
/// the entry, with a `dist/` and an `index.js` a CDN path carries taken off.
static IMPORT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"['"`](?:[^'"`\s]*/)?(@fusion\.dev/helix(?:-[a-z0-9]+)*)(?:@[^/'"`\s]+)?((?:/[A-Za-z0-9._-]+)*)/?['"`]"#)
        .expect("a literal pattern")
});

/// The Helix specifiers `text` imports, normalized: `@fusion.dev/helix` for
/// the barrel and `@fusion.dev/helix/select` for an entry.
pub fn imports(text: &str) -> impl Iterator<Item = String> + '_ {
    IMPORT.captures_iter(text).map(|found| {
        let package = found.get(1).map_or("", |one| one.as_str());
        let path = found.get(2).map_or("", |one| one.as_str());
        let path = path.strip_prefix("/dist").unwrap_or(path);
        let path = path
            .strip_suffix("/index.js")
            .or_else(|| path.strip_suffix(".js"))
            .unwrap_or(path);
        format!("{package}{path}")
    })
}

/// A listener added for a `helix-` event by name.
static LISTENED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"addEventListener\(\s*['"`](helix-[a-z0-9-]+)['"`]"#).expect("a literal pattern")
});

/// Each `helix-` event `text` listens for by name, with its line.
pub fn listened(text: &str) -> impl Iterator<Item = (usize, String)> + '_ {
    LISTENED.captures_iter(text).filter_map(move |found| {
        let name = found.get(1)?;
        let line = text[..name.start()].lines().count().max(1);
        Some((line, name.as_str().to_owned()))
    })
}

#[cfg(test)]
mod tests {
    use super::{imports, listened};

    #[test]
    fn listeners_name_their_helix_events_and_lines() {
        let text = "el.addEventListener('helix-change', f)\nwindow.addEventListener(\"resize\", g)\nb.addEventListener( `helix-before-open` , h)\n";
        assert_eq!(
            listened(text).collect::<Vec<_>>(),
            [
                (1, "helix-change".to_owned()),
                (3, "helix-before-open".to_owned())
            ]
        );
    }

    #[test]
    fn imports_read_specifiers_entries_and_cdn_paths() {
        let text = r#"
            import '@fusion.dev/helix/select'
            import { HelixOption } from "@fusion.dev/helix/option"
            import '@fusion.dev/helix-styles/helix.css'
            import('@fusion.dev/helix-headless')
            import '@fusion.dev/helix-sandbox/editor'
            <script type="module" src="https://cdn.jsdelivr.net/npm/@fusion.dev/helix@0.184.0/dist/tabs/index.js"></script>
        "#;
        let found: Vec<String> = imports(text).collect();
        assert_eq!(
            found,
            [
                "@fusion.dev/helix/select",
                "@fusion.dev/helix/option",
                "@fusion.dev/helix-styles/helix.css",
                "@fusion.dev/helix-headless",
                "@fusion.dev/helix-sandbox/editor",
                "@fusion.dev/helix/tabs",
            ]
        );
    }
}
