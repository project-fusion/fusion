//! A component declares its reactive properties in one order, alphabetically.
//!
//! **There was no order, which is the fault rather than any particular file.**
//! Measured across the two tiers: 83 of the 113 components declaring two or more
//! were in no order at all. A reader looking for one scans, and a reader adding
//! one puts it wherever the cursor was, so the next reader scans further.
//!
//! **This is about the source and nothing else, and that is worth being exact
//! about.** The published reference sorts by name before it renders, so a
//! consumer never sees declaration order — which is the opposite of the doc
//! block, where the manifest carries the order straight onto the page and
//! `tag-order` exists because of it. The argument here is only that a file with
//! twelve properties in no order is hard to read, and that a mechanical order
//! beats a per-file judgment nobody wrote down.
//!
//! **A property is its doc block, its decorator and its member.** They move
//! together or the fix is a corruption, and the block is the biggest part: one
//! carries twelve lines of reasoning about why a name is `variant` rather than
//! `shape`. So the unit is the whole run from the first line of the comment to
//! the end of the declaration, and everything between two properties that is not
//! part of either stays where it is.
//!
//! **Only `@property`, which is the public surface.** `@state` is internal and
//! its order is nobody's business but the component's; a plain field is often
//! placed beside the method that uses it. Sorting those would be this rule
//! deciding how a class reads rather than how its API does.
//!
//! **Declaration order carries no meaning to sort away.** Measured before this
//! was written: no `@property` field's initializer reads another field, so the
//! order the class evaluates them in cannot change behavior. One component pairs
//! a value with its default — `split` beside `defaultSplit` — and loses the
//! adjacency; the reference page separates them anyway, and one pairing is not
//! worth an exemption that has to be maintained.

use std::fs;
use std::path::PathBuf;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::{sources, Context, Finding, Report};

/// The member a decorator sits on, past any further decorators.
static MEMBER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^\s*(?:accessor\s+|declare\s+|override\s+|readonly\s+)*([A-Za-z_$][\w$]*)\s*[?!:=(]",
    )
    .expect("a literal pattern compiles")
});

/// One property: where its run starts, where it ends, and what it is called.
struct Declared {
    from: usize,
    name: String,
    to: usize,
}

/// Every `@property` in a file, as the run of lines that belongs to it.
///
/// The run opens at the doc block above the decorator when there is one, because
/// that is the part a reader is looking for, and closes at the blank line after
/// the declaration.
fn declared(lines: &[&str]) -> Vec<Declared> {
    let mut found = Vec::new();
    let mut at = 0;
    while at < lines.len() {
        if !lines[at].trim_start().starts_with("@property") {
            at += 1;
            continue;
        }

        /* Back up over the decorator's own continuation lines, then over the
        doc block sitting on it. */
        let mut from = at;
        while from > 0 && lines[from - 1].trim_start().starts_with('@') {
            from -= 1;
        }
        /* The block above it, in either shape it is written in: one line that
        opens and closes on itself, or a run whose last line is the closing
        delimiter alone. The single-line shape was the case this first missed,
        and it fails the way that matters — the member sorts and its description
        stays behind, attached to whatever landed there. */
        /* **Every comment above it, however many there are.**
        Three shapes are in this tree and only one is the obvious one: a block
        on its own lines, a block opening and closing on one line, and a block
        whose last line is a sentence with the delimiter after it. And they
        stack: one property carries a description and then a second block
        arguing about its initializer, so consuming one and stopping left the
        first behind for whichever property landed there. Both failures were
        caught by the analyzer, which asks every public member for a description
        and found one without. */
        loop {
            if from == 0 {
                break;
            }
            let above = lines[from - 1];
            if above.trim_end().ends_with("*/") {
                let mut opens = from - 1;
                while opens > 0 && !lines[opens].trim_start().starts_with("/*") {
                    opens -= 1;
                }
                if !lines[opens].trim_start().starts_with("/*") {
                    break;
                }
                from = opens;
                continue;
            }
            if above.trim_start().starts_with("//") {
                from -= 1;
                continue;
            }
            break;
        }

        /* Forward to the member, then to the end of its declaration. A
        declaration can run over many lines: a union of eleven string literals
        is one, and it ends where the indentation returns to the member's. */
        let mut cursor = at + 1;
        while cursor < lines.len() && lines[cursor].trim_start().starts_with('@') {
            cursor += 1;
        }
        let Some(caught) = lines.get(cursor).and_then(|line| MEMBER.captures(line)) else {
            at += 1;
            continue;
        };
        let name = caught[1].to_owned();

        let mut to = cursor;
        while to + 1 < lines.len() {
            let next = lines[to + 1];
            if next.trim().is_empty() {
                break;
            }
            /* A continuation is indented past the member, or closes something
            the member opened. Anything at the member's own indentation is the
            next thing in the class. */
            let deeper = next.len() - next.trim_start().len()
                > lines[cursor].len() - lines[cursor].trim_start().len();
            if !deeper {
                break;
            }
            to += 1;
        }

        found.push(Declared { from, name, to });
        at = to + 1;
    }
    found
}

/// The file with its properties in order, or nothing when it is already in it.
fn sorted(source: &str) -> Option<String> {
    let lines: Vec<&str> = source.split('\n').collect();
    let all = declared(&lines);
    if all.len() < 2 {
        return None;
    }
    let mut order: Vec<usize> = (0..all.len()).collect();
    order.sort_by_key(|&at| all[at].name.to_lowercase());
    if order.iter().enumerate().all(|(want, &got)| want == got) {
        return None;
    }

    /* Rebuilt rather than swapped, because the runs are different lengths and
    everything between two of them — a method, a comment about the class — is
    not a property and does not move. */
    let mut out: Vec<&str> = Vec::new();
    let mut cursor = 0;
    let mut slot = 0;
    while cursor < lines.len() {
        if slot < all.len() && cursor == all[slot].from {
            let taken = &all[order[slot]];
            out.extend_from_slice(&lines[taken.from..=taken.to]);
            cursor = all[slot].to + 1;
            slot += 1;
            continue;
        }
        out.push(lines[cursor]);
        cursor += 1;
    }
    Some(out.join("\n"))
}

/// Every component source, and what a sort would make of it.
fn survey(context: &Context) -> (usize, Vec<(PathBuf, String)>) {
    let mut files = Vec::new();
    for tier in &context.settings.tiers {
        sources(&context.root.join(tier), &mut files);
    }

    let mut checked = 0;
    let mut changed = Vec::new();
    for file in files {
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        let lines: Vec<&str> = source.split('\n').collect();
        let all = declared(&lines);
        if all.len() < 2 {
            continue;
        }
        checked += all.len();
        if let Some(after) = sorted(&source) {
            changed.push((file, after));
        }
    }
    (checked, changed)
}

pub fn run(context: &Context) -> Report {
    let (checked, changed) = survey(context);
    let findings = changed
        .iter()
        .map(|(file, _)| {
            let where_ = context.relative(file);
            Finding {
                detail: "A reader looking for one scans, and a reader adding one puts it wherever \
                         the cursor was. Run `helix component fix --only properties`."
                    .to_owned(),
                file: where_,
                message: "declares its properties out of alphabetical order".to_owned(),
            }
        })
        .collect();
    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "declared properties",
    }
}

pub fn fix(context: &Context) -> Vec<String> {
    let (_, changed) = survey(context);
    let mut written = Vec::new();
    for (file, after) in changed {
        if fs::write(&file, after).is_ok() {
            written.push(context.relative(&file));
        }
    }
    written
}

#[cfg(test)]
mod tests {
    use super::sorted;

    /// The run is the doc block, the decorator and the whole declaration.
    #[test]
    fn a_property_moves_with_everything_that_describes_it() {
        let before = "class X {\n  /** Second. */\n  @property({ reflect: true })\n  \
                      zeta?:\n    | 'a'\n    | 'b'\n\n  /** First. */\n  @property()\n  \
                      alpha?: string\n}\n";
        let after = sorted(before).expect("out of order");
        assert!(
            after.starts_with("class X {\n  /** First. */\n  @property()\n  alpha?: string\n"),
            "the block and the member move together:\n{after}"
        );
        assert!(
            after.contains("| 'a'\n    | 'b'"),
            "the union survives:\n{after}"
        );
        assert!(sorted(&after).is_none(), "a sorted file is left alone");
    }

    /// The three shapes a description is written in, all of them moving.
    ///
    /// The third is the one that broke a sweep of 86 files: a block whose last
    /// line is a sentence with the closing delimiter after it, rather than the
    /// delimiter alone. It read as no block at all, so the member sorted away
    /// and left its description sitting on whichever property landed there.
    #[test]
    fn a_description_moves_in_every_shape_it_is_written_in() {
        let before = concat!(
            "class X {\n",
            "  /* A block whose last line carries text before it closes. */\n",
            "  @property()\n",
            "  zeta?: string\n\n",
            "  /**\n   * On its own lines.\n   */\n",
            "  @property()\n",
            "  mid?: string\n\n",
            "  /** On one line. */\n",
            "  @property()\n",
            "  alpha?: string\n}\n",
        );
        let after = sorted(before).expect("out of order");
        for (block, member) in [
            ("On one line.", "alpha"),
            ("On its own lines.", "mid"),
            ("carries text before it closes.", "zeta"),
        ] {
            let at = after.find(block).expect("the description survives");
            let member = after.find(member).expect("the member survives");
            assert!(
                at < member,
                "`{block}` still sits above its member:\n{after}"
            );
            assert!(
                after[at..member].matches("@property").count() == 1,
                "nothing else came between them:\n{after}"
            );
        }
    }

    /// Stacked blocks all belong to the property under them.
    ///
    /// One component writes a description and then a second block arguing about
    /// why the field has no initializer. Consuming one and stopping moved the
    /// argument and left the description, which is how the first sweep of 86
    /// files produced a public member with no description.
    #[test]
    fn every_block_above_a_property_moves_with_it() {
        let before = concat!(
            "class X {\n",
            "  /**\n   * What zeta is.\n   */\n",
            "  /* Why zeta has no initializer. */\n",
            "  @property({ reflect: true })\n",
            "  zeta?: string\n\n",
            "  /** What alpha is. */\n",
            "  @property()\n",
            "  alpha?: string\n}\n",
        );
        let after = sorted(before).expect("out of order");
        let described = after.find("What zeta is.").expect("kept");
        let argued = after.find("Why zeta has no initializer.").expect("kept");
        let member = after.find("zeta?").expect("kept");
        assert!(
            described < argued && argued < member,
            "both blocks travel:\n{after}"
        );
        assert!(
            after.find("What alpha is.").expect("kept") < described,
            "alpha still sorts first:\n{after}"
        );
    }

    /// What sits between two properties is not a property.
    #[test]
    fn what_is_not_a_property_stays_where_it_is() {
        let before = "class X {\n  @property()\n  zeta?: string\n\n  render() {\n    \
                      return null\n  }\n\n  @property()\n  alpha?: string\n}\n";
        let after = sorted(before).expect("out of order");
        let render = after.find("render()").expect("kept");
        let alpha = after.find("alpha?").expect("kept");
        let zeta = after.find("zeta?").expect("kept");
        assert!(
            alpha < render && render < zeta,
            "render stays put:\n{after}"
        );
    }
}
