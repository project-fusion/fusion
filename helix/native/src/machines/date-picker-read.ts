/**
 * What a phone's month calendar reads of its props at one draw: its locale and
 * calendar, the rules that bar dates, and the month and the view it shows.
 */

import {
  type CalendarFormats,
  type CalendarView,
  calendarFormats,
  calendarLocale,
  commaList,
  type DateMode,
  type DateRules,
  type MonthSystem,
  monthSystem,
  todayIn,
  valueAsDate,
  weekendOf,
  weekStartOf,
} from '@fusion.dev/helix-core/calendar'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { useRef, useState } from 'react'

export const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A prop's name as the form writes it, from its camelCase name. */
export const kebab = (name: string): string =>
  name.replace(/[A-Z]/g, (one) => `-${one.toLowerCase()}`)

/** A number a prop holds, written as one or as its words. */
export const numberIn = (value: unknown): number | undefined => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined
}

/** Words a prop holds until the reader moves them, and holds again as the prop changes. */
export const useHeldWords = (asked: unknown, start: string | undefined) => {
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  return [own ?? (typeof asked === 'string' ? asked : start), setOwn] as const
}

/** The day the week starts on: `first-day-of-week`, or the locale's, Sunday where none is named. */
const weekStartFor = (first: number | undefined, named: string): number => {
  if (first !== undefined) {
    return ((Math.floor(first) % 7) + 7) % 7
  }
  return named === '' ? 0 : weekStartOf(named)
}

/** A view the calendar can show, the days where the words name none. */
export const viewOf = (view: string | undefined): CalendarView =>
  view === 'month' || view === 'year' ? view : 'day'

/** What the calendar reads of its props, whatever it holds. */
export interface CalendarProps {
  readonly count: number
  readonly defaultMonth: string
  readonly disabled: boolean
  readonly formats: CalendarFormats
  readonly lang: string
  readonly maxView: 'month' | 'year' | undefined
  readonly mode: DateMode
  readonly readOnly: boolean
  readonly rules: DateRules
  readonly system: MonthSystem
  readonly today: string
  readonly weekend: readonly number[]
  readonly weekStart: number
}

/** Reads the props, `read` taking each by its camelCase name. */
export const readCalendar = (read: (name: string) => unknown): CalendarProps => {
  const named = wordsIn(read('locale'))
  const calendar = wordsIn(read('calendar'))
  const lang = calendarLocale(named || locale().read(), calendar)
  const mode = wordsIn(read('mode'))
  const maxView = wordsIn(read('maxView'))
  return {
    count: Math.max(1, Math.floor(numberIn(read('months')) ?? 1) || 1),
    defaultMonth: wordsIn(read('defaultMonth')),
    disabled: read('disabled') === true,
    formats: calendarFormats(lang),
    lang,
    maxView: maxView === 'month' || maxView === 'year' ? maxView : undefined,
    mode: mode === 'multiple' || mode === 'range' ? mode : undefined,
    readOnly: read('readonly') === true,
    rules: {
      disableDates: wordsIn(read('disableDates')),
      disableDays: wordsIn(read('disableDays')),
      isDateUnavailable: read('isDateUnavailable') as ((date: string) => boolean) | undefined,
      max: wordsIn(read('max')),
      min: wordsIn(read('min')),
      step: numberIn(read('step')) ?? 1,
    },
    system: monthSystem(calendar),
    today: todayIn(wordsIn(read('timeZone'))),
    weekend: named === '' ? [0, 6] : weekendOf(named),
    weekStart: weekStartFor(numberIn(read('firstDayOfWeek')), named),
  }
}

/** The month the calendar opens on with nothing naming one: the first chosen date's, then today's. */
export const derivedMonth = (props: CalendarProps, value: string): Date =>
  props.system.start(
    valueAsDate(commaList(value)[0] ?? '') ?? valueAsDate(props.today) ?? new Date(),
  )
