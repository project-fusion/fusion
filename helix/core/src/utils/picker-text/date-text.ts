/**
 * A date field's text with no element in it: how one date is written, the
 * locale its segments are laid out in, and what is wrong with the dates it
 * holds. Date Input reads these on the web and on a phone.
 */

import {
  barredBy,
  calendarLocale,
  MONTH_CALENDARS,
  type MonthSystem,
  monthSystem,
} from '../calendar/calendar.js'
import type { DateRules } from '../calendar/calendar-grid.js'
import { readWrittenDate } from '../date-segments/date-segments.js'
import { isDateValue, valueAsDate } from '../value-as/value-as.js'
import { heldValues, type PickerKind, type PickerMode } from './picker-text.js'

/** The date the unreadable message shows as an example. */
export const EXAMPLE_DATE = '2026-08-24'

/** How a date is written: the platform's styles, or `iso`. */
export type DateStyle = 'full' | 'iso' | 'long' | 'medium' | 'short'

/** The calendar a date's parts are counted in, where it has months of its own. */
export const dateSegmentSystem = (calendar: string | undefined): MonthSystem | undefined =>
  MONTH_CALENDARS.includes(calendar ?? '') ? monthSystem(calendar) : undefined

/** The locale a date's segments are laid out and named in: the calendar's, or Gregorian. */
export const dateSegmentLocale = (language: string, calendar: string | undefined): string => {
  const tag = calendarLocale(language, calendar)
  return tag.includes('-ca-iso8601') || dateSegmentSystem(calendar)
    ? tag
    : calendarLocale(tag, 'gregory')
}

/**
 * One date, written the way `style` asks for. UTC, because the dates are UTC
 * throughout: a date parsed in a zone behind Greenwich renders as the day
 * before, and the calendar beside the field would disagree with it.
 */
export const writtenDate = (
  date: string,
  style: DateStyle,
  language: string,
  calendar: string | undefined,
): string => {
  if (style === 'iso' || !isDateValue(date)) {
    return date
  }
  const at = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(at.getTime())
    ? date
    : new Intl.DateTimeFormat(calendarLocale(language, calendar) || undefined, {
        dateStyle: style,
        timeZone: 'UTC',
      }).format(at)
}

/** How a date field tells, writes, and reads back one date. */
export const dateKind = (
  style: DateStyle,
  language: string,
  calendar: string | undefined,
): PickerKind => ({
  read: (text) =>
    isDateValue(text)
      ? text
      : readWrittenDate(text, dateSegmentLocale(language, calendar), dateSegmentSystem(calendar)),
  whole: isDateValue,
  written: (one) => writtenDate(one, style, language, calendar),
})

/**
 * The dates a committed text names, written: a range written with a dash keeps
 * the commas inside each end, as in `Aug 4, 2026 – Aug 11, 2026`, and one date
 * is the whole text, as en-US writes it.
 */
export const committedDates = (mode: PickerMode, value: string): string[] => {
  if (mode === 'single') {
    return [value.trim()].filter(Boolean)
  }
  return mode === 'range' && /\s[–-]\s/.test(value)
    ? value.split(/\s+[–-]\s+/).map((one) => one.trim())
    : heldValues(value)
}

/** What a date field's messages say, each a sentence its prop holds. */
export interface DateFaultWords {
  readonly bad: () => string
  readonly order: (start: string) => string
  readonly over: (max: string) => string
  readonly length: string
  readonly step: string
  readonly under: (min: string) => string
  readonly unavailable: string
}

/**
 * What is wrong with the dates a field holds: the empty string where nothing
 * is, a message alone for a fault with no flag of its own, or a flag a native
 * date input sets and its message. Bounds compare as strings, since ISO dates
 * sort lexically. A date the calendar bars by name is `badInput`, React Aria's
 * choice, there being no native flag for one.
 */
export const dateFault = (
  mode: PickerMode,
  value: string,
  rules: DateRules,
  words: DateFaultWords,
): string | readonly ['rangeOverflow' | 'rangeUnderflow' | 'stepMismatch', string] => {
  const held = heldValues(value)
  if (held.length > 0 && !held.every(isDateValue)) {
    return words.bad()
  }
  if (rules.min !== '' && held.some((one) => one < rules.min)) {
    return ['rangeUnderflow', words.under(rules.min)]
  }
  if (rules.max !== '' && held.some((one) => one > rules.max)) {
    return ['rangeOverflow', words.over(rules.max)]
  }
  const why = held.map((one) => {
    const date = valueAsDate(one)
    return date ? barredBy(date, rules) : null
  })
  if (why.includes('listed')) {
    return words.unavailable
  }
  if (why.includes('step')) {
    return ['stepMismatch', words.step]
  }
  if (mode === 'range' && held.length > 2) {
    return words.length
  }
  /* An end before its start, as Date Picker reports one: `rangeUnderflow`,
     since the end is under the bound its start sets. */
  const [start, end] = held
  if (mode === 'range' && start !== undefined && end !== undefined && end < start) {
    return ['rangeUnderflow', words.order(start)]
  }
  return ''
}
