//! What a browser paints for a token's color: `fusion/scripts/lib/paint.mjs`,
//! ported.
//!
//! **A port, operation for operation, so the two agree to the byte.** Each
//! function here is the one in `paint.mjs` with the same name in Rust's case,
//! in the same order of arithmetic, and a spec in `fusion/scripts` holds the
//! native token modules to that file's hex for every color in both modes.
//! `check-token-hexes.mjs` holds `paint.mjs` to Chromium, so the chain ends at
//! the pixels.
//!
//! **Out of gamut is clipped per channel, which is what `paint.mjs` does and
//! what Chromium paints.** CSS Color 4 §13.2 specifies a chroma reduction in
//! OKLCH instead, and `paint.mjs` records why it does not run it: measured on
//! five out-of-gamut colors, the clip matched Chromium every time and §13.2
//! matched none. The engine's `fit_to_gamut` is a third algorithm, a bisection
//! the theme derivation is fixed to, and neither of these may stand in for it.
//!
//! `l`, `a` and `b` are `OKLab`'s own names for its axes, kept so each line can
//! be read against `paint.mjs` and Ottosson's matrices.

#![allow(clippy::many_single_char_names)]

use std::f64::consts::PI;
use std::fmt::Write as _;

/// A color as `paint.mjs` carries it: `OKLab` and alpha, and the polar
/// components it was stated in where it was written in OKLCH.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Lab {
    pub l: f64,
    pub a: f64,
    pub b: f64,
    pub alpha: f64,
    /// **The components as stated, which a relative color reads.** An origin
    /// recovered from `OKLab` by `atan2` reads a hue of 258 as
    /// 257.99999999999994, and on six of the series that is one code point of
    /// red. `paint.mjs` measured it against Chromium.
    pub stated: Option<Polar>,
}

/// OKLCH components and alpha.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Polar {
    pub l: f64,
    pub c: f64,
    pub h: f64,
    pub alpha: f64,
}

/// `transparent`: no color, and no alpha.
pub const TRANSPARENT: Lab = Lab {
    l: 0.0,
    a: 0.0,
    b: 0.0,
    alpha: 0.0,
    stated: None,
};

fn encode(channel: f64) -> f64 {
    let sign = if channel < 0.0 { -1.0 } else { 1.0 };
    let value = channel.abs();
    if value <= 0.003_130_8 {
        channel * 12.92
    } else {
        sign * (1.055 * value.powf(1.0 / 2.4) - 0.055)
    }
}

fn decode(channel: f64) -> f64 {
    let sign = if channel < 0.0 { -1.0 } else { 1.0 };
    let value = channel.abs();
    if value <= 0.040_45 {
        channel / 12.92
    } else {
        sign * ((value + 0.055) / 1.055).powf(2.4)
    }
}

fn lab_to_linear(color: &Lab) -> [f64; 3] {
    let Lab { l, a, b, .. } = *color;
    let long = (l + 0.396_337_777_4 * a + 0.215_803_757_3 * b).powi(3);
    let medium = (l - 0.105_561_345_8 * a - 0.063_854_172_8 * b).powi(3);
    let short = (l - 0.089_484_177_5 * a - 1.291_485_548 * b).powi(3);
    [
        4.076_741_662_1 * long - 3.307_711_591_3 * medium + 0.230_969_929_2 * short,
        -1.268_438_004_6 * long + 2.609_757_401_1 * medium - 0.341_319_396_5 * short,
        -0.004_196_086_3 * long - 0.703_418_614_7 * medium + 1.707_614_701 * short,
    ]
}

fn linear_to_lab([red, green, blue]: [f64; 3]) -> (f64, f64, f64) {
    let long = (0.412_221_470_8 * red + 0.536_332_536_3 * green + 0.051_445_992_9 * blue).cbrt();
    let medium = (0.211_903_498_2 * red + 0.680_699_545_1 * green + 0.107_396_956_6 * blue).cbrt();
    let short = (0.088_302_461_9 * red + 0.281_718_837_6 * green + 0.629_978_700_5 * blue).cbrt();
    (
        0.210_454_255_3 * long + 0.793_617_785 * medium - 0.004_072_046_8 * short,
        1.977_998_495_1 * long - 2.428_592_205 * medium + 0.450_593_709_9 * short,
        0.025_904_037_1 * long + 0.782_771_766_2 * medium - 0.808_675_766 * short,
    )
}

/// OKLCH to `OKLab`, keeping the components as stated.
pub fn to_lab(polar: Polar) -> Lab {
    Lab {
        l: polar.l,
        a: polar.c * ((polar.h * PI) / 180.0).cos(),
        b: polar.c * ((polar.h * PI) / 180.0).sin(),
        alpha: polar.alpha,
        stated: Some(polar),
    }
}

/// `OKLab` to OKLCH, the hue in 0 to 360.
pub fn to_lch(color: &Lab) -> Polar {
    Polar {
        l: color.l,
        c: (color.a * color.a + color.b * color.b).sqrt(),
        h: ((color.b.atan2(color.a) * 180.0) / PI + 360.0) % 360.0,
        alpha: color.alpha,
    }
}

/// The components a relative color reads off its origin: as stated where
/// the origin was written in OKLCH, recovered otherwise.
pub fn origin(color: &Lab) -> Polar {
    color.stated.unwrap_or_else(|| to_lch(color))
}

/// `#` and three, four, six or eight hex digits, as `OKLab` and alpha.
pub fn from_hex(digits: &str) -> Option<Lab> {
    let expanded: String = if digits.len() <= 4 {
        digits.chars().flat_map(|one| [one, one]).collect()
    } else {
        digits.to_owned()
    };
    let channel = |at: usize| -> Option<f64> {
        let byte = u8::from_str_radix(expanded.get(at..at + 2)?, 16).ok()?;
        Some(f64::from(byte) / 255.0)
    };
    let (l, a, b) = linear_to_lab([
        decode(channel(0)?),
        decode(channel(2)?),
        decode(channel(4)?),
    ]);
    let alpha = if expanded.len() == 8 {
        channel(6)?
    } else {
        1.0
    };
    Some(Lab {
        l,
        a,
        b,
        alpha,
        stated: None,
    })
}

/// `color-mix(in oklab, <first> <weight>, <second>)`, `weight` being the
/// first color's share from 0 to 1.
///
/// **Premultiplied, per CSS Color 4 §12.3**, which is what makes a mix with
/// `transparent` read as the first color faded.
pub fn mix(first: &Lab, weight: f64, second: &Lab) -> Lab {
    let alpha = first.alpha * weight + second.alpha * (1.0 - weight);
    let blend = |one: f64, other: f64| {
        if alpha == 0.0 {
            0.0
        } else {
            (one * first.alpha * weight + other * second.alpha * (1.0 - weight)) / alpha
        }
    };
    Lab {
        l: blend(first.l, second.l),
        a: blend(first.a, second.a),
        b: blend(first.b, second.b),
        alpha,
        stated: None,
    }
}

/// Gamma-encoded sRGB from 0 to 1, each channel clipped into gamut first.
pub fn to_srgb(color: &Lab) -> [f64; 3] {
    lab_to_linear(color).map(|one| encode(one.clamp(0.0, 1.0)))
}

fn byte(channel: f64) -> u8 {
    /* `round` and not a cast, which truncates. `Math.round` breaks a tie
    upward and Rust's breaks it away from zero, which agree here because the
    channel is clamped to 0 to 1 first. */
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let value = (channel.clamp(0.0, 1.0) * 255.0).round() as u8;
    value
}

/// Eight digits where the color is translucent, six where it is not.
pub fn to_hex(color: &Lab) -> String {
    let [red, green, blue] = to_srgb(color).map(byte);
    let mut hex = format!("#{red:02x}{green:02x}{blue:02x}");
    if color.alpha < 1.0 {
        let _ = write!(hex, "{:02x}", byte(color.alpha));
    }
    hex
}
