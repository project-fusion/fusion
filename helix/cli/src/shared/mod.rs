//! `helix shared`: what only the web has, in the code an app shares between
//! the web and a phone.
//!
//! **A page written once runs on both.** In an Expo app, each Helix tag is the
//! web element in a browser and the native component on a phone. A module
//! named for one platform, `.web.tsx` or `.native.tsx`, is that platform's,
//! and every other module is shared. In a shared module this reports:
//!
//! - the browser's globals, such as `document`, `window`, and `HTMLElement`;
//! - a DOM element in JSX, such as `div` or `span`;
//! - CSS: `className`, a `style` the phone does not take, a custom property
//!   that is not a hook of the element it is set on, and a stylesheet import;
//! - a family drawn on the web alone, and a prop or an event of a family a
//!   phone draws that only the web element has.
//!
//! The development build of `@fusion.dev/helix-native` warns about the same
//! props as the page runs.

mod check;
mod platforms;
#[cfg(test)]
mod tests;

use std::path::{Path, PathBuf};

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use oxc_span::SourceType;
use serde_json::json;

use crate::args::Shared;
use crate::scan::files::{self, Kind};
use check::Finding;
use platforms::Platforms;

/// Checks each shared module under the paths given, or under the directory it
/// runs in.
pub fn run(args: &Shared, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    let platforms = Platforms::installed(from);
    if platforms.tags.is_empty() {
        return Err(Failure::input(
            "No Helix packages",
            format!(
                "no package in node_modules/@fusion.dev, from {} up, has an api.json, so no family could be judged",
                from.display()
            ),
        )
        .hint("install @fusion.dev/helix, or run in the app that installs it"));
    }
    let given = if args.paths.is_empty() {
        vec![PathBuf::from(".")]
    } else {
        args.paths.clone()
    };
    let mut found: Vec<(String, Finding)> = Vec::new();
    let mut unread = Vec::new();
    for path in modules(&given, from) {
        let relative = path
            .strip_prefix(from)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let kind = SourceType::from_path(&path).unwrap_or_else(|_| SourceType::tsx());
        let read = std::fs::read_to_string(&path)
            .ok()
            .and_then(|text| check::check(&text, kind, &platforms));
        match read {
            Some(findings) => found.extend(findings.into_iter().map(|one| (relative.clone(), one))),
            None => unread.push(relative),
        }
    }
    if json {
        let findings: Vec<_> = found
            .iter()
            .map(|(file, one)| {
                json!({ "column": one.column, "file": file, "kind": one.kind, "line": one.line, "message": one.message })
            })
            .collect();
        fusion_rules::say!("{}", json!({ "findings": findings, "unread": unread }));
    } else {
        for (file, one) in &found {
            let at = format!("{file}:{}:{}", one.line, one.column);
            fusion_rules::say!(
                "{}  {}  {}",
                paint.bold(&at),
                paint.fail(one.kind),
                one.message
            );
        }
        for file in &unread {
            fusion_rules::say!(
                "{}",
                paint.dim(&format!("{file} does not parse, and was not read."))
            );
        }
        if found.is_empty() {
            fusion_rules::say!(
                "{}",
                paint.pass("The shared code uses nothing only the web has.")
            );
        }
    }
    Ok(if found.is_empty() {
        Code::Ok
    } else {
        Code::Failed
    })
}

/// The shared modules a list of files and folders holds, each once.
fn modules(given: &[PathBuf], from: &Path) -> Vec<PathBuf> {
    let mut found = Vec::new();
    for path in given {
        let path = from.join(path);
        if path.is_dir() {
            found.extend(files::list(&path, None));
        } else {
            found.push(path);
        }
    }
    found.retain(|path| {
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");
        matches!(files::kind(path), Some(Kind::Module { .. })) && check::shared(name)
    });
    found.sort();
    found.dedup();
    found
}
