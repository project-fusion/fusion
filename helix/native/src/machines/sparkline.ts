/**
 * A sparkline on a phone: what core draws from its readings, where each mark
 * stands, and the reading a finger or a key rests on.
 *
 * **Core draws it, as it does for the web's element.** The readings come from
 * `values`, or from the table a `for` names, which publishes its rows by its
 * id. `sparklinePlot` gives the line, its wash, the columns, the band, and
 * where the terminus and each mark stand, which the tree binds to its vector's
 * shapes and to the marks it lays over them.
 *
 * **The vector and the marks are two layers.** The line, the wash, and the
 * columns change only with the readings, so moving the reading draws the
 * cursor and the readout again and leaves the canvas as it is.
 *
 * **Named, the plot is read**, as `useChartCursor` says, and the reading in
 * words is the table's cell as the table writes it, or the number in the
 * sparkline's locale, after the row's name, as on the web.
 */

import {
  formatNumbers,
  overviewWords,
  type Placed,
  type Row,
  readingPosition,
  readingWords,
  type Series,
  type SparklinePlot,
  seriesOfRows,
  sparklineMarks,
  sparklinePlot,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core/chart'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useChartSource } from '../render/chart-sources'
import type { Family } from '../style/form'
import { shownStatus } from './chart-common'
import { type CursorHeard, useChartCursor } from './chart-cursor'
import { kebab, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

type Read = (name: string) => unknown

/** The readings drawn: a table's first series over its rows, or `values`. */
interface Drawn {
  readonly count: number
  readonly rows: readonly Row[]
  readonly series: Series
}

const drawnOf = (read: Read, source: ReturnType<typeof useChartSource>): Drawn => {
  if (source !== undefined) {
    const first = seriesOfRows(source.rows, source.caption)[0]
    if (first !== undefined) {
      return { count: source.rows.length, rows: source.rows, series: first }
    }
  }
  const values = writtenNumbers(read('values') as string)
  return {
    count: values.length,
    rows: [],
    series: { name: '', points: values.map((value, at) => ({ at, label: '', value })) },
  }
}

/** The two values of `range`, lower first, or none. */
const bandOf = (range: unknown): readonly [number, number] | undefined => {
  const [one, two] = writtenNumbers(wordsIn(range))
  return one === undefined || two === undefined
    ? undefined
    : [Math.min(one, two), Math.max(one, two)]
}

/** A percentage, as an inset takes it. */
const percent = (value: number): string => `${value}%`

/** A mark's place as the two custom properties the tree sets on it. */
const placeOf = (place: Placed | undefined) => ({
  x: place === undefined ? '' : percent(place.x),
  y: place === undefined ? '' : percent(place.y),
})

/** The plot's kind, as `plot` names it, or the resting area. */
const kindOf = (plot: unknown) => (plot === 'bar' || plot === 'line' ? plot : ('area' as const))

/** The reading at `at` in words: the table's cell as written, or the number, after the row's name. */
const readingOf = (drawn: Drawn, write: (value: number) => string) => (at: number) => {
  const row = drawn.rows[at]
  if (row === undefined) {
    const value = drawn.series.points.find((point) => point.at === at)?.value
    return { label: '', text: value === undefined ? '' : write(value) }
  }
  const column = row.cells.findIndex((_, index) =>
    drawn.rows.some((one) => one.cells[index]?.value !== undefined),
  )
  return { label: row.label, text: row.cells[column]?.text ?? '' }
}

/** The plot core draws from the readings `drawn`, as the props ask. */
const plotOf = (read: Read, drawn: Drawn) => {
  const curve = read('curve')
  return sparklinePlot({
    band: bandOf(read('range')),
    count: drawn.count,
    curve: curve === 'step' || curve === 'straight' || curve === 'smooth' ? curve : undefined,
    plot: kindOf(read('plot')),
    series: drawn.series,
  })
}

/** What the readings come to, in `overview-label`, where the sparkline is named. */
const overviewOf = (read: Read, plot: SparklinePlot, text: (at: number) => string): string =>
  overviewWords(
    (values) =>
      wordsIn(read('overview-label'))
        .replaceAll('{first}', () => values.first)
        .replaceAll('{last}', () => values.last)
        .replaceAll('{high}', () => values.high)
        .replaceAll('{low}', () => values.low),
    plot.slots,
    text,
  )

/** The marks over the strip, each a flag and where it stands, by the names the form binds. */
const markStates = (
  flag: (name: string) => string,
  plot: SparklinePlot,
  marks: ReturnType<typeof sparklineMarks>,
  here: Placed | undefined,
  ended: boolean,
): Record<string, boolean | string> => {
  const end = placeOf(plot.terminus)
  const high = placeOf(marks.high)
  const low = placeOf(marks.low)
  const at = placeOf(here)
  return {
    [flag('cursorX')]: at.x,
    [flag('cursorY')]: at.y,
    [flag('ended')]: ended,
    [flag('high')]: marks.high !== undefined,
    [flag('highX')]: high.x,
    [flag('highY')]: high.y,
    [flag('low')]: marks.low !== undefined,
    [flag('lowX')]: low.x,
    [flag('lowY')]: low.y,
    [flag('reading')]: here !== undefined,
    [flag('terminusX')]: end.x,
    [flag('terminusY')]: end.y,
  }
}

/** The shapes of the vector, by the names the form binds. */
const shapeStates = (
  flag: (name: string) => string,
  plot: SparklinePlot,
): Record<string, boolean | string> => ({
  [flag('area')]: plot.area,
  [flag('bandHeight')]: String(plot.band?.height ?? 0),
  [flag('bandY')]: String(plot.band?.y ?? 0),
  [flag('banded')]: plot.band !== undefined,
  [flag('line')]: plot.line,
  [flag('lined')]: plot.line !== '',
  [flag('washed')]: plot.area !== '',
})

/** The lists the vector's and the strip's repeats draw: each column, and each lone reading. */
const listsOf = (flag: (name: string) => string, plot: SparklinePlot) => ({
  [flag('bars')]: plot.bars.map((bar, index) => ({
    height: String(bar.height),
    key: String(index),
    width: String(bar.width),
    x: String(bar.x),
    y: String(bar.y),
  })),
  [flag('lone')]: plot.lone.map((one, index) => ({
    key: String(index),
    x: percent(one.x),
    y: percent(one.y),
  })),
})

/** Where a reading stands among the readings, in `position-label`. */
const positionOf = (read: Read, at: number, count: number, write: (value: number) => string) =>
  readingPosition(wordsIn(read('position-label')), at, count, write)

/** Tells the sparkline's handlers each move and press of its reading, named by the table's row. */
const sender =
  (family: Family, props: Props, use: MachineUse, drawn: Drawn) =>
  (heard: 'change' | 'press', { at, by }: CursorHeard) => {
    const event = boundTo(use, heard === 'press' ? 'onReadingPress' : 'onReadingChange', 'event')
    if (event !== undefined) {
      tell(family, props, event, {
        index: at,
        label: drawn.rows[at]?.label ?? '',
        pointerType: by,
        series: '',
      })
    }
  }

/** Where the reading at `at` stands, or none where no reading is shown or its place is blank. */
const placedAt = (plot: SparklinePlot, at: number): Placed | undefined => {
  const shown = plot.slots[at]
  return at >= 0 && shown !== undefined ? plot.place(at, shown) : undefined
}

/** Hosts a sparkline: its drawing from its readings, and its reading. */
export const useSparkline = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const drawn = drawnOf(read, useChartSource(wordsIn(read('for'))))
  const plot = plotOf(read, drawn)
  const write = formatNumbers(langOf(read))
  const reading = readingOf(drawn, write)
  const name = wordsIn(read('aria-label')) || wordsIn(read('label'))
  const named = name !== ''
  const said = (at: number): string => {
    const { label, text } = reading(at)
    return readingWords(label, text, positionOf(read, at, drawn.count, write))
  }
  const cursor = useChartCursor({
    count: drawn.count,
    enabled: named && plot.placed > 0,
    said,
    tell: sender(family, props, use, drawn),
    touches: plot.placed > 0,
  })
  const here = placedAt(plot, cursor.at)
  const marks = sparklineMarks(plot, writtenList(wordsIn(read('marks'))))
  const overview = named ? overviewOf(read, plot, (index) => reading(index).text) : ''
  const out = here === undefined ? undefined : reading(cursor.at)
  const status = shownStatus(read, drawn.count > 0)
  const states: Record<string, boolean | string> = {
    ...shapeStates(flag, plot),
    ...markStates(flag, plot, marks, here, plot.terminus !== undefined && plot.bars.length === 0),
    [flag('empty')]: status.empty,
    [flag('error')]: status.error,
    [flag('loading')]: status.loading,
    [flag('live')]: cursor.keyed && here !== undefined ? said(cursor.at) : '',
    [flag('named')]: name,
    [flag('overview')]: overview,
    [flag('readout')]: out === undefined ? '' : readingWords(out.label, out.text, ''),
    [flag('role')]: named && plot.placed === 0 ? 'img' : '',
  }
  return {
    marks: [],
    parts: {
      host: { lists: listsOf(flag, plot), states },
      /* What the readings come to describes the plot, as the web's overview describes the drawing. */
      svg: {
        ...cursor.plot,
        view: { ...cursor.plot.view, ...(overview === '' ? {} : { accessibilityHint: overview }) },
      },
    },
  }
}
