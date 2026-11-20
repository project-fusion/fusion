/*
 * What a meter and a progress bar work out from their props: the range, the
 * reading held to it, how much of the track it fills, the words it is read
 * as, and a meter's band. A derivation is given the props by the web
 * element's names, in whichever form a platform holds them, and these read
 * them as the web elements' converters do.
 */

import { readingText } from '../number-format/number-format.js'
import { numberOf, numberOptions, textOf } from '../number-format/props.js'

/** The props a range is worked out from, by the web element's names. */
type RangeProps = Readonly<Record<string, unknown>>

/** A number prop, or `fallback` where it holds none, as `numberConverter` keeps a default. */
const numeric = (value: unknown, fallback: number): number => numberOf(value) ?? fallback

/** A meter's band, once `optimum` has said which end is good. */
export type MeterBand = 'fair' | 'good' | 'poor'

/** What a meter reads from its props. */
export interface MeterReading {
  /** The band the reading is in, or `undefined` where nothing declares one. */
  readonly band: MeterBand | undefined
  /** Whether the value is past an end, which the bar itself cannot show. */
  readonly beyond: 'over' | 'under' | undefined
  /** How much of the track is filled, from 0 to 1. */
  readonly fraction: number
  /** The range, `max` above `min`. */
  readonly max: number
  readonly min: number
  /** The reading held inside the range, which `aria-valuenow` is. */
  readonly now: number
  /** How far along the range each threshold is, from 0 to 1, where there are thresholds. */
  readonly thresholds: { readonly high: number; readonly low: number } | undefined
  /** The words the reading is shown and said as. */
  readonly text: string
}

/** The band a written `band` names, or `undefined`. */
const bandOf = (band: unknown): MeterBand | undefined =>
  band === 'fair' || band === 'good' || band === 'poor' ? band : undefined

/**
 * A meter's reading, as `helix-meter` works it out: the range clamped so
 * `max` is above `min`, the reading pulled into it, the bands by the HTML
 * specification's rule, and the words, which are not clamped, so a value
 * past an end says so.
 */
export const meterReading = (props: RangeProps): MeterReading => {
  const min = numeric(props.min, 0)
  const written = numeric(props.max, 100)
  const max = written > min ? written : min + 1
  const value = numeric(props.value, 0)
  const now = Math.min(max, Math.max(min, value))
  const span = max - min
  const low = numberOf(props.low)
  const high = numberOf(props.high)
  const bounds =
    low === undefined && high === undefined
      ? undefined
      : (() => {
          const lower = Math.min(max, Math.max(min, low ?? min))
          return { high: Math.min(max, Math.max(lower, high ?? max)), low: lower }
        })()
  const band = (() => {
    const named = bandOf(props.band)
    if (named !== undefined || bounds === undefined) {
      return named
    }
    const optimum = Math.min(
      max,
      Math.max(min, numberOf(props.optimum) ?? (bounds.low + bounds.high) / 2),
    )
    const which = (at: number): number => (at < bounds.low ? 0 : at > bounds.high ? 2 : 1)
    const distance = Math.abs(which(now) - which(optimum))
    return distance === 0 ? 'good' : distance === 1 ? 'fair' : 'poor'
  })()
  const ratio = (value - min) / span
  return {
    band,
    beyond: value > max ? 'over' : value < min ? 'under' : undefined,
    fraction: (now - min) / span,
    max,
    min,
    now,
    text:
      textOf(props['value-text']) ||
      readingText(value, ratio, textOf(props.locale), numberOptions(props['format-options'])),
    thresholds:
      bounds === undefined
        ? undefined
        : { high: (bounds.high - min) / span, low: (bounds.low - min) / span },
  }
}

/** What a progress bar reads from its props. */
export interface ProgressReading {
  /** Whether it has arrived at `max`, which an indeterminate bar never does. */
  readonly complete: boolean
  /** How much of the track is filled, from 0 to 1, and the whole track while indeterminate. */
  readonly fraction: number
  /** The range, `max` above `min`. */
  readonly max: number
  readonly min: number
  /** The reading held inside the range, or `undefined` while indeterminate. */
  readonly now: number | undefined
  /** The words the reading is shown as. */
  readonly text: string
  /** The words it is read as, or `undefined` while indeterminate with none of its own. */
  readonly said: string | undefined
}

/** Whether a boolean prop holds, as a flag or as the attribute written. */
const flag = (value: unknown): boolean => value === true || value === ''

/**
 * A progress bar's reading, as `helix-progress` works it out: a range of a
 * hundred above `min` where `max` is not above it, the value held inside it,
 * and nothing to say where it stands while indeterminate. Words written on
 * the bar, as a string in its default region, are what it is read as.
 */
export const progressReading = (props: RangeProps): ProgressReading => {
  const min = numeric(props.min, 0)
  const written = numeric(props.max, 100)
  const max = written > min ? written : min + 100
  const value = numeric(props.value, 0)
  const indeterminate = flag(props.indeterminate)
  const fraction = Math.min(Math.max((value - min) / (max - min), 0), 1) || 0
  const now = Math.min(Math.max(value, min), max)
  const text =
    textOf(props['value-text']) ||
    readingText(now, fraction, textOf(props.locale), numberOptions(props['format-options']))
  const shown = textOf(props['value-text']) || textOf(props.default).trim()
  return {
    complete: !indeterminate && fraction >= 1,
    fraction: indeterminate ? 1 : fraction,
    max,
    min,
    now: indeterminate ? undefined : now,
    said: indeterminate ? shown || undefined : shown || text,
    text,
  }
}
