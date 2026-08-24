//! OKLCH color math, ported from `src/oklch.ts`.
//!
//! Theme derivation depends on a perceptual color space. Equal numeric steps in
//! sRGB are not equal perceptual steps, which makes both scale generation and
//! contrast targeting unreliable. Everything here exists so that
//! [`lightness_for_contrast`] can be correct.
//!
//! **This is a port rather than a second implementation, and the difference is
//! the whole reason 142 calls it a move.** `fit_to_gamut` is a twenty step
//! bisection and `lightness_for_contrast` searches too, so the iteration count,
//! the bisection order and the float arithmetic are not details, they are the
//! answer: two implementations that merely agree on intent disagree on output by
//! construction. So the loops below are the TypeScript's loop bounds, in its
//! order, and every constant is copied rather than rederived.
//!
//! `f64` throughout, because a JavaScript number is one and a port that reached
//! for `f32` would differ in the last place at exactly the point a bisection is
//! deciding which half to keep.

/// A color in OKLCH. Lightness 0 to 1, chroma from 0, hue in degrees.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Oklch {
    pub chroma: f64,
    pub hue: f64,
    pub lightness: f64,
}

/// Linear-light sRGB, unclamped so out-of-gamut colours stay detectable.
#[derive(Clone, Copy, Debug)]
pub struct LinearRgb {
    pub b: f64,
    pub g: f64,
    pub r: f64,
}

fn clamp01(n: f64) -> f64 {
    n.clamp(0.0, 1.0)
}

/// OKLCH to linear sRGB, via `Oklab`. Coefficients from Björn Ottosson's
/// definition of the `Oklab` color space.
#[must_use]
pub fn oklch_to_linear_rgb(color: Oklch) -> LinearRgb {
    let rad = color.hue * std::f64::consts::PI / 180.0;
    let a = color.chroma * rad.cos();
    let bb = color.chroma * rad.sin();

    let l = (color.lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * bb).powi(3);
    let m = (color.lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * bb).powi(3);
    let s = (color.lightness - 0.089_484_177_5 * a - 1.291_485_548 * bb).powi(3);

    LinearRgb {
        b: -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s,
        g: -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
        r: 4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
    }
}

/// True when the color falls outside the sRGB gamut and would be clipped.
#[must_use]
pub fn is_out_of_gamut(color: Oklch) -> bool {
    let rgb = oklch_to_linear_rgb(color);
    let epsilon = 1e-4;
    [rgb.r, rgb.g, rgb.b]
        .iter()
        .any(|channel| *channel < -epsilon || *channel > 1.0 + epsilon)
}

fn linear_to_srgb(channel: f64) -> f64 {
    let c = clamp01(channel);
    if c <= 0.003_130_8 {
        c * 12.92
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

/// OKLCH to a `#rrggbb` string, clipped into gamut.
#[must_use]
pub fn oklch_to_hex(color: Oklch) -> String {
    let rgb = oklch_to_linear_rgb(color);
    let to_byte = |channel: f64| {
        /* `round` rather than a cast, and the two differ: a cast truncates.
        JavaScript's `Math.round` breaks ties upward and Rust's breaks them
        away from zero, which are the same rule here because `linear_to_srgb`
        clamps to 0..1 and nothing reaching this is negative. */
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let byte = (linear_to_srgb(channel) * 255.0).round() as u8;
        format!("{byte:02x}")
    };
    format!("#{}{}{}", to_byte(rgb.r), to_byte(rgb.g), to_byte(rgb.b))
}

fn srgb_to_linear(channel: f64) -> f64 {
    let c = clamp01(channel);
    if c <= 0.040_45 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

/// A `#rgb` or `#rrggbb` string to OKLCH, the inverse of [`oklch_to_hex`].
///
/// **Hex is the fixed point, not OKLCH.** `hex_to_oklch(oklch_to_hex(c))`
/// returns `c` only when `c` can be rendered: `oklch_to_hex` clips, so a color
/// outside the sRGB gamut comes back as the color that can be shown instead.
/// What does hold exactly is the other direction, which is the property a color
/// a reader picked actually needs.
///
/// Returns `None` for anything that is not three or six hex digits, where the
/// TypeScript produced `NaN` components and carried them into the palette. A
/// port is the moment to stop propagating that quietly.
/* `l`, `m`, `s`, `a` and `b` are Oklab's own names for its axes and its LMS
response, and the coefficients below are only checkable against Ottosson's
published matrices by keeping them. Naming them `long`, `medium` and `short`
would make a line-by-line comparison with the TypeScript, which is the thing
this file is a port of, harder for every future reader. */
#[allow(clippy::many_single_char_names)]
#[must_use]
pub fn hex_to_oklch(hex: &str) -> Option<Oklch> {
    /* One `#`, not any number of them. `trim_start_matches` strips every leading
    one, so `##abc` parsed here and produced a color where the TypeScript's
    single `.replace('#', '')` leaves `#abc` and refuses. Accepting a typo the
    engine being ported rejects is the wrong direction for a port to differ in. */
    let trimmed = hex.trim();
    let raw = trimmed.strip_prefix('#').unwrap_or(trimmed);
    let full = match raw.len() {
        3 => raw.chars().flat_map(|c| [c, c]).collect::<String>(),
        6 => raw.to_owned(),
        _ => return None,
    };
    let byte = |at: usize| {
        u8::from_str_radix(full.get(at..at + 2)?, 16)
            .ok()
            .map(|value| f64::from(value) / 255.0)
    };

    let r = srgb_to_linear(byte(0)?);
    let g = srgb_to_linear(byte(2)?);
    let b = srgb_to_linear(byte(4)?);

    /* The cube roots of the LMS response, which is where Oklab starts.
    Coefficients are Ottosson's, and are the inverse of the matrix
    `oklch_to_linear_rgb` uses. */
    let l = (0.412_221_470_8 * r + 0.536_332_536_3 * g + 0.051_445_992_9 * b).cbrt();
    let m = (0.211_903_498_2 * r + 0.680_699_545_1 * g + 0.107_396_956_6 * b).cbrt();
    let s = (0.088_302_461_9 * r + 0.281_718_837_6 * g + 0.629_978_700_5 * b).cbrt();

    let lightness = 0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s;
    let a = 1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s;
    let bb = 0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s;

    let hue = bb.atan2(a) * 180.0 / std::f64::consts::PI;
    Some(Oklch {
        chroma: a.hypot(bb),
        hue: if hue < 0.0 { hue + 360.0 } else { hue },
        lightness,
    })
}

/// WCAG 2.1 relative luminance, from linear-light values.
#[must_use]
pub fn relative_luminance(color: Oklch) -> f64 {
    let rgb = oklch_to_linear_rgb(color);
    0.2126 * clamp01(rgb.r) + 0.7152 * clamp01(rgb.g) + 0.0722 * clamp01(rgb.b)
}

fn ratio(la: f64, lb: f64) -> f64 {
    let (lighter, darker) = if la > lb { (la, lb) } else { (lb, la) };
    (lighter + 0.05) / (darker + 0.05)
}

/// WCAG contrast ratio between two colours, from 1 to 21.
#[must_use]
pub fn contrast_ratio(a: Oklch, b: Oklch) -> f64 {
    ratio(relative_luminance(a), relative_luminance(b))
}

/// Relative luminance of the color as it will actually ship.
///
/// **The float is solved and the hex is delivered, and they are not the same
/// color.** `oklch_to_hex` rounds each channel to a byte, and a byte of
/// rounding moves the luminance: solved in continuous space and measured after
/// rounding, three emitted inks came out at 4.4885, 4.4891 and 4.4905 against a
/// target of 4.5. The quantisation here is `oklch_to_hex`'s own, byte for byte,
/// so this is what the browser will compute rather than an approximation of it.
#[must_use]
pub fn shipped_luminance(color: Oklch) -> f64 {
    let rgb = oklch_to_linear_rgb(color);
    let quantise = |channel: f64| {
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let byte = (linear_to_srgb(channel) * 255.0).round() as u8;
        srgb_to_linear(f64::from(byte) / 255.0)
    };
    0.2126 * quantise(rgb.r) + 0.7152 * quantise(rgb.g) + 0.0722 * quantise(rgb.b)
}

/// WCAG contrast ratio between two colours as they will be written to hex.
#[must_use]
pub fn shipped_contrast_ratio(a: Oklch, b: Oklch) -> f64 {
    ratio(shipped_luminance(a), shipped_luminance(b))
}

/// How many halvings [`fit_to_gamut`] takes. The TypeScript's default.
pub const GAMUT_STEPS: u32 = 20;

/// How many halvings each direction of the contrast search takes.
pub const CONTRAST_STEPS: u32 = 24;

/// Reduces chroma until the color falls inside the sRGB gamut, preserving
/// lightness and hue.
///
/// Without this, any seed chroma at an extreme lightness silently produces a
/// clipped color: a near-white surface with a hint of brand tint pushes a
/// channel above 1.0 and gets truncated on the way to hex, which breaks both the
/// intended hue and the contrast that was solved for.
#[must_use]
pub fn fit_to_gamut(color: Oklch, steps: u32) -> Oklch {
    if !is_out_of_gamut(color) {
        return color;
    }

    let mut low = 0.0;
    let mut high = color.chroma;

    for _ in 0..steps {
        /* Not `f64::midpoint`, which clippy suggests and which would break the
        one property this file exists to have. `midpoint` is written to avoid
        overflow and is not the same arithmetic: the TypeScript computes
        `(low + high) / 2`, and a bisection that rounds differently in the last
        place takes a different branch and lands somewhere else. Overflow is not
        reachable here anyway, both bounds being inside 0..1. */
        #[allow(clippy::manual_midpoint)]
        let mid = (low + high) / 2.0;
        if is_out_of_gamut(Oklch {
            chroma: mid,
            ..color
        }) {
            high = mid;
        } else {
            low = mid;
        }
    }

    Oklch {
        chroma: low,
        ..color
    }
}

/// Searches one side of the background for a passing lightness.
fn search_direction(
    chroma: f64,
    hue: f64,
    background: Oklch,
    target: f64,
    darker: bool,
    steps: u32,
) -> Oklch {
    let mut low = if darker { 0.0 } else { background.lightness };
    let mut high = if darker { background.lightness } else { 1.0 };
    let mut best = Oklch {
        chroma,
        hue,
        lightness: if darker { low } else { high },
    };

    for _ in 0..steps {
        /* Not `f64::midpoint`, which clippy suggests and which would break the
        one property this file exists to have. `midpoint` is written to avoid
        overflow and is not the same arithmetic: the TypeScript computes
        `(low + high) / 2`, and a bisection that rounds differently in the last
        place takes a different branch and lands somewhere else. Overflow is not
        reachable here anyway, both bounds being inside 0..1. */
        #[allow(clippy::manual_midpoint)]
        let mid = (low + high) / 2.0;
        let candidate = Oklch {
            chroma,
            hue,
            lightness: mid,
        };

        if shipped_contrast_ratio(fit_to_gamut(candidate, GAMUT_STEPS), background) >= target {
            best = candidate;
            // Contrast grows with distance from the background, so pull back
            // toward it to find the least extreme lightness that still passes.
            if darker {
                low = mid;
            } else {
                high = mid;
            }
        } else if darker {
            high = mid;
        } else {
            low = mid;
        }
    }

    best
}

/// Finds the lightness at which a sample hits `target` contrast against
/// `background`.
///
/// This is the function the whole theming product rests on. It is what lets a
/// user pick a brand color and receive a palette whose every foreground and
/// background pair is accessible **by construction**, rather than generated and
/// then audited.
///
/// **Both directions are tried unless one is pinned.** Whether light or dark
/// text works better on a given surface is not knowable from the background's
/// luminance alone: a mid-tone brand color often fails white text and passes
/// black, and a luminance-threshold heuristic picks wrong exactly there. When
/// both sides pass, the least extreme result wins.
///
/// Returns the closest achievable lightness when the target is unreachable at
/// the sample's chroma, so callers should verify with [`contrast_ratio`] rather
/// than assume success.
#[must_use]
pub fn lightness_for_contrast(
    chroma: f64,
    hue: f64,
    background: Oklch,
    target: f64,
    darker: Option<bool>,
    steps: u32,
) -> Oklch {
    if let Some(side) = darker {
        return search_direction(chroma, hue, background, target, side, steps);
    }

    let dark = search_direction(chroma, hue, background, target, true, steps);
    let light = search_direction(chroma, hue, background, target, false, steps);
    let dark_ratio = contrast_ratio(fit_to_gamut(dark, GAMUT_STEPS), background);
    let light_ratio = contrast_ratio(fit_to_gamut(light, GAMUT_STEPS), background);
    let dark_passes = dark_ratio >= target;
    let light_passes = light_ratio >= target;

    if dark_passes && light_passes {
        return if dark_ratio <= light_ratio {
            dark
        } else {
            light
        };
    }
    if dark_passes {
        return dark;
    }
    if light_passes {
        return light;
    }
    // Neither side reaches the target. Return the better attempt so the caller
    // can report it as a violation rather than shipping it unnoticed.
    if dark_ratio >= light_ratio {
        dark
    } else {
        light
    }
}
