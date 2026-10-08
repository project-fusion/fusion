//! The config, as the driver hands it over.
//!
//! **`proof.config.ts` is TypeScript, and the binary reads it as JSON.** The
//! driver imports the file, so a config can compute its values and name
//! functions, and hands this binary every value as JSON. The functions stay in
//! the driver, which is where they run: `inspect` is reported here only as
//! whether it was given.
//!
//! **Unknown keys are refused.** A typo such as `shot` for `shots` would
//! otherwise be a default taken silently, and the run would picture something
//! other than what the file says.

use std::collections::BTreeMap;

use serde::Deserialize;

/// The whole file.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Config {
    #[serde(default)]
    pub diff: Diff,
    #[serde(default)]
    pub exceptions: Vec<Exception>,
    /// Where the environment fingerprint is kept, relative to the config.
    #[serde(default = "fingerprint")]
    pub fingerprint: String,
    /// Whether the config gave an `inspect` function, which the driver runs on
    /// the page after an entry's first shot.
    #[serde(default)]
    pub inspect: bool,
    #[serde(default)]
    pub network: Network,
    #[serde(default)]
    pub platform: Platform,
    /// How this project retakes its baselines, said when a run fails.
    pub retake: Option<String>,
    /// URL paths the harness serves from disk, relative to the config. A path
    /// ending in `/` serves a directory.
    #[serde(default)]
    pub serve: BTreeMap<String, String>,
    #[serde(default)]
    pub settle: Settle,
    #[serde(default)]
    pub shard: Shard,
    #[serde(default = "shots")]
    pub shots: Vec<Shot>,
    pub sources: Vec<Source>,
    /// Where to write the seconds each entry name took, when set.
    pub timings: Option<String>,
}

fn fingerprint() -> String {
    "proof.fingerprint.json".to_string()
}

/// A wide width, a phone width, and dark, which is what the lessons say a
/// project wants pictured when it says nothing.
fn shots() -> Vec<Shot> {
    vec![
        Shot::new("wide", 1280, Scheme::Light),
        Shot::new("phone", 390, Scheme::Light),
        Shot::new("dark", 1280, Scheme::Dark),
    ]
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Diff {
    /// How many pixels may differ before a shot fails. Zero, because a single
    /// moved pixel is the fault this exists to catch.
    #[serde(default)]
    pub pixels: usize,
    /// How far apart two colors may be and still be the same pixel, 0 to 1.
    #[serde(default = "threshold")]
    pub threshold: f64,
}

impl Default for Diff {
    fn default() -> Self {
        Self {
            pixels: 0,
            threshold: threshold(),
        }
    }
}

fn threshold() -> f64 {
    crate::THRESHOLD
}

/// One exception to the comparison, with the reason it exists.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Exception {
    /// An entry's id, `styled/aura`, or its name in every source, `aura`.
    pub entry: String,
    /// What was measured to justify it, said beside it in every run.
    pub measured: Option<String>,
    /// How many pixels this shot may differ by. An exception whose shot stops
    /// differing is spent, and fails the run.
    pub pixels: Option<usize>,
    pub reason: String,
    /// One shot by name, or every shot of the entry.
    pub shot: Option<String>,
    /// A surface that cannot hold still: never pictured, and named in every
    /// run as skipped.
    #[serde(default)]
    pub unstable: bool,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Network {
    /// Every request off the harness origin is refused.
    #[default]
    Origin,
    /// Requests go wherever they ask, and a baseline records what came back.
    Open,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    /// Baselines are taken and compared on Linux, and a run elsewhere skips.
    #[default]
    Linux,
    /// Compared wherever the run is.
    Any,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Settle {
    /// A property each element may carry holding a promise that resolves when
    /// it has finished rendering, awaited before every shot.
    pub ready_property: Option<String>,
}

/// What the shards are packed by.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Shard {
    /// Measured seconds by entry name.
    #[serde(default)]
    pub cost: BTreeMap<String, f64>,
    /// Seconds a shot is taken to cost where `cost` names nothing.
    #[serde(default = "per_shot")]
    pub per_shot: f64,
}

impl Default for Shard {
    fn default() -> Self {
        Self {
            cost: BTreeMap::new(),
            per_shot: per_shot(),
        }
    }
}

fn per_shot() -> f64 {
    1.0
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Scheme {
    Light,
    Dark,
}

impl Scheme {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Light => "light",
            Self::Dark => "dark",
        }
    }
}

/// One picture of every entry.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Shot {
    /// The viewport's height. The picture is the full page whatever it is.
    #[serde(default = "height")]
    pub height: u32,
    pub name: String,
    pub scheme: Scheme,
    /// What the baseline's file name carries after its stem: `.phone` for a
    /// shot named `phone` unless this says otherwise.
    pub suffix: Option<String>,
    pub width: u32,
}

impl Shot {
    fn new(name: &str, width: u32, scheme: Scheme) -> Self {
        Self {
            height: height(),
            name: name.to_string(),
            scheme,
            suffix: None,
            width,
        }
    }

    pub fn suffix(&self) -> String {
        self.suffix
            .clone()
            .unwrap_or_else(|| format!(".{}", self.name))
    }
}

fn height() -> u32 {
    800
}

/// Where entries come from.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Source {
    Html(HtmlSource),
}

impl Source {
    pub fn name(&self) -> &str {
        match self {
            Self::Html(html) => &html.name,
        }
    }
}

/// HTML files from a glob, each served from the harness origin inside a
/// document the harness writes.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HtmlSource {
    /// Relative requests from a page, answered by another file beside it:
    /// `{ "styles.css": "{stem}.css" }`.
    #[serde(default)]
    pub files: BTreeMap<String, String>,
    /// Under `root`, with `{name}` as the one segment that names the entry.
    pub glob: String,
    #[serde(default)]
    pub harness: HarnessSetting,
    pub name: String,
    /// Relative to the config.
    pub root: String,
    /// URLs of scripts, each loaded with `defer`.
    #[serde(default)]
    pub scripts: Vec<String>,
    /// URLs of stylesheets, linked before the harness style.
    #[serde(default)]
    pub styles: Vec<String>,
}

/// `true` or `false`, or the harness's colors and inset.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum HarnessSetting {
    Switch(bool),
    Custom(Harness),
}

impl Default for HarnessSetting {
    fn default() -> Self {
        Self::Switch(true)
    }
}

impl HarnessSetting {
    pub fn resolved(&self) -> Option<Harness> {
        match self {
            Self::Switch(false) => None,
            Self::Switch(true) => Some(Harness::default()),
            Self::Custom(harness) => Some(harness.clone()),
        }
    }
}

/// The ground, the ink and the inset the harness sets on `body`.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Harness {
    #[serde(default = "ground")]
    pub ground: Pair,
    #[serde(default = "ink")]
    pub ink: Pair,
    #[serde(default = "padding")]
    pub padding: u32,
}

impl Default for Harness {
    fn default() -> Self {
        Self {
            ground: ground(),
            ink: ink(),
            padding: padding(),
        }
    }
}

/// One color for each scheme.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pair {
    pub dark: String,
    pub light: String,
}

impl Pair {
    pub fn for_scheme(&self, scheme: Scheme) -> &str {
        match scheme {
            Scheme::Light => &self.light,
            Scheme::Dark => &self.dark,
        }
    }
}

fn ground() -> Pair {
    Pair {
        dark: "#000".to_string(),
        light: "#fff".to_string(),
    }
}

fn ink() -> Pair {
    Pair {
        dark: "#fff".to_string(),
        light: "#000".to_string(),
    }
}

fn padding() -> u32 {
    24
}

impl Config {
    /// Parses what the driver sent and refuses what no run could use.
    ///
    /// # Errors
    ///
    /// Why the config cannot be used, lowercase.
    pub fn parse(value: serde_json::Value) -> Result<Self, String> {
        let config: Self = serde_json::from_value(value).map_err(|error| error.to_string())?;
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<(), String> {
        if self.sources.is_empty() {
            return Err("`sources` names nothing to picture".to_string());
        }
        if self.shots.is_empty() {
            return Err("`shots` is empty, so nothing would be pictured".to_string());
        }
        if !(0.0..=1.0).contains(&self.diff.threshold) {
            return Err(format!(
                "`diff.threshold` is from 0 to 1, and is {}",
                self.diff.threshold
            ));
        }
        let mut names = std::collections::BTreeSet::new();
        for shot in &self.shots {
            if !names.insert(shot.name.as_str()) {
                return Err(format!("two shots are named `{}`", shot.name));
            }
            if shot.width == 0 || shot.height == 0 {
                return Err(format!("the shot `{}` has no area", shot.name));
            }
        }
        let mut suffixes = std::collections::BTreeSet::new();
        for shot in &self.shots {
            if !suffixes.insert(shot.suffix()) {
                return Err(format!(
                    "two shots write their baselines with the suffix `{}`, so one would overwrite the other",
                    shot.suffix()
                ));
            }
        }
        let mut sources = std::collections::BTreeSet::new();
        for source in &self.sources {
            let name = source.name();
            if name.is_empty() || name.contains('/') {
                return Err(format!("a source's name is one word, and `{name}` is not"));
            }
            if !sources.insert(name) {
                return Err(format!("two sources are named `{name}`"));
            }
        }
        for path in self.serve.keys() {
            if !path.starts_with('/') {
                return Err(format!(
                    "`serve` maps URL paths, which start with `/`, and `{path}` does not"
                ));
            }
        }
        for exception in &self.exceptions {
            if exception.reason.trim().is_empty() {
                return Err(format!(
                    "the exception for `{}` gives no reason",
                    exception.entry
                ));
            }
            match (exception.unstable, exception.pixels) {
                (true, Some(_)) => {
                    return Err(format!(
                        "the exception for `{}` is both unstable and a pixel budget, and an unstable shot is never compared",
                        exception.entry
                    ))
                }
                (false, None) => {
                    return Err(format!(
                        "the exception for `{}` neither marks it unstable nor gives it pixels, so it changes nothing",
                        exception.entry
                    ))
                }
                _ => {}
            }
            if let Some(shot) = &exception.shot {
                if !names.contains(shot.as_str()) {
                    return Err(format!(
                        "the exception for `{}` names the shot `{shot}`, and no shot has that name",
                        exception.entry
                    ));
                }
            }
        }
        if !self.shard.per_shot.is_finite() || self.shard.per_shot <= 0.0 {
            return Err("`shard.perShot` is a number of seconds above zero".to_string());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn minimal() -> serde_json::Value {
        json!({ "sources": [{ "kind": "html", "name": "pages", "root": "examples", "glob": "{name}.html" }] })
    }

    #[test]
    fn the_defaults_are_the_lessons() {
        let config = Config::parse(minimal()).unwrap();
        assert_eq!(config.platform, Platform::Linux);
        assert_eq!(config.network, Network::Origin);
        assert_eq!(config.diff.pixels, 0);
        let shots: Vec<_> = config
            .shots
            .iter()
            .map(|shot| (shot.name.as_str(), shot.width, shot.scheme))
            .collect();
        assert_eq!(
            shots,
            [
                ("wide", 1280, Scheme::Light),
                ("phone", 390, Scheme::Light),
                ("dark", 1280, Scheme::Dark)
            ]
        );
        let Source::Html(html) = &config.sources[0];
        let harness = html.harness.resolved().unwrap();
        assert_eq!(
            (
                harness.ground.light.as_str(),
                harness.ink.dark.as_str(),
                harness.padding
            ),
            ("#fff", "#fff", 24)
        );
    }

    #[test]
    fn a_misspelled_key_is_refused() {
        let mut value = minimal();
        value["shot"] = json!([]);
        assert!(Config::parse(value)
            .unwrap_err()
            .contains("unknown field `shot`"));
    }

    #[test]
    fn the_harness_can_be_turned_off() {
        let mut value = minimal();
        value["sources"][0]["harness"] = json!(false);
        let config = Config::parse(value).unwrap();
        let Source::Html(html) = &config.sources[0];
        assert!(html.harness.resolved().is_none());
    }

    #[test]
    fn two_shots_writing_one_file_are_refused() {
        let mut value = minimal();
        value["shots"] = json!([
            { "name": "wide", "width": 640, "scheme": "light", "suffix": "" },
            { "name": "dark", "width": 640, "scheme": "dark", "suffix": "" },
        ]);
        assert!(Config::parse(value).unwrap_err().contains("overwrite"));
    }

    #[test]
    fn an_exception_says_why_and_what_it_allows() {
        let mut value = minimal();
        value["exceptions"] = json!([{ "entry": "pages/a", "reason": " " , "unstable": true }]);
        assert!(Config::parse(value.clone())
            .unwrap_err()
            .contains("gives no reason"));
        value["exceptions"] = json!([{ "entry": "pages/a", "reason": "moves" }]);
        assert!(Config::parse(value.clone())
            .unwrap_err()
            .contains("changes nothing"));
        value["exceptions"] =
            json!([{ "entry": "pages/a", "reason": "moves", "unstable": true, "pixels": 3 }]);
        assert!(Config::parse(value.clone())
            .unwrap_err()
            .contains("never compared"));
        value["exceptions"] =
            json!([{ "entry": "pages/a", "reason": "moves", "pixels": 3, "shot": "tall" }]);
        assert!(Config::parse(value)
            .unwrap_err()
            .contains("no shot has that name"));
    }
}
