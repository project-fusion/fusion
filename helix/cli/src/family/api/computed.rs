//! The values an element's features compute, each by the path a render
//! reads it at: `stop.place`, `stop.words.back`, `tour.spot.height`.
//!
//! **A feature's value is read by the feature and the field that names it**,
//! as `stack.label` reads the words of the page a stack shows: `stop({
//! place: 'place' })` computes `place`, which a render reads as
//! `stop.place`. A field that names several values names them by a word
//! each, as a stop's `words` names `back-words`, `next-words`, and
//! `skip-words`, read as `stop.words.back` and the rest.

use super::{copy, countdown, delay, notices, sections, stack, total, tour};
use crate::family::read::Lit;

/// The features a render reads a computed value of, by their key.
pub const FEATURES: &[&str] = &[
    "copy",
    "countdown",
    "delay",
    "notice",
    "notices",
    "queue",
    "sections",
    "stack",
    "stop",
    "total",
    "tour",
];

/// Each computed value the features among `fields` give, as `(path, name)`,
/// the path in camelCase from the feature's key.
///
/// # Errors
///
/// A feature's own refusal, where one is not in its shape.
pub fn reads(fields: &[(String, Lit)]) -> Result<Vec<(String, String)>, String> {
    let mut read = Vec::new();
    let mut push = |path: &str, name: &str| read.push((path.to_owned(), name.to_owned()));
    for (key, value) in fields {
        let Some((key, value)) = super::spelling::feature(key, value)? else {
            continue;
        };
        let value = &value;
        match key.as_str() {
            "copy" => {
                let copy = copy::copy(value)?;
                push("copy.copied", &copy.copied);
                push("copy.failed", &copy.failed);
                push("copy.label", &copy.says);
                push("copy.status", &copy.told);
            }
            "countdown" => push("countdown.paused", &countdown::countdown(value)?.paused),
            "delay" => push("delay.pending", &delay::delay(value)?.waiting),
            "notice" => push("notice.held", &notices::notice(value)?.waiting),
            "notices" => push("notices.showing", &notices::notices(value)?.showing),
            "queue" => push("queue.queued", &countdown::queue(value)?.waiting),
            "sections" => push("sections.list", &sections::sections(value)?.list),
            "stack" => {
                let stack = stack::stack(value)?;
                for (path, name) in [
                    ("stack.drilled", &stack.drilled),
                    ("stack.title", &stack.label),
                ] {
                    if let Some(name) = name {
                        push(path, name);
                    }
                }
            }
            "stop" => {
                let stop = tour::stop(value)?;
                for (path, name) in [
                    ("stop.counted", &stop.counted),
                    ("stop.name", &stop.name),
                    ("stop.place", &stop.place),
                    ("stop.reach", &stop.reach),
                    ("stop.said", &stop.said),
                    ("stop.shown", &stop.shown),
                ] {
                    push(path, name);
                }
                for one in ["back", "next", "skip"] {
                    push(
                        &format!("stop.words.{one}"),
                        &format!("{one}-{}", stop.words),
                    );
                }
            }
            "total" => {
                if let Some(holds) = total::total(value)?.holds {
                    push("total.holds", &holds);
                }
            }
            "tour" => {
                let tour = tour::tour(value)?;
                push("tour.lit", &tour.lit);
                push("tour.veiled", &tour.veiled);
                for one in ["height", "width", "x", "y"] {
                    push(
                        &format!("tour.spotlight.{one}"),
                        &format!("{}-{one}", tour.spot),
                    );
                }
            }
            _ => {}
        }
    }
    Ok(read)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use super::reads;
    use crate::family::read::default_export;

    /// Every value a feature computes is one a render can read, and nothing
    /// else is, so the paths cannot drift from what the compiler resolves.
    #[test]
    fn each_feature_value_a_render_reads_is_one_the_compiler_computes() {
        for (key, source) in [
            ("copy", "{ copied: 'c', duration: 'a', failed: 'f', label: 's', labels: { copied: 'cc', failed: 'ff', idle: 'r' }, onCopy: 'e', onError: 'x', prop: 't', status: 'o' }"),
            ("stop", "{ back: 'b', counted: 'c', current: 'u', first: 'f', last: 'l', name: 'n', next: 'x', onAsk: 'a', place: 'p', reach: 'r', said: 's', shown: 'h', skip: 'k', target: 't', words: 'words' }"),
            ("tour", "{ lit: 'l', onAsk: 'a', onBeforeChange: 'b', onChange: 'm', onComplete: 'c', preparing: 'p', prop: 'i', spotlight: 'spot', veiled: 'v', waiting: 'w' }"),
            ("total", "{ holds: 'h', itemProp: 'p', of: 'o', prop: 'i' }"),
        ] {
            let lit = default_export(&format!("export default {source}")).unwrap();
            let read: BTreeSet<String> = reads(&[(key.to_owned(), lit.clone())])
                .unwrap()
                .into_iter()
                .map(|(_, name)| name)
                .collect();
            let (_, lit) = super::super::spelling::feature(key, &lit).unwrap().unwrap();
            let computed: BTreeSet<String> = match key {
                "copy" => super::copy::copy(&lit).unwrap().computed().map(str::to_owned).into(),
                "stop" => super::tour::stop(&lit).unwrap().computed().map(str::to_owned).collect(),
                "tour" => super::tour::tour(&lit).unwrap().computed().map(str::to_owned).collect(),
                _ => super::total::total(&lit).unwrap().holds.into_iter().collect(),
            };
            assert_eq!(read, computed, "{key}");
        }
    }
}
