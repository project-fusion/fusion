//! `proof`, the Fusion Proof command line.
//!
//! **A Rust core with capture in Node, decided on October 8, 2026.** This
//! binary holds the config, discovery, sharding, baselines, the environment
//! fingerprint, the codecs, the diff and the report. Chromium is about 94% of
//! the time of a picture, and Playwright drives it with auto-waiting, request
//! routing and media emulation that a client of the browser protocol written
//! here would have to rebuild. So capture goes through the Node driver that
//! ships in the same npm package: driving Chromium from Rust changes the
//! capture code and leaves the capture time the same.
//!
//! **The commands land with the work that makes them true**, so the help text
//! never lists one that does nothing. `compare` is the first, and it needs no
//! browser and no Node.

mod diff;
mod image;

use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use clap::{Parser, Subcommand};
use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;

/// The word every printed line opens with.
const PRODUCT: &str = "proof";

/// The npm package this binary ships in, which is what tells it its version.
const PACKAGE: &str = "@fusion.dev/proof";

/// The per-pixel color threshold a comparison uses unless it is given one:
/// `pixelmatch`'s default, and the value Fusion's baselines were accepted at.
const THRESHOLD: f64 = 0.1;

/// What `--version` prints: the release this binary was installed as, read
/// from the package beside it rather than compiled in. `fusion_rules::version`
/// carries why.
fn shipped() -> &'static str {
    fusion_rules::version::shipped(PACKAGE, env!("CARGO_PKG_VERSION"))
}

#[derive(Debug, Parser)]
#[command(
    name = "proof",
    about = "Visual regression testing with baselines kept in git.",
    version = shipped(),
    /* A bare `proof` prints the help and exits 2, the way a bare `helix` does. */
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
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
            format!("{} is not a PNG proof can read", path.display()),
            why,
        )
    })
}

/// `proof compare`: the answer, printed, and the code that goes with it.
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
        println!(
            "{PRODUCT}: {named}: {}x{} became {}x{}. A size change is a layout change, and no diff \
             image is written because there is nothing to lay one over.",
            before.width, before.height, after.width, after.height
        );
        return Ok(Code::Failed);
    }
    let Some(out) = diff_to else {
        let differing = diff::count(&before, &after, threshold, None);
        return Ok(verdict(&named, differing, None));
    };
    let (differing, marked) = diff::marked(&before, &after, threshold);
    if differing == 0 {
        return Ok(verdict(&named, 0, None));
    }
    let encoded = image::encode(&marked)
        .map_err(|why| Failure::new(Code::Internal, "cannot encode the diff image", why))?;
    fs::write(out, encoded).map_err(|error| {
        Failure::input(
            format!("cannot write {}", out.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    Ok(verdict(&named, differing, Some(out)))
}

fn verdict(named: &str, differing: usize, written: Option<&Path>) -> Code {
    if differing == 0 {
        println!("{PRODUCT}: {named}: every pixel matches.");
        return Code::Ok;
    }
    let pixels = if differing == 1 {
        "pixel differs"
    } else {
        "pixels differ"
    };
    match written {
        Some(path) => println!(
            "{PRODUCT}: {named}: {differing} {pixels}, marked in {}.",
            path.display()
        ),
        None => println!("{PRODUCT}: {named}: {differing} {pixels}."),
    }
    Code::Failed
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let outcome = match &cli.command {
        Command::Compare {
            baseline,
            current,
            diff,
            threshold,
        } => compare(baseline, current, diff.as_deref(), *threshold),
    };
    let code = outcome.unwrap_or_else(|failure| {
        eprintln!("{}", failure.render(PRODUCT));
        failure.code
    });
    /* Every variant is a small non-negative literal, so the narrowing is
    total. */
    ExitCode::from(u8::try_from(code.as_i32()).unwrap_or(1))
}
