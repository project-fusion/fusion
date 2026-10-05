//! What each Helix family adds to a build, read from the build's source maps.
//!
//! **Bytes, by the file they came from.** A source map says, for every run of
//! a bundle, which source file it came from. The runs from a Helix package's
//! files are that package's bytes, and the runs from a family's folder in it,
//! `dist/button/` or `src/button/`, are that family's. The bytes are the
//! bundle's own, before compression.
//!
//! **A source is traced to its package by where it lives**: under
//! `node_modules/@fusion.dev/`, or, for a package linked into a workspace, in
//! the folder of the nearest `package.json` named `@fusion.dev/helix` or
//! `@fusion.dev/helix-*`.
//!
//! **A bundle with no map cannot be split**, so the run says how many files
//! had one and how many did not.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::{Component, Path, PathBuf};

use fusion_rules::walk::walk;
use serde_json::{json, Value};

/// The base64 alphabet, which both a mapping's digits and a data URL use.
const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn digit(byte: u8) -> Option<u8> {
    ALPHABET
        .iter()
        .position(|one| *one == byte)
        .and_then(|at| u8::try_from(at).ok())
}

/// Decodes standard base64, padding optional.
fn base64(text: &str) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(text.len() * 3 / 4);
    let mut buffer = 0u32;
    let mut bits = 0;
    for byte in text.bytes().filter(|byte| !byte.is_ascii_whitespace()) {
        if byte == b'=' {
            break;
        }
        buffer = (buffer << 6) | u32::from(digit(byte)?);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(u8::try_from((buffer >> bits) & 0xff).ok()?);
        }
    }
    Some(out)
}

/// One base64 VLQ number from a mapping, advancing `at` past it.
fn vlq(bytes: &[u8], at: &mut usize) -> Option<i64> {
    let mut value: i64 = 0;
    let mut shift = 0;
    loop {
        let one = digit(*bytes.get(*at)?)?;
        *at += 1;
        value += i64::from(one & 31) << shift;
        shift += 5;
        if one & 32 == 0 {
            break;
        }
        if shift > 60 {
            return None;
        }
    }
    Some(if value & 1 == 1 {
        -(value >> 1)
    } else {
        value >> 1
    })
}

/// One generated line's segments: the column each starts at, in UTF-16 code
/// units, and the source it came from, if any.
type Line = Vec<(i64, Option<i64>)>;

/// A map's mappings, as each generated line's segments.
fn mappings(text: &str) -> Option<Vec<Line>> {
    let bytes = text.as_bytes();
    let mut lines = vec![Vec::new()];
    let mut source = 0i64;
    let mut at = 0;
    let mut column = 0i64;
    while at < bytes.len() {
        match bytes[at] {
            b';' => {
                lines.push(Vec::new());
                column = 0;
                at += 1;
            }
            b',' => at += 1,
            _ => {
                column += vlq(bytes, &mut at)?;
                let mut fields = 1;
                let mut from = None;
                while at < bytes.len() && bytes[at] != b',' && bytes[at] != b';' {
                    let value = vlq(bytes, &mut at)?;
                    if fields == 1 {
                        source += value;
                        from = Some(source);
                    }
                    fields += 1;
                }
                lines.last_mut()?.push((column, from));
            }
        }
    }
    Some(lines)
}

/// Where a bundle's map is: the data URL or the file its last
/// `sourceMappingURL` comment names, or the `.map` beside it.
fn map_of(bundle: &Path, text: &str) -> Option<Value> {
    let named = text
        .rfind("sourceMappingURL=")
        .map(|at| &text[at + "sourceMappingURL=".len()..])
        .and_then(|rest| rest.split_whitespace().next())
        .map(|url| url.trim_end_matches("*/"));
    let read = |path: PathBuf| {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|json| serde_json::from_str(&json).ok())
    };
    match named {
        Some(url) if url.starts_with("data:") => {
            let (head, data) = url.split_once(',')?;
            let json = if head.ends_with(";base64") {
                String::from_utf8(base64(data)?).ok()?
            } else {
                data.to_owned()
            };
            serde_json::from_str(&json).ok()
        }
        Some(url) => {
            let file = url.split(['?', '#']).next().unwrap_or(url);
            read(bundle.parent()?.join(file))
        }
        None => {
            let mut sibling = bundle.as_os_str().to_owned();
            sibling.push(".map");
            read(PathBuf::from(sibling))
        }
    }
}

/// A path with `.` and `..` resolved by name, as a map's sources write them.
fn tidy(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for part in path.components() {
        match part {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other),
        }
    }
    out
}

/// What each Helix family and package adds to a build.
pub struct Weight<'f> {
    families: &'f HashSet<String>,
    root: PathBuf,
    by_family: BTreeMap<String, u64>,
    by_package: BTreeMap<String, u64>,
    /// The Helix package each folder belongs to, as found.
    packages: HashMap<PathBuf, Option<(String, PathBuf)>>,
    /// Each source's package and family, as found.
    owners: HashMap<String, Option<(String, Option<String>)>>,
    mapped: usize,
    unmapped: usize,
    total: u64,
}

impl<'f> Weight<'f> {
    /// Weighs every bundle under `build`. `families` is every family the lint
    /// data names, and `root` is the project's, which a bundler's
    /// `webpack://` and `turbopack://` sources are relative to.
    pub fn measure(build: &Path, root: &Path, families: &'f HashSet<String>) -> Self {
        let mut weight = Self {
            families,
            root: root.to_owned(),
            by_family: BTreeMap::new(),
            by_package: BTreeMap::new(),
            packages: HashMap::new(),
            owners: HashMap::new(),
            mapped: 0,
            unmapped: 0,
            total: 0,
        };
        let mut bundles = Vec::new();
        walk(
            build,
            &|path| {
                path.extension()
                    .and_then(|extension| extension.to_str())
                    .is_some_and(|extension| matches!(extension, "js" | "mjs" | "cjs" | "css"))
            },
            &mut bundles,
        );
        for bundle in bundles {
            let Ok(text) = std::fs::read_to_string(&bundle) else {
                continue;
            };
            weight.total += text.len() as u64;
            match map_of(&bundle, &text) {
                Some(map) if weight.bundle(&bundle, &text, &map) => weight.mapped += 1,
                _ => weight.unmapped += 1,
            }
        }
        weight
    }

    /// Adds one bundle's Helix bytes, by its map. `false` where the map does
    /// not read.
    fn bundle(&mut self, bundle: &Path, text: &str, map: &Value) -> bool {
        let directory = bundle.parent().unwrap_or(Path::new("")).to_owned();
        /* An indexed map is several maps, each placed at an offset. */
        let sections: Vec<(usize, i64, &Value)> =
            match map.get("sections").and_then(Value::as_array) {
                Some(sections) => sections
                    .iter()
                    .filter_map(|section| {
                        let line = section.pointer("/offset/line")?.as_u64()?;
                        let column = section.pointer("/offset/column")?.as_i64()?;
                        Some((usize::try_from(line).ok()?, column, section.get("map")?))
                    })
                    .collect(),
                None => vec![(0, 0, map)],
            };
        let lines: Vec<&str> = text.split('\n').collect();
        let mut read = false;
        for (first, column, map) in sections {
            let Some(decoded) = map
                .get("mappings")
                .and_then(Value::as_str)
                .and_then(mappings)
            else {
                continue;
            };
            read = true;
            let root = map.get("sourceRoot").and_then(Value::as_str).unwrap_or("");
            let sources: Vec<Option<(String, Option<String>)>> = map
                .get("sources")
                .and_then(Value::as_array)
                .map(|sources| {
                    sources
                        .iter()
                        .map(|source| {
                            source
                                .as_str()
                                .and_then(|source| self.owner(source, root, &directory))
                        })
                        .collect()
                })
                .unwrap_or_default();
            for (offset, segments) in decoded.iter().enumerate() {
                let Some(line) = lines.get(first + offset) else {
                    break;
                };
                let shift = if offset == 0 { column } else { 0 };
                self.line(line, segments, shift, &sources);
            }
        }
        read
    }

    /// Adds one generated line's Helix bytes.
    fn line(
        &mut self,
        line: &str,
        segments: &[(i64, Option<i64>)],
        shift: i64,
        sources: &[Option<(String, Option<String>)>],
    ) {
        /* Where each UTF-16 column starts, in bytes, which is the column
        itself for a line of ASCII. */
        let ascii = line.is_ascii();
        let starts: Vec<usize> = if ascii {
            Vec::new()
        } else {
            line.char_indices()
                .flat_map(|(at, one)| std::iter::repeat_n(at, one.len_utf16()))
                .collect()
        };
        let byte = |column: i64| -> usize {
            let column = usize::try_from(column.max(0)).unwrap_or(0);
            if ascii {
                column.min(line.len())
            } else {
                starts.get(column).copied().unwrap_or(line.len())
            }
        };
        for (at, (column, source)) in segments.iter().enumerate() {
            let Some(Some((package, family))) = source
                .and_then(|source| usize::try_from(source).ok())
                .and_then(|source| sources.get(source))
            else {
                continue;
            };
            let end = segments
                .get(at + 1)
                .map_or(line.len(), |(next, _)| byte(next + shift));
            let bytes = end.saturating_sub(byte(column + shift)) as u64;
            *self.by_package.entry(package.clone()).or_default() += bytes;
            if let Some(family) = family {
                *self.by_family.entry(family.clone()).or_default() += bytes;
            }
        }
    }

    /// The Helix package a source belongs to, and its family, where it has one.
    fn owner(
        &mut self,
        source: &str,
        root: &str,
        directory: &Path,
    ) -> Option<(String, Option<String>)> {
        if let Some(found) = self.owners.get(source) {
            return found.clone();
        }
        let found = self.trace(source, root, directory);
        self.owners.insert(source.to_owned(), found.clone());
        found
    }

    fn trace(
        &mut self,
        source: &str,
        root: &str,
        directory: &Path,
    ) -> Option<(String, Option<String>)> {
        /* **Installed**: the path after the last `node_modules/` names the
        package, whatever the bundler put before it. */
        if let Some(at) = source.rfind("node_modules/@fusion.dev/") {
            let rest = &source[at + "node_modules/".len()..];
            let mut parts = rest.splitn(3, '/');
            let package = format!("{}/{}", parts.next()?, parts.next()?);
            if !(package == "@fusion.dev/helix" || package.starts_with("@fusion.dev/helix-")) {
                return None;
            }
            let family = self.family(Path::new(parts.next().unwrap_or("")));
            return Some((package, family));
        }
        /* **Linked**: found on disk, in the nearest Helix package's folder. */
        let path = if let Some(rest) = source.strip_prefix("file://") {
            PathBuf::from(rest)
        } else if let Some((_, rest)) = source.split_once("://") {
            let rest = rest.trim_start_matches('/');
            let rest = rest.split_once('/').map_or(rest, |(_, after)| after);
            self.root.join(rest)
        } else {
            directory.join(root).join(source)
        };
        let path = tidy(&path);
        let (package, folder) = self.package(path.parent()?)?;
        let family = self.family(path.strip_prefix(&folder).ok()?);
        Some((package, family))
    }

    /// The nearest Helix package around `directory`, and its folder.
    fn package(&mut self, directory: &Path) -> Option<(String, PathBuf)> {
        if let Some(found) = self.packages.get(directory) {
            return found.clone();
        }
        let found = std::fs::read_to_string(directory.join("package.json"))
            .ok()
            .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            .and_then(|manifest| {
                manifest
                    .get("name")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
            });
        let answer = match found {
            Some(name) if name == "@fusion.dev/helix" || name.starts_with("@fusion.dev/helix-") => {
                Some((name, directory.to_owned()))
            }
            /* The nearest package is someone else's. */
            Some(_) => None,
            None => directory.parent().and_then(|parent| self.package(parent)),
        };
        self.packages.insert(directory.to_owned(), answer.clone());
        answer
    }

    /// The family a file inside a package belongs to: the folder after `dist`
    /// or `src`, where the lint data names it a family.
    fn family(&self, inside: &Path) -> Option<String> {
        let mut parts = inside.components().filter_map(|part| match part {
            Component::Normal(name) => name.to_str(),
            _ => None,
        });
        let top = parts.next()?;
        if top != "dist" && top != "src" {
            return None;
        }
        let family = parts.next()?;
        /* A file directly in `dist` is the package's own, and in no family. */
        parts.next()?;
        self.families.contains(family).then(|| family.to_owned())
    }

    /// Bundle files read with a map, and without one.
    pub fn files(&self) -> (usize, usize) {
        (self.mapped, self.unmapped)
    }

    /// The bytes from every Helix package together.
    pub fn helix(&self) -> u64 {
        self.by_package.values().sum()
    }

    /// The weight as the run's `performance.weight`.
    pub fn json(&self) -> Value {
        json!({
            "families": self.by_family,
            "files": { "mapped": self.mapped, "unmapped": self.unmapped },
            "packages": self.by_package,
            "total": self.total,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{base64, mappings, Weight};

    #[test]
    fn mappings_decode_to_columns_and_sources() {
        /* `AAAA` is column 0 of source 0; `KCAA` is five columns on, from
        source 1; `;` starts a line and resets the column, and `EDAA` is two
        columns on, from source 0 again. */
        let decoded = mappings("AAAA,KCAA;EDAA").expect("decodes");
        assert_eq!(
            decoded,
            [vec![(0, Some(0)), (5, Some(1))], vec![(2, Some(0))]]
        );
        assert_eq!(base64("eyJhIjoxfQ==").expect("decodes"), b"{\"a\":1}");
    }

    #[test]
    fn a_bundle_is_split_by_package_and_family() {
        let folder = std::env::temp_dir().join(format!("helix-scan-weight-{}", std::process::id()));
        let build = folder.join("dist");
        std::fs::create_dir_all(&build).expect("a folder");
        /* Ten bytes from the button family, then six from the app. */
        std::fs::write(
            build.join("app.js"),
            "abcdefghijuvwxyz\n//# sourceMappingURL=app.js.map\n",
        )
        .expect("written");
        std::fs::write(
            build.join("app.js.map"),
            serde_json::json!({
                "version": 3,
                "sources": [
                    "webpack://app/./node_modules/@fusion.dev/helix/dist/button/root/button-root.js",
                    "webpack://app/./src/main.js"
                ],
                "mappings": "AAAA,UCAA"
            })
            .to_string(),
        )
        .expect("written");
        let families = HashSet::from(["button".to_owned()]);
        let weight = Weight::measure(&build, &folder, &families);
        let json = weight.json();
        assert_eq!(json["families"], serde_json::json!({ "button": 10 }));
        assert_eq!(
            json["packages"],
            serde_json::json!({ "@fusion.dev/helix": 10 })
        );
        assert_eq!(
            json["files"],
            serde_json::json!({ "mapped": 1, "unmapped": 0 })
        );
        std::fs::remove_dir_all(&folder).expect("removed");
    }
}
