//! The config, as the driver hands it over.
//!
//! **`visual.config.ts` is TypeScript, and the binary reads it as JSON.** The
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
    /// Whether each entry's accessibility snapshot is kept beside its
    /// baselines, as `<stem>.aria.yml`, and compared as text.
    #[serde(default)]
    pub aria: bool,
    /// Checks run on each entry's page after its first shot, which need no
    /// baseline.
    #[serde(default)]
    pub checks: Checks,
    #[serde(default)]
    pub diff: Diff,
    #[serde(default)]
    pub exceptions: Vec<Exception>,
    /// Selectors whose elements are painted over in every picture, for what
    /// changes on its own and says nothing about the page: a version number,
    /// a date.
    #[serde(default)]
    pub mask: Vec<String>,
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
    /// Where each run writes its report and its run record, relative to the
    /// config.
    #[serde(default = "report")]
    pub report: String,
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
    /// A stylesheet applied while each picture is taken and removed after,
    /// to hold still what `mask` alone cannot, such as a masked element whose
    /// width follows its text.
    pub style: Option<String>,
    pub sources: Vec<Source>,
    /// Where to write the seconds each entry name took, when set.
    pub timings: Option<String>,
}

fn fingerprint() -> String {
    "visual.fingerprint.json".to_string()
}

fn report() -> String {
    ".helix/visual".to_string()
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

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Diff {
    #[serde(default)]
    pub mode: Mode,
    /// How many pixels may differ before a shot fails, in the pixel mode.
    /// Zero, because a single moved pixel is the fault this exists to catch.
    #[serde(default)]
    pub pixels: usize,
    /// The lowest structural similarity a shot may score and pass, in the
    /// perceptual mode, from 0 to 1.
    #[serde(default = "ssim")]
    pub ssim: f64,
    /// How far apart two colors may be and still be the same pixel, 0 to 1.
    #[serde(default = "threshold")]
    pub threshold: f64,
}

impl Default for Diff {
    fn default() -> Self {
        Self {
            mode: Mode::default(),
            pixels: 0,
            ssim: ssim(),
            threshold: threshold(),
        }
    }
}

/// How a shot is compared with its baseline.
#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    /// Pixel by pixel, failing on any pixel past the threshold.
    #[default]
    Pixel,
    /// By structural similarity, for photographs and gradients whose pixels
    /// move a little on every render.
    Perceptual,
}

fn ssim() -> f64 {
    0.99
}

fn threshold() -> f64 {
    crate::THRESHOLD
}

/// The checks a page is read for after its first shot.
#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Checks {
    /// A code block whose text is drawn in one color: a highlighter that
    /// failed and left nothing to say so.
    #[serde(default)]
    pub code: CodeSetting,
}

/// `true` or `false`, or where the code blocks are and how long one must be.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum CodeSetting {
    Switch(bool),
    Custom(CodeCheck),
}

impl Default for CodeSetting {
    fn default() -> Self {
        Self::Switch(false)
    }
}

impl CodeSetting {
    pub fn resolved(&self) -> Option<CodeCheck> {
        match self {
            Self::Switch(false) => None,
            Self::Switch(true) => Some(CodeCheck::default()),
            Self::Custom(check) => Some(check.clone()),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CodeCheck {
    /// The fewest characters a block holds before it is judged, so a
    /// one-word sample is not.
    #[serde(default = "minimum")]
    pub minimum: usize,
    /// What a code block is.
    #[serde(default = "code_selector")]
    pub selector: String,
}

impl Default for CodeCheck {
    fn default() -> Self {
        Self {
            minimum: minimum(),
            selector: code_selector(),
        }
    }
}

fn minimum() -> usize {
    20
}

fn code_selector() -> String {
    "pre code, pre:not(:has(code))".to_string()
}

/// One exception to the comparison, with the reason it exists.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Exception {
    /// A known difference between the two sides of a pair, tolerated however
    /// large. Spent, and failing the run, once the two match on two takes.
    #[serde(default)]
    pub differs: bool,
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
    /// Only custom elements whose tag starts with this are awaited, and one
    /// left undefined fails the entry. A framework's own hyphenated tags,
    /// such as Next.js's `next-route-announcer`, are never defined.
    pub elements: Option<String>,
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
    Catalog(CatalogSource),
    Html(HtmlSource),
    Pairs(PairsSource),
    Server(ServerSource),
    Storybook(StorybookSource),
}

impl Source {
    pub fn name(&self) -> &str {
        match self {
            Self::Catalog(one) => &one.server.name,
            Self::Html(one) => &one.name,
            Self::Pairs(one) => &one.name,
            Self::Server(one) => &one.server.name,
            Self::Storybook(one) => &one.server.name,
        }
    }

    /// The diff this source's shots are compared with, when it sets its own.
    pub fn diff(&self) -> Option<&Diff> {
        match self {
            Self::Html(one) => one.diff.as_ref(),
            Self::Pairs(one) => one.diff.as_ref(),
            _ => self.server().and_then(|server| server.diff.as_ref()),
        }
    }

    /// The server a source pictures, for every kind but HTML files.
    pub fn server(&self) -> Option<&Served> {
        match self {
            Self::Catalog(one) => Some(&one.server),
            Self::Html(_) | Self::Pairs(_) => None,
            Self::Server(one) => Some(&one.server),
            Self::Storybook(one) => Some(&one.server),
        }
    }
}

/// What every source on a server shares: where it is, how to start it, and
/// where its baselines are kept.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Served {
    /// The directory the baselines are written in, relative to the config.
    pub baselines: String,
    /// The directory `start` runs in, relative to the config.
    pub cwd: Option<String>,
    pub diff: Option<Diff>,
    pub name: String,
    /// A shell command that starts the server. Left out, the server is
    /// expected to be running already.
    pub start: Option<String>,
    /// Seconds to wait for the server to answer after `start`.
    #[serde(default = "timeout")]
    pub timeout: u64,
    /// The server's address: `http://localhost:3000`.
    pub url: String,
}

fn timeout() -> u64 {
    120
}

/// Pages of any server, by route or from its sitemap.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerSource {
    #[serde(default)]
    pub routes: Vec<Route>,
    #[serde(flatten)]
    pub server: Served,
    /// A sitemap's path on the server, `/sitemap.xml`, read for its routes.
    pub sitemap: Option<String>,
}

/// A route, and optionally the name its baselines take.
#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum Route {
    Path(String),
    Named { name: String, path: String },
}

/// Stories from a running Storybook, read from its `index.json`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorybookSource {
    /// Stories carrying one of these tags are left out.
    #[serde(default)]
    pub exclude: Vec<String>,
    /// Only stories carrying one of these tags, when any are given.
    #[serde(default)]
    pub include: Vec<String>,
    #[serde(flatten)]
    pub server: Served,
}

/// Entries listed in a JSON file, `[{ "id": "button-primary", "url": "/x" }]`,
/// each `url` relative to the server: the format any component catalog can
/// write.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSource {
    /// The catalog, relative to the config.
    pub catalog: String,
    #[serde(flatten)]
    pub server: Served,
}

/// Entries with two sides, compared with each other at every shot and with no
/// baseline.
///
/// **The platform cancels out.** Both sides render on one machine seconds
/// apart, so a pair runs anywhere, writes nothing to commit, and needs no
/// fingerprint. React against plain HTML, a server render against a client
/// render, and a framework wrapper against the element it wraps are each a
/// pair.
///
/// **The config builds the sides**, in `prepare`, which the driver runs and
/// hands back as data: a bundler, a server renderer or a framework is the
/// project's to name, and this binary never learns which.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PairsSource {
    /// Whether the config gave a `check`, run on each side's page after its
    /// first shot, whose problems fail the pair.
    #[serde(default)]
    pub check: bool,
    /// Whether the two sides' pictures are compared. Off, a pair is judged by
    /// its `check`, its errors and its tags alone.
    #[serde(default = "yes")]
    pub compare: bool,
    pub diff: Option<Diff>,
    #[serde(default)]
    pub errors: Errors,
    #[serde(default)]
    pub harness: HarnessSetting,
    /// What the two sides are called in a report: `["HTML", "TSX"]`.
    #[serde(default = "labels")]
    pub labels: [String; 2],
    pub name: String,
    /// Always `true`: the driver says the config gave the function.
    #[serde(default)]
    pub prepare: bool,
}

fn yes() -> bool {
    true
}

fn labels() -> [String; 2] {
    ["a".to_string(), "b".to_string()]
}

/// Which console errors on a pair's pages fail it.
#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Errors {
    /// An error the second side logs and the first does not, which is what a
    /// server render that hydrates with a complaint looks like.
    #[default]
    New,
    /// Any error on either side.
    Any,
    /// None of them.
    Ignore,
}

/// HTML files from a glob, each served from the harness origin inside a
/// document the harness writes.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HtmlSource {
    pub diff: Option<Diff>,
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

    /// The thresholds of every diff, and each server source's address and
    /// pages.
    fn validate_diffs(&self) -> Result<(), String> {
        let owner_of = |source: &Source| format!("the source `{}`'s `diff`", source.name());
        for (diff, owner) in std::iter::once((&self.diff, "`diff`".to_string())).chain(
            self.sources
                .iter()
                .filter_map(|source| source.diff().map(|diff| (diff, owner_of(source)))),
        ) {
            if !(0.0..=1.0).contains(&diff.threshold) {
                return Err(format!(
                    "{owner} has a threshold from 0 to 1, and it is {}",
                    diff.threshold
                ));
            }
            if !(0.0..=1.0).contains(&diff.ssim) {
                return Err(format!(
                    "{owner} has an `ssim` from 0 to 1, and it is {}",
                    diff.ssim
                ));
            }
        }
        for source in &self.sources {
            if let Source::Pairs(pairs) = source {
                if !pairs.prepare {
                    return Err(format!(
                        "the pairs source `{}` has no `prepare`, the function that builds its pairs",
                        pairs.name
                    ));
                }
            }
            if let Some(server) = source.server() {
                if !(server.url.starts_with("http://") || server.url.starts_with("https://")) {
                    return Err(format!(
                        "the source `{}` has a `url` that is not http or https: `{}`",
                        server.name, server.url
                    ));
                }
            }
            if let Source::Server(one) = source {
                if one.routes.is_empty() && one.sitemap.is_none() {
                    return Err(format!(
                        "the source `{}` names no routes and no sitemap, so it has nothing to picture",
                        one.server.name
                    ));
                }
            }
        }
        Ok(())
    }

    fn validate(&self) -> Result<(), String> {
        if self.sources.is_empty() {
            return Err("`sources` names nothing to picture".to_string());
        }
        if self.shots.is_empty() {
            return Err("`shots` is empty, so nothing would be pictured".to_string());
        }
        self.validate_diffs()?;
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
            let kinds = usize::from(exception.unstable)
                + usize::from(exception.pixels.is_some())
                + usize::from(exception.differs);
            if kinds > 1 {
                return Err(format!(
                    "the exception for `{}` is more than one of unstable, a pixel budget and a known difference, and it can be one",
                    exception.entry
                ));
            }
            if kinds == 0 {
                return Err(format!(
                    "the exception for `{}` neither marks it unstable, gives it pixels, nor marks a known difference, so it changes nothing",
                    exception.entry
                ));
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
        let Source::Html(html) = &config.sources[0] else {
            panic!("the source is HTML");
        };
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
        let Source::Html(html) = &config.sources[0] else {
            panic!("the source is HTML");
        };
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
            .contains("more than one of"));
        value["exceptions"] =
            json!([{ "entry": "pages/a", "reason": "moves", "pixels": 3, "shot": "tall" }]);
        assert!(Config::parse(value)
            .unwrap_err()
            .contains("no shot has that name"));
    }
}
