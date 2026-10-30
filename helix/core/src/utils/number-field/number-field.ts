/**
 * A number field's arithmetic: the number its text reads as, the grid a
 * typed number is held to, a step from where the reader is, the keys that
 * step it, the keypad a phone offers, and what is wrong with its text. The
 * web's Number Input does these sums on its `<input>`, and a phone's spin
 * machine does them here.
 *
 * **The bounds are optional.** A field with no `min` has no floor and one
 * with no `max` no ceiling, as a native number field has none.
 */

import { formatNumber, parseNumber } from '../number-format/number-format.js'
import { numberOf, numberOptions, textOf } from '../number-format/props.js'

/**
 * How long a stepper button is held before it steps again, and how often it
 * steps after that, in milliseconds: React Aria's NumberField's 400 and 60.
 */
export const REPEAT_DELAY = 400
export const REPEAT_EVERY = 60

/** What a number field reads its number by, as the web element's props hold them. */
export interface NumberField {
  /** `Intl.NumberFormat` options the number is shown with while the field is not edited. */
  readonly format?: Intl.NumberFormatOptions | undefined
  /** How many steps Page Up and Page Down take. Ten where it is unset. */
  readonly largeStep?: number | undefined
  /** The locale the number is read and written in, or `''` for the runtime's. */
  readonly locale: string
  /** The largest value, or `undefined` for no ceiling. */
  readonly max?: number | undefined
  /** The smallest value, or `undefined` for no floor. */
  readonly min?: number | undefined
  /** How far one step moves, `any` for no grid, or `undefined` for the format's grain. */
  readonly step?: number | 'any' | undefined
}

/** `step` as written: `any`, or a number, as a native number field reads it. */
export const numberFieldStep = (step: unknown): number | 'any' | undefined => {
  if (typeof step === 'string' && step.trim().toLowerCase() === 'any') {
    return 'any'
  }
  return numberOf(step)
}

/**
 * A number field from its props, in whichever form a platform holds them:
 * `min`, `max`, `step`, `largeStep`, `locale`, and `formatOptions`, an
 * object or the JSON of one.
 */
export const numberFieldOf = (props: {
  readonly formatOptions?: unknown
  readonly largeStep?: unknown
  readonly locale?: unknown
  readonly max?: unknown
  readonly min?: unknown
  readonly step?: unknown
}): NumberField => ({
  format: numberOptions(props.formatOptions),
  largeStep: numberOf(props.largeStep),
  locale: textOf(props.locale),
  max: numberOf(props.max),
  min: numberOf(props.min),
  step: numberFieldStep(props.step),
})

/** The grains read so far, by locale and options. */
const grains = new Map<string, number>()

/**
 * The smallest amount a format shows, which is the grid a typed number is
 * rounded to when no `step` is set: `0.01` for a currency in dollars, `0.001`
 * for a plain decimal, and `0.01` for a whole percent, since a percent shows
 * the number a hundred times over.
 *
 * React Aria's NumberField does not round a typed number to whole steps when
 * no step is given: it keeps the fraction the format shows. A field showing
 * dollars keeps cents, and one showing a percent steps by one percent.
 */
export const formatGrain = (locale: string, options: Intl.NumberFormatOptions): number => {
  const key = `${locale}|${JSON.stringify(options)}`
  const held = grains.get(key)
  if (held !== undefined) {
    return held
  }
  const { maximumFractionDigits = 0 } = new Intl.NumberFormat(
    locale || undefined,
    options,
  ).resolvedOptions()
  const places = maximumFractionDigits + (options.style === 'percent' ? 2 : 0)
  const grain = Number(`1e-${places}`)
  grains.set(key, grain)
  return grain
}

/**
 * How far one press moves when no `step` is set: one percent for a percent,
 * as React Aria does, and one otherwise.
 */
export const strideOf = (options: Intl.NumberFormatOptions | undefined): number =>
  options?.style === 'percent' ? 0.01 : 1

/**
 * How many decimal places a number is written with.
 *
 * Read off the string, because the question is about how the consumer wrote
 * the step and not about what the binary can represent. `1e-7` is handled
 * separately: its string form has no dot at all, so counting after one would
 * say zero and round every result to a whole number.
 */
export const decimals = (value: number): number => {
  const text = String(value)
  const exponent = /e-(\d+)$/.exec(text)
  if (exponent) {
    return Number(exponent[1])
  }
  return (text.split('.')[1] ?? '').length
}

/**
 * The number a field's text reads as, or `null` where it holds nothing
 * usable: read in the locale with the options it is shown with, so a typed
 * `$1,200` is 1200 and `1,5` in a locale with a decimal comma is one and a
 * half.
 */
export const numberFieldParse = (text: string, field: NumberField): number | null => {
  const trimmed = text.trim()
  return trimmed === '' ? null : parseNumber(trimmed, field.locale, field.format)
}

/** The step as a number, or zero where it is unset or `any`. */
const stepSize = (field: NumberField): number =>
  typeof field.step === 'number' ? Math.abs(field.step) || 0 : 0

/** The format a field with no `format-options` writes its number in: the locale's plain decimal. */
const PLAIN_FORMAT: Intl.NumberFormatOptions = {}

/**
 * The grid a typed number is rounded to: `step` where it is set, nothing
 * where it is `any`, and otherwise the smallest amount the format shows.
 */
export const numberFieldGrid = (field: NumberField): number => {
  const step = stepSize(field)
  if (step || field.step === 'any') {
    return step
  }
  return formatGrain(field.locale, field.format ?? PLAIN_FORMAT)
}

/** How far one press moves: `step`, or the stride the format implies. */
export const numberFieldStride = (field: NumberField): number =>
  stepSize(field) || strideOf(field.format)

/**
 * A value pulled into range and onto the step grid.
 *
 * The grid is anchored at `min` where there is one, so `min="1" step="2"`
 * gives 1, 3, 5. Rounded to the step's own precision, because stepping 0.1
 * in binary floating point otherwise produces `0.30000000000000004`.
 */
export const numberFieldClamp = (value: number, field: NumberField): number => {
  const step = numberFieldGrid(field)
  const anchor = field.min ?? 0
  const stepped = step ? anchor + Math.round((value - anchor) / step) * step : value
  const floored = field.min === undefined ? stepped : Math.max(field.min, stepped)
  const capped = field.max === undefined ? floored : Math.min(field.max, floored)
  /* Decimal places from the step and the anchor together: a step of 0.5 from
     an anchor of 0.25 lands on 0.75, which needs two places. */
  const places = Math.max(decimals(step), decimals(anchor))
  return step ? Number(capped.toFixed(places)) : capped
}

/** Whether `value` is on the step grid, counted from `min`. */
export const numberFieldOnStep = (value: number, field: NumberField): boolean => {
  const step = numberFieldGrid(field)
  if (!step) {
    return true
  }
  const steps = (value - (field.min ?? 0)) / step
  /* To the precision the grid is written in, so 0.1 + 0.2 is on a 0.1 grid. */
  return Math.abs(steps - Math.round(steps)) < 1e-9
}

/**
 * The text a step of `steps` whole steps leaves, from where the reader is.
 *
 * From `min` when the field is empty or holds no number, so the first press
 * lands somewhere meaningful: an empty field with `min="1"` stepping to 0
 * would be out of range before the reader had typed anything.
 */
export const numberFieldNudge = (text: string, steps: number, field: NumberField): string => {
  const parsed = numberFieldParse(text, field)
  const from = parsed ?? field.min ?? 0
  return String(
    numberFieldClamp(parsed === null ? from : from + steps * numberFieldStride(field), field),
  )
}

/** How many steps a `stepUp` argument asks for: a count, or `largeStep` for `true`. */
export const numberFieldSteps = (count: number | boolean, field: NumberField): number => {
  if (typeof count === 'boolean') {
    return count ? (field.largeStep ?? 10) : 1
  }
  return Number.isFinite(count) ? Math.trunc(count) : 1
}

/**
 * The text a key leaves, or `undefined` for a key a number field leaves to
 * the text: Up and Down by a step, Page Up and Page Down by `largeStep`
 * steps, and Home and End to `min` and `max` where there is one. Without
 * one they move the caret, which is what a reader pressing them meant.
 */
export const numberFieldKeyed = (
  key: string,
  text: string,
  field: NumberField,
): string | undefined => {
  switch (key) {
    case 'ArrowUp':
      return numberFieldNudge(text, 1, field)
    case 'ArrowDown':
      return numberFieldNudge(text, -1, field)
    case 'PageUp':
      return numberFieldNudge(text, numberFieldSteps(true, field), field)
    case 'PageDown':
      return numberFieldNudge(text, -numberFieldSteps(true, field), field)
    case 'Home':
      return field.min === undefined ? undefined : String(field.min)
    case 'End':
      return field.max === undefined ? undefined : String(field.max)
    default:
      return undefined
  }
}

/**
 * The text a typed number settles to as the reader leaves the field: in
 * range and on the grid. **Blank and text that is no number stay as they
 * are**, so a reader who mistyped sees their entry marked wrong.
 */
export const numberFieldSettle = (text: string, field: NumberField): string => {
  const parsed = numberFieldParse(text, field)
  return parsed === null ? text : String(numberFieldClamp(parsed, field))
}

/**
 * What the field shows: the text as written while it is edited, and with
 * the format once it is not.
 */
export const numberFieldShown = (text: string, editing: boolean, field: NumberField): string => {
  const parsed = numberFieldParse(text, field)
  if (editing || field.format === undefined || parsed === null) {
    return text
  }
  return formatNumber(parsed, field.locale, field.format)
}

/** Whether the number stands at `min` and at `max`, so it cannot step further down or up. */
export const numberFieldEnds = (
  text: string,
  field: NumberField,
): { readonly atMax: boolean; readonly atMin: boolean } => {
  const parsed = numberFieldParse(text, field)
  return {
    atMax: parsed !== null && field.max !== undefined && parsed >= field.max,
    atMin: parsed !== null && field.min !== undefined && parsed <= field.min,
  }
}

/**
 * What a screen reader says for the value, where anything but the number:
 * `template` with the value in place of `{value}`, the value in its format,
 * or `''` where neither asks for words. `''` too where the text is no number.
 */
export const numberFieldSpoken = (text: string, field: NumberField, template: string): string => {
  const parsed = numberFieldParse(text, field)
  if (parsed === null) {
    return ''
  }
  const formatted =
    field.format === undefined ? undefined : formatNumber(parsed, field.locale, field.format)
  if (template !== '') {
    return template.replaceAll('{value}', () => formatted ?? text)
  }
  return formatted ?? ''
}

/** Which phone a field is on, for the keypads it has: an iPhone, Android, or neither. */
export type Phone = 'android' | 'iphone' | ''

/**
 * The keypad a phone shows, as React Aria's NumberField chooses it.
 * `numeric` on Android has a minus key and a decimal separator, and
 * `decimal` has no minus key. On an iPhone neither has a minus key, so a
 * number that can be negative takes the full keyboard.
 */
export const numberFieldKeypad = (
  phone: Phone,
  field: NumberField,
): 'decimal' | 'numeric' | 'text' => {
  const negative = field.min === undefined || field.min < 0
  const grid = numberFieldGrid(field)
  const fraction = grid === 0 || !Number.isInteger(grid)
  if (phone === 'iphone') {
    return negative ? 'text' : fraction ? 'decimal' : 'numeric'
  }
  if (phone === 'android') {
    return negative ? 'numeric' : fraction ? 'decimal' : 'numeric'
  }
  return 'numeric'
}

/** What is wrong with a number field's text, by the platform's flag name, and the numbers its sentence names. */
export type NumberFlaw =
  | { readonly flag: 'badInput' }
  | { readonly flag: 'rangeOverflow'; readonly max: number }
  | { readonly flag: 'rangeUnderflow'; readonly min: number }
  | { readonly above: number; readonly below: number; readonly flag: 'stepMismatch' }

/**
 * What is wrong with the text, in the platform's order, or `undefined`:
 * text that reads as no number, then a number below `min`, above `max`, and
 * off the step grid with the nearest numbers on it. Blank text is nothing
 * wrong here, since a missing answer is `required`'s to say.
 */
export const numberFieldFlaw = (text: string, field: NumberField): NumberFlaw | undefined => {
  if (text.trim() === '') {
    return undefined
  }
  const parsed = numberFieldParse(text, field)
  if (parsed === null) {
    return { flag: 'badInput' }
  }
  if (field.min !== undefined && parsed < field.min) {
    return { flag: 'rangeUnderflow', min: field.min }
  }
  if (field.max !== undefined && parsed > field.max) {
    return { flag: 'rangeOverflow', max: field.max }
  }
  if (!numberFieldOnStep(parsed, field)) {
    const step = numberFieldGrid(field)
    const anchor = field.min ?? 0
    return {
      above: numberFieldClamp(anchor + Math.ceil((parsed - anchor) / step) * step, field),
      below: numberFieldClamp(anchor + Math.floor((parsed - anchor) / step) * step, field),
      flag: 'stepMismatch',
    }
  }
  return undefined
}

/**
 * A number as a message writes it: in the locale the words are in, every
 * digit kept and no grouping, which in English is the number as it was
 * always written.
 */
export const numberFieldWritten = (number: number, locale: string): string =>
  formatNumber(number, locale, { maximumFractionDigits: 20, useGrouping: false })

/**
 * The text a `number` field's `stepUp` or `stepDown` leaves, as HTML says: from
 * the number it holds, or 0, `steps` steps along the grid `min` starts, a number
 * off the grid counting its way to the grid as one, kept within `min` and `max`
 * on the grid.
 */
export const numberTypeStep = (text: string, steps: number, field: NumberField): string => {
  const grid = field.step === 'any' || field.step === undefined ? 1 : field.step
  const base = field.min ?? 0
  const from = (numberFieldParse(text, field) ?? 0) - base
  const places = Math.max(decimals(grid), decimals(base))
  const count = from / grid
  const off = Math.abs(count - Math.round(count)) > 1e-9
  const landed = off
    ? (steps > 0 ? Math.ceil(count) : Math.floor(count)) + steps - Math.sign(steps)
    : Math.round(count) + steps
  let next = base + landed * grid
  if (field.min !== undefined && next < field.min) {
    next = field.min
  }
  if (field.max !== undefined && next > field.max) {
    next = base + Math.floor((field.max - base) / grid + 1e-9) * grid
  }
  return String(Number(next.toFixed(places)))
}
