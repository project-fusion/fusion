/** `color-mix()`, in OKLab or in sRGB. */

/**
 * `percent` of `first` mixed with `second` in OKLab, or in sRGB's encoded
 * channels where `space` says so, as `color-mix()` does.
 */
export const mix = (first: string, percent: number, second: string, space?: 'srgb'): string => {
  const a = parse(first)
  const b = parse(second)
  const weight = percent / 100
  /* Mixing with `transparent` keeps the other color and scales its alpha,
     because a transparent color's components are powerless. */
  if (b === undefined || a === undefined) {
    return first
  }
  const alpha = a[3] * weight + b[3] * (1 - weight)
  if (alpha === 0) {
    return 'transparent'
  }
  const encoded = space === 'srgb'
  const left = encoded ? a : oklab(a)
  const right = encoded ? b : oklab(b)
  const blended = [0, 1, 2].map(
    (index) =>
      ((left[index] ?? 0) * a[3] * weight + (right[index] ?? 0) * b[3] * (1 - weight)) / alpha,
  ) as [number, number, number]
  const [red, green, blue] = encoded
    ? (blended.map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255)) as [
        number,
        number,
        number,
      ])
    : srgb(blended)
  return `rgba(${red}, ${green}, ${blue}, ${Math.round(alpha * 1000) / 1000})`
}

type Rgba = [number, number, number, number]

/** `rgb()` or `rgba()` with commas, as channels from 0 to 1. */
const parseRgb = (value: string): Rgba | undefined => {
  const channels = /^rgba?\(([^)]*)\)$/.exec(value)?.[1]?.split(',').map(Number)
  if (channels === undefined || channels.length < 3 || channels.some(Number.isNaN)) {
    return undefined
  }
  const [red = 0, green = 0, blue = 0, alpha = 1] = channels
  return [red / 255, green / 255, blue / 255, alpha]
}

/** `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, or `transparent`, as channels from 0 to 1. */
const parse = (color: string): Rgba | undefined => {
  const value = color.trim().toLowerCase()
  if (value === 'transparent') {
    return [0, 0, 0, 0]
  }
  if (value.startsWith('rgb')) {
    return parseRgb(value)
  }
  const hex = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/.exec(value)?.[1]
  if (hex === undefined) {
    return undefined
  }
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
  const channel = (index: number) => Number.parseInt(full.slice(index, index + 2), 16) / 255
  return [channel(0), channel(2), channel(4), full.length === 8 ? channel(6) : 1]
}

const linear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const gamma = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

/** sRGB to OKLab, after Björn Ottosson's reference. */
const oklab = ([red, green, blue]: Rgba): [number, number, number] => {
  const r = linear(red)
  const g = linear(green)
  const b = linear(blue)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** OKLab to sRGB channels from 0 to 255. */
const srgb = ([lightness, a, b]: [number, number, number]): [number, number, number] => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return channels.map((channel) => Math.round(Math.min(1, Math.max(0, gamma(channel))) * 255)) as [
    number,
    number,
    number,
  ]
}

/**
 * `written` with its OKLCH lightness moved by `step`, its chroma and hue kept,
 * as `oklch(from <written> calc(l + <step>) c h)` draws it. In OKLab a change of
 * lightness leaves the other two axes where they stand. Undefined where it is
 * not a color.
 */
export const movedLightness = (written: string, step: number): string | undefined => {
  const color = parse(written)
  if (color === undefined) {
    return undefined
  }
  const [lightness, a, b] = oklab(color)
  const [red, green, blue] = srgb([Math.min(1, Math.max(0, lightness + step)), a, b])
  return `rgba(${red}, ${green}, ${blue}, ${color[3]})`
}

/** What a written color's `var()` reads, by its name without the two dashes. */
type ReadVariable = (name: string) => unknown

/** A function's arguments: the commas at its own depth divide them. */
const argumentsOf = (inside: string): readonly string[] => {
  const all: string[] = []
  let depth = 0
  let current = ''
  for (const character of inside) {
    depth += character === '(' ? 1 : character === ')' ? -1 : 0
    if (character === ',' && depth === 0) {
      all.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  return [...all, current.trim()]
}

/** One side of a written mix: its color, and its share where the side writes one. */
const sideOf = (written: string): { readonly color: string; readonly share?: number } => {
  const share = /\s(\d+(?:\.\d+)?)%$/.exec(written)
  return share?.[1] === undefined
    ? { color: written }
    : { color: written.slice(0, share.index).trim(), share: Number(share[1]) }
}

/** The share of the first color: what the sides write, scaled to 100 as CSS scales it. */
const shareOf = (first: number | undefined, second: number | undefined): number => {
  if (first !== undefined && second !== undefined) {
    return first + second === 0 ? 50 : (first / (first + second)) * 100
  }
  return first ?? (second === undefined ? 50 : 100 - second)
}

/**
 * A color as a `style` writes it, with each `var()` read and each `color-mix()`
 * in OKLab or sRGB worked out, as CSS does on the element. It returns
 * `undefined` for a variable that reads nothing or a mix in another space.
 */
export const writtenColor = (written: string, read: ReadVariable): string | undefined => {
  const value = written.trim()
  const variable = /^var\(\s*--([\w-]+)\s*(?:,(.*))?\)$/s.exec(value)
  if (variable?.[1] !== undefined) {
    const set = read(variable[1])
    if (typeof set === 'string') {
      return writtenColor(set, read)
    }
    return variable[2] === undefined ? undefined : writtenColor(variable[2], read)
  }
  const inside = /^color-mix\((.*)\)$/is.exec(value)?.[1]
  if (inside === undefined) {
    return value
  }
  const [space, one, two] = argumentsOf(inside)
  const named = /^in\s+(oklab|srgb)$/i.exec(space ?? '')?.[1]?.toLowerCase()
  if (named === undefined || one === undefined || two === undefined) {
    return undefined
  }
  const first = sideOf(one)
  const second = sideOf(two)
  const left = writtenColor(first.color, read)
  const right = writtenColor(second.color, read)
  if (left === undefined || right === undefined) {
    return undefined
  }
  return mix(left, shareOf(first.share, second.share), right, named === 'srgb' ? 'srgb' : undefined)
}
