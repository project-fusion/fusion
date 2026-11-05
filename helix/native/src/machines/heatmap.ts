/**
 * A heatmap on a phone: a strip of cells, each colored by its reading, the
 * cell and the bubble a finger or a key rests on, the cells a reader selects,
 * and the footer's three slots.
 *
 * **Core lays it out, as it does for the web's element.** The readings are
 * the table a `for` names, which publishes its rows by its id, or `data`.
 * `heatmapFits` says how many whole columns fit the strip's measured width,
 * the newest kept, and `heatmapCellBox` stands each cell in its column and
 * its row, `rows` to a column, so a week is a column with `rows="7"`. A phone
 * has no column-first grid, so the cells are views placed where core says.
 *
 * **The cells and the reading are two layers.** The cells change only with
 * the readings, the width, and the selection, so moving the reading draws
 * the cell it rests on again over them, ringed, and the bubble, and leaves
 * the rest as they are.
 *
 * **The strip is read as every chart's plot is**: a tap shows the cell under
 * it and presses it, a drag moves along the cells, the keys walk a cell down
 * and a column across, Page Up and Page Down a month where the rows carry
 * dates, and a screen reader adjusts the strip as one control whose value is
 * the cell's row in words, described by the busiest reading and the total.
 */

import {
  formatNumbers,
  heatmapCellBox,
  heatmapFits,
  heatmapMonthPage,
  heatmapOverview,
  type Row,
  readingPosition,
  spokenReading,
} from '@fusion.dev/helix-core/chart'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useEffect, useMemo, useRef } from 'react'
import type { TrackPoint } from '../drivers/track'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useChartSource, useHiddenSeries } from '../render/chart-sources'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { axisBehavior, statusOf, useWidth } from './axis-chart'
import { sourceOf } from './chart-common'
import { useChartCursor } from './chart-cursor'
import { kebab, wordsIn } from './date-picker-read'
import {
  type Asked,
  type Cell,
  cellsOf,
  type Lengths,
  lengthsOf,
  pointsOf,
  stripSize,
} from './heatmap-cells'
import { useHeatmapSelection } from './heatmap-selection'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

type Read = (name: string) => unknown

/** The regions the footer holds, each a prop of its name. */
const FOOT = ['end', 'start', 'summary'] as const

/** Whether anything was passed into the footer's regions. */
const footed = (props: Props): boolean =>
  FOOT.some((name) => {
    const given = props[name]
    return given !== undefined && given !== null && given !== false && given !== ''
  })

/** `rows` as a usable count: a whole number, one at least. */
const rowCount = (rows: unknown): number => Math.max(1, Math.floor(Number(rows)) || 1)

/** The rows a strip reads, held while the table, `data`, and the hidden series are the same. */
const useRows = (read: Read, lang: string) => {
  const id = wordsIn(read('for'))
  const table = useChartSource(id)
  const data = read('data')
  const source = useMemo(() => sourceOf(table, data, lang), [table, data, lang])
  const hidden = useHiddenSeries(id)
  const points = useMemo(() => pointsOf(source?.rows ?? [], hidden), [source, hidden])
  return { caption: source?.caption ?? '', points }
}

/** The overview's sentence: the busiest reading drawn, as the table writes it, and the total. */
const overviewOf = (
  read: Read,
  rows: readonly Row[],
  column: number,
  lang: string,
  drawn: number,
) => {
  const offset = rows.length - drawn
  const { busiest, total } = heatmapOverview(
    rows.slice(offset).map((row) => ({ value: row.cells[column]?.value })),
  )
  const row = rows[offset + busiest]
  const text = row?.cells[column]?.text ?? ''
  return formatMessage(
    wordsIn(read('overview-label')),
    {
      busiest: text === '' ? (row?.label ?? '') : `${row?.label ?? ''}, ${text}`,
      busiestLabel: wordsIn(read('busiest-label')),
      total,
      totalLabel: wordsIn(read('total-label')),
    },
    lang || 'en',
  )
}

/** Tells the strip's handlers each move and press of its reading, by its row of the table. */
const sender =
  (family: Family, props: Props, use: MachineUse, rows: readonly Row[], offset: number) =>
  (heard: 'change' | 'press', { at, by }: { readonly at: number; readonly by: string }) => {
    const event = boundTo(use, heard === 'press' ? 'onReadingPress' : 'onReadingChange', 'event')
    if (event === undefined) {
      return
    }
    const row = at < 0 ? -1 : offset + at
    tell(family, props, event, {
      index: row,
      label: rows[row]?.label ?? '',
      pointerType: by,
      series: '',
    })
  }

/** The bubble's cells: every cell of the row, its column's name and its words. */
const tipCellsOf = (row: Row | undefined) =>
  (row?.cells ?? []).map((cell, index) => ({
    current: false,
    key: String(index),
    name: cell.name,
    text: cell.text,
  }))

/** What the cells read of the props, held while it is the same. */
const useAsked = (read: Read, rows: number): Asked => {
  const thresholds = read('thresholds')
  const tones = read('tones')
  const emphasis = wordsIn(read('emphasis'))
  const material = wordsIn(read('material'))
  return useMemo(
    () => ({ rows, thresholds, tones, treatment: { emphasis, material } }),
    [emphasis, material, rows, thresholds, tones],
  )
}

/** The drawn cell under a point of the strip, as shares of its box, or `-1` in a gap past the last. */
const cellUnder = (
  point: TrackPoint,
  size: { readonly height: number; readonly width: number },
  lengths: Lengths,
  rows: number,
  count: number,
): number => {
  const column = Math.floor((point.x * size.width) / (lengths.cell + lengths.gap))
  const row = Math.floor((point.y * size.height) / (lengths.height + lengths.gap))
  const at = column * rows + Math.min(rows - 1, Math.max(0, row))
  return column < 0 || at >= count ? -1 : at
}

/** Where the strip stands its cells, and which of the table's rows they are. */
interface Placing {
  readonly dropped: number
  readonly lengths: Lengths
  readonly rows: number
  readonly tableRows: readonly Row[]
}

/** The cell the reading rests on, drawn again over the rest, and its bubble, or none. */
const shownOf = (at: number, cells: readonly Cell[], placing: Placing) => {
  const active = at >= 0 ? cells[at] : undefined
  const { lengths } = placing
  const box = heatmapCellBox(
    Math.max(0, at),
    placing.rows,
    lengths.cell,
    lengths.gap,
    lengths.height,
  )
  const row = active === undefined ? undefined : placing.tableRows[placing.dropped + at]
  return {
    actives: active === undefined ? [] : [active],
    states: {
      markX: active === undefined ? '' : `${box.x + lengths.cell / 2}px`,
      markY: active === undefined ? '' : `${box.y}px`,
      placement: 'top',
      tipLabel: row?.label ?? '',
      tipped: active !== undefined,
    },
    tipCells: tipCellsOf(row),
  }
}

/** Hosts a heatmap: its cells from its readings, its reading, and its selection. */
export const useHeatmap = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const { caption, points } = useRows(read, lang)
  const theme = useTheme()
  const lengths = useMemo(() => lengthsOf(theme), [theme])
  const host = useWidth()
  const rows = rowCount(read('rows'))
  const all = points.readings
  const room = heatmapFits(all.length, host.width || Number.NaN, lengths.cell, lengths.gap, rows)
  const dropped = Math.max(0, all.length - room)
  const drawn = useMemo(() => all.slice(dropped), [all, dropped])
  const tableRows = points.rows
  const keys = useMemo(() => tableRows.map((row) => row.when ?? row.label), [tableRows])
  const selection = useHeatmapSelection(family, props, use, read, {
    all: keys,
    dropped,
    lang,
    rows,
  })
  const asked = useAsked(read, rows)
  const cells = useMemo(
    () => cellsOf(drawn, asked, lengths, theme, selection.chosen),
    [asked, drawn, lengths, selection.chosen, theme],
  )
  const size = stripSize(drawn.length, rows, lengths)
  const write = formatNumbers(lang)
  const said = (at: number): string => {
    const row = tableRows[dropped + at]
    const position = readingPosition(wordsIn(read('position-label')), at, drawn.length, write)
    return row === undefined ? '' : spokenReading(row, undefined, () => true, position)
  }
  const tellReading = sender(family, props, use, tableRows, dropped)
  const any = drawn.length > 0
  const cursor = useChartCursor({
    axis: 'inline',
    count: drawn.length,
    enabled: any,
    grid: rows,
    keyed: selection.keyed,
    pageFrom: (at, forward) =>
      heatmapMonthPage(
        tableRows.slice(dropped).map((row) => row.when),
        at,
        forward,
      ),
    pick: (point: TrackPoint) => cellUnder(point, size, lengths, rows, drawn.length),
    said,
    tell: (heard, reading) => {
      tellReading(heard, reading)
      if (heard === 'press') {
        selection.press(reading.at)
      }
    },
    touches: any,
  })
  useResize(family, props, use, host.width > 0 ? drawn.length : undefined)
  const at = cursor.at
  const shown = shownOf(at, cells, { dropped, lengths, rows, tableRows })
  const name = wordsIn(read('aria-label')) || wordsIn(read('label')) || caption
  const named = name || wordsIn(read('strip-label'))
  const states = {
    ...statusOf(read, any, named),
    ...shown.states,
    footed: footed(props),
    live: cursor.keyed && at >= 0 && !selection.asked ? said(at) : '',
    overview: any ? overviewOf(read, tableRows, points.column, lang, drawn.length) : '',
    selection: selection.said,
  }
  const behavior = axisBehavior({
    flag: (one) => boundTo(use, one, 'state') ?? kebab(one),
    lists: { actives: shown.actives, cells, tipCells: shown.tipCells },
    measured: {
      'chart-mark-x': states.markX,
      'chart-mark-y': states.markY,
      'heatmap-cell-height': lengths.height,
      'heatmap-cell-width': lengths.cell,
      'heatmap-strip-height': size.height,
      'heatmap-strip-width': size.width,
    },
    name: named,
    onLayout: () => undefined,
    reading: { among: [], cursor, said },
    states,
    summary: states.overview,
  })
  const { plot, ...parts } = behavior.parts
  return {
    ...behavior,
    parts: {
      ...parts,
      host: { ...parts.host, view: { onLayout: host.onLayout } },
      strip: plot ?? {},
    },
  }
}

/**
 * Tells `resize` with how many cells are drawn, each time that changes once
 * the strip has been measured, as the web's strip tells it from the width it
 * first measured. `size` is undefined before then.
 */
const useResize = (family: Family, props: Props, use: MachineUse, size: number | undefined) => {
  const told = useRef<number | undefined>(undefined)
  const latest = useRef({ family, props, use })
  latest.current = { family, props, use }
  useEffect(() => {
    const was = told.current
    told.current = size
    const event = boundTo(latest.current.use, 'onResize', 'event')
    if (was !== undefined && size !== undefined && was !== size && event !== undefined) {
      tell(latest.current.family, latest.current.props, event, { size })
    }
  }, [size])
}
