/**
 * The rows a phone's month calendar draws, from what it holds at one draw: each
 * month's heading, weekdays, and six weeks of cells, or the months of a year and
 * a page of years. Core says what each cell is, as it does for the web's.
 */
import {
  type CalendarFormats,
  type CalendarView,
  type DateMode,
  type DateRules,
  type DrawnRange,
  type MonthSystem,
  monthCells,
  periodCells,
  YEARS_SHOWN,
  yearOut,
  yearPageOf,
} from '@fusion.dev/helix-core/calendar'
import { formatMessage } from '@fusion.dev/helix-core/words'

/** What the rows are drawn from at one draw. */
export interface CalendarNow {
  readonly anchor: string
  readonly atEnd: boolean
  readonly atStart: boolean
  readonly count: number
  readonly disabled: boolean
  readonly drawn: DrawnRange | null
  readonly formats: CalendarFormats
  readonly lang: string
  readonly max: string
  readonly maxView: 'month' | 'year' | undefined
  readonly min: string
  readonly mode: DateMode
  readonly monthViewLabel: string
  readonly periodStop: number
  readonly periodYear: number
  readonly rules: DateRules
  readonly selected: readonly string[]
  readonly shown: Date
  readonly system: MonthSystem
  readonly today: string
  readonly view: CalendarView
  readonly weekend: readonly number[]
  readonly weekStart: number
  readonly yearViewLabel: string
}

/** Whether the heading steps back from the view on show, where `max-view` lets it. */
export const headingSteps = (now: Pick<CalendarNow, 'maxView' | 'view'>): boolean =>
  now.maxView !== undefined &&
  (now.view === 'day' || (now.view === 'month' && now.maxView === 'year'))

/** One day as a copy of the grid's repeat draws it. */
const dayRow = (
  now: CalendarNow,
  cell: ReturnType<typeof monthCells>[number][number],
): Readonly<Record<string, unknown>> => ({
  barred: cell.barred,
  currentDate: cell.today ? 'date' : undefined,
  end: cell.end,
  inert: cell.outside || now.disabled,
  iso: cell.iso,
  key: cell.iso,
  label: now.formats.full.format(cell.date),
  middle: cell.middle,
  number: String(now.system.day(cell.date)),
  outside: cell.outside,
  preview: cell.preview,
  ring: cell.selected && !cell.start && !cell.middle && !cell.end,
  selected: cell.selected,
  solid: cell.solid,
  start: cell.start,
  stop: cell.stop,
  today: cell.today,
  weekend: cell.weekend,
})

/** The months on show, each with its heading, its controls, and its weeks. */
export const monthRows = (now: CalendarNow): readonly Readonly<Record<string, unknown>>[] => {
  const steps = headingSteps(now)
  return Array.from({ length: now.count }, (_, index) => {
    const month = now.system.add(now.shown, index)
    const heading = now.formats.heading.format(month)
    const weeks = monthCells({
      anchor: now.anchor,
      drawn: now.drawn,
      mode: now.mode,
      month,
      rules: now.rules,
      selected: now.selected,
      system: now.system,
      today: now.today,
      weekend: now.weekend,
      weekStart: now.weekStart,
    })
    const first = index === 0
    const last = index === now.count - 1
    return {
      backInert: now.atStart || now.disabled,
      earlier: !last,
      first,
      forwardInert: now.atEnd || now.disabled,
      heading,
      headingLabel: formatMessage(now.monthViewLabel, { heading }, now.lang),
      key: now.system.key(month),
      last,
      later: !first,
      plain: !steps,
      stepping: steps,
      weekdays: (weeks[0] ?? []).map(({ date }) => ({
        key: String(date.getUTCDay()),
        name: now.formats.weekdayName.format(date),
        short: now.formats.weekday.format(date),
      })),
      weeks: weeks.map((week, at) => ({
        days: week.map((cell) => dayRow(now, cell)),
        key: String(at),
      })),
    }
  })
}

/** The heading of the months of a year, or of a page of years. */
export const periodHeading = (now: CalendarNow): string => {
  const year = (at: number): string => now.formats.year.format(now.system.from(at, 1, 1))
  if (now.view !== 'year') {
    return year(now.periodYear)
  }
  const page = yearPageOf(now.periodYear)
  return `${year(page)} – ${year(page + YEARS_SHOWN - 1)}`
}

/** Whether the year, or the page of years, before or after the one on show lies wholly outside the bounds. */
export const lastPage = (now: CalendarNow, direction: number): boolean => {
  const years = now.view === 'year'
  const page = years ? yearPageOf(now.periodYear) : now.periodYear
  return yearOut(
    direction < 0 ? page - 1 : years ? page + YEARS_SHOWN : page + 1,
    now.min,
    now.max,
    now.system,
  )
}

/** The months of a year, or a page of years, in rows of three. */
export const periodRows = (now: CalendarNow): readonly Readonly<Record<string, unknown>>[] => {
  const years = now.view === 'year'
  const cells = periodCells({
    max: now.max,
    min: now.min,
    page: now.periodYear,
    shown: now.shown,
    system: now.system,
    today: now.today,
    view: years ? 'year' : 'month',
  }).map(({ at, chosen, current, first, out }) => ({
    at,
    chosen,
    current,
    currentDate: current ? 'date' : undefined,
    key: String(at),
    label: years ? now.formats.year.format(first) : now.formats.monthYear.format(first),
    out,
    stop: at === now.periodStop,
    words: years ? now.formats.year.format(first) : now.formats.monthName.format(first),
  }))
  return Array.from({ length: Math.ceil(cells.length / 3) }, (_, row) => ({
    cells: cells.slice(row * 3, row * 3 + 3),
    key: String(row),
  }))
}
