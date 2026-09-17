//! A cancelable event is dispatched where its answer is read.
//!
//! **`cancelable` holds the sentence against the class and stops there**, so an
//! event whose description promises a veto is one whose class really can be
//! refused. What neither of them can see is whether anything in the library
//! ever asks. A component that dispatches a cancelable event and throws away
//! what the dispatch returned has published a decision seam with nothing behind
//! it: the consumer writes `preventDefault()`, the code is valid, no error is
//! raised, and the change happens anyway. That failure was found three times in
//! three unrelated families before it was worth a rule, and each time it had
//! been shipped for months.
//!
//! **Where the answer may be read, which is three places and not one.**
//!
//! - **At the dispatch.** `requestChange` is the library's own shape for this
//!   and the one to copy: announce, read, apply. It reaches here as
//!   `if (!host.dispatchEvent(...))`, which is the general form: the boolean is
//!   used, in a condition, a return, or an assignment.
//! - **On the event.** Held in a local, dispatched, and `defaultPrevented` read
//!   after. What a component does when one dispatch decides two things.
//! - **By whoever owns the default action.** A row announces its own selection
//!   and the set it is in is what acts on it, so the decision is one file over:
//!   the item dispatches, the root listens and reads the flag before it moves.
//!   Menu, Speed Dial and Video Playlist each record having had exactly this
//!   fault and fixed it that way, which is what makes the family the unit
//!   rather than the file. **And the family that composes it, not only its
//!   own**, because a shared vocabulary element is exactly the case: `Option`
//!   is the row five families put in their lists, it holds no state of its own,
//!   and the list that imported it is what reads its answer. Scoped to the
//!   family alone this would report every one of those and have nothing to
//!   suggest.
//!
//! **The file is the unit inside a family, not the handler**, because the
//! decision is not always taken in the listener that received it: two of the
//! three above defer to a microtask, for the reason each of them writes down,
//! and one of them takes the decision in a closure the listener created. A rule
//! that insisted on the handler body would report the families that got this
//! right.
//!
//! **Only classes carrying `eventName` are held**, which is the library's own
//! marker for an event it named and declared. A class reproducing a platform
//! event under the platform's name is shaped by the platform, dispatched at an
//! element that is not the dispatcher's own, and answered by whatever is
//! listening there.
//!
//! **One direction only.** "Not cancelable and the answer read" is not a fault:
//! reading `defaultPrevented` off an event that cannot be canceled is harmless,
//! it always answers false, and the same handler often serves both.
//!
//! **In the rule list, and it holds every tier with no exemption.** It was
//! written and left unregistered for one reason, which is worth keeping because
//! it is what the entry cost: two dispatches still answered to nothing, in two
//! families being changed on branches of their own. `Chat.Message` re-announced
//! `helix-send` for a retry and dropped what the dispatch returned, and
//! `Radio.Group` called `requestValue` from a member's `helix-select` without
//! reading whether that choice stood. The alternative to waiting was an
//! allowlist of the two, which is the thing this repository keeps deleting: a
//! list that goes stale silently and reads as a pass. Both turned out to be
//! repairs rather than design changes, and the registration went in with the
//! second of them, so what this reports now is a regression rather than a
//! backlog.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{line_of, uncommented};
use crate::component::{sources, Context, Finding, Report};

/// An event class and its body, for the `cancelable` its constructor passes.
static CLASS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)export class (\w+) extends [^{]*\{(.*?)\n\}")
        .expect("a literal pattern compiles")
});

static CANCELABLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"cancelable:\s*true").expect("a literal pattern compiles"));

/// The name a class answers to, which is also what a listener binds.
static NAMED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"static readonly eventName = '([a-z0-9-]+)'").expect("a literal pattern compiles")
});

/// `new SomeEvent(` at a dispatch, which is the common form.
static CONSTRUCTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^new (\w+)\(").expect("a literal pattern compiles"));

/// A bare local passed to `dispatchEvent`, whose class is found by its binding.
static LOCAL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(\w+)$").expect("a literal pattern compiles"));

/// What stands before a dispatch whose boolean is used rather than dropped.
///
/// The receiver is whatever is chained onto in front of `dispatchEvent`, which
/// may be a call and may be optional, so it is matched rather than assumed.
static USED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:if\s*\(\s*!?|return\s+|=\s*|\?\s*|:\s*|&&\s*|\|\|\s*|!)[\w.?()\s]*$")
        .expect("a literal pattern compiles")
});

/// Every name a file binds a listener to, in either spelling.
static LISTENS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:addEventListener\(\s*'([a-z][a-z0-9-]*)'|@(helix-[a-z0-9-]+)=)")
        .expect("a literal pattern compiles")
});

/// A family reached from another family's file, which is what composing one is.
///
/// Relative, because that is how a tier reaches inside itself: a package
/// specifier would be the published entry and would not say which family.
static COMPOSES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"from '\.\./\.\./([a-z0-9-]+)/").expect("a literal pattern compiles")
});

/// The family a component file belongs to: its folder's parent's name.
fn owner(file: &Path) -> Option<String> {
    Some(file.parent()?.parent()?.file_name()?.to_str()?.to_owned())
}

/// The argument to a `dispatchEvent(` whose opening paren is at `from`.
///
/// Matched rather than read to the next `)`, because every interesting argument
/// carries parentheses of its own: `new HelixSelectEvent({ value: this.value })`
/// ends four characters after the first `)` in it.
fn argument(text: &str, from: usize) -> Option<&str> {
    let bytes = text.as_bytes();
    let mut depth = 0;
    let mut index = from;
    while index < bytes.len() {
        match bytes[index] {
            b'(' => depth += 1,
            b')' => {
                depth -= 1;
                if depth == 0 {
                    return Some(text[from + 1..index].trim());
                }
            }
            _ => {}
        }
        index += 1;
    }
    None
}

/// Whether the boolean this dispatch returns is used where it stands.
fn used(text: &str, at: usize) -> bool {
    let start = text[..at]
        .char_indices()
        .rev()
        .take(120)
        .last()
        .map_or(0, |(index, _)| index);
    USED.is_match(&text[start..at])
}

/// Every cancelable class the library declares, against the name it carries.
///
/// Read from the same walk the dispatch sites come from: where a library keeps
/// its event classes is its own business, and a rule naming the file would stop
/// following them the day they move.
fn cancelable(files: &[PathBuf]) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for file in files {
        let Ok(text) = fs::read_to_string(file) else {
            continue;
        };
        for class in CLASS.captures_iter(&text) {
            let Some(name) = NAMED.captures(&class[2]) else {
                continue;
            };
            if CANCELABLE.is_match(&class[2]) {
                found.insert(class[1].to_owned(), name[1].to_owned());
            }
        }
    }
    found
}

/// Which families read an answer, and for which event.
fn readers(files: &[PathBuf]) -> BTreeSet<(String, String)> {
    let mut found = BTreeSet::new();
    for file in files {
        let Ok(raw) = fs::read_to_string(file) else {
            continue;
        };
        let text = uncommented(&raw);
        if !text.contains("defaultPrevented") {
            continue;
        }
        let Some(family) = owner(file) else {
            continue;
        };
        /* This file's own family, and every family it reaches into. A list
        reading its rows' answer decides for the row's family too, that family
        being where the dispatch is and this being where the state is. */
        let mut deciding: BTreeSet<String> = BTreeSet::from([family]);
        for reached in COMPOSES.captures_iter(&text) {
            deciding.insert(reached[1].to_owned());
        }
        for listens in LISTENS.captures_iter(&text) {
            let name = listens
                .get(1)
                .or_else(|| listens.get(2))
                .map(|one| one.as_str().to_owned());
            if let Some(name) = name {
                for family in &deciding {
                    found.insert((family.clone(), name.clone()));
                }
            }
        }
    }
    found
}

/// The class a `dispatchEvent` argument names, built or bound.
fn dispatched(text: &str, argument: &str) -> Option<String> {
    if let Some(built) = CONSTRUCTED.captures(argument) {
        return Some(built[1].to_owned());
    }
    /* A local, whose class is where it was bound. The same local is what a
    `defaultPrevented` read names, so this is also what makes that read
    findable. */
    let local = LOCAL.captures(argument)?;
    let binding = Regex::new(&format!(r"\b{}\s*[:=]\s*new (\w+)\(", &local[1])).ok()?;
    Some(binding.captures(text)?[1].to_owned())
}

pub fn run(context: &Context) -> Report {
    let tiers = context.settings.roots(&context.root);
    let mut files = Vec::new();
    for tier in &tiers {
        sources(tier, &mut files);
    }
    let cancelable = cancelable(&files);
    let readers = readers(&files);

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in &files {
        let Ok(raw) = fs::read_to_string(file) else {
            continue;
        };
        let text = uncommented(&raw);
        let where_ = context.relative(file);
        let family = owner(file);
        for found in text.match_indices("dispatchEvent(") {
            let open = found.0 + "dispatchEvent".len();
            let Some(argument) = argument(&text, open) else {
                continue;
            };
            let Some(class) = dispatched(&text, argument) else {
                continue;
            };
            let Some(event) = cancelable.get(&class) else {
                continue;
            };
            checked += 1;
            if used(&text, found.0) {
                continue;
            }
            if let Some(local) = LOCAL.captures(argument) {
                if text.contains(&format!("{}.defaultPrevented", &local[1])) {
                    continue;
                }
            }
            if family
                .as_ref()
                .is_some_and(|family| readers.contains(&(family.clone(), event.clone())))
            {
                continue;
            }
            findings.push(Finding {
                detail: "Read the answer where it is dispatched, the way `requestChange` does, \
                         or have whatever owns the default action read `defaultPrevented` before \
                         it acts."
                    .to_owned(),
                file: format!("{where_}:{}", line_of(&text, found.0)),
                message: format!(
                    "`{event}` is cancelable and nothing reads what refusing it answered"
                ),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "cancelable dispatches",
    }
}
