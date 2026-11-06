/**
 * A month calendar on a phone: the months on show, a press that chooses as the
 * mode allows, and the controls and the heading that move the view.
 *
 * **It holds its dates and its month, whoever set them**, and moves each through
 * a request a handler can refuse, as the web's does: `before-change` for the
 * dates, then `input` and `change`, and `before-navigate` for the month, then
 * `navigate`. Core says what each cell is and what a press does to the dates. The
 * new month and the chosen dates are said politely, as the web's live regions
 * say them.
 */

import {
  calendarAnchor,
  calendarAtEnd,
  calendarAtStart,
  commaList,
  dateAsValue,
  dateProblem,
  drawnRange,
  rangePending,
  selectionKind,
  valueAsDate,
  writtenMonth,
} from '@fusion.dev/helix-core/calendar'
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import {
  type CalendarNow,
  headingSteps,
  lastPage,
  monthRows,
  periodHeading,
  periodRows,
} from './date-picker-model'
import { calendarMoves } from './date-picker-moves'
import {
  type CalendarProps,
  derivedMonth,
  kebab,
  readCalendar,
  useHeldWords,
  viewOf,
  wordsIn,
} from './date-picker-read'
import { boundTo, given } from './props'

/** The words for the chosen dates, or nothing while none is chosen or one will not read. */
const selectionWords = (read: CalendarProps, label: string, held: readonly string[]): string => {
  if (held.length === 0 || held.some((one) => valueAsDate(one) === null)) {
    return ''
  }
  const kind = selectionKind(read.mode, held)
  const long = (iso: string | undefined) => read.formats.long.format(valueAsDate(iso ?? '') as Date)
  return formatMessage(
    label,
    { count: held.length, end: kind === 'range' ? long(held[1]) : '', kind, start: long(held[0]) },
    read.lang,
  )
}

/** Says the heading as the month moves, and the chosen dates as they change, as the web's live regions do. */
const useSaid = (heading: string, selection: string): void => {
  const said = useRef({ heading, selection })
  useEffect(() => {
    if (said.current.heading !== heading) {
      announce().say(heading, 'polite')
    } else if (said.current.selection !== selection && selection !== '') {
      announce().say(selection, 'polite')
    }
    said.current = { heading, selection }
  }, [heading, selection])
}

/** The values the parts read in the months and the years, by the names the form binds them to. */
const periodStates = (
  flag: (name: string) => string,
  words: (name: string) => string,
  now: CalendarNow,
): Readonly<Record<string, boolean | string>> => {
  const years = now.view === 'year'
  const periods = now.view !== 'day'
  const title = periodHeading(now)
  return {
    [flag('atEnd')]: (periods ? lastPage(now, 1) : now.atEnd) || now.disabled,
    [flag('atStart')]: (periods ? lastPage(now, -1) : now.atStart) || now.disabled,
    [flag('heading')]: title,
    [flag('headingLabel')]: formatMessage(words('yearViewLabel'), { heading: title }, now.lang),
    [flag('nextWords')]: words(years ? 'nextYearsLabel' : 'nextYearLabel'),
    [flag('periods')]: periods,
    [flag('previousWords')]: words(years ? 'previousYearsLabel' : 'previousYearLabel'),
    [flag('steps')]: headingSteps(now),
  }
}

/** What the calendar holds at one draw. */
interface Holding {
  readonly focused: string
  readonly held: readonly string[]
  readonly monthState: string | undefined
  readonly pageYear: number | undefined
  readonly periodFocus: number | undefined
  readonly view: string | undefined
}

/** The month on show, the stops, and everything the rows are drawn from. */
const calendarNow = (
  read: CalendarProps,
  words: (name: string) => string,
  { focused, held, monthState, pageYear, periodFocus, view }: Holding,
): { readonly derived: Date; readonly now: CalendarNow } => {
  const derived = derivedMonth(read, held.join(','))
  const shown = writtenMonth(monthState ?? read.defaultMonth, read.system) ?? derived
  const shownView = viewOf(view)
  const periodYear = pageYear ?? read.system.parts(shown).year
  const monthStop = Math.min(
    periodFocus ?? read.system.parts(shown).month - 1,
    read.system.months(periodYear) - 1,
  )
  const anchor = calendarAnchor({
    focused,
    rules: read.rules,
    selected: held,
    shown,
    system: read.system,
    today: read.today,
  })
  return {
    derived,
    now: {
      ...read,
      anchor: dateAsValue(anchor),
      atEnd: calendarAtEnd(shown, read.count, read.rules.max, read.system),
      atStart: calendarAtStart(shown, read.rules.min),
      drawn: drawnRange(read.mode, held, focused),
      max: read.rules.max,
      min: read.rules.min,
      monthViewLabel: words('monthViewLabel'),
      periodStop: shownView === 'year' ? (periodFocus ?? periodYear) : monthStop,
      periodYear,
      selected: held,
      shown,
      view: shownView,
      yearViewLabel: words('yearViewLabel'),
    },
  }
}

/** Whether the calendar is marked invalid: by the page, or by a fault, a missing date once the reader has answered. */
const markedOf = (
  readProp: (name: string) => unknown,
  read: CalendarProps,
  held: readonly string[],
  touched: boolean,
): boolean => {
  const problem = dateProblem({
    mode: read.mode,
    required: readProp('required') === true,
    rules: read.rules,
    selected: held,
  })
  if (readProp('invalid') === true || wordsIn(readProp('feedback')) !== '') {
    return true
  }
  return problem !== undefined && (problem[0] !== 'valueMissing' || touched)
}

/** Hosts a month calendar. */
export const useDatePicker = (family: Family, props: Props, use: MachineUse): Behavior => {
  const readProp = (name: string): unknown =>
    given(family, props, boundTo(use, name, 'prop') ?? kebab(name))
  const words = (name: string): string => wordsIn(readProp(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const read = readCalendar(readProp)
  const [value, setValue] = useHeldWords(props.value, words('defaultValue'))
  const [monthState, setMonth] = useHeldWords(props.month, undefined)
  const [view, setView] = useHeldWords(props.view, 'day')
  const [pageYear, setPageYear] = useState<number>()
  const [periodFocus, setPeriodFocus] = useState<number>()
  const [focused, setFocused] = useState('')
  const [touched, setTouched] = useState(false)
  const held = commaList(value ?? '')
  const { derived, now } = calendarNow(read, words, {
    focused,
    held,
    monthState,
    pageYear,
    periodFocus,
    view,
  })
  const { shown } = now
  const shownView = now.view
  const moves = calendarMoves({
    family,
    held: {
      current: monthState ?? (read.defaultMonth || read.system.key(derived)),
      held,
      setFocused,
      setMonth,
      setPageYear,
      setPeriodFocus,
      setTouched,
      setValue,
      setView,
    },
    now,
    props,
    read,
    use,
  })
  const selection = selectionWords(read, words('selectionLabel'), held)
  useSaid(shownView === 'day' ? read.formats.heading.format(shown) : periodHeading(now), selection)
  const marked = markedOf(readProp, read, held, touched)
  const periods = shownView !== 'day'
  return {
    marks: [],
    parts: {
      cell: { copy: (item: Entry) => ({ onPress: () => moves.choose(String(item.fields.iso)) }) },
      'heading-button': { view: { onPress: moves.heading } },
      host: {
        lists: {
          [flag('months')]: periods ? [] : monthRows(now),
          [flag('periodRows')]: periods ? periodRows(now) : [],
        },
        states: {
          ...periodStates(flag, words, now),
          blank: held.length === 0,
          invalid: marked,
          'month-view': shownView === 'month',
          'range-pending': rangePending(read.mode, held),
          'year-view': shownView === 'year',
          [flag('columns')]: String(Math.min(read.count, 2)),
          [flag('selection')]: selection,
          [flag('unset')]: held.length === 0,
        },
        view: { accessibilityLabel: words('label') || words('fallbackLabel') },
      },
      next: { view: { onPress: () => moves.turn(1) } },
      period: {
        copy: (item: Entry) => ({ onPress: () => moves.choosePeriod(Number(item.fields.at)) }),
      },
      previous: { view: { onPress: () => moves.turn(-1) } },
    },
  }
}
