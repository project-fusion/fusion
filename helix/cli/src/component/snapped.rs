//! A scroller that snaps to an edge keeps the room it padded for one.
//!
//! **A snap position aligns to the snapport, and with no `scroll-padding` the
//! snapport is the padding box.** So a scroller with padding on the axis it
//! snaps on, whose items align to `start` or `end`, comes to rest with the
//! leading item's own edge on the edge the scroller clips at: the padding is
//! still there in the box model and is scrolled off at every resting place. The
//! room a component put there so a slide's shadow, border or focus ring is not
//! shaved is spent, and nothing says so.
//!
//! **It is silent twice over, which is why it wants a check rather than a
//! reading.** Nothing throws, no rule is invalid, the padding is visible in dev
//! tools, and a scroller nudged by hand shows the room the moment it is
//! anywhere but a resting place. And the component's own arithmetic goes with
//! it: Carousel computes where each pane's edge sits and scrolls there, which on
//! the axis that was missing this rested a whole bleed away from the number it
//! had asked for, every index change issuing a scroll the snap then undid.
//!
//! Carousel found it on its inline axis by measurement, wrote the fix and a
//! comment naming the fault, turned the same track on its side six weeks later
//! and did not carry either across: measured 17 Sep 2026 in Chromium 151 on the
//! shipped `vertical` example, a resting `scrollTop` of 16 against 16px of block
//! padding, no room above the first slide and the whole of it below the last.
//!
//! **Centered items are out of scope, and that is the whole exemption.** A
//! `center` alignment puts the item's middle on the snapport's middle, and
//! symmetric padding moves neither, so the padding there is scroll range rather
//! than leading room: Time Picker's wheel is padded by half a column precisely
//! so the first and last rows can reach the middle, and a `scroll-padding` would
//! be a no-op it had to carry. A sheet whose every `scroll-snap-align` is
//! `center` is therefore skipped, and one holding any `start` or `end` is
//! judged, which is the conservative way round: the report is actionable and the
//! declaration it asks for changes nothing for a centered scroller beside it.
//!
//! **The axis is the snap type's own word.** `x` and `inline` are the inline
//! axis, `y` and `block` the block one, and `both` is both; a scroller naming
//! `both` has to keep its room on both. Physical and logical padding are read
//! together, since a sheet may write either and the scroller clips the same way.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::{blanked, line_of};
use crate::component::{family, stylesheets, Context, Finding, Report};

/// `scroll-snap-type`, with whatever axis and strictness it names.
static SNAP: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"scroll-snap-type\s*:\s*([^;}]+)").expect("a literal pattern compiles")
});

/// `scroll-snap-align`, for the alignment the items in a sheet are given.
static ALIGN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"scroll-snap-align\s*:\s*([^;}]+)").expect("a literal pattern compiles")
});

/// Padding on the inline axis, physical or logical, including the shorthand.
static PADDING_INLINE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*padding(-inline(-start|-end)?|-left|-right)?\s*:")
        .expect("a literal pattern compiles")
});

/// Padding on the block axis, physical or logical, including the shorthand.
static PADDING_BLOCK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*padding(-block(-start|-end)?|-top|-bottom)?\s*:")
        .expect("a literal pattern compiles")
});

/// `scroll-padding` on the inline axis, physical or logical.
static SCROLL_INLINE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*scroll-padding(-inline(-start|-end)?|-left|-right)?\s*:")
        .expect("a literal pattern compiles")
});

/// `scroll-padding` on the block axis, physical or logical.
static SCROLL_BLOCK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*scroll-padding(-block(-start|-end)?|-top|-bottom)?\s*:")
        .expect("a literal pattern compiles")
});

/// The declaration block a byte offset sits inside, braces to braces.
///
/// Scanned rather than parsed. What is wanted is the run of declarations this
/// one is written among, and a rule block's own braces are the only ones that
/// can be open at a declaration: a nested block would have closed before it.
fn block(text: &str, at: usize) -> &str {
    let start = text[..at].rfind('{').map_or(0, |one| one + 1);
    let end = text[at..].find('}').map_or(text.len(), |one| at + one);
    &text[start..end]
}

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;

    for tier in context.settings.roots(&context.root) {
        let mut sheets = Vec::new();
        stylesheets(&tier, &mut sheets);
        for sheet in sheets {
            if family(&sheet, &tier).is_none() {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&sheet) else {
                continue;
            };
            let text = blanked(&raw);
            /* Every item in this sheet centered means no padding on the axis is
            leading room, so there is nothing here to keep. A sheet with no
            alignment at all has nothing snapping to an edge either. */
            let mut aligns = ALIGN.captures_iter(&text).peekable();
            if aligns.peek().is_none() {
                continue;
            }
            if ALIGN
                .captures_iter(&text)
                .all(|one| one[1].split_whitespace().all(|word| word == "center"))
            {
                continue;
            }
            let where_ = context.relative(&sheet);

            for found in SNAP.captures_iter(&text) {
                /* The first word only. `mandatory` and `proximity` say how
                strictly it snaps and both hold an `x` or a `y`, so a search of
                the whole value reads `x mandatory` as snapping on both axes. */
                let axis = found[1]
                    .split_whitespace()
                    .next()
                    .unwrap_or_default()
                    .to_ascii_lowercase();
                let inline = axis == "x" || axis == "inline" || axis == "both";
                let block_axis = axis == "y" || axis == "block" || axis == "both";
                let whole = block(&text, found.get(0).expect("the whole match exists").start());
                for (wanted, padding, room, name) in [
                    (inline, &*PADDING_INLINE, &*SCROLL_INLINE, "inline"),
                    (block_axis, &*PADDING_BLOCK, &*SCROLL_BLOCK, "block"),
                ] {
                    if !wanted || !padding.is_match(whole) {
                        continue;
                    }
                    if room.is_match(whole) {
                        checked += 1;
                        continue;
                    }
                    let line =
                        line_of(&text, found.get(0).expect("the whole match exists").start());
                    findings.push(Finding {
                        detail: format!(
                            "A snap position aligns to the snapport, which with no \
                             `scroll-padding` is the padding box, so the leading item comes to \
                             rest with its own edge on the edge this box clips at and the room \
                             is spent. Declare `scroll-padding-{name}` to match the padding on \
                             that axis."
                        ),
                        file: format!("{where_}:{line}"),
                        message: format!(
                            "snaps on the {name} axis and pads it without keeping the room"
                        ),
                    });
                }
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "padded axes a scroller snaps on",
    }
}
