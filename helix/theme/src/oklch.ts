/**
 * OKLCH color math.
 *
 * Theme derivation depends on a perceptual color space. Equal numeric steps in
 * sRGB are not equal perceptual steps, which makes both scale generation and
 * contrast targeting unreliable. Everything here exists so that
 * `lightnessForContrast` can be correct.
 */

/** A color in OKLCH. Lightness 0 to 1, chroma from 0, hue in degrees. */
export interface Oklch {
  chroma: number
  hue: number
  lightness: number
}

/** Linear-light sRGB, unclamped so out-of-gamut colors stay detectable. */
interface LinearRgb {
  b: number
  g: number
  r: number
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

/**
 * OKLCH to linear sRGB, via OKLab. Coefficients from Björn Ottosson's
 * definition of the Oklab color space.
 */
export const oklchToLinearRgb = ({ chroma, hue, lightness }: Oklch): LinearRgb => {
  const rad = (hue * Math.PI) / 180
  const a = chroma * Math.cos(rad)
  const bb = chroma * Math.sin(rad)

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * bb) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * bb) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * bb) ** 3

  return {
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
  }
}

/** True when the color falls outside the sRGB gamut and would be clipped. */
export const isOutOfGamut = (color: Oklch): boolean => {
  const { b, g, r } = oklchToLinearRgb(color)
  const epsilon = 1e-4
  return [r, g, b].some((channel) => channel < -epsilon || channel > 1 + epsilon)
}

const linearToSrgb = (channel: number): number => {
  const c = clamp01(channel)
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

/** OKLCH to a `#rrggbb` string, clipped into gamut. */
export const oklchToHex = (color: Oklch): string => {
  const { b, g, r } = oklchToLinearRgb(color)
  const toByte = (channel: number): string =>
    Math.round(linearToSrgb(channel) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`
}

const srgbToLinear = (channel: number): number => {
  const c = clamp01(channel)
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * A `#rgb` or `#rrggbb` string to OKLCH, the inverse of `oklchToHex`.
 *
 * **Without this the package can write a colour and not read one.** Everything
 * here derives a palette from an OKLCH brand, and the only thing that ever
 * hands it one is code that already thinks in OKLCH: a person picking a colour,
 * or any control that returns one, produces hex. `deriveTheme` could not be
 * given the output of a colour picker, which is the one input it was built to
 * take.
 *
 * **Hex is the fixed point, not OKLCH.** `hexToOklch(oklchToHex(c))` returns
 * `c` only when `c` can be rendered: `oklchToHex` clips, so a colour outside
 * the sRGB gamut comes back as the colour that can be shown instead. Measured
 * on an out of gamut blue, chroma 0.19 at lightness 0.7, which returns at 0.166
 * and 0.689. That is the clipping doing its job and is what `isOutOfGamut`
 * exists to warn about.
 *
 * What does hold exactly is the other direction: `oklchToHex(hexToOklch(h))`
 * is `h` for every hex tested, in gamut or not, which is the property a colour
 * a reader picked actually needs.
 */
export const hexToOklch = (hex: string): Oklch => {
  const raw = hex.trim().replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const byte = (at: number): number => Number.parseInt(full.slice(at, at + 2), 16) / 255

  const r = srgbToLinear(byte(0))
  const g = srgbToLinear(byte(2))
  const b = srgbToLinear(byte(4))

  /* The cube roots of the LMS response, which is where Oklab starts. Coefficients
     are Ottosson's, and are the inverse of the matrix `oklchToLinearRgb` uses. */
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  const hue = (Math.atan2(bb, a) * 180) / Math.PI
  return {
    chroma: Math.hypot(a, bb),
    hue: hue < 0 ? hue + 360 : hue,
    lightness,
  }
}

/**
 * WCAG 2.1 relative luminance. Computed from linear-light values, which we
 * already have, so no round trip through gamma-encoded sRGB is needed.
 */
export const relativeLuminance = (color: Oklch): number => {
  const { b, g, r } = oklchToLinearRgb(color)
  return 0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b)
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export const contrastRatio = (a: Oklch, b: Oklch): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Relative luminance of the color as it will actually ship.
 *
 * **The float is solved and the hex is delivered, and they are not the same
 * color.** `oklchToHex` rounds each channel to a byte, and a byte of rounding
 * moves the luminance: solved in continuous space and measured after rounding,
 * three of the emitted inks came out at 4.4885, 4.4891 and 4.4905 against a
 * target of 4.5. The engine was reporting a figure for a value it does not
 * ship, which is the same fault as any other two derivations of one input with
 * nothing holding them together, arriving here by a rounding mode.
 *
 * Nothing caught it. `check:contrast` measures rendered pixels and would have,
 * but the failing pair is an ink on `surface-sunken`, the hardest of the four
 * and the one no example happened to put it on.
 *
 * The quantisation is `oklchToHex`'s own, byte for byte, so this is what the
 * browser will compute rather than an approximation of it.
 */
export const shippedLuminance = (color: Oklch): number => {
  const { b, g, r } = oklchToLinearRgb(color)
  const quantise = (channel: number): number =>
    srgbToLinear(Math.round(linearToSrgb(channel) * 255) / 255)
  return 0.2126 * quantise(r) + 0.7152 * quantise(g) + 0.0722 * quantise(b)
}

/** WCAG contrast ratio between two colors as they will be written to hex. */
export const shippedContrastRatio = (a: Oklch, b: Oklch): number => {
  const la = shippedLuminance(a)
  const lb = shippedLuminance(b)
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Reduces chroma until the color falls inside the sRGB gamut, preserving
 * lightness and hue.
 *
 * Without this, any seed chroma at an extreme lightness silently produces a
 * clipped color: a near-white surface with a hint of brand tint pushes a
 * channel above 1.0 and gets truncated on the way to hex, which breaks both the
 * intended hue and the contrast that was solved for.
 */
export const fitToGamut = (color: Oklch, steps = 20): Oklch => {
  if (!isOutOfGamut(color)) {
    return color
  }

  let low = 0
  let high = color.chroma

  for (let i = 0; i < steps; i += 1) {
    const mid = (low + high) / 2
    if (isOutOfGamut({ ...color, chroma: mid })) {
      high = mid
    } else {
      low = mid
    }
  }

  return { ...color, chroma: low }
}

/** Searches one side of the background for a passing lightness. */
const searchDirection = (
  sample: Omit<Oklch, 'lightness'>,
  background: Oklch,
  target: number,
  darker: boolean,
  steps: number,
): Oklch => {
  let low = darker ? 0 : background.lightness
  let high = darker ? background.lightness : 1
  let best: Oklch = { ...sample, lightness: darker ? low : high }

  for (let i = 0; i < steps; i += 1) {
    const mid = (low + high) / 2
    const candidate: Oklch = { ...sample, lightness: mid }

    if (shippedContrastRatio(fitToGamut(candidate), background) >= target) {
      best = candidate
      // Contrast grows with distance from the background, so pull back toward
      // it to find the least extreme lightness that still passes.
      if (darker) {
        low = mid
      } else {
        high = mid
      }
    } else if (darker) {
      high = mid
    } else {
      low = mid
    }
  }

  return best
}

/**
 * Finds the lightness at which `sample` hits `target` contrast against
 * `background`.
 *
 * This is the function the whole theming product rests on. It is what lets a
 * user pick a brand color and receive a palette whose every foreground and
 * background pair is accessible **by construction**, rather than generated and
 * then audited.
 *
 * **Both directions are tried unless one is pinned.** Whether light or dark
 * text works better on a given surface is not knowable from the background's
 * luminance alone: a mid-tone brand color often fails white text and passes
 * black, and a luminance-threshold heuristic picks wrong exactly there. When
 * both sides pass, the least extreme result wins.
 *
 * Returns the closest achievable lightness when the target is unreachable at
 * the sample's chroma, so callers should verify with `contrastRatio` rather
 * than assume success.
 */
export const lightnessForContrast = (
  sample: Omit<Oklch, 'lightness'>,
  background: Oklch,
  target: number,
  options: { darker?: boolean; steps?: number } = {},
): Oklch => {
  const { darker, steps = 24 } = options

  if (darker !== undefined) {
    return searchDirection(sample, background, target, darker, steps)
  }

  const dark = searchDirection(sample, background, target, true, steps)
  const light = searchDirection(sample, background, target, false, steps)
  const darkRatio = contrastRatio(fitToGamut(dark), background)
  const lightRatio = contrastRatio(fitToGamut(light), background)
  const darkPasses = darkRatio >= target
  const lightPasses = lightRatio >= target

  if (darkPasses && lightPasses) {
    return darkRatio <= lightRatio ? dark : light
  }
  if (darkPasses) {
    return dark
  }
  if (lightPasses) {
    return light
  }
  // Neither side reaches the target. Return the better attempt so the caller
  // can report it as a violation rather than shipping it unnoticed.
  return darkRatio >= lightRatio ? dark : light
}
