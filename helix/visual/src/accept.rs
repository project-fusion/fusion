//! `helix visual accept`: the captures a test run left in its report, written
//! into the baselines they failed against.
//!
//! **No second run.** A failed shot's capture is in the run's report already,
//! taken in the environment the baselines are compared in. Taking it again
//! costs a run, and the new picture can differ from the one a reviewer looked
//! at. So the capture in the report is the one that becomes the baseline.
//!
//! **Only from the commit that was pictured.** A capture shows the code it was
//! taken from. Accepted into a checkout of other code, it becomes a baseline
//! for a page nobody pictured, so a run of another commit is refused unless
//! `--any-commit` says the difference is known.
//!
//! **Only into baselines.** Each record names the files it would write, and a
//! record can come from an artifact that any branch can upload. A path is
//! written only when it stays inside the repository and names a picture or an
//! accessibility snapshot.
//!
//! **The environment fingerprint is left alone.** A run whose environment
//! differs from the fingerprint compares nothing and leaves no capture, so
//! every capture accepted here was taken in the environment the fingerprint
//! names.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::{json, Value};

use crate::out::say;

/// The report directory read when none is named: the config's default.
const REPORT: &str = ".helix/visual";

/// The artifacts `--run` downloads: the reports and run records the GitHub
/// Action uploads, and any other artifact named the same way.
const ARTIFACTS: &str = "visual-*";

/// What `helix visual accept` was asked.
pub struct Options<'a> {
    pub any_commit: bool,
    pub reports: &'a [PathBuf],
    pub run: Option<&'a str>,
}

/// One failed shot in a record.
struct Shot {
    detail: String,
    entry: String,
    /// The capture or snapshot in the report, when the record has one.
    file: Option<PathBuf>,
    /// Where it is kept in the repository, as the record names it.
    keep: Option<String>,
    /// The shot's name, such as `wide`.
    name: String,
}

/// A record, and the commit it pictured.
struct Record {
    head: String,
    path: PathBuf,
    shots: Vec<Shot>,
}

/// The top of the git repository `dir` is in, when it is in one.
pub(crate) fn root(dir: &Path) -> Option<PathBuf> {
    let output = Command::new("git")
        .current_dir(dir)
        .args(["rev-parse", "--show-toplevel"])
        .output()
        .ok()
        .filter(|output| output.status.success())?;
    let top = String::from_utf8_lossy(&output.stdout).trim().to_string();
    fs::canonicalize(top).ok()
}

/// The commit checked out at `root`.
fn checked_out(root: &Path) -> String {
    Command::new("git")
        .current_dir(root)
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .unwrap_or_default()
}

/// Whether a record's `keep` may be written: a relative path that stays
/// inside the repository and names a picture or an accessibility snapshot.
/// The record writes `/` on every platform, so the path is read as written:
/// `Path` would drop a `.` it holds.
#[allow(clippy::case_sensitive_file_extension_comparisons)] // The Action commits `*.png`, which git matches by case.
pub(crate) fn writable(keep: &str) -> bool {
    !keep.contains('\\')
        && !keep.contains(':')
        && keep
            .split('/')
            .all(|part| !part.is_empty() && part != "." && part != "..")
        && (keep.ends_with(".png") || keep.ends_with(".aria.yml"))
        && !keep.ends_with(".diff.png")
}

/// A GitHub Actions run, given by its ID or its page: the ID, and the
/// repository when the page names one.
pub(crate) fn run_of(given: &str) -> Option<(String, Option<String>)> {
    if !given.is_empty() && given.chars().all(|c| c.is_ascii_digit()) {
        return Some((given.to_string(), None));
    }
    let (page, rest) = given.split_once("/actions/runs/")?;
    let id: String = rest.chars().take_while(char::is_ascii_digit).collect();
    let repository = page
        .trim_start_matches("https://")
        .trim_start_matches("http://");
    let parts = repository
        .split('/')
        .filter(|part| !part.is_empty())
        .count();
    (!id.is_empty() && parts == 3).then(|| (id, Some(repository.to_string())))
}

/// Downloads the run's report artifacts into `into` with `gh`.
fn download(given: &str, into: &Path) -> Outcome<()> {
    let (id, repository) = run_of(given).ok_or_else(|| {
        Failure::new(
            Code::Usage,
            format!("`{given}`"),
            "a run is its ID or the address of its page, such as https://github.com/owner/repo/actions/runs/123",
        )
    })?;
    let mut command = Command::new("gh");
    command.args(["run", "download", &id, "--pattern", ARTIFACTS, "--dir"]);
    command.arg(into);
    if let Some(repository) = &repository {
        command.args(["--repo", repository]);
    }
    say!("helix: downloading the reports of run {id}.");
    let output = command.output().map_err(|error| {
        Failure::input("cannot run gh", error.to_string().to_lowercase()).hint(
            "install the GitHub CLI, or download the run's report artifacts and name their folders",
        )
    })?;
    if !output.status.success() {
        return Err(Failure::input(
            format!("cannot download the reports of run {id}"),
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }
    Ok(())
}

/// Every `run.json` at or under `path`, outside `node_modules` and `.git`.
fn walk(path: &Path, found: &mut Vec<PathBuf>) {
    if path.is_file() {
        found.push(path.to_path_buf());
        return;
    }
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    let mut entries: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    entries.sort();
    for next in entries {
        let name = next.file_name().unwrap_or_default();
        if next.is_dir() {
            if name != "node_modules" && name != ".git" {
                walk(&next, found);
            }
        } else if name == "run.json" {
            found.push(next);
        }
    }
}

/// A record's failed shots, or nothing when it is no test run's record or
/// names pictures it does not carry, as a run record kept without its report
/// does.
fn read(path: &Path) -> Outcome<Option<Record>> {
    let text = fs::read_to_string(path).map_err(|error| {
        Failure::input(
            format!("cannot read {}", path.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    let value: Value = serde_json::from_str(&text).map_err(|error| {
        Failure::input(format!("cannot read {}", path.display()), error.to_string())
    })?;
    if value["mode"].as_str() != Some("test") || !value["shots"].is_array() {
        return Ok(None);
    }
    let folder = path.parent().unwrap_or(Path::new("."));
    let mut named = 0;
    let mut carried = 0;
    let mut shots = Vec::new();
    for shot in value["shots"].as_array().into_iter().flatten() {
        let text = |field: &str| shot[field].as_str().unwrap_or_default().to_string();
        if !matches!(
            shot["result"].as_str(),
            Some("broken" | "differs" | "missing" | "resized" | "spent")
        ) {
            continue;
        }
        let file = ["current", "snapshot"]
            .iter()
            .find_map(|field| shot[*field].as_str())
            .map(|at| folder.join(at));
        named += usize::from(file.is_some());
        let file = file.filter(|file| file.is_file());
        carried += usize::from(file.is_some());
        shots.push(Shot {
            detail: text("detail"),
            entry: text("entry"),
            file,
            keep: shot["keep"].as_str().map(str::to_string),
            name: text("shot"),
        });
    }
    if named > 0 && carried == 0 {
        return Ok(None);
    }
    let run = &value["run"];
    let head = run["head"]
        .as_str()
        .filter(|head| !head.is_empty())
        .or_else(|| run["commit"].as_str())
        .unwrap_or_default()
        .to_string();
    Ok(Some(Record {
        head,
        path: path.to_path_buf(),
        shots,
    }))
}

/// `helix visual accept`: writes each failed shot's capture into its
/// baseline, and says what it wrote and what it could not.
pub fn accept(options: &Options) -> Outcome<Code> {
    let here = std::env::current_dir()
        .map_err(|error| Failure::input("cannot read the working directory", error.to_string()))?;
    let root = root(&here).ok_or_else(|| {
        Failure::input(
            "not in a git repository",
            "baselines are kept in git, and a record names each one by its path in the repository",
        )
    })?;

    let downloaded = options
        .run
        .map(|_| std::env::temp_dir().join(format!("helix-visual-accept-{}", std::process::id())));
    let result = (|| {
        let mut reports: Vec<PathBuf> = options.reports.to_vec();
        if let (Some(given), Some(into)) = (options.run, &downloaded) {
            download(given, into)?;
            reports.push(into.clone());
        }
        if reports.is_empty() {
            reports.push(here.join(REPORT));
        }
        let mut files = Vec::new();
        for report in &reports {
            walk(report, &mut files);
        }
        let mut records = Vec::new();
        for file in &files {
            if let Some(record) = read(file)? {
                records.push(record);
            }
        }
        if records.is_empty() {
            return Err(Failure::input(
                "no report",
                format!(
                    "no test run's report is in {}",
                    reports
                        .iter()
                        .map(|path| path.display().to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                ),
            )
            .hint("helix visual test"));
        }
        write(&root, &records, options.any_commit, records.len())
    })();
    if let Some(into) = &downloaded {
        let _ = fs::remove_dir_all(into);
    }
    result
}

/// Refuses a record of a commit other than the one checked out, when it
/// carries a capture to accept.
fn same_commit(root: &Path, records: &[Record]) -> Outcome<()> {
    let current = checked_out(root);
    for record in records.iter().filter(|record| {
        record
            .shots
            .iter()
            .any(|shot| shot.file.is_some() && shot.keep.is_some())
    }) {
        if record.head.is_empty() || record.head != current {
            return Err(Failure::input(
                format!("{}", record.path.display()),
                format!(
                    "the run pictured commit {}, and {} is checked out, so its captures show other code",
                    if record.head.is_empty() { "unknown" } else { &record.head },
                    if current.is_empty() { "no commit" } else { &current },
                ),
            )
            .hint("check out the commit the run pictured, or pass --any-commit"));
        }
    }
    Ok(())
}

/// Checks every record, then writes what they carry.
fn write(root: &Path, records: &[Record], any_commit: bool, read: usize) -> Outcome<Code> {
    if !any_commit {
        same_commit(root, records)?;
    }
    let mut chosen: BTreeMap<&str, (Vec<u8>, &Shot)> = BTreeMap::new();
    let mut left: Vec<&Shot> = Vec::new();
    for record in records {
        for shot in &record.shots {
            let (Some(file), Some(keep)) = (&shot.file, &shot.keep) else {
                left.push(shot);
                continue;
            };
            if !writable(keep) {
                return Err(Failure::input(
                    format!("{}", record.path.display()),
                    format!("it names `{keep}`, which is not a baseline inside the repository"),
                ));
            }
            let bytes = fs::read(file).map_err(|error| {
                Failure::input(
                    format!("cannot read {}", file.display()),
                    error.to_string().to_lowercase(),
                )
            })?;
            if let Some((earlier, _)) = chosen.get(keep.as_str()) {
                if *earlier != bytes {
                    return Err(Failure::input(
                        format!("`{keep}`"),
                        "two reports carry different captures of it",
                    )
                    .hint("name the report of one run"));
                }
                continue;
            }
            chosen.insert(keep, (bytes, shot));
        }
    }
    let mut accepted = Vec::new();
    for (keep, (bytes, shot)) in &chosen {
        let path = root.join(keep);
        if fs::read(&path).ok().as_deref() != Some(bytes.as_slice()) {
            crate::run::write(&path, bytes)?;
        }
        /* The image of the difference the capture was failed for. */
        if let Some(stem) = keep.strip_suffix(".png") {
            let _ = fs::remove_file(root.join(format!("{stem}.diff.png")));
        }
        accepted.push((*keep, *shot));
    }
    Ok(answer(&accepted, &left, read))
}

/// Says what was accepted and what was left, and returns the code.
fn answer(accepted: &[(&str, &Shot)], left: &[&Shot], read: usize) -> Code {
    if crate::out::json() {
        println!(
            "{}",
            json!({
                "accepted": accepted.iter().map(|(keep, shot)| json!({ "entry": shot.entry, "keep": keep, "shot": shot.name })).collect::<Vec<_>>(),
                "left": left.iter().map(|shot| json!({ "detail": shot.detail, "entry": shot.entry, "shot": shot.name })).collect::<Vec<_>>(),
                "reports": read,
            })
        );
    }
    for shot in left {
        say!(
            "helix: {}, {} has no capture to accept: {}",
            shot.entry,
            shot.name,
            shot.detail
        );
    }
    let reports = if read == 1 {
        "1 report".to_string()
    } else {
        format!("{read} reports")
    };
    if accepted.is_empty() {
        say!(
            "helix: {reports} {} no capture to accept.",
            if read == 1 { "holds" } else { "hold" }
        );
        return if left.is_empty() {
            Code::Ok
        } else {
            Code::Failed
        };
    }
    let mut verdict = format!(
        "helix: accepted {} from {reports} into the baselines",
        if accepted.len() == 1 {
            "1 capture".to_string()
        } else {
            format!("{} captures", accepted.len())
        }
    );
    if accepted.len() <= 12 {
        verdict.push_str(": ");
        verdict.push_str(
            &accepted
                .iter()
                .map(|(keep, _)| *keep)
                .collect::<Vec<_>>()
                .join(", "),
        );
    }
    verdict.push('.');
    say!("{verdict}");
    say!("helix: review each picture before you commit it. A baseline records whatever was on screen as correct.");
    Code::Ok
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_baseline_inside_the_repository_is_writable() {
        assert!(writable("helix/styled/src/badge/.examples/preview.png"));
        assert!(writable("fusion/site/baselines/home.aria.yml"));
        assert!(!writable("../outside.png"));
        assert!(!writable("/etc/picture.png"));
        assert!(!writable("helix/./badge.png"));
        assert!(!writable(".github/workflows/verify.yml"));
        assert!(!writable("helix/badge/preview.diff.png"));
        assert!(!writable("C:/badge.png"));
        assert!(!writable(""));
    }

    #[test]
    fn a_run_is_read_from_its_id_or_its_page() {
        assert_eq!(run_of("123"), Some(("123".to_string(), None)));
        assert_eq!(
            run_of("https://github.com/owner/repo/actions/runs/456/job/7"),
            Some(("456".to_string(), Some("github.com/owner/repo".to_string())))
        );
        assert_eq!(run_of("https://github.com/owner/repo/pull/8"), None);
        assert_eq!(run_of("latest"), None);
    }
}
