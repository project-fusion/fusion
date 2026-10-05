import { valueAsDate as asDate, dateAsValue as fromDate } from '../value-as/value-as.js'
import { writtenList } from '../written-list/written-list.js'

/*
 * The calendar arithmetic Date Picker and Date Input share: days and months in
 * UTC, the week a locale starts on, which dates are barred, and the pages of
 * months and years the month and year views show.
 *
 * **Every date is midnight UTC**, because a local-time `Date` shifts across a
 * time zone or a daylight-saving boundary, and a date is the same date
 * everywhere.
 */

/**
 * Today, in the reader's own timezone.
 *
 * **`toISOString` converts to UTC first, which makes "today" a different day
 * for most of the planet.** Anywhere west of UTC, from late afternoon onward,
 * `fromDate(new Date())` names tomorrow. The parts are read locally instead and
 * pasted together, which is the only way to get a calendar date out of a `Date`
 * without a conversion happening on the way.
 */
export const localToday = (now = new Date()): string => {
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * The first day of the week where a language is spoken, `0` for Sunday.
 *
 * From `Intl.Locale`'s week information, which an engine offers as
 * `getWeekInfo()` or, in older versions, as `weekInfo`. Sunday where it offers
 * neither, as Firefox does not, or where the tag cannot be read.
 */
export const weekStartOf = (locale: string): number => {
  try {
    const tag = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const first = tag.getWeekInfo?.().firstDay ?? tag.weekInfo?.firstDay
    return first === undefined ? 0 : first % 7
  } catch {
    return 0
  }
}

/** A month as `YYYY-MM`. */
export const monthOf = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

/** A date some days away, which may be negative, at midnight UTC. */
export const addDays = (date: Date, days: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))

/** Whether two dates fall in the same month of the same year. */
export const sameMonth = (left: Date, right: Date): boolean =>
  left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth()

/**
 * A date some months away, clamped, so the last of a long month lands on the
 * last of a short one instead of rolling into the month after it.
 */
export const addMonths = (date: Date, months: number): Date => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), last)),
  )
}

/** What bars a date, besides `min` and `max`. */
export interface Barring {
  /** Dates as `YYYY-MM-DD`, separated by commas or spaces. */
  disableDates: string
  /** Days of the week, `0` for Sunday, separated by commas or spaces. */
  disableDays: string
  /** A consumer's own rule, asked of each date. */
  isDateUnavailable?: ((date: string) => boolean) | undefined
  /** Where `step` counts from, or empty for 1 January 1970. */
  min: string
  /** How far apart the selectable dates are, in days. */
  step: number
}

/**
 * Why a date cannot be chosen, besides `min` and `max`, or `null` where it can.
 *
 * `listed` is a date the rules name: in `disable-dates`, on a day in
 * `disable-days`, or one `isDateUnavailable` refuses. `step` is a date `step`
 * skips, counted from `min` where there is one and from the epoch where there is
 * not, which is the platform's own base. Whole days, because both ends are
 * midnight UTC and neither carries a time.
 */
export const barredBy = (date: Date, rules: Barring): 'listed' | 'step' | null => {
  const iso = fromDate(date)
  if (
    writtenList(rules.disableDates).includes(iso) ||
    writtenList(rules.disableDays).includes(String(date.getUTCDay())) ||
    rules.isDateUnavailable?.(iso) === true
  ) {
    return 'listed'
  }
  const step = Math.max(1, Math.floor(rules.step) || 1)
  if (step > 1) {
    const base = rules.min === '' ? 0 : (asDate(rules.min)?.getTime() ?? 0)
    if (Math.round((date.getTime() - base) / 86_400_000) % step !== 0) {
      return 'step'
    }
  }
  return null
}

/** The views a calendar can show: the days of a month, the months of a year, or a page of years. */
export type CalendarView = 'day' | 'month' | 'year'

/** How many years the year view shows at once, in rows of three. */
export const YEARS_SHOWN = 12

/** The first year on the page of years that holds `year`. */
export const yearPageOf = (year: number): number => Math.floor(year / YEARS_SHOWN) * YEARS_SHOWN

/**
 * Where a key moves within the months of a year or a page of years, laid out
 * in rows of three, as an offset from `at`, the index on the page.
 *
 * `along` is which way the inline keys go, `1` or `-1`, or `0` for a key that
 * is not one. The vertical keys move a row, Home and End to the ends of a row,
 * and PageUp and PageDown a whole page. `null` is a key the grid leaves alone.
 */
export const periodMove = (key: string, at: number, along: number): number | null => {
  if (along !== 0) {
    return along
  }
  switch (key) {
    case 'ArrowUp':
      return -3
    case 'ArrowDown':
      return 3
    case 'Home':
      return -(at % 3)
    case 'End':
      return 2 - (at % 3)
    case 'PageUp':
      return -12
    case 'PageDown':
      return 12
    default:
      return null
  }
}

/** Whether a month, as its first day, lies wholly outside `min` and `max`, either of which may be empty. */
export const monthOut = (first: Date, min: string, max: string): boolean => {
  const month = monthOf(first)
  return (min !== '' && month < min.slice(0, 7)) || (max !== '' && month > max.slice(0, 7))
}

/** Whether a year lies wholly outside `min` and `max`, either of which may be empty. */
export const yearOut = (year: number, min: string, max: string): boolean =>
  (min !== '' && year < Number(min.slice(0, 4))) || (max !== '' && year > Number(max.slice(0, 4)))

/** One month or year in the months or the years view. */
export interface PeriodCell {
  /** The month's index in its year, or the year. */
  at: number
  /** Whether it is the month or year the calendar shows. */
  chosen: boolean
  /** Whether today falls in it. */
  current: boolean
  /** Its first day. */
  first: Date
  /** Whether it lies wholly outside `min` and `max`. */
  out: boolean
}

/** What the months or the years view is drawn from. */
export interface PeriodPage {
  /** The latest date, or empty. */
  max: string
  /** The earliest date, or empty. */
  min: string
  /** The year the months view is on, or any year on the page of years. */
  page: number
  /** The first of the month the calendar shows. */
  shown: Date
  /** Today, as `YYYY-MM-DD`. */
  today: string
  /** Which view: `month` for the months of a year, `year` for a page of years. */
  view: 'month' | 'year'
}

/**
 * The twelve cells of the months or the years view, in reading order: the
 * months of `page`, or the page of years that holds it.
 */
export const periodCells = ({ max, min, page, shown, today, view }: PeriodPage): PeriodCell[] => {
  const years = view === 'year'
  const start = years ? yearPageOf(page) : page
  return Array.from({ length: 12 }, (_, index) => {
    const at = years ? start + index : index
    const first = new Date(Date.UTC(years ? at : start, years ? 0 : index, 1))
    return {
      at,
      chosen: years ? at === shown.getUTCFullYear() : monthOf(first) === monthOf(shown),
      current: years ? String(at) === today.slice(0, 4) : monthOf(first) === today.slice(0, 7),
      first,
      out: years ? yearOut(at, min, max) : monthOut(first, min, max),
    }
  })
}

/**
 * Where a key takes the tab stop in the months or the years, or `null` for a
 * key the grid leaves alone.
 *
 * `stop` is the month's index or the year the stop is on, `year` the year the
 * months view shows, and `along` which way the inline keys go, as
 * `periodMove` takes it. A move off the months of one year lands in the next
 * or the last, and a move off a page of years turns the page.
 */
export const periodKey = (
  view: 'month' | 'year',
  stop: number,
  year: number,
  key: string,
  along: number,
): { focus: number; pageYear: number } | null => {
  const index = view === 'year' ? stop - yearPageOf(stop) : stop
  const delta = periodMove(key, index, along)
  if (delta === null) {
    return null
  }
  if (view === 'year') {
    return { focus: stop + delta, pageYear: stop + delta }
  }
  const months = year * 12 + stop + delta
  return { focus: ((months % 12) + 12) % 12, pageYear: Math.floor(months / 12) }
}
