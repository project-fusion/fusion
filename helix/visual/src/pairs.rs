//! Pairs: two renders of one entry, compared with each other at every shot.
//!
//! **No baseline, so nothing to retake and nothing to commit.** Each side is
//! pictured from a navigation of its own, every shot of a side from that one
//! load, and the second side's picture is judged against the first's with the
//! source's diff. A difference is taken again, both sides from fresh loads, so
//! a page that had not settled is named as such and not reported as a
//! difference.
//!
//! **A side can fail before any pixel is compared.** A tag nothing defines, a
//! problem the source's `check` reports on the side's page, or a console error
//! the source's `errors` rule counts: each is named with the side's label, and
//! the pictures of that pair are not judged.

use std::collections::BTreeMap;

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::{json, Value};

use crate::config::{Config, Errors, Shot, Source};
use crate::diff;
use crate::discover::Entry;
use crate::driver::Driver;
use crate::harness;
use crate::image;
use crate::run::{capture, exception_for, judge, shot_request, Captured, Fate, Measure, Verdict};

const LETTERS: [&str; 2] = ["a", "b"];

/// A failed shot's two sides and, where there is one, the image of their
/// difference.
pub type Pictures = (Vec<u8>, Vec<u8>, Option<Vec<u8>>);

/// What the pairs came to, keyed by each entry's index in the run.
pub struct Compared {
    pub fates: BTreeMap<(usize, usize), Fate>,
    pub pictures: BTreeMap<(usize, usize), Pictures>,
    /// The seconds both sides of an entry took together.
    pub seconds: BTreeMap<usize, f64>,
}

fn labels(config: &Config, entry: &Entry) -> [String; 2] {
    match &config.sources[entry.source] {
        Source::Pairs(pairs) => pairs.labels.clone(),
        _ => [LETTERS[0].to_string(), LETTERS[1].to_string()],
    }
}

/// One side of a pair, in the shape the driver takes, under `key`.
fn side_item(
    config: &Config,
    entry: &Entry,
    side: usize,
    shots: &[&Shot],
    key: &str,
) -> Outcome<Value> {
    let Source::Pairs(source) = &config.sources[entry.source] else {
        return Err(Failure::new(
            Code::Internal,
            "a pair",
            "its source is not a pairs source",
        ));
    };
    let Some(sides) = entry.sides.as_ref() else {
        return Err(Failure::new(
            Code::Internal,
            "a pair",
            format!("`{}` has no sides", entry.id),
        ));
    };
    let given = &sides[side];
    let label = &source.labels[side];
    let mut out = json!({
        "check": source.check.then(|| source.name.clone()),
        "entry": { "id": entry.id, "name": entry.name, "side": label, "source": source.name },
        "errors": source.errors != Errors::Ignore,
        "inspect": false,
        "key": key,
        "shots": shots.iter().map(|shot| shot_request(config, entry, shot)).collect::<Vec<_>>(),
    });
    if let Some(url) = given["url"].as_str() {
        out["url"] = json!(url);
        return Ok(out);
    }
    let strings = |field: &str| -> Vec<String> {
        given[field]
            .as_array()
            .map(|all| {
                all.iter()
                    .filter_map(Value::as_str)
                    .map(str::to_string)
                    .collect()
            })
            .unwrap_or_default()
    };
    let page = harness::document(
        &format!("{} ({label})", entry.id),
        &strings("styles"),
        &strings("scripts"),
        source
            .harness
            .resolved()
            .map(|harness| harness::css(&harness, shots[0]))
            .as_deref(),
        given["head"].as_str().unwrap_or_default(),
        given["body"].as_str().unwrap_or_default(),
    );
    out["dir"] = given.get("dir").cloned().unwrap_or(Value::Null);
    out["files"] = given.get("files").cloned().unwrap_or_else(|| json!({}));
    out["html"] = json!(page);
    out["path"] = json!(format!("/{}@{}/", entry.id, LETTERS[side]));
    Ok(out)
}

/// Why `prepare` could not build a side of the pair, which it says with an
/// `error` on that side, or nothing.
fn unbuilt(config: &Config, entry: &Entry) -> Option<String> {
    let named = labels(config, entry);
    let sides = entry.sides.as_ref()?;
    let found: Vec<String> = sides
        .iter()
        .zip(&named)
        .filter_map(|(side, label)| side["error"].as_str().map(|why| format!("{label}: {why}")))
        .collect();
    (!found.is_empty()).then(|| found.join("; "))
}

/// Why a pair cannot be judged from what its two pages reported, or nothing.
fn unjudgeable(
    captured: &Captured,
    at: usize,
    labels: &[String; 2],
    errors: Errors,
) -> Option<String> {
    let mut found = Vec::new();
    for (side, label) in labels.iter().enumerate() {
        if let Some(why) = captured.broken.get(&(at * 2 + side)) {
            found.push(format!("{label}: {why}"));
        }
    }
    for (side, label) in labels.iter().enumerate() {
        for problem in captured
            .problems
            .get(&(at * 2 + side))
            .into_iter()
            .flatten()
        {
            found.push(format!("{label}: {problem}"));
        }
    }
    let logged = |side: usize| {
        captured
            .errors
            .get(&(at * 2 + side))
            .cloned()
            .unwrap_or_default()
    };
    match errors {
        Errors::Ignore => {}
        Errors::Any => {
            for (side, label) in labels.iter().enumerate() {
                for error in logged(side) {
                    found.push(format!("{label} logged an error: {error}"));
                }
            }
        }
        Errors::New => {
            let first = logged(0);
            for error in logged(1).into_iter().filter(|one| !first.contains(one)) {
                found.push(format!(
                    "{} logged an error {} did not: {error}",
                    labels[1], labels[0]
                ));
            }
        }
    }
    (!found.is_empty()).then(|| found.join("; "))
}

/// Pictures and judges every pair in `entries`, each given with its index in
/// the run and the shots it is taken in.
#[allow(clippy::too_many_lines)] // Two takes of one sequence, read top to bottom.
pub fn compare(
    driver: &mut Driver,
    config: &Config,
    entries: &[(usize, &Entry, Vec<usize>)],
    settle: (Option<&str>, Option<&str>),
) -> Outcome<Compared> {
    let internal = |why: String| Failure::new(Code::Internal, "a pair", why);
    let mut items = Vec::new();
    let mut keys = BTreeMap::new();
    for (at, entry, shots) in entries {
        if shots.is_empty() || unbuilt(config, entry).is_some() {
            continue;
        }
        let taken: Vec<&Shot> = shots.iter().map(|&shot| &config.shots[shot]).collect();
        for (side, letter) in LETTERS.iter().enumerate() {
            let key = format!("{}@{letter}", entry.id);
            keys.insert(key.clone(), at * 2 + side);
            items.push(side_item(config, entry, side, &taken, &key)?);
        }
    }
    let first = capture(driver, &items, &keys, &config.shots, settle)?;

    let mut compared = Compared {
        fates: BTreeMap::new(),
        pictures: BTreeMap::new(),
        seconds: BTreeMap::new(),
    };
    let errors_of = |entry: &Entry| match &config.sources[entry.source] {
        Source::Pairs(pairs) => pairs.errors,
        _ => Errors::Ignore,
    };
    let mut again: Vec<(usize, usize)> = Vec::new();
    for (at, entry, shots) in entries {
        let at = *at;
        let named = labels(config, entry);
        compared.seconds.insert(
            at,
            first.seconds.get(&(at * 2)).unwrap_or(&0.0)
                + first.seconds.get(&(at * 2 + 1)).unwrap_or(&0.0),
        );
        let refused =
            unbuilt(config, entry).or_else(|| unjudgeable(&first, at, &named, errors_of(entry)));
        let pictured = match &config.sources[entry.source] {
            Source::Pairs(pairs) => pairs.compare,
            _ => true,
        };
        for &shot in shots {
            if let Some(why) = &refused {
                compared.fates.insert((at, shot), Fate::Broken(why.clone()));
                continue;
            }
            if !pictured {
                compared.fates.insert((at, shot), Fate::Matched);
                continue;
            }
            let (Some(a), Some(b)) = (
                first.pictures.get(&(at * 2, shot)),
                first.pictures.get(&(at * 2 + 1, shot)),
            ) else {
                compared.fates.insert(
                    (at, shot),
                    Fate::Broken("the driver returned no picture".to_string()),
                );
                continue;
            };
            let picture = &config.shots[shot];
            let exception = exception_for(&config.exceptions, entry, picture);
            let diff = config.sources[entry.source].diff().unwrap_or(&config.diff);
            let allowed = exception.and_then(|one| one.pixels).unwrap_or(diff.pixels);
            let known = exception.filter(|one| one.differs);
            let reason = exception.map(|one| match &one.measured {
                Some(measured) => format!("{} Measured: {measured}", one.reason),
                None => one.reason.clone(),
            });
            let fate = match judge(Some(a), b, diff, allowed) {
                Err(why) => Fate::Broken(why),
                /* Confirmed before it is called spent, as a difference is
                confirmed before it is called one. */
                Ok(Verdict::Matched)
                    if exception.is_some_and(|one| one.differs || one.pixels.is_some()) =>
                {
                    again.push((at, shot));
                    continue;
                }
                Ok(Verdict::Within(measure))
                    if exception.is_some_and(|one| one.pixels.is_some()) =>
                {
                    Fate::Tolerated {
                        measure,
                        reason: reason.unwrap_or_default(),
                    }
                }
                Ok(Verdict::Matched | Verdict::Within(_)) => Fate::Matched,
                Ok(Verdict::Differs(measure)) if known.is_some() => Fate::Tolerated {
                    measure,
                    reason: reason.unwrap_or_default(),
                },
                Ok(Verdict::Resized { from, to }) if known.is_some() => Fate::Tolerated {
                    measure: Measure::Size { a: from, b: to },
                    reason: reason.unwrap_or_default(),
                },
                Ok(_) => {
                    again.push((at, shot));
                    continue;
                }
            };
            compared.fates.insert((at, shot), fate);
        }
    }

    if again.is_empty() {
        return Ok(compared);
    }
    let mut items = Vec::new();
    let mut keys = BTreeMap::new();
    for &(at, shot) in &again {
        let Some((_, entry, _)) = entries.iter().find(|(index, _, _)| *index == at) else {
            continue;
        };
        let picture = &config.shots[shot];
        for (side, letter) in LETTERS.iter().enumerate() {
            let key = format!("{}@{letter}#{}", entry.id, picture.name);
            keys.insert(key.clone(), at * 2 + side);
            items.push(side_item(config, entry, side, &[picture], &key)?);
        }
    }
    let second = capture(driver, &items, &keys, &config.shots, settle)?;
    for &(at, shot) in &again {
        let Some((_, entry, _)) = entries.iter().find(|(index, _, _)| *index == at) else {
            continue;
        };
        let named = labels(config, entry);
        if let Some(why) = unjudgeable(&second, at, &named, errors_of(entry)) {
            compared.fates.insert((at, shot), Fate::Broken(why));
            continue;
        }
        let (Some(a), Some(b)) = (
            second.pictures.get(&(at * 2, shot)),
            second.pictures.get(&(at * 2 + 1, shot)),
        ) else {
            compared.fates.insert(
                (at, shot),
                Fate::Broken("the driver returned no picture on the second take".to_string()),
            );
            continue;
        };
        let picture = &config.shots[shot];
        let exception = exception_for(&config.exceptions, entry, picture);
        let diff = config.sources[entry.source].diff().unwrap_or(&config.diff);
        let allowed = exception.and_then(|one| one.pixels).unwrap_or(diff.pixels);
        let excused = exception.is_some_and(|one| one.differs || one.pixels.is_some());
        let fate = match judge(Some(a), b, diff, allowed) {
            Err(why) => Fate::Broken(why),
            Ok(Verdict::Matched | Verdict::Within(_)) if excused => Fate::Spent,
            Ok(Verdict::Matched | Verdict::Within(_)) => Fate::Steadied,
            Ok(Verdict::Differs(measure)) => {
                let before = image::decode(a).map_err(internal)?;
                let after = image::decode(b).map_err(internal)?;
                let (_, drawn) = diff::marked(&before, &after, diff.threshold);
                let encoded = image::encode(&drawn).map_err(internal)?;
                compared
                    .pictures
                    .insert((at, shot), (a.clone(), b.clone(), Some(encoded)));
                Fate::Differs {
                    marked: None,
                    measure,
                }
            }
            Ok(Verdict::Resized { from, to }) => {
                compared
                    .pictures
                    .insert((at, shot), (a.clone(), b.clone(), None));
                Fate::Differs {
                    marked: None,
                    measure: Measure::Size { a: from, b: to },
                }
            }
            Ok(Verdict::Missing) => Fate::Broken("a side had no picture".to_string()),
        };
        compared.fates.insert((at, shot), fate);
    }
    Ok(compared)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn captured() -> Captured {
        Captured {
            aria: BTreeMap::new(),
            broken: BTreeMap::new(),
            errors: BTreeMap::new(),
            findings: BTreeMap::new(),
            painted: BTreeMap::new(),
            pictures: BTreeMap::new(),
            problems: BTreeMap::new(),
            seconds: BTreeMap::new(),
        }
    }

    fn names() -> [String; 2] {
        ["client".to_string(), "hydrated".to_string()]
    }

    #[test]
    fn a_new_error_on_the_second_side_fails_the_pair() {
        let mut taken = captured();
        taken.errors.insert(0, vec!["shared".to_string()]);
        taken
            .errors
            .insert(1, vec!["shared".to_string(), "mismatch".to_string()]);
        assert_eq!(
            unjudgeable(&taken, 0, &names(), Errors::New).unwrap(),
            "hydrated logged an error client did not: mismatch"
        );
        assert!(unjudgeable(&taken, 0, &names(), Errors::Ignore).is_none());
        assert!(unjudgeable(&taken, 0, &names(), Errors::Any)
            .unwrap()
            .contains("client logged an error: shared"));
    }

    #[test]
    fn a_problem_or_a_broken_side_is_named_by_its_label() {
        let mut taken = captured();
        taken.broken.insert(3, "nothing defines <x-y>".to_string());
        taken
            .problems
            .insert(2, vec!["rendered nothing".to_string()]);
        assert_eq!(
            unjudgeable(&taken, 1, &names(), Errors::New).unwrap(),
            "hydrated: nothing defines <x-y>; client: rendered nothing"
        );
        assert!(unjudgeable(&captured(), 1, &names(), Errors::New).is_none());
    }
}
