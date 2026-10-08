//! The pixel diff: how many pixels of two pictures of one size differ.
//!
//! **A port of `pixelmatch` 7.2.0, line for line, and not a reimplementation of
//! its idea.** Fusion's 609 baselines were accepted by that function at a
//! threshold of 0.1, and the first job of this one is to accept exactly the
//! same pictures: a baseline it rejects is a retake nobody asked for, and one
//! it accepts that `pixelmatch` rejected is a fault let through. So the color
//! metric, the background a translucent pixel is blended over, the
//! antialiasing detector and the order of every floating-point operation are
//! `pixelmatch`'s. `agrees_with_pixelmatch` below holds the count and the diff
//! image to what `pixelmatch` returned for the same pair.
//!
//! **Antialiasing is excluded, as `pixelmatch` excludes it by default.** A
//! pixel whose neighborhood reads as the soft edge of a shape in either picture
//! is drawn yellow in the diff image and not counted. The measurement in the
//! proposal timed a Rust diff without this pass; it runs only on a pixel that
//! already differs, so a matching picture never pays for it.

use crate::image::Image;

/// Opacity of the baseline, drawn in gray under the marked pixels.
const ALPHA: f64 = 0.1;
/// A pixel excluded as antialiasing.
const AA_COLOR: [u8; 3] = [255, 255, 0];
/// A pixel that differs.
const DIFF_COLOR: [u8; 3] = [255, 0, 0];

/// The largest value the YIQ distance below can take, for the threshold to
/// scale.
const MAX_YIQ: f64 = 35215.0;

/// How many pixels differ between two pictures of the same size, at a
/// per-pixel color `threshold` from 0 to 1.
///
/// With `marked`, also draws the diff image into it: the first picture in gray,
/// the counted pixels red, and the excluded antialiasing yellow. `marked` must
/// hold as many bytes as either picture.
///
/// # Panics
///
/// When the two pictures differ in size, which the caller reports as a layout
/// change before it asks how many pixels moved.
pub fn count(
    before: &Image,
    after: &Image,
    threshold: f64,
    mut marked: Option<&mut [u8]>,
) -> usize {
    assert!(
        before.width == after.width && before.height == after.height,
        "the diff compares pictures of one size"
    );
    let width = before.width as usize;
    let height = before.height as usize;
    let first = &before.rgba;
    let second = &after.rgba;

    /* Whole pixels as one word each, which is how `pixelmatch` asks whether two
    pixels are equal and whether a neighbor shares a color. The byte order is
    irrelevant: the words are only ever compared with each other. */
    let words = |rgba: &[u8]| -> Vec<u32> {
        rgba.chunks_exact(4)
            .map(|pixel| u32::from_ne_bytes([pixel[0], pixel[1], pixel[2], pixel[3]]))
            .collect()
    };
    let first32 = words(first);
    let second32 = words(second);

    if first32 == second32 {
        if let Some(out) = marked {
            for pos in (0..first.len()).step_by(4) {
                draw_gray(first, pos, out);
            }
        }
        return 0;
    }

    let max_delta = MAX_YIQ * threshold * threshold;
    let mut differing = 0;
    for (index, pos) in (0..first.len()).step_by(4).enumerate() {
        let delta = if first32[index] == second32[index] {
            0.0
        } else {
            color_delta(first, second, pos, pos)
        };
        if delta.abs() > max_delta {
            let x = index % width;
            let y = index / width;
            let excluded = antialiased(first, x, y, width, height, &first32, &second32)
                || antialiased(second, x, y, width, height, &second32, &first32);
            if excluded {
                if let Some(out) = marked.as_deref_mut() {
                    draw(out, pos, AA_COLOR);
                }
            } else {
                if let Some(out) = marked.as_deref_mut() {
                    draw(out, pos, DIFF_COLOR);
                }
                differing += 1;
            }
        } else if let Some(out) = marked.as_deref_mut() {
            draw_gray(first, pos, out);
        }
    }
    differing
}

/// The diff image for two pictures of one size, and how many pixels differ.
pub fn marked(before: &Image, after: &Image, threshold: f64) -> (usize, Image) {
    let mut rgba = vec![0; before.rgba.len()];
    let differing = count(before, after, threshold, Some(&mut rgba));
    (
        differing,
        Image {
            height: before.height,
            rgba,
            width: before.width,
        },
    )
}

/// The structural similarity of two pictures of one size, from 0 to 1, where 1
/// is the same picture.
///
/// **For pages a pixel count cannot judge.** A photograph scaled by the
/// browser, or a gradient dithered differently on each render, moves
/// thousands of pixels by a shade and changes nothing a reader sees, and a
/// pixel diff fails it every time. Structural similarity compares the
/// brightness, contrast and structure of each window instead, Wang, Bovik,
/// Sheikh and Simoncelli, "Image quality assessment: from error visibility to
/// structural similarity", 2004.
///
/// Measured on brightness, each pixel blended over white as `pixelmatch`'s
/// gray drawing does, in 8 by 8 windows stepping by 4, and averaged. A picture
/// smaller than one window is one window.
///
/// # Panics
///
/// When the two pictures differ in size.
#[allow(clippy::cast_precision_loss)] // Pixel counts far below 2^52.
pub fn ssim(before: &Image, after: &Image) -> f64 {
    const WINDOW: usize = 8;
    const STEP: usize = 4;
    const C1: f64 = (0.01 * 255.0) * (0.01 * 255.0);
    const C2: f64 = (0.03 * 255.0) * (0.03 * 255.0);
    assert!(
        before.width == after.width && before.height == after.height,
        "the similarity compares pictures of one size"
    );
    let width = before.width as usize;
    let height = before.height as usize;
    let luma = |rgba: &[u8]| -> Vec<f64> {
        rgba.chunks_exact(4)
            .map(|pixel| {
                let alpha = f64::from(pixel[3]) / 255.0;
                let value = f64::from(pixel[0]) * 0.298_895_31
                    + f64::from(pixel[1]) * 0.586_622_47
                    + f64::from(pixel[2]) * 0.114_482_23;
                value * alpha + 255.0 * (1.0 - alpha)
            })
            .collect()
    };
    let first = luma(&before.rgba);
    let second = luma(&after.rgba);
    let starts = |size: usize| -> Vec<usize> {
        if size <= WINDOW {
            vec![0]
        } else {
            let mut out: Vec<usize> = (0..=size - WINDOW).step_by(STEP).collect();
            if out.last() != Some(&(size - WINDOW)) {
                out.push(size - WINDOW);
            }
            out
        }
    };
    let (columns, rows) = (starts(width), starts(height));
    let mut total = 0.0;
    let mut windows = 0.0;
    for &top in &rows {
        for &left in &columns {
            let mut first_sum = 0.0;
            let mut second_sum = 0.0;
            let mut first_squares = 0.0;
            let mut second_squares = 0.0;
            let mut products = 0.0;
            let mut count = 0.0;
            for y in top..(top + WINDOW).min(height) {
                for x in left..(left + WINDOW).min(width) {
                    let one = first[y * width + x];
                    let two = second[y * width + x];
                    first_sum += one;
                    second_sum += two;
                    first_squares += one * one;
                    second_squares += two * two;
                    products += one * two;
                    count += 1.0;
                }
            }
            let first_mean = first_sum / count;
            let second_mean = second_sum / count;
            let first_variance = (first_squares / count - first_mean * first_mean).max(0.0);
            let second_variance = (second_squares / count - second_mean * second_mean).max(0.0);
            let covariance = products / count - first_mean * second_mean;
            total += ((2.0 * first_mean * second_mean + C1) * (2.0 * covariance + C2))
                / ((first_mean * first_mean + second_mean * second_mean + C1)
                    * (first_variance + second_variance + C2));
            windows += 1.0;
        }
    }
    total / windows
}

/// The color a translucent pixel is blended over before it is compared, which
/// `pixelmatch` draws as a checkerboard keyed on the pixel's byte offset.
///
/// `k % 2` is always 0 for an offset into four-byte pixels, so the red channel
/// always blends over 48. Kept as written: the point of this file is that it
/// computes what `pixelmatch` computes.
#[allow(clippy::cast_precision_loss)] // A byte offset below 2^52 is exact as a float.
fn background(k: usize) -> (f64, f64, f64) {
    let k = k as f64;
    (
        48.0 + 159.0 * (k % 2.0),
        48.0 + 159.0 * ((k / 1.618_033_988_749_895).trunc() % 2.0),
        48.0 + 159.0 * ((k / 2.618_033_988_749_895).trunc() % 2.0),
    )
}

/// The channels of the pixel at byte offset `at`, as floats.
fn channels(rgba: &[u8], at: usize) -> (f64, f64, f64, f64) {
    (
        f64::from(rgba[at]),
        f64::from(rgba[at + 1]),
        f64::from(rgba[at + 2]),
        f64::from(rgba[at + 3]),
    )
}

/// The squared YIQ distance between two pixels, negative when the second is
/// lighter. Kotsarenko and Ramos, "Measuring perceived color difference using
/// YIQ NTSC transmission color space in mobile applications". The caller has
/// already established the two pixels differ.
fn color_delta(first: &[u8], second: &[u8], k: usize, m: usize) -> f64 {
    let (r1, g1, b1, a1) = channels(first, k);
    let (r2, g2, b2, a2) = channels(second, m);
    let mut dr = r1 - r2;
    let mut dg = g1 - g2;
    let mut db = b1 - b2;
    let da = a1 - a2;
    if a1 < 255.0 || a2 < 255.0 {
        let (rb, gb, bb) = background(k);
        dr = (r1 * a1 - r2 * a2 - rb * da) / 255.0;
        dg = (g1 * a1 - g2 * a2 - gb * da) / 255.0;
        db = (b1 * a1 - b2 * a2 - bb * da) / 255.0;
    }
    let luma = dr * 0.298_895_31 + dg * 0.586_622_47 + db * 0.114_482_23;
    let in_phase = dr * 0.595_977_99 - dg * 0.274_176_10 - db * 0.321_801_89;
    let quadrature = dr * 0.211_470_17 - dg * 0.522_617_11 + db * 0.311_146_94;
    let delta =
        0.5053 * luma * luma + 0.299 * in_phase * in_phase + 0.1957 * quadrature * quadrature;
    if luma > 0.0 {
        -delta
    } else {
        delta
    }
}

/// The brightness part of the distance alone, between the pixel at `k` and a
/// neighbor at `m`, for the antialiasing detector.
fn brightness_delta(rgba: &[u8], k: usize, m: usize) -> f64 {
    let (r1, g1, b1, a1) = channels(rgba, k);
    let (r2, g2, b2, a2) = channels(rgba, m);
    if rgba[k..k + 4] == rgba[m..m + 4] {
        return 0.0;
    }
    let mut dr = r1 - r2;
    let mut dg = g1 - g2;
    let mut db = b1 - b2;
    let da = a1 - a2;
    if a1 < 255.0 || a2 < 255.0 {
        let (rb, gb, bb) = background(k);
        dr = (r1 * a1 - r2 * a2 - rb * da) / 255.0;
        dg = (g1 * a1 - g2 * a2 - gb * da) / 255.0;
        db = (b1 * a1 - b2 * a2 - bb * da) / 255.0;
    }
    dr * 0.298_895_31 + dg * 0.586_622_47 + db * 0.114_482_23
}

/// Whether the pixel at `(x1, y1)` of `rgba` is likely part of an antialiased
/// edge: Vysniauskas, "Anti-aliased Pixel and Intensity Slope Detector", 2009.
///
/// `own` is the picture `rgba` belongs to and `other` the one it is compared
/// with, as whole-pixel words.
fn antialiased(
    rgba: &[u8],
    x1: usize,
    y1: usize,
    width: usize,
    height: usize,
    own: &[u32],
    other: &[u32],
) -> bool {
    let x0 = x1.saturating_sub(1);
    let y0 = y1.saturating_sub(1);
    let x2 = (x1 + 1).min(width - 1);
    let y2 = (y1 + 1).min(height - 1);
    let center = (y1 * width + x1) * 4;
    let mut zeroes = usize::from(x1 == x0 || x1 == x2 || y1 == y0 || y1 == y2);
    let mut min = 0.0;
    let mut max = 0.0;
    let (mut min_x, mut min_y, mut max_x, mut max_y) = (0, 0, 0, 0);

    for x in x0..=x2 {
        for y in y0..=y2 {
            if x == x1 && y == y1 {
                continue;
            }
            let delta = brightness_delta(rgba, center, (y * width + x) * 4);
            /* Exactly zero, as `pixelmatch` asks: `brightness_delta` returns a
            literal 0.0 for an equal neighbor, and a tolerance here would
            count neighbors `pixelmatch` does not. */
            #[allow(clippy::float_cmp)]
            let equal = delta == 0.0;
            if equal {
                zeroes += 1;
                if zeroes > 2 {
                    return false;
                }
            } else if delta < min {
                min = delta;
                min_x = x;
                min_y = y;
            } else if delta > max {
                max = delta;
                max_x = x;
                max_y = y;
            }
        }
    }

    #[allow(clippy::float_cmp)] // Untouched since it was set to a literal 0.0.
    if min == 0.0 || max == 0.0 {
        return false;
    }

    (siblings(own, min_x, min_y, width, height) && siblings(other, min_x, min_y, width, height))
        || (siblings(own, max_x, max_y, width, height)
            && siblings(other, max_x, max_y, width, height))
}

/// Whether the pixel at `(x1, y1)` has three or more neighbors of its exact
/// color.
fn siblings(words: &[u32], x1: usize, y1: usize, width: usize, height: usize) -> bool {
    let x0 = x1.saturating_sub(1);
    let y0 = y1.saturating_sub(1);
    let x2 = (x1 + 1).min(width - 1);
    let y2 = (y1 + 1).min(height - 1);
    let value = words[y1 * width + x1];
    let mut zeroes = usize::from(x1 == x0 || x1 == x2 || y1 == y0 || y1 == y2);
    for x in x0..=x2 {
        for y in y0..=y2 {
            if x == x1 && y == y1 {
                continue;
            }
            zeroes += usize::from(value == words[y * width + x]);
            if zeroes > 2 {
                return true;
            }
        }
    }
    false
}

fn draw(out: &mut [u8], pos: usize, [r, g, b]: [u8; 3]) {
    out[pos] = r;
    out[pos + 1] = g;
    out[pos + 2] = b;
    out[pos + 3] = 255;
}

/// The pixel of `rgba` at `pos` as a faint gray, the ground the marks are drawn
/// on.
#[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)] // 0 to 255 by construction, truncated as a Uint8Array store truncates.
fn draw_gray(rgba: &[u8], pos: usize, out: &mut [u8]) {
    let (r, g, b, a) = channels(rgba, pos);
    let value = 255.0
        + (r * 0.298_895_31 + g * 0.586_622_47 + b * 0.114_482_23 - 255.0) * ALPHA * a / 255.0;
    let gray = value as u8;
    draw(out, pos, [gray, gray, gray]);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn picture(width: u32, height: u32, rgba: Vec<u8>) -> Image {
        Image {
            height,
            rgba,
            width,
        }
    }

    fn filled(width: u32, height: u32, color: [u8; 4]) -> Image {
        picture(width, height, color.repeat((width * height) as usize))
    }

    fn set(image: &mut Image, x: u32, y: u32, color: [u8; 4]) {
        let at = ((y * image.width + x) * 4) as usize;
        image.rgba[at..at + 4].copy_from_slice(&color);
    }

    #[test]
    fn identical_pictures_differ_nowhere() {
        let one = filled(4, 4, [10, 20, 30, 255]);
        assert_eq!(count(&one, &one.clone(), 0.1, None), 0);
    }

    #[test]
    fn one_changed_pixel_in_a_flat_field_is_counted() {
        let before = filled(5, 5, [255, 255, 255, 255]);
        let mut after = before.clone();
        set(&mut after, 2, 2, [0, 0, 0, 255]);
        let (differing, image) = marked(&before, &after, 0.1);
        assert_eq!(differing, 1);
        assert_eq!(&image.rgba[48..52], &[255, 0, 0, 255]);
        /* Everything else is the baseline in gray, and white stays white. */
        assert_eq!(&image.rgba[0..4], &[255, 255, 255, 255]);
    }

    #[test]
    fn a_change_under_the_threshold_is_not_counted() {
        let before = filled(3, 3, [100, 100, 100, 255]);
        let after = filled(3, 3, [102, 100, 100, 255]);
        assert_eq!(count(&before, &after, 0.1, None), 0);
        assert_eq!(count(&before, &after, 0.0, None), 9);
    }

    #[test]
    fn a_soft_edge_is_antialiasing_and_not_a_difference() {
        /* A vertical edge from black to white with one gray column between,
        and the gray moved a shade: the classic antialiased pixel, whose
        darker and brighter neighbors each sit in a run of their own color. */
        let mut before = filled(6, 6, [255, 255, 255, 255]);
        for y in 0..6 {
            for x in 0..2 {
                set(&mut before, x, y, [0, 0, 0, 255]);
            }
            set(&mut before, 2, y, [128, 128, 128, 255]);
        }
        let mut after = before.clone();
        set(&mut after, 2, 3, [60, 60, 60, 255]);
        assert_eq!(count(&before, &after, 0.1, None), 0);
    }

    /// **The same pair, given to `pixelmatch` 7.2.0 with a threshold of 0.1,
    /// counted 114 pixels and excluded 49 as antialiasing.** The pair is
    /// generated rather than committed: 8 by 8 blocks of flat color, every
    /// fifth one half transparent, and 300 channels of the copy rewritten by a
    /// linear congruential generator. The same generator in JavaScript made the
    /// pair `pixelmatch` was given, so the count, the yellow pixels and a hash
    /// of the whole diff image are what it returned on October 8, 2026.
    #[test]
    #[allow(clippy::cast_possible_truncation)] // Every value is masked to a byte or is a small constant.
    fn agrees_with_pixelmatch() {
        const WIDTH: usize = 64;
        const HEIGHT: usize = 48;
        let mut state: u32 = 0x2545_f491;
        let mut next = move || {
            state = state.wrapping_mul(1_103_515_245).wrapping_add(12345);
            (state >> 16) as usize
        };
        let mut rgba = vec![0u8; WIDTH * HEIGHT * 4];
        for y in 0..HEIGHT {
            for x in 0..WIDTH {
                let at = (y * WIDTH + x) * 4;
                let block = (x >> 3) + (y >> 3) * 8;
                rgba[at] = ((block * 37) & 255) as u8;
                rgba[at + 1] = ((block * 91) & 255) as u8;
                rgba[at + 2] = ((block * 53) & 255) as u8;
                rgba[at + 3] = if block % 5 == 0 { 128 } else { 255 };
            }
        }
        let mut changed = rgba.clone();
        for _ in 0..300 {
            let at = (next() % (WIDTH * HEIGHT)) * 4;
            let channel = next() % 4;
            changed[at + channel] = (next() & 255) as u8;
        }
        let before = picture(WIDTH as u32, HEIGHT as u32, rgba);
        let after = picture(WIDTH as u32, HEIGHT as u32, changed);

        let (differing, image) = marked(&before, &after, 0.1);
        assert_eq!(differing, 114);
        let yellow = image
            .rgba
            .chunks_exact(4)
            .filter(|pixel| pixel[..3] == AA_COLOR)
            .count();
        assert_eq!(yellow, 49);
        let hash = image.rgba.iter().fold(2_166_136_261_u32, |hash, &byte| {
            (hash ^ u32::from(byte)).wrapping_mul(16_777_619)
        });
        assert_eq!(hash, 3_569_531_285);
    }

    #[test]
    fn the_same_picture_is_perfectly_similar() {
        let one = filled(20, 12, [30, 60, 90, 255]);
        assert!((ssim(&one, &one.clone()) - 1.0).abs() < 1e-12);
    }

    #[test]
    fn a_shade_of_noise_stays_similar_and_a_new_shape_does_not() {
        /* A soft gradient, then the same gradient a shade off on every other
        pixel, which is what a re-dithered photograph looks like. */
        let mut gradient = filled(32, 32, [0, 0, 0, 255]);
        for y in 0..32 {
            for x in 0..32 {
                let value = u8::try_from(x * 4 + y * 3).unwrap();
                set(&mut gradient, x, y, [value, value, value, 255]);
            }
        }
        let mut dithered = gradient.clone();
        for y in 0..32_usize {
            for x in (y % 2..32).step_by(2) {
                let at = (y * 32 + x) * 4;
                dithered.rgba[at] = dithered.rgba[at].saturating_add(2);
            }
        }
        assert!(count(&gradient, &dithered, 0.0, None) > 400);
        assert!(ssim(&gradient, &dithered) > 0.99);

        let mut marked = gradient.clone();
        for y in 8..24 {
            for x in 8..24 {
                set(&mut marked, x, y, [255, 0, 0, 255]);
            }
        }
        assert!(ssim(&gradient, &marked) < 0.9);
    }

    #[test]
    fn translucent_pixels_are_blended_before_they_are_compared() {
        /* Fully transparent in both, in any color: blended over the same
        background, so the same pixel. */
        let before = filled(2, 2, [255, 0, 0, 0]);
        let after = filled(2, 2, [0, 0, 255, 0]);
        assert_eq!(count(&before, &after, 0.1, None), 0);
        let opaque = filled(2, 2, [0, 0, 255, 255]);
        assert_eq!(count(&before, &opaque, 0.1, None), 4);
    }
}
