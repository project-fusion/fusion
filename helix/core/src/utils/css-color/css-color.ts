/**
 * Reading and writing the color syntaxes a field is allowed to hold.
 *
 * **The working model is HSB**, hue and saturation and brightness, because that
 * is what the panel is: a square of saturation against brightness with a hue
 * ramp beside it. HSL would put the square's corners somewhere a reader does not
 * expect, since full saturation in HSL is a mid-lightness band rather than a
 * corner.
 *
 * **Every syntax here is read; three are written.** A field that refuses
 * `rgb(255 0 0)` because it prefers hex is a field arguing with the person using
 * it, so the space-separated forms, the comma forms, `rgba` and `hsla` are all
 * taken. What is written back is whichever of hex, rgb or hsl the component is
 * set to, so a value stays in the shape the consumer asked for however it was
 * entered.
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

/** A color as the panel holds it. Alpha and the two percentages are 0 to 100. */
export interface Color {
  alpha: number
  brightness: number
  hue: number
  saturation: number
}

/** The syntaxes a value can be written in. */
export type ColorFormat = 'hex' | 'hsl' | 'rgb'

/** Keeps a number inside a range, since every channel here has one. */
const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value))

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
const toRgb = (color: Color): { blue: number; green: number; red: number } => {
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
const toHsl = (color: Color): { hue: number; lightness: number; saturation: number } => {
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
  const call = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(text)
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

  const hue = Number.parseFloat(first)
  const saturation = clamp(Number.parseFloat(second), 0, 100) / 100
  const lightness = clamp(Number.parseFloat(third), 0, 100) / 100
  if (Number.isNaN(hue) || Number.isNaN(saturation) || Number.isNaN(lightness)) {
    return null
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
