//! The values `helix/styles` re-derives its own half of the palette from.
//!
//! **This is what stops the two derivations disagreeing.** The stylesheet builds
//! a ramp of its own from `--helix-seed-*`, including the twenty-four series
//! colors a chart reads, and nothing in this engine reaches those. Emitting the
//! tokens alone moved the buttons, the tags and the surfaces and left every
//! chart on the page the original blue.
//!
//! **Every seed the stylesheet reads, and not only the four it began with.**
//! The accent and the neutral cast were solved here and never handed over, so
//! the stylesheet derived its own from their defaults: a theme with a neutral
//! cast tinted every surface it emitted and left the six tokens that read the
//! ramp directly gray, `foreground-subtle`, the two media colors, the overlay
//! and two material ones. Handed the answers, the ramp builds from them.

use crate::derive::emphasis::Emphasis;
use crate::derive::resolve::Resolved;
use crate::derive::Cast;
use crate::oklch::{fit_to_gamut, oklch_to_hex, GAMUT_STEPS};

/// The chroma of the loudest series color the stylesheet's ramp holds.
///
/// A `ceiling` is an absolute chroma and a seed is a multiplier, so a ceiling
/// has to be folded in against something. Approximate by construction and it has
/// to be: the ramp states a different chroma per hue, because sRGB is not
/// chroma-uniform, and one multiplier cannot honor eight ceilings exactly. What
/// it does honor is the direction and the extremes, so a ceiling of 0 gives gray
/// charts.
const LOUDEST_SERIES: f64 = 0.277;

/// Every seed, as the strings they are written as.
///
/// **The brand seed is the solved primary, not the color handed in**, and that
/// is what makes the two derivations agree: the stylesheet builds its ramp from
/// the seed, so seeding it with the raw input would leave the CSS primary and
/// this engine's primary two different colors on the same page.
///
/// **The chroma policy has to reach the seed, or half the palette never hears
/// about it.** This engine applies it to every color it solves, and the
/// twenty-four series colors are not among those. Measured before it did:
/// saturation at 20 per cent, and a bar still painted chroma 0.206.
///
/// A `Vec` of pairs rather than a map, because the emitted order is the order
/// they are written in and a map would sort them.
///
/// **The accent is the solved one, for the brand's reason**, and the angle and
/// lightness beside it are what it came out as rather than what was asked. The
/// literal beats both in the stylesheet, so they change nothing there; they are
/// written so every seed it reads has an answer and a page reading them back
/// reads this theme's relationship, not the stylesheet's default one.
///
/// **Ink writes no brand seed, and no accent seeds where the accent is ink
/// too.** The stylesheet reads an unset brand seed as ink. Written out, the
/// ink's own hex would be read as a brand, and the stylesheet would derive a
/// brand ramp from a near-black, whose dark half is a dark gray on a black page.
#[must_use]
pub fn seeds(
    resolved: &Resolved,
    primary: &Emphasis,
    accent: &Emphasis,
    neutral: Cast,
) -> Vec<(String, String)> {
    let scale = resolved.chroma.scale.unwrap_or(1.0);
    let series = resolved
        .chroma
        .ceiling
        .map_or(scale, |ceiling| scale.min(ceiling / LOUDEST_SERIES));
    let brand = fit_to_gamut(primary.raw, GAMUT_STEPS);
    let second = fit_to_gamut(accent.raw, GAMUT_STEPS);
    /* An angle at chroma zero is not a direction, so a gray accent or a gray
    brand has no rotation between them to report. */
    let angle = if brand.chroma == 0.0 || second.chroma == 0.0 {
        0.0
    } else {
        (second.hue - brand.hue).rem_euclid(360.0)
    };

    let ink = resolved.brand.is_none();
    let ink_accent = ink && resolved.accent.is_none();
    let mut seeds = Vec::new();
    if !ink_accent {
        seeds.extend([
            ("seed-accent".to_owned(), oklch_to_hex(second)),
            ("seed-accent-hue".to_owned(), trimmed(angle, 1)),
            (
                "seed-accent-lightness".to_owned(),
                trimmed(second.lightness, 3),
            ),
        ]);
    }
    if !ink {
        seeds.push(("seed-brand".to_owned(), oklch_to_hex(brand)));
    }
    seeds.extend([
        ("seed-chroma-scale".to_owned(), trimmed(series, 3)),
        ("seed-density".to_owned(), number(resolved.density)),
        ("seed-neutral-chroma".to_owned(), trimmed(neutral.chroma, 4)),
        ("seed-neutral-hue".to_owned(), trimmed(neutral.hue, 1)),
        (
            "seed-radii".to_owned(),
            format!("{}rem", number(resolved.radius)),
        ),
    ]);
    seeds
}

/// `Number(x.toFixed(n))`: fixed to `n` places, then read back as a number so
/// trailing zeroes go.
///
/// Rust has no such round trip, so it is spelled out. `{:.3}` alone emits
/// `1.000` where the TypeScript emits `1`, which is a different string in the
/// emitted file for the commonest theme there is.
pub(crate) fn trimmed(value: f64, places: usize) -> String {
    let fixed = format!("{value:.places$}");
    if !fixed.contains('.') {
        return fixed;
    }
    let trimmed = fixed.trim_end_matches('0').trim_end_matches('.');
    if trimmed.is_empty() || trimmed == "-" {
        "0".to_owned()
    } else {
        trimmed.to_owned()
    }
}

/// `String(x)` for a float: JavaScript's shortest round-tripping form.
///
/// Rust's `{}` for `f64` is also shortest-round-trip, so they agree on every
/// value in this range, the integral case included: JavaScript writes an
/// integral float without a fraction, and so does Rust, which is worth checking
/// rather than assuming because `1.0` would be a different string in the emitted
/// file. `format!("{}", 1.0_f64)` is `"1"`.
fn number(value: f64) -> String {
    format!("{value}")
}
