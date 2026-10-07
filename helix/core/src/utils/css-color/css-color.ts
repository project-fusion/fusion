/**
 * Reading and writing the color syntaxes a field is allowed to hold.
 *
 * **The working model is HSB**, hue and saturation and brightness, because that
 * is what the panel is: a square of saturation against brightness with a hue
 * ramp beside it. HSL would put the square's corners somewhere a reader does not
 * expect, since full saturation in HSL is a mid-lightness band rather than a
 * corner.
 *
 * **Every syntax here is read and written.** A field that refuses
 * `rgb(255 0 0)` because it prefers hex is a field arguing with the person using
 * it, so the space-separated forms, the comma forms, `rgba`, `hsla`, `hsba` and
 * `oklch` are all taken. What is written back is whichever of hex, rgb, hsl,
 * hsb or oklch the component is set to, so a value stays in the shape the
 * consumer asked for however it was entered.
 *
 * **`oklch` is read into sRGB.** The working model is sRGB, so a color outside
 * it, such as a display-P3 green written in `oklch`, is clipped to the nearest
 * sRGB channel values. What is written in `oklch` is that sRGB color, exactly.
 *
 * `hsb()` is not CSS. It is the working model written out, as React Aria's and
 * Zag's color strings write it, for a value handed to code that thinks in hue,
 * saturation and brightness. A stylesheet wants one of the other three.
 *
 * **What is written is the comma form.** Both are valid, and the commas are what
 * a reader recognizes, what most code around them holds, and what pastes into
 * anything without a second thought. A syntax a value is handed *out* in is not
 * the place to be early. `rgba` and `hsla` come with them, since a comma form
 * with a fourth argument is spelled that way.
 *
 * **Core's rather than a field's, because the CSS color grammar is the
 * platform's.** Nothing here needs a color picker to make sense, and two
 * families read it already. It is arithmetic with no DOM in it, so it runs on a
 * server, which is also why named colors are refused below: resolving
 * `rebeccapurple` means asking a browser that is not there.
 *
 * **One decision in here is a default rather than a capability.** What
 * `formatColor` writes back, the comma form and an alpha only where one was
 * asked for, is a choice about what a value looks like when it is handed out.
 * It is core's choice now instead of the picker's, and a caller wanting another
 * shape formats it itself.
 */

import { clamp } from '../clamp/clamp.js'

/** A color as the panel holds it. Alpha and the two percentages are 0 to 100. */
export interface Color {
  alpha: number
  brightness: number
  hue: number
  saturation: number
}

/** The syntaxes a value can be written in. */
export type ColorFormat = 'hex' | 'hsb' | 'hsl' | 'oklch' | 'rgb'

/** `50%` and `0.5` mean the same thing wherever an alpha is accepted. */
const toAlpha = (token: string | undefined): number => {
  if (token === undefined) {
    return 100
  }
  const number = Number.parseFloat(token)
  if (Number.isNaN(number)) {
    return 100
  }
  return clamp(token.includes('%') ? number : number * 100, 0, 100)
}

/** A channel written either as `255` or as `100%`. */
const toByte = (token: string): number => {
  const number = Number.parseFloat(token)
  return clamp(token.includes('%') ? (number / 100) * 255 : number, 0, 255)
}

const rgbToHsb = (red: number, green: number, blue: number, alpha: number): Color => {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const high = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  const span = high - low
  let hue = 0
  if (span !== 0) {
    if (high === r) {
      hue = (g - b) / span + (g < b ? 6 : 0)
    } else if (high === g) {
      hue = (b - r) / span + 2
    } else {
      hue = (r - g) / span + 4
    }
    hue *= 60
  }
  return {
    alpha,
    brightness: Math.round(high * 100),
    hue: Math.round(hue),
    saturation: Math.round(high === 0 ? 0 : (span / high) * 100),
  }
}

/** HSB to bytes, which is the road every written syntax goes down. */
export const toRgb = (color: Color): { blue: number; green: number; red: number } => {
  const hue = (((color.hue % 360) + 360) % 360) / 60
  const saturation = color.saturation / 100
  const brightness = color.brightness / 100
  const chroma = brightness * saturation
  const middle = chroma * (1 - Math.abs((hue % 2) - 1))
  const base = brightness - chroma
  const sextants: [number, number, number][] = [
    [chroma, middle, 0],
    [middle, chroma, 0],
    [0, chroma, middle],
    [0, middle, chroma],
    [middle, 0, chroma],
    [chroma, 0, middle],
  ]
  const [red, green, blue] = sextants[Math.floor(hue) % 6] ?? [0, 0, 0]
  return {
    blue: Math.round((blue + base) * 255),
    green: Math.round((green + base) * 255),
    red: Math.round((red + base) * 255),
  }
}

/** HSB to HSL, which is a different pair of numbers for the same color. */
export const toHsl = (color: Color): { hue: number; lightness: number; saturation: number } => {
  const saturation = color.saturation / 100
  const brightness = color.brightness / 100
  const lightness = (brightness * (2 - saturation)) / 2
  return {
    hue: ((color.hue % 360) + 360) % 360,
    lightness: Math.round(lightness * 100),
    saturation: Math.round(
      (lightness === 0 || lightness === 1
        ? 0
        : (brightness - lightness) / Math.min(lightness, 1 - lightness)) * 100,
    ),
  }
}

/** One sRGB channel, 0 to 1, to linear light. */
const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

/** Linear light back to an sRGB channel, 0 to 1. */
const gamma = (channel: number): number =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

/**
 * Bytes to OKLCH: lightness 0 to 1, chroma from 0, hue in degrees. Björn
 * Ottosson's OKLab matrices, as CSS Color 4 defines `oklch()`.
 */
export const toOklch = (color: Color): { chroma: number; hue: number; lightness: number } => {
  const { blue, green, red } = toRgb(color)
  const [r, g, b] = [red, green, blue].map((one) => linear(one / 255)) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const chroma = Math.hypot(a, bb)
  const hue = chroma < 0.0001 ? 0 : ((((Math.atan2(bb, a) * 180) / Math.PI) % 360) + 360) % 360
  return { chroma, hue, lightness }
}

/** OKLCH to bytes, each channel clipped into sRGB. */
const oklchToRgb = (lightness: number, chroma: number, hue: number): [number, number, number] => {
  const angle = (hue * Math.PI) / 180
  const a = chroma * Math.cos(angle)
  const b = chroma * Math.sin(angle)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((one) => Math.round(clamp(gamma(clamp(one, 0, 1)), 0, 1) * 255)) as [number, number, number]
}

/**
 * The three numbers of an `oklch()`, each in the unit the syntax allows:
 * lightness as `0.63` or `63%`, chroma as `0.26` or a percentage of 0.4, and
 * hue in degrees, with `deg` or without. `none` is zero.
 */
const oklchParts = (first: string, second: string, third: string): [number, number, number] => {
  const number = (token: string): number => (token === 'none' ? 0 : Number.parseFloat(token))
  const lightness = first.endsWith('%') ? number(first) / 100 : number(first)
  const chroma = second.endsWith('%') ? (number(second) / 100) * 0.4 : number(second)
  return [clamp(lightness, 0, 1), Math.max(0, chroma), number(third)]
}

/**
 * Any of the syntaxes to the working model, or `null` where it is not a color.
 *
 * Named colors are not here. Resolving `rebeccapurple` means either shipping
 * the table of a hundred and forty or asking the browser, and the browser is not
 * present on the server: a field that accepted a name client-side and rejected
 * it during a server render would be worse than one that never took it.
 */
export const parseColor = (value: string): Color | null => {
  const text = value.trim().toLowerCase()
  if (text === '') {
    return null
  }

  if (text.startsWith('#')) {
    const digits = text.slice(1)
    const short = digits.length === 3 || digits.length === 4
    const long = digits.length === 6 || digits.length === 8
    if ((!short && !long) || !/^[\da-f]+$/.test(digits)) {
      return null
    }
    const width = short ? 1 : 2
    const channel = (index: number): number => {
      const piece = digits.slice(index * width, index * width + width)
      return Number.parseInt(short ? piece + piece : piece, 16)
    }
    const carriesAlpha = digits.length === 4 || digits.length === 8
    return rgbToHsb(
      channel(0),
      channel(1),
      channel(2),
      carriesAlpha ? Math.round((channel(3) / 255) * 100) : 100,
    )
  }

  /* Commas and the slash both become spaces, which collapses every legal
     spelling into one list: `rgba(255,0,0,0.5)` and `rgb(255 0 0 / 50%)` are the
     same four tokens by the time they are read. */
  const call = /^(rgba?|hsla?|hsba?|oklch)\(([^)]*)\)$/.exec(text)
  if (!call?.[1] || call[2] === undefined) {
    return null
  }
  /* Destructured with a fallback rather than indexed, because an index into an
     array is `string | undefined` here and three of these are read twice. Four
     names cost less than six assertions. */
  const [first = '', second = '', third = '', fourth] = call[2]
    .replace(/[,/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (first === '' || second === '' || third === '') {
    return null
  }
  const alpha = toAlpha(fourth)

  if (call[1].startsWith('rgb')) {
    return rgbToHsb(toByte(first), toByte(second), toByte(third), alpha)
  }

  if (call[1] === 'oklch') {
    const parts = oklchParts(first, second, third)
    if (parts.some(Number.isNaN)) {
      return null
    }
    return rgbToHsb(...oklchToRgb(...parts), alpha)
  }

  const hue = Number.parseFloat(first)
  const saturation = clamp(Number.parseFloat(second), 0, 100) / 100
  const lightness = clamp(Number.parseFloat(third), 0, 100) / 100
  if (Number.isNaN(hue) || Number.isNaN(saturation) || Number.isNaN(lightness)) {
    return null
  }
  /* `hsb` is the working model already, the third number being brightness. */
  if (call[1].startsWith('hsb')) {
    return {
      alpha,
      brightness: Math.round(lightness * 100),
      hue: Math.round(((hue % 360) + 360) % 360),
      saturation: Math.round(saturation * 100),
    }
  }
  // HSL to HSB, the inverse of `toHsl` above.
  const brightness = lightness + saturation * Math.min(lightness, 1 - lightness)
  return {
    alpha,
    brightness: Math.round(brightness * 100),
    hue: Math.round(((hue % 360) + 360) % 360),
    saturation: Math.round((brightness === 0 ? 0 : 2 * (1 - lightness / brightness)) * 100),
  }
}

/**
 * The working model back out, in the syntax asked for.
 *
 * The alpha is written only where the component carries one. A consumer who did
 * not ask for transparency should not have to strip `ff` off every hex or read
 * past a fourth argument they never wanted.
 */
export const formatColor = (color: Color, format: ColorFormat, withAlpha: boolean): string => {
  const alpha = clamp(color.alpha, 0, 100) / 100
  /* Two decimal places at most, and no trailing zeros: an alpha is a fraction
     here and `0.5` is what a stylesheet holds, not `0.50` and not
     `0.5019607843137255`. */
  const opacity = Number(alpha.toFixed(2))

  if (format === 'oklch') {
    const { chroma, hue, lightness } = toOklch(color)
    const body = `${Number((lightness * 100).toFixed(1))}% ${Number(chroma.toFixed(3))} ${Number(hue.toFixed(1))}`
    return withAlpha ? `oklch(${body} / ${opacity})` : `oklch(${body})`
  }

  if (format === 'hsb') {
    const body = `${Math.round(((color.hue % 360) + 360) % 360)}, ${Math.round(clamp(color.saturation, 0, 100))}%, ${Math.round(clamp(color.brightness, 0, 100))}%`
    return withAlpha ? `hsba(${body}, ${opacity})` : `hsb(${body})`
  }

  if (format === 'hsl') {
    const { hue, lightness, saturation } = toHsl(color)
    const body = `${Math.round(hue)}, ${saturation}%, ${lightness}%`
    return withAlpha ? `hsla(${body}, ${opacity})` : `hsl(${body})`
  }

  const { blue, green, red } = toRgb(color)
  if (format === 'rgb') {
    const body = `${red}, ${green}, ${blue}`
    return withAlpha ? `rgba(${body}, ${opacity})` : `rgb(${body})`
  }

  const byte = (one: number): string => one.toString(16).padStart(2, '0')
  const hex = `#${byte(red)}${byte(green)}${byte(blue)}`
  return withAlpha ? hex + byte(Math.round(alpha * 255)) : hex
}

/** The color as CSS, for the swatches and the tracks. Always with its alpha. */
export const toCss = (color: Color): string => {
  const { blue, green, red } = toRgb(color)
  return `rgb(${red} ${green} ${blue} / ${clamp(color.alpha, 0, 100)}%)`
}
