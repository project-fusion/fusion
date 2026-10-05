//! `helix scan`: what a project uses of Helix, and what it gets wrong, read
//! from its code.
//!
//! **One run, as a page writes one.** `@fusion.dev/helix-diagnostics` judges
//! a page as it runs. A scan reads every stylesheet, template, and module the
//! repository holds, judges them against the lint data of the Helix packages
//! the project installs, and writes the same run, with `source: "code"`: the
//! same findings, kinds, and fingerprints, the same usage counts, and the same
//! configuration, read from the same `helix-diagnostics.json`.
//!
//! **What a scan adds**:
//!
//! - every file and every route, where a page sees the routes someone opened;
//! - a line for every finding, which a page cannot know;
//! - `unsettled`, the faults only a running page can settle;
//! - with `--build`, what each Helix family adds to the build, from its source
//!   maps.
//!
//! **What a scan cannot see** is the cascade: runtime events, performance,
//! two copies of Helix, and a hook set on an ancestor of an element with it
//! are the page's.

mod analyze;
mod config;
mod css;
mod files;
mod identity;
mod jsx;
mod lint;
mod markup;
mod usage;
mod weight;

use std::collections::{HashMap, HashSet};
use std::hash::{BuildHasher, RandomState};
use std::path::Path;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use fusion_rules::style::Paint;
use oxc_span::SourceType;
use serde_json::{json, Map, Value};

use crate::args::Scan;
use analyze::{Analyzer, Found, Raw};
use css::StyleRule;
use files::Kind;
use lint::Index;
use markup::{Element, Template};
use usage::Usage;
use weight::Weight;

/// What a scan read, for the run's `coverage`.
#[derive(Default)]
struct Coverage {
    files: usize,
    read: usize,
    sheets: usize,
    unreadable: Vec<(String, &'static str)>,
}

impl Coverage {
    /// The coverage as the run's `coverage`. A scan enters no shadow root.
    fn json(&self) -> Value {
        json!({
            "files": self.files,
            "read": self.read,
            "roots": 0,
            "sheets": self.sheets,
            "unreadable": self
                .unreadable
                .iter()
                .map(|(sheet, reason)| json!({ "reason": reason, "sheet": sheet }))
                .collect::<Vec<_>>(),
        })
    }
}

/// What the files hold, read once and judged once everything is read: a
/// rule's hook is judged against every `var()` in the project.
#[derive(Default)]
struct Read {
    coverage: Coverage,
    /// Each sheet: its path, its rules, and whether it is a Helix element's own.
    sheets: Vec<(String, Vec<StyleRule>, bool)>,
    /// Each template: its path, its elements, and whether it is a Helix
    /// element's own.
    templates: Vec<(String, Vec<Element>, bool)>,
    used: HashSet<String>,
}

impl Read {
    /// Reads one file, saying so in the coverage where it cannot.
    fn file(&mut self, path: &Path, relative: String, kind: Kind) {
        if kind == Kind::Unsupported {
            self.coverage.sheets += 1;
            self.coverage.unreadable.push((relative, "unsupported"));
            return;
        }
        let Ok(text) = std::fs::read_to_string(path) else {
            self.coverage.unreadable.push((relative, "threw"));
            return;
        };
        self.coverage.files += 1;
        self.used.extend(css::reads(&text).map(str::to_owned));
        match kind {
            Kind::Sheet { line_comments } => {
                self.coverage.sheets += 1;
                self.coverage.read += 1;
                self.sheets
                    .push((relative, css::read(&text, 1, line_comments), false));
            }
            Kind::Template => self.template(relative, markup::read(&text, 1), false),
            Kind::Mdx => self.template(
                relative,
                markup::read(&markup::without_code(&text), 1),
                false,
            ),
            Kind::Module { jsx } => {
                let source = SourceType::from_path(path)
                    .unwrap_or_else(|_| SourceType::tsx())
                    .with_jsx(jsx);
                match jsx::read(&text, source) {
                    Some(template) => {
                        let own = !template.defines.is_empty();
                        self.template(relative, template, own);
                    }
                    None => self.coverage.unreadable.push((relative, "threw")),
                }
            }
            Kind::Unsupported => {}
        }
    }

    /// Keeps a template's elements, and reads its `<style>` blocks and `css`
    /// templates as sheets.
    fn template(&mut self, relative: String, template: Template, own: bool) {
        for style in template.styles {
            self.coverage.sheets += 1;
            let line_comments = match style.lang.as_deref() {
                None | Some("css" | "postcss" | "pcss") => false,
                Some("scss" | "less") => true,
                Some(_) => {
                    self.coverage
                        .unreadable
                        .push((format!("{relative}:{}", style.line), "unsupported"));
                    continue;
                }
            };
            self.coverage.read += 1;
            self.sheets.push((
                relative.clone(),
                css::read(&style.text, style.line, line_comments),
                own,
            ));
        }
        if !template.elements.is_empty() {
            self.templates.push((relative, template.elements, own));
        }
    }
}

/// Now, as an ISO 8601 time in UTC, as `Date.prototype.toISOString` writes it.
fn now() -> String {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let seconds = elapsed.as_secs();
    let (days, rest) = (seconds / 86_400, seconds % 86_400);
    /* Days to a civil date, after Howard Hinnant's `civil_from_days`. */
    let shifted = i64::try_from(days).unwrap_or(0) + 719_468;
    let era = shifted.div_euclid(146_097);
    let of_era = shifted.rem_euclid(146_097);
    let year_of_era = (of_era - of_era / 1460 + of_era / 36_524 - of_era / 146_096) / 365;
    let day_of_year = of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let shifted_month = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * shifted_month + 2) / 5 + 1;
    let month = if shifted_month < 10 {
        shifted_month + 3
    } else {
        shifted_month - 9
    };
    let year = year_of_era + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        rest / 3600,
        rest % 3600 / 60,
        rest % 60,
        elapsed.subsec_millis()
    )
}

/// A new identity for a run, shaped as a version 4 UUID, as the page's is.
fn run_id() -> String {
    let state = RandomState::new();
    let seed = (
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos(),
        std::process::id(),
    );
    let value =
        (u128::from(state.hash_one((seed, 1u8))) << 64) | u128::from(state.hash_one((seed, 2u8)));
    let value = (value & !(0xf << 76)) | (0x4 << 76);
    let value = (value & !(0x3 << 62)) | (0x2 << 62);
    let hex = format!("{value:032x}");
    format!(
        "{}-{}-{}-{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..32]
    )
}

/// The version of the installed package named `package`, found as Node
/// finds it.
fn installed(root: &Path, package: &str) -> Option<String> {
    root.ancestors().find_map(|directory| {
        let text = std::fs::read_to_string(
            directory
                .join("node_modules")
                .join(package)
                .join("package.json"),
        )
        .ok()?;
        serde_json::from_str::<Value>(&text)
            .ok()?
            .get("version")?
            .as_str()
            .map(str::to_owned)
    })
}

/// A finding with its category, family, fingerprint, and owner, as the
/// page's `identify` gives them.
fn identified(raw: &Raw, index: &Index) -> Map<String, Value> {
    let mut out = Map::new();
    out.insert("category".to_owned(), json!(identity::category(raw.kind)));
    if let Some(expected) = &raw.expected {
        out.insert("expected".to_owned(), json!(expected));
    }
    if let Some(family) = index
        .get(&raw.tag)
        .and_then(|element| element.family.as_ref())
    {
        out.insert("family".to_owned(), json!(family));
    }
    out.insert(
        "fingerprint".to_owned(),
        json!(identity::fingerprint(raw.kind, &raw.tag, &raw.subject)),
    );
    out.insert("kind".to_owned(), json!(raw.kind));
    out.insert("message".to_owned(), json!(raw.message));
    out.insert(
        "origin".to_owned(),
        json!({
            "cssText": raw.origin.text,
            "index": raw.origin.index,
            "line": raw.origin.line,
            "sheet": raw.origin.sheet,
        }),
    );
    out.insert("owner".to_owned(), json!(identity::owner(raw.kind)));
    out.insert("subject".to_owned(), json!(raw.subject));
    out.insert("tag".to_owned(), json!(raw.tag));
    out
}

/// A count and its noun, plural where it is not one.
fn counted(count: usize, noun: &str) -> String {
    let number = count
        .to_string()
        .as_bytes()
        .rchunks(3)
        .rev()
        .map(|chunk| String::from_utf8_lossy(chunk).into_owned())
        .collect::<Vec<_>>()
        .join(",");
    if count == 1 {
        format!("{number} {noun}")
    } else {
        format!("{number} {noun}s")
    }
}

/// Bytes in kilobytes or megabytes, as a reader reads a bundle's size.
fn size(bytes: u64) -> String {
    #[expect(
        clippy::cast_precision_loss,
        reason = "a size printed to one decimal place"
    )]
    let bytes = bytes as f64;
    if bytes >= 1_000_000.0 {
        format!("{:.1} MB", bytes / 1_000_000.0)
    } else {
        format!("{:.1} kB", bytes / 1000.0)
    }
}

/// The lint data of the Helix packages the project installs, indexed.
fn installed_lint(root: &Path) -> Outcome<Index> {
    let found = lint::find(root);
    if found.is_empty() {
        return Err(Failure::input(
            "No Helix lint data",
            format!(
                "no package in node_modules/@fusion.dev, from {} up, has a lint.json, so every tag would read as unknown",
                root.display()
            ),
        )
        .hint("install @fusion.dev/helix, or scan the project that installs it"));
    }
    let packages =
        lint::read(&found).map_err(|why| Failure::input("Could not read the lint data", why))?;
    Ok(Index::of(&packages))
}

/// The project's settings: `--config`, or `helix-diagnostics.json` in the
/// project, then in the directory the scan runs in, refused as the page
/// refuses them.
fn settings(args: &Scan, root: &Path, from: &Path) -> Outcome<Option<Value>> {
    let path = match &args.config {
        Some(path) => from.join(path),
        None => match [
            root.join("helix-diagnostics.json"),
            from.join("helix-diagnostics.json"),
        ]
        .into_iter()
        .find(|path| path.is_file())
        {
            Some(path) => path,
            None => return Ok(None),
        },
    };
    let text = std::fs::read_to_string(&path).map_err(|error| {
        Failure::input(
            format!("Could not read {}", path.display()),
            error.to_string(),
        )
    })?;
    let value: Value = serde_json::from_str(&text).map_err(|error| {
        Failure::input(format!("{} is not JSON", path.display()), error.to_string())
    })?;
    config::check(&value, "file")
        .map_err(|why| Failure::input(format!("{} cannot be used", path.display()), why))?;
    Ok(Some(value))
}

/// Every file the scan reads, read.
fn project(root: &Path, build: Option<&Path>) -> Read {
    let mut read = Read::default();
    for path in files::list(root, build) {
        let Some(kind) = files::kind(&path) else {
            continue;
        };
        let relative = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        read.file(&path, relative, kind);
    }
    read
}

/// What the text proves, and what it leaves to the page. A Helix element's
/// own markup is the library's, and is not judged.
fn analyzed(read: &Read, index: &Index, listing: &HashMap<String, Vec<String>>) -> Found {
    let mut analyzer = Analyzer::new(index, listing, &read.used);
    for (path, rules, own) in &read.sheets {
        analyzer.sheet(path, rules, *own);
    }
    analyzer.markup(
        read.templates
            .iter()
            .filter(|(_, _, own)| !own)
            .map(|(path, elements, _)| (path.as_str(), elements.as_slice())),
    );
    analyzer.found
}

/// What the rules make of what was found.
struct Judged {
    findings: Vec<Value>,
    /// How many findings each override turned off, by kind and layer.
    silenced: Vec<Value>,
    unsettled: Vec<Value>,
}

/// Each finding with its identity and severity after the rules, and each
/// unsettled fault the rules keep: one the project turned off would be off
/// on the page too.
fn judged(found: &Found, index: &Index, rules: Option<&Value>) -> Judged {
    let mut findings = Vec::new();
    let mut silenced: Vec<Value> = Vec::new();
    for raw in &found.findings {
        let (severity, layer) = config::severity(rules, raw.kind, &raw.tag);
        if severity == "off" {
            match silenced
                .iter_mut()
                .find(|one| one["kind"] == raw.kind && one["layer"] == layer)
            {
                Some(entry) => entry["count"] = json!(entry["count"].as_u64().unwrap_or(0) + 1),
                None => silenced.push(json!({ "count": 1, "kind": raw.kind, "layer": layer })),
            }
            continue;
        }
        let mut finding = identified(raw, index);
        finding.insert("decidedBy".to_owned(), json!(layer));
        finding.insert("severity".to_owned(), json!(severity));
        findings.push(Value::Object(finding));
    }
    let unsettled = found
        .unsettled
        .iter()
        .filter(|raw| config::severity(rules, raw.kind, &raw.tag).0 != "off")
        .map(|raw| Value::Object(identified(raw, index)))
        .collect();
    Judged {
        findings,
        silenced,
        unsettled,
    }
}

/// Reads the project, writes the run, and exits 1 on a finding at `error`.
pub fn run(args: &Scan, from: &Path, json: bool, paint: Paint) -> Outcome<Code> {
    let started = Instant::now();
    let at = now();
    let given = args
        .dir
        .as_ref()
        .map_or_else(|| from.to_owned(), |dir| from.join(dir));
    let root = given.canonicalize().map_err(|error| {
        Failure::input(
            format!("Could not read {}", given.display()),
            error.to_string(),
        )
    })?;
    let index = installed_lint(&root)?;
    let file = settings(args, &root, from)?;
    let resolved = config::resolve(file.as_ref());
    let build = match &args.build {
        Some(dir) => Some(from.join(dir).canonicalize().map_err(|error| {
            Failure::input(
                format!("Could not read the build in {}", from.join(dir).display()),
                error.to_string(),
            )
        })?),
        None => None,
    };

    let read = project(&root, build.as_deref());
    let listing = index.hooks();
    let rules = resolved.rules.as_ref();
    let judged = judged(&analyzed(&read, &index, &listing), &index, rules);

    let mut usage = Usage::default();
    for (_, elements, own) in &read.templates {
        usage.elements(elements, &index, *own);
    }
    for (_, rules, _) in &read.sheets {
        usage.sheet(rules, &index, &listing, resolved.hook_values());
    }
    let families = index.families();
    let weight = build
        .as_deref()
        .map(|build| Weight::measure(build, &root, &families));

    let mut configuration = resolved.configuration.clone();
    configuration.insert("overrides".to_owned(), json!(config::overrides(rules)));
    configuration.insert("silenced".to_owned(), json!(judged.silenced));
    let mut run = json!({
        "schema": 1,
        "configuration": configuration,
        "coverage": read.coverage.json(),
        "findings": judged.findings,
        "project": resolved.project,
        "run": {
            "at": at,
            "duration": started.elapsed().as_millis(),
            "id": run_id(),
            "source": "code",
        },
        "runtime": [],
        "unsettled": judged.unsettled,
        "usage": usage.json(),
        "versions": {
            "collector": crate::shipped(),
            "helix": installed(&root, "@fusion.dev/helix-core").into_iter().collect::<Vec<_>>(),
            "manifests": index.versions,
            "rules": crate::shipped(),
        },
        "withheld": resolved
            .send
            .iter()
            .filter(|(_, on, _)| !on)
            .map(|(category, _, layer)| json!({ "category": category, "decidedBy": layer }))
            .collect::<Vec<_>>(),
    });
    if let Some(weight) = &weight {
        run["performance"] = json!({
            "measured": { "layoutShift": false, "longTasks": false },
            "tags": {},
            "weight": weight.json(),
        });
    }

    if let Some(out) = &args.out {
        let out = from.join(out);
        crate::diagnostics::write_runs(&out, "code", &[&run]).map_err(|error| {
            Failure::input(
                format!("Could not write {}", out.display()),
                error.to_string(),
            )
        })?;
    }
    if json {
        println!("{run}");
    } else {
        print(&run, paint);
        for note in notes(&read.coverage, &usage, weight.as_ref(), args.out.as_deref()) {
            println!("{}", paint.dim(&note));
        }
    }
    let failed = run["findings"].as_array().is_some_and(|findings| {
        findings
            .iter()
            .any(|finding| finding["severity"] == "error")
    });
    Ok(if failed { Code::Failed } else { Code::Ok })
}

/// Prints the run's counts, then each finding and each unsettled fault with
/// its file and line.
fn print(run: &Value, paint: Paint) {
    let list = |key: &str| run[key].as_array().cloned().unwrap_or_default();
    let findings = list("findings");
    let unsettled = list("unsettled");
    let of = |severity: &str| {
        findings
            .iter()
            .filter(|finding| finding["severity"] == severity)
            .count()
    };
    let heading = format!(
        "helix scan: {}, {}, {} info, and {} unsettled, in {}",
        counted(of("error"), "error"),
        counted(of("warn"), "warning"),
        of("info"),
        unsettled.len(),
        counted(
            usize::try_from(run["coverage"]["files"].as_u64().unwrap_or(0)).unwrap_or(0),
            "file"
        ),
    );
    println!(
        "{}",
        if of("error") + of("warn") > 0 {
            paint.fail(&heading)
        } else {
            paint.pass(&heading)
        }
    );
    let text = |entry: &Value, key: &str| entry[key].as_str().unwrap_or("").to_owned();
    let labeled = findings
        .iter()
        .map(|finding| (text(finding, "severity"), finding))
        .chain(
            unsettled
                .iter()
                .map(|entry| ("unsettled".to_owned(), entry)),
        );
    for (label, entry) in labeled {
        println!(
            "  {} {}",
            paint.bold(&format!("{label} {}", text(entry, "kind"))),
            text(entry, "subject")
        );
        println!("    {}", text(entry, "message"));
        println!(
            "    {}",
            paint.dim(&format!(
                "in {}:{}",
                entry
                    .pointer("/origin/sheet")
                    .and_then(Value::as_str)
                    .unwrap_or(""),
                entry
                    .pointer("/origin/line")
                    .and_then(Value::as_u64)
                    .unwrap_or(0)
            ))
        );
    }
}

/// What the scan read, what the code writes, and what Helix weighs, as
/// sentences.
fn notes(
    coverage: &Coverage,
    usage: &Usage,
    weight: Option<&Weight>,
    out: Option<&Path>,
) -> Vec<String> {
    let mut notes = vec![format!(
        "Read {} with {} in them.",
        counted(coverage.files, "file"),
        counted(coverage.sheets, "stylesheet")
    )];
    if !coverage.unreadable.is_empty() {
        let named: Vec<String> = coverage
            .unreadable
            .iter()
            .take(5)
            .map(|(sheet, reason)| {
                format!(
                    "{sheet} ({})",
                    if *reason == "unsupported" {
                        "a language the scan does not read"
                    } else {
                        "did not parse"
                    }
                )
            })
            .collect();
        let more = coverage.unreadable.len().saturating_sub(5);
        notes.push(format!(
            "Could not read {}: {}{}.",
            coverage.unreadable.len(),
            named.join(", "),
            if more > 0 {
                format!(", and {more} more")
            } else {
                String::new()
            }
        ));
    }
    let (elements, tags) = usage.written();
    notes.push(format!(
        "Writes {} of {}.",
        counted(
            usize::try_from(elements).unwrap_or(usize::MAX),
            "Helix element"
        ),
        counted(tags, "tag")
    ));
    if let Some(weight) = weight {
        let (mapped, unmapped) = weight.files();
        notes.push(if mapped == 0 {
            format!(
                "Weighed no bundle: none of {} has a source map. Turn source maps on in your bundler to weigh each family.",
                counted(unmapped, "file")
            )
        } else {
            format!(
                "Helix is {} of the build, from {} with a source map{}.",
                size(weight.helix()),
                counted(mapped, "bundle"),
                if unmapped > 0 {
                    format!(", and {unmapped} without one could not be weighed")
                } else {
                    String::new()
                }
            )
        });
    }
    if let Some(out) = out {
        notes.push(format!("Written to {}.", out.display()));
    }
    notes
}

#[cfg(test)]
mod tests {
    use super::{counted, now, run_id};

    #[test]
    fn a_run_is_stamped_as_the_page_stamps_it() {
        let at = now();
        assert_eq!(at.len(), 24, "{at}");
        assert!(at.ends_with('Z') && at.as_bytes()[10] == b'T', "{at}");
        let id = run_id();
        assert_eq!(id.len(), 36);
        assert_eq!(&id[14..15], "4");
        assert!(matches!(&id[19..20], "8" | "9" | "a" | "b"), "{id}");
        assert_ne!(run_id(), id);
    }

    #[test]
    fn counts_read_as_numbers() {
        assert_eq!(counted(1, "file"), "1 file");
        assert_eq!(counted(1234, "file"), "1,234 files");
    }
}
