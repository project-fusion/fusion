//! The environment a set of baselines was taken in, kept beside them.
//!
//! **The environment is part of the baseline.** Text rasterization differs by
//! platform, and on one platform it differs by the fonts installed: the
//! Playwright Docker image moved 254 of Fusion's pictures against baselines
//! taken on `ubuntu-latest`. A comparison across environments reports hundreds
//! of differences that say nothing about the pages, so a run on a different
//! environment stops with one sentence naming what differs.
//!
//! **Four facts, each one that changes a picture.** The platform, the
//! operating system's release, the browser's version, and a hash of the fonts
//! installed. The runner image's own build number is left out: it moves every
//! week, and nothing a page draws moves with it.

use std::fmt::Write as _;
use std::process::Command;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Fingerprint {
    pub browser: String,
    pub fonts: String,
    pub os: String,
    pub platform: String,
}

impl Fingerprint {
    /// This machine, with the browser the driver launched.
    pub fn here(browser: &str) -> Self {
        Self {
            browser: browser.to_string(),
            fonts: fonts(),
            os: os(),
            platform: std::env::consts::OS.to_string(),
        }
    }

    /// One clause for each fact that differs from `taken`, empty when none
    /// does.
    pub fn differences(&self, taken: &Self) -> Vec<String> {
        let mut out = Vec::new();
        let mut compare = |what: &str, was: &str, is: &str| {
            if was != is {
                out.push(format!("{what} was {was} and is {is}"));
            }
        };
        compare("the platform", &taken.platform, &self.platform);
        compare("the operating system", &taken.os, &self.os);
        compare("the browser", &taken.browser, &self.browser);
        compare("the font list", &taken.fonts, &self.fonts);
        out
    }

    /// The file's text: sorted keys, two-space indents and a final newline,
    /// so a retake that changes nothing writes the same bytes.
    pub fn to_text(&self) -> String {
        let mut text = serde_json::to_string_pretty(self).unwrap_or_default();
        text.push('\n');
        text
    }
}

/// The release in `/etc/os-release`, `ubuntu 24.04`, or the platform alone
/// where there is no such file.
fn os() -> String {
    let Ok(text) = std::fs::read_to_string("/etc/os-release") else {
        return std::env::consts::OS.to_string();
    };
    let field = |key: &str| {
        text.lines()
            .find_map(|line| line.strip_prefix(key)?.strip_prefix('='))
            .map(|value| value.trim_matches('"').to_string())
    };
    match (field("ID"), field("VERSION_ID")) {
        (Some(id), Some(version)) => format!("{id} {version}"),
        (Some(id), None) => id,
        _ => std::env::consts::OS.to_string(),
    }
}

/// A hash of every font fontconfig lists, by family, style, version and file
/// name, sorted. `none listed` where `fc-list` cannot run, which is the same
/// answer on every run of that machine.
fn fonts() -> String {
    let Ok(listed) = Command::new("fc-list")
        .arg("--format=%{family}|%{style}|%{fontversion}|%{file}\n")
        .output()
    else {
        return "none listed".to_string();
    };
    if !listed.status.success() {
        return "none listed".to_string();
    }
    let text = String::from_utf8_lossy(&listed.stdout);
    let mut lines: Vec<String> = text
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            /* The file's name and not its directory, so a font installed under
            another prefix is the same font. */
            match line.rsplit_once('|') {
                Some((head, file)) => format!("{head}|{}", file.rsplit('/').next().unwrap_or(file)),
                None => line.to_string(),
            }
        })
        .collect();
    lines.sort();
    lines.dedup();
    let count = lines.len();
    format!("{count} fonts, {}", fnv(&lines.join("\n")))
}

/// FNV-1a over 64 bits, as hex. A fingerprint asks whether two lists are the
/// same list, and nothing here needs a cryptographic hash to answer that.
fn fnv(text: &str) -> String {
    let hash = text.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(0x0100_0000_01b3)
    });
    let mut out = String::new();
    let _ = write!(out, "{hash:016x}");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn taken() -> Fingerprint {
        Fingerprint {
            browser: "chromium 140.0.7339.16".to_string(),
            fonts: "112 fonts, 00ff".to_string(),
            os: "ubuntu 24.04".to_string(),
            platform: "linux".to_string(),
        }
    }

    #[test]
    fn the_same_environment_differs_in_nothing() {
        assert!(taken().differences(&taken()).is_empty());
    }

    #[test]
    fn each_difference_is_named_with_both_values() {
        let mut here = taken();
        here.browser = "chromium 141.0.1".to_string();
        here.fonts = "113 fonts, 0aaa".to_string();
        assert_eq!(
            here.differences(&taken()),
            [
                "the browser was chromium 140.0.7339.16 and is chromium 141.0.1",
                "the font list was 112 fonts, 00ff and is 113 fonts, 0aaa",
            ]
        );
    }

    #[test]
    fn the_file_is_stable_text() {
        let text = taken().to_text();
        assert!(text.starts_with("{\n  \"browser\""));
        assert!(text.ends_with("}\n"));
        assert_eq!(serde_json::from_str::<Fingerprint>(&text).unwrap(), taken());
    }

    #[test]
    fn the_hash_is_fnv() {
        assert_eq!(fnv(""), "cbf29ce484222325");
        assert_eq!(fnv("a"), "af63dc4c8601ec8c");
    }
}
