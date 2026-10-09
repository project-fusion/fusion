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

use crate::run::Fate;

/// One shot as the report sees it.
pub struct Row<'a> {
    pub baseline: PathBuf,
    /// The capture, for a shot that failed.
    pub current: Option<&'a [u8]>,
    pub diff: Option<PathBuf>,
    pub entry: &'a str,
    pub fate: &'a Fate,
    pub shot: &'a str,
    pub source: &'a str,
}

/// Everything the report needs from the run.
pub struct Run<'a> {
    pub base: &'a Path,
    pub dir: PathBuf,
    pub entries: usize,
    pub fingerprint: Option<PathBuf>,
    pub inspected_failed: bool,
    pub retake: &'a str,
    pub rows: Vec<Row<'a>>,
    pub scope: &'a str,
    /// Each unstable shot left out, with its reason.
    pub skipped: Vec<String>,
    pub update: bool,
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
    let mut notes = Vec::new();
    let mut written = Vec::new();
    let mut held = 0;
    let mut by_source: BTreeMap<&str, usize> = BTreeMap::new();
    for row in &run.rows {
        *by_source.entry(row.source).or_default() += 1;
        let what = format!("{}, {}", row.entry, row.shot);
        let (_, sentence) = described(row, run.base);
        match row.fate {
            fate if fate.fails() => failures.push(format!("{what}: {sentence}")),
            Fate::Steadied | Fate::Tolerated { .. } => notes.push(format!("{what}: {sentence}")),
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
            "locus: wrote {} of {total} baselines{scope}",
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
        let _ = write!(
            verdict,
            "locus: compared {counted}{scope}, and every one matches its baseline. {skipped}"
        );
    } else {
        let _ = write!(
            verdict,
            "locus: {} of {counted}{scope}{} {} not match {}, listed above. {skipped}",
            failures.len(),
            if scope.is_empty() { "" } else { "," },
            if failures.len() == 1 { "does" } else { "do" },
            if failures.len() == 1 {
                "its baseline"
            } else {
                "their baselines"
            },
        );
    }

    for note in &notes {
        println!("locus: {note}");
    }
    if !failures.is_empty() {
        println!("\n  {}\n", failures.join("\n  "));
    }
    println!("{verdict}");
    if run.update && !written.is_empty() {
        println!("locus: review each written picture before committing it. A baseline records whatever was on screen as correct.");
    }
    if !run.update && !failures.is_empty() {
        println!(
            "locus: if the change was meant, retake the baselines. {}",
            run.retake
        );
    }
    if run.inspected_failed {
        println!("locus: the config's inspect reported a failure, above.");
    }

    let failed = !failures.is_empty() || run.inspected_failed;
    match write(run, &verdict, failed) {
        Ok(()) => println!(
            "locus: the report is in {}.",
            relative(run.base, &run.dir.join("index.html"))
        ),
        Err(why) => eprintln!(
            "locus: cannot write the report in {}: {why}",
            run.dir.display()
        ),
    }
    if failed {
        Code::Failed
    } else {
        Code::Ok
    }
}

/// `run.json`, `index.html`, and the pictures of each failed shot.
fn write(run: &Run, verdict: &str, failed: bool) -> std::io::Result<()> {
    if run.dir.exists() {
        fs::remove_dir_all(&run.dir)?;
    }
    let pictures = run.dir.join("shots");
    fs::create_dir_all(&pictures)?;
    let mut rows = Vec::new();
    for (at, row) in run.rows.iter().enumerate() {
        let (result, detail) = described(row, run.base);
        let mut record = json!({
            "detail": detail,
            "entry": row.entry,
            "result": result,
            "shot": row.shot,
            "source": row.source,
        });
        if row.fate.fails() {
            if row.baseline.is_file() {
                fs::copy(&row.baseline, pictures.join(format!("{at}-baseline.png")))?;
                record["baseline"] = json!(format!("shots/{at}-baseline.png"));
            }
            if let Some(current) = row.current {
                fs::write(pictures.join(format!("{at}-current.png")), current)?;
                record["current"] = json!(format!("shots/{at}-current.png"));
            }
            if let Some(diff) = row.diff.as_ref().filter(|diff| diff.is_file()) {
                fs::copy(diff, pictures.join(format!("{at}-diff.png")))?;
                record["diff"] = json!(format!("shots/{at}-diff.png"));
            }
        }
        rows.push(record);
    }
    let record = json!({
        "failed": failed,
        "mode": if run.update { "update" } else { "test" },
        "shots": rows,
        "skipped": run.skipped,
        /* Read where the list follows it. */
        "verdict": verdict.replace(", listed above.", ", listed below."),
        "version": crate::shipped(),
    });
    fs::write(
        run.dir.join("run.json"),
        format!(
            "{}\n",
            serde_json::to_string_pretty(&record).unwrap_or_default()
        ),
    )?;
    fs::write(run.dir.join("index.html"), html(&record))?;
    Ok(())
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
            Some(src) => format!("<figure><figcaption>{label}</figcaption><img src=\"{}\" alt=\"{label} of {}\"></figure>", escape(src), escape(&title)),
            None => format!("<figure><figcaption>{label}</figcaption><p class=\"none\">None</p></figure>"),
        }
        };
        let swipe = match (shot["baseline"].as_str(), shot["current"].as_str()) {
            (Some(baseline), Some(current)) => format!(
                "<div class=\"swipe\"><img src=\"{}\" alt=\"\"><img class=\"over\" src=\"{}\" alt=\"\">\
                 <input type=\"range\" min=\"0\" max=\"100\" value=\"50\" aria-label=\"Swipe between the baseline and the capture of {}\"></div>",
                escape(baseline),
                escape(current),
                escape(&title)
            ),
            _ => String::new(),
        };
        let _ = write!(
            cards,
            "<section><h2>{}</h2><p>{}</p><div class=\"three\">{}{}{}</div>{swipe}</section>",
            escape(&title),
            escape(&sentence(shot["detail"].as_str().unwrap_or_default())),
            picture("baseline", "Baseline"),
            picture("current", "Capture"),
            picture("diff", "Difference"),
        );
    }
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
<title>Locus report</title><style>{STYLE}</style><main><h1>Locus report</h1><p class=\"verdict\">{}</p>{}{}{}</main><script>{SCRIPT}</script></html>\n",
        escape(record["verdict"].as_str().unwrap_or_default()),
        cards,
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
/// table of what did not pass.
pub fn markdown(record: &Value) -> String {
    let mut out = String::from("### Locus\n\n");
    let _ = writeln!(out, "{}\n", record["verdict"].as_str().unwrap_or_default());
    let empty = Vec::new();
    let rows: Vec<&Value> = record["shots"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter(|one| !matches!(one["result"].as_str(), Some("matched" | "held")))
        .collect();
    if !rows.is_empty() {
        out.push_str("| Entry | Shot | Result |\n|---|---|---|\n");
        for row in rows {
            let _ = writeln!(
                out,
                "| {} | {} | {} |",
                row["entry"].as_str().unwrap_or_default(),
                row["shot"].as_str().unwrap_or_default(),
                sentence(row["detail"].as_str().unwrap_or_default()).replace('|', "\\|")
            );
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
            "verdict": "locus: 1 of 2 shots of 1 entry (pages 2) does not match its baseline, listed above. Skipped none.",
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
    fn the_page_escapes_what_it_shows() {
        let page = html(&json!({ "verdict": "<b>", "shots": [], "skipped": ["a & b"] }));
        assert!(page.contains("&lt;b&gt;"));
        assert!(page.contains("<li>a &amp; b</li>"));
    }
}
