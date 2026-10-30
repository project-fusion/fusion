/**
 * A color picker's arithmetic, which the web's Color Picker and a phone's
 * color machine both read: the numbers a color is written with, where a point
 * on the square or the ring lands, where each key takes the square, the
 * syntaxes the toggle walks, and the wedges a phone draws its hue ring from.
 */

import type { Color, ColorFormat } from '../css-color/css-color.js'
import { parseColor } from '../css-color/css-color.js'
import { splitValues } from '../split-values/split-values.js'

export type { ColorWords } from '../color-name/color-name.js'
export { colorName, hueName } from '../color-name/color-name.js'
export type { Color, ColorFormat } from '../css-color/css-color.js'
export { formatColor, parseColor, toCss, toRgb } from '../css-color/css-color.js'
export type { ChannelField, ChannelName } from './channels.js'
export { channelFields, writeChannel } from './channels.js'
export type { WheelBox } from './wheel.js'
export { areaAt, hueAt } from './wheel.js'

/**
 * The formats the toggle walks through, in the order it walks them: the CSS
 * syntaxes. `hsb` is not CSS, so it is reached by `format` alone, and the
 * toggle walks on from it to hex.
 */
export const COLOR_FORMATS: readonly ColorFormat[] = ['hex', 'rgb', 'hsl', 'oklch']

/** The syntax the toggle walks on to from `format`. */
export const nextColorFormat = (format: ColorFormat | undefined): ColorFormat =>
  COLOR_FORMATS[(COLOR_FORMATS.indexOf(format ?? 'hex') + 1) % COLOR_FORMATS.length] ?? 'hex'

/**
 * Where a picker starts when there is nothing to start from.
 *
 * Black is what `<input type="color">` opens on, and black is `brightness: 0`:
 * from there the hue ramp moves nothing and the square is one flat color. Pure
 * red is the nearest color where everything answers the first thing touched.
 */
export const COLOR_START: Color = { alpha: 100, brightness: 100, hue: 0, saturation: 100 }

/**
 * The presets, as written, with anything that is not a color dropped.
 *
 * Split on the commas between colors and never inside one, so
 * `rgba(34,197,94,.5)` stays one swatch.
 */
export const colorPresets = (swatches: string): string[] =>
  splitValues(swatches, ',').filter((one) => parseColor(one) !== null)

/** What a key pressed on the square asks of it, and what turns it. */
export interface AreaKey {
  readonly key: string
  readonly rtl: boolean
  readonly shift: boolean
}

/**
 * Where a key takes the square, both axes from either of its inputs, or
 * `undefined` for a key that moves nothing: the vertical keys move brightness
 * and the horizontal keys move saturation, turned on a right-to-left page as
 * the pointer is, which is what React Aria's ColorArea does. Shift makes an
 * arrow a step of ten, and Home and End are saturation's steps of ten, as
 * PageUp and PageDown are brightness's.
 */
export const areaKeyed = (
  color: Color,
  { key, rtl, shift }: AreaKey,
): Partial<Color> | undefined => {
  const along = rtl ? -1 : 1
  const held = (at: number): number => Math.min(100, Math.max(0, at))
  const step = shift ? 10 : 1
  const moves: Record<string, Partial<Color>> = {
    ArrowDown: { brightness: held(color.brightness - step) },
    ArrowLeft: { saturation: held(color.saturation - along * step) },
    ArrowRight: { saturation: held(color.saturation + along * step) },
    ArrowUp: { brightness: held(color.brightness + step) },
    End: { saturation: held(color.saturation + along * 10) },
    Home: { saturation: held(color.saturation - along * 10) },
    PageDown: { brightness: held(color.brightness - 10) },
    PageUp: { brightness: held(color.brightness + 10) },
  }
  return moves[key]
}

/**
 * The preset a key moves to in the row of `last + 1`, from `from`, or
 * `undefined` for a key that moves nothing: the arrows follow the line of text,
 * Up and Down are the previous and the next since the row wraps, focus stops at
 * the ends, and Home and End go to them.
 */
export const swatchKeyed = (
  key: string,
  from: number,
  last: number,
  rtl: boolean,
): number | undefined => {
  const next = Math.min(last, from + 1)
  const previous = Math.max(0, from - 1)
  const moves: Record<string, number> = {
    ArrowDown: next,
    ArrowLeft: rtl ? next : previous,
    ArrowRight: rtl ? previous : next,
    ArrowUp: previous,
    End: last,
    Home: 0,
  }
  return moves[key]
}

/** How many wedges a phone draws its hue ring from. */
export const WHEEL_SLICES = 120

/** One wedge of a hue ring: its outline, in a box 100 units square, and its hue. */
export interface WheelSlice {
  readonly d: string
  readonly hue: number
}

/** A number written to two places, which is finer than a point on a ring this size. */
const placed = (value: number): string => String(Math.round(value * 100) / 100)

/** Where a radius at `degrees` clockwise from the top ends, in a box 100 units square. */
const onRing = (degrees: number, radius: number): string => {
  const radians = (degrees * Math.PI) / 180
  return `${placed(50 + radius * Math.sin(radians))} ${placed(50 - radius * Math.cos(radians))}`
}

/**
 * The wedges of a hue ring, for a platform with no conic gradient: `count`
 * flat bands of hue, clockwise from the top as the web's conic gradient runs.
 * `band` is the ring's width as a share of its radius. Each wedge runs a little
 * past the next, so no seam shows between two of them.
 */
export const wheelSlices = (band: number, count = WHEEL_SLICES): readonly WheelSlice[] => {
  const outer = 50
  const inner = 50 * (1 - Math.min(1, Math.max(0, band)))
  const span = 360 / count
  return Array.from({ length: count }, (_, at) => {
    const from = at * span
    const to = from + span + 0.4
    return {
      d: `M${onRing(from, outer)}A${outer} ${outer} 0 0 1 ${onRing(to, outer)}L${onRing(to, inner)}A${placed(inner)} ${placed(inner)} 0 0 0 ${onRing(from, inner)}Z`,
      hue: from + span / 2,
    }
  })
}

/**
 * Where a hue's mark stands on a ring, as shares of its box from the left and
 * from the top, in the middle of the band.
 */
export const wheelMark = (
  hue: number,
  band: number,
): { readonly x: number; readonly y: number } => {
  const radius = 0.5 * (1 - band / 2)
  const radians = (hue * Math.PI) / 180
  return { x: 0.5 + radius * Math.sin(radians), y: 0.5 - radius * Math.cos(radians) }
}

/**
 * Where a square's mark stands along one length, in points: a share of it,
 * held half a mark in from each end, the travel a native range gives its thumb.
 */
export const markAlong = (share: number, length: number, mark: number): number =>
  Math.min(length - mark / 2, Math.max(mark / 2, share * length))
