import { type Color, type ColorFormat, toHsl, toRgb } from '@fusion.dev/helix-core'

/** One number a color is written with, in the syntax the picker writes. */
export type ChannelName = 'alpha' | 'blue' | 'green' | 'hue' | 'lightness' | 'red' | 'saturation'

/** A channel as a field shows it: its number and the range it may take. */
export interface ChannelField {
  channel: ChannelName
  max: number
  min: number
  value: number
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value))

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
  if (format !== 'hsl' && /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(text)) {
    const digits = text.slice(1)
    const width = digits.length <= 4 ? 1 : 2
    const byte = (index: number): number => {
      const piece = digits.slice(index * width, index * width + width)
      return Number.parseInt(width === 1 ? piece + piece : piece, 16)
    }
    const count = digits.length / width
    return [byte(0), byte(1), byte(2), count === 4 ? Math.round((byte(3) / 255) * 100) : 100]
  }
  const call = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(text)
  if (!call?.[1] || call[2] === undefined) {
    return null
  }
  if (call[1].startsWith('hsl') !== (format === 'hsl')) {
    return null
  }
  const [first, second, third, fourth] = call[2].replace(/[,/]/g, ' ').split(/\s+/).filter(Boolean)
  const numbers = [first, second, third].map((one) => Number.parseFloat(one ?? ''))
  if (numbers.some(Number.isNaN)) {
    return null
  }
  return [...numbers, percent(fourth)].map((one) => Math.round(one))
}

/**
 * The numbers a color is written with in `format`, for a field each, as React
 * Aria's ColorField takes a `channel`: red, green and blue for hex and rgb,
 * hue, saturation and lightness for hsl, and the opacity where the picker
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
    if (format === 'hsl') {
      const { hue, lightness, saturation } = toHsl(color)
      return [Math.round(hue), saturation, lightness, Math.round(color.alpha)]
    }
    const { blue, green, red } = toRgb(color)
    return [red, green, blue, Math.round(color.alpha)]
  }
  const [one = 0, two = 0, three = 0, four = 100] = written ?? fromModel()
  const fields: ChannelField[] =
    format === 'hsl'
      ? [
          { channel: 'hue', max: 360, min: 0, value: one },
          { channel: 'saturation', max: 100, min: 0, value: two },
          { channel: 'lightness', max: 100, min: 0, value: three },
        ]
      : [
          { channel: 'red', max: 255, min: 0, value: one },
          { channel: 'green', max: 255, min: 0, value: two },
          { channel: 'blue', max: 255, min: 0, value: three },
        ]
  return alpha ? [...fields, { channel: 'alpha', max: 100, min: 0, value: four }] : fields
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
  numbers.set(channel, clamp(Math.round(value), field.min, field.max))
  const get = (name: ChannelName, fallback = 0): number => numbers.get(name) ?? fallback
  const opacity = get('alpha', 100)
  const fraction = Number((opacity / 100).toFixed(2))
  if (format === 'hsl') {
    const body = `${get('hue')}, ${get('saturation')}%, ${get('lightness')}%`
    return alpha ? `hsla(${body}, ${fraction})` : `hsl(${body})`
  }
  if (format === 'rgb') {
    const body = `${get('red')}, ${get('green')}, ${get('blue')}`
    return alpha ? `rgba(${body}, ${fraction})` : `rgb(${body})`
  }
  const byte = (one: number): string => one.toString(16).padStart(2, '0')
  const hex = `#${byte(get('red'))}${byte(get('green'))}${byte(get('blue'))}`
  return alpha ? hex + byte(Math.round((opacity / 100) * 255)) : hex
}
