//! Finding the entries: every file a source's glob matches, named.
//!
//! **The glob names its entries.** `{name}/.examples/preview.html` matches one
//! directory per entry, and that directory's name is the entry's name, so the
//! report says `headless/accordion` and the filter takes `accordion`. A glob
//! with no `{name}` names each entry by its path under the root, without the
//! extension.
//!
//! **Segments, and three kinds of them.** A literal matches itself, `*` inside
//! a segment matches any run of characters, and `**` alone matches any number
//! of directories. A wildcard never matches a name starting with a dot unless
//! the pattern's segment starts with one too, so `*` does not reach into
//! `.git`, and `**` never descends into `node_modules`.
//!
//! **Sorted, so a run is the same list on every machine.** The shards are a
//! function of the list, and a list in the order the filesystem happened to
//! return would put an entry in different shards on two runners.

use std::fs;
use std::path::{Path, PathBuf};

/// One page to picture.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Entry {
    /// The directory the baselines are written into: beside an HTML file,
    /// which relative requests from it resolve against, or a source's
    /// `baselines`.
    pub dir: PathBuf,
    /// The HTML file, for an entry the harness serves.
    pub file: Option<PathBuf>,
    /// What the entry is packed into shards and timed by: its name, or the
    /// group a pair's `prepare` gave it, such as a component family.
    pub group: String,
    /// `source/name`, unique across the run.
    pub id: String,
    /// What the glob named it: one name may have an entry in several sources.
    pub name: String,
    /// The index of its source in the config.
    pub source: usize,
    /// What the baselines' file names start with: an HTML file's name
    /// without its extension, or the entry's name.
    pub stem: String,
    /// The two sides of a pair, as its source's `prepare` described them.
    pub sides: Option<Box<[serde_json::Value; 2]>>,
    /// The selector a route waits for, in place of `settle.selector`.
    pub selector: Option<String>,
    /// The status a route answers on purpose.
    pub status: Option<u16>,
    /// The page's address, for an entry on a server.
    pub url: Option<String>,
}

/// Every file under `root` that `glob` matches, with the name `{name}` took or
/// its path. Sorted by path.
///
/// # Errors
///
/// The root cannot be read, or the glob is malformed.
pub fn matches(root: &Path, glob: &str) -> Result<Vec<(String, PathBuf)>, String> {
    let segments: Vec<&str> = glob.split('/').filter(|one| !one.is_empty()).collect();
    if segments.is_empty() {
        return Err("the glob is empty".to_string());
    }
    if segments.iter().filter(|one| one.contains("{name}")).count() > 1 {
        return Err(format!("`{glob}` names the entry twice"));
    }
    if let Some(bad) = segments
        .iter()
        .find(|one| one.contains("{name}") && **one != "{name}")
    {
        return Err(format!(
            "`{{name}}` is a whole segment, and `{bad}` is more than that"
        ));
    }
    if segments.last() == Some(&"**") {
        return Err(format!(
            "`{glob}` ends in `**`, which matches directories and no file"
        ));
    }
    if !root.is_dir() {
        return Err(format!("{} is not a directory", root.display()));
    }
    let mut found = Vec::new();
    walk(root, &segments, None, &mut found)?;
    found.sort_by(|a, b| a.1.cmp(&b.1));
    Ok(found
        .into_iter()
        .map(|(name, path)| {
            let named = name.unwrap_or_else(|| {
                let relative = path.strip_prefix(root).unwrap_or(&path).with_extension("");
                relative.to_string_lossy().replace('\\', "/")
            });
            (named, path)
        })
        .collect())
}

fn walk(
    at: &Path,
    segments: &[&str],
    name: Option<&str>,
    found: &mut Vec<(Option<String>, PathBuf)>,
) -> Result<(), String> {
    let Some((&first, rest)) = segments.split_first() else {
        return Ok(());
    };
    if first == "**" {
        /* Zero directories, then one more and the same pattern again. */
        walk(at, rest, name, found)?;
        for (child, is_dir) in listed(at)? {
            if is_dir && !hidden(&child) && child != "node_modules" {
                walk(&at.join(&child), segments, name, found)?;
            }
        }
        return Ok(());
    }
    let last = rest.is_empty();
    for (child, is_dir) in listed(at)? {
        if is_dir == last {
            continue;
        }
        let named = if first == "{name}" {
            if hidden(&child) {
                continue;
            }
            Some(child.clone())
        } else if wildcard(first, &child) {
            name.map(str::to_string)
        } else {
            continue;
        };
        let path = at.join(&child);
        if last {
            found.push((named, path));
        } else {
            walk(&path, rest, named.as_deref(), found)?;
        }
    }
    Ok(())
}

/// The names in a directory, each with whether it is one.
fn listed(at: &Path) -> Result<Vec<(String, bool)>, String> {
    let mut out = Vec::new();
    let read =
        fs::read_dir(at).map_err(|error| format!("cannot read {}: {error}", at.display()))?;
    for entry in read.flatten() {
        let is_dir = entry.path().is_dir();
        out.push((entry.file_name().to_string_lossy().into_owned(), is_dir));
    }
    Ok(out)
}

fn hidden(name: &str) -> bool {
    name.starts_with('.')
}

/// Whether `name` matches one pattern segment, where `*` is any run.
fn wildcard(pattern: &str, name: &str) -> bool {
    if hidden(name) && !pattern.starts_with('.') {
        return false;
    }
    let parts: Vec<&str> = pattern.split('*').collect();
    if parts.len() == 1 {
        return pattern == name;
    }
    let (first, last) = (parts[0], parts[parts.len() - 1]);
    if !name.starts_with(first) || name.len() < first.len() + last.len() || !name.ends_with(last) {
        return false;
    }
    let mut rest = &name[first.len()..name.len() - last.len()];
    for middle in &parts[1..parts.len() - 1] {
        match rest.find(middle) {
            Some(at) => rest = &rest[at + middle.len()..],
            None => return false,
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tree(files: &[&str]) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "helix-visual-discover-{}-{}",
            std::process::id(),
            files.join("+").replace('/', "_")
        ));
        let _ = fs::remove_dir_all(&root);
        for file in files {
            let path = root.join(file);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, "").unwrap();
        }
        root
    }

    fn names(found: &[(String, PathBuf)]) -> Vec<&str> {
        found.iter().map(|(name, _)| name.as_str()).collect()
    }

    #[test]
    fn a_name_segment_names_each_entry() {
        let root = tree(&[
            "button/.examples/preview.html",
            "accordion/.examples/preview.html",
            "card/.examples/other.html",
            "shared/notes.md",
        ]);
        let found = matches(&root, "{name}/.examples/preview.html").unwrap();
        assert_eq!(names(&found), ["accordion", "button"]);
    }

    #[test]
    fn without_one_an_entry_is_its_path() {
        let root = tree(&[
            "pages/home.html",
            "pages/docs/install.html",
            "pages/.draft.html",
        ]);
        let found = matches(&root, "pages/**/*.html").unwrap();
        assert_eq!(names(&found), ["pages/docs/install", "pages/home"]);
    }

    #[test]
    fn wildcards_match_within_a_segment() {
        assert!(wildcard("*.html", "a.html"));
        assert!(wildcard("pre*view*.html", "preview.html"));
        assert!(!wildcard("*.html", "a.css"));
        assert!(!wildcard("*", ".git"));
        assert!(wildcard(".*", ".examples"));
    }

    #[test]
    fn a_malformed_glob_is_refused() {
        let root = tree(&["a.html"]);
        assert!(matches(&root, "{name}/{name}.html").is_err());
        assert!(matches(&root, "x{name}/a.html").is_err());
        assert!(matches(&root, "**").is_err());
        assert!(matches(&root.join("missing"), "*.html").is_err());
    }
}
