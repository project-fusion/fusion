//! The changes a failed run found, grouped by what they happened to, and,
//! when the config asks, explained by a model.
//!
//! **Grouping needs no model.** Each region of a change is told by its
//! attribution: the element under it, the file that defines it, and how it
//! moved. A region's signature is those words with its place, each element's
//! place among its namesakes, and each `#id` left out, and a shot joins the
//! group of every region it has, so a token change that moved one kind of
//! element across 300 pictures is one group with 300 members.
//!
//! **A model only explains and orders.** One request a group, the largest
//! first and as many as the config's cap, with the attribution, the
//! accessibility difference, the diff of the attributed files since the
//! run's `--changed` ref, and the names of every file changed since it. Pictures leave the machine only when the config
//! says `images: true`. The answer is intended, unintended or unclear, and it
//! never approves a baseline: it is the order a person reviews in.

use std::collections::BTreeSet;
use std::fmt::Write as _;
use std::path::Path;
use std::process::Command;

use base64::Engine as _;

use crate::image::{self, Image};

/// The most characters of diff one request carries.
const DIFF: usize = 20_000;

/// The widest a picture sent to a model is, in pixels.
const WIDEST: u32 = 512;

/// What a changed shot is, as far as grouping is concerned.
pub enum Change<'a> {
    /// The pictures differ, told by these attribution lines, none when the
    /// baseline carries no boxes.
    Differs(&'a [String]),
    /// The page changed size.
    Resized { from: (u32, u32), to: (u32, u32) },
    /// The accessibility snapshot differs, as this sentence says.
    Aria(&'a str),
}

/// Shots that changed the same way.
#[derive(Clone, Debug, Default)]
pub struct Group {
    /// Other branches whose recent runs failed with this change, from the
    /// history a merge was given.
    pub elsewhere: Vec<String>,
    /// The model's explanation, when one was asked for and answered.
    pub explanation: Option<String>,
    /// The files the attribution names, for the diff.
    pub files: BTreeSet<String>,
    /// The attribution lines of the first member, which carry the regions.
    pub lines: Vec<String>,
    /// Each member, as `entry, shot`.
    pub members: Vec<String>,
    /// The words every member shares.
    pub signature: String,
    /// `intended`, `unintended` or `unclear`, when a model answered.
    pub verdict: Option<String>,
}

impl Group {
    /// The group as `run.json` keeps it, with what a merge of shards needs to
    /// ask about it again.
    pub fn record(&self) -> serde_json::Value {
        serde_json::json!({
            "elsewhere": self.elsewhere,
            "explanation": self.explanation,
            "files": self.files,
            "lines": self.lines,
            "members": self.members,
            "signature": self.signature,
            "verdict": self.verdict,
        })
    }

    /// A group read back from `run.json`.
    pub fn read(value: &serde_json::Value) -> Option<Self> {
        let strings = |field: &str| -> Vec<String> {
            value[field]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(serde_json::Value::as_str)
                .map(str::to_string)
                .collect()
        };
        Some(Self {
            elsewhere: Vec::new(),
            explanation: None,
            files: strings("files").into_iter().collect(),
            lines: strings("lines"),
            members: strings("members"),
            signature: value["signature"].as_str()?.to_string(),
            verdict: None,
        })
    }
}

/// The groups of several runs as one: groups that share a signature are one
/// group with every member, the largest first. A shard's own verdicts are
/// left behind, because a merge asks again about the whole group.
pub fn merge(runs: impl IntoIterator<Item = Group>) -> Vec<Group> {
    let mut merged: Vec<Group> = Vec::new();
    for group in runs {
        match merged
            .iter_mut()
            .find(|one| one.signature == group.signature)
        {
            Some(one) => {
                for member in group.members {
                    if !one.members.contains(&member) {
                        one.members.push(member);
                    }
                }
                one.files.extend(group.files);
            }
            None => merged.push(group),
        }
    }
    merged.sort_by(|a, b| {
        b.members
            .len()
            .cmp(&a.members.len())
            .then(a.signature.cmp(&b.signature))
    });
    merged
}

/// An attribution line without its region's place: the words after
/// `W by H px at X, Y: `.
fn told(line: &str) -> &str {
    line.split_once(": ").map_or(line, |(_, rest)| rest)
}

/// Words without each element's `#id`, which names one element on one page:
/// across pages, a change happened to a kind of element, its tag and part.
fn kind(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find('#') {
        out.push_str(&rest[..at]);
        let after = &rest[at + 1..];
        let name = after
            .find(|one: char| one.is_whitespace() || matches!(one, '`' | ':' | '[' | '.'))
            .unwrap_or(after.len());
        rest = &after[name..];
    }
    out.push_str(rest);
    out
}

/// Words with each key cut to its last custom element and what is inside it:
/// a button is a button whether a dialog or a sandbox holds it.
fn innermost(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut parts = text.split('`');
    if let Some(first) = parts.next() {
        out.push_str(first);
    }
    for (at, part) in parts.enumerate() {
        out.push('`');
        if at % 2 == 1 {
            out.push_str(part);
            continue;
        }
        let segments: Vec<&str> = part.split(' ').collect();
        let custom = |segment: &&str| {
            let tag = segment
                .split(['#', '[', '.', ':'])
                .next()
                .unwrap_or_default();
            tag.contains('-') && tag.starts_with(|one: char| one.is_ascii_lowercase())
        };
        let from = segments.iter().rposition(custom).unwrap_or(0);
        out.push_str(&segments[from..].join(" "));
    }
    out
}

/// Words without each element's place among its namesakes, the ` (2)` a key
/// carries.
fn plain(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find(" (") {
        let after = &rest[at + 2..];
        let digits = after.chars().take_while(char::is_ascii_digit).count();
        if digits > 0 && after[digits..].starts_with(')') {
            out.push_str(&rest[..at]);
            rest = &after[digits + 1..];
        } else {
            out.push_str(&rest[..at + 2]);
            rest = after;
        }
    }
    out.push_str(rest);
    out
}

/// The files an attribution line names: the parenthesis after a key.
fn files_of(line: &str) -> Option<String> {
    let at = line.find("` (")? + 3;
    let end = line[at..].find(')')? + at;
    Some(line[at..end].to_string())
}

/// The signatures of one change, one a region: a shot whose button and badge
/// both changed is in the button's group and in the badge's.
fn signatures(entry: &str, change: &Change) -> Vec<(String, Vec<String>)> {
    match change {
        Change::Differs(lines) if !lines.is_empty() => {
            let mut found: Vec<(String, Vec<String>)> = Vec::new();
            for line in *lines {
                let signature = innermost(&kind(&plain(told(line))));
                match found.iter_mut().find(|(one, _)| *one == signature) {
                    Some((_, kept)) => kept.push(line.clone()),
                    None => found.push((signature, vec![line.clone()])),
                }
            }
            found
        }
        Change::Differs(_) => vec![(
            format!("{entry}: the picture differs, and its baseline carries no boxes to say where"),
            Vec::new(),
        )],
        Change::Resized { from, to } => {
            let wider = i64::from(to.0) - i64::from(from.0);
            let taller = i64::from(to.1) - i64::from(from.1);
            vec![(
                format!("the page is {wider:+} px wider and {taller:+} px taller"),
                Vec::new(),
            )]
        }
        Change::Aria(sentence) => vec![(
            format!("the accessibility snapshot: {sentence}"),
            Vec::new(),
        )],
    }
}

/// The changes, grouped by the signature of each region, the largest group
/// first. A shot is a member of every group one of its regions is in.
pub fn group(changes: &[(String, String, Change)]) -> Vec<Group> {
    let mut groups: Vec<Group> = Vec::new();
    for (entry, shot, change) in changes {
        let member = format!("{entry}, {shot}");
        for (signature, lines) in signatures(entry, change) {
            let at = if let Some(at) = groups.iter().position(|one| one.signature == signature) {
                at
            } else {
                groups.push(Group {
                    files: lines.iter().filter_map(|line| files_of(line)).collect(),
                    lines,
                    signature,
                    ..Group::default()
                });
                groups.len() - 1
            };
            if !groups[at].members.contains(&member) {
                groups[at].members.push(member.clone());
            }
        }
    }
    groups.sort_by(|a, b| {
        b.members
            .len()
            .cmp(&a.members.len())
            .then(a.signature.cmp(&b.signature))
    });
    groups
}

/// The diff of `files` since `reference`, read with git in `base`, cut at
/// [`DIFF`] characters with a sentence saying so. Nothing when there are no
/// files or git cannot answer.
pub fn diff(base: &Path, reference: &str, files: &BTreeSet<String>) -> Option<String> {
    if files.is_empty() {
        return None;
    }
    let output = Command::new("git")
        .current_dir(base)
        .args(["diff", "--no-color", reference, "--"])
        .args(files)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout).into_owned();
    if text.chars().count() <= DIFF {
        return Some(text);
    }
    let cut: String = text.chars().take(DIFF).collect();
    Some(format!(
        "{cut}\n[The diff is cut here, at {DIFF} characters of {}.]",
        text.chars().count()
    ))
}

/// Every file changed since `reference`, read with git in `base`, so a model
/// sees a shared file that moved, a token sheet, though no attributed element
/// is defined in it. A request names the first [`NAMES`].
pub fn changed(base: &Path, reference: &str) -> Option<Vec<String>> {
    let output = Command::new("git")
        .current_dir(base)
        .args(["diff", "--name-only", reference])
        .output()
        .ok()?;
    output.status.success().then(|| {
        String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|name| !kept(name))
            .map(str::to_string)
            .collect()
    })
}

/// Whether a file is one a run keeps, a picture, a snapshot or a
/// fingerprint: a failing run has not retaken them yet, and naming them
/// would read to a model as the author expecting the change.
fn kept(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    [".png", ".aria.yml", "fingerprint.json"]
        .iter()
        .any(|end| lower.ends_with(end))
}

/// The most changed files a request names.
const NAMES: usize = 200;

/// The region an attribution line names: `W by H px at X, Y`.
fn region(line: &str) -> Option<(u32, u32, u32, u32)> {
    let (size, place) = line.split_once(": ")?.0.split_once(" px at ")?;
    let (width, height) = size.split_once(" by ")?;
    let (x, y) = place.split_once(", ")?;
    Some((
        x.parse().ok()?,
        y.parse().ok()?,
        width.parse().ok()?,
        height.parse().ok()?,
    ))
}

/// One region of a picture, with room around it, no wider than [`WIDEST`],
/// as a base64 PNG.
fn crop(picture: &Image, (x, y, width, height): (u32, u32, u32, u32)) -> Option<String> {
    const ROOM: u32 = 24;
    let left = x.saturating_sub(ROOM);
    let top = y.saturating_sub(ROOM);
    let right = (x + width + ROOM).min(picture.width);
    let bottom = (y + height + ROOM).min(picture.height);
    if right <= left || bottom <= top {
        return None;
    }
    let (across, down) = (right - left, bottom - top);
    let step = across.div_ceil(WIDEST).max(1);
    let (wide, high) = (across.div_ceil(step), down.div_ceil(step));
    let mut rgba = Vec::with_capacity((wide * high * 4) as usize);
    for row in 0..high {
        for column in 0..wide {
            let source = (((top + row * step) * picture.width + left + column * step) * 4) as usize;
            rgba.extend_from_slice(&picture.rgba[source..source + 4]);
        }
    }
    let png = image::encode(&Image {
        height: high,
        rgba,
        width: wide,
    })
    .ok()?;
    Some(base64::engine::general_purpose::STANDARD.encode(png))
}

/// The baseline and the capture of a group's largest region, for a model
/// that is allowed to see pictures.
pub fn pictures(group: &Group, baseline: &[u8], capture: &[u8]) -> Vec<String> {
    let Some(place) = group.lines.first().and_then(|line| region(line)) else {
        return Vec::new();
    };
    [baseline, capture]
        .iter()
        .filter_map(|bytes| image::decode(bytes).ok())
        .filter_map(|picture| crop(&picture, place))
        .collect()
}

/// What a model is told it is doing.
pub const SYSTEM: &str = "You review the visual changes an automated test run found in a web project, one group at a time. \
Every picture in a group changed the same way. Decide whether the group's change is intended: the pull request's diff \
changes the code that draws the changed element, and the change is what that code now says. It is unintended when \
nothing in the diff explains it, and unclear when the evidence does not settle it. Say in one or two sentences what \
changed and why, naming the part of the diff that explains it when one does. You never approve a change: a person \
reviews every one, in the order your answers give.";

/// The words of one group's request.
pub fn request(
    group: &Group,
    diff: Option<&str>,
    reference: Option<&str>,
    changed: &[String],
    images: bool,
) -> String {
    let mut text = String::new();
    let _ = writeln!(text, "{} changed this way:", group.members.len());
    for member in group.members.iter().take(10) {
        let _ = writeln!(text, "- {member}");
    }
    if group.members.len() > 10 {
        let _ = writeln!(text, "- and {} more", group.members.len() - 10);
    }
    let _ = writeln!(text, "\nThe change: {}", group.signature);
    if !group.lines.is_empty() {
        let _ = writeln!(text, "\nWhere the first picture changed, region by region:");
        for line in &group.lines {
            let _ = writeln!(text, "- {line}");
        }
    }
    let _ = match (diff, reference) {
        (Some(diff), Some(reference)) if !diff.trim().is_empty() => writeln!(
            text,
            "\nThe pull request's diff since {reference} of the files those elements come from:\n```diff\n{diff}\n```"
        ),
        (_, Some(reference)) if !group.files.is_empty() => writeln!(
            text,
            "\nThe pull request changes none of the files those elements come from since {reference}."
        ),
        (_, Some(_)) => writeln!(
            text,
            "\nNo source file is named for these elements, so there is no diff of their own to show."
        ),
        (_, None) => writeln!(text, "\nNo diff was given: the run was not told what to compare the code with."),
    };
    if !changed.is_empty() {
        let _ = writeln!(text, "\nEvery file the pull request changes:");
        for name in changed.iter().take(NAMES) {
            let _ = writeln!(text, "- {name}");
        }
        if changed.len() > NAMES {
            let _ = writeln!(text, "- and {} more", changed.len() - NAMES);
        }
    }
    if images {
        let _ = writeln!(text, "\nThe two pictures are the baseline and then the capture, cropped to the largest region.");
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_change_is_grouped_by_what_it_happened_to_and_not_where() {
        let a = vec![
            "10 by 10 px at 5, 5: `helix-card helix-badge (2)` (src/badge.ts), moved 2 px down"
                .to_string(),
        ];
        let b = vec![
            "12 by 10 px at 80, 40: `helix-card helix-badge` (src/badge.ts), moved 2 px down"
                .to_string(),
        ];
        let c =
            vec!["10 by 10 px at 5, 5: `helix-tabs` (src/tabs.ts), now 4 px taller".to_string()];
        let groups = group(&[
            (
                "styled/card".to_string(),
                "wide".to_string(),
                Change::Differs(&a),
            ),
            (
                "styled/tabs".to_string(),
                "wide".to_string(),
                Change::Differs(&c),
            ),
            (
                "styled/list".to_string(),
                "dark".to_string(),
                Change::Differs(&b),
            ),
        ]);
        assert_eq!(groups.len(), 2);
        assert_eq!(
            groups[0].members,
            ["styled/card, wide", "styled/list, dark"]
        );
        assert_eq!(
            groups[0].signature,
            "`helix-badge` (src/badge.ts), moved 2 px down"
        );
        assert_eq!(
            groups[0].files,
            BTreeSet::from(["src/badge.ts".to_string()])
        );
    }

    #[test]
    fn a_shot_with_two_changed_regions_is_in_both_groups() {
        let both = vec![
            "40 by 20 px at 0, 0: `helix-button::part(control)` (src/button.ts), drawn differently where it was".to_string(),
            "20 by 10 px at 60, 0: `helix-badge` (src/badge.ts), drawn differently where it was".to_string(),
        ];
        let one = vec!["40 by 20 px at 9, 9: `helix-button::part(control)` (src/button.ts), drawn differently where it was".to_string()];
        let groups = group(&[
            (
                "styled/card".to_string(),
                "wide".to_string(),
                Change::Differs(&both),
            ),
            (
                "styled/form".to_string(),
                "wide".to_string(),
                Change::Differs(&one),
            ),
        ]);
        assert_eq!(groups.len(), 2);
        assert_eq!(
            groups[0].members,
            ["styled/card, wide", "styled/form, wide"]
        );
        assert_eq!(groups[1].members, ["styled/card, wide"]);
    }

    #[test]
    fn a_button_is_a_button_whatever_holds_it() {
        assert_eq!(
            innermost("`helix-sandbox ::part(body) ::part(panes) helix-button` (src/button.ts)"),
            "`helix-button` (src/button.ts)"
        );
        assert_eq!(
            innermost("`helix-timeline helix-timeline-item ::part(rail)`, moved 2 px down"),
            "`helix-timeline-item ::part(rail)`, moved 2 px down"
        );
        assert_eq!(innermost("`main h2`"), "`main h2`");
    }

    #[test]
    fn shards_that_saw_one_change_merge_into_one_group() {
        let one = |members: &[&str]| Group {
            members: members.iter().map(|member| (*member).to_string()).collect(),
            signature: "`helix-button`, drawn differently where it was".to_string(),
            ..Group::default()
        };
        let other = Group {
            members: vec!["styled/meter, wide".to_string()],
            signature: "`helix-meter`, drawn differently where it was".to_string(),
            ..Group::default()
        };
        let merged = merge([
            one(&["styled/button, wide"]),
            other,
            one(&["styled/dialog, wide", "styled/button, wide"]),
        ]);
        assert_eq!(merged.len(), 2);
        assert_eq!(
            merged[0].members,
            ["styled/button, wide", "styled/dialog, wide"]
        );
        let back = Group::read(&merged[1].record()).unwrap();
        assert_eq!(back.signature, merged[1].signature);
    }

    #[test]
    fn an_id_names_one_element_and_not_the_kind_that_changed() {
        assert_eq!(
            kind("`my-card#plan span[data-testid=\"price\"]` moved 4 px down"),
            "`my-card span[data-testid=\"price\"]` moved 4 px down"
        );
    }

    #[test]
    fn pages_that_grew_alike_are_one_group() {
        let groups = group(&[
            (
                "site/home".to_string(),
                "wide".to_string(),
                Change::Resized {
                    from: (1440, 900),
                    to: (1440, 940),
                },
            ),
            (
                "site/maps".to_string(),
                "wide".to_string(),
                Change::Resized {
                    from: (1440, 700),
                    to: (1440, 740),
                },
            ),
        ]);
        assert_eq!(groups.len(), 1);
        assert_eq!(
            groups[0].signature,
            "the page is +0 px wider and +40 px taller"
        );
    }

    #[test]
    fn a_region_is_read_back_off_its_line() {
        assert_eq!(
            region("352 by 64 px at 16, 96: `my-card`, now 4 px taller"),
            Some((16, 96, 352, 64))
        );
        assert_eq!(region("no region"), None);
    }

    #[test]
    fn a_request_says_when_no_diff_was_given() {
        let one = Group {
            members: vec!["styled/card, wide".to_string()],
            signature: "`helix-card`, moved 2 px down".to_string(),
            ..Group::default()
        };
        assert!(request(&one, None, None, &[], false).contains("No diff was given"));
    }
}
