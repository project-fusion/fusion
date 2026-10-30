//! What a run says: the lines it prints, and the report it leaves behind.
//!
//! **Every run writes a report**, passing or not, into the config's `report`
//! directory: `index.html` to look at, `run.json` for a program to read, and
//! beside them the baseline, the capture and the diff image of every shot that
//! failed. The directory is emptied first, so it never shows a failure from a
//! run that is over. Ignore it in git.
//!
//! **`run.json` is the record a later service would read**, so it carries
//! every shot and not only the failures, and the HTML is drawn from the same
//! rows.
//!
//! **The verdict line says what was compared and what was skipped**, because a
//! count alone reads as the whole corpus.

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::exit::Code;
use serde_json::{json, Value};

use crate::out::say;
use crate::run::Fate;

/// One shot as the report sees it.
pub struct Row<'a> {
    /// What each changed region of a shot that differs happened to.
    pub attribution: &'a [String],
    /// The baseline, or a pair's first side.
    pub baseline: Picture<'a>,
    /// The capture, or a pair's second side, for a shot that failed.
    pub current: Option<&'a [u8]>,
    pub diff: Picture<'a>,
    pub entry: &'a str,
    pub fate: &'a Fate,
    /// The file the row's baseline or accessibility snapshot is kept in, which
    /// `helix visual accept` writes. A pair's row keeps none.
    pub keep: Option<PathBuf>,
    /// What the two pictures are called: `Baseline` and `Capture`, or a
    /// pair's two sides.
    pub labels: [&'a str; 2],
    /// Whether the row is a pair's, whose two sides are compared with each
    /// other and with no baseline.
    pub pair: bool,
    pub shot: &'a str,
    /// The accessibility snapshot taken, for an accessibility row.
    pub snapshot: Option<&'a str>,
    pub source: &'a str,
}

/// A picture on disk, beside its baseline, or one held in memory, which is
/// where a pair's sides and diffs are, having nowhere in the tree to go.
pub enum Picture<'a> {
    Bytes(Option<&'a [u8]>),
    File(Option<PathBuf>),
}

impl Picture<'_> {
    /// Whether there is a picture to write.
    fn present(&self) -> bool {
        match self {
            Self::Bytes(bytes) => bytes.is_some(),
            Self::File(path) => path.as_ref().is_some_and(|path| path.is_file()),
        }
    }

    /// Writes the picture to `to`, when there is one. Returns whether it did.
    fn copy(&self, to: &Path) -> std::io::Result<bool> {
        match self {
            Self::Bytes(Some(bytes)) => fs::write(to, bytes).map(|()| true),
            Self::File(Some(path)) if path.is_file() => fs::copy(path, to).map(|_| true),
            _ => Ok(false),
        }
    }
}

/// Everything the report needs from the run.
pub struct Run<'a> {
    pub base: &'a Path,
    pub dir: PathBuf,
    pub entries: usize,
    /// What the page checks found, each as `id: sentence`.
    pub findings: Vec<String>,
    /// What the run says about a setting that did less than it reads.
    pub notices: Vec<String>,
    /// The requests each entry made that were refused or blocked, by entry.
    pub refused: BTreeMap<String, Vec<String>>,
    pub fingerprint: Option<PathBuf>,
    pub inspected_failed: bool,
    pub retake: &'a str,
    /// The repository the baselines are kept in, which each row's `keep` is
    /// recorded relative to, so the record can be accepted from another
    /// checkout of it.
    pub root: Option<PathBuf>,
    pub rows: Vec<Row<'a>>,
    pub scope: &'a str,
    /// Each unstable shot left out, with its reason.
    pub skipped: Vec<String>,
    /// The changes, grouped by what they happened to, the largest first.
    pub groups: Vec<crate::triage::Group>,
    /// What a triage asked and what it cost, when one ran.
    pub triaged: Option<String>,
    /// Where the run happened: its commit, its ref and its time.
    pub origin: crate::history::Origin,
    /// Every ink and ground pair contrast measured, by entry.
    pub painted: BTreeMap<String, Vec<String>>,
    pub update: bool,
}

/// Whether the groups say more than the list of failures already does: some
/// group holds more than one shot, or a model answered.
fn grouped(run: &Run) -> bool {
    run.groups
        .iter()
        .any(|one| one.members.len() > 1 || one.verdict.is_some())
}

/// A request's host, from its address.
fn host_of(url: &str) -> &str {
    let rest = url.split_once("://").map_or(url, |(_, rest)| rest);
    let host = rest.split(['/', '?', '#']).next().unwrap_or(rest);
    host.rsplit('@').next().unwrap_or(host)
}

/// An entry's refused requests by host, the most asked first: each host, how
/// many requests went to it, and the first of them.
fn by_host(urls: &[String]) -> Vec<(&str, usize, &str)> {
    let mut hosts: Vec<(&str, usize, &str)> = Vec::new();
    for url in urls {
        let host = host_of(url);
        match hosts.iter_mut().find(|one| one.0 == host) {
            Some(one) => one.1 += 1,
            None => hosts.push((host, 1, url)),
        }
    }
    hosts.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
    hosts
}

/// What was refused on one entry, as a sentence.
fn refused_line(entry: &str, urls: &[String]) -> String {
    let hosts: Vec<String> = by_host(urls)
        .iter()
        .map(|(host, count, _)| format!("{host} ({count})"))
        .collect();
    format!(
        "{entry}: {} refused or blocked, so what they draw is missing from its pictures: {}.",
        plural(urls.len(), "request was", "requests were"),
        hosts.join(", ")
    )
}

/// One group, as the terminal prints it.
pub fn printed(group: &crate::triage::Group) -> String {
    let mut out = format!(
        "{}: {}",
        plural(group.members.len(), "shot", "shots"),
        group.signature
    );
    if let (Some(verdict), Some(explanation)) = (&group.verdict, &group.explanation) {
        let _ = write!(out, "\n    {verdict}: {explanation}");
    }
    if !group.elsewhere.is_empty() {
        let _ = write!(
            out,
            "\n    also failing lately on {}",
            group.elsewhere.join(", ")
        );
    }
    out
}

fn plural(count: usize, one: &str, many: &str) -> String {
    format!("{count} {}", if count == 1 { one } else { many })
}

fn relative(base: &Path, path: &Path) -> String {
    path.strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

/// The one-word result `run.json` records, and the sentence a person reads.
fn described(row: &Row, base: &Path) -> (&'static str, String) {
    match row.fate {
        Fate::Broken(why) => ("broken", why.clone()),
        Fate::Differs { measure, marked } => (
            "differs",
            match marked {
                Some(marked) => format!(
                    "{} on both takes. The difference is marked in {}.",
                    measure.describe(),
                    relative(base, marked)
                ),
                None => format!("{} on both takes.", measure.describe()),
            },
        ),
        Fate::Held => ("held", "matches its baseline, which was left alone.".to_string()),
        Fate::Matched => ("matched", "matches its baseline.".to_string()),
        Fate::Missing => ("missing", "no baseline.".to_string()),
        Fate::Resized { from, to } => (
            "resized",
            format!(
                "{}x{} became {}x{}. A size change is a layout change, and no diff image is written because there \
                 is nothing to lay one over.",
                from.0, from.1, to.0, to.1
            ),
        ),
        Fate::Spent => (
            "spent",
            "matches its baseline, so its exception is spent. Remove it from the config.".to_string(),
        ),
        Fate::Steadied => (
            "steadied",
            "differed on the first take and matched on the second. A picture that needs a second take is not \
             holding still: make it settle, or mark it unstable with the reason."
                .to_string(),
        ),
        Fate::Tolerated { measure, reason } => ("tolerated", format!("{}, which its exception allows. {reason}", measure.describe())),
        Fate::Written(why) => ("written", format!("written, because {why}.")),
    }
}

/// Prints the run's verdict, writes its report, and returns its code.
#[allow(clippy::too_many_lines)] // The verdict's every clause, in the order it is printed.
pub fn finish(run: &Run) -> Code {
    let mut failures = Vec::new();
    let mut baseline_failures = 0;
    let mut pair_differences = 0;
    let mut notes = Vec::new();
    let mut written = Vec::new();
    let mut held = 0;
    /* A page that could not be pictured matches nothing and differs from
    nothing, so it is neither a difference nor something a retake answers. */
    let untaken = run
        .rows
        .iter()
        .filter(|row| {
            matches!(row.fate, Fate::Broken(_)) && row.current.is_none() && row.snapshot.is_none()
        })
        .count();
    let mut by_source: BTreeMap<&str, usize> = BTreeMap::new();
    for row in &run.rows {
        *by_source.entry(row.source).or_default() += 1;
        let what = format!("{}, {}", row.entry, row.shot);
        let (_, sentence) = described(row, run.base);
        match row.fate {
            fate if fate.fails() => {
                baseline_failures += usize::from(!row.pair);
                pair_differences += usize::from(row.pair && matches!(fate, Fate::Differs { .. }));
                let mut failure = format!("{what}: {sentence}");
                for line in row.attribution {
                    let _ = write!(failure, "\n    {line}");
                }
                failures.push(failure);
            }
            Fate::Steadied | Fate::Tolerated { .. } => {
                let mut note = format!("{what}: {sentence}");
                for line in row.attribution {
                    let _ = write!(note, "\n    {line}");
                }
                notes.push(note);
            }
            Fate::Held => held += 1,
            Fate::Written(why) => written.push(format!("{what} ({why})")),
            _ => {}
        }
    }

    let skipped = if run.skipped.is_empty() {
        "Skipped none.".to_string()
    } else {
        format!(
            "Skipped {} as unstable: {}.",
            plural(run.skipped.len(), "shot", "shots"),
            run.skipped.join("; ")
        )
    };
    let total = run.rows.len();
    let sources = by_source
        .iter()
        .map(|(name, count)| format!("{name} {count}"))
        .collect::<Vec<_>>()
        .join(", ");
    let counted = format!(
        "{} of {} ({sources})",
        plural(total, "shot", "shots"),
        plural(run.entries, "entry", "entries")
    );
    let scope = run.scope;

    let mut verdict = String::new();
    if run.update {
        let _ = write!(
            verdict,
            "helix: wrote {} of {total} baselines{scope}",
            written.len()
        );
        if !written.is_empty() && written.len() <= 12 {
            let _ = write!(verdict, ": {}", written.join(", "));
        }
        let _ = write!(verdict, ". {held} already match and were left alone.");
        if let Some(fingerprint) = &run.fingerprint {
            let _ = write!(
                verdict,
                " Wrote the environment fingerprint to {}.",
                relative(run.base, fingerprint)
            );
        }
        if !failures.is_empty() {
            let _ = write!(
                verdict,
                " {} could not be taken, listed above.",
                plural(failures.len(), "shot", "shots")
            );
        }
        let _ = write!(verdict, " {skipped}");
    } else if failures.is_empty() {
        let pairs = run.rows.iter().filter(|row| row.pair).count();
        let matched = if pairs == 0 {
            "every one matches its baseline"
        } else if pairs == run.rows.len() {
            "every pair's two sides match"
        } else {
            "every one matches its baseline or its other side"
        };
        let _ = write!(
            verdict,
            "helix: compared {counted}{scope}, and {matched}. {skipped}"
        );
    } else {
        let one = failures.len() == 1;
        let failing = if untaken == failures.len() {
            "could not be taken"
        } else if baseline_failures == failures.len() {
            if one {
                "does not match its baseline"
            } else {
                "do not match their baselines"
            }
        } else if pair_differences == failures.len() {
            if one {
                "differs between its two sides"
            } else {
                "differ between their two sides"
            }
        } else if one {
            "fails"
        } else {
            "fail"
        };
        let _ = write!(
            verdict,
            "helix: {} of {counted}{scope}{} {failing}, listed above. {skipped}",
            failures.len(),
            if scope.is_empty() { "" } else { "," },
        );
    }

    /* A page check needs no baseline, so it is said beside the comparison
    and fails a test, and an update, which is about baselines, reports it
    and is not held up by it. */
    if !run.findings.is_empty() {
        let _ = write!(
            verdict,
            " {} found a problem, {}.",
            plural(run.findings.len(), "page check", "page checks"),
            match (run.update, run.findings.len()) {
                (true, 1) => "listed above, and holds nothing up",
                (true, _) => "listed above, and hold nothing up",
                (false, _) => "listed above",
            }
        );
    }

    for note in &notes {
        say!("helix: {note}");
    }
    for notice in &run.notices {
        say!("helix: {notice}");
    }
    for (entry, urls) in &run.refused {
        say!("helix: {}", refused_line(entry, urls));
    }
    if !run.refused.is_empty() {
        say!("helix: `network: {{ allow: [...] }}` lets those hosts through, and `network: 'open'` lets every host through.");
    }
    if !failures.is_empty() {
        say!("\n  {}\n", failures.join("\n  "));
    }
    if grouped(run) {
        say!(
            "helix: the changes fall into {}, the largest first:\n\n  {}\n",
            plural(run.groups.len(), "group", "groups"),
            run.groups
                .iter()
                .map(printed)
                .collect::<Vec<_>>()
                .join("\n  ")
        );
    }
    if let Some(triaged) = &run.triaged {
        say!("{triaged}");
    }
    if !run.findings.is_empty() {
        say!("\n  {}\n", run.findings.join("\n  "));
    }
    say!("{verdict}");
    if run.update && !written.is_empty() {
        say!("helix: review each written picture before committing it. A baseline records whatever was on screen as correct.");
    }
    /* A pair keeps no baseline, so a retake is no answer to its failure. A
    failed shot with a capture can be accepted from this run's report, with
    no second run. */
    let acceptable = run
        .rows
        .iter()
        .filter(|row| {
            row.fate.fails()
                && run.root.is_some()
                && row.keep.is_some()
                && (row.current.is_some() || row.snapshot.is_some())
        })
        .count();
    if !run.update && acceptable > 0 {
        let from = if run.origin.url.is_empty() {
            relative(run.base, &run.dir)
        } else {
            format!("--run {}", run.origin.url)
        };
        say!(
            "helix: if the change was meant, `helix visual accept {from}` writes {} from this run into the baselines. \
             Review each one before you commit it.",
            plural(acceptable, "capture", "captures")
        );
        say!("helix: or take them again. {}", run.retake);
    } else if !run.update && baseline_failures > untaken {
        say!(
            "helix: if the change was meant, retake the baselines. {}",
            run.retake
        );
    }
    if run.inspected_failed {
        say!("helix: the config's inspect reported a failure, above.");
    }

    let failed =
        !failures.is_empty() || run.inspected_failed || (!run.update && !run.findings.is_empty());
    let record = record(run, &verdict, failed);
    match write(run, &record) {
        Ok(()) => say!(
            "helix: the report is in {}.",
            relative(run.base, &run.dir.join("index.html"))
        ),
        Err(why) => eprintln!(
            "helix: cannot write the report in {}: {why}",
            run.dir.display()
        ),
    }
    if crate::out::json() {
        println!("{record}");
    }
    if failed {
        Code::Failed
    } else {
        Code::Ok
    }
}

/// A run that stopped before it pictured anything: the sentence that says
/// why, and under `--json` the same document a finished run prints, with no
/// shots.
pub fn stopped(update: bool, failed: bool, verdict: &str) -> Code {
    say!("{verdict}");
    if crate::out::json() {
        println!(
            "{}",
            json!({
                "failed": failed,
                "findings": [],
                "mode": if update { "update" } else { "test" },
                "shots": [],
                "skipped": [],
                "verdict": verdict,
                "version": crate::shipped(),
            })
        );
    }
    if failed {
        Code::Failed
    } else {
        Code::Ok
    }
}

/// What `run.json` holds, and what `--json` prints: each shot with its
/// result, and the verdict.
/// Whether a row's pictures go in the report: a shot that failed, one that
/// matched only on its second take, whose first take shows what moved, and one
/// an update wrote, which the run asks a person to review.
fn pictured(row: &Row) -> bool {
    row.fate.fails() || matches!(row.fate, Fate::Steadied | Fate::Written(_))
}

fn record(run: &Run, verdict: &str, failed: bool) -> Value {
    let rows: Vec<Value> = run
        .rows
        .iter()
        .enumerate()
        .map(|(at, row)| {
            let (result, detail) = described(row, run.base);
            let mut record = json!({
                "detail": detail,
                "entry": row.entry,
                "labels": row.labels,
                "result": result,
                "shot": row.shot,
                "source": row.source,
            });
            if !row.attribution.is_empty() {
                record["attribution"] = json!(row.attribution);
            }
            if pictured(row) {
                if row.baseline.present() {
                    record["baseline"] = json!(format!("shots/{at}-baseline.png"));
                }
                if row.current.is_some() {
                    record["current"] = json!(format!("shots/{at}-current.png"));
                }
                if row.diff.present() {
                    record["diff"] = json!(format!("shots/{at}-diff.png"));
                }
                if row.snapshot.is_some() {
                    record["snapshot"] = json!(format!("shots/{at}-current.aria.yml"));
                }
                if let (Some(root), Some(keep)) = (&run.root, &row.keep) {
                    if keep.starts_with(root) {
                        record["keep"] = json!(relative(root, keep));
                    }
                }
            }
            record
        })
        .collect();
    json!({
        "failed": failed,
        "findings": run.findings,
        "groups": run.groups.iter().map(crate::triage::Group::record).collect::<Vec<_>>(),
        "mode": if run.update { "update" } else { "test" },
        "notices": run.notices,
        "painted": run.painted,
        "refused": run.refused.iter().map(|(entry, urls)| {
            let hosts: Vec<Value> = by_host(urls)
                .iter()
                .map(|(host, requests, first)| json!({ "first": first, "host": host, "requests": requests }))
                .collect();
            (entry.clone(), Value::Array(hosts))
        }).collect::<serde_json::Map<_, _>>(),
        "run": run.origin.record(),
        "shots": rows,
        "skipped": run.skipped,
        "triage": run.triaged,
        /* Read where the list follows it. */
        "verdict": verdict.replace(", listed above.", ", listed below."),
        "version": crate::shipped(),
    })
}

/// `run.json`, `index.html`, and the pictures of each failed shot, at the
/// paths the record names.
fn write(run: &Run, record: &Value) -> std::io::Result<()> {
    if run.dir.exists() {
        fs::remove_dir_all(&run.dir)?;
    }
    let pictures = run.dir.join("shots");
    fs::create_dir_all(&pictures)?;
    for (at, row) in run.rows.iter().enumerate() {
        if !pictured(row) {
            continue;
        }
        row.baseline
            .copy(&pictures.join(format!("{at}-baseline.png")))?;
        if let Some(current) = row.current {
            fs::write(pictures.join(format!("{at}-current.png")), current)?;
        }
        if let Some(snapshot) = row.snapshot {
            fs::write(pictures.join(format!("{at}-current.aria.yml")), snapshot)?;
        }
        row.diff.copy(&pictures.join(format!("{at}-diff.png")))?;
    }
    fs::write(
        run.dir.join("run.json"),
        format!(
            "{}\n",
            serde_json::to_string_pretty(record).unwrap_or_default()
        ),
    )?;
    fs::write(run.dir.join("index.html"), html(record))?;
    Ok(())
}

/// What each changed region happened to, as a list, or nothing.
fn changes(shot: &Value) -> String {
    let lines: Vec<String> = shot["attribution"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(|line| format!("<li>{}</li>", escape(line)))
        .collect();
    if lines.is_empty() {
        String::new()
    } else {
        format!("<ul class=\"changes\">{}</ul>", lines.concat())
    }
}

/// A detail sentence, which continues `entry, shot:` in the printed form,
/// as a sentence of its own.
fn sentence(text: &str) -> String {
    let mut letters = text.chars();
    letters.next().map_or_else(String::new, |first| {
        first.to_uppercase().chain(letters).collect()
    })
}

fn escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// The groups of changes, as the items of a list.
fn grouped_html(record: &Value) -> String {
    let empty = Vec::new();
    let mut groups = String::new();
    for one in record["groups"].as_array().unwrap_or(&empty) {
        let members = one["members"].as_array().map_or(0, Vec::len);
        let answer = match (one["verdict"].as_str(), one["explanation"].as_str()) {
            (Some(verdict), Some(explanation)) => {
                format!("<br><em>{}</em>: {}", escape(verdict), escape(explanation))
            }
            _ => String::new(),
        };
        let _ = write!(
            groups,
            "<li><strong>{}</strong>: {}{answer}</li>",
            escape(&plural(members, "shot", "shots")),
            escape(one["signature"].as_str().unwrap_or_default())
        );
    }
    groups
}

/// The shots that passed with something to say, what the run said about its
/// settings, and the requests it refused, as the items of a list.
fn notes_html(record: &Value) -> String {
    let empty = Vec::new();
    let shots = record["shots"].as_array().unwrap_or(&empty);
    let mut notes = String::new();
    for one in shots
        .iter()
        .filter(|one| matches!(one["result"].as_str(), Some("steadied" | "tolerated")))
    {
        let _ = write!(
            notes,
            "<li><strong>{}, {}</strong>: {}</li>",
            escape(one["entry"].as_str().unwrap_or_default()),
            escape(one["shot"].as_str().unwrap_or_default()),
            escape(one["detail"].as_str().unwrap_or_default())
        );
    }
    for one in record["notices"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter_map(Value::as_str)
    {
        let _ = write!(notes, "<li>{}</li>", escape(one));
    }
    if let Some(entries) = record["refused"].as_object() {
        for (entry, hosts) in entries {
            for host in hosts.as_array().unwrap_or(&empty) {
                let _ = write!(
                    notes,
                    "<li><strong>{}</strong>: {} refused or blocked {}, such as {}.</li>",
                    escape(entry),
                    host["requests"],
                    escape(host["host"].as_str().unwrap_or_default()),
                    escape(host["first"].as_str().unwrap_or_default()),
                );
            }
        }
    }
    notes
}

/// The page: the verdict, then each failed shot with its baseline, capture and
/// diff side by side and a swipe between the first two.
fn html(record: &Value) -> String {
    let empty = Vec::new();
    let shots = record["shots"].as_array().unwrap_or(&empty);
    let mut cards = String::new();
    for shot in shots
        .iter()
        .filter(|one| one.get("baseline").is_some() || one.get("current").is_some())
    {
        let title = format!(
            "{}, {}",
            shot["entry"].as_str().unwrap_or_default(),
            shot["shot"].as_str().unwrap_or_default()
        );
        let picture = |key: &str, label: &str| {
            match shot[key].as_str() {
            Some(src) => format!("<figure><figcaption>{label}</figcaption><img loading=\"lazy\" src=\"{}\" alt=\"{label} of {}\"></figure>", escape(src), escape(&title)),
            None => format!("<figure><figcaption>{label}</figcaption><p class=\"none\">None</p></figure>"),
        }
        };
        let names: Vec<&str> = shot["labels"]
            .as_array()
            .map(|all| all.iter().filter_map(Value::as_str).collect())
            .unwrap_or_default();
        let first = names.first().copied().unwrap_or("Baseline");
        let second = names.get(1).copied().unwrap_or("Capture");
        let swipe = match (shot["baseline"].as_str(), shot["current"].as_str()) {
            (Some(baseline), Some(current)) => format!(
                "<div class=\"swipe\"><img src=\"{}\" alt=\"\"><img class=\"over\" src=\"{}\" alt=\"\">\
                 <input type=\"range\" min=\"0\" max=\"100\" value=\"50\" aria-label=\"Swipe between {} and {} of {}\"></div>",
                escape(baseline),
                escape(current),
                escape(first),
                escape(second),
                escape(&title)
            ),
            _ => String::new(),
        };
        /* A written shot is one picture, with nothing to compare it with. */
        let others = if shot["result"].as_str() == Some("written") {
            String::new()
        } else {
            format!(
                "{}{}",
                picture("current", second),
                picture("diff", "Difference")
            )
        };
        let _ = write!(
            cards,
            "<section><h2>{}</h2><p>{}</p>{}<div class=\"three\">{}{others}</div>{swipe}</section>",
            escape(&title),
            escape(&sentence(shot["detail"].as_str().unwrap_or_default())),
            changes(shot),
            picture("baseline", first),
        );
    }
    let notes = notes_html(record);
    let groups = grouped_html(record);
    let mut findings = String::new();
    for one in record["findings"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter_map(Value::as_str)
    {
        let _ = write!(findings, "<li>{}</li>", escape(one));
    }
    let mut skipped = String::new();
    for one in record["skipped"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter_map(Value::as_str)
    {
        let _ = write!(skipped, "<li>{}</li>", escape(one));
    }
    let list = |heading: &str, items: &str| {
        if items.is_empty() {
            String::new()
        } else {
            format!("<h2>{heading}</h2><ul>{items}</ul>")
        }
    };
    format!(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\
<title>Visual test report</title><style>{STYLE}</style><main><h1>Visual test report</h1><p class=\"verdict\">{}</p>{}{}{}{}{}</main><script>{SCRIPT}</script></html>\n",
        escape(record["verdict"].as_str().unwrap_or_default()),
        list("Changes, grouped", &groups),
        cards,
        list("Page checks", &findings),
        list("Notes", &notes),
        list("Skipped", &skipped),
    )
}

const STYLE: &str = ":root{color-scheme:light dark;--ground:#fff;--ink:#1a1a1a;--quiet:#5c5c5c;--line:#d9d9d9;--panel:#f4f4f4}\
@media (prefers-color-scheme:dark){:root{--ground:#121212;--ink:#ececec;--quiet:#a3a3a3;--line:#333;--panel:#1d1d1d}}\
body{margin:0;background:var(--ground);color:var(--ink);font:15px/1.5 system-ui,sans-serif}\
main{max-width:1200px;margin:0 auto;padding:24px 16px}h1{font-size:22px;margin:0 0 8px}h2{font-size:17px;margin:24px 0 4px}\
.verdict{color:var(--quiet)}section{border-top:1px solid var(--line);padding-top:8px}\
.three{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}\
figure{margin:0}figcaption{font-size:13px;color:var(--quiet)}img{max-width:100%;border:1px solid var(--line);background:var(--panel)}\
.none{color:var(--quiet)}.swipe{position:relative;margin-top:12px;max-width:100%}.swipe img{display:block}\
.swipe .over{position:absolute;inset:0;clip-path:inset(0 0 0 50%)}.swipe input{width:100%}";

const SCRIPT: &str = "for(const s of document.querySelectorAll('.swipe')){const o=s.querySelector('.over');\
s.querySelector('input').addEventListener('input',e=>{o.style.clipPath=`inset(0 0 0 ${e.target.value}%)`})}";

/// The summary a CI job prints, from a run's `run.json`: the verdict, then a
/// One group as a line of the Markdown summary.
fn markdown_group(one: &Value) -> String {
    let mut out = String::new();
    let _ = write!(
        out,
        "- **{}**: {}.",
        plural(
            one["members"].as_array().map_or(0, Vec::len),
            "shot",
            "shots"
        ),
        one["signature"]
            .as_str()
            .unwrap_or_default()
            .trim_end_matches('.')
    );
    let elsewhere: Vec<&str> = one["elsewhere"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    if !elsewhere.is_empty() {
        let _ = write!(out, " Also failing lately on {}.", elsewhere.join(", "));
    }
    if let (Some(verdict), Some(explanation)) =
        (one["verdict"].as_str(), one["explanation"].as_str())
    {
        let _ = write!(out, " *{verdict}*: {explanation}");
    }
    out.push('\n');
    out
}

/// table of what did not pass.
pub fn markdown(record: &Value) -> String {
    let mut out = String::from("### Visual tests\n\n");
    let _ = writeln!(out, "{}\n", record["verdict"].as_str().unwrap_or_default());
    let empty = Vec::new();
    let groups = record["groups"].as_array().unwrap_or(&empty);
    if groups
        .iter()
        .any(|one| one["members"].as_array().map_or(0, Vec::len) > 1 || one["verdict"].is_string())
    {
        out.push_str("Changes, grouped:\n\n");
        for one in groups {
            out.push_str(&markdown_group(one));
        }
        out.push('\n');
    }
    let rows: Vec<&Value> = record["shots"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter(|one| !matches!(one["result"].as_str(), Some("matched" | "held")))
        .collect();
    if !rows.is_empty() {
        out.push_str("| Entry | Shot | Result |\n|---|---|---|\n");
        for row in rows {
            let mut detail = sentence(row["detail"].as_str().unwrap_or_default());
            for line in row["attribution"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
            {
                let _ = write!(detail, "<br>{line}");
            }
            let _ = writeln!(
                out,
                "| {} | {} | {} |",
                row["entry"].as_str().unwrap_or_default(),
                row["shot"].as_str().unwrap_or_default(),
                detail.replace('|', "\\|")
            );
        }
    }
    let acceptable = record["shots"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter(|one| {
            one["keep"].is_string() && (one["current"].is_string() || one["snapshot"].is_string())
        })
        .count();
    if let (true, Some(url)) = (
        acceptable > 0,
        record["run"]["url"].as_str().filter(|url| !url.is_empty()),
    ) {
        let _ = writeln!(
            out,
            "\nTo make {} from this run the baselines, run `helix visual accept --run {url}` in a checkout of the branch, review them, and commit them.",
            plural(acceptable, "capture", "captures")
        );
    }
    if let Some(triaged) = record["triage"].as_str() {
        let _ = writeln!(out, "\n{triaged}");
    }
    let lines: Vec<&str> = record["history"]["lines"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    if !lines.is_empty() {
        out.push_str("\nHistory:\n\n");
        for line in lines {
            let _ = writeln!(out, "- {line}");
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_summary_lists_what_did_not_pass() {
        let record = json!({
            "verdict": "helix: 1 of 2 shots of 1 entry (pages 2) does not match its baseline, listed above. Skipped none.",
            "shots": [
                { "entry": "pages/a", "shot": "wide", "result": "matched", "detail": "matches its baseline." },
                { "entry": "pages/a", "shot": "dark", "result": "differs", "detail": "3 pixels differ | on two takes." },
            ],
        });
        let text = markdown(&record);
        assert!(text.contains("does not match its baseline"));
        assert!(text.contains("| pages/a | dark | 3 pixels differ \\| on two takes. |"));
        assert!(!text.contains("| wide |"));
    }

    #[test]
    fn a_shot_steadied_on_its_second_take_keeps_its_first_take() {
        let row = |fate| Row {
            attribution: &[],
            baseline: Picture::File(None),
            current: None,
            diff: Picture::Bytes(None),
            entry: "pages/a",
            fate,
            keep: None,
            labels: ["Baseline", "First take"],
            pair: false,
            shot: "dark",
            snapshot: None,
            source: "pages",
        };
        assert!(pictured(&row(&Fate::Steadied)));
        assert!(pictured(&row(&Fate::Written("it had no baseline"))));
        assert!(!pictured(&row(&Fate::Held)));
    }

    #[test]
    fn the_page_of_an_update_shows_each_picture_it_wrote() {
        let page = html(&json!({
            "verdict": "helix: wrote 1 of 1 baselines",
            "shots": [{
                "baseline": "shots/0-baseline.png",
                "detail": "written, because it had no baseline.",
                "entry": "site/index",
                "labels": ["Written", "Capture"],
                "result": "written",
                "shot": "wide",
            }],
        }));
        assert!(page.contains("<img loading=\"lazy\" src=\"shots/0-baseline.png\""));
        assert!(page.contains("<figcaption>Written</figcaption>"));
        assert!(!page.contains("Difference"));
    }

    #[test]
    fn refused_requests_are_counted_by_host() {
        let urls: Vec<String> = [
            "https://tiles.example.com/1.png",
            "https://b.example.com/a?x=1",
            "https://tiles.example.com/2.png",
        ]
        .map(str::to_string)
        .to_vec();
        assert_eq!(
            by_host(&urls),
            [
                ("tiles.example.com", 2, "https://tiles.example.com/1.png"),
                ("b.example.com", 1, "https://b.example.com/a?x=1"),
            ]
        );
        assert_eq!(
            refused_line("site/index", &urls),
            "site/index: 3 requests were refused or blocked, so what they draw is missing from its pictures: tiles.example.com (2), b.example.com (1)."
        );
    }

    #[test]
    fn the_page_lists_notices_and_refused_requests() {
        let page = html(&json!({
            "verdict": "v",
            "shots": [],
            "notices": ["the mask `a` matches nothing"],
            "refused": { "site/index": [{ "first": "https://a.example/1", "host": "a.example", "requests": 2 }] },
        }));
        assert!(page.contains("the mask `a` matches nothing"));
        assert!(page.contains("2 refused or blocked a.example, such as https://a.example/1."));
    }

    #[test]
    fn the_page_escapes_what_it_shows() {
        let page = html(&json!({ "verdict": "<b>", "shots": [], "skipped": ["a & b"] }));
        assert!(page.contains("&lt;b&gt;"));
        assert!(page.contains("<li>a &amp; b</li>"));
    }
}
