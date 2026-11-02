//! **The compiler names no design system.** Every string in its source that
//! names Helix is refused, outside the defaults and the specs, so a name a
//! design system changes is a key of the `system` of its `helix.json` and no
//! literal the compiler holds.
//!
//! The command's own name is the binary's, `PRODUCT` in `main.rs`, outside
//! the compiler's folder. A comment is no literal and may name Helix.

use std::fs;
use std::path::{Path, PathBuf};

/// The word no literal may hold, in any case.
const NAMED: &str = "helix";

/// The attribute that marks the next item as a spec's.
const MARK: &str = "#[cfg(test)]";

/// Each `.rs` file under `folder`, at any depth.
fn sources(folder: &Path, into: &mut Vec<PathBuf>) {
    let mut entries: Vec<PathBuf> = fs::read_dir(folder)
        .unwrap()
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            sources(&path, into);
        } else if path.extension().is_some_and(|extension| extension == "rs") {
            into.push(path);
        }
    }
}

/// Whether `path`, under the compiler's folder, may name Helix: the defaults,
/// and a spec, a `tests.rs`, a `*_tests.rs`, or a file in a `tests` folder.
fn exempt(path: &Path, root: &Path) -> bool {
    let relative = path.strip_prefix(root).unwrap_or(path);
    let name = relative
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();
    relative == Path::new("project/defaults.rs")
        || name.ends_with("tests.rs")
        || relative
            .components()
            .any(|part| part.as_os_str() == "tests")
}

/// A reading of one source, character by character.
struct Reader {
    chars: Vec<char>,
    at: usize,
    line: usize,
    /// Each string read outside a spec's item, by the line it opens on.
    found: Vec<(usize, String)>,
    /// Whether a `#[cfg(test)]` marks the item ahead, which ends at a `;`
    /// before any `{`, or at the brace that closes its first `{`.
    marked: bool,
    /// How many braces deep the reader is inside a marked item.
    depth: Option<usize>,
}

impl Reader {
    fn new(source: &str) -> Self {
        Self {
            chars: source.chars().collect(),
            at: 0,
            line: 1,
            found: Vec::new(),
            marked: false,
            depth: None,
        }
    }

    fn get(&self, offset: usize) -> Option<char> {
        self.chars.get(self.at + offset).copied()
    }

    /// Moves past one character, counting the lines it passes.
    fn step(&mut self) {
        if self.get(0) == Some('\n') {
            self.line += 1;
        }
        self.at += 1;
    }

    fn starts(&self, text: &str) -> bool {
        text.chars()
            .enumerate()
            .all(|(n, one)| self.get(n) == Some(one))
    }

    /// Keeps a string read from the line `opens`, unless a spec holds it.
    fn keep(&mut self, opens: usize, text: String) {
        if !self.marked && self.depth.is_none() {
            self.found.push((opens, text));
        }
    }

    /// Past a `//` comment, or a `/* */` one, which nests.
    fn comment(&mut self) -> bool {
        if self.starts("//") {
            while self.get(0).is_some_and(|one| one != '\n') {
                self.step();
            }
            return true;
        }
        if !self.starts("/*") {
            return false;
        }
        let mut nested = 0;
        while self.get(0).is_some() {
            if self.starts("/*") {
                nested += 1;
                self.at += 2;
            } else if self.starts("*/") {
                nested -= 1;
                self.at += 2;
                if nested == 0 {
                    break;
                }
            } else {
                self.step();
            }
        }
        true
    }

    /// Past a raw string, `r"…"` or `r#"…"#`, with or without a `b`.
    fn raw(&mut self) -> bool {
        let after_name = self.at > 0
            && self
                .chars
                .get(self.at - 1)
                .is_some_and(|one| one.is_alphanumeric() || *one == '_');
        let skip = match (self.get(0), self.get(1)) {
            (Some('b'), Some('r')) if !after_name => 1,
            (Some('r'), _) if !after_name => 0,
            _ => return false,
        };
        let mut hashes = 0;
        while self.get(skip + 1 + hashes) == Some('#') {
            hashes += 1;
        }
        if self.get(skip + 1 + hashes) != Some('"') {
            return false;
        }
        let opens = self.line;
        self.at += skip + 2 + hashes;
        let close: String = std::iter::once('"')
            .chain((0..hashes).map(|_| '#'))
            .collect();
        let mut text = String::new();
        while self.get(0).is_some() && !self.starts(&close) {
            text.extend(self.get(0));
            self.step();
        }
        self.at += close.chars().count();
        self.keep(opens, text);
        true
    }

    /// Past a character, `'a'` or `'\n'`, or the quote of a lifetime, `'a`.
    fn character(&mut self) -> bool {
        if self.get(0) != Some('\'') {
            return false;
        }
        if self.get(1) == Some('\\') {
            self.at += 2;
            while self.get(0).is_some_and(|one| one != '\'') {
                self.at += 1;
            }
            self.at += 1;
        } else if self.get(2) == Some('\'') {
            self.at += 3;
        } else {
            self.at += 1;
        }
        true
    }

    /// Past a string, `"…"`, with its escapes kept as written.
    fn string(&mut self) -> bool {
        if self.get(0) != Some('"') {
            return false;
        }
        let opens = self.line;
        self.at += 1;
        let mut text = String::new();
        while let Some(one) = self.get(0) {
            if one == '"' {
                break;
            }
            text.push(one);
            if one == '\\' {
                self.step();
                text.extend(self.get(0));
            }
            self.step();
        }
        self.at += 1;
        self.keep(opens, text);
        true
    }

    /// Follows the item a `#[cfg(test)]` marks, by its `;` or its braces.
    fn code(&mut self) {
        match self.get(0) {
            Some(';') if self.marked && self.depth.is_none() => self.marked = false,
            Some('{') => match self.depth {
                Some(open) => self.depth = Some(open + 1),
                None if self.marked => {
                    self.marked = false;
                    self.depth = Some(1);
                }
                None => {}
            },
            Some('}') => {
                if let Some(open) = self.depth {
                    self.depth = (open > 1).then(|| open - 1);
                }
            }
            _ => {}
        }
        self.step();
    }

    fn read(mut self) -> Vec<(usize, String)> {
        while self.get(0).is_some() {
            if self.starts(MARK) {
                self.marked = true;
                self.at += MARK.len();
            } else if !(self.comment() || self.raw() || self.character() || self.string()) {
                self.code();
            }
        }
        self.found
    }
}

/// Each string literal in `source` outside an item marked `#[cfg(test)]`, by
/// the line it opens on.
fn literals(source: &str) -> Vec<(usize, String)> {
    Reader::new(source).read()
}

#[test]
fn no_literal_in_the_compiler_names_helix() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/family");
    let mut files = Vec::new();
    sources(&root, &mut files);
    let mut named = Vec::new();
    for file in files.iter().filter(|file| !exempt(file, &root)) {
        let source = fs::read_to_string(file).unwrap();
        for (line, text) in literals(&source) {
            if text.to_lowercase().contains(NAMED) {
                named.push(format!(
                    "{}:{line}: \"{text}\"",
                    file.strip_prefix(&root).unwrap_or(file).display()
                ));
            }
        }
    }
    assert!(
        named.is_empty(),
        "move each name into the `system` of the design system's `helix.json`, with its default in `project/defaults.rs`:\n{}",
        named.join("\n")
    );
}

#[test]
fn the_reader_finds_strings_and_leaves_comments_and_specs_out() {
    let source = r#"
// "helix" in a comment
/* "helix" /* nested */ in a block */
const A: &str = "helix-a";
const B: &str = r"helix 'b'";
const C: char = '"';
fn lifetime<'a>(x: &'a str) -> &'a str { x }
#[cfg(test)]
mod tests {
    const D: &str = "{ helix-d }";
}
#[cfg(test)]
#[path = "x_tests.rs"]
mod more;
const E: &str = "e\"helix";
"#;
    let found: Vec<String> = literals(source).into_iter().map(|(_, text)| text).collect();
    assert_eq!(found, ["helix-a", "helix 'b'", "e\\\"helix"]);
}
