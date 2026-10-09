/**
 * A 3D bar chart's table read as bars on a grid of names.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * value put under the wrong name stands as tall as a real one, and a bar
 * measured from anywhere but zero says one value is a multiple of another
 * when it is not.
 */

import { type Drawn, type PagePoint, type Projection, solid, ticks } from '@fusion.dev/helix-core'
import { type FieldRow, niceRange, type PlotAxis } from '../spatial-scatter-chart/field.js'
import { type BoxExtent, inBox } from '../spatial-scatter-chart/view.js'

/** How tall the box stands, as a share of its longer side along the floor. */
const HEIGHT = 0.6

/** One place on the grid: a category across, a series in depth, and its value, where the table has one. */
export interface BarCell {
  /** Which category it stands under, counting from zero: the row's place among the rows read. */
  across: number
  /** The column of the row the value was read from, which names its series. */
  column: number
  /** Which series it stands in, counting from zero. */
  depth: number
  /** The row's own label, which names its category. */
  label: string
  /** The row it was read from, counting from zero. */
  row: number
  /** The value, where the cell holds a number. */
  value?: number | undefined
}

/** The table as a 3D bar chart reads it. */
export interface BarField {
  /**
   * Across, the categories; up, the values; and in depth, the series. The
   * box is as long along the floor as the grid, so every place on it is
   * square, and one series is a long, low row of bars.
   */
  axes: { extent: BoxExtent; x: PlotAxis; y: PlotAxis; z: PlotAxis }
  /** Every category, in the table's order: each row's label. */
  categories: string[]
  /**
   * Every place on the grid, across first: the bar for category `across` in
   * series `depth` is at `across * series.length + depth`.
   */
  cells: BarCell[]
  /** How many cells hold a value. */
  readings: number
  /** Every series, in the table's order: each numeric column's heading. */
  series: string[]
}

/**
 * An axis of `count` places, one at each whole number, with the grid's lines
 * between them, and `labels` written at them, where there are any to write.
 * `nearest` runs it from the reader back, so the first place stands in front.
 */
const named = (count: number, labels: string[], nearest = false): PlotAxis => {
  const places = Math.max(count, 1)
  return {
    labels,
    name: '',
    range: nearest ? [places - 0.5, -0.5] : [-0.5, places - 0.5],
    rules: Array.from({ length: places + 1 }, (_, at) => at - 0.5),
    ticks: labels.map((_, at) => at),
  }
}

/**
 * Reads the table as a bar chart does: **each row is a category, named by
 * its label, and each numeric column a series**, named by its heading. The
 * bars stand on a grid of categories across and series in depth, so one
 * series is a single row of bars. A cell with no number leaves its place on
 * the grid empty.
 *
 * **The value axis runs from zero**, whatever the values, so a bar's height
 * is its value: one twice as tall is twice as much. It widens to round
 * numbers past the highest value, and below zero where a value is negative.
 */
export const barsOf = (rows: readonly FieldRow[], columns: readonly number[]): BarField => {
  const series = columns.map(
    (column) => rows.find((row) => row.cells[column])?.cells[column]?.name ?? '',
  )
  const cells: BarCell[] = []
  const values: number[] = []
  rows.forEach((row, at) => {
    columns.forEach((column, depth) => {
      const value = row.cells[column]?.value
      const read = Number.isFinite(value) ? (value as number) : undefined
      if (read !== undefined) {
        values.push(read)
      }
      cells.push({ across: at, column, depth, label: row.label, row: at, value: read })
    })
  })
  const [low, high] = [Math.min(0, ...values), Math.max(0, ...values)]
  const range: [number, number] = low === high ? [0, 1] : niceRange(low, high)
  const longest = Math.max(rows.length, series.length, 1)
  return {
    axes: {
      extent: [Math.max(rows.length, 1) / longest, HEIGHT, Math.max(series.length, 1) / longest],
      x: named(
        rows.length,
        rows.map((row) => row.label),
      ),
      /* One series is the measure the bars stand for, so it names the axis;
         several are named along the depth instead. */
      y: { name: series.length === 1 ? (series[0] ?? '') : '', range, ticks: ticks(range) },
      /* **The first series in front**, so a later one, often the larger in a
         table read left to right, stands behind it rather than hiding it. */
      z: named(series.length, series.length === 1 ? [] : series, true),
    },
    categories: rows.map((row) => row.label),
    cells,
    readings: values.length,
    series,
  }
}

/** How much of its place on the grid a bar covers along each edge, so neighbors stand apart. */
const FOOTPRINT = 0.6

/** A bar as the chart's own drawing paints it. */
export interface DrawnBar {
  /** The block's eight corners on the page, which a drawing with no box is framed around. */
  corners: PagePoint[]
  drawn: Drawn
  height: number
  index: number
  x: number
  y: number
}

/**
 * Each bar with a value as a block, seen through `projection`: standing on
 * its place on the grid, from zero to its value, a little narrower than its
 * place so neighbors stand apart. A value below zero hangs from zero.
 */
export const barsDrawn = (field: BarField, projection: Projection): DrawnBar[] => {
  const [ex, ey, ez] = field.axes.extent
  const spacing = Math.min(
    (2 * ex) / Math.max(field.categories.length, 1),
    (2 * ez) / Math.max(field.series.length, 1),
  )
  const zero = inBox(field.axes.y, 0) * ey
  return field.cells.flatMap((cell, index): DrawnBar[] => {
    if (cell.value === undefined) {
      return []
    }
    const x = inBox(field.axes.x, cell.across) * ex
    /* The floor's way back is the box's depth turned round, as the box's own
       places are. */
    const y = -inBox(field.axes.z, cell.depth) * ez
    const top = inBox(field.axes.y, cell.value) * ey
    const base = Math.min(zero, top)
    const height = Math.abs(top - zero)
    /* Lifted to the bar's foot, which is zero on the value axis rather than
       the floor of the box where values run below zero. */
    const lifted: Projection = {
      ...projection,
      at: (px, py, pz = 0) => projection.at(px, py, pz + base),
    }
    const width = spacing * FOOTPRINT
    const corners: PagePoint[] = []
    for (const cx of [x - width / 2, x + width / 2]) {
      for (const cy of [y - width / 2, y + width / 2]) {
        corners.push(lifted.at(cx, cy, 0), lifted.at(cx, cy, height))
      }
    }
    return [{ corners, drawn: solid(lifted, 'block', x, y, width, height), height, index, x, y }]
  })
}
