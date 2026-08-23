//! The values `helix/styles` re-derives its own half of the palette from.
//!
//! **This is what stops the two derivations disagreeing.** The stylesheet builds
//! a ramp of its own from `--helix-seed-*`, including the twenty-four series
//! colours a chart reads, and nothing in this engine reaches those. Emitting the
//! tokens alone moved the buttons, the tags and the surfaces and left every
//! chart on the page the original blue.

use crate::derive::emphasis::Emphasis;
use crate::derive::resolve::Resolved;
use crate::oklch::{fit_to_gamut, oklch_to_hex, GAMUT_STEPS};

/// The chroma of the loudest series colour the stylesheet's ramp holds.
///
/// A `ceiling` is an absolute chroma and a seed is a multiplier, so a ceiling
/// has to be folded in against something. Approximate by construction and it has
/// to be: the ramp states a different chroma per hue, because sRGB is not
/// chroma-uniform, and one multiplier cannot honour eight ceilings exactly. What
/// it does honour is the direction and the extremes, so a ceiling of 0 gives grey
/// charts.
const LOUDEST_SERIES: f64 = 0.277;

/// The four seeds, as the strings they are written as.
///
/// **The brand seed is the solved primary, not the colour handed in**, and that
/// is what makes the two derivations agree: the stylesheet builds its ramp from
/// the seed, so seeding it with the raw input would leave the CSS primary and
/// this engine's primary two different colours on the same page.
///
/// **The chroma policy has to reach the seed, or half the palette never hears
/// about it.** This engine applies it to every colour it solves, and the
/// twenty-four series colours are not among those. Measured before it did:
/// saturation at 20 per cent, and a bar still painted chroma 0.206.
///
/// A `Vec` of pairs rather than a map, because the emitted order is the order
/// they are written in and a map would sort them.
#[must_use]
pub fn seeds(resolved: &Resolved, primary: &Emphasis) -> Vec<(String, String)> {
    let scale = resolved.chroma.scale.unwrap_or(1.0);
    let series = resolved
        .chroma
        .ceiling
        .map_or(scale, |ceiling| scale.min(ceiling / LOUDEST_SERIES));

    vec![
        (
            "seed-brand".to_owned(),
            oklch_to_hex(fit_to_gamut(primary.raw, GAMUT_STEPS)),
        ),
        ("seed-chroma-scale".to_owned(), trimmed(series, 3)),
        ("seed-density".to_owned(), number(resolved.density)),
        (
            "seed-radii".to_owned(),
            format!("{}rem", number(resolved.radius)),
        ),
    ]
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
/// value in this range except that JavaScript writes an integral float without a
/// fraction, `1` where Rust writes `1`. They agree there too, which is worth
/// checking rather than assuming: `format!("{}", 1.0_f64)` is `"1"`.
fn number(value: f64) -> String {
    format!("{value}")
}
