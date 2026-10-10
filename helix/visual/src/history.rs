//! What earlier runs say about this one: the shots that keep needing a second
//! take, the changes that fail on branches that did not make them, and how
//! each branch's runs have gone.
//!
//! **From the run records alone, with no service.** Every check keeps its
//! `run.json`, which names the commit and the ref it ran on, so a CI job can
//! fetch the records of recent runs from its own artifacts and hand them
//! here. Nothing is stored anywhere a project does not already keep.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use crate::triage::Group;

/// Where a run happened, as its record says.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Origin {
    /// Seconds since the Unix epoch.
    pub at: u64,
    pub commit: String,
    /// The commit the run is about. A pull request's run checks out a merge
    /// of the branch into its base, so `commit` is that merge and this is the
    /// branch's own commit, which `helix visual accept` holds a checkout to.
    pub head: String,
    pub reference: String,
    /// The CI run's page, when a CI service names one.
    pub url: String,
}

impl Origin {
    /// This run's origin: the commit and ref git and CI give, and the time.
    pub fn here(base: &Path) -> Self {
        let git = |args: &[&str]| {
            std::process::Command::new("git")
                .current_dir(base)
                .args(args)
                .output()
                .ok()
                .filter(|output| output.status.success())
                .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
                .unwrap_or_default()
        };
        /* A pull request's run checks out a merge, so the branch it is about
        is the one CI names, and git's branch is the fallback for a run on a
        machine. */
        let reference = ["GITHUB_HEAD_REF", "GITHUB_REF_NAME"]
            .iter()
            .filter_map(|name| std::env::var(name).ok())
            .find(|value| !value.is_empty())
            .unwrap_or_else(|| git(&["rev-parse", "--abbrev-ref", "HEAD"]));
        let commit = git(&["rev-parse", "HEAD"]);
        /* GitHub names the branch's commit only in the event that started the
        run, so it is read from there. */
        let head = std::env::var("GITHUB_EVENT_PATH")
            .ok()
            .and_then(|path| fs::read_to_string(path).ok())
            .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            .and_then(|event| {
                event["pull_request"]["head"]["sha"]
                    .as_str()
                    .map(str::to_string)
            })
            .unwrap_or_else(|| commit.clone());
        let variable = |name: &str| std::env::var(name).unwrap_or_default();
        let url = match (
            variable("GITHUB_SERVER_URL"),
            variable("GITHUB_REPOSITORY"),
            variable("GITHUB_RUN_ID"),
        ) {
            (server, repository, id)
                if !server.is_empty() && !repository.is_empty() && !id.is_empty() =>
            {
                format!("{server}/{repository}/actions/runs/{id}")
            }
            _ => String::new(),
        };
        Self {
            at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_or(0, |since| since.as_secs()),
            commit,
            head,
            reference,
            url,
        }
    }

    pub fn record(&self) -> Value {
        json!({
            "at": self.at,
            "commit": self.commit,
            "head": self.head,
            "ref": self.reference,
            "url": self.url,
        })
    }
}

/// One earlier run, read back from its `run.json`.
#[derive(Clone, Debug, Default)]
pub struct Past {
    pub failed: bool,
    pub groups: Vec<Group>,
    pub origin: Origin,
    /// Each shot as `entry, shot` with its one-word result and what its
    /// attribution says moved.
    pub shots: Vec<(String, String, Vec<String>)>,
}

impl Past {
    pub fn read(value: &Value) -> Self {
        let run = &value["run"];
        Self {
            failed: value["failed"].as_bool().unwrap_or(false),
            groups: value["groups"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Group::read)
                .collect(),
            origin: Origin {
                at: run["at"].as_u64().unwrap_or(0),
                commit: run["commit"].as_str().unwrap_or_default().to_string(),
                head: run["head"].as_str().unwrap_or_default().to_string(),
                reference: run["ref"].as_str().unwrap_or_default().to_string(),
                url: run["url"].as_str().unwrap_or_default().to_string(),
            },
            shots: value["shots"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(|shot| {
                    Some((
                        format!("{}, {}", shot["entry"].as_str()?, shot["shot"].as_str()?),
                        shot["result"].as_str()?.to_string(),
                        shot["attribution"]
                            .as_array()
                            .into_iter()
                            .flatten()
                            .filter_map(Value::as_str)
                            .map(str::to_string)
                            .collect(),
                    ))
                })
                .collect(),
        }
    }
}

/// Every `run.json` at or under each path, read, the oldest first. A path that
/// holds none is left out, and so is a file that is not a record.
pub fn gather(paths: &[PathBuf]) -> Vec<Past> {
    fn walk(path: &Path, found: &mut Vec<PathBuf>) {
        if path.is_file() {
            found.push(path.to_path_buf());
        } else if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let next = entry.path();
                if next.is_dir() {
                    walk(&next, found);
                } else if next.file_name().is_some_and(|name| name == "run.json") {
                    found.push(next);
                }
            }
        }
    }
    let mut files = Vec::new();
    for path in paths {
        walk(path, &mut files);
    }
    let mut runs: Vec<Past> = files
        .iter()
        .filter_map(|file| fs::read_to_string(file).ok())
        .filter_map(|text| serde_json::from_str::<Value>(&text).ok())
        .filter(|value| value["shots"].is_array())
        .map(|value| Past::read(&value))
        .collect();
    runs.sort_by_key(|run| run.origin.at);
    runs
}

/// What the runs say, together.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Summary {
    /// Each branch: how many runs, how many failed, and whether the last one did.
    pub branches: Vec<(String, usize, usize, bool)>,
    /// Shots that needed a second take in more than one run, or that differed
    /// and matched on one commit: each with the runs it did it in, how, and
    /// the element its first takes most often moved at, when one was traced.
    pub flaky: Vec<(String, usize, &'static str, Option<String>)>,
    /// Changes that failed on more than one branch, with the branches.
    pub recurring: Vec<(String, BTreeSet<String>)>,
    pub runs: usize,
}

/// The shots that keep moving, the changes that turn up on branches that did
/// not make them, and each branch's runs.
pub fn summarize(runs: &[Past]) -> Summary {
    let mut steadied: BTreeMap<&str, usize> = BTreeMap::new();
    let mut moved: BTreeMap<&str, BTreeMap<String, usize>> = BTreeMap::new();
    let mut by_commit: BTreeMap<(&str, &str), BTreeSet<&str>> = BTreeMap::new();
    let mut branches: BTreeMap<&str, (usize, usize, bool)> = BTreeMap::new();
    let mut recurring: BTreeMap<&str, BTreeSet<String>> = BTreeMap::new();
    for run in runs {
        let branch = branches.entry(run.origin.reference.as_str()).or_default();
        branch.0 += 1;
        branch.1 += usize::from(run.failed);
        branch.2 = run.failed;
        for (member, result, attribution) in &run.shots {
            if result == "steadied" {
                *steadied.entry(member).or_default() += 1;
                for line in attribution {
                    *moved
                        .entry(member)
                        .or_default()
                        .entry(crate::triage::signature_of(line))
                        .or_default() += 1;
                }
            }
            if !run.origin.commit.is_empty() && matches!(result.as_str(), "matched" | "differs") {
                by_commit
                    .entry((member, run.origin.commit.as_str()))
                    .or_default()
                    .insert(result);
            }
        }
        for group in &run.groups {
            recurring
                .entry(group.signature.as_str())
                .or_default()
                .insert(run.origin.reference.clone());
        }
    }
    /* The element a shot's first takes moved at most often. */
    let most = |member: &str| {
        moved.get(member).and_then(|counts| {
            counts
                .iter()
                .max_by(|a, b| a.1.cmp(b.1).then(b.0.cmp(a.0)))
                .map(|(signature, _)| signature.clone())
        })
    };
    let mut flaky: Vec<(String, usize, &'static str, Option<String>)> = steadied
        .iter()
        .filter(|(_, count)| **count > 1)
        .map(|(member, count)| {
            (
                (*member).to_string(),
                *count,
                "needed a second take",
                most(member),
            )
        })
        .collect();
    let mut seen: BTreeSet<String> = flaky.iter().map(|(member, ..)| member.clone()).collect();
    for ((member, _), results) in &by_commit {
        if results.len() > 1 && seen.insert((*member).to_string()) {
            flaky.push((
                (*member).to_string(),
                1,
                "differed and matched on one commit",
                None,
            ));
        }
    }
    flaky.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    let mut recurring: Vec<(String, BTreeSet<String>)> = recurring
        .into_iter()
        .filter(|(_, refs)| refs.len() > 1)
        .map(|(signature, refs)| (signature.to_string(), refs))
        .collect();
    recurring.sort_by(|a, b| b.1.len().cmp(&a.1.len()).then(a.0.cmp(&b.0)));
    Summary {
        branches: branches
            .into_iter()
            .map(|(name, (count, failed, last))| (name.to_string(), count, failed, last))
            .collect(),
        flaky,
        recurring,
        runs: runs.len(),
    }
}

impl Summary {
    /// The branches besides `own` a change with this signature failed on.
    pub fn elsewhere(&self, signature: &str, own: &str) -> Vec<String> {
        self.recurring
            .iter()
            .find(|(one, _)| one == signature)
            .map(|(_, refs)| refs.iter().filter(|one| *one != own).cloned().collect())
            .unwrap_or_default()
    }

    /// The summary as sentences, for the terminal and for Markdown.
    pub fn lines(&self) -> Vec<String> {
        let mut out = vec![format!(
            "{} earlier {} on {} {}.",
            self.runs,
            if self.runs == 1 { "run" } else { "runs" },
            self.branches.len(),
            if self.branches.len() == 1 {
                "branch"
            } else {
                "branches"
            }
        )];
        if self.flaky.is_empty() {
            out.push("No shot needed a second take in more than one of them.".to_string());
        } else {
            for (member, count, how, at) in &self.flaky {
                let times = if *count == 1 {
                    String::new()
                } else {
                    format!(" in {count} runs")
                };
                let place = at
                    .as_ref()
                    .map(|at| format!(", most often at {}", at.trim_end_matches('.')))
                    .unwrap_or_default();
                out.push(format!("Not holding still: {member} {how}{times}{place}."));
            }
        }
        for (signature, refs) in self.recurring.iter().take(10) {
            out.push(format!(
                "On {} branches, {}: {}.",
                refs.len(),
                refs.iter().cloned().collect::<Vec<_>>().join(", "),
                signature.trim_end_matches('.')
            ));
        }
        out
    }

    pub fn record(&self) -> Value {
        json!({
            "branches": self.branches.iter().map(|(name, runs, failed, last)| json!({ "failed": failed, "lastFailed": last, "ref": name, "runs": runs })).collect::<Vec<_>>(),
            "lines": self.lines(),
            "flaky": self.flaky.iter().map(|(member, count, how, at)| json!({ "at": at, "how": how, "runs": count, "shot": member })).collect::<Vec<_>>(),
            "recurring": self.recurring.iter().map(|(signature, refs)| json!({ "refs": refs, "signature": signature })).collect::<Vec<_>>(),
            "runs": self.runs,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(
        reference: &str,
        commit: &str,
        at: u64,
        shots: &[(&str, &str)],
        groups: &[&str],
    ) -> Past {
        Past {
            failed: shots.iter().any(|(_, result)| *result == "differs"),
            groups: groups
                .iter()
                .map(|signature| Group {
                    signature: (*signature).to_string(),
                    ..Group::default()
                })
                .collect(),
            origin: Origin {
                at,
                commit: commit.to_string(),
                reference: reference.to_string(),
                ..Origin::default()
            },
            shots: shots
                .iter()
                .map(|(member, result)| ((*member).to_string(), (*result).to_string(), Vec::new()))
                .collect(),
        }
    }

    #[test]
    fn a_shot_that_keeps_needing_a_second_take_is_named() {
        let runs = [
            run("main", "a", 1, &[("styled/map, wide", "steadied")], &[]),
            run("feat", "b", 2, &[("styled/map, wide", "steadied")], &[]),
            run("feat", "c", 3, &[("styled/chat, wide", "steadied")], &[]),
        ];
        let summary = summarize(&runs);
        assert_eq!(
            summary.flaky,
            [(
                "styled/map, wide".to_string(),
                2,
                "needed a second take",
                None
            )]
        );
        assert_eq!(summary.runs, 3);
    }

    #[test]
    fn a_flaky_shot_names_the_element_it_moves_at() {
        let line =
            |at: &str| format!("{at}: `helix-map ::part(canvas)`, drawn differently where it was");
        let steadied = |at: &str, when: u64| Past {
            origin: Origin {
                at: when,
                commit: format!("c{when}"),
                reference: "main".to_string(),
                ..Origin::default()
            },
            shots: vec![(
                "site/maps, dark".to_string(),
                "steadied".to_string(),
                vec![line(at)],
            )],
            ..Past::default()
        };
        let summary = summarize(&[
            steadied("1440 by 640 px at 0, 64", 1),
            steadied("1440 by 600 px at 0, 80", 2),
        ]);
        assert_eq!(
            summary.flaky[0].3.as_deref(),
            Some("`helix-map ::part(canvas)`, drawn differently where it was")
        );
        assert!(summary.lines()[1].ends_with(
            "most often at `helix-map ::part(canvas)`, drawn differently where it was."
        ));
    }

    #[test]
    fn a_shot_that_differed_and_matched_on_one_commit_is_named() {
        let runs = [
            run("feat", "a", 1, &[("styled/aura, dark", "differs")], &[]),
            run("feat", "a", 2, &[("styled/aura, dark", "matched")], &[]),
        ];
        assert_eq!(
            summarize(&runs).flaky,
            [(
                "styled/aura, dark".to_string(),
                1,
                "differed and matched on one commit",
                None
            )]
        );
    }

    #[test]
    fn a_change_on_branches_that_did_not_make_it_is_named_with_them() {
        let runs = [
            run("one", "a", 1, &[], &["`helix-tabs`, now 2 px taller"]),
            run("two", "b", 2, &[], &["`helix-tabs`, now 2 px taller"]),
            run("two", "c", 3, &[], &["`helix-card`, moved 1 px down"]),
        ];
        let summary = summarize(&runs);
        assert_eq!(summary.recurring.len(), 1);
        assert_eq!(
            summary.elsewhere("`helix-tabs`, now 2 px taller", "two"),
            ["one"]
        );
        assert_eq!(summary.branches[1], ("two".to_string(), 2, 0, false));
    }
}
