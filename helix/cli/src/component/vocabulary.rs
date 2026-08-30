//! One spelling for each role a part name can play.
//!
//! **A part name is the most coupled door a consumer goes through**, and it is
//! the last one they are told to try. Twenty vocabularies for twenty components
//! is what makes it a last resort rather than a structure. Counted across two
//! tiers when this was written, 204 part names served 92 families and nine of
//! those words meant "the box in the middle": `surface` in five families,
//! `content` in eleven, `panel` in three, `container` in two, `box` in two,
//! `viewport` in two, and one each for `body` and `wrapper`. One family used
//! both `panel` and `content`; another used both `content` and `container`.
//!
//! **Only the generic words are registered, and that is the whole design.** A
//! `thumb`, a `terminus`, a `swatch` or a `weekday` names a thing that component
//! actually has, and no registry should have an opinion about it. What drifts is
//! the words naming a *position* rather than a thing, because every component
//! has a box in the middle and nothing tells the next one what to call it.
//!
//! **The registry ships with the rule and the exceptions do not.** A consumer
//! extending Helix inherits Helix's vocabulary, which is the point: their
//! `wrapper` is as confusing as ours was. What their own components render
//! outside it is theirs, so `unresolved` is configuration, and an entry nothing
//! renders any more is reported so it gets deleted rather than kept.

use std::collections::BTreeMap;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// The registered words, each with the one question it answers.
const ROLES: [(&str, &str); 6] = [
    ("box", "the drawn control, where the host is not it"),
    ("container", "an element's own outer box"),
    ("content", "a region the consumer fills"),
    (
        "panel",
        "a region switched between, or a sheet anchored to an edge",
    ),
    ("surface", "a floating panel drawn over the page"),
    (
        "viewport",
        "a scrollport the component reads the position of",
    ),
];

/// Spellings a registered word already covers, each naming its replacement.
///
/// **A permanent deny-list, not a queue.** The point of recording that `wrapper`
/// means `container` is that the next person reaching for it is stopped, rather
/// than told the entry is stale once nothing renders it.
const REFUSED: [(&str, &str); 1] = [("wrapper", "container")];

static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"part="([a-z0-9 -]+)""#).expect("a literal pattern compiles"));

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/|//[^\n]*").expect("a literal pattern compiles"));

pub fn run(context: &Context) -> Report {
    let roles: BTreeMap<&str, &str> = ROLES.into_iter().collect();
    let refused: BTreeMap<&str, &str> = REFUSED.into_iter().collect();
    let mut findings = Vec::new();
    let mut seen: BTreeMap<String, String> = BTreeMap::new();

    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(raw) = fs::read_to_string(&file) else {
                continue;
            };
            let code = COMMENT.replace_all(&raw, |found: &regex::Captures| {
                found[0]
                    .chars()
                    .map(|one| if one == '\n' { '\n' } else { ' ' })
                    .collect::<String>()
            });
            let where_ = file
                .strip_prefix(&context.root)
                .unwrap_or(&file)
                .to_string_lossy()
                .replace('\\', "/");

            for found in PART.captures_iter(&code) {
                let whole = found.get(0).expect("group zero always matches");
                /* `[part="x"]` is a selector reaching for a name, not a
                declaration of one, and the rule is about what is rendered. */
                if code[..whole.start()].ends_with('[') {
                    continue;
                }
                let line = code[..whole.start()].matches('\n').count() + 1;
                for word in found[1].split_whitespace() {
                    seen.entry(word.to_owned())
                        .or_insert_with(|| format!("{where_}:{line}"));
                    let Some(instead) = refused.get(word) else {
                        continue;
                    };
                    findings.push(Finding {
                        detail: format!(
                            "One spelling per role, or a consumer styling twenty components \
                             learns twenty vocabularies. `{instead}` is the registered word for \
                             {}.",
                            roles.get(instead).unwrap_or(instead)
                        ),
                        file: format!("{where_}:{line}"),
                        message: format!("renders `part=\"{word}\"`"),
                    });
                }
            }
        }
    }

    /* An entry nothing renders is a note about a fix that already happened. */
    for (word, note) in &context.settings.unresolved {
        if seen.contains_key(word) {
            continue;
        }
        findings.push(Finding {
            detail: note.clone(),
            file: context.settings.source.clone(),
            message: format!("`{word}` is listed as unresolved and nothing renders it any more"),
        });
    }

    Report {
        checked: ROLES
            .iter()
            .filter(|(word, _)| seen.contains_key(*word))
            .count(),
        findings,
        notes: Vec::new(),
        unit: "registered role words in use",
    }
}
