//! Each verb's report, as a person reads it.

use std::fmt::Write as _;

use chrono::{DateTime, Utc};
use fusion_rules::style::Paint;

use crate::{
    diff,
    memory::{Answer, Asked, Consolidated, EpisodeView, FactView, Forgot, Ingested, Replayed, Why},
    settings::{scope_text, Settings},
    source,
};

fn date(time: DateTime<Utc>) -> String {
    time.format("%B %-d, %Y").to_string()
}

fn plural(count: usize, one: &str, many: &str) -> String {
    if count == 1 {
        format!("{count} {one}")
    } else {
        format!("{count} {many}")
    }
}

/// Where an episode came from, and when.
fn origin(episode: &EpisodeView) -> String {
    let from = episode
        .source
        .as_deref()
        .map_or_else(|| "an unnamed source".to_owned(), source::display);
    format!("{from}, {}", date(episode.occurred_at))
}

/// Text indented under a label, one line per line.
fn indented(out: &mut String, depth: usize, text: &str) {
    let pad = "  ".repeat(depth);
    for line in text.lines() {
        let _ = writeln!(out, "{pad}{line}");
    }
}

fn episode(out: &mut String, depth: usize, episode: &EpisodeView, paint: Paint) {
    let pad = "  ".repeat(depth);
    let _ = writeln!(
        out,
        "{pad}{} {}",
        paint.bold("episode"),
        paint.dim(&format!("{}  {}", episode.id, origin(episode)))
    );
    indented(out, depth + 1, &episode.text);
}

fn fact(out: &mut String, depth: usize, fact: &FactView, paint: Paint) {
    let pad = "  ".repeat(depth);
    let _ = writeln!(out, "{pad}{} {}", paint.bold("fact"), fact.content);
    let mut about = format!(
        "{}  confidence {:.2}, {}",
        fact.id, fact.confidence, fact.scope
    );
    if let Some(model) = &fact.embedding {
        let _ = write!(about, ", vector {model}");
    }
    if !fact.current {
        about.push_str(", superseded");
    }
    let _ = writeln!(out, "{pad}  {}", paint.dim(&about));
    for source in &fact.sources {
        episode(out, depth + 1, source, paint);
    }
}

pub fn ingested(report: &Ingested, settings: &Settings, paint: Paint) -> String {
    let mut out = format!(
        "Recorded {} in {} memory.\n",
        plural(report.episodes.len(), "episode", "episodes"),
        scope_text(&settings.scope)
    );
    for recorded in &report.episodes {
        out.push('\n');
        episode(&mut out, 1, recorded, paint);
    }
    out.trim_end().to_owned()
}

pub fn consolidated(report: &Consolidated, paint: Paint) -> String {
    if report.read == 0 && report.failed.is_empty() {
        return "No episode is waiting for a pass.".to_owned();
    }
    let mut out = format!(
        "Read {} and wrote {}.\n",
        plural(report.read, "episode", "episodes"),
        plural(report.asserted.len(), "fact", "facts")
    );
    for asserted in &report.asserted {
        out.push('\n');
        fact(&mut out, 1, asserted, paint);
    }
    for superseded in &report.superseded {
        if let (Some(old), Some(new)) = (&superseded.old, &superseded.new) {
            let _ = write!(
                out,
                "\n{} {}\n  {} {}\n",
                paint.bold("superseded"),
                old.content,
                paint.dim("by"),
                new.content
            );
        }
    }
    for sourced in &report.sourced {
        if let (Some(held), Some(added)) = (&sourced.fact, &sourced.episode) {
            let _ = writeln!(
                out,
                "\n{} {}",
                paint.bold("another source for"),
                held.content
            );
            episode(&mut out, 1, added, paint);
        }
    }
    for failed in &report.failed {
        let _ = writeln!(
            out,
            "\n{} {}: {}",
            paint.fail("failed"),
            plural(failed.episodes.len(), "episode waits", "episodes wait"),
            failed.error
        );
    }
    for skipped in &report.skipped {
        let _ = writeln!(
            out,
            "\n{} {skipped}",
            paint.dim("left out, naming no episode:")
        );
    }
    out.trim_end().to_owned()
}

pub fn asked(report: &Asked, paint: Paint) -> String {
    let mut out = format!("{}\n\n", report.answer);
    let place = if report.local {
        "on this machine"
    } else {
        "on a hosted model"
    };
    let _ = writeln!(
        out,
        "{}",
        paint.dim(&format!(
            "{} from {}, {place}, given {} ranked by {}, each scoring {:.2} or more",
            report.id,
            report.model,
            plural(report.facts.len(), "fact", "facts"),
            report.scorer,
            report.floor
        ))
    );
    let _ = write!(
        out,
        "{}",
        paint.dim(&format!("Trace the answer: cortex why {}", report.id))
    );
    out
}

fn answer(out: &mut String, label: &str, answer: &Answer, paint: Paint) {
    let _ = writeln!(
        out,
        "{} {}",
        paint.bold(label),
        paint.dim(&format!(
            "{}  {}, {}",
            answer.id,
            answer.provider.as_deref().unwrap_or(&answer.model),
            date(answer.created_at)
        ))
    );
    indented(out, 1, &answer.content);
}

pub fn why(report: &Why, paint: Paint) -> String {
    let mut out = String::new();
    match report {
        Why::Answer {
            answer: said,
            derivation,
        } => {
            answer(&mut out, "answer", said, paint);
            if let Some(question) = &derivation.question {
                let _ = writeln!(out, "  {} {question}", paint.bold("question"));
            }
            if let Some(context) = derivation.context {
                let _ = writeln!(
                    out,
                    "  {} {}",
                    paint.bold("context"),
                    paint.dim(&format!(
                        "{context}  {}, {}",
                        derivation.strategy.as_deref().unwrap_or_default(),
                        plural(derivation.facts.len(), "fact placed", "facts placed")
                    ))
                );
            }
            for placed in &derivation.facts {
                let content = placed
                    .fact
                    .as_ref()
                    .map_or("a fact Engram no longer holds", |fact| {
                        fact.content.as_str()
                    });
                let _ = writeln!(out, "    {} {content}", paint.bold("fact"));
                if let Some(fact) = &placed.fact {
                    let _ = writeln!(
                        out,
                        "      {}",
                        paint.dim(&format!("{}  confidence {:.2}", fact.id, fact.confidence))
                    );
                }
                let _ = writeln!(out, "      {} {}", paint.dim("placed:"), placed.reason);
                for under in &placed.episodes {
                    episode(&mut out, 3, under, paint);
                }
            }
        }
        Why::Fact { fact: held } => fact(&mut out, 0, held, paint),
        Why::Node { nodes } => {
            for node in nodes {
                let kind = serde_json::to_value(node.kind)
                    .ok()
                    .and_then(|kind| kind.as_str().map(str::to_owned))
                    .unwrap_or_default();
                let _ = writeln!(
                    out,
                    "{} {}",
                    paint.bold(&kind),
                    paint.dim(&node.id.to_string())
                );
                indented(&mut out, 1, &node.text);
            }
        }
    }
    out.trim_end().to_owned()
}

pub fn forgot(report: &Forgot, paint: Paint) -> String {
    let mut out = format!(
        "Forgot {}.\n",
        plural(report.episodes.len(), "episode", "episodes")
    );
    for forgotten in &report.episodes {
        episode(&mut out, 1, forgotten, paint);
    }
    if !report.facts.is_empty() {
        let _ = writeln!(
            out,
            "\nRemoved {} that rested on nothing else.",
            plural(report.facts.len(), "fact", "facts")
        );
        for removed in &report.facts {
            let _ = writeln!(out, "  {} {}", paint.bold("fact"), removed.content);
        }
    }
    if !report.restored.is_empty() {
        let _ = writeln!(
            out,
            "\n{} current again, since what superseded {} is forgotten.",
            plural(report.restored.len(), "fact is", "facts are"),
            if report.restored.len() == 1 {
                "it"
            } else {
                "them"
            }
        );
        for restored in &report.restored {
            let _ = writeln!(out, "  {} {}", paint.bold("fact"), restored.content);
        }
    }
    let _ = write!(
        out,
        "\nRemoved {} and {} in all.",
        plural(
            report.answers.len(),
            "answer that drew on them",
            "answers that drew on them"
        ),
        plural(report.nodes, "trace node", "trace nodes")
    );
    if !report.reanchored.is_empty() {
        let _ = write!(
            out,
            "\nRecorded {} again from the episodes they still rest on.",
            plural(report.reanchored.len(), "fact", "facts")
        );
    }
    out
}

pub fn replayed(report: &Replayed, paint: Paint) -> String {
    let mut out = String::new();
    answer(&mut out, "before", &report.before, paint);
    answer(&mut out, "after", &report.after, paint);
    if report.identical {
        let _ = write!(
            out,
            "\nThe two answers are identical, by {}.",
            report.scorer
        );
    } else {
        let _ = write!(
            out,
            "\n{}\n  {}",
            paint.bold("changes"),
            diff::line(&report.changes)
        );
    }
    out
}
