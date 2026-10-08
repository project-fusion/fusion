//! `proof test` and `proof update`: discover, picture, compare, report.
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
//!
//! **Every run states what it compared and what it skipped in the line that
//! gives the verdict**, because a count alone reads as the whole corpus.

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use base64::Engine as _;
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::{json, Value};

use crate::config::{Config, Exception, Platform, Shot, Source};
use crate::diff;
use crate::discover::{self, Entry};
use crate::driver::Driver;
use crate::fingerprint::Fingerprint;
use crate::harness;
use crate::image;
use crate::shard::{self, Shard};

/// The config file names looked for, in order, when none is given.
const NAMES: [&str; 3] = ["proof.config.ts", "proof.config.mjs", "proof.config.js"];

/// What the command line asked for.
pub struct Options {
    pub config: Option<PathBuf>,
    pub names: Vec<String>,
    pub shard: Option<Shard>,
    pub update: bool,
    pub workers: Option<usize>,
}

/// What became of one shot.
#[derive(Debug)]
enum Fate {
    /// The capture failed, and why.
    Broken(String),
    Differs {
        differing: usize,
        marked: PathBuf,
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
    Tolerated(usize),
    /// An update wrote it, and why.
    Written(&'static str),
}

impl Fate {
    fn fails(&self) -> bool {
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
enum Verdict {
    Matched,
    Missing,
    Resized { from: (u32, u32), to: (u32, u32) },
    Differs(usize),
    Within(usize),
}

/// Compares a capture with its baseline, allowing `allowed` pixels.
fn judge(
    baseline: Option<&[u8]>,
    current: &[u8],
    threshold: f64,
    allowed: usize,
) -> std::result::Result<Verdict, String> {
    let Some(baseline) = baseline else {
        return Ok(Verdict::Missing);
    };
    if baseline == current {
        return Ok(Verdict::Matched);
    }
    let before = image::decode(baseline)
        .map_err(|why| format!("the baseline is not a PNG proof can read: {why}"))?;
    let after = image::decode(current)
        .map_err(|why| format!("the capture is not a PNG proof can read: {why}"))?;
    if (before.width, before.height) != (after.width, after.height) {
        return Ok(Verdict::Resized {
            from: (before.width, before.height),
            to: (after.width, after.height),
        });
    }
    let differing = diff::count(&before, &after, threshold, None);
    Ok(match differing {
        0 => Verdict::Matched,
        n if n <= allowed => Verdict::Within(n),
        n => Verdict::Differs(n),
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
                .hint("write a proof.config.ts, or name one with --config")
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

/// Every entry each source's glob matches, in config order and then by path.
fn entries(config: &Config, base: &Path) -> Outcome<Vec<Entry>> {
    let mut out: Vec<Entry> = Vec::new();
    for (index, source) in config.sources.iter().enumerate() {
        let Source::Html(html) = source;
        let root = base.join(&html.root);
        let found = discover::matches(&root, &html.glob)
            .map_err(|why| Failure::input(format!("the source `{}`", html.name), why))?;
        for (name, file) in found {
            let id = format!("{}/{name}", html.name);
            if out.iter().any(|entry| entry.id == id) {
                return Err(Failure::input(
                    format!("the source `{}`", html.name),
                    format!("two files are named `{id}`"),
                ));
            }
            out.push(Entry {
                dir: file.parent().map(Path::to_path_buf).unwrap_or_default(),
                stem: file
                    .file_stem()
                    .map(|stem| stem.to_string_lossy().into_owned())
                    .unwrap_or_default(),
                file,
                id,
                name,
                source: index,
            });
        }
    }
    if out.is_empty() {
        return Err(Failure::input("the sources", "their globs match no file"));
    }
    Ok(out)
}

fn exception_for<'a>(
    exceptions: &'a [Exception],
    entry: &Entry,
    shot: &Shot,
) -> Option<&'a Exception> {
    exceptions.iter().find(|one| {
        (one.entry == entry.id || one.entry == entry.name)
            && one.shot.as_ref().is_none_or(|name| *name == shot.name)
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

/// One shot in the shape the driver takes.
fn shot_request(config: &Config, entry: &Entry, shot: &Shot) -> Value {
    let Source::Html(html) = &config.sources[entry.source];
    json!({
        "harness": html.harness.resolved().map(|harness| harness::css(&harness, shot)),
        "height": shot.height,
        "name": shot.name,
        "scheme": shot.scheme.as_str(),
        "width": shot.width,
    })
}

/// One entry, with the shots to take of it, in the shape the driver takes.
fn item(config: &Config, entry: &Entry, shots: &[&Shot], inspect: bool) -> Outcome<Value> {
    let Source::Html(html) = &config.sources[entry.source];
    let body = fs::read_to_string(&entry.file).map_err(|error| {
        Failure::input(
            format!("cannot read {}", entry.file.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    let first = shots[0];
    let page = harness::document(
        &entry.id,
        &html.styles,
        &html.scripts,
        html.harness
            .resolved()
            .map(|harness| harness::css(&harness, first))
            .as_deref(),
        &body,
    );
    let files: BTreeMap<&String, String> = html
        .files
        .iter()
        .map(|(asked, file)| (asked, file.replace("{stem}", &entry.stem)))
        .collect();
    Ok(json!({
        "dir": entry.dir,
        "entry": { "file": entry.file, "id": entry.id, "name": entry.name, "source": html.name },
        "files": files,
        "html": page,
        "inspect": inspect,
        "key": entry.id,
        "path": format!("/{}/", entry.id),
        "shots": shots.iter().map(|shot| shot_request(config, entry, shot)).collect::<Vec<_>>(),
    }))
}

/// The pictures one capture request produced, by entry and shot index, with
/// the seconds each entry took and the failures the driver reported.
struct Captured {
    broken: BTreeMap<usize, String>,
    pictures: BTreeMap<(usize, usize), Vec<u8>>,
    seconds: BTreeMap<usize, f64>,
}

/// Sends a capture and reads every line it streams back.
fn capture(
    driver: &mut Driver,
    items: &[Value],
    keys: &BTreeMap<String, usize>,
    shots: &[Shot],
    ready: Option<&str>,
) -> Outcome<Captured> {
    let internal = |why: String| Failure::new(Code::Internal, "the driver", why);
    driver
        .send(&json!({ "items": items, "op": "capture", "readyProperty": ready }))
        .map_err(internal)?;
    let mut captured = Captured {
        broken: BTreeMap::new(),
        pictures: BTreeMap::new(),
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
            }
            _ => {
                return Err(internal(format!(
                    "an answer this binary does not know: {line}"
                )))
            }
        }
    }
}

fn plural(count: usize, one: &str, many: &str) -> String {
    format!("{count} {}", if count == 1 { one } else { many })
}

/// The command, start to finish.
#[allow(clippy::too_many_lines)] // One sequence a reader follows top to bottom.
pub fn run(options: &Options) -> Outcome<Code> {
    let path = find(options.config.as_deref())?;
    let base = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let internal = |why: String| Failure::new(Code::Internal, "the driver", why);

    let mut driver = Driver::start(&base)
        .map_err(|why| Failure::input("cannot start the capture driver", why))?;
    let answered = driver
        .ask(&json!({ "op": "config", "path": path }))
        .map_err(|why| Failure::input(format!("cannot load {}", relative(&base, &path)), why))?;
    let config = Config::parse(answered["config"].clone())
        .map_err(|why| Failure::input(relative(&base, &path), why))?;

    if config.platform == Platform::Linux && std::env::consts::OS != "linux" {
        println!(
            "proof: skipped on {}. Baselines are taken and compared on linux, because text rasterization and \
             antialiasing differ by platform, so a comparison across them would differ on nearly every glyph.",
            std::env::consts::OS
        );
        driver.close();
        return Ok(Code::Ok);
    }

    let every = entries(&config, &base)?;
    for exception in &config.exceptions {
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
            .any(|entry| entry.id == *name || entry.name == *name)
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
                    .any(|name| *name == entry.id || *name == entry.name)
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
                *weights.entry(entry.name.clone()).or_default() += config.shard.per_shot * shots;
            }
            for (name, weight) in &mut weights {
                if let Some(measured) = config.shard.cost.get(name) {
                    *weight = *measured;
                }
            }
            let placed = shard::assign(&weights, asked.of);
            named
                .into_iter()
                .filter(|entry| placed.get(&entry.name) == Some(&asked.index))
                .collect()
        }
    };
    let scope = match (&options.shard, options.names.is_empty()) {
        (Some(asked), _) => format!(", in {}", asked.label()),
        (None, false) => format!(", named {}", options.names.join(", ")),
        (None, true) => String::new(),
    };
    if mine.is_empty() {
        println!(
            "proof: {} holds none of the entries, which the other shards picture.",
            options.shard.map(Shard::label).unwrap_or_default()
        );
        driver.close();
        return Ok(Code::Ok);
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
    let started = driver
        .ask(&json!({
            "network": match config.network { crate::config::Network::Origin => "origin", crate::config::Network::Open => "open" },
            "op": "start",
            "serve": serve,
            "workers": workers,
        }))
        .map_err(|why| Failure::input("cannot start the browser", why))?;
    let here = Fingerprint::here(started["browser"].as_str().unwrap_or("unknown"));

    let whole = options.names.is_empty() && options.shard.is_none();
    let retake = config
        .retake
        .clone()
        .unwrap_or_else(|| "Retake them with `proof update` where the baselines are taken, and review the pictures it writes.".to_string());
    let differences = recorded.as_ref().map(|taken| here.differences(taken));
    let mut write_fingerprint = false;
    match (&differences, options.update) {
        (Some(found), _) if found.is_empty() => {}
        (_, true) if whole => write_fingerprint = true,
        (None, true) => {
            println!(
                "proof: there is no environment fingerprint at {}, and a retake of part of the set cannot \
                 write one for all of it. Retake every entry.",
                relative(&base, &fingerprint_path)
            );
            driver.close();
            return Ok(Code::Failed);
        }
        (Some(found), true) => {
            println!(
                "proof: the environment differs from the one the baselines were taken in: {}. A retake of part \
                 of the set would mix two environments. Retake every entry.",
                found.join(", ")
            );
            driver.close();
            return Ok(Code::Failed);
        }
        (None, false) => {
            println!(
                "proof: there is no environment fingerprint at {}, so nothing says where the baselines were \
                 taken. {retake}",
                relative(&base, &fingerprint_path)
            );
            driver.close();
            return Ok(Code::Failed);
        }
        (Some(found), false) => {
            println!(
                "proof: the environment differs from the one the baselines were taken in: {}. The pictures \
                 would differ for that reason alone, so nothing was compared. {retake}",
                found.join(", ")
            );
            driver.close();
            return Ok(Code::Failed);
        }
    }

    let keys: BTreeMap<String, usize> = mine
        .iter()
        .enumerate()
        .map(|(at, entry)| (entry.id.clone(), at))
        .collect();
    let ready = config.settle.ready_property.as_deref();
    let mut items = Vec::new();
    for entry in &mine {
        let shots: Vec<&Shot> = taken(entry)
            .into_iter()
            .map(|at| &config.shots[at])
            .collect();
        if !shots.is_empty() {
            items.push(item(&config, entry, &shots, config.inspect)?);
        }
    }
    let first = capture(&mut driver, &items, &keys, &config.shots, ready)?;

    let mut results: BTreeMap<(usize, usize), Fate> = BTreeMap::new();
    let mut again: Vec<(usize, usize)> = Vec::new();
    for (at, entry) in mine.iter().enumerate() {
        for shot in taken(entry) {
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
            let (baseline, _) = paths(entry, &config.shots[shot]);
            let exception = exception_for(&config.exceptions, entry, &config.shots[shot]);
            let allowed = exception
                .and_then(|one| one.pixels)
                .unwrap_or(config.diff.pixels);
            let existing = fs::read(&baseline).ok();
            match judge(existing.as_deref(), bytes, config.diff.threshold, allowed) {
                Err(why) => {
                    results.insert((at, shot), Fate::Broken(why));
                }
                Ok(Verdict::Differs(_) | Verdict::Resized { .. }) => again.push((at, shot)),
                Ok(verdict) => {
                    let result = settle(verdict, exception, options.update, &baseline, bytes)?;
                    results.insert((at, shot), result);
                }
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
            one["key"] = Value::String(key.clone());
            retake_keys.insert(key, at);
            items.push(one);
        }
        let second = capture(&mut driver, &items, &retake_keys, &config.shots, ready)?;
        for &(at, shot) in &again {
            let entry = mine[at];
            let picture = &config.shots[shot];
            let (baseline, marked) = paths(entry, picture);
            let exception = exception_for(&config.exceptions, entry, picture);
            let allowed = exception
                .and_then(|one| one.pixels)
                .unwrap_or(config.diff.pixels);
            let existing = fs::read(&baseline).ok();
            let result = match (second.broken.get(&at), second.pictures.get(&(at, shot))) {
                (Some(why), _) => Fate::Broken(why.clone()),
                (None, None) => {
                    Fate::Broken("the driver returned no picture on the second take".to_string())
                }
                (None, Some(bytes)) => {
                    match judge(existing.as_deref(), bytes, config.diff.threshold, allowed) {
                        Err(why) => Fate::Broken(why),
                        Ok(Verdict::Matched | Verdict::Within(_)) if options.update => Fate::Held,
                        Ok(Verdict::Matched | Verdict::Within(_)) => Fate::Steadied,
                        Ok(_) if options.update => {
                            write(&baseline, bytes)?;
                            Fate::Written("it differs")
                        }
                        Ok(Verdict::Resized { from, to }) => Fate::Resized { from, to },
                        Ok(Verdict::Differs(differing)) => {
                            let before = image::decode(existing.as_deref().unwrap_or_default())
                                .map_err(|why| internal(why.clone()))?;
                            let after = image::decode(bytes).map_err(internal)?;
                            let (_, drawn) = diff::marked(&before, &after, config.diff.threshold);
                            let encoded = image::encode(&drawn).map_err(internal)?;
                            write(&marked, &encoded)?;
                            Fate::Differs { differing, marked }
                        }
                        Ok(Verdict::Missing) => Fate::Missing,
                    }
                }
            };
            results.insert((at, shot), result);
        }
    }

    let inspected_failed = if config.inspect {
        let finished = driver
            .ask(&json!({ "op": "finish", "update": options.update }))
            .map_err(|why| Failure::new(Code::Failed, "the config's inspect", why))?;
        finished["failed"].as_bool().unwrap_or(false)
    } else {
        false
    };
    driver.close();

    if let Some(timings) = &config.timings {
        let mut by_name: BTreeMap<&str, f64> = BTreeMap::new();
        for (at, seconds) in &first.seconds {
            *by_name.entry(mine[*at].name.as_str()).or_default() += seconds;
        }
        let text = serde_json::to_string_pretty(&by_name).unwrap_or_default() + "\n";
        let target = base.join(timings);
        if let Some(parent) = target.parent() {
            let _ = fs::create_dir_all(parent);
        }
        write(&target, text.as_bytes())?;
    }

    /* The diff image of a shot that no longer differs is from a run that is
    over, and uploading it would show a failure that is not this one. */
    for (&(at, shot), result) in &results {
        if !matches!(result, Fate::Differs { .. }) {
            let (_, marked) = paths(mine[at], &config.shots[shot]);
            let _ = fs::remove_file(marked);
        }
    }

    if write_fingerprint {
        write(&fingerprint_path, here.to_text().as_bytes())?;
    }

    Ok(report(
        &config,
        &base,
        &mine,
        &results,
        options.update,
        &scope,
        &retake,
        write_fingerprint,
        inspected_failed,
    ))
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
    let budget = exception.and_then(|one| one.pixels).is_some();
    Ok(match verdict {
        Verdict::Matched if budget => Fate::Spent,
        Verdict::Matched | Verdict::Within(_) if update => Fate::Held,
        Verdict::Matched => Fate::Matched,
        Verdict::Within(differing) => {
            if budget {
                Fate::Tolerated(differing)
            } else {
                Fate::Matched
            }
        }
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

fn write(path: &Path, bytes: &[u8]) -> Outcome<()> {
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

/// Prints what the run found and returns its code.
#[allow(clippy::too_many_arguments, clippy::too_many_lines)] // The run's whole state, read once.
fn report(
    config: &Config,
    base: &Path,
    mine: &[&Entry],
    results: &BTreeMap<(usize, usize), Fate>,
    update: bool,
    scope: &str,
    retake: &str,
    wrote_fingerprint: bool,
    inspected_failed: bool,
) -> Code {
    let named = |at: usize, shot: usize| format!("{}, {}", mine[at].id, config.shots[shot].name);
    let mut lines = Vec::new();
    let mut notes = Vec::new();
    let mut written = Vec::new();
    let mut held = 0;
    let mut by_source: BTreeMap<&str, usize> = BTreeMap::new();
    for (&(at, shot), result) in results {
        *by_source
            .entry(config.sources[mine[at].source].name())
            .or_default() += 1;
        let what = named(at, shot);
        match result {
            Fate::Broken(why) => lines.push(format!("{what}: {why}")),
            Fate::Differs { differing, marked } => lines.push(format!(
                "{what}: {} on two takes, marked in {}.",
                plural(*differing, "pixel differs", "pixels differ"),
                relative(base, marked)
            )),
            Fate::Missing => lines.push(format!("{what}: no baseline.")),
            Fate::Resized { from, to } => lines.push(format!(
                "{what}: {}x{} became {}x{}. A size change is a layout change, and no diff image is written \
                 because there is nothing to lay one over.",
                from.0, from.1, to.0, to.1
            )),
            Fate::Spent => lines.push(format!(
                "{what}: matches its baseline, so its exception is spent. Remove it from the config."
            )),
            Fate::Steadied => notes.push(format!(
                "{what}: differed on the first take and matched on the second. A picture that needs a second \
                 take is not holding still: make it settle, or mark it unstable with the reason."
            )),
            Fate::Tolerated(differing) => {
                let exception = exception_for(&config.exceptions, mine[at], &config.shots[shot]);
                let reason = exception.map(|one| one.reason.as_str()).unwrap_or_default();
                let measured = exception.and_then(|one| one.measured.as_deref()).map(|text| format!(" Measured: {text}")).unwrap_or_default();
                let budget = exception.and_then(|one| one.pixels).unwrap_or_default();
                notes.push(format!("{what}: {differing} of the {budget} pixels its exception allows differ. {reason}{measured}"));
            }
            Fate::Held => held += 1,
            Fate::Written(why) => written.push(format!("{what} ({why})")),
            Fate::Matched => {}
        }
    }

    let mut skipped = Vec::new();
    for entry in mine {
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
    let skipped = if skipped.is_empty() {
        "Skipped none.".to_string()
    } else {
        format!(
            "Skipped {} as unstable: {}.",
            plural(skipped.len(), "shot", "shots"),
            skipped.join("; ")
        )
    };
    let total = results.len();
    let sources = by_source
        .iter()
        .map(|(name, count)| format!("{name} {count}"))
        .collect::<Vec<_>>()
        .join(", ");
    let counted = format!(
        "{} of {} ({sources})",
        plural(total, "shot", "shots"),
        plural(mine.len(), "entry", "entries")
    );

    for note in &notes {
        println!("proof: {note}");
    }
    let failed = results.values().any(Fate::fails) || inspected_failed;
    if !lines.is_empty() {
        println!("\n  {}\n", lines.join("\n  "));
    }

    let mut verdict = String::new();
    if update {
        let _ = write!(
            verdict,
            "proof: wrote {} of {total} baselines{scope}",
            written.len()
        );
        if !written.is_empty() && written.len() <= 12 {
            let _ = write!(verdict, ": {}", written.join(", "));
        }
        let _ = write!(verdict, ". {held} already match and were left alone.");
        if wrote_fingerprint {
            let _ = write!(
                verdict,
                " Wrote the environment fingerprint to {}.",
                relative(base, &base.join(&config.fingerprint))
            );
        }
        if !lines.is_empty() {
            let _ = write!(
                verdict,
                " {} could not be taken, listed above.",
                plural(lines.len(), "shot", "shots")
            );
        }
        let _ = write!(verdict, " {skipped}");
        println!("{verdict}");
        if !written.is_empty() {
            println!("proof: review each written picture before committing it. A baseline records whatever was on screen as correct.");
        }
    } else if lines.is_empty() {
        println!("proof: compared {counted}{scope}, and every one matches its baseline. {skipped}");
    } else {
        println!(
            "proof: {} of {counted}{scope}{} {} not match {}, listed above. {skipped}",
            lines.len(),
            if scope.is_empty() { "" } else { "," },
            if lines.len() == 1 { "does" } else { "do" },
            if lines.len() == 1 {
                "its baseline"
            } else {
                "their baselines"
            },
        );
        println!("proof: if the change was meant, retake the baselines. {retake}");
    }
    if inspected_failed {
        println!("proof: the config's inspect reported a failure, above.");
    }
    if failed {
        Code::Failed
    } else {
        Code::Ok
    }
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

    #[test]
    fn no_baseline_is_missing() {
        assert_eq!(judge(None, &png(2, 2, false), 0.1, 0), Ok(Verdict::Missing));
    }

    #[test]
    fn equal_bytes_match_without_a_decode() {
        assert_eq!(judge(Some(b"same"), b"same", 0.1, 0), Ok(Verdict::Matched));
    }

    #[test]
    fn a_size_change_is_reported_as_one() {
        assert_eq!(
            judge(Some(&png(2, 2, false)), &png(2, 3, false), 0.1, 0),
            Ok(Verdict::Resized {
                from: (2, 2),
                to: (2, 3)
            })
        );
    }

    #[test]
    fn a_budget_holds_a_difference_within_it() {
        assert_eq!(
            judge(Some(&png(3, 3, false)), &png(3, 3, true), 0.1, 0),
            Ok(Verdict::Differs(1))
        );
        assert_eq!(
            judge(Some(&png(3, 3, false)), &png(3, 3, true), 0.1, 1),
            Ok(Verdict::Within(1))
        );
    }

    fn exception(pixels: Option<usize>) -> Exception {
        Exception {
            entry: "a".to_string(),
            measured: None,
            pixels,
            reason: "why".to_string(),
            shot: None,
            unstable: false,
        }
    }

    #[test]
    fn an_exception_that_stops_differing_is_spent() {
        let at = std::env::temp_dir().join("proof-settle-unused.png");
        assert!(matches!(
            settle(Verdict::Matched, Some(&exception(Some(4))), false, &at, b"").unwrap(),
            Fate::Spent
        ));
        assert!(matches!(
            settle(
                Verdict::Within(2),
                Some(&exception(Some(4))),
                false,
                &at,
                b""
            )
            .unwrap(),
            Fate::Tolerated(2)
        ));
        assert!(matches!(
            settle(Verdict::Matched, None, true, &at, b"").unwrap(),
            Fate::Held
        ));
        assert!(Fate::Spent.fails());
        assert!(!Fate::Steadied.fails());
    }

    #[test]
    fn an_update_writes_a_missing_baseline_and_a_test_fails_on_it() {
        let at = std::env::temp_dir().join(format!("proof-settle-{}/a.png", std::process::id()));
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
