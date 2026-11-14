/**
 * A slider's arithmetic: its bounds and step as it works with them, a value
 * held to them as a native range holds it, where a value sits along the
 * track, and the values its marks stand at. The web's Slider does the same
 * sums on its `<input type="range">`, and a phone's range machine does them
 * here.
 */

import { formatNumber } from '../number-format/number-format.js'
import { numberOptions, textOf } from '../number-format/props.js'

/** A slider's bounds and step, each a number. */
export interface SliderBounds {
  readonly max: number
  readonly min: number
  readonly step: number
}

/** A number a prop holds, where it holds one, written or as text. */
const numberIn = (value: unknown): number | undefined => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined
}

/**
 * The bounds and the step a slider works with: 0, 100 and 1 where a prop is
 * no number, as a native range reads `max="1OO"`.
 */
export const sliderBounds = (min: unknown, max: unknown, step: unknown): SliderBounds => ({
  max: numberIn(max) ?? 100,
  min: numberIn(min) ?? 0,
  step: numberIn(step) ?? 1,
})

/** A slider's bounds and step from its props, by the web's names: `min`, `max`, and `step`. */
export const sliderBoundsOf = (props: Readonly<Record<string, unknown>>): SliderBounds =>
  sliderBounds(props.min, props.max, props.step)

/**
 * How many decimals the step is written to, so a value on a fractional step
 * is not float noise: `0.1 + 0.2` is written `0.3`.
 */
export const sliderPrecision = (step: number): number => String(step).split('.')[1]?.length ?? 0

/** A value snapped to the step, counted from `min` as a range counts it. */
export const sliderSnap = (at: number, bounds: SliderBounds): number => {
  if (!(bounds.step > 0)) {
    return at
  }
  const steps = Math.round((at - bounds.min) / bounds.step)
  return Number((bounds.min + steps * bounds.step).toFixed(sliderPrecision(bounds.step)))
}

/** A value pulled into the bounds and onto the step, as a native range holds what it is given. */
export const sliderSettle = (at: number, bounds: SliderBounds): number => {
  const low = Math.min(bounds.min, bounds.max)
  const high = Math.max(bounds.min, bounds.max)
  return Math.min(high, Math.max(low, sliderSnap(Math.min(high, Math.max(low, at)), bounds)))
}

/** The value a slider holds where none is given: the middle of its range, as a native range shows. */
export const sliderMiddle = (bounds: SliderBounds): number =>
  bounds.min + (bounds.max - bounds.min) / 2

/**
 * The value a slider holds from text, as a native range reads its `value`:
 * settled into the bounds and onto the step, and the middle where the text
 * is no number.
 */
export const sliderValue = (text: unknown, bounds: SliderBounds): number =>
  sliderSettle(numberIn(text) ?? sliderMiddle(bounds), bounds)

/** Where a value sits along the track, as a fraction of it, 0 to 1. */
export const sliderFraction = (at: number, bounds: SliderBounds): number => {
  const span = bounds.max - bounds.min
  if (span === 0) {
    return 0
  }
  return Math.min(1, Math.max(0, (at - bounds.min) / span))
}

/** The value a fraction of the track stands for, settled onto the step. */
export const sliderAt = (fraction: number, bounds: SliderBounds): number =>
  sliderSettle(bounds.min + Math.min(1, Math.max(0, fraction)) * (bounds.max - bounds.min), bounds)

/**
 * Where a fill starts and ends along the track, from where the value sits
 * and its `origin`: from the start, the middle, or the end of the track to
 * the value, whichever end is nearer the start first.
 */
export const sliderFill = (fraction: number, origin: unknown): readonly [number, number] => {
  const from = origin === 'center' ? 0.5 : origin === 'end' ? 1 : 0
  return [Math.min(from, fraction), Math.max(from, fraction)]
}

/**
 * The values `count` marks stand at, evenly spaced, ends included, each
 * snapped to a step, so no mark stands where the thumb cannot. Fewer than
 * two marks, or a range with no span, draws none.
 */
export const sliderMarks = (count: unknown, bounds: SliderBounds): readonly number[] => {
  const marks = numberIn(count) ?? 0
  const span = bounds.max - bounds.min
  if (marks < 2 || span <= 0) {
    return []
  }
  const step = bounds.step > 0 ? bounds.step : 1
  const snapped = Array.from({ length: marks }, (_, at) => {
    const raw = bounds.min + (at / (marks - 1)) * span
    const on = Math.min(
      bounds.max,
      Math.max(bounds.min, bounds.min + Math.round((raw - bounds.min) / step) * step),
    )
    return Number(on.toFixed(sliderPrecision(bounds.step)))
  })
  return [...new Set(snapped)]
}

/**
 * A value as a reader sees it: written with `options`, `Intl.NumberFormat`
 * options or the JSON of them, in `locale`, where they are given, and as the
 * number otherwise.
 */
export const sliderSaid = (at: number, options: unknown, locale: unknown): string => {
  const read = numberOptions(options)
  return read === undefined ? String(at) : formatNumber(at, textOf(locale), read)
}

/**
 * What a screen reader says for a value, where anything but the number:
 * `template` with the value as a reader sees it in place of `{value}`, or the
 * value in its format, and `''` where neither asks for words, so the number
 * alone is read.
 */
export const sliderSpoken = (
  at: number,
  options: unknown,
  locale: unknown,
  template: unknown,
): string => {
  const said = sliderSaid(at, options, locale)
  if (typeof template === 'string' && template !== '') {
    return template.replaceAll('{value}', () => said)
  }
  return numberOptions(options) === undefined ? '' : said
}

/**
 * A range's values, one per thumb, in order, each in the bounds on the step. Text
 * that is no list of two numbers or more opens fully wide, as on the web.
 */
export const sliderPoints = (text: unknown, bounds: SliderBounds): readonly number[] => {
  const parts = String(text ?? '')
    .split(',')
    .map((part) => Number.parseFloat(part))
  return parts.length < 2 || parts.some((part) => !Number.isFinite(part))
    ? [bounds.min, bounds.max]
    : parts.map((part) => sliderSettle(part, bounds)).sort((left, right) => left - right)
}

/** A range's values with the thumb at `at` moved toward `wanted`, stopped `gap` from each neighbor. */
export const sliderMoved = (
  points: readonly number[],
  at: number,
  wanted: number,
  gap: number,
): readonly number[] => {
  const before = points[at - 1]
  const after = points[at + 1]
  const low = before === undefined ? Number.NEGATIVE_INFINITY : before + gap
  const high = after === undefined ? Number.POSITIVE_INFINITY : after - gap
  return points.map((one, index) => (index === at ? Math.min(high, Math.max(low, wanted)) : one))
}

/**
 * Which thumb a press at `wanted` takes: the nearest, and of two at the same place
 * the one the press is past, so a press above a closed range opens it upward.
 */
export const sliderNearest = (points: readonly number[], wanted: number): number => {
  let at = 0
  points.forEach((one, index) => {
    const distance = Math.abs(one - wanted)
    const best = Math.abs((points[at] ?? 0) - wanted)
    if (distance < best || (distance === best && wanted > one)) {
      at = index
    }
  })
  return at
}
