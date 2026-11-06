/**
 * A donut chart on a phone: the ring core draws from its readings, each slice
 * and its label, and the bubble on the slice a finger or a key rests on.
 *
 * **Core draws it, as it does for the web's element.** The readings are the
 * first column of the table a `for` names, which publishes its rows by its
 * id. `donutShares` gives each slice's share, leaving out a row with no
 * amount and a row a legend hid on the same table, and `donutArc` and
 * `donutEdge` give each slice as an arc already turned to start where the
 * ring starts, and as the wedge an outline traces.
 *
 * **The ring and the bubble are two layers.** The ring changes only with the
 * readings, so moving the reading draws the bubble again and leaves the
 * canvas as it is.
 *
 * **A finger finds a slice by its angle**, `sliceAtPoint`, so a drag round the
 * ring scrubs it, and the keys and a screen reader walk the slices drawn, as
 * `useChartCursor` says. The reading in words is the row with the slice's
 * share after its amount, and where it stands among the slices drawn.
 */

import {
  type DonutRing,
  type DonutShare,
  donutArc,
  donutBearing,
  donutEdge,
  donutRing,
  donutSeam,
  donutShares,
  formatNumbers,
  percentIn,
  type Row,
  readingPosition,
  rowsWithShare,
  seriesIndex,
  seriesOfRows,
  sliceAtPoint,
  sliceLabelAt,
  spokenReading,
} from '@fusion.dev/helix-core/chart'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { showsSeries, useChartSource, useHiddenSeries } from '../render/chart-sources'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { boundAll, type Color, paletteOf, shownStatus, sourceOf } from './chart-common'
import { type CursorHeard, useChartCursor } from './chart-cursor'
import { kebab, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

type Read = (name: string) => unknown

/** How far past the band a finger still finds a slice, in the drawing's units. */
const SLACK = 6

/** The ring's readings: the table's rows, the first column of amounts, and its place in a row. */
interface Drawn {
  readonly column: number | undefined
  readonly rows: readonly Row[]
  readonly shares: readonly DonutShare[]
}

/** What the table with the id `for` names gives the ring, less the rows a legend hid. */
const drawnOf = (source: ReturnType<typeof useChartSource>, hidden: ReadonlySet<string>): Drawn => {
  const rows = source?.rows ?? []
  const first = seriesOfRows(rows, source?.caption)[0]
  const points = first?.points ?? []
  const column = rows.length === 0 ? undefined : firstColumn(rows)
  return {
    column,
    rows,
    shares: donutShares(points, (index) => showsSeries(hidden, points[index]?.label ?? '')),
  }
}

/** The place in a row of the first column that holds a number in some row. */
const firstColumn = (rows: readonly Row[]): number | undefined => {
  const widest = rows.reduce((most, row) => Math.max(most, row.cells.length), 0)
  for (let column = 0; column < widest; column += 1) {
    if (rows.some((row) => row.cells[column]?.value !== undefined)) {
      return column
    }
  }
  return undefined
}

/** The places of the slices drawn, which the keys walk and the position counts. */
const shownOf = (shares: readonly DonutShare[]): number[] =>
  shares.flatMap((share, at) => (share.fraction > 0 ? [at] : []))

/** Each slice as the vector draws it: its arc, its wedge, and its color. */
const slicesOf = (drawn: Drawn, ring: DonutRing, at: number, outlined: boolean, colorOf: Color) => {
  /* The seam the web leaves between two slices, half at either end of each, so the
     ring reads as its slices with no stroke drawn between them. */
  const seam = donutSeam(drawn.shares)
  return drawn.shares.map((share, place) => ({
    active: place === at,
    arc: donutArc(share, ring, seam),
    color: colorOf(place),
    /* Inset by a quarter of the edge's stroke, as the web's clip keeps its inner half. */
    edge: share.fraction > 0 && outlined ? donutEdge(share, ring, 0.75, seam) : '',
    key: String(place),
    series: String(seriesIndex(place)),
  }))
}

/** Each slice's share written on it, where `slice-labels` asks and the slice is big enough. */
const labelsOf = (drawn: Drawn, ring: DonutRing, format: Intl.NumberFormat, colorOf: Color) =>
  drawn.shares.flatMap((share, place) => {
    const spot = sliceLabelAt(share, ring)
    return spot === undefined
      ? []
      : [
          {
            color: colorOf(place),
            key: String(place),
            series: String(seriesIndex(place)),
            text: format.format(share.fraction),
            x: `${spot.x}%`,
            y: `${spot.y}%`,
          },
        ]
  })

/** The bubble's cells for the slice at `at`: each cell of its row, the amount with its share. */
const cellsOf = (row: Row | undefined, at: number, colorOf: Color) =>
  (row?.cells ?? []).map((cell, index) => ({
    color: cell.value === undefined ? 'transparent' : colorOf(at),
    current: false,
    key: String(index),
    name: cell.name,
    series: cell.value === undefined ? '' : String(seriesIndex(at)),
    text: cell.text,
  }))

/** The chart's name and each slice's share, as the web's summary says them. */
const summaryOf = (named: string, drawn: Drawn, format: Intl.NumberFormat, lang: string) => {
  const parts = drawn.shares
    .filter((share) => share.fraction > 0)
    .map((share) => `${drawn.rows[share.row]?.label ?? ''} ${format.format(share.fraction)}`)
  if (parts.length === 0) {
    return ''
  }
  /* Listed as the locale lists, where the platform can, and with commas where it cannot. */
  const Lists = (Intl as { ListFormat?: typeof Intl.ListFormat }).ListFormat
  const listed =
    Lists === undefined
      ? parts.join(', ')
      : new Lists(lang || undefined, { style: 'short', type: 'unit' }).format(parts)
  return `${named ? `${named}: ` : ''}${listed}.`
}

/** Tells the chart's handlers each move and press of its reading, named by the slice's row. */
const sender =
  (family: Family, props: Props, use: MachineUse, drawn: Drawn) =>
  (heard: 'change' | 'press', { at, by }: CursorHeard) => {
    const event = boundTo(use, heard === 'press' ? 'onReadingPress' : 'onReadingChange', 'event')
    const row = at < 0 ? -1 : (drawn.shares[at]?.row ?? -1)
    if (event !== undefined) {
      tell(family, props, event, {
        index: row,
        label: drawn.rows[row]?.label ?? '',
        pointerType: by,
        series: '',
      })
    }
  }

/** The plot's box: a ring is square, a half ring as wide as its band is tall, and a half plot with nothing to draw twice as wide. */
const aspectOf = (ring: DonutRing, drawn: boolean): string =>
  !ring.half ? '1' : drawn ? String(100 / (40 + ring.thickness / 2)) : '2'

/** What the ring reads and writes for a slice: its row with its share, and its words. */
const readerOf = (read: Read, drawn: Drawn, lang: string) => {
  const format = percentIn(lang)
  const write = formatNumbers(lang)
  const shown = shownOf(drawn.shares)
  /** The row the bubble and the words read for a slice, with its share after its amount. */
  const rowAt = (at: number): Row | undefined => {
    const share = drawn.shares[at]
    return share === undefined
      ? undefined
      : rowsWithShare(drawn.rows, drawn.column, share, format)[share.row]
  }
  const position = (at: number) =>
    readingPosition(wordsIn(read('position-label')), shown.indexOf(at), shown.length, write)
  const said = (at: number): string => {
    const row = rowAt(at)
    return row === undefined ? '' : spokenReading(row, undefined, () => true, position(at))
  }
  return { any: shown.length > 0, format, rowAt, said }
}

/** What the ring's parts read of its reading and its name. */
interface Shown {
  readonly any: boolean
  readonly at: number
  readonly keyed: boolean
  readonly name: string
  readonly ring: DonutRing
  readonly summary: string
}

/** The flags and words of the ring's parts, by their own names. */
const statesOf = (
  read: Read,
  drawn: Drawn,
  shown: Shown,
  said: (at: number) => string,
): Record<string, boolean | string> => {
  const { any, at, keyed, name, ring } = shown
  const share = drawn.shares[at]
  return {
    ...shownStatus(read, any),
    ...bubbleOf(drawn, share, ring),
    aspect: aspectOf(ring, any),
    centered: any && wordsIn(read('hole')) !== 'none',
    drawn: any,
    frame: ring.frame,
    labeled: any && read('slice-labels') === true,
    live: keyed && share !== undefined ? said(at) : '',
    named: name,
    role: !any && name !== '' ? 'group' : '',
    stroke: String(ring.thickness),
    summary: shown.summary,
    track: any ? donutArc({ fraction: 1, start: 0 }, ring) : '',
  }
}

/** Where the bubble stands for the slice shown, and the row it names, or none. */
const bubbleOf = (drawn: Drawn, share: DonutShare | undefined, ring: DonutRing) => {
  if (share === undefined) {
    return { markX: '', markY: '', placement: 'top', tipLabel: '', tipped: false }
  }
  const bearing = donutBearing(share, ring, false)
  return {
    markX: `${bearing.x}%`,
    markY: `${bearing.y}%`,
    placement: bearing.placement,
    tipLabel: drawn.rows[share.row]?.label ?? '',
    tipped: true,
  }
}

/** Hosts a donut chart: its ring from its readings, and its reading. */
export const useDonutChart = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const id = wordsIn(read('for'))
  const ring = donutRing(wordsIn(read('hole')) || undefined, wordsIn(read('sweep')) || undefined)
  const lang = langOf(read)
  const source = sourceOf(useChartSource(id), read('data'), lang)
  const drawn = drawnOf(source, useHiddenSeries(id))
  const { any, format, rowAt, said } = readerOf(read, drawn, lang)
  /* Named as the web's chart is: its `aria-label`, its `label`, or the table's caption. */
  const name = wordsIn(read('aria-label')) || wordsIn(read('label')) || (source?.caption ?? '')
  const cursor = useChartCursor({
    axis: 'none',
    count: drawn.shares.length,
    enabled: any,
    pick: (point) => sliceAtPoint(point.x, point.y, drawn.shares, ring, SLACK),
    said,
    shows: (at) => (drawn.shares[at]?.fraction ?? 0) > 0,
    tell: sender(family, props, use, drawn),
    touches: any,
  })
  const summary = summaryOf(name, drawn, format, lang)
  const shown = { any, at: cursor.at, keyed: cursor.keyed, name, ring, summary }
  const colorOf = paletteOf(useTheme())
  const lists = {
    cells: cellsOf(rowAt(cursor.at), cursor.at, colorOf),
    labels: read('slice-labels') === true ? labelsOf(drawn, ring, format, colorOf) : [],
    slices: slicesOf(drawn, ring, cursor.at, wordsIn(read('emphasis')) === 'outlined', colorOf),
  }
  const named = any && name !== '' ? { accessibilityLabel: name } : {}
  const bubble = statesOf(read, drawn, shown, said)
  return {
    marks: [],
    /* The bubble's point, which its trigger stands at, where the web's mark stands. */
    measured: { 'chart-mark-x': String(bubble.markX), 'chart-mark-y': String(bubble.markY) },
    parts: {
      host: {
        lists: boundAll(flag, lists),
        states: boundAll(flag, bubble),
      },
      /* The shares describe the plot, as the web's summary describes the ring. */
      plot: {
        ...cursor.plot,
        view: {
          ...cursor.plot.view,
          ...named,
          ...(summary === '' ? {} : { accessibilityHint: summary }),
        },
      },
      /* A touch elsewhere closes the bubble, and the reading goes with it, as on the web. */
      tooltip: {
        view: {
          onToggle: (event: { readonly detail?: { readonly newState?: string } }) => {
            if (event.detail?.newState === 'closed') {
              cursor.away()
            }
          },
        },
      },
    },
  }
}
