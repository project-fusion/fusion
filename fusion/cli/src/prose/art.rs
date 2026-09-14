//! Every family in the catalog has a gallery card, and the prose says how many.
//!
//! **A family with no card art renders nothing, deliberately.** Card's media
//! region is a bare slot, so an unassigned one generates no box and a new
//! component simply gets a card with no picture. That is the right default and
//! it is why nobody finds out: nothing fails, warns, or looks wrong.
//!
//! **The counts in those files' own docblocks are prose**, written by hand and
//! carrying the argument for the split, so they drift from the count the page
//! derives. The convention that makes them checkable is that *in these two files
//! a number written as a word is the family count or the folder count, and every
//! other count is written as digits.* Matching on the noun beside the number
//! cannot work ("stated once rather than fifty-seven times" carries no noun),
//! and forbidding every number word flags a true sentence about how many cards
//! move. Digits for anything else costs the prose nothing and makes the check
//! total rather than heuristic.
//!
//! **The counter and the matcher are built from the same two tables**, because a
//! spelled-out list and a separate alternation of decades are two lists that
//! have to agree with nothing making them agree, and a pattern one decade short
//! finds no words to compare and reports that the prose agreed. `spell` spells
//! any number rather than looking one up, `pattern` is assembled from the tables
//! it spells with, and [`tests::the_pattern_finds_everything_the_speller_says`]
//! walks the range and proves it. The proof is a test rather than a runtime
//! panic: it fires on the way in, where a person is watching, rather than in the
//! field where a CLI has no business panicking.

use std::collections::BTreeSet;
use std::fs;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};

const ONES: [&str; 20] = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
];

const TENS: [&str; 10] = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

/// Where a word stops being prose and starts being one of the two counts.
///
/// **Not zero**, for the reason above: forbidding every number word flagged a
/// true sentence about how many cards move. Forty is below any count this
/// catalog has had and above anything the prose says in passing.
const FLOOR: usize = 40;

/// Spells a count, or nothing past what it can say.
///
/// **Nothing rather than a wrong answer** past a thousand, because nothing here
/// counts that high and a count that does needs the thousands case written.
fn spell(count: usize) -> Option<String> {
    if count < 20 {
        return Some(ONES[count].to_owned());
    }
    if count < 100 {
        let tens = TENS[count / 10];
        return Some(if count.is_multiple_of(10) {
            tens.to_owned()
        } else {
            format!("{tens}-{}", ONES[count % 10])
        });
    }
    if count < 1000 {
        let hundreds = format!("{} hundred", ONES[count / 100]);
        return Some(if count.is_multiple_of(100) {
            hundreds
        } else {
            format!("{hundreds} and {}", spell(count % 100)?)
        });
    }
    None
}

/// Every number word from the floor up, in either case.
///
/// **Case-insensitive because prose capitalizes.** A count opening a sentence is
/// written `Ninety-four`, which is the most natural place for one to appear and
/// was the one place a case-sensitive pattern could not see; it read the file,
/// found nothing to compare, and reported that the prose agreed.
///
/// Hundreds first so a longer phrase is not matched as its own opening decade,
/// which works because this crate's alternation prefers the earlier branch. The
/// suffix stays `[a-z-]+` rather than the ones enumerated, so an invented
/// compound like `forty-odd` is still caught and reported.
fn pattern() -> Regex {
    let hundreds = ONES[1..10].join("|");
    let decades = TENS[FLOOR / 10..].join("|");
    Regex::new(&format!(
        r"(?i)\b((?:{hundreds}) hundred(?: and [a-z-]+)?|(?:{decades})(?:-[a-z]+)?)\b"
    ))
    .expect("a pattern built from two literal tables compiles")
}

#[expect(
    clippy::too_many_lines,
    reason = "a rule is one reading of its corpus, and splitting it puts half the reading somewhere else"
)]
pub fn run(context: &Context) -> Report {
    let gallery = &context.settings.gallery;
    let mut findings = Vec::new();
    let art = context.root.join(&gallery.art);

    /* The same derivation the catalog uses, so this cannot disagree with the
    page: a family is the first path segment under `src/` of a module that
    declares a custom element. */
    let slug = Regex::new(r"^src/([^/]+)/").expect("a literal pattern compiles");
    let mut families: BTreeSet<String> = BTreeSet::new();
    for manifest in &gallery.manifests {
        let modules = fs::read_to_string(context.root.join(manifest))
            .ok()
            .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
            .and_then(|one| Some(one.get("modules")?.as_array()?.clone()))
            .unwrap_or_default();
        for module in modules {
            let declares = module
                .get("declarations")
                .and_then(Value::as_array)
                .is_some_and(|all| all.iter().any(|one| one.get("tagName").is_some()));
            if !declares {
                continue;
            }
            if let Some(found) = module
                .get("path")
                .and_then(Value::as_str)
                .and_then(|path| Some(slug.captures(path)?[1].to_owned()))
            {
                families.insert(found);
            }
        }
    }

    /* **The file name is the slug**, one drawing per file under `art/`. It used
    to be a regex over the keys of a record literal, which is a weaker signal:
    the same pattern appears inside a `style` object and a nested JSX prop, and
    the name it reported was whatever the formatter had indented by two. */
    let drawings = art.join("art");
    let drawn: BTreeSet<String> = fs::read_dir(&drawings)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.path().extension().is_some_and(|one| one == "tsx"))
        .filter_map(|entry| {
            entry
                .path()
                .file_stem()
                .map(|stem| stem.to_string_lossy().to_string())
        })
        .collect();

    for family in &families {
        if !drawn.contains(family) {
            findings.push(Finding {
                detail: "Card's media region is a bare slot, so an unassigned one generates no \
                         box. It will render a card with no picture, which looks deliberate and \
                         is not."
                    .to_owned(),
                file: gallery.art.clone(),
                message: format!("`{family}` is a family and has no card art"),
            });
        }
    }
    for one in &drawn {
        if !families.contains(one) {
            findings.push(Finding {
                detail: "The catalog groups declarations by the folder their `modulePath` names, \
                         so a drawing keyed to anything else is unreachable."
                    .to_owned(),
                file: gallery.art.clone(),
                message: format!("`{one}` has card art and is not a family"),
            });
        }
    }

    /* Folders that are *families*, which is the question the prose answers: how
    many more entries there are than there are components in the styled tier. A
    directory with an `index.ts` is what the barrel exports, and it is the
    difference that matters: `field/` holds the shared field stylesheets,
    exports nothing and has no element, and counting it makes this check
    disagree with correct prose. */
    let folders = fs::read_dir(context.root.join(&gallery.families))
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.path().join("index.ts").exists())
        .count();

    let (Some(said), Some(folders_said)) = (spell(families.len()), spell(folders)) else {
        findings.push(Finding {
            detail: "`spell` stops below a thousand because nothing here counts that high. A \
                     count that does needs the thousands case written rather than a silent wrong \
                     answer."
                .to_owned(),
            file: gallery.art.clone(),
            message: format!(
                "{} families over {folders} folders is past what this rule can spell",
                families.len()
            ),
        });
        return Report {
            checked: families.len(),
            findings,
            notes: Vec::new(),
            unit: "families in the catalog",
        };
    };

    let number = pattern();
    for name in ["index.tsx", "core.tsx"] {
        let Ok(source) = fs::read_to_string(art.join(name)) else {
            continue;
        };
        for caught in number.captures_iter(&source) {
            let word = caught[1].to_lowercase();
            if word != said && word != folders_said {
                findings.push(Finding {
                    detail: "A number word in these files is the family count or the folder \
                             count. Write any other count as digits."
                        .to_owned(),
                    file: format!("{}/{name}", gallery.art),
                    message: format!(
                        "says \"{word}\" where the catalog has {} families (\"{said}\") over \
                         {folders} folders (\"{folders_said}\")",
                        families.len()
                    ),
                });
            }
        }
    }

    /* And every stroked shape has something that strokes it.
    **The count above is checked and the ink is not**: a card with an entry
    passes it whatever that entry draws, including nothing. A shape with
    `fill="none"` and a stroke width has no paint of its own, so it takes one
    from a class or it is invisible, and the fault is a name that looks like
    paint and is not: one that only animates, or one never defined anywhere.
    Read off the stylesheet rather than listed here, so a new paint class works
    the day it is written and a renamed one fails the same day. */
    let rule =
        Regex::new(r"(?m)^\.(art[A-Za-z]+)\s*\{([^}]*)\}").expect("a literal pattern compiles");
    let strokes = Regex::new(r"(^|[\s;])stroke:").expect("a literal pattern compiles");
    let sheet = fs::read_to_string(art.join("gallery.css")).unwrap_or_default();
    let painted: Vec<String> = rule
        .captures_iter(&sheet)
        .filter(|caught| strokes.is_match(&caught[2]))
        .map(|caught| caught[1].to_owned())
        .collect();

    let shape = Regex::new(r"<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)>")
        .expect("a literal pattern compiles");
    let inline = Regex::new(r#"(^|\s)stroke=""#).expect("a literal pattern compiles");
    let classed = Regex::new(r#"className="([^"]*)""#).expect("a literal pattern compiles");
    for name in &drawn {
        let Ok(source) = fs::read_to_string(drawings.join(format!("{name}.tsx"))) else {
            continue;
        };
        for caught in shape.captures_iter(&source) {
            let (tag, attributes) = (&caught[1], &caught[2]);
            if !attributes.contains("fill=\"none\"") || !attributes.contains("strokeWidth") {
                continue;
            }
            /* An inline `stroke` is paint as much as a class is, and one drawing
            uses it: Menu's ellipsis ring strokes `currentColor` at a fixed
            opacity, which is a fact about that shape rather than about the
            palette. Reading only the class called it invisible when it is on
            screen. */
            if inline.is_match(attributes) {
                continue;
            }
            let names: Vec<&str> = classed
                .captures(attributes)
                .map(|caught| caught.get(1).map_or("", |one| one.as_str()))
                .unwrap_or_default()
                .split_whitespace()
                .collect();
            if names.iter().any(|one| painted.iter().any(|two| two == one)) {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "It renders as nothing. The classes that stroke are {}.",
                    painted
                        .iter()
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<String>>()
                        .join(", ")
                ),
                file: format!("{}/{name}", gallery.art),
                message: format!(
                    "a <{tag}> is drawn with a stroke and carries {}, none of which sets one",
                    if names.is_empty() {
                        "no class".to_owned()
                    } else {
                        format!("`{}`", names.join(" "))
                    }
                ),
            });
        }
    }

    Report {
        checked: families.len(),
        findings,
        notes: Vec::new(),
        unit: "families in the catalog",
    }
}

#[cfg(test)]
mod tests {
    use super::{pattern, spell, FLOOR};

    /// The proof, rather than the intention.
    ///
    /// Every word the speller can produce in range has to be one the pattern can
    /// find, so narrowing the pattern or teaching the speller a shape it does
    /// not cover fails here rather than in six months of a check quietly
    /// passing. Two hundred is well past any plausible catalog.
    #[test]
    fn the_pattern_finds_everything_the_speller_says() {
        let number = pattern();
        for count in FLOOR..=200 {
            let said = spell(count).expect("in range");
            assert!(
                number.is_match(&said),
                "spell({count}) is \"{said}\" and the pattern cannot match it. The two are built \
                 from the same tables, so something has taught one a shape the other does not know."
            );
        }
    }
}
