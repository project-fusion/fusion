/**
 * What an Area Chart draws of its readings, as arithmetic with no element in
 * it: the web's element and a phone's both draw what this returns.
 *
 * **A table read as parts of a total.** Each column of numbers is a part,
 * the parts add up at each reading, and each band is drawn as everything
 * under its top edge, the widest first, so what shows of each is the strip
 * between its edge and the edge below.
 */

import { type Curve, linePath, type Point } from '../line-path/line-path.js'
import type { Row } from '../read-series/read-series.js'
import type { Scale } from '../scale/scale.js'
import { headroom } from '../scale/ticks.js'
import type { AxisScales } from './line-plot.js'
import { PLOT_HEIGHT } from './plot-box.js'

/** The table as parts of a total: which columns, what each holds, and the running sums. */
export interface AreaStack {
  /** The table's columns that hold numbers, by their place among its cells. */
  columns: number[]
  /**
   * Each column's top edge at each reading: its running sum, or its own
   * reading under `overlap`.
   */
  layers: number[][]
  /** Each column's heading. */
  names: string[]
  /** Every reading's total. */
  totals: number[]
  /** Each column's own reading, not yet summed. */
  values: number[][]
}

/** How the parts are drawn: as shares of each reading's total, or each from zero. */
export interface AreaAsked {
  readonly overlap: boolean
  /**
   * Room above the highest total, which a chart gives wherever the scale is
   * drawn, for the reason `lineDomain` gives. A share fills the height by
   * definition, and its top is 100 percent, already a level.
   */
  readonly room?: boolean
  readonly share: boolean
}

/**
 * The rows as parts of a total, read from the rows rather than from a
 * column's series, so a blank is none of that part and every sum adds the
 * same reading of each part. **A part `shows` answers false for is none of
 * the total**, so its band closes and keeps its place, and so its color. A
 * reading below zero is drawn as none, and `negative` is told it was there.
 */
export const areaStack = (
  rows: readonly Row[],
  columns: readonly number[],
  names: readonly string[],
  shows: (name: string) => boolean,
  asked: AreaAsked,
  negative: () => void = () => undefined,
): AreaStack => {
  const values = columns.map((column, depth) =>
    rows.map((row) => {
      if (!shows(names[depth] ?? '')) {
        return 0
      }
      const value = row.cells[column]?.value ?? 0
      if (value < 0) {
        negative()
      }
      return Math.max(0, value)
    }),
  )
  const totals = rows.map((_, index) =>
    values.reduce((sum, column) => sum + (column[index] ?? 0), 0),
  )
  const drawn = asked.share
    ? values.map((column) =>
        column.map((value, index) => {
          const total = totals[index] ?? 0
          return total > 0 ? value / total : 0
        }),
      )
    : values
  const layers: number[][] = []
  let running = rows.map(() => 0)
  for (const column of drawn) {
    running = asked.overlap ? column : running.map((sum, index) => sum + (column[index] ?? 0))
    layers.push(running)
  }
  return { columns: [...columns], layers, names: [...names], totals, values }
}

/**
 * The largest of some numbers, or zero for none or for none above it. A loop,
 * because spread into `Math.max` four layers of 100,000 readings are more
 * arguments than a call can take.
 */
const highest = (values: readonly number[]): number => {
  let top = 0
  for (const value of values) {
    top = Math.max(top, value)
  }
  return top
}

/**
 * The range the bands are drawn against: from zero, since a band's thickness
 * is its amount, to the largest part under `overlap`, to the whole under
 * `share`, and to the largest total otherwise. A range of nothing is drawn
 * as one from zero to one.
 */
export const areaDomain = (stack: AreaStack, asked: AreaAsked): [number, number] => {
  const top = asked.overlap
    ? Math.max(0, ...stack.layers.map(highest))
    : asked.share
      ? 1
      : highest(stack.totals)
  const extent: [number, number] = [0, top > 0 ? top : 1]
  return asked.room && !asked.share ? headroom(extent) : extent
}

/** One band as the drawing writes it: its top edge, and everything under it closed down to the floor. */
export interface AreaBand {
  /** The top edge. */
  readonly line: string
  /** The edge closed down to the floor of the plot, which is filled. */
  readonly wash: string
}

/** One band's edge and wash, or none where the edge draws nothing. */
export const areaBand = (
  layer: readonly number[],
  scales: AxisScales,
  curve: Curve,
): AreaBand | undefined => {
  const points: Point[] = layer.map((value, index) => [scales.x(index), scales.y(value)])
  const line = linePath(points, curve)
  if (line === '') {
    return undefined
  }
  const first = points[0] as Point
  const last = points.at(-1) as Point
  return { line, wash: `${line}L${last[0]},${PLOT_HEIGHT}L${first[0]},${PLOT_HEIGHT}Z` }
}

/** Where the bubble for the reading at `at` stands down the plot, as a percentage: over the top of the stack there. */
export const areaTipY = (stack: AreaStack, at: number, y: Scale): string =>
  `${y(Math.max(0, ...stack.layers.map((layer) => layer[at] ?? 0)))}%`

/**
 * The rows the bubble reads, each part with its share under `share`, and the
 * total added as a cell of its own with no number, so it takes no series
 * color: it is the sum of the bands, not a band.
 */
export const areaTallied = (
  rows: readonly Row[],
  stack: AreaStack,
  share: boolean,
  totalLabel: string,
  format: (value: number) => string,
  percent: Intl.NumberFormat,
): Row[] =>
  rows.map((row, index) => {
    const total = stack.totals[index] ?? 0
    return {
      ...row,
      cells: [
        ...row.cells.map((cell, column) =>
          share && cell.value !== undefined && stack.columns.includes(column) && total > 0
            ? { ...cell, text: `${cell.text} (${percent.format(Math.max(0, cell.value) / total)})` }
            : cell,
        ),
        { name: totalLabel, text: format(total) },
      ],
    }
  })

/** Each part drawn at the latest reading with its share of that reading's total, as the summary lists them. */
export const latestShares = (
  stack: AreaStack,
  shows: (name: string) => boolean,
  percent: Intl.NumberFormat,
): string[] => {
  const last = (stack.totals.length || 1) - 1
  const total = stack.totals[last] ?? 0
  return stack.names.flatMap((name, depth) =>
    shows(name)
      ? [`${name} ${percent.format(total > 0 ? (stack.values[depth]?.[last] ?? 0) / total : 0)}`]
      : [],
  )
}
