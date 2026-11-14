/**
 * What a press does on a phone's month calendar: a day chosen as the mode
 * allows, once `before-change` stands, then `input` and `change`; a month shown
 * once `before-navigate` stands, then `navigate`; and the heading and the
 * controls that step through the months and the years.
 */
import {
  type CalendarView,
  chooseDate,
  dateBarred,
  nearestOpenMonth,
  valueAsDate,
  YEARS_SHOWN,
  yearOut,
} from '@fusion.dev/helix-core/calendar'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { type CalendarNow, lastPage } from './date-picker-model'
import type { CalendarProps } from './date-picker-read'
import { boundTo, tell, told } from './props'

/** What the calendar holds, and how each part of it moves. */
export interface CalendarHeld {
  readonly current: string
  readonly held: readonly string[]
  readonly setFocused: (iso: string) => void
  readonly setMonth: (month: string) => void
  readonly setPageYear: (year: number | undefined) => void
  readonly setPeriodFocus: (at: number | undefined) => void
  readonly setTouched: (touched: boolean) => void
  readonly setValue: (value: string) => void
  readonly setView: (view: CalendarView) => void
}

/** What the moves read at one draw. */
export interface MovesNow {
  readonly family: Family
  readonly held: CalendarHeld
  readonly now: CalendarNow
  readonly props: Props
  readonly read: CalendarProps
  readonly use: MachineUse
}

/** The month moves only once `before-navigate` stands, and says so after. */
const shows =
  ({ family, held, props, read, use }: MovesNow) =>
  (date: Date): boolean => {
    const next = read.system.key(date)
    if (read.disabled || next === held.current) {
      return next === held.current
    }
    const before = boundTo(use, 'onBeforeNavigate', 'event')
    if (before !== undefined && !tell(family, props, before, { value: next })) {
      return false
    }
    held.setMonth(next)
    const after = boundTo(use, 'onNavigate', 'event')
    if (after !== undefined) {
      tell(family, props, after, { value: next })
    }
    return true
  }

/** Says `input` and `change` for the dates a press left. */
const tellEdited = ({ family, props, use }: MovesNow, value: string): void => {
  for (const name of [boundTo(use, 'onInput', 'event'), boundTo(use, 'onChange', 'event')]) {
    if (name !== undefined) {
      told(family, props, name, {}, { value })
    }
  }
}

/** A press on a day chooses as the mode allows, once `before-change` stands. */
const chooses =
  ({ family, held, props, read, use }: MovesNow) =>
  (iso: string): void => {
    const date = valueAsDate(iso)
    if (read.disabled || date === null || dateBarred(date, read.rules)) {
      return
    }
    held.setFocused(iso)
    if (read.readOnly) {
      return
    }
    const next = chooseDate(read.mode, held.held, iso).join(',')
    const before = boundTo(use, 'onBeforeChange', 'event')
    if (before !== undefined && !tell(family, props, before, { value: next })) {
      return
    }
    held.setValue(next)
    held.setTouched(true)
    tellEdited({ family, held, props, read, use } as MovesNow, next)
  }

/** The heading steps back from the days to the months, and from the months to the years. */
const steps =
  ({ held, now, read }: MovesNow) =>
  (): void => {
    if (read.disabled) {
      return
    }
    if (now.view === 'day') {
      const { month, year } = read.system.parts(now.shown)
      held.setPageYear(year)
      held.setPeriodFocus(month - 1)
      held.setView('month')
    } else if (now.view === 'month' && now.maxView === 'year') {
      held.setPeriodFocus(now.periodYear)
      held.setView('year')
    }
  }

/** A year shows its months, and a month its days, moving the calendar there. */
const choosesPeriod = (moves: MovesNow, show: (date: Date) => boolean) => (at: number) => {
  const { held, now, read } = moves
  if (read.disabled) {
    return
  }
  if (now.view === 'year') {
    if (yearOut(at, read.rules.min, read.rules.max, read.system)) {
      return
    }
    const month = read.system.parts(now.shown).month - 1
    held.setPageYear(at)
    held.setPeriodFocus(nearestOpenMonth(at, month, read.rules.min, read.rules.max, read.system))
    held.setView('month')
    return
  }
  if (!show(read.system.from(now.periodYear, at + 1, 1))) {
    return
  }
  held.setPageYear(undefined)
  held.setPeriodFocus(undefined)
  held.setFocused('')
  held.setView('day')
}

/** Previous and Next: a month, a year, or a page of years, unless it lies wholly outside the bounds. */
const turns = (moves: MovesNow, show: (date: Date) => boolean) => (direction: -1 | 1) => {
  const { now, read } = moves
  if (now.view !== 'day') {
    turnPeriods(moves, direction)
  } else if (!(direction < 0 ? now.atStart : now.atEnd)) {
    show(read.system.add(now.shown, direction))
  }
}

/** Moves the months a year, or the years a page, unless it is the last. */
const turnPeriods = ({ held, now }: MovesNow, direction: -1 | 1): void => {
  if (lastPage(now, direction)) {
    return
  }
  const by = now.view === 'year' ? YEARS_SHOWN : 1
  held.setPageYear(now.periodYear + direction * by)
  if (now.view === 'year') {
    held.setPeriodFocus(now.periodStop + direction * by)
  }
}

/** Every press the calendar answers. */
export const calendarMoves = (moves: MovesNow) => {
  const show = shows(moves)
  return {
    choose: chooses(moves),
    choosePeriod: choosesPeriod(moves, show),
    heading: steps(moves),
    turn: turns(moves, show),
  }
}
