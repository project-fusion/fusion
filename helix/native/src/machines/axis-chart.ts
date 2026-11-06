/**
 * What every axis chart on a phone shares, as Line Chart and Area Chart read
 * it: the columns a table's series are read from, the rules and the numbers of
 * the scale, the names along the readings that fit the plot's width, the
 * bubble's cells, the reading a finger or a key rests on with the events it
 * sends, and the plot's binding, the two layers its parts draw in.
 *
 * **The plot is one adjustable element**, whose value is the reading in
 * words and whose hint is the chart's summary, as the web's summary describes
 * the drawing; a touch elsewhere closes the bubble and the reading with it.
 */

import {
  type AxisScales,
  levelRules,
  placeLabels,
  type Row,
  readingPosition,
  seriesIndex,
  spokenReading,
  ticks,
} from '@fusion.dev/helix-core/chart'
import { useCallback, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Theme } from '../theme/theme'
import { boundAll, type Color, shownStatus } from './chart-common'
import { type Cursor, type CursorHeard, type CursorSetup, useChartCursor } from './chart-cursor'
import { wordsIn } from './date-picker-read'
import { boundTo, tell } from './props'

type Read = (name: string) => unknown

/** A share of the plot, as a style takes it. */
export const percent = (value: number): string => `${value}%`

/** The columns of a row that hold a number in some row, in table order, as the web's `plottedColumns`. */
export const plottedOf = (rows: readonly Row[]): number[] => {
  const widest = rows.reduce((most, row) => Math.max(most, row.cells.length), 0)
  return Array.from({ length: widest }, (_, column) => column).filter((column) =>
    rows.some((row) => row.cells[column]?.value !== undefined),
  )
}

/** The heading of the column at this place in a row, from the first row that has a cell there. */
export const columnName = (rows: readonly Row[], column: number): string =>
  rows.find((row) => row.cells[column])?.cells[column]?.name ?? ''

/** What `gridlines` asks for: a bare one, or a word it does not know, rules the levels, as on the web. */
export const gridlinesAsked = (given: unknown): '' | 'both' | 'category' | 'value' =>
  given === undefined || given === null || given === false
    ? ''
    : given === 'both' || given === 'category'
      ? given
      : 'value'

/**
 * The rules a `gridlines` asks for, as paths: down through each reading
 * named, and across at each level, above `floor` where one is given.
 */
export const gridlinesOf = (
  asked: string,
  domain: readonly [number, number],
  scales: AxisScales,
  named: readonly number[],
  floor?: number,
) => {
  if (asked === '') {
    return []
  }
  const down = asked === 'both' || asked === 'category'
  const across = asked !== 'category'
  return [
    ...(down ? named.map((at) => `M${scales.x(at)},0L${scales.x(at)},100`) : []),
    ...(across
      ? levelRules(domain, scales.y, floor).map((level) => `M0,${level}L100,${level}`)
      : []),
  ].map((d, key) => ({ d, key: String(key) }))
}

/** The axis of numbers `value-axis` draws: each level, as `write` writes it, and the widest. */
export const axisOf = (
  domain: readonly [number, number],
  scales: AxisScales,
  write: (n: number) => string,
) => {
  const levels = ticks(domain)
  const widest = Math.max(1, ...levels.map((level) => write(level).length))
  return {
    ticks: levels.map((level, key) => ({
      key: String(key),
      text: write(level),
      y: percent(scales.y(level)),
    })),
    widest,
  }
}

/** The names along the readings that fit the plot's width, each in its room, at the size the names are set in. */
export const labelsOf = (rows: readonly Row[], width: number, size: number, count: number) => {
  const placed = placeLabels(
    rows,
    width > 0
      ? {
          gap: size / 2,
          length: width,
          /* A name's length in the face the names are set in, near enough:
             a digit or a lowercase letter of a sans face is about half its size. */
          name: (at) => (rows[at]?.label.length ?? 0) * size * 0.55,
        }
      : undefined,
  )
  return {
    at: placed.map((one) => one.at).filter((at) => at < count),
    labels: placed.map((one) => ({
      key: String(one.at),
      size: percent(one.size),
      start: percent(one.start),
      text: rows[one.at]?.label ?? '',
    })),
  }
}

/** The size of the names' type in points: the theme's `text-xs`, in its `rem`. */
export const nameSize = (theme: Theme): number => {
  const written = String(theme.tokens['text-xs'] ?? '0.75rem')
  const rem = Number.parseFloat(written)
  return written.endsWith('rem') ? rem * theme.rem : rem
}

/** The plot's width in points, measured as the names' row is laid out. */
export const useWidth = () => {
  const [width, setWidth] = useState(0)
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width)
    setWidth((was) => (was === next ? was : next))
  }, [])
  return { onLayout, width }
}

/** The plot's box in points and where it stands in its parent, measured as it is laid out. */
export const useBox = () => {
  const [box, setBox] = useState({ height: 0, top: 0, width: 0 })
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height)
    const top = Math.round(event.nativeEvent.layout.y)
    const width = Math.round(event.nativeEvent.layout.width)
    setBox((was) =>
      was.height === height && was.top === top && was.width === width
        ? was
        : { height, top, width },
    )
  }, [])
  return { box, onLayout }
}

/**
 * The bubble's cells for the reading at `at`: each cell of its row, a
 * plotted one in its series color, and the one the keys rest on current.
 */
export const cellsOf = (
  rows: readonly Row[],
  columns: readonly number[],
  at: number,
  column: number | undefined,
  colorOf: Color,
) =>
  (rows[at]?.cells ?? []).map((cell, index) => {
    const depth = columns.indexOf(index)
    return {
      color: depth < 0 ? 'transparent' : colorOf(depth),
      current: index === column,
      key: String(index),
      name: cell.name,
      series: depth < 0 ? '' : String(seriesIndex(depth)),
      text: cell.text,
    }
  })

/** Lists as the locale lists, where the platform can, and with commas where it cannot. */
export const listIn =
  (lang: string) =>
  (items: string[]): string => {
    const Lists = (Intl as { ListFormat?: typeof Intl.ListFormat }).ListFormat
    return Lists === undefined
      ? items.join(', ')
      : new Lists(lang || undefined, { style: 'short', type: 'unit' }).format(items)
  }

/** What an axis chart's reading reads of the chart. */
export interface ReadingSetup {
  /** The rows the bubble and the words read, which may hold cells the table does not, as a total. */
  readonly rows: readonly Row[]
  /** The columns the series are read from. */
  readonly columns: readonly number[]
  /** How many readings there are. */
  readonly count: number
  /** Whether a series of this name is drawn. */
  readonly shows: (name: string) => boolean
  /** How the chart's numbers are written. */
  readonly write: (value: number) => string
  /** The axis the readings run along: `block` down the plot, as a bar chart's categories turned sideways. Absent is `inline`. */
  readonly axis?: 'block' | 'inline' | 'none'
  /** The columns Down and Up walk, as a scatter's series up. Absent is every column a series is drawn from. */
  readonly among?: readonly number[]
  /** The readings in the order the keys walk them, and where a reading stands among them. Absent is the table's order. */
  readonly order?: readonly number[]
  /** The reading under a point of the plot, for readings not laid out along it. */
  readonly pick?: CursorSetup['pick']
  /** Whether the plot is drawn left to right on every page. */
  readonly ltr?: boolean
}

/** The reading of an axis chart: the cursor, the words it says, and the series the keys walk. */
export interface AxisReading {
  readonly among: readonly number[]
  readonly cursor: Cursor
  readonly said: (at: number, series?: number) => string
}

/** Whether the cell at this place in a row is a series that is drawn, by its column's heading. */
const showsCell =
  (setup: ReadingSetup) =>
  (cell: number): boolean => {
    const name = setup.rows[0]?.cells[cell]?.name
    return name === undefined || setup.shows(name)
  }

/** Tells the chart's handlers each move and press of its reading, named by its row and the series the keys rest on. */
const sender =
  (family: Family, props: Props, use: MachineUse, setup: ReadingSetup, among: readonly number[]) =>
  (heard: 'change' | 'press', { at, by, series }: CursorHeard) => {
    const event = boundTo(use, heard === 'press' ? 'onReadingPress' : 'onReadingChange', 'event')
    if (event === undefined) {
      return
    }
    const column = among[series]
    tell(family, props, event, {
      index: at,
      label: setup.rows[at]?.label ?? '',
      pointerType: by,
      series: at < 0 || column === undefined ? '' : columnName(setup.rows, column),
    })
  }

/**
 * The reading a finger, a key, or a screen reader rests on, and the series
 * within it Down and Up walk: every column a series is drawn from.
 */
export const useAxisReading = (
  family: Family,
  props: Props,
  use: MachineUse,
  read: Read,
  setup: ReadingSetup,
): AxisReading => {
  const shows = showsCell(setup)
  const among = (setup.among ?? setup.columns).filter(shows)
  const said = (at: number, series = -1): string => {
    const row = setup.rows[at]
    const place = setup.order === undefined ? at : setup.order.indexOf(at)
    const position = readingPosition(
      wordsIn(read('position-label')),
      place,
      setup.count,
      setup.write,
    )
    return row === undefined ? '' : spokenReading(row, among[series], shows, position)
  }
  const any = setup.count > 0
  const cursor = useChartCursor({
    axis: setup.axis ?? 'inline',
    count: setup.count,
    enabled: any,
    ...(setup.ltr === undefined ? {} : { ltr: setup.ltr }),
    ...(setup.order === undefined ? {} : { order: setup.order }),
    ...(setup.pick === undefined ? {} : { pick: setup.pick }),
    said: (at) => said(at),
    series: among.length,
    tell: sender(family, props, use, setup, among),
    touches: any,
  })
  return { among, cursor, said }
}

/** What an axis chart's behavior is made of. */
export interface AxisParts {
  readonly flag: (name: string) => string
  readonly lists: Readonly<Record<string, readonly object[]>>
  readonly measured: Readonly<Record<string, number | string>>
  readonly name: string
  readonly onLayout: (event: LayoutChangeEvent) => void
  readonly reading: AxisReading
  readonly states: Readonly<Record<string, boolean | string>>
  readonly summary: string
}

/** The behavior an axis chart gives its parts: its lists and states, the plot's reading, and the bubble's toggle. */
export const axisBehavior = (parts: AxisParts): Behavior => {
  const { cursor } = parts.reading
  const drawn = parts.states.drawn === true
  const plot: PartBinding = {
    ...cursor.plot,
    view: {
      ...cursor.plot.view,
      ...(drawn && parts.name !== '' ? { accessibilityLabel: parts.name } : {}),
      ...(parts.summary === '' ? {} : { accessibilityHint: parts.summary }),
    },
  }
  return {
    marks: [],
    measured: parts.measured,
    parts: {
      host: {
        lists: boundAll(parts.flag, parts.lists),
        states: boundAll(parts.flag, parts.states),
      },
      labels: { view: { onLayout: parts.onLayout } },
      plot,
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

/** The words in place of the drawing, the plot's name, and its role, by the names the form binds. */
export const statusOf = (read: Read, any: boolean, name: string) => {
  return {
    ...shownStatus(read, any),
    drawn: any,
    named: name,
    role: !any && name !== '' ? 'group' : '',
  }
}

/** The behavior with the plot measured as it is laid out, beside what its cursor measures. */
export const withPlotLayout = (
  behavior: Behavior,
  onLayout: (event: LayoutChangeEvent) => void,
) => {
  const plot = behavior.parts.plot
  const measure = plot?.view?.onLayout as ((event: LayoutChangeEvent) => void) | undefined
  const view = {
    ...plot?.view,
    onLayout: (event: LayoutChangeEvent) => {
      measure?.(event)
      onLayout(event)
    },
  }
  return { ...behavior, parts: { ...behavior.parts, plot: { ...plot, view } } }
}
