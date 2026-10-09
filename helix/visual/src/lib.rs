//! `helix visual`, Helix's visual tests: a picture of each page, compared with
//! a baseline kept in git.
//!
//! **A library, and `helix` is its one caller.** The `visual` noun is
//! [`Visual`], and `helix` hands it to [`run`] and prints what comes back the
//! way it prints every other noun's answer: the design system and the
//! pictures of it ship as one install, at one version.
//!
//! **A Rust core with capture in Node, decided on October 8, 2026.** This
//! crate holds the config, discovery, sharding, baselines, the environment
//! fingerprint, the codecs, the diff and the report. Chromium is about 94% of
//! the time of a picture, and Playwright drives it with auto-waiting, request
//! routing and media emulation that a client of the browser protocol written
//! here would have to rebuild. So capture goes through the Node driver that
//! ships in `@fusion.dev/helix-cli`, as `visual/driver.mjs`: driving Chromium
//! from Rust changes the capture code and leaves the capture time the same.
//!
//! **The verbs land with the work that makes them true**, so the help text
//! never lists one that does nothing. `compare` needs no browser and no Node;
//! `test` and `update` start the driver once per run.

mod boxes;
mod config;
mod diagnose;
mod diff;
mod discover;
mod driver;
mod fingerprint;
mod harness;
mod image;
mod out;
mod pairs;
mod report;
mod run;
mod shard;
mod sources;
mod triage;

use std::fs;
use std::path::{Path, PathBuf};

use clap::Subcommand;
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::json;

pub use crate::diagnose::{diagnose, Pages};
use crate::out::say;

/// The word every printed line opens with: the command, since this is one of
/// its nouns.
const PRODUCT: &str = "helix";

/// The npm package the binary ships in, which is what tells it its version.
const PACKAGE: &str = "@fusion.dev/helix-cli";

/// The per-pixel color threshold a comparison uses unless it is given one:
/// `pixelmatch`'s default, and the value Fusion's baselines were accepted at.
const THRESHOLD: f64 = 0.1;

/// The release the binary was installed as, which each run's report records:
/// read from the package beside it rather than compiled in.
/// `fusion_rules::version` carries why.
fn shipped() -> &'static str {
    fusion_rules::version::shipped(PACKAGE, env!("CARGO_PKG_VERSION"))
}

/// What `test` and `update` share.
#[derive(Debug, clap::Args)]
pub struct Selection {
    /// A git ref, handed to a pairs source's `prepare`, which decides what
    /// a change since it reaches.
    #[arg(long, value_name = "REF")]
    changed: Option<String>,
    /// The config file. `visual.config.ts`, `.mjs` or `.js` in the working
    /// directory when not given.
    #[arg(long, value_name = "PATH")]
    config: Option<PathBuf>,
    /// Entries to picture, each by its name in every source or by its id,
    /// `source/name`. Every entry when none is given.
    #[arg(value_name = "ENTRY")]
    entries: Vec<String>,
    /// How many shards the run is split into, with `--shard`.
    #[arg(long, value_name = "N", requires = "shard")]
    of: Option<usize>,
    /// Which shard this run takes, counted from 0, with `--of`.
    #[arg(long, value_name = "I", requires = "of")]
    shard: Option<usize>,
    /// How many pages capture at once. Every core but one, and four at most,
    /// when not given.
    #[arg(long, value_name = "N", value_parser = clap::value_parser!(u16).range(1..))]
    workers: Option<u16>,
}

impl Selection {
    fn options(&self, update: bool) -> Outcome<run::Options> {
        let shard = match (self.shard, self.of) {
            (Some(index), Some(of)) => Some(
                shard::Shard::new(index, of)
                    .map_err(|why| Failure::new(Code::Usage, "--shard", why))?,
            ),
            _ => None,
        };
        Ok(run::Options {
            boxes: false,
            changed: self.changed.clone(),
            config: self.config.clone(),
            names: self.entries.clone(),
            shard,
            update,
            workers: self.workers.map(usize::from),
        })
    }
}

/// The verbs of `helix visual`.
#[derive(Debug, Subcommand)]
pub enum Visual {
    /// Picture every entry and compare each shot with its baseline.
    ///
    /// Exits 0 when every shot matches, and 1 when one differs, changed size,
    /// has no baseline, or could not be taken. A difference writes an image of
    /// it beside the baseline. On a platform other than the config's, it says
    /// so and exits 0.
    Test(Selection),
    /// Open the report of the last run, or print its summary.
    ///
    /// Every `test` and `update` writes the report into the config's `report`
    /// directory. `--markdown` prints its summary as Markdown, which a CI job
    /// can append to its summary page.
    Report {
        /// The config file. `visual.config.ts`, `.mjs` or `.js` in the working
        /// directory when not given.
        #[arg(long, value_name = "PATH")]
        config: Option<PathBuf>,
        /// Print the summary as Markdown instead of opening the page.
        #[arg(long)]
        markdown: bool,
    },
    /// Picture every entry and write the baselines the comparison rejects.
    ///
    /// A shot that matches its baseline is left alone, so the files an update
    /// writes are the ones that changed. An update of every entry also writes
    /// the environment fingerprint.
    Update {
        #[command(flatten)]
        selection: Selection,
        /// Also write the element boxes into each matching baseline that has
        /// none, inside its own PNG, so a later change is traced to what it
        /// happened to and how far it moved. Its pixels are left as they are.
        #[arg(long)]
        boxes: bool,
    },
    /// Compare two PNG files pixel by pixel, and fail when they differ.
    ///
    /// Exits 0 when no pixel differs, and 1 when a pixel differs or the two
    /// pictures are different sizes. With `--diff`, a difference also writes an
    /// image of it: the baseline in gray, the differing pixels red, and the
    /// pixels left out as antialiasing yellow.
    Compare {
        /// The picture taken as correct.
        baseline: PathBuf,
        /// The picture to check against it.
        current: PathBuf,
        /// Where to write the image of the difference, when there is one.
        #[arg(long, value_name = "PATH")]
        diff: Option<PathBuf>,
        /// How far apart two colors may be and still count as the same pixel,
        /// from 0 to 1.
        #[arg(long, default_value_t = THRESHOLD, value_parser = threshold)]
        threshold: f64,
    },
}

/// A threshold from 0 to 1, refused outside it.
fn threshold(given: &str) -> Result<f64, String> {
    let value: f64 = given
        .parse()
        .map_err(|_| format!("`{given}` is not a number"))?;
    if (0.0..=1.0).contains(&value) {
        Ok(value)
    } else {
        Err(format!(
            "the threshold is from 0 to 1, and {given} is outside it"
        ))
    }
}

fn read(path: &Path) -> Outcome<image::Image> {
    let bytes = fs::read(path).map_err(|error| {
        Failure::input(
            format!("cannot read {}", path.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    image::decode(&bytes).map_err(|why| {
        Failure::input(
            format!("{} is not a PNG helix can read", path.display()),
            why,
        )
    })
}

/// `helix visual compare`: the answer, printed, and the code that goes with it.
fn compare(
    baseline: &Path,
    current: &Path,
    diff_to: Option<&Path>,
    threshold: f64,
) -> Outcome<Code> {
    let before = read(baseline)?;
    let after = read(current)?;
    let named = format!("{} against {}", current.display(), baseline.display());
    if before.width != after.width || before.height != after.height {
        say!(
            "{PRODUCT}: {named}: {}x{} became {}x{}. A size change is a layout change, and no diff \
             image is written because there is nothing to lay one over.",
            before.width, before.height, after.width, after.height
        );
        if out::json() {
            println!(
                "{}",
                json!({
                    "baseline": baseline,
                    "current": current,
                    "matches": false,
                    "size": {
                        "baseline": [before.width, before.height],
                        "current": [after.width, after.height],
                    },
                })
            );
        }
        return Ok(Code::Failed);
    }
    let Some(out) = diff_to else {
        let differing = diff::count(&before, &after, threshold, None);
        return Ok(verdict(baseline, current, differing, None));
    };
    let (differing, marked) = diff::marked(&before, &after, threshold);
    if differing == 0 {
        return Ok(verdict(baseline, current, 0, None));
    }
    let encoded = image::encode(&marked)
        .map_err(|why| Failure::new(Code::Internal, "cannot encode the diff image", why))?;
    fs::write(out, encoded).map_err(|error| {
        Failure::input(
            format!("cannot write {}", out.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    Ok(verdict(baseline, current, differing, Some(out)))
}

/// The answer to `compare`, as a sentence and under `--json` as an object.
fn verdict(baseline: &Path, current: &Path, differing: usize, written: Option<&Path>) -> Code {
    if out::json() {
        println!(
            "{}",
            json!({
                "baseline": baseline,
                "current": current,
                "diff": written,
                "differing": differing,
                "matches": differing == 0,
            })
        );
    }
    let named = format!("{} against {}", current.display(), baseline.display());
    if differing == 0 {
        say!("{PRODUCT}: {named}: every pixel matches.");
        return Code::Ok;
    }
    let pixels = if differing == 1 {
        "pixel differs"
    } else {
        "pixels differ"
    };
    match written {
        Some(path) => say!(
            "{PRODUCT}: {named}: {differing} {pixels}, marked in {}.",
            path.display()
        ),
        None => say!("{PRODUCT}: {named}: {differing} {pixels}."),
    }
    Code::Failed
}

/// Runs one verb of `helix visual`, and answers with the exit code it earned.
///
/// # Errors
///
/// A failure `helix` prints in its own format: a config that cannot be read,
/// a driver that cannot start, a picture that cannot be written.
///
/// With `json`, stdout holds one JSON document and the sentences go to
/// stderr: `test` and `update` print the run's record, which is `run.json`,
/// `report` prints the last one, and `compare` prints its answer.
pub fn run(verb: &Visual, json: bool) -> Outcome<Code> {
    out::claim(json);
    match verb {
        Visual::Compare {
            baseline,
            current,
            diff,
            threshold,
        } => compare(baseline, current, diff.as_deref(), *threshold),
        Visual::Report { config, markdown } => run::open_report(config.as_deref(), *markdown),
        Visual::Test(selection) => selection
            .options(false)
            .and_then(|options| run::run(&options)),
        Visual::Update { selection, boxes } => selection.options(true).and_then(|mut options| {
            options.boxes = *boxes;
            run::run(&options)
        }),
    }
}
