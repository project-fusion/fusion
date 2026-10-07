import { type Color, type ColorFormat, clamp, toHsl, toOklch, toRgb } from '@fusion.dev/helix-core'

/** One number a color is written with, in the syntax the picker writes. */
export type ChannelName =
  | 'alpha'
  | 'blue'
  | 'brightness'
  | 'chroma'
  | 'green'
  | 'hue'
  | 'lightness'
  | 'red'
  | 'saturation'

/** A channel as a field shows it: its number, the range it may take, and its step. */
export interface ChannelField {
  channel: ChannelName
  max: number
  min: number
  step: number
  value: number
}

/** A number on its step, written to the step's decimals. */
const onStep = (value: number, step: number): number => {
  const decimals = String(step).split('.')[1]?.length ?? 0
  return Number((Math.round(value / step) * step).toFixed(decimals))
}

/** The function names each format is written with. */
const FAMILY: Record<ColorFormat, RegExp> = {
  hex: /^rgba?$/,
  hsb: /^hsba?$/,
  hsl: /^hsla?$/,
  oklch: /^oklch$/,
  rgb: /^rgba?$/,
}

/** The steps of an `oklch()` field: lightness in tenths of a percent, chroma in thousandths, hue in tenths of a degree. */
const OKLCH_STEPS = [0.1, 0.001, 0.1] as const

/** An opacity token, `0.5` or `50%`, as a percentage. */
const percent = (token: string | undefined): number => {
  if (token === undefined) {
    return 100
  }
  const number = Number.parseFloat(token)
  return Number.isNaN(number) ? 100 : clamp(token.includes('%') ? number : number * 100, 0, 100)
}

/**
 * The numbers a value is written with, read off the text itself where it is in
 * the syntax `format` writes, or `null` where it is not.
 *
 * **Off the text and not off the working model.** The panel holds a color as
 * hue, saturation and brightness in whole numbers, and bytes do not survive the
 * trip through it: green set to 200 came back as 199 with red moved from 51 to
 * 53, and an arrow key on a field stepped to a number that rounded back to where
 * it was, so the field could not be moved at all. The value is what was
 * written, so it holds the exact numbers.
 */
const readWritten = (value: string, format: ColorFormat): number[] | null => {
  const text = value.trim().toLowerCase()
  if (
    (format === 'hex' || format === 'rgb') &&
    /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(text)
  ) {
    const digits = text.slice(1)
    const width = digits.length <= 4 ? 1 : 2
    const byte = (index: number): number => {
      const piece = digits.slice(index * width, index * width + width)
      return Number.parseInt(width === 1 ? piece + piece : piece, 16)
    }
    const count = digits.length / width
    return [byte(0), byte(1), byte(2), count === 4 ? Math.round((byte(3) / 255) * 100) : 100]
  }
  const call = /^(rgba?|hsla?|hsba?|oklch)\(([^)]*)\)$/.exec(text)
  if (!call?.[1] || call[2] === undefined || !FAMILY[format].test(call[1])) {
    return null
  }
  const [first, second, third, fourth] = call[2].replace(/[,/]/g, ' ').split(/\s+/).filter(Boolean)
  const numbers = [first, second, third].map((one) =>
    one === 'none' ? 0 : Number.parseFloat(one ?? ''),
  )
  if (numbers.some(Number.isNaN)) {
    return null
  }
  if (format === 'oklch') {
    /* Lightness as a percentage and chroma as a number, whichever unit each
       was written in: `0.63` is `63%`, and a chroma of `65%` is 0.26. */
    const [lightness = 0, chroma = 0, hue = 0] = numbers
    return [
      onStep(first?.endsWith('%') ? lightness : lightness * 100, OKLCH_STEPS[0]),
      onStep(second?.endsWith('%') ? (chroma / 100) * 0.4 : chroma, OKLCH_STEPS[1]),
      onStep(hue, OKLCH_STEPS[2]),
      Math.round(percent(fourth)),
    ]
  }
  return [...numbers, percent(fourth)].map((one) => Math.round(one))
}

/**
 * The numbers a color is written with in `format`, for a field each, as React
 * Aria's ColorField takes a `channel`: red, green and blue for hex and rgb,
 * hue, saturation and lightness for hsl, hue, saturation and brightness for
 * hsb, lightness, chroma and hue for oklch, and the opacity where the picker
 * carries one.
 *
 * Hex is written as bytes, so its fields are the bytes: a field of two hex
 * digits would ask a reader to count in base sixteen.
 */
export const channelFields = (
  value: string,
  color: Color,
  format: ColorFormat,
  alpha: boolean,
): ChannelField[] => {
  const written = readWritten(value, format)
  const fromModel = (): number[] => {
    if (format === 'hsb') {
      return [
        Math.round(color.hue),
        Math.round(color.saturation),
        Math.round(color.brightness),
        Math.round(color.alpha),
      ]
    }
    if (format === 'oklch') {
      const { chroma, hue, lightness } = toOklch(color)
      return [
        onStep(lightness * 100, OKLCH_STEPS[0]),
        onStep(chroma, OKLCH_STEPS[1]),
        onStep(hue, OKLCH_STEPS[2]),
        Math.round(color.alpha),
      ]
    }
    if (format === 'hsl') {
      const { hue, lightness, saturation } = toHsl(color)
      return [Math.round(hue), saturation, lightness, Math.round(color.alpha)]
    }
    const { blue, green, red } = toRgb(color)
    return [red, green, blue, Math.round(color.alpha)]
  }
  const [one = 0, two = 0, three = 0, four = 100] = written ?? fromModel()
  const byFormat: Record<ColorFormat, ChannelField[]> = {
    hex: [],
    hsb: [
      { channel: 'hue', max: 360, min: 0, step: 1, value: one },
      { channel: 'saturation', max: 100, min: 0, step: 1, value: two },
      { channel: 'brightness', max: 100, min: 0, step: 1, value: three },
    ],
    hsl: [
      { channel: 'hue', max: 360, min: 0, step: 1, value: one },
      { channel: 'saturation', max: 100, min: 0, step: 1, value: two },
      { channel: 'lightness', max: 100, min: 0, step: 1, value: three },
    ],
    oklch: [
      { channel: 'lightness', max: 100, min: 0, step: OKLCH_STEPS[0], value: one },
      { channel: 'chroma', max: 0.4, min: 0, step: OKLCH_STEPS[1], value: two },
      { channel: 'hue', max: 360, min: 0, step: OKLCH_STEPS[2], value: three },
    ],
    rgb: [],
  }
  const bytes: ChannelField[] = [
    { channel: 'red', max: 255, min: 0, step: 1, value: one },
    { channel: 'green', max: 255, min: 0, step: 1, value: two },
    { channel: 'blue', max: 255, min: 0, step: 1, value: three },
  ]
  const fields = byFormat[format].length > 0 ? byFormat[format] : bytes
  return alpha ? [...fields, { channel: 'alpha', max: 100, min: 0, step: 1, value: four }] : fields
}

/**
 * The value with one channel set, kept inside the channel's range and written
 * in `format` the way the picker writes every value: the comma form, and the
 * opacity only with `alpha`. `null` where the number is no number.
 */
export const writeChannel = (
  fields: readonly ChannelField[],
  format: ColorFormat,
  alpha: boolean,
  channel: ChannelName,
  value: number,
): string | null => {
  if (Number.isNaN(value)) {
    return null
  }
  const numbers = new Map(fields.map((field) => [field.channel, field.value]))
  const field = fields.find((one) => one.channel === channel)
  if (field === undefined) {
    return null
  }
  numbers.set(channel, clamp(onStep(value, field.step), field.min, field.max))
  const get = (name: ChannelName, fallback = 0): number => numbers.get(name) ?? fallback
  const opacity = get('alpha', 100)
  const fraction = Number((opacity / 100).toFixed(2))
  if (format === 'hsl') {
    const body = `${get('hue')}, ${get('saturation')}%, ${get('lightness')}%`
    return alpha ? `hsla(${body}, ${fraction})` : `hsl(${body})`
  }
  if (format === 'hsb') {
    const body = `${get('hue')}, ${get('saturation')}%, ${get('brightness')}%`
    return alpha ? `hsba(${body}, ${fraction})` : `hsb(${body})`
  }
  if (format === 'oklch') {
    const body = `${get('lightness')}% ${get('chroma')} ${get('hue')}`
    return alpha ? `oklch(${body} / ${fraction})` : `oklch(${body})`
  }
  if (format === 'rgb') {
    const body = `${get('red')}, ${get('green')}, ${get('blue')}`
    return alpha ? `rgba(${body}, ${fraction})` : `rgb(${body})`
  }
  const byte = (one: number): string => one.toString(16).padStart(2, '0')
  const hex = `#${byte(get('red'))}${byte(get('green'))}${byte(get('blue'))}`
  return alpha ? hex + byte(Math.round((opacity / 100) * 255)) : hex
}
