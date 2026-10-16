//! `helix visual test` and `helix visual update`: discover, picture, compare, report.
//!
//! **A missing baseline fails.** A check that seeds its own baseline passes
//! forever and compares nothing, so only `update` writes one.
//!
//! **An update writes only the shots the comparison rejects.** A PNG whose
//! bytes differ is not a picture that differs: re-encoding the same page wrote
//! 23 files for review in Fusion when 2 had moved. Holding the rest keeps a
//! retake reviewable and keeps each baseline the picture a reviewer approved,
//! so drift below the threshold cannot accumulate a run at a time.
//!
//! **A difference is taken again once, from a fresh page load.** A picture that
//! matches on the second take passes and is named, because a check that fails
//! on a flaky picture teaches people to run it again, and one that hides it
//! teaches nothing. An update holds a picture that matched on the second take.

use std::collections::{BTreeMap, BTreeSet};
use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use base64::Engine as _;
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::{json, Value};

use crate::boxes;
use crate::config;
use crate::config::{Config, Diff, Exception, Mode, Network, Platform, Shot, Source, CHECKS};
use crate::diff;
use crate::discover::Entry;
use crate::driver::Driver;
use crate::fingerprint::Fingerprint;
use crate::harness;
use crate::image;
use crate::out::say;
use crate::pairs;
use crate::report;
use crate::shard::{self, Shard};
use crate::sources;
use crate::triage;

/// The config file names looked for, in order, when none is given.
const NAMES: [&str; 3] = ["visual.config.ts", "visual.config.mjs", "visual.config.js"];

/// What the command line asked for.
pub struct Options {
    /// Whether an update also writes the boxes into each matching baseline
    /// that has none.
    pub boxes: bool,
    /// A git ref handed to a pairs source's `prepare`, which decides what a
    /// change since it reaches, and the base a triage reads the diff from.
    pub changed: Option<String>,
    pub config: Option<PathBuf>,
    pub names: Vec<String>,
    pub shard: Option<Shard>,
    pub update: bool,
    pub workers: Option<usize>,
}

/// How far a shot is from its baseline.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Measure {
    Pixels(usize),
    Similarity {
        floor: f64,
        score: f64,
    },
    /// The two sides of a pair are different sizes.
    Size {
        a: (u32, u32),
        b: (u32, u32),
    },
}

impl Measure {
    pub fn describe(self) -> String {
        match self {
            Self::Pixels(1) => "1 pixel differs".to_string(),
            Self::Pixels(count) => format!("{count} pixels differ"),
            Self::Similarity { floor, score } => {
                format!("the structural similarity is {score:.4} against a floor of {floor}")
            }
            Self::Size { a, b } => format!("the two sides are {}x{} and {}x{}", a.0, a.1, b.0, b.1),
        }
    }
}

/// What became of one shot.
#[derive(Clone, Debug)]
pub enum Fate {
    /// The capture failed, and why.
    Broken(String),
    Differs {
        marked: Option<PathBuf>,
        measure: Measure,
    },
    /// An update left the baseline alone, the comparison passing.
    Held,
    Matched,
    Missing,
    Resized {
        from: (u32, u32),
        to: (u32, u32),
    },
    /// The shot has an exception with a pixel budget and differs by none.
    Spent,
    /// It differed, then matched when it was taken again.
    Steadied,
    /// It differed by no more than its exception allows.
    Tolerated {
        measure: Measure,
        reason: String,
    },
    /// An update wrote it, and why.
    Written(&'static str),
}

impl Fate {
    pub fn fails(&self) -> bool {
        matches!(
            self,
            Self::Broken(_)
                | Self::Differs { .. }
                | Self::Missing
                | Self::Resized { .. }
                | Self::Spent
        )
    }
}

/// What the comparison found, before anything is written.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum Verdict {
    Matched,
    Missing,
    Resized { from: (u32, u32), to: (u32, u32) },
    Differs(Measure),
    Within(Measure),
}

/// Compares a capture with its baseline, by the diff its source uses and
/// allowing `allowed` pixels in the pixel mode.
pub(crate) fn judge(
    baseline: Option<&[u8]>,
    current: &[u8],
    diff: &Diff,
    allowed: usize,
) -> std::result::Result<Verdict, String> {
    let Some(baseline) = baseline else {
        return Ok(Verdict::Missing);
    };
    if baseline == current {
        return Ok(Verdict::Matched);
    }
    let before = image::decode(baseline)
        .map_err(|why| format!("the baseline is not a PNG helix can read: {why}"))?;
    let after = image::decode(current)
        .map_err(|why| format!("the capture is not a PNG helix can read: {why}"))?;
    if (before.width, before.height) != (after.width, after.height) {
        return Ok(Verdict::Resized {
            from: (before.width, before.height),
            to: (after.width, after.height),
        });
    }
    Ok(match diff.mode {
        Mode::Pixel => match diff::count(&before, &after, diff.threshold, None) {
            0 => Verdict::Matched,
            n if n <= allowed => Verdict::Within(Measure::Pixels(n)),
            n => Verdict::Differs(Measure::Pixels(n)),
        },
        Mode::Perceptual => {
            let score = diff::ssim(&before, &after);
            let measure = Measure::Similarity {
                floor: diff.ssim,
                score,
            };
            if before.rgba == after.rgba {
                Verdict::Matched
            } else if score >= diff.ssim {
                Verdict::Within(measure)
            } else {
                Verdict::Differs(measure)
            }
        }
    })
}

/// The config file asked for, or the first of [`NAMES`] in the working
/// directory.
fn find(asked: Option<&Path>) -> Outcome<PathBuf> {
    let path = if let Some(path) = asked {
        path.to_path_buf()
    } else {
        let here = std::env::current_dir().map_err(|error| {
            Failure::input("cannot read the working directory", error.to_string())
        })?;
        NAMES
            .iter()
            .map(|name| here.join(name))
            .find(|path| path.is_file())
            .ok_or_else(|| {
                Failure::input(
                    "no config",
                    format!("none of {} is in {}", NAMES.join(", "), here.display()),
                )
                .hint("write a visual.config.ts, or name one with --config")
            })?
    };
    fs::canonicalize(&path).map_err(|error| {
        Failure::input(
            format!("cannot read {}", path.display()),
            error.to_string().to_lowercase(),
        )
    })
}

fn relative(base: &Path, path: &Path) -> String {
    path.strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

pub(crate) fn exception_for<'a>(
    exceptions: &'a [Exception],
    entry: &Entry,
    shot: &Shot,
) -> Option<&'a Exception> {
    exceptions.iter().find(|one| {
        one.checks.is_empty()
            && (one.entry == entry.id || one.entry == entry.name)
            && one.shot.as_ref().is_none_or(|name| *name == shot.name)
    })
}

/// The changes the run found, grouped by what they happened to.
fn group_changes(
    mine: &[&Entry],
    config: &Config,
    results: &BTreeMap<(usize, usize), Fate>,
    attributions: &BTreeMap<(usize, usize), Vec<String>>,
) -> Vec<triage::Group> {
    let aria = config.shots.len();
    let none: Vec<String> = Vec::new();
    let mut changes = Vec::new();
    for (&(at, shot), fate) in results {
        let name = if shot == aria {
            "accessibility"
        } else {
            config.shots[shot].name.as_str()
        };
        let change = match fate {
            Fate::Differs { .. } => {
                triage::Change::Differs(attributions.get(&(at, shot)).unwrap_or(&none))
            }
            Fate::Resized { from, to } => triage::Change::Resized {
                from: *from,
                to: *to,
            },
            Fate::Broken(sentence) if shot == aria => triage::Change::Aria(sentence),
            _ => continue,
        };
        changes.push((mine[at].id.clone(), name.to_string(), change));
    }
    triage::group(&changes)
}

/// The baseline and capture bytes of each changed shot, by `entry, shot`, for
/// a triage that may send pictures.
fn first_pictures(
    mine: &[&Entry],
    config: &Config,
    currents: &BTreeMap<(usize, usize), Vec<u8>>,
) -> BTreeMap<String, (Vec<u8>, Vec<u8>)> {
    currents
        .iter()
        .filter(|((_, shot), _)| *shot < config.shots.len())
        .filter_map(|(&(at, shot), capture)| {
            let (baseline, _) = paths(mine[at], &config.shots[shot]);
            let kept = fs::read(baseline).ok()?;
            Some((
                format!("{}, {}", mine[at].id, config.shots[shot].name),
                (kept, capture.clone()),
            ))
        })
        .collect()
}

/// Asks the triage's model about each group, the largest first and no more
/// than its cap, and writes each answer into its group. Returns the sentence
/// the report prints about what was asked and what it cost in tokens, or why
/// nothing could be asked: a triage that fails leaves the run's verdict alone.
fn ask(
    driver: &mut Driver,
    triage: &config::Triage,
    groups: &mut [triage::Group],
    base: &Path,
    reference: Option<&str>,
    pictures: &BTreeMap<String, (Vec<u8>, Vec<u8>)>,
) -> String {
    let asked = groups.len().min(triage.groups);
    let changed = reference
        .and_then(|one| triage::changed(base, one))
        .unwrap_or_default();
    let requests: Vec<Value> = groups[..asked]
        .iter()
        .map(|group| {
            let diff = reference.and_then(|one| triage::diff(base, one, &group.files));
            let images = if triage.images {
                group
                    .members
                    .first()
                    .and_then(|member| pictures.get(member))
                    .map(|(kept, taken)| triage::pictures(group, kept, taken))
                    .unwrap_or_default()
            } else {
                Vec::new()
            };
            json!({
                "images": images,
                "text": triage::request(group, diff.as_deref(), reference, &changed, !images.is_empty()),
            })
        })
        .collect();
    let answer = match driver.ask(&json!({
            "groups": requests,
            "model": triage.model(),
            "op": "triage",
            "provider": match triage.provider { config::Provider::Anthropic => "anthropic", config::Provider::Ollama => "ollama" },
            "system": triage::SYSTEM,
            "url": triage.url,
        })) {
        Ok(answer) => answer,
        Err(why) => {
            return format!(
                "helix: the triage by {} could not run, so the groups are unexplained: {why}",
                triage.model()
            )
        }
    };
    if let Some(why) = answer["stopped"].as_str() {
        return format!(
            "helix: the triage by {} could not run, so the groups are unexplained: {why}",
            triage.model()
        );
    }
    let (mut read, mut written, mut failed) = (0_u64, 0_u64, 0_usize);
    for (group, one) in groups
        .iter_mut()
        .zip(answer["answers"].as_array().into_iter().flatten())
    {
        read += one["input"].as_u64().unwrap_or(0);
        written += one["output"].as_u64().unwrap_or(0);
        if let Some(why) = one["error"].as_str() {
            failed += 1;
            group.verdict = Some("unclear".to_string());
            group.explanation = Some(format!("the model gave no answer: {why}"));
        } else if let Some(said) = one["explanation"]
            .as_str()
            .map(str::trim)
            .filter(|said| !said.is_empty())
        {
            group.verdict = one["verdict"].as_str().map(str::to_string);
            group.explanation = Some(said.to_string());
        } else {
            /* A verdict with no reason is no verdict a person can check. */
            group.verdict = Some("unclear".to_string());
            group.explanation =
                Some("the model gave a verdict with no reason, so it is not used".to_string());
        }
    }
    let skipped = groups.len() - asked;
    format!(
        "helix: triage asked {} about {asked} of {} {}{}, reading {read} tokens and writing {written}.{}",
        triage.model(),
        groups.len(),
        if groups.len() == 1 { "group" } else { "groups" },
        if skipped > 0 {
            format!(", the largest first, and left {skipped} to its cap of {}", triage.groups)
        } else {
            String::new()
        },
        if failed > 0 {
            format!(" {failed} went unanswered, said beside each.")
        } else {
            String::new()
        },
    )
}

/// Each tag the config's manifests declare, and the file that defines it,
/// relative to the config. A manifest that cannot be read is said once, and
/// the run goes on without it.
fn manifests(config: &Config, base: &Path) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for name in &config.manifest {
        let path = base.join(name);
        match fs::read_to_string(&path)
            .map_err(|error| error.to_string().to_lowercase())
            .and_then(|text| serde_json::from_str::<Value>(&text).map_err(|error| error.to_string()))
        {
            Ok(manifest) => {
                /* From the repository's root when there is one, so a site
                in a subfolder names `helix/styled/src/…` and not `../../`,
                and the triage's diff reads the same path. */
                let folder = path
                    .parent()
                    .map(|one| triage::from_top(base, one))
                    .unwrap_or_default();
                found.extend(boxes::tags(&manifest, &folder));
            }
            Err(why) => say!("helix: cannot read the manifest {name}, so no change is traced to a file through it: {why}"),
        }
    }
    found
}

/// The exception that excuses this entry from the check by this name.
fn excused<'a>(exceptions: &'a [Exception], entry: &Entry, check: &str) -> Option<&'a Exception> {
    exceptions.iter().find(|one| {
        (one.entry == entry.id || one.entry == entry.name)
            && one.checks.iter().any(|name| name == check)
    })
}

/// The baseline of a shot, and the image of its difference beside it.
fn paths(entry: &Entry, shot: &Shot) -> (PathBuf, PathBuf) {
    let suffix = shot.suffix();
    (
        entry.dir.join(format!("{}{suffix}.png", entry.stem)),
        entry.dir.join(format!("{}{suffix}.diff.png", entry.stem)),
    )
}

/// One shot in the shape the driver takes. The harness rules are for an HTML
/// entry, which the harness wrote the document of.
pub(crate) fn shot_request(config: &Config, entry: &Entry, shot: &Shot) -> Value {
    let harness = match &config.sources[entry.source] {
        Source::Html(html) => html
            .harness
            .resolved()
            .map(|harness| harness::css(&harness, shot)),
        Source::Pairs(pairs) => pairs
            .harness
            .resolved()
            .map(|harness| harness::css(&harness, shot)),
        _ => None,
    };
    json!({
        "harness": harness,
        "height": shot.height,
        "name": shot.name,
        "scheme": shot.scheme.as_str(),
        "width": shot.width,
    })
}

/// One entry, with the shots to take of it, in the shape the driver takes.
/// `first` is its first take, the one the page is inspected, checked and
/// snapshotted on; a second take only pictures.
fn item(config: &Config, entry: &Entry, shots: &[&Shot], first: bool) -> Outcome<Value> {
    let source = &config.sources[entry.source];
    let checks = &config.checks;
    let on = |value: Option<Value>| value.filter(|_| first);
    let mut out = json!({
        "aria": first && config.aria.kept(),
        "checks": {
            "clipped": on(checks.clipped.resolved().map(|check| json!(check))),
            "code": on(checks.code.resolved().map(|check| json!({ "minimum": check.minimum, "selector": check.selector }))),
            "contrast": on(checks.contrast.resolved().map(|check| json!(check))),
            "overlap": on(checks.overlap.resolved().map(|check| json!(check))),
        },
        "entry": { "file": entry.file, "id": entry.id, "name": entry.name, "source": source.name(), "url": entry.url },
        "boxes": false,
        "inspect": first && config.inspect,
        "key": entry.id,
        "shots": shots.iter().map(|shot| shot_request(config, entry, shot)).collect::<Vec<_>>(),
    });
    /* A screen's state beside its baselines, `<stem>.state.json`, which the
    driver puts back once the page has upgraded: the menu open, the field
    filled, the list scrolled, as `captureState` wrote them. */
    let saved = entry.dir.join(format!("{}.state.json", entry.stem));
    if saved.is_file() {
        let text = fs::read_to_string(&saved).map_err(|error| {
            Failure::input(
                format!("cannot read {}", saved.display()),
                error.to_string().to_lowercase(),
            )
        })?;
        let state: Value = serde_json::from_str(&text).map_err(|error| {
            Failure::input(
                format!("{} is not JSON", saved.display()),
                error.to_string(),
            )
        })?;
        out["state"] = state;
    }
    let (Source::Html(html), Some(file)) = (source, &entry.file) else {
        out["url"] = json!(entry.url);
        return Ok(out);
    };
    let body = fs::read_to_string(file).map_err(|error| {
        Failure::input(
            format!("cannot read {}", file.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    let page = harness::document(
        &entry.id,
        &html.styles,
        &html.scripts,
        html.harness
            .resolved()
            .map(|harness| harness::css(&harness, shots[0]))
            .as_deref(),
        "",
        &body,
    );
    let files: BTreeMap<&String, String> = html
        .files
        .iter()
        .map(|(asked, file)| (asked, file.replace("{stem}", &entry.stem)))
        .collect();
    out["dir"] = json!(entry.dir);
    out["files"] = json!(files);
    out["html"] = json!(page);
    out["path"] = json!(format!("/{}/", entry.id));
    Ok(out)
}

/// The pictures one capture request produced, by entry and shot index, with
/// the seconds each entry took and the failures the driver reported.
pub(crate) struct Captured {
    /// Each page's accessibility snapshot, when the config keeps them.
    pub(crate) aria: BTreeMap<usize, String>,
    pub(crate) broken: BTreeMap<usize, String>,
    /// Console errors each page logged, for a pair's sides.
    pub(crate) errors: BTreeMap<usize, Vec<String>>,
    /// What the config's page checks found on each page, each as the
    /// check's name and its sentence.
    pub(crate) findings: BTreeMap<usize, Vec<(String, String)>>,
    /// Every ink and ground pair contrast measured on each page.
    pub(crate) painted: BTreeMap<usize, Vec<String>>,
    pub(crate) pictures: BTreeMap<(usize, usize), Vec<u8>>,
    /// What a pairs source's `check` found on each page.
    pub(crate) problems: BTreeMap<usize, Vec<String>>,
    pub(crate) seconds: BTreeMap<usize, f64>,
}

/// Sends a capture and reads every line it streams back.
pub(crate) fn capture(
    driver: &mut Driver,
    items: &[Value],
    keys: &BTreeMap<String, usize>,
    shots: &[Shot],
    (ready, elements): (Option<&str>, Option<&str>),
) -> Outcome<Captured> {
    let internal = |why: String| Failure::new(Code::Internal, "the driver", why);
    driver
        .send(&json!({ "elements": elements, "items": items, "op": "capture", "readyProperty": ready }))
        .map_err(internal)?;
    let mut captured = Captured {
        aria: BTreeMap::new(),
        broken: BTreeMap::new(),
        errors: BTreeMap::new(),
        findings: BTreeMap::new(),
        painted: BTreeMap::new(),
        pictures: BTreeMap::new(),
        problems: BTreeMap::new(),
        seconds: BTreeMap::new(),
    };
    loop {
        let line = driver.next().map_err(internal)?;
        let key = line["key"].as_str().unwrap_or_default();
        match line["op"].as_str() {
            Some("captured") => return Ok(captured),
            Some("shot") => {
                let (Some(&entry), Some(shot)) = (
                    keys.get(key),
                    shots
                        .iter()
                        .position(|one| line["shot"] == one.name.as_str()),
                ) else {
                    return Err(internal(format!(
                        "a picture of {key} that was never asked for"
                    )));
                };
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(line["png"].as_str().unwrap_or_default())
                    .map_err(|error| {
                        internal(format!("a picture of {key} that is not base64: {error}"))
                    })?;
                /* The boxes ride in the picture, so a baseline written from
                it keeps them and a diff of it can read them. */
                let bytes = if line["boxes"].is_array() {
                    boxes::embed(&bytes, &line["boxes"])
                } else {
                    bytes
                };
                captured.pictures.insert((entry, shot), bytes);
            }
            Some("item") => {
                let Some(&entry) = keys.get(key) else {
                    return Err(internal(format!(
                        "an answer for {key}, which was never asked for"
                    )));
                };
                captured
                    .seconds
                    .insert(entry, line["seconds"].as_f64().unwrap_or(0.0));
                if let Some(error) = line["error"].as_str() {
                    captured.broken.insert(entry, error.to_string());
                }
                let strings = |field: &str| -> Vec<String> {
                    line[field]
                        .as_array()
                        .map(|all| {
                            all.iter()
                                .filter_map(Value::as_str)
                                .map(str::to_string)
                                .collect()
                        })
                        .unwrap_or_default()
                };
                captured.errors.insert(entry, strings("errors"));
                captured.problems.insert(entry, strings("problems"));
                let found = line["findings"]
                    .as_array()
                    .map(|all| {
                        all.iter()
                            .filter_map(|one| {
                                Some((
                                    one["check"].as_str()?.to_string(),
                                    one["text"].as_str()?.to_string(),
                                ))
                            })
                            .collect()
                    })
                    .unwrap_or_default();
                captured.findings.insert(entry, found);
                captured.painted.insert(entry, strings("painted"));
                if let Some(snapshot) = line["aria"].as_str() {
                    captured.aria.insert(entry, snapshot.to_string());
                }
            }
            _ => {
                return Err(internal(format!(
                    "an answer this binary does not know: {line}"
                )))
            }
        }
    }
}

/// Loads the config through a driver started beside it.
fn load(asked: Option<&Path>) -> Outcome<(PathBuf, PathBuf, Driver, Config)> {
    let path = find(asked)?;
    let base = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let mut driver = Driver::start(&base)
        .map_err(|why| Failure::input("cannot start the capture driver", why))?;
    let answered = driver
        .ask(&json!({ "op": "config", "path": path }))
        .map_err(|why| Failure::input(format!("cannot load {}", relative(&base, &path)), why))?;
    let config = Config::parse(answered["config"].clone())
        .map_err(|why| Failure::input(relative(&base, &path), why))?;
    Ok((path, base, driver, config))
}

/// `helix visual report`: opens the last run's report, or prints its summary as
/// Markdown for a CI job.
pub fn open_report(config: Option<&Path>, markdown: bool) -> Outcome<Code> {
    let (_, base, driver, config) = load(config)?;
    driver.close();
    let dir = base.join(&config.report);
    let record = dir.join("run.json");
    let text = fs::read_to_string(&record).map_err(|_| {
        Failure::input(
            "no report",
            format!("there is no {}", relative(&base, &record)),
        )
        .hint("helix visual test")
    })?;
    /* Under `--json` the record is the answer, printed as written, and
    nothing is opened: a script asked for data and not for a window. */
    if crate::out::json() {
        print!("{text}");
        return Ok(Code::Ok);
    }
    if markdown {
        let value: Value = serde_json::from_str(&text).map_err(|error| {
            Failure::input(
                format!("cannot read {}", record.display()),
                error.to_string(),
            )
        })?;
        print!("{}", report::markdown(&value));
        return Ok(Code::Ok);
    }
    let page = dir.join("index.html");
    say!("helix: the report is {}", page.display());
    let opener = match std::env::consts::OS {
        "macos" => Some("open"),
        "linux" => Some("xdg-open"),
        _ => None,
    };
    if let Some(opener) = opener {
        let _ = std::process::Command::new(opener)
            .arg(&page)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
    Ok(Code::Ok)
}

/// What a merge reads from each report: how many it read, their groups, the
/// baseline and capture each failed shot left, by `entry, shot`, and how many
/// shots had no baseline.
type Read = (
    usize,
    Vec<triage::Group>,
    BTreeMap<String, (Vec<u8>, Vec<u8>)>,
    usize,
);

/// Each report's groups and pictures. A path with no report is said and left
/// out, and a record that is not JSON fails the merge.
fn read_reports(runs: &[PathBuf]) -> Outcome<Read> {
    let mut groups = Vec::new();
    let mut pictures = BTreeMap::new();
    let mut read = 0;
    let mut new = 0;
    for run in runs {
        let record = if run.is_dir() {
            run.join("run.json")
        } else {
            run.clone()
        };
        let Ok(text) = fs::read_to_string(&record) else {
            say!(
                "helix: there is no report at {}, so it is left out.",
                record.display()
            );
            continue;
        };
        let value: Value = serde_json::from_str(&text).map_err(|error| {
            Failure::input(
                format!("cannot read {}", record.display()),
                error.to_string(),
            )
        })?;
        read += 1;
        let folder = record.parent().unwrap_or(Path::new("."));
        groups.extend(
            value["groups"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(triage::Group::read),
        );
        /* The baseline and capture each failed shot left in its report, for a
        triage that may send pictures. */
        for shot in value["shots"].as_array().into_iter().flatten() {
            /* A shot with no baseline is in no group, because nothing changed:
            counted, so a run that failed only on new entries says so. */
            if shot["result"].as_str() == Some("missing") {
                new += 1;
            }
            let (Some(entry), Some(name)) = (shot["entry"].as_str(), shot["shot"].as_str()) else {
                continue;
            };
            let file = |field: &str| {
                shot[field]
                    .as_str()
                    .and_then(|at| fs::read(folder.join(at)).ok())
            };
            if let (Some(kept), Some(taken)) = (file("baseline"), file("current")) {
                pictures.insert(format!("{entry}, {name}"), (kept, taken));
            }
        }
    }
    Ok((read, groups, pictures, new))
}

/// `helix visual report --merge`: the groups of several runs' reports as one,
/// asked about once each when the config has a triage, printed, and written
/// as Markdown with `markdown`.
pub fn merge_reports(
    config: Option<&Path>,
    runs: &[PathBuf],
    earlier: &[PathBuf],
    reference: Option<&str>,
    markdown: bool,
) -> Outcome<Code> {
    let (_, base, mut driver, config) = load(config)?;
    let history =
        (!earlier.is_empty()).then(|| crate::history::summarize(&crate::history::gather(earlier)));
    let (read, groups, pictures, new) = read_reports(runs)?;
    let mut groups = triage::merge(groups);
    if let Some(history) = &history {
        let own = crate::history::Origin::here(&base).reference;
        for group in &mut groups {
            group.elsewhere = history.elsewhere(&group.signature, &own);
        }
    }
    let triaged = match &config.triage {
        Some(triage) if !groups.is_empty() => Some(ask(
            &mut driver,
            triage,
            &mut groups,
            &base,
            reference,
            &pictures,
        )),
        _ => None,
    };
    driver.close();
    let shots: BTreeSet<&String> = groups.iter().flat_map(|one| &one.members).collect();
    let verdict = if runs.is_empty() {
        "helix: the history of earlier runs.".to_string()
    } else {
        format!(
            "helix: {} {} hold {} that changed, in {}{}.",
            read,
            if read == 1 { "report" } else { "reports" },
            if shots.len() == 1 {
                "1 shot".to_string()
            } else {
                format!("{} shots", shots.len())
            },
            if groups.len() == 1 {
                "1 group".to_string()
            } else {
                format!("{} groups", groups.len())
            },
            match new {
                0 => String::new(),
                1 => ", and 1 new shot with no baseline".to_string(),
                count => format!(", and {count} new shots with no baseline"),
            },
        )
    };
    let record = json!({
        "groups": groups.iter().map(triage::Group::record).collect::<Vec<_>>(),
        "history": history.as_ref().map(crate::history::Summary::record),
        "shots": [],
        "triage": triaged,
        "verdict": verdict,
    });
    if crate::out::json() {
        println!("{record}");
    } else if markdown {
        print!("{}", report::markdown(&record));
    } else {
        say!("{verdict}");
        for group in &groups {
            say!("  {}", report::printed(group));
        }
        if let Some(triaged) = &triaged {
            say!("{triaged}");
        }
        if let Some(history) = &history {
            for line in history.lines() {
                say!("helix: {line}");
            }
        }
    }
    Ok(Code::Ok)
}

/// The command, start to finish.
#[allow(clippy::too_many_lines)] // One sequence a reader follows top to bottom.
pub fn run(options: &Options) -> Outcome<Code> {
    let (path, base, mut driver, config) = load(options.config.as_deref())?;
    let internal = |why: String| Failure::new(Code::Internal, "the driver", why);

    if config.platform == Platform::Linux && std::env::consts::OS != "linux" {
        driver.close();
        return Ok(report::stopped(
            options.update,
            false,
            &format!(
                "helix: skipped on {}. Baselines are taken and compared on linux, because text rasterization and \
                 antialiasing differ by platform, so a comparison across them would differ on nearly every glyph.",
                std::env::consts::OS
            ),
        ));
    }

    /* Before discovery, because a sitemap and a Storybook index are read from
    the server that serves them. */
    let servers = sources::start(&config, &base, &mut driver)?;
    let (mut every, offered) =
        sources::entries(&config, &base, &mut driver, options.changed.as_deref())?;
    /* A pair keeps no baseline, so an update has nothing of it to write. */
    if options.update {
        every.retain(|entry| entry.sides.is_none());
        if every.is_empty() {
            driver.close();
            return Ok(report::stopped(
                true,
                false,
                "helix: every entry is a pair, which compares two renders and keeps no baseline, so there is nothing to update.",
            ));
        }
    }
    /* Only an unscoped list is the whole of it: a pairs source scoped by
    `--changed` leaves out entries an exception may rightly name. */
    for exception in config
        .exceptions
        .iter()
        .filter(|_| options.changed.is_none())
    {
        if !every
            .iter()
            .any(|entry| entry.id == exception.entry || entry.name == exception.entry)
        {
            return Err(Failure::input(
                relative(&base, &path),
                format!("the exception for `{}` names no entry", exception.entry),
            ));
        }
    }
    for name in &options.names {
        if !every
            .iter()
            .any(|entry| entry.id == *name || entry.name == *name || entry.group == *name)
        {
            return Err(Failure::input(
                format!("`{name}`"),
                "no entry has that name or id",
            ));
        }
    }
    let named: Vec<&Entry> = every
        .iter()
        .filter(|entry| {
            options.names.is_empty()
                || options
                    .names
                    .iter()
                    .any(|name| *name == entry.id || *name == entry.name || *name == entry.group)
        })
        .collect();

    /* What each entry is pictured in, unstable shots out. */
    let taken = |entry: &Entry| -> Vec<usize> {
        (0..config.shots.len())
            .filter(|&at| {
                !exception_for(&config.exceptions, entry, &config.shots[at])
                    .is_some_and(|one| one.unstable)
            })
            .collect()
    };

    let mine: Vec<&Entry> = match options.shard {
        None => named,
        Some(asked) => {
            let mut weights: BTreeMap<String, f64> = BTreeMap::new();
            for entry in &named {
                #[allow(clippy::cast_precision_loss)] // A count of shots.
                let shots = taken(entry).len() as f64;
                *weights.entry(entry.group.clone()).or_default() += config.shard.per_shot * shots;
            }
            for (name, weight) in &mut weights {
                if let Some(measured) = config.shard.cost.get(name) {
                    *weight = *measured;
                }
            }
            let placed = shard::assign(&weights, asked.of);
            named
                .into_iter()
                .filter(|entry| placed.get(&entry.group) == Some(&asked.index))
                .collect()
        }
    };
    let scope = match (&options.shard, options.names.is_empty()) {
        (Some(asked), _) => format!(", in {}", asked.label()),
        (None, false) => format!(", named {}", options.names.join(", ")),
        (None, true) => String::new(),
    };
    if mine.is_empty() {
        driver.close();
        return Ok(report::stopped(
            options.update,
            false,
            &match options.shard {
                Some(asked) => format!(
                    "helix: {} holds none of the entries, which the other shards picture.",
                    asked.label()
                ),
                None => "helix: no entry is in this run, so nothing was compared.".to_string(),
            },
        ));
    }

    let mut serve = BTreeMap::new();
    for (url, file) in &config.serve {
        let on_disk = base.join(file);
        if !on_disk.exists() {
            return Err(Failure::input(
                relative(&base, &path),
                format!("`serve` maps {url} to {file}, and there is nothing there"),
            )
            .hint("build what the config serves before the run"));
        }
        serve.insert(url.clone(), on_disk);
    }
    serve.extend(offered);

    let fingerprint_path = base.join(&config.fingerprint);
    let recorded: Option<Fingerprint> = match fs::read_to_string(&fingerprint_path) {
        Ok(text) => Some(serde_json::from_str(&text).map_err(|error| {
            Failure::input(
                format!("cannot read {}", relative(&base, &fingerprint_path)),
                error.to_string(),
            )
        })?),
        Err(_) => None,
    };

    let workers = options.workers.unwrap_or_else(|| {
        let cores = std::thread::available_parallelism().map_or(1, std::num::NonZero::get);
        cores.saturating_sub(1).clamp(1, 4)
    });
    /* A server a source pictures is an origin of the harness too. */
    let origins: Vec<String> = config
        .sources
        .iter()
        .filter_map(Source::server)
        .map(|served| sources::origin(&served.url))
        .collect();
    let started = driver
        .ask(&json!({
            "network": match config.network { Network::Origin => "origin", Network::Open => "open" },
            "hide": config.aria.hidden(),
            "mask": config.mask,
            "op": "start",
            "style": config.style,
            "origins": origins,
            "serve": serve,
            "workers": workers,
        }))
        .map_err(|why| Failure::input("cannot start the browser", why))?;
    let here = Fingerprint::here(started["browser"].as_str().unwrap_or("unknown"));

    let whole = options.names.is_empty() && options.shard.is_none();
    /* A run of pairs alone compares no baseline, so no environment is part of
    its answer. */
    let baselined = mine.iter().any(|entry| entry.sides.is_none());
    let retake = config
        .retake
        .clone()
        .unwrap_or_else(|| "Retake them with `helix visual update` where the baselines are taken, and review the pictures it writes.".to_string());
    let differences = recorded.as_ref().map(|taken| here.differences(taken));
    let mut write_fingerprint = false;
    match (&differences, options.update) {
        _ if !baselined => {}
        (Some(found), _) if found.is_empty() => {}
        (_, true) if whole => write_fingerprint = true,
        (None, true) => {
            driver.close();
            return Ok(report::stopped(
                options.update,
                true,
                &format!(
                    "helix: there is no environment fingerprint at {}, and a retake of part of the set cannot \
                     write one for all of it. Retake every entry.",
                    relative(&base, &fingerprint_path)
                ),
            ));
        }
        (Some(found), true) => {
            driver.close();
            return Ok(report::stopped(
                options.update,
                true,
                &format!(
                    "helix: the environment differs from the one the baselines were taken in: {}. A retake of part \
                     of the set would mix two environments. Retake every entry.",
                    found.join(", ")
                ),
            ));
        }
        (None, false) => {
            driver.close();
            return Ok(report::stopped(
                options.update,
                true,
                &format!(
                    "helix: there is no environment fingerprint at {}, so nothing says where the baselines were \
                     taken. {retake}",
                    relative(&base, &fingerprint_path)
                ),
            ));
        }
        (Some(found), false) => {
            driver.close();
            return Ok(report::stopped(
                options.update,
                true,
                &format!(
                    "helix: the environment differs from the one the baselines were taken in: {}. The pictures \
                     would differ for that reason alone, so nothing was compared. {retake}",
                    found.join(", ")
                ),
            ));
        }
    }

    let keys: BTreeMap<String, usize> = mine
        .iter()
        .enumerate()
        .map(|(at, entry)| (entry.id.clone(), at))
        .collect();
    let ready = (
        config.settle.ready_property.as_deref(),
        config.settle.elements.as_deref(),
    );
    let mut items = Vec::new();
    for entry in mine.iter().filter(|entry| entry.sides.is_none()) {
        let shots: Vec<&Shot> = taken(entry)
            .into_iter()
            .map(|at| &config.shots[at])
            .collect();
        if !shots.is_empty() {
            let mut one = item(&config, entry, &shots, true)?;
            /* An update writes what it takes, so every picture carries its
            boxes into the baseline it may become. */
            one["boxes"] = Value::Bool(options.update);
            items.push(one);
        }
    }
    let first = capture(&mut driver, &items, &keys, &config.shots, ready)?;

    let diff_of = |entry: &Entry| config.sources[entry.source].diff().unwrap_or(&config.diff);
    let allowed_for = |entry: &Entry, shot: &Shot| {
        exception_for(&config.exceptions, entry, shot)
            .and_then(|one| one.pixels)
            .unwrap_or(diff_of(entry).pixels)
    };

    let mut results: BTreeMap<(usize, usize), Fate> = BTreeMap::new();
    let mut currents: BTreeMap<(usize, usize), Vec<u8>> = BTreeMap::new();
    let mut attributions: BTreeMap<(usize, usize), Vec<String>> = BTreeMap::new();
    let files = manifests(&config, &base);
    let mut again: Vec<(usize, usize)> = Vec::new();
    /* **The first take of a shot taken again**, kept so a shot that matches on
    the second still shows what moved on the first: what makes it settle is
    read off that picture, and nothing else records it. */
    let mut firsts: BTreeMap<(usize, usize), Vec<u8>> = BTreeMap::new();
    let mut first_diffs: BTreeMap<(usize, usize), Vec<u8>> = BTreeMap::new();
    for (at, entry) in mine
        .iter()
        .enumerate()
        .filter(|(_, entry)| entry.sides.is_none())
    {
        for shot in taken(entry) {
            let picture = &config.shots[shot];
            if let Some(why) = first.broken.get(&at) {
                results.insert((at, shot), Fate::Broken(why.clone()));
                continue;
            }
            let Some(bytes) = first.pictures.get(&(at, shot)) else {
                results.insert(
                    (at, shot),
                    Fate::Broken("the driver returned no picture".to_string()),
                );
                continue;
            };
            let (baseline, _) = paths(entry, picture);
            let exception = exception_for(&config.exceptions, entry, picture);
            let existing = fs::read(&baseline).ok();
            match judge(
                existing.as_deref(),
                bytes,
                diff_of(entry),
                allowed_for(entry, picture),
            ) {
                Err(why) => {
                    results.insert((at, shot), Fate::Broken(why));
                }
                Ok(Verdict::Differs(_) | Verdict::Resized { .. }) => {
                    firsts.insert((at, shot), bytes.clone());
                    again.push((at, shot));
                }
                Ok(verdict) => {
                    if verdict == Verdict::Missing && !options.update {
                        currents.insert((at, shot), bytes.clone());
                    }
                    let mut result = settle(verdict, exception, options.update, &baseline, bytes)?;
                    if matches!(result, Fate::Held) && options.boxes {
                        result = carry(existing.as_deref(), bytes, &baseline)?.unwrap_or(result);
                    }
                    results.insert((at, shot), result);
                }
            }
        }
    }

    /* The accessibility snapshot, one an entry, judged as text against the
    file beside its baselines and kept in the results under an index past
    the last shot. A page that broke has none to judge. */
    let aria = config.shots.len();
    if config.aria.kept() {
        for (at, entry) in mine
            .iter()
            .enumerate()
            .filter(|(_, entry)| entry.sides.is_none())
        {
            let Some(snapshot) = first.aria.get(&at) else {
                continue;
            };
            let file = aria_path(entry);
            let fate = match fs::read_to_string(&file).ok() {
                Some(kept) if kept == *snapshot => {
                    if options.update {
                        Fate::Held
                    } else {
                        Fate::Matched
                    }
                }
                _ if options.update => {
                    let why = if file.exists() {
                        "it differs"
                    } else {
                        "it had no snapshot"
                    };
                    write(&file, snapshot.as_bytes())?;
                    Fate::Written(why)
                }
                None => Fate::Missing,
                Some(kept) => Fate::Broken(aria_difference(&kept, snapshot)),
            };
            results.insert((at, aria), fate);
        }
    }
    /* A finding an exception excuses is left out. An excuse whose check
    found nothing on a page that was read is spent, and says so. */
    let mut findings: Vec<String> = Vec::new();
    for (at, entry) in mine.iter().enumerate() {
        let Some(found) = first.findings.get(&at) else {
            continue;
        };
        for (check, text) in found {
            if excused(&config.exceptions, entry, check).is_none() {
                findings.push(format!("{}: {text}", entry.id));
            }
        }
        if first.broken.contains_key(&at) {
            continue;
        }
        for check in CHECKS {
            if excused(&config.exceptions, entry, check).is_some()
                && !found.iter().any(|(name, _)| name == check)
            {
                findings.push(format!(
                    "{}: the exception excusing it from `{check}` is spent, since the check found nothing on it. Remove it from the config.",
                    entry.id
                ));
            }
        }
    }

    if !again.is_empty() {
        let mut items = Vec::new();
        let mut retake_keys = BTreeMap::new();
        for &(at, shot) in &again {
            let entry = mine[at];
            let key = format!("{}#{}", entry.id, config.shots[shot].name);
            let mut one = item(&config, entry, &[&config.shots[shot]], false)?;
            one["boxes"] = Value::Bool(true);
            one["key"] = Value::String(key.clone());
            retake_keys.insert(key, at);
            items.push(one);
        }
        let second = capture(&mut driver, &items, &retake_keys, &config.shots, ready)?;
        for &(at, shot) in &again {
            let entry = mine[at];
            let picture = &config.shots[shot];
            let (baseline, marked) = paths(entry, picture);
            let diff = diff_of(entry);
            let existing = fs::read(&baseline).ok();
            let result = match (second.broken.get(&at), second.pictures.get(&(at, shot))) {
                (Some(why), _) => Fate::Broken(why.clone()),
                (None, None) => {
                    Fate::Broken("the driver returned no picture on the second take".to_string())
                }
                (None, Some(bytes)) => {
                    match judge(
                        existing.as_deref(),
                        bytes,
                        diff,
                        allowed_for(entry, picture),
                    ) {
                        Err(why) => Fate::Broken(why),
                        Ok(Verdict::Matched | Verdict::Within(_)) if options.update => {
                            if options.boxes {
                                carry(existing.as_deref(), bytes, &baseline)?.unwrap_or(Fate::Held)
                            } else {
                                Fate::Held
                            }
                        }
                        Ok(Verdict::Matched | Verdict::Within(_)) => {
                            /* The first take in the report, beside the baseline
                            and marked where it differed, when the two are one
                            size. */
                            if let (Some(kept), Some(taken)) =
                                (existing.as_deref(), firsts.get(&(at, shot)))
                            {
                                if let (Ok(before), Ok(after)) =
                                    (image::decode(kept), image::decode(taken))
                                {
                                    if (before.width, before.height) == (after.width, after.height)
                                    {
                                        let (_, drawn) =
                                            diff::marked(&before, &after, diff.threshold);
                                        /* What moved on the first take, traced
                                        through the second take's boxes, so a
                                        shot that keeps needing two says what
                                        will not hold still. */
                                        if let Some(now) = boxes::read(bytes) {
                                            attributions.insert(
                                                (at, shot),
                                                boxes::attribute(
                                                    &boxes::regions(&drawn),
                                                    &now,
                                                    boxes::read(kept).as_deref(),
                                                    &files,
                                                ),
                                            );
                                        }
                                        if let Ok(encoded) = image::encode(&drawn) {
                                            first_diffs.insert((at, shot), encoded);
                                        }
                                    }
                                }
                                currents.insert((at, shot), taken.clone());
                            }
                            Fate::Steadied
                        }
                        Ok(_) if options.update => {
                            write(&baseline, bytes)?;
                            Fate::Written("it differs")
                        }
                        Ok(Verdict::Resized { from, to }) => {
                            currents.insert((at, shot), bytes.clone());
                            Fate::Resized { from, to }
                        }
                        Ok(Verdict::Differs(measure)) => {
                            let kept = existing.as_deref().unwrap_or_default();
                            let before =
                                image::decode(kept).map_err(|why| internal(why.clone()))?;
                            let after = image::decode(bytes).map_err(internal)?;
                            let (_, drawn) = diff::marked(&before, &after, diff.threshold);
                            if let Some(now) = boxes::read(bytes) {
                                attributions.insert(
                                    (at, shot),
                                    boxes::attribute(
                                        &boxes::regions(&drawn),
                                        &now,
                                        boxes::read(kept).as_deref(),
                                        &files,
                                    ),
                                );
                            }
                            let encoded = image::encode(&drawn).map_err(internal)?;
                            write(&marked, &encoded)?;
                            currents.insert((at, shot), bytes.clone());
                            Fate::Differs {
                                marked: Some(marked),
                                measure,
                            }
                        }
                        Ok(Verdict::Missing) => Fate::Missing,
                    }
                }
            };
            results.insert((at, shot), result);
        }
    }

    let paired: Vec<(usize, &Entry, Vec<usize>)> = mine
        .iter()
        .enumerate()
        .filter(|(_, entry)| entry.sides.is_some())
        .map(|(at, entry)| (at, *entry, taken(entry)))
        .collect();
    let compared = if paired.is_empty() {
        None
    } else {
        Some(pairs::compare(&mut driver, &config, &paired, ready)?)
    };
    if let Some(compared) = &compared {
        for (key, fate) in &compared.fates {
            results.insert(*key, fate.clone());
        }
    }

    /* The changes, grouped, and explained when the config asks: before the
    driver closes, because it is what makes the requests. */
    let mut groups = group_changes(&mine, &config, &results, &attributions);
    let triaged = match &config.triage {
        /* A shard sees part of the run, and a group split across shards would
        be asked about once in each: the merge of the shards asks once. */
        Some(_) if !groups.is_empty() && options.shard.is_some() => Some(
            "helix: this run is one shard, so its groups are asked about when the shards' reports are merged, with `helix visual report --merge`."
                .to_string(),
        ),
        Some(triage) if !groups.is_empty() => Some(ask(
            &mut driver,
            triage,
            &mut groups,
            &base,
            options.changed.as_deref(),
            &first_pictures(&mine, &config, &currents),
        )),
        _ => None,
    };

    let inspected_failed = if config.inspect {
        let finished = driver
            .ask(&json!({ "op": "finish", "update": options.update }))
            .map_err(|why| Failure::new(Code::Failed, "the config's inspect", why))?;
        finished["failed"].as_bool().unwrap_or(false)
    } else {
        false
    };
    driver.close();
    drop(servers);

    if let Some(timings) = &config.timings {
        let mut by_name: BTreeMap<&str, f64> = BTreeMap::new();
        let paired_seconds = compared.iter().flat_map(|one| one.seconds.iter());
        for (at, seconds) in first.seconds.iter().chain(paired_seconds) {
            *by_name.entry(mine[*at].group.as_str()).or_default() += seconds;
        }
        let text = serde_json::to_string_pretty(&by_name).unwrap_or_default() + "\n";
        write(&base.join(timings), text.as_bytes())?;
    }

    /* The diff image of a shot that no longer differs is from a run that is
    over, and uploading it would show a failure that is not this one. */
    for (&(at, shot), result) in &results {
        if shot != aria && mine[at].sides.is_none() && !matches!(result, Fate::Differs { .. }) {
            let (_, marked) = paths(mine[at], &config.shots[shot]);
            let _ = fs::remove_file(marked);
        }
    }

    /* Only for a whole set: a shot that could not be taken is a baseline this
    environment never agreed with. */
    let write_fingerprint =
        write_fingerprint && !results.values().any(|fate| matches!(fate, Fate::Broken(_)));
    if write_fingerprint {
        write(&fingerprint_path, here.to_text().as_bytes())?;
    }

    let mut skipped = Vec::new();
    for entry in &mine {
        for shot in &config.shots {
            if let Some(exception) =
                exception_for(&config.exceptions, entry, shot).filter(|one| one.unstable)
            {
                skipped.push(format!(
                    "{}, {} ({})",
                    entry.id, shot.name, exception.reason
                ));
            }
        }
    }
    let rows = results
        .iter()
        .map(|(&(at, shot), fate)| {
            let source = &config.sources[mine[at].source];
            if let Source::Pairs(pairs) = source {
                let pictures = compared
                    .as_ref()
                    .and_then(|one| one.pictures.get(&(at, shot)));
                return report::Row {
                    attribution: &[],
                    baseline: report::Picture::Bytes(pictures.map(|(a, _, _)| a.as_slice())),
                    current: pictures.map(|(_, b, _)| b.as_slice()),
                    diff: report::Picture::Bytes(pictures.and_then(|(_, _, diff)| diff.as_deref())),
                    entry: &mine[at].id,
                    fate,
                    keep: None,
                    labels: [pairs.labels[0].as_str(), pairs.labels[1].as_str()],
                    pair: true,
                    shot: &config.shots[shot].name,
                    snapshot: None,
                    source: source.name(),
                };
            }
            if shot == aria {
                return report::Row {
                    attribution: &[],
                    baseline: report::Picture::File(None),
                    current: None,
                    diff: report::Picture::File(None),
                    entry: &mine[at].id,
                    fate,
                    keep: Some(aria_path(mine[at])),
                    labels: ["Kept", "Taken"],
                    pair: false,
                    shot: "accessibility",
                    snapshot: first.aria.get(&at).map(String::as_str),
                    source: source.name(),
                };
            }
            let (baseline, marked) = paths(mine[at], &config.shots[shot]);
            report::Row {
                attribution: attributions.get(&(at, shot)).map_or(&[], Vec::as_slice),
                baseline: report::Picture::File(Some(baseline.clone())),
                current: currents.get(&(at, shot)).map(Vec::as_slice),
                diff: if matches!(fate, Fate::Steadied) {
                    report::Picture::Bytes(first_diffs.get(&(at, shot)).map(Vec::as_slice))
                } else {
                    report::Picture::File(matches!(fate, Fate::Differs { .. }).then_some(marked))
                },
                entry: &mine[at].id,
                fate,
                keep: Some(baseline),
                labels: if matches!(fate, Fate::Steadied) {
                    ["Baseline", "First take"]
                } else {
                    ["Baseline", "Capture"]
                },
                pair: false,
                shot: &config.shots[shot].name,
                snapshot: None,
                source: source.name(),
            }
        })
        .collect();
    Ok(report::finish(&report::Run {
        base: &base,
        dir: base.join(&config.report),
        entries: mine.len(),
        findings,
        fingerprint: write_fingerprint.then_some(fingerprint_path),
        inspected_failed,
        retake: &retake,
        root: crate::accept::root(&base),
        rows,
        scope: &scope,
        skipped,
        groups,
        triaged,
        origin: crate::history::Origin::here(&base),
        painted: first
            .painted
            .iter()
            .filter(|(_, pairs)| !pairs.is_empty())
            .map(|(&at, pairs)| (mine[at].id.clone(), pairs.clone()))
            .collect(),
        update: options.update,
    }))
}

/// Where an entry's accessibility snapshot is kept: beside its baselines, as
/// `<stem>.aria.yml`.
fn aria_path(entry: &Entry) -> PathBuf {
    entry.dir.join(format!("{}.aria.yml", entry.stem))
}

/// The lines two accessibility snapshots do not share, the first few of each,
/// as a sentence.
fn aria_difference(kept: &str, taken: &str) -> String {
    let gone: Vec<&str> = kept
        .lines()
        .filter(|line| !taken.lines().any(|one| one == *line))
        .collect();
    let new: Vec<&str> = taken
        .lines()
        .filter(|line| !kept.lines().any(|one| one == *line))
        .collect();
    let sample = |lines: &[&str]| {
        lines
            .iter()
            .take(3)
            .map(|line| line.trim())
            .collect::<Vec<_>>()
            .join(" | ")
    };
    let mut said = String::from("the accessibility snapshot differs from the one kept");
    if !gone.is_empty() {
        let _ = write!(said, "; {} gone: {}", gone.len(), sample(&gone));
    }
    if !new.is_empty() {
        let _ = write!(said, "; {} new: {}", new.len(), sample(&new));
    }
    if gone.is_empty() && new.is_empty() {
        said.push_str(", in the order of its lines");
    }
    said.push('.');
    said
}

/// What a first-take verdict that needs no second take becomes, writing the
/// baseline when an update asks for it.
fn settle(
    verdict: Verdict,
    exception: Option<&Exception>,
    update: bool,
    baseline: &Path,
    bytes: &[u8],
) -> Outcome<Fate> {
    let budget = exception.filter(|one| one.pixels.is_some());
    Ok(match verdict {
        Verdict::Matched if budget.is_some() => Fate::Spent,
        Verdict::Matched | Verdict::Within(_) if update => Fate::Held,
        Verdict::Matched => Fate::Matched,
        Verdict::Within(measure) => match budget {
            Some(one) => Fate::Tolerated {
                measure,
                reason: match &one.measured {
                    Some(measured) => format!("{} Measured: {measured}", one.reason),
                    None => one.reason.clone(),
                },
            },
            None => Fate::Matched,
        },
        Verdict::Missing if update => {
            write(baseline, bytes)?;
            Fate::Written("it had no baseline")
        }
        Verdict::Missing => Fate::Missing,
        Verdict::Differs(_) | Verdict::Resized { .. } => {
            unreachable!("a difference is taken again before it is settled")
        }
    })
}

/// Writes a capture's boxes into a matching baseline that has none, inside
/// the baseline's own bytes, so its pixels and the rest of the file stay as
/// they were. Nothing when the baseline already carries boxes or the capture
/// has none to give.
fn carry(existing: Option<&[u8]>, capture: &[u8], baseline: &Path) -> Outcome<Option<Fate>> {
    let Some(kept) = existing else {
        return Ok(None);
    };
    match boxes::carry(kept, capture) {
        Some(bytes) => {
            write(baseline, &bytes)?;
            Ok(Some(Fate::Written("it carried no boxes")))
        }
        None => Ok(None),
    }
}

pub(crate) fn write(path: &Path, bytes: &[u8]) -> Outcome<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            Failure::input(
                format!("cannot write {}", path.display()),
                error.to_string().to_lowercase(),
            )
        })?;
    }
    fs::write(path, bytes).map_err(|error| {
        Failure::input(
            format!("cannot write {}", path.display()),
            error.to_string().to_lowercase(),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png(width: u32, height: u32, odd: bool) -> Vec<u8> {
        let mut rgba = [255u8, 255, 255, 255].repeat((width * height) as usize);
        if odd {
            rgba[0..3].copy_from_slice(&[0, 0, 0]);
        }
        image::encode(&image::Image {
            height,
            rgba,
            width,
        })
        .unwrap()
    }

    fn pixel() -> Diff {
        Diff::default()
    }

    #[test]
    fn an_accessibility_difference_names_the_lines_each_side_lacks() {
        let kept = "- heading \"Save\"\n- button \"Save\"\n";
        let taken = "- heading \"Save\"\n- button \"Saved\"\n";
        assert_eq!(
            aria_difference(kept, taken),
            "the accessibility snapshot differs from the one kept; 1 gone: - button \"Save\"; 1 new: - button \"Saved\"."
        );
        assert!(aria_difference("- a\n- b\n", "- b\n- a\n").ends_with("in the order of its lines."));
    }

    #[test]
    fn a_merge_counts_the_shots_with_no_baseline() {
        let folder =
            std::env::temp_dir().join(format!("helix-visual-merge-new-{}", std::process::id()));
        fs::create_dir_all(&folder).unwrap();
        fs::write(
            folder.join("run.json"),
            r#"{"groups": [], "shots": [
                {"entry": "styled/a", "result": "missing", "shot": "wide"},
                {"entry": "styled/a", "result": "missing", "shot": "dark"},
                {"entry": "styled/b", "result": "matched", "shot": "wide"}
            ]}"#,
        )
        .unwrap();
        let (read, groups, _, new) = read_reports(std::slice::from_ref(&folder)).unwrap();
        fs::remove_dir_all(&folder).ok();
        assert_eq!((read, groups.len(), new), (1, 0, 2));
    }

    #[test]
    fn a_state_file_beside_an_entry_goes_to_the_driver() {
        let dir = std::env::temp_dir().join(format!("helix-visual-state-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("menu.html"), "<p>menu</p>").unwrap();
        let config = Config::parse(json!({
            "sources": [{ "kind": "html", "name": "pages", "root": ".", "glob": "{name}.html" }]
        }))
        .unwrap();
        let entry = Entry {
            dir: dir.clone(),
            file: Some(dir.join("menu.html")),
            group: "menu".into(),
            id: "pages/menu".into(),
            name: "menu".into(),
            source: 0,
            stem: "menu".into(),
            sides: None,
            url: None,
        };
        let shots: Vec<&Shot> = config.shots.iter().collect();
        assert!(item(&config, &entry, &shots, true)
            .unwrap()
            .get("state")
            .is_none());
        fs::write(
            dir.join("menu.state.json"),
            r#"{ "version": 1, "entries": [] }"#,
        )
        .unwrap();
        let carried = item(&config, &entry, &shots, true).unwrap();
        assert_eq!(carried["state"], json!({ "version": 1, "entries": [] }));
        fs::write(dir.join("menu.state.json"), "not json").unwrap();
        assert!(item(&config, &entry, &shots, true).is_err());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn no_baseline_is_missing() {
        assert_eq!(
            judge(None, &png(2, 2, false), &pixel(), 0),
            Ok(Verdict::Missing)
        );
    }

    #[test]
    fn equal_bytes_match_without_a_decode() {
        assert_eq!(
            judge(Some(b"same"), b"same", &pixel(), 0),
            Ok(Verdict::Matched)
        );
    }

    #[test]
    fn a_size_change_is_reported_as_one() {
        assert_eq!(
            judge(Some(&png(2, 2, false)), &png(2, 3, false), &pixel(), 0),
            Ok(Verdict::Resized {
                from: (2, 2),
                to: (2, 3)
            })
        );
    }

    #[test]
    fn a_budget_holds_a_difference_within_it() {
        assert_eq!(
            judge(Some(&png(3, 3, false)), &png(3, 3, true), &pixel(), 0),
            Ok(Verdict::Differs(Measure::Pixels(1)))
        );
        assert_eq!(
            judge(Some(&png(3, 3, false)), &png(3, 3, true), &pixel(), 1),
            Ok(Verdict::Within(Measure::Pixels(1)))
        );
    }

    #[test]
    fn the_perceptual_mode_judges_by_similarity() {
        let perceptual = Diff {
            mode: Mode::Perceptual,
            ..Diff::default()
        };
        let Ok(Verdict::Differs(Measure::Similarity { score, .. })) =
            judge(Some(&png(3, 3, false)), &png(3, 3, true), &perceptual, 0)
        else {
            panic!("one black pixel in nine is a structural change");
        };
        assert!(score < 0.99);
        let lenient = Diff {
            ssim: 0.0,
            ..perceptual
        };
        assert!(matches!(
            judge(Some(&png(3, 3, false)), &png(3, 3, true), &lenient, 0),
            Ok(Verdict::Within(_))
        ));
    }

    fn exception(pixels: Option<usize>) -> Exception {
        Exception {
            checks: Vec::new(),
            differs: false,
            entry: "a".to_string(),
            measured: Some("3 pixels on 4 runs".to_string()),
            pixels,
            reason: "why".to_string(),
            shot: None,
            unstable: false,
        }
    }

    #[test]
    fn an_exception_that_stops_differing_is_spent() {
        let at = std::env::temp_dir().join("helix-visual-settle-unused.png");
        assert!(matches!(
            settle(Verdict::Matched, Some(&exception(Some(4))), false, &at, b"").unwrap(),
            Fate::Spent
        ));
        let Fate::Tolerated { reason, .. } = settle(
            Verdict::Within(Measure::Pixels(2)),
            Some(&exception(Some(4))),
            false,
            &at,
            b"",
        )
        .unwrap() else {
            panic!("a difference inside the budget is tolerated");
        };
        assert_eq!(reason, "why Measured: 3 pixels on 4 runs");
        assert!(matches!(
            settle(Verdict::Matched, None, true, &at, b"").unwrap(),
            Fate::Held
        ));
        assert!(Fate::Spent.fails());
        assert!(!Fate::Steadied.fails());
    }

    #[test]
    fn an_update_writes_a_missing_baseline_and_a_test_fails_on_it() {
        let at =
            std::env::temp_dir().join(format!("helix-visual-settle-{}/a.png", std::process::id()));
        assert!(matches!(
            settle(Verdict::Missing, None, false, &at, b"x").unwrap(),
            Fate::Missing
        ));
        assert!(!at.exists());
        assert!(matches!(
            settle(Verdict::Missing, None, true, &at, b"x").unwrap(),
            Fate::Written(_)
        ));
        assert_eq!(fs::read(&at).unwrap(), b"x");
    }
}
