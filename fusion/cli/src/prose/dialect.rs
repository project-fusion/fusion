//! Holds every word this repository writes to American spelling.
//!
//! **The rule was never written down, which is why it did not survive.** A sweep
//! on 19 Aug 2026 took the count from 658 occurrences to 239, and four days
//! later it was 1,685 across 386 files. Nothing checked it, so there was no line
//! for a contributor to have read and no check to fail.
//!
//! **Comments count, and that is the whole of why the first sweep decayed.** An
//! unwritten convention is learned from the corpus, so prose in the wrong
//! dialect teaches the next person to write it.
//!
//! **Pairs rather than a dictionary.** A spell checker would need a word list
//! for every proper noun, token name and API term this repository invents, and
//! would fail on `helix`, `oklch` and `megamenu` before it found a `color`. A
//! closed list of British forms cannot produce a false positive on a word nobody
//! has heard of, and the only cost is that it finds nothing it was not told
//! about, which is a cost a sweep pays once.
//!
//! **Generated files are skipped**, because their source is checked and they are
//! rewritten from it. Fixing a manifest by hand would be fixed back on the next
//! `analyze`.
//!
//! **And the list is exempt from itself.** It is British by construction and
//! lives in a file the walk reaches, so a sweep would rewrite it into pairs with
//! the same word on both sides, after which the check reports every file
//! American while reading nothing. The settings file is the exemption, the same
//! one [`crate::prose::repository`] takes and for the same reason: a rule cannot
//! be held to a list it is the list of.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use regex::{Regex, RegexBuilder};

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

/// The regular inflections of a pair, on top of the ones written by hand.
///
/// **A closed suffix set rather than `[a-z]*`**, because the open form matches a
/// compound as readily as an inflection: `aria-labelledby` is the platform's own
/// attribute and `ColourInput` is an alias that exists so a British speaker
/// finds the family, and both would be rewritten into something that does not
/// work. A compound that does need catching is cheaper as its own pair than as a
/// rule with exceptions.
const SUFFIXES: [&str; 8] = ["", "d", "ed", "es", "ing", "r", "rs", "s"];

/// American words the suffixes would otherwise manufacture a fault out of.
///
/// `analyses` is the American plural of `analysis` as well as the British verb,
/// so it is named here rather than guessed at.
const COLLISIONS: [&str; 1] = ["analyses"];

/// The marker a line uses to say its British spellings are quoted, not written.
///
/// **Prose about spelling has to be able to name a spelling.** A queue row
/// recording that `::part(center)` was a real public part loses the name of the
/// thing it is about the moment the sweep reaches it.
///
/// An explicit marker rather than a rule that guesses. Backticks are the
/// tempting signal and the wrong one: an identifier named in a comment is
/// backticked too, and an identifier spelled the British way is exactly what
/// this should catch. Whether a word is being used or named is something only
/// the author knows, so the author says it, on the line, where a reader sees it.
const QUOTED: &str = "dialect:quoted";

/// What a person writes, as against what a build wrote from it.
const EXTENSIONS: [&str; 12] = [
    "css", "html", "md", "mdx", "mjs", "rs", "toml", "ts", "tsx", "yml", "yaml", "json",
];

/// Directories that hold output and are not on the shared list.
///
/// **Not added to that list**, which is read by every rule that walks: these
/// three are output here and a rule about what a package ships has business in
/// at least one of them. The cost of keeping them local is this comment.
const OUTPUT: [&str; 3] = [".vercel", "coverage", "wasm"];

/// Written by a generator from a source this check already reads.
///
/// A fix in one of these would be undone by the next build.
fn generated() -> Regex {
    Regex::new(
        r"(\.generated\.\w+|custom-elements\.json|jsx\.d\.ts|vue\.d\.ts|elements\.css|\.css\.ts|catalog\.generated\.json|peers\.json|oracle\.json|metrics\.mdx)$",
    )
    .expect("a literal pattern compiles")
}

/// Every pair and the regular inflections of each, as one pattern and a lookup.
///
/// **`\b` at both ends makes the list a list of exact words**, so a stem never
/// matches inside its own plural: the pair for the commonest word in the
/// repository caught one occurrence of eighty-six, and stems alone let 255
/// occurrences past the check, four of them accounting for 194.
///
/// The bounds also settle what a stem may claim of its own inflection: the
/// six-letter opening of a seven-letter form is not a match when the character
/// after it has to be a non-word one, so each inflection needs its own entry
/// and gets one. Every replacement is American, so no rewrite can manufacture
/// work for a later pair.
///
/// **One alternation rather than a pattern per form**, which is a fact about
/// cost rather than about spelling: five hundred and sixty patterns run against
/// every line of every file in the repository took the check past two minutes,
/// and one pattern that finds any of them and looks the answer up is the same
/// measurement in about a second.
struct Dialect {
    american: BTreeMap<String, String>,
    british: Regex,
}

fn inflected(pairs: &BTreeMap<String, String>) -> Dialect {
    let mut american = BTreeMap::new();
    /* **A written pair beats a manufactured one, and that ordering is the whole
    of why this is two passes.** Several stems are written down beside their own
    past tense, and a stem plus the `d` suffix manufactures that past tense as
    well — as the American stem with a `d` on it, which is a word in neither
    dialect. Whichever is reached first wins, so the one a person wrote has to be
    reached first. Ordering the source list is the other way to get this, and it
    is the way that decays: the list arrives sorted, and sorting puts every stem
    ahead of its own inflection. */
    for (british, wanted) in pairs {
        american.insert(british.clone(), wanted.clone());
    }
    for (british, wanted) in pairs {
        for suffix in SUFFIXES {
            let from = format!("{british}{suffix}");
            if COLLISIONS.contains(&from.as_str()) {
                continue;
            }
            american
                .entry(from)
                .or_insert_with(|| format!("{wanted}{suffix}"));
        }
    }
    /* Longest first, so a shorter form cannot claim the opening of a longer one
    at the same position and leave the rest of the word behind it. The bounds
    make that impossible on their own; the ordering means it does not have to
    be reasoned about again. */
    let mut forms: Vec<&String> = american.keys().collect();
    forms.sort_by(|one, two| two.len().cmp(&one.len()).then(one.cmp(two)));
    let alternation = forms
        .iter()
        .map(|one| regex::escape(one))
        .collect::<Vec<String>>()
        .join("|");
    let british = RegexBuilder::new(&format!(r"\b(?:{alternation})\b"))
        .case_insensitive(true)
        .build()
        .expect("an alternation of escaped words compiles");
    Dialect { american, british }
}

impl Dialect {
    /// What a found word should have been, if it should have been anything.
    fn wanted(&self, word: &str) -> Option<String> {
        let fixed = like(word, self.american.get(&word.to_lowercase())?);
        (fixed != word).then_some(fixed)
    }
}

/// Keeps the case the author wrote: `Color` becomes `Color`, `COLOR` `COLOR`.
fn like(source: &str, replacement: &str) -> String {
    if source == source.to_uppercase() {
        return replacement.to_uppercase();
    }
    let mut characters = source.chars();
    if characters.next().is_some_and(char::is_uppercase) {
        let mut wanted = replacement.chars();
        return match wanted.next() {
            Some(first) => first.to_uppercase().collect::<String>() + wanted.as_str(),
            None => replacement.to_owned(),
        };
    }
    replacement.to_owned()
}

/// One line, every pair applied. No pattern spans a newline, so this is whole.
fn sweep(line: &str, dialect: &Dialect) -> String {
    if !dialect.british.is_match(line) {
        return line.to_owned();
    }
    dialect
        .british
        .replace_all(line, |caught: &regex::Captures| {
            let word = &caught[0];
            dialect.wanted(word).unwrap_or_else(|| word.to_owned())
        })
        .into_owned()
}

/// Every file this rule is responsible for, and what a sweep would make of it.
///
/// Line by line rather than whole-file, which is what makes the exemption
/// expressible: a range of lines can be skipped and a substring of a file cannot
/// be, not without losing the line numbers the report is made of.
fn survey(context: &Context) -> (usize, Vec<(PathBuf, String, String)>) {
    let dialect = inflected(&context.settings.dialect);
    let generated = generated();

    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path: &Path| {
            let where_ = path.to_string_lossy().replace('\\', "/");
            if OUTPUT
                .iter()
                .any(|one| where_.contains(&format!("/{one}/")))
            {
                return false;
            }
            path.extension()
                .is_some_and(|one| EXTENSIONS.contains(&one.to_string_lossy().as_ref()))
                && !generated.is_match(&where_)
        },
        &mut files,
    );

    let mut changed = Vec::new();
    let mut checked = 0;
    for file in files {
        /* The list is British by construction. See the docblock. */
        if file.strip_prefix(&context.root).unwrap_or(&file) == Path::new("fusion.json") {
            continue;
        }
        let Ok(before) = fs::read_to_string(&file) else {
            continue;
        };
        checked += 1;
        let after = before
            .split('\n')
            .map(|line| {
                if line.contains(QUOTED) {
                    line.to_owned()
                } else {
                    sweep(line, &dialect)
                }
            })
            .collect::<Vec<String>>()
            .join("\n");
        if after != before {
            changed.push((file, before, after));
        }
    }
    (checked, changed)
}

pub fn run(context: &Context) -> Report {
    let dialect = inflected(&context.settings.dialect);
    let (checked, changed) = survey(context);

    let mut findings = Vec::new();
    for (file, before, _) in changed {
        let where_ = file
            .strip_prefix(&context.root)
            .unwrap_or(&file)
            .to_string_lossy()
            .replace('\\', "/");
        for (number, line) in before.split('\n').enumerate() {
            if line.contains(QUOTED) {
                continue;
            }
            /* **A match the rewrite would not change is not a finding.** The
            sweep decides what gets written; this decides what gets said, and
            the two have to agree, so both ask the same question of the same
            word. One finding per line, because a line is what a person opens. */
            let Some((word, fixed)) = dialect
                .british
                .find_iter(line)
                .find_map(|found| Some((found.as_str(), dialect.wanted(found.as_str())?)))
            else {
                continue;
            };
            findings.push(Finding {
                detail: "An unwritten convention is learned from the corpus, so prose in the \
                         wrong dialect teaches the next person to write it. Run `fusion prose \
                         fix --only dialect`."
                    .to_owned(),
                file: format!("{where_}:{}", number + 1),
                message: format!("`{word}` is British. Write `{fixed}`."),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "files of prose",
    }
}

pub fn fix(context: &Context) -> Vec<String> {
    let (_, changed) = survey(context);
    let mut written = Vec::new();
    for (file, _, after) in changed {
        if fs::write(&file, after).is_ok() {
            written.push(
                file.strip_prefix(&context.root)
                    .unwrap_or(&file)
                    .to_string_lossy()
                    .replace('\\', "/"),
            );
        }
    }
    written
}
