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

    if (contrastRatio(fitToGamut(candidate), background) >= target) {
      best = candidate
      // Contrast grows as we move away from the background, so pull back toward
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
