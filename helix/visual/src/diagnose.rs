//! `helix diagnostics --once`: each page opened headless, and the installed
//! diagnostics run in it once it holds still.
//!
//! **Here because the browser is here.** The capture driver already starts
//! Chromium through Playwright and waits for a page to hold still, which is
//! what a run of the page diagnostics needs, so the one-shot run asks the same
//! driver rather than shipping a second one.

use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use crate::driver::Driver;

/// What one run of the page diagnostics needs.
pub struct Pages<'a> {
    /// The addresses to open.
    pub urls: &'a [String],
    /// `dist` of the installed `@fusion.dev/helix-diagnostics`.
    pub dist: PathBuf,
    /// Each installed tier's manifest, as `diagnose()` takes it: `{ name, manifest }`.
    pub tiers: Vec<Value>,
    /// The project's `helix-diagnostics.json`, where it has one.
    pub file: Option<Value>,
    /// The property each element holds its ready promise in.
    pub ready: Option<&'a str>,
}

/// Each page's run, in the order asked, or `{ error, url }` for a page that
/// could not be opened or diagnosed.
///
/// # Errors
///
/// Why no browser could be started, lowercase.
pub fn diagnose(from: &Path, pages: &Pages) -> Result<Vec<Value>, String> {
    let mut driver = Driver::start(from)?;
    let answer = driver.ask(&json!({
        "dist": pages.dist,
        "file": pages.file,
        "op": "diagnose",
        "readyProperty": pages.ready,
        "tiers": pages.tiers,
        "urls": pages.urls,
    }));
    driver.close();
    Ok(answer?["runs"].as_array().cloned().unwrap_or_default())
}
