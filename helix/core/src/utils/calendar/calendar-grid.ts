/**
 * A month calendar's days with no element in them: which dates a grid draws,
 * what each cell is, what a key and a press do to the dates chosen, and what
 * is wrong with them. Date Picker on the web and on a phone both read it.
 */
import { valueAsDate as asDate, dateAsValue as fromDate } from '../value-as/value-as.js'
import {
  addDays,
  addMonths,
  type Barring,
  barredBy,
  type MonthSystem,
  monthOut,
} from './calendar.js'

/** How many dates a calendar holds: one where unset, two for `range`, any number for `multiple`. */
export type DateMode = 'multiple' | 'range' | undefined

/** What bars a date: `min`, `max`, and the rules `barredBy` reads. */
export interface DateRules extends Barring {
  /** The latest date, or empty. */
  max: string
}

/** Whether a date is outside `min` and `max`, or barred by weekday, by name, or by `step`. */
export const dateBarred = (date: Date, rules: DateRules): boolean => {
  const iso = fromDate(date)
  if ((rules.min !== '' && iso < rules.min) || (rules.max !== '' && iso > rules.max)) {
    return true
  }
  return barredBy(date, rules) !== null
}

/** A date pulled inside `min` and `max`, so the keys stop at the bounds. */
export const clampDate = (date: Date, min: string, max: string): Date => {
  const iso = fromDate(date)
  const low = asDate(min)
  const high = asDate(max)
  if (low && iso < min) {
    return low
  }
  if (high && iso > max) {
    return high
  }
  return date
}

/** How far a date stands from the first day of its week. */
export const weekOffset = (date: Date, weekStart: number): number =>
  (date.getUTCDay() - weekStart + 7) % 7

/** Six weeks of dates from the week holding a month's first day, so a grid keeps one height. */
export const monthWeeks = (month: Date, weekStart: number): Date[][] => {
  const start = addDays(month, -weekOffset(month, weekStart))
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  )
}

/** A range's two ends in order, where the mode is `range` and two are held. */
export const dateRange = (mode: DateMode, selected: readonly string[]): [string, string] | null => {
  if (mode !== 'range' || selected.length < 2) {
    return null
  }
  const [first, second] = [selected[0] as string, selected[1] as string]
  return first <= second ? [first, second] : [second, first]
}

/** Whether a range holds its first end and waits for the second. */
export const rangePending = (mode: DateMode, selected: readonly string[]): boolean =>
  mode === 'range' && selected.length === 1

/** The range a grid draws, and whether it is a waiting range's preview. */
export interface DrawnRange {
  ends: [string, string]
  preview: boolean
}

/**
 * The range a grid draws: the chosen one, or, while one end waits for the
 * other, the run to the day under the pointer or the focus.
 */
export const drawnRange = (
  mode: DateMode,
  selected: readonly string[],
  toward: string,
): DrawnRange | null => {
  const range = dateRange(mode, selected)
  if (range) {
    return { ends: range, preview: false }
  }
  const start = selected[0]
  if (
    !rangePending(mode, selected) ||
    start === undefined ||
    toward === '' ||
    toward === start ||
    asDate(toward) === null
  ) {
    return null
  }
  return { ends: start <= toward ? [start, toward] : [toward, start], preview: true }
}

/** Whether a date is chosen: inside a whole range, or among the dates held. */
export const dateChosen = (iso: string, mode: DateMode, selected: readonly string[]): boolean => {
  const range = dateRange(mode, selected)
  return range ? iso >= range[0] && iso <= range[1] : selected.includes(iso)
}

/**
 * The dates a press on one leaves, as the mode allows: `range` starts over once
 * it holds two, `multiple` toggles, and one date is replaced.
 */
export const chooseDate = (mode: DateMode, held: readonly string[], iso: string): string[] => {
  if (mode === 'range') {
    return held.length === 1 ? [...held, iso].sort() : [iso]
  }
  if (mode === 'multiple') {
    return held.includes(iso) ? held.filter((one) => one !== iso) : [...held, iso].sort()
  }
  return [iso]
}

/**
 * Where a key takes the grid's tab stop, per the APG date grid, or `null` for
 * a key the grid leaves alone. `along` is which way the inline keys go, `1`,
 * `-1`, or `0` for a key that is not one. Shift with a page key moves a year,
 * to the month of the same name.
 */
export const dayKeyMove = (
  key: string,
  from: Date,
  along: number,
  shift: boolean,
  weekStart: number,
  system: MonthSystem,
): Date | null => {
  if (along !== 0) {
    return addDays(from, along)
  }
  switch (key) {
    case 'ArrowUp':
      return addDays(from, -7)
    case 'ArrowDown':
      return addDays(from, 7)
    case 'Home':
      return addDays(from, -weekOffset(from, weekStart))
    case 'End':
      return addDays(from, 6 - weekOffset(from, weekStart))
    case 'PageUp':
    case 'PageDown': {
      const step = key === 'PageUp' ? -1 : 1
      return shift ? system.addYears(from, step) : system.add(from, step)
    }
    default:
      return null
  }
}

/** What the grid's tab stop is chosen from. */
export interface AnchorFrom {
  focused: string
  rules: DateRules
  selected: readonly string[]
  shown: Date
  system: MonthSystem
  today: string
}

/**
 * The date the tab stop sits on, a date the grid draws: the last one focused,
 * then the first chosen, then today where it can be chosen, then the first day
 * of the month that can, and the month's first day where none can.
 */
export const calendarAnchor = ({
  focused,
  rules,
  selected,
  shown,
  system,
  today,
}: AnchorFrom): Date => {
  const now = asDate(today)
  for (const candidate of [
    asDate(focused),
    asDate(selected[0] ?? ''),
    now && !dateBarred(now, rules) ? now : null,
  ]) {
    if (candidate && system.same(candidate, shown)) {
      return candidate
    }
  }
  for (let day = shown; system.same(day, shown); day = addDays(day, 1)) {
    if (!dateBarred(day, rules)) {
      return day
    }
  }
  return shown
}

/** The first of a month at midnight UTC, with the year as written: year 1 is year 1. */
export const firstOfMonth = (year: number, month: number): Date =>
  addMonths(asDate('2000-01-01') as Date, (year - 2000) * 12 + month)

/**
 * The month a calendar shows from a month written as `YYYY-MM` or by its first
 * day, `YYYY-MM-DD`, or `undefined` where the words name none.
 */
export const writtenMonth = (written: string, system: MonthSystem): Date | undefined => {
  const explicit = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(written)
  if (!explicit) {
    return undefined
  }
  const first = firstOfMonth(Number(explicit[1]), Number(explicit[2]) - 1)
  return system.start(explicit[3] ? addDays(first, Number(explicit[3]) - 1) : first)
}

/** Whether the month before `shown` is wholly before `min`. */
export const calendarAtStart = (shown: Date, min: string): boolean =>
  asDate(min) !== null && fromDate(addDays(shown, -1)) < min

/** Whether the month after the `count` months from `shown` is wholly after `max`. */
export const calendarAtEnd = (
  shown: Date,
  count: number,
  max: string,
  system: MonthSystem,
): boolean => asDate(max) !== null && fromDate(system.start(system.add(shown, count))) > max

/**
 * The month a year's months view puts the stop on when a year is chosen: the
 * month in view where `min` and `max` leave it, and the nearest open one
 * otherwise, as React Aria keeps it.
 */
export const nearestOpenMonth = (
  year: number,
  month: number,
  min: string,
  max: string,
  system: MonthSystem,
): number => {
  const open = Array.from({ length: system.months(year) }, (_, index) => index).filter(
    (index) => !monthOut(system.from(year, index + 1, 1), min, max, system),
  )
  if (open.includes(month)) {
    return month
  }
  return (
    [...open].sort((left, right) => Math.abs(left - month) - Math.abs(right - month))[0] ?? month
  )
}

/** One day of a month's grid and every mark it carries. */
export interface DayCell {
  /** A day the rules bar, outside the bounds, by weekday, by name, or by `step`. */
  barred: boolean
  date: Date
  /** The last day of the range drawn. */
  end: boolean
  iso: string
  /** A day between the range's ends. */
  middle: boolean
  /** A day of a neighboring month, there to square the grid. */
  outside: boolean
  /** Part of a waiting range's preview. */
  preview: boolean
  /** Chosen, so `aria-selected`. */
  selected: boolean
  /** The solid mark: a chosen day that is no range's middle. */
  solid: boolean
  /** The first day of the range drawn. */
  start: boolean
  /** The grid's tab stop. */
  stop: boolean
  today: boolean
  weekend: boolean
}

/** What a month's grid is drawn from. */
export interface MonthGrid {
  anchor: string
  drawn: DrawnRange | null
  mode: DateMode
  month: Date
  rules: DateRules
  selected: readonly string[]
  system: MonthSystem
  today: string
  weekStart: number
  weekend: readonly number[]
}

/** A month's six weeks, each day with its marks. */
export const monthCells = (grid: MonthGrid): DayCell[][] => {
  const range = grid.drawn?.ends ?? null
  const preview = grid.drawn?.preview === true
  return monthWeeks(grid.month, grid.weekStart).map((week) =>
    week.map((date) => {
      const iso = fromDate(date)
      const outside = !grid.system.same(date, grid.month)
      const start = !outside && range !== null && iso === range[0]
      const end = !outside && range !== null && iso === range[1]
      const middle = !outside && range !== null && iso > range[0] && iso < range[1]
      const selected = !outside && dateChosen(iso, grid.mode, grid.selected)
      return {
        barred: dateBarred(date, grid.rules),
        date,
        end,
        iso,
        middle,
        outside,
        preview: preview && (start || middle || end),
        selected,
        solid: selected && !middle,
        start,
        stop: !outside && iso === grid.anchor,
        today: iso === grid.today,
        weekend: grid.weekend.includes(date.getUTCDay()),
      }
    }),
  )
}
