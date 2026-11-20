/**
 * What Format Date draws from its props and the time of day: the words, the
 * instant its `<time>` carries, and for a reading of how long ago, the words
 * a screen reader hears, the whole date, and when the reading goes stale.
 * The web element and a phone's component both draw from it.
 */

import { timers } from '../../capabilities/timers/index.js'
import { calendarLocale } from '../calendar/calendar.js'
import type { Derivation } from '../derivations/derivations.js'
import { elapsedTime } from '../elapsed-time/elapsed-time.js'
import { numberOf, textOf } from '../number-format/props.js'
import { type Relative, relativeTime } from '../relative-time/relative-time.js'
import { type Asked, formatOptions } from './format-date-options.js'

/** The props Format Date is drawn from, by the web element's attribute names. */
export type DateProps = Readonly<Record<string, unknown>>

/** A date with no time of day, `YYYY-MM-DD`, which names a day rather than an instant. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** The styles `relative` names; anything else, an empty flag among them, reads `long`. */
const STYLES: readonly Intl.RelativeTimeFormatStyle[] = ['long', 'narrow', 'short']

/**
 * How long, from the time of day a derivation is given as `now`, what is
 * drawn holds, which a source's `clock` is bound to.
 */
export type Expiry = (props: DateProps) => number | undefined

/** What a reading of how long ago says beside its words. */
export interface DateReading {
  /** Milliseconds from the time of day to the moment: above zero for a moment still to come. */
  readonly ahead: number
  /** Milliseconds until the words go stale, as `relativeTime` says in `next`. */
  readonly next: number
  /** The reading in full, "3 hours ago", which names the `<time>`. */
  readonly spoken: string
  /** The whole date in the locale's long pattern, the `<time>`'s title. */
  readonly whole: string
}

/** What Format Date draws, where it has a moment to draw. */
export interface DateDrawn {
  /** The instant as `<time datetime>` takes it: the day as written for a date with no time. */
  readonly datetime: string
  /** Each field of a date as `Intl` writes it, where `fields` asks for them. */
  readonly parts?: readonly Intl.DateTimeFormatPart[]
  /** Where the words read how long ago, what they say beside them. */
  readonly reading?: DateReading
  /** The words drawn. */
  readonly text: string
}

/**
 * The timestamp as written, trimmed: a `Date` or a number as its ISO string,
 * so it is read the way an attribute is, and the empty string for anything
 * that names no moment.
 */
export const dateSource = (date: unknown): string => {
  if (typeof date === 'string') {
    return date.trim()
  }
  if (!(date instanceof Date) && typeof date !== 'number') {
    return ''
  }
  const at = new Date(date)
  return Number.isNaN(at.getTime()) ? '' : at.toISOString()
}

/** Whether the words read how long ago rather than the date: `elapsed`, or any `relative`. */
export const isReading = (props: DateProps): boolean =>
  props.elapsed === true ||
  (props.relative !== undefined && props.relative !== null && props.relative !== false)

/** The `Intl` options asked for, from the props by their attribute names. */
const askedOf = (props: DateProps): Asked =>
  ({
    dateStyle: props['date-style'],
    day: props.day,
    dayPeriod: props['day-period'],
    era: props.era,
    fractionalSecondDigits: numberOf(props['fractional-second-digits']),
    hour: props.hour,
    hourCycle: props['hour-cycle'],
    minute: props.minute,
    month: props.month,
    second: props.second,
    timeStyle: props['time-style'],
    timeZone: textOf(props['time-zone']) || undefined,
    timeZoneName: props['time-zone-name'],
    weekday: props.weekday,
    year: props.year,
  }) as Asked

/** The language the words are written in: `locale` with the calendar, as the web writes it. */
export const dateLanguage = (props: DateProps): string =>
  calendarLocale(textOf(props.locale), textOf(props.calendar))

/** What the reading of how long ago says at `now`, and when that stops being true. */
const readingAt = (props: DateProps, language: string): ((from: Date, now: Date) => Relative) =>
  props.elapsed === true
    ? elapsedTime(language)
    : relativeTime(language, {
        numeric: props.numeric === 'always' ? 'always' : 'auto',
        style: STYLES.includes(props.relative as Intl.RelativeTimeFormatStyle)
          ? (props.relative as Intl.RelativeTimeFormatStyle)
          : 'long',
      })

/** The moment the props name, and whether it is a day with no time, or nothing. */
const momentOf = (props: DateProps): { readonly at: Date; readonly source: string } | undefined => {
  const source = dateSource(props.date)
  const at = new Date(source)
  return source === '' || Number.isNaN(at.getTime()) ? undefined : { at, source }
}

/**
 * What Format Date draws in `language` at `now`, in milliseconds, or
 * nothing where `date` names no moment.
 *
 * **A date is formatted with every `Intl` option asked for, and none that
 * was not.** A day with no time is read in UTC unless `time-zone` names a
 * zone. **A reading is named in full**, "3 hours ago" for "3h", with the
 * same choice of word or number, and carries the whole date beside it.
 */
export const readDate = (
  props: DateProps,
  at: { readonly language: string; readonly now: number },
): DateDrawn | undefined => {
  const moment = momentOf(props)
  if (moment === undefined) {
    return undefined
  }
  const dateOnly = DATE_ONLY.test(moment.source)
  const datetime = dateOnly ? moment.source : moment.at.toISOString()
  const asked = askedOf(props)
  const locale = at.language || undefined
  if (!isReading(props)) {
    const format = new Intl.DateTimeFormat(locale, formatOptions(asked, dateOnly))
    return props.fields === true
      ? { datetime, parts: format.formatToParts(moment.at), text: format.format(moment.at) }
      : { datetime, text: format.format(moment.at) }
  }
  const now = new Date(at.now)
  const read = readingAt(props, at.language)(moment.at, now)
  const whole = new Intl.DateTimeFormat(
    locale,
    formatOptions(
      {
        dateStyle: 'long',
        hourCycle: asked.hourCycle,
        timeStyle: dateOnly ? undefined : 'short',
        timeZone: asked.timeZone,
      },
      dateOnly,
    ),
  ).format(moment.at)
  const spoken = relativeTime(at.language, {
    numeric: props.numeric === 'always' ? 'always' : 'auto',
  })(moment.at, now).text
  return {
    datetime,
    reading: { ahead: moment.at.getTime() - at.now, next: read.next, spoken, whole },
    text: read.text,
  }
}

/**
 * How long, from `now`, the words drawn at `now` hold: `undefined` where
 * there is no reading to keep, which keeps no clock, and `Infinity` while
 * `frozen`, which draws the reading once and leaves it.
 */
export const dateExpires = (
  props: DateProps,
  language: string,
  now: number,
): number | undefined => {
  const moment = momentOf(props)
  if (moment === undefined || !isReading(props)) {
    return undefined
  }
  return props.frozen === true
    ? Infinity
    : readingAt(props, language)(moment.at, new Date(now)).next
}

/** The time of day a derivation is given, `now`, or the timers capability's where none is. */
const nowOf = (props: DateProps): number => numberOf(props.now) ?? timers().wall()

/** What Format Date draws, from the props and the `now` a derivation is given. */
const drawnOf = (props: DateProps): DateDrawn | undefined =>
  readDate(props, { language: dateLanguage(props), now: nowOf(props) })

/** `format-date-shown`: whether `date` names a moment to draw. */
export const formatDateShown: Derivation = (props) => momentOf(props) !== undefined

/** `format-date-text`: the words drawn. */
export const formatDateText: Derivation = (props) => drawnOf(props)?.text

/** `format-date-spoken`: a reading in full, which names it, and nothing for a date. */
export const formatDateSpoken: Derivation = (props) => drawnOf(props)?.reading?.spoken

/** `format-date-whole`: the whole date beside a reading, and nothing for a date. */
export const formatDateWhole: Derivation = (props) => drawnOf(props)?.reading?.whole

/** `format-date-past`: whether a reading is of a moment gone. */
export const formatDatePast: Derivation = (props) => {
  const reading = drawnOf(props)?.reading
  return reading !== undefined && reading.ahead <= 0
}

/** `format-date-future`: whether a reading is of a moment still to come. */
export const formatDateFuture: Derivation = (props) => {
  const reading = drawnOf(props)?.reading
  return reading !== undefined && reading.ahead > 0
}

/**
 * `format-date-expires`: how long the words drawn at `now` hold, which the
 * element's clock waits before it ticks again.
 */
export const formatDateExpires: Expiry = (props) =>
  dateExpires(props, dateLanguage(props), nowOf(props))
