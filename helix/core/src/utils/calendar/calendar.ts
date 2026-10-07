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
 * That is `calendar` where it names a `DateCalendar` or a `MonthCalendar`,
 * then the locale's own calendar where its months are the Gregorian months,
 * then `gregory`. **A calendar with months of its own that only the locale
 * names, such as `persian` for `fa-IR` or `islamic-umalqura` for `ar-SA` in
 * some engines, is written as `gregory`**, so a page that asked for no other
 * calendar keeps the Gregorian dates it had. Before the date families drew
 * such a calendar's own months, a heading in Mehr 1405 over the days of
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
    const wanted =
      DRAWN.includes(calendar) || MONTH_CALENDARS.includes(calendar)
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
 * The calendars the date families draw with months of their own, when
 * `calendar` names one: the months of the year in Iran, Israel, the Islamic
 * calendars, Ethiopia, Egypt's Coptic church, India's national calendar, and
 * the Chinese and Korean lunisolar calendars. Every calendar `Intl` knows
 * whose months are not the Gregorian months.
 */
export type MonthCalendar =
  | 'chinese'
  | 'coptic'
  | 'dangi'
  | 'ethioaa'
  | 'ethiopic'
  | 'hebrew'
  | 'indian'
  | 'islamic'
  | 'islamic-civil'
  | 'islamic-rgsa'
  | 'islamic-tbla'
  | 'islamic-umalqura'
  | 'persian'

/** The `MonthCalendar` names, for a check at run time. */
export const MONTH_CALENDARS: readonly string[] = [
  'chinese',
  'coptic',
  'dangi',
  'ethioaa',
  'ethiopic',
  'hebrew',
  'indian',
  'islamic',
  'islamic-civil',
  'islamic-rgsa',
  'islamic-tbla',
  'islamic-umalqura',
  'persian',
]

/** A date as a calendar counts it: its year, its month from 1, and its day from 1. */
export interface CalendarParts {
  day: number
  month: number
  year: number
}

/**
 * The days, months, and years of a calendar, as the date families page and
 * edit them. Every date is still a Gregorian `Date` at midnight UTC, and a
 * month is the run of days from its first.
 */
export interface MonthSystem {
  /** A date some months away, its day kept where the month is long enough. */
  add(date: Date, months: number): Date
  /**
   * A date some years away: the month of the same name where the year has
   * one, so Nisan stays Nisan across a Hebrew leap year, and the day kept
   * where the month is long enough.
   */
  addYears(date: Date, years: number): Date
  /** The day of its month, from 1. */
  day(date: Date): number
  /** How many days a month of a year has. */
  days(year: number, month: number): number
  /** The date of a year, month, and day, the month and the day kept inside the year and the month. */
  from(year: number, month: number, day: number): Date
  /** The month a date is in, as `month` writes it: `YYYY-MM`, or its first day where the months are the calendar's own. */
  key(date: Date): string
  /** How many months a year has: 12, or 13 in a Hebrew leap year, in Ethiopia, and in a Chinese leap year. */
  months(year: number): number
  /** A date's year, month, and day, as the calendar counts them. */
  parts(date: Date): CalendarParts
  /** Whether two dates fall in one month. */
  same(left: Date, right: Date): boolean
  /** The first day of the month a date is in. */
  start(date: Date): Date
}

/** The days in a Gregorian month, `month` from 1. */
const gregorianDays = (year: number, month: number): number => utcDate(year, month, 0).getUTCDate()

/** The Gregorian months, which the five `DateCalendar` names share. */
const GREGORIAN: MonthSystem = {
  add: (date, months) => addMonths(date, months),
  addYears: (date, years) => addMonths(date, years * 12),
  day: (date) => date.getUTCDate(),
  days: gregorianDays,
  from: (year, month, day) => {
    const kept = Math.min(12, Math.max(1, month))
    return utcDate(year, kept - 1, Math.min(Math.max(1, day), gregorianDays(year, kept)))
  },
  key: (date) => monthOf(date),
  months: () => 12,
  parts: (date) => ({
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  }),
  same: (left, right) => sameMonth(left, right),
  start: (date) => utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1),
}

/**
 * A calendar's days, months, and years read from `Intl`: the year and the
 * day of the month each date has there, and nothing else. A month is the run
 * of days from a first, and a year the run of months that share its number,
 * so the leap months of the Hebrew and Chinese years and Ethiopia's five-day
 * thirteenth month come out of it with no table. The Chinese and Korean
 * years are counted by their Gregorian year, which `Intl` gives as
 * `relatedYear`.
 */
const intlMonths = (calendar: MonthCalendar): MonthSystem => {
  const tag = `en-u-ca-${calendar}-nu-latn`
  const format = new Intl.DateTimeFormat(tag, { day: 'numeric', timeZone: 'UTC', year: 'numeric' })
  const named = new Intl.DateTimeFormat(tag, { month: 'long', timeZone: 'UTC' })
  const read = new Map<number, [number, number]>()
  /* A date's year and day, remembered, since every question below asks them
     of the same few hundred dates. */
  const at = (date: Date): [number, number] => {
    const time = date.getTime()
    let found = read.get(time)
    if (found === undefined) {
      const parts = format.formatToParts(date)
      const part = (type: string): number =>
        Number(parts.find((one) => (one.type as string) === type)?.value)
      const year = part('relatedYear')
      found = [Number.isNaN(year) ? part('year') : year, part('day')]
      /* A day an engine cannot name is the day after the one before it. The
         ICU in Bun writes the last day of some Chinese months as day 0, where
         Chromium writes 30. */
      if (!(found[1] >= 1)) {
        found[1] = at(addDays(date, -1))[1] + 1
      }
      if (read.size > 4000) {
        read.clear()
      }
      read.set(time, found)
    }
    return found
  }
  const day = (date: Date): number => at(date)[1]
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
  /* How many days a year runs, on average, which puts a guess at a year's
     middle close enough that a few steps find it. */
  const anchor = start(utcDate(2000, 0, 1))
  const anchorYear = at(anchor)[0]
  const span = 36_525 / (at(utcDate(2100, 0, 1))[0] - anchorYear)
  const years = new Map<number, Date[]>()
  /* The first day of each month of a year. */
  const firsts = (year: number): Date[] => {
    let found = years.get(year)
    if (found !== undefined) {
      return found
    }
    let probe = addDays(anchor, Math.round((year - anchorYear + 0.5) * span))
    for (let step = 0; step < 60 && at(probe)[0] !== year; step += 1) {
      probe = addDays(probe, (year - at(probe)[0]) * 20)
    }
    let first = start(probe)
    while (at(addDays(first, -1))[0] === year) {
      const earlier = start(addDays(first, -1))
      if (earlier.getTime() >= first.getTime()) {
        break
      }
      first = earlier
    }
    found = []
    while (at(first)[0] === year && found.length < 14) {
      found.push(first)
      first = addDays(first, length(first))
    }
    if (years.size > 400) {
      years.clear()
    }
    years.set(year, found)
    return found
  }
  const months = (year: number): number => Math.max(1, firsts(year).length)
  const firstOf = (year: number, month: number): Date =>
    firsts(year)[Math.min(months(year), Math.max(1, month)) - 1] ?? anchor
  const days = (year: number, month: number): number => length(firstOf(year, month))
  const from = (year: number, month: number, wanted: number): Date => {
    const first = firstOf(year, month)
    return addDays(first, Math.min(Math.max(1, wanted), length(first)) - 1)
  }
  const parts = (date: Date): CalendarParts => {
    const [year, dayOf] = at(date)
    const all = firsts(year)
    let month = all.length
    while (month > 1 && (all[month - 1] as Date).getTime() > date.getTime()) {
      month -= 1
    }
    return { day: dayOf, month, year }
  }
  return {
    add: (date, count) => {
      let first = start(date)
      for (let step = 0; step < Math.abs(count); step += 1) {
        first = count > 0 ? addDays(first, length(first)) : start(addDays(first, -1))
      }
      return addDays(first, Math.min(day(date), length(first)) - 1)
    },
    addYears: (date, count) => {
      const { day: dayOf, month, year } = parts(date)
      const name = named.format(firstOf(year, month))
      const names = firsts(year + count).map((first) => named.format(first))
      /* The month of that name, then one whose name holds it, as Adar II
         holds Adar, then the month in the same place. */
      let index = names.indexOf(name)
      if (index < 0) {
        index = names.findLastIndex((one) => one.startsWith(name) || name.startsWith(one))
      }
      return from(year + count, index < 0 ? month : index + 1, dayOf)
    },
    day,
    days,
    from,
    key: (date) => fromDate(start(date)),
    months,
    parts,
    same: (left, right) => start(left).getTime() === start(right).getTime(),
    start,
  }
}

const systems = new Map<string, MonthSystem>()

/**
 * The days, months, and years a calendar pages through: its own for a
 * `MonthCalendar` name, and the Gregorian months for every other.
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
export const monthOut = (first: Date, min: string, max: string, system = GREGORIAN): boolean =>
  (min !== '' && fromDate(addDays(system.add(first, 1), -1)) < min) ||
  (max !== '' && fromDate(first) > max)

/** Whether a year lies wholly outside `min` and `max`, either of which may be empty. */
export const yearOut = (year: number, min: string, max: string, system = GREGORIAN): boolean =>
  (min !== '' && fromDate(addDays(system.from(year + 1, 1, 1), -1)) < min) ||
  (max !== '' && fromDate(system.from(year, 1, 1)) > max)

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
  /** The calendar the months and the years are counted in, Gregorian where none is given. */
  system?: MonthSystem | undefined
  /** Today, as `YYYY-MM-DD`. */
  today: string
  /** Which view: `month` for the months of a year, `year` for a page of years. */
  view: 'month' | 'year'
}

/**
 * The cells of the months or the years view, in reading order: the months of
 * `page`, twelve or the thirteen a calendar's year may have, or the twelve
 * years on the page that holds it.
 */
export const periodCells = ({
  max,
  min,
  page,
  shown,
  system = GREGORIAN,
  today,
  view,
}: PeriodPage): PeriodCell[] => {
  const years = view === 'year'
  const now = asDate(today)
  const held = system.parts(shown).year
  const count = years ? YEARS_SHOWN : system.months(page)
  const startYear = years ? yearPageOf(page) : page
  return Array.from({ length: count }, (_, index) => {
    const at = years ? startYear + index : index
    const first = years ? system.from(at, 1, 1) : system.from(page, index + 1, 1)
    return {
      at,
      chosen: years ? at === held : system.same(first, shown),
      current: now !== null && (years ? system.parts(now).year === at : system.same(first, now)),
      first,
      out: years ? yearOut(at, min, max, system) : monthOut(first, min, max, system),
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
 * or the last, and a move off a page of years turns the page. `months` says
 * how many months a year has, twelve where it is not given. The page keys
 * move the months a year, to the month in the same place.
 */
export const periodKey = (
  view: 'month' | 'year',
  stop: number,
  year: number,
  key: string,
  along: number,
  months: (year: number) => number = () => 12,
): { focus: number; pageYear: number } | null => {
  const index = view === 'year' ? stop - yearPageOf(stop) : stop
  const delta = periodMove(key, index, along)
  if (delta === null) {
    return null
  }
  if (view === 'year') {
    return { focus: stop + delta, pageYear: stop + delta }
  }
  if (key === 'PageUp' || key === 'PageDown') {
    const to = year + Math.sign(delta)
    return { focus: Math.min(stop, months(to) - 1), pageYear: to }
  }
  let at = stop + delta
  let on = year
  while (at < 0) {
    on -= 1
    at += months(on)
  }
  while (at >= months(on)) {
    at -= months(on)
    on += 1
  }
  return { focus: at, pageYear: on }
}
