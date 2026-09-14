//! Walking a tree for the files a rule reads.
//!
//! **Two walkers, because two kinds of rule.** A rule about what a package
//! publishes has to see `dist`; a rule about what somebody wrote has to not see
//! it, or it reports the compiled copy of every finding twice and takes a
//! minute doing it. [`walk`] reads everything on purpose and [`crawl`] skips
//! what a build wrote.
//!
//! Both sort what they find, because `read_dir` is filesystem order and a
//! report that changes between runs on an unchanged tree is a report nobody
//! trusts.

use std::fs;
use std::path::{Path, PathBuf};

/// Directories holding what a build wrote or what a package manager fetched.
///
/// **Named, rather than "anything starting with a dot".** The shorter rule is
/// tempting and wrong here: `.examples/` is source, one per component family,
/// and skipping it took the corpus from 168 stylesheets to 79 selectors while
/// reporting a clean run. That is the fault the `modules` rule is itself about,
/// in the walker that feeds it.
pub const GENERATED: [&str; 9] = [
    ".git",
    ".local",
    ".next",
    ".next-dev",
    ".turbo",
    "dist",
    "node_modules",
    "public",
    "target",
];

/// Every file under `directory` matching `keep`, depth first and sorted.
pub fn walk(directory: &Path, keep: &dyn Fn(&Path) -> bool, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        if path.is_dir() {
            walk(&path, keep, found);
        } else if keep(&path) {
            found.push(path);
        }
    }
}

/// Every file under `directory` matching `keep`, skipping what a build wrote.
pub fn crawl(directory: &Path, keep: &dyn Fn(&Path) -> bool, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let mut paths: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    paths.sort();
    for path in paths {
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if path.is_dir() {
            /* **A directory holding a `.git` is another checkout, not part of
            this one.** A worktree under `.claude/worktrees` is a whole second
            copy of the repository, and walking into it reports findings against
            files nobody here is editing and names the wrong file as the owner of
            a class: measured, it claimed a stylesheet in a sibling branch
            declared a name the one in this tree declares. */
            if !GENERATED.contains(&name.as_str()) && !path.join(".git").exists() {
                crawl(&path, keep, found);
            }
        } else if keep(&path) {
            found.push(path);
        }
    }
}
