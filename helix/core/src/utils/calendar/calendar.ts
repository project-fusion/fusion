import { valueAsDate as asDate, dateAsValue as fromDate, utcDate } from '../value-as/value-as.js'
import { writtenList } from '../written-list/written-list.js'

/*
 * The calendar arithmetic Date Picker and Date Input share: days and months in
 * UTC, the week a locale starts on, which dates are barred, and the pages of
 * months and years the month and year views show. Format Date takes the
 * calendar they write dates in from here too.
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
 * Today in a time zone, such as `America/New_York`, as `YYYY-MM-DD`: the
 * reader's own where `timeZone` is empty, as `localToday` reads it. A zone
 * `Intl` does not know is read as the reader's own too.
 */
export const todayIn = (timeZone = '', now = new Date()): string => {
  if (timeZone === '') {
    return localToday(now)
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    }).formatToParts(now)
    const part = (type: string): string => parts.find((one) => one.type === type)?.value ?? ''
    return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`
  } catch {
    return localToday(now)
  }
}

/**
 * The days of the weekend where a language is spoken, `0` for Sunday.
 *
 * From `Intl.Locale`'s week information, as `weekStartOf` reads it: Friday and
 * Saturday in `ar-EG`, Sunday alone in `hi-IN`. Saturday and Sunday where the
 * engine offers none.
 */
export const weekendOf = (locale: string): number[] => {
  try {
    const tag = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { weekend: number[] }
      weekInfo?: { weekend: number[] }
    }
    const days = tag.getWeekInfo?.().weekend ?? tag.weekInfo?.weekend
    return days === undefined ? [0, 6] : days.map((day) => day % 7)
  } catch {
    return [0, 6]
  }
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

/**
 * The calendars a date family draws and writes: those whose months are the
 * Gregorian months, so a grid of Gregorian days is one of their months.
 *
 * `buddhist` is Thailand's (2569 for 2026), `japanese` the Japanese eras
 * (Reiwa 8), and `roc` Taiwan's Minguo years (115). They differ from
 * `gregory` in the year alone, and `iso8601` in the order the parts are
 * written.
 */
export type DateCalendar = 'buddhist' | 'gregory' | 'iso8601' | 'japanese' | 'roc'

const DRAWN: readonly string[] = ['buddhist', 'gregory', 'iso8601', 'japanese', 'roc']

const tagged = new Map<string, string>()

/**
 * The language tag a date family formats with: `locale`, with the calendar it
 * writes dates in.
 *
 * That is `calendar` where it is one of the five `DateCalendar` names, then
 * the locale's own calendar where its months are the Gregorian months, then
 * `gregory`. **A calendar with months of its own, such as `persian` for `fa-IR`
 * or `islamic-umalqura` for `ar-SA` in some engines, is written as `gregory`.**
 * The arithmetic is Gregorian, so a heading in Mehr 1405 over the days of
 * October 2026 named a month the grid did not show.
 *
 * `locale` unchanged where nothing moves, so a page in a Gregorian locale
 * formats exactly as it did. Empty is the runtime's own locale. A tag `Intl`
 * refuses throws, as every formatter given one does. Remembered per locale and
 * calendar, since reading a locale's calendar builds a formatter.
 */
export const calendarLocale = (locale: string, calendar = ''): string => {
  const key = `${locale} ${calendar}`
  let tag = tagged.get(key)
  if (tag === undefined) {
    const own = new Intl.DateTimeFormat(locale || undefined).resolvedOptions()
    const wanted = DRAWN.includes(calendar)
      ? calendar
      : DRAWN.includes(own.calendar)
        ? ''
        : 'gregory'
    tag = wanted ? `${new Intl.Locale(locale || own.locale, { calendar: wanted })}` : locale
    tagged.set(key, tag)
  }
  return tag
}

/** A month as `YYYY-MM`. */
export const monthOf = (date: Date): string =>
  `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

/** A date some days away, which may be negative, at midnight UTC. */
export const addDays = (date: Date, days: number): Date =>
  utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days)

/** Whether two dates fall in the same month of the same year. */
export const sameMonth = (left: Date, right: Date): boolean =>
  left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth()

/**
 * A date some months away, clamped, so the last of a long month lands on the
 * last of a short one instead of rolling into the month after it.
 */
export const addMonths = (date: Date, months: number): Date => {
  const target = utcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  const last = utcDate(target.getUTCFullYear(), target.getUTCMonth() + 1, 0).getUTCDate()
  return utcDate(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), last))
}

/**
 * The calendars Date Picker draws with months of their own, when `calendar`
 * names one: the months of the year in Iran, Israel, Saudi Arabia, Ethiopia,
 * Egypt's Coptic church, and India's national calendar. React Aria's
 * `createCalendar` offers the same set.
 */
export type MonthCalendar =
  | 'coptic'
  | 'ethiopic'
  | 'hebrew'
  | 'indian'
  | 'islamic-civil'
  | 'islamic-umalqura'
  | 'persian'

/** The `MonthCalendar` names, for a check at run time. */
export const MONTH_CALENDARS: readonly string[] = [
  'coptic',
  'ethiopic',
  'hebrew',
  'indian',
  'islamic-civil',
  'islamic-umalqura',
  'persian',
]

/**
 * The months of a calendar, as Date Picker pages through them. Every date is
 * still a Gregorian `Date` at midnight UTC, and a month is the run of days
 * from its first.
 */
export interface MonthSystem {
  /** A date some months away, its day kept where the month is long enough. */
  add(date: Date, months: number): Date
  /** The day of its month, from 1. */
  day(date: Date): number
  /** The month a date is in, as `month` writes it: `YYYY-MM`, or its first day where the months are the calendar's own. */
  key(date: Date): string
  /** Whether two dates fall in one month. */
  same(left: Date, right: Date): boolean
  /** The first day of the month a date is in. */
  start(date: Date): Date
}

/** The Gregorian months, which the five `DateCalendar` names share. */
const GREGORIAN: MonthSystem = {
  add: (date, months) => addMonths(date, months),
  day: (date) => date.getUTCDate(),
  key: (date) => monthOf(date),
  same: (left, right) => sameMonth(left, right),
  start: (date) => utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1),
}

/**
 * A calendar's months read from `Intl`: the day of the month each date has
 * there, and nothing else, since a month is the run of days from a first.
 * The leap months of the Hebrew year and Ethiopia's five-day thirteenth month
 * come out of that with no table.
 */
const intlMonths = (calendar: MonthCalendar): MonthSystem => {
  const format = new Intl.DateTimeFormat(`en-u-ca-${calendar}-nu-latn`, {
    day: 'numeric',
    timeZone: 'UTC',
  })
  const days = new Map<number, number>()
  const day = (date: Date): number => {
    const at = date.getTime()
    let found = days.get(at)
    if (found === undefined) {
      found = Number(format.formatToParts(date).find((part) => part.type === 'day')?.value)
      if (days.size > 4000) {
        days.clear()
      }
      days.set(at, found)
    }
    return found
  }
  const start = (date: Date): Date => addDays(date, 1 - day(date))
  /* The days in the month that starts at `first`: the first day after it
     that is a first. Most months run 29 to 31 days, so those are tried
     before the short ones. */
  const length = (first: Date): number => {
    for (const count of [29, 30, 31, 28, 32]) {
      if (day(addDays(first, count)) === 1 && day(addDays(first, count - 1)) === count) {
        return count
      }
    }
    for (let count = 1; count < 28; count += 1) {
      if (day(addDays(first, count)) === 1) {
        return count
      }
    }
    return 30
  }
  return {
    add: (date, months) => {
      let first = start(date)
      for (let step = 0; step < Math.abs(months); step += 1) {
        first = months > 0 ? addDays(first, length(first)) : start(addDays(first, -1))
      }
      return addDays(first, Math.min(day(date), length(first)) - 1)
    },
    day,
    key: (date) => fromDate(start(date)),
    same: (left, right) => start(left).getTime() === start(right).getTime(),
    start,
  }
}

const systems = new Map<string, MonthSystem>()

/**
 * The months a calendar pages through: its own for a `MonthCalendar` name,
 * and the Gregorian months for every other.
 */
export const monthSystem = (calendar = ''): MonthSystem => {
  if (!MONTH_CALENDARS.includes(calendar)) {
    return GREGORIAN
  }
  let system = systems.get(calendar)
  if (system === undefined) {
    system = intlMonths(calendar as MonthCalendar)
    systems.set(calendar, system)
  }
  return system
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
    const first = utcDate(years ? at : start, years ? 0 : index, 1)
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
