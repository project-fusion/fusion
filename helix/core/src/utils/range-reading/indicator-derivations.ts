/*
 * The derivations of Meter, Progress and Skeleton, which
 * `@fusion.dev/helix-core/derivations` exports with the rest. Each export is
 * one derivation, named as `helix system` names it, and reads the props by
 * the web element's names.
 */

import { formatMessage } from '../../words/message.js'
import { lookupWord } from '../../words/registry.js'
import { numberOf, textOf } from '../number-format/props.js'
import { type MeterBand, meterReading, progressReading } from './range-reading.js'

/** The props a derivation reads, by the web element's names. */
type Props = Readonly<Record<string, unknown>>

/** A value from an element's props: words, whether something holds, or nothing. */
type Derivation = (props: Props) => boolean | string | undefined

/** How much of the circle a meter's round shape covers: three quarters for an arc. */
const sweepOf = (props: Props): number => (props.shape === 'arc' ? 75 : 100)

/** `meter-min`: the bottom of a meter's range. */
export const meterMin: Derivation = (props) => String(meterReading(props).min)

/** `meter-max`: the top of a meter's range, always above its bottom. */
export const meterMax: Derivation = (props) => String(meterReading(props).max)

/**
 * `meter-span`: how much a meter's range holds, its top less its bottom,
 * which a segment divides its own value by to find its width.
 */
export const meterSpan: Derivation = (props) => {
  const { max, min } = meterReading(props)
  return String(max - min)
}

/**
 * `meter-segment-amount`: how much of its meter's range a segment draws:
 * its `value`, and nothing where that is not a number or is below zero.
 */
export const meterSegmentAmount: Derivation = (props) => {
  const value = numberOf(props.value)
  return String(value !== undefined && value > 0 ? value : 0)
}

/** `meter-now`: a meter's reading, held inside its range. */
export const meterNow: Derivation = (props) => String(meterReading(props).now)

/** `meter-text`: the words a meter's reading is shown and said as, past an end too. */
export const meterText: Derivation = (props) => meterReading(props).text

/** `meter-fraction`: how much of a meter's bar is filled, from 0 to 1. */
export const meterFraction: Derivation = (props) => String(meterReading(props).fraction)

/** `meter-band`: the band a meter's reading is in, `good`, `fair` or `poor`, or nothing. */
export const meterBand: Derivation = (props) => meterReading(props).band

/** `meter-beyond`: `over` or `under` where a meter's value is past an end. */
export const meterBeyond: Derivation = (props) => meterReading(props).beyond

/** `meter-good`: whether a meter's reading is in the good band. */
export const meterIsGood: Derivation = (props) => meterReading(props).band === 'good'

/** `meter-fair`: whether a meter's reading is in a band beside the good one. */
export const meterIsFair: Derivation = (props) => meterReading(props).band === 'fair'

/** `meter-poor`: whether a meter's reading is two bands from the good one. */
export const meterIsPoor: Derivation = (props) => meterReading(props).band === 'poor'

/** `meter-over`: whether a meter's value is above `max`. */
export const meterIsOver: Derivation = (props) => meterReading(props).beyond === 'over'

/** `meter-under`: whether a meter's value is below `min`. */
export const meterIsUnder: Derivation = (props) => meterReading(props).beyond === 'under'

/** `meter-banded`: whether a meter has thresholds, which draw its ticks. */
export const meterIsBanded: Derivation = (props) => meterReading(props).thresholds !== undefined

/** `meter-low-at`: where a meter's low threshold sits on its bar, as a percentage. */
export const meterLowAt: Derivation = (props) => {
  const at = meterReading(props).thresholds?.low
  return at === undefined ? undefined : `${at * 100}%`
}

/** `meter-high-at`: where a meter's high threshold sits on its bar, as a percentage. */
export const meterHighAt: Derivation = (props) => {
  const at = meterReading(props).thresholds?.high
  return at === undefined ? undefined : `${at * 100}%`
}

/** `meter-sweep`: how much of the circle a meter's round shape covers, in its path length of 100. */
export const meterSweep: Derivation = (props) => String(sweepOf(props))

/** `meter-along`: how far round a meter's arc or ring its reading reaches, in its path length. */
export const meterAlong: Derivation = (props) =>
  String(meterReading(props).fraction * sweepOf(props))

/** `meter-low-along`: where a meter's low threshold sits round its arc or ring. */
export const meterLowAlong: Derivation = (props) => {
  const at = meterReading(props).thresholds?.low
  return at === undefined ? undefined : String(at * sweepOf(props))
}

/** `meter-high-along`: where a meter's high threshold sits round its arc or ring. */
export const meterHighAlong: Derivation = (props) => {
  const at = meterReading(props).thresholds?.high
  return at === undefined ? undefined : String(at * sweepOf(props))
}

/** An object, as it is or as the JSON the web's attribute holds, or `undefined`. */
const objectOf = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  if (typeof value === 'string') {
    try {
      return value.trim() === '' ? undefined : objectOf(JSON.parse(value))
    } catch {
      return undefined
    }
  }
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined
}

/** A meter's words, in the order the web element reads them: its own, the registry's, the English. */
const meterWord = (own: unknown, property: string, english: string, locale: string): string => {
  if (typeof own === 'string' && own !== english) {
    return own
  }
  const registered = lookupWord(locale || 'en', 'helix-meter', property)?.[0]
  return typeof registered === 'string' ? registered : english
}

/** The English for each band. */
const BANDS: Readonly<Record<MeterBand, string>> = { fair: 'Fair', good: 'Good', poor: 'Poor' }

/**
 * `meter-said`: what a meter says under `live` as its reading moves into a
 * band, `live-label` with the reading and the band's words from
 * `band-labels`, an object or the JSON the web's attribute holds.
 */
export const meterSaid: Derivation = (props) => {
  const { band, text } = meterReading(props)
  if (band === undefined) {
    return undefined
  }
  const locale = textOf(props.locale)
  const labels = objectOf(props['band-labels'])
  const own = labels?.[band]
  const words = typeof own === 'string' && own !== '' ? own : BANDS[band]
  const template = meterWord(props['live-label'], 'liveLabel', '{reading}, {band}', locale)
  return formatMessage(template, { band: words, reading: text }, locale || 'en')
}

/** `progress-min`: the bottom of a progress bar's range. */
export const progressMin: Derivation = (props) => String(progressReading(props).min)

/** `progress-max`: the top of a progress bar's range, always above its bottom. */
export const progressMax: Derivation = (props) => String(progressReading(props).max)

/** `progress-now`: a progress bar's reading, held inside its range, or nothing while indeterminate. */
export const progressNow: Derivation = (props) => {
  const now = progressReading(props).now
  return now === undefined ? undefined : String(now)
}

/** `progress-text`: the words a progress bar shows for its reading. */
export const progressText: Derivation = (props) => progressReading(props).text

/**
 * `progress-said`: the words a progress bar is read as: its own words, those
 * written on the bar, or its reading, and nothing while indeterminate without
 * words of its own.
 */
export const progressSaid: Derivation = (props) => progressReading(props).said

/** `progress-fraction`: how much of a progress bar is filled, from 0 to 1, and all of it while indeterminate. */
export const progressFraction: Derivation = (props) => String(progressReading(props).fraction)

/** `progress-complete`: whether a determinate progress bar has arrived at `max`. */
export const progressIsComplete: Derivation = (props) => progressReading(props).complete

/** Whether a skeleton holds content: words that are not all space, or anything else passed in. */
const wraps = (props: Props): boolean => {
  const content = props.default
  if (typeof content === 'string') {
    return content.trim() !== ''
  }
  if (Array.isArray(content)) {
    return content.some((one) => wraps({ default: one }))
  }
  return content !== undefined && content !== null && content !== false
}

/** How many lines a skeleton's paragraph has, where it draws one: two or more, of a text shape. */
const linesOf = (props: Props): number | undefined => {
  const count = Math.floor(numberOf(props.lines) ?? 1)
  return props.shape === 'text' && count > 1 ? count : undefined
}

/** `skeleton-paragraph`: whether a skeleton draws a paragraph of lines. */
export const skeletonIsParagraph: Derivation = (props) => linesOf(props) !== undefined

/** `skeleton-lines`: how many lines a skeleton's paragraph draws. */
export const skeletonLines: Derivation = (props) => {
  const count = linesOf(props)
  return count === undefined ? undefined : String(count)
}

/**
 * `skeleton-name`: what a skeleton is named as a busy indicator: its `label`,
 * while it is a placeholder or the content it holds is loading. Loaded
 * content is the page's own, and is read as it is.
 */
export const skeletonName: Derivation = (props) => {
  const label = textOf(props.label)
  return label !== '' && (props.loading === true || props.loading === '' || !wraps(props))
    ? label
    : undefined
}

/** `skeleton-role`: `progressbar` while a skeleton has a name, and nothing otherwise. */
export const skeletonRole: Derivation = (props) =>
  skeletonName(props) === undefined ? undefined : 'progressbar'

/** `skeleton-unread`: whether a skeleton is hidden from screen readers: a placeholder with no name. */
export const skeletonIsUnread: Derivation = (props) =>
  skeletonName(props) === undefined && !wraps(props)
