/** A color as three channels from 0 to 1, and its opacity. */
export interface Rgb {
  alpha: number
  blue: number
  green: number
  red: number
}

/**
 * A color written as `#rgb`, `#rrggbb`, `rgb()` or `rgba()`, or nothing.
 *
 * **Only the forms a map style can be handed.** What a page's tokens resolve
 * to, `oklch()` and `color-mix()` among them, is turned into one of these by
 * `mapColorsFrom` before it arrives, and a theme derived by `helix-theme` is
 * already hex.
 */
export const parseColor = (value: string): Rgb | undefined => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1]
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((one) => one + one).join('') : hex
    const channel = (at: number): number => Number.parseInt(full.slice(at, at + 2), 16) / 255
    return { alpha: 1, blue: channel(4), green: channel(2), red: channel(0) }
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(
    value.trim(),
  )
  if (!rgb) {
    return undefined
  }
  const [, red = '0', green = '0', blue = '0', alpha] = rgb
  const opacity =
    alpha === undefined
      ? 1
      : alpha.endsWith('%')
        ? Number.parseFloat(alpha) / 100
        : Number.parseFloat(alpha)
  return {
    alpha: opacity,
    blue: Number.parseFloat(blue) / 255,
    green: Number.parseFloat(green) / 255,
    red: Number.parseFloat(red) / 255,
  }
}

const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const gamma = (channel: number): number =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

/** sRGB to OKLab, which is where a mix looks like the halfway it claims to be. */
const toOklab = ({ blue, green, red }: Rgb): [number, number, number] => {
  const [r, g, b] = [linear(red), linear(green), linear(blue)]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const fromOklab = ([lightness, a, b]: [number, number, number], alpha: number): Rgb => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (channel: number): number => Math.min(1, Math.max(0, gamma(channel)))
  return {
    alpha,
    blue: clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    green: clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    red: clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
  }
}

/**
 * `amount` of the way from one color to another, in OKLab, the way CSS's own
 * `color-mix(in oklab, ...)` goes: a tenth of the way from the land to the ink
 * reads as a tenth darker on a light theme and a tenth lighter on a dark one.
 */
export const mix = (from: Rgb, to: Rgb, amount: number): Rgb => {
  const a = toOklab(from)
  const b = toOklab(to)
  return fromOklab(
    [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount],
    from.alpha + (to.alpha - from.alpha) * amount,
  )
}

/**
 * A color of the same lightness and colorfulness as `like`, at another hue,
 * in degrees round OKLCH's wheel: how a set of kinds can each keep a hue of
 * their own and still sit in one theme, light or dark. `least` is the
 * colorfulness it takes at the least, so a gray brand still gives hues.
 */
export const rehue = (like: Rgb, hue: number, least = 0.1): Rgb => {
  const [lightness, a, b] = toOklab(like)
  const chroma = Math.max(Math.hypot(a, b), least)
  const angle = (hue * Math.PI) / 180
  return fromOklab([lightness, chroma * Math.cos(angle), chroma * Math.sin(angle)], like.alpha)
}

/** A color from its OKLCH lightness, colorfulness, and hue in degrees. */
export const oklch = (lightness: number, chroma: number, hue: number): Rgb => {
  const angle = (hue * Math.PI) / 180
  return fromOklab([lightness, chroma * Math.cos(angle), chroma * Math.sin(angle)], 1)
}

/** A color as the `rgb()` or `rgba()` a map style takes. */
export const cssColor = ({ alpha, blue, green, red }: Rgb): string => {
  const [r, g, b] = [red, green, blue].map((channel) => Math.round(channel * 255))
  return alpha >= 1
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`
}

/** How bright a color is to the eye, as WCAG measures it. Its opacity is not counted. */
const luminance = ({ blue, green, red }: Rgb): number =>
  0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)

/** The WCAG contrast ratio between two colors, from 1 to 21. */
export const contrast = (one: Rgb, other: Rgb): number => {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}
